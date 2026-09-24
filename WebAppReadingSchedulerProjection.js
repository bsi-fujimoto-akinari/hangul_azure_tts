/**
 * Reading COMMITTED -> R/T scheduler sidecar projection.
 *
 * This module is post-commit only. It never grades, issues, or rewrites
 * immutable Reading transaction/log rows.
 */

var H3_READING_SCHEDULER_SYNC_SCHEMA_ =
  'H3_READING_SCHEDULER_SYNC_V1';
var H3_READING_SCHEDULER_PROJECTION_ID_ =
  'H3-RS05-LIVE-READING-PROJECTION-20260925-V1';

function h3ReadingSchedulerTables_(spreadsheet) {
  return {
    evidence:h3ReadingProdTable_(
      spreadsheet.getSheetByName(H3_RT_EVIDENCE_SHEET_),
      H3_RT_EVIDENCE_HEADERS_,'READING_RT_EVIDENCE'),
    queue:h3ReadingProdTable_(
      spreadsheet.getSheetByName(H3_RT_SKILL_QUEUE_SHEET_),
      H3_RT_SKILL_QUEUE_HEADERS_,'READING_RT_SKILL_QUEUE'),
    lane:h3ReadingProdTable_(
      spreadsheet.getSheetByName(H3_RT_LANE_STATE_SHEET_),
      H3_RT_LANE_STATE_HEADERS_,'READING_RT_LANE_STATE')
  };
}

function h3ReadingSchedulerLaneRow_(tables,level) {
  var found=[];
  tables.lane.rows.forEach(function(row,index) {
    if (String(row[tables.lane.map.LEVEL] || '') === String(level)) {
      found.push({row:row,rowNumber:index+2});
    }
  });
  if (found.length !== 1) {
    throw new Error('READING_RT_LANE_LEVEL_COUNT:' + found.length);
  }
  return found[0];
}

function h3ReadingSchedulerEvidenceObject_(table,row) {
  var out={};
  table.header.forEach(function(name,index) { out[name]=row[index]; });
  return out;
}

function h3ReadingSchedulerQueueRow_(events,identity,now) {
  var ordered=(events || []).slice();
  ordered.sort(function(a,b) {
    var ac=Number(a.FAMILY_CLOCK_INDEX || 0);
    var bc=Number(b.FAMILY_CLOCK_INDEX || 0);
    if (ac !== bc) return ac-bc;
    var at=String(a.ANSWERED_AT || '');
    var bt=String(b.ANSWERED_AT || '');
    if (at !== bt) return at < bt ? -1 : 1;
    return String(a.EVENT_ID || '').localeCompare(String(b.EVENT_ID || ''));
  });
  if (!ordered.length) throw new Error('READING_RT_QUEUE_EVIDENCE_EMPTY');

  var latest=null, latestNoncorrect=null, spaced=0, dueMin='', dueMax='';
  var correctSets={}, correctSurfaces={}, sectionEvidence={};
  ordered.forEach(function(event) {
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
  return [
    identity.level,'READING',identity.skill_id,'',
    String(latest.RESULT || ''),
    latestNoncorrect ? String(latestNoncorrect.RESULT || '') : '',
    String(latest.EVENT_ID || ''),
    latestNoncorrect ? Number(latestNoncorrect.FAMILY_CLOCK_INDEX || 0) : '',
    dueMin,dueMax,spaced,status,
    String(latest.SET_ID || ''),String(latest.SURFACE_KEY || ''),
    h3ReadingCanonicalJson_(sectionEvidence),
    String(latest.ANSWERED_AT || now)
  ];
}

function h3ReadingSchedulerProjectQueueIdentity_(tables,identity,now) {
  var events=[];
  tables.evidence.rows.forEach(function(row) {
    if (
      String(row[tables.evidence.map.LEVEL] || '') === identity.level &&
      String(row[tables.evidence.map.FAMILY] || '') === 'READING' &&
      String(row[tables.evidence.map.SKILL_ID] || '') === identity.skill_id
    ) {
      events.push(h3ReadingSchedulerEvidenceObject_(tables.evidence,row));
    }
  });
  var raw=h3ReadingSchedulerQueueRow_(events,identity,now);
  var found=[];
  tables.queue.rows.forEach(function(row,index) {
    if (
      String(row[tables.queue.map.LEVEL] || '') === identity.level &&
      String(row[tables.queue.map.FAMILY] || '') === 'READING' &&
      String(row[tables.queue.map.SKILL_ID] || '') === identity.skill_id &&
      !String(row[tables.queue.map.TRANSLATION_DIRECTION] || '')
    ) {
      found.push({rowNumber:index+2});
    }
  });
  if (found.length > 1) throw new Error('READING_RT_QUEUE_DUPLICATE_IDENTITY');
  if (found.length === 1) {
    tables.queue.sheet.getRange(found[0].rowNumber,1,1,raw.length).setValues([raw]);
  } else {
    tables.queue.sheet.appendRow(raw);
  }
}

function h3ReadingSchedulerLatest5WCoreSet_(spreadsheet) {
  var sheet=spreadsheet.getSheetByName('generation_state_v1');
  if (!sheet) throw new Error('READING_RT_5W_STATE_MISSING');
  var rows=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),3).getDisplayValues();
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][0] || '') === 'WRITTEN_LAST_HISTORY_SET') {
      var value=String(rows[i][1] || rows[i][2] || '');
      if (!value) throw new Error('READING_RT_5W_ANCHOR_EMPTY');
      return value;
    }
  }
  throw new Error('READING_RT_5W_ANCHOR_MISSING');
}

function h3ReadingSchedulerEventMatches_(table,stored,wanted) {
  var fields=[
    'EVENT_ID','LEVEL','FAMILY','SKILL_ID','TRANSLATION_DIRECTION',
    'SECTION_KEY','SET_ID','TXN_ID','Q_NO','ITEM_ID','SURFACE_KEY',
    'RESULT','UNCERTAIN','SET_MODE','FAMILY_CLOCK_INDEX','ANSWERED_AT',
    'SOURCE_LOG_KIND','SOURCE_BINDING_SHA256','SOURCE_ITEM_SHA256'
  ];
  for (var i=0;i<fields.length;i++) {
    var field=fields[i];
    var expected=wanted[table.map[field]];
    expected=typeof expected === 'boolean'
      ? (expected ? 'TRUE' : 'FALSE')
      : String(expected === undefined ? '' : expected);
    if (String(stored[table.map[field]] || '') !== expected) return false;
  }
  return true;
}

function h3ReadingProjectSchedulerAfterCommit_(spreadsheet,context,grade,txnId,now) {
  var tables=h3ReadingSchedulerTables_(spreadsheet);
  var laneRecord=h3ReadingSchedulerLaneRow_(tables,context.stage.level);
  var lane=laneRecord.row, lm=tables.lane.map;
  var existingTxnEvents=tables.evidence.rows.filter(function(row) {
    return (
      String(row[tables.evidence.map.TXN_ID] || '') === String(txnId) &&
      String(row[tables.evidence.map.FAMILY] || '') === 'READING'
    );
  });
  var currentClock=Number(lane[lm.READING_CLOCK] || 0);
  if (!Number.isInteger(currentClock) || currentClock < 0) {
    throw new Error('READING_RT_CLOCK_INVALID');
  }

  var targetClock;
  if (existingTxnEvents.length) {
    var clocks={};
    existingTxnEvents.forEach(function(row) {
      clocks[String(row[tables.evidence.map.FAMILY_CLOCK_INDEX] || '')]=true;
    });
    var keys=Object.keys(clocks);
    if (keys.length !== 1) throw new Error('READING_RT_EVIDENCE_CLOCK_CONFLICT');
    targetClock=Number(keys[0]);
    if (!Number.isInteger(targetClock) || targetClock < 1 || targetClock > currentClock+1) {
      throw new Error('READING_RT_LANE_RECOVERY_CLOCK_INVALID');
    }
  } else {
    targetClock=currentClock+1;
  }

  var itemByKey={};
  context.locked.items.forEach(function(item) {
    itemByKey[item.question_key]=item;
  });
  var count=Math.max(0,context.logTable.sheet.getLastRow()-1);
  var logRows=count
    ? context.logTable.sheet.getRange(
        2,1,count,H3_READING_LOG_HEADERS_.length).getDisplayValues()
    : [];
  var lmLog=context.logTable.map;
  var txnLogs=logRows.filter(function(row) {
    return String(row[lmLog.TXN_ID] || '') === String(txnId);
  });
  if (txnLogs.length !== grade.total) {
    throw new Error('READING_RT_PROJECTION_LOG_COUNT_INVALID');
  }

  txnLogs.forEach(function(row) {
    var qNo=Number(row[lmLog.Q_NO] || 0);
    var questionKey=String(row[lmLog.QUESTION_KEY] || '');
    var item=itemByKey[questionKey];
    if (!item) throw new Error('READING_RT_PROJECTION_ITEM_MISSING');
    var answeredAt=String(row[lmLog.ANSWERED_AT] || now);
    var passageHash=String(row[lmLog.PASSAGE_SHA256] || '');
    var eventId='R|' + String(txnId) + '|' + String(qNo);
    var eventRaw=[
      eventId,context.stage.level,'READING',
      String(row[lmLog.SKILL_ID] || ''),'',context.stage.section_key,
      context.stage.set_id,String(txnId),qNo,String(row[lmLog.ITEM_ID] || ''),
      'R|' + passageHash + '|' + String(item.item_sha256 || ''),
      String(row[lmLog.RESULT] || ''),
      String(row[lmLog.UNCERTAIN] || '') === 'TRUE','CORE',targetClock,
      answeredAt,'reading_log_v1',
      h3ReadingHash_({
        txn_id:String(txnId),set_id:context.stage.set_id,q_no:qNo,
        item_id:String(row[lmLog.ITEM_ID] || ''),question_key:questionKey,
        skill_id:String(row[lmLog.SKILL_ID] || ''),section_key:context.stage.section_key,
        result:String(row[lmLog.RESULT] || ''),
        uncertain:String(row[lmLog.UNCERTAIN] || ''),
        passage_id:String(row[lmLog.PASSAGE_ID] || ''),
        passage_sha256:passageHash,answered_at:answeredAt
      }),
      context.stage.source_binding_sha256,String(item.item_sha256 || ''),
      H3_READING_SCHEDULER_PROJECTION_ID_
    ];

    var found=[];
    tables.evidence.rows.forEach(function(eRow,index) {
      if (String(eRow[tables.evidence.map.EVENT_ID] || '') === eventId) {
        found.push({row:eRow,rowNumber:index+2});
      }
    });
    if (found.length > 1) throw new Error('READING_RT_EVIDENCE_DUPLICATE_EVENT:' + eventId);
    if (found.length === 1) {
      if (!h3ReadingSchedulerEventMatches_(tables.evidence,found[0].row,eventRaw)) {
        throw new Error('READING_RT_EVIDENCE_EVENT_CONFLICT:' + eventId);
      }
    } else {
      tables.evidence.sheet.appendRow(eventRaw);
      tables.evidence.rows.push(eventRaw.map(function(value) {
        return typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : String(value);
      }));
    }
  });

  SpreadsheetApp.flush();

  var identities={};
  grade.graded.forEach(function(item) {
    identities[item.skill_id]={level:context.stage.level,skill_id:item.skill_id};
  });
  Object.keys(identities).sort().forEach(function(key) {
    h3ReadingSchedulerProjectQueueIdentity_(tables,identities[key],now);
  });

  if (currentClock < targetClock) {
    var anchor=h3ReadingSchedulerLatest5WCoreSet_(spreadsheet);
    var consumed=String(lane[lm.LAST_CONSUMED_5W_CORE_SET_ID] || '');
    if (consumed && consumed === anchor) {
      throw new Error('READING_RT_OPPORTUNITY_ALREADY_CONSUMED:' + anchor);
    }
    var updated=[
      String(lane[lm.LEVEL] || ''),targetClock,
      Number(lane[lm.TRANSLATION_CLOCK] || 0),'READING',
      0,Number(lane[lm.TRANSLATION_FAMILY_SKIP_COUNT] || 0)+1,
      String(lane[lm.READING_SECTION_CURSOR] || ''),
      String(lane[lm.READING_SECTION_SKIP_JSON] || ''),
      String(lane[lm.P9_DEBT] || ''),
      String(lane[lm.LAST_TRANSLATION_CORE_PROFILE] || ''),
      String(lane[lm.LAST_TRANSLATION_ACTION] || ''),
      Number(lane[lm.EDF_DIRECTION_OVERRIDE_STREAK] || 0),
      anchor,now,String(lane[lm.INITIALIZATION_NOTE] || '')
    ];
    tables.lane.sheet.getRange(
      laneRecord.rowNumber,1,1,updated.length).setValues([updated]);
  }

  SpreadsheetApp.flush();
  return {
    schema:H3_READING_SCHEDULER_SYNC_SCHEMA_,
    status:'PASS',set_id:context.stage.set_id,txn_id:String(txnId),
    family_clock:targetClock
  };
}

function h3ReadingAttachSchedulerSync_(
  result,spreadsheet,context,grade,txnId,committedAt,journal,txnRow
) {
  try {
    result.scheduler_sync=h3ReadingProjectSchedulerAfterCommit_(
      spreadsheet,context,grade,txnId,committedAt);
    if (journal && txnRow) {
      var errorCell=journal.getRange(txnRow,context.txnTable.map.ERROR+1);
      var prior=String(errorCell.getDisplayValue() || '');
      if (prior.indexOf('POSTCOMMIT_PROJECTION:') === 0) {
        errorCell.setValue('');
        SpreadsheetApp.flush();
      }
    }
  } catch (err) {
    var message=String(err && err.message || err);
    if (journal && txnRow) {
      journal.getRange(txnRow,context.txnTable.map.ERROR+1)
        .setValue('POSTCOMMIT_PROJECTION:' + message);
      SpreadsheetApp.flush();
    }
    result.scheduler_sync={
      schema:H3_READING_SCHEDULER_SYNC_SCHEMA_,
      status:'RECOVERY_REQUIRED',set_id:context.stage.set_id,
      txn_id:String(txnId),error:message
    };
  }
  return result;
}

function h3FsReadingProjectionRecoveryGate_(ss) {
  var sh=ss.getSheetByName(H3_READING_TXN_SHEET_);
  if (!sh) throw new Error('FAMILY_SCHEDULER_READING_TXN_MISSING');
  var t=h3FsTable_(sh);
  h3FsRequire_(t,H3_READING_TXN_HEADERS_,H3_READING_TXN_SHEET_);
  var blocked=t.rows.filter(function(row) {
    return (
      String(row[t.map.STATUS] || '') === 'COMMITTED' &&
      String(row[t.map.ERROR] || '').indexOf('POSTCOMMIT_PROJECTION:') === 0
    );
  });
  if (blocked.length) {
    throw new Error(
      'FAMILY_SCHEDULER_READING_PROJECTION_RECOVERY_REQUIRED:' +
      blocked.length
    );
  }
  return true;
}
