/**
 * Production 5W Web transaction core.
 *
 * D3 activation:
 * - production submit routing may reach h3WrittenSubmit_
 * - written_web_txn_v1 is the durable transaction journal
 * - learner mutation surface remains queue!E (ANSWERS_LOG) only
 * - scheduler/history propagation after queue E remains outside this core
 * - source identity, PREPARED recovery, and set-level idempotency remain fail-closed
 */

var H3_WRITTEN_PRODUCTION_COMMIT_ENABLED = true;

var H3_WEB_WRITTEN_TXN_SHEET = 'written_web_txn_v1';

var H3_WEB_WRITTEN_TXN_HEADERS = [
  'TXN_ID',
  'SET_ID',
  'STAGE_ID',
  'MODE',
  'RAW_INPUT_JSON',
  'REQUEST_FINGERPRINT',
  'SOURCE_BINDING_SHA256',
  'CREATED_AT',
  'STATUS',
  'RESULT_JSON',
  'SCORE',
  'PRESTATE_JSON',
  'PRESTATE_SHA256',
  'POSTSTATE_SHA256',
  'COMMITTED_AT',
  'ERROR'
];

var H3_WEB_WRITTEN_SECTIONS = [
  'D2', 'D3', 'D4', 'D5', 'D6'
];

function h3WrittenNormalizeAnswers_(request) {
  if (!request || request.schema !== 'H3_WEB_SUBMIT_V1') {
    throw new Error('INVALID_SUBMIT_SCHEMA');
  }
  if (request.mode !== 'WRITTEN') {
    throw new Error('WRITTEN_MODE_REQUIRED');
  }
  if (
    !request.set_id ||
    !Array.isArray(request.answers) ||
    request.answers.length !== 5
  ) {
    throw new Error('INVALID_WRITTEN_SUBMISSION');
  }

  return request.answers.map(function (answer, i) {
    if (
      !answer ||
      answer.section !== H3_WEB_WRITTEN_SECTIONS[i]
    ) {
      throw new Error('WRITTEN_SECTION_ORDER_MISMATCH');
    }
    if (
      typeof answer.answer !== 'number' ||
      answer.answer < 1 ||
      answer.answer > 4 ||
      answer.answer % 1 !== 0
    ) {
      throw new Error('WRITTEN_ANSWER_OUT_OF_RANGE');
    }
    if (typeof answer.uncertain !== 'boolean') {
      throw new Error('WRITTEN_UNCERTAIN_MUST_BE_BOOLEAN');
    }
    return {
      section: answer.section,
      answer: answer.answer,
      uncertain: answer.uncertain
    };
  });
}

function h3WrittenNormalizedRequest_(setId, answers) {
  return {
    schema: 'H3_WEB_SUBMIT_V1',
    mode: 'WRITTEN',
    set_id: String(setId),
    answers: answers.map(function (answer) {
      return {
        section: answer.section,
        answer: answer.answer,
        uncertain: answer.uncertain
      };
    })
  };
}

function h3WrittenFingerprint_(setId, answers) {
  var body = {
    schema: 'H3_WRITTEN_REQUEST_FINGERPRINT_V1',
    mode: 'WRITTEN',
    set_id: String(setId),
    answers: answers.map(function (answer) {
      return {
        section: answer.section,
        answer: answer.answer,
        uncertain: answer.uncertain
      };
    })
  };
  return h3Sha256Hex_(JSON.stringify(body));
}

function h3WrittenParseJson_(text, code) {
  try {
    return JSON.parse(String(text || ''));
  } catch (_err) {
    throw new Error(code);
  }
}

function h3WrittenNormalizeLineEndings_(text) {
  return String(text || '').replace(/\r\n?/g, '\n');
}

function h3WrittenHeaderMap_(header) {
  var map = {};
  header.forEach(function (name, i) {
    map[String(name)] = i;
  });
  return map;
}

function h3WrittenRequireColumns_(map, names, sheetName) {
  names.forEach(function (name) {
    if (typeof map[name] !== 'number') {
      throw new Error(
        'WRITTEN_MISSING_COLUMN:' + sheetName + ':' + name
      );
    }
  });
}

function h3WrittenReadRows_(sheet, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    throw new Error('WRITTEN_EMPTY_SHEET:' + sheet.getName());
  }
  var values = sheet
    .getRange(1, 1, lastRow, width)
    .getDisplayValues();
  return {
    header: values[0],
    map: h3WrittenHeaderMap_(values[0]),
    rows: values.slice(1)
  };
}

function h3WrittenFindOne_(table, column, value, sheetName) {
  var col = table.map[column];
  var matches = [];
  table.rows.forEach(function (row, i) {
    if (String(row[col] || '') === String(value)) {
      matches.push({ rowNumber: i + 2, row: row });
    }
  });
  if (matches.length !== 1) {
    throw new Error(
      'WRITTEN_SOURCE_AUTHORITY_COUNT:' +
      sheetName + ':' + column + ':' + matches.length
    );
  }
  return matches[0];
}

function h3WrittenQueueSpreadsheet_() {
  var queueId = PropertiesService
    .getScriptProperties()
    .getProperty('QUEUE_SHEET_ID');
  if (!queueId) {
    throw new Error('WRITTEN_QUEUE_SHEET_ID_MISSING');
  }
  return SpreadsheetApp.openById(queueId);
}

function h3WrittenReadContext_(runtimeSpreadsheet, setId) {
  var queueSpreadsheet = h3WrittenQueueSpreadsheet_();
  var queueSheet = queueSpreadsheet.getSheetByName('queue');
  var stageSheet = runtimeSpreadsheet.getSheetByName(
    'written_set_stage_v1'
  );

  if (!queueSheet || !stageSheet) {
    throw new Error('WRITTEN_SOURCE_SHEET_MISSING');
  }

  var queue = h3WrittenReadRows_(queueSheet, 18);
  if (JSON.stringify(queue.header) !== JSON.stringify(HQ_HEADERS)) {
    throw new Error('WRITTEN_QUEUE_HEADER_MISMATCH');
  }

  var stage = h3WrittenReadRows_(stageSheet, 24);
  h3WrittenRequireColumns_(
    stage.map,
    [
      'STAGE_ID',
      'BLOCK_NO',
      'SET_OFFSET',
      'STATUS',
      'QUESTIONS_LOG_TEMPLATE',
      'ANSWER_KEY_JSON',
      'QUESTION_META_JSON',
      'Q1_AUDIO',
      'Q2_AUDIO',
      'Q3_AUDIO',
      'Q4_AUDIO',
      'Q5A1',
      'Q5B1',
      'Q5A2',
      'APPROVED_SOURCE',
      'POLICY_ID',
      'SOURCE_SNAPSHOT_ID',
      'ACTUAL_SET_ID',
      'ISSUED_AT'
    ],
    'written_set_stage_v1'
  );

  var queueRecord = h3WrittenFindOne_(
    queue,
    'SET_ID',
    setId,
    'queue'
  );
  var stageRecord = h3WrittenFindOne_(
    stage,
    'ACTUAL_SET_ID',
    setId,
    'written_set_stage_v1'
  );

  var qm = queue.map;
  var sm = stage.map;
  var qr = queueRecord.row;
  var sr = stageRecord.row;

  return {
    setId: String(setId),
    queueSheet: queueSheet,
    queueRowNumber: queueRecord.rowNumber,
    queueStatus: String(qr[qm.STATUS] || ''),
    questionsLog: String(qr[qm.QUESTIONS_LOG] || ''),
    answersLog: String(qr[qm.ANSWERS_LOG] || ''),
    queueAudio: [
      qr[qm.Q1_AUDIO], qr[qm.Q2_AUDIO], qr[qm.Q3_AUDIO],
      qr[qm.Q4_AUDIO], qr[qm.Q5A1], qr[qm.Q5B1], qr[qm.Q5A2]
    ].map(function (value) { return String(value || ''); }),
    storageMode: String(qr[qm.STORAGE_MODE] || ''),
    stageId: String(sr[sm.STAGE_ID] || ''),
    blockNo: Number(sr[sm.BLOCK_NO]),
    setOffset: Number(sr[sm.SET_OFFSET]),
    stageStatus: String(sr[sm.STATUS] || ''),
    questionsTemplate: String(sr[sm.QUESTIONS_LOG_TEMPLATE] || ''),
    answerKeyJson: String(sr[sm.ANSWER_KEY_JSON] || ''),
    questionMetaJson: String(sr[sm.QUESTION_META_JSON] || ''),
    stageAudio: [
      sr[sm.Q1_AUDIO], sr[sm.Q2_AUDIO], sr[sm.Q3_AUDIO],
      sr[sm.Q4_AUDIO], sr[sm.Q5A1], sr[sm.Q5B1], sr[sm.Q5A2]
    ].map(function (value) { return String(value || ''); }),
    approvedSource: String(sr[sm.APPROVED_SOURCE] || ''),
    policyId: String(sr[sm.POLICY_ID] || ''),
    sourceSnapshotId: String(sr[sm.SOURCE_SNAPSHOT_ID] || ''),
    actualSetId: String(sr[sm.ACTUAL_SET_ID] || ''),
    issuedAt: String(sr[sm.ISSUED_AT] || '')
  };
}

function h3WrittenMaterializeQuestions_(template, setId) {
  var match = /^H3-(\d{4})(\d{2})(\d{2})-\d{2,3}$/.exec(
    String(setId || '')
  );
  if (!match) {
    throw new Error('WRITTEN_SET_ID_FORMAT_INVALID');
  }

  var date = match[1] + '-' + match[2] + '-' + match[3];
  return h3WrittenNormalizeLineEndings_(template)
    .split('[SET_ID_PLACEHOLDER]')
    .join('[SET ' + String(setId) + ']')
    .split('{DATE_PLACEHOLDER}')
    .join(date);
}

function h3WrittenParseIssuedAnswers_(context) {
  var answerKey = h3WrittenParseJson_(
    context.answerKeyJson,
    'WRITTEN_ANSWER_KEY_JSON_INVALID'
  );
  var meta = h3WrittenParseJson_(
    context.questionMetaJson,
    'WRITTEN_QUESTION_META_JSON_INVALID'
  );

  if (!Array.isArray(answerKey) || answerKey.length !== 5) {
    throw new Error('WRITTEN_ANSWER_KEY_SHAPE_INVALID');
  }
  if (
    !meta ||
    meta.stage_id !== context.stageId ||
    !Array.isArray(meta.questions) ||
    meta.questions.length !== 5
  ) {
    throw new Error('WRITTEN_QUESTION_META_SHAPE_INVALID');
  }

  var positions = [];
  for (var i = 0; i < 5; i += 1) {
    var key = answerKey[i];
    var question = meta.questions[i];
    if (
      !key || key.q !== i + 1 ||
      typeof key.answer_pos !== 'number' ||
      key.answer_pos < 1 || key.answer_pos > 4 ||
      key.answer_pos % 1 !== 0 ||
      !question || question.q !== i + 1 ||
      question.answer_pos !== key.answer_pos
    ) {
      throw new Error('WRITTEN_ANSWER_KEY_META_MISMATCH');
    }
    positions.push(key.answer_pos);
  }
  return positions;
}


function h3WrittenReviewAuthoring_(context) {
  var meta = h3WrittenParseJson_(
    context.questionMetaJson,
    'WRITTEN_REVIEW_AUTHORING_META_INVALID'
  );

  if (
    !meta ||
    !Array.isArray(meta.questions) ||
    meta.questions.length !== 5
  ) {
    throw new Error(
      'WRITTEN_REVIEW_AUTHORING_QUESTION_COUNT_INVALID'
    );
  }

  return meta.questions.map(
    function (question, index) {
      var review =
        question && question.review;
      var choices =
        review && review.choices;

      if (
        !review ||
        typeof review !== 'object' ||
        Array.isArray(review) ||
        !String(review.body_ja || '').trim() ||
        !String(review.reason || '').trim() ||
        !Array.isArray(choices) ||
        choices.length !== 4 ||
        !Array.isArray(review.learning_blocks)
      ) {
        throw new Error(
          'WRITTEN_REVIEW_AUTHORING_MISSING:Q' +
            String(index + 1)
        );
      }

      choices.forEach(
        function (choice, choiceIndex) {
          if (
            !choice ||
            String(choice.ko || '') !==
              String(
                question.choices[
                  choiceIndex
                ] || ''
              ) ||
            !String(choice.ja || '').trim()
          ) {
            throw new Error(
              'WRITTEN_REVIEW_AUTHORING_CHOICE_MISMATCH:Q' +
                String(index + 1)
            );
          }
        }
      );

      var authored =
        h3WrittenParseJson_(
          JSON.stringify(review),
          'WRITTEN_REVIEW_AUTHORING_CLONE_FAILED'
        );
      var correctSurfaces = [
        String(
          question.choices[
            Number(question.answer_pos) - 1
          ] || ''
        )
      ];

      String(
        h3WrittenReviewScriptForQuestion_(
          context,
          index
        ) || ''
      )
        .split(/\r?\n/)
        .forEach(function (line) {
          if (String(line || '').trim()) {
            correctSurfaces.push(line);
          }
        });

      h3ReviewExplanationStyleValidateAuthoring_(
        authored,
        correctSurfaces,
        '5W_FUTURE_Q' +
          String(index + 1)
      );

      return authored;
    }
  );
}


function h3WrittenReviewScriptForQuestion_(
  context,
  index
) {
  if (index < 4) {
    return String(
      context.stageAudio[index] || ''
    );
  }

  return [
    context.stageAudio[4],
    context.stageAudio[5],
    context.stageAudio[6]
  ]
    .map(function (value) {
      return String(value || '');
    })
    .filter(function (value) {
      return value !== '';
    })
    .join('\n');
}


function h3WrittenValidateSourceIdentity_(context) {
  if (context.actualSetId !== context.setId) {
    throw new Error('WRITTEN_STAGE_SET_ID_MISMATCH');
  }
  if (
    ['pending', 'processing', 'done'].indexOf(
      context.queueStatus
    ) < 0
  ) {
    throw new Error('WRITTEN_QUEUE_STATUS_INVALID');
  }
  if (!context.questionsLog) {
    throw new Error('WRITTEN_QUESTIONS_LOG_BLANK');
  }
  if (context.storageMode !== 'sheet_only_v3') {
    throw new Error('WRITTEN_STORAGE_MODE_INVALID');
  }
  if (
    context.stageStatus !== 'ISSUED' ||
    !context.issuedAt ||
    !context.stageId
  ) {
    throw new Error('WRITTEN_STAGE_NOT_ISSUED');
  }
  if (
    !context.approvedSource ||
    !context.policyId ||
    !context.sourceSnapshotId
  ) {
    throw new Error('WRITTEN_SOURCE_POLICY_FIELD_BLANK');
  }

  var expectedQuestions = h3WrittenMaterializeQuestions_(
    context.questionsTemplate,
    context.setId
  );
  if (
    h3WrittenNormalizeLineEndings_(context.questionsLog) !==
    expectedQuestions
  ) {
    throw new Error('WRITTEN_QUESTIONS_LOG_TEMPLATE_MISMATCH');
  }
  if (
    JSON.stringify(context.queueAudio) !==
    JSON.stringify(context.stageAudio)
  ) {
    throw new Error('WRITTEN_AUDIO_SOURCE_MISMATCH');
  }

  context.answerPositions = h3WrittenParseIssuedAnswers_(context);
  return context;
}

function h3WrittenRequireNewSubmitPrecondition_(context) {
  if (context.answersLog !== '') {
    throw new Error('WRITTEN_SET_ALREADY_ANSWERED_OUTSIDE_WEB');
  }
}

function h3WrittenSourceBinding_(context) {
  var object = {
    schema: 'H3_WRITTEN_SOURCE_BINDING_V1',
    set_id: context.setId,
    stage_id: context.stageId,
    issued_at: context.issuedAt,
    questions_log_sha256: h3Sha256Hex_(
      h3WrittenNormalizeLineEndings_(context.questionsLog)
    ),
    answer_key_sha256: h3Sha256Hex_(context.answerKeyJson),
    question_meta_sha256: h3Sha256Hex_(context.questionMetaJson),
    audio_source_sha256: h3Sha256Hex_(
      JSON.stringify(context.queueAudio)
    ),
    approved_source: context.approvedSource,
    policy_id: context.policyId,
    source_snapshot_id: context.sourceSnapshotId
  };
  var json = JSON.stringify(object);
  return {
    object: object,
    json: json,
    sha256: h3Sha256Hex_(json)
  };
}

function h3WrittenGrade_(context, answers) {
  var score = 0;
  var graded = answers.map(function (answer, i) {
    var correctAnswer = Number(context.answerPositions[i]);
    var correct = answer.answer === correctAnswer;
    var mark = correct
      ? (answer.uncertain ? '△' : '○')
      : '×';
    if (correct) score += 1;
    return {
      section: answer.section,
      answer: answer.answer,
      correct_answer: correctAnswer,
      correct: correct,
      uncertain: answer.uncertain,
      mark: mark
    };
  });
  return { score: score, total: 5, graded: graded };
}

function h3WrittenAnswerToken_(graded) {
  return String(graded.answer) + (graded.uncertain ? '?' : '');
}

function h3WrittenBuildAnswerLog_(
  context,
  grade,
  txnId,
  sourceBindingSha
) {
  var rawInput = grade.graded
    .map(h3WrittenAnswerToken_)
    .join(' ');
  var lines = [
    '[SET ' + context.setId + ']',
    'SCHEMA=H3_WRITTEN_WEB_ANSWER_LOG_V1',
    'TXN_ID=' + String(txnId),
    'SOURCE_BINDING_SHA256=' + String(sourceBindingSha),
    'RAW_INPUT=' + rawInput,
    'SCORE=' + String(grade.score) + '/5'
  ];

  grade.graded.forEach(function (item, i) {
    lines.push(
      'Q' + String(i + 1) +
      ' SECTION=' + item.section +
      ' USER=' + h3WrittenAnswerToken_(item) +
      ' ANSWER=' + String(item.correct_answer) +
      ' UNCERTAIN=' + (item.uncertain ? '1' : '0') +
      ' RESULT=' + item.mark
    );
  });
  return lines.join('\n');
}

function h3WrittenSnapshot_(setId, answersLog) {
  var object = {
    schema: 'H3_WRITTEN_QUEUE_ANSWER_STATE_V1',
    set_id: String(setId),
    answers_log: String(answersLog || '')
  };
  var json = JSON.stringify(object);
  return {
    object: object,
    json: json,
    sha256: h3Sha256Hex_(json)
  };
}

function h3WrittenCurrentSnapshot_(context) {
  return h3WrittenSnapshot_(
    context.setId,
    context.queueSheet
      .getRange(context.queueRowNumber, 5)
      .getDisplayValue()
  );
}

function h3WrittenBuildResult_(
  context,
  grade,
  txnId,
  sourceBindingSha
) {
  var surface =
    h3LearningSurfaceMetadataForMode_(
      'WRITTEN',
      grade.graded
    );

  return {
    schema: 'H3_WEB_SUBMIT_RESULT_V1',
    mode: 'WRITTEN',
    learning_surface_schema:
      surface.learning_surface_schema,
    provider_kind:
      surface.provider_kind,
    surface_family:
      surface.surface_family,
    level:
      surface.level,
    item_count:
      surface.item_count,
    persisted: true,
    set_id: context.setId,
    stage_id: context.stageId,
    source_binding_sha256: sourceBindingSha,
    txn_id: String(txnId),
    status: 'COMMITTED',
    score: grade.score,
    total: grade.total,
    summary: grade.graded.map(function (item) {
      return {
        section: item.section,
        answer: item.answer,
        correct_answer: item.correct_answer,
        correct: item.correct,
        uncertain: item.uncertain,
        mark: item.mark
      };
    }),
    receipt: h3BuildWebReceipt_(context.setId, txnId)
  };
}

function h3WrittenClassifyTxnState_(
  status,
  rowFingerprint,
  requestFingerprint
) {
  if (status === 'COMMITTED') {
    return rowFingerprint === requestFingerprint
      ? 'RETURN_COMMITTED'
      : 'CONFLICT_COMMITTED';
  }
  if (status === 'PREPARED') {
    return rowFingerprint === requestFingerprint
      ? 'RECOVER_PREPARED'
      : 'CONFLICT_PREPARED';
  }
  if (status === 'RECOVERY_REQUIRED') {
    return 'BLOCK_RECOVERY';
  }
  if (status === 'ERROR') {
    return 'TERMINAL_ERROR';
  }
  return 'IGNORE';
}

function h3WrittenRecoveryDecision_(currentSha, preSha, postSha) {
  if (currentSha === postSha) return 'AT_POSTSTATE';
  if (currentSha === preSha) return 'AT_PRESTATE';
  return 'MIXED';
}

function h3WrittenRequireJournal_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(H3_WEB_WRITTEN_TXN_SHEET);
  if (!sheet) {
    throw new Error('WRITTEN_TXN_SHEET_MISSING');
  }
  var header = sheet
    .getRange(1, 1, 1, H3_WEB_WRITTEN_TXN_HEADERS.length)
    .getDisplayValues()[0];
  if (
    JSON.stringify(header) !==
    JSON.stringify(H3_WEB_WRITTEN_TXN_HEADERS)
  ) {
    throw new Error('WRITTEN_TXN_HEADER_MISMATCH');
  }
  return sheet;
}

function h3WrittenMarkRecoveryRequired_(journal, rowNumber, errorText) {
  journal.getRange(rowNumber, 9).setValue('RECOVERY_REQUIRED');
  journal.getRange(rowNumber, 16).setValue(String(errorText));
  SpreadsheetApp.flush();
}

function h3WrittenPromoteCommitted_(
  journal,
  rowNumber,
  txnId,
  setId,
  fingerprint,
  sourceBindingSha,
  postSha
) {
  journal.getRange(rowNumber, 9).setValue('COMMITTED');
  journal.getRange(rowNumber, 15).setValue(h3NowTokyo_());
  SpreadsheetApp.flush();

  var row = journal
    .getRange(
      rowNumber,
      1,
      1,
      H3_WEB_WRITTEN_TXN_HEADERS.length
    )
    .getDisplayValues()[0];
  if (
    row[0] !== String(txnId) ||
    row[1] !== String(setId) ||
    row[5] !== String(fingerprint) ||
    row[6] !== String(sourceBindingSha) ||
    row[8] !== 'COMMITTED' ||
    row[13] !== String(postSha)
  ) {
    throw new Error('WRITTEN_COMMITTED_READBACK_FAILED');
  }
}

function h3WrittenRecoverPrepared_(
  runtimeSpreadsheet,
  journal,
  record,
  requestFingerprint
) {
  var row = record.values;
  var txnId = String(row[0] || '');
  var setId = String(row[1] || '');

  if (String(row[5] || '') !== requestFingerprint) {
    throw new Error('CONFLICT_PREPARED_DIFFERENT_FINGERPRINT');
  }

  var storedRequest;
  var storedResult;
  var prestate;
  try {
    storedRequest = h3WrittenParseJson_(
      row[4],
      'WRITTEN_PREPARED_RAW_INPUT_INVALID'
    );
    storedResult = h3WrittenParseJson_(
      row[9],
      'WRITTEN_PREPARED_RESULT_INVALID'
    );
    prestate = h3WrittenParseJson_(
      row[11],
      'WRITTEN_PRESTATE_JSON_INVALID'
    );
  } catch (parseErr) {
    h3WrittenMarkRecoveryRequired_(
      journal,
      record.rowNumber,
      'WRITTEN_PREPARED_STORED_DATA_INVALID'
    );
    throw parseErr;
  }

  var answers = h3WrittenNormalizeAnswers_(storedRequest);
  if (
    String(storedRequest.set_id) !== setId ||
    h3WrittenFingerprint_(setId, answers) !== requestFingerprint
  ) {
    h3WrittenMarkRecoveryRequired_(
      journal,
      record.rowNumber,
      'WRITTEN_PREPARED_REQUEST_IDENTITY_MISMATCH'
    );
    throw new Error('WRITTEN_RECOVERY_REQUIRED');
  }

  var context;
  var sourceBinding;
  try {
    context = h3WrittenReadContext_(runtimeSpreadsheet, setId);
    h3WrittenValidateSourceIdentity_(context);
    h3WrittenReviewAuthoring_(context);
    sourceBinding = h3WrittenSourceBinding_(context);
  } catch (sourceErr) {
    h3WrittenMarkRecoveryRequired_(
      journal,
      record.rowNumber,
      'WRITTEN_PREPARED_SOURCE_DRIFT:' + String(sourceErr.message || sourceErr)
    );
    throw new Error('WRITTEN_RECOVERY_REQUIRED');
  }

  if (sourceBinding.sha256 !== String(row[6] || '')) {
    h3WrittenMarkRecoveryRequired_(
      journal,
      record.rowNumber,
      'WRITTEN_PREPARED_SOURCE_BINDING_MISMATCH'
    );
    throw new Error('WRITTEN_RECOVERY_REQUIRED');
  }

  var prestateJson = JSON.stringify(prestate);
  if (
    prestate.schema !== 'H3_WRITTEN_QUEUE_ANSWER_STATE_V1' ||
    prestate.set_id !== setId ||
    h3Sha256Hex_(prestateJson) !== String(row[12] || '')
  ) {
    h3WrittenMarkRecoveryRequired_(
      journal,
      record.rowNumber,
      'WRITTEN_PRESTATE_HASH_MISMATCH'
    );
    throw new Error('WRITTEN_RECOVERY_REQUIRED');
  }

  var grade = h3WrittenGrade_(context, answers);
  var answerLog = h3WrittenBuildAnswerLog_(
    context,
    grade,
    txnId,
    sourceBinding.sha256
  );
  var expectedPost = h3WrittenSnapshot_(setId, answerLog);
  if (expectedPost.sha256 !== String(row[13] || '')) {
    h3WrittenMarkRecoveryRequired_(
      journal,
      record.rowNumber,
      'WRITTEN_POSTSTATE_HASH_MISMATCH'
    );
    throw new Error('WRITTEN_RECOVERY_REQUIRED');
  }

  var expectedResult = h3WrittenBuildResult_(
    context,
    grade,
    txnId,
    sourceBinding.sha256
  );
  if (
    JSON.stringify(storedResult) !== JSON.stringify(expectedResult) ||
    Number(row[10]) !== grade.score
  ) {
    h3WrittenMarkRecoveryRequired_(
      journal,
      record.rowNumber,
      'WRITTEN_PREPARED_RESULT_IDENTITY_MISMATCH'
    );
    throw new Error('WRITTEN_RECOVERY_REQUIRED');
  }

  var current = h3WrittenCurrentSnapshot_(context);
  var decision = h3WrittenRecoveryDecision_(
    current.sha256,
    String(row[12] || ''),
    String(row[13] || '')
  );

  if (decision === 'AT_PRESTATE') {
    context.queueSheet
      .getRange(context.queueRowNumber, 5)
      .setValue(answerLog);
    SpreadsheetApp.flush();
    current = h3WrittenCurrentSnapshot_(context);
    if (current.sha256 !== expectedPost.sha256) {
      h3WrittenMarkRecoveryRequired_(
        journal,
        record.rowNumber,
        'WRITTEN_RECOVERY_QUEUE_READBACK_FAILED'
      );
      throw new Error('WRITTEN_RECOVERY_REQUIRED');
    }
  } else if (decision === 'MIXED') {
    h3WrittenMarkRecoveryRequired_(
      journal,
      record.rowNumber,
      'WRITTEN_PREPARED_RUNTIME_MIXED'
    );
    throw new Error('WRITTEN_RECOVERY_REQUIRED');
  }

  h3WrittenPromoteCommitted_(
    journal,
    record.rowNumber,
    txnId,
    setId,
    requestFingerprint,
    sourceBinding.sha256,
    expectedPost.sha256
  );
  return storedResult;
}

function h3WrittenSubmit_(request) {
  if (!H3_WRITTEN_PRODUCTION_COMMIT_ENABLED) {
    throw new Error('WRITTEN_PRODUCTION_COMMIT_DISABLED');
  }

  var answers = h3WrittenNormalizeAnswers_(request);
  var normalizedRequest = h3WrittenNormalizedRequest_(
    request.set_id,
    answers
  );
  var fingerprint = h3WrittenFingerprint_(
    request.set_id,
    answers
  );

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var runtimeSpreadsheet = SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
    var journal = h3WrittenRequireJournal_(runtimeSpreadsheet);
    var values = journal.getDataRange().getDisplayValues();
    var rows = values.slice(1);
    var unresolvedRecovery = false;
    var prepared = null;

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var status = String(row[8] || '');
      if (status === 'RECOVERY_REQUIRED') {
        unresolvedRecovery = true;
      }
      if (String(row[1] || '') !== String(request.set_id)) {
        continue;
      }

      var action = h3WrittenClassifyTxnState_(
        status,
        String(row[5] || ''),
        fingerprint
      );
      if (action === 'RETURN_COMMITTED') {
        var stored = h3WrittenParseJson_(
          row[9],
          'WRITTEN_COMMITTED_RESULT_INVALID'
        );
        if (
          stored.txn_id !== String(row[0] || '') ||
          stored.set_id !== String(request.set_id) ||
          stored.mode !== 'WRITTEN' ||
          stored.status !== 'COMMITTED'
        ) {
          throw new Error('WRITTEN_COMMITTED_RESULT_MISMATCH');
        }
        var committedContext = h3WrittenReadContext_(
          runtimeSpreadsheet,
          request.set_id
        );
        h3WrittenValidateSourceIdentity_(committedContext);
        h3WrittenReviewAuthoring_(committedContext);
        h3MultiSkillWrittenPreflight_(
          runtimeSpreadsheet,
          committedContext
        );
        var committedGrade = h3WrittenGrade_(
          committedContext,
          answers
        );
        return h3MultiSkillAttachCapture_(
          stored,
          function () {
            return h3MultiSkillWrittenCapture_(
              runtimeSpreadsheet,
              committedContext,
              committedGrade,
              String(row[0] || ''),
              String(row[7] || '')
            );
          }
        );
      }
      if (action === 'CONFLICT_COMMITTED') {
        throw new Error('CONFLICT_ALREADY_COMMITTED');
      }
      if (action === 'CONFLICT_PREPARED') {
        throw new Error('CONFLICT_PREPARED_DIFFERENT_FINGERPRINT');
      }
      if (action === 'BLOCK_RECOVERY') {
        throw new Error('WRITTEN_RECOVERY_REQUIRED_BLOCK');
      }
      if (action === 'TERMINAL_ERROR') {
        throw new Error('WRITTEN_TXN_TERMINAL_ERROR');
      }
      if (action === 'RECOVER_PREPARED') {
        if (prepared) {
          throw new Error('WRITTEN_DUPLICATE_PREPARED_AUTHORITY');
        }
        prepared = { rowNumber: i + 2, values: row };
      }
    }

    if (prepared) {
      var recovered = h3WrittenRecoverPrepared_(
        runtimeSpreadsheet,
        journal,
        prepared,
        fingerprint
      );
      var recoveredContext = h3WrittenReadContext_(
        runtimeSpreadsheet,
        request.set_id
      );
      h3WrittenValidateSourceIdentity_(recoveredContext);
      h3WrittenReviewAuthoring_(recoveredContext);
      h3MultiSkillWrittenPreflight_(
        runtimeSpreadsheet,
        recoveredContext
      );
      var recoveredGrade = h3WrittenGrade_(
        recoveredContext,
        answers
      );
      return h3MultiSkillAttachCapture_(
        recovered,
        function () {
          return h3MultiSkillWrittenCapture_(
            runtimeSpreadsheet,
            recoveredContext,
            recoveredGrade,
            String(prepared.values[0] || ''),
            String(prepared.values[7] || '')
          );
        }
      );
    }
    if (unresolvedRecovery) {
      throw new Error('WRITTEN_RECOVERY_REQUIRED_BLOCK');
    }

    var context = h3WrittenReadContext_(
      runtimeSpreadsheet,
      request.set_id
    );
    h3WrittenValidateSourceIdentity_(context);
    h3WrittenRequireNewSubmitPrecondition_(context);
    h3WrittenReviewAuthoring_(context);
    h3MultiSkillWrittenPreflight_(
      runtimeSpreadsheet,
      context
    );

    var sourceBinding = h3WrittenSourceBinding_(context);
    var txnId = h3NextWebTxnId_(runtimeSpreadsheet);
    var grade = h3WrittenGrade_(context, answers);
    var answerLog = h3WrittenBuildAnswerLog_(
      context,
      grade,
      txnId,
      sourceBinding.sha256
    );
    var prestate = h3WrittenSnapshot_(
      context.setId,
      context.answersLog
    );
    var poststate = h3WrittenSnapshot_(
      context.setId,
      answerLog
    );
    var result = h3WrittenBuildResult_(
      context,
      grade,
      txnId,
      sourceBinding.sha256
    );
    var createdAt = h3NowTokyo_();

    journal.appendRow([
      txnId,
      context.setId,
      context.stageId,
      'WRITTEN',
      JSON.stringify(normalizedRequest),
      fingerprint,
      sourceBinding.sha256,
      createdAt,
      'PREPARED',
      JSON.stringify(result),
      grade.score,
      prestate.json,
      prestate.sha256,
      poststate.sha256,
      '',
      ''
    ]);
    var txnRow = journal.getLastRow();
    SpreadsheetApp.flush();

    var preparedReadback = journal
      .getRange(
        txnRow,
        1,
        1,
        H3_WEB_WRITTEN_TXN_HEADERS.length
      )
      .getDisplayValues()[0];
    if (
      preparedReadback[0] !== txnId ||
      preparedReadback[1] !== context.setId ||
      preparedReadback[2] !== context.stageId ||
      preparedReadback[3] !== 'WRITTEN' ||
      preparedReadback[5] !== fingerprint ||
      preparedReadback[6] !== sourceBinding.sha256 ||
      preparedReadback[8] !== 'PREPARED' ||
      preparedReadback[12] !== prestate.sha256 ||
      preparedReadback[13] !== poststate.sha256
    ) {
      throw new Error('WRITTEN_PREPARED_READBACK_FAILED');
    }

    context.queueSheet
      .getRange(context.queueRowNumber, 5)
      .setValue(answerLog);
    SpreadsheetApp.flush();

    var actualPost = h3WrittenCurrentSnapshot_(context);
    if (actualPost.sha256 !== poststate.sha256) {
      h3WrittenMarkRecoveryRequired_(
        journal,
        txnRow,
        'WRITTEN_QUEUE_POSTSTATE_READBACK_FAILED'
      );
      throw new Error('WRITTEN_RECOVERY_REQUIRED');
    }

    h3WrittenPromoteCommitted_(
      journal,
      txnRow,
      txnId,
      context.setId,
      fingerprint,
      sourceBinding.sha256,
      poststate.sha256
    );
    return h3MultiSkillAttachCapture_(
      result,
      function () {
        return h3MultiSkillWrittenCapture_(
          runtimeSpreadsheet,
          context,
          grade,
          txnId,
          createdAt
        );
      }
    );
  } finally {
    lock.releaseLock();
  }
}


/* =========================================================
 * 5W current-learning / render
 * =======================================================*/

var H3_WRITTEN_RENDER_VERSION =
  'H3-WRITTEN-RENDER-20260918-V7';

var H3_WRITTEN_WEB_SURFACE_CONTRACT_ID =
  'H3-5W-WEB-SURFACE-20260920-V1';

var H3_WRITTEN_DISPLAY = {
  D2: '筆2/語彙',
  D3: '筆3/文法',
  D4: '筆4/置換',
  D5: '筆5/共通',
  D6: '筆6/応答'
};


function h3WrittenValidateRenderRequest_(
  request
) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_RENDER_REQUEST_V1' ||
    request.mode !== 'WRITTEN' ||
    !/^H3-\d{8}-\d{2,3}$/.test(
      String(
        request.set_id || ''
      )
    )
  ) {
    throw new Error(
      'INVALID_WRITTEN_RENDER_REQUEST'
    );
  }
}


function h3WrittenRenderTxnGate_(
  runtimeSpreadsheet,
  setId
) {
  var journal =
    h3WrittenRequireJournal_(
      runtimeSpreadsheet
    );

  var lastRow =
    journal.getLastRow();
  var rows =
    lastRow > 1
      ? journal
          .getRange(
            2,
            1,
            lastRow - 1,
            H3_WEB_WRITTEN_TXN_HEADERS
              .length
          )
          .getDisplayValues()
      : [];

  var committed = 0;
  var blocking = [];

  rows.forEach(
    function (row) {
      if (
        String(row[1] || '') !==
          String(setId)
      ) {
        return;
      }

      var status =
        String(row[8] || '');

      if (status === 'COMMITTED') {
        committed += 1;
      }

      if (
        status === 'PREPARED' ||
        status ===
          'RECOVERY_REQUIRED'
      ) {
        blocking.push(status);
      }
    }
  );

  if (committed > 1) {
    throw new Error(
      'WRITTEN_RENDER_DUPLICATE_COMMITTED_AUTHORITY'
    );
  }

  if (committed === 1) {
    throw new Error(
      'WRITTEN_RENDER_ALREADY_COMMITTED'
    );
  }

  if (blocking.length) {
    throw new Error(
      'WRITTEN_RENDER_TRANSACTION_RECOVERY_BLOCK'
    );
  }
}


function h3WrittenRenderQuestions_(
  context
) {
  var meta =
    h3WrittenParseJson_(
      context.questionMetaJson,
      'WRITTEN_RENDER_META_JSON_INVALID'
    );

  if (
    !meta ||
    meta.stage_id !==
      context.stageId ||
    !Array.isArray(meta.questions) ||
    meta.questions.length !== 5
  ) {
    throw new Error(
      'WRITTEN_RENDER_META_SHAPE_INVALID'
    );
  }

  var sourceText =
    h3WrittenNormalizeLineEndings_(
      context.questionsLog
    );

  return H3_WEB_WRITTEN_SECTIONS.map(
    function (section, i) {
      var q =
        meta.questions[i];

      if (
        !q ||
        Number(q.q) !== i + 1 ||
        !String(
          q.question || ''
        ).trim() ||
        !Array.isArray(q.choices) ||
        q.choices.length !== 4
      ) {
        throw new Error(
          'WRITTEN_RENDER_QUESTION_SHAPE_INVALID:' +
            String(i + 1)
        );
      }

      var question =
        h3WrittenNormalizeLineEndings_(
          String(q.question)
        );
      var choices =
        q.choices.map(
          function (choice) {
            return String(
              choice || ''
            );
          }
        );

      if (
        choices.some(
          function (choice) {
            return !choice.trim();
          }
        )
      ) {
        throw new Error(
          'WRITTEN_RENDER_CHOICE_BLANK:' +
            String(i + 1)
        );
      }

      if (
        sourceText.indexOf(
          question
        ) < 0
      ) {
        throw new Error(
          'WRITTEN_RENDER_QUESTION_SOURCE_MISMATCH:' +
            String(i + 1)
        );
      }

      choices.forEach(
        function (choice) {
          if (
            sourceText.indexOf(
              choice
            ) < 0
          ) {
            throw new Error(
              'WRITTEN_RENDER_CHOICE_SOURCE_MISMATCH:' +
                String(i + 1)
            );
          }
        }
      );

      return {
        section:
          section,
        display:
          H3_WRITTEN_DISPLAY[
            section
          ],
        question_text:
          question,
        choice_ids:
          [1, 2, 3, 4],
        visible_choices:
          choices,
        audio_asset_key:
          null,
        audio_fallback_url:
          null
      };
    }
  );
}


function buildWrittenProductionRenderPayload_(
  request
) {
  h3WrittenValidateRenderRequest_(
    request
  );

  var runtimeSpreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  h3WrittenRenderTxnGate_(
    runtimeSpreadsheet,
    request.set_id
  );

  var context =
    h3WrittenValidateSourceIdentity_(
      h3WrittenReadContext_(
        runtimeSpreadsheet,
        request.set_id
      )
    );

  h3WrittenRequireNewSubmitPrecondition_(
    context
  );
  h3WrittenReviewAuthoring_(
    context
  );

  var questions =
    h3WrittenRenderQuestions_(
      context
    );
  var sourceBinding =
    h3WrittenSourceBinding_(
      context
    );
  var surface =
    h3LearningSurfaceMetadataForMode_(
      'WRITTEN',
      questions
    );

  return {
    schema:
      'H3_WEB_SET_V1',
    mode:
      'WRITTEN',
    learning_surface_schema:
      surface.learning_surface_schema,
    provider_kind:
      surface.provider_kind,
    surface_family:
      surface.surface_family,
    level:
      surface.level,
    item_count:
      surface.item_count,
    nonlearning:
      false,
    persisted:
      true,
    set_id:
      context.setId,
    stage_id:
      context.stageId,
    canonical_render_version:
      H3_WRITTEN_RENDER_VERSION,
    surface_contract_id:
      H3_WRITTEN_WEB_SURFACE_CONTRACT_ID,
    source_binding_sha256:
      sourceBinding.sha256,
    transport: {
      audio:
        'NONE',
      image:
        'NONE',
      review:
        'PERSISTENT_REVIEW_V1'
    },
    questions:
      questions
  };
}


function h3WrittenCurrentLearning_(
  runtimeSpreadsheet
) {
  var stageSheet =
    runtimeSpreadsheet.getSheetByName(
      'written_set_stage_v1'
    );
  var journal =
    h3WrittenRequireJournal_(
      runtimeSpreadsheet
    );

  if (!stageSheet) {
    return null;
  }

  var stage =
    h3WrittenReadRows_(
      stageSheet,
      24
    );

  h3WrittenRequireColumns_(
    stage.map,
    [
      'STAGE_ID',
      'STATUS',
      'ACTUAL_SET_ID',
      'ISSUED_AT'
    ],
    'written_set_stage_v1'
  );

  var txnRows =
    journal.getLastRow() > 1
      ? journal
          .getRange(
            2,
            1,
            journal.getLastRow() - 1,
            H3_WEB_WRITTEN_TXN_HEADERS
              .length
          )
          .getDisplayValues()
      : [];

  var committed = {};
  var blocking = {};

  txnRows.forEach(
    function (row) {
      var setId =
        String(row[1] || '');
      var status =
        String(row[8] || '');

      if (!setId) {
        return;
      }

      if (status === 'COMMITTED') {
        committed[setId] = true;
      }

      if (
        status === 'PREPARED' ||
        status ===
          'RECOVERY_REQUIRED'
      ) {
        blocking[setId] =
          status;
      }
    }
  );

  var candidates = [];

  stage.rows.forEach(
    function (row) {
      var setId =
        String(
          row[
            stage.map.ACTUAL_SET_ID
          ] || ''
        );
      var status =
        String(
          row[
            stage.map.STATUS
          ] || ''
        );
      var issuedAt =
        String(
          row[
            stage.map.ISSUED_AT
          ] || ''
        );

      if (
        status !== 'ISSUED' ||
        !setId ||
        !issuedAt ||
        committed[setId]
      ) {
        return;
      }

      if (blocking[setId]) {
        throw new Error(
          'WRITTEN_CURRENT_LEARNING_RECOVERY_BLOCK:' +
            setId
        );
      }

      var context;

      try {
        context =
          h3WrittenValidateSourceIdentity_(
            h3WrittenReadContext_(
              runtimeSpreadsheet,
              setId
            )
          );
      } catch (_err) {
        return;
      }

      if (
        String(
          context.answersLog || ''
        ) !== ''
      ) {
        return;
      }

      try {
        buildWrittenProductionRenderPayload_({
          schema:
            'H3_WEB_RENDER_REQUEST_V1',
          mode:
            'WRITTEN',
          set_id:
            setId
        });
      } catch (_err2) {
        return;
      }

      candidates.push({
        mode:
          'WRITTEN',
        review_kind:
          'WRITTEN',
        set_id:
          setId,
        stage_id:
          context.stageId,
        issued_at:
          issuedAt
      });
    }
  );

  if (!candidates.length) {
    return null;
  }

  if (candidates.length !== 1) {
    throw new Error(
      'WRITTEN_CURRENT_LEARNING_AMBIGUOUS:' +
        String(
          candidates.length
        )
    );
  }

  return candidates[0];
}


function h3BuildWrittenLearnerUrl_(
  setId
) {
  var normalized =
    String(setId || '').trim();

  if (
    !/^H3-\d{8}-\d{2,3}$/.test(
      normalized
    )
  ) {
    throw new Error(
      'WRITTEN_LEARNER_URL_SET_ID_INVALID'
    );
  }

  return (
    H3_LEARNER_WEB_APP_BASE_URL +
    '?mode=WRITTEN&set_id=' +
    encodeURIComponent(
      normalized
    )
  );
}


function getWrittenLearnerUrl(
  setId
) {
  var normalized =
    String(setId || '').trim();

  var payload =
    buildWrittenProductionRenderPayload_({
      schema:
        'H3_WEB_RENDER_REQUEST_V1',
      mode:
        'WRITTEN',
      set_id:
        normalized
    });

  if (
    !payload ||
    payload.mode !== 'WRITTEN' ||
    String(
      payload.set_id || ''
    ) !== normalized
  ) {
    throw new Error(
      'WRITTEN_LEARNER_URL_RENDER_GATE_FAILED'
    );
  }

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var current =
    h3ReviewCurrentLearning_(
      spreadsheet
    );

  if (
    !current ||
    current.mode !== 'WRITTEN' ||
    String(
      current.set_id || ''
    ) !== normalized
  ) {
    throw new Error(
      'WRITTEN_LEARNER_URL_CURRENT_GATE_FAILED'
    );
  }

  return {
    schema:
      'H3_LEARNER_URL_V2',
    mode:
      'HOME',
    handoff_mode:
      'HOME_PARAMETERLESS',
    set_id:
      normalized,
    url:
      H3_LEARNER_WEB_APP_BASE_URL,
    home_url:
      H3_LEARNER_WEB_APP_BASE_URL,
    direct_url:
      h3BuildWrittenLearnerUrl_(
        normalized
      ),
    direct_url_policy:
      'INTERNAL_DIAGNOSTIC_ONLY',
    host:
      'script.google.com'
  };
}
