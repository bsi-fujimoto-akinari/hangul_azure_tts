/**
 * R3-05 one-time/idempotent Drive canonical finalizer.
 *
 * Manual execution only from the authorized Apps Script editor.
 * It never reads or writes learner Sheets/runtime/history.
 */
function r305FinalizeCanonicalDrive() {
  const ids = {
    renderCanonical:
      '16iG5UOvw1nbX7oxbyza3BXVxt5GKQ8v8',
    renderRelease:
      '15N6ehVwMhoC3F-xd8ziv0UhYwys8rr7i',
    manifestCanonical:
      '1mFT97QOUeJCvAdr6TzMFVg-gJvOpUj4V',
    current:
      '1mVvKCqMdjKB8l6akShRsI8WR8Quhufjp',
    archiveFolder:
      '1Z6DrPRfLz1pNfF2mrCILWqAjfoTnLLHI'
  };

  const expected = {
    renderVersion:
      'H3-LISTENING-RENDER-RULES-20260919-V17',
    renderReleaseName:
      'hangul_listening_render_rules_v1__20260919R17.txt',
    renderSha256:
      'e084a28358a1c4d8dffb2d955202ad132e3796dfbe3b79a5ce13f7bb6f2ba37c',
    manifestOldVersion:
      'H3-SOURCE-MANIFEST-20260919-V29',
    manifestNewVersion:
      'H3-SOURCE-MANIFEST-20260919-V30',
    sourceOldSet:
      'H3-SOURCE-SET-20260919-R29',
    sourceNewSet:
      'H3-SOURCE-SET-20260919-R30',
    manifestReleaseName:
      'hangul_source_manifest_v1__20260919R30.txt'
  };

  const renderCanonical =
    DriveApp.getFileById(ids.renderCanonical);
  const renderRelease =
    DriveApp.getFileById(ids.renderRelease);

  const canonicalBytes =
    renderCanonical.getBlob().getBytes();
  const releaseBytes =
    renderRelease.getBlob().getBytes();

  const canonicalText =
    renderCanonical
      .getBlob()
      .getDataAsString('UTF-8')
      .replace(/^\uFEFF/, '');
  const releaseText =
    renderRelease
      .getBlob()
      .getDataAsString('UTF-8')
      .replace(/^\uFEFF/, '');

  const canonicalSha =
    r305Sha256Hex_(canonicalBytes);
  const releaseSha =
    r305Sha256Hex_(releaseBytes);

  if (
    canonicalSha !== expected.renderSha256 ||
    releaseSha !== expected.renderSha256 ||
    canonicalText !== releaseText ||
    canonicalText.indexOf(
      'VERSION=' + expected.renderVersion
    ) < 0 ||
    renderRelease.getName() !==
      expected.renderReleaseName
  ) {
    throw new Error(
      'R305_RENDER_CANONICAL_PREFLIGHT_FAILED'
    );
  }

  const manifestFile =
    DriveApp.getFileById(ids.manifestCanonical);
  let manifest =
    manifestFile
      .getBlob()
      .getDataAsString('UTF-8')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n');

  const oldPairs = [
    [
      'MANIFEST_VERSION=' +
        expected.manifestOldVersion,
      'MANIFEST_VERSION=' +
        expected.manifestNewVersion
    ],
    [
      'SOURCE_SET_ID=' +
        expected.sourceOldSet,
      'SOURCE_SET_ID=' +
        expected.sourceNewSet
    ],
    [
      'ACTIVE_RELEASE_FILE=hangul_listening_render_rules_v1__20260919R16.txt',
      'ACTIVE_RELEASE_FILE=' +
        expected.renderReleaseName
    ],
    [
      'ACTIVE_RELEASE_FILE_ID=1WMd8e25wKw4b1boBU_wWbYb5VhJuhfJZ',
      'ACTIVE_RELEASE_FILE_ID=' +
        ids.renderRelease
    ],
    [
      'VERSION=H3-LISTENING-RENDER-RULES-20260919-V16',
      'VERSION=' + expected.renderVersion
    ],
    [
      'SHA256=7efc7fe8df9771d2bda72e2ee77bacb458c67c17d43c41d710f52c4147a5fc1b',
      'SHA256=' + expected.renderSha256
    ]
  ];

  const alreadyNew =
    manifest.indexOf(
      'MANIFEST_VERSION=' +
        expected.manifestNewVersion
    ) >= 0;

  if (!alreadyNew) {
    oldPairs.forEach(pair => {
      const count =
        manifest.split(pair[0]).length - 1;

      if (count !== 1) {
        throw new Error(
          'R305_MANIFEST_SOURCE_CARDINALITY:' +
          pair[0] +
          ':' +
          count
        );
      }

      manifest =
        manifest.replace(pair[0], pair[1]);
    });
  }

  const requiredManifest = [
    'MANIFEST_VERSION=' +
      expected.manifestNewVersion,
    'SOURCE_SET_ID=' +
      expected.sourceNewSet,
    'ACTIVE_RELEASE_FILE=' +
      expected.renderReleaseName,
    'ACTIVE_RELEASE_FILE_ID=' +
      ids.renderRelease,
    'VERSION=' + expected.renderVersion,
    'SHA256=' + expected.renderSha256
  ];

  requiredManifest.forEach(value => {
    if (manifest.indexOf(value) < 0) {
      throw new Error(
        'R305_MANIFEST_TARGET_MISSING:' +
        value
      );
    }
  });

  const archive =
    DriveApp.getFolderById(ids.archiveFolder);
  const existing =
    archive.getFilesByName(
      expected.manifestReleaseName
    );
  let manifestReleaseId = '';
  let matchCount = 0;

  while (existing.hasNext()) {
    const file = existing.next();
    matchCount += 1;

    if (
      file
        .getBlob()
        .getDataAsString('UTF-8')
        .replace(/^\uFEFF/, '')
        .replace(/\r\n?/g, '\n') !== manifest
    ) {
      throw new Error(
        'R305_MANIFEST_RELEASE_CONFLICT'
      );
    }

    manifestReleaseId = file.getId();
  }

  if (matchCount > 1) {
    throw new Error(
      'R305_MANIFEST_RELEASE_DUPLICATE'
    );
  }

  if (matchCount === 0) {
    const created =
      archive.createFile(
        expected.manifestReleaseName,
        manifest,
        MimeType.PLAIN_TEXT
      );
    manifestReleaseId =
      created.getId();
  }

  manifestFile.setContent(manifest);

  const manifestReadback =
    manifestFile
      .getBlob()
      .getDataAsString('UTF-8')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n');

  if (manifestReadback !== manifest) {
    throw new Error(
      'R305_MANIFEST_READBACK_FAILED'
    );
  }

  const currentText = [
    'HANGUL INFRASTRUCTURE STATUS',
    'Date: 2026-09-19',
    'Project: 한국어 / ハン検 infrastructure',
    'Repository: bsi-fujimoto-akinari/hangul_azure_tts',
    '',
    '==================================================',
    '1. CURRENT STATUS',
    '==================================================',
    '',
    'R2_STATUS = CLOSED_WITH_PLATFORM_LIMIT',
    'R3_STATUS = R3_05_CANONICAL_WEB_APP_PATCH_PASS',
    'R3_COMPLETED = R3-00,R3-01,R3-02,R3-03,R3-04,R3-05',
    'R3_NEXT = H3-L5E2E-R3-06_FULL_SYSTEM_TEST_E2E',
    'NORMAL_LIVE_GATE = BLOCKED',
    'L03_STATUS = NOT_ISSUED',
    'PRODUCTION_ANSWER_COMMIT_GATE = OFF',
    '',
    '==================================================',
    '2. CURRENT CANONICAL',
    '==================================================',
    '',
    'LISTENING_RENDER_VERSION = ' +
      expected.renderVersion,
    'LISTENING_RENDER_CANONICAL_FILE_ID = ' +
      ids.renderCanonical,
    'LISTENING_RENDER_RELEASE_FILE = ' +
      expected.renderReleaseName,
    'LISTENING_RENDER_RELEASE_FILE_ID = ' +
      ids.renderRelease,
    'LISTENING_RENDER_SHA256 = ' +
      expected.renderSha256,
    'LEARNER_SURFACE_CONTRACT_ID = H3-L5E2E-R3-WEB-SURFACE-CONTRACT-20260919-V1',
    'SOURCE_MANIFEST_VERSION = ' +
      expected.manifestNewVersion,
    'SOURCE_SET_ID = ' +
      expected.sourceNewSet,
    'SOURCE_MANIFEST_RELEASE_FILE = ' +
      expected.manifestReleaseName,
    'SOURCE_MANIFEST_RELEASE_FILE_ID = ' +
      manifestReleaseId,
    '',
    '==================================================',
    '3. LIVE LEARNER RUNTIME FREEZE',
    '==================================================',
    '',
    'listening_policy STATUS = N5_AUDIO_TIMING_STAGED',
    'listening_policy PRODUCTION_GATE = N5_E2E_ARMED_ONE_SET',
    'listening_state STATUS = N5_AUDIO_TIMING_STAGED',
    'listening_state PRODUCTION_GATE = N5_E2E_ARMED_ONE_SET',
    'LISTENING_ISSUE_NO = 1',
    'NEXT_LISTENING_SET_NO = 2',
    'LAST_LISTENING_SET_ID = H3-20260919-L02',
    'ACTIVE_WRONG_COUNT = 4',
    'OVERLOAD_STATUS = LISTENING_OVERLOAD_REVIEW',
    'L02_STATUS = ISSUED / scored / immutable',
    'L02_RESULTS = K1○,K2×,K3×,K4×,K5×',
    '',
    '==================================================',
    '4. R3 WEB APP CURRENT',
    '==================================================',
    '',
    'MAIN_SHA = 29010563ac234a770652819358002f2fbd9ee939',
    'WEB_APP_HOST = Apps Script Web App',
    'WEB_APP_ACCESS = USER_DEPLOYING + MYSELF',
    'ANSWER_UI = Q5 answer auto-submit; no reset button; no grading button',
    'MEDIA = inline exact K1 image + inline split K1-K5 audio',
    'AUDIO_GENERATION = individual K1-K5 only; no new combined set audio',
    'AUDIO_DISPATCH = processPendingAudioForSet(mode,setId); one-minute generic trigger is fallback',
    'REVIEW = split K1-K5 audio + matching script blocks in Web App',
    'RECEIPT = H3_WEB_SYNC_V1 / backend COMMITTED pointer',
    'CHAT_WRITE_AFTER_RECEIPT = prohibited',
    'TRIGGERS = K1 / 5L / 5W',
    '5Q = deprecated for new learner requests',
    '',
    '==================================================',
    '5. HARD BOUNDARIES',
    '==================================================',
    '',
    'Until R3-06 PASS, do not:',
    '- issue L03',
    '- issue any new normal learner 5L',
    '- reissue or rewrite H3-20260919-L02',
    '- alter L02 history/counters',
    '- set STATUS ACTIVE',
    '- set PRODUCTION_GATE ACTIVE',
    '- treat SYSTEM_TEST as learner history',
    '- resolve overload/retest merely to unblock testing',
    '- allow both Apps Script and ChatGPT to write the same answer transaction',
    '',
    '==================================================',
    '6. SOURCE / AUTHORITY',
    '==================================================',
    '',
    'Google Sheets live runtime/history = authoritative learner state',
    'hangul_listening_render_rules_v1.txt = normative Listening render behavior',
    'hangul_source_manifest_v1.txt = canonical source registry',
    'GitHub main = repository-managed code source of truth',
    'This CURRENT file = derived operational status only',
    '',
    '==================================================',
    '7. NEXT',
    '==================================================',
    '',
    'NEXT = H3-L5E2E-R3-06_FULL_SYSTEM_TEST_E2E',
    'R3-06 MODE = NONLEARNING_FULL_E2E',
    'R3-06 REQUIRED = production render schema + media + auto-submit + test transaction + receipt + learner-runtime-zero-write verification',
    'LEARNER_RUNTIME_WRITE_IN_R3_05 = 0',
    ''
  ].join('\n');

  const currentFile =
    DriveApp.getFileById(ids.current);
  currentFile.setContent(currentText);

  const currentReadback =
    currentFile
      .getBlob()
      .getDataAsString('UTF-8')
      .replace(/\r\n?/g, '\n');

  if (
    currentReadback !== currentText ||
    currentReadback.indexOf(
      'R3_STATUS = R3_05_CANONICAL_WEB_APP_PATCH_PASS'
    ) < 0
  ) {
    throw new Error(
      'R305_CURRENT_READBACK_FAILED'
    );
  }

  const result = {
    ok: true,
    stage:
      'H3-L5E2E-R3-05_CANONICAL_WEB_APP_PATCH',
    render_version:
      expected.renderVersion,
    render_sha256:
      canonicalSha,
    manifest_version:
      expected.manifestNewVersion,
    source_set_id:
      expected.sourceNewSet,
    manifest_release_id:
      manifestReleaseId,
    current_status:
      'R3_05_CANONICAL_WEB_APP_PATCH_PASS'
  };

  Logger.log(JSON.stringify(result));
  return result;
}


function r305Sha256Hex_(bytes) {
  return Utilities
    .computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      bytes
    )
    .map(value => {
      const n =
        value < 0 ? value + 256 : value;
      return (
        '0' + n.toString(16)
      ).slice(-2);
    })
    .join('');
}
