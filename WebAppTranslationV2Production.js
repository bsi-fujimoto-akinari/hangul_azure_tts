/**
 * H3 Translation V2 production persistence and scheduler projection.
 *
 * V1 history remains immutable. V2 is used only for rows in translation_stage_v2.
 * Family clock / rt sidecars advance only after an authoritative COMMITTED V2 txn.
 */

var H3_TRANSLATION_V2_PRODUCTION_CONTRACT_ID_ =
  'H3-TRANSLATION-V2-PRODUCTION-20260922-V1';

var H3_RT_EVIDENCE_SHEET_ = 'rt_evidence_v1';
var H3_RT_SKILL_QUEUE_SHEET_ = 'rt_skill_queue_v1';
var H3_RT_LANE_STATE_SHEET_ = 'rt_lane_state_v1';

var H3_RT_EVIDENCE_HEADERS_ = [
  'EVENT_ID','LEVEL','FAMILY','SKILL_ID','TRANSLATION_DIRECTION','SECTION_KEY',
  'SET_ID','TXN_ID','Q_NO','ITEM_ID','SURFACE_KEY','RESULT','UNCERTAIN',
  'SET_MODE','FAMILY_CLOCK_INDEX','ANSWERED_AT','SOURCE_LOG_KIND',
  'SOURCE_ROW_FINGERPRINT','SOURCE_BINDING_SHA256','SOURCE_ITEM_SHA256','MIGRATION_ID'
];

var H3_RT_SKILL_QUEUE_HEADERS_ = [
  'LEVEL','FAMILY','SKILL_ID','TRANSLATION_DIRECTION','LATEST_RESULT',
  'LATEST_NONCORRECT_RESULT','LATEST_EVENT_ID','STRICT_ORIGIN_CLOCK',
  'DUE_MIN','DUE_MAX','SPACED_CORRECT_COUNT','STABILITY_STATUS','LAST_SET_ID',
  'LAST_SURFACE_KEY','SECTION_EVIDENCE_JSON','UPDATED_AT'
];

var H3_RT_LANE_STATE_HEADERS_ = [
  'LEVEL','READING_CLOCK','TRANSLATION_CLOCK','LAST_RT_FAMILY',
  'READING_FAMILY_SKIP_COUNT','TRANSLATION_FAMILY_SKIP_COUNT',
  'READING_SECTION_CURSOR','READING_SECTION_SKIP_JSON','P9_DEBT',
  'LAST_TRANSLATION_CORE_PROFILE','LAST_TRANSLATION_ACTION',
  'EDF_DIRECTION_OVERRIDE_STREAK','LAST_CONSUMED_5W_CORE_SET_ID','UPDATED_AT',
  'INITIALIZATION_NOTE'
];

function h3TranslationV2ProdTable_(sheet, headers, label) {
  return h3TranslationProdTable_(sheet, headers, label);
}

function h3TranslationV2ProdStageFromRow_(table, record) {
  var row = record.row;
  var map = table.map;
  var stage = {
    schema:H3_TRANSLATION_V2_STAGE_SCHEMA_,
    contract_id:H3_TRANSLATION_V2_CONTRACT_ID_,
    provider_kind:'WRITTEN',
    surface_family:'TRANSLATION',
    issue_no:Number(row[map.ISSUE_NO]),
    stage_id:String(row[map.STAGE_ID] || ''),
    set_id:String(row[map.SET_ID] || ''),
    status:String(row[map.STATUS] || ''),
    level:String(row[map.LEVEL] || ''),
    profile:String(row[map.PROFILE] || ''),
    answer_type:String(row[map.ANSWER_TYPE] || ''),
    item_count:Number(row[map.ITEM_COUNT]),
    source_binding_sha256:String(row[map.SOURCE_BINDING_SHA256] || ''),
    locked_bundle_sha256:String(row[map.LOCKED_BUNDLE_SHA256] || ''),
    locked_bundle_json:String(row[map.LOCKED_BUNDLE_JSON] || ''),
    created_at:String(row[map.CREATED_AT] || ''),
    locked_at:String(row[map.LOCKED_AT] || ''),
    issued_at:String(row[map.ISSUED_AT] || ''),
    committed_at:String(row[map.COMMITTED_AT] || '')
  };
  var locked;
  try {
    locked = JSON.parse(stage.locked_bundle_json);
  } catch (_err) {
    throw new Error('TRANSLATION_V2_LOCKED_BUNDLE_JSON_INVALID');
  }
  h3TranslationV2ValidateStageLock_(stage, locked);
  return {stage:stage, locked:locked, rowNumber:record.rowNumber};
}

function h3TranslationV2ProdReadContext_(spreadsheet, setId) {
  var wanted = h3TranslationActivationRequireId_(
    setId,'TRANSLATION_V2_PROD_SET_ID_INVALID');
  var stageTable = h3TranslationV2ProdTable_(
    spreadsheet.getSheetByName(H3_TRANSLATION_V2_STAGE_SHEET_),
    H3_TRANSLATION_V2_STAGE_HEADERS_,'TRANSLATION_V2_STAGE');
  var txnTable = h3TranslationV2ProdTable_(
    spreadsheet.getSheetByName(H3_TRANSLATION_V2_TXN_SHEET_),
    H3_TRANSLATION_V2_TXN_HEADERS_,'TRANSLATION_V2_TXN');
  var logTable = h3TranslationV2ProdTable_(
    spreadsheet.getSheetByName(H3_TRANSLATION_V2_LOG_SHEET_),
    H3_TRANSLATION_V2_LOG_HEADERS_,'TRANSLATION_V2_LOG');
  var record = h3TranslationProdFindOne_(
    stageTable,'SET_ID',wanted,'TRANSLATION_V2_STAGE');
  var parsed = h3TranslationV2ProdStageFromRow_(stageTable,record);
  return {
    spreadsheet:spreadsheet,stageTable:stageTable,txnTable:txnTable,logTable:logTable,
    stage:parsed.stage,locked:parsed.locked,stageRowNumber:parsed.rowNumber
  };
}

function h3TranslationV2HasStage_(setId) {
  var wanted = String(setId || '');
  if (!wanted) return false;
  var spreadsheet = SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var table = h3TranslationV2ProdTable_(
    spreadsheet.getSheetByName(H3_TRANSLATION_V2_STAGE_SHEET_),
    H3_TRANSLATION_V2_STAGE_HEADERS_,'TRANSLATION_V2_STAGE');
  var count = table.rows.filter(function (row) {
    return String(row[table.map.SET_ID] || '') === wanted;
  }).length;
  if (count > 1) throw new Error('TRANSLATION_V2_STAGE_DUPLICATE_SET');
  return count === 1;
}

function h3TranslationV2TxnRowsForSet_(context) {
  var out = [];
  context.txnTable.rows.forEach(function (row,index) {
    if (String(row[context.txnTable.map.SET_ID] || '') === context.stage.set_id) {
      out.push({row:row,rowNumber:index+2});
    }
  });
  return out;
}

function h3TranslationV2RequireIssued_(context) {
  if (context.stage.status !== 'ISSUED' ||
      !context.stage.issued_at || context.stage.committed_at) {
    throw new Error('TRANSLATION_V2_STAGE_NOT_ISSUED');
  }
  h3TranslationV2TxnRowsForSet_(context).forEach(function (record) {
    var status = String(record.row[context.txnTable.map.STATUS] || '');
    if (status === 'COMMITTED') throw new Error('TRANSLATION_V2_ALREADY_COMMITTED');
    if (status === 'PREPARED' || status === 'RECOVERY_REQUIRED') {
      throw new Error('TRANSLATION_V2_TXN_BLOCKING');
    }
  });
  return true;
}

function buildTranslationV2ProductionRenderPayload_(request) {
  h3TranslationProdValidateRenderRequest_(request);
  var spreadsheet = SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var context = h3TranslationV2ProdReadContext_(spreadsheet,request.set_id);
  h3TranslationV2RequireIssued_(context);
  var payload = h3TranslationV2BuildRenderPayload_(context.stage,context.locked);
  payload.persisted = true;
  payload.pilot_only = false;
  payload.issue_no = context.stage.issue_no;
  payload.transport = {review:'TRANSLATION_PRODUCTION_V2'};
  return payload;
}

function h3TranslationV2RequestFingerprint_(normalized) {
  return h3TranslationHash_({
    schema:'H3_TRANSLATION_V2_REQUEST_FINGERPRINT_V1',
    mode:normalized.mode,
    provider_kind:normalized.provider_kind,
    surface_family:normalized.surface_family,
    set_id:normalized.set_id,
    profile:normalized.profile,
    answer_type:normalized.answer_type,
    answers:normalized.answers
  });
}

function h3TranslationV2ClassifyExistingTxn_(context,fingerprint) {
  var rows = h3TranslationV2TxnRowsForSet_(context);
  if (rows.length > 1) throw new Error('TRANSLATION_V2_TXN_DUPLICATE_AUTHORITY');
  if (!rows.length) return {action:'NEW',record:null};
  var record=rows[0], row=record.row, map=context.txnTable.map;
  var stored=String(row[map.REQUEST_FINGERPRINT] || '');
  var status=String(row[map.STATUS] || '');
  if (status === 'COMMITTED' && stored === fingerprint) {
    return {action:'RETURN_COMMITTED',record:record};
  }
  if (status === 'COMMITTED') throw new Error('TRANSLATION_V2_TXN_CONFLICT_COMMITTED');
  if (status === 'PREPARED' || status === 'RECOVERY_REQUIRED') {
    throw new Error('TRANSLATION_V2_TXN_RECOVERY_REQUIRED');
  }
  throw new Error('TRANSLATION_V2_TXN_STATUS_INVALID');
}

function h3TranslationV2StoredResult_(context,record) {
  var row=record.row, map=context.txnTable.map, result;
  try { result=JSON.parse(String(row[map.RESULT_JSON] || '')); }
  catch (_err) { throw new Error('TRANSLATION_V2_TXN_RESULT_JSON_INVALID'); }
  if (!result || result.schema !== 'H3_WEB_SUBMIT_RESULT_V1' ||
      result.surface_family !== 'TRANSLATION' ||
      result.translation_profile !== context.stage.profile ||
      result.answer_type !== context.stage.answer_type ||
      result.set_id !== context.stage.set_id ||
      result.txn_id !== String(row[map.TXN_ID] || '') ||
      String(row[map.STATUS] || '') !== 'COMMITTED') {
    throw new Error('TRANSLATION_V2_TXN_RESULT_IDENTITY_INVALID');
  }
  result.status='COMMITTED';
  return result;
}

function h3TranslationV2MarkRecovery_(journal,rowNumber,message) {
  journal.getRange(rowNumber,12).setValue('RECOVERY_REQUIRED');
  journal.getRange(rowNumber,16).setValue(String(message || ''));
  SpreadsheetApp.flush();
}

function h3FsTranslationProjectionRecoveryGate_(ss) {
  var sh=ss.getSheetByName(H3_TRANSLATION_V2_TXN_SHEET_);
  if (!sh) {
    throw new Error(
      'FAMILY_SCHEDULER_TRANSLATION_TXN_MISSING'
    );
  }
  var t=h3TranslationV2ProdTable_(
    sh,
    H3_TRANSLATION_V2_TXN_HEADERS_,
    'TRANSLATION_V2_TXN'
  );
  var blocked=t.rows.filter(function (row) {
    return (
      String(row[t.map.STATUS] || '') === 'COMMITTED' &&
      String(row[t.map.ERROR] || '')
        .indexOf('POSTCOMMIT_PROJECTION:') === 0
    );
  });
  if (blocked.length) {
    throw new Error(
      'FAMILY_SCHEDULER_TRANSLATION_PROJECTION_RECOVERY_REQUIRED:' +
      blocked.length
    );
  }
  return true;
}

function h3TranslationV2RequireCommittedReplay_(
  context,
  record
) {
  var row=record && record.row;
  var map=context && context.txnTable &&
    context.txnTable.map;
  if (
    !context ||
    !context.stage ||
    !row ||
    !map ||
    context.stage.status !== 'COMMITTED' ||
    !context.stage.issued_at ||
    !context.stage.committed_at ||
    String(row[map.SET_ID] || '') !==
      String(context.stage.set_id || '') ||
    String(row[map.STATUS] || '') !==
      'COMMITTED' ||
    !String(row[map.COMMITTED_AT] || '')
  ) {
    throw new Error(
      'TRANSLATION_V2_COMMITTED_REPLAY_STAGE_INVALID'
    );
  }
  return true;
}

function h3TranslationV2VerifyLogRows_(context,txnId,expectedCount) {
  var sheet=context.logTable.sheet, last=sheet.getLastRow();
  if (last < 2) throw new Error('TRANSLATION_V2_LOG_READBACK_EMPTY');
  var rows=sheet.getRange(2,1,last-1,H3_TRANSLATION_V2_LOG_HEADERS_.length)
    .getDisplayValues()
    .filter(function (row) {
      return String(row[0] || '') === String(txnId) &&
        String(row[1] || '') === context.stage.set_id;
    });
  if (rows.length !== expectedCount) {
    throw new Error('TRANSLATION_V2_LOG_READBACK_COUNT_INVALID');
  }
  return true;
}

function h3TranslationV2RtTables_(spreadsheet) {
  return {
    evidence:h3TranslationV2ProdTable_(
      spreadsheet.getSheetByName(H3_RT_EVIDENCE_SHEET_),
      H3_RT_EVIDENCE_HEADERS_,'RT_EVIDENCE'),
    queue:h3TranslationV2ProdTable_(
      spreadsheet.getSheetByName(H3_RT_SKILL_QUEUE_SHEET_),
      H3_RT_SKILL_QUEUE_HEADERS_,'RT_SKILL_QUEUE'),
    lane:h3TranslationV2ProdTable_(
      spreadsheet.getSheetByName(H3_RT_LANE_STATE_SHEET_),
      H3_RT_LANE_STATE_HEADERS_,'RT_LANE_STATE')
  };
}

function h3TranslationV2LaneRow_(tables,level) {
  var matches=[];
  tables.lane.rows.forEach(function (row,index) {
    if (String(row[tables.lane.map.LEVEL] || '') === String(level)) {
      matches.push({row:row,rowNumber:index+2});
    }
  });
  if (matches.length !== 1) {
    throw new Error('TRANSLATION_V2_RT_LANE_LEVEL_COUNT:' + matches.length);
  }
  return matches[0];
}

function h3TranslationV2Latest5WCoreSet_(spreadsheet) {
  var sheet=spreadsheet.getSheetByName('generation_state_v1');
  if (!sheet) throw new Error('TRANSLATION_V2_5W_STATE_MISSING');
  var rows=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),3).getDisplayValues();
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][0] || '') === 'WRITTEN_LAST_HISTORY_SET') {
      var value=String(rows[i][1] || rows[i][2] || '');
      if (!value) throw new Error('TRANSLATION_V2_5W_ANCHOR_EMPTY');
      return value;
    }
  }
  throw new Error('TRANSLATION_V2_5W_ANCHOR_MISSING');
}

function h3TranslationV2EvidenceRowObject_(table,row) {
  var out={};
  table.header.forEach(function (name,index) { out[name]=row[index]; });
  return out;
}

function h3TranslationV2ProjectQueueIdentity_(tables,identity,now) {
  var events=[];
  tables.evidence.rows.forEach(function (row) {
    if (String(row[tables.evidence.map.LEVEL] || '') === identity.level &&
        String(row[tables.evidence.map.FAMILY] || '') === 'TRANSLATION' &&
        String(row[tables.evidence.map.SKILL_ID] || '') === identity.skill_id &&
        String(row[tables.evidence.map.TRANSLATION_DIRECTION] || '') === identity.direction) {
      events.push(h3TranslationV2EvidenceRowObject_(tables.evidence,row));
    }
  });
  events.sort(function (a,b) {
    var ac=Number(a.FAMILY_CLOCK_INDEX || 0), bc=Number(b.FAMILY_CLOCK_INDEX || 0);
    if (ac !== bc) return ac-bc;
    var at=String(a.ANSWERED_AT || ''), bt=String(b.ANSWERED_AT || '');
    if (at !== bt) return at < bt ? -1 : 1;
    return String(a.EVENT_ID || '').localeCompare(String(b.EVENT_ID || ''));
  });
  if (!events.length) throw new Error('TRANSLATION_V2_QUEUE_EVIDENCE_EMPTY');

  var latest=null, latestNoncorrect=null, spaced=0, dueMin='', dueMax='';
  var correctSets={}, correctSurfaces={}, sectionEvidence={};
  events.forEach(function (event) {
    latest=event;
    sectionEvidence[String(event.SECTION_KEY || '')]={
      answered_at:String(event.ANSWERED_AT || ''),
      clock:Number(event.FAMILY_CLOCK_INDEX || 0),
      event_id:String(event.EVENT_ID || ''),
      result:String(event.RESULT || '')
    };
    var result=String(event.RESULT || '');
    if (result === '×' || result === '△') {
      latestNoncorrect=event;
      spaced=0;
      correctSets={};
      correctSurfaces={};
      var origin=Number(event.FAMILY_CLOCK_INDEX || 0);
      dueMin=result === '×' ? origin+1 : origin+2;
      dueMax=result === '×' ? origin+3 : origin+5;
      return;
    }
    if (result === '○') {
      var setId=String(event.SET_ID || '');
      var surface=String(event.SURFACE_KEY || '');
      if (!correctSets[setId] && !correctSurfaces[surface]) {
        correctSets[setId]=true;
        correctSurfaces[surface]=true;
        spaced=Math.min(2,spaced+1);
        if (spaced >= 1) {
          dueMin='';
          dueMax='';
        }
      }
    }
  });

  var status=spaced >= 2 ? 'STABLE' : (spaced === 1 ? 'CORRECT_ONCE' : 'UNSTABLE');
  var raw=[
    identity.level,'TRANSLATION',identity.skill_id,identity.direction,
    String(latest.RESULT || ''),
    latestNoncorrect ? String(latestNoncorrect.RESULT || '') : '',
    String(latest.EVENT_ID || ''),
    latestNoncorrect ? Number(latestNoncorrect.FAMILY_CLOCK_INDEX || 0) : '',
    dueMin,dueMax,spaced,status,
    String(latest.SET_ID || ''),String(latest.SURFACE_KEY || ''),
    h3TranslationCanonicalJson_(sectionEvidence),String(latest.ANSWERED_AT || now)
  ];

  var matches=[];
  tables.queue.rows.forEach(function (row,index) {
    if (String(row[tables.queue.map.LEVEL] || '') === identity.level &&
        String(row[tables.queue.map.FAMILY] || '') === 'TRANSLATION' &&
        String(row[tables.queue.map.SKILL_ID] || '') === identity.skill_id &&
        String(row[tables.queue.map.TRANSLATION_DIRECTION] || '') === identity.direction) {
      matches.push({rowNumber:index+2});
    }
  });
  if (matches.length > 1) throw new Error('TRANSLATION_V2_QUEUE_DUPLICATE_IDENTITY');
  if (matches.length === 1) {
    tables.queue.sheet.getRange(matches[0].rowNumber,1,1,raw.length).setValues([raw]);
  } else {
    tables.queue.sheet.appendRow(raw);
  }
}

function h3TranslationV2ProjectSchedulerAfterCommit_(spreadsheet,context,grade,txnId,now) {
  var tables=h3TranslationV2RtTables_(spreadsheet);
  var laneRecord=h3TranslationV2LaneRow_(tables,context.stage.level);
  var lane=laneRecord.row, lm=tables.lane.map;
  var existingTxnEvents=tables.evidence.rows.filter(function (row) {
    return String(row[tables.evidence.map.TXN_ID] || '') === String(txnId);
  });
  var currentClock=Number(lane[lm.TRANSLATION_CLOCK] || 0);
  var targetClock;
  if (existingTxnEvents.length) {
    var clocks={};
    existingTxnEvents.forEach(function (row) {
      clocks[String(row[tables.evidence.map.FAMILY_CLOCK_INDEX] || '')]=true;
    });
    var keys=Object.keys(clocks);
    if (keys.length !== 1) throw new Error('TRANSLATION_V2_EVIDENCE_CLOCK_CONFLICT');
    targetClock=Number(keys[0]);
    if (!(currentClock === targetClock || currentClock === targetClock-1)) {
      throw new Error('TRANSLATION_V2_LANE_RECOVERY_CLOCK_INVALID');
    }
  } else {
    targetClock=currentClock+1;
  }

  var itemByKey={};
  context.locked.items.forEach(function (item) { itemByKey[item.question_key]=item; });
  var logRows=context.logTable.sheet.getRange(
    2,1,Math.max(0,context.logTable.sheet.getLastRow()-1),
    H3_TRANSLATION_V2_LOG_HEADERS_.length).getDisplayValues();
  var logMap=context.logTable.map;
  var txnLogs=logRows.filter(function (row) {
    return String(row[logMap.TXN_ID] || '') === String(txnId);
  });
  if (txnLogs.length !== grade.total) throw new Error('TRANSLATION_V2_PROJECTION_LOG_COUNT_INVALID');

  txnLogs.forEach(function (row) {
    var qNo=Number(row[logMap.Q_NO] || 0);
    var questionKey=String(row[logMap.QUESTION_KEY] || '');
    var item=itemByKey[questionKey];
    if (!item) throw new Error('TRANSLATION_V2_PROJECTION_ITEM_MISSING');
    var eventId='T|' + String(txnId) + '|' + String(qNo);
    var eventRaw=[
      eventId,context.stage.level,'TRANSLATION',String(row[logMap.SKILL_ID] || ''),
      String(row[logMap.TRANSLATION_DIRECTION] || ''),String(row[logMap.SECTION_KEY] || ''),
      context.stage.set_id,String(txnId),qNo,String(row[logMap.ITEM_ID] || ''),
      item.surface_key,String(row[logMap.RESULT] || ''),
      String(row[logMap.UNCERTAIN] || '') === 'TRUE','CORE',targetClock,
      String(row[logMap.ANSWERED_AT] || now),'translation_log_v2',
      h3TranslationHash_({
        txn_id:String(txnId),set_id:context.stage.set_id,q_no:qNo,
        item_id:String(row[logMap.ITEM_ID] || ''),question_key:questionKey,
        skill_id:String(row[logMap.SKILL_ID] || ''),section_key:String(row[logMap.SECTION_KEY] || ''),
        result:String(row[logMap.RESULT] || ''),uncertain:String(row[logMap.UNCERTAIN] || ''),
        translation_direction:String(row[logMap.TRANSLATION_DIRECTION] || ''),
        answered_at:String(row[logMap.ANSWERED_AT] || now)
      }),
      context.stage.source_binding_sha256,item.source_item_sha256,
      'H3-RS07-LIVE-V2-PROJECTION-20260922-V1'
    ];

    var matches=[];
    tables.evidence.rows.forEach(function (eRow,index) {
      if (String(eRow[tables.evidence.map.EVENT_ID] || '') === eventId) {
        matches.push({row:eRow,rowNumber:index+2});
      }
    });
    if (matches.length > 1) throw new Error('TRANSLATION_V2_EVIDENCE_DUPLICATE_EVENT');
    if (matches.length === 1) {
      if (JSON.stringify(matches[0].row) !== JSON.stringify(eventRaw.map(function (x) {
        if (typeof x === 'boolean') return x ? 'TRUE' : 'FALSE';
        return String(x);
      }))) {
        var stored=matches[0].row.map(function (x) { return String(x); });
        var wanted=eventRaw.map(function (x) {
          if (typeof x === 'boolean') return x ? 'TRUE' : 'FALSE';
          return String(x);
        });
        if (JSON.stringify(stored) !== JSON.stringify(wanted)) {
          throw new Error('TRANSLATION_V2_EVIDENCE_EVENT_CONFLICT:' + eventId);
        }
      }
    } else {
      tables.evidence.sheet.appendRow(eventRaw);
      tables.evidence.rows.push(eventRaw.map(function (x) {
        if (typeof x === 'boolean') return x ? 'TRUE' : 'FALSE';
        return String(x);
      }));
    }
  });

  SpreadsheetApp.flush();

  var identities={};
  grade.graded.forEach(function (g) {
    identities[g.skill_id+'|'+g.translation_direction]={
      level:context.stage.level,skill_id:g.skill_id,direction:g.translation_direction
    };
  });
  Object.keys(identities).sort().forEach(function (key) {
    h3TranslationV2ProjectQueueIdentity_(tables,identities[key],now);
  });

  var lastAction=String(lane[lm.LAST_TRANSLATION_ACTION] || '');
  var action='CORE:' + context.stage.set_id;
  if (currentClock < targetClock) {
    var anchor=h3TranslationV2Latest5WCoreSet_(spreadsheet);
    var consumed=String(lane[lm.LAST_CONSUMED_5W_CORE_SET_ID] || '');
    if (consumed && consumed === anchor) {
      throw new Error('TRANSLATION_V2_RT_OPPORTUNITY_ALREADY_CONSUMED:' + anchor);
    }
    var readingSkip=Number(lane[lm.READING_FAMILY_SKIP_COUNT] || 0)+1;
    var overrideStreak=context.stage.profile === 'MIXED_1_1'
      ? 0 : Number(lane[lm.EDF_DIRECTION_OVERRIDE_STREAK] || 0)+1;
    var updated=[
      String(lane[lm.LEVEL] || ''),Number(lane[lm.READING_CLOCK] || 0),targetClock,
      'TRANSLATION',readingSkip,0,String(lane[lm.READING_SECTION_CURSOR] || ''),
      String(lane[lm.READING_SECTION_SKIP_JSON] || ''),String(lane[lm.P9_DEBT] || ''),
      context.stage.profile,action,overrideStreak,anchor,now,
      String(lane[lm.INITIALIZATION_NOTE] || '')
    ];
    tables.lane.sheet.getRange(laneRecord.rowNumber,1,1,updated.length).setValues([updated]);
  } else if (currentClock === targetClock && lastAction && lastAction !== action) {
    throw new Error('TRANSLATION_V2_LANE_ACTION_CONFLICT');
  }

  SpreadsheetApp.flush();
  return {
    schema:'H3_TRANSLATION_V2_SCHEDULER_SYNC_V1',
    status:'PASS',set_id:context.stage.set_id,txn_id:String(txnId),
    family_clock:targetClock,profile:context.stage.profile
  };
}

function h3TranslationV2AttachSchedulerSync_(
  result,
  spreadsheet,
  context,
  grade,
  txnId,
  committedAt,
  journal,
  txnRow
) {
  try {
    result.scheduler_sync =
      h3TranslationV2ProjectSchedulerAfterCommit_(
        spreadsheet,
        context,
        grade,
        txnId,
        committedAt
      );
    if (journal && txnRow) {
      var errorCell=
        journal.getRange(txnRow,16);
      var prior=String(
        errorCell.getDisplayValue() || ''
      );
      if (
        prior.indexOf(
          'POSTCOMMIT_PROJECTION:'
        ) === 0
      ) {
        errorCell.setValue('');
        SpreadsheetApp.flush();
      }
    }
  } catch (err) {
    var message =
      String(err && err.message || err);
    if (journal && txnRow) {
      journal
        .getRange(txnRow,16)
        .setValue(
          'POSTCOMMIT_PROJECTION:' +
          message
        );
      SpreadsheetApp.flush();
    }
    result.scheduler_sync = {
      schema:
        'H3_TRANSLATION_V2_SCHEDULER_SYNC_V1',
      status:
        'RECOVERY_REQUIRED',
      set_id:
        context.stage.set_id,
      txn_id:
        String(txnId),
      error:
        message
    };
  }
  return result;
}

function h3TranslationV2Submit_(request) {
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  var journal=null, txnRow=null;
  try {
    var spreadsheet=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
    var context=h3TranslationV2ProdReadContext_(spreadsheet,request && request.set_id);
    var normalized=h3TranslationV2NormalizeSubmission_(request,context.locked);
    if (normalized.set_id !== context.stage.set_id) {
      throw new Error('TRANSLATION_V2_SUBMIT_SET_ID_MISMATCH');
    }
    var fingerprint=h3TranslationV2RequestFingerprint_(normalized);
    var existing=h3TranslationV2ClassifyExistingTxn_(context,fingerprint);
    if (existing.action === 'RETURN_COMMITTED') {
      h3TranslationV2RequireCommittedReplay_(
        context,
        existing.record
      );
      var stored=h3TranslationV2StoredResult_(context,existing.record);
      var storedGrade=h3TranslationV2Grade_(context.locked,normalized.answers);
      return h3TranslationV2AttachSchedulerSync_(
        stored,
        spreadsheet,
        context,
        storedGrade,
        stored.txn_id,
        String(
          existing.record.row[
            context.txnTable.map.COMMITTED_AT
          ] ||
          h3TranslationProdNowTokyo_()
        ),
        context.txnTable.sheet,
        existing.record.rowNumber
      );
    }
    if (
      context.stage.status !== 'ISSUED' ||
      !context.stage.issued_at ||
      context.stage.committed_at
    ) {
      throw new Error(
        'TRANSLATION_V2_SUBMIT_STAGE_NOT_ISSUED'
      );
    }
    h3MultiSkillTranslationV2Preflight_(
      spreadsheet,
      context
    );

    var txnId=h3NextWebTxnId_(spreadsheet);
    var grade=h3TranslationV2Grade_(context.locked,normalized.answers);
    var result=h3TranslationV2BuildCommittedResult_(context.stage,context.locked,grade,txnId);
    var now=h3TranslationProdNowTokyo_();
    journal=context.txnTable.sheet;
    journal.appendRow([
      txnId,context.stage.set_id,context.stage.stage_id,'WRITTEN','TRANSLATION',
      context.stage.profile,context.stage.answer_type,JSON.stringify(normalized),
      fingerprint,context.stage.source_binding_sha256,now,'PREPARED',
      JSON.stringify(result),grade.score,'',''
    ]);
    txnRow=journal.getLastRow();
    SpreadsheetApp.flush();

    var prepared=journal.getRange(
      txnRow,1,1,H3_TRANSLATION_V2_TXN_HEADERS_.length).getDisplayValues()[0];
    if (prepared[0] !== txnId || prepared[1] !== context.stage.set_id ||
        prepared[2] !== context.stage.stage_id || prepared[4] !== 'TRANSLATION' ||
        prepared[5] !== context.stage.profile || prepared[6] !== context.stage.answer_type ||
        prepared[8] !== fingerprint || prepared[9] !== context.stage.source_binding_sha256 ||
        prepared[11] !== 'PREPARED') {
      throw new Error('TRANSLATION_V2_TXN_PREPARED_READBACK_FAILED');
    }

    grade.graded.forEach(function (item) {
      context.logTable.sheet.appendRow([
        txnId,context.stage.set_id,item.q_no,item.item_id,item.question_key,
        item.skill_id,item.section_key,item.mark,item.uncertain ? 'TRUE' : 'FALSE',
        item.translation_direction,item.answer_type,now
      ]);
    });
    SpreadsheetApp.flush();
    h3TranslationV2VerifyLogRows_(context,txnId,grade.total);

    context.stageTable.sheet.getRange(context.stageRowNumber,4).setValue('COMMITTED');
    context.stageTable.sheet.getRange(context.stageRowNumber,15).setValue(now);
    journal.getRange(txnRow,12).setValue('COMMITTED');
    journal.getRange(txnRow,15).setValue(now);
    SpreadsheetApp.flush();

    var txnReadback=journal.getRange(
      txnRow,1,1,H3_TRANSLATION_V2_TXN_HEADERS_.length).getDisplayValues()[0];
    var stageReadback=context.stageTable.sheet.getRange(
      context.stageRowNumber,1,1,H3_TRANSLATION_V2_STAGE_HEADERS_.length).getDisplayValues()[0];
    if (txnReadback[11] !== 'COMMITTED' || !txnReadback[14] ||
        stageReadback[3] !== 'COMMITTED' || !stageReadback[14]) {
      throw new Error('TRANSLATION_V2_COMMIT_READBACK_FAILED');
    }

    var syncedResult=h3TranslationV2AttachSchedulerSync_(
      result,
      spreadsheet,
      context,
      grade,
      txnId,
      now,
      journal,
      txnRow
    );
    return h3MultiSkillAttachCapture_(
      syncedResult,
      function () {
        return h3MultiSkillTranslationV2Capture_(
          spreadsheet,context,grade,txnId,now
        );
      }
    );
  } catch (err) {
    if (journal && txnRow) {
      try {
        var status=String(journal.getRange(txnRow,12).getDisplayValue() || '');
        if (status !== 'COMMITTED') {
          h3TranslationV2MarkRecovery_(
            journal,
            txnRow,
            String(err && err.message || err)
          );
        }
      } catch (_recoveryErr) {}
    }
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function h3TranslationV2CurrentLearning_(spreadsheet) {
  var stageTable=h3TranslationV2ProdTable_(
    spreadsheet.getSheetByName(H3_TRANSLATION_V2_STAGE_SHEET_),
    H3_TRANSLATION_V2_STAGE_HEADERS_,'TRANSLATION_V2_STAGE');
  var txnTable=h3TranslationV2ProdTable_(
    spreadsheet.getSheetByName(H3_TRANSLATION_V2_TXN_SHEET_),
    H3_TRANSLATION_V2_TXN_HEADERS_,'TRANSLATION_V2_TXN');
  var committed={}, blocking={};
  txnTable.rows.forEach(function (row) {
    var setId=String(row[txnTable.map.SET_ID] || '');
    var status=String(row[txnTable.map.STATUS] || '');
    if (!setId) return;
    if (status === 'COMMITTED') committed[setId]=true;
    if (status === 'PREPARED' || status === 'RECOVERY_REQUIRED') blocking[setId]=true;
  });
  var candidates=[];
  stageTable.rows.forEach(function (row,index) {
    var setId=String(row[stageTable.map.SET_ID] || '');
    var status=String(row[stageTable.map.STATUS] || '');
    var issued=String(row[stageTable.map.ISSUED_AT] || '');
    var committedAt=String(row[stageTable.map.COMMITTED_AT] || '');
    if (status !== 'ISSUED' || !setId || !issued || committedAt || committed[setId]) return;
    if (blocking[setId]) throw new Error('TRANSLATION_V2_CURRENT_TXN_BLOCKING');
    var parsed=h3TranslationV2ProdStageFromRow_(
      stageTable,{row:row,rowNumber:index+2});
    candidates.push({
      schema:'H3_TRANSLATION_CURRENT_LEARNING_V2',mode:'WRITTEN',
      provider_kind:'WRITTEN',surface_family:'TRANSLATION',level:parsed.stage.level,
      issue_no:parsed.stage.issue_no,stage_id:parsed.stage.stage_id,set_id:parsed.stage.set_id,
      translation_profile:parsed.stage.profile,answer_type:parsed.stage.answer_type,
      item_count:parsed.stage.item_count,source_binding_sha256:parsed.stage.source_binding_sha256
    });
  });
  if (candidates.length > 1) throw new Error('TRANSLATION_V2_CURRENT_AMBIGUOUS');
  return candidates.length ? candidates[0] : null;
}
