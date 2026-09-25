/* =========================================================
 * H3 WEB RUNTIME OBSERVABILITY
 * Contract: H3_WEB_RUNTIME_ERROR_V1
 * =======================================================*/

var H3_OBSERVABILITY_ERROR_SCHEMA_ =
  'H3_WEB_RUNTIME_ERROR_V1';
var H3_OBSERVABILITY_CLIENT_REPORT_SCHEMA_ =
  'H3_WEB_RUNTIME_CLIENT_ERROR_V1';
var H3_OBSERVABILITY_CLIENT_RESULT_SCHEMA_ =
  'H3_WEB_RUNTIME_ERROR_REPORT_V1';
var H3_OBSERVABILITY_SOURCE_BINDING_SCHEMA_ =
  'H3_OBSERVABILITY_SOURCE_BINDING_V1';
var H3_OBSERVABILITY_SOURCE_BINDING_RESULT_SCHEMA_ =
  'H3_OBSERVABILITY_SOURCE_BINDING_RESULT_V1';

var H3_OBSERVABILITY_ERROR_SHEET_ =
  'web_runtime_error_log_v1';
var H3_OBSERVABILITY_ERROR_HEADERS_ = [
  'SCHEMA',
  'ERROR_ID',
  'AT',
  'ORIGIN',
  'TRACE_ID',
  'ENTRYPOINT',
  'STAGE',
  'MODE',
  'REVIEW_KIND',
  'SURFACE_FAMILY',
  'SET_ID',
  'Q_NO',
  'TXN_ID',
  'ERROR_CODE',
  'ERROR_NAME',
  'ERROR_MESSAGE',
  'STACK',
  'FINGERPRINT_SHA256',
  'CONTEXT_JSON',
  'SOURCE_SHA',
  'SOURCE_DIGEST',
  'SOURCE_FILE_COUNT'
];

var H3_OBSERVABILITY_SOURCE_SCHEMA_KEY_ =
  'H3_OBSERVABILITY_SOURCE_SCHEMA';
var H3_OBSERVABILITY_SOURCE_SHA_KEY_ =
  'H3_OBSERVABILITY_SOURCE_SHA';
var H3_OBSERVABILITY_SOURCE_DIGEST_KEY_ =
  'H3_OBSERVABILITY_SOURCE_DIGEST';
var H3_OBSERVABILITY_SOURCE_FILE_COUNT_KEY_ =
  'H3_OBSERVABILITY_SOURCE_FILE_COUNT';
var H3_OBSERVABILITY_SOURCE_BOUND_AT_KEY_ =
  'H3_OBSERVABILITY_SOURCE_BOUND_AT';
var H3_OBSERVABILITY_LAST_PRUNE_MS_KEY_ =
  'H3_OBSERVABILITY_LAST_PRUNE_MS';

var H3_OBSERVABILITY_RETENTION_DAYS_ = 90;
var H3_OBSERVABILITY_MAX_EVENTS_ = 5000;
var H3_OBSERVABILITY_PRUNE_INTERVAL_MS_ =
  24 * 60 * 60 * 1000;

function h3ObservabilityNowTokyo_() {
  return (
    Utilities.formatDate(
      new Date(),
      'Asia/Tokyo',
      "yyyy-MM-dd'T'HH:mm:ss"
    ) +
    '+09:00'
  );
}

function h3ObservabilityErrorId_() {
  var stamp =
    Utilities.formatDate(
      new Date(),
      'Asia/Tokyo',
      'yyyyMMdd-HHmmss'
    );
  var suffix =
    Utilities.getUuid()
      .replace(/-/g, '')
      .slice(0, 8)
      .toUpperCase();
  return (
    'H3ERR-' +
    stamp +
    '-' +
    suffix
  );
}

function h3ObservabilityTraceId_(value) {
  var normalized =
    String(value || '').trim();
  if (
    /^H3TRACE-[A-Za-z0-9_-]{8,80}$/.test(
      normalized
    )
  ) {
    return normalized;
  }
  return (
    'H3TRACE-' +
    Utilities.getUuid()
      .replace(/-/g, '')
      .slice(0, 16)
      .toUpperCase()
  );
}

function h3ObservabilitySha256_(value) {
  return Utilities
    .computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(value || ''),
      Utilities.Charset.UTF_8
    )
    .map(function (b) {
      return (
        '0' +
        (
          (b + 256) %
          256
        ).toString(16)
      ).slice(-2);
    })
    .join('');
}

function h3ObservabilitySanitizeText_(
  value,
  maxLength
) {
  var text =
    String(
      value === null ||
      value === undefined
        ? ''
        : value
    );

  text = text
    .replace(
      /Bearer\s+[A-Za-z0-9._~+\/-]+/gi,
      'Bearer [REDACTED]'
    )
    .replace(
      /([?&](?:token|key|secret|auth|signature|sig|code)=)[^&#\s]+/gi,
      '$1[REDACTED]'
    )
    .replace(
      /https?:\/\/[^\s)]+/g,
      function (url) {
        var q =
          url.indexOf('?');
        return q >= 0
          ? (
              url.slice(0, q) +
              '?[REDACTED_QUERY]'
            )
          : url;
      }
    );

  var limit =
    Number(maxLength || 0);
  if (
    Number.isFinite(limit) &&
    limit > 0 &&
    text.length > limit
  ) {
    text =
      text.slice(
        0,
        limit
      );
  }
  return text;
}

function h3ObservabilityErrorName_(error) {
  return h3ObservabilitySanitizeText_(
    error &&
    error.name
      ? error.name
      : 'Error',
    120
  );
}

function h3ObservabilityErrorMessage_(error) {
  return h3ObservabilitySanitizeText_(
    error &&
    error.message !== undefined
      ? error.message
      : error,
    1000
  );
}

function h3ObservabilityErrorStack_(error) {
  return h3ObservabilitySanitizeText_(
    error &&
    error.stack
      ? error.stack
      : '',
    8000
  );
}

function h3ObservabilityErrorCode_(
  error,
  message
) {
  if (
    error &&
    error.error_code &&
    /^[A-Z][A-Z0-9_:-]{2,160}$/.test(
      String(error.error_code)
    )
  ) {
    return String(
      error.error_code
    ).slice(
      0,
      160
    );
  }

  var normalized =
    String(message || '');
  var match =
    normalized.match(
      /^([A-Z][A-Z0-9_]{2,120})(?::|$)/
    );
  return match
    ? match[1]
    : 'NATIVE_ERROR';
}

function h3ObservabilityStage_(
  stageHint,
  errorCode,
  stack
) {
  var s =
    String(stack || '');

  if (
    /h3ReviewHomeIndex/.test(s)
  ) {
    return 'review.home_index';
  }
  if (
    /h3ReviewResolvePermalink/.test(s)
  ) {
    return 'review.permalink';
  }
  if (
    /h3WebAttachSurfaceSetNo/.test(s)
  ) {
    return 'review.surface_set_no';
  }
  if (
    /h3WebAttachPostSubmitReviewSurface/.test(s)
  ) {
    return 'review.post_submit';
  }

  var code =
    String(errorCode || '');
  if (
    code.indexOf(
      'REVIEW_PERMALINK_'
    ) === 0
  ) {
    return 'review.permalink';
  }
  if (
    code.indexOf(
      'SURFACE_SET_NO_'
    ) === 0
  ) {
    return 'review.surface_set_no';
  }
  if (
    code.indexOf(
      'POSTSUBMIT_REVIEW_'
    ) === 0
  ) {
    return 'review.post_submit';
  }
  if (
    code.indexOf('REVIEW_') === 0
  ) {
    return 'review';
  }

  return h3ObservabilitySanitizeText_(
    stageHint || 'runtime',
    120
  );
}

function h3ObservabilityContext_(
  request,
  extra
) {
  var source =
    request &&
    typeof request === 'object'
      ? request
      : {};
  var extraSource =
    extra &&
    typeof extra === 'object'
      ? extra
      : {};
  var out = {};
  var allowed = [
    'schema',
    'provider_kind',
    'level',
    'issue_no',
    'listening_set_no',
    'client_event',
    'line',
    'column',
    'asset_key'
  ];

  allowed.forEach(
    function (key) {
      var value =
        extraSource[key] !== undefined
          ? extraSource[key]
          : source[key];
      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return;
      }

      if (
        typeof value === 'boolean' ||
        typeof value === 'number'
      ) {
        out[key] = value;
        return;
      }

      out[key] =
        h3ObservabilitySanitizeText_(
          value,
          240
        );
    }
  );

  return h3ObservabilitySanitizeText_(
    JSON.stringify(out),
    2000
  );
}

function h3ObservabilitySourceBindingRead_() {
  var props =
    PropertiesService
      .getScriptProperties();
  var schema =
    String(
      props.getProperty(
        H3_OBSERVABILITY_SOURCE_SCHEMA_KEY_
      ) || ''
    );
  var sha =
    String(
      props.getProperty(
        H3_OBSERVABILITY_SOURCE_SHA_KEY_
      ) || ''
    );
  var digest =
    String(
      props.getProperty(
        H3_OBSERVABILITY_SOURCE_DIGEST_KEY_
      ) || ''
    );
  var fileCount =
    Number(
      props.getProperty(
        H3_OBSERVABILITY_SOURCE_FILE_COUNT_KEY_
      ) || 0
    );
  var boundAt =
    String(
      props.getProperty(
        H3_OBSERVABILITY_SOURCE_BOUND_AT_KEY_
      ) || ''
    );

  var ready =
    schema ===
      H3_OBSERVABILITY_SOURCE_BINDING_SCHEMA_ &&
    /^[0-9a-f]{40}$/.test(sha) &&
    /^[0-9a-f]{64}$/.test(digest) &&
    Number.isInteger(fileCount) &&
    fileCount > 0;

  return {
    schema:
      H3_OBSERVABILITY_SOURCE_BINDING_SCHEMA_,
    status:
      ready
        ? 'READY'
        : 'MISSING_OR_INVALID',
    source_sha:
      ready
        ? sha
        : null,
    source_digest:
      ready
        ? digest
        : null,
    source_file_count:
      ready
        ? fileCount
        : null,
    bound_at:
      ready
        ? boundAt
        : null
  };
}

function h3ObservabilityEnsureErrorSheet_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_OBSERVABILITY_ERROR_SHEET_
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        H3_OBSERVABILITY_ERROR_SHEET_
      );
    sheet
      .getRange(
        1,
        1,
        1,
        H3_OBSERVABILITY_ERROR_HEADERS_
          .length
      )
      .setValues([
        H3_OBSERVABILITY_ERROR_HEADERS_
      ]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  var width =
    H3_OBSERVABILITY_ERROR_HEADERS_
      .length;
  var existing =
    sheet
      .getRange(
        1,
        1,
        1,
        width
      )
      .getDisplayValues()[0];

  if (
    JSON.stringify(existing) !==
    JSON.stringify(
      H3_OBSERVABILITY_ERROR_HEADERS_
    )
  ) {
    throw new Error(
      'OBSERVABILITY_ERROR_LOG_HEADER_MISMATCH'
    );
  }
  return sheet;
}

function h3ObservabilityFingerprint_(
  origin,
  entrypoint,
  stage,
  errorCode,
  errorName,
  stack
) {
  var firstFrame =
    String(stack || '')
      .split(/\r?\n/)
      .filter(
        function (line) {
          return /^\s*at\s+/.test(line);
        }
      )[0] || '';

  return h3ObservabilitySha256_(
    [
      origin,
      entrypoint,
      stage,
      errorCode,
      errorName,
      firstFrame
    ].join('|')
  );
}

function h3ObservabilityWriteError_(
  spec
) {
  var errorId =
    spec.error_id ||
    h3ObservabilityErrorId_();
  var traceId =
    h3ObservabilityTraceId_(
      spec.trace_id
    );
  var binding =
    h3ObservabilitySourceBindingRead_();
  var origin =
    spec.origin === 'CLIENT'
      ? 'CLIENT'
      : 'SERVER';
  var entrypoint =
    h3ObservabilitySanitizeText_(
      spec.entrypoint ||
        'unknown',
      160
    );
  var message =
    h3ObservabilitySanitizeText_(
      spec.error_message ||
        '',
      1000
    );
  var errorName =
    h3ObservabilitySanitizeText_(
      spec.error_name ||
        'Error',
      120
    );
  var errorCode =
    h3ObservabilitySanitizeText_(
      spec.error_code ||
        'NATIVE_ERROR',
      160
    );
  var stack =
    h3ObservabilitySanitizeText_(
      spec.stack ||
        '',
      8000
    );
  var stage =
    h3ObservabilityStage_(
      spec.stage ||
        'runtime',
      errorCode,
      stack
    );
  var fingerprint =
    h3ObservabilityFingerprint_(
      origin,
      entrypoint,
      stage,
      errorCode,
      errorName,
      stack
    );
  var at =
    h3ObservabilityNowTokyo_();

  var summary = {
    schema:
      H3_OBSERVABILITY_ERROR_SCHEMA_,
    error_id:
      errorId,
    at:
      at,
    origin:
      origin,
    trace_id:
      traceId,
    entrypoint:
      entrypoint,
    stage:
      stage,
    mode:
      spec.mode || null,
    review_kind:
      spec.review_kind || null,
    surface_family:
      spec.surface_family || null,
    set_id:
      spec.set_id || null,
    q_no:
      spec.q_no || null,
    txn_id:
      spec.txn_id || null,
    error_code:
      errorCode,
    error_name:
      errorName,
    error_message:
      message,
    fingerprint_sha256:
      fingerprint,
    source_sha:
      binding.source_sha,
    source_digest:
      binding.source_digest,
    source_file_count:
      binding.source_file_count
  };

  try {
    console.error(
      JSON.stringify(summary)
    );
  } catch (_consoleError) {}

  var lock =
    LockService.getScriptLock();
  var locked = false;
  try {
    locked =
      lock.tryLock(5000);
    if (!locked) {
      return {
        error_id:
          errorId,
        trace_id:
          traceId,
        logged:
          false,
        log_error:
          'OBSERVABILITY_LOG_LOCK_BUSY'
      };
    }

    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var sheet =
      h3ObservabilityEnsureErrorSheet_(
        spreadsheet
      );
    var row = [
      H3_OBSERVABILITY_ERROR_SCHEMA_,
      errorId,
      at,
      origin,
      traceId,
      entrypoint,
      stage,
      h3ObservabilitySanitizeText_(
        spec.mode || '',
        80
      ),
      h3ObservabilitySanitizeText_(
        spec.review_kind || '',
        80
      ),
      h3ObservabilitySanitizeText_(
        spec.surface_family || '',
        80
      ),
      h3ObservabilitySanitizeText_(
        spec.set_id || '',
        160
      ),
      (
        spec.q_no === null ||
        spec.q_no === undefined
      )
        ? ''
        : Number(spec.q_no),
      h3ObservabilitySanitizeText_(
        spec.txn_id || '',
        160
      ),
      errorCode,
      errorName,
      message,
      stack,
      fingerprint,
      h3ObservabilitySanitizeText_(
        spec.context_json || '{}',
        2000
      ),
      binding.source_sha || '',
      binding.source_digest || '',
      binding.source_file_count || ''
    ];

    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        1,
        row.length
      )
      .setValues([
        row
      ]);

    return {
      error_id:
        errorId,
      trace_id:
        traceId,
      logged:
        true,
      log_error:
        null
    };
  } catch (logError) {
    try {
      console.error(
        JSON.stringify({
          schema:
            'H3_WEB_RUNTIME_ERROR_LOGGER_FAILURE_V1',
          error_id:
            errorId,
          logger_error:
            h3ObservabilitySanitizeText_(
              logError &&
              logError.message
                ? logError.message
                : logError,
              1000
            )
        })
      );
    } catch (_nestedConsoleError) {}

    return {
      error_id:
        errorId,
      trace_id:
        traceId,
      logged:
        false,
      log_error:
        h3ObservabilitySanitizeText_(
          logError &&
          logError.message
            ? logError.message
            : logError,
          1000
        )
    };
  } finally {
    if (locked) {
      try {
        lock.releaseLock();
      } catch (_releaseError) {}
    }
  }
}

function h3ObservabilityLogServerError_(
  entrypoint,
  request,
  stageHint,
  error
) {
  var source =
    request &&
    typeof request === 'object'
      ? request
      : {};
  var message =
    h3ObservabilityErrorMessage_(
      error
    );
  var stack =
    h3ObservabilityErrorStack_(
      error
    );
  var errorCode =
    h3ObservabilityErrorCode_(
      error,
      message
    );

  return h3ObservabilityWriteError_({
    origin:
      'SERVER',
    trace_id:
      source.trace_id,
    entrypoint:
      entrypoint,
    stage:
      h3ObservabilityStage_(
        stageHint,
        errorCode,
        stack
      ),
    mode:
      source.mode,
    review_kind:
      source.review_kind,
    surface_family:
      source.surface_family,
    set_id:
      source.set_id,
    q_no:
      source.q_no,
    txn_id:
      source.txn_id,
    error_code:
      errorCode,
    error_name:
      h3ObservabilityErrorName_(
        error
      ),
    error_message:
      message,
    stack:
      stack,
    context_json:
      h3ObservabilityContext_(
        source
      )
  });
}

function h3ObservabilityAnnotateError_(
  error,
  errorId
) {
  if (!errorId) {
    return error;
  }

  var target =
    error &&
    typeof error === 'object'
      ? error
      : new Error(
          h3ObservabilityErrorMessage_(
            error
          )
        );
  var message =
    h3ObservabilityErrorMessage_(
      target
    );

  if (
    message.indexOf(
      'Error ID: ' + errorId
    ) < 0
  ) {
    try {
      target.message =
        message +
        '\nError ID: ' +
        errorId;
    } catch (_messageError) {}
  }
  return target;
}

function h3ObservabilityCall_(
  entrypoint,
  request,
  stageHint,
  fn
) {
  try {
    return fn();
  } catch (error) {
    var logged =
      h3ObservabilityLogServerError_(
        entrypoint,
        request,
        stageHint,
        error
      );
    throw h3ObservabilityAnnotateError_(
      error,
      logged &&
      logged.error_id
    );
  }
}

function reportWebRuntimeClientError(
  request
) {
  var source =
    request &&
    typeof request === 'object'
      ? request
      : {};

  if (
    source.schema !==
    H3_OBSERVABILITY_CLIENT_REPORT_SCHEMA_
  ) {
    return {
      schema:
        H3_OBSERVABILITY_CLIENT_RESULT_SCHEMA_,
      status:
        'REJECTED',
      error_id:
        null
    };
  }

  var errorName =
    h3ObservabilitySanitizeText_(
      source.error_name ||
        'Error',
      120
    );
  var message =
    h3ObservabilitySanitizeText_(
      source.error_message ||
        'CLIENT_ERROR',
      1000
    );
  var stack =
    h3ObservabilitySanitizeText_(
      source.stack ||
        '',
      8000
    );
  var errorCode =
    h3ObservabilitySanitizeText_(
      source.error_code ||
        'CLIENT_RUNTIME_ERROR',
      160
    );

  var logged =
    h3ObservabilityWriteError_({
      origin:
        'CLIENT',
      trace_id:
        source.trace_id,
      entrypoint:
        source.entrypoint ||
        'Client.html',
      stage:
        source.stage ||
        'client.runtime',
      mode:
        source.mode,
      review_kind:
        source.review_kind,
      surface_family:
        source.surface_family,
      set_id:
        source.set_id,
      q_no:
        source.q_no,
      txn_id:
        source.txn_id,
      error_code:
        errorCode,
      error_name:
        errorName,
      error_message:
        message,
      stack:
        stack,
      context_json:
        h3ObservabilityContext_(
          {},
          source.context
        )
    });

  return {
    schema:
      H3_OBSERVABILITY_CLIENT_RESULT_SCHEMA_,
    status:
      logged.logged
        ? 'RECORDED'
        : 'CONSOLE_ONLY',
    error_id:
      logged.error_id,
    trace_id:
      logged.trace_id
  };
}

function h3ObservabilityBindSource(
  request
) {
  var source =
    request &&
    typeof request === 'object'
      ? request
      : {};

  if (
    source.schema !==
      H3_OBSERVABILITY_SOURCE_BINDING_SCHEMA_ ||
    !/^[0-9a-f]{40}$/.test(
      String(
        source.source_sha ||
        ''
      )
    ) ||
    !/^[0-9a-f]{64}$/.test(
      String(
        source.source_digest ||
        ''
      )
    ) ||
    !Number.isInteger(
      Number(
        source.source_file_count
      )
    ) ||
    Number(
      source.source_file_count
    ) < 1 ||
    Number(
      source.source_file_count
    ) > 500
  ) {
    throw new Error(
      'OBSERVABILITY_SOURCE_BINDING_REQUEST_INVALID'
    );
  }

  var lock =
    LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error(
      'OBSERVABILITY_SOURCE_BINDING_LOCK_BUSY'
    );
  }

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    h3ObservabilityEnsureErrorSheet_(
      spreadsheet
    );

    var props =
      PropertiesService
        .getScriptProperties();
    var before =
      h3ObservabilitySourceBindingRead_();
    var nextAt =
      h3ObservabilityNowTokyo_();
    var nextSha =
      String(source.source_sha);
    var nextDigest =
      String(source.source_digest);
    var nextCount =
      Number(
        source.source_file_count
      );
    var changed =
      before.status !== 'READY' ||
      before.source_sha !== nextSha ||
      before.source_digest !==
        nextDigest ||
      Number(
        before.source_file_count || 0
      ) !== nextCount;

    if (changed) {
      var values = {};
      values[
        H3_OBSERVABILITY_SOURCE_SCHEMA_KEY_
      ] =
        H3_OBSERVABILITY_SOURCE_BINDING_SCHEMA_;
      values[
        H3_OBSERVABILITY_SOURCE_SHA_KEY_
      ] =
        nextSha;
      values[
        H3_OBSERVABILITY_SOURCE_DIGEST_KEY_
      ] =
        nextDigest;
      values[
        H3_OBSERVABILITY_SOURCE_FILE_COUNT_KEY_
      ] =
        String(nextCount);
      values[
        H3_OBSERVABILITY_SOURCE_BOUND_AT_KEY_
      ] =
        nextAt;
      props.setProperties(
        values,
        false
      );
    }

    var after =
      h3ObservabilitySourceBindingRead_();
    if (
      after.status !== 'READY' ||
      after.source_sha !== nextSha ||
      after.source_digest !==
        nextDigest ||
      Number(
        after.source_file_count
      ) !== nextCount
    ) {
      throw new Error(
        'OBSERVABILITY_SOURCE_BINDING_READBACK_MISMATCH'
      );
    }

    return {
      schema:
        H3_OBSERVABILITY_SOURCE_BINDING_RESULT_SCHEMA_,
      status:
        'PASS',
      source_sha:
        after.source_sha,
      source_digest:
        after.source_digest,
      source_file_count:
        after.source_file_count,
      bound_at:
        after.bound_at,
      write_performed:
        changed
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_releaseError) {}
  }
}

function h3ObservabilityPruneRuntimeErrorsUnlocked_(
  spreadsheet,
  nowMs
) {
  var props =
    PropertiesService
      .getScriptProperties();
  var lastPrune =
    Number(
      props.getProperty(
        H3_OBSERVABILITY_LAST_PRUNE_MS_KEY_
      ) || 0
    );
  var currentMs =
    Number(nowMs || Date.now());

  if (
    lastPrune > 0 &&
    currentMs - lastPrune <
      H3_OBSERVABILITY_PRUNE_INTERVAL_MS_
  ) {
    return {
      schema:
        'H3_WEB_RUNTIME_ERROR_PRUNE_V1',
      status:
        'NOT_DUE',
      deleted:
        0
    };
  }

  var sheet =
    spreadsheet.getSheetByName(
      H3_OBSERVABILITY_ERROR_SHEET_
    );
  if (!sheet) {
    props.setProperty(
      H3_OBSERVABILITY_LAST_PRUNE_MS_KEY_,
      String(currentMs)
    );
    return {
      schema:
        'H3_WEB_RUNTIME_ERROR_PRUNE_V1',
      status:
        'NO_SHEET',
      deleted:
        0
    };
  }

  h3ObservabilityEnsureErrorSheet_(
    spreadsheet
  );

  var dataRows =
    Math.max(
      0,
      sheet.getLastRow() - 1
    );
  if (dataRows === 0) {
    props.setProperty(
      H3_OBSERVABILITY_LAST_PRUNE_MS_KEY_,
      String(currentMs)
    );
    return {
      schema:
        'H3_WEB_RUNTIME_ERROR_PRUNE_V1',
      status:
        'PASS',
      deleted:
        0
    };
  }

  var atColumn =
    H3_OBSERVABILITY_ERROR_HEADERS_
      .indexOf('AT') + 1;
  var values =
    sheet
      .getRange(
        2,
        atColumn,
        dataRows,
        1
      )
      .getDisplayValues()
      .map(
        function (row) {
          return String(
            row[0] || ''
          );
        }
      );
  var cutoff =
    currentMs -
    (
      H3_OBSERVABILITY_RETENTION_DAYS_ *
      24 *
      60 *
      60 *
      1000
    );
  var expired = 0;

  for (
    var i = 0;
    i < values.length;
    i += 1
  ) {
    var parsed =
      Date.parse(
        values[i]
      );
    if (
      !Number.isFinite(parsed) ||
      parsed >= cutoff
    ) {
      break;
    }
    expired += 1;
  }

  var overCap =
    Math.max(
      0,
      dataRows -
      H3_OBSERVABILITY_MAX_EVENTS_
    );
  var deleteCount =
    Math.max(
      expired,
      overCap
    );

  if (deleteCount > 0) {
    sheet.deleteRows(
      2,
      deleteCount
    );
  }

  props.setProperty(
    H3_OBSERVABILITY_LAST_PRUNE_MS_KEY_,
    String(currentMs)
  );

  return {
    schema:
      'H3_WEB_RUNTIME_ERROR_PRUNE_V1',
    status:
      'PASS',
    deleted:
      deleteCount,
    remaining:
      Math.max(
        0,
        dataRows -
        deleteCount
      )
  };
}

function h3ObservabilityPruneRuntimeErrors() {
  var lock =
    LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      schema:
        'H3_WEB_RUNTIME_ERROR_PRUNE_V1',
      status:
        'LOCK_BUSY',
      deleted:
        0
    };
  }

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    return h3ObservabilityPruneRuntimeErrorsUnlocked_(
      spreadsheet,
      Date.now()
    );
  } finally {
    try {
      lock.releaseLock();
    } catch (_releaseError) {}
  }
}
