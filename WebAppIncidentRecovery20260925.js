var H3_INCIDENT_20260925_WRITTEN_ = {
  schema:
    'H3_WRITTEN_INCIDENT_RECOVERY_20260925_V1',
  set_id:
    'H3-20260925-01',
  txn_id:
    'H3TX-20260925-000001',
  stage_id:
    'STD-B002-S1',
  issued_at:
    '2026-09-25T18:46:37+09:00',
  committed_at:
    '2026-09-25T18:55:28+09:00',
  source_binding_sha256:
    '8d06905a56047c1c6efea190a9857795c4c4ba3484168a6665f0fe01cdbdf6de',
  request_fingerprint:
    '66721da22dbb037ce15a5e14d2e4dba13b7cd856da80c00beab88e413a20f855',
  prestate_sha256:
    '1da58d4dc0fe9a8a73a5a19f09cf2b80aefdb30d9cb3dff53b1cab47b7fb0883',
  poststate_sha256:
    '2cc4e05b968a66a5af12f2a3282d291d126e592e311e7bfc6a6a4421a8414e52',
  prior_written_set_id:
    'H3-20260920-01',
  expected_marks:
    ['×', '×', '△', '×', '○']
};

function h3Incident20260925Require_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'H3_INCIDENT_20260925_' +
      String(code || 'ASSERTION_FAILED')
    );
  }
}

function h3Incident20260925RowsBy_(
  table,
  column,
  value
) {
  var index = table.map[column];
  h3Incident20260925Require_(
    index !== undefined,
    'COLUMN_MISSING:' + column
  );

  var out = [];
  table.rows.forEach(
    function (row, rowIndex) {
      if (
        String(row[index] || '') ===
        String(value || '')
      ) {
        out.push({
          row: row,
          rowNumber: rowIndex + 2
        });
      }
    }
  );
  return out;
}

function h3Incident20260925Kv_(
  spreadsheet,
  sheetName
) {
  var table =
    h3FsTable_(
      spreadsheet.getSheetByName(
        sheetName
      )
    );
  h3Incident20260925Require_(
    table.headers.length >= 2,
    'KV_TABLE_INVALID:' + sheetName
  );

  var keyIndex =
    table.map.STATE_KEY !== undefined
      ? table.map.STATE_KEY
      : 0;
  var valueIndex =
    table.map.VALUE !== undefined
      ? table.map.VALUE
      : 1;
  var out = {};

  table.rows.forEach(
    function (row) {
      var key =
        String(row[keyIndex] || '');
      if (key) {
        out[key] =
          String(
            row[valueIndex] || ''
          );
      }
    }
  );
  return out;
}

function h3Incident20260925TxnContext_(
  spreadsheet
) {
  var incident =
    H3_INCIDENT_20260925_WRITTEN_;
  var sheet =
    spreadsheet.getSheetByName(
      'written_web_txn_v1'
    );
  var table =
    h3FsTable_(sheet);

  h3FsRequire_(
    table,
    [
      'TXN_ID',
      'SET_ID',
      'STAGE_ID',
      'MODE',
      'REQUEST_FINGERPRINT',
      'SOURCE_BINDING_SHA256',
      'STATUS',
      'RESULT_JSON',
      'SCORE',
      'PRESTATE_SHA256',
      'POSTSTATE_SHA256',
      'COMMITTED_AT',
      'ERROR'
    ],
    'written_web_txn_v1'
  );

  var rows =
    h3Incident20260925RowsBy_(
      table,
      'TXN_ID',
      incident.txn_id
    );
  h3Incident20260925Require_(
    rows.length === 1,
    'TXN_AUTHORITY_COUNT:' +
      rows.length
  );

  var row = rows[0].row;
  var map = table.map;
  h3Incident20260925Require_(
    String(row[map.SET_ID] || '') ===
      incident.set_id &&
    String(row[map.STAGE_ID] || '') ===
      incident.stage_id &&
    String(row[map.MODE] || '') ===
      'WRITTEN' &&
    String(row[map.STATUS] || '') ===
      'COMMITTED' &&
    String(
      row[map.REQUEST_FINGERPRINT] || ''
    ) ===
      incident.request_fingerprint &&
    String(
      row[
        map.SOURCE_BINDING_SHA256
      ] || ''
    ) ===
      incident.source_binding_sha256 &&
    Number(row[map.SCORE]) === 2 &&
    String(
      row[map.PRESTATE_SHA256] || ''
    ) === incident.prestate_sha256 &&
    String(
      row[map.POSTSTATE_SHA256] || ''
    ) === incident.poststate_sha256 &&
    String(
      row[map.COMMITTED_AT] || ''
    ) === incident.committed_at &&
    !String(row[map.ERROR] || ''),
    'TXN_IDENTITY_MISMATCH'
  );

  var result;
  try {
    result =
      JSON.parse(
        String(
          row[map.RESULT_JSON] || ''
        )
      );
  } catch (_err) {
    throw new Error(
      'H3_INCIDENT_20260925_RESULT_JSON_INVALID'
    );
  }

  h3Incident20260925Require_(
    result &&
    result.schema ===
      'H3_WEB_SUBMIT_RESULT_V1' &&
    result.mode === 'WRITTEN' &&
    result.surface_family === '5W' &&
    result.set_id ===
      incident.set_id &&
    result.txn_id ===
      incident.txn_id &&
    result.stage_id ===
      incident.stage_id &&
    result.status ===
      'COMMITTED' &&
    Number(result.score) === 2 &&
    Number(result.total) === 5 &&
    Array.isArray(result.summary) &&
    result.summary.length === 5,
    'RESULT_IDENTITY_MISMATCH'
  );

  var marks =
    result.summary.map(
      function (item) {
        return String(
          item.mark || ''
        );
      }
    );
  h3Incident20260925Require_(
    JSON.stringify(marks) ===
      JSON.stringify(
        incident.expected_marks
      ),
    'RESULT_MARKS_MISMATCH'
  );

  var committedAt =
    Date.parse(
      incident.committed_at
    );
  var later = [];
  table.rows.forEach(
    function (candidate) {
      if (
        String(
          candidate[map.STATUS] || ''
        ) !== 'COMMITTED'
      ) {
        return;
      }
      var candidateTxn =
        String(
          candidate[map.TXN_ID] || ''
        );
      var candidateTime =
        Date.parse(
          String(
            candidate[
              map.COMMITTED_AT
            ] || ''
          )
        );
      if (
        candidateTxn !==
          incident.txn_id &&
        Number.isFinite(candidateTime) &&
        candidateTime > committedAt
      ) {
        later.push(
          candidateTxn
        );
      }
    }
  );
  h3Incident20260925Require_(
    later.length === 0,
    'LATER_WRITTEN_COMMIT:' +
      later.join(',')
  );

  return {
    table: table,
    row: row,
    result: result
  };
}

function h3Incident20260925QueuePreflight_() {
  var incident =
    H3_INCIDENT_20260925_WRITTEN_;
  var spreadsheet =
    h3WrittenQueueSpreadsheet_();
  var sheet =
    spreadsheet.getSheetByName(
      'queue'
    );
  var table =
    h3FsTable_(sheet);

  h3FsRequire_(
    table,
    [
      'SET_ID',
      'STATUS',
      'ANSWERS_LOG'
    ],
    'queue'
  );

  var rows =
    h3Incident20260925RowsBy_(
      table,
      'SET_ID',
      incident.set_id
    );
  h3Incident20260925Require_(
    rows.length === 1,
    'QUEUE_AUTHORITY_COUNT:' +
      rows.length
  );

  var row = rows[0].row;
  var answers =
    String(
      row[
        table.map.ANSWERS_LOG
      ] || ''
    );

  h3Incident20260925Require_(
    String(
      row[table.map.STATUS] || ''
    ) === 'done' &&
    answers.indexOf(
      'TXN_ID=' +
      incident.txn_id
    ) >= 0 &&
    answers.indexOf(
      'SCORE=2/5'
    ) >= 0,
    'QUEUE_IDENTITY_MISMATCH'
  );
}

function h3Incident20260925StageContext_(
  spreadsheet
) {
  var incident =
    H3_INCIDENT_20260925_WRITTEN_;
  var sheet =
    spreadsheet.getSheetByName(
      'written_set_stage_v1'
    );
  var table =
    h3FsTable_(sheet);

  h3FsRequire_(
    table,
    [
      'STAGE_ID',
      'STATUS',
      'QUESTION_META_JSON',
      'POLICY_ID',
      'ACTUAL_SET_ID',
      'ISSUED_AT'
    ],
    'written_set_stage_v1'
  );

  var rows =
    h3Incident20260925RowsBy_(
      table,
      'STAGE_ID',
      incident.stage_id
    );
  h3Incident20260925Require_(
    rows.length === 1,
    'STAGE_AUTHORITY_COUNT:' +
      rows.length
  );

  var row = rows[0].row;
  h3Incident20260925Require_(
    String(
      row[
        table.map.ACTUAL_SET_ID
      ] || ''
    ) === incident.set_id &&
    String(
      row[table.map.ISSUED_AT] ||
      ''
    ) === incident.issued_at &&
    String(
      row[
        table.map.QUESTION_META_JSON
      ] || ''
    ) &&
    String(
      row[table.map.POLICY_ID] ||
      ''
    ),
    'STAGE_IDENTITY_MISMATCH'
  );

  return {
    sheet: sheet,
    table: table,
    row: row,
    rowNumber:
      rows[0].rowNumber,
    prepared: {
      row: row,
      rowNumber:
        rows[0].rowNumber,
      map: table.map,
      sheet: sheet,
      stage_id:
        incident.stage_id
    }
  };
}

function h3Incident20260925GenerationRows_(
  spreadsheet
) {
  var incident =
    H3_INCIDENT_20260925_WRITTEN_;
  var table =
    h3FsTable_(
      spreadsheet.getSheetByName(
        'generation_log_v1'
      )
    );
  h3FsRequire_(
    table,
    [
      'GEN_ID',
      'SET_ID',
      'Q_NO',
      'STATUS',
      'USER_RESULT'
    ],
    'generation_log_v1'
  );

  var rows =
    h3Incident20260925RowsBy_(
      table,
      'SET_ID',
      incident.set_id
    );

  h3Incident20260925Require_(
    rows.length === 0 ||
    rows.length === 5,
    'GENLOG_COUNT:' +
      rows.length
  );

  if (rows.length === 5) {
    rows.sort(
      function (a, b) {
        return (
          Number(
            a.row[
              table.map.Q_NO
            ] || 0
          ) -
          Number(
            b.row[
              table.map.Q_NO
            ] || 0
          )
        );
      }
    );

    rows.forEach(
      function (record, index) {
        var qNo = index + 1;
        var expectedId =
          'GEN-' +
          incident.set_id +
          '-Q' +
          String(qNo);
        var status =
          String(
            record.row[
              table.map.STATUS
            ] || ''
          );

        h3Incident20260925Require_(
          String(
            record.row[
              table.map.GEN_ID
            ] || ''
          ) === expectedId &&
          Number(
            record.row[
              table.map.Q_NO
            ] || 0
          ) === qNo &&
          [
            'ISSUED',
            'ANSWERED'
          ].indexOf(status) >= 0,
          'GENLOG_IDENTITY:' +
            qNo
        );
      }
    );
  }

  return {
    table: table,
    rows: rows
  };
}

function h3Incident20260925SyncRows_(
  spreadsheet
) {
  var incident =
    H3_INCIDENT_20260925_WRITTEN_;
  var table =
    h3FsTable_(
      spreadsheet.getSheetByName(
        'written_answer_sync_v1'
      )
    );
  h3FsRequire_(
    table,
    [
      'TXN_ID',
      'SET_ID',
      'STAGE_ID',
      'STATUS',
      'PHASE',
      'COMPLETED_AT',
      'ERROR'
    ],
    'written_answer_sync_v1'
  );
  var rows =
    h3Incident20260925RowsBy_(
      table,
      'TXN_ID',
      incident.txn_id
    );
  h3Incident20260925Require_(
    rows.length <= 1,
    'SYNC_AUTHORITY_COUNT:' +
      rows.length
  );
  if (rows.length) {
    h3Incident20260925Require_(
      String(
        rows[0].row[
          table.map.SET_ID
        ] || ''
      ) === incident.set_id &&
      String(
        rows[0].row[
          table.map.STAGE_ID
        ] || ''
      ) === incident.stage_id,
      'SYNC_IDENTITY_MISMATCH'
    );
  }
  return {
    table: table,
    rows: rows
  };
}

function h3Incident20260925ReviewCount_(
  spreadsheet,
  sheetName,
  column,
  value
) {
  var table =
    h3FsTable_(
      spreadsheet.getSheetByName(
        sheetName
      )
    );
  var rows =
    h3Incident20260925RowsBy_(
      table,
      column,
      value
    );
  h3Incident20260925Require_(
    rows.length <= 1,
    'DUPLICATE:' +
      sheetName +
      ':' +
      rows.length
  );
  return rows;
}

function h3Incident20260925Preflight_() {
  var incident =
    H3_INCIDENT_20260925_WRITTEN_;
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  var txn =
    h3Incident20260925TxnContext_(
      spreadsheet
    );
  h3Incident20260925QueuePreflight_();
  var stage =
    h3Incident20260925StageContext_(
      spreadsheet
    );
  var generation =
    h3Incident20260925GenerationRows_(
      spreadsheet
    );
  var sync =
    h3Incident20260925SyncRows_(
      spreadsheet
    );

  h3Incident20260925ReviewCount_(
    spreadsheet,
    'written_review_payload_v1',
    'TXN_ID',
    incident.txn_id
  );
  h3Incident20260925ReviewCount_(
    spreadsheet,
    'written_review_binding_v1',
    'TXN_ID',
    incident.txn_id
  );
  h3Incident20260925ReviewCount_(
    spreadsheet,
    'review_home_index_v1',
    'SET_ID',
    incident.set_id
  );

  var state =
    h3Incident20260925Kv_(
      spreadsheet,
      'generation_state_v1'
    );

  h3Incident20260925Require_(
    [
      incident.prior_written_set_id,
      incident.set_id
    ].indexOf(
      String(
        state.WRITTEN_LAST_HISTORY_SET ||
        ''
      )
    ) >= 0 &&
    [
      incident.prior_written_set_id,
      incident.set_id
    ].indexOf(
      String(
        state.WRITTEN_LAST_SYNCED_SET ||
        ''
      )
    ) >= 0,
    'GENERATION_STATE_HISTORY_DRIFT'
  );

  return {
    spreadsheet: spreadsheet,
    txn: txn,
    stage: stage,
    generation: generation,
    sync: sync,
    generation_state: state
  };
}

function h3Incident20260925VerifyFinal_(
  schedulerResult
) {
  var incident =
    H3_INCIDENT_20260925_WRITTEN_;
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  var generation =
    h3Incident20260925GenerationRows_(
      spreadsheet
    );
  h3Incident20260925Require_(
    generation.rows.length === 5,
    'FINAL_GENLOG_COUNT'
  );

  generation.rows.forEach(
    function (record, index) {
      h3Incident20260925Require_(
        String(
          record.row[
            generation.table.map.STATUS
          ] || ''
        ) === 'ANSWERED' &&
        String(
          record.row[
            generation.table.map.USER_RESULT
          ] || ''
        ) ===
          incident.expected_marks[index],
        'FINAL_GENLOG_RESULT:' +
          String(index + 1)
      );
    }
  );

  var sync =
    h3Incident20260925SyncRows_(
      spreadsheet
    );
  h3Incident20260925Require_(
    sync.rows.length === 1 &&
    String(
      sync.rows[0].row[
        sync.table.map.STATUS
      ] || ''
    ) === 'COMMITTED' &&
    String(
      sync.rows[0].row[
        sync.table.map.PHASE
      ] || ''
    ) === 'CORE_COMPLETE' &&
    String(
      sync.rows[0].row[
        sync.table.map.COMPLETED_AT
      ] || ''
    ) &&
    !String(
      sync.rows[0].row[
        sync.table.map.ERROR
      ] || ''
    ),
    'FINAL_SYNC_NOT_COMPLETE'
  );

  var payloadRows =
    h3Incident20260925ReviewCount_(
      spreadsheet,
      'written_review_payload_v1',
      'TXN_ID',
      incident.txn_id
    );
  var bindingRows =
    h3Incident20260925ReviewCount_(
      spreadsheet,
      'written_review_binding_v1',
      'TXN_ID',
      incident.txn_id
    );
  var homeRows =
    h3Incident20260925ReviewCount_(
      spreadsheet,
      'review_home_index_v1',
      'SET_ID',
      incident.set_id
    );

  h3Incident20260925Require_(
    payloadRows.length === 1 &&
    bindingRows.length === 1 &&
    homeRows.length === 1,
    'FINAL_REVIEW_AUTHORITY_COUNT'
  );

  var payloadTable =
    h3FsTable_(
      spreadsheet.getSheetByName(
        'written_review_payload_v1'
      )
    );
  var bindingTable =
    h3FsTable_(
      spreadsheet.getSheetByName(
        'written_review_binding_v1'
      )
    );
  var homeTable =
    h3FsTable_(
      spreadsheet.getSheetByName(
        'review_home_index_v1'
      )
    );

  h3Incident20260925Require_(
    String(
      payloadRows[0].row[
        payloadTable.map.STATUS
      ] || ''
    ) === 'LOCKED' &&
    String(
      bindingRows[0].row[
        bindingTable.map.STATUS
      ] || ''
    ) === 'LOCKED' &&
    String(
      homeRows[0].row[
        homeTable.map.STATUS
      ] || ''
    ) === 'ACTIVE' &&
    String(
      homeRows[0].row[
        homeTable.map.SURFACE_FAMILY
      ] || ''
    ) === '5W',
    'FINAL_REVIEW_STATUS'
  );

  var state =
    h3Incident20260925Kv_(
      spreadsheet,
      'generation_state_v1'
    );
  h3Incident20260925Require_(
    state.WRITTEN_LAST_HISTORY_SET ===
      incident.set_id &&
    state.WRITTEN_LAST_SYNCED_SET ===
      incident.set_id &&
    state.ANSWER_SYNC_SET_ID ===
      incident.set_id &&
    state.ANSWER_SYNC_PHASE ===
      'COMPLETE' &&
    state.ANSWER_SYNC_STATUS ===
      incident.set_id +
      '_CORE_COMPLETE',
    'FINAL_GENERATION_STATE'
  );

  var history =
    h3FsHistory_(
      spreadsheet,
      '3級'
    );
  var commit =
    h3FsHistoryRecord_(
      history,
      'W',
      incident.set_id
    );
  var fsState =
    h3FsState_(
      spreadsheet,
      '3級'
    );
  var observed =
    h3FsCommitObservedByKey_(
      spreadsheet,
      '3級',
      commit.commit_key
    );

  h3Incident20260925Require_(
    Number(
      fsState.GLOBAL.GLOBAL_SET_CLOCK ||
      0
    ) ===
      Number(commit.global_clock) &&
    String(
      fsState.W.LAST_COMMITTED_SET_ID ||
      ''
    ) === incident.set_id &&
    !!observed,
    'FINAL_FAMILY_SCHEDULER_STATE'
  );

  return {
    history_global_clock:
      commit.global_clock,
    family_clock:
      commit.family_clock,
    scheduler_status:
      String(
        schedulerResult &&
        schedulerResult.status ||
        ''
      ),
    scheduler_error:
      String(
        schedulerResult &&
        schedulerResult.error ||
        ''
      ),
    next_stage_id:
      String(
        state.WRITTEN_NEXT_STAGE_ID ||
        ''
      )
  };
}

function h3RecoverWrittenIncident20260925() {
  var incident =
    H3_INCIDENT_20260925_WRITTEN_;
  var preflight =
    h3Incident20260925Preflight_();
  var inserted = false;

  if (
    preflight.generation.rows.length ===
    0
  ) {
    h3FsWrittenGenerationInsert_(
      preflight.spreadsheet,
      preflight.stage.prepared,
      incident.set_id,
      incident.issued_at
    );
    inserted = true;
  }

  var afterInsert =
    h3Incident20260925GenerationRows_(
      preflight.spreadsheet
    );
  h3Incident20260925Require_(
    afterInsert.rows.length === 5,
    'POST_INSERT_COUNT'
  );

  var answerSync =
    h3WrittenAnswerSync_(
      incident.txn_id
    );

  h3WrittenProductionReviewEnsure_(
    incident.txn_id
  );

  var review =
    getWrittenProductionPersistentReviewPayload_(
      incident.set_id
    );
  var txnContext =
    h3WrittenProductionReviewTxnContext_(
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      ),
      incident.txn_id
    );

  var homeIndex =
    h3ReviewHomeIndexUpsertAfterCommit_(
      txnContext.result,
      review
    );

  var scheduler =
    h3FamilySchedulerObserveAfterCommit_(
      'W',
      incident.set_id,
      'LEGACY_TRIGGER'
    );

  var known5LBlocker =
    scheduler &&
    scheduler.status ===
      'RECOVERY_REQUIRED' &&
    String(
      scheduler.error || ''
    ).indexOf(
      'FAMILY_SCHEDULER_LISTENING_RESUME_PAYLOAD_AMBIGUOUS'
    ) >= 0;

  h3Incident20260925Require_(
    !scheduler ||
    scheduler.status !==
      'RECOVERY_REQUIRED' ||
    known5LBlocker,
    'UNEXPECTED_SCHEDULER_RECOVERY:' +
      String(
        scheduler &&
        scheduler.error ||
        ''
      )
  );

  var finalState =
    h3Incident20260925VerifyFinal_(
      scheduler
    );

  return {
    schema:
      incident.schema,
    status:
      known5LBlocker
        ? 'PASS_WITH_KNOWN_5L_BLOCKER'
        : 'PASS',
    set_id:
      incident.set_id,
    txn_id:
      incident.txn_id,
    generation_inserted:
      inserted,
    answer_sync_status:
      answerSync &&
      answerSync.status
        ? String(answerSync.status)
        : 'PASS',
    review_status:
      'LOCKED',
    home_index_status:
      homeIndex &&
      homeIndex.status
        ? String(homeIndex.status)
        : 'UPSERTED',
    scheduler_status:
      finalState.scheduler_status,
    scheduler_error:
      finalState.scheduler_error,
    known_5l_blocker:
      known5LBlocker,
    history_global_clock:
      finalState.history_global_clock,
    family_clock:
      finalState.family_clock,
    next_stage_id:
      finalState.next_stage_id,
    recovery_complete:
      true
  };
}
