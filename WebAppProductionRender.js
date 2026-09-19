/**
 * H3 R3-05 production 5L Web App render/read/media layer.
 *
 * This file is read-only with respect to learner runtime.
 * Production answer commit remains gated by WebAppProduction.js.
 */

var H3_R3_LISTENING_RENDER_VERSION =
  'H3-LISTENING-RENDER-RULES-20260920-V19';

var H3_R3_WEB_SURFACE_CONTRACT_ID =
  'H3-L5E2E-R3-WEB-SURFACE-CONTRACT-20260919-V1';

var H3_R3_SECTION_DISPLAY = {
  K1: '[聞1/絵]',
  K2: '[聞2/一致]',
  K3: '[聞3/応答]',
  K4: '[聞4/一致]',
  K5: '[聞5/一致]'
};

function h3ProdParseItem_(raw, section) {
  var item = h3ProdParseJson_(
    raw,
    'PRODUCTION_ITEM_JSON_INVALID:' + section
  );

  var skillId = String(item && item.skill_id || '');
  var skillPrefix = 'H3-' + section + '-SK';
  var skillSuffix = skillId.slice(skillPrefix.length);

  if (
    !item ||
    item.section !== section ||
    skillId.indexOf(skillPrefix) !== 0 ||
    !/^\d{3}$/.test(skillSuffix)
  ) {
    throw new Error(
      'PRODUCTION_ITEM_IDENTITY_MISMATCH:' +
      section
    );
  }

  if (section === 'K2' || section === 'K3') {
    if (
      item.visibility !== 'audio_only' ||
      typeof item.prompt !== 'string' ||
      !Array.isArray(item.choices) ||
      item.choices.length !== 4
    ) {
      throw new Error(
        'PRODUCTION_AUDIO_ONLY_ITEM_INVALID:' +
        section
      );
    }
  }

  if (section === 'K4') {
    if (
      item.visibility !==
        'visible_Japanese_choices' ||
      typeof item.passage !== 'string' ||
      !Array.isArray(item.choices_ja) ||
      item.choices_ja.length !== 4
    ) {
      throw new Error(
        'PRODUCTION_K4_ITEM_INVALID'
      );
    }
  }

  if (section === 'K5') {
    if (
      item.visibility !==
        'visible_Korean_choices' ||
      typeof item.passage !== 'string' ||
      !Array.isArray(item.choices_ko) ||
      item.choices_ko.length !== 4
    ) {
      throw new Error(
        'PRODUCTION_K5_ITEM_INVALID'
      );
    }
  }

  return item;
}

function h3ProdRenderParts_(context) {
  var p = context.payloadRecord.row;
  var pm = context.payloadTable.map;
  var kr = context.k1Record.row;
  var km = context.k1Table.map;

  h3ProdRequireColumns_(
    context.k1Table,
    [
      'IMAGE_FILE_ID',
      'IMAGE_URL',
      'IMAGE_SHA256',
      'FINAL_CHOICES_JSON'
    ],
    'listening_k1_ready_v1'
  );

  var k1Choices = h3ProdParseJson_(
    kr[km.FINAL_CHOICES_JSON],
    'K1_FINAL_CHOICES_JSON_INVALID'
  );

  if (
    !Array.isArray(k1Choices) ||
    k1Choices.length !== 4
  ) {
    throw new Error(
      'K1_FINAL_CHOICES_COUNT_MISMATCH'
    );
  }

  var k2 = h3ProdParseItem_(
    p[pm.K2_ITEM_JSON],
    'K2'
  );
  var k3 = h3ProdParseItem_(
    p[pm.K3_ITEM_JSON],
    'K3'
  );
  var k4 = h3ProdParseItem_(
    p[pm.K4_ITEM_JSON],
    'K4'
  );
  var k5 = h3ProdParseItem_(
    p[pm.K5_ITEM_JSON],
    'K5'
  );

  var individual =
    context.audioBinding &&
    context.audioBinding.individual;

  if (!individual) {
    throw new Error(
      'INDIVIDUAL_AUDIO_BINDING_MISSING'
    );
  }

  H3_WEB_PROD_SECTIONS.forEach(function (section) {
    var binding = individual[section];
    if (
      !binding ||
      !binding.audio_file_id ||
      !binding.audio_url ||
      !binding.payload_hash ||
      !binding.listen_gen_id
    ) {
      throw new Error(
        'INDIVIDUAL_AUDIO_BINDING_INVALID:' +
        section
      );
    }
  });

  return {
    k1: {
      image_file_id: String(
        kr[km.IMAGE_FILE_ID] || ''
      ),
      image_url: String(
        kr[km.IMAGE_URL] || ''
      ),
      image_sha256: String(
        kr[km.IMAGE_SHA256] || ''
      ),
      choices: k1Choices
    },
    K2: k2,
    K3: k3,
    K4: k4,
    K5: k5,
    audio: individual
  };
}

function validateProductionRenderRequest_(request) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_RENDER_REQUEST_V1'
  ) {
    throw new Error('INVALID_RENDER_SCHEMA');
  }

  if (request.mode !== 'LISTENING') {
    throw new Error(
      'PRODUCTION_LISTENING_MODE_REQUIRED'
    );
  }

  if (
    !request.set_id ||
    String(request.set_id).length > 128 ||
    /[\x00-\x1F]/.test(
      String(request.set_id)
    )
  ) {
    throw new Error('INVALID_SET_ID');
  }
}

function buildProductionRenderPayload_(request) {
  validateProductionRenderRequest_(request);

  var spreadsheet = SpreadsheetApp.openById(
    H3_WEB_RUNTIME_SPREADSHEET_ID
  );

  var context = h3ProdReadContext_(
    spreadsheet,
    request.set_id
  );

  var parts = h3ProdRenderParts_(context);
  var image = h3DriveDataUri_(
    parts.k1.image_file_id,
    'image/jpeg',
    parts.k1.image_sha256,
    1024 * 1024
  );

  var questions = H3_WEB_PROD_SECTIONS.map(
    function (section) {
      var visibleChoices = null;

      if (section === 'K4') {
        visibleChoices =
          parts.K4.choices_ja.slice();
      } else if (section === 'K5') {
        visibleChoices =
          parts.K5.choices_ko.slice();
      }

      return {
        section: section,
        display:
          H3_R3_SECTION_DISPLAY[section],
        audio_asset_key: section,
        audio_fallback_url:
          parts.audio[section].audio_url,
        choice_ids: [1, 2, 3, 4],
        visible_choices: visibleChoices
      };
    }
  );

  questions[0].image_data_uri = image.data_uri;
  questions[0].image_sha256 =
    parts.k1.image_sha256;
  questions[0].image_size_bytes =
    image.size_bytes;

  return {
    schema: 'H3_WEB_SET_V1',
    mode: 'LISTENING',
    nonlearning: false,
    persisted: true,
    set_id: context.setId,
    listening_set_no: context.setNo,
    canonical_render_version:
      H3_R3_LISTENING_RENDER_VERSION,
    surface_contract_id:
      H3_R3_WEB_SURFACE_CONTRACT_ID,
    transport: {
      audio: 'APPS_SCRIPT_LAZY_DATA_URI',
      image:
        'APPS_SCRIPT_INLINE_EXACT_SHA256_VERIFIED',
      review:
        'PERSISTENT_REVIEW_V1'
    },
    questions: questions
  };
}

function h3ProdIssuedPayloadBinding_(setId) {
  var spreadsheet = SpreadsheetApp.openById(
    H3_WEB_RUNTIME_SPREADSHEET_ID
  );
  var sheet = spreadsheet.getSheetByName(
    'listening_set_payload_v1'
  );

  if (!sheet) {
    throw new Error(
      'PRODUCTION_PAYLOAD_SHEET_MISSING'
    );
  }

  var table = h3ProdSheetRows_(sheet);
  h3ProdRequireColumns_(
    table,
    [
      'LISTENING_SET_ID',
      'STATUS',
      'AUDIO_BINDING_JSON'
    ],
    'listening_set_payload_v1'
  );

  var record = h3ProdOneRowBy_(
    table,
    'LISTENING_SET_ID',
    setId,
    'listening_set_payload_v1'
  );
  var row = record.row;

  if (
    String(row[table.map.STATUS] || '') !==
    'ISSUED'
  ) {
    throw new Error('SET_NOT_ISSUED');
  }

  var binding = h3ProdParseJson_(
    row[table.map.AUDIO_BINDING_JSON],
    'AUDIO_BINDING_JSON_INVALID'
  );

  if (!binding || !binding.individual) {
    throw new Error(
      'INDIVIDUAL_AUDIO_BINDING_MISSING'
    );
  }

  return binding.individual;
}

function getProductionMediaPayload_(request) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_MEDIA_REQUEST_V1' ||
    request.mode !== 'LISTENING'
  ) {
    throw new Error(
      'INVALID_PRODUCTION_MEDIA_REQUEST'
    );
  }

  if (
    H3_WEB_PROD_SECTIONS.indexOf(
      String(request.asset_key || '')
    ) < 0
  ) {
    throw new Error(
      'MEDIA_ASSET_NOT_ALLOWLISTED'
    );
  }

  var individual =
    h3ProdIssuedPayloadBinding_(
      request.set_id
    );
  var binding =
    individual[request.asset_key];

  if (
    !binding ||
    !binding.audio_file_id ||
    !binding.audio_url
  ) {
    throw new Error(
      'PRODUCTION_MEDIA_BINDING_INVALID'
    );
  }

  var media = h3DriveDataUri_(
    binding.audio_file_id,
    'audio/mpeg',
    null,
    8 * 1024 * 1024
  );

  return {
    schema: 'H3_WEB_MEDIA_V1',
    mode: 'LISTENING',
    set_id: String(request.set_id),
    asset_key: String(request.asset_key),
    data_uri: media.data_uri,
    mime_type: media.mime_type,
    size_bytes: media.size_bytes,
    trim_start_ms: 0,
    fallback_url: binding.audio_url
  };
}

function h3ProdReviewScript_(section, parts) {
  if (section === 'K1') {
    return parts.k1.choices
      .map(function (text, i) {
        return ['①','②','③','④'][i] +
          ' ' + text;
      })
      .join('\n');
  }

  if (section === 'K2') {
    return [
      parts.K2.prompt,
      parts.K2.choices
        .map(function (text, i) {
          return ['①','②','③','④'][i] +
            ' ' + text;
        })
        .join('\n')
    ].join('\n');
  }

  if (section === 'K3') {
    return [
      parts.K3.prompt,
      parts.K3.choices
        .map(function (text, i) {
          return ['①','②','③','④'][i] +
            ' ' + text;
        })
        .join('\n')
    ].join('\n');
  }

  if (section === 'K4') {
    return parts.K4.passage;
  }

  if (section === 'K5') {
    return parts.K5.passage;
  }

  throw new Error(
    'UNKNOWN_REVIEW_SECTION:' + section
  );
}

function h3ProdReviewScriptUrl_(setId) {
  var folder =
    DriveApp.getFolderById(
      HQ_AUDIO_LISTENING_FOLDER_ID
    );

  var iterator =
    folder.getFilesByName(
      String(setId) + '.txt'
    );

  var matches = [];

  while (iterator.hasNext()) {
    matches.push(
      iterator.next()
    );
  }

  if (matches.length > 1) {
    throw new Error(
      'MULTIPLE_5L_SCRIPT_TXT'
    );
  }

  return matches.length === 1
    ? matches[0].getUrl()
    : null;
}


function buildProductionReviewPayload_(setId) {
  var spreadsheet = SpreadsheetApp.openById(
    H3_WEB_RUNTIME_SPREADSHEET_ID
  );
  var context = h3ProdReadContext_(
    spreadsheet,
    setId
  );
  var parts = h3ProdRenderParts_(context);

  return {
    sections: H3_WEB_PROD_SECTIONS.map(
      function (section) {
        return {
          section: section,
          display:
            H3_R3_SECTION_DISPLAY[section],
          audio_asset_key: section,
          audio_fallback_url:
            parts.audio[section].audio_url,
          script_text:
            h3ProdReviewScript_(
              section,
              parts
            )
        };
      }
    ),
    review_script_fallback_url:
      h3ProdReviewScriptUrl_(setId)
  };
}
