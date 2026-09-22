/**
 * H3 RS-13G read-only gate reporter.
 *
 * Reads RS-12 committed secondary evidence and RS-13 shadow observations,
 * verifies exact 1:1 observation coverage, and evaluates the frozen RS-14P
 * activation gate. It never reconciles, appends, updates, or changes scheduler
 * selection or learner state.
 */

var H3_RS13G_CONTRACT_ID_ =
  'H3-RS13G-GATE-REPORTER-20260922-V1';

function h3Rs13gRequireGlobals_() {
  if (
    typeof H3_MULTI_SKILL_HEADERS_ === 'undefined' ||
    typeof H3_MULTI_SKILL_CONCEPT_HEADERS_ === 'undefined' ||
    typeof H3_MULTI_SKILL_SHADOW_HEADERS_ === 'undefined' ||
    typeof h3MultiSkillReadValues_ !== 'function' ||
    typeof h3MultiSkillTableFromValues_ !== 'function' ||
    typeof h3MultiSkillShadowBuildRowsFromValues_ !== 'function' ||
    typeof h3MultiSkillShadowRowsEqual_ !== 'function' ||
    typeof h3Rs14pEvaluateActivationGateFromShadowValues_ !== 'function'
  ) {
    throw new Error('RS13G_DEPENDENCY_MISSING');
  }
}

function h3Rs13gIndexRowsById_(rows, idIndex, label) {
  var out = {};
  rows.forEach(function (row) {
    var id = String(row[idIndex] || '');
    if (!id) {
      throw new Error(label + '_ID_MISSING');
    }
    if (out[id]) {
      throw new Error(label + '_ID_DUPLICATE:' + id);
    }
    out[id] = row;
  });
  return out;
}

function h3Rs13gCommittedEvidenceMetrics_(evidenceValues) {
  var table = h3MultiSkillTableFromValues_(
    evidenceValues,
    H3_MULTI_SKILL_HEADERS_,
    'RS13G_EVIDENCE'
  );

  var metrics = {
    committed_rows:0,
    distinct_event_count:0,
    source_family_count:0,
    concept_count:0,
    contributory_rows:0,
    incidental_rows:0,
    correct_rows:0,
    triangle_rows:0,
    wrong_rows:0
  };
  var events = {};
  var families = {};
  var concepts = {};

  table.rows.forEach(function (row) {
    if (
      String(row[table.map.EVENT_SCOPE] || '') !==
      'COMMITTED_LEARNING'
    ) {
      return;
    }

    metrics.committed_rows += 1;
    events[String(row[table.map.EVIDENCE_EVENT_ID] || '')] = true;
    families[String(row[table.map.SOURCE_FAMILY] || '')] = true;
    concepts[String(row[table.map.CONCEPT_ID] || '')] = true;

    var role = String(row[table.map.LINK_ROLE] || '');
    if (role === 'CONTRIBUTORY') {
      metrics.contributory_rows += 1;
    } else if (role === 'INCIDENTAL') {
      metrics.incidental_rows += 1;
    }

    var result = String(row[table.map.SOURCE_RESULT] || '');
    if (result === '○') metrics.correct_rows += 1;
    else if (result === '△') metrics.triangle_rows += 1;
    else if (result === '×') metrics.wrong_rows += 1;
  });

  metrics.distinct_event_count =
    Object.keys(events).filter(Boolean).length;
  metrics.source_family_count =
    Object.keys(families).filter(Boolean).length;
  metrics.concept_count =
    Object.keys(concepts).filter(Boolean).length;

  return metrics;
}

function h3Rs13gReconciliationFromValues_(
  evidenceValues,
  conceptValues,
  shadowValues
) {
  var expected =
    h3MultiSkillShadowBuildRowsFromValues_(
      evidenceValues,
      conceptValues
    );

  var shadow = h3MultiSkillTableFromValues_(
    shadowValues,
    H3_MULTI_SKILL_SHADOW_HEADERS_,
    'RS13G_SHADOW'
  );

  var actualRows = shadow.rows.filter(function (row) {
    return String(row[0] || '') !== '';
  });

  var expectedById =
    h3Rs13gIndexRowsById_(expected, 0, 'RS13G_EXPECTED');
  var actualById =
    h3Rs13gIndexRowsById_(actualRows, 0, 'RS13G_ACTUAL');

  var missing = [];
  var conflicts = [];
  var orphan = [];

  Object.keys(expectedById).sort().forEach(function (id) {
    if (!actualById[id]) {
      missing.push(id);
      return;
    }
    if (
      !h3MultiSkillShadowRowsEqual_(
        expectedById[id],
        actualById[id]
      )
    ) {
      conflicts.push(id);
    }
  });

  Object.keys(actualById).sort().forEach(function (id) {
    if (!expectedById[id]) {
      orphan.push(id);
    }
  });

  return {
    expected_observation_rows:expected.length,
    actual_observation_rows:actualRows.length,
    exact_match_rows:
      expected.length - missing.length - conflicts.length,
    missing_observation_ids:missing,
    conflict_observation_ids:conflicts,
    orphan_observation_ids:orphan,
    exact:
      missing.length === 0 &&
      conflicts.length === 0 &&
      orphan.length === 0 &&
      expected.length === actualRows.length
  };
}

function h3Rs13gActivationProgress_(gate) {
  var m = gate.metrics;
  return {
    distinct_events:{
      current:m.distinct_event_count,
      required:H3_RS14P_MIN_DISTINCT_EVENTS_,
      remaining:Math.max(
        0,
        H3_RS14P_MIN_DISTINCT_EVENTS_ -
          m.distinct_event_count
      )
    },
    concepts:{
      current:m.concept_count,
      required:H3_RS14P_MIN_CONCEPTS_,
      remaining:Math.max(
        0,
        H3_RS14P_MIN_CONCEPTS_ -
          m.concept_count
      )
    },
    source_families:{
      current:m.source_family_count,
      required:H3_RS14P_MIN_SOURCE_FAMILIES_,
      remaining:Math.max(
        0,
        H3_RS14P_MIN_SOURCE_FAMILIES_ -
          m.source_family_count
      )
    },
    require_noncorrect:{
      current:m.noncorrect_count,
      satisfied:m.noncorrect_count >= 1
    },
    unsafe_rows:{
      current:m.unsafe_rows,
      required:0,
      satisfied:m.unsafe_rows === 0
    },
    scheduler_applied_true:{
      current:m.scheduler_applied_true,
      required:0,
      satisfied:m.scheduler_applied_true === 0
    }
  };
}

function h3Rs13gBuildReportFromValues_(
  evidenceValues,
  conceptValues,
  shadowValues
) {
  h3Rs13gRequireGlobals_();

  var evidenceMetrics =
    h3Rs13gCommittedEvidenceMetrics_(evidenceValues);

  var reconciliation =
    h3Rs13gReconciliationFromValues_(
      evidenceValues,
      conceptValues,
      shadowValues
    );

  var gate =
    h3Rs14pEvaluateActivationGateFromShadowValues_(
      shadowValues
    );

  if (!reconciliation.exact) {
    gate = JSON.parse(JSON.stringify(gate));
    gate.gate_pass = false;
    if (
      gate.reasons.indexOf(
        'RS13_RECONCILIATION_NOT_EXACT'
      ) < 0
    ) {
      gate.reasons.push(
        'RS13_RECONCILIATION_NOT_EXACT'
      );
    }
  }

  var rs13State = 'AWAIT_REAL_DATA';
  var rs13ReviewReady = false;

  if (evidenceMetrics.committed_rows > 0) {
    if (!reconciliation.exact) {
      rs13State = 'RECONCILIATION_REQUIRED';
    } else if (
      gate.metrics.unsafe_rows !== 0 ||
      gate.metrics.scheduler_applied_true !== 0
    ) {
      rs13State = 'SAFETY_REVIEW_REQUIRED';
    } else {
      rs13State = 'EXPLICIT_REVIEW_READY';
      rs13ReviewReady = true;
    }
  }

  return {
    schema:'H3_RS13G_GATE_REPORT_V1',
    contract_id:H3_RS13G_CONTRACT_ID_,
    read_only:true,
    writes_performed:0,
    evidence:evidenceMetrics,
    reconciliation:reconciliation,
    rs13:{
      state:rs13State,
      explicit_review_ready:rs13ReviewReady,
      close_automatic:false
    },
    rs14p:{
      activation_gate:gate,
      progress:h3Rs13gActivationProgress_(gate),
      live_activation_automatic:false
    },
    next_advisory:
      rs13State === 'AWAIT_REAL_DATA'
        ? 'RS13_AWAIT_FIRST_REAL_SECONDARY_EVIDENCE'
        : (
          rs13ReviewReady
            ? (
              gate.gate_pass
                ? 'RS13_EXPLICIT_REVIEW_THEN_RS14_ACTIVATION_REVIEW'
                : 'RS13_EXPLICIT_REVIEW_CONTINUE_DATA_COLLECTION'
            )
            : 'RS13_RECONCILIATION_OR_SAFETY_REVIEW'
        )
  };
}

function h3Rs13gGateReport_(spreadsheet) {
  h3Rs13gRequireGlobals_();

  var evidenceValues = h3MultiSkillReadValues_(
    spreadsheet,
    H3_MULTI_SKILL_EVIDENCE_SHEET_,
    H3_MULTI_SKILL_HEADERS_,
    'RS13G_EVIDENCE'
  );
  var conceptValues = h3MultiSkillReadValues_(
    spreadsheet,
    H3_MULTI_SKILL_CONCEPT_SHEET_,
    H3_MULTI_SKILL_CONCEPT_HEADERS_,
    'RS13G_CONCEPT'
  );
  var shadowValues = h3MultiSkillReadValues_(
    spreadsheet,
    H3_MULTI_SKILL_SHADOW_SHEET_,
    H3_MULTI_SKILL_SHADOW_HEADERS_,
    'RS13G_SHADOW'
  );

  return h3Rs13gBuildReportFromValues_(
    evidenceValues,
    conceptValues,
    shadowValues
  );
}

function h3Rs13GateReportLive() {
  var c = config_();
  if (!c || !c.K1_READY_SHEET_ID) {
    throw new Error('RS13G_RUNTIME_SPREADSHEET_ID_MISSING');
  }
  var spreadsheet =
    SpreadsheetApp.openById(c.K1_READY_SHEET_ID);
  return h3Rs13gGateReport_(spreadsheet);
}

function h3Rs13gDescribeContract_() {
  return {
    schema:'H3_RS13G_CONTRACT_V1',
    contract_id:H3_RS13G_CONTRACT_ID_,
    read_only:true,
    source_tabs:[
      H3_MULTI_SKILL_EVIDENCE_SHEET_,
      H3_MULTI_SKILL_CONCEPT_SHEET_,
      H3_MULTI_SKILL_SHADOW_SHEET_
    ],
    checks:[
      'COMMITTED_SECONDARY_METRICS',
      'EXPECTED_VS_ACTUAL_SHADOW_1_TO_1',
      'MISSING_CONFLICT_ORPHAN_OBSERVATIONS',
      'RS13_EXPLICIT_REVIEW_READINESS',
      'RS14P_ACTIVATION_GATE',
      'ACTIVATION_THRESHOLD_PROGRESS'
    ],
    reconcile:false,
    scheduler_write:false,
    learner_state_write:false,
    status_write:false,
    automatic_close:false,
    automatic_activation:false
  };
}
