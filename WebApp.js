/**
 * H3 R3-02 SYSTEM_TEST Web App.
 * Non-learning only. The only authorized write target is listening_web_test_txn_v1.
 * Media transport: exact Drive bytes are returned only through allowlisted Apps Script calls.
 */

function h3WebDoGet_(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.bootJson = JSON.stringify(h3WebBootRequest_(e));
  return template
    .evaluate()
    .setTitle('H3')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getListeningWebSet(request) {
  if (
    request &&
    [
      'HOME',
      'REVIEW',
      'REVIEW_REPLAY'
    ].indexOf(request.mode) >= 0
  ) {
    return h3ReviewRenderRequest_(
      request
    );
  }

  if (request && request.mode === 'LISTENING') {
    return buildProductionRenderPayload_(request);
  }

  if (request && request.mode === 'WRITTEN') {
    if (
      request.surface_family ===
        'READING'
    ) {
      return buildReadingProductionRenderPayload_(
        request
      );
    }

    if (
      request.surface_family ===
        'TRANSLATION'
    ) {
      return buildTranslationProductionRenderPayload_(
        request
      );
    }

    return buildWrittenProductionRenderPayload_(
      request
    );
  }

  validateSystemTestRenderRequest_(request);
  return buildSystemTestRenderPayload_(
    request.set_id
  );
}

function getListeningWebMedia(request) {
  if (
    request &&
    [
      'REVIEW',
      'REVIEW_REPLAY'
    ].indexOf(request.mode) >= 0
  ) {
    return h3ReviewMediaRequest_(
      request
    );
  }

  if (request && request.mode === 'LISTENING') {
    return getProductionMediaPayload_(request);
  }

  if (request && request.mode === 'WRITTEN') {
    throw new Error(
      'WRITTEN_MEDIA_UNAVAILABLE'
    );
  }

  return getSystemTestMediaPayload_(request);
}

function submitListeningWebAnswers(request) {
  if (request && request.mode === 'LISTENING') {
    var result =
      h3ProdSubmit_(request);

    h3ReviewEnsureBindingForCommittedTxn_(
      result.txn_id
    );

    result.after_sync =
      buildPersistentReviewPayload_(
        result.txn_id
      );

    result.home_index_sync =
      h3ReviewHomeIndexUpsertAfterCommit_(
        result,
        result.after_sync
      );

    return result;
  }

  if (request && request.mode === 'WRITTEN') {
    if (
      request.surface_family ===
        'READING'
    ) {
      var readingResult =
        h3ReadingSubmit_(
          request
        );

      readingResult.after_sync =
        h3SurfaceReviewEnsure_(
          'READING',
          readingResult.txn_id
        );

      readingResult.home_index_sync =
        h3ReviewHomeIndexUpsertAfterCommit_(
          readingResult,
          readingResult.after_sync
        );

      var readingReviewReadback =
        h3SurfaceReviewOpen_({
          surface_family:
            'READING',
          set_id:
            readingResult.set_id
        });

      if (
        h3ReviewHash_(
          readingReviewReadback
        ) !==
        h3ReviewHash_(
          readingResult.after_sync
        )
      ) {
        throw new Error(
          'READING_REVIEW_POSTCOMMIT_OPEN_MISMATCH'
        );
      }

      readingResult.after_sync =
        readingReviewReadback;

      return readingResult;
    }

    if (
      request.surface_family ===
        'TRANSLATION'
    ) {
      var translationResult =
        h3TranslationSubmit_(
          request
        );

      var translationReviewLock =
        LockService.getScriptLock();
      translationReviewLock.waitLock(
        30000
      );

      var translationReview;
      try {
        translationReview =
          h3SurfaceReviewEnsure_(
            'TRANSLATION',
            translationResult.txn_id
          );
      } finally {
        translationReviewLock
          .releaseLock();
      }

      translationResult.home_index_sync =
        h3ReviewHomeIndexUpsertAfterCommit_(
          translationResult,
          translationReview
        );

      translationResult.after_sync =
        h3SurfaceReviewOpen_({
          surface_family:
            'TRANSLATION',
          set_id:
            translationResult.set_id
        });

      if (
        h3ReviewHash_(
          translationResult.after_sync
        ) !==
        h3ReviewHash_(
          translationReview
        )
      ) {
        throw new Error(
          'TRANSLATION_REVIEW_OPEN_VALIDATION_MISMATCH'
        );
      }

      return translationResult;
    }

    var writtenResult =
      h3WrittenSubmit_(request);

    writtenResult.answer_sync =
      h3WrittenAnswerSync_(
        writtenResult.txn_id
      );

    h3WrittenProductionReviewEnsure_(
      writtenResult.txn_id
    );

    writtenResult.after_sync =
      getWrittenProductionPersistentReviewPayload_(
        writtenResult.set_id
      );

    writtenResult.home_index_sync =
      h3ReviewHomeIndexUpsertAfterCommit_(
        writtenResult,
        writtenResult.after_sync
      );

    return writtenResult;
  }

  if (
    request &&
    request.mode === 'REVIEW_REPLAY'
  ) {
    return h3ReviewSubmitRequest_(
      request
    );
  }

  if (
    request &&
    (
      request.mode === 'REVIEW' ||
      request.mode === 'HOME'
    )
  ) {
    throw new Error(
      'READ_ONLY_MODE_SUBMIT_FORBIDDEN'
    );
  }

  return gradeSystemTestSubmission_(request);
}

function h3WebBootRequest_(e) {
  var mode = 'HOME';
  var setId = null;
  var txnId = null;
  var surfaceFamily = null;
  var params =
    e && e.parameter
      ? e.parameter
      : {};
  var paramKeys =
    Object.keys(params);

  if (paramKeys.length) {
    if (
      params.mode === 'REVIEW' &&
      params.txn_id
    ) {
      mode = 'REVIEW';
      txnId = String(
        params.txn_id
      );
    } else if (
      params.mode === 'LISTENING' &&
      params.set_id
    ) {
      mode = 'LISTENING';
      setId = String(
        params.set_id
      );
    } else if (
      params.mode === 'WRITTEN' &&
      params.set_id
    ) {
      mode = 'WRITTEN';
      setId = String(
        params.set_id
      );
      if (
        [
          'READING',
          'TRANSLATION'
        ].indexOf(
          params.surface_family
        ) >= 0
      ) {
        surfaceFamily =
          String(
            params.surface_family
          );
      }
    } else if (
      params.mode === 'SYSTEM_TEST' &&
      h3SystemTestSetIdAllowed_(
        params.set_id
      )
    ) {
      mode = 'SYSTEM_TEST';
      setId = String(
        params.set_id
      );
    }
  } else {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var current =
      h3ReviewCurrentLearning_(
        spreadsheet
      );

    if (current) {
      mode = String(
        current.mode ||
        'LISTENING'
      );
      if (
        ['LISTENING', 'WRITTEN']
          .indexOf(mode) < 0
      ) {
        throw new Error(
          'CURRENT_LEARNING_MODE_INVALID'
        );
      }
      setId = String(
        current.set_id
      );
      surfaceFamily =
        current.surface_family
          ? String(
              current.surface_family
            )
          : null;
    }
  }

  return {
    schema:
      'H3_WEB_RENDER_REQUEST_V1',
    mode: mode,
    surface_family:
      surfaceFamily,
    set_id: setId,
    txn_id: txnId
  };
}

function h3Sha256Hex_(value) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return digest.map(function (b) {
    var n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function h3DriveDataUri_(fileId, expectedMimeType, expectedSha256, maxBytes) {
  var file = DriveApp.getFileById(fileId);
  var mimeType = file.getMimeType();
  var size = file.getSize();

  if (expectedMimeType && mimeType !== expectedMimeType) {
    throw new Error('MEDIA_MIME_MISMATCH:' + fileId);
  }
  if (size > maxBytes) {
    throw new Error('MEDIA_TOO_LARGE:' + fileId);
  }

  var blob = file.getBlob();
  var bytes = blob.getBytes();

  if (expectedSha256) {
    var actualSha256 = h3Sha256Hex_(bytes);
    if (actualSha256 !== expectedSha256) {
      throw new Error('MEDIA_SHA256_MISMATCH:' + fileId);
    }
  }

  return {
    data_uri: 'data:' + mimeType + ';base64,' + Utilities.base64Encode(bytes),
    mime_type: mimeType,
    size_bytes: size
  };
}

function h3DriveUtf8Text_(fileId, maxBytes) {
  var file = DriveApp.getFileById(fileId);
  var size = file.getSize();
  if (size > maxBytes) {
    throw new Error('TEXT_FILE_TOO_LARGE:' + fileId);
  }

  var text = file.getBlob().getDataAsString('UTF-8');
  if (text && text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  return text;
}


var H3_WEB_RUNTIME_SPREADSHEET_ID =
  '18nxNQoHg3arFaEDOaqc4wuFHmBq43Q4g-I_uD6IDysM';


var H3_LEARNER_WEB_APP_BASE_URL =
  'https://script.google.com/macros/s/AKfycby8I309RUkfVIsnJks808KA713QLppfrGiAFUTV2tA/dev';

function h3BuildListeningLearnerUrl_(
  setId
) {
  var normalized =
    String(setId || '').trim();

  if (
    !/^H3-\d{8}-L\d{2,3}$/.test(
      normalized
    )
  ) {
    throw new Error(
      'LEARNER_URL_SET_ID_INVALID'
    );
  }

  return (
    H3_LEARNER_WEB_APP_BASE_URL +
    '?mode=LISTENING&set_id=' +
    encodeURIComponent(normalized)
  );
}

function getListeningLearnerUrl(
  setId
) {
  var normalized =
    String(setId || '').trim();

  var payload =
    buildProductionRenderPayload_({
      schema:
        'H3_WEB_RENDER_REQUEST_V1',
      mode:
        'LISTENING',
      set_id:
        normalized
    });

  if (
    !payload ||
    payload.mode !== 'LISTENING' ||
    String(payload.set_id || '') !==
      normalized
  ) {
    throw new Error(
      'LEARNER_URL_RENDER_GATE_FAILED'
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
      h3BuildListeningLearnerUrl_(
        normalized
      ),
    direct_url_policy:
      'INTERNAL_DIAGNOSTIC_ONLY',
    host:
      'script.google.com'
  };
}

var H3_WEB_TEST_TXN_SHEET =
  'listening_web_test_txn_v1';

var H3_WEB_TEST_TXN_HEADERS = [
  'TXN_ID',
  'SET_ID',
  'LISTENING_SET_NO',
  'MODE',
  'RAW_INPUT_JSON',
  'REQUEST_FINGERPRINT',
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

var H3_WEB_LEARNER_SENTINEL_RANGES = [
  { sheet: 'listening_policy_v1', range: 'A1:D100' },
  { sheet: 'listening_state_v1', range: 'A1:C100' },
  { sheet: 'listening_log_v1', range: 'A1:U6' },
  { sheet: 'listening_k1_ready_v1', range: 'A1:M2' },
  { sheet: 'listening_set_payload_v1', range: 'A1:O2' }
];

function h3NowTokyo_() {
  return (
    Utilities.formatDate(
      new Date(),
      'Asia/Tokyo',
      "yyyy-MM-dd'T'HH:mm:ss"
    ) + '+09:00'
  );
}

function h3CaptureLearnerRuntimeSentinel_(spreadsheet) {
  var ranges = H3_WEB_LEARNER_SENTINEL_RANGES.map(function (spec) {
    var sheet = spreadsheet.getSheetByName(spec.sheet);
    if (!sheet) {
      throw new Error(
        'LEARNER_SENTINEL_SHEET_MISSING:' + spec.sheet
      );
    }

    var values = sheet
      .getRange(spec.range)
      .getDisplayValues();

    return {
      sheet: spec.sheet,
      range: spec.range,
      sha256: h3Sha256Hex_(JSON.stringify(values))
    };
  });

  var json = JSON.stringify({
    schema: 'H3_WEB_LEARNER_SENTINEL_V1',
    ranges: ranges
  });

  return {
    json: json,
    sha256: h3Sha256Hex_(json)
  };
}

function h3RequireTestTxnSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(
    H3_WEB_TEST_TXN_SHEET
  );

  if (!sheet) {
    throw new Error('TEST_TXN_SHEET_MISSING');
  }

  var header = sheet
    .getRange(1, 1, 1, H3_WEB_TEST_TXN_HEADERS.length)
    .getDisplayValues()[0];

  if (
    JSON.stringify(header) !==
    JSON.stringify(H3_WEB_TEST_TXN_HEADERS)
  ) {
    throw new Error('TEST_TXN_HEADER_MISMATCH');
  }

  return sheet;
}

function h3NextTestTxnId_(spreadsheet) {
  return h3NextWebTxnId_(spreadsheet);
}

function h3BuildTestRequestFingerprint_(setId, answers) {
  var body = answers.map(function (a) {
    return [
      a.section,
      String(a.answer),
      a.uncertain ? '1' : '0'
    ].join(':');
  }).join('|');

  return h3Sha256Hex_(setId + '|' + body);
}

function h3BuildCommittedTestResult_(core, txnId) {
  var receipt = h3BuildWebReceipt_(core.set_id, txnId);

  return {
    schema: 'H3_WEB_SUBMIT_RESULT_V1',
    mode: 'SYSTEM_TEST',
    nonlearning: true,
    persisted: true,
    commit_scope: 'R3_02_SYSTEM_TEST_JOURNAL',
    set_id: core.set_id,
    txn_id: txnId,
    status: 'COMMITTED',
    score: core.score,
    total: core.total,
    summary: core.summary,
    receipt: receipt
  };
}

function h3CommitSystemTestTransaction_(
  request,
  normalizedAnswers,
  resultCore
) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  var spreadsheet = null;
  var sheet = null;
  var preparedRow = null;

  try {
    spreadsheet = SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
    sheet = h3RequireTestTxnSheet_(spreadsheet);

    var lastRow = sheet.getLastRow();
    var rows =
      lastRow > 1
        ? sheet
            .getRange(
              2,
              1,
              lastRow - 1,
              H3_WEB_TEST_TXN_HEADERS.length
            )
            .getDisplayValues()
        : [];

    var rawInputJson = JSON.stringify({
      schema: 'H3_WEB_SUBMIT_V1',
      mode: 'SYSTEM_TEST',
      set_id: request.set_id,
      answers: normalizedAnswers
    });

    var fingerprint =
      h3BuildTestRequestFingerprint_(
        request.set_id,
        normalizedAnswers
      );

    var matching = [];
    var unresolvedRecovery = false;

    rows.forEach(function (row, i) {
      var status = String(row[7] || '');
      if (status === 'RECOVERY_REQUIRED') {
        unresolvedRecovery = true;
      }

      if (String(row[1] || '') === request.set_id) {
        matching.push({
          rowNumber: i + 2,
          values: row
        });
      }
    });

    for (var i = 0; i < matching.length; i += 1) {
      var record = matching[i];
      var row = record.values;
      var status = String(row[7] || '');
      var rowFingerprint = String(row[5] || '');

      if (
        status === 'COMMITTED' &&
        rowFingerprint === fingerprint
      ) {
        var stored = JSON.parse(String(row[8] || '{}'));
        if (
          stored.txn_id !== String(row[0] || '') ||
          stored.status !== 'COMMITTED'
        ) {
          throw new Error(
            'TEST_TXN_COMMITTED_ROW_RESULT_MISMATCH'
          );
        }
        return stored;
      }

      if (
        status === 'PREPARED' &&
        rowFingerprint === fingerprint
      ) {
        var currentSentinel =
          h3CaptureLearnerRuntimeSentinel_(spreadsheet);
        var preparedPreHash = String(row[11] || '');

        if (
          currentSentinel.sha256 !== preparedPreHash
        ) {
          sheet
            .getRange(record.rowNumber, 8, 1, 8)
            .setValues([[
              'RECOVERY_REQUIRED',
              '',
              '',
              String(row[10] || ''),
              preparedPreHash,
              currentSentinel.sha256,
              '',
              'LEARNER_RUNTIME_SENTINEL_CHANGED_DURING_PREPARED_RECOVERY'
            ]]);
          SpreadsheetApp.flush();
          throw new Error(
            'TEST_TXN_RECOVERY_REQUIRED'
          );
        }

        var recoveredResult =
          h3BuildCommittedTestResult_(
            resultCore,
            String(row[0] || '')
          );
        var recoveredAt = h3NowTokyo_();

        sheet
          .getRange(record.rowNumber, 8, 1, 8)
          .setValues([[
            'COMMITTED',
            JSON.stringify(recoveredResult),
            recoveredResult.score,
            String(row[10] || ''),
            preparedPreHash,
            currentSentinel.sha256,
            recoveredAt,
            ''
          ]]);
        SpreadsheetApp.flush();

        var recoveredReadback = sheet
          .getRange(
            record.rowNumber,
            1,
            1,
            H3_WEB_TEST_TXN_HEADERS.length
          )
          .getDisplayValues()[0];

        if (
          recoveredReadback[0] !== recoveredResult.txn_id ||
          recoveredReadback[7] !== 'COMMITTED'
        ) {
          throw new Error(
            'TEST_TXN_RECOVERY_READBACK_FAILED'
          );
        }

        return recoveredResult;
      }

      // SYSTEM_TEST may be rerun with a different answer fingerprint.
      // Production set-level conflict semantics are implemented separately
      // in R3-03 and are intentionally not relaxed here.
    }

    if (unresolvedRecovery) {
      throw new Error(
        'TEST_TXN_RECOVERY_REQUIRED_BLOCK'
      );
    }

    var prestate =
      h3CaptureLearnerRuntimeSentinel_(spreadsheet);

    var txnId = h3NextTestTxnId_(spreadsheet);
    var createdAt = h3NowTokyo_();

    sheet.appendRow([
      txnId,
      request.set_id,
      '',
      'SYSTEM_TEST',
      rawInputJson,
      fingerprint,
      createdAt,
      'PREPARED',
      '',
      '',
      prestate.json,
      prestate.sha256,
      '',
      '',
      ''
    ]);
    preparedRow = sheet.getLastRow();
    SpreadsheetApp.flush();

    var preparedReadback = sheet
      .getRange(
        preparedRow,
        1,
        1,
        H3_WEB_TEST_TXN_HEADERS.length
      )
      .getDisplayValues()[0];

    if (
      preparedReadback[0] !== txnId ||
      preparedReadback[7] !== 'PREPARED' ||
      preparedReadback[5] !== fingerprint
    ) {
      throw new Error(
        'TEST_TXN_PREPARED_READBACK_FAILED'
      );
    }

    var poststate =
      h3CaptureLearnerRuntimeSentinel_(spreadsheet);

    if (poststate.sha256 !== prestate.sha256) {
      sheet
        .getRange(preparedRow, 8, 1, 8)
        .setValues([[
          'RECOVERY_REQUIRED',
          '',
          '',
          prestate.json,
          prestate.sha256,
          poststate.sha256,
          '',
          'LEARNER_RUNTIME_SENTINEL_CHANGED_DURING_SYSTEM_TEST'
        ]]);
      SpreadsheetApp.flush();
      throw new Error(
        'TEST_TXN_RECOVERY_REQUIRED'
      );
    }

    var committed =
      h3BuildCommittedTestResult_(
        resultCore,
        txnId
      );
    var committedAt = h3NowTokyo_();

    sheet
      .getRange(preparedRow, 8, 1, 8)
      .setValues([[
        'COMMITTED',
        JSON.stringify(committed),
        committed.score,
        prestate.json,
        prestate.sha256,
        poststate.sha256,
        committedAt,
        ''
      ]]);
    SpreadsheetApp.flush();

    var finalReadback = sheet
      .getRange(
        preparedRow,
        1,
        1,
        H3_WEB_TEST_TXN_HEADERS.length
      )
      .getDisplayValues()[0];

    if (
      finalReadback[0] !== txnId ||
      finalReadback[7] !== 'COMMITTED' ||
      finalReadback[5] !== fingerprint ||
      finalReadback[11] !== prestate.sha256 ||
      finalReadback[12] !== poststate.sha256
    ) {
      throw new Error(
        'TEST_TXN_COMMITTED_READBACK_FAILED'
      );
    }

    return committed;
  } catch (err) {
    if (sheet && preparedRow) {
      try {
        var status = sheet
          .getRange(preparedRow, 8)
          .getDisplayValue();

        if (
          status !== 'COMMITTED' &&
          status !== 'RECOVERY_REQUIRED'
        ) {
          sheet
            .getRange(preparedRow, 8, 1, 8)
            .setValues([[
              'ROLLED_BACK',
              '',
              '',
              sheet
                .getRange(preparedRow, 11)
                .getDisplayValue(),
              sheet
                .getRange(preparedRow, 12)
                .getDisplayValue(),
              '',
              '',
              String(
                err && err.message
                  ? err.message
                  : err
              )
            ]]);
          SpreadsheetApp.flush();
        }
      } catch (rollbackErr) {
        // The original error remains authoritative.
      }
    }

    throw err;
  } finally {
    lock.releaseLock();
  }
}
