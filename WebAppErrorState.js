/* =========================================================
 * H3 ERROR STATE
 * Phase 1: authoritative primary-log state foundation
 * Phase 2: incident lifecycle reconciliation
 * Primary source: web_runtime_error_log_v1
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
  var input =
    spec &&
    spec.schema ===
      H3_ERROR_STATE_SCHEMA_
      ? {
          source_status:
            spec.source_status,
          unresolved_count:
            spec.unresolved_count,
          latest_error_id:
            spec.latest_error_id,
          latest_error_at:
            spec.latest_error_at,
          latest_error_code:
            spec.latest_error_code,
          latest_unresolved_id:
            spec.latest_unresolved_id,
          last_log_row:
            spec.last_log_row,
          last_reconciled_at:
            spec.last_reconciled_at
        }
      : spec;
  var state =
    h3ErrorStateBuild_(
      input
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


var H3_ERROR_INCIDENT_SCHEMA_ =
  'H3_ERROR_INCIDENT_LIFECYCLE_V1';
var H3_ERROR_INCIDENT_SHEET_ =
  'error_incident_lifecycle_v1';
var H3_ERROR_INCIDENT_HEADERS_ = [
  'SCHEMA',
  'INCIDENT_ID',
  'EVENT_AT',
  'STATUS',
  'ERROR_ID',
  'FINGERPRINT_SHA256',
  'MATCH_THROUGH_AT',
  'EVIDENCE_REF'
];
var H3_ERROR_INCIDENT_STATUSES_ = [
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
  'SUPERSEDED'
];

function h3ErrorStateNowTokyo_() {
  return (
    Utilities.formatDate(
      new Date(),
      'Asia/Tokyo',
      "yyyy-MM-dd'T'HH:mm:ss"
    ) +
    '+09:00'
  );
}

function h3ErrorStateTimeMs_(value) {
  var text =
    String(value || '').trim();
  if (!text) {
    return null;
  }
  var ms =
    new Date(text).getTime();
  return Number.isFinite(ms)
    ? ms
    : null;
}

function h3ErrorIncidentStatus_(value) {
  var status =
    String(value || '')
      .trim()
      .toUpperCase();
  return (
    H3_ERROR_INCIDENT_STATUSES_
      .indexOf(status) >= 0
  )
    ? status
    : null;
}

function h3ErrorIncidentEnsureSheet_(
  spreadsheet
) {
  if (!spreadsheet) {
    throw new Error(
      'ERROR_INCIDENT_SPREADSHEET_REQUIRED'
    );
  }

  var sheet =
    spreadsheet.getSheetByName(
      H3_ERROR_INCIDENT_SHEET_
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        H3_ERROR_INCIDENT_SHEET_
      );
    sheet
      .getRange(
        1,
        1,
        1,
        H3_ERROR_INCIDENT_HEADERS_.length
      )
      .setValues([
        H3_ERROR_INCIDENT_HEADERS_
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
        H3_ERROR_INCIDENT_HEADERS_.length
      )
      .getDisplayValues()[0];

  if (
    JSON.stringify(actual) !==
    JSON.stringify(
      H3_ERROR_INCIDENT_HEADERS_
    )
  ) {
    throw new Error(
      'ERROR_INCIDENT_HEADER_MISMATCH'
    );
  }

  return sheet;
}

function h3ErrorStateHeaderIndex_(
  headers,
  required
) {
  var index = {};
  required.forEach(
    function (name) {
      var position =
        headers.indexOf(name);
      if (position < 0) {
        throw new Error(
          'ERROR_STATE_SOURCE_HEADER_MISSING:' +
          name
        );
      }
      index[name] =
        position;
    }
  );
  return index;
}

function h3ErrorStateReadRawErrors_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_ERROR_STATE_PRIMARY_SOURCE_
    );

  if (!sheet) {
    throw new Error(
      'ERROR_STATE_PRIMARY_SOURCE_MISSING'
    );
  }

  var lastRow =
    sheet.getLastRow();
  var lastColumn =
    sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    throw new Error(
      'ERROR_STATE_PRIMARY_SOURCE_EMPTY'
    );
  }

  var values =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getDisplayValues();
  var headers =
    values[0];
  var index =
    h3ErrorStateHeaderIndex_(
      headers,
      [
        'ERROR_ID',
        'AT',
        'ERROR_CODE',
        'FINGERPRINT_SHA256'
      ]
    );
  var errors = [];

  values
    .slice(1)
    .forEach(
      function (row, offset) {
        var errorId =
          String(
            row[index.ERROR_ID] || ''
          ).trim();
        if (!errorId) {
          return;
        }

        var at =
          String(
            row[index.AT] || ''
          ).trim();
        var atMs =
          h3ErrorStateTimeMs_(at);
        var fingerprint =
          String(
            row[
              index.FINGERPRINT_SHA256
            ] || ''
          )
            .trim()
            .toLowerCase();

        if (
          atMs === null ||
          !/^[0-9a-f]{64}$/.test(
            fingerprint
          )
        ) {
          throw new Error(
            'ERROR_STATE_PRIMARY_ROW_INVALID:' +
            String(offset + 2)
          );
        }

        errors.push({
          row_number:
            offset + 2,
          error_id:
            errorId,
          at:
            at,
          at_ms:
            atMs,
          error_code:
            String(
              row[index.ERROR_CODE] || ''
            ).trim(),
          fingerprint_sha256:
            fingerprint
        });
      }
    );

  return {
    errors:
      errors,
    last_log_row:
      lastRow
  };
}

function h3ErrorStateReadIncidentLifecycle_(
  spreadsheet
) {
  var sheet =
    h3ErrorIncidentEnsureSheet_(
      spreadsheet
    );
  var lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  var values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        H3_ERROR_INCIDENT_HEADERS_.length
      )
      .getDisplayValues();
  var latest = {};

  values.forEach(
    function (row, offset) {
      var incidentId =
        String(row[1] || '').trim();
      if (!incidentId) {
        return;
      }

      var schema =
        String(row[0] || '').trim();
      var eventAt =
        String(row[2] || '').trim();
      var eventAtMs =
        h3ErrorStateTimeMs_(
          eventAt
        );
      var status =
        h3ErrorIncidentStatus_(
          row[3]
        );
      var errorId =
        String(row[4] || '').trim();
      var fingerprint =
        String(row[5] || '')
          .trim()
          .toLowerCase();
      var matchThroughAt =
        String(row[6] || '').trim();
      var matchThroughMs =
        matchThroughAt
          ? h3ErrorStateTimeMs_(
              matchThroughAt
            )
          : null;

      if (
        schema !==
          H3_ERROR_INCIDENT_SCHEMA_ ||
        eventAtMs === null ||
        !status ||
        (
          !errorId &&
          !/^[0-9a-f]{64}$/.test(
            fingerprint
          )
        )
      ) {
        throw new Error(
          'ERROR_INCIDENT_ROW_INVALID:' +
          String(offset + 2)
        );
      }

      if (
        fingerprint &&
        !/^[0-9a-f]{64}$/.test(
          fingerprint
        )
      ) {
        throw new Error(
          'ERROR_INCIDENT_FINGERPRINT_INVALID:' +
          String(offset + 2)
        );
      }

      if (
        (
          status === 'RESOLVED' ||
          status === 'SUPERSEDED'
        ) &&
        fingerprint &&
        matchThroughMs === null
      ) {
        throw new Error(
          'ERROR_INCIDENT_TERMINAL_CUTOFF_REQUIRED:' +
          String(offset + 2)
        );
      }

      var candidate = {
        row_number:
          offset + 2,
        incident_id:
          incidentId,
        event_at:
          eventAt,
        event_at_ms:
          eventAtMs,
        status:
          status,
        error_id:
          errorId || null,
        fingerprint_sha256:
          fingerprint || null,
        match_through_at:
          matchThroughAt || null,
        match_through_ms:
          matchThroughMs,
        evidence_ref:
          String(row[7] || '').trim() ||
          null
      };

      var previous =
        latest[incidentId];

      if (
        !previous ||
        candidate.event_at_ms >
          previous.event_at_ms ||
        (
          candidate.event_at_ms ===
            previous.event_at_ms &&
          candidate.row_number >
            previous.row_number
        )
      ) {
        latest[incidentId] =
          candidate;
      }
    }
  );

  return Object.keys(latest)
    .map(function (key) {
      return latest[key];
    });
}

function h3ErrorStateErrorResolved_(
  errorEvent,
  lifecycleStates
) {
  var exact =
    lifecycleStates
      .filter(
        function (incident) {
          return (
            incident.error_id &&
            incident.error_id ===
              errorEvent.error_id
          );
        }
      )
      .sort(
        function (a, b) {
          return (
            b.event_at_ms -
              a.event_at_ms ||
            b.row_number -
              a.row_number
          );
        }
      )[0];

  if (exact) {
    return (
      exact.status === 'RESOLVED' ||
      exact.status === 'SUPERSEDED'
    );
  }

  return lifecycleStates.some(
    function (incident) {
      if (
        incident.status !== 'RESOLVED' &&
        incident.status !== 'SUPERSEDED'
      ) {
        return false;
      }
      if (
        !incident.fingerprint_sha256 ||
        incident.fingerprint_sha256 !==
          errorEvent.fingerprint_sha256
      ) {
        return false;
      }
      return (
        incident.match_through_ms !== null &&
        errorEvent.at_ms <=
          incident.match_through_ms
      );
    }
  );
}

function h3ErrorStateLatestEvent_(
  events
) {
  if (!events.length) {
    return null;
  }
  return events
    .slice()
    .sort(
      function (a, b) {
        return (
          b.at_ms -
            a.at_ms ||
          b.row_number -
            a.row_number
        );
      }
    )[0];
}

function h3ErrorStateReconcileData_(
  raw,
  lifecycleStates,
  reconciledAt
) {
  var errors =
    raw &&
    Array.isArray(raw.errors)
      ? raw.errors
      : [];
  var incidents =
    Array.isArray(lifecycleStates)
      ? lifecycleStates
      : [];

  var unresolved =
    errors.filter(
      function (errorEvent) {
        return !h3ErrorStateErrorResolved_(
          errorEvent,
          incidents
        );
      }
    );

  var unresolvedGroups = {};
  unresolved.forEach(
    function (errorEvent) {
      var key =
        errorEvent.fingerprint_sha256 ||
        errorEvent.error_id;
      unresolvedGroups[key] =
        true;
    }
  );

  var latestError =
    h3ErrorStateLatestEvent_(
      errors
    );
  var latestUnresolved =
    h3ErrorStateLatestEvent_(
      unresolved
    );

  return h3ErrorStateBuild_({
    source_status:
      'OK',
    unresolved_count:
      Object.keys(
        unresolvedGroups
      ).length,
    latest_error_id:
      latestError
        ? latestError.error_id
        : null,
    latest_error_at:
      latestError
        ? latestError.at
        : null,
    latest_error_code:
      latestError
        ? latestError.error_code
        : null,
    latest_unresolved_id:
      latestUnresolved
        ? latestUnresolved.error_id
        : null,
    last_log_row:
      raw
        ? raw.last_log_row
        : null,
    last_reconciled_at:
      reconciledAt
  });
}

function h3ErrorStateReconcile() {
  var reconciledAt =
    h3ErrorStateNowTokyo_();

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var raw =
      h3ErrorStateReadRawErrors_(
        spreadsheet
      );
    var lifecycle =
      h3ErrorStateReadIncidentLifecycle_(
        spreadsheet
      );
    var state =
      h3ErrorStateReconcileData_(
        raw,
        lifecycle,
        reconciledAt
      );

    return h3ErrorStateWrite_(
      state
    );
  } catch (error) {
    var unknown = {
      source_status:
        'UNKNOWN',
      unresolved_count:
        null,
      last_log_row:
        null,
      last_reconciled_at:
        reconciledAt
    };

    try {
      var written =
        h3ErrorStateWrite_(
          unknown
        );
      written.reconcile_error =
        String(
          error &&
          error.message
            ? error.message
            : error
        );
      return written;
    } catch (_writeError) {
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
          reconciledAt,
        source_status:
          'UNKNOWN',
        reconcile_error:
          String(
            error &&
            error.message
              ? error.message
              : error
          ),
        write_error:
          String(
            _writeError &&
            _writeError.message
              ? _writeError.message
              : _writeError
          )
      };
    }
  }
}

function h3ErrorStatePhase2SelfTest_() {
  function event(
    id,
    at,
    fingerprint,
    code,
    row
  ) {
    return {
      row_number:
        row,
      error_id:
        id,
      at:
        at,
      at_ms:
        h3ErrorStateTimeMs_(at),
      error_code:
        code,
      fingerprint_sha256:
        fingerprint
    };
  }

  var fingerprintA =
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  var fingerprintB =
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  var resolvedIncident = {
    row_number: 2,
    incident_id:
      'H3ERR-RESOLVED',
    event_at:
      '2026-09-26T13:38:00+09:00',
    event_at_ms:
      h3ErrorStateTimeMs_(
        '2026-09-26T13:38:00+09:00'
      ),
    status:
      'RESOLVED',
    error_id:
      'H3ERR-OLD-LAST',
    fingerprint_sha256:
      fingerprintA,
    match_through_at:
      '2026-09-26T00:20:01+09:00',
    match_through_ms:
      h3ErrorStateTimeMs_(
        '2026-09-26T00:20:01+09:00'
      ),
    evidence_ref:
      'incidents/H3ERR-OLD-LAST.json'
  };

  var oldErrors = [
    event(
      'H3ERR-OLD-1',
      '2026-09-26T00:11:54+09:00',
      fingerprintA,
      'CLIENT_RUNTIME_ERROR',
      2
    ),
    event(
      'H3ERR-OLD-LAST',
      '2026-09-26T00:20:01+09:00',
      fingerprintA,
      'CLIENT_RUNTIME_ERROR',
      7
    )
  ];

  var currentError =
    event(
      'H3ERR-NEW',
      '2026-09-26T08:54:45+09:00',
      fingerprintB,
      'REVIEW_AUDIO_BINDING_COUNT',
      8
    );

  var mixed =
    h3ErrorStateReconcileData_(
      {
        errors:
          oldErrors.concat([
            currentError
          ]),
        last_log_row:
          8
      },
      [
        resolvedIncident
      ],
      '2026-09-26T14:00:00+09:00'
    );

  if (
    mixed.status !== 'PRESENT' ||
    mixed.unresolved_count !== 1 ||
    mixed.latest_unresolved_id !==
      'H3ERR-NEW'
  ) {
    throw new Error(
      'ERROR_STATE_PHASE2_MIXED_FAIL'
    );
  }

  var resolvedOnly =
    h3ErrorStateReconcileData_(
      {
        errors:
          oldErrors,
        last_log_row:
          7
      },
      [
        resolvedIncident
      ],
      '2026-09-26T14:00:00+09:00'
    );

  if (
    resolvedOnly.status !== 'NONE' ||
    resolvedOnly.unresolved_count !== 0
  ) {
    throw new Error(
      'ERROR_STATE_PHASE2_RESOLVED_ONLY_FAIL'
    );
  }

  var recurrence =
    event(
      'H3ERR-RECURRENCE',
      '2026-09-26T14:01:00+09:00',
      fingerprintA,
      'CLIENT_RUNTIME_ERROR',
      9
    );
  var recurrenceState =
    h3ErrorStateReconcileData_(
      {
        errors:
          oldErrors.concat([
            recurrence
          ]),
        last_log_row:
          9
      },
      [
        resolvedIncident
      ],
      '2026-09-26T14:02:00+09:00'
    );

  if (
    recurrenceState.status !==
      'PRESENT' ||
    recurrenceState.unresolved_count !==
      1 ||
    recurrenceState.latest_unresolved_id !==
      'H3ERR-RECURRENCE'
  ) {
    throw new Error(
      'ERROR_STATE_PHASE2_RECURRENCE_FAIL'
    );
  }

  var exactOpen = {
    row_number: 3,
    incident_id:
      'H3ERR-OLD-LAST',
    event_at:
      '2026-09-26T13:39:00+09:00',
    event_at_ms:
      h3ErrorStateTimeMs_(
        '2026-09-26T13:39:00+09:00'
      ),
    status:
      'OPEN',
    error_id:
      'H3ERR-OLD-LAST',
    fingerprint_sha256:
      fingerprintA,
    match_through_at:
      null,
    match_through_ms:
      null,
    evidence_ref:
      null
  };

  if (
    h3ErrorStateErrorResolved_(
      oldErrors[1],
      [
        resolvedIncident,
        exactOpen
      ]
    ) !== false
  ) {
    throw new Error(
      'ERROR_STATE_PHASE2_EXACT_OPEN_OVERRIDE_FAIL'
    );
  }

  return {
    schema:
      'H3_ERROR_STATE_PHASE2_SELF_TEST_V1',
    status:
      'PASS',
    lifecycle_sheet:
      H3_ERROR_INCIDENT_SHEET_,
    implicit_unindexed_status:
      'OPEN',
    recurrence_after_cutoff:
      'OPEN',
    unresolved_grouping:
      'FINGERPRINT',
    cases:
      4,
    write_performed:
      false
  };
}


var H3_ERROR_STATE_BOOT_SCHEMA_ =
  'H3_ERROR_STATE_BOOT_SNAPSHOT_V1';

function h3ErrorStateReadIncidentLifecycleReadOnly_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_ERROR_INCIDENT_SHEET_
    );

  if (!sheet) {
    throw new Error(
      'ERROR_INCIDENT_SHEET_MISSING'
    );
  }

  return h3ErrorStateReadIncidentLifecycle_(
    spreadsheet
  );
}

function h3ErrorStateReadProjectionReadOnly_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_ERROR_STATE_SHEET_
    );

  if (!sheet) {
    return {
      state:
        null,
      read_error:
        'ERROR_STATE_PROJECTION_MISSING'
    };
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
    return {
      state:
        null,
      read_error:
        'ERROR_STATE_HEADER_MISMATCH'
    };
  }

  if (sheet.getLastRow() < 2) {
    return {
      state:
        null,
      read_error:
        'ERROR_STATE_PROJECTION_EMPTY'
    };
  }

  if (sheet.getLastRow() > 2) {
    return {
      state:
        null,
      read_error:
        'ERROR_STATE_ROW_COUNT_INVALID'
    };
  }

  try {
    var row =
      sheet
        .getRange(
          2,
          1,
          1,
          H3_ERROR_STATE_HEADERS_.length
        )
        .getDisplayValues()[0];

    var state =
      h3ErrorStateBuild_({
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
      });

    if (
      row[0] !==
        H3_ERROR_STATE_SCHEMA_ ||
      row[1] !==
        state.status
    ) {
      throw new Error(
        'ERROR_STATE_ROW_INVALID'
      );
    }

    return {
      state:
        state,
      read_error:
        null
    };
  } catch (error) {
    return {
      state:
        null,
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

function h3ErrorStateSemanticComparable_(
  state
) {
  if (!state) {
    return null;
  }

  return {
    status:
      state.status,
    unresolved_count:
      state.unresolved_count,
    latest_error_id:
      state.latest_error_id,
    latest_error_at:
      state.latest_error_at,
    latest_error_code:
      state.latest_error_code,
    latest_unresolved_id:
      state.latest_unresolved_id,
    last_log_row:
      state.last_log_row,
    source_status:
      state.source_status
  };
}

function h3ErrorStateSemanticEqual_(
  left,
  right
) {
  if (!left || !right) {
    return false;
  }

  return (
    JSON.stringify(
      h3ErrorStateSemanticComparable_(
        left
      )
    ) ===
    JSON.stringify(
      h3ErrorStateSemanticComparable_(
        right
      )
    )
  );
}

function h3ErrorStateBootEvaluateData_(
  raw,
  lifecycleStates,
  projectionRead,
  checkedAt
) {
  var effective =
    h3ErrorStateReconcileData_(
      raw,
      lifecycleStates,
      checkedAt
    );
  var projection =
    projectionRead &&
    projectionRead.state
      ? projectionRead.state
      : null;
  var reasons = [];

  if (!projection) {
    reasons.push(
      'PROJECTION_UNAVAILABLE'
    );
  } else {
    if (
      projection.last_log_row !==
      effective.last_log_row
    ) {
      reasons.push(
        'RAW_WATERMARK_MISMATCH'
      );
    }

    if (
      !h3ErrorStateSemanticEqual_(
        projection,
        effective
      )
    ) {
      reasons.push(
        'PROJECTION_SEMANTIC_MISMATCH'
      );
    }
  }

  return {
    schema:
      H3_ERROR_STATE_BOOT_SCHEMA_,
    checked_at:
      checkedAt,
    error:
      effective.status,
    drift:
      reasons.length
        ? 'PRESENT'
        : 'NONE',
    drift_reasons:
      reasons,
    primary_last_log_row:
      raw.last_log_row,
    projected_last_log_row:
      projection
        ? projection.last_log_row
        : null,
    effective_state:
      effective,
    projection_state:
      projection,
    projection_read_error:
      projectionRead
        ? projectionRead.read_error
        : 'PROJECTION_READ_NOT_PROVIDED',
    current_summary_role:
      'DISPLAY_ONLY',
    write_performed:
      false
  };
}

function h3ErrorStateBootSnapshot() {
  var checkedAt =
    h3ErrorStateNowTokyo_();

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var raw =
      h3ErrorStateReadRawErrors_(
        spreadsheet
      );
    var lifecycle =
      h3ErrorStateReadIncidentLifecycleReadOnly_(
        spreadsheet
      );
    var projection =
      h3ErrorStateReadProjectionReadOnly_(
        spreadsheet
      );

    return h3ErrorStateBootEvaluateData_(
      raw,
      lifecycle,
      projection,
      checkedAt
    );
  } catch (error) {
    return {
      schema:
        H3_ERROR_STATE_BOOT_SCHEMA_,
      checked_at:
        checkedAt,
      error:
        'UNKNOWN',
      drift:
        'UNKNOWN',
      drift_reasons: [
        'FRESH_SOURCE_READ_FAILED'
      ],
      primary_last_log_row:
        null,
      projected_last_log_row:
        null,
      effective_state:
        null,
      projection_state:
        null,
      projection_read_error:
        null,
      current_summary_role:
        'DISPLAY_ONLY',
      read_error:
        String(
          error &&
          error.message
            ? error.message
            : error
        ),
      write_performed:
        false
    };
  }
}

function h3ErrorStatePhase3SelfTest_() {
  var fingerprintA =
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  var fingerprintB =
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  var checkedAt =
    '2026-09-26T14:50:00+09:00';

  function event(
    id,
    at,
    fingerprint,
    code,
    row
  ) {
    return {
      row_number:
        row,
      error_id:
        id,
      at:
        at,
      at_ms:
        h3ErrorStateTimeMs_(at),
      error_code:
        code,
      fingerprint_sha256:
        fingerprint
    };
  }

  var oldError =
    event(
      'H3ERR-OLD',
      '2026-09-26T00:20:01+09:00',
      fingerprintA,
      'CLIENT_RUNTIME_ERROR',
      2
    );
  var newError =
    event(
      'H3ERR-NEW',
      '2026-09-26T08:54:45+09:00',
      fingerprintB,
      'REVIEW_AUDIO_BINDING_COUNT',
      3
    );
  var resolved = {
    row_number:
      2,
    incident_id:
      'H3ERR-OLD',
    event_at:
      '2026-09-26T13:38:00+09:00',
    event_at_ms:
      h3ErrorStateTimeMs_(
        '2026-09-26T13:38:00+09:00'
      ),
    status:
      'RESOLVED',
    error_id:
      'H3ERR-OLD',
    fingerprint_sha256:
      fingerprintA,
    match_through_at:
      '2026-09-26T00:20:01+09:00',
    match_through_ms:
      h3ErrorStateTimeMs_(
        '2026-09-26T00:20:01+09:00'
      ),
    evidence_ref:
      'incidents/H3ERR-OLD.json'
  };

  var baseline =
    h3ErrorStateReconcileData_(
      {
        errors: [
          oldError,
          newError
        ],
        last_log_row:
          3
      },
      [
        resolved
      ],
      '2026-09-26T14:40:00+09:00'
    );

  var noDrift =
    h3ErrorStateBootEvaluateData_(
      {
        errors: [
          oldError,
          newError
        ],
        last_log_row:
          3
      },
      [
        resolved
      ],
      {
        state:
          baseline,
        read_error:
          null
      },
      checkedAt
    );

  if (
    noDrift.error !== 'PRESENT' ||
    noDrift.drift !== 'NONE' ||
    noDrift.write_performed !==
      false
  ) {
    throw new Error(
      'ERROR_STATE_PHASE3_NO_DRIFT_FAIL'
    );
  }

  var later =
    event(
      'H3ERR-LATER',
      '2026-09-26T14:45:00+09:00',
      fingerprintB,
      'REVIEW_AUDIO_BINDING_COUNT',
      4
    );
  var watermarkDrift =
    h3ErrorStateBootEvaluateData_(
      {
        errors: [
          oldError,
          newError,
          later
        ],
        last_log_row:
          4
      },
      [
        resolved
      ],
      {
        state:
          baseline,
        read_error:
          null
      },
      checkedAt
    );

  if (
    watermarkDrift.drift !==
      'PRESENT' ||
    watermarkDrift.drift_reasons
      .indexOf(
        'RAW_WATERMARK_MISMATCH'
      ) < 0
  ) {
    throw new Error(
      'ERROR_STATE_PHASE3_WATERMARK_FAIL'
    );
  }

  var resolvedNew = {
    row_number:
      3,
    incident_id:
      'H3ERR-NEW',
    event_at:
      '2026-09-26T14:46:00+09:00',
    event_at_ms:
      h3ErrorStateTimeMs_(
        '2026-09-26T14:46:00+09:00'
      ),
    status:
      'RESOLVED',
    error_id:
      'H3ERR-NEW',
    fingerprint_sha256:
      fingerprintB,
    match_through_at:
      '2026-09-26T08:54:45+09:00',
    match_through_ms:
      h3ErrorStateTimeMs_(
        '2026-09-26T08:54:45+09:00'
      ),
    evidence_ref:
      'incidents/H3ERR-NEW.json'
  };

  var semanticDrift =
    h3ErrorStateBootEvaluateData_(
      {
        errors: [
          oldError,
          newError
        ],
        last_log_row:
          3
      },
      [
        resolved,
        resolvedNew
      ],
      {
        state:
          baseline,
        read_error:
          null
      },
      checkedAt
    );

  if (
    semanticDrift.error !== 'NONE' ||
    semanticDrift.drift !==
      'PRESENT' ||
    semanticDrift.drift_reasons
      .indexOf(
        'PROJECTION_SEMANTIC_MISMATCH'
      ) < 0 ||
    semanticDrift.drift_reasons
      .indexOf(
        'RAW_WATERMARK_MISMATCH'
      ) >= 0
  ) {
    throw new Error(
      'ERROR_STATE_PHASE3_SEMANTIC_FAIL'
    );
  }

  var missingProjection =
    h3ErrorStateBootEvaluateData_(
      {
        errors: [
          oldError,
          newError
        ],
        last_log_row:
          3
      },
      [
        resolved
      ],
      {
        state:
          null,
        read_error:
          'ERROR_STATE_PROJECTION_MISSING'
      },
      checkedAt
    );

  if (
    missingProjection.error !==
      'PRESENT' ||
    missingProjection.drift !==
      'PRESENT' ||
    missingProjection.drift_reasons
      .indexOf(
        'PROJECTION_UNAVAILABLE'
      ) < 0
  ) {
    throw new Error(
      'ERROR_STATE_PHASE3_MISSING_PROJECTION_FAIL'
    );
  }

  return {
    schema:
      'H3_ERROR_STATE_PHASE3_SELF_TEST_V1',
    status:
      'PASS',
    boot_schema:
      H3_ERROR_STATE_BOOT_SCHEMA_,
    boot_read_only:
      true,
    current_summary_role:
      'DISPLAY_ONLY',
    detects_raw_watermark_drift:
      true,
    detects_lifecycle_only_semantic_drift:
      true,
    cases:
      4,
    write_performed:
      false
  };
}
