/**
 * P3 retained Drive hydration for D1-authoritative read/render.
 * The Sheet is read only for asset references keyed by the Worker-selected set.
 */
var H3_RUNTIME_EXPECTED_WORKER_URL_ =
  'https://hangul-runtime-prod.akinari-fujimoto.workers.dev';
var H3_RUNTIME_RPC_PATH_ = '/__internal/h3/runtime/v1';

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
  if (locked === '1' && mode !== 'D1') {
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
    audio: audio
  };
}

function h3RuntimeRender_(request) {
  if (!request || request.schema !== 'H3_WEB_RENDER_REQUEST_V1') {
    throw new Error('RENDER_REQUEST_INVALID');
  }
  var payload = {
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
  if (request.mode === 'LISTENING') {
    payload.hydrated = h3RuntimeRetainedListening_(request.set_id);
  }
  var result = h3RuntimeRpc_('RENDER', payload);
  if (!result || result.mode !== request.mode ||
      (request.set_id && result.set_id !== request.set_id)) {
    throw new Error('H3_RUNTIME_RENDER_IDENTITY_MISMATCH');
  }
  return result;
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
