/**
 * ハン検 Sheet queue → Azure TTS (v4 rules / sheet_only_v3 schema)
 *
 * 目的:
 * - Google Sheetを唯一の履歴正本とする。
 * - 問題提示時に音声ジョブをpending投入する。
 * - ユーザーが回答している間にApps ScriptがMP3を生成する。
 * - ANSWERS_LOG(E列)は音声ジョブのhash対象外とし、
 *   pending/processing/doneのどの段階でも回答後に追記可能とする。
 *
 * queue!A:R
 * A SET_ID
 * B STATUS
 * C CREATED_AT
 * D QUESTIONS_LOG
 * E ANSWERS_LOG
 * F Q1_AUDIO
 * G Q2_AUDIO
 * H Q3_AUDIO（v4新規セット: 元文＋正答置換完成文を改行区切り）
 * I Q4_AUDIO
 * J Q5A1
 * K Q5B1
 * L Q5A2
 * M ASSIGNMENT
 * N AUDIO_FILE_ID
 * O AUDIO_URL
 * P ERROR
 * Q PROCESSED_AT
 * R STORAGE_MODE
 *
 * 所有:
 * ChatGPT    = A,C,D,E,F:L,R
 * AppsScript = B,M:Q,Aセルnote
 *
 * 出題時:
 * 1. Bを空欄のまま A,C,D,F:L,R を書く。
 * 2. Eは空欄。
 * 3. 必須値確定後、最後にBをpendingにする。
 *
 * 回答時:
 * - 同じSET_IDのEのみ更新。
 * - 新規行は作らない。
 * - Eの変更は音声ジョブのhashを変えない。
 *
 * Apps Script:
 * pending → processing → done
 * error時はPに原因を保存。
 *
 * Script Properties:
 * AZURE_SPEECH_KEY
 * AZURE_SPEECH_REGION
 * VOICE_FOLDER_ID
 * QUEUE_SHEET_ID
 *
 * 既存の1分time trigger:
 * processLatestPendingAudioJob
 */

const HQ_HEADERS = [
  'SET_ID',
  'STATUS',
  'CREATED_AT',
  'QUESTIONS_LOG',
  'ANSWERS_LOG',
  'Q1_AUDIO',
  'Q2_AUDIO',
  'Q3_AUDIO',
  'Q4_AUDIO',
  'Q5A1',
  'Q5B1',
  'Q5A2',
  'ASSIGNMENT',
  'AUDIO_FILE_ID',
  'AUDIO_URL',
  'ERROR',
  'PROCESSED_AT',
  'STORAGE_MODE'
];

const HQ_STORAGE_MODE = 'sheet_only_v3';

const HQ_VOICES = [
  {
    label: 'Hyunsu',
    id: 'ko-KR-HyunsuNeural',
    rate: '+20%'
  },
  {
    label: 'InJoon',
    id: 'ko-KR-InJoonNeural',
    rate: '+5%'
  },
  {
    label: 'JiMin',
    id: 'ko-KR-JiMinNeural',
    rate: '+0%'
  },
  {
    label: 'YuJin',
    id: 'ko-KR-YuJinNeural',
    rate: '+0%'
  }
];

/**
 * recovery note prefixは既存checkpoint互換のためV3を維持する。
 * v4化で過去processing/error jobの復旧情報を無効化しない。
 */
const HQ_NOTE = 'HANGUL_QUEUE_STATE_V3\n';

/**
 * queue physical schemaはv3のまま維持する。
 * 音声fingerprintだけv4化し、旧checkpointはlegacy versionで復旧する。
 */
const HQ_AUDIO_VERSION_LEGACY =
  'azure-v2-24k160k-1.2s-0.65s-100ms';

const HQ_AUDIO_VERSION_V4_1200 =
  'azure-v4-24k160k-leading5s-q3dual-1.2s-0.65s-100ms';

const HQ_AUDIO_VERSION_V4_LEADING5S =
  'azure-v4-24k160k-leading5s-q3dual-final2.1s-1.2s-0.65s-100ms';

const HQ_AUDIO_VERSION =
  'azure-v5-24k160k-no-leading-q3dual-final2.1s-1.2s-0.65s-100ms';

const HQ_LEADING_SILENCE_MS_LEGACY = 5000;


/**
 * Listening supplemental audio queue.
 * written queue!A:Rとは完全に分離する。
 */
const HQ_LISTENING_HEADERS = [
  'LISTEN_GEN_ID',
  'STATUS',
  'CREATED_AT',
  'PARENT_SET_ID',
  'LISTENING_ISSUE_NO',
  'SECTION_KEY',
  'SKILL_ID',
  'AUDIO_PLAN_JSON',
  'PAYLOAD_HASH',
  'ASSIGNMENT',
  'AUDIO_FILE_ID',
  'AUDIO_URL',
  'ERROR',
  'PROCESSED_AT',
  'STORAGE_MODE'
];

const HQ_LISTENING_TAB =
  'listening_audio_queue_v1';

const HQ_LISTENING_STORAGE_MODE =
  'listening_audio_v1';

const HQ_LISTENING_NOTE =
  'HANGUL_LISTENING_AUDIO_STATE_V1\n';

const HQ_LISTENING_AUDIO_VERSION_LEADING5S =
  'azure-listening-v1-24k160k-leading5s-segments';

const HQ_LISTENING_AUDIO_VERSION =
  'azure-listening-v2-24k160k-no-leading-segments';

const HQ_K1_NUMBER_VOICE = {
  label: 'Nanami',
  id: 'ja-JP-NanamiNeural',
  rate: '+0%'
};

const HQ_K1_NUMBER_TEXTS = {
  choice_number1: 'マルイチ',
  choice_number2: 'マルニ',
  choice_number3: 'マルサン',
  choice_number4: 'マルヨン'
};

const HQ_LISTENING_MAX_SEGMENTS = 12;
const HQ_LISTENING_MAX_PAUSE_MS = 6000;
const HQ_LISTENING_MAX_TOTAL_CHARS = 12000;

/**
 * N5-P0 5L set bridge.
 * Legacy column name LISTENING_ISSUE_NO is retained in the audio queue,
 * but live 5L rows now share one set-level sequence number across K1-K5.
 */
const HQ_LISTENING_SET_SIZE = 5;

/**
 * Drive audio storage split introduced by the 2026-09-19 slim-down.
 * VOICE_FOLDER_ID remains the legacy root for checkpoint recovery only.
 */
const HQ_AUDIO_WRITTEN_FOLDER_ID =
  '1dLf1KhHic8SU-4XOGueZSM55vznS024C';
const HQ_AUDIO_LISTENING_FOLDER_ID =
  '1xeDF4AYNhykK1YPTh5rckyTmsGHvihaF';
const HQ_AUDIO_SYSTEM_TEST_FOLDER_ID =
  '1YF7bkvAwYBv0JD6bimtki5vsVH4VWYiK';

const HQ_K1_READY_TAB =
  'listening_k1_ready_v1';

const HQ_K1_READY_HEADERS = [
  'K1_READY_ID',
  'CREATED_AT',
  'STATUS',
  'IMAGE_FILE_ID',
  'IMAGE_URL',
  'IMAGE_SHA256',
  'FINAL_CHOICES_JSON',
  'ANSWER_KEY',
  'TTS_SCRIPT_JSON',
  'QA_PROFILE',
  'AUDIT_RESULT',
  'BOUND_LISTENING_SET_ID',
  'CONSUMED_AT'
];


/* =========================================================
 * CONFIG
 * =======================================================*/

function config_() {
  const props =
    PropertiesService.getScriptProperties();

  const c = {};

  [
    'AZURE_SPEECH_KEY',
    'AZURE_SPEECH_REGION',
    'VOICE_FOLDER_ID',
    'QUEUE_SHEET_ID'
  ].forEach(k => {
    c[k] = props.getProperty(k);

    if (!c[k]) {
      throw new Error(
        'Missing Script Property: ' + k
      );
    }
  });

  /**
   * K1_READY runtime is required only by
   * persistent Listening K1 operations.
   * Keeping this optional here avoids coupling
   * written audio processing to the new runtime
   * before deployment configuration is staged.
   */
  c.K1_READY_SHEET_ID =
    props.getProperty(
      'K1_READY_SHEET_ID'
    ) || '';

  if (
    !/^[a-z0-9-]+$/.test(
      c.AZURE_SPEECH_REGION
    )
  ) {
    throw new Error(
      'Invalid Azure region.'
    );
  }

  return c;
}


function audioTargetFolderId_(
  c,
  mode,
  setId
) {
  const normalizedMode =
    String(mode || '').trim();
  const id =
    String(setId || '').trim();

  if (!id) {
    throw new Error(
      'Audio target SET_ID is required.'
    );
  }

  if (
    id.indexOf('SYSTEM_TEST-') === 0
  ) {
    return HQ_AUDIO_SYSTEM_TEST_FOLDER_ID;
  }

  if (normalizedMode === '5W') {
    return HQ_AUDIO_WRITTEN_FOLDER_ID;
  }

  if (normalizedMode === '5L') {
    return HQ_AUDIO_LISTENING_FOLDER_ID;
  }

  throw new Error(
    'Audio target mode must be 5W or 5L.'
  );
}


function assertAudioFolderState_(
  c,
  expectedFolderId,
  persistedFolderId
) {
  if (
    persistedFolderId !==
      expectedFolderId &&
    persistedFolderId !==
      c.VOICE_FOLDER_ID
  ) {
    throw new Error(
      'Persisted audio folder is not the current target or legacy root.'
    );
  }
}


function queueSheet_(c) {
  const sheet =
    SpreadsheetApp
      .openById(c.QUEUE_SHEET_ID)
      .getSheetByName('queue');

  if (!sheet) {
    throw new Error(
      'queue tab is missing.'
    );
  }

  const headers = sheet
    .getRange(
      1,
      1,
      1,
      HQ_HEADERS.length
    )
    .getDisplayValues()[0];

  if (
    JSON.stringify(headers) !==
    JSON.stringify(HQ_HEADERS)
  ) {
    throw new Error(
      'queue!A1:R1 header mismatch.'
    );
  }

  return sheet;
}



/**
 * Listening専用audio queue。
 *
 * required=false:
 * - tab未作成ならnullを返し、
 *   written既存運用を阻害しない。
 *
 * tabが存在する場合は常に
 * exact headerを要求する。
 */
function listeningAudioSheet_(
  c,
  required
) {
  const ss =
    SpreadsheetApp.openById(
      c.QUEUE_SHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      HQ_LISTENING_TAB
    );

  if (!sheet) {
    if (required) {
      throw new Error(
        HQ_LISTENING_TAB +
        ' tab is missing.'
      );
    }

    return null;
  }

  if (
    sheet.getMaxColumns() <
    HQ_LISTENING_HEADERS.length
  ) {
    throw new Error(
      HQ_LISTENING_TAB +
      ' has too few columns.'
    );
  }

  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        HQ_LISTENING_HEADERS.length
      )
      .getDisplayValues()[0];

  if (
    JSON.stringify(headers) !==
    JSON.stringify(
      HQ_LISTENING_HEADERS
    )
  ) {
    throw new Error(
      HQ_LISTENING_TAB +
      '!A1:O1 header mismatch.'
    );
  }

  return sheet;
}


/**
 * Persistent K1_READY source of truth.
 */
function k1ReadySheet_(c) {
  if (!c.K1_READY_SHEET_ID) {
    throw new Error(
      'Missing Script Property: K1_READY_SHEET_ID'
    );
  }

  const sheet =
    SpreadsheetApp
      .openById(
        c.K1_READY_SHEET_ID
      )
      .getSheetByName(
        HQ_K1_READY_TAB
      );

  if (!sheet) {
    throw new Error(
      HQ_K1_READY_TAB +
      ' tab is missing.'
    );
  }

  if (
    sheet.getMaxColumns() <
      HQ_K1_READY_HEADERS.length
  ) {
    throw new Error(
      HQ_K1_READY_TAB +
      ' has too few columns.'
    );
  }

  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        HQ_K1_READY_HEADERS.length
      )
      .getDisplayValues()[0];

  if (
    JSON.stringify(headers) !==
    JSON.stringify(
      HQ_K1_READY_HEADERS
    )
  ) {
    throw new Error(
      HQ_K1_READY_TAB +
      '!A1:M1 header mismatch.'
    );
  }

  return sheet;
}


function k1ReadyRecordFromRow_(
  sheet,
  row
) {
  const range =
    sheet.getRange(
      row,
      1,
      1,
      HQ_K1_READY_HEADERS.length
    );

  const formulas =
    range.getFormulas()[0];

  if (
    formulas.some(
      value => Boolean(value)
    )
  ) {
    throw new Error(
      'K1_READY A:M must contain literal values, not formulas.'
    );
  }

  const values =
    range.getValues()[0];

  return {
    row: row,
    values: values,
    id: String(values[0] || ''),
    createdAt: String(values[1] || ''),
    status: String(values[2] || ''),
    imageFileId: String(values[3] || ''),
    imageUrl: String(values[4] || ''),
    imageSha256: String(values[5] || ''),
    finalChoicesRaw: String(values[6] || ''),
    answerKeyRaw: String(values[7] || ''),
    ttsScriptRaw: String(values[8] || ''),
    qaProfileRaw: String(values[9] || ''),
    auditResultRaw: String(values[10] || ''),
    boundListeningSetId:
      String(values[11] || ''),
    consumedAt:
      String(values[12] || '')
  };
}


function readK1ReadyRecord_(
  c,
  k1ReadyId
) {
  const id =
    String(k1ReadyId || '');

  if (!id) {
    throw new Error(
      'K1_READY_ID is required.'
    );
  }

  const sheet =
    k1ReadySheet_(c);

  const last =
    sheet.getLastRow();

  if (last < 2) {
    throw new Error(
      'K1_READY record not found.'
    );
  }

  const ids =
    sheet
      .getRange(
        2,
        1,
        last - 1,
        1
      )
      .getValues()
      .map(
        row => String(row[0] || '')
      );

  const rows = [];

  ids.forEach(
    (value, index) => {
      if (value === id) {
        rows.push(index + 2);
      }
    }
  );

  if (rows.length !== 1) {
    throw new Error(
      'K1_READY_ID must resolve to exactly one row.'
    );
  }

  return k1ReadyRecordFromRow_(
    sheet,
    rows[0]
  );
}


function readBoundK1ReadyForSet_(
  c,
  listeningSetId
) {
  const setId =
    String(listeningSetId || '');

  if (!setId) {
    throw new Error(
      'LISTENING_SET_ID is required.'
    );
  }

  const sheet =
    k1ReadySheet_(c);

  const last =
    sheet.getLastRow();

  if (last < 2) {
    throw new Error(
      'Bound K1_READY record not found.'
    );
  }

  const boundIds =
    sheet
      .getRange(
        2,
        12,
        last - 1,
        1
      )
      .getValues()
      .map(
        row => String(row[0] || '')
      );

  const rows = [];

  boundIds.forEach(
    (value, index) => {
      if (value === setId) {
        rows.push(index + 2);
      }
    }
  );

  if (rows.length !== 1) {
    throw new Error(
      'LISTENING_SET_ID must resolve to exactly one bound K1_READY row.'
    );
  }

  return k1ReadyRecordFromRow_(
    sheet,
    rows[0]
  );
}


function computeK1ImageSha256_(
  imageFileId
) {
  const fileId =
    String(imageFileId || '');

  if (!fileId) {
    throw new Error(
      'K1_READY IMAGE_FILE_ID is required.'
    );
  }

  const file =
    DriveApp.getFileById(
      fileId
    );

  if (file.isTrashed()) {
    throw new Error(
      'K1_READY image file is trashed.'
    );
  }

  const digest =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      file.getBlob().getBytes()
    );

  return digest
    .map(
      value =>
        (value & 0xff)
          .toString(16)
          .padStart(2, '0')
    )
    .join('');
}


function validateK1ReadyPayload_(
  record
) {
  if (
    !record ||
    typeof record !== 'object'
  ) {
    throw new Error(
      'K1_READY record is required.'
    );
  }

  const required = [
    record.id,
    record.createdAt,
    record.status,
    record.imageFileId,
    record.imageUrl,
    record.imageSha256,
    record.finalChoicesRaw,
    record.answerKeyRaw,
    record.ttsScriptRaw,
    record.qaProfileRaw,
    record.auditResultRaw
  ];

  if (
    required.some(
      value =>
        String(value || '') === ''
    )
  ) {
    throw new Error(
      'K1_READY required field is blank.'
    );
  }

  if (
    !/^H3-K1R-\d{8}-\d{3}$/
      .test(record.id)
  ) {
    throw new Error(
      'Invalid K1_READY_ID.'
    );
  }

  if (
    !Number.isFinite(
      Date.parse(record.createdAt)
    )
  ) {
    throw new Error(
      'Invalid K1_READY CREATED_AT.'
    );
  }

  if (
    !/^[0-9a-f]{64}$/
      .test(record.imageSha256)
  ) {
    throw new Error(
      'Invalid K1_READY IMAGE_SHA256.'
    );
  }

  let choices;
  let tts;
  let qa;
  let audit;

  try {
    choices =
      JSON.parse(
        record.finalChoicesRaw
      );
  } catch (e) {
    throw new Error(
      'FINAL_CHOICES_JSON is malformed.'
    );
  }

  try {
    tts =
      JSON.parse(
        record.ttsScriptRaw
      );
  } catch (e) {
    throw new Error(
      'TTS_SCRIPT_JSON is malformed.'
    );
  }

  try {
    qa =
      JSON.parse(
        record.qaProfileRaw
      );
  } catch (e) {
    throw new Error(
      'QA_PROFILE is malformed.'
    );
  }

  try {
    audit =
      JSON.parse(
        record.auditResultRaw
      );
  } catch (e) {
    throw new Error(
      'AUDIT_RESULT is malformed.'
    );
  }

  if (
    !Array.isArray(choices) ||
    choices.length !== 4 ||
    choices.some(
      value =>
        typeof value !== 'string' ||
        value === ''
    )
  ) {
    throw new Error(
      'FINAL_CHOICES_JSON must contain exactly four nonblank strings.'
    );
  }

  if (
    new Set(choices).size !== 4
  ) {
    throw new Error(
      'K1_READY choices must be unique.'
    );
  }

  const answer =
    Number(
      record.answerKeyRaw
    );

  if (
    !Number.isInteger(answer) ||
    answer < 1 ||
    answer > 4
  ) {
    throw new Error(
      'ANSWER_KEY must be 1-4.'
    );
  }

  if (
    !tts ||
    typeof tts !== 'object' ||
    Array.isArray(tts) ||
    tts.number_voice !==
      HQ_K1_NUMBER_VOICE.id ||
    !Array.isArray(tts.segments)
  ) {
    throw new Error(
      'Invalid K1_READY TTS_SCRIPT_JSON.'
    );
  }

  const expectedRoles = [
    'choice_number1',
    'choice1',
    'choice_number2',
    'choice2',
    'choice_number3',
    'choice3',
    'choice_number4',
    'choice4'
  ];

  if (
    JSON.stringify(
      tts.segments.map(
        segment =>
          segment &&
          segment.role
      )
    ) !==
    JSON.stringify(
      expectedRoles
    )
  ) {
    throw new Error(
      'K1_READY TTS segment order mismatch.'
    );
  }

  validateListeningAudioPlan_(
    JSON.stringify(
      tts.segments
    ),
    'K1'
  );

  const choiceTexts =
    tts.segments
      .filter(
        segment =>
          /^choice[1-4]$/
            .test(
              segment.role
            )
      )
      .map(
        segment =>
          segment.text
      );

  if (
    JSON.stringify(
      choiceTexts
    ) !==
    JSON.stringify(
      choices
    )
  ) {
    throw new Error(
      'K1_READY choices and TTS text mismatch.'
    );
  }

  if (
    !qa ||
    typeof qa !== 'object' ||
    Array.isArray(qa) ||
    !qa.group ||
    !qa.mode ||
    !qa.profile
  ) {
    throw new Error(
      'Invalid K1_READY QA_PROFILE.'
    );
  }

  if (
    !audit ||
    typeof audit !== 'object' ||
    Array.isArray(audit) ||
    audit.result !== 'PASS' ||
    audit.visual_qa !== 'PASS' ||
    audit.blind_audit !== 'PASS' ||
    Number(
      audit.exactly_one_choice
    ) !== answer
  ) {
    throw new Error(
      'K1_READY audit is not PASS or answer-consistent.'
    );
  }

  const actualImageSha =
    computeK1ImageSha256_(
      record.imageFileId
    );

  if (
    actualImageSha !==
    record.imageSha256
  ) {
    throw new Error(
      'K1_READY image SHA256 mismatch.'
    );
  }

  record.choices = choices;
  record.answerKey = answer;
  record.ttsScript = tts;
  record.qaProfile = qa;
  record.auditResult = audit;
  record.actualImageSha256 =
    actualImageSha;

  return record;
}


function bindK1ReadyToListeningSet_(
  k1ReadyId,
  listeningSetId
) {
  const c = config_();

  const setId =
    String(listeningSetId || '');

  if (
    !setId ||
    setId.length > 128 ||
    /[\x00-\x1F]/
      .test(setId)
  ) {
    throw new Error(
      'Invalid LISTENING_SET_ID.'
    );
  }

  const record =
    validateK1ReadyPayload_(
      readK1ReadyRecord_(
        c,
        k1ReadyId
      )
    );

  if (record.status !== 'READY') {
    throw new Error(
      'K1_READY STATUS must be READY before bind.'
    );
  }

  if (record.consumedAt !== '') {
    throw new Error(
      'K1_READY CONSUMED_AT must be blank before bind.'
    );
  }

  if (
    record.boundListeningSetId !== ''
  ) {
    throw new Error(
      'K1_READY BOUND_LISTENING_SET_ID must be blank before bind.'
    );
  }

  const before =
    record.values.map(
      value => String(value || '')
    );

  const sheet =
    k1ReadySheet_(c);

  sheet
    .getRange(
      record.row,
      12
    )
    .setValue(setId);

  SpreadsheetApp.flush();

  const after =
    k1ReadyRecordFromRow_(
      sheet,
      record.row
    );

  if (
    after.id !== record.id ||
    after.boundListeningSetId !== setId ||
    after.status !== 'READY' ||
    after.consumedAt !== ''
  ) {
    throw new Error(
      'K1_READY bind readback mismatch.'
    );
  }

  const afterValues =
    after.values.map(
      value => String(value || '')
    );

  for (
    let i = 0;
    i < before.length;
    i++
  ) {
    if (i === 11) {
      continue;
    }

    if (
      before[i] !==
      afterValues[i]
    ) {
      throw new Error(
        'K1_READY bind changed an unrelated field.'
      );
    }
  }

  validateK1ReadyPayload_(
    after
  );

  return {
    k1_ready_id: after.id,
    listening_set_id: setId,
    status: after.status
  };
}


function assertBoundK1ReadyForSet_(
  listeningSetId,
  members,
  c
) {
  const record =
    validateK1ReadyPayload_(
      readBoundK1ReadyForSet_(
        c,
        listeningSetId
      )
    );

  if (
    record.status !== 'READY' ||
    record.consumedAt !== '' ||
    record.boundListeningSetId !==
      listeningSetId
  ) {
    throw new Error(
      'Bound K1_READY state is not valid for audio start.'
    );
  }

  const k1Members =
    members.filter(
      member =>
        member.values[5] === 'K1'
    );

  if (
    k1Members.length !== 1
  ) {
    throw new Error(
      'Bound 5L set must contain exactly one K1 row.'
    );
  }

  const queueK1PlanRaw =
    String(
      k1Members[0].values[7] || ''
    );

  const expectedK1PlanRaw =
    JSON.stringify(
      record.ttsScript.segments
    );

  if (
    queueK1PlanRaw !==
    expectedK1PlanRaw
  ) {
    throw new Error(
      'Bound K1_READY and queue K1 audio payload mismatch.'
    );
  }

  return record;
}


function consumeK1ReadyAfterIssue_(
  k1ReadyId,
  listeningSetId,
  issueSucceeded
) {
  if (issueSucceeded !== true) {
    throw new Error(
      'K1_READY consume requires confirmed learner-facing issue success.'
    );
  }

  const c = config_();

  const record =
    validateK1ReadyPayload_(
      readK1ReadyRecord_(
        c,
        k1ReadyId
      )
    );

  if (
    record.status !== 'READY' ||
    record.consumedAt !== '' ||
    record.boundListeningSetId !==
      listeningSetId
  ) {
    throw new Error(
      'K1_READY is not eligible for consume.'
    );
  }

  const sheet =
    k1ReadySheet_(c);

  const consumedAt =
    new Date().toISOString();

  sheet
    .getRange(
      record.row,
      3
    )
    .setValue('CONSUMED');

  sheet
    .getRange(
      record.row,
      13
    )
    .setValue(
      consumedAt
    );

  SpreadsheetApp.flush();

  const after =
    k1ReadyRecordFromRow_(
      sheet,
      record.row
    );

  if (
    after.status !== 'CONSUMED' ||
    after.consumedAt !== consumedAt ||
    after.boundListeningSetId !==
      listeningSetId
  ) {
    throw new Error(
      'K1_READY consume readback mismatch.'
    );
  }

  return {
    k1_ready_id: after.id,
    listening_set_id:
      after.boundListeningSetId,
    status: after.status,
    consumed_at:
      after.consumedAt
  };
}


/**
 * Listening audio queueを初回作成する。
 *
 * 既存tabがある場合は
 * header mismatchを自動修復しない。
 */
function setupListeningAudioQueue_() {
  const c = config_();

  const ss =
    SpreadsheetApp.openById(
      c.QUEUE_SHEET_ID
    );

  let sheet =
    ss.getSheetByName(
      HQ_LISTENING_TAB
    );

  let created = false;

  if (!sheet) {
    sheet =
      ss.insertSheet(
        HQ_LISTENING_TAB
      );

    sheet
      .getRange(
        1,
        1,
        1,
        HQ_LISTENING_HEADERS.length
      )
      .setValues([
        HQ_LISTENING_HEADERS
      ]);

    sheet.setFrozenRows(1);

    SpreadsheetApp.flush();

    created = true;
  }

  /**
   * 新規・既存を問わず
   * exact headerをreadbackする。
   */
  listeningAudioSheet_(
    c,
    true
  );

  const result = {
    ok: true,
    created: created,
    sheet: HQ_LISTENING_TAB,
    columns:
      HQ_LISTENING_HEADERS.length,
    storageMode:
      HQ_LISTENING_STORAGE_MODE
  };

  console.log(
    JSON.stringify(result)
  );

  return result;
}


/**
 * Listening audio queueの
 * 設定・権限・schema確認。
 *
 * Azure呼出・queue row writeは行わない。
 */
function validateListeningAudioSetup() {
  const c = config_();

  const sheet =
    listeningAudioSheet_(
      c,
      true
    );

  const folder =
    DriveApp.getFolderById(
      HQ_AUDIO_LISTENING_FOLDER_ID
    );

  if (folder.isTrashed()) {
    throw new Error(
      '5L audio folder is trashed.'
    );
  }

  const result = {
    ok: true,
    sheet: sheet.getName(),
    columns:
      HQ_LISTENING_HEADERS.length,
    storageMode:
      HQ_LISTENING_STORAGE_MODE,
    audioVersion:
      HQ_LISTENING_AUDIO_VERSION,
    azureTested: false
  };

  console.log(
    JSON.stringify(result)
  );

  return result;
}


/**
 * 設定・権限・schema確認。
 * Azure呼出やジョブ処理は行わない。
 */
function validateQueueSetup() {
  const c = config_();
  const sheet = queueSheet_(c);

  const folder =
    DriveApp.getFolderById(
      HQ_AUDIO_WRITTEN_FOLDER_ID
    );

  if (folder.isTrashed()) {
    throw new Error(
      '5W audio folder is trashed.'
    );
  }

  const result = {
    ok: true,
    mode: 'sheet_only_v3',
    rulesVersion: 4,
    audioVersion: HQ_AUDIO_VERSION,
    sheet: sheet.getName(),
    columns: HQ_HEADERS.length,
    storageMode: HQ_STORAGE_MODE,
    azureTested: false
  };

  console.log(
    JSON.stringify(result)
  );

  return result;
}


/* =========================================================
 * QUEUE ENTRY POINT
 * =======================================================*/

/**
 * 既存1分トリガーのfallback入口。\n * 通常のR3運用ではSET_ID指定のprocessPendingAudioForSet()を優先する。
 *
 * 上から最初の
 * pending / processing
 * を1件だけ処理する。
 */
/**
 * R3 targeted immediate audio dispatcher.
 *
 * mode:
 * - 5W = written 5-question set
 * - 5L = Listening K1-K5 set
 *
 * The existing 1-minute processLatestPendingAudioJob trigger remains a
 * fallback only. This function never selects another SET_ID.
 */
function processPendingAudioForSet(
  mode,
  setId
) {
  const normalizedMode =
    String(mode || '').trim();
  const targetSetId =
    String(setId || '').trim();

  if (
    normalizedMode !== '5W' &&
    normalizedMode !== '5L'
  ) {
    throw new Error(
      'mode must be 5W or 5L.'
    );
  }

  if (!targetSetId) {
    throw new Error(
      'setId is required.'
    );
  }

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    return {
      status: 'busy',
      mode: normalizedMode,
      set_id: targetSetId
    };
  }

  try {
    const c = config_();

    if (normalizedMode === '5W') {
      const sheet = queueSheet_(c);
      const row = locate_(
        sheet,
        targetSetId
      );
      const status = sheet
        .getRange(row, 2)
        .getDisplayValue();

      if (status === 'done') {
        return {
          status: 'done',
          mode: '5W',
          set_id: targetSetId,
          audio_file_id: sheet
            .getRange(row, 14)
            .getDisplayValue(),
          audio_url: sheet
            .getRange(row, 15)
            .getDisplayValue()
        };
      }

      if (
        status !== 'pending' &&
        status !== 'processing'
      ) {
        throw new Error(
          '5W target row is not runnable: ' +
          status
        );
      }

      return runJob_(
        sheet,
        readJob_(sheet, row),
        c
      );
    }

    const sheet =
      listeningAudioSheet_(
        c,
        false
      );

    if (!sheet) {
      throw new Error(
        'listening_audio_queue_v1 is missing.'
      );
    }

    const members =
      collectListeningSetRows_(
        sheet,
        targetSetId
      );

    if (
      members.length !==
      HQ_LISTENING_SET_SIZE
    ) {
      throw new Error(
        '5L target must contain exactly five K1-K5 rows.'
      );
    }

    const sections =
      members
        .map(x => x.values[5])
        .sort();

    if (
      JSON.stringify(sections) !==
      JSON.stringify([
        'K1','K2','K3','K4','K5'
      ])
    ) {
      throw new Error(
        '5L target must contain exactly one K1-K5 row.'
      );
    }

    if (
      members.every(
        x => x.values[1] === 'done'
      )
    ) {
      return {
        status: 'done',
        mode: '5L',
        set_id: targetSetId,
        sections: sections
      };
    }

    const runnable =
      members.find(
        x =>
          x.values[1] === 'pending' ||
          x.values[1] === 'processing'
      );

    if (!runnable) {
      throw new Error(
        '5L target contains a non-runnable member.'
      );
    }

    return processListeningAudioSet_(
      sheet,
      readListeningJob_(
        sheet,
        runnable.row
      ),
      c
    );
  } finally {
    lock.releaseLock();
  }
}


function processLatestPendingAudioJob() {
  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    return {
      status: 'busy'
    };
  }

  try {
    const c = config_();
    const sheet = queueSheet_(c);
    const last = sheet.getLastRow();

    if (last < 2) {
      return processListeningAudioQueue_(
        c
      );
    }

    const statuses = sheet
      .getRange(
        2,
        2,
        last - 1,
        1
      )
      .getDisplayValues();

    const index =
      statuses.findIndex(
        r =>
          r[0] === 'pending' ||
          r[0] === 'processing'
      );

    if (index < 0) {
      return processListeningAudioQueue_(
        c
      );
    }

    const row = index + 2;

    let job;

    try {
      job = readJob_(
        sheet,
        row
      );

      locate_(
        sheet,
        job.id
      );
    } catch (e) {
      sheet
        .getRange(row, 16)
        .setValue(
          'validation: ' +
          safeError_(e, c)
        );

      sheet
        .getRange(row, 2)
        .setValue('error');

      SpreadsheetApp.flush();

      return {
        status: 'error',
        stage: 'validation'
      };
    }

    return runJob_(
      sheet,
      job,
      c
    );

  } finally {
    lock.releaseLock();
  }
}


function idle_() {
  console.log(
    'No pending queue job found.'
  );

  return {
    status: 'idle'
  };
}



/* =========================================================
 * LISTENING AUDIO QUEUE
 * =======================================================*/

/**
 * processLatestPendingAudioJob()の
 * ScriptLock保持中にのみ呼ぶ。
 *
 * written queueがidleのときだけ
 * Listeningを最大1件処理する。
 */
function processListeningAudioQueue_(
  c
) {
  const sheet =
    listeningAudioSheet_(
      c,
      false
    );

  if (!sheet) {
    return idle_();
  }

  const last =
    sheet.getLastRow();

  if (last < 2) {
    return idle_();
  }

  const statuses =
    sheet
      .getRange(
        2,
        2,
        last - 1,
        1
      )
      .getDisplayValues();

  const index =
    statuses.findIndex(
      r =>
        r[0] === 'pending' ||
        r[0] === 'processing'
    );

  if (index < 0) {
    return idle_();
  }

  const row = index + 2;

  let seed;

  try {
    seed =
      readListeningJob_(
        sheet,
        row
      );

    locateListening_(
      sheet,
      seed.id
    );

  } catch (e) {
    sheet
      .getRange(
        row,
        13
      )
      .setValue(
        'validation: ' +
        safeError_(e, c)
      );

    sheet
      .getRange(
        row,
        2
      )
      .setValue('error');

    SpreadsheetApp.flush();

    return {
      status: 'error',
      queue: 'listening',
      stage: 'validation'
    };
  }

  const members =
    collectListeningSetRows_(
      sheet,
      seed.parentSetId
    );

  if (
    seed.parentSetId.indexOf(
      'SYSTEM_TEST-'
    ) === 0 &&
    members.length === 1
  ) {
    return runListeningJob_(
      sheet,
      seed,
      c
    );
  }

  return processListeningAudioSet_(
    sheet,
    seed,
    c
  );
}


function collectListeningSetRows_(
  sheet,
  parentSetId
) {
  const last =
    sheet.getLastRow();

  if (last < 2) {
    return [];
  }

  return sheet
    .getRange(
      2,
      1,
      last - 1,
      HQ_LISTENING_HEADERS.length
    )
    .getDisplayValues()
    .map(
      (values, i) => ({
        row: i + 2,
        values: values
      })
    )
    .filter(
      x =>
        x.values[3] ===
        parentSetId
    );
}


function processListeningAudioSet_(
  sheet,
  seed,
  c
) {
  let members =
    collectListeningSetRows_(
      sheet,
      seed.parentSetId
    );

  if (
    members.length !==
    HQ_LISTENING_SET_SIZE
  ) {
    throw new Error(
      '5L PARENT_SET_ID must contain exactly ' +
      HQ_LISTENING_SET_SIZE +
      ' rows.'
    );
  }

  const sections =
    members
      .map(x => x.values[5])
      .sort();

  if (
    JSON.stringify(sections) !==
    JSON.stringify([
      'K1','K2','K3','K4','K5'
    ])
  ) {
    throw new Error(
      '5L PARENT_SET_ID must contain exactly one K1-K5 row.'
    );
  }

  const setNos =
    Array.from(
      new Set(
        members.map(
          x => Number(x.values[4])
        )
      )
    );

  if (
    setNos.length !== 1 ||
    !Number.isInteger(setNos[0]) ||
    setNos[0] < 1
  ) {
    throw new Error(
      'All K1-K5 rows must share one positive LISTENING_SET_NO in legacy LISTENING_ISSUE_NO.'
    );
  }

  const order = {
    K1: 1,
    K2: 2,
    K3: 3,
    K4: 4,
    K5: 5
  };

  members =
    members.sort(
      (a, b) =>
        order[a.values[5]] -
        order[b.values[5]]
    );

  /**
   * Persistent K1_READY is the source authority.
   * This gate runs before any runListeningJob_ call,
   * therefore before Apps Script writes audio state
   * or starts Azure generation for the set.
   */
  assertBoundK1ReadyForSet_(
    seed.parentSetId,
    members,
    c
  );

  for (
    let i = 0;
    i < members.length;
    i++
  ) {
    const m = members[i];
    const status = m.values[1];

    if (status === 'done') {
      continue;
    }

    if (
      status !== 'pending' &&
      status !== 'processing'
    ) {
      throw new Error(
        '5L member ' +
        m.values[0] +
        ' has non-runnable status ' +
        status +
        '.'
      );
    }

    const job =
      readListeningJob_(
        sheet,
        m.row
      );

    const result =
      runListeningJob_(
        sheet,
        job,
        c
      );

    if (
      !result ||
      result.status !== 'done'
    ) {
      return {
        status:
          result &&
          result.status ||
          'error',
        queue: 'listening_set',
        parent_set_id:
          seed.parentSetId,
        listening_set_no:
          setNos[0],
        member_result:
          result || null
      };
    }
  }

  members =
    collectListeningSetRows_(
      sheet,
      seed.parentSetId
    )
      .sort(
        (a, b) =>
          order[a.values[5]] -
          order[b.values[5]]
      );

  if (
    members.some(
      x => x.values[1] !== 'done'
    )
  ) {
    return {
      status: 'partial',
      queue: 'listening_set',
      parent_set_id:
        seed.parentSetId,
      listening_set_no:
        setNos[0]
    };
  }

  return {
    status: 'done',
    queue: 'listening_set',
    parent_set_id:
      seed.parentSetId,
    listening_set_no:
      setNos[0],
    audio_mode:
      'INDIVIDUAL_K1_K5_ONLY'
  };
}


function readListeningJob_(
  sheet,
  row
) {
  const range =
    sheet.getRange(
      row,
      1,
      1,
      HQ_LISTENING_HEADERS.length
    );

  const formulas =
    range.getFormulas()[0];

  /**
   * ChatGPT所有のimmutable input:
   * A,C:H,O
   *
   * B=STATUSは共有、
   * I:NはApps Script出力。
   */
  const immutableIndexes = [
    0,  // A LISTEN_GEN_ID
    2,  // C CREATED_AT
    3,  // D PARENT_SET_ID
    4,  // E LISTENING_ISSUE_NO
    5,  // F SECTION_KEY
    6,  // G SKILL_ID
    7,  // H AUDIO_PLAN_JSON
    14  // O STORAGE_MODE
  ];

  if (
    immutableIndexes.some(
      i => Boolean(formulas[i])
    )
  ) {
    throw new Error(
      'Listening A,C:H,O must contain literal values, not formulas.'
    );
  }

  const values =
    range.getDisplayValues()[0];

  const j = {
    id: values[0],
    status: values[1],
    created: values[2],
    parentSetId: values[3],
    issueNo: Number(values[4]),
    section: values[5],
    skillId: values[6],
    audioPlanRaw: values[7],
    storageMode: values[14]
  };

  if (
    !/^H3-L-\d{8}-\d{3}$/
      .test(j.id)
  ) {
    throw new Error(
      'Invalid LISTEN_GEN_ID.'
    );
  }

  if (
    j.status !== 'pending' &&
    j.status !== 'processing'
  ) {
    throw new Error(
      'Listening STATUS must be pending or processing.'
    );
  }

  if (
    !j.created ||
    !Number.isFinite(
      Date.parse(j.created)
    )
  ) {
    throw new Error(
      'Listening CREATED_AT must be an ISO datetime.'
    );
  }

  if (
    !j.parentSetId ||
    j.parentSetId.length > 128 ||
    /[\x00-\x1F]/
      .test(j.parentSetId)
  ) {
    throw new Error(
      'Invalid PARENT_SET_ID.'
    );
  }

  if (
    !Number.isInteger(j.issueNo) ||
    j.issueNo < 1
  ) {
    throw new Error(
      'LISTENING_ISSUE_NO must be a positive integer.'
    );
  }

  if (
    !/^K[1-5]$/
      .test(j.section)
  ) {
    throw new Error(
      'SECTION_KEY must be K1-K5.'
    );
  }

  if (
    !new RegExp(
      '^H3-' +
      j.section +
      '-SK\\d{3}$'
    ).test(j.skillId)
  ) {
    throw new Error(
      'SKILL_ID does not match SECTION_KEY.'
    );
  }

  if (
    j.storageMode !==
    HQ_LISTENING_STORAGE_MODE
  ) {
    throw new Error(
      'Listening STORAGE_MODE must be ' +
      HQ_LISTENING_STORAGE_MODE +
      '.'
    );
  }

  j.plan =
    validateListeningAudioPlan_(
      j.audioPlanRaw,
      j.section
    );

  j.hash =
    hash_(
      JSON.stringify([
        j.id,
        j.created,
        j.parentSetId,
        j.issueNo,
        j.section,
        j.skillId,
        j.audioPlanRaw,
        j.storageMode
      ])
    );

  return j;
}


function validateListeningAudioPlan_(
  raw,
  section
) {
  let plan;

  try {
    plan = JSON.parse(
      String(raw)
    );
  } catch (e) {
    throw new Error(
      'AUDIO_PLAN_JSON is malformed.'
    );
  }

  if (
    !Array.isArray(plan) ||
    !plan.length ||
    plan.length >
      HQ_LISTENING_MAX_SEGMENTS
  ) {
    throw new Error(
      'AUDIO_PLAN_JSON must contain 1-' +
      HQ_LISTENING_MAX_SEGMENTS +
      ' segments.'
    );
  }

  const roles = new Set([
    'prompt',
    'choice1',
    'choice2',
    'choice3',
    'choice4',
    'passage'
  ]);

  let totalChars = 0;

  plan.forEach(
    (segment, i) => {
      if (
        !segment ||
        typeof segment !== 'object' ||
        Array.isArray(segment)
      ) {
        throw new Error(
          'AUDIO_PLAN_JSON segment ' +
          (i + 1) +
          ' must be an object.'
        );
      }

      const keys =
        Object.keys(segment)
          .sort();

      const expectedKeys = [
        'pause_ms_after',
        'repeat',
        'role',
        'text'
      ];

      if (
        JSON.stringify(keys) !==
        JSON.stringify(expectedKeys)
      ) {
        throw new Error(
          'AUDIO_PLAN_JSON segment ' +
          (i + 1) +
          ' has unexpected fields.'
        );
      }

      const isNumberRole =
        Object.prototype
          .hasOwnProperty.call(
            HQ_K1_NUMBER_TEXTS,
            segment.role
          );

      if (
        !roles.has(
          segment.role
        ) &&
        !isNumberRole
      ) {
        throw new Error(
          'Invalid audio role at segment ' +
          (i + 1) +
          '.'
        );
      }

      if (
        isNumberRole &&
        section !== 'K1'
      ) {
        throw new Error(
          'K1 choice-number roles are not allowed in ' +
          section +
          '.'
        );
      }

      if (isNumberRole) {
        if (
          segment.text !==
          HQ_K1_NUMBER_TEXTS[
            segment.role
          ]
        ) {
          throw new Error(
            'Invalid K1 choice-number text at segment ' +
            (i + 1) +
            '.'
          );
        }
      } else if (
        typeof segment.text !==
          'string' ||
        !segment.text.trim() ||
        segment.text.length > 5000 ||
        !/[가-힣]/.test(
          segment.text
        ) ||
        /[\u3040-\u30ff]/
          .test(segment.text) ||
        /[\x00-\x08\x0B\x0C\x0E-\x1F]/
          .test(segment.text)
      ) {
        throw new Error(
          'Invalid Korean audio text at segment ' +
          (i + 1) +
          '.'
        );
      }

      if (
        segment.repeat !== 1 &&
        segment.repeat !== 2
      ) {
        throw new Error(
          'repeat must be 1 or 2 at segment ' +
          (i + 1) +
          '.'
        );
      }

      if (
        isNumberRole &&
        segment.repeat !== 1
      ) {
        throw new Error(
          'K1 choice-number repeat must be 1 at segment ' +
          (i + 1) +
          '.'
        );
      }

      if (
        !Number.isInteger(
          segment.pause_ms_after
        ) ||
        segment.pause_ms_after < 0 ||
        segment.pause_ms_after >
          HQ_LISTENING_MAX_PAUSE_MS
      ) {
        throw new Error(
          'pause_ms_after must be an integer 0-' +
          HQ_LISTENING_MAX_PAUSE_MS +
          ' at segment ' +
          (i + 1) +
          '.'
        );
      }

      totalChars +=
        segment.text.length;
    }
  );

  if (
    totalChars >
    HQ_LISTENING_MAX_TOTAL_CHARS
  ) {
    throw new Error(
      'AUDIO_PLAN_JSON total text exceeds ' +
      HQ_LISTENING_MAX_TOTAL_CHARS +
      ' characters.'
    );
  }

  return plan;
}


function locateListening_(
  sheet,
  id
) {
  const last =
    sheet.getLastRow();

  const matches = [];

  if (last > 1) {
    sheet
      .getRange(
        2,
        1,
        last - 1,
        1
      )
      .getDisplayValues()
      .forEach(
        (r, i) => {
          if (r[0] === id) {
            matches.push(i + 2);
          }
        }
      );
  }

  if (matches.length !== 1) {
    throw new Error(
      'LISTEN_GEN_ID must occur exactly once in listening_audio_queue_v1.'
    );
  }

  return matches[0];
}


function currentListeningRow_(
  sheet,
  j
) {
  const row =
    locateListening_(
      sheet,
      j.id
    );

  const current =
    readListeningJob_(
      sheet,
      row
    );

  if (
    current.hash !== j.hash
  ) {
    throw new Error(
      'Immutable Listening audio input changed during processing; restore A,C:H,O.'
    );
  }

  return row;
}


function loadListeningState_(
  sheet,
  j
) {
  const note =
    sheet
      .getRange(
        locateListening_(
          sheet,
          j.id
        ),
        1
      )
      .getNote();

  if (!note) {
    return null;
  }

  if (
    !note.startsWith(
      HQ_LISTENING_NOTE
    )
  ) {
    throw new Error(
      'Listening A-cell note is reserved for HANGUL_LISTENING_AUDIO_STATE_V1 recovery metadata.'
    );
  }

  const state =
    JSON.parse(
      note.slice(
        HQ_LISTENING_NOTE.length
      )
    );

  if (
    state.id !== j.id ||
    state.hash !== j.hash
  ) {
    throw new Error(
      'Immutable Listening content differs from its checkpoint.'
    );
  }

  return state;
}


function checkpointListening_(
  sheet,
  j,
  state
) {
  state.updatedAt =
    new Date().toISOString();

  sheet
    .getRange(
      currentListeningRow_(
        sheet,
        j
      ),
      1
    )
    .setNote(
      HQ_LISTENING_NOTE +
      JSON.stringify(state)
    );

  SpreadsheetApp.flush();
}


function runListeningJob_(
  sheet,
  j,
  c
) {
  let stage = 'checkpoint';
  let state;

  try {
    state =
      loadListeningState_(
        sheet,
        j
      );

    if (!state) {
      if (
        j.status ===
        'processing'
      ) {
        throw new Error(
          'processing Listening row has no checkpoint.'
        );
      }

      const voice =
        shuffle_(
          HQ_VOICES.slice()
        )[0];

      state = {
        id: j.id,
        hash: j.hash,
        folderId:
          audioTargetFolderId_(
            c,
            '5W',
            j.id
          ),
        voice:
          voice.label,
        audioVersion:
          HQ_LISTENING_AUDIO_VERSION,
        stage: 'prepared',
        attempts: 0
      };
    }

    assertAudioFolderState_(
      c,
      audioTargetFolderId_(
        c,
        '5L',
        j.parentSetId
      ),
      state.folderId
    );

    if (
      state.audioVersion !==
        HQ_LISTENING_AUDIO_VERSION &&
      state.audioVersion !==
        HQ_LISTENING_AUDIO_VERSION_LEADING5S
    ) {
      throw new Error(
        'Unknown persisted Listening audio version.'
      );
    }

    if (
      j.status === 'pending'
    ) {
      state.attempts = 0;
    }

    if (
      state.attempts >= 3
    ) {
      throw new Error(
        'Repeated Listening interruption: inspect the execution log, then reset STATUS to pending.'
      );
    }

    state.attempts++;

    checkpointListening_(
      sheet,
      j,
      state
    );

    const startRow =
      currentListeningRow_(
        sheet,
        j
      );

    sheet
      .getRange(
        startRow,
        2
      )
      .setValue(
        'processing'
      );

    sheet
      .getRange(
        startRow,
        13
      )
      .clearContent();

    SpreadsheetApp.flush();

    stage = 'preflight';

    const spec =
      listeningAudioSpec_(
        j,
        state
      );

    /**
     * PAYLOAD_HASH / ASSIGNMENTは
     * Apps Script出力として保存する。
     */
    const preflightRow =
      currentListeningRow_(
        sheet,
        j
      );

    sheet
      .getRange(
        preflightRow,
        9,
        1,
        2
      )
      .setValues([
        [
          j.hash,
          spec.assignment
        ]
      ]);

    SpreadsheetApp.flush();

    const folder =
      DriveApp.getFolderById(
        state.folderId
      );

    let audio =
      findAudio_(
        folder,
        j.id,
        spec,
        state
      );

    currentListeningRow_(
      sheet,
      j
    );

    stage = 'audio';

    if (!audio) {
      currentListeningRow_(
        sheet,
        j
      );

      state.stage =
        'audio_requested';

      checkpointListening_(
        sheet,
        j,
        state
      );

      const blob =
        synthesize_(
          spec.ssml,
          c
        );

      blob.setName(
        spec.tempName
      );

      audio =
        folder.createFile(
          blob
        );
    }

    audio.setDescription(
      spec.description
    );

    state.audioId =
      audio.getId();

    state.stage =
      'audio_saved';

    checkpointListening_(
      sheet,
      j,
      state
    );

    audio.setName(
      j.id + '.mp3'
    );

    stage = 'publish';

    const row =
      currentListeningRow_(
        sheet,
        j
      );

    const completed =
      state.completedAt ||
      new Date().toISOString();

    /**
     * I:N
     * PAYLOAD_HASH
     * ASSIGNMENT
     * AUDIO_FILE_ID
     * AUDIO_URL
     * ERROR
     * PROCESSED_AT
     */
    sheet
      .getRange(
        row,
        9,
        1,
        6
      )
      .setValues([
        [
          j.hash,
          spec.assignment,
          audio.getId(),
          audio.getUrl(),
          '',
          completed
        ]
      ]);

    state.stage = 'done';
    state.completedAt =
      completed;

    checkpointListening_(
      sheet,
      j,
      state
    );

    sheet
      .getRange(
        currentListeningRow_(
          sheet,
          j
        ),
        2
      )
      .setValue('done');

    SpreadsheetApp.flush();

    const result = {
      status: 'done',
      queue: 'listening',
      listen_gen_id: j.id,
      file_id:
        audio.getId(),
      audio_url:
        audio.getUrl()
    };

    console.log(
      JSON.stringify(result)
    );

    return result;

  } catch (e) {
    const message =
      stage +
      ': ' +
      safeError_(e, c);

    try {
      const row =
        locateListening_(
          sheet,
          j.id
        );

      sheet
        .getRange(
          row,
          13
        )
        .setValue(
          message
        );

      sheet
        .getRange(
          row,
          2
        )
        .setValue(
          'error'
        );

      SpreadsheetApp.flush();

    } catch (writeError) {
      console.error(
        'Could not publish Listening error status for ' +
        j.id
      );
    }

    console.error(
      j.id +
      ' ' +
      message
    );

    return {
      status: 'error',
      queue: 'listening',
      listen_gen_id: j.id,
      stage: stage,
      error: message
    };
  }
}


function listeningAudioSpec_(
  j,
  state
) {
  const voice =
    HQ_VOICES.find(
      v =>
        v.label ===
        state.voice
    );

  if (!voice) {
    throw new Error(
      'Invalid persisted Listening voice assignment.'
    );
  }

  if (
    state.audioVersion !==
      HQ_LISTENING_AUDIO_VERSION &&
    state.audioVersion !==
      HQ_LISTENING_AUDIO_VERSION_LEADING5S
  ) {
    throw new Error(
      'Unknown persisted Listening audio version.'
    );
  }

  const hasNumberVoice =
    j.plan.some(
      segment =>
        Object.prototype
          .hasOwnProperty.call(
            HQ_K1_NUMBER_TEXTS,
            segment.role
          )
    );

  let body = '';
  let first = true;

  j.plan.forEach(
    segment => {
      const segmentVoice =
        Object.prototype
          .hasOwnProperty.call(
            HQ_K1_NUMBER_TEXTS,
            segment.role
          )
          ? HQ_K1_NUMBER_VOICE
          : voice;

      for (
        let n = 0;
        n < segment.repeat;
        n++
      ) {
        const isBetweenRepeats =
          n < segment.repeat - 1;

        const pauseMs =
          isBetweenRepeats
            ? Math.max(
                650,
                segment.pause_ms_after
              )
            : segment.pause_ms_after;

        body +=
          azureVoiceBlock_(
            segmentVoice,
            segment.text,
            pauseMs + 'ms',
            first &&
            state.audioVersion ===
              HQ_LISTENING_AUDIO_VERSION_LEADING5S
              ? HQ_LEADING_SILENCE_MS_LEGACY +
                'ms'
              : null
          );

        first = false;
      }
    }
  );

  const ssml =
    '<speak version="1.0" ' +
    'xmlns="http://www.w3.org/2001/10/synthesis" ' +
    'xmlns:mstts="http://www.w3.org/2001/mstts" ' +
    'xml:lang="ko-KR">' +
    body +
    '</speak>';

  const fingerprint =
    hash_(
      state.audioVersion +
      ssml
    );

  return {
    ssml: ssml,

    assignment:
      'VOICE=' +
      state.voice +
      (
        hasNumberVoice
          ? ';NUMBER_VOICE=' +
            HQ_K1_NUMBER_VOICE.label
          : ''
      ),

    fingerprint:
      fingerprint,

    tempName:
      j.id +
      '.' +
      fingerprint +
      '.mp3',

    description:
      'HANGUL_LISTENING_AUDIO_V1:' +
      fingerprint
  };
}


/* =========================================================
 * JOB READING / VALIDATION
 * =======================================================*/

function readJob_(sheet, row) {
  /**
   * A:Rを読むが、
   * immutable inputとして扱うのは
   * A,C,D,F:L,R。
   *
   * E=ANSWERS_LOGは音声処理中に変更可能。
   * M:QはApps Script出力。
   */

  const range =
    sheet.getRange(
      row,
      1,
      1,
      18
    );

  const formulas =
    range.getFormulas()[0];

  /**
   * A:LおよびRはliteral必須。
   * M:QはApps Script側出力なので
   * ここでは判定対象外。
   */
  const immutableIndexes = [
    0,  // A SET_ID
    2,  // C CREATED_AT
    3,  // D QUESTIONS_LOG
    5,  // F Q1
    6,  // G Q2
    7,  // H Q3
    8,  // I Q4
    9,  // J Q5A1
    10, // K Q5B1
    11, // L Q5A2
    17  // R STORAGE_MODE
  ];

  if (
    immutableIndexes.some(
      i => Boolean(formulas[i])
    )
  ) {
    throw new Error(
      'A,C,D,F:L,R must contain literal values, not formulas.'
    );
  }

  const values =
    range.getDisplayValues()[0];

  const j = {
    id: values[0],
    status: values[1],
    created: values[2],
    q: values[3],

    /**
     * E列は参照用に保持するが
     * hash・音声生成には使わない。
     */
    a: values[4],

    audio:
      values.slice(5, 12),

    storageMode:
      values[17]
  };

  if (
    !/^[A-Z0-9]+-\d{8}-\d{2,3}$/
      .test(j.id)
  ) {
    throw new Error(
      'Invalid SET_ID.'
    );
  }

  if (
    !j.created ||
    !Number.isFinite(
      Date.parse(j.created)
    )
  ) {
    throw new Error(
      'CREATED_AT must be an ISO datetime.'
    );
  }

  if (
    j.storageMode !==
    HQ_STORAGE_MODE
  ) {
    throw new Error(
      'STORAGE_MODE must be ' +
      HQ_STORAGE_MODE + '.'
    );
  }

  validateQuestionsLog_(
    j.q,
    j.id
  );

  if (
    j.audio.some(
      t =>
        !t.trim() ||
        t.length > 5000 ||
        !/[가-힣]/.test(t) ||
        /[\x00-\x08\x0B\x0C\x0E-\x1F]/
          .test(t)
    )
  ) {
    throw new Error(
      'Seven Korean audio texts are required; max 5000 characters each.'
    );
  }

  const q3Parts =
    q3AudioParts_(
      j.audio[2]
    );

  if (
    q3Parts.length > 2 ||
    (
      isV4QuestionSet_(j.q) &&
      q3Parts.length !== 2
    )
  ) {
    throw new Error(
      'Q3_AUDIO must contain exactly two nonempty lines for v4 sets; legacy rows may contain one line.'
    );
  }

  /**
   * 重要:
   * ANSWERS_LOG(E)を含めない。
   *
   * ユーザー回答中にEが追記されても
   * audio jobの同一性を保つ。
   */
  j.hash = hash_(
    JSON.stringify([
      j.id,
      j.created,
      j.q,
      j.audio,
      j.storageMode
    ])
  );

  return j;
}


function validateQuestionsLog_(
  text,
  id
) {
  const clean =
    normalized_(text);

  const ms =
    markers_(clean);

  if (
    ms.length !== 1 ||
    ms[0].index !== 0 ||
    ms[0][1] !== id ||
    !clean
      .slice(
        ms[0][0].length
      )
      .trim()
  ) {
    throw new Error(
      'QUESTIONS_LOG must be one nonempty [SET ' +
      id +
      '] block.'
    );
  }

  if (
    /\[\/?AUDIO_JOB\]/
      .test(clean)
  ) {
    throw new Error(
      'Do not put legacy AUDIO_JOB metadata in QUESTIONS_LOG.'
    );
  }
}


/* =========================================================
 * SET_ID / HASH CONSISTENCY
 * =======================================================*/

function locate_(sheet, id) {
  const last =
    sheet.getLastRow();

  const matches = [];

  if (last > 1) {
    sheet
      .getRange(
        2,
        1,
        last - 1,
        1
      )
      .getDisplayValues()
      .forEach(
        (r, i) => {
          if (r[0] === id) {
            matches.push(i + 2);
          }
        }
      );
  }

  if (matches.length !== 1) {
    throw new Error(
      'SET_ID must occur exactly once in queue.'
    );
  }

  return matches[0];
}


function currentRow_(
  sheet,
  j
) {
  const row =
    locate_(
      sheet,
      j.id
    );

  const current =
    readJob_(
      sheet,
      row
    );

  if (
    current.hash !== j.hash
  ) {
    throw new Error(
      'Immutable audio input changed during processing; restore A,C,D,F:L,R.'
    );
  }

  return row;
}


/* =========================================================
 * RECOVERY CHECKPOINT
 * =======================================================*/

function loadState_(
  sheet,
  j
) {
  const note =
    sheet
      .getRange(
        locate_(
          sheet,
          j.id
        ),
        1
      )
      .getNote();

  if (!note) {
    return null;
  }

  if (
    !note.startsWith(
      HQ_NOTE
    )
  ) {
    throw new Error(
      'A-cell note is reserved for HANGUL_QUEUE_STATE_V3 recovery metadata.'
    );
  }

  const state =
    JSON.parse(
      note.slice(
        HQ_NOTE.length
      )
    );

  if (
    state.id !== j.id ||
    state.hash !== j.hash
  ) {
    throw new Error(
      'Immutable SET content differs from its checkpoint.'
    );
  }

  return state;
}


function checkpoint_(
  sheet,
  j,
  state
) {
  state.updatedAt =
    new Date().toISOString();

  sheet
    .getRange(
      currentRow_(
        sheet,
        j
      ),
      1
    )
    .setNote(
      HQ_NOTE +
      JSON.stringify(state)
    );

  SpreadsheetApp.flush();
}


/* =========================================================
 * MAIN JOB
 * =======================================================*/

function runJob_(
  sheet,
  j,
  c
) {
  let stage = 'checkpoint';
  let state;

  try {
    state =
      loadState_(
        sheet,
        j
      );

    if (!state) {
      if (
        j.status ===
        'processing'
      ) {
        throw new Error(
          'processing row has no V3 checkpoint.'
        );
      }

      /**
       * Q1-Q4:
       * 4 voiceを1回ずつ。
       *
       * Q5:
       * A/Bで異なる2 voice。
       */
      const q =
        shuffle_(
          HQ_VOICES.slice()
        ).map(
          v => v.label
        );

      const d =
        shuffle_(
          HQ_VOICES.slice()
        )
          .slice(0, 2)
          .map(
            v => v.label
          );

      state = {
        id: j.id,
        hash: j.hash,
        folderId:
          audioTargetFolderId_(
            c,
            '5L',
            j.parentSetId
          ),
        voices:
          q.concat(d),

        /**
         * v4表示で発行された新規セットだけ新音声仕様を使う。
         * 旧表示のpending rowはlegacy音声仕様を維持する。
         * 既存checkpointにはaudioVersionが無いため、
         * audioSpec_側でlegacyへfallbackする。
         */
        audioVersion:
          isV4QuestionSet_(j.q)
            ? HQ_AUDIO_VERSION
            : HQ_AUDIO_VERSION_LEGACY,

        stage: 'prepared',
        attempts: 0
      };
    }

    assertAudioFolderState_(
      c,
      audioTargetFolderId_(
        c,
        '5W',
        j.id
      ),
      state.folderId
    );

    /**
     * 手動でerror→pendingに戻した場合、
     * interruption countをリセット。
     */
    if (
      j.status ===
      'pending'
    ) {
      state.attempts = 0;
    }

    if (
      state.attempts >= 3
    ) {
      throw new Error(
        'Repeated interruption: inspect the execution log, then reset STATUS to pending.'
      );
    }

    state.attempts++;

    /**
     * processingに変更する前に
     * recovery noteを保存。
     */
    checkpoint_(
      sheet,
      j,
      state
    );

    const startRow =
      currentRow_(
        sheet,
        j
      );

    sheet
      .getRange(
        startRow,
        2
      )
      .setValue(
        'processing'
      );

    sheet
      .getRange(
        startRow,
        16
      )
      .clearContent();

    SpreadsheetApp.flush();

    stage = 'preflight';

    /**
     * E=ANSWERS_LOGはここでも参照しない。
     */
    const spec =
      audioSpec_(
        j,
        state
      );

    const folder =
      DriveApp.getFolderById(
        state.folderId
      );

    let audio =
      findAudio_(
        folder,
        j.id,
        spec,
        state
      );

    currentRow_(
      sheet,
      j
    );

    stage = 'audio';

    if (!audio) {
      currentRow_(
        sheet,
        j
      );

      state.stage =
        'audio_requested';

      checkpoint_(
        sheet,
        j,
        state
      );

      const blob =
        synthesize_(
          spec.ssml,
          c
        );

      /**
       * fingerprint付き一時名で先に保存。
       * Drive保存直後に中断しても
       * 次回実行時に再発見できる。
       */
      blob.setName(
        spec.tempName
      );

      audio =
        folder.createFile(
          blob
        );
    }

    audio.setDescription(
      spec.description
    );

    state.audioId =
      audio.getId();

    state.stage =
      'audio_saved';

    checkpoint_(
      sheet,
      j,
      state
    );

    /**
     * 正式名へ変更。
     */
    audio.setName(
      j.id + '.mp3'
    );

    stage = 'publish';

    const row =
      currentRow_(
        sheet,
        j
      );

    const completed =
      state.completedAt ||
      new Date().toISOString();

    /**
     * M:Q
     * ASSIGNMENT
     * AUDIO_FILE_ID
     * AUDIO_URL
     * ERROR
     * PROCESSED_AT
     */
    sheet
      .getRange(
        row,
        13,
        1,
        5
      )
      .setValues([
        [
          spec.assignment,
          audio.getId(),
          audio.getUrl(),
          '',
          completed
        ]
      ]);

    state.stage = 'done';
    state.completedAt =
      completed;

    checkpoint_(
      sheet,
      j,
      state
    );

    sheet
      .getRange(
        currentRow_(
          sheet,
          j
        ),
        2
      )
      .setValue('done');

    SpreadsheetApp.flush();

    const result = {
      status: 'done',
      set_id: j.id,
      file_id:
        audio.getId(),
      audio_url:
        audio.getUrl()
    };

    console.log(
      JSON.stringify(result)
    );

    return result;

  } catch (e) {
    const message =
      stage +
      ': ' +
      safeError_(e, c);

    try {
      const row =
        locate_(
          sheet,
          j.id
        );

      sheet
        .getRange(
          row,
          16
        )
        .setValue(
          message
        );

      sheet
        .getRange(
          row,
          2
        )
        .setValue(
          'error'
        );

      SpreadsheetApp.flush();

    } catch (writeError) {
      console.error(
        'Could not publish error status for ' +
        j.id
      );
    }

    console.error(
      j.id +
      ' ' +
      message
    );

    return {
      status: 'error',
      set_id: j.id,
      stage: stage,
      error: message
    };
  }
}


/* =========================================================
 * AUDIO SPEC
 * =======================================================*/

function audioSpec_(
  j,
  state
) {
  const voices =
    state.voices.map(
      label =>
        HQ_VOICES.find(
          v =>
            v.label ===
            label
        )
    );

  if (
    voices.length !== 6 ||
    voices.some(v => !v) ||
    new Set(
      state.voices.slice(
        0,
        4
      )
    ).size !== 4 ||
    voices[4] === voices[5]
  ) {
    throw new Error(
      'Invalid persisted voice assignment.'
    );
  }

  const audioVersion =
    state.audioVersion ||
    HQ_AUDIO_VERSION_LEGACY;

  const isV4 =
    audioVersion ===
      HQ_AUDIO_VERSION ||
    audioVersion ===
      HQ_AUDIO_VERSION_V4_LEADING5S ||
    audioVersion ===
      HQ_AUDIO_VERSION_V4_1200;

  const usesLeadingSilence =
    audioVersion ===
      HQ_AUDIO_VERSION_V4_LEADING5S ||
    audioVersion ===
      HQ_AUDIO_VERSION_V4_1200;

  if (
    audioVersion !== HQ_AUDIO_VERSION &&
    audioVersion !== HQ_AUDIO_VERSION_V4_LEADING5S &&
    audioVersion !== HQ_AUDIO_VERSION_V4_1200 &&
    audioVersion !== HQ_AUDIO_VERSION_LEGACY
  ) {
    throw new Error(
      'Unknown persisted audio version.'
    );
  }

  const q3Parts =
    q3AudioParts_(
      j.audio[2]
    );

  if (
    isV4 &&
    q3Parts.length !== 2
  ) {
    throw new Error(
      'v4 Q3_AUDIO requires original and replaced completed sentence.'
    );
  }

  /**
   * 特定のQ5Bのみ、既存仕様どおり
   * Sentenceboundary-exact=100ms を使用する。
   */
  const b =
    j.audio[5].trim() ===
    '정말요? 축하해요!'
      ? azureSpecialQ5BBlock_(
          voices[5],
          j.audio[5],
          '100ms',
          '0.65s'
        )
      : azureVoiceBlock_(
          voices[5],
          j.audio[5],
          '0.65s'
        );

  let body;

  if (isV4) {
    /**
     * v4/v5 logical order:
     * Q1
     * Q2
     * Q3 original
     * Q3 replacement completed sentence
     * Q4
     * Q5A
     * Q5B
     * Q5A
     *
     * v5 current generation has no leading silence.
     * v4 persisted checkpoints keep the historical 5000ms leading break
     * for recovery compatibility only.
     */
    body =
      azureVoiceBlock_(
        voices[0],
        j.audio[0],
        '1.2s',
        usesLeadingSilence
          ? HQ_LEADING_SILENCE_MS_LEGACY + 'ms'
          : null
      ) +

      azureVoiceBlock_(
        voices[1],
        j.audio[1],
        '1.2s'
      ) +

      azureVoiceBlock_(
        voices[2],
        q3Parts[0],
        '0.65s'
      ) +

      azureVoiceBlock_(
        voices[2],
        q3Parts[1],
        '1.2s'
      ) +

      azureVoiceBlock_(
        voices[3],
        j.audio[3],
        '1.2s'
      ) +

      azureVoiceBlock_(
        voices[4],
        j.audio[4],
        '0.65s'
      ) +

      b +

      azureVoiceBlock_(
        voices[4],
        j.audio[6],
        (
          audioVersion === HQ_AUDIO_VERSION ||
          audioVersion === HQ_AUDIO_VERSION_V4_LEADING5S
        )
          ? '2.1s'
          : '1.2s'
      );

  } else {
    /**
     * legacy checkpoint / legacy display row:
     * 旧v3音声仕様をそのまま維持する。
     */
    body =
      j.audio
        .slice(0, 4)
        .map(
          (t, i) =>
            azureVoiceBlock_(
              voices[i],
              t,
              '1.2s'
            )
        )
        .join('') +

      azureVoiceBlock_(
        voices[4],
        j.audio[4],
        '0.65s'
      ) +

      b +

      azureVoiceBlock_(
        voices[4],
        j.audio[6],
        '1.2s'
      );
  }

  const ssml =
    '<speak version="1.0" ' +
    'xmlns="http://www.w3.org/2001/10/synthesis" ' +
    'xmlns:mstts="http://www.w3.org/2001/mstts" ' +
    'xml:lang="ko-KR">' +
    body +
    '</speak>';

  const fingerprint =
    hash_(
      audioVersion +
      ssml
    );

  const assignment = [
    'Q1',
    'Q2',
    'Q3',
    'Q4',
    'Q5A',
    'Q5B'
  ]
    .map(
      (k, i) =>
        k +
        '=' +
        state.voices[i]
    )
    .join(',');

  return {
    ssml: ssml,
    assignment: assignment,
    fingerprint: fingerprint,

    tempName:
      j.id +
      '.' +
      fingerprint +
      '.mp3',

    description:
      (
        audioVersion === HQ_AUDIO_VERSION
          ? 'HANGUL_AUDIO_V5:'
          : isV4
            ? 'HANGUL_AUDIO_V4:'
            : 'HANGUL_AUDIO_V3:'
      ) +
      fingerprint
  };
}


function isV4QuestionSet_(
  questionsLog
) {
  return /\[筆4\/置換\]/
    .test(
      String(
        questionsLog || ''
      )
    );
}


function q3AudioParts_(
  text
) {
  return normalized_(text)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}


/* =========================================================
 * AUDIO RECOVERY / DUPLICATE CHECK
 * =======================================================*/

function findAudio_(
  folder,
  id,
  spec,
  state
) {
  const files = [];

  [
    id + '.mp3',
    spec.tempName
  ].forEach(
    name => {
      const it =
        folder.getFilesByName(
          name
        );

      while (
        it.hasNext()
      ) {
        files.push(
          it.next()
        );
      }
    }
  );

  /**
   * 同じfileIdが
   * 正式名・temp名の双方から拾われた場合に備え
   * IDでdedupe。
   */
  const byId = {};

  files.forEach(
    f => {
      byId[f.getId()] = f;
    }
  );

  const unique =
    Object.keys(byId)
      .map(
        id =>
          byId[id]
      );

  if (
    state.audioId &&
    !unique.some(
      f =>
        f.getId() ===
        state.audioId
    )
  ) {
    /**
     * checkpointにaudioIdがある場合は
     * name検索に頼らず直接確認する。
     */
    let checkpointFile;

    try {
      checkpointFile =
        DriveApp.getFileById(
          state.audioId
        );
    } catch (e) {
      throw new Error(
        'Checkpoint MP3 is missing.'
      );
    }

    unique.push(
      checkpointFile
    );
  }

  const deduped = {};
  unique.forEach(
    f => {
      deduped[f.getId()] = f;
    }
  );

  const candidates =
    Object.keys(deduped)
      .map(
        k =>
          deduped[k]
      );

  if (
    candidates.length > 1
  ) {
    throw new Error(
      'Multiple MP3 candidates; resolve duplicates before retrying.'
    );
  }

  if (
    !candidates.length
  ) {
    return null;
  }

  const file =
    candidates[0];

  if (
    file.isTrashed() ||
    file.getSize() < 128 ||
    file.getMimeType() !==
      'audio/mpeg'
  ) {
    throw new Error(
      'Existing MP3 is invalid.'
    );
  }

  const description =
    file.getDescription();

  /**
   * temp名ならfingerprint一致が名前で保証される。
   * 正式名ならdescriptionで一致確認。
   */
  const verified =
    file.getName() ===
      spec.tempName ||
    description ===
      spec.description;

  if (!verified) {
    throw new Error(
      'Existing same-name MP3 has different or unverified content; no automatic reuse.'
    );
  }

  return file;
}


/* =========================================================
 * AZURE TTS
 * =======================================================*/

function synthesize_(
  ssml,
  c
) {
  const response =
    UrlFetchApp.fetch(
      'https://' +
      c.AZURE_SPEECH_REGION +
      '.tts.speech.microsoft.com/cognitiveservices/v1',
      {
        method: 'post',

        contentType:
          'application/ssml+xml',

        headers: {
          'Ocp-Apim-Subscription-Key':
            c.AZURE_SPEECH_KEY,

          'X-Microsoft-OutputFormat':
            'audio-24khz-160kbitrate-mono-mp3',

          'User-Agent':
            'hangul-azure-tts'
        },

        payload: ssml,

        muteHttpExceptions:
          true
      }
    );

  if (
    response.getResponseCode() !==
    200
  ) {
    throw new Error(
      'Azure TTS HTTP ' +
      response.getResponseCode() +
      ': ' +
      response
        .getContentText()
        .slice(0, 500)
    );
  }

  const bytes =
    response.getContent();

  const u =
    i => bytes[i] & 255;

  if (
    bytes.length < 128 ||
    !(
      (
        u(0) === 73 &&
        u(1) === 68 &&
        u(2) === 51
      ) ||
      (
        u(0) === 255 &&
        (u(1) & 224) === 224
      )
    )
  ) {
    throw new Error(
      'Azure returned an invalid MP3 payload.'
    );
  }

  return Utilities.newBlob(
    bytes,
    'audio/mpeg'
  );
}


function azureVoiceBlock_(
  voice,
  text,
  trailingPause,
  leadingPause
) {
  return (
    '<voice name="' +
      voice.id +
    '">' +

      (
        leadingPause
          ? '<break time="' +
              leadingPause +
            '"/>'
          : ''
      ) +

      '<prosody rate="' +
        voice.rate +
      '">' +

        escapeXml_(text) +

      '</prosody>' +

      '<break time="' +
        trailingPause +
      '"/>' +

    '</voice>'
  );
}


function azureSpecialQ5BBlock_(
  voice,
  text,
  sentenceGap,
  trailingPause
) {
  return (
    '<voice name="' +
      voice.id +
    '">' +

      '<mstts:silence ' +
        'type="Sentenceboundary-exact" ' +
        'value="' +
        sentenceGap +
        '"/>' +

      '<prosody rate="' +
        voice.rate +
      '">' +

        escapeXml_(text) +

      '</prosody>' +

      '<break time="' +
        trailingPause +
      '"/>' +

    '</voice>'
  );
}


/* =========================================================
 * UTILITIES
 * =======================================================*/

function normalized_(text) {
  return String(text)
    .replace(
      /\r\n?/g,
      '\n'
    )
    .trim();
}


function markers_(text) {
  return Array.from(
    text.matchAll(
      /^\[SET ([^\]\r\n]+)\][ \t]*\r?$/gm
    )
  );
}


function shuffle_(array) {
  for (
    let i =
      array.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      array[i],
      array[j]
    ] = [
      array[j],
      array[i]
    ];
  }

  return array;
}


function escapeXml_(text) {
  return String(text)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&apos;'
    );
}


function hash_(text) {
  return Utilities
    .computeDigest(
      Utilities.DigestAlgorithm
        .SHA_256,
      text,
      Utilities.Charset.UTF_8
    )
    .map(
      b =>
        (
          '0' +
          (
            (b + 256) %
            256
          )
            .toString(16)
        ).slice(-2)
    )
    .join('');
}


function safeError_(
  error,
  c
) {
  return String(
    error &&
    error.message ||
    error
  )
    .split(
      c.AZURE_SPEECH_KEY
    )
    .join(
      '[REDACTED]'
    )
    .slice(
      0,
      1500
    );
}


/* =========================================================
 * WEB APP
 * =======================================================*/

/**
 * HTTP経由でjobは実行しない。
 * pingのみ。
 */
function doGet(e) {
  const params =
    e &&
    e.parameter
      ? e.parameter
      : {};

  if (params.mode === 'SYSTEM_TEST') {
    return h3WebDoGet_(e);
  }

  const ping = params.ping === '1';

  return ContentService
    .createTextOutput(
      JSON.stringify(
        ping
          ? {
              ok: true,
              service:
                'hangul-azure-tts',
              mode:
                'sheet_only_v3',
              version: 4
            }
          : {
              ok: false,
              error:
                'Use the authorized Sheet queue. HTTP job execution is disabled.'
            }
      )
    )
    .setMimeType(
      ContentService
        .MimeType
        .JSON
    );
}