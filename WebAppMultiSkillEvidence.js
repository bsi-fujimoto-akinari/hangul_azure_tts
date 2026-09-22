/**
 * H3 RS-12 prospective secondary-evidence capture.
 *
 * No semantic inference. Only explicitly authored, HIGH-confidence,
 * author-verified exact links may become COMMITTED_LEARNING secondary evidence.
 * This file never mutates formal skill state, retest closure, stability,
 * learner history, score, Review, clocks, counters, or pointers.
 */

var H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_ =
  'H3-RS12-PROSPECTIVE-CAPTURE-20260922-V1';
var H3_MULTI_SKILL_AUTHORING_CONTRACT_ID_ =
  'H3-RS12-AUTHOR-VERIFIED-EXACT-V1';
var H3_MULTI_SKILL_EVIDENCE_SHEET_ =
  'multi_skill_evidence_v1';
var H3_MULTI_SKILL_CONCEPT_SHEET_ =
  'skill_concept_map_v1';

var H3_MULTI_SKILL_HEADERS_ = [
  'LINK_ID','EVIDENCE_EVENT_ID','LEVEL','EVENT_SCOPE','SOURCE_EVENT_REF',
  'SOURCE_SET_ID','SOURCE_TXN_ID','SOURCE_Q_NO','SOURCE_SURFACE_KEY',
  'SOURCE_RESULT','SOURCE_FAMILY','DIRECT_SKILL_ID','LINK_ROLE',
  'TARGET_SKILL_ID','CONCEPT_ID','CONFIDENCE','PROVENANCE_KIND',
  'PROVENANCE_REF','DIRECT_STATE_AUTHORITY','STATE_TRANSFER',
  'RETEST_CLOSURE_TRANSFER','STABILITY_TRANSFER','SCHEDULER_USE',
  'STATUS','CREATED_AT','NOTES'
];

var H3_MULTI_SKILL_CONCEPT_HEADERS_ = [
  'CONCEPT_ID','LEVEL','CONCEPT_DOMAIN','CONCEPT_LABEL','SKILL_ID','FAMILY',
  'SECTION_KEY','APPLICATION_LABEL','MAPPING_ROLE','MATCH_TYPE','CONFIDENCE',
  'DIRECT_REUSE','STATE_TRANSFER','RETEST_CLOSURE','STABILITY_TRANSFER',
  'SCHEDULER_USE','SOURCE_REF','SOURCE_SNAPSHOT_ID','CREATED_AT','STATUS','NOTES'
];

function h3MultiSkillRequiredString_(value, code) {
  var text = String(value || '').trim();
  if (!text) throw new Error(code);
  return text;
}

function h3MultiSkillNormalizeAuthoredLinks_(links) {
  if (links === undefined || links === null) return [];
  if (!Array.isArray(links)) {
    throw new Error('MULTI_SKILL_AUTHORED_LINKS_NOT_ARRAY');
  }
  var seen = {};
  return links.map(function (raw, index) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('MULTI_SKILL_AUTHORED_LINK_INVALID:' + index);
    }
    var role = h3MultiSkillRequiredString_(
      raw.link_role,'MULTI_SKILL_LINK_ROLE_MISSING:' + index);
    if (role !== 'CONTRIBUTORY' && role !== 'INCIDENTAL') {
      throw new Error('MULTI_SKILL_LINK_ROLE_INVALID:' + index);
    }
    var target = h3MultiSkillRequiredString_(
      raw.target_skill_id,'MULTI_SKILL_TARGET_SKILL_MISSING:' + index);
    var concept = h3MultiSkillRequiredString_(
      raw.concept_id,'MULTI_SKILL_CONCEPT_MISSING:' + index);
    var confidence = h3MultiSkillRequiredString_(
      raw.confidence,'MULTI_SKILL_CONFIDENCE_MISSING:' + index);
    var contract = h3MultiSkillRequiredString_(
      raw.annotation_contract_id,'MULTI_SKILL_AUTHORING_CONTRACT_MISSING:' + index);
    if (confidence !== 'HIGH') {
      throw new Error('MULTI_SKILL_CONFIDENCE_NOT_HIGH:' + index);
    }
    if (contract !== H3_MULTI_SKILL_AUTHORING_CONTRACT_ID_) {
      throw new Error('MULTI_SKILL_AUTHORING_CONTRACT_INVALID:' + index);
    }
    var key = [role,target,concept].join('|');
    if (seen[key]) throw new Error('MULTI_SKILL_AUTHORED_LINK_DUPLICATE:' + key);
    seen[key] = true;
    return {
      link_role: role,
      target_skill_id: target,
      concept_id: concept,
      confidence: 'HIGH',
      annotation_contract_id: H3_MULTI_SKILL_AUTHORING_CONTRACT_ID_
    };
  });
}

function h3MultiSkillTableFromValues_(values, headers, label) {
  if (!Array.isArray(values) || !values.length) {
    throw new Error(label + '_EMPTY');
  }
  if (JSON.stringify(values[0]) !== JSON.stringify(headers)) {
    throw new Error(label + '_HEADER_MISMATCH');
  }
  var map = {};
  headers.forEach(function (name, i) { map[name] = i; });
  return {map:map, rows:values.slice(1)};
}

function h3MultiSkillConceptIndexFromValues_(values) {
  var table = h3MultiSkillTableFromValues_(
    values,H3_MULTI_SKILL_CONCEPT_HEADERS_,'MULTI_SKILL_CONCEPT_MAP');
  var out = {};
  table.rows.forEach(function (row) {
    var status = String(row[table.map.STATUS] || '');
    if (status !== 'ACTIVE_PILOT' && status !== 'ACTIVE') return;
    if (String(row[table.map.MAPPING_ROLE] || '') !== 'APPLICATION_SKILL') return;
    if (String(row[table.map.CONFIDENCE] || '') !== 'HIGH') return;
    if (String(row[table.map.DIRECT_REUSE] || '') !== 'NO' ||
        String(row[table.map.STATE_TRANSFER] || '') !== 'NO' ||
        String(row[table.map.RETEST_CLOSURE] || '') !== 'NO' ||
        String(row[table.map.STABILITY_TRANSFER] || '') !== 'NO' ||
        String(row[table.map.SCHEDULER_USE] || '') !==
          'DIAGNOSTIC_SELECTION_ONLY') {
      throw new Error('MULTI_SKILL_CONCEPT_MAP_UNSAFE');
    }
    var key = [
      String(row[table.map.LEVEL] || ''),
      String(row[table.map.SKILL_ID] || ''),
      String(row[table.map.CONCEPT_ID] || '')
    ].join('|');
    if (out[key]) throw new Error('MULTI_SKILL_CONCEPT_MAP_DUPLICATE:' + key);
    out[key] = {
      level:String(row[table.map.LEVEL] || ''),
      skill_id:String(row[table.map.SKILL_ID] || ''),
      family:String(row[table.map.FAMILY] || ''),
      section_key:String(row[table.map.SECTION_KEY] || ''),
      concept_id:String(row[table.map.CONCEPT_ID] || '')
    };
  });
  return out;
}

function h3MultiSkillReadValues_(spreadsheet, sheetName, headers, label) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(label + '_SHEET_MISSING');
  var last = Math.max(1,sheet.getLastRow());
  return sheet.getRange(1,1,last,headers.length).getDisplayValues();
}

function h3MultiSkillConceptIndex_(spreadsheet) {
  return h3MultiSkillConceptIndexFromValues_(
    h3MultiSkillReadValues_(
      spreadsheet,H3_MULTI_SKILL_CONCEPT_SHEET_,
      H3_MULTI_SKILL_CONCEPT_HEADERS_,'MULTI_SKILL_CONCEPT_MAP'));
}

function h3MultiSkillValidateEvent_(event) {
  if (!event || typeof event !== 'object') {
    throw new Error('MULTI_SKILL_EVENT_INVALID');
  }
  var out = {
    level:h3MultiSkillRequiredString_(event.level,'MULTI_SKILL_LEVEL_MISSING'),
    source_family:h3MultiSkillRequiredString_(
      event.source_family,'MULTI_SKILL_SOURCE_FAMILY_MISSING'),
    source_event_ref:h3MultiSkillRequiredString_(
      event.source_event_ref,'MULTI_SKILL_SOURCE_EVENT_REF_MISSING'),
    source_set_id:h3MultiSkillRequiredString_(
      event.source_set_id,'MULTI_SKILL_SOURCE_SET_ID_MISSING'),
    source_txn_id:h3MultiSkillRequiredString_(
      event.source_txn_id,'MULTI_SKILL_SOURCE_TXN_ID_MISSING'),
    source_q_no:Number(event.source_q_no),
    source_surface_key:h3MultiSkillRequiredString_(
      event.source_surface_key,'MULTI_SKILL_SOURCE_SURFACE_MISSING'),
    source_result:h3MultiSkillRequiredString_(
      event.source_result,'MULTI_SKILL_SOURCE_RESULT_MISSING'),
    direct_skill_id:h3MultiSkillRequiredString_(
      event.direct_skill_id,'MULTI_SKILL_DIRECT_SKILL_MISSING')
  };
  if (!Number.isInteger(out.source_q_no) || out.source_q_no < 1) {
    throw new Error('MULTI_SKILL_SOURCE_Q_NO_INVALID');
  }
  if (['○','△','×'].indexOf(out.source_result) < 0) {
    throw new Error('MULTI_SKILL_SOURCE_RESULT_INVALID');
  }
  return out;
}

function h3MultiSkillBuildRowsFromValues_(event, authoredLinks, conceptValues, createdAt) {
  var e = h3MultiSkillValidateEvent_(event);
  var links = h3MultiSkillNormalizeAuthoredLinks_(authoredLinks);
  if (!links.length) return [];
  var concepts = h3MultiSkillConceptIndexFromValues_(conceptValues);
  var timestamp = h3MultiSkillRequiredString_(
    createdAt,'MULTI_SKILL_CREATED_AT_MISSING');
  var evidenceEventId = [
    'MSE',e.source_family,e.source_txn_id,'Q' + String(e.source_q_no)
  ].join('|');

  return links.map(function (link) {
    if (link.target_skill_id === e.direct_skill_id) {
      throw new Error('MULTI_SKILL_SECONDARY_EQUALS_DIRECT:' + link.target_skill_id);
    }
    var key = [e.level,link.target_skill_id,link.concept_id].join('|');
    var mapping = concepts[key];
    if (!mapping) throw new Error('MULTI_SKILL_TARGET_MAPPING_MISSING:' + key);
    if (!mapping.family || mapping.family === e.source_family) {
      throw new Error('MULTI_SKILL_TARGET_NOT_CROSS_FAMILY:' + key);
    }
    var linkId = [
      'MSL',evidenceEventId,link.link_role,link.target_skill_id,link.concept_id
    ].join('|');
    return [
      linkId,
      evidenceEventId,
      e.level,
      'COMMITTED_LEARNING',
      e.source_event_ref,
      e.source_set_id,
      e.source_txn_id,
      e.source_q_no,
      e.source_surface_key,
      e.source_result,
      e.source_family,
      e.direct_skill_id,
      link.link_role,
      link.target_skill_id,
      link.concept_id,
      'HIGH',
      'AUTHOR_VERIFIED_EXACT',
      H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_ + ':' +
        H3_MULTI_SKILL_AUTHORING_CONTRACT_ID_,
      'NO','NO','NO','NO',
      'DIAGNOSTIC_ONLY',
      'ACTIVE_COMMITTED',
      timestamp,
      'Prospective secondary evidence only; no mastery/retest/stability transfer.'
    ];
  });
}

function h3MultiSkillPreflight_(spreadsheet, event, authoredLinks) {
  if (!authoredLinks || !authoredLinks.length) {
    return {status:'NO_LINKS',rows:0};
  }
  var values = h3MultiSkillReadValues_(
    spreadsheet,H3_MULTI_SKILL_CONCEPT_SHEET_,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,'MULTI_SKILL_CONCEPT_MAP');
  var rows = h3MultiSkillBuildRowsFromValues_(
    event,authoredLinks,values,'PREFLIGHT_ONLY');
  return {status:'PASS',rows:rows.length};
}

function h3MultiSkillRowsEqual_(a,b) {
  return JSON.stringify(a.map(String)) === JSON.stringify(b.map(String));
}

function h3MultiSkillPersistCommitted_(spreadsheet, event, authoredLinks, createdAt) {
  var links = h3MultiSkillNormalizeAuthoredLinks_(authoredLinks);
  if (!links.length) {
    return {
      schema:'H3_MULTI_SKILL_CAPTURE_RESULT_V1',
      contract_id:H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_,
      status:'NO_LINKS',written:0,no_op:0
    };
  }

  var conceptValues = h3MultiSkillReadValues_(
    spreadsheet,H3_MULTI_SKILL_CONCEPT_SHEET_,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,'MULTI_SKILL_CONCEPT_MAP');
  var wanted = h3MultiSkillBuildRowsFromValues_(
    event,links,conceptValues,createdAt);
  var sheet = spreadsheet.getSheetByName(H3_MULTI_SKILL_EVIDENCE_SHEET_);
  if (!sheet) throw new Error('MULTI_SKILL_EVIDENCE_SHEET_MISSING');
  var existingValues = h3MultiSkillReadValues_(
    spreadsheet,H3_MULTI_SKILL_EVIDENCE_SHEET_,
    H3_MULTI_SKILL_HEADERS_,'MULTI_SKILL_EVIDENCE');
  var existing = h3MultiSkillTableFromValues_(
    existingValues,H3_MULTI_SKILL_HEADERS_,'MULTI_SKILL_EVIDENCE');
  var byId = {};
  existing.rows.forEach(function (row) {
    var id = String(row[0] || '');
    if (!id) return;
    if (byId[id]) throw new Error('MULTI_SKILL_EXISTING_LINK_ID_DUPLICATE:' + id);
    byId[id] = row;
  });

  var append = [], noOp = 0;
  wanted.forEach(function (row) {
    var id = String(row[0]);
    if (!byId[id]) {
      append.push(row);
      return;
    }
    if (!h3MultiSkillRowsEqual_(byId[id],row)) {
      throw new Error('MULTI_SKILL_LINK_ID_CONFLICT:' + id);
    }
    noOp += 1;
  });

  if (append.length) {
    var start = sheet.getLastRow() + 1;
    sheet.getRange(start,1,append.length,H3_MULTI_SKILL_HEADERS_.length)
      .setValues(append);
    SpreadsheetApp.flush();
    var readback = sheet.getRange(
      start,1,append.length,H3_MULTI_SKILL_HEADERS_.length).getDisplayValues();
    for (var i=0;i<append.length;i++) {
      if (!h3MultiSkillRowsEqual_(readback[i],append[i])) {
        throw new Error('MULTI_SKILL_APPEND_READBACK_FAILED:' + String(i));
      }
    }
  }

  return {
    schema:'H3_MULTI_SKILL_CAPTURE_RESULT_V1',
    contract_id:H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_,
    status:append.length ? 'PASS' : 'NO_OP',
    written:append.length,
    no_op:noOp
  };
}

function h3MultiSkillAttachCapture_(result, fn) {
  try {
    result.secondary_evidence_sync = fn();
  } catch (err) {
    result.secondary_evidence_sync = {
      schema:'H3_MULTI_SKILL_CAPTURE_RESULT_V1',
      contract_id:H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_,
      status:'RECOVERY_REQUIRED',
      error:String(err && err.message || err)
    };
  }
  return result;
}

function h3MultiSkillWrittenLinks_(context) {
  var meta = JSON.parse(String(context.questionMetaJson || '{}'));
  if (!meta || !Array.isArray(meta.questions) || meta.questions.length !== 5) {
    throw new Error('MULTI_SKILL_WRITTEN_META_INVALID');
  }
  return meta.questions.map(function (q) {
    return h3MultiSkillNormalizeAuthoredLinks_(
      q && q.secondary_evidence_links);
  });
}

function h3MultiSkillWrittenPreflight_(spreadsheet,context) {
  var linksByQ=h3MultiSkillWrittenLinks_(context);
  var meta=JSON.parse(context.questionMetaJson);
  var total=0;
  linksByQ.forEach(function (links,index) {
    if (!links.length) return;
    total += h3MultiSkillPreflight_(
      spreadsheet,
      {
        level:'3級',source_family:'WRITTEN',
        source_event_ref:'PREFLIGHT|WRITTEN|Q' + String(index+1),
        source_set_id:context.setId,source_txn_id:'PREFLIGHT',
        source_q_no:index+1,
        source_surface_key:'PREFLIGHT|WRITTEN|' + context.stageId + '|Q' + String(index+1),
        source_result:'○',
        direct_skill_id:String(meta.questions[index].skill_id || '')
      },
      links
    ).rows;
  });
  return {status:total ? 'PASS' : 'NO_LINKS',rows:total};
}

function h3MultiSkillListeningPreflight_(spreadsheet,context) {
  var lm=context.logTable.map,total=0;
  H3_WEB_PROD_SECTIONS.forEach(function (section,index) {
    var links=h3MultiSkillListeningLinks_(context,section);
    if (!links.length) return;
    var log=context.logRows[index].row;
    total += h3MultiSkillPreflight_(
      spreadsheet,
      {
        level:'3級',source_family:'LISTENING',
        source_event_ref:'PREFLIGHT|LISTENING|' + section,
        source_set_id:context.setId,source_txn_id:'PREFLIGHT',
        source_q_no:index+1,
        source_surface_key:String(log[lm.SURFACE_HASH] || ''),
        source_result:'○',
        direct_skill_id:String(log[lm.SKILL_ID] || '')
      },
      links
    ).rows;
  });
  return {status:total ? 'PASS' : 'NO_LINKS',rows:total};
}

function h3MultiSkillReadingPreflight_(spreadsheet,context) {
  var total=0;
  context.locked.items.forEach(function (item,index) {
    var links=h3MultiSkillNormalizeAuthoredLinks_(
      item && item.secondary_evidence_links);
    if (!links.length) return;
    total += h3MultiSkillPreflight_(
      spreadsheet,
      {
        level:context.stage.level,source_family:'READING',
        source_event_ref:'PREFLIGHT|READING|Q' + String(index+1),
        source_set_id:context.stage.set_id,source_txn_id:'PREFLIGHT',
        source_q_no:index+1,
        source_surface_key:'READING|' + item.passage_sha256 + '|' + item.item_sha256,
        source_result:'○',direct_skill_id:String(item.skill_id || '')
      },
      links
    ).rows;
  });
  return {status:total ? 'PASS' : 'NO_LINKS',rows:total};
}

function h3MultiSkillTranslationV2Preflight_(spreadsheet,context) {
  var total=0;
  context.locked.items.forEach(function (item,index) {
    var links=h3MultiSkillNormalizeAuthoredLinks_(
      item && item.secondary_evidence_links);
    if (!links.length) return;
    total += h3MultiSkillPreflight_(
      spreadsheet,
      {
        level:context.stage.level,source_family:'TRANSLATION',
        source_event_ref:'PREFLIGHT|TRANSLATION|Q' + String(index+1),
        source_set_id:context.stage.set_id,source_txn_id:'PREFLIGHT',
        source_q_no:index+1,source_surface_key:String(item.surface_key || ''),
        source_result:'○',direct_skill_id:String(item.skill_id || '')
      },
      links
    ).rows;
  });
  return {status:total ? 'PASS' : 'NO_LINKS',rows:total};
}

function h3MultiSkillWrittenCapture_(
  spreadsheet,context,grade,txnId,createdAt
) {
  var linksByQ = h3MultiSkillWrittenLinks_(context);
  var total={written:0,no_op:0,status:'NO_LINKS'};
  grade.graded.forEach(function (g,index) {
    var links=linksByQ[index];
    if (!links.length) return;
    var meta=JSON.parse(context.questionMetaJson).questions[index];
    var r=h3MultiSkillPersistCommitted_(
      spreadsheet,
      {
        level:'3級',source_family:'WRITTEN',
        source_event_ref:'WRITTEN|' + txnId + '|Q' + String(index+1),
        source_set_id:context.setId,source_txn_id:txnId,source_q_no:index+1,
        source_surface_key:'WRITTEN|' + context.stageId + '|Q' + String(index+1),
        source_result:String(g.mark || g.result || ''),
        direct_skill_id:String(meta.skill_id || '')
      },
      links,createdAt);
    total.written+=Number(r.written||0); total.no_op+=Number(r.no_op||0);
    total.status='PASS';
  });
  return Object.assign({
    schema:'H3_MULTI_SKILL_CAPTURE_RESULT_V1',
    contract_id:H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_
  },total);
}

function h3MultiSkillListeningLinks_(context,section) {
  var item = null;
  if (context.itemPayloads && context.itemPayloads[section]) {
    item=context.itemPayloads[section];
  }
  return h3MultiSkillNormalizeAuthoredLinks_(
    item && item.secondary_evidence_links);
}

function h3MultiSkillListeningCapture_(
  spreadsheet,context,graded,txnId,createdAt
) {
  var lm=context.logTable.map, total={written:0,no_op:0,status:'NO_LINKS'};
  graded.forEach(function (g,index) {
    var section=String(g.section || '');
    var links=h3MultiSkillListeningLinks_(context,section);
    if (!links.length) return;
    var log=context.logRows[index].row;
    var r=h3MultiSkillPersistCommitted_(
      spreadsheet,
      {
        level:'3級',source_family:'LISTENING',
        source_event_ref:'LISTENING|' + txnId + '|' + section,
        source_set_id:context.setId,source_txn_id:txnId,source_q_no:index+1,
        source_surface_key:String(log[lm.SURFACE_HASH] || ''),
        source_result:String(g.result || ''),
        direct_skill_id:String(log[lm.SKILL_ID] || '')
      },
      links,createdAt);
    total.written+=Number(r.written||0); total.no_op+=Number(r.no_op||0);
    total.status='PASS';
  });
  return Object.assign({
    schema:'H3_MULTI_SKILL_CAPTURE_RESULT_V1',
    contract_id:H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_
  },total);
}

function h3MultiSkillReadingCapture_(
  spreadsheet,context,grade,txnId,createdAt
) {
  var total={written:0,no_op:0,status:'NO_LINKS'};
  grade.graded.forEach(function (g,index) {
    var item=context.locked.items[index];
    var links=h3MultiSkillNormalizeAuthoredLinks_(
      item && item.secondary_evidence_links);
    if (!links.length) return;
    var r=h3MultiSkillPersistCommitted_(
      spreadsheet,
      {
        level:context.stage.level,source_family:'READING',
        source_event_ref:'READING|' + txnId + '|Q' + String(g.q_no),
        source_set_id:context.stage.set_id,source_txn_id:txnId,source_q_no:g.q_no,
        source_surface_key:'READING|' + item.passage_sha256 + '|' + item.item_sha256,
        source_result:String(g.mark || ''),
        direct_skill_id:String(g.skill_id || item.skill_id || '')
      },
      links,createdAt);
    total.written+=Number(r.written||0); total.no_op+=Number(r.no_op||0);
    total.status='PASS';
  });
  return Object.assign({
    schema:'H3_MULTI_SKILL_CAPTURE_RESULT_V1',
    contract_id:H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_
  },total);
}

function h3MultiSkillTranslationV2Capture_(
  spreadsheet,context,grade,txnId,createdAt
) {
  var total={written:0,no_op:0,status:'NO_LINKS'};
  grade.graded.forEach(function (g,index) {
    var item=context.locked.items[index];
    var links=h3MultiSkillNormalizeAuthoredLinks_(
      item && item.secondary_evidence_links);
    if (!links.length) return;
    var r=h3MultiSkillPersistCommitted_(
      spreadsheet,
      {
        level:context.stage.level,source_family:'TRANSLATION',
        source_event_ref:'TRANSLATION|' + txnId + '|Q' + String(g.q_no),
        source_set_id:context.stage.set_id,source_txn_id:txnId,source_q_no:g.q_no,
        source_surface_key:String(item.surface_key || ''),
        source_result:String(g.mark || ''),
        direct_skill_id:String(g.skill_id || item.skill_id || '')
      },
      links,createdAt);
    total.written+=Number(r.written||0); total.no_op+=Number(r.no_op||0);
    total.status='PASS';
  });
  return Object.assign({
    schema:'H3_MULTI_SKILL_CAPTURE_RESULT_V1',
    contract_id:H3_MULTI_SKILL_CAPTURE_CONTRACT_ID_
  },total);
}
