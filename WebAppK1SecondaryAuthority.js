/**
 * H3 RS-13K1 item-level secondary-evidence authority for Listening K1.
 *
 * K1 skill H3-K1-SK001 is a format skill spanning heterogeneous image/table
 * semantics. Therefore this module forbids skill-level automatic Concept
 * inference and accepts only explicit future item-level authority bound to
 * K1_READY_ID + IMAGE_SHA256 + QA_PROFILE.item_id.
 */

var H3_RS13K1_CONTRACT_ID_ =
  'H3-RS13K1-K1-SECONDARY-AUTHORITY-20260922-V1';
var H3_RS13K1_ANNOTATION_CONTRACT_ID_ =
  'H3-RS13K1-ITEM-AUTHORITY-20260922-V1';

var H3_RS13K1_AUTHORITY_SHEET_ =
  'listening_k1_secondary_authority_v1';
var H3_RS13K1_READY_SHEET_ =
  'listening_k1_ready_v1';

var H3_RS13K1_MIN_LISTENING_SET_NO_ = 4;
var H3_RS13K1_MIN_READY_CREATED_AT_ =
  '2026-09-22T11:44:00+09:00';

var H3_RS13K1_AUTHORITY_HEADERS_ = [
  'AUTHORITY_ID','K1_READY_ID','K1_SKILL_ID','IMAGE_SHA256','SOURCE_ITEM_ID',
  'TARGET_SKILL_ID','CONCEPT_ID','LINK_ROLE','CONFIDENCE',
  'ANNOTATION_CONTRACT_ID','STATUS','CREATED_AT','SOURCE_REF','NOTES'
];

var H3_RS13K1_READY_HEADERS_ = [
  'K1_READY_ID','CREATED_AT','STATUS','IMAGE_FILE_ID','IMAGE_URL',
  'IMAGE_SHA256','FINAL_CHOICES_JSON','ANSWER_KEY','TTS_SCRIPT_JSON',
  'QA_PROFILE','AUDIT_RESULT','BOUND_LISTENING_SET_ID','CONSUMED_AT'
];

function h3Rs13k1HeaderMap_(header) {
  var map = {};
  header.forEach(function (name, index) {
    map[String(name)] = index;
  });
  return map;
}

function h3Rs13k1RequireExactHeader_(values, headers, label) {
  if (!Array.isArray(values) || !values.length) {
    throw new Error(label + '_EMPTY');
  }
  if (JSON.stringify(values[0]) !== JSON.stringify(headers)) {
    throw new Error(label + '_HEADER_MISMATCH');
  }
  return {
    map:h3Rs13k1HeaderMap_(values[0]),
    rows:values.slice(1)
  };
}

function h3Rs13k1ReadValues_(spreadsheet, sheetName, headers, label) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(label + '_SHEET_MISSING');
  var lastRow = Math.max(1, sheet.getLastRow());
  return sheet.getRange(
    1,1,lastRow,headers.length
  ).getDisplayValues();
}

function h3Rs13k1ParseJson_(raw, code) {
  try {
    return JSON.parse(String(raw || ''));
  } catch (_err) {
    throw new Error(code);
  }
}

function h3Rs13k1ReadyRecordFromValues_(values, k1ReadyId) {
  var table = h3Rs13k1RequireExactHeader_(
    values,
    H3_RS13K1_READY_HEADERS_,
    'RS13K1_READY'
  );
  var matches = table.rows.filter(function (row) {
    return String(row[table.map.K1_READY_ID] || '') ===
      String(k1ReadyId || '');
  });
  if (matches.length !== 1) {
    throw new Error('RS13K1_READY_COUNT:' + matches.length);
  }
  var row = matches[0];
  var qa = h3Rs13k1ParseJson_(
    row[table.map.QA_PROFILE],
    'RS13K1_QA_PROFILE_INVALID'
  );
  var audit = h3Rs13k1ParseJson_(
    row[table.map.AUDIT_RESULT],
    'RS13K1_AUDIT_RESULT_INVALID'
  );
  var createdAt = String(row[table.map.CREATED_AT] || '');
  var status = String(row[table.map.STATUS] || '');
  var imageSha = String(row[table.map.IMAGE_SHA256] || '');
  var sourceItemId = String(qa && qa.item_id || '');

  if (!createdAt || !imageSha || !sourceItemId) {
    throw new Error('RS13K1_READY_IDENTITY_INVALID');
  }
  if (
    audit.result !== 'PASS' ||
    audit.visual_qa !== 'PASS' ||
    audit.blind_audit !== 'PASS'
  ) {
    throw new Error('RS13K1_READY_AUDIT_NOT_PASS');
  }
  if (status !== 'READY' && status !== 'CONSUMED') {
    throw new Error('RS13K1_READY_STATUS_INVALID:' + status);
  }
  return {
    id:String(row[table.map.K1_READY_ID] || ''),
    created_at:createdAt,
    status:status,
    image_sha256:imageSha,
    source_item_id:sourceItemId,
    bound_set_id:String(row[table.map.BOUND_LISTENING_SET_ID] || ''),
    consumed_at:String(row[table.map.CONSUMED_AT] || '')
  };
}

function h3Rs13k1TargetMappingFromValues_(
  conceptValues,
  level,
  targetSkillId,
  conceptId
) {
  if (
    typeof H3_MULTI_SKILL_CONCEPT_HEADERS_ === 'undefined'
  ) {
    throw new Error('RS13K1_CONCEPT_HEADERS_MISSING');
  }
  var table = h3Rs13k1RequireExactHeader_(
    conceptValues,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,
    'RS13K1_CONCEPT_MAP'
  );
  var matches = table.rows.filter(function (row) {
    var status = String(row[table.map.STATUS] || '');
    return (
      (status === 'ACTIVE_PILOT' || status === 'ACTIVE') &&
      String(row[table.map.LEVEL] || '') === String(level) &&
      String(row[table.map.SKILL_ID] || '') === String(targetSkillId) &&
      String(row[table.map.CONCEPT_ID] || '') === String(conceptId)
    );
  });
  if (matches.length !== 1) {
    throw new Error('RS13K1_TARGET_MAPPING_COUNT:' + matches.length);
  }
  var row = matches[0];
  var matchType = String(row[table.map.MATCH_TYPE] || '');
  if (
    String(row[table.map.MAPPING_ROLE] || '') !== 'APPLICATION_SKILL' ||
    matchType.indexOf('EXACT_') !== 0 ||
    String(row[table.map.CONFIDENCE] || '') !== 'HIGH' ||
    String(row[table.map.DIRECT_REUSE] || '') !== 'NO' ||
    String(row[table.map.STATE_TRANSFER] || '') !== 'NO' ||
    String(row[table.map.RETEST_CLOSURE] || '') !== 'NO' ||
    String(row[table.map.STABILITY_TRANSFER] || '') !== 'NO' ||
    String(row[table.map.SCHEDULER_USE] || '') !==
      'DIAGNOSTIC_SELECTION_ONLY'
  ) {
    throw new Error('RS13K1_TARGET_MAPPING_UNSAFE');
  }
  var family = String(row[table.map.FAMILY] || '');
  if (!family || family === 'LISTENING') {
    throw new Error('RS13K1_TARGET_FAMILY_INVALID');
  }
  return {
    family:family,
    section_key:String(row[table.map.SECTION_KEY] || ''),
    match_type:matchType
  };
}

function h3Rs13k1AuthorityFromValues_(
  authorityValues,
  readyRecord,
  conceptValues,
  listeningSetNo
) {
  var setNo = Number(listeningSetNo);
  if (
    !Number.isInteger(setNo) ||
    setNo < H3_RS13K1_MIN_LISTENING_SET_NO_
  ) {
    return null;
  }
  if (
    String(readyRecord.created_at || '') <
    H3_RS13K1_MIN_READY_CREATED_AT_
  ) {
    return null;
  }

  var table = h3Rs13k1RequireExactHeader_(
    authorityValues,
    H3_RS13K1_AUTHORITY_HEADERS_,
    'RS13K1_AUTHORITY'
  );
  var rows = table.rows.filter(function (row) {
    return (
      String(row[table.map.K1_READY_ID] || '') ===
        String(readyRecord.id || '') &&
      String(row[table.map.STATUS] || '') ===
        'ACTIVE_PROSPECTIVE'
    );
  });

  if (!rows.length) return null;
  if (rows.length !== 1) {
    throw new Error(
      'RS13K1_ACTIVE_AUTHORITY_COUNT:' + rows.length
    );
  }

  var row = rows[0];
  var authorityId =
    String(row[table.map.AUTHORITY_ID] || '');
  var skillId =
    String(row[table.map.K1_SKILL_ID] || '');
  var imageSha =
    String(row[table.map.IMAGE_SHA256] || '');
  var sourceItemId =
    String(row[table.map.SOURCE_ITEM_ID] || '');
  var targetSkillId =
    String(row[table.map.TARGET_SKILL_ID] || '');
  var conceptId =
    String(row[table.map.CONCEPT_ID] || '');
  var role =
    String(row[table.map.LINK_ROLE] || '');
  var confidence =
    String(row[table.map.CONFIDENCE] || '');
  var annotationContract =
    String(row[table.map.ANNOTATION_CONTRACT_ID] || '');

  if (
    !authorityId ||
    skillId !== 'H3-K1-SK001' ||
    imageSha !== readyRecord.image_sha256 ||
    sourceItemId !== readyRecord.source_item_id ||
    !targetSkillId ||
    !conceptId ||
    role !== 'CONTRIBUTORY' ||
    confidence !== 'HIGH' ||
    annotationContract !==
      H3_RS13K1_ANNOTATION_CONTRACT_ID_
  ) {
    throw new Error('RS13K1_AUTHORITY_IDENTITY_INVALID');
  }

  var expectedId = [
    'K1A',
    readyRecord.id,
    targetSkillId,
    conceptId
  ].join('|');
  if (authorityId !== expectedId) {
    throw new Error('RS13K1_AUTHORITY_ID_NONDETERMINISTIC');
  }

  h3Rs13k1TargetMappingFromValues_(
    conceptValues,
    '3級',
    targetSkillId,
    conceptId
  );

  return {
    authority_id:authorityId,
    link:{
      link_role:'CONTRIBUTORY',
      target_skill_id:targetSkillId,
      concept_id:conceptId,
      confidence:'HIGH',
      annotation_contract_id:
        H3_RS13K1_ANNOTATION_CONTRACT_ID_
    },
    source_ref:String(row[table.map.SOURCE_REF] || '')
  };
}

function h3Rs13k1ResolveAuthority_(
  spreadsheet,
  k1ReadyId,
  listeningSetNo
) {
  var readyValues = h3Rs13k1ReadValues_(
    spreadsheet,
    H3_RS13K1_READY_SHEET_,
    H3_RS13K1_READY_HEADERS_,
    'RS13K1_READY'
  );
  var ready = h3Rs13k1ReadyRecordFromValues_(
    readyValues,
    k1ReadyId
  );
  var authorityValues = h3Rs13k1ReadValues_(
    spreadsheet,
    H3_RS13K1_AUTHORITY_SHEET_,
    H3_RS13K1_AUTHORITY_HEADERS_,
    'RS13K1_AUTHORITY'
  );
  var conceptValues = h3Rs13k1ReadValues_(
    spreadsheet,
    H3_MULTI_SKILL_CONCEPT_SHEET_,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,
    'RS13K1_CONCEPT_MAP'
  );
  return h3Rs13k1AuthorityFromValues_(
    authorityValues,
    ready,
    conceptValues,
    listeningSetNo
  );
}

function h3Rs13k1PreissueValidate_(
  spreadsheet,
  k1ReadyId,
  listeningSetNo
) {
  var authority = h3Rs13k1ResolveAuthority_(
    spreadsheet,
    k1ReadyId,
    listeningSetNo
  );
  return {
    schema:'H3_RS13K1_PREISSUE_VALIDATION_V1',
    contract_id:H3_RS13K1_CONTRACT_ID_,
    status:authority ? 'PASS_AUTHORITY' : 'NO_AUTHORITY',
    authority_id:authority ? authority.authority_id : ''
  };
}

function h3Rs13k1ListeningLinks_(
  spreadsheet,
  k1ReadyId,
  listeningSetNo
) {
  var authority = h3Rs13k1ResolveAuthority_(
    spreadsheet,
    k1ReadyId,
    listeningSetNo
  );
  return authority ? [authority.link] : [];
}

function h3Rs13k1DescribeContract_() {
  return {
    schema:'H3_RS13K1_CONTRACT_V1',
    contract_id:H3_RS13K1_CONTRACT_ID_,
    annotation_contract_id:
      H3_RS13K1_ANNOTATION_CONTRACT_ID_,
    source_skill_id:'H3-K1-SK001',
    source_identity:[
      'K1_READY_ID',
      'IMAGE_SHA256',
      'QA_PROFILE.item_id'
    ],
    skill_level_concept_inference:false,
    authority_mode:'EXPLICIT_ITEM_LEVEL_ONLY',
    link_role:'CONTRIBUTORY_ONLY',
    min_listening_set_no:
      H3_RS13K1_MIN_LISTENING_SET_NO_,
    min_ready_created_at:
      H3_RS13K1_MIN_READY_CREATED_AT_,
    historical_backfill:false,
    payload_hash_mutation:false,
    state_transfer:false
  };
}
