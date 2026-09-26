/* =========================================================
 * H3 ERROR STATE
 * Phase 1 contract: authoritative primary-log state foundation
 * Primary source: web_runtime_error_log_v1
 * Incident reconciliation is intentionally out of scope here.
 * =======================================================*/

var H3_ERROR_STATE_SCHEMA_ =
  'H3_ERROR_STATE_V1';
var H3_ERROR_STATE_SHEET_ =
  'error_state_v1';
var H3_ERROR_STATE_PRIMARY_SOURCE_ =
  'web_runtime_error_log_v1';
var H3_ERROR_STATE_HEADERS_ = [
  'SCHEMA',
  'STATUS',
  'UNRESOLVED_COUNT',
  'LATEST_ERROR_ID',
  'LATEST_ERROR_AT',
  'LATEST_ERROR_CODE',
  'LATEST_UNRESOLVED_ID',
  'LAST_LOG_ROW',
  'LAST_RECONCILED_AT',
  'SOURCE_STATUS'
];

function h3ErrorStateSourceStatus_(value) {
  return String(value || '')
    .trim()
    .toUpperCase() === 'OK'
    ? 'OK'
    : 'UNKNOWN';
}

function h3ErrorStateCount_(value) {
  var count = Number(value);
  if (
    !Number.isInteger(count) ||
    count < 0
  ) {
    return null;
  }
  return count;
}

function h3ErrorStateClassify_(
  sourceStatus,
  unresolvedCount
) {
  if (
    h3ErrorStateSourceStatus_(
      sourceStatus
    ) !== 'OK'
  ) {
    return 'UNKNOWN';
  }

  var count =
    h3ErrorStateCount_(
      unresolvedCount
    );
  if (count === null) {
    return 'UNKNOWN';
  }

  return count > 0
    ? 'PRESENT'
    : 'NONE';
}

function h3ErrorStateEnsureSheet_(
  spreadsheet
) {
  if (!spreadsheet) {
    throw new Error(
      'ERROR_STATE_SPREADSHEET_REQUIRED'
    );
  }

  var sheet =
    spreadsheet.getSheetByName(
      H3_ERROR_STATE_SHEET_
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        H3_ERROR_STATE_SHEET_
      );
    sheet
      .getRange(
        1,
        1,
        1,
        H3_ERROR_STATE_HEADERS_.length
      )
      .setValues([
        H3_ERROR_STATE_HEADERS_
      ]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  var actual =
    sheet
      .getRange(
        1,
        1,
        1,
        H3_ERROR_STATE_HEADERS_.length
      )
      .getDisplayValues()[0];

  if (
    JSON.stringify(actual) !==
    JSON.stringify(
      H3_ERROR_STATE_HEADERS_
    )
  ) {
    throw new Error(
      'ERROR_STATE_HEADER_MISMATCH'
    );
  }

  if (sheet.getLastRow() > 2) {
    throw new Error(
      'ERROR_STATE_ROW_COUNT_INVALID'
    );
  }

  return sheet;
}

function h3ErrorStateBuild_(
  spec
) {
  var source =
    spec &&
    typeof spec === 'object'
      ? spec
      : {};

  var sourceStatus =
    h3ErrorStateSourceStatus_(
      source.source_status
    );
  var count =
    h3ErrorStateCount_(
      source.unresolved_count
    );
  var status =
    h3ErrorStateClassify_(
      sourceStatus,
      count
    );

  var latestErrorId =
    String(
      source.latest_error_id || ''
    ).trim();
  var latestErrorAt =
    String(
      source.latest_error_at || ''
    ).trim();
  var latestErrorCode =
    String(
      source.latest_error_code || ''
    ).trim();
  var latestUnresolvedId =
    String(
      source.latest_unresolved_id || ''
    ).trim();
  var lastLogRow =
    h3ErrorStateCount_(
      source.last_log_row
    );
  var lastReconciledAt =
    String(
      source.last_reconciled_at || ''
    ).trim();

  if (
    status === 'PRESENT' &&
    !latestUnresolvedId
  ) {
    throw new Error(
      'ERROR_STATE_PRESENT_REQUIRES_UNRESOLVED_ID'
    );
  }

  if (
    status === 'NONE' &&
    count !== 0
  ) {
    throw new Error(
      'ERROR_STATE_NONE_REQUIRES_ZERO'
    );
  }

  return {
    schema:
      H3_ERROR_STATE_SCHEMA_,
    status:
      status,
    unresolved_count:
      count === null
        ? null
        : count,
    latest_error_id:
      latestErrorId || null,
    latest_error_at:
      latestErrorAt || null,
    latest_error_code:
      latestErrorCode || null,
    latest_unresolved_id:
      latestUnresolvedId || null,
    last_log_row:
      lastLogRow,
    last_reconciled_at:
      lastReconciledAt || null,
    source_status:
      sourceStatus
  };
}

function h3ErrorStateRow_(
  state
) {
  return [
    state.schema,
    state.status,
    state.unresolved_count === null
      ? ''
      : state.unresolved_count,
    state.latest_error_id || '',
    state.latest_error_at || '',
    state.latest_error_code || '',
    state.latest_unresolved_id || '',
    state.last_log_row === null
      ? ''
      : state.last_log_row,
    state.last_reconciled_at || '',
    state.source_status
  ];
}

function h3ErrorStateWrite_(
  spec
) {
  var state =
    h3ErrorStateBuild_(
      spec
    );
  var lock =
    LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error(
      'ERROR_STATE_LOCK_BUSY'
    );
  }

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var sheet =
      h3ErrorStateEnsureSheet_(
        spreadsheet
      );

    sheet
      .getRange(
        2,
        1,
        1,
        H3_ERROR_STATE_HEADERS_.length
      )
      .setValues([
        h3ErrorStateRow_(state)
      ]);

    return state;
  } finally {
    try {
      lock.releaseLock();
    } catch (_releaseError) {}
  }
}

function h3ErrorStateReadCurrent() {
  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var sheet =
      h3ErrorStateEnsureSheet_(
        spreadsheet
      );

    if (sheet.getLastRow() < 2) {
      return h3ErrorStateBuild_({
        source_status: 'UNKNOWN',
        unresolved_count: null,
        last_log_row: null,
        last_reconciled_at: null
      });
    }

    var row =
      sheet
        .getRange(
          2,
          1,
          1,
          H3_ERROR_STATE_HEADERS_.length
        )
        .getDisplayValues()[0];

    var parsed = {
      source_status:
        row[9],
      unresolved_count:
        row[2] === ''
          ? null
          : Number(row[2]),
      latest_error_id:
        row[3],
      latest_error_at:
        row[4],
      latest_error_code:
        row[5],
      latest_unresolved_id:
        row[6],
      last_log_row:
        row[7] === ''
          ? null
          : Number(row[7]),
      last_reconciled_at:
        row[8]
    };
    var state =
      h3ErrorStateBuild_(
        parsed
      );

    if (
      row[0] !== H3_ERROR_STATE_SCHEMA_ ||
      row[1] !== state.status
    ) {
      throw new Error(
        'ERROR_STATE_ROW_INVALID'
      );
    }

    return state;
  } catch (error) {
    return {
      schema:
        H3_ERROR_STATE_SCHEMA_,
      status:
        'UNKNOWN',
      unresolved_count:
        null,
      latest_error_id:
        null,
      latest_error_at:
        null,
      latest_error_code:
        null,
      latest_unresolved_id:
        null,
      last_log_row:
        null,
      last_reconciled_at:
        null,
      source_status:
        'UNKNOWN',
      read_error:
        String(
          error &&
          error.message
            ? error.message
            : error
        )
    };
  }
}


function h3ErrorStatePhase1SelfTest_() {
  var cases = [
    {
      name: 'EMPTY_PRIMARY_LOG',
      actual:
        h3ErrorStateClassify_(
          'OK',
          0
        ),
      expected: 'NONE'
    },
    {
      name: 'UNRESOLVED_PRESENT',
      actual:
        h3ErrorStateClassify_(
          'OK',
          1
        ),
      expected: 'PRESENT'
    },
    {
      name: 'PRIMARY_SOURCE_UNKNOWN',
      actual:
        h3ErrorStateClassify_(
          'UNKNOWN',
          0
        ),
      expected: 'UNKNOWN'
    },
    {
      name: 'PRIMARY_SOURCE_READ_ERROR',
      actual:
        h3ErrorStateClassify_(
          'READ_ERROR',
          0
        ),
      expected: 'UNKNOWN'
    },
    {
      name: 'INVALID_COUNT',
      actual:
        h3ErrorStateClassify_(
          'OK',
          -1
        ),
      expected: 'UNKNOWN'
    }
  ];

  cases.forEach(
    function (testCase) {
      if (
        testCase.actual !==
        testCase.expected
      ) {
        throw new Error(
          'ERROR_STATE_PHASE1_SELF_TEST_FAIL:' +
          testCase.name +
          ':' +
          testCase.actual
        );
      }
    }
  );

  var present =
    h3ErrorStateBuild_({
      source_status: 'OK',
      unresolved_count: 1,
      latest_unresolved_id:
        'H3ERR-SELFTEST',
      last_log_row: 2
    });

  if (
    present.status !== 'PRESENT'
  ) {
    throw new Error(
      'ERROR_STATE_PHASE1_BUILD_FAIL'
    );
  }

  var rejected = false;
  try {
    h3ErrorStateBuild_({
      source_status: 'OK',
      unresolved_count: 1,
      last_log_row: 2
    });
  } catch (error) {
    rejected =
      String(
        error &&
        error.message
          ? error.message
          : error
      ).indexOf(
        'ERROR_STATE_PRESENT_REQUIRES_UNRESOLVED_ID'
      ) >= 0;
  }

  if (!rejected) {
    throw new Error(
      'ERROR_STATE_PHASE1_MISSING_ID_NOT_REJECTED'
    );
  }

  return {
    schema:
      'H3_ERROR_STATE_PHASE1_SELF_TEST_V1',
    status:
      'PASS',
    primary_source:
      H3_ERROR_STATE_PRIMARY_SOURCE_,
    fail_closed:
      true,
    cases:
      cases.length,
    write_performed:
      false
  };
}
