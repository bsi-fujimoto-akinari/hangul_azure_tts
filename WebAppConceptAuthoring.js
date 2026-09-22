/**
 * H3 RS-13E exact Concept coverage + deterministic auto annotation.
 *
 * This module never changes scheduler choice or hash-bearing learner surfaces.
 * It resolves secondary_evidence_links logically at precommit/capture time
 * for future-only surfaces past frozen activation baselines.
 */

var H3_RS13E_CONTRACT_ID_ =
  'H3-RS13E-CONCEPT-AUTHORING-20260922-V1';
var H3_RS13E_AUTO_ANNOTATION_CONTRACT_ID_ =
  'H3-RS13E-AUTO-ANNOTATION-20260922-V1';

var H3_RS13E_WRITTEN_BASELINE_BLOCK_ = 2;
var H3_RS13E_WRITTEN_BASELINE_OFFSET_ = 1;
var H3_RS13E_LISTENING_MIN_SET_NO_ = 5;
var H3_RS13E_READING_MIN_ISSUE_NO_ = 4;
var H3_RS13E_TRANSLATION_MIN_ISSUE_NO_ = 4;

function h3Rs13eRequireCaptureGlobals_() {
  if (
    typeof H3_MULTI_SKILL_CONCEPT_HEADERS_ === 'undefined' ||
    typeof h3MultiSkillTableFromValues_ !== 'function' ||
    typeof h3MultiSkillReadValues_ !== 'function'
  ) {
    throw new Error('RS13E_CAPTURE_GLOBALS_MISSING');
  }
}

function h3Rs13eExactConceptIndexFromValues_(values) {
  h3Rs13eRequireCaptureGlobals_();
  var table = h3MultiSkillTableFromValues_(
    values,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,
    'RS13E_CONCEPT_MAP'
  );
  var bySkill = {};
  var byConcept = {};

  table.rows.forEach(function (row) {
    var status = String(row[table.map.STATUS] || '');
    if (status !== 'ACTIVE_PILOT' && status !== 'ACTIVE') return;
    if (String(row[table.map.MAPPING_ROLE] || '') !== 'APPLICATION_SKILL') {
      return;
    }
    var matchType = String(row[table.map.MATCH_TYPE] || '');
    if (matchType.indexOf('EXACT_') !== 0) return;
    if (
      String(row[table.map.CONFIDENCE] || '') !== 'HIGH' ||
      String(row[table.map.DIRECT_REUSE] || '') !== 'NO' ||
      String(row[table.map.STATE_TRANSFER] || '') !== 'NO' ||
      String(row[table.map.RETEST_CLOSURE] || '') !== 'NO' ||
      String(row[table.map.STABILITY_TRANSFER] || '') !== 'NO' ||
      String(row[table.map.SCHEDULER_USE] || '') !==
        'DIAGNOSTIC_SELECTION_ONLY'
    ) {
      throw new Error('RS13E_CONCEPT_MAP_UNSAFE');
    }

    var mapping = {
      level:String(row[table.map.LEVEL] || ''),
      skill_id:String(row[table.map.SKILL_ID] || ''),
      family:String(row[table.map.FAMILY] || ''),
      section_key:String(row[table.map.SECTION_KEY] || ''),
      concept_id:String(row[table.map.CONCEPT_ID] || ''),
      match_type:matchType,
      status:status
    };
    if (
      !mapping.level ||
      !mapping.skill_id ||
      !mapping.family ||
      !mapping.concept_id
    ) {
      throw new Error('RS13E_CONCEPT_MAPPING_IDENTITY_INVALID');
    }

    var skillKey = [mapping.level,mapping.skill_id].join('|');
    var conceptKey = [mapping.level,mapping.concept_id].join('|');
    bySkill[skillKey] = bySkill[skillKey] || [];
    byConcept[conceptKey] = byConcept[conceptKey] || [];
    bySkill[skillKey].push(mapping);
    byConcept[conceptKey].push(mapping);
  });

  Object.keys(bySkill).forEach(function (key) {
    bySkill[key].sort(function (a,b) {
      return (
        a.concept_id + '|' + a.family + '|' + a.skill_id
      ).localeCompare(
        b.concept_id + '|' + b.family + '|' + b.skill_id
      );
    });
  });
  Object.keys(byConcept).forEach(function (key) {
    byConcept[key].sort(function (a,b) {
      return (
        a.family + '|' + a.skill_id
      ).localeCompare(
        b.family + '|' + b.skill_id
      );
    });
  });

  return {bySkill:bySkill,byConcept:byConcept};
}

function h3Rs13eAutoLinksFromValues_(
  level,
  sourceFamily,
  directSkillId,
  conceptValues
) {
  var normalizedLevel = String(level || '');
  var family = String(sourceFamily || '');
  var skillId = String(directSkillId || '');
  if (!normalizedLevel || !family || !skillId) {
    throw new Error('RS13E_RESOLVER_IDENTITY_INVALID');
  }

  var index = h3Rs13eExactConceptIndexFromValues_(conceptValues);
  var sourceMappings =
    index.bySkill[[normalizedLevel,skillId].join('|')] || [];

  sourceMappings = sourceMappings.filter(function (mapping) {
    return mapping.family === family;
  });

  if (!sourceMappings.length) return [];

  var concepts = {};
  sourceMappings.forEach(function (mapping) {
    concepts[mapping.concept_id] = true;
  });
  var conceptIds = Object.keys(concepts).sort();

  // Automatic annotation stays conservative: one exact Concept per direct skill.
  if (conceptIds.length !== 1) {
    throw new Error(
      'RS13E_AUTO_CONCEPT_AMBIGUOUS:' +
      normalizedLevel + '|' + family + '|' + skillId
    );
  }

  var conceptId = conceptIds[0];
  var targets =
    index.byConcept[[normalizedLevel,conceptId].join('|')] || [];

  var out = targets.filter(function (mapping) {
    return (
      mapping.skill_id !== skillId &&
      mapping.family !== family
    );
  }).map(function (mapping) {
    return {
      link_role:'CONTRIBUTORY',
      target_skill_id:mapping.skill_id,
      concept_id:conceptId,
      confidence:'HIGH',
      annotation_contract_id:
        H3_RS13E_AUTO_ANNOTATION_CONTRACT_ID_
    };
  });

  out.sort(function (a,b) {
    return (
      a.target_skill_id + '|' + a.concept_id
    ).localeCompare(
      b.target_skill_id + '|' + b.concept_id
    );
  });

  return out;
}

function h3Rs13eAutoLinks_(
  spreadsheet,
  level,
  sourceFamily,
  directSkillId
) {
  h3Rs13eRequireCaptureGlobals_();
  var values = h3MultiSkillReadValues_(
    spreadsheet,
    H3_MULTI_SKILL_CONCEPT_SHEET_,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,
    'RS13E_CONCEPT_MAP'
  );
  return h3Rs13eAutoLinksFromValues_(
    level,
    sourceFamily,
    directSkillId,
    values
  );
}

function h3Rs13eWrittenEligible_(context) {
  var blockNo = Number(context && context.blockNo);
  var setOffset = Number(context && context.setOffset);
  if (!Number.isInteger(blockNo) || !Number.isInteger(setOffset)) {
    return false;
  }
  return (
    blockNo > H3_RS13E_WRITTEN_BASELINE_BLOCK_ ||
    (
      blockNo === H3_RS13E_WRITTEN_BASELINE_BLOCK_ &&
      setOffset > H3_RS13E_WRITTEN_BASELINE_OFFSET_
    )
  );
}

function h3Rs13eListeningEligible_(setNo) {
  var n = Number(setNo);
  return Number.isInteger(n) && n >= H3_RS13E_LISTENING_MIN_SET_NO_;
}

function h3Rs13eReadingEligible_(issueNo) {
  var n = Number(issueNo);
  return Number.isInteger(n) && n >= H3_RS13E_READING_MIN_ISSUE_NO_;
}

function h3Rs13eTranslationEligible_(issueNo) {
  var n = Number(issueNo);
  return Number.isInteger(n) && n >= H3_RS13E_TRANSLATION_MIN_ISSUE_NO_;
}

function h3Rs13eDescribeGate_() {
  return {
    schema:'H3_RS13E_GATE_V1',
    contract_id:H3_RS13E_CONTRACT_ID_,
    annotation_contract_id:H3_RS13E_AUTO_ANNOTATION_CONTRACT_ID_,
    written_after:{
      block_no:H3_RS13E_WRITTEN_BASELINE_BLOCK_,
      set_offset:H3_RS13E_WRITTEN_BASELINE_OFFSET_
    },
    listening_min_set_no:H3_RS13E_LISTENING_MIN_SET_NO_,
    reading_min_issue_no:H3_RS13E_READING_MIN_ISSUE_NO_,
    translation_min_issue_no:H3_RS13E_TRANSLATION_MIN_ISSUE_NO_,
    hash_bearing_surface_mutation:false,
    scheduler_selection_mutation:false,
    historical_backfill:false
  };
}
