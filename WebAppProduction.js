/**
 * H3 R3-03 production listening answer transaction.
 *
 * IMPORTANT:
 * - implementation is staged in R3-03
 * - production commit gate remains OFF until R3-07/R3-08 activation
 * - SYSTEM_TEST does not call this file
 * - learner mutations are limited to listening_log_v1 L:T,
 *   listening_state_v1 affected VALUE cells, and listening_web_txn_v1
 */

var H3_R3_PRODUCTION_COMMIT_ENABLED = false;

var H3_WEB_PROD_TXN_SHEET = 'listening_web_txn_v1';

var H3_WEB_PROD_TXN_HEADERS = [
  'TXN_ID',
  'SET_ID',
  'LISTENING_SET_NO',
  'MODE',
  'RAW_INPUT_JSON',
  'REQUEST_FINGERPRINT',
  'CREATED_AT',
  'STATUS',
  'RESULT_JSON',
  'SCORE',
  'PRESTATE_JSON',
  'PRESTATE_SHA256',
  'POSTSTATE_SHA256',
  'COMMITTED_AT',
  'ERROR'
];

var H3_WEB_PROD_SECTIONS = ['K1', 'K2', 'K3', 'K4', 'K5'];

function h3ProdNormalizeAnswers_(request) {
  if (!request || request.schema !== 'H3_WEB_SUBMIT_V1') {
    throw new Error('INVALID_SUBMIT_SCHEMA');
  }
  if (request.mode !== 'LISTENING') {
    throw new Error('PRODUCTION_MODE_REQUIRED');
  }
  if (
    !request.set_id ||
    !Array.isArray(request.answers) ||
    request.answers.length !== 5
  ) {
    throw new Error('INVALID_PRODUCTION_SUBMISSION');
  }

  return request.answers.map(function (a, i) {
    if (!a || a.section !== H3_WEB_PROD_SECTIONS[i]) {
      throw new Error('SECTION_ORDER_MISMATCH');
    }
    if (
      typeof a.answer !== 'number' ||
      a.answer < 1 ||
      a.answer > 4 ||
      a.answer % 1 !== 0
    ) {
      throw new Error('ANSWER_OUT_OF_RANGE');
    }
    if (typeof a.uncertain !== 'boolean') {
      throw new Error('UNCERTAIN_MUST_BE_BOOLEAN');
    }
    return {
      section: a.section,
      answer: a.answer,
      uncertain: a.uncertain
    };
  });
}

function h3ProdFingerprint_(setId, answers) {
  return h3Sha256Hex_(
    String(setId) +
      '|' +
      answers
        .map(function (a) {
          return (
            a.section +
            ':' +
            String(a.answer) +
            ':' +
            (a.uncertain ? '1' : '0')
          );
        })
        .join('|')
  );
}

function h3ProdHeaderMap_(header) {
  var map = {};
  header.forEach(function (name, i) {
    map[String(name)] = i;
  });
  return map;
}

function h3ProdSheetRows_(sheet) {
  var values = sheet.getDataRange().getDisplayValues();
  if (!values.length) {
    throw new Error('EMPTY_SHEET:' + sheet.getName());
  }
  return {
    header: values[0],
    map: h3ProdHeaderMap_(values[0]),
    rows: values.slice(1)
  };
}

function h3ProdRequireColumns_(table, names, sheetName) {
  names.forEach(function (name) {
    if (typeof table.map[name] !== 'number') {
      throw new Error(
        'MISSING_COLUMN:' + sheetName + ':' + name
      );
    }
  });
}

function h3ProdOneRowBy_(table, column, value, sheetName) {
  var col = table.map[column];
  var matches = [];
  table.rows.forEach(function (row, i) {
    if (String(row[col] || '') === String(value)) {
      matches.push({
        rowNumber: i + 2,
        row: row
      });
    }
  });
  if (matches.length !== 1) {
    throw new Error(
      'ROW_CARDINALITY:' +
        sheetName +
        ':' +
        column +
        ':' +
        value +
        ':' +
        matches.length
    );
  }
  return matches[0];
}

function h3ProdStateMap_(table) {
  h3ProdRequireColumns_(
    table,
    ['STATE_KEY', 'VALUE'],
    'listening_state_v1'
  );
  var map = {};
  table.rows.forEach(function (row, i) {
    var key = String(row[table.map.STATE_KEY] || '');
    if (!key) return;
    map[key] = {
      rowNumber: i + 2,
      value: String(row[table.map.VALUE] || '')
    };
  });
  return map;
}

function h3ProdPolicyMap_(table) {
  h3ProdRequireColumns_(
    table,
    ['KEY', 'VALUE'],
    'listening_policy_v1'
  );
  var map = {};
  table.rows.forEach(function (row) {
    var key = String(row[table.map.KEY] || '');
    if (!key) return;
    map[key] = String(row[table.map.VALUE] || '');
  });
  return map;
}

function h3ProdParseJson_(text, code) {
  try {
    return JSON.parse(String(text || ''));
  } catch (err) {
    throw new Error(code);
  }
}

function h3ProdReadContext_(spreadsheet, setId) {
  var payloadSheet =
    spreadsheet.getSheetByName('listening_set_payload_v1');
  var logSheet =
    spreadsheet.getSheetByName('listening_log_v1');
  var stateSheet =
    spreadsheet.getSheetByName('listening_state_v1');
  var policySheet =
    spreadsheet.getSheetByName('listening_policy_v1');
  var k1Sheet =
    spreadsheet.getSheetByName('listening_k1_ready_v1');

  if (
    !payloadSheet ||
    !logSheet ||
    !stateSheet ||
    !policySheet ||
    !k1Sheet
  ) {
    throw new Error('PRODUCTION_SOURCE_SHEET_MISSING');
  }

  var payload = h3ProdSheetRows_(payloadSheet);
  var logs = h3ProdSheetRows_(logSheet);
  var state = h3ProdSheetRows_(stateSheet);
  var policy = h3ProdSheetRows_(policySheet);
  var k1 = h3ProdSheetRows_(k1Sheet);

  h3ProdRequireColumns_(
    payload,
    [
      'LISTENING_SET_ID',
      'LISTENING_SET_NO',
      'STATUS',
      'K1_READY_ID',
      'ANSWER_KEY_JSON',
      'ITEM_PAYLOAD_SHA256',
      'AUDIO_BINDING_JSON',
      'SOURCE_PROVENANCE_JSON'
    ],
    'listening_set_payload_v1'
  );

  h3ProdRequireColumns_(
    logs,
    [
      'PARENT_SET_ID',
      'LISTENING_ISSUE_NO',
      'SECTION_KEY',
      'SKILL_ID',
      'SOURCE_PROVENANCE',
      'SURFACE_HASH',
      'STATUS',
      'USER_RESULT',
      'ANSWERED_AT',
      'AUDIO_PLAY_COUNT',
      'AUDIO_VALID',
      'VISUAL_VALID',
      'TRANSCRIPT_REVEALED_BEFORE_ANSWER',
      'CHOICE_LANGUAGE',
      'QUEUE_UPDATE_STATUS',
      'PROVENANCE_JSON'
    ],
    'listening_log_v1'
  );

  h3ProdRequireColumns_(
    k1,
    [
      'K1_READY_ID',
      'STATUS',
      'IMAGE_SHA256',
      'ANSWER_KEY',
      'BOUND_LISTENING_SET_ID',
      'CONSUMED_AT'
    ],
    'listening_k1_ready_v1'
  );

  var payloadRecord = h3ProdOneRowBy_(
    payload,
    'LISTENING_SET_ID',
    setId,
    'listening_set_payload_v1'
  );

  var p = payloadRecord.row;
  var pm = payload.map;

  if (String(p[pm.STATUS] || '') !== 'ISSUED') {
    throw new Error('SET_NOT_ISSUED');
  }

  var setNo = Number(p[pm.LISTENING_SET_NO]);
  if (!Number.isFinite(setNo) || setNo < 1) {
    throw new Error('INVALID_LISTENING_SET_NO');
  }

  var answerKey = h3ProdParseJson_(
    p[pm.ANSWER_KEY_JSON],
    'ANSWER_KEY_JSON_INVALID'
  );
  var audioBinding = h3ProdParseJson_(
    p[pm.AUDIO_BINDING_JSON],
    'AUDIO_BINDING_JSON_INVALID'
  );
  var sourceProv = h3ProdParseJson_(
    p[pm.SOURCE_PROVENANCE_JSON],
    'SOURCE_PROVENANCE_JSON_INVALID'
  );

  var logRows = [];
  logs.rows.forEach(function (row, i) {
    if (
      String(row[logs.map.PARENT_SET_ID] || '') ===
      String(setId)
    ) {
      logRows.push({
        rowNumber: i + 2,
        row: row
      });
    }
  });

  if (logRows.length !== 5) {
    throw new Error('PRODUCTION_LOG_ROW_COUNT_MISMATCH');
  }

  logRows.sort(function (a, b) {
    return (
      H3_WEB_PROD_SECTIONS.indexOf(
        String(a.row[logs.map.SECTION_KEY] || '')
      ) -
      H3_WEB_PROD_SECTIONS.indexOf(
        String(b.row[logs.map.SECTION_KEY] || '')
      )
    );
  });

  logRows.forEach(function (record, i) {
    var row = record.row;
    var section = H3_WEB_PROD_SECTIONS[i];

    if (
      String(row[logs.map.SECTION_KEY] || '') !== section
    ) {
      throw new Error('PRODUCTION_LOG_SECTION_MISMATCH');
    }
    if (
      Number(row[logs.map.LISTENING_ISSUE_NO]) !== setNo
    ) {
      throw new Error('PRODUCTION_LOG_SET_NO_MISMATCH');
    }
    if (String(row[logs.map.STATUS] || '') !== 'VALID') {
      throw new Error('PRODUCTION_LOG_NOT_VALID:' + section);
    }
    if (String(row[logs.map.USER_RESULT] || '') !== '') {
      throw new Error('PRODUCTION_LOG_ALREADY_ANSWERED');
    }

    if (
      !audioBinding.individual ||
      !audioBinding.individual[section] ||
      String(
        audioBinding.individual[section].payload_hash || ''
      ) !== String(row[logs.map.SURFACE_HASH] || '')
    ) {
      throw new Error(
        'AUDIO_BINDING_SURFACE_HASH_MISMATCH:' + section
      );
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        answerKey,
        section
      )
    ) {
      throw new Error('ANSWER_KEY_SECTION_MISSING:' + section);
    }
  });

  var k1ReadyId = String(p[pm.K1_READY_ID] || '');
  var k1Record = h3ProdOneRowBy_(
    k1,
    'K1_READY_ID',
    k1ReadyId,
    'listening_k1_ready_v1'
  );
  var kr = k1Record.row;
  var km = k1.map;

  if (
    String(kr[km.STATUS] || '') !== 'CONSUMED' ||
    String(kr[km.BOUND_LISTENING_SET_ID] || '') !==
      String(setId) ||
    !String(kr[km.CONSUMED_AT] || '')
  ) {
    throw new Error('K1_READY_BINDING_INVALID');
  }

  if (
    Number(kr[km.ANSWER_KEY]) !== Number(answerKey.K1)
  ) {
    throw new Error('K1_READY_ANSWER_KEY_MISMATCH');
  }

  var stateMap = h3ProdStateMap_(state);
  var policyMap = h3ProdPolicyMap_(policy);

  if (
    Number(stateMap.NEXT_LISTENING_SET_NO &&
      stateMap.NEXT_LISTENING_SET_NO.value) !== setNo
  ) {
    throw new Error('STATE_NEXT_SET_NO_MISMATCH');
  }

  return {
    payloadSheet: payloadSheet,
    logSheet: logSheet,
    stateSheet: stateSheet,
    policySheet: policySheet,
    k1Sheet: k1Sheet,
    payloadTable: payload,
    logTable: logs,
    stateTable: state,
    policyTable: policy,
    k1Table: k1,
    payloadRecord: payloadRecord,
    logRows: logRows,
    k1Record: k1Record,
    setId: String(setId),
    setNo: setNo,
    answerKey: answerKey,
    itemPayloadSha256: String(
      p[pm.ITEM_PAYLOAD_SHA256] || ''
    ),
    audioBinding: audioBinding,
    sourceProvenance: sourceProv,
    stateMap: stateMap,
    policyMap: policyMap
  };
}

function h3ProdSlotRole_(context, section) {
  var sectionProv =
    context.sourceProvenance &&
    context.sourceProvenance[section];

  if (!sectionProv) {
    throw new Error(
      'R3_SLOT_ROLE_NOT_PERSISTED:' + section
    );
  }

  var role = String(sectionProv.slot_role || '');
  if (role !== 'PRIMARY' && role !== 'RETEST') {
    throw new Error(
      'R3_SLOT_ROLE_NOT_PERSISTED:' + section
    );
  }

  if (role === 'RETEST') {
    var originSetNo = Number(
      sectionProv.retest_origin_set_no
    );
    var dueMinSetNo = Number(
      sectionProv.retest_due_min_set_no
    );
    var dueMaxSetNo = Number(
      sectionProv.retest_due_max_set_no
    );

    if (
      !Number.isFinite(originSetNo) ||
      !Number.isFinite(dueMinSetNo) ||
      !Number.isFinite(dueMaxSetNo) ||
      context.setNo < dueMinSetNo ||
      context.setNo > dueMaxSetNo
    ) {
      throw new Error(
        'R3_RETEST_SLOT_METADATA_INVALID:' + section
      );
    }

    return {
      role: role,
      origin_set_no: originSetNo,
      due_min_set_no: dueMinSetNo,
      due_max_set_no: dueMaxSetNo
    };
  }

  return { role: role };
}

function h3ProdGrade_(context, answers) {
  var score = 0;

  return answers.map(function (a) {
    var correctAnswer = Number(context.answerKey[a.section]);
    var correct = a.answer === correctAnswer;
    if (correct) score += 1;

    return {
      section: a.section,
      answer: a.answer,
      uncertain: a.uncertain,
      correct_answer: correctAnswer,
      result: correct
        ? a.uncertain
          ? '△'
          : '○'
        : '×',
      score_delta: correct ? 1 : 0
    };
  });
}

function h3ProdRetestEvidence_(setNo, result, slotRole) {
  if (result === '×') {
    return {
      required: true,
      origin_set_no: setNo,
      due_min_set_no: setNo + 1,
      due_max_set_no: setNo + 3,
      same_section_slot: true
    };
  }

  if (result === '△') {
    return {
      required: true,
      origin_set_no: setNo,
      due_min_set_no: setNo + 2,
      due_max_set_no: setNo + 5,
      same_section_slot: true
    };
  }

  if (slotRole.role === 'RETEST') {
    return {
      required: false,
      served: true,
      origin_set_no: slotRole.origin_set_no,
      due_min_set_no: slotRole.due_min_set_no,
      due_max_set_no: slotRole.due_max_set_no,
      same_section_slot: true
    };
  }

  return { required: false };
}

function h3ProdHistoryRows_(context, prospective) {
  var lm = context.logTable.map;
  var history = [];

  context.logTable.rows.forEach(function (row) {
    var result = String(row[lm.USER_RESULT] || '');
    if (
      String(row[lm.STATUS] || '') !== 'VALID' ||
      !result
    ) {
      return;
    }

    history.push({
      skill_id: String(row[lm.SKILL_ID] || ''),
      set_no: Number(row[lm.LISTENING_ISSUE_NO]),
      surface_hash: String(row[lm.SURFACE_HASH] || ''),
      result: result
    });
  });

  prospective.forEach(function (x, i) {
    var row = context.logRows[i].row;
    history.push({
      skill_id: String(row[lm.SKILL_ID] || ''),
      set_no: context.setNo,
      surface_hash: String(row[lm.SURFACE_HASH] || ''),
      result: x.result
    });
  });

  return history;
}

function h3ProdActiveSkillCount_(history) {
  var bySkill = {};

  history.forEach(function (item) {
    if (!item.skill_id) return;
    if (!bySkill[item.skill_id]) {
      bySkill[item.skill_id] = [];
    }
    bySkill[item.skill_id].push(item);
  });

  var active = 0;

  Object.keys(bySkill).forEach(function (skillId) {
    var rows = bySkill[skillId].slice().sort(function (a, b) {
      return a.set_no - b.set_no;
    });

    var latestNonCorrect = -1;
    rows.forEach(function (row, i) {
      if (row.result === '×' || row.result === '△') {
        latestNonCorrect = i;
      }
    });

    if (latestNonCorrect < 0) return;

    var seenSet = {};
    var seenSurface = {};
    var correctCount = 0;

    for (
      var i = latestNonCorrect + 1;
      i < rows.length;
      i += 1
    ) {
      var row = rows[i];
      if (row.result !== '○') continue;
      if (seenSet[row.set_no]) continue;
      if (seenSurface[row.surface_hash]) continue;

      seenSet[row.set_no] = true;
      seenSurface[row.surface_hash] = true;
      correctCount += 1;
    }

    if (correctCount < 2) {
      active += 1;
    }
  });

  return active;
}

function h3ProdPhaseAfterSet_(setNo, policyMap) {
  var baseline1End = Number(policyMap.BASELINE1_END || 2);
  var baseline2End = Number(policyMap.BASELINE2_END || 4);

  if (setNo < baseline1End) return 'BASELINE_1';
  if (setNo < baseline2End) return 'BASELINE_2';
  return 'POST_BASELINE';
}

function h3ProdBuildPlan_(context, answers, nowText) {
  var graded = h3ProdGrade_(context, answers);
  var score = graded.reduce(function (sum, item) {
    return sum + item.score_delta;
  }, 0);

  var slotRoles = {};
  H3_WEB_PROD_SECTIONS.forEach(function (section) {
    slotRoles[section] = h3ProdSlotRole_(
      context,
      section
    );
  });

  var history = h3ProdHistoryRows_(context, graded);
  var activeWrongCount =
    h3ProdActiveSkillCount_(history);
  var activeWrongCap = Number(
    context.policyMap.ACTIVE_WRONG_CAP || 3
  );
  var overload =
    activeWrongCount > activeWrongCap;

  var logWrites = graded.map(function (item, i) {
    var row = context.logRows[i].row;
    var lm = context.logTable.map;
    var retest = h3ProdRetestEvidence_(
      context.setNo,
      item.result,
      slotRoles[item.section]
    );

    var provenance = {
      set_id: context.setId,
      listening_set_no: context.setNo,
      raw_answer: item.answer,
      uncertain: item.uncertain,
      correct_answer: item.correct_answer,
      result: item.result,
      source_mode: String(
        row[lm.SOURCE_PROVENANCE] || ''
      ),
      item_payload_sha256:
        context.itemPayloadSha256,
      audio_payload_hash: String(
        row[lm.SURFACE_HASH] || ''
      ),
      retest: retest,
      answer_source: 'web_app_transaction',
      txn_id: null
    };

    return {
      section: item.section,
      rowNumber: context.logRows[i].rowNumber,
      result: item.result,
      queue_update_status:
        item.result === '○'
          ? 'NO_RETEST'
          : overload
            ? 'OVERLOAD_REVIEW_REQUIRED'
            : 'RETEST_REQUIRED',
      provenance: provenance,
      slot_role: slotRoles[item.section].role
    };
  });

  var state = {};
  Object.keys(context.stateMap).forEach(function (key) {
    state[key] = context.stateMap[key].value;
  });

  state.LISTENING_ISSUE_NO =
    String(context.setNo);
  state.PHASE =
    h3ProdPhaseAfterSet_(
      context.setNo,
      context.policyMap
    );
  state.ACTIVE_WRONG_COUNT =
    String(activeWrongCount);
  state.OVERLOAD_STATUS =
    overload ? 'LISTENING_OVERLOAD_REVIEW' : '';
  state.LAST_UPDATED_AT = nowText;
  state.NEXT_SET_COMPOSITION =
    'K1,K2,K3,K4,K5';
  state.NEXT_LISTENING_SET_NO =
    String(context.setNo + 1);
  state.LAST_LISTENING_SET_ID =
    context.setId;
  state.ANSWER_SYNC_PHASE = 'IDLE';

  H3_WEB_PROD_SECTIONS.forEach(function (section) {
    var role = slotRoles[section].role;
    var countKey = section + '_VALID_COUNT';
    var lastKey = 'LAST_' + section + '_ISSUE';

    if (role === 'PRIMARY') {
      state[countKey] = String(
        Number(state[countKey] || 0) + 1
      );
    }

    state[lastKey] = String(context.setNo);
  });

  return {
    answeredAt: nowText,
    score: score,
    total: 5,
    graded: graded,
    logWrites: logWrites,
    stateValues: state,
    activeWrongCount: activeWrongCount,
    overload: overload
  };
}

function h3ProdRuntimeSnapshot_(context) {
  var lm = context.logTable.map;

  var log = context.logRows.map(function (record) {
    var values = context.logSheet
      .getRange(
        record.rowNumber,
        lm.USER_RESULT + 1,
        1,
        lm.PROVENANCE_JSON -
          lm.USER_RESULT +
          1
      )
      .getDisplayValues()[0];

    return {
      rowNumber: record.rowNumber,
      values: values
    };
  });

  var state = context.stateTable.rows.map(
    function (row, i) {
      var rowNumber = i + 2;
      return {
        rowNumber: rowNumber,
        key: String(
          row[context.stateTable.map.STATE_KEY] || ''
        ),
        value: context.stateSheet
          .getRange(rowNumber, 2)
          .getDisplayValue()
      };
    }
  );

  var object = {
    schema: 'H3_PROD_RUNTIME_SNAPSHOT_V1',
    set_id: context.setId,
    log: log,
    state: state
  };
  var json = JSON.stringify(object);

  return {
    object: object,
    json: json,
    sha256: h3Sha256Hex_(json)
  };
}

function h3ProdExpectedSnapshot_(
  context,
  prestate,
  plan
) {
  var object = JSON.parse(prestate.json);

  plan.logWrites.forEach(function (item) {
    var target = object.log.filter(function (x) {
      return x.rowNumber === item.rowNumber;
    })[0];

    if (!target) {
      throw new Error(
        'EXPECTED_POSTSTATE_LOG_ROW_MISSING'
      );
    }

    var lm = context.logTable.map;
    target.values[
      lm.USER_RESULT - lm.USER_RESULT
    ] = item.result;
    target.values[
      lm.ANSWERED_AT - lm.USER_RESULT
    ] = plan.answeredAt;
    target.values[
      lm.QUEUE_UPDATE_STATUS -
        lm.USER_RESULT
    ] = item.queue_update_status;
    target.values[
      lm.PROVENANCE_JSON -
        lm.USER_RESULT
    ] = JSON.stringify(item.provenance);
  });

  object.state.forEach(function (item) {
    if (
      Object.prototype.hasOwnProperty.call(
        plan.stateValues,
        item.key
      )
    ) {
      item.value = String(
        plan.stateValues[item.key]
      );
    }
  });

  var json = JSON.stringify(object);
  return {
    object: object,
    json: json,
    sha256: h3Sha256Hex_(json)
  };
}

function h3ProdSnapshotFromTemplate_(
  spreadsheet,
  templateObject
) {
  var logSheet =
    spreadsheet.getSheetByName('listening_log_v1');
  var stateSheet =
    spreadsheet.getSheetByName('listening_state_v1');

  if (!logSheet || !stateSheet) {
    throw new Error(
      'PRODUCTION_RECOVERY_SOURCE_SHEET_MISSING'
    );
  }

  var object = JSON.parse(
    JSON.stringify(templateObject)
  );

  object.log.forEach(function (item) {
    item.values = logSheet
      .getRange(
        item.rowNumber,
        12,
        1,
        9
      )
      .getDisplayValues()[0];
  });

  object.state.forEach(function (item) {
    item.value = stateSheet
      .getRange(item.rowNumber, 2)
      .getDisplayValue();
  });

  var json = JSON.stringify(object);
  return {
    object: object,
    json: json,
    sha256: h3Sha256Hex_(json)
  };
}

function h3ProdRestoreSnapshot_(
  spreadsheet,
  snapshotObject
) {
  var logSheet =
    spreadsheet.getSheetByName('listening_log_v1');
  var stateSheet =
    spreadsheet.getSheetByName('listening_state_v1');

  if (!logSheet || !stateSheet) {
    throw new Error(
      'PRODUCTION_ROLLBACK_SOURCE_SHEET_MISSING'
    );
  }

  var logRows = snapshotObject.log
    .slice()
    .sort(function (a, b) {
      return a.rowNumber - b.rowNumber;
    });

  for (var i = 1; i < logRows.length; i += 1) {
    if (
      logRows[i].rowNumber !==
      logRows[0].rowNumber + i
    ) {
      throw new Error(
        'PRODUCTION_LOG_ROWS_NOT_CONTIGUOUS'
      );
    }
  }

  logSheet
    .getRange(
      logRows[0].rowNumber,
      12,
      logRows.length,
      9
    )
    .setValues(
      logRows.map(function (x) {
        return x.values;
      })
    );

  var stateRows = snapshotObject.state
    .slice()
    .sort(function (a, b) {
      return a.rowNumber - b.rowNumber;
    });

  var minRow = stateRows[0].rowNumber;
  var maxRow =
    stateRows[stateRows.length - 1].rowNumber;
  var valueMap = {};
  stateRows.forEach(function (x) {
    valueMap[x.rowNumber] = x.value;
  });

  var stateValues = [];
  for (var rowNo = minRow; rowNo <= maxRow; rowNo += 1) {
    stateValues.push([
      Object.prototype.hasOwnProperty.call(
        valueMap,
        rowNo
      )
        ? valueMap[rowNo]
        : stateSheet
            .getRange(rowNo, 2)
            .getDisplayValue()
    ]);
  }

  stateSheet
    .getRange(
      minRow,
      2,
      stateValues.length,
      1
    )
    .setValues(stateValues);

  SpreadsheetApp.flush();
}

function h3ProdApplyPlan_(context, plan) {
  var lm = context.logTable.map;
  var records = context.logRows
    .slice()
    .sort(function (a, b) {
      return a.rowNumber - b.rowNumber;
    });

  for (var i = 1; i < records.length; i += 1) {
    if (
      records[i].rowNumber !==
      records[0].rowNumber + i
    ) {
      throw new Error(
        'PRODUCTION_LOG_ROWS_NOT_CONTIGUOUS'
      );
    }
  }

  var blocks = records.map(function (record) {
    return context.logSheet
      .getRange(
        record.rowNumber,
        lm.USER_RESULT + 1,
        1,
        lm.PROVENANCE_JSON -
          lm.USER_RESULT +
          1
      )
      .getDisplayValues()[0];
  });

  plan.logWrites.forEach(function (item) {
    var index = item.rowNumber - records[0].rowNumber;
    var block = blocks[index];

    block[0] = item.result;
    block[
      lm.ANSWERED_AT - lm.USER_RESULT
    ] = plan.answeredAt;
    block[
      lm.QUEUE_UPDATE_STATUS -
        lm.USER_RESULT
    ] = item.queue_update_status;
    block[
      lm.PROVENANCE_JSON -
        lm.USER_RESULT
    ] = JSON.stringify(item.provenance);
  });

  context.logSheet
    .getRange(
      records[0].rowNumber,
      lm.USER_RESULT + 1,
      records.length,
      blocks[0].length
    )
    .setValues(blocks);

  var affected = Object.keys(plan.stateValues)
    .map(function (key) {
      var record = context.stateMap[key];
      return record
        ? {
            key: key,
            rowNumber: record.rowNumber,
            value: plan.stateValues[key]
          }
        : null;
    })
    .filter(Boolean)
    .sort(function (a, b) {
      return a.rowNumber - b.rowNumber;
    });

  if (!affected.length) {
    throw new Error(
      'PRODUCTION_STATE_WRITE_EMPTY'
    );
  }

  var minRow = affected[0].rowNumber;
  var maxRow =
    affected[affected.length - 1].rowNumber;
  var replacements = {};
  affected.forEach(function (x) {
    replacements[x.rowNumber] =
      String(x.value);
  });

  var existing = context.stateSheet
    .getRange(
      minRow,
      2,
      maxRow - minRow + 1,
      1
    )
    .getDisplayValues();

  var writeValues = existing.map(
    function (row, i) {
      var rowNo = minRow + i;
      return [
        Object.prototype.hasOwnProperty.call(
          replacements,
          rowNo
        )
          ? replacements[rowNo]
          : row[0]
      ];
    }
  );

  context.stateSheet
    .getRange(
      minRow,
      2,
      writeValues.length,
      1
    )
    .setValues(writeValues);

  SpreadsheetApp.flush();
}

function h3ProdRequireJournal_(spreadsheet) {
  var sheet =
    spreadsheet.getSheetByName(H3_WEB_PROD_TXN_SHEET);
  if (!sheet) {
    throw new Error('PRODUCTION_TXN_SHEET_MISSING');
  }

  var header = sheet
    .getRange(1, 1, 1, H3_WEB_PROD_TXN_HEADERS.length)
    .getDisplayValues()[0];

  if (
    JSON.stringify(header) !==
    JSON.stringify(H3_WEB_PROD_TXN_HEADERS)
  ) {
    throw new Error('PRODUCTION_TXN_HEADER_MISMATCH');
  }

  return sheet;
}

function h3ProdNextTxnId_(spreadsheet) {
  var datePart = Utilities.formatDate(
    new Date(),
    'Asia/Tokyo',
    'yyyyMMdd'
  );
  var prefix = 'H3TX-' + datePart + '-';
  var max = 0;

  [
    H3_WEB_PROD_TXN_SHEET,
    H3_WEB_TEST_TXN_SHEET
  ].forEach(function (sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;

    var ids = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 1)
      .getDisplayValues();

    ids.forEach(function (row) {
      var value = String(row[0] || '');
      if (value.indexOf(prefix) !== 0) return;
      var suffix = value.slice(prefix.length);
      if (!/^\d{6}$/.test(suffix)) return;
      max = Math.max(max, Number(suffix));
    });
  });

  var next = String(max + 1);
  while (next.length < 6) next = '0' + next;
  return prefix + next;
}

function h3ProdBuildResult_(plan, context, txnId) {
  return {
    schema: 'H3_WEB_SUBMIT_RESULT_V1',
    mode: 'LISTENING',
    persisted: true,
    set_id: context.setId,
    txn_id: txnId,
    status: 'COMMITTED',
    score: plan.score,
    total: plan.total,
    summary: plan.graded.map(function (x) {
      return {
        section: x.section,
        answer:
          String(x.answer) +
          (x.uncertain ? '?' : ''),
        correct_answer: x.correct_answer,
        result: x.result
      };
    }),
    receipt: [
      '[H3_WEB_SYNC]',
      'SET_ID=' + context.setId,
      'TXN_ID=' + txnId,
      'STATUS=COMMITTED'
    ].join('\n')
  };
}

function h3ProdSubmit_(request) {
  if (!H3_R3_PRODUCTION_COMMIT_ENABLED) {
    throw new Error(
      'R3_03_PRODUCTION_COMMIT_DISABLED'
    );
  }

  var answers = h3ProdNormalizeAnswers_(request);
  var fingerprint = h3ProdFingerprint_(
    request.set_id,
    answers
  );

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  var spreadsheet = null;
  var journal = null;
  var txnRow = null;
  var prestate = null;

  try {
    spreadsheet = SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
    journal = h3ProdRequireJournal_(spreadsheet);

    var journalValues =
      journal.getDataRange().getDisplayValues();
    var rows = journalValues.slice(1);
    var unresolvedRecovery = false;

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var status = String(row[7] || '');

      if (status === 'RECOVERY_REQUIRED') {
        unresolvedRecovery = true;
      }

      if (
        String(row[1] || '') !==
        String(request.set_id)
      ) {
        continue;
      }

      if (
        status === 'COMMITTED' &&
        String(row[5] || '') === fingerprint
      ) {
        return h3ProdParseJson_(
          row[8],
          'PRODUCTION_COMMITTED_RESULT_INVALID'
        );
      }

      if (status === 'COMMITTED') {
        throw new Error(
          'CONFLICT_ALREADY_COMMITTED'
        );
      }

      if (status === 'PREPARED') {
        var storedPre = h3ProdParseJson_(
          row[10],
          'PRODUCTION_PRESTATE_INVALID'
        );
        var current =
          h3ProdSnapshotFromTemplate_(
            spreadsheet,
            storedPre
          );
        var preHash = String(row[11] || '');
        var postHash = String(row[12] || '');

        if (current.sha256 === postHash) {
          var storedResult = h3ProdParseJson_(
            row[8],
            'PRODUCTION_PREPARED_RESULT_INVALID'
          );
          journal
            .getRange(i + 2, 8)
            .setValue('COMMITTED');
          journal
            .getRange(i + 2, 14)
            .setValue(h3NowTokyo_());
          SpreadsheetApp.flush();

          var promoted = journal
            .getRange(
              i + 2,
              1,
              1,
              H3_WEB_PROD_TXN_HEADERS.length
            )
            .getDisplayValues()[0];

          if (
            promoted[0] !== String(row[0] || '') ||
            promoted[7] !== 'COMMITTED'
          ) {
            throw new Error(
              'PRODUCTION_RECOVERY_PROMOTE_FAILED'
            );
          }

          if (
            String(row[5] || '') !== fingerprint
          ) {
            throw new Error(
              'CONFLICT_ALREADY_COMMITTED'
            );
          }

          return storedResult;
        }

        if (current.sha256 === preHash) {
          journal
            .getRange(i + 2, 8)
            .setValue('ROLLED_BACK');
          journal
            .getRange(i + 2, 15)
            .setValue(
              'STRANDED_PREPARED_FOUND_AT_PRESTATE'
            );
          SpreadsheetApp.flush();
          continue;
        }

        journal
          .getRange(i + 2, 8)
          .setValue('RECOVERY_REQUIRED');
        journal
          .getRange(i + 2, 15)
          .setValue(
            'STRANDED_PREPARED_RUNTIME_MIXED'
          );
        SpreadsheetApp.flush();

        throw new Error(
          'PRODUCTION_RECOVERY_REQUIRED'
        );
      }
    }

    if (unresolvedRecovery) {
      throw new Error(
        'PRODUCTION_RECOVERY_REQUIRED_BLOCK'
      );
    }

    var context = h3ProdReadContext_(
      spreadsheet,
      request.set_id
    );
    var nowText = h3NowTokyo_();
    var plan = h3ProdBuildPlan_(
      context,
      answers,
      nowText
    );

    var txnId = h3ProdNextTxnId_(spreadsheet);
    h3ProdApplyTxnId_(plan, txnId);

    prestate = h3ProdRuntimeSnapshot_(context);
    var expectedPost =
      h3ProdExpectedSnapshot_(
        context,
        prestate,
        plan
      );

    var result = h3ProdBuildResult_(
      plan,
      context,
      txnId
    );

    journal.appendRow([
      txnId,
      context.setId,
      context.setNo,
      'LISTENING',
      JSON.stringify(request),
      fingerprint,
      nowText,
      'PREPARED',
      JSON.stringify(result),
      plan.score,
      prestate.json,
      prestate.sha256,
      expectedPost.sha256,
      '',
      ''
    ]);
    txnRow = journal.getLastRow();
    SpreadsheetApp.flush();

    var prepared = journal
      .getRange(
        txnRow,
        1,
        1,
        H3_WEB_PROD_TXN_HEADERS.length
      )
      .getDisplayValues()[0];

    if (
      prepared[0] !== txnId ||
      prepared[7] !== 'PREPARED' ||
      prepared[5] !== fingerprint ||
      prepared[11] !== prestate.sha256 ||
      prepared[12] !== expectedPost.sha256
    ) {
      throw new Error(
        'PRODUCTION_PREPARED_READBACK_FAILED'
      );
    }

    h3ProdApplyPlan_(context, plan);

    var actualPost =
      h3ProdRuntimeSnapshot_(context);

    if (
      actualPost.sha256 !==
      expectedPost.sha256
    ) {
      throw new Error(
        'PRODUCTION_POSTSTATE_HASH_MISMATCH'
      );
    }

    journal
      .getRange(txnRow, 8)
      .setValue('COMMITTED');
    journal
      .getRange(txnRow, 14)
      .setValue(h3NowTokyo_());
    SpreadsheetApp.flush();

    var committed = journal
      .getRange(
        txnRow,
        1,
        1,
        H3_WEB_PROD_TXN_HEADERS.length
      )
      .getDisplayValues()[0];

    if (
      committed[0] !== txnId ||
      committed[7] !== 'COMMITTED' ||
      committed[5] !== fingerprint ||
      committed[12] !== expectedPost.sha256
    ) {
      throw new Error(
        'PRODUCTION_COMMITTED_READBACK_FAILED'
      );
    }

    return result;
  } catch (err) {
    if (
      spreadsheet &&
      journal &&
      txnRow &&
      prestate
    ) {
      try {
        h3ProdRestoreSnapshot_(
          spreadsheet,
          prestate.object
        );

        var rollbackRead =
          h3ProdSnapshotFromTemplate_(
            spreadsheet,
            prestate.object
          );

        if (
          rollbackRead.sha256 ===
          prestate.sha256
        ) {
          journal
            .getRange(txnRow, 8)
            .setValue('ROLLED_BACK');
          journal
            .getRange(txnRow, 15)
            .setValue(
              String(
                err && err.message
                  ? err.message
                  : err
              )
            );
          SpreadsheetApp.flush();
        } else {
          journal
            .getRange(txnRow, 8)
            .setValue('RECOVERY_REQUIRED');
          journal
            .getRange(txnRow, 15)
            .setValue(
              'ROLLBACK_READBACK_FAILED:' +
                String(
                  err && err.message
                    ? err.message
                    : err
                )
            );
          SpreadsheetApp.flush();
        }
      } catch (rollbackErr) {
        try {
          journal
            .getRange(txnRow, 8)
            .setValue('RECOVERY_REQUIRED');
          journal
            .getRange(txnRow, 15)
            .setValue(
              'ROLLBACK_EXCEPTION:' +
                String(
                  rollbackErr &&
                    rollbackErr.message
                    ? rollbackErr.message
                    : rollbackErr
                )
            );
          SpreadsheetApp.flush();
        } catch (ignored) {}
      }
    }

    throw err;
  } finally {
    lock.releaseLock();
  }
}
