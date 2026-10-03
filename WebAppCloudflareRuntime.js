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


var H3_RUNTIME_PRIVATE_MEDIA_PATH_ =
  '/__internal/h3/media/v1';

function h3RuntimePrivateMediaHeaders_(response) {
  return response.getAllHeaders
    ? response.getAllHeaders()
    : response.getHeaders();
}

function h3RuntimePrivateMediaHeader_(headers,name) {
  var target=String(name||'').toLowerCase();
  var value='';
  Object.keys(headers||{}).some(function(key){
    if(String(key).toLowerCase()===target){
      value=String(headers[key]||'');
      return true;
    }
    return false;
  });
  return value;
}

function h3RuntimePrivateMediaRequest_(
  assetClass,identity,range,maxBytes
) {
  var spec=h3RuntimeR2AssetSpec_(assetClass);
  var canonical=h3RuntimeR2CanonicalRecord_(
    identity,
    'MEDIA_IDENTITY_INVALID',
    spec.identity_fields
  );
  var props=PropertiesService.getScriptProperties();
  var baseUrl=props.getProperty(
    'H3_RUNTIME_BACKEND_BASE_URL'
  );
  if(baseUrl!==H3_RUNTIME_EXPECTED_WORKER_URL_){
    throw new Error('H3_RUNTIME_BACKEND_INVALID');
  }
  var token=props.getProperty(
    'H3_RUNTIME_BEARER_TOKEN'
  );
  if(!token)throw new Error('H3_RUNTIME_TOKEN_MISSING');

  var query=[
    'asset_class='+encodeURIComponent(String(assetClass))
  ];
  spec.identity_fields.forEach(function(field){
    query.push(
      encodeURIComponent(field)+'='+
      encodeURIComponent(canonical[field])
    );
  });
  var headers={
    Authorization:'Bearer '+token
  };
  if(range)headers.Range=range;
  var response=UrlFetchApp.fetch(
    baseUrl+H3_RUNTIME_PRIVATE_MEDIA_PATH_+
      '?'+query.join('&'),
    {
      method:'get',
      headers:headers,
      muteHttpExceptions:true
    }
  );
  var code=response.getResponseCode();
  var all=h3RuntimePrivateMediaHeaders_(response);
  var mime=h3RuntimePrivateMediaHeader_(
    all,'Content-Type'
  ).split(';')[0].trim();
  if(spec.mime_types.indexOf(mime)<0){
    throw new Error('MEDIA_MIME_MISMATCH');
  }
  var bytes=response.getContent();
  if(range){
    if(
      code!==206 ||
      bytes.length!==1 ||
      !/^bytes 0-0\/\d+$/.test(
        h3RuntimePrivateMediaHeader_(
          all,'Content-Range'
        )
      )
    ){
      throw new Error(
        'MEDIA_RECEIPT_READBACK_MISMATCH'
      );
    }
  }else if(
    code!==200 ||
    !bytes.length ||
    bytes.length>Number(maxBytes||0)
  ){
    throw new Error('MEDIA_BODY_INVALID');
  }
  return{
    bytes:bytes,
    mime_type:mime,
    size_bytes:bytes.length
  };
}

function h3RuntimePrivateMediaProbe_(
  assetClass,identity
) {
  h3RuntimePrivateMediaRequest_(
    assetClass,identity,'bytes=0-0',1
  );
  return true;
}

function h3RuntimePrivateMediaDataUri_(
  assetClass,identity,maxBytes
) {
  var media=h3RuntimePrivateMediaRequest_(
    assetClass,identity,'',maxBytes
  );
  return{
    data_uri:
      'data:'+media.mime_type+';base64,'+
      Utilities.base64Encode(media.bytes),
    mime_type:media.mime_type,
    size_bytes:media.size_bytes
  };
}

function h3RuntimeAudioBindingAuthority_(binding) {
  if(
    !binding ||
    typeof binding!=='object' ||
    Array.isArray(binding)
  )throw new Error('AUDIO_BINDING_INVALID');
  var fileId=String(binding.audio_file_id||'');
  var url=String(binding.audio_url||'');
  var authority=String(
    binding.storage_authority||''
  );
  if(!authority && fileId && url){
    authority='GOOGLE_DRIVE';
  }
  if(authority==='GOOGLE_DRIVE'){
    if(!fileId||!url){
      throw new Error('AUDIO_DRIVE_BINDING_INVALID');
    }
    return authority;
  }
  if(authority==='CLOUDFLARE_R2_PRIVATE'){
    if(fileId||url){
      throw new Error('AUDIO_R2_FAKE_DRIVE_BINDING');
    }
    return authority;
  }
  throw new Error('AUDIO_STORAGE_AUTHORITY_INVALID');
}

function h3RuntimeAudioMedia_(
  binding,assetClass,identity,maxBytes
) {
  var authority=h3RuntimeAudioBindingAuthority_(
    binding
  );
  if(authority==='GOOGLE_DRIVE'){
    var drive=h3DriveDataUri_(
      String(binding.audio_file_id),
      'audio/mpeg',
      null,
      maxBytes
    );
    return{
      data_uri:drive.data_uri,
      mime_type:drive.mime_type,
      size_bytes:drive.size_bytes,
      fallback_url:String(binding.audio_url)
    };
  }
  var r2=h3RuntimePrivateMediaDataUri_(
    assetClass,identity,maxBytes
  );
  return{
    data_uri:r2.data_uri,
    mime_type:r2.mime_type,
    size_bytes:r2.size_bytes,
    fallback_url:''
  };
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
    if (!item || !item.payload_hash || !item.listen_gen_id) {
      throw new Error('RETAINED_AUDIO_BINDING_INVALID');
    }
    var authority =
      h3RuntimeAudioBindingAuthority_(item);
    audio[section] = {
      set_id: setId, slot_key: section,
      payload_hash: String(item.payload_hash),
      file_id: String(item.audio_file_id || ''),
      url: String(item.audio_url || ''),
      listen_gen_id: String(item.listen_gen_id),
      storage_authority: authority
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
  var media = h3RuntimeAudioMedia_(
    {
      audio_file_id: binding.file_id,
      audio_url: binding.url,
      storage_authority:
        binding.storage_authority
    },
    'LISTENING_AUDIO_INDIVIDUAL',
    {
      set_id: setId,
      slot_key: section,
      listen_gen_id:
        binding.listen_gen_id
    },
    8 * 1024 * 1024
  );
  return {
    schema: 'H3_WEB_MEDIA_V1', mode: 'LISTENING',
    set_id: setId, asset_key: section,
    data_uri: media.data_uri, mime_type: media.mime_type,
    size_bytes: media.size_bytes, trim_start_ms: 0,
    fallback_url: media.fallback_url
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
    var media5L = h3RuntimeAudioMedia_(
      {
        audio_file_id: binding5L.file_id,
        audio_url: binding5L.url,
        storage_authority:
          binding5L.storage_authority
      },
      'LISTENING_AUDIO_INDIVIDUAL',
      {
        set_id: review.set_id,
        slot_key: section,
        listen_gen_id:
          binding5L.listen_gen_id
      },
      8 * 1024 * 1024
    );
    return {
      schema: 'H3_WEB_MEDIA_V1', mode: 'REVIEW', read_only: true,
      provider_kind: 'LISTENING', surface_family: '5L',
      set_id: review.set_id, asset_key: section,
      data_uri: media5L.data_uri, mime_type: media5L.mime_type,
      size_bytes: media5L.size_bytes, trim_start_ms: 0,
      fallback_url: media5L.fallback_url
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
  var media = h3RuntimeAudioMedia_(
    binding,
    'REVIEW_AUDIO',
    {
      surface_family:
        binding.sidecar_family,
      set_id: review.set_id,
      slot_key: binding.slot_key
    },
    8 * 1024 * 1024
  );
  return {
    schema: 'H3_WEB_MEDIA_V1', mode: 'REVIEW', read_only: true,
    provider_kind: 'WRITTEN', surface_family: review.surface_family,
    set_id: review.set_id, asset_key: binding.asset_key,
    data_uri: media.data_uri, mime_type: media.mime_type,
    size_bytes: media.size_bytes, trim_start_ms: 0,
    fallback_url: media.fallback_url,
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

/* =========================================================
 * MIG-ASSET-ACCEPTANCE-2 bounded read-only private-media audit.
 * Manual smoke only. Never returns bearer tokens or media bytes.
 * =======================================================*/
var H3_MIG_ASSET_ACCEPTANCE2_REQUEST_SCHEMA_ =
  'H3_MIG_ASSET_ACCEPTANCE_2_REQUEST_V1';
var H3_MIG_ASSET_ACCEPTANCE2_RESULT_SCHEMA_ =
  'H3_MIG_ASSET_ACCEPTANCE_2_RESULT_V1';
var H3_MIG_ASSET_ACCEPTANCE2_SOURCE_DIGEST_ =
  '36856256b637778475b0454ba469ac32f08d61cc1814b6f87cffb63f8c753f92';
var H3_MIG_ASSET_ACCEPTANCE2_MAX_BATCH_ = 12;

function h3MigAssetAcceptance2Fail_(code) {
  throw new Error(String(code || 'MIG_ASSET_ACCEPTANCE_2_FAILED'));
}

function h3MigAssetAcceptance2ExactKeys_(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    h3MigAssetAcceptance2Fail_(code);
  }
  var actual = Object.keys(value).sort();
  var wanted = expected.slice().sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    h3MigAssetAcceptance2Fail_(code);
  }
}

function h3MigAssetAcceptance2Fields_(assetClass) {
  var map = {
    REVIEW_AUDIO: ['surface_family','set_id','slot_key'],
    LISTENING_AUDIO_INDIVIDUAL: ['set_id','slot_key','listen_gen_id'],
    LISTENING_AUDIO_COMBINED: ['set_id','slot_key','parent_set_id'],
    LISTENING_K1_IMAGE: ['k1_ready_id','bound_listening_set_id']
  };
  var fields = map[String(assetClass || '')];
  if (!fields) h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_CLASS_INVALID');
  return fields;
}

function h3MigAssetAcceptance2Target_(value) {
  h3MigAssetAcceptance2ExactKeys_(
    value,
    ['asset_class','identity','mime_type','size_bytes','source_byte_sha256'],
    'MIG_ASSET_ACCEPTANCE_2_TARGET_SHAPE_INVALID'
  );
  var assetClass = String(value.asset_class || '');
  var fields = h3MigAssetAcceptance2Fields_(assetClass);
  h3MigAssetAcceptance2ExactKeys_(
    value.identity,
    fields,
    'MIG_ASSET_ACCEPTANCE_2_IDENTITY_SHAPE_INVALID'
  );
  var identity = {};
  fields.forEach(function(field) {
    var v = String(value.identity[field] || '');
    if (!v) h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_IDENTITY_INVALID');
    identity[field] = v;
  });
  var sha = String(value.source_byte_sha256 || '');
  if (!/^[0-9a-f]{64}$/.test(sha)) {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_SHA_INVALID');
  }
  var size = Number(value.size_bytes);
  if (!Number.isInteger(size) || size < 1) {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_SIZE_INVALID');
  }
  var mime = String(value.mime_type || '');
  var allowed = assetClass === 'LISTENING_K1_IMAGE'
    ? ['image/png','image/jpeg','image/webp']
    : ['audio/mpeg'];
  if (allowed.indexOf(mime) < 0) {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_MIME_INVALID');
  }
  return {
    asset_class: assetClass,
    identity: identity,
    source_byte_sha256: sha,
    size_bytes: size,
    mime_type: mime
  };
}

function h3MigAssetAcceptance2Fetch_(target, range, authMode, variant) {
  var props = PropertiesService.getScriptProperties();
  var baseUrl = String(props.getProperty('H3_RUNTIME_BACKEND_BASE_URL') || '');
  if (baseUrl !== H3_RUNTIME_EXPECTED_WORKER_URL_) {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_BACKEND_INVALID');
  }
  var token = String(props.getProperty('H3_RUNTIME_BEARER_TOKEN') || '');
  if (!token) h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_TOKEN_MISSING');

  var fields = h3MigAssetAcceptance2Fields_(target.asset_class);
  var query = ['asset_class=' + encodeURIComponent(target.asset_class)];
  fields.forEach(function(field, index) {
    if (variant === 'MISSING_FIELD' && index === 0) return;
    var value = target.identity[field];
    if (variant === 'NOT_FOUND' && index === 0) {
      value += '__H3_ACCEPTANCE2_MISSING__';
    }
    query.push(
      encodeURIComponent(field) + '=' +
      encodeURIComponent(value)
    );
  });
  if (variant === 'UNKNOWN_FIELD') {
    query.push('unexpected_acceptance_2=1');
  }

  var headers = {};
  if (authMode === 'REAL') {
    headers.Authorization = 'Bearer ' + token;
  } else if (authMode === 'INVALID') {
    headers.Authorization = 'Bearer H3_ACCEPTANCE2_INVALID_TOKEN';
  } else if (authMode !== 'NONE') {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_AUTH_MODE_INVALID');
  }
  if (range !== null && range !== undefined) headers.Range = String(range);

  var response = UrlFetchApp.fetch(
    baseUrl + H3_RUNTIME_PRIVATE_MEDIA_PATH_ + '?' + query.join('&'),
    {
      method: 'get',
      headers: headers,
      muteHttpExceptions: true
    }
  );
  return {
    status: response.getResponseCode(),
    headers: h3RuntimePrivateMediaHeaders_(response),
    bytes: response.getContent()
  };
}

function h3MigAssetAcceptance2RequireStatus_(response, expected, code) {
  if (!response || Number(response.status) !== Number(expected)) {
    h3MigAssetAcceptance2Fail_(code);
  }
}

function h3MigAssetAcceptance2Require416_(response, size) {
  h3MigAssetAcceptance2RequireStatus_(
    response, 416, 'MIG_ASSET_ACCEPTANCE_2_RANGE_STATUS_MISMATCH'
  );
  if (
    h3RuntimePrivateMediaHeader_(response.headers,'Accept-Ranges') !== 'bytes' ||
    h3RuntimePrivateMediaHeader_(response.headers,'Content-Range') !==
      'bytes */' + String(size) ||
    h3RuntimePrivateMediaHeader_(response.headers,'Content-Length') !== '0'
  ) {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_RANGE_HEADERS_MISMATCH');
  }
}

function h3MigAssetAcceptance2Batch_(request) {
  if (!Array.isArray(request.targets) ||
      request.targets.length < 1 ||
      request.targets.length > H3_MIG_ASSET_ACCEPTANCE2_MAX_BATCH_) {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_BATCH_INVALID');
  }
  var checked = 0;
  var audioRangeChecked = 0;
  var imageRangeChecked = 0;

  request.targets.forEach(function(rawTarget) {
    var target = h3MigAssetAcceptance2Target_(rawTarget);
    var full = h3MigAssetAcceptance2Fetch_(target, null, 'REAL', 'NORMAL');
    h3MigAssetAcceptance2RequireStatus_(
      full, 200, 'MIG_ASSET_ACCEPTANCE_2_FULL_STATUS_MISMATCH'
    );
    var mime = h3RuntimePrivateMediaHeader_(
      full.headers, 'Content-Type'
    ).split(';')[0].trim();
    if (
      full.bytes.length !== target.size_bytes ||
      h3RuntimeR2Sha256Bytes_(full.bytes) !== target.source_byte_sha256 ||
      mime !== target.mime_type ||
      h3RuntimePrivateMediaHeader_(full.headers,'Content-Length') !==
        String(target.size_bytes) ||
      h3RuntimePrivateMediaHeader_(full.headers,'Cache-Control') !==
        'private, max-age=31536000, immutable'
    ) {
      h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_FULL_BODY_MISMATCH');
    }

    if (target.asset_class === 'LISTENING_K1_IMAGE') {
      var imageRange = h3MigAssetAcceptance2Fetch_(
        target, 'bytes=0-0', 'REAL', 'NORMAL'
      );
      h3MigAssetAcceptance2RequireStatus_(
        imageRange, 400, 'MIG_ASSET_ACCEPTANCE_2_IMAGE_RANGE_STATUS_MISMATCH'
      );
      imageRangeChecked += 1;
    } else {
      if (h3RuntimePrivateMediaHeader_(full.headers,'Accept-Ranges') !== 'bytes') {
        h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_ACCEPT_RANGES_MISSING');
      }
      var range = h3MigAssetAcceptance2Fetch_(
        target, 'bytes=0-0', 'REAL', 'NORMAL'
      );
      h3MigAssetAcceptance2RequireStatus_(
        range, 206, 'MIG_ASSET_ACCEPTANCE_2_RANGE_206_STATUS_MISMATCH'
      );
      if (
        range.bytes.length !== 1 ||
        range.bytes[0] !== full.bytes[0] ||
        h3RuntimePrivateMediaHeader_(range.headers,'Accept-Ranges') !== 'bytes' ||
        h3RuntimePrivateMediaHeader_(range.headers,'Content-Range') !==
          'bytes 0-0/' + String(target.size_bytes) ||
        h3RuntimePrivateMediaHeader_(range.headers,'Content-Length') !== '1'
      ) {
        h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_RANGE_206_MISMATCH');
      }
      audioRangeChecked += 1;
    }
    checked += 1;
  });

  return {
    schema: H3_MIG_ASSET_ACCEPTANCE2_RESULT_SCHEMA_,
    status: 'PASS',
    mode: 'BATCH',
    checked_count: checked,
    audio_range_checked: audioRangeChecked,
    image_range_checked: imageRangeChecked,
    write_performed: false
  };
}

function h3MigAssetAcceptance2NegativeObservation_(
  name,response,expectedStatus,size
) {
  var observation = {
    name: String(name),
    expected_status: Number(expectedStatus),
    observed_status: Number(response.status),
    accept_ranges: h3RuntimePrivateMediaHeader_(response.headers,'Accept-Ranges'),
    content_range: h3RuntimePrivateMediaHeader_(response.headers,'Content-Range'),
    content_length: h3RuntimePrivateMediaHeader_(response.headers,'Content-Length'),
    body_size: response.bytes.length,
    pass: Number(response.status) === Number(expectedStatus)
  };
  if (Number(expectedStatus) === 416) {
    observation.pass = observation.pass &&
      observation.accept_ranges === 'bytes' &&
      observation.content_range === 'bytes */' + String(size) &&
      observation.content_length === '0';
  }
  return observation;
}

function h3MigAssetAcceptance2Negative_(request) {
  var audio = h3MigAssetAcceptance2Target_(request.audio_target);
  var image = h3MigAssetAcceptance2Target_(request.image_target);
  if (audio.asset_class === 'LISTENING_K1_IMAGE' ||
      image.asset_class !== 'LISTENING_K1_IMAGE') {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_NEGATIVE_TARGET_INVALID');
  }

  var observations = [];
  observations.push(h3MigAssetAcceptance2NegativeObservation_(
    'unauthorized_401',
    h3MigAssetAcceptance2Fetch_(audio, null, 'INVALID', 'NORMAL'),
    401, audio.size_bytes
  ));
  observations.push(h3MigAssetAcceptance2NegativeObservation_(
    'unknown_field_400',
    h3MigAssetAcceptance2Fetch_(audio, null, 'REAL', 'UNKNOWN_FIELD'),
    400, audio.size_bytes
  ));
  observations.push(h3MigAssetAcceptance2NegativeObservation_(
    'missing_field_400',
    h3MigAssetAcceptance2Fetch_(audio, null, 'REAL', 'MISSING_FIELD'),
    400, audio.size_bytes
  ));
  observations.push(h3MigAssetAcceptance2NegativeObservation_(
    'not_found_404',
    h3MigAssetAcceptance2Fetch_(audio, null, 'REAL', 'NOT_FOUND'),
    404, audio.size_bytes
  ));
  observations.push(h3MigAssetAcceptance2NegativeObservation_(
    'invalid_range_416',
    h3MigAssetAcceptance2Fetch_(audio, 'bytes=x-y', 'REAL', 'NORMAL'),
    416, audio.size_bytes
  ));
  observations.push(h3MigAssetAcceptance2NegativeObservation_(
    'unsatisfiable_range_416',
    h3MigAssetAcceptance2Fetch_(
      audio, 'bytes=' + String(audio.size_bytes) + '-', 'REAL', 'NORMAL'
    ),
    416, audio.size_bytes
  ));
  observations.push(h3MigAssetAcceptance2NegativeObservation_(
    'multiple_range_416',
    h3MigAssetAcceptance2Fetch_(audio, 'bytes=0-0,1-1', 'REAL', 'NORMAL'),
    416, audio.size_bytes
  ));
  observations.push(h3MigAssetAcceptance2NegativeObservation_(
    'image_range_400',
    h3MigAssetAcceptance2Fetch_(image, 'bytes=0-0', 'REAL', 'NORMAL'),
    400, image.size_bytes
  ));

  var failed = observations.filter(function(item) {
    return item.pass !== true;
  }).map(function(item) {
    return item.name;
  });
  return {
    schema: H3_MIG_ASSET_ACCEPTANCE2_RESULT_SCHEMA_,
    status: failed.length ? 'FAIL_OBSERVED' : 'PASS',
    mode: 'NEGATIVE',
    negative_checks: observations.length,
    failed_cases: failed,
    observations: observations,
    static_409_evidence_required: true,
    write_performed: false
  };
}

function h3MigAssetAcceptance2ReadOnly(request) {
  h3MigAssetAcceptance2ExactKeys_(
    request,
    request && request.mode === 'BATCH'
      ? ['schema','mode','source_binding_digest','targets']
      : ['audio_target','image_target','mode','schema','source_binding_digest'],
    'MIG_ASSET_ACCEPTANCE_2_REQUEST_SHAPE_INVALID'
  );
  if (
    request.schema !== H3_MIG_ASSET_ACCEPTANCE2_REQUEST_SCHEMA_ ||
    request.source_binding_digest !== H3_MIG_ASSET_ACCEPTANCE2_SOURCE_DIGEST_
  ) {
    h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_REQUEST_IDENTITY_INVALID');
  }
  if (request.mode === 'BATCH') {
    return h3MigAssetAcceptance2Batch_(request);
  }
  if (request.mode === 'NEGATIVE') {
    return h3MigAssetAcceptance2Negative_(request);
  }
  h3MigAssetAcceptance2Fail_('MIG_ASSET_ACCEPTANCE_2_MODE_INVALID');
}

