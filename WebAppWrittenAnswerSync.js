/**
 * Production 5W Answer Sync.
 *
 * Boundary:
 *   queue!E already COMMITTED by WebAppWrittenProduction.js
 *   -> generation_log_v1
 *   -> skill_queue_v1
 *   -> EDF/retest scheduling
 *   -> next written_set_stage_v1 READY_TO_PATCH plan
 *   -> generation_state_v1 pointer/state
 *
 * R9 DAILY_TXT remains owned by Chat until the canonical backend migration
 * specified by hangul_quiz_rules_v4. This module closes the scheduler/runtime
 * transaction at CORE_COMPLETE and performs no Drive artifact writes.
 */

var H3_WRITTEN_ANSWER_SYNC_SHEET =
  'written_answer_sync_v1';

var H3_WRITTEN_ANSWER_SYNC_HEADERS = [
  'TXN_ID',
  'SET_ID',
  'STAGE_ID',
  'CREATED_AT',
  'STATUS',
  'PHASE',
  'QUEUE_E_SHA256',
  'PLAN_JSON',
  'PLAN_SHA256',
  'PRESTATE_JSON',
  'PRESTATE_SHA256',
  'POSTSTATE_JSON',
  'POSTSTATE_SHA256',
  'NEXT_STAGE_ID',
  'NEXT_STAGE_STATUS',
  'COMPLETED_AT',
  'ERROR'
];

var H3_WRITTEN_GENLOG_HEADERS = [
  'GEN_ID',
  'SET_ID',
  'Q_NO',
  'CREATED_AT',
  'LEVEL',
  'SECTION',
  'PRIMARY_BUCKET',
  'SKILL_ID',
  'PROVENANCE_JSON',
  'POLICY_ID',
  'SURFACE_HASH',
  'STATUS',
  'USER_RESULT',
  'ANSWERED_AT',
  'QUEUE_UPDATE_STATUS',
  'NOTES'
];

var H3_WRITTEN_SKILL_QUEUE_HEADERS = [
  'SKILL_ID',
  'POOL',
  'AUTOGEN_STATUS',
  'BASE_STATE',
  'BASE_PRIORITY_TIER',
  'STATE_OVERRIDE',
  'EFFECTIVE_STATE',
  'LAST_ISSUED_SET_ID',
  'LAST_DAILY_ID',
  'LAST_RESULT',
  'CORRECT_SPACED_COUNT',
  'WRONG_COUNT',
  'UNCERTAIN_COUNT',
  'RETEST_MIN_GAP_SETS',
  'RETEST_MAX_GAP_SETS',
  'STABILITY_STATUS',
  'ELIGIBLE_OVERRIDE',
  'UPDATED_AT',
  'NOTES'
];

var H3_WRITTEN_GENERATION_STATE_HEADERS = [
  'STATE_KEY',
  'VALUE',
  'NOTES'
];

var H3_WRITTEN_SOURCE_PLAN_HEADERS = [
  'BLOCK_VARIANT',
  'SET_OFFSET',
  'Q_NO',
  'SECTION',
  'PRIMARY_BUCKET',
  'TARGET_POOL',
  'SELECTION_RULE',
  'NOTES'
];

var H3_WRITTEN_STAGE_HEADERS = [
  'STAGE_ID',
  'BLOCK_NO',
  'SET_OFFSET',
  'STATUS',
  'QUESTIONS_LOG_TEMPLATE',
  'ANSWER_KEY_JSON',
  'QUESTION_META_JSON',
  'Q1_AUDIO',
  'Q2_AUDIO',
  'Q3_AUDIO',
  'Q4_AUDIO',
  'Q5A1',
  'Q5B1',
  'Q5A2',
  'SLOT_PATCH_JSON',
  'ANSWER_POSITION_JSON',
  'PRON_AUDIT_JSON',
  'APPROVED_SOURCE',
  'POLICY_ID',
  'SOURCE_SNAPSHOT_ID',
  'ACTUAL_SET_ID',
  'CREATED_AT',
  'ISSUED_AT',
  'NOTES'
];

var H3_WRITTEN_SYNC_RUNTIME_VERSION =
  'H3-WRITTEN-ANSWER-SYNC-BACKEND-20260920-V1';

var H3_WRITTEN_RETEST_CAP_NORMAL = 2;
var H3_WRITTEN_RETEST_CAP_RISK = 3;
var H3_WRITTEN_RETEST_CAP_20Q = 8;
var H3_WRITTEN_ACTIVE_WRONG_CAP = 5;


function h3WrittenSyncRequireExactHeader_(
  sheet,
  headers,
  label
) {
  if (!sheet) {
    throw new Error(
      'WRITTEN_SYNC_SHEET_MISSING:' +
        label
    );
  }

  var actual = sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .getDisplayValues()[0];

  if (
    JSON.stringify(actual) !==
    JSON.stringify(headers)
  ) {
    throw new Error(
      'WRITTEN_SYNC_HEADER_MISMATCH:' +
        label
    );
  }
}


function h3WrittenSyncTable_(
  sheet,
  headers,
  label
) {
  h3WrittenSyncRequireExactHeader_(
    sheet,
    headers,
    label
  );

  var lastRow = sheet.getLastRow();
  var values =
    lastRow > 1
      ? sheet
          .getRange(
            2,
            1,
            lastRow - 1,
            headers.length
          )
          .getDisplayValues()
      : [];

  return {
    sheet: sheet,
    headers: headers,
    map: h3WrittenHeaderMap_(headers),
    rows: values.map(
      function (row, i) {
        return {
          rowNumber: i + 2,
          values: row
        };
      }
    ),
    lastRow: lastRow
  };
}


function h3WrittenSyncRowObject_(
  table,
  rowValues
) {
  var out = {};
  table.headers.forEach(
    function (name, i) {
      out[name] =
        rowValues[i];
    }
  );
  return out;
}


function h3WrittenSyncStateIndex_(
  stateTable
) {
  var out = {};
  stateTable.rows.forEach(
    function (record) {
      var row =
        h3WrittenSyncRowObject_(
          stateTable,
          record.values
        );
      var key =
        String(
          row.STATE_KEY || ''
        );

      if (!key) {
        return;
      }

      if (out[key]) {
        throw new Error(
          'WRITTEN_SYNC_DUPLICATE_STATE_KEY:' +
            key
        );
      }

      out[key] = {
        rowNumber:
          record.rowNumber,
        values:
          record.values.slice(),
        object:
          row
      };
    }
  );
  return out;
}


function h3WrittenSyncStateValue_(
  stateIndex,
  key
) {
  if (!stateIndex[key]) {
    throw new Error(
      'WRITTEN_SYNC_STATE_KEY_MISSING:' +
        key
    );
  }
  return String(
    stateIndex[key].object.VALUE ||
    ''
  );
}


function h3WrittenSyncInt_(
  value,
  fallback
) {
  var n = Number(value);
  return Number.isFinite(n)
    ? Math.floor(n)
    : Number(fallback || 0);
}


function h3WrittenSyncParseJson_(
  text,
  code
) {
  try {
    return JSON.parse(
      String(text || '')
    );
  } catch (_err) {
    throw new Error(code);
  }
}


function h3WrittenSyncParseOverride_(
  text
) {
  var parts =
    String(text || '')
      .split(';')
      .filter(Boolean);

  var out = {
    state:
      parts.length
        ? parts[0]
        : ''
  };

  parts.slice(1).forEach(
    function (part) {
      var p = part.indexOf('=');
      if (p < 0) {
        return;
      }
      out[
        part.slice(0, p)
      ] =
        part.slice(p + 1);
    }
  );

  return out;
}


function h3WrittenSyncSectionCode_(
  display
) {
  var map = {
    '筆2／語彙': 'D2',
    '筆3／文法': 'D3',
    '筆4／置換': 'D4',
    '筆5／共通': 'D5',
    '筆6／応答': 'D6',
    D2: 'D2',
    D3: 'D3',
    D4: 'D4',
    D5: 'D5',
    D6: 'D6'
  };

  var value =
    map[
      String(display || '')
    ];

  if (!value) {
    throw new Error(
      'WRITTEN_SYNC_SECTION_INVALID:' +
        display
    );
  }

  return value;
}


function h3WrittenSyncDisplaySection_(
  code
) {
  var map = {
    D2: '筆2／語彙',
    D3: '筆3／文法',
    D4: '筆4／置換',
    D5: '筆5／共通',
    D6: '筆6／応答'
  };

  var value =
    map[
      String(code || '')
    ];

  if (!value) {
    throw new Error(
      'WRITTEN_SYNC_SECTION_INVALID:' +
        code
    );
  }

  return value;
}


function h3WrittenSyncMappedSkillId_(
  generationRow,
  questionMeta,
  setId,
  qNo
) {
  var direct =
    String(
      generationRow.SKILL_ID ||
      ''
    ).trim();

  if (direct) {
    return direct;
  }

  if (
    questionMeta &&
    questionMeta.skill_id
  ) {
    return String(
      questionMeta.skill_id
    );
  }

  var provenance = {};
  try {
    provenance =
      generationRow.PROVENANCE_JSON
        ? JSON.parse(
            generationRow.PROVENANCE_JSON
          )
        : {};
  } catch (_err) {
    provenance = {};
  }

  if (provenance.skill_id) {
    return String(
      provenance.skill_id
    );
  }

  if (
    provenance.source_daily_id &&
    /^H3-\d{8}-\d{2,3}-Q[1-5]$/.test(
      String(
        provenance.source_daily_id
      )
    )
  ) {
    return (
      'RT-' +
      String(
        provenance.source_daily_id
      )
    );
  }

  var mapped =
    /mapped_after_answer=(RT-H3-\d{8}-\d{2,3}-Q[1-5])/
      .exec(
        String(
          generationRow.NOTES || ''
        )
      );

  if (mapped) {
    return mapped[1];
  }

  return (
    'RT-' +
    String(setId) +
    '-Q' +
    String(qNo)
  );
}


function h3WrittenSyncGenerationSkillId_(
  rowObject
) {
  return h3WrittenSyncMappedSkillId_(
    rowObject,
    null,
    rowObject.SET_ID,
    rowObject.Q_NO
  );
}


function h3WrittenSyncRequireJournal_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_ANSWER_SYNC_SHEET
    );

  h3WrittenSyncRequireExactHeader_(
    sheet,
    H3_WRITTEN_ANSWER_SYNC_HEADERS,
    H3_WRITTEN_ANSWER_SYNC_SHEET
  );

  return sheet;
}


function h3WrittenSyncTxnRecord_(
  runtimeSpreadsheet,
  txnId
) {
  var sheet =
    runtimeSpreadsheet.getSheetByName(
      H3_WEB_WRITTEN_TXN_SHEET
    );

  h3WrittenSyncRequireExactHeader_(
    sheet,
    H3_WEB_WRITTEN_TXN_HEADERS,
    H3_WEB_WRITTEN_TXN_SHEET
  );

  var table =
    h3WrittenSyncTable_(
      sheet,
      H3_WEB_WRITTEN_TXN_HEADERS,
      H3_WEB_WRITTEN_TXN_SHEET
    );

  var matches =
    table.rows.filter(
      function (record) {
        return (
          String(
            record.values[0] || ''
          ) ===
          String(txnId)
        );
      }
    );

  if (matches.length !== 1) {
    throw new Error(
      'WRITTEN_SYNC_TXN_AUTHORITY_COUNT:' +
        matches.length
    );
  }

  var row =
    h3WrittenSyncRowObject_(
      table,
      matches[0].values
    );

  if (
    row.MODE !== 'WRITTEN' ||
    row.STATUS !== 'COMMITTED' ||
    !row.SET_ID ||
    !row.STAGE_ID ||
    !row.POSTSTATE_SHA256 ||
    !row.COMMITTED_AT
  ) {
    throw new Error(
      'WRITTEN_SYNC_TXN_NOT_COMMITTED'
    );
  }

  var result =
    h3WrittenSyncParseJson_(
      row.RESULT_JSON,
      'WRITTEN_SYNC_RESULT_JSON_INVALID'
    );

  if (
    result.schema !==
      'H3_WEB_SUBMIT_RESULT_V1' ||
    result.mode !== 'WRITTEN' ||
    result.status !== 'COMMITTED' ||
    String(result.txn_id || '') !==
      String(txnId) ||
    String(result.set_id || '') !==
      String(row.SET_ID) ||
    !Array.isArray(result.summary) ||
    result.summary.length !== 5
  ) {
    throw new Error(
      'WRITTEN_SYNC_RESULT_IDENTITY_INVALID'
    );
  }

  return {
    rowNumber:
      matches[0].rowNumber,
    row: row,
    result: result
  };
}


function h3WrittenSyncQueueContext_(
  txn
) {
  var queueSpreadsheet =
    h3WrittenQueueSpreadsheet_();
  var queueSheet =
    queueSpreadsheet.getSheetByName(
      'queue'
    );

  if (!queueSheet) {
    throw new Error(
      'WRITTEN_SYNC_QUEUE_MISSING'
    );
  }

  var queue =
    h3WrittenReadRows_(
      queueSheet,
      18
    );

  if (
    JSON.stringify(
      queue.header
    ) !==
    JSON.stringify(
      HQ_HEADERS
    )
  ) {
    throw new Error(
      'WRITTEN_SYNC_QUEUE_HEADER_MISMATCH'
    );
  }

  var record =
    h3WrittenFindOne_(
      queue,
      'SET_ID',
      txn.row.SET_ID,
      'queue'
    );

  var qm = queue.map;
  var row = record.row;
  var answersLog =
    String(
      row[qm.ANSWERS_LOG] ||
      ''
    );

  if (!answersLog) {
    throw new Error(
      'WRITTEN_SYNC_QUEUE_E_BLANK'
    );
  }

  var snapshot =
    h3WrittenSnapshot_(
      txn.row.SET_ID,
      answersLog
    );

  if (
    snapshot.sha256 !==
      String(
        txn.row.POSTSTATE_SHA256
      )
  ) {
    throw new Error(
      'WRITTEN_SYNC_QUEUE_E_HASH_MISMATCH'
    );
  }

  var history = [];

  queue.rows.forEach(
    function (historyRow) {
      var setId =
        String(
          historyRow[
            qm.SET_ID
          ] || ''
        );
      var answer =
        String(
          historyRow[
            qm.ANSWERS_LOG
          ] || ''
        );
      var questionLog =
        String(
          historyRow[
            qm.QUESTIONS_LOG
          ] || ''
        );

      if (
        /^H3-\d{8}-\d{2,3}$/.test(
          setId
        ) &&
        answer &&
        questionLog.indexOf(
          'EXCLUDE_FROM_LEARNING'
        ) < 0
      ) {
        history.push(setId);
      }
    }
  );

  if (
    !history.length ||
    history[
      history.length - 1
    ] !== txn.row.SET_ID
  ) {
    throw new Error(
      'WRITTEN_SYNC_HISTORY_NOT_LATEST'
    );
  }

  return {
    queueSheet:
      queueSheet,
    queue:
      queue,
    queueRowNumber:
      record.rowNumber,
    answersLog:
      answersLog,
    queueESha256:
      snapshot.sha256,
    history:
      history
  };
}


function h3WrittenSyncRuntimeContext_(
  runtimeSpreadsheet,
  txn
) {
  var generationSheet =
    runtimeSpreadsheet.getSheetByName(
      'generation_log_v1'
    );
  var skillSheet =
    runtimeSpreadsheet.getSheetByName(
      'skill_queue_v1'
    );
  var stateSheet =
    runtimeSpreadsheet.getSheetByName(
      'generation_state_v1'
    );
  var sourcePlanSheet =
    runtimeSpreadsheet.getSheetByName(
      'source_block_plan_v1'
    );
  var stageSheet =
    runtimeSpreadsheet.getSheetByName(
      'written_set_stage_v1'
    );

  var generation =
    h3WrittenSyncTable_(
      generationSheet,
      H3_WRITTEN_GENLOG_HEADERS,
      'generation_log_v1'
    );
  var skills =
    h3WrittenSyncTable_(
      skillSheet,
      H3_WRITTEN_SKILL_QUEUE_HEADERS,
      'skill_queue_v1'
    );
  var state =
    h3WrittenSyncTable_(
      stateSheet,
      H3_WRITTEN_GENERATION_STATE_HEADERS,
      'generation_state_v1'
    );
  var sourcePlan =
    h3WrittenSyncTable_(
      sourcePlanSheet,
      H3_WRITTEN_SOURCE_PLAN_HEADERS,
      'source_block_plan_v1'
    );
  var stages =
    h3WrittenSyncTable_(
      stageSheet,
      H3_WRITTEN_STAGE_HEADERS,
      'written_set_stage_v1'
    );

  var stateIndex =
    h3WrittenSyncStateIndex_(
      state
    );

  var currentStageMatches =
    stages.rows.filter(
      function (record) {
        return (
          String(
            record.values[
              stages.map.ACTUAL_SET_ID
            ] || ''
          ) === txn.row.SET_ID
        );
      }
    );

  if (
    currentStageMatches.length !== 1
  ) {
    throw new Error(
      'WRITTEN_SYNC_CURRENT_STAGE_AUTHORITY_COUNT:' +
        currentStageMatches.length
    );
  }

  var currentStageObject =
    h3WrittenSyncRowObject_(
      stages,
      currentStageMatches[0].values
    );

  if (
    currentStageObject.STATUS !==
      'ISSUED' ||
    currentStageObject.STAGE_ID !==
      txn.row.STAGE_ID
  ) {
    throw new Error(
      'WRITTEN_SYNC_CURRENT_STAGE_INVALID'
    );
  }

  var currentMeta =
    h3WrittenSyncParseJson_(
      currentStageObject
        .QUESTION_META_JSON,
      'WRITTEN_SYNC_CURRENT_STAGE_META_INVALID'
    );

  if (
    !currentMeta ||
    !Array.isArray(
      currentMeta.questions
    ) ||
    currentMeta.questions.length !== 5
  ) {
    throw new Error(
      'WRITTEN_SYNC_CURRENT_STAGE_META_SHAPE'
    );
  }

  var generationMatches =
    generation.rows.filter(
      function (record) {
        return (
          String(
            record.values[
              generation.map.SET_ID
            ] || ''
          ) === txn.row.SET_ID
        );
      }
    );

  if (
    generationMatches.length !== 5
  ) {
    throw new Error(
      'WRITTEN_SYNC_GENLOG_COUNT:' +
        generationMatches.length
    );
  }

  generationMatches.sort(
    function (a, b) {
      return (
        Number(
          a.values[
            generation.map.Q_NO
          ]
        ) -
        Number(
          b.values[
            generation.map.Q_NO
          ]
        )
      );
    }
  );

  generationMatches.forEach(
    function (record, i) {
      if (
        Number(
          record.values[
            generation.map.Q_NO
          ]
        ) !==
        i + 1
      ) {
        throw new Error(
          'WRITTEN_SYNC_GENLOG_Q_SEQUENCE'
        );
      }
    }
  );

  var blockNo =
    h3WrittenSyncInt_(
      currentStageObject.BLOCK_NO,
      0
    );
  var setOffset =
    h3WrittenSyncInt_(
      currentStageObject.SET_OFFSET,
      0
    );

  if (
    blockNo < 1 ||
    setOffset < 1 ||
    setOffset > 4
  ) {
    throw new Error(
      'WRITTEN_SYNC_CURRENT_POINTER_INVALID'
    );
  }

  var nextBlockNo =
    setOffset < 4
      ? blockNo
      : blockNo + 1;
  var nextSetOffset =
    setOffset < 4
      ? setOffset + 1
      : 1;
  var nextStageId =
    'STD-B' +
    String(
      nextBlockNo
    ).padStart(3, '0') +
    '-S' +
    String(
      nextSetOffset
    );

  var nextStageMatches =
    stages.rows.filter(
      function (record) {
        return (
          String(
            record.values[
              stages.map.STAGE_ID
            ] || ''
          ) === nextStageId
        );
      }
    );

  if (
    nextStageMatches.length > 1
  ) {
    throw new Error(
      'WRITTEN_SYNC_NEXT_STAGE_DUPLICATE'
    );
  }

  var activeVariant =
    h3WrittenSyncInt_(
      h3WrittenSyncStateValue_(
        stateIndex,
        'ACTIVE_BLOCK_VARIANT'
      ),
      1
    );

  var sourceRows =
    sourcePlan.rows.filter(
      function (record) {
        return (
          Number(
            record.values[
              sourcePlan.map
                .BLOCK_VARIANT
            ]
          ) === activeVariant
        );
      }
    );

  if (sourceRows.length !== 20) {
    throw new Error(
      'WRITTEN_SYNC_SOURCE_PLAN_COUNT:' +
        sourceRows.length
    );
  }

  return {
    generation:
      generation,
    skills:
      skills,
    state:
      state,
    stateIndex:
      stateIndex,
    sourcePlan:
      sourcePlan,
    stages:
      stages,
    currentStageRecord:
      currentStageMatches[0],
    currentStage:
      currentStageObject,
    currentMeta:
      currentMeta,
    generationMatches:
      generationMatches,
    blockNo:
      blockNo,
    setOffset:
      setOffset,
    nextBlockNo:
      nextBlockNo,
    nextSetOffset:
      nextSetOffset,
    nextStageId:
      nextStageId,
    nextStageRecord:
      nextStageMatches.length
        ? nextStageMatches[0]
        : null,
    activeVariant:
      activeVariant,
    sourceRows:
      sourceRows
  };
}


function h3WrittenSyncPreviousSurface_(
  generationTable,
  skillId,
  currentSetId
) {
  var latest = null;

  generationTable.rows.forEach(
    function (record) {
      var row =
        h3WrittenSyncRowObject_(
          generationTable,
          record.values
        );

      if (
        row.SET_ID ===
          currentSetId ||
        row.STATUS !==
          'ANSWERED'
      ) {
        return;
      }

      if (
        h3WrittenSyncGenerationSkillId_(
          row
        ) === skillId
      ) {
        latest = row;
      }
    }
  );

  return latest
    ? {
        setId:
          latest.SET_ID,
        result:
          latest.USER_RESULT,
        surfaceHash:
          latest.SURFACE_HASH
      }
    : null;
}


function h3WrittenSyncBuildSkillTransition_(
  previous,
  event,
  previousSurface
) {
  var existing =
    previous || {};
  var wrongCount =
    h3WrittenSyncInt_(
      existing.WRONG_COUNT,
      0
    );
  var uncertainCount =
    h3WrittenSyncInt_(
      existing.UNCERTAIN_COUNT,
      0
    );
  var correctCount =
    h3WrittenSyncInt_(
      existing.CORRECT_SPACED_COUNT,
      0
    );
  var stateOverride = '';
  var effectiveState = '';
  var minGap = '';
  var maxGap = '';
  var stability = 'UNSTABLE';
  var eligible = '';
  var notes = '';

  if (event.mark === '×') {
    wrongCount += 1;
    if (event.uncertain) {
      uncertainCount += 1;
    }
    correctCount = 0;
    minGap = '1';
    maxGap = '3';
    stateOverride =
      'RETEST_WRONG' +
      ';SECTION=' +
      event.section +
      ';DUE_MIN=1;DUE_MAX=3' +
      ';ORIGIN_BUCKET=' +
      event.bucket;
    effectiveState =
      'RETEST_WRONG';
    eligible =
      'ELIGIBLE';
    notes =
      'answer-sync backend;latest_result=×' +
      ';retest_window=+1..+3' +
      ';origin_bucket=' +
      event.bucket +
      (
        event.uncertain
          ? ';user also marked ?;wrong takes precedence'
          : ''
      );
  } else if (event.mark === '△') {
    uncertainCount += 1;
    correctCount = 0;
    minGap = '2';
    maxGap = '5';
    stateOverride =
      'RETEST_UNCERTAIN' +
      ';SECTION=' +
      event.section +
      ';DUE_MIN=2;DUE_MAX=5' +
      ';ORIGIN_BUCKET=' +
      event.bucket;
    effectiveState =
      'RETEST_UNCERTAIN';
    eligible =
      'ELIGIBLE';
    notes =
      'answer-sync backend;latest_result=△' +
      ';explicit uncertainty resets spaced-correct evidence' +
      ';retest_window=+2..+5' +
      ';origin_bucket=' +
      event.bucket;
  } else if (event.mark === '○') {
    var wasStable =
      String(
        existing.STABILITY_STATUS ||
        ''
      ) === 'STABLE' ||
      String(
        existing.EFFECTIVE_STATE ||
        ''
      ) === 'STABLE';

    var qualifiesSecond =
      !wasStable &&
      String(
        existing.LAST_RESULT ||
        ''
      ) === '○' &&
      correctCount >= 1 &&
      String(
        existing.LAST_ISSUED_SET_ID ||
        ''
      ) &&
      String(
        existing.LAST_ISSUED_SET_ID
      ) !==
        event.setId &&
      previousSurface &&
      previousSurface.surfaceHash &&
      previousSurface.surfaceHash !==
        event.surfaceHash;

    if (wasStable) {
      correctCount =
        Math.max(
          2,
          correctCount
        );
    } else if (qualifiesSecond) {
      correctCount =
        Math.min(
          2,
          correctCount + 1
        );
    } else {
      correctCount = 1;
    }

    if (correctCount >= 2) {
      stateOverride =
        'STABLE';
      effectiveState =
        'STABLE';
      stability =
        'STABLE';
      notes =
        'answer-sync backend;second spaced ○ on different set+surface' +
        ';stable=deprioritized_not_mastery';
    } else {
      stateOverride =
        'CORRECT_ONCE';
      effectiveState =
        'CORRECT_ONCE';
      notes =
        'answer-sync backend;first ○ evidence after latest non-○ or new skill' +
        ';needs second ○ on different surface+set for stable';
    }

    if (
      event.skillId.indexOf(
        'RT-'
      ) === 0
    ) {
      stateOverride +=
        ';SECTION=' +
        event.section +
        ';ORIGIN_BUCKET=' +
        event.bucket;
    }
  } else {
    throw new Error(
      'WRITTEN_SYNC_MARK_INVALID:' +
        event.mark
    );
  }

  return {
    SKILL_ID:
      event.skillId,
    POOL:
      String(
        existing.POOL ||
        'CORE'
      ),
    AUTOGEN_STATUS:
      String(
        existing.AUTOGEN_STATUS ||
        'ENABLED'
      ),
    BASE_STATE:
      String(
        existing.BASE_STATE ||
        'NEW'
      ),
    BASE_PRIORITY_TIER:
      String(
        existing.BASE_PRIORITY_TIER ||
        'T2'
      ),
    STATE_OVERRIDE:
      stateOverride,
    EFFECTIVE_STATE:
      effectiveState,
    LAST_ISSUED_SET_ID:
      event.setId,
    LAST_DAILY_ID:
      event.setId +
      '-Q' +
      event.qNo,
    LAST_RESULT:
      event.mark,
    CORRECT_SPACED_COUNT:
      String(
        correctCount
      ),
    WRONG_COUNT:
      String(
        wrongCount
      ),
    UNCERTAIN_COUNT:
      String(
        uncertainCount
      ),
    RETEST_MIN_GAP_SETS:
      String(minGap),
    RETEST_MAX_GAP_SETS:
      String(maxGap),
    STABILITY_STATUS:
      stability,
    ELIGIBLE_OVERRIDE:
      eligible,
    UPDATED_AT:
      event.answeredAt,
    NOTES:
      notes
  };
}


function h3WrittenSyncSkillValues_(
  object
) {
  return H3_WRITTEN_SKILL_QUEUE_HEADERS.map(
    function (name) {
      var value =
        object[name];

      return (
        value === null ||
        typeof value ===
          'undefined'
      )
        ? ''
        : String(value);
    }
  );
}


function h3WrittenSyncGenerationValues_(
  table,
  record,
  event
) {
  var values =
    record.values.slice();
  var m = table.map;

  values[m.STATUS] =
    'ANSWERED';
  values[m.USER_RESULT] =
    event.mark;
  values[m.ANSWERED_AT] =
    event.answeredAt;
  values[
    m.QUEUE_UPDATE_STATUS
  ] =
    event.skillId.indexOf('RT-') === 0
      ? 'SKILL_QUEUE_SYNCED_TEMP_ID'
      : 'SKILL_QUEUE_SYNCED';

  var userToken =
    String(event.answer) +
    (
      event.uncertain
        ? '?'
        : ''
    );

  if (event.mark === '×') {
    values[m.NOTES] =
      'USER=' +
      userToken +
      '; ANSWER=' +
      event.correctAnswer +
      '; wrong overrides uncertainty' +
      '; answer-sync backend; retest +1..3';
  } else if (event.mark === '△') {
    values[m.NOTES] =
      'USER=' +
      userToken +
      '; ANSWER=' +
      event.correctAnswer +
      '; correct+explicit uncertainty=△' +
      '; answer-sync backend; retest +2..5';
  } else {
    values[m.NOTES] =
      'USER=' +
      userToken +
      '; ANSWER=' +
      event.correctAnswer +
      '; correct without ?=○' +
      '; answer-sync backend';
  }

  return values;
}


function h3WrittenSyncProjectSkillMap_(
  skillTable
) {
  var byId = {};
  skillTable.rows.forEach(
    function (record) {
      var object =
        h3WrittenSyncRowObject_(
          skillTable,
          record.values
        );
      var id =
        String(
          object.SKILL_ID || ''
        );

      if (!id) {
        return;
      }

      if (byId[id]) {
        throw new Error(
          'WRITTEN_SYNC_DUPLICATE_SKILL:' +
            id
        );
      }

      byId[id] = {
        rowNumber:
          record.rowNumber,
        values:
          record.values.slice(),
        object:
          object
      };
    }
  );
  return byId;
}


function h3WrittenSyncLatestSourceBySkill_(
  generationTable,
  currentEvents
) {
  var out = {};

  generationTable.rows.forEach(
    function (record) {
      var row =
        h3WrittenSyncRowObject_(
          generationTable,
          record.values
        );

      if (!row.SET_ID) {
        return;
      }

      var id =
        h3WrittenSyncGenerationSkillId_(
          row
        );

      if (!id) {
        return;
      }

      out[id] = {
        bucket:
          String(
            row.PRIMARY_BUCKET ||
            ''
          ),
        setId:
          String(
            row.SET_ID ||
            ''
          ),
        surfaceHash:
          String(
            row.SURFACE_HASH ||
            ''
          )
      };
    }
  );

  currentEvents.forEach(
    function (event) {
      out[event.skillId] = {
        bucket:
          event.bucket,
        setId:
          event.setId,
        surfaceHash:
          event.surfaceHash
      };
    }
  );

  return out;
}


function h3WrittenSyncHistoryIndex_(
  history
) {
  var out = {};
  history.forEach(
    function (setId, i) {
      out[setId] = i;
    }
  );
  return out;
}


function h3WrittenSyncCandidate_(
  skill,
  historyIndex,
  currentHistoryIndex,
  latestSource
) {
  var override =
    h3WrittenSyncParseOverride_(
      skill.STATE_OVERRIDE
    );

  if (
    [
      'RETEST_WRONG',
      'RETEST_UNCERTAIN'
    ].indexOf(
      skill.EFFECTIVE_STATE
    ) < 0 ||
    skill.ELIGIBLE_OVERRIDE !==
      'ELIGIBLE'
  ) {
    return null;
  }

  var section =
    String(
      override.SECTION || ''
    );
  var dueMin =
    h3WrittenSyncInt_(
      override.DUE_MIN,
      0
    );
  var dueMax =
    h3WrittenSyncInt_(
      override.DUE_MAX,
      0
    );
  var originSet =
    String(
      skill.LAST_ISSUED_SET_ID ||
      ''
    );

  if (
    !section ||
    !dueMin ||
    !dueMax ||
    !originSet
  ) {
    return null;
  }

  if (
    typeof historyIndex[
      originSet
    ] !== 'number'
  ) {
    throw new Error(
      'WRITTEN_SYNC_ORIGIN_HISTORY_MISSING:' +
        skill.SKILL_ID +
        ':' +
        originSet
    );
  }

  var nextGap =
    currentHistoryIndex -
    historyIndex[originSet] +
    1;

  if (nextGap < dueMin) {
    return null;
  }

  var source =
    latestSource[
      skill.SKILL_ID
    ] || null;

  return {
    skillId:
      skill.SKILL_ID,
    section:
      section,
    originSet:
      originSet,
    originBucket:
      String(
        override.ORIGIN_BUCKET ||
        ''
      ),
    sourceBucket:
      source
        ? String(
            source.bucket || ''
          )
        : '',
    dueMin:
      dueMin,
    dueMax:
      dueMax,
    nextGap:
      nextGap,
    slack:
      dueMax - nextGap,
    urgent:
      nextGap >= dueMax,
    priority:
      skill.EFFECTIVE_STATE ===
        'RETEST_WRONG'
        ? 0
        : 1,
    lastDailyId:
      String(
        skill.LAST_DAILY_ID ||
        ''
      ),
    lastResult:
      String(
        skill.LAST_RESULT ||
        ''
      )
  };
}


function h3WrittenSyncSourcePlanClone_(
  context
) {
  return context.sourceRows.map(
    function (record) {
      return {
        rowNumber:
          record.rowNumber,
        values:
          record.values.slice(),
        object:
          h3WrittenSyncRowObject_(
            context.sourcePlan,
            record.values
          )
      };
    }
  );
}


function h3WrittenSyncFindSourceSlot_(
  sourceRows,
  offset,
  section
) {
  var matches =
    sourceRows.filter(
      function (record) {
        return (
          Number(
            record.object.SET_OFFSET
          ) === Number(offset) &&
          h3WrittenSyncSectionCode_(
            record.object.SECTION
          ) === section
        );
      }
    );

  if (matches.length !== 1) {
    throw new Error(
      'WRITTEN_SYNC_SOURCE_SLOT_COUNT:' +
        offset +
        ':' +
        section +
        ':' +
        matches.length
    );
  }

  return matches[0];
}


function h3WrittenSyncSetSourceBucket_(
  context,
  sourceRecord,
  bucket,
  note
) {
  var map =
    context.sourcePlan.map;

  sourceRecord.values[
    map.PRIMARY_BUCKET
  ] =
    bucket;
  sourceRecord.values[
    map.NOTES
  ] =
    (
      String(
        sourceRecord.values[
          map.NOTES
        ] || ''
      ) +
      '; ' +
      note
    ).replace(
      /^;\s*/,
      ''
    );

  sourceRecord.object =
    h3WrittenSyncRowObject_(
      context.sourcePlan,
      sourceRecord.values
    );
}


function h3WrittenSyncBlockRetestCount_(
  context,
  blockNo
) {
  var count = 0;

  context.stages.rows.forEach(
    function (record) {
      var row =
        h3WrittenSyncRowObject_(
          context.stages,
          record.values
        );

      if (
        Number(row.BLOCK_NO) !==
          Number(blockNo) ||
        row.STATUS !== 'ISSUED' ||
        !row.QUESTION_META_JSON
      ) {
        return;
      }

      var meta;
      try {
        meta = JSON.parse(
          row.QUESTION_META_JSON
        );
      } catch (_err) {
        return;
      }

      var questions =
        Array.isArray(
          meta.questions
        )
          ? meta.questions
          : [];

      count +=
        questions.filter(
          function (q) {
            return (
              q &&
              q.retest === true
            );
          }
        ).length;
    }
  );

  return count;
}


function h3WrittenSyncBuildSchedulerPlan_(
  context,
  projectedSkills,
  queueHistory,
  latestSource
) {
  var historyIndex =
    h3WrittenSyncHistoryIndex_(
      queueHistory
    );
  var currentIndex =
    queueHistory.length - 1;

  var candidates = [];

  Object.keys(
    projectedSkills
  ).forEach(
    function (skillId) {
      var item =
        projectedSkills[
          skillId
        ];
      var candidate =
        h3WrittenSyncCandidate_(
          item.object,
          historyIndex,
          currentIndex,
          latestSource
        );

      if (candidate) {
        candidates.push(
          candidate
        );
      }
    }
  );

  candidates.sort(
    function (a, b) {
      if (a.slack !== b.slack) {
        return a.slack - b.slack;
      }
      if (
        a.priority !== b.priority
      ) {
        return (
          a.priority -
          b.priority
        );
      }
      if (
        a.section !== b.section
      ) {
        return (
          a.section <
            b.section
            ? -1
            : 1
        );
      }
      if (
        a.lastDailyId !==
          b.lastDailyId
      ) {
        return (
          a.lastDailyId <
            b.lastDailyId
            ? -1
            : 1
        );
      }
      return (
        a.skillId <
          b.skillId
          ? -1
          : 1
      );
    }
  );

  var sourceRows =
    h3WrittenSyncSourcePlanClone_(
      context
    );
  var assigned = [];
  var deferred = [];
  var supplemental = [];
  var sectionAssigned = {};
  var swaps = [];
  var cap =
    H3_WRITTEN_RETEST_CAP_NORMAL;
  var blockRetests =
    h3WrittenSyncBlockRetestCount_(
      context,
      context.nextBlockNo
    );

  candidates.forEach(
    function (candidate) {
      if (
        candidate.urgent &&
        assigned.length >=
          H3_WRITTEN_RETEST_CAP_NORMAL
      ) {
        cap =
          H3_WRITTEN_RETEST_CAP_RISK;
      }

      if (
        assigned.length >= cap ||
        sectionAssigned[
          candidate.section
        ]
      ) {
        if (candidate.urgent) {
          supplemental.push(
            candidate
          );
        } else {
          deferred.push(
            candidate
          );
        }
        return;
      }

      if (
        blockRetests +
          assigned.length >=
        H3_WRITTEN_RETEST_CAP_20Q
      ) {
        if (candidate.urgent) {
          supplemental.push(
            candidate
          );
        } else {
          deferred.push(
            candidate
          );
        }
        return;
      }

      var nextSlot =
        h3WrittenSyncFindSourceSlot_(
          sourceRows,
          context.nextSetOffset,
          candidate.section
        );

      var nextBucket =
        String(
          nextSlot.object
            .PRIMARY_BUCKET || ''
        );

      if (
        !candidate.sourceBucket
      ) {
        if (candidate.urgent) {
          supplemental.push(
            Object.assign(
              {},
              candidate,
              {
                reason:
                  'SOURCE_UNRESOLVED'
              }
            )
          );
        } else {
          deferred.push(
            candidate
          );
        }
        return;
      }

      if (
        nextBucket !==
          candidate.sourceBucket
      ) {
        var future =
          sourceRows.filter(
            function (record) {
              var offset =
                Number(
                  record.object
                    .SET_OFFSET
                );
              return (
                offset >
                  context.nextSetOffset &&
                h3WrittenSyncSectionCode_(
                  record.object
                    .SECTION
                ) ===
                  candidate.section &&
                String(
                  record.object
                    .PRIMARY_BUCKET ||
                  ''
                ) ===
                  candidate.sourceBucket
              );
            }
          )[0];

        if (future) {
          var futureOffset =
            Number(
              future.object
                .SET_OFFSET
            );
          var futureStageId =
            'STD-B' +
            String(
              context.nextBlockNo
            ).padStart(
              3,
              '0'
            ) +
            '-S' +
            String(
              futureOffset
            );

          var futureStage =
            context.stages.rows
              .map(
                function (record) {
                  return h3WrittenSyncRowObject_(
                    context.stages,
                    record.values
                  );
                }
              )
              .filter(
                function (row) {
                  return (
                    row.STAGE_ID ===
                      futureStageId
                  );
                }
              )[0];

          if (
            futureStage &&
            futureStage.STATUS ===
              'ISSUED'
          ) {
            future = null;
          }
        }

        if (future) {
          var oldNext =
            nextBucket;
          var futureBucket =
            String(
              future.object
                .PRIMARY_BUCKET ||
              ''
            );

          h3WrittenSyncSetSourceBucket_(
            context,
            nextSlot,
            futureBucket,
            'ANSWER_SYNC swap for ' +
              candidate.skillId
          );
          h3WrittenSyncSetSourceBucket_(
            context,
            future,
            oldNext,
            'ANSWER_SYNC counterpart for ' +
              candidate.skillId
          );

          swaps.push({
            section:
              candidate.section,
            next_offset:
              context.nextSetOffset,
            future_offset:
              Number(
                future.object
                  .SET_OFFSET
              ),
            next_before:
              oldNext,
            next_after:
              futureBucket,
            future_before:
              futureBucket,
            future_after:
              oldNext,
            skill_id:
              candidate.skillId
          });

          nextBucket =
            futureBucket;
        }
      }

      if (
        nextBucket !==
          candidate.sourceBucket
      ) {
        if (candidate.urgent) {
          supplemental.push(
            Object.assign(
              {},
              candidate,
              {
                reason:
                  'NO_RATIO_SAFE_SOURCE_SLOT'
              }
            )
          );
        } else {
          deferred.push(
            candidate
          );
        }
        return;
      }

      assigned.push(
        candidate
      );
      sectionAssigned[
        candidate.section
      ] = true;
    }
  );

  var plannedSlots =
    H3_WEB_WRITTEN_SECTIONS.map(
      function (section, i) {
        var sourceSlot =
          h3WrittenSyncFindSourceSlot_(
            sourceRows,
            context.nextSetOffset,
            section
          );
        var match =
          assigned.filter(
            function (candidate) {
              return (
                candidate.section ===
                  section
              );
            }
          )[0];

        var slot = {
          q: i + 1,
          section:
            h3WrittenSyncDisplaySection_(
              section
            ),
          bucket:
            String(
              sourceSlot.object
                .PRIMARY_BUCKET ||
              ''
            ),
          retest:
            Boolean(match)
        };

        slot =
          h3WrittenNewfmtDecorateSlot_(
            slot
          );

        if (match) {
          slot.skill_id =
            match.skillId;
          slot.origin_set =
            match.originSet;
          slot.due_min =
            match.dueMin;
          slot.due_max =
            match.dueMax;
          slot.actual_source =
            match.sourceBucket;
        }

        return slot;
      }
    );

  var ratio = {
    TOWMI: 0,
    OFFICIAL: 0,
    ERROR: 0,
    NEWFMT: 0
  };

  sourceRows.forEach(
    function (record) {
      var bucket =
        String(
          record.object
            .PRIMARY_BUCKET || ''
        );
      if (
        Object.prototype
          .hasOwnProperty.call(
            ratio,
            bucket
          )
      ) {
        ratio[bucket] += 1;
      }
    }
  );

  if (
    ratio.TOWMI !== 11 ||
    ratio.OFFICIAL !== 6 ||
    ratio.ERROR !== 2 ||
    ratio.NEWFMT !== 1
  ) {
    throw new Error(
      'WRITTEN_SYNC_SOURCE_RATIO_DRIFT:' +
        JSON.stringify(ratio)
    );
  }

  h3WrittenNewfmtValidateSourceRows_(
    sourceRows
  );
  h3WrittenNewfmtValidatePlannedSlots_(
    plannedSlots
  );

  return {
    plannedSlots:
      plannedSlots,
    assigned:
      assigned,
    deferred:
      deferred,
    supplemental:
      supplemental,
    swaps:
      swaps,
    sourceRows:
      sourceRows,
    ratio:
      ratio,
    cap:
      cap,
    priorBlockRetests:
      blockRetests
  };
}


function h3WrittenSyncSupplementalValue_(
  supplemental
) {
  if (!supplemental.length) {
    return 'NONE';
  }

  return supplemental
    .map(
      function (item) {
        return [
          item.skillId,
          'MODE=OVERLOAD_REVIEW',
          'SECTION=' +
            item.section,
          'DUE_MIN=' +
            item.dueMin,
          'DUE_MAX=' +
            item.dueMax,
          'ACTUAL_SOURCE=' +
            (
              item.sourceBucket ||
              'UNRESOLVED'
            ),
          'REASON=' +
            (
              item.reason ||
              'DEADLINE_RISK'
            )
        ].join(';');
      }
    )
    .join('||');
}


function h3WrittenSyncStageValues_(
  context,
  scheduler,
  answeredAt,
  policyId,
  sourceSnapshotId
) {
  var existing =
    context.nextStageRecord
      ? context
          .nextStageRecord
          .values
          .slice()
      : new Array(
          H3_WRITTEN_STAGE_HEADERS
            .length
        ).fill('');

  var m =
    context.stages.map;

  if (
    context.nextStageRecord
  ) {
    var current =
      h3WrittenSyncRowObject_(
        context.stages,
        existing
      );

    if (
      current.STATUS !==
        'READY_TO_PATCH' ||
      current.ACTUAL_SET_ID ||
      current.ISSUED_AT ||
      current.QUESTIONS_LOG_TEMPLATE ||
      current.ANSWER_KEY_JSON
    ) {
      throw new Error(
        'WRITTEN_SYNC_NEXT_STAGE_NOT_PATCHABLE'
      );
    }
  }

  existing[m.STAGE_ID] =
    context.nextStageId;
  existing[m.BLOCK_NO] =
    String(
      context.nextBlockNo
    );
  existing[m.SET_OFFSET] =
    String(
      context.nextSetOffset
    );
  existing[m.STATUS] =
    'READY_TO_PATCH';
  existing[
    m.QUESTION_META_JSON
  ] =
    JSON.stringify({
      stage_id:
        context.nextStageId,
      block_no:
        context.nextBlockNo,
      set_offset:
        context.nextSetOffset,
      status:
        'READY_TO_PATCH',
      planned_slots:
        scheduler.plannedSlots,
      scheduler_basis:
        'priority+EDF+same_section_source_valid+ratio_safe_rebalance',
      retest_cap:
        scheduler.cap,
      prior_block_retest_count:
        scheduler.priorBlockRetests,
      deferred_due:
        scheduler.deferred.map(
          function (item) {
            return {
              skill_id:
                item.skillId,
              section:
                h3WrittenSyncDisplaySection_(
                  item.section
                ),
              origin_set:
                item.originSet,
              due_min:
                item.dueMin,
              due_max:
                item.dueMax,
              actual_source:
                item.sourceBucket ||
                'UNRESOLVED'
            };
          }
        ),
      supplemental_due:
        scheduler.supplemental.map(
          function (item) {
            return {
              skill_id:
                item.skillId,
              section:
                h3WrittenSyncDisplaySection_(
                  item.section
                ),
              origin_set:
                item.originSet,
              due_min:
                item.dueMin,
              due_max:
                item.dueMax,
              actual_source:
                item.sourceBucket ||
                'UNRESOLVED',
              reason:
                item.reason ||
                'DEADLINE_RISK'
            };
          }
        ),
      source_ratio_after_plan:
        scheduler.ratio,
      newfmt_runtime_contract_id:
        H3_WRITTEN_NEWFMT_RUNTIME_CONTRACT_ID_,
      newfmt_source_contract_id:
        H3_NEWFMT_SOURCE_CONTRACT_ID_
    });
  existing[
    m.SLOT_PATCH_JSON
  ] =
    JSON.stringify({
      type:
        scheduler.swaps.length
          ? 'ANSWER_SYNC_RATIO_SAFE_SWAP'
          : 'NONE',
      swaps:
        scheduler.swaps,
      preserves_20q_counts:
        scheduler.ratio
    });
  existing[
    m.APPROVED_SOURCE
  ] =
    String(
      existing[
        m.APPROVED_SOURCE
      ] ||
      (
        'H3-ANSWER-SYNC-BACKEND+' +
        H3_WRITTEN_SYNC_RUNTIME_VERSION
      )
    );
  existing[m.POLICY_ID] =
    policyId;
  existing[
    m.SOURCE_SNAPSHOT_ID
  ] =
    sourceSnapshotId;
  existing[m.CREATED_AT] =
    String(
      existing[m.CREATED_AT] ||
      answeredAt
    );
  existing[m.NOTES] =
    'Answer Sync backend plan after ' +
    context.currentStage
      .ACTUAL_SET_ID +
    '; retests=' +
    (
      scheduler.assigned
        .map(
          function (x) {
            return x.skillId;
          }
        )
        .join(';') ||
      'NONE'
    ) +
    '; supplemental=' +
    (
      scheduler.supplemental
        .map(
          function (x) {
            return x.skillId;
          }
        )
        .join(';') ||
      'NONE'
    );

  return existing;
}


function h3WrittenSyncBuildStateWrites_(
  context,
  txn,
  scheduler
) {
  var stateIndex =
    context.stateIndex;
  var changes = {
    NEXT_BLOCK_NO:
      String(
        context.nextBlockNo
      ),
    NEXT_SET_OFFSET:
      String(
        context.nextSetOffset
      ),
    WRITTEN_LAST_HISTORY_SET:
      txn.row.SET_ID,
    WRITTEN_LAST_SYNCED_SET:
      txn.row.SET_ID,
    WRITTEN_NEXT_STAGE_ID:
      context.nextStageId,
    WRITTEN_NEXT_STAGE_RETESTS:
      scheduler.assigned
        .map(
          function (x) {
            return x.skillId;
          }
        )
        .join(';') ||
      'NONE',
    WRITTEN_NEXT_SUPPLEMENTAL:
      h3WrittenSyncSupplementalValue_(
        scheduler.supplemental
      ),
    ANSWER_SYNC_PHASE:
      'COMPLETE',
    ANSWER_SYNC_SET_ID:
      txn.row.SET_ID,
    ANSWER_SYNC_STATUS:
      txn.row.SET_ID +
      '_CORE_COMPLETE',
    WRITTEN_NEXT_STAGE_STATUS:
      'READY_TO_PATCH',
    WRITTEN_NEXT_STAGE_CANONICAL_ID:
      context.nextStageId
  };

  return Object.keys(
    changes
  ).map(
    function (key) {
      var state =
        stateIndex[key];

      if (!state) {
        throw new Error(
          'WRITTEN_SYNC_STATE_KEY_MISSING:' +
            key
        );
      }

      var values =
        state.values.slice();
      values[1] =
        changes[key];

      if (
        key ===
          'ANSWER_SYNC_STATUS'
      ) {
        values[2] =
          'Backend ' +
          H3_WRITTEN_SYNC_RUNTIME_VERSION +
          '; queue E verified through next-stage plan.';
      }

      return {
        sheet:
          'generation_state_v1',
        rowNumber:
          state.rowNumber,
        values:
          values
      };
    }
  );
}


function h3WrittenSyncBuildPlan_(
  runtimeSpreadsheet,
  txn,
  queueContext,
  runtimeContext
) {
  var result =
    txn.result;
  var generation =
    runtimeContext.generation;
  var skills =
    runtimeContext.skills;
  var skillMap =
    h3WrittenSyncProjectSkillMap_(
      skills
    );
  var answeredAt =
    String(
      txn.row.COMMITTED_AT
    );

  var events =
    runtimeContext
      .generationMatches
      .map(
        function (record, i) {
          var generationRow =
            h3WrittenSyncRowObject_(
              generation,
              record.values
            );
          var questionMeta =
            runtimeContext
              .currentMeta
              .questions[i] || {};
          var summary =
            result.summary[i];

          if (
            !summary ||
            summary.section !==
              H3_WEB_WRITTEN_SECTIONS[i] ||
            [
              '○',
              '△',
              '×'
            ].indexOf(
              summary.mark
            ) < 0
          ) {
            throw new Error(
              'WRITTEN_SYNC_SUMMARY_SHAPE_INVALID'
            );
          }

          var section =
            h3WrittenSyncSectionCode_(
              generationRow.SECTION
            );

          if (
            section !==
              summary.section
          ) {
            throw new Error(
              'WRITTEN_SYNC_SECTION_MISMATCH'
            );
          }

          var skillId =
            h3WrittenSyncMappedSkillId_(
              generationRow,
              questionMeta,
              txn.row.SET_ID,
              i + 1
            );

          return {
            qNo:
              i + 1,
            setId:
              txn.row.SET_ID,
            section:
              section,
            bucket:
              String(
                generationRow
                  .PRIMARY_BUCKET ||
                ''
              ),
            skillId:
              skillId,
            answer:
              summary.answer,
            correctAnswer:
              summary.correct_answer,
            uncertain:
              Boolean(
                summary.uncertain
              ),
            mark:
              summary.mark,
            surfaceHash:
              String(
                generationRow
                  .SURFACE_HASH ||
                ''
              ),
            answeredAt:
              answeredAt,
            generationRecord:
              record,
            generationRow:
              generationRow
          };
        }
      );

  var existingCoreWrong = 0;
  Object.keys(
    skillMap
  ).forEach(
    function (skillId) {
      if (
        skillMap[
          skillId
        ].object
          .EFFECTIVE_STATE ===
        'RETEST_WRONG'
      ) {
        existingCoreWrong += 1;
      }
    }
  );

  var projectedSkills = {};
  Object.keys(
    skillMap
  ).forEach(
    function (skillId) {
      projectedSkills[
        skillId
      ] = {
        rowNumber:
          skillMap[
            skillId
          ].rowNumber,
        values:
          skillMap[
            skillId
          ].values.slice(),
        object:
          Object.assign(
            {},
            skillMap[
              skillId
            ].object
          ),
        existing: true
      };
    }
  );

  var appendSkillRow =
    skills.lastRow + 1;
  var newSkillCount = 0;
  var currentWrongIds = {};
  var eventBySkill = {};

  events.forEach(
    function (event) {
      var prior =
        projectedSkills[
          event.skillId
        ] || null;
      var priorWasCoreWrong =
        prior &&
        prior.object
          .EFFECTIVE_STATE ===
          'RETEST_WRONG';

      var previousSurface =
        h3WrittenSyncPreviousSurface_(
          generation,
          event.skillId,
          txn.row.SET_ID
        );

      var transition =
        h3WrittenSyncBuildSkillTransition_(
          prior
            ? prior.object
            : null,
          event,
          previousSurface
        );

      if (
        transition.POOL ===
          'LISTENING'
      ) {
        throw new Error(
          'WRITTEN_SYNC_LISTENING_SKILL_FORBIDDEN:' +
            event.skillId
        );
      }

      if (
        event.mark === '×' &&
        !priorWasCoreWrong
      ) {
        currentWrongIds[
          event.skillId
        ] = true;
      }

      var rowNumber;
      var existing;

      if (prior) {
        rowNumber =
          prior.rowNumber;
        existing = true;
      } else {
        rowNumber =
          appendSkillRow +
          newSkillCount;
        newSkillCount += 1;
        existing = false;
      }

      projectedSkills[
        event.skillId
      ] = {
        rowNumber:
          rowNumber,
        values:
          h3WrittenSyncSkillValues_(
            transition
          ),
        object:
          transition,
        existing:
          existing
      };

      eventBySkill[
        event.skillId
      ] = event;
    }
  );

  var coreWrongBeforeNew = 0;

  Object.keys(
    projectedSkills
  ).forEach(
    function (skillId) {
      if (
        currentWrongIds[
          skillId
        ]
      ) {
        return;
      }

      if (
        projectedSkills[
          skillId
        ].object
          .EFFECTIVE_STATE ===
          'RETEST_WRONG'
      ) {
        coreWrongBeforeNew += 1;
      }
    }
  );

  var availableWrongSlots =
    Math.max(
      0,
      H3_WRITTEN_ACTIVE_WRONG_CAP -
      coreWrongBeforeNew
    );

  events
    .filter(
      function (event) {
        return (
          event.mark === '×' &&
          currentWrongIds[
            event.skillId
          ]
        );
      }
    )
    .forEach(
      function (event) {
        if (
          availableWrongSlots > 0
        ) {
          availableWrongSlots -= 1;
          return;
        }

        var item =
          projectedSkills[
            event.skillId
          ];
        var transition =
          item.object;
        transition.STATE_OVERRIDE =
          'RETEST_WRONG_SUPPLEMENTAL' +
          ';SECTION=' +
          event.section +
          ';DUE_MIN=1;DUE_MAX=3' +
          ';MODE=SUPPLEMENTAL' +
          ';ORIGIN_BUCKET=' +
          event.bucket +
          ';REVIEW_MODE=OVERLOAD_REVIEW';
        transition.EFFECTIVE_STATE =
          'RETEST_WRONG_SUPPLEMENTAL';
        transition.NOTES +=
          ';active_wrong_cap=5;nonblocking OVERLOAD_REVIEW';
        item.values =
          h3WrittenSyncSkillValues_(
            transition
          );
      }
    );

  var latestSource =
    h3WrittenSyncLatestSourceBySkill_(
      generation,
      events
    );

  var scheduler =
    h3WrittenSyncBuildSchedulerPlan_(
      runtimeContext,
      projectedSkills,
      queueContext.history,
      latestSource
    );

  var policyId =
    h3WrittenSyncStateValue_(
      runtimeContext.stateIndex,
      'POLICY_ID'
    );
  var sourceSnapshotId =
    h3WrittenSyncStateValue_(
      runtimeContext.stateIndex,
      'SOURCE_SNAPSHOT_ID'
    );

  var stageValues =
    h3WrittenSyncStageValues_(
      runtimeContext,
      scheduler,
      answeredAt,
      policyId,
      sourceSnapshotId
    );

  var stageRowNumber =
    runtimeContext
      .nextStageRecord
      ? runtimeContext
          .nextStageRecord
          .rowNumber
      : runtimeContext
          .stages.lastRow + 1;

  var writes = [];

  events.forEach(
    function (event) {
      writes.push({
        sheet:
          'generation_log_v1',
        rowNumber:
          event.generationRecord
            .rowNumber,
        values:
          h3WrittenSyncGenerationValues_(
            generation,
            event.generationRecord,
            event
          )
      });
    }
  );

  Object.keys(
    eventBySkill
  ).forEach(
    function (skillId) {
      var item =
        projectedSkills[
          skillId
        ];
      writes.push({
        sheet:
          'skill_queue_v1',
        rowNumber:
          item.rowNumber,
        values:
          item.values.slice()
      });
    }
  );

  var sourceChanges =
    scheduler.sourceRows.filter(
      function (projected) {
        var original =
          runtimeContext
            .sourcePlan.rows
            .filter(
              function (record) {
                return (
                  record.rowNumber ===
                    projected.rowNumber
                );
              }
            )[0];

        return (
          original &&
          JSON.stringify(
            original.values
          ) !==
            JSON.stringify(
              projected.values
            )
        );
      }
    );

  sourceChanges.forEach(
    function (record) {
      writes.push({
        sheet:
          'source_block_plan_v1',
        rowNumber:
          record.rowNumber,
        values:
          record.values.slice()
      });
    }
  );

  writes.push({
    sheet:
      'written_set_stage_v1',
    rowNumber:
      stageRowNumber,
    values:
      stageValues
  });

  h3WrittenSyncBuildStateWrites_(
    runtimeContext,
    txn,
    scheduler
  ).forEach(
    function (write) {
      writes.push(write);
    }
  );

  return {
    schema:
      'H3_WRITTEN_ANSWER_SYNC_PLAN_V1',
    runtime_version:
      H3_WRITTEN_SYNC_RUNTIME_VERSION,
    txn_id:
      txn.row.TXN_ID,
    set_id:
      txn.row.SET_ID,
    stage_id:
      txn.row.STAGE_ID,
    answered_at:
      answeredAt,
    queue_e_sha256:
      queueContext.queueESha256,
    next_stage_id:
      runtimeContext.nextStageId,
    next_stage_status:
      'READY_TO_PATCH',
    next_block_no:
      runtimeContext.nextBlockNo,
    next_set_offset:
      runtimeContext.nextSetOffset,
    retests:
      scheduler.assigned.map(
        function (item) {
          return item.skillId;
        }
      ),
    supplemental:
      scheduler.supplemental.map(
        function (item) {
          return item.skillId;
        }
      ),
    deferred:
      scheduler.deferred.map(
        function (item) {
          return item.skillId;
        }
      ),
    swaps:
      scheduler.swaps,
    writes:
      writes
  };
}


function h3WrittenSyncUniqueTargets_(
  writes
) {
  var seen = {};
  var targets = [];

  writes.forEach(
    function (write) {
      var key =
        write.sheet +
        ':' +
        write.rowNumber;

      if (seen[key]) {
        throw new Error(
          'WRITTEN_SYNC_DUPLICATE_WRITE_TARGET:' +
            key
        );
      }
      seen[key] = true;

      targets.push({
        sheet:
          write.sheet,
        row:
          write.rowNumber,
        width:
          write.values.length
      });
    }
  );

  targets.sort(
    function (a, b) {
      if (a.sheet !== b.sheet) {
        return (
          a.sheet < b.sheet
            ? -1
            : 1
        );
      }
      return a.row - b.row;
    }
  );

  return targets;
}


function h3WrittenSyncSnapshot_(
  spreadsheet,
  targets
) {
  var rows =
    targets.map(
      function (target) {
        var sheet =
          spreadsheet.getSheetByName(
            target.sheet
          );

        if (!sheet) {
          throw new Error(
            'WRITTEN_SYNC_SNAPSHOT_SHEET_MISSING:' +
              target.sheet
          );
        }

        return {
          sheet:
            target.sheet,
          row:
            target.row,
          width:
            target.width,
          values:
            sheet
              .getRange(
                target.row,
                1,
                1,
                target.width
              )
              .getDisplayValues()[0]
        };
      }
    );

  var object = {
    schema:
      'H3_WRITTEN_ANSWER_SYNC_SNAPSHOT_V1',
    rows:
      rows
  };
  var json =
    JSON.stringify(object);

  return {
    object:
      object,
    json:
      json,
    sha256:
      h3Sha256Hex_(json)
  };
}


function h3WrittenSyncExpectedPost_(
  preSnapshot,
  plan
) {
  var writeMap = {};

  plan.writes.forEach(
    function (write) {
      writeMap[
        write.sheet +
        ':' +
        write.rowNumber
      ] =
        write.values.map(
          function (value) {
            return String(
              value === null ||
              typeof value ===
                'undefined'
                ? ''
                : value
            );
          }
        );
    }
  );

  var object = {
    schema:
      'H3_WRITTEN_ANSWER_SYNC_SNAPSHOT_V1',
    rows:
      preSnapshot.object.rows.map(
        function (row) {
          var key =
            row.sheet +
            ':' +
            row.row;
          return {
            sheet:
              row.sheet,
            row:
              row.row,
            width:
              row.width,
            values:
              writeMap[key]
                ? writeMap[
                    key
                  ].slice()
                : row.values.slice()
          };
        }
      )
  };

  var json =
    JSON.stringify(object);

  return {
    object:
      object,
    json:
      json,
    sha256:
      h3Sha256Hex_(json)
  };
}


function h3WrittenSyncApplyPlan_(
  spreadsheet,
  plan
) {
  plan.writes.forEach(
    function (write) {
      var sheet =
        spreadsheet.getSheetByName(
          write.sheet
        );

      if (!sheet) {
        throw new Error(
          'WRITTEN_SYNC_WRITE_SHEET_MISSING:' +
            write.sheet
        );
      }

      sheet
        .getRange(
          write.rowNumber,
          1,
          1,
          write.values.length
        )
        .setValues([
          write.values
        ]);
    }
  );

  SpreadsheetApp.flush();
}


function h3WrittenSyncRestore_(
  spreadsheet,
  snapshot
) {
  snapshot.object.rows.forEach(
    function (row) {
      var sheet =
        spreadsheet.getSheetByName(
          row.sheet
        );

      if (!sheet) {
        throw new Error(
          'WRITTEN_SYNC_RESTORE_SHEET_MISSING:' +
            row.sheet
        );
      }

      sheet
        .getRange(
          row.row,
          1,
          1,
          row.width
        )
        .setValues([
          row.values
        ]);
    }
  );

  SpreadsheetApp.flush();
}


function h3WrittenSyncJournalRows_(
  journal
) {
  var lastRow =
    journal.getLastRow();

  return lastRow > 1
    ? journal
        .getRange(
          2,
          1,
          lastRow - 1,
          H3_WRITTEN_ANSWER_SYNC_HEADERS
            .length
        )
        .getDisplayValues()
    : [];
}


function h3WrittenSyncJournalRecord_(
  journal,
  txnId
) {
  var matches = [];

  h3WrittenSyncJournalRows_(
    journal
  ).forEach(
    function (row, i) {
      if (
        String(row[0] || '') ===
        String(txnId)
      ) {
        matches.push({
          rowNumber:
            i + 2,
          values:
            row
        });
      }
    }
  );

  if (matches.length > 1) {
    throw new Error(
      'WRITTEN_SYNC_DUPLICATE_JOURNAL_AUTHORITY'
    );
  }

  return matches.length
    ? matches[0]
    : null;
}


function h3WrittenSyncResultFromPlan_(
  plan
) {
  return {
    schema:
      'H3_WRITTEN_ANSWER_SYNC_RESULT_V1',
    status:
      'COMPLETE',
    phase:
      'CORE_COMPLETE',
    txn_id:
      plan.txn_id,
    set_id:
      plan.set_id,
    next_stage_id:
      plan.next_stage_id,
    next_stage_status:
      plan.next_stage_status,
    retests:
      plan.retests,
    supplemental:
      plan.supplemental,
    daily_txt:
      'CHAT_OWNED_PENDING'
  };
}


function h3WrittenSyncPromote_(
  journal,
  rowNumber,
  plan
) {
  var completedAt =
    h3NowTokyo_();

  journal
    .getRange(
      rowNumber,
      5,
      1,
      13
    )
    .setValues([[
      'COMMITTED',
      'CORE_COMPLETE',
      plan.queue_e_sha256,
      JSON.stringify(plan),
      h3Sha256Hex_(
        JSON.stringify(plan)
      ),
      journal
        .getRange(
          rowNumber,
          10
        )
        .getDisplayValue(),
      journal
        .getRange(
          rowNumber,
          11
        )
        .getDisplayValue(),
      journal
        .getRange(
          rowNumber,
          12
        )
        .getDisplayValue(),
      journal
        .getRange(
          rowNumber,
          13
        )
        .getDisplayValue(),
      plan.next_stage_id,
      plan.next_stage_status,
      completedAt,
      ''
    ]]);

  SpreadsheetApp.flush();

  var finalRow =
    journal
      .getRange(
        rowNumber,
        1,
        1,
        H3_WRITTEN_ANSWER_SYNC_HEADERS
          .length
      )
      .getDisplayValues()[0];

  if (
    finalRow[0] !==
      plan.txn_id ||
    finalRow[4] !==
      'COMMITTED' ||
    finalRow[5] !==
      'CORE_COMPLETE' ||
    finalRow[13] !==
      plan.next_stage_id
  ) {
    throw new Error(
      'WRITTEN_SYNC_COMMIT_READBACK_FAILED'
    );
  }
}


function h3WrittenSyncRecover_(
  spreadsheet,
  journal,
  record
) {
  var row =
    record.values;
  var status =
    String(row[4] || '');

  if (status === 'COMMITTED') {
    var committedPlan =
      h3WrittenSyncParseJson_(
        row[7],
        'WRITTEN_SYNC_COMMITTED_PLAN_INVALID'
      );
    return h3WrittenSyncResultFromPlan_(
      committedPlan
    );
  }

  if (
    status ===
      'RECOVERY_REQUIRED'
  ) {
    throw new Error(
      'WRITTEN_SYNC_RECOVERY_REQUIRED_BLOCK'
    );
  }

  if (
    [
      'PREPARED',
      'ROLLED_BACK'
    ].indexOf(status) < 0
  ) {
    throw new Error(
      'WRITTEN_SYNC_JOURNAL_STATUS_INVALID:' +
        status
    );
  }

  var plan =
    h3WrittenSyncParseJson_(
      row[7],
      'WRITTEN_SYNC_PREPARED_PLAN_INVALID'
    );
  var pre =
    h3WrittenSyncParseJson_(
      row[9],
      'WRITTEN_SYNC_PRESTATE_INVALID'
    );
  var post =
    h3WrittenSyncParseJson_(
      row[11],
      'WRITTEN_SYNC_POSTSTATE_INVALID'
    );

  var targets =
    pre.rows.map(
      function (item) {
        return {
          sheet:
            item.sheet,
          row:
            item.row,
          width:
            item.width
        };
      }
    );
  var current =
    h3WrittenSyncSnapshot_(
      spreadsheet,
      targets
    );

  if (
    current.sha256 ===
      String(row[12] || '')
  ) {
    h3WrittenSyncPromote_(
      journal,
      record.rowNumber,
      plan
    );
    return h3WrittenSyncResultFromPlan_(
      plan
    );
  }

  if (
    current.sha256 !==
      String(row[10] || '')
  ) {
    journal
      .getRange(
        record.rowNumber,
        5
      )
      .setValue(
        'RECOVERY_REQUIRED'
      );
    journal
      .getRange(
        record.rowNumber,
        17
      )
      .setValue(
        'WRITTEN_SYNC_RUNTIME_MIXED'
      );
    SpreadsheetApp.flush();

    throw new Error(
      'WRITTEN_SYNC_RECOVERY_REQUIRED'
    );
  }

  journal
    .getRange(
      record.rowNumber,
      5
    )
    .setValue('PREPARED');
  journal
    .getRange(
      record.rowNumber,
      6
    )
    .setValue(
      'R4_R8_PENDING'
    );
  journal
    .getRange(
      record.rowNumber,
      17
    )
    .setValue('');
  SpreadsheetApp.flush();

  h3WrittenSyncApplyPlan_(
    spreadsheet,
    plan
  );

  var actual =
    h3WrittenSyncSnapshot_(
      spreadsheet,
      targets
    );

  if (
    actual.sha256 !==
      String(row[12] || '')
  ) {
    throw new Error(
      'WRITTEN_SYNC_POSTSTATE_HASH_MISMATCH'
    );
  }

  h3WrittenSyncPromote_(
    journal,
    record.rowNumber,
    plan
  );

  return h3WrittenSyncResultFromPlan_(
    plan
  );
}


function h3WrittenAnswerSync_(
  txnId
) {
  if (!txnId) {
    throw new Error(
      'WRITTEN_SYNC_TXN_ID_REQUIRED'
    );
  }

  var lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  var runtimeSpreadsheet = null;
  var journal = null;
  var journalRow = null;
  var prestate = null;

  try {
    runtimeSpreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    journal =
      h3WrittenSyncRequireJournal_(
        runtimeSpreadsheet
      );

    var existing =
      h3WrittenSyncJournalRecord_(
        journal,
        txnId
      );

    if (existing) {
      return h3WrittenSyncRecover_(
        runtimeSpreadsheet,
        journal,
        existing
      );
    }

    var txn =
      h3WrittenSyncTxnRecord_(
        runtimeSpreadsheet,
        txnId
      );
    var queueContext =
      h3WrittenSyncQueueContext_(
        txn
      );
    var runtimeContext =
      h3WrittenSyncRuntimeContext_(
        runtimeSpreadsheet,
        txn
      );
    var plan =
      h3WrittenSyncBuildPlan_(
        runtimeSpreadsheet,
        txn,
        queueContext,
        runtimeContext
      );

    var targets =
      h3WrittenSyncUniqueTargets_(
        plan.writes
      );
    prestate =
      h3WrittenSyncSnapshot_(
        runtimeSpreadsheet,
        targets
      );
    var poststate =
      h3WrittenSyncExpectedPost_(
        prestate,
        plan
      );
    var planJson =
      JSON.stringify(plan);
    var planSha =
      h3Sha256Hex_(planJson);
    var createdAt =
      h3NowTokyo_();

    journal.appendRow([
      txnId,
      txn.row.SET_ID,
      txn.row.STAGE_ID,
      createdAt,
      'PREPARED',
      'R4_R8_PENDING',
      queueContext.queueESha256,
      planJson,
      planSha,
      prestate.json,
      prestate.sha256,
      poststate.json,
      poststate.sha256,
      plan.next_stage_id,
      plan.next_stage_status,
      '',
      ''
    ]);

    journalRow =
      journal.getLastRow();
    SpreadsheetApp.flush();

    var prepared =
      journal
        .getRange(
          journalRow,
          1,
          1,
          H3_WRITTEN_ANSWER_SYNC_HEADERS
            .length
        )
        .getDisplayValues()[0];

    if (
      prepared[0] !==
        String(txnId) ||
      prepared[4] !==
        'PREPARED' ||
      prepared[8] !==
        planSha ||
      prepared[10] !==
        prestate.sha256 ||
      prepared[12] !==
        poststate.sha256
    ) {
      throw new Error(
        'WRITTEN_SYNC_PREPARED_READBACK_FAILED'
      );
    }

    h3WrittenSyncApplyPlan_(
      runtimeSpreadsheet,
      plan
    );

    var actualPost =
      h3WrittenSyncSnapshot_(
        runtimeSpreadsheet,
        targets
      );

    if (
      actualPost.sha256 !==
        poststate.sha256
    ) {
      throw new Error(
        'WRITTEN_SYNC_POSTSTATE_HASH_MISMATCH'
      );
    }

    h3WrittenSyncPromote_(
      journal,
      journalRow,
      plan
    );

    return h3WrittenSyncResultFromPlan_(
      plan
    );
  } catch (err) {
    if (
      runtimeSpreadsheet &&
      journal &&
      journalRow &&
      prestate
    ) {
      try {
        h3WrittenSyncRestore_(
          runtimeSpreadsheet,
          prestate
        );

        var targets =
          prestate.object.rows.map(
            function (item) {
              return {
                sheet:
                  item.sheet,
                row:
                  item.row,
                width:
                  item.width
              };
            }
          );
        var rollback =
          h3WrittenSyncSnapshot_(
            runtimeSpreadsheet,
            targets
          );

        if (
          rollback.sha256 ===
            prestate.sha256
        ) {
          journal
            .getRange(
              journalRow,
              5
            )
            .setValue(
              'ROLLED_BACK'
            );
          journal
            .getRange(
              journalRow,
              6
            )
            .setValue(
              'ROLLBACK_VERIFIED'
            );
          journal
            .getRange(
              journalRow,
              17
            )
            .setValue(
              String(
                err &&
                err.message
                  ? err.message
                  : err
              )
            );
        } else {
          journal
            .getRange(
              journalRow,
              5
            )
            .setValue(
              'RECOVERY_REQUIRED'
            );
          journal
            .getRange(
              journalRow,
              6
            )
            .setValue(
              'ROLLBACK_FAILED'
            );
          journal
            .getRange(
              journalRow,
              17
            )
            .setValue(
              'ROLLBACK_READBACK_FAILED:' +
              String(
                err &&
                err.message
                  ? err.message
                  : err
              )
            );
        }

        SpreadsheetApp.flush();
      } catch (_rollbackErr) {
        // Original failure remains authoritative.
      }
    }

    throw err;
  } finally {
    lock.releaseLock();
  }
}
