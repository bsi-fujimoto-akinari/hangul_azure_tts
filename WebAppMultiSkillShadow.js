/**
 * H3 RS-13 real-data shadow observation.
 *
 * Observes only prospective COMMITTED_LEARNING secondary evidence captured by
 * RS-12. Observation is diagnostic only and never mutates scheduler choice,
 * mastery, retest closure, stability, learner history, score, Review, clocks,
 * counters, or pointers.
 */

var H3_MULTI_SKILL_SHADOW_CONTRACT_ID_ =
  'H3-RS13-REAL-DATA-SHADOW-20260922-V1';
var H3_MULTI_SKILL_SHADOW_SHEET_ =
  'multi_skill_shadow_observation_v1';

var H3_MULTI_SKILL_SHADOW_HEADERS_ = [
  'OBSERVATION_ID','LINK_ID','EVIDENCE_EVENT_ID','LEVEL','SOURCE_FAMILY',
  'TARGET_FAMILY','TARGET_SKILL_ID','CONCEPT_ID','LINK_ROLE','SOURCE_RESULT',
  'PROVENANCE_KIND','MAPPING_STATUS','CROSS_FAMILY','TRANSFER_SAFE',
  'SOFT_SIGNAL_CLASS','SCHEDULER_APPLIED','SHADOW_ONLY','OBSERVED_AT',
  'STATUS','NOTES'
];

function h3MultiSkillShadowRequireCaptureGlobals_() {
  if (typeof H3_MULTI_SKILL_HEADERS_ === 'undefined' ||
      typeof H3_MULTI_SKILL_CONCEPT_HEADERS_ === 'undefined' ||
      typeof h3MultiSkillTableFromValues_ !== 'function') {
    throw new Error('RS13_CAPTURE_GLOBALS_MISSING');
  }
}

function h3MultiSkillShadowClass_(role, result) {
  if (result === '×' && role === 'CONTRIBUTORY') return 'CONTRIBUTORY_X';
  if (result === '△' && role === 'CONTRIBUTORY') return 'CONTRIBUTORY_TRIANGLE';
  if (result === '×' && role === 'INCIDENTAL') return 'INCIDENTAL_X';
  if (result === '△' && role === 'INCIDENTAL') return 'INCIDENTAL_TRIANGLE';
  if (result === '○') return 'NO_BOOST_CORRECT';
  throw new Error('RS13_SOFT_SIGNAL_CLASS_INVALID:' + role + ':' + result);
}

function h3MultiSkillShadowConceptIndex_(conceptValues) {
  h3MultiSkillShadowRequireCaptureGlobals_();
  var table = h3MultiSkillTableFromValues_(
    conceptValues,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,
    'RS13_CONCEPT_MAP'
  );
  var out = {};
  table.rows.forEach(function (row) {
    var status = String(row[table.map.STATUS] || '');
    if (status !== 'ACTIVE_PILOT' && status !== 'ACTIVE') return;
    if (String(row[table.map.MAPPING_ROLE] || '') !== 'APPLICATION_SKILL') {
      return;
    }
    if (String(row[table.map.CONFIDENCE] || '') !== 'HIGH' ||
        String(row[table.map.DIRECT_REUSE] || '') !== 'NO' ||
        String(row[table.map.STATE_TRANSFER] || '') !== 'NO' ||
        String(row[table.map.RETEST_CLOSURE] || '') !== 'NO' ||
        String(row[table.map.STABILITY_TRANSFER] || '') !== 'NO' ||
        String(row[table.map.SCHEDULER_USE] || '') !==
          'DIAGNOSTIC_SELECTION_ONLY') {
      throw new Error('RS13_CONCEPT_MAP_UNSAFE');
    }
    var key = [
      String(row[table.map.LEVEL] || ''),
      String(row[table.map.SKILL_ID] || ''),
      String(row[table.map.CONCEPT_ID] || '')
    ].join('|');
    if (out[key]) throw new Error('RS13_CONCEPT_MAP_DUPLICATE:' + key);
    out[key] = {
      family:String(row[table.map.FAMILY] || ''),
      status:status
    };
  });
  return out;
}

function h3MultiSkillShadowBuildRowsFromValues_(evidenceValues, conceptValues) {
  h3MultiSkillShadowRequireCaptureGlobals_();
  var evidence = h3MultiSkillTableFromValues_(
    evidenceValues,
    H3_MULTI_SKILL_HEADERS_,
    'RS13_MULTI_SKILL_EVIDENCE'
  );
  var concepts = h3MultiSkillShadowConceptIndex_(conceptValues);
  var out = [];

  evidence.rows.forEach(function (row) {
    var scope = String(row[evidence.map.EVENT_SCOPE] || '');
    if (scope !== 'COMMITTED_LEARNING') return;

    var role = String(row[evidence.map.LINK_ROLE] || '');
    if (role !== 'CONTRIBUTORY' && role !== 'INCIDENTAL') return;

    var status = String(row[evidence.map.STATUS] || '');
    if (status !== 'ACTIVE_COMMITTED') {
      throw new Error('RS13_COMMITTED_SECONDARY_STATUS_INVALID');
    }

    var provenance = String(row[evidence.map.PROVENANCE_KIND] || '');
    if (provenance !== 'AUTHOR_VERIFIED_EXACT') {
      throw new Error('RS13_PROVENANCE_INVALID');
    }

    if (String(row[evidence.map.DIRECT_STATE_AUTHORITY] || '') !== 'NO' ||
        String(row[evidence.map.STATE_TRANSFER] || '') !== 'NO' ||
        String(row[evidence.map.RETEST_CLOSURE_TRANSFER] || '') !== 'NO' ||
        String(row[evidence.map.STABILITY_TRANSFER] || '') !== 'NO' ||
        String(row[evidence.map.SCHEDULER_USE] || '') !== 'DIAGNOSTIC_ONLY') {
      throw new Error('RS13_TRANSFER_OR_AUTHORITY_VIOLATION');
    }

    var level = String(row[evidence.map.LEVEL] || '');
    var targetSkill = String(row[evidence.map.TARGET_SKILL_ID] || '');
    var conceptId = String(row[evidence.map.CONCEPT_ID] || '');
    var key = [level,targetSkill,conceptId].join('|');
    var mapping = concepts[key];
    if (!mapping) {
      throw new Error('RS13_CONCEPT_MAPPING_MISSING:' + key);
    }

    var sourceFamily = String(row[evidence.map.SOURCE_FAMILY] || '');
    if (!sourceFamily || sourceFamily === mapping.family) {
      throw new Error('RS13_CROSS_FAMILY_INVALID:' + key);
    }

    var result = String(row[evidence.map.SOURCE_RESULT] || '');
    var linkId = String(row[evidence.map.LINK_ID] || '');
    if (!linkId) throw new Error('RS13_LINK_ID_MISSING');

    out.push([
      'MSO|' + linkId,
      linkId,
      String(row[evidence.map.EVIDENCE_EVENT_ID] || ''),
      level,
      sourceFamily,
      mapping.family,
      targetSkill,
      conceptId,
      role,
      result,
      provenance,
      mapping.status,
      'TRUE',
      'TRUE',
      h3MultiSkillShadowClass_(role,result),
      'FALSE',
      'TRUE',
      String(row[evidence.map.CREATED_AT] || ''),
      'PASS_SHADOW_OBSERVED',
      'Real prospective secondary evidence observed; scheduler not applied.'
    ]);
  });

  return out;
}

function h3MultiSkillShadowRowsEqual_(a, b) {
  return JSON.stringify(a.map(String)) === JSON.stringify(b.map(String));
}

function h3MultiSkillShadowPersistEvidenceValues_(
  spreadsheet,
  evidenceValues
) {
  h3MultiSkillShadowRequireCaptureGlobals_();

  var conceptValues = h3MultiSkillReadValues_(
    spreadsheet,
    H3_MULTI_SKILL_CONCEPT_SHEET_,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,
    'RS13_CONCEPT_MAP'
  );
  var wanted = h3MultiSkillShadowBuildRowsFromValues_(
    evidenceValues,
    conceptValues
  );

  if (!wanted.length) {
    return {
      schema:'H3_MULTI_SKILL_SHADOW_RESULT_V1',
      contract_id:H3_MULTI_SKILL_SHADOW_CONTRACT_ID_,
      status:'NO_REAL_DATA',
      written:0,
      no_op:0
    };
  }

  var sheet = spreadsheet.getSheetByName(H3_MULTI_SKILL_SHADOW_SHEET_);
  if (!sheet) throw new Error('RS13_SHADOW_SHEET_MISSING');

  var existingValues = h3MultiSkillReadValues_(
    spreadsheet,
    H3_MULTI_SKILL_SHADOW_SHEET_,
    H3_MULTI_SKILL_SHADOW_HEADERS_,
    'RS13_SHADOW'
  );
  var existing = h3MultiSkillTableFromValues_(
    existingValues,
    H3_MULTI_SKILL_SHADOW_HEADERS_,
    'RS13_SHADOW'
  );
  var byId = {};
  existing.rows.forEach(function (row) {
    var id = String(row[0] || '');
    if (!id) return;
    if (byId[id]) throw new Error('RS13_OBSERVATION_ID_DUPLICATE:' + id);
    byId[id] = row;
  });

  var append = [], noOp = 0;
  wanted.forEach(function (row) {
    var id = String(row[0] || '');
    if (!byId[id]) {
      append.push(row);
      return;
    }
    if (!h3MultiSkillShadowRowsEqual_(byId[id],row)) {
      throw new Error('RS13_OBSERVATION_ID_CONFLICT:' + id);
    }
    noOp += 1;
  });

  if (append.length) {
    var start = sheet.getLastRow() + 1;
    sheet.getRange(
      start,1,append.length,H3_MULTI_SKILL_SHADOW_HEADERS_.length
    ).setValues(append);
    SpreadsheetApp.flush();
    var readback = sheet.getRange(
      start,1,append.length,H3_MULTI_SKILL_SHADOW_HEADERS_.length
    ).getDisplayValues();
    for (var i=0;i<append.length;i++) {
      if (!h3MultiSkillShadowRowsEqual_(readback[i],append[i])) {
        throw new Error('RS13_SHADOW_READBACK_FAILED:' + String(i));
      }
    }
  }

  return {
    schema:'H3_MULTI_SKILL_SHADOW_RESULT_V1',
    contract_id:H3_MULTI_SKILL_SHADOW_CONTRACT_ID_,
    status:append.length ? 'PASS' : 'NO_OP',
    written:append.length,
    no_op:noOp
  };
}

function h3MultiSkillShadowObserveRows_(spreadsheet, evidenceRows) {
  if (!Array.isArray(evidenceRows) || !evidenceRows.length) {
    return {
      schema:'H3_MULTI_SKILL_SHADOW_RESULT_V1',
      contract_id:H3_MULTI_SKILL_SHADOW_CONTRACT_ID_,
      status:'NO_REAL_DATA',
      written:0,
      no_op:0
    };
  }
  return h3MultiSkillShadowPersistEvidenceValues_(
    spreadsheet,
    [H3_MULTI_SKILL_HEADERS_].concat(
      evidenceRows.map(function (row) { return row.slice(); })
    )
  );
}

function h3MultiSkillShadowReconcile_(spreadsheet) {
  var evidenceValues = h3MultiSkillReadValues_(
    spreadsheet,
    H3_MULTI_SKILL_EVIDENCE_SHEET_,
    H3_MULTI_SKILL_HEADERS_,
    'RS13_MULTI_SKILL_EVIDENCE'
  );
  return h3MultiSkillShadowPersistEvidenceValues_(
    spreadsheet,
    evidenceValues
  );
}

function h3MultiSkillShadowMetricsFromValues_(shadowValues) {
  var table = h3MultiSkillTableFromValues_(
    shadowValues,
    H3_MULTI_SKILL_SHADOW_HEADERS_,
    'RS13_SHADOW'
  );
  var metrics = {
    total:0,
    event_ids:{},
    source_family:{},
    target_family:{},
    role:{},
    result:{},
    concept:{},
    scheduler_applied_true:0,
    unsafe_rows:0
  };
  table.rows.forEach(function (row) {
    if (String(row[table.map.STATUS] || '') !== 'PASS_SHADOW_OBSERVED') {
      return;
    }
    metrics.total += 1;
    metrics.event_ids[String(row[table.map.EVIDENCE_EVENT_ID] || '')] = true;
    [
      ['source_family',table.map.SOURCE_FAMILY],
      ['target_family',table.map.TARGET_FAMILY],
      ['role',table.map.LINK_ROLE],
      ['result',table.map.SOURCE_RESULT],
      ['concept',table.map.CONCEPT_ID]
    ].forEach(function (spec) {
      var value = String(row[spec[1]] || '');
      metrics[spec[0]][value] = (metrics[spec[0]][value] || 0) + 1;
    });
    if (String(row[table.map.SCHEDULER_APPLIED] || '') === 'TRUE') {
      metrics.scheduler_applied_true += 1;
    }
    if (String(row[table.map.TRANSFER_SAFE] || '') !== 'TRUE' ||
        String(row[table.map.CROSS_FAMILY] || '') !== 'TRUE' ||
        String(row[table.map.SHADOW_ONLY] || '') !== 'TRUE') {
      metrics.unsafe_rows += 1;
    }
  });
  metrics.distinct_event_count = Object.keys(metrics.event_ids).length;
  delete metrics.event_ids;
  return metrics;
}
