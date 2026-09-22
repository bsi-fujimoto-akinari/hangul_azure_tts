/**
 * H3 Listening backend preparation orchestrator.
 *
 * PREISSUE-ONLY:
 * K1_READY + K2-K5 pre-stage -> LOCKED payload -> 5 audio queue rows
 * -> source-attested targeted audio -> AUDIO_BOUND -> SCRIPT_TXT
 * -> production preissue PASS.
 *
 * This file never issues a learner set, consumes K1_READY, mutates
 * listening learner state/history, or advances scheduler pointers.
 */

var H3_BACKEND_PREPARE_SCHEMA =
  'H3_LISTENING_BACKEND_PREPARE_V1';
var H3_BACKEND_RESULT_SCHEMA =
  'H3_LISTENING_BACKEND_PREPARE_RESULT_V1';

var H3_BACKEND_POLICY_ID =
  'H3-LISTEN-POLICY-20260920-V10';
var H3_BACKEND_PRIMARY_POLICY_ID =
  'H3-LISTEN-PRIMARY-SKILL-20260920-V1';

var H3_BACKEND_PRESTAGE_TAB =
  'listening_k2_k5_stage_v1';
var H3_BACKEND_PRESTAGE_HEADERS = [
  'PRESTAGE_ID',
  'CREATED_AT',
  'STATUS',
  'TARGET_LISTENING_SET_NO',
  'POLICY_ID',
  'PRIMARY_POLICY_ID',
  'SCHEDULER_SNAPSHOT_JSON',
  'SCHEDULER_SNAPSHOT_SHA256',
  'K2_ITEM_JSON',
  'K3_ITEM_JSON',
  'K4_ITEM_JSON',
  'K5_ITEM_JSON',
  'ANSWER_KEY_JSON',
  'SOURCE_PROVENANCE_JSON',
  'PRESTAGE_SHA256',
  'BOUND_LISTENING_SET_ID',
  'CONSUMED_AT'
];

var H3_BACKEND_PHASES = [
  'O0_PREFLIGHT',
  'O1_LOCK_SOURCE',
  'O2_AUDIO_QUEUE',
  'O3_BIND_AUTHORITIES',
  'O4_AUDIO',
  'O5_AUDIO_BINDING',
  'O6_SCRIPT_TXT',
  'O7_PREISSUE'
];

function h3BackendParseJson_(raw, code) {
  try {
    return JSON.parse(String(raw || ''));
  } catch (_err) {
    throw new Error(code);
  }
}

function h3BackendCanonicalJson_(value) {
  return h3PreissueCanonicalJson_(value);
}

function h3BackendCanonicalSha_(value) {
  return hash_(h3BackendCanonicalJson_(value));
}

function h3BackendSameJson_(left, right) {
  return (
    h3BackendCanonicalJson_(left) ===
    h3BackendCanonicalJson_(right)
  );
}

function h3BackendHeaderMap_(header) {
  var map = {};
  header.forEach(function (name, i) {
    map[String(name)] = i;
  });
  return map;
}

function h3BackendReadTable_(sheet) {
  var values = sheet.getDataRange().getDisplayValues();
  if (!values.length) {
    throw new Error(
      'BACKEND_EMPTY_SHEET:' + sheet.getName()
    );
  }
  return {
    header: values[0],
    map: h3BackendHeaderMap_(values[0]),
    rows: values.slice(1)
  };
}

function h3BackendRequireHeader_(table, expected, sheetName) {
  if (
    JSON.stringify(table.header) !==
    JSON.stringify(expected)
  ) {
    throw new Error(
      'BACKEND_HEADER_MISMATCH:' + sheetName
    );
  }
}

function h3BackendRowsBy_(table, column, value) {
  var col = table.map[column];
  if (typeof col !== 'number') {
    throw new Error(
      'BACKEND_COLUMN_MISSING:' + column
    );
  }
  var matches = [];
  table.rows.forEach(function (row, i) {
    if (String(row[col] || '') === String(value)) {
      matches.push({
        rowNumber: i + 2,
        row: row
      });
    }
  });
  return matches;
}

function h3BackendKeyValueMap_(table, keyColumn, valueColumn) {
  var keyIndex = table.map[keyColumn];
  var valueIndex = table.map[valueColumn];
  if (
    typeof keyIndex !== 'number' ||
    typeof valueIndex !== 'number'
  ) {
    throw new Error('BACKEND_KEY_VALUE_HEADER_MISSING');
  }
  var out = {};
  table.rows.forEach(function (row) {
    var key = String(row[keyIndex] || '');
    if (key) {
      if (
        Object.prototype.hasOwnProperty.call(
          out,
          key
        )
      ) {
        throw new Error(
          'BACKEND_DUPLICATE_KEY:' + key
        );
      }
      out[key] = String(row[valueIndex] || '');
    }
  });
  return out;
}

function h3BackendValidateRequest_(request) {
  if (
    !request ||
    request.schema !== H3_BACKEND_PREPARE_SCHEMA ||
    !request.set_id ||
    !request.k1_ready_id
  ) {
    throw new Error(
      'BACKEND_PREPARE_REQUEST_INVALID'
    );
  }

  var setId = String(request.set_id).trim();
  var k1ReadyId =
    String(request.k1_ready_id).trim();

  if (
    !setId ||
    setId.length > 128 ||
    /[\x00-\x1f]/.test(setId)
  ) {
    throw new Error(
      'BACKEND_LISTENING_SET_ID_INVALID'
    );
  }
  if (
    !/^H3-K1R-\d{8}-\d{3}$/.test(
      k1ReadyId
    )
  ) {
    throw new Error(
      'BACKEND_K1_READY_ID_INVALID'
    );
  }

  return {
    setId: setId,
    k1ReadyId: k1ReadyId
  };
}

function h3BackendRequireRuntimeSheets_(
  runtimeSpreadsheet
) {
  var names = [
    'listening_policy_v1',
    'listening_state_v1',
    'listening_k1_ready_v1',
    H3_BACKEND_PRESTAGE_TAB,
    'listening_set_payload_v1'
  ];
  var out = {};
  names.forEach(function (name) {
    var sheet =
      runtimeSpreadsheet.getSheetByName(name);
    if (!sheet) {
      throw new Error(
        'BACKEND_RUNTIME_SHEET_MISSING:' +
        name
      );
    }
    out[name] = sheet;
  });
  return out;
}

function h3BackendPrestageHashObject_(prestage) {
  return {
    prestage_id: prestage.id,
    target_listening_set_no:
      prestage.targetSetNo,
    policy_id: prestage.policyId,
    primary_policy_id:
      prestage.primaryPolicyId,
    scheduler_snapshot_sha256:
      prestage.schedulerSnapshotSha256,
    k2_item: prestage.items.K2,
    k3_item: prestage.items.K3,
    k4_item: prestage.items.K4,
    k5_item: prestage.items.K5,
    answer_key: prestage.answerKey,
    source_provenance:
      prestage.sourceProvenance
  };
}

function h3BackendReadPrestageRecord_(
  sheet,
  table,
  record
) {
  var m = table.map;
  var row = record.row;
  var schedulerSnapshot =
    h3BackendParseJson_(
      row[m.SCHEDULER_SNAPSHOT_JSON],
      'BACKEND_PRESTAGE_SCHEDULER_JSON_INVALID'
    );
  var items = {};
  ['K2','K3','K4','K5']
    .forEach(function (section) {
      items[section] =
        h3BackendParseJson_(
          row[
            m[section + '_ITEM_JSON']
          ],
          'BACKEND_PRESTAGE_ITEM_JSON_INVALID:' +
            section
        );
    });
  var out = {
    sheet: sheet,
    rowNumber: record.rowNumber,
    id: String(row[m.PRESTAGE_ID] || ''),
    createdAt:
      String(row[m.CREATED_AT] || ''),
    status: String(row[m.STATUS] || ''),
    targetSetNo:
      Number(
        row[
          m.TARGET_LISTENING_SET_NO
        ]
      ),
    policyId:
      String(row[m.POLICY_ID] || ''),
    primaryPolicyId:
      String(
        row[m.PRIMARY_POLICY_ID] || ''
      ),
    schedulerSnapshot:
      schedulerSnapshot,
    schedulerSnapshotSha256:
      String(
        row[
          m.SCHEDULER_SNAPSHOT_SHA256
        ] || ''
      ),
    items: items,
    answerKey:
      h3BackendParseJson_(
        row[m.ANSWER_KEY_JSON],
        'BACKEND_PRESTAGE_ANSWER_KEY_INVALID'
      ),
    sourceProvenance:
      h3BackendParseJson_(
        row[m.SOURCE_PROVENANCE_JSON],
        'BACKEND_PRESTAGE_PROVENANCE_INVALID'
      ),
    prestageSha256:
      String(
        row[m.PRESTAGE_SHA256] || ''
      ),
    boundSetId:
      String(
        row[
          m.BOUND_LISTENING_SET_ID
        ] || ''
      ),
    consumedAt:
      String(row[m.CONSUMED_AT] || '')
  };
  return out;
}

function h3BackendRequirePrestage_(
  sheet,
  nextSetNo,
  requestedSetId,
  policyMap,
  stateMap
) {
  var table = h3BackendReadTable_(sheet);
  h3BackendRequireHeader_(
    table,
    H3_BACKEND_PRESTAGE_HEADERS,
    H3_BACKEND_PRESTAGE_TAB
  );

  var ready = [];
  var boundResume = [];

  table.rows.forEach(function (row, i) {
    var status =
      String(row[table.map.STATUS] || '');
    var target =
      Number(
        row[
          table.map
            .TARGET_LISTENING_SET_NO
        ]
      );
    var bound =
      String(
        row[
          table.map
            .BOUND_LISTENING_SET_ID
        ] || ''
      );

    if (status === 'READY') {
      ready.push({
        rowNumber: i + 2,
        row: row
      });
    } else if (
      status === 'BOUND' &&
      target === nextSetNo &&
      bound === requestedSetId
    ) {
      boundResume.push({
        rowNumber: i + 2,
        row: row
      });
    }
  });

  if (ready.length > 1) {
    throw new Error(
      'BACKEND_MULTIPLE_READY_PRESTAGES'
    );
  }

  var record = null;
  if (ready.length === 1) {
    record = ready[0];
    if (
      Number(
        record.row[
          table.map
            .TARGET_LISTENING_SET_NO
        ]
      ) !== nextSetNo
    ) {
      throw new Error(
        'BACKEND_READY_PRESTAGE_TARGET_DRIFT'
      );
    }
  } else {
    if (boundResume.length !== 1) {
      throw new Error(
        'BACKEND_READY_PRESTAGE_NOT_EXACT'
      );
    }
    record = boundResume[0];
  }

  var prestage =
    h3BackendReadPrestageRecord_(
      sheet,
      table,
      record
    );

  if (
    prestage.consumedAt !== '' ||
    (
      prestage.status === 'READY' &&
      prestage.boundSetId !== ''
    ) ||
    (
      prestage.status === 'BOUND' &&
      prestage.boundSetId !==
        requestedSetId
    )
  ) {
    throw new Error(
      'BACKEND_PRESTAGE_BIND_STATE_INVALID'
    );
  }

  if (
    prestage.targetSetNo !== nextSetNo ||
    prestage.policyId !==
      H3_BACKEND_POLICY_ID ||
    prestage.primaryPolicyId !==
      H3_BACKEND_PRIMARY_POLICY_ID ||
    policyMap.LISTENING_POLICY_ID !==
      H3_BACKEND_POLICY_ID ||
    policyMap
      .PRIMARY_SKILL_SELECTION_POLICY_ID !==
      H3_BACKEND_PRIMARY_POLICY_ID
  ) {
    throw new Error(
      'BACKEND_PRESTAGE_POLICY_DRIFT'
    );
  }

  var schedulerSha =
    h3BackendCanonicalSha_(
      prestage.schedulerSnapshot
    );
  if (
    schedulerSha !==
      prestage.schedulerSnapshotSha256
  ) {
    throw new Error(
      'BACKEND_PRESTAGE_SCHEDULER_HASH_MISMATCH'
    );
  }

  var prestageSha =
    h3BackendCanonicalSha_(
      h3BackendPrestageHashObject_(
        prestage
      )
    );
  if (
    prestageSha !==
      prestage.prestageSha256
  ) {
    throw new Error(
      'BACKEND_PRESTAGE_HASH_MISMATCH'
    );
  }

  var overload =
    h3BackendParseJson_(
      stateMap.OVERLOAD_PLAN_JSON,
      'BACKEND_OVERLOAD_PLAN_INVALID'
    );
  var snapshot =
    prestage.schedulerSnapshot;

  if (
    Number(snapshot.target_set_no) !==
      nextSetNo ||
    snapshot.policy_id !==
      H3_BACKEND_POLICY_ID ||
    snapshot.primary_policy_id !==
      H3_BACKEND_PRIMARY_POLICY_ID ||
    Number(snapshot.active_wrong_count) !==
      Number(
        stateMap.ACTIVE_WRONG_COUNT
      ) ||
    snapshot.overload_plan_schema !==
      String(overload.schema || '') ||
    Number(
      snapshot.evaluated_after_set_no
    ) !==
      Number(
        overload.evaluated_after_set_no
      ) ||
    Number(snapshot.retest_cap) !==
      Number(
        overload
          .normal_retest_per_set_cap
      ) ||
    snapshot
      .reevaluate_after_each_scored_learning_surface !==
      overload
        .reevaluate_after_each_scored_learning_surface ||
    !h3BackendSameJson_(
      snapshot.blocking_overflow || [],
      overload.blocking_overflow || []
    )
  ) {
    throw new Error(
      'BACKEND_PRESTAGE_SCHEDULER_DRIFT'
    );
  }

  if (
    Array.isArray(
      overload.blocking_overflow
    ) &&
    overload.blocking_overflow.length
  ) {
    throw new Error(
      'BACKEND_OVERLOAD_BLOCKING_OVERFLOW'
    );
  }

  var plannedRetests =
    (overload.normal_retests || [])
      .filter(function (item) {
        return Number(item.set_no) ===
          nextSetNo;
      })
      .map(function (item) {
        return (
          String(item.section) +
          ':' +
          String(item.skill_id)
        );
      })
      .sort();

  var stagedRetests = [];
  ['K1','K2','K3','K4','K5']
    .forEach(function (section) {
      var slot =
        snapshot.slot_plan &&
        snapshot.slot_plan[section];
      if (!slot || !slot.skill_id) {
        throw new Error(
          'BACKEND_PRESTAGE_SLOT_PLAN_MISSING:' +
          section
        );
      }
      if (slot.slot_role === 'RETEST') {
        stagedRetests.push(
          section +
          ':' +
          String(slot.skill_id)
        );
      } else if (
        slot.slot_role !== 'PRIMARY'
      ) {
        throw new Error(
          'BACKEND_PRESTAGE_SLOT_ROLE_INVALID:' +
          section
        );
      }
    });
  stagedRetests.sort();

  if (
    JSON.stringify(plannedRetests) !==
    JSON.stringify(stagedRetests)
  ) {
    throw new Error(
      'BACKEND_PRESTAGE_RETEST_PLAN_DRIFT'
    );
  }

  ['K2','K3','K4','K5']
    .forEach(function (section) {
      var item = prestage.items[section];
      var prov =
        prestage.sourceProvenance[
          section
        ];
      var slot =
        snapshot.slot_plan[section];

      if (
        !item ||
        item.section !== section ||
        item.skill_id !== slot.skill_id ||
        !prov ||
        prov.skill_id !==
          slot.skill_id ||
        prov.slot_role !==
          slot.slot_role ||
        prov.authoring_audit !==
          'PASS_UNIQUE_ANSWER'
      ) {
        throw new Error(
          'BACKEND_PRESTAGE_SOURCE_IDENTITY_MISMATCH:' +
          section
        );
      }
      var answer =
        Number(
          prestage.answerKey[section]
        );
      if (
        !Number.isInteger(answer) ||
        answer < 1 ||
        answer > 4
      ) {
        throw new Error(
          'BACKEND_PRESTAGE_ANSWER_INVALID:' +
          section
        );
      }
    });

  return prestage;
}

function h3BackendBuildK1Provenance_(
  k1Record,
  prestage
) {
  var slot =
    prestage.schedulerSnapshot
      .slot_plan.K1;
  var out = {
    slot_role: slot.slot_role,
    skill_id: slot.skill_id,
    k1_ready_id: k1Record.id,
    mode:
      String(
        k1Record.qaProfile &&
        k1Record.qaProfile.mode ||
        'K1_READY'
      ),
    source: 'listening_k1_ready_v1',
    authoring_audit:
      'PASS_UNIQUE_ANSWER'
  };

  if (slot.slot_role === 'RETEST') {
    out.retest_origin_set_no =
      Number(slot.origin_set_no);
    out.retest_due_min_set_no =
      Number(slot.due_min_set_no);
    out.retest_due_max_set_no =
      Number(slot.due_max_set_no);
    out.same_section_slot = true;
  }
  return out;
}

function h3BackendBuildSourceProvenance_(
  k1Record,
  prestage
) {
  var staged =
    prestage.sourceProvenance;
  var out = {
    K1:
      h3BackendBuildK1Provenance_(
        k1Record,
        prestage
      ),
    K2: staged.K2,
    K3: staged.K3,
    K4: staged.K4,
    K5: staged.K5,
    hash_canonicalization:
      'JSON_SORT_KEYS_COMPACT_UTF8_V1'
  };
  return out;
}

function h3BackendBuildAnswerKey_(
  k1Record,
  prestage
) {
  return {
    K1: Number(k1Record.answerKey),
    K2: Number(prestage.answerKey.K2),
    K3: Number(prestage.answerKey.K3),
    K4: Number(prestage.answerKey.K4),
    K5: Number(prestage.answerKey.K5)
  };
}

function h3BackendItemPayloadObject_(
  setId,
  setNo,
  k1Record,
  prestage,
  answerKey
) {
  return {
    LISTENING_SET_ID: String(setId),
    LISTENING_SET_NO: Number(setNo),
    K1_READY_ID: k1Record.id,
    K1_READY_IMAGE_SHA256:
      k1Record.imageSha256,
    K1_READY_FINAL_CHOICES_JSON:
      k1Record.choices,
    K1_READY_ANSWER_KEY:
      Number(answerKey.K1),
    K2_ITEM_JSON: prestage.items.K2,
    K3_ITEM_JSON: prestage.items.K3,
    K4_ITEM_JSON: prestage.items.K4,
    K5_ITEM_JSON: prestage.items.K5,
    ANSWER_KEY_JSON: answerKey
  };
}

function h3BackendExpectedPayload_(context) {
  var answerKey =
    h3BackendBuildAnswerKey_(
      context.k1Record,
      context.prestage
    );
  var sourceProvenance =
    h3BackendBuildSourceProvenance_(
      context.k1Record,
      context.prestage
    );
  var itemPayloadSha =
    h3BackendCanonicalSha_(
      h3BackendItemPayloadObject_(
        context.setId,
        context.setNo,
        context.k1Record,
        context.prestage,
        answerKey
      )
    );

  return {
    setId: context.setId,
    setNo: context.setNo,
    k1ReadyId: context.k1Record.id,
    items: context.prestage.items,
    answerKey: answerKey,
    itemPayloadSha256: itemPayloadSha,
    sourceProvenance:
      sourceProvenance
  };
}

function h3BackendReadPayloadRecord_(
  sheet,
  setId
) {
  var table = h3BackendReadTable_(sheet);
  h3BackendRequireHeader_(
    table,
    HQ_LISTENING_SET_PAYLOAD_HEADERS,
    HQ_LISTENING_SET_PAYLOAD_TAB
  );
  var matches =
    h3BackendRowsBy_(
      table,
      'LISTENING_SET_ID',
      setId
    );
  if (matches.length > 1) {
    throw new Error(
      'BACKEND_DUPLICATE_PAYLOAD_AUTHORITY'
    );
  }
  if (!matches.length) {
    return null;
  }
  var row = matches[0].row;
  var m = table.map;
  return {
    sheet: sheet,
    rowNumber: matches[0].rowNumber,
    values: row,
    setId:
      String(row[m.LISTENING_SET_ID] || ''),
    setNo:
      Number(row[m.LISTENING_SET_NO]),
    status:
      String(row[m.STATUS] || ''),
    k1ReadyId:
      String(row[m.K1_READY_ID] || ''),
    items: {
      K2: h3BackendParseJson_(
        row[m.K2_ITEM_JSON],
        'BACKEND_PAYLOAD_K2_JSON_INVALID'
      ),
      K3: h3BackendParseJson_(
        row[m.K3_ITEM_JSON],
        'BACKEND_PAYLOAD_K3_JSON_INVALID'
      ),
      K4: h3BackendParseJson_(
        row[m.K4_ITEM_JSON],
        'BACKEND_PAYLOAD_K4_JSON_INVALID'
      ),
      K5: h3BackendParseJson_(
        row[m.K5_ITEM_JSON],
        'BACKEND_PAYLOAD_K5_JSON_INVALID'
      )
    },
    answerKey:
      h3BackendParseJson_(
        row[m.ANSWER_KEY_JSON],
        'BACKEND_PAYLOAD_ANSWER_KEY_INVALID'
      ),
    itemPayloadSha256:
      String(
        row[m.ITEM_PAYLOAD_SHA256] || ''
      ),
    audioBindingRaw:
      String(
        row[m.AUDIO_BINDING_JSON] || ''
      ),
    sourceProvenance:
      h3BackendParseJson_(
        row[m.SOURCE_PROVENANCE_JSON],
        'BACKEND_PAYLOAD_PROVENANCE_INVALID'
      ),
    lockedAt:
      String(row[m.LOCKED_AT] || ''),
    issuedAt:
      String(row[m.ISSUED_AT] || '')
  };
}

function h3BackendAssertPayloadExact_(
  record,
  expected
) {
  if (
    !record ||
    record.setId !== expected.setId ||
    record.setNo !== expected.setNo ||
    (
      record.status !== 'LOCKED' &&
      record.status !== 'AUDIO_BOUND'
    ) ||
    record.k1ReadyId !==
      expected.k1ReadyId ||
    !record.lockedAt ||
    record.issuedAt !== '' ||
    record.itemPayloadSha256 !==
      expected.itemPayloadSha256 ||
    !h3BackendSameJson_(
      record.items,
      expected.items
    ) ||
    !h3BackendSameJson_(
      record.answerKey,
      expected.answerKey
    ) ||
    !h3BackendSameJson_(
      record.sourceProvenance,
      expected.sourceProvenance
    ) ||
    (
      record.status === 'LOCKED' &&
      record.audioBindingRaw !== ''
    ) ||
    (
      record.status === 'AUDIO_BOUND' &&
      record.audioBindingRaw === ''
    )
  ) {
    throw new Error(
      'BACKEND_PAYLOAD_CONFLICT'
    );
  }
  return record;
}

function h3BackendMaterializePayload_(context) {
  var sheet =
    context.runtimeSheets[
      'listening_set_payload_v1'
    ];
  var expected =
    h3BackendExpectedPayload_(context);
  var existing =
    h3BackendReadPayloadRecord_(
      sheet,
      context.setId
    );

  if (existing) {
    h3BackendAssertPayloadExact_(
      existing,
      expected
    );
    context.payload = existing;
    context.expectedPayload = expected;
    return context;
  }

  var now = h3NowTokyo_();
  var row = [
    context.setId,
    context.setNo,
    now,
    'LOCKED',
    context.k1Record.id,
    JSON.stringify(
      context.prestage.items.K2
    ),
    JSON.stringify(
      context.prestage.items.K3
    ),
    JSON.stringify(
      context.prestage.items.K4
    ),
    JSON.stringify(
      context.prestage.items.K5
    ),
    JSON.stringify(
      expected.answerKey
    ),
    expected.itemPayloadSha256,
    '',
    JSON.stringify(
      expected.sourceProvenance
    ),
    now,
    ''
  ];

  var targetRow = sheet.getLastRow() + 1;
  sheet
    .getRange(
      targetRow,
      1,
      1,
      HQ_LISTENING_SET_PAYLOAD_HEADERS.length
    )
    .setValues([row]);
  SpreadsheetApp.flush();

  var readback =
    h3BackendReadPayloadRecord_(
      sheet,
      context.setId
    );
  h3BackendAssertPayloadExact_(
    readback,
    expected
  );

  context.payload = readback;
  context.expectedPayload = expected;
  return context;
}

function h3BackendBuildNumberedPlan_(
  item,
  section
) {
  var secondPromptPause =
    section === 'K3'
      ? 5200
      : 3200;
  var plan = [
    {
      role: 'prompt',
      text: String(item.prompt),
      repeat: 1,
      pause_ms_after: 3200
    },
    {
      role: 'prompt',
      text: String(item.prompt),
      repeat: 1,
      pause_ms_after:
        secondPromptPause
    }
  ];

  item.choices.forEach(
    function (choice, i) {
      var n = i + 1;
      plan.push({
        role:
          'choice_number' + String(n),
        text:
          HQ_K1_NUMBER_TEXTS[
            'choice_number' + String(n)
          ],
        repeat: 1,
        pause_ms_after: 900
      });
      plan.push({
        role: 'choice' + String(n),
        text: String(choice),
        repeat: 1,
        pause_ms_after: 3200
      });
      plan.push({
        role: 'choice' + String(n),
        text: String(choice),
        repeat: 1,
        pause_ms_after: 3200
      });
    }
  );
  return plan;
}

function h3BackendBuildPassagePlan_(item) {
  return [
    {
      role: 'passage',
      text: String(item.passage),
      repeat: 1,
      pause_ms_after: 2200
    },
    {
      role: 'replay_cue',
      text: HQ_LISTENING_REPLAY_CUE_TEXT,
      repeat: 1,
      pause_ms_after: 2200
    },
    {
      role: 'passage',
      text: String(item.passage),
      repeat: 1,
      pause_ms_after: 3200
    }
  ];
}

function h3BackendExpectedAudioInputs_(context) {
  var plans = {
    K1:
      context.k1Record.ttsScript.segments,
    K2:
      h3BackendBuildNumberedPlan_(
        context.prestage.items.K2,
        'K2'
      ),
    K3:
      h3BackendBuildNumberedPlan_(
        context.prestage.items.K3,
        'K3'
      ),
    K4:
      h3BackendBuildPassagePlan_(
        context.prestage.items.K4
      ),
    K5:
      h3BackendBuildPassagePlan_(
        context.prestage.items.K5
      )
  };

  Object.keys(plans)
    .forEach(function (section) {
      validateListeningAudioPlan_(
        JSON.stringify(plans[section]),
        section
      );
      validateListeningOfficialParityPlan_(
        plans[section],
        section
      );
    });

  return {
    K1: {
      skillId:
        context.expectedPayload
          .sourceProvenance.K1.skill_id,
      plan: plans.K1
    },
    K2: {
      skillId:
        context.prestage.items.K2.skill_id,
      plan: plans.K2
    },
    K3: {
      skillId:
        context.prestage.items.K3.skill_id,
      plan: plans.K3
    },
    K4: {
      skillId:
        context.prestage.items.K4.skill_id,
      plan: plans.K4
    },
    K5: {
      skillId:
        context.prestage.items.K5.skill_id,
      plan: plans.K5
    }
  };
}

function h3BackendNextListenGenIds_(
  sheet,
  count
) {
  var last = sheet.getLastRow();
  var ids =
    last > 1
      ? sheet
          .getRange(
            2,
            1,
            last - 1,
            1
          )
          .getDisplayValues()
      : [];
  var used = {};
  var datePart =
    Utilities.formatDate(
      new Date(),
      'Asia/Tokyo',
      'yyyyMMdd'
    );
  var prefix =
    'H3-L-' + datePart + '-';
  var max = 0;

  ids.forEach(function (row) {
    var id = String(row[0] || '');
    if (!id) return;
    if (used[id]) {
      throw new Error(
        'BACKEND_DUPLICATE_LISTEN_GEN_ID:' +
        id
      );
    }
    used[id] = true;
    if (id.indexOf(prefix) === 0) {
      var suffix =
        id.slice(prefix.length);
      if (/^\d{3}$/.test(suffix)) {
        max = Math.max(
          max,
          Number(suffix)
        );
      }
    }
  });

  if (max + count > 999) {
    throw new Error(
      'BACKEND_LISTEN_GEN_ID_EXHAUSTED'
    );
  }

  var out = [];
  for (var i = 1; i <= count; i += 1) {
    var suffix =
      String(max + i);
    while (suffix.length < 3) {
      suffix = '0' + suffix;
    }
    var id = prefix + suffix;
    if (used[id]) {
      throw new Error(
        'BACKEND_LISTEN_GEN_ID_COLLISION'
      );
    }
    out.push(id);
  }
  return out;
}

function h3BackendAssertAudioRowsExact_(
  members,
  context,
  expectedInputs
) {
  if (members.length !== 5) {
    throw new Error(
      'BACKEND_AUDIO_ROW_CARDINALITY_INVALID'
    );
  }

  var bySection = {};
  members.forEach(function (member) {
    var section =
      String(member.values[5] || '');
    if (bySection[section]) {
      throw new Error(
        'BACKEND_AUDIO_SECTION_DUPLICATE'
      );
    }
    bySection[section] = member;
  });

  ['K1','K2','K3','K4','K5']
    .forEach(function (section) {
      var member = bySection[section];
      var expected =
        expectedInputs[section];
      if (!member) {
        throw new Error(
          'BACKEND_AUDIO_SECTION_MISSING:' +
          section
        );
      }
      var values = member.values;
      var status =
        String(values[1] || '');
      if (
        [
          'pending',
          'processing',
          'done'
        ].indexOf(status) < 0 ||
        String(values[3] || '') !==
          context.setId ||
        Number(values[4]) !==
          context.setNo ||
        String(values[6] || '') !==
          expected.skillId ||
        String(values[14] || '') !==
          HQ_LISTENING_STORAGE_MODE
      ) {
        throw new Error(
          'BACKEND_AUDIO_ROW_IDENTITY_CONFLICT:' +
          section
        );
      }
      var plan =
        h3BackendParseJson_(
          values[7],
          'BACKEND_AUDIO_PLAN_JSON_INVALID:' +
            section
        );
      if (
        !h3BackendSameJson_(
          plan,
          expected.plan
        )
      ) {
        throw new Error(
          'BACKEND_AUDIO_PLAN_CONFLICT:' +
          section
        );
      }
    });

  return bySection;
}

function h3BackendMaterializeAudioQueue_(context) {
  var c = context.config;
  var sheet =
    listeningAudioSheet_(c, true);
  var expectedInputs =
    h3BackendExpectedAudioInputs_(context);
  var members =
    snapshotListeningSet_(
      sheet,
      context.setId
    );

  if (
    members.length !== 0 &&
    members.length !== 5
  ) {
    throw new Error(
      'BACKEND_AUDIO_PARTIAL_SET_RECOVERY_REQUIRED'
    );
  }

  if (members.length === 5) {
    h3BackendAssertAudioRowsExact_(
      members,
      context,
      expectedInputs
    );
    context.audioMembers = members;
    context.expectedAudioInputs =
      expectedInputs;
    return context;
  }

  var ids =
    h3BackendNextListenGenIds_(
      sheet,
      5
    );
  var now = h3NowTokyo_();
  var sections =
    ['K1','K2','K3','K4','K5'];
  var rows =
    sections.map(
      function (section, i) {
        return [
          ids[i],
          'pending',
          now,
          context.setId,
          context.setNo,
          section,
          expectedInputs[
            section
          ].skillId,
          JSON.stringify(
            expectedInputs[
              section
            ].plan
          ),
          '',
          '',
          '',
          '',
          '',
          '',
          HQ_LISTENING_STORAGE_MODE
        ];
      }
    );

  var targetRow =
    sheet.getLastRow() + 1;
  sheet
    .getRange(
      targetRow,
      1,
      rows.length,
      HQ_LISTENING_HEADERS.length
    )
    .setValues(rows);
  SpreadsheetApp.flush();

  members =
    snapshotListeningSet_(
      sheet,
      context.setId
    );
  h3BackendAssertAudioRowsExact_(
    members,
    context,
    expectedInputs
  );

  context.audioMembers = members;
  context.expectedAudioInputs =
    expectedInputs;
  return context;
}

function h3BackendRequireK1BindState_(
  context
) {
  var record =
    validateK1ReadyPayload_(
      readK1ReadyRecord_(
        context.config,
        context.k1ReadyId
      )
    );

  if (
    record.status !== 'READY' ||
    record.consumedAt !== ''
  ) {
    throw new Error(
      'BACKEND_K1_READY_STATE_INVALID'
    );
  }

  if (
    record.boundListeningSetId ===
      context.setId
  ) {
    context.k1Record = record;
    return context;
  }
  if (
    record.boundListeningSetId !== ''
  ) {
    throw new Error(
      'BACKEND_K1_BOUND_TO_OTHER_SET'
    );
  }

  bindK1ReadyToListeningSet_(
    context.k1ReadyId,
    context.setId
  );

  record =
    validateK1ReadyPayload_(
      readK1ReadyRecord_(
        context.config,
        context.k1ReadyId
      )
    );
  if (
    record.status !== 'READY' ||
    record.consumedAt !== '' ||
    record.boundListeningSetId !==
      context.setId
  ) {
    throw new Error(
      'BACKEND_K1_BIND_READBACK_FAILED'
    );
  }

  context.k1Record = record;
  return context;
}

function h3BackendBindPrestage_(context) {
  var prestage = context.prestage;
  var sheet = prestage.sheet;

  if (
    prestage.status === 'BOUND'
  ) {
    if (
      prestage.boundSetId !==
        context.setId ||
      prestage.consumedAt !== ''
    ) {
      throw new Error(
        'BACKEND_PRESTAGE_RESUME_CONFLICT'
      );
    }
    return context;
  }

  if (
    prestage.status !== 'READY' ||
    prestage.boundSetId !== '' ||
    prestage.consumedAt !== ''
  ) {
    throw new Error(
      'BACKEND_PRESTAGE_NOT_BINDABLE'
    );
  }

  sheet
    .getRange(
      prestage.rowNumber,
      3
    )
    .setValue('BOUND');
  sheet
    .getRange(
      prestage.rowNumber,
      16
    )
    .setValue(context.setId);
  SpreadsheetApp.flush();

  var table =
    h3BackendReadTable_(sheet);
  var matches =
    h3BackendRowsBy_(
      table,
      'PRESTAGE_ID',
      prestage.id
    );
  if (matches.length !== 1) {
    throw new Error(
      'BACKEND_PRESTAGE_BIND_READBACK_MISSING'
    );
  }
  var after =
    h3BackendReadPrestageRecord_(
      sheet,
      table,
      matches[0]
    );
  if (
    after.status !== 'BOUND' ||
    after.boundSetId !==
      context.setId ||
    after.consumedAt !== '' ||
    after.prestageSha256 !==
      prestage.prestageSha256 ||
    after.schedulerSnapshotSha256 !==
      prestage.schedulerSnapshotSha256
  ) {
    throw new Error(
      'BACKEND_PRESTAGE_BIND_READBACK_FAILED'
    );
  }
  context.prestage = after;
  return context;
}

function h3BackendPreflight_(
  ids
) {
  var c = config_();
  if (!c.K1_READY_SHEET_ID) {
    throw new Error(
      'BACKEND_RUNTIME_SHEET_ID_MISSING'
    );
  }

  var runtimeSpreadsheet =
    SpreadsheetApp.openById(
      c.K1_READY_SHEET_ID
    );
  var runtimeSheets =
    h3BackendRequireRuntimeSheets_(
      runtimeSpreadsheet
    );

  var policyTable =
    h3BackendReadTable_(
      runtimeSheets[
        'listening_policy_v1'
      ]
    );
  var stateTable =
    h3BackendReadTable_(
      runtimeSheets[
        'listening_state_v1'
      ]
    );
  var policyMap =
    h3BackendKeyValueMap_(
      policyTable,
      'KEY',
      'VALUE'
    );
  var stateMap =
    h3BackendKeyValueMap_(
      stateTable,
      'STATE_KEY',
      'VALUE'
    );

  if (
    policyMap.LISTENING_POLICY_ID !==
      H3_BACKEND_POLICY_ID ||
    stateMap.POLICY_ID !==
      H3_BACKEND_POLICY_ID ||
    policyMap
      .PRIMARY_SKILL_SELECTION_POLICY_ID !==
      H3_BACKEND_PRIMARY_POLICY_ID
  ) {
    throw new Error(
      'BACKEND_POLICY_ID_DRIFT'
    );
  }

  var setNo =
    Number(
      stateMap.NEXT_LISTENING_SET_NO
    );
  if (
    !Number.isInteger(setNo) ||
    setNo < 1 ||
    Number(
      stateMap.LISTENING_ISSUE_NO
    ) !== setNo - 1 ||
    stateMap.ANSWER_SYNC_PHASE !==
      'IDLE'
  ) {
    throw new Error(
      'BACKEND_LISTENING_STATE_NOT_PREPARABLE'
    );
  }

  var k1Record =
    validateK1ReadyPayload_(
      readK1ReadyRecord_(
        c,
        ids.k1ReadyId
      )
    );
  if (
    k1Record.status !== 'READY' ||
    k1Record.consumedAt !== '' ||
    (
      k1Record.boundListeningSetId !== '' &&
      k1Record.boundListeningSetId !==
        ids.setId
    )
  ) {
    throw new Error(
      'BACKEND_REQUESTED_K1_NOT_READY'
    );
  }

  if (typeof h3Rs13k1PreissueValidate_ !== 'function') {
    throw new Error(
      'BACKEND_K1_SECONDARY_AUTHORITY_MODULE_MISSING'
    );
  }
  var k1SecondaryAuthorityValidation =
    h3Rs13k1PreissueValidate_(
      runtimeSpreadsheet,
      ids.k1ReadyId,
      setNo
    );

  var prestage =
    h3BackendRequirePrestage_(
      runtimeSheets[
        H3_BACKEND_PRESTAGE_TAB
      ],
      setNo,
      ids.setId,
      policyMap,
      stateMap
    );

  return {
    phase: 'O0_PREFLIGHT',
    config: c,
    runtimeSpreadsheet:
      runtimeSpreadsheet,
    runtimeSheets: runtimeSheets,
    policyMap: policyMap,
    stateMap: stateMap,
    setId: ids.setId,
    k1ReadyId: ids.k1ReadyId,
    setNo: setNo,
    k1Record: k1Record,
    k1SecondaryAuthorityValidation:
      k1SecondaryAuthorityValidation,
    prestage: prestage
  };
}

function h3BackendAttestSource_(context) {
  var sheet =
    listeningAudioSheet_(
      context.config,
      true
    );
  var members =
    snapshotListeningSet_(
      sheet,
      context.setId
    );
  h3BackendAssertAudioRowsExact_(
    members,
    context,
    context.expectedAudioInputs
  );

  var k1Record =
    assertBoundK1ReadyForSet_(
      context.setId,
      members,
      context.config
    );
  var attestation =
    assertListeningAudioSourceAttestation_(
      context.setId,
      context.setNo,
      members,
      k1Record,
      context.config
    );

  return {
    members: members,
    attestation: attestation
  };
}

function h3BackendDoneAudioBinding_(
  context,
  attestation
) {
  var sheet =
    listeningAudioSheet_(
      context.config,
      true
    );
  var members =
    snapshotListeningSet_(
      sheet,
      context.setId
    );
  var bySection =
    h3BackendAssertAudioRowsExact_(
      members,
      context,
      context.expectedAudioInputs
    );

  var individual = {};
  ['K1','K2','K3','K4','K5']
    .forEach(function (section) {
      var member = bySection[section];
      var values = member.values;
      if (
        String(values[1] || '') !==
          'done' ||
        !String(values[8] || '') ||
        !String(values[9] || '') ||
        !String(values[10] || '') ||
        !String(values[11] || '') ||
        String(values[12] || '') !== '' ||
        !String(values[13] || '')
      ) {
        throw new Error(
          'BACKEND_AUDIO_NOT_DONE_EXACT:' +
          section
        );
      }

      var job =
        readListeningSnapshotJob_(
          member,
          true
        );
      if (
        String(values[8]) !==
          job.hash
      ) {
        throw new Error(
          'BACKEND_AUDIO_PAYLOAD_HASH_MISMATCH:' +
          section
        );
      }

      var file =
        DriveApp.getFileById(
          String(values[10])
        );
      if (
        file.isTrashed() ||
        String(values[11])
          .indexOf(
            '/d/' +
            String(values[10])
          ) < 0
      ) {
        throw new Error(
          'BACKEND_AUDIO_FILE_INVALID:' +
          section
        );
      }

      individual[section] = {
        listen_gen_id:
          String(values[0]),
        payload_hash:
          String(values[8]),
        assignment:
          String(values[9]),
        audio_file_id:
          String(values[10]),
        audio_url:
          String(values[11]),
        processed_at:
          String(values[13])
      };
    });

  var binding = {
    source_tabs: [
      'listening_audio_queue_v1'
    ],
    audio_mode:
      'INDIVIDUAL_K1_K5_ONLY',
    individual: individual,
    source_attestation_sha256:
      attestation.sha256
  };

  return {
    members: members,
    binding: binding
  };
}

function h3BackendBindAudioToPayload_(
  context,
  attestation
) {
  var result =
    h3BackendDoneAudioBinding_(
      context,
      attestation
    );
  var sheet =
    context.runtimeSheets[
      'listening_set_payload_v1'
    ];
  var record =
    h3BackendReadPayloadRecord_(
      sheet,
      context.setId
    );
  h3BackendAssertPayloadExact_(
    record,
    context.expectedPayload
  );

  if (record.status === 'AUDIO_BOUND') {
    var existing =
      h3BackendParseJson_(
        record.audioBindingRaw,
        'BACKEND_AUDIO_BINDING_JSON_INVALID'
      );
    if (
      !h3BackendSameJson_(
        existing,
        result.binding
      )
    ) {
      throw new Error(
        'BACKEND_AUDIO_BOUND_RESUME_CONFLICT'
      );
    }
    context.audioBinding =
      result.binding;
    return context;
  }

  if (
    record.status !== 'LOCKED' ||
    record.audioBindingRaw !== ''
  ) {
    throw new Error(
      'BACKEND_PAYLOAD_NOT_LOCKED_FOR_AUDIO_BIND'
    );
  }

  sheet
    .getRange(
      record.rowNumber,
      4
    )
    .setValue('AUDIO_BOUND');
  sheet
    .getRange(
      record.rowNumber,
      12
    )
    .setValue(
      JSON.stringify(result.binding)
    );
  SpreadsheetApp.flush();

  var after =
    h3BackendReadPayloadRecord_(
      sheet,
      context.setId
    );
  h3BackendAssertPayloadExact_(
    after,
    context.expectedPayload
  );
  if (after.status !== 'AUDIO_BOUND') {
    throw new Error(
      'BACKEND_AUDIO_BIND_READBACK_FAILED'
    );
  }
  var afterBinding =
    h3BackendParseJson_(
      after.audioBindingRaw,
      'BACKEND_AUDIO_BINDING_JSON_INVALID'
    );
  if (
    !h3BackendSameJson_(
      afterBinding,
      result.binding
    )
  ) {
    throw new Error(
      'BACKEND_AUDIO_BIND_READBACK_MISMATCH'
    );
  }

  context.payload = after;
  context.audioBinding =
    result.binding;
  return context;
}

function h3BackendRequirePreissuePass_(
  context
) {
  var preissue =
    validateProductionPreissueSet(
      context.setId
    );

  if (
    !preissue ||
    preissue.schema !==
      'H3_PRODUCTION_PREISSUE_GATE_V1' ||
    preissue.status !== 'PASS' ||
    preissue.payload_status !==
      'AUDIO_BOUND' ||
    preissue.issue_performed !== false ||
    Number(preissue.audio_rows) !== 5 ||
    Number(
      preissue.learner_log_rows
    ) !== 0 ||
    Number(
      preissue.production_txn_rows
    ) !== 0 ||
    Number(
      preissue.listening_set_no
    ) !== context.setNo ||
    String(preissue.k1_ready_id) !==
      context.k1ReadyId ||
    String(
      preissue.item_payload_sha256
    ) !==
      context.expectedPayload
        .itemPayloadSha256
  ) {
    throw new Error(
      'BACKEND_PREISSUE_NOT_EXACT_PASS'
    );
  }

  context.preissue = preissue;
  return context;
}

function h3BackendPrepareLocked_(ids) {
  var context =
    h3BackendPreflight_(ids);

  context.phase = 'O1_LOCK_SOURCE';
  h3BackendMaterializePayload_(context);

  context.phase = 'O2_AUDIO_QUEUE';
  h3BackendMaterializeAudioQueue_(context);

  context.phase =
    'O3_BIND_AUTHORITIES';
  h3BackendRequireK1BindState_(
    context
  );
  h3BackendBindPrestage_(context);

  return context;
}

function h3BackendFinalizeLocked_(
  ids,
  sourceAttestation
) {
  var context =
    h3BackendPreflight_(ids);

  context.phase = 'O1_LOCK_SOURCE';
  h3BackendMaterializePayload_(context);

  context.phase = 'O2_AUDIO_QUEUE';
  h3BackendMaterializeAudioQueue_(context);

  context.phase =
    'O3_BIND_AUTHORITIES';
  h3BackendRequireK1BindState_(
    context
  );
  h3BackendBindPrestage_(context);

  context.phase =
    'O5_AUDIO_BINDING';
  h3BackendBindAudioToPayload_(
    context,
    sourceAttestation
  );

  context.phase = 'O6_SCRIPT_TXT';
  var script =
    persistListeningSetScript(
      context.setId
    );
  if (
    !script ||
    !script.file_id ||
    !script.url
  ) {
    throw new Error(
      'BACKEND_SCRIPT_TXT_NOT_EXACT'
    );
  }
  context.script = script;

  context.phase = 'O7_PREISSUE';
  h3BackendRequirePreissuePass_(
    context
  );

  return context;
}

function prepareListeningBackendSet(
  request
) {
  var ids =
    h3BackendValidateRequest_(
      request
    );

  var lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  var prepared = null;
  var sourceAttestation = null;

  try {
    prepared =
      h3BackendPrepareLocked_(ids);

    var sourceEvidence =
      h3BackendAttestSource_(
        prepared
      );
    sourceAttestation =
      sourceEvidence.attestation;
  } finally {
    lock.releaseLock();
  }

  var audioResult =
    processPendingAudioForSet(
      '5L',
      ids.setId
    );
  if (
    !audioResult ||
    audioResult.status !== 'done'
  ) {
    throw new Error(
      'BACKEND_AUDIO_NOT_DONE:' +
      String(
        audioResult &&
        audioResult.status ||
        'UNKNOWN'
      )
    );
  }

  lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var finalContext =
      h3BackendFinalizeLocked_(
        ids,
        sourceAttestation
      );

    return {
      schema:
        H3_BACKEND_RESULT_SCHEMA,
      status: 'PREISSUE_READY',
      set_id: finalContext.setId,
      listening_set_no:
        finalContext.setNo,
      k1_ready_id:
        finalContext.k1ReadyId,
      prestage_id:
        finalContext.prestage.id,
      item_payload_sha256:
        finalContext
          .expectedPayload
          .itemPayloadSha256,
      source_attestation_sha256:
        sourceAttestation.sha256,
      audio_rows: 5,
      preissue: 'PASS',
      issue_performed: false
    };
  } finally {
    lock.releaseLock();
  }
}
