/**
 * H3 RS-14P limited-live soft-signal preflight.
 *
 * PRELIVE ONLY.
 * This module is deliberately not wired into production scheduler selection.
 * It freezes the future limited-live contract, provides binary-capped
 * CONTRIBUTORY-only ranking, baseline-vs-soft dual-run diagnostics, activation
 * gate evaluation, and rollback/fail-closed fixtures.
 */

var H3_RS14P_CONTRACT_ID_ =
  'H3-RS14P-LIMITED-LIVE-PREFLIGHT-20260922-V1';

var H3_RS14P_CONTROL_SCHEMA_ =
  'H3_RS14P_CONTROL_V1';

var H3_RS14P_MIN_DISTINCT_EVENTS_ = 6;
var H3_RS14P_MIN_CONCEPTS_ = 2;
var H3_RS14P_MIN_SOURCE_FAMILIES_ = 2;

function h3Rs14pRequireRs10_() {
  if (typeof h3Rs10NormalizeCandidate_ !== 'function') {
    throw new Error(
      'RS14P_RS10_DEPENDENCY_MISSING:h3Rs10NormalizeCandidate_'
    );
  }
  if (typeof h3Rs10DirectionForSection_ !== 'function') {
    throw new Error(
      'RS14P_RS10_DEPENDENCY_MISSING:h3Rs10DirectionForSection_'
    );
  }
  if (typeof h3Rs10CompareNumberAsc_ !== 'function') {
    throw new Error(
      'RS14P_RS10_DEPENDENCY_MISSING:h3Rs10CompareNumberAsc_'
    );
  }
}

function h3Rs14pPrimaryTuple_(candidate) {
  h3Rs14pRequireRs10_();
  var c = h3Rs10NormalizeCandidate_(candidate);
  return [
    c.edf_rank,
    c.balance_rank,
    c.coverage_rank,
    c.skill_priority_rank
  ];
}

function h3Rs14pPrimaryKey_(candidate) {
  return h3Rs14pPrimaryTuple_(candidate).join('|');
}

function h3Rs14pComparePrimary_(candidateA, candidateB) {
  h3Rs14pRequireRs10_();
  var a = h3Rs10NormalizeCandidate_(candidateA);
  var b = h3Rs10NormalizeCandidate_(candidateB);
  var fields = [
    'edf_rank',
    'balance_rank',
    'coverage_rank',
    'skill_priority_rank'
  ];
  for (var i = 0; i < fields.length; i++) {
    var cmp = h3Rs10CompareNumberAsc_(
      a[fields[i]],
      b[fields[i]]
    );
    if (cmp) return cmp;
  }
  return 0;
}

function h3Rs14pContributoryBinaryVectorForCandidate_(
  candidate,
  snapshot
) {
  h3Rs14pRequireRs10_();
  var c = h3Rs10NormalizeCandidate_(candidate);
  var vector = [0, 0];

  (snapshot && snapshot.observations || []).forEach(function (obs) {
    if (
      obs.level !== c.level ||
      obs.target_skill_id !== c.skill_id ||
      obs.target_family !== c.family
    ) {
      return;
    }
    if (obs.role !== 'CONTRIBUTORY') {
      return;
    }
    if (c.family === 'TRANSLATION') {
      var direction = h3Rs10DirectionForSection_(
        obs.target_section_key
      );
      if (
        !direction ||
        direction !== c.translation_direction
      ) {
        return;
      }
    }
    if (obs.result === '×') {
      vector[0] = 1;
    } else if (obs.result === '△') {
      vector[1] = 1;
    }
  });

  return vector;
}

function h3Rs14pCompareBinaryVectorDesc_(a, b) {
  for (var i = 0; i < 2; i++) {
    if (a[i] !== b[i]) {
      return a[i] > b[i] ? -1 : 1;
    }
  }
  return 0;
}

function h3Rs14pCompareBaseline_(candidateA, candidateB) {
  var primaryCmp = h3Rs14pComparePrimary_(
    candidateA,
    candidateB
  );
  if (primaryCmp) return primaryCmp;

  var a = h3Rs10NormalizeCandidate_(candidateA);
  var b = h3Rs10NormalizeCandidate_(candidateB);
  return a.deterministic_key.localeCompare(
    b.deterministic_key
  );
}

function h3Rs14pComparePilot_(candidateA, candidateB, snapshot) {
  var primaryCmp = h3Rs14pComparePrimary_(
    candidateA,
    candidateB
  );
  if (primaryCmp) return primaryCmp;

  var softCmp = h3Rs14pCompareBinaryVectorDesc_(
    h3Rs14pContributoryBinaryVectorForCandidate_(
      candidateA,
      snapshot
    ),
    h3Rs14pContributoryBinaryVectorForCandidate_(
      candidateB,
      snapshot
    )
  );
  if (softCmp) return softCmp;

  var a = h3Rs10NormalizeCandidate_(candidateA);
  var b = h3Rs10NormalizeCandidate_(candidateB);
  return a.deterministic_key.localeCompare(
    b.deterministic_key
  );
}

function h3Rs14pCandidateIdentity_(candidate) {
  var c = h3Rs10NormalizeCandidate_(candidate);
  return [
    c.level,
    c.family,
    c.translation_direction,
    c.skill_id,
    c.deterministic_key
  ].join('|');
}

function h3Rs14pRankBaseline_(candidates) {
  if (!Array.isArray(candidates)) {
    throw new Error('RS14P_CANDIDATES_INVALID');
  }
  return candidates.slice().sort(
    h3Rs14pCompareBaseline_
  );
}

function h3Rs14pRankPilot_(candidates, snapshot) {
  if (!Array.isArray(candidates)) {
    throw new Error('RS14P_CANDIDATES_INVALID');
  }
  return candidates.slice().sort(function (a, b) {
    return h3Rs14pComparePilot_(a, b, snapshot);
  });
}

function h3Rs14pAssertNoPrimaryInversion_(
  candidates,
  baseline,
  pilot
) {
  var baselineRank = {};
  var pilotRank = {};

  baseline.forEach(function (candidate, index) {
    baselineRank[h3Rs14pCandidateIdentity_(candidate)] = index;
  });
  pilot.forEach(function (candidate, index) {
    pilotRank[h3Rs14pCandidateIdentity_(candidate)] = index;
  });

  for (var i = 0; i < candidates.length; i++) {
    for (var j = i + 1; j < candidates.length; j++) {
      var a = candidates[i];
      var b = candidates[j];
      var primaryCmp = h3Rs14pComparePrimary_(a, b);
      if (!primaryCmp) continue;

      var aid = h3Rs14pCandidateIdentity_(a);
      var bid = h3Rs14pCandidateIdentity_(b);

      var baselineOrder =
        baselineRank[aid] < baselineRank[bid] ? -1 : 1;
      var pilotOrder =
        pilotRank[aid] < pilotRank[bid] ? -1 : 1;

      if (baselineOrder !== pilotOrder) {
        throw new Error(
          'RS14P_PRIMARY_HIERARCHY_INVERSION:' +
          aid + '::' + bid
        );
      }
    }
  }
  return true;
}

function h3Rs14pDualRun_(candidates, snapshot) {
  var baseline = h3Rs14pRankBaseline_(candidates);
  var pilot = h3Rs14pRankPilot_(candidates, snapshot);

  h3Rs14pAssertNoPrimaryInversion_(
    candidates,
    baseline,
    pilot
  );

  var baselineRank = {};
  baseline.forEach(function (candidate, index) {
    baselineRank[h3Rs14pCandidateIdentity_(candidate)] =
      index + 1;
  });

  var differences = [];
  pilot.forEach(function (candidate, index) {
    var id = h3Rs14pCandidateIdentity_(candidate);
    var pilotRank = index + 1;
    if (baselineRank[id] !== pilotRank) {
      differences.push({
        candidate_id:id,
        baseline_rank:baselineRank[id],
        pilot_rank:pilotRank,
        primary_key:h3Rs14pPrimaryKey_(candidate),
        binary_soft_vector:
          h3Rs14pContributoryBinaryVectorForCandidate_(
            candidate,
            snapshot
          )
      });
    }
  });

  return {
    schema:'H3_RS14P_DUAL_RUN_V1',
    contract_id:H3_RS14P_CONTRACT_ID_,
    scheduler_applied:false,
    baseline:baseline,
    pilot:pilot,
    differences:differences
  };
}

function h3Rs14pShadowTable_(values) {
  if (
    typeof H3_MULTI_SKILL_SHADOW_HEADERS_ === 'undefined'
  ) {
    throw new Error('RS14P_SHADOW_HEADERS_MISSING');
  }
  if (!Array.isArray(values) || !values.length) {
    throw new Error('RS14P_SHADOW_VALUES_EMPTY');
  }
  if (
    JSON.stringify(values[0]) !==
    JSON.stringify(H3_MULTI_SKILL_SHADOW_HEADERS_)
  ) {
    throw new Error('RS14P_SHADOW_HEADER_MISMATCH');
  }
  var map = {};
  H3_MULTI_SKILL_SHADOW_HEADERS_.forEach(
    function (name, index) {
      map[name] = index;
    }
  );
  return {
    map:map,
    rows:values.slice(1)
  };
}

function h3Rs14pEvaluateActivationGateFromShadowValues_(
  shadowValues
) {
  var table = h3Rs14pShadowTable_(shadowValues);
  var eventIds = {};
  var concepts = {};
  var sourceFamilies = {};
  var nonCorrect = 0;
  var unsafeRows = 0;
  var schedulerApplied = 0;
  var observedRows = 0;

  table.rows.forEach(function (row) {
    if (
      String(row[table.map.STATUS] || '') !==
      'PASS_SHADOW_OBSERVED'
    ) {
      return;
    }
    observedRows += 1;

    eventIds[
      String(row[table.map.EVIDENCE_EVENT_ID] || '')
    ] = true;
    concepts[
      String(row[table.map.CONCEPT_ID] || '')
    ] = true;
    sourceFamilies[
      String(row[table.map.SOURCE_FAMILY] || '')
    ] = true;

    var result =
      String(row[table.map.SOURCE_RESULT] || '');
    if (result === '×' || result === '△') {
      nonCorrect += 1;
    }

    if (
      String(row[table.map.CROSS_FAMILY] || '') !== 'TRUE' ||
      String(row[table.map.TRANSFER_SAFE] || '') !== 'TRUE' ||
      String(row[table.map.SHADOW_ONLY] || '') !== 'TRUE'
    ) {
      unsafeRows += 1;
    }

    if (
      String(row[table.map.SCHEDULER_APPLIED] || '') === 'TRUE'
    ) {
      schedulerApplied += 1;
    }
  });

  var metrics = {
    observed_rows:observedRows,
    distinct_event_count:Object.keys(eventIds)
      .filter(Boolean).length,
    concept_count:Object.keys(concepts)
      .filter(Boolean).length,
    source_family_count:Object.keys(sourceFamilies)
      .filter(Boolean).length,
    noncorrect_count:nonCorrect,
    unsafe_rows:unsafeRows,
    scheduler_applied_true:schedulerApplied
  };

  var reasons = [];
  if (
    metrics.distinct_event_count <
    H3_RS14P_MIN_DISTINCT_EVENTS_
  ) {
    reasons.push('INSUFFICIENT_DISTINCT_EVENTS');
  }
  if (
    metrics.concept_count <
    H3_RS14P_MIN_CONCEPTS_
  ) {
    reasons.push('INSUFFICIENT_CONCEPTS');
  }
  if (
    metrics.source_family_count <
    H3_RS14P_MIN_SOURCE_FAMILIES_
  ) {
    reasons.push('INSUFFICIENT_SOURCE_FAMILIES');
  }
  if (metrics.noncorrect_count < 1) {
    reasons.push('NO_X_OR_TRIANGLE');
  }
  if (metrics.unsafe_rows !== 0) {
    reasons.push('UNSAFE_SHADOW_ROWS');
  }
  if (metrics.scheduler_applied_true !== 0) {
    reasons.push('SCHEDULER_ALREADY_APPLIED');
  }

  return {
    schema:'H3_RS14P_ACTIVATION_GATE_V1',
    contract_id:H3_RS14P_CONTRACT_ID_,
    gate_pass:reasons.length === 0,
    metrics:metrics,
    reasons:reasons
  };
}

function h3Rs14pControlDecision_(dualRun, control) {
  if (!dualRun || dualRun.schema !== 'H3_RS14P_DUAL_RUN_V1') {
    throw new Error('RS14P_DUAL_RUN_INVALID');
  }
  if (
    !control ||
    control.schema !== H3_RS14P_CONTROL_SCHEMA_
  ) {
    throw new Error('RS14P_CONTROL_INVALID');
  }

  if (control.soft_signal_enabled !== true) {
    return {
      schema:'H3_RS14P_CONTROL_DECISION_V1',
      mode:'BASELINE_ROLLBACK',
      scheduler_applied:false,
      selected:dualRun.baseline
    };
  }

  if (control.activation_gate_pass !== true) {
    throw new Error(
      'RS14P_LIVE_ENABLE_WITHOUT_ACTIVATION_GATE'
    );
  }

  if (
    control.simulation_only !== true
  ) {
    throw new Error(
      'RS14P_PRODUCTION_WIRING_FORBIDDEN_IN_PREFLIGHT'
    );
  }

  return {
    schema:'H3_RS14P_CONTROL_DECISION_V1',
    mode:'SIMULATED_LIMITED_LIVE',
    scheduler_applied:false,
    selected:dualRun.pilot
  };
}

function h3Rs14pDescribeContract_() {
  return {
    schema:'H3_RS14P_CONTRACT_V1',
    contract_id:H3_RS14P_CONTRACT_ID_,
    hierarchy:[
      'EDF_RETEST',
      'ANTI_STARVATION_BALANCE',
      'MANDATORY_COVERAGE',
      'SKILL_PRIORITY',
      'CONTRIBUTORY_BINARY_SOFT_SIGNAL',
      'DETERMINISTIC_TIEBREAK'
    ],
    soft_signal:{
      roles:['CONTRIBUTORY'],
      components:['X_PRESENT','TRIANGLE_PRESENT'],
      cap_per_component:1,
      incidental_live_use:false,
      correct_behavior:'NO_BOOST_CLEAR_BY_RS10_LATEST_CHANNEL'
    },
    activation_gate:{
      min_distinct_events:H3_RS14P_MIN_DISTINCT_EVENTS_,
      min_concepts:H3_RS14P_MIN_CONCEPTS_,
      min_source_families:
        H3_RS14P_MIN_SOURCE_FAMILIES_,
      require_x_or_triangle:true,
      unsafe_rows_must_equal:0,
      scheduler_applied_true_must_equal:0
    },
    stop_conditions:[
      'PRIMARY_HIERARCHY_INVERSION',
      'SAME_FAMILY_OR_DIRECTION_VIOLATION',
      'TRANSFER_FLAG_VIOLATION',
      'CONCEPT_MAPPING_MISMATCH',
      'DUPLICATE_OR_CONFLICT',
      'NONDETERMINISTIC_SELECTION',
      'UNEXPECTED_LEARNER_STATE_MUTATION'
    ],
    rollback:'SOFT_SIGNAL_ENABLED_FALSE_RETURNS_BASELINE',
    production_wired:false,
    rs14_active:false,
    historical_backfill:false,
    state_transfer:false
  };
}
