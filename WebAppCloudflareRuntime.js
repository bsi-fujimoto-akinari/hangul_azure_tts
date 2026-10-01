/**
 * P3 retained Drive hydration for D1-authoritative read/render.
 * The Sheet is read only for asset references keyed by the Worker-selected set.
 */
var H3_RUNTIME_EXPECTED_WORKER_URL_ =
  'https://hangul-runtime-prod.akinari-fujimoto.workers.dev';
var H3_RUNTIME_RPC_PATH_ = '/__internal/h3/runtime/v1';

function h3RuntimeC1AuthorityReadback() {
  return h3RuntimeAuthority_();
}

function h3RuntimeC1Quiesce() {
  return h3RuntimeSetAuthority_('LEGACY', 'QUIESCED', '0', '0');
}

/** Read-only pre-C6 proof. Returns only safe derived authority/lock state. */
function h3RuntimePreC6Readback() {
  var props = PropertiesService.getScriptProperties();
  var mode = '';
  var lock = String(props.getProperty('H3_RUNTIME_CUTOVER_LOCKED') || '');
  try {
    mode = h3RuntimeAuthority_();
  } catch (ignored) {
    mode = 'INVALID';
  }
  var pass = mode === 'QUIESCED' && lock === '0';
  return {
    status: pass ? 'PASS' : 'FAIL',
    authority_mode: mode,
    cutover_locked: lock === '1',
    mutation_count: 0
  };
}

/** Narrow P3 operator entry point; transition is guarded by the canonical setter. */
function h3RuntimeC6Activate() {
  return h3RuntimeSetAuthority_('QUIESCED', 'D1', '0', '1');
}

/** Read-only cutover proof. Never returns Script Property values or error text. */
function h3RuntimeC9Readback() {
  var props = PropertiesService.getScriptProperties();
  var mode = '';
  var lock = String(props.getProperty('H3_RUNTIME_CUTOVER_LOCKED') || '');
  var backendExact =
    props.getProperty('H3_RUNTIME_BACKEND_BASE_URL') ===
      H3_RUNTIME_EXPECTED_WORKER_URL_;
  var bearerPresent = !!props.getProperty('H3_RUNTIME_BEARER_TOKEN');
  var health = 'NOT_RUN';
  var database = 'NOT_RUN';
  try {
    mode = h3RuntimeAuthority_();
  } catch (ignored) {
    mode = 'INVALID';
  }
  if (mode === 'D1' && lock === '1' && backendExact && bearerPresent) {
    try {
      var result = h3RuntimeRpc_('HEALTH', {});
      health = result && result.status === 'PASS' ? 'PASS' : 'FAIL';
      database = result && result.database === 'AVAILABLE' ?
        'AVAILABLE' : 'UNAVAILABLE';
    } catch (ignored) {
      health = 'FAIL';
      database = 'UNAVAILABLE';
    }
  }
  var routeVerified = mode === 'D1' && lock === '1' && backendExact &&
    bearerPresent && health === 'PASS' && database === 'AVAILABLE';
  return {
    status: routeVerified ? 'PASS' : 'FAIL',
    authority_mode: mode,
    cutover_locked: lock === '1',
    expected_backend_url: backendExact,
    bearer_present: bearerPresent,
    health_status: health,
    database_status: database,
    worker_d1_route_verified: routeVerified,
    mutation_count: 0
  };
}

function h3RuntimeAuthority_() {
  var props = PropertiesService.getScriptProperties();
  var locked = props.getProperty('H3_RUNTIME_CUTOVER_LOCKED');
  if (locked !== '0' && locked !== '1') {
    throw new Error('H3_RUNTIME_CUTOVER_LOCK_INVALID');
  }
  var mode = String(props.getProperty('H3_RUNTIME_AUTHORITY_MODE') || '');
  if (!mode && locked === '0') mode = 'LEGACY';
  if (['LEGACY', 'QUIESCED', 'D1'].indexOf(mode) < 0) {
    throw new Error('H3_RUNTIME_AUTHORITY_INVALID');
  }
  if (locked === '1' && mode === 'LEGACY') {
    throw new Error('H3_RUNTIME_CUTOVER_LOCKED');
  }
  return mode;
}

function h3RuntimeRpc_(operation, payload) {
  var props = PropertiesService.getScriptProperties();
  var baseUrl = props.getProperty('H3_RUNTIME_BACKEND_BASE_URL');
  if (baseUrl !== H3_RUNTIME_EXPECTED_WORKER_URL_) {
    throw new Error('H3_RUNTIME_BACKEND_INVALID');
  }
  var token = props.getProperty('H3_RUNTIME_BEARER_TOKEN');
  if (!token) throw new Error('H3_RUNTIME_TOKEN_MISSING');
  var response = UrlFetchApp.fetch(
    baseUrl + H3_RUNTIME_RPC_PATH_,
    {
      method: 'post',
      contentType: 'application/json',
      headers: {Authorization: 'Bearer ' + token},
      payload: JSON.stringify({
        schema: 'H3_RUNTIME_RPC_REQUEST_V1',
        operation: operation,
        trace_id: Utilities.getUuid(),
        payload: payload
      }),
      muteHttpExceptions: true
    }
  );
  var body;
  try {
    body = JSON.parse(response.getContentText());
  } catch (ignored) {
    throw new Error('H3_RUNTIME_RPC_RESPONSE_INVALID');
  }
  if (!body || body.schema !== 'H3_RUNTIME_RPC_RESPONSE_V1' ||
      body.operation !== operation ||
      body.ok !== (response.getResponseCode() === 200)) {
    throw new Error('H3_RUNTIME_RPC_RESPONSE_INVALID');
  }
  if (!body.ok) {
    var code = body.error && String(body.error.code || '');
    throw new Error(
      /^[A-Z0-9_]+$/.test(code) ? code : 'H3_RUNTIME_RPC_FAILED'
    );
  }
  return body.data;
}


var H3_RUNTIME_R2_RECEIPT_SCHEMA_ =
  'H3_R2_PRIMARY_ASSET_WRITE_RECEIPT_V1';
var H3_RUNTIME_R2_STORAGE_AUTHORITY_ =
  'CLOUDFLARE_R2_PRIVATE';

function h3RuntimeR2AssetSpec_(assetClass) {
  var specs = {
    REVIEW_AUDIO: {
      identity_fields: ['set_id','slot_key','surface_family'],
      mime_types: ['audio/mpeg'],
      object_prefix: 'v1/review_audio/sha256/'
    },
    LISTENING_AUDIO_INDIVIDUAL: {
      identity_fields: ['listen_gen_id','set_id','slot_key'],
      mime_types: ['audio/mpeg'],
      object_prefix: 'v1/listening_audio_individual/sha256/'
    },
    LISTENING_K1_IMAGE: {
      identity_fields: ['k1_ready_id'],
      mime_types: ['image/png','image/jpeg','image/webp'],
      object_prefix: 'v1/LISTENING_K1_IMAGE/sha256/'
    }
  };
  var spec = specs[String(assetClass || '')];
  if (!spec) throw new Error('R2_PRIMARY_ASSET_CLASS_INVALID');
  return spec;
}

function h3RuntimeR2Nonblank_(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    !/[\x00-\x1f]/.test(value);
}

function h3RuntimeR2CanonicalRecord_(value, code, expectedFields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(code);
  }
  var keys = Object.keys(value).sort();
  if (expectedFields) {
    var expected = expectedFields.slice().sort();
    if (JSON.stringify(keys) !== JSON.stringify(expected)) {
      throw new Error(code);
    }
  }
  var out = {};
  keys.forEach(function(key) {
    if (!h3RuntimeR2Nonblank_(key) ||
        !h3RuntimeR2Nonblank_(value[key])) {
      throw new Error(code);
    }
    out[key] = String(value[key]);
  });
  return out;
}

function h3RuntimeR2CanonicalNullableRecord_(value, code) {
  return value === null
    ? null
    : h3RuntimeR2CanonicalRecord_(value, code, null);
}

function h3RuntimeR2HexFromDigest_(digest) {
  return digest.map(function(b) {
    return ('0' + (((b + 256) % 256).toString(16))).slice(-2);
  }).join('');
}

function h3RuntimeR2Sha256Text_(value) {
  return h3RuntimeR2HexFromDigest_(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(value),
      Utilities.Charset.UTF_8
    )
  );
}

function h3RuntimeR2Sha256Bytes_(bytes) {
  return h3RuntimeR2HexFromDigest_(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      bytes
    )
  );
}

function h3RuntimeR2ValidateInput_(request) {
  var required = [
    'asset_class',
    'bytes',
    'drive_rollback_target_class',
    'logical_binding_identity',
    'mime_type',
    'pre_cutover_or_previous_drive_binding_snapshot',
    'written_at'
  ].sort();
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(required)) {
    throw new Error('R2_PRIMARY_WRITE_REQUEST_INVALID');
  }

  var assetClass = String(request.asset_class || '');
  var spec = h3RuntimeR2AssetSpec_(assetClass);
  var identity = h3RuntimeR2CanonicalRecord_(
    request.logical_binding_identity,
    'R2_PRIMARY_LOGICAL_IDENTITY_INVALID',
    spec.identity_fields
  );
  if (!Array.isArray(request.bytes) || request.bytes.length < 1 ||
      request.bytes.some(function(b) {
        return !Number.isInteger(b) || b < -128 || b > 127;
      })) {
    throw new Error('R2_PRIMARY_BYTES_INVALID');
  }
  var mimeType = String(request.mime_type || '');
  if (spec.mime_types.indexOf(mimeType) < 0) {
    throw new Error('R2_PRIMARY_MIME_TYPE_INVALID');
  }
  var writtenAt = String(request.written_at || '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(writtenAt)) {
    throw new Error('R2_PRIMARY_WRITTEN_AT_INVALID');
  }
  if (!h3RuntimeR2Nonblank_(request.drive_rollback_target_class)) {
    throw new Error('R2_PRIMARY_ROLLBACK_TARGET_INVALID');
  }
  return {
    asset_class: assetClass,
    spec: spec,
    logical_binding_identity: identity,
    bytes: request.bytes.slice(),
    mime_type: mimeType,
    written_at: writtenAt,
    pre_cutover_or_previous_drive_binding_snapshot:
      h3RuntimeR2CanonicalNullableRecord_(
        request.pre_cutover_or_previous_drive_binding_snapshot,
        'R2_PRIMARY_DRIVE_SNAPSHOT_INVALID'
      ),
    drive_rollback_target_class:
      String(request.drive_rollback_target_class)
  };
}

function h3RuntimeR2ValidateReceipt_(receipt, input) {
  var fields = [
    'asset_class',
    'drive_rollback_target_class',
    'logical_binding_identity',
    'logical_binding_identity_sha256',
    'mime_type',
    'pre_cutover_or_previous_drive_binding_snapshot',
    'r2_object_key',
    'receipt_id',
    'schema',
    'size_bytes',
    'source_byte_sha256',
    'status',
    'storage_authority',
    'written_at'
  ].sort();
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt) ||
      JSON.stringify(Object.keys(receipt).sort()) !== JSON.stringify(fields)) {
    throw new Error('R2_PRIMARY_RECEIPT_INVALID');
  }
  if (receipt.schema !== H3_RUNTIME_R2_RECEIPT_SCHEMA_ ||
      receipt.asset_class !== input.asset_class ||
      receipt.storage_authority !== H3_RUNTIME_R2_STORAGE_AUTHORITY_ ||
      receipt.status !== 'COMMITTED' ||
      receipt.mime_type !== input.mime_type ||
      receipt.drive_rollback_target_class !==
        input.drive_rollback_target_class ||
      !Number.isInteger(receipt.size_bytes) ||
      receipt.size_bytes !== input.bytes.length ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        String(receipt.written_at || '')
      )) {
    throw new Error('R2_PRIMARY_RECEIPT_INVALID');
  }

  var receiptIdentity = h3RuntimeR2CanonicalRecord_(
    receipt.logical_binding_identity,
    'R2_PRIMARY_RECEIPT_INVALID',
    input.spec.identity_fields
  );
  if (JSON.stringify(receiptIdentity) !==
      JSON.stringify(input.logical_binding_identity)) {
    throw new Error('R2_PRIMARY_RECEIPT_IDENTITY_MISMATCH');
  }

  var receiptSnapshot = h3RuntimeR2CanonicalNullableRecord_(
    receipt.pre_cutover_or_previous_drive_binding_snapshot,
    'R2_PRIMARY_RECEIPT_INVALID'
  );
  if (JSON.stringify(receiptSnapshot) !==
      JSON.stringify(input.pre_cutover_or_previous_drive_binding_snapshot)) {
    throw new Error('R2_PRIMARY_RECEIPT_DRIVE_SNAPSHOT_MISMATCH');
  }

  var identityJson = JSON.stringify(input.logical_binding_identity);
  var identityHash = h3RuntimeR2Sha256Text_(
    input.asset_class + '\n' + identityJson
  );
  var sourceHash = h3RuntimeR2Sha256Bytes_(input.bytes);
  var receiptId = h3RuntimeR2Sha256Text_(
    H3_RUNTIME_R2_RECEIPT_SCHEMA_ + '\n' +
      input.asset_class + '\n' + identityHash
  );

  if (receipt.logical_binding_identity_sha256 !== identityHash ||
      receipt.source_byte_sha256 !== sourceHash ||
      receipt.receipt_id !== receiptId ||
      receipt.r2_object_key !== input.spec.object_prefix + sourceHash ||
      !/^[0-9a-f]{64}$/.test(String(receipt.receipt_id || '')) ||
      !/^[0-9a-f]{64}$/.test(
        String(receipt.logical_binding_identity_sha256 || '')
      ) ||
      !/^[0-9a-f]{64}$/.test(String(receipt.source_byte_sha256 || ''))) {
    throw new Error('R2_PRIMARY_RECEIPT_HASH_MISMATCH');
  }
  return receipt;
}

function h3RuntimeAssetWriteR2_(request) {
  var input = h3RuntimeR2ValidateInput_(request);
  var receipt = h3RuntimeRpc_('ASSET_WRITE_R2', {
    asset_class: input.asset_class,
    logical_binding_identity: input.logical_binding_identity,
    bytes_base64: Utilities.base64Encode(input.bytes),
    mime_type: input.mime_type,
    written_at: input.written_at,
    pre_cutover_or_previous_drive_binding_snapshot:
      input.pre_cutover_or_previous_drive_binding_snapshot,
    drive_rollback_target_class: input.drive_rollback_target_class
  });
  return h3RuntimeR2ValidateReceipt_(receipt, input);
}

function h3RuntimeRetainedListening_(setId) {
  if (!/^H3-\d{8}-L\d{2,3}$/.test(String(setId || ''))) {
    throw new Error('LISTENING_RENDER_REQUEST_INVALID');
  }
  var spreadsheet = SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var payloadSheet = spreadsheet.getSheetByName('listening_set_payload_v1');
  var k1Sheet = spreadsheet.getSheetByName('listening_k1_ready_v1');
  if (!payloadSheet || !k1Sheet) {
    throw new Error('RETAINED_DRIVE_ASSET_INVALID');
  }
  var table = h3ProdSheetRows_(payloadSheet);
  h3ProdRequireColumns_(table, [
    'LISTENING_SET_ID', 'K1_READY_ID', 'AUDIO_BINDING_JSON'
  ], 'listening_set_payload_v1');
  var row = h3ProdOneRowBy_(
    table, 'LISTENING_SET_ID', setId, 'listening_set_payload_v1'
  ).row;
  var k1Id = String(row[table.map.K1_READY_ID] || '');
  if (!k1Id) throw new Error('RETAINED_DRIVE_ASSET_INVALID');
  var kt = h3ProdSheetRows_(k1Sheet);
  h3ProdRequireColumns_(kt, [
    'K1_READY_ID', 'BOUND_LISTENING_SET_ID', 'IMAGE_FILE_ID',
    'IMAGE_URL', 'IMAGE_SHA256'
  ], 'listening_k1_ready_v1');
  var imageRow = h3ProdOneRowBy_(
    kt, 'K1_READY_ID', k1Id, 'listening_k1_ready_v1'
  ).row;
  if (String(imageRow[kt.map.BOUND_LISTENING_SET_ID] || '') !== setId) {
    throw new Error('ASSET_IDENTITY_MISMATCH');
  }
  var imageHash = String(imageRow[kt.map.IMAGE_SHA256] || '');
  var imageId = String(imageRow[kt.map.IMAGE_FILE_ID] || '');
  var imageUrl = String(imageRow[kt.map.IMAGE_URL] || '');
  if (!/^[0-9a-f]{64}$/.test(imageHash) || !imageId || !imageUrl) {
    throw new Error('RETAINED_DRIVE_ASSET_INVALID');
  }
  var image = h3DriveDataUri_(
    imageId, 'image/jpeg', imageHash, 1024 * 1024
  );
  var binding = h3ProdParseJson_(
    row[table.map.AUDIO_BINDING_JSON], 'RETAINED_AUDIO_BINDING_INVALID'
  );
  var audio = {};
  ['K1', 'K2', 'K3', 'K4', 'K5'].forEach(function (section) {
    var item = binding && binding.individual &&
      binding.individual[section];
    if (!item || !item.audio_file_id || !item.audio_url ||
        !item.payload_hash || !item.listen_gen_id) {
      throw new Error('RETAINED_DRIVE_ASSET_INVALID');
    }
    audio[section] = {
      set_id: setId, slot_key: section,
      payload_hash: String(item.payload_hash),
      file_id: String(item.audio_file_id),
      url: String(item.audio_url),
      listen_gen_id: String(item.listen_gen_id)
    };
  });
  return {
    image: {
      set_id: setId, slot_key: 'K1_IMAGE', sha256: imageHash,
      file_id: imageId, url: imageUrl,
      data_uri: image.data_uri, size_bytes: image.size_bytes
    },
    audio: audio,
    audio_binding_sha256: h3ReviewHash_(binding)
  };
}

function h3RuntimeReviewRequestPayload_(request) {
  var setId = String(request && request.set_id || '');
  var kind = String(request && request.review_kind || '');
  var family = String(request && request.surface_family || '');
  if (!setId ||
      ['LISTENING', 'WRITTEN'].indexOf(kind) < 0 ||
      ['5L', '5W', 'READING', 'TRANSLATION'].indexOf(family) < 0 ||
      (family === '5L' && kind !== 'LISTENING') ||
      (family !== '5L' && kind !== 'WRITTEN')) {
    throw new Error('REVIEW_RENDER_REQUEST_INVALID');
  }
  var txnId = String(request && request.txn_id || '');
  var legacyReviewId = String(request && request.legacy_review_id || '');
  if (txnId && legacyReviewId) {
    throw new Error('REVIEW_RENDER_REQUEST_INVALID');
  }
  var legacySourceId = txnId || legacyReviewId;
  var reviewSourceId = String(request && request.review_source_id || '');
  if (reviewSourceId && legacySourceId &&
      reviewSourceId !== legacySourceId) {
    throw new Error('REVIEW_SOURCE_ID_MISMATCH');
  }
  if (!reviewSourceId) reviewSourceId = legacySourceId;

  var payload = {
    schema: request.schema,
    mode: request.mode,
    set_id: setId,
    review_kind: kind,
    surface_family: family
  };
  if (reviewSourceId) payload.review_source_id = reviewSourceId;
  return payload;
}

function h3RuntimeHydrateListeningReview_(payload) {
  if (!payload || payload.mode !== 'REVIEW' ||
      String(payload.kind || payload.provider_kind || '') !== 'LISTENING' ||
      String(payload.surface_family || '') !== '5L' ||
      !payload.set_id || !Array.isArray(payload.sections) ||
      payload.sections.length !== 5 || !payload.technical) {
    throw new Error('LISTENING_REVIEW_HYDRATION_INVALID');
  }
  var expectedImageHash = String(
    payload.technical.k1_image_sha256 || ''
  );
  var expectedAudioBindingHash = String(
    payload.technical.audio_binding_sha256 || ''
  );
  if (!/^[0-9a-f]{64}$/.test(expectedImageHash) ||
      !/^[0-9a-f]{64}$/.test(expectedAudioBindingHash)) {
    throw new Error('LISTENING_REVIEW_HYDRATION_INVALID');
  }

  var retained = h3RuntimeRetainedListening_(payload.set_id);
  if (retained.image.sha256 !== expectedImageHash ||
      retained.audio_binding_sha256 !== expectedAudioBindingHash) {
    throw new Error('ASSET_HASH_MISMATCH');
  }

  var out = JSON.parse(JSON.stringify(payload));
  ['K1', 'K2', 'K3', 'K4', 'K5'].forEach(function (section) {
    var matches = out.sections.filter(function (part) {
      return part && String(part.section || '') === section;
    });
    if (matches.length !== 1 || !retained.audio[section]) {
      throw new Error('LISTENING_REVIEW_HYDRATION_INVALID');
    }
    matches[0].audio_asset_key = section;
    matches[0].audio_fallback_url = retained.audio[section].url;
  });

  var k1 = out.sections.filter(function (part) {
    return part && String(part.section || '') === 'K1';
  })[0];
  if (!k1.question_surface ||
      typeof k1.question_surface !== 'object' ||
      Array.isArray(k1.question_surface)) {
    throw new Error('LISTENING_REVIEW_HYDRATION_INVALID');
  }
  k1.question_surface.image_file_id = retained.image.file_id;
  k1.question_surface.image_url = retained.image.url;
  k1.question_surface.image_sha256 = retained.image.sha256;
  k1.question_surface.image_data_uri = retained.image.data_uri;
  k1.question_surface.image_size_bytes = retained.image.size_bytes;
  return out;
}

function h3RuntimeRender_(request) {
  if (!request || request.schema !== 'H3_WEB_RENDER_REQUEST_V1') {
    throw new Error('RENDER_REQUEST_INVALID');
  }
  var payload;
  if (request.mode === 'REVIEW') {
    payload = h3RuntimeReviewRequestPayload_(request);
  } else {
    payload = {
      schema: request.schema,
      mode: request.mode
    };
    ['set_id', 'review_kind', 'surface_family', 'review_source_id'].forEach(
      function (key) {
        if (request[key] !== undefined && request[key] !== null) {
          payload[key] = request[key];
        }
      }
    );
  }
  if (request.mode === 'LISTENING') {
    payload.hydrated = h3RuntimeRetainedListening_(request.set_id);
  }
  var result = h3RuntimeRpc_('RENDER', payload);
  if (!result || result.mode !== request.mode ||
      (request.set_id && result.set_id !== request.set_id)) {
    throw new Error('H3_RUNTIME_RENDER_IDENTITY_MISMATCH');
  }
  if (request.mode === 'REVIEW') {
    if (result.surface_family === '5L') {
      return h3RuntimeHydrateListeningReview_(result);
    }
    if (['5W', 'READING', 'TRANSLATION'].indexOf(
      result.surface_family
    ) >= 0) {
      return h3RuntimeHydrateReviewAudio_(result);
    }
  }
  return result;
}

function h3RuntimeReviewD4FallbackScript_(payload, q, error) {
  var code = String(
    error && error.message || error || ''
  );
  if (
    code !== 'REVIEW_AUDIO_5W_D4_REPLACEMENT_UNRESOLVED' ||
    !payload ||
    payload.schema !==
      'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1' ||
    !q ||
    String(q.section || '') !== 'D4' ||
    !q.question_surface ||
    typeof q.question_surface !== 'object'
  ) {
    throw error;
  }

  var surface = String(
    q.question_surface.rendered ||
    q.question_surface.body ||
    q.question_body ||
    ''
  );
  var originalLines =
    h3ReviewAudioExtractHangulLines_(surface);
  var correct =
    String(q.correct_answer_text || '').trim();
  if (!originalLines.length || !correct) {
    throw error;
  }

  var original = originalLines[0];
  var replacement = correct;
  var terminal = original.match(/[.!?。？！]$/);
  if (
    terminal &&
    !/[.!?。？！]$/.test(replacement)
  ) {
    replacement += terminal[0];
  }

  return h3ReviewAudioNormalizeText_(
    original + '\n' + replacement
  );
}

function h3RuntimePersistentD4Script_(q) {
  var script = h3ReviewAudioNormalizeText_(
    q && q.script_text || ''
  );
  if (!script) return '';

  var lines = script.split('\n')
    .map(function (line) { return line.trim(); })
    .filter(Boolean);
  if (
    lines.length !== 2 ||
    lines.some(function (line) {
      return !/[가-힣]/.test(line) ||
        /^[①②③④]/.test(line) ||
        /\[[^\]]+\]/.test(line);
    })
  ) {
    return '';
  }

  var surfaceValue = q && q.question_surface;
  var surface = surfaceValue && typeof surfaceValue === 'object'
    ? String(
        surfaceValue.rendered ||
        surfaceValue.body ||
        q.question_body ||
        ''
      )
    : String(surfaceValue || q && q.question_body || '');
  var originalLines = h3ReviewAudioExtractHangulLines_(surface);
  var original = originalLines.length
    ? originalLines[0].replace(/\[([^\]]+)\]/g, '$1')
    : '';
  var correct = String(q && q.correct_answer_text || '').trim();

  if (
    !original ||
    !correct ||
    lines[0] !== original ||
    lines[1].indexOf(correct) < 0
  ) {
    return '';
  }
  return script;
}

function h3RuntimeReviewAudioTexts_(payload) {
  var family = String(payload.surface_family || '');
  var setId = String(payload.set_id || '');
  var out = {};
  if (family === '5W') {
    if (!Array.isArray(payload.sections) ||
        payload.sections.length !== 5) {
      throw new Error('REVIEW_AUDIO_5W_QUESTION_COUNT');
    }
    payload.sections.forEach(function (q, i) {
      var sec = String(q.section || 'D' + (i + 2));
      var script = String(q.script_text || '').trim() ||
        h3ReviewAudioLegacy5WScript_(q);
      var persistentD4Script = (
        payload.schema === 'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1' &&
        sec === 'D4'
      ) ? h3RuntimePersistentD4Script_(q) : '';
      if (persistentD4Script) {
        script = persistentD4Script;
      } else if (
        payload.schema === 'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1' &&
        q.question_surface &&
        typeof q.question_surface === 'object'
      ) {
        var legacyQ = JSON.parse(JSON.stringify(q));
        legacyQ.question_surface =
          String(q.question_surface.rendered || q.question_surface.body || '');
        legacyQ.explanation_text =
          String(q.explanation && q.explanation.text || '');
        try {
          script = h3ReviewAudioLegacy5WScript_(legacyQ);
        } catch (error) {
          script = h3RuntimeReviewD4FallbackScript_(
            payload, q, error
          );
        }
        q = legacyQ;
      }
      out[sec] = h3ReviewAudioCanonicalize5WScript_(
        q, sec, script, setId
      );
    });
  } else if (family === 'READING') {
    if (!payload.passage || !Array.isArray(payload.questions) ||
        payload.questions.length !== 2) {
      throw new Error('REVIEW_AUDIO_2R_QUESTION_COUNT');
    }
    var selection = h3ReviewAudioReadingFillChoice_(
      payload.questions[0]
    );
    out.PASSAGE_COMPLETE = h3ReviewAudioReadingPassagePrepared_(
      setId,
      h3ReviewAudioFillBlank_(
        payload.passage.text_ko, selection.text
      )
    ).text;
    payload.questions.forEach(function (q, i) {
      var choices = (q.choices_ko || []).map(String);
      if (choices.length !== 4) {
        throw new Error('REVIEW_AUDIO_2R_CHOICES_INVALID');
      }
      out['Q' + (i + 1) + '_CHOICES'] = choices.join('\n');
    });
  } else if (family === 'TRANSLATION') {
    if (!Array.isArray(payload.questions) ||
        payload.questions.length !== 2) {
      throw new Error('REVIEW_AUDIO_2T_QUESTION_COUNT');
    }
    payload.questions.forEach(function (q) {
      var sec = String(q.section || q.section_key || '');
      var text;
      if (sec === 'P11') {
        text = String(q.question_text || '').trim();
      } else if (sec === 'P12') {
        var pos = Number(q.correct_answer ||
          q.correct_answer_position || 0);
        if (!Array.isArray(q.choices) || pos < 1 ||
            pos > q.choices.length) {
          throw new Error('REVIEW_AUDIO_2T_CHOICE_INVALID');
        }
        text = String(q.choices[pos - 1] || '').trim();
      } else {
        throw new Error('REVIEW_AUDIO_2T_SECTION_INVALID');
      }
      out[sec + '_Q' + String(q.q_no || '')] = text;
    });
  } else {
    throw new Error('REVIEW_AUDIO_FAMILY_INVALID');
  }
  return out;
}

function h3RuntimeHydrateReviewAudio_(payload) {
  var expected = h3ReviewAudioExpectedBindings_(payload);
  var texts = h3RuntimeReviewAudioTexts_(payload);
  var spreadsheet = SpreadsheetApp.openById(
    H3_WEB_RUNTIME_SPREADSHEET_ID
  );
  var bindings = expected.map(function (item) {
    var text = h3ReviewAudioNormalizeText_(texts[item.slot_key]);
    if (!text || !/[가-힣]/.test(text)) {
      throw new Error('REVIEW_AUDIO_TEXT_INVALID');
    }
    var binding = h3ReviewAudioBindingResolve_(
      spreadsheet, item.surface_family, item.set_id, item.slot_key
    );
    if (binding.audio_text_sha256 !== h3ReviewAudioSha256_(text)) {
      throw new Error('ASSET_HASH_MISMATCH');
    }
    binding.target = item.target;
    binding.target_index = item.target_index;
    binding.q_no = item.q_no;
    return binding;
  });
  if (payload.surface_family === '5W') {
    return h3ReviewAudioApply5WBindings_(payload, bindings);
  }
  if (payload.surface_family === 'READING') {
    return h3ReviewAudioApplyReadingBindings_(payload, bindings);
  }
  return h3ReviewAudioApplyTranslationBindings_(payload, bindings);
}

function h3RuntimeListeningMedia_(request) {
  var setId = String(request && request.set_id || '');
  var section = String(request && request.asset_key || '');
  if (['K1', 'K2', 'K3', 'K4', 'K5'].indexOf(section) < 0) {
    throw new Error('PRODUCTION_MEDIA_ASSET_KEY_INVALID');
  }
  var surface = h3RuntimeRender_({
    schema: 'H3_WEB_RENDER_REQUEST_V1',
    mode: 'LISTENING', set_id: setId
  });
  if (!surface || surface.schema !== 'H3_WEB_SET_V1' ||
      surface.questions.length !== 5) {
    throw new Error('H3_RUNTIME_RENDER_IDENTITY_MISMATCH');
  }
  var hydrated = h3RuntimeRetainedListening_(setId);
  var binding = hydrated.audio[section];
  if (surface.questions[['K1','K2','K3','K4','K5'].indexOf(section)]
        .audio_fallback_url !== binding.url) {
    throw new Error('ASSET_IDENTITY_MISMATCH');
  }
  var media = h3DriveDataUri_(
    binding.file_id, 'audio/mpeg', null, 8 * 1024 * 1024
  );
  return {
    schema: 'H3_WEB_MEDIA_V1', mode: 'LISTENING',
    set_id: setId, asset_key: section,
    data_uri: media.data_uri, mime_type: media.mime_type,
    size_bytes: media.size_bytes, trim_start_ms: 0,
    fallback_url: binding.url
  };
}

function h3RuntimeReviewMedia_(request) {
  if (!request || request.schema !== 'H3_WEB_MEDIA_REQUEST_V1' ||
      request.mode !== 'REVIEW' || !request.set_id ||
      !request.asset_key || !request.review_kind ||
      !request.surface_family) {
    throw new Error('REVIEW_MEDIA_REQUEST_INVALID');
  }
  if (['5L', '5W', 'READING', 'TRANSLATION'].indexOf(
    request.surface_family
  ) < 0) {
    throw new Error('REVIEW_MEDIA_ASSET_NOT_ALLOWLISTED');
  }
  var review = h3RuntimeRender_({
    schema: 'H3_WEB_RENDER_REQUEST_V1',
    mode: 'REVIEW',
    set_id: request.set_id,
    review_kind: request.review_kind,
    surface_family: request.surface_family,
    review_source_id: request.review_source_id
  });
  if (review.surface_family === '5L') {
    var section = String(request.asset_key || '');
    if (['K1', 'K2', 'K3', 'K4', 'K5'].indexOf(section) < 0 ||
        String(review.kind || review.provider_kind || '') !== 'LISTENING') {
      throw new Error('REVIEW_MEDIA_ASSET_NOT_ALLOWLISTED');
    }
    var retained = h3RuntimeRetainedListening_(review.set_id);
    var binding5L = retained.audio[section];
    var matches5L = Array.isArray(review.sections)
      ? review.sections.filter(function (part) {
          return part && String(part.section || '') === section;
        })
      : [];
    if (!binding5L || matches5L.length !== 1 ||
        String(matches5L[0].audio_fallback_url || '') !== binding5L.url) {
      throw new Error('ASSET_IDENTITY_MISMATCH');
    }
    var media5L = h3DriveDataUri_(
      binding5L.file_id, 'audio/mpeg', null, 8 * 1024 * 1024
    );
    return {
      schema: 'H3_WEB_MEDIA_V1', mode: 'REVIEW', read_only: true,
      provider_kind: 'LISTENING', surface_family: '5L',
      set_id: review.set_id, asset_key: section,
      data_uri: media5L.data_uri, mime_type: media5L.mime_type,
      size_bytes: media5L.size_bytes, trim_start_ms: 0,
      fallback_url: binding5L.url
    };
  }

  var expected = h3ReviewAudioExpectedBindings_(review).filter(
    function (item) {
      return item.slot_key === request.asset_key;
    }
  );
  if (expected.length !== 1) {
    throw new Error('REVIEW_MEDIA_ASSET_NOT_ALLOWLISTED');
  }
  var spreadsheet = SpreadsheetApp.openById(
    H3_WEB_RUNTIME_SPREADSHEET_ID
  );
  var binding = h3ReviewAudioBindingResolve_(
    spreadsheet, review.surface_family, review.set_id,
    expected[0].slot_key
  );
  var text = h3ReviewAudioNormalizeText_(
    h3RuntimeReviewAudioTexts_(review)[expected[0].slot_key]
  );
  if (binding.audio_text_sha256 !== h3ReviewAudioSha256_(text)) {
    throw new Error('ASSET_HASH_MISMATCH');
  }
  var media = h3DriveDataUri_(
    binding.audio_file_id, 'audio/mpeg', null, 8 * 1024 * 1024
  );
  return {
    schema: 'H3_WEB_MEDIA_V1', mode: 'REVIEW', read_only: true,
    provider_kind: 'WRITTEN', surface_family: review.surface_family,
    set_id: review.set_id, asset_key: binding.asset_key,
    data_uri: media.data_uri, mime_type: media.mime_type,
    size_bytes: media.size_bytes, trim_start_ms: 0,
    fallback_url: binding.audio_url,
    review_audio_binding_contract_id:
      H3_REVIEW_AUDIO_BINDING_CONTRACT_ID_
  };
}

/** Runtime mutation gate. Call again after taking each legacy mutation lock. */
function h3RuntimeRequireLegacyMutation_() {
  var mode = h3RuntimeAuthority_();
  if (mode !== 'LEGACY') {
    throw new Error(mode === 'QUIESCED'
      ? 'H3_RUNTIME_QUIESCED' : 'H3_RUNTIME_D1_LEGACY_WRITE_FORBIDDEN');
  }
}

function h3RuntimeSubmit_(request) {
  return h3RuntimeRpc_('SUBMIT', request);
}

function h3RuntimeReviewComplete_(request) {
  return h3RuntimeRpc_('REVIEW_COMPLETE', request);
}

function h3RuntimeErrorEvent_(request) {
  return h3RuntimeRpc_('ERROR_EVENT', request);
}

/** The mode setter never logs or reads the bearer value. */
function h3RuntimeSetAuthority_(expectedMode, nextMode, expectedLock, nextLock) {
  if (['LEGACY','QUIESCED','D1'].indexOf(expectedMode) < 0 ||
      ['LEGACY','QUIESCED','D1'].indexOf(nextMode) < 0 ||
      ['0','1'].indexOf(expectedLock) < 0 ||
      ['0','1'].indexOf(nextLock) < 0) {
    throw new Error('H3_RUNTIME_AUTHORITY_TRANSITION_INVALID');
  }
  var allowedTransition =
    (expectedMode === 'LEGACY' && expectedLock === '0' &&
      nextMode === 'QUIESCED' && nextLock === '0') ||
    (expectedMode === 'QUIESCED' && expectedLock === '0' &&
      nextMode === 'D1' && nextLock === '1') ||
    (expectedMode === 'QUIESCED' && expectedLock === '0' &&
      nextMode === 'LEGACY' && nextLock === '0') ||
    (expectedMode === 'D1' && expectedLock === '1' &&
      nextMode === 'QUIESCED' && nextLock === '1');
  if (!allowedTransition) {
    throw new Error('H3_RUNTIME_AUTHORITY_TRANSITION_FORBIDDEN');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('H3_RUNTIME_AUTHORITY_MODE') !== expectedMode ||
        props.getProperty('H3_RUNTIME_CUTOVER_LOCKED') !== expectedLock) {
      throw new Error('H3_RUNTIME_AUTHORITY_TRANSITION_CONFLICT');
    }
    if (nextMode === 'D1') {
      if (nextLock !== '1' ||
          props.getProperty('H3_RUNTIME_BACKEND_BASE_URL') !== H3_RUNTIME_EXPECTED_WORKER_URL_ ||
          !props.getProperty('H3_RUNTIME_BEARER_TOKEN')) {
        throw new Error('H3_RUNTIME_D1_PREREQUISITE_INVALID');
      }
      var health = h3RuntimeRpc_('HEALTH', {});
      if (!health || health.status !== 'PASS' || health.database !== 'AVAILABLE') {
        throw new Error('H3_RUNTIME_D1_HEALTH_INVALID');
      }
    }
    if (nextMode === 'LEGACY' && nextLock !== '0') {
      throw new Error('H3_RUNTIME_LEGACY_LOCK_INVALID');
    }
    props.setProperties({
      H3_RUNTIME_AUTHORITY_MODE: nextMode,
      H3_RUNTIME_CUTOVER_LOCKED: nextLock
    }, false);
    if (props.getProperty('H3_RUNTIME_AUTHORITY_MODE') !== nextMode ||
        props.getProperty('H3_RUNTIME_CUTOVER_LOCKED') !== nextLock) {
      throw new Error('H3_RUNTIME_AUTHORITY_READBACK_MISMATCH');
    }
    return {mode:nextMode,cutover_locked:nextLock};
  } finally {
    lock.releaseLock();
  }
}
