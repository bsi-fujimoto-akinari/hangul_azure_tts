/**
 * H3 RS-10 cross-family soft-signal scheduler integration.
 *
 * Contract:
 * EDF retest > anti-starvation/balance > mandatory coverage > skill priority
 * > cross-family soft signal > deterministic tiebreak.
 *
 * This module never mutates mastery, retest, stability, clocks, pointers,
 * learner history, Review state, or DIRECT evidence. It only derives a
 * prospective tie-break signal from committed secondary evidence.
 */

var H3_RS10_SOFT_SIGNAL_CONTRACT_ID_ =
  'H3-RS10-SOFT-SIGNAL-20260922-V1';

var H3_RS10_MULTI_SKILL_EVIDENCE_SHEET_ =
  'multi_skill_evidence_v1';
var H3_RS10_CONCEPT_MAP_SHEET_ =
  'skill_concept_map_v1';

var H3_RS10_MULTI_SKILL_HEADERS_ = [
  'LINK_ID','EVIDENCE_EVENT_ID','LEVEL','EVENT_SCOPE','SOURCE_EVENT_REF',
  'SOURCE_SET_ID','SOURCE_TXN_ID','SOURCE_Q_NO','SOURCE_SURFACE_KEY',
  'SOURCE_RESULT','SOURCE_FAMILY','DIRECT_SKILL_ID','LINK_ROLE',
  'TARGET_SKILL_ID','CONCEPT_ID','CONFIDENCE','PROVENANCE_KIND',
  'PROVENANCE_REF','DIRECT_STATE_AUTHORITY','STATE_TRANSFER',
  'RETEST_CLOSURE_TRANSFER','STABILITY_TRANSFER','SCHEDULER_USE',
  'STATUS','CREATED_AT','NOTES'
];

var H3_RS10_CONCEPT_HEADERS_ = [
  'CONCEPT_ID','LEVEL','CONCEPT_DOMAIN','CONCEPT_LABEL','SKILL_ID','FAMILY',
  'SECTION_KEY','APPLICATION_LABEL','MAPPING_ROLE','MATCH_TYPE','CONFIDENCE',
  'DIRECT_REUSE','STATE_TRANSFER','RETEST_CLOSURE','STABILITY_TRANSFER',
  'SCHEDULER_USE','SOURCE_REF','SOURCE_SNAPSHOT_ID','CREATED_AT','STATUS','NOTES'
];

function h3Rs10TableFromValues_(values, headers, label) {
  if (!Array.isArray(values) || !values.length) {
    throw new Error(label + '_EMPTY');
  }
  if (JSON.stringify(values[0]) !== JSON.stringify(headers)) {
    throw new Error(label + '_HEADER_MISMATCH');
  }
  var map = {};
  headers.forEach(function (name, index) {
    map[name] = index;
  });
  return {
    header: headers.slice(),
    map: map,
    rows: values.slice(1)
  };
}

function h3Rs10RequireNoTransfer_(row, map, label) {
  [
    'STATE_TRANSFER',
    label === 'EVIDENCE' ? 'RETEST_CLOSURE_TRANSFER' : 'RETEST_CLOSURE',
    'STABILITY_TRANSFER'
  ].forEach(function (name) {
    if (String(row[map[name]] || '') !== 'NO') {
      throw new Error('RS10_' + label + '_TRANSFER_VIOLATION:' + name);
    }
  });
}

function h3Rs10ConceptIndex_(conceptValues) {
  var table = h3Rs10TableFromValues_(
    conceptValues,
    H3_RS10_CONCEPT_HEADERS_,
    'RS10_CONCEPT_MAP'
  );
  var out = {};
  table.rows.forEach(function (row) {
    var status = String(row[table.map.STATUS] || '');
    if (status !== 'ACTIVE_PILOT' && status !== 'ACTIVE') {
      return;
    }
    if (String(row[table.map.MAPPING_ROLE] || '') !== 'APPLICATION_SKILL') {
      return;
    }
    if (String(row[table.map.DIRECT_REUSE] || '') !== 'NO') {
      throw new Error('RS10_CONCEPT_DIRECT_REUSE_VIOLATION');
    }
    h3Rs10RequireNoTransfer_(row, table.map, 'CONCEPT');
    if (String(row[table.map.SCHEDULER_USE] || '') !==
        'DIAGNOSTIC_SELECTION_ONLY') {
      throw new Error('RS10_CONCEPT_SCHEDULER_USE_INVALID');
    }
    var key = [
      String(row[table.map.LEVEL] || ''),
      String(row[table.map.SKILL_ID] || ''),
      String(row[table.map.CONCEPT_ID] || '')
    ].join('|');
    if (out[key]) {
      throw new Error('RS10_CONCEPT_MAP_DUPLICATE:' + key);
    }
    out[key] = {
      level: String(row[table.map.LEVEL] || ''),
      skill_id: String(row[table.map.SKILL_ID] || ''),
      concept_id: String(row[table.map.CONCEPT_ID] || ''),
      family: String(row[table.map.FAMILY] || ''),
      section_key: String(row[table.map.SECTION_KEY] || '')
    };
  });
  return out;
}

function h3Rs10DirectionForSection_(sectionKey) {
  var section = String(sectionKey || '');
  if (section === 'H3-P11') return 'KR_TO_JP';
  if (section === 'H3-P12') return 'JP_TO_KR';
  return '';
}

function h3Rs10EvidenceLatestKey_(row, map) {
  return [
    String(row[map.LEVEL] || ''),
    String(row[map.TARGET_SKILL_ID] || ''),
    String(row[map.CONCEPT_ID] || ''),
    String(row[map.LINK_ROLE] || ''),
    String(row[map.SOURCE_FAMILY] || ''),
    String(row[map.DIRECT_SKILL_ID] || '')
  ].join('|');
}

function h3Rs10EvidenceNewer_(a, b) {
  var at = String(a.created_at || '');
  var bt = String(b.created_at || '');
  if (at !== bt) return at > bt;
  return String(a.event_id || '') > String(b.event_id || '');
}

function h3Rs10BuildSoftSignalSnapshotFromRows_(
  evidenceValues,
  conceptValues
) {
  var evidence = h3Rs10TableFromValues_(
    evidenceValues,
    H3_RS10_MULTI_SKILL_HEADERS_,
    'RS10_MULTI_SKILL_EVIDENCE'
  );
  var conceptIndex = h3Rs10ConceptIndex_(conceptValues);
  var latest = {};

  evidence.rows.forEach(function (row) {
    if (String(row[evidence.map.EVENT_SCOPE] || '') !==
        'COMMITTED_LEARNING') {
      return;
    }
    var role = String(row[evidence.map.LINK_ROLE] || '');
    if (role !== 'CONTRIBUTORY' && role !== 'INCIDENTAL') {
      return;
    }
    if (String(row[evidence.map.STATUS] || '') !== 'ACTIVE_COMMITTED') {
      return;
    }
    if (String(row[evidence.map.DIRECT_STATE_AUTHORITY] || '') !== 'NO') {
      throw new Error('RS10_SECONDARY_DIRECT_AUTHORITY_VIOLATION');
    }
    h3Rs10RequireNoTransfer_(row, evidence.map, 'EVIDENCE');
    if (String(row[evidence.map.SCHEDULER_USE] || '') !==
        'DIAGNOSTIC_ONLY') {
      throw new Error('RS10_EVIDENCE_SCHEDULER_USE_INVALID');
    }

    var level = String(row[evidence.map.LEVEL] || '');
    var targetSkill = String(row[evidence.map.TARGET_SKILL_ID] || '');
    var conceptId = String(row[evidence.map.CONCEPT_ID] || '');
    var conceptKey = [level, targetSkill, conceptId].join('|');
    var mapping = conceptIndex[conceptKey];
    if (!mapping) {
      return;
    }

    var sourceFamily = String(row[evidence.map.SOURCE_FAMILY] || '');
    if (!sourceFamily || sourceFamily === mapping.family) {
      return;
    }

    var item = {
      event_id: String(row[evidence.map.EVIDENCE_EVENT_ID] || ''),
      level: level,
      source_family: sourceFamily,
      target_skill_id: targetSkill,
      target_family: mapping.family,
      target_section_key: mapping.section_key,
      concept_id: conceptId,
      role: role,
      result: String(row[evidence.map.SOURCE_RESULT] || ''),
      created_at: String(row[evidence.map.CREATED_AT] || '')
    };
    var latestKey = h3Rs10EvidenceLatestKey_(row, evidence.map);
    if (!latest[latestKey] || h3Rs10EvidenceNewer_(item, latest[latestKey])) {
      latest[latestKey] = item;
    }
  });

  return {
    schema: 'H3_RS10_SOFT_SIGNAL_SNAPSHOT_V1',
    contract_id: H3_RS10_SOFT_SIGNAL_CONTRACT_ID_,
    observations: Object.keys(latest).sort().map(function (key) {
      return latest[key];
    })
  };
}

function h3Rs10NormalizeCandidate_(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('RS10_CANDIDATE_INVALID');
  }
  var out = {
    level: String(candidate.level || ''),
    family: String(candidate.family || ''),
    skill_id: String(candidate.skill_id || ''),
    translation_direction: String(candidate.translation_direction || ''),
    edf_rank: Number(candidate.edf_rank),
    balance_rank: Number(candidate.balance_rank),
    coverage_rank: Number(candidate.coverage_rank),
    skill_priority_rank: Number(candidate.skill_priority_rank),
    deterministic_key: String(candidate.deterministic_key || '')
  };
  if (!out.level || !out.family || !out.skill_id || !out.deterministic_key) {
    throw new Error('RS10_CANDIDATE_IDENTITY_INVALID');
  }
  [
    out.edf_rank,
    out.balance_rank,
    out.coverage_rank,
    out.skill_priority_rank
  ].forEach(function (value) {
    if (!Number.isFinite(value)) {
      throw new Error('RS10_PRIMARY_RANK_INVALID');
    }
  });
  if (out.family === 'TRANSLATION' &&
      ['KR_TO_JP','JP_TO_KR'].indexOf(out.translation_direction) < 0) {
    throw new Error('RS10_TRANSLATION_DIRECTION_INVALID');
  }
  return out;
}

function h3Rs10SoftVectorForCandidate_(candidate, snapshot) {
  var c = h3Rs10NormalizeCandidate_(candidate);
  var vector = [0, 0, 0, 0];

  (snapshot && snapshot.observations || []).forEach(function (obs) {
    if (obs.level !== c.level ||
        obs.target_skill_id !== c.skill_id ||
        obs.target_family !== c.family) {
      return;
    }
    if (c.family === 'TRANSLATION') {
      var direction = h3Rs10DirectionForSection_(obs.target_section_key);
      if (!direction || direction !== c.translation_direction) {
        return;
      }
    }
    if (obs.result === '×' && obs.role === 'CONTRIBUTORY') {
      vector[0] += 1;
    } else if (obs.result === '△' && obs.role === 'CONTRIBUTORY') {
      vector[1] += 1;
    } else if (obs.result === '×' && obs.role === 'INCIDENTAL') {
      vector[2] += 1;
    } else if (obs.result === '△' && obs.role === 'INCIDENTAL') {
      vector[3] += 1;
    }
  });

  return vector;
}

function h3Rs10CompareNumberAsc_(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function h3Rs10CompareVectorDesc_(a, b) {
  for (var i = 0; i < 4; i++) {
    if (a[i] !== b[i]) {
      return a[i] > b[i] ? -1 : 1;
    }
  }
  return 0;
}

function h3Rs10CompareCandidates_(
  candidateA,
  candidateB,
  snapshot
) {
  var a = h3Rs10NormalizeCandidate_(candidateA);
  var b = h3Rs10NormalizeCandidate_(candidateB);
  var primaryFields = [
    'edf_rank',
    'balance_rank',
    'coverage_rank',
    'skill_priority_rank'
  ];
  for (var i = 0; i < primaryFields.length; i++) {
    var field = primaryFields[i];
    var primaryCmp = h3Rs10CompareNumberAsc_(a[field], b[field]);
    if (primaryCmp) return primaryCmp;
  }

  var softCmp = h3Rs10CompareVectorDesc_(
    h3Rs10SoftVectorForCandidate_(a, snapshot),
    h3Rs10SoftVectorForCandidate_(b, snapshot)
  );
  if (softCmp) return softCmp;

  return a.deterministic_key.localeCompare(b.deterministic_key);
}

function h3Rs10RankCandidatesFromRows_(
  candidates,
  evidenceValues,
  conceptValues
) {
  if (!Array.isArray(candidates)) {
    throw new Error('RS10_CANDIDATES_INVALID');
  }
  var snapshot = h3Rs10BuildSoftSignalSnapshotFromRows_(
    evidenceValues,
    conceptValues
  );
  return candidates.slice().sort(function (a, b) {
    return h3Rs10CompareCandidates_(a, b, snapshot);
  }).map(function (candidate) {
    return {
      candidate: candidate,
      soft_signal_vector:
        h3Rs10SoftVectorForCandidate_(candidate, snapshot)
    };
  });
}

function h3Rs10ReadSheetValues_(spreadsheet, sheetName, headers, label) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(label + '_SHEET_MISSING');
  var lastRow = Math.max(1, sheet.getLastRow());
  return sheet.getRange(
    1,
    1,
    lastRow,
    headers.length
  ).getDisplayValues();
}

function h3Rs10RankCandidates_(
  spreadsheet,
  candidates
) {
  if (!spreadsheet) {
    throw new Error('RS10_SPREADSHEET_REQUIRED');
  }
  return h3Rs10RankCandidatesFromRows_(
    candidates,
    h3Rs10ReadSheetValues_(
      spreadsheet,
      H3_RS10_MULTI_SKILL_EVIDENCE_SHEET_,
      H3_RS10_MULTI_SKILL_HEADERS_,
      'RS10_MULTI_SKILL_EVIDENCE'
    ),
    h3Rs10ReadSheetValues_(
      spreadsheet,
      H3_RS10_CONCEPT_MAP_SHEET_,
      H3_RS10_CONCEPT_HEADERS_,
      'RS10_CONCEPT_MAP'
    )
  );
}
