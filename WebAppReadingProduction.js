/**
 * H3 Reading production route / transaction persistence.
 *
 * Reading-only runtime. F2B wires post-commit Review/HOME and enables the
 * controlled Reading commit gate; learner issue remains a separate F2C gate.
 */

var H3_READING_PRODUCTION_COMMIT_ENABLED_ =
  true;

var H3_READING_PRODUCTION_CONTRACT_ID_ =
  'H3-READING-PRODUCTION-20260921-V1';


function h3ReadingProdNowTokyo_() {
  return Utilities.formatDate(
    new Date(),
    'Asia/Tokyo',
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
}


function h3ReadingProdTable_(
  sheet,
  expectedHeaders,
  label
) {
  if (!sheet) {
    throw new Error(
      label + '_SHEET_MISSING'
    );
  }

  var width =
    expectedHeaders.length;
  var lastRow =
    Math.max(
      1,
      sheet.getLastRow()
    );
  var values =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        width
      )
      .getDisplayValues();

  var header =
    values[0] || [];

  if (
    JSON.stringify(header) !==
      JSON.stringify(
        expectedHeaders
      )
  ) {
    throw new Error(
      label + '_HEADER_MISMATCH'
    );
  }

  var map = {};
  header.forEach(
    function (name, index) {
      map[name] = index;
    }
  );

  return {
    sheet: sheet,
    header: header,
    map: map,
    rows: values.slice(1)
  };
}


function h3ReadingProdFindOne_(
  table,
  column,
  value,
  label
) {
  var wanted =
    String(value || '');
  var matches = [];

  table.rows.forEach(
    function (row, index) {
      if (
        String(
          row[
            table.map[column]
          ] || ''
        ) === wanted
      ) {
        matches.push({
          row: row,
          rowNumber:
            index + 2
        });
      }
    }
  );

  if (matches.length !== 1) {
    throw new Error(
      label +
      '_IDENTITY_COUNT_INVALID:' +
      matches.length
    );
  }

  return matches[0];
}


function h3ReadingProdStageFromRow_(
  table,
  record
) {
  var row =
    record.row;
  var map =
    table.map;

  var stage = {
    schema:
      H3_READING_STAGE_SCHEMA_,
    activation_contract_id:
      H3_READING_ACTIVATION_CONTRACT_ID_,
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    issue_no:
      Number(
        row[map.ISSUE_NO]
      ),
    stage_id:
      String(
        row[map.STAGE_ID] || ''
      ),
    set_id:
      String(
        row[map.SET_ID] || ''
      ),
    status:
      String(
        row[map.STATUS] || ''
      ),
    level:
      String(
        row[map.LEVEL] || ''
      ),
    section_key:
      String(
        row[map.SECTION_KEY] || ''
      ),
    item_count:
      Number(
        row[map.ITEM_COUNT]
      ),
    source_binding_sha256:
      String(
        row[
          map.SOURCE_BINDING_SHA256
        ] || ''
      ),
    locked_bundle_sha256:
      String(
        row[
          map.LOCKED_BUNDLE_SHA256
        ] || ''
      ),
    locked_bundle_json:
      String(
        row[
          map.LOCKED_BUNDLE_JSON
        ] || ''
      ),
    created_at:
      String(
        row[map.CREATED_AT] || ''
      ),
    locked_at:
      String(
        row[map.LOCKED_AT] || ''
      ),
    issued_at:
      String(
        row[map.ISSUED_AT] || ''
      ),
    committed_at:
      String(
        row[map.COMMITTED_AT] || ''
      )
  };

  var locked =
    h3ReadingParseLockedBundleJson_(
      stage.locked_bundle_json
    );

  h3ReadingValidateStageLock_(
    stage,
    locked
  );

  return {
    stage: stage,
    locked: locked,
    rowNumber:
      record.rowNumber
  };
}


function h3ReadingProdReadContext_(
  spreadsheet,
  setId
) {
  var normalizedSetId =
    h3ReadingActivationRequireId_(
      setId,
      'READING_PROD_SET_ID_INVALID'
    );

  var stageTable =
    h3ReadingProdTable_(
      spreadsheet.getSheetByName(
        'reading_stage_v1'
      ),
      H3_READING_STAGE_HEADERS_,
      'READING_STAGE'
    );

  var txnTable =
    h3ReadingProdTable_(
      spreadsheet.getSheetByName(
        H3_READING_TXN_SHEET_
      ),
      H3_READING_TXN_HEADERS_,
      'READING_TXN'
    );

  var logTable =
    h3ReadingProdTable_(
      spreadsheet.getSheetByName(
        'reading_log_v1'
      ),
      H3_READING_LOG_HEADERS_,
      'READING_LOG'
    );

  var stageRecord =
    h3ReadingProdFindOne_(
      stageTable,
      'SET_ID',
      normalizedSetId,
      'READING_STAGE'
    );

  var parsed =
    h3ReadingProdStageFromRow_(
      stageTable,
      stageRecord
    );

  return {
    spreadsheet:
      spreadsheet,
    stageTable:
      stageTable,
    txnTable:
      txnTable,
    logTable:
      logTable,
    stage:
      parsed.stage,
    locked:
      parsed.locked,
    stageRowNumber:
      parsed.rowNumber
  };
}


function h3ReadingProdTxnRowsForSet_(
  context
) {
  var out = [];

  context.txnTable.rows.forEach(
    function (row, index) {
      if (
        String(
          row[
            context.txnTable.map.SET_ID
          ] || ''
        ) === context.stage.set_id
      ) {
        out.push({
          row: row,
          rowNumber:
            index + 2
        });
      }
    }
  );

  return out;
}


function h3ReadingProdRequireIssued_(
  context
) {
  if (
    context.stage.status !==
      'ISSUED' ||
    !context.stage.issued_at ||
    context.stage.committed_at
  ) {
    throw new Error(
      'READING_PROD_STAGE_NOT_ISSUED'
    );
  }

  var rows =
    h3ReadingProdTxnRowsForSet_(
      context
    );

  rows.forEach(function (record) {
    var status =
      String(
        record.row[
          context.txnTable.map.STATUS
        ] || ''
      );

    if (
      status === 'COMMITTED'
    ) {
      throw new Error(
        'READING_PROD_ALREADY_COMMITTED'
      );
    }

    if (
      status === 'PREPARED' ||
      status ===
        'RECOVERY_REQUIRED'
    ) {
      throw new Error(
        'READING_PROD_TXN_BLOCKING'
      );
    }
  });

  return true;
}


function h3ReadingProdValidateRenderRequest_(
  request
) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_RENDER_REQUEST_V1' ||
    request.mode !==
      'WRITTEN' ||
    request.surface_family !==
      'READING'
  ) {
    throw new Error(
      'READING_RENDER_REQUEST_INVALID'
    );
  }

  h3ReadingActivationRequireId_(
    request.set_id,
    'READING_RENDER_SET_ID_INVALID'
  );
}


function buildReadingProductionRenderPayload_(
  request
) {
  h3ReadingProdValidateRenderRequest_(
    request
  );

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  var context =
    h3ReadingProdReadContext_(
      spreadsheet,
      request.set_id
    );

  h3ReadingProdRequireIssued_(
    context
  );

  var payload =
    h3ReadingBuildRenderPayload_(
      context.locked,
      context.stage.set_id
    );

  payload.persisted = true;
  payload.pilot_only = false;
  payload.issue_no =
    context.stage.issue_no;
  payload.stage_id =
    context.stage.stage_id;
  payload.transport.review =
    'READING_PRODUCTION';

  return payload;
}


function h3ReadingProdClassifyExistingTxn_(
  context,
  fingerprint
) {
  var rows =
    h3ReadingProdTxnRowsForSet_(
      context
    );

  if (rows.length > 1) {
    throw new Error(
      'READING_TXN_DUPLICATE_AUTHORITY'
    );
  }

  if (!rows.length) {
    return {
      action: 'NEW',
      record: null
    };
  }

  var record =
    rows[0];
  var row =
    record.row;
  var map =
    context.txnTable.map;
  var storedFingerprint =
    String(
      row[
        map.REQUEST_FINGERPRINT
      ] || ''
    );
  var status =
    String(
      row[map.STATUS] || ''
    );

  if (
    status === 'COMMITTED' &&
    storedFingerprint ===
      fingerprint
  ) {
    return {
      action:
        'RETURN_COMMITTED',
      record:
        record
    };
  }

  if (
    status === 'COMMITTED'
  ) {
    throw new Error(
      'READING_TXN_CONFLICT_COMMITTED'
    );
  }

  if (
    status === 'PREPARED' ||
    status ===
      'RECOVERY_REQUIRED'
  ) {
    throw new Error(
      'READING_TXN_RECOVERY_REQUIRED'
    );
  }

  throw new Error(
    'READING_TXN_STATUS_INVALID'
  );
}


function h3ReadingProdStoredResult_(
  context,
  record
) {
  var map =
    context.txnTable.map;
  var text =
    String(
      record.row[
        map.RESULT_JSON
      ] || ''
    );
  var result;

  try {
    result =
      JSON.parse(text);
  } catch (_err) {
    throw new Error(
      'READING_TXN_RESULT_JSON_INVALID'
    );
  }

  if (
    !result ||
    result.schema !==
      'H3_WEB_SUBMIT_RESULT_V1' ||
    result.surface_family !==
      'READING' ||
    result.set_id !==
      context.stage.set_id ||
    result.txn_id !==
      String(
        record.row[
          map.TXN_ID
        ] || ''
      )
  ) {
    throw new Error(
      'READING_TXN_RESULT_IDENTITY_INVALID'
    );
  }

  var storedStatus =
    String(
      record.row[
        map.STATUS
      ] || ''
    );

  if (
    storedStatus !== 'COMMITTED'
  ) {
    throw new Error(
      'READING_TXN_STORED_STATUS_INVALID'
    );
  }

  if (
    result.status &&
    result.status !== storedStatus
  ) {
    throw new Error(
      'READING_TXN_RESULT_STATUS_MISMATCH'
    );
  }

  result.status = storedStatus;

  return result;
}


function h3ReadingProdMarkRecovery_(
  journal,
  rowNumber,
  message
) {
  journal
    .getRange(
      rowNumber,
      10
    )
    .setValue(
      'RECOVERY_REQUIRED'
    );
  journal
    .getRange(
      rowNumber,
      14
    )
    .setValue(
      String(message || '')
    );
  SpreadsheetApp.flush();
}


function h3ReadingProdVerifyLogRows_(
  context,
  txnId,
  expectedCount
) {
  var sheet =
    context.logTable.sheet;
  var lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    throw new Error(
      'READING_LOG_READBACK_EMPTY'
    );
  }

  var values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        H3_READING_LOG_HEADERS_
          .length
      )
      .getDisplayValues();

  var matches =
    values.filter(
      function (row) {
        return (
          String(row[0] || '') ===
            String(txnId) &&
          String(row[1] || '') ===
            context.stage.set_id
        );
      }
    );

  if (
    matches.length !==
      expectedCount
  ) {
    throw new Error(
      'READING_LOG_READBACK_COUNT_INVALID'
    );
  }

  return true;
}


function h3ReadingSubmit_(
  request
) {
  if (
    !H3_READING_PRODUCTION_COMMIT_ENABLED_
  ) {
    throw new Error(
      'READING_PRODUCTION_COMMIT_DISABLED'
    );
  }

  var lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  var journal = null;
  var txnRow = null;

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );

    var context =
      h3ReadingProdReadContext_(
        spreadsheet,
        request &&
          request.set_id
      );

    if (
      context.stage.status !==
        'ISSUED' ||
      !context.stage.issued_at ||
      context.stage.committed_at
    ) {
      throw new Error(
        'READING_SUBMIT_STAGE_NOT_ISSUED'
      );
    }

    h3MultiSkillReadingPreflight_(
      spreadsheet,
      context
    );

    var normalized =
      h3ReadingNormalizeSubmission_(
        request,
        context.locked
      );
    var fingerprint =
      h3ReadingRequestFingerprint_(
        normalized
      );

    var existing =
      h3ReadingProdClassifyExistingTxn_(
        context,
        fingerprint
      );

    if (
      existing.action ===
        'RETURN_COMMITTED'
    ) {
      return h3ReadingProdStoredResult_(
        context,
        existing.record
      );
    }

    var plan =
      h3ReadingBuildTxnPlan_(
        context.stage,
        context.locked,
        request
      );
    var txnId =
      h3NextWebTxnId_(
        spreadsheet
      );
    var grade =
      h3ReadingGrade_(
        context.locked,
        normalized.answers
      );
    var result =
      h3ReadingBuildCommittedResult_(
        context.stage,
        context.locked,
        grade,
        txnId
      );
    var now =
      h3ReadingProdNowTokyo_();

    journal =
      context.txnTable.sheet;

    journal.appendRow([
      txnId,
      context.stage.set_id,
      context.stage.stage_id,
      'WRITTEN',
      'READING',
      JSON.stringify(
        normalized
      ),
      plan.request_fingerprint,
      context.stage
        .source_binding_sha256,
      now,
      'PREPARED',
      JSON.stringify(result),
      grade.score,
      '',
      ''
    ]);
    txnRow =
      journal.getLastRow();

    SpreadsheetApp.flush();

    var prepared =
      journal
        .getRange(
          txnRow,
          1,
          1,
          H3_READING_TXN_HEADERS_
            .length
        )
        .getDisplayValues()[0];

    if (
      prepared[0] !== txnId ||
      prepared[1] !==
        context.stage.set_id ||
      prepared[2] !==
        context.stage.stage_id ||
      prepared[4] !==
        'READING' ||
      prepared[6] !==
        fingerprint ||
      prepared[7] !==
        context.stage
          .source_binding_sha256 ||
      prepared[9] !==
        'PREPARED'
    ) {
      throw new Error(
        'READING_TXN_PREPARED_READBACK_FAILED'
      );
    }

    grade.graded.forEach(
      function (item) {
        context.logTable.sheet
          .appendRow([
            txnId,
            context.stage.set_id,
            item.q_no,
            item.item_id,
            item.question_key,
            item.skill_id,
            item.mark,
            item.uncertain
              ? 'TRUE'
              : 'FALSE',
            item.passage_id,
            item.passage_sha256,
            now
          ]);
      }
    );

    SpreadsheetApp.flush();

    h3ReadingProdVerifyLogRows_(
      context,
      txnId,
      grade.total
    );

    context.stageTable.sheet
      .getRange(
        context.stageRowNumber,
        4
      )
      .setValue(
        'COMMITTED'
      );
    context.stageTable.sheet
      .getRange(
        context.stageRowNumber,
        14
      )
      .setValue(now);

    journal
      .getRange(
        txnRow,
        10
      )
      .setValue(
        'COMMITTED'
      );
    journal
      .getRange(
        txnRow,
        13
      )
      .setValue(now);

    SpreadsheetApp.flush();

    var txnReadback =
      journal
        .getRange(
          txnRow,
          1,
          1,
          H3_READING_TXN_HEADERS_
            .length
        )
        .getDisplayValues()[0];
    var stageReadback =
      context.stageTable.sheet
        .getRange(
          context.stageRowNumber,
          1,
          1,
          H3_READING_STAGE_HEADERS_
            .length
        )
        .getDisplayValues()[0];

    if (
      txnReadback[9] !==
        'COMMITTED' ||
      !txnReadback[12] ||
      stageReadback[3] !==
        'COMMITTED' ||
      !stageReadback[13]
    ) {
      throw new Error(
        'READING_COMMIT_READBACK_FAILED'
      );
    }

    return h3MultiSkillAttachCapture_(
      result,
      function () {
        return h3MultiSkillReadingCapture_(
          spreadsheet,
          context,
          grade,
          txnId,
          now
        );
      }
    );
  } catch (err) {
    if (
      journal &&
      txnRow
    ) {
      try {
        h3ReadingProdMarkRecovery_(
          journal,
          txnRow,
          String(
            err &&
            err.message ||
            err
          )
        );
      } catch (_recoveryErr) {
      }
    }
    throw err;
  } finally {
    lock.releaseLock();
  }
}


function h3ReadingCurrentLearning_(
  spreadsheet
) {
  var stageTable =
    h3ReadingProdTable_(
      spreadsheet.getSheetByName(
        'reading_stage_v1'
      ),
      H3_READING_STAGE_HEADERS_,
      'READING_STAGE'
    );
  var txnTable =
    h3ReadingProdTable_(
      spreadsheet.getSheetByName(
        H3_READING_TXN_SHEET_
      ),
      H3_READING_TXN_HEADERS_,
      'READING_TXN'
    );

  var committed = {};
  var blocking = {};

  txnTable.rows.forEach(
    function (row) {
      var setId =
        String(
          row[
            txnTable.map.SET_ID
          ] || ''
        );
      var status =
        String(
          row[
            txnTable.map.STATUS
          ] || ''
        );

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
        blocking[setId] = true;
      }
    }
  );

  var candidates = [];

  stageTable.rows.forEach(
    function (row, index) {
      var setId =
        String(
          row[
            stageTable.map.SET_ID
          ] || ''
        );
      var status =
        String(
          row[
            stageTable.map.STATUS
          ] || ''
        );
      var issuedAt =
        String(
          row[
            stageTable.map.ISSUED_AT
          ] || ''
        );
      var committedAt =
        String(
          row[
            stageTable.map.COMMITTED_AT
          ] || ''
        );

      if (
        status !== 'ISSUED' ||
        !setId ||
        !issuedAt ||
        committedAt ||
        committed[setId]
      ) {
        return;
      }

      if (blocking[setId]) {
        throw new Error(
          'READING_CURRENT_TXN_BLOCKING'
        );
      }

      var record = {
        row: row,
        rowNumber:
          index + 2
      };
      var parsed =
        h3ReadingProdStageFromRow_(
          stageTable,
          record
        );

      candidates.push(
        h3ReadingCurrentLearningCandidate_(
          parsed.stage,
          parsed.locked,
          false
        )
      );
    }
  );

  if (candidates.length > 1) {
    throw new Error(
      'READING_CURRENT_AMBIGUOUS'
    );
  }

  if (!candidates.length) {
    return null;
  }

  var current =
    candidates[0];

  return {
    schema:
      H3_READING_CURRENT_SCHEMA_,
    mode:
      'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    level:
      current.level,
    issue_no:
      current.issue_no,
    stage_id:
      current.stage_id,
    set_id:
      current.set_id,
    item_count:
      current.item_count,
    source_binding_sha256:
      current.source_binding_sha256
  };
}
