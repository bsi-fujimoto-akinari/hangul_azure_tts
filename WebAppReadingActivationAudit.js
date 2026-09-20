/**
 * Pure audit for H3 Reading activation core V3.
 */

function h3ReadingActivationAuditAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'READING_ACTIVATION_AUDIT_FAIL:' +
        code
    );
  }
}


function h3ReadingActivationAuditExpectThrow_(
  fn,
  code
) {
  var threw = false;
  try {
    fn();
  } catch (_err) {
    threw = true;
  }

  h3ReadingActivationAuditAssert_(
    threw,
    code
  );
}


function auditReadingActivationCoreV1_() {
  var source =
    h3ReadingPilotFixture_();
  var locked =
    h3ReadingLockBundle_(
      source
    );

  var allocation =
    h3ReadingAllocateIdentityFromStageRows_(
      '20260921',
      []
    );

  h3ReadingActivationAuditAssert_(
    allocation.issue_no === 1 &&
      allocation.stage_id ===
        'READ-P8-20260921-001' &&
      allocation.set_id ===
        'H3-20260921-R001',
    'EMPTY_ALLOCATION'
  );

  var nextAllocation =
    h3ReadingAllocateIdentityFromStageRows_(
      '20260921',
      [
        {
          issue_no: 2,
          stage_id:
            'READ-P8-20260920-002',
          set_id:
            'H3-20260920-R002'
        },
        {
          issue_no: 4,
          stage_id:
            'READ-P8-20260921-007',
          set_id:
            'H3-20260921-R007'
        }
      ]
    );

  h3ReadingActivationAuditAssert_(
    nextAllocation.issue_no === 5 &&
      nextAllocation.stage_id ===
        'READ-P8-20260921-008' &&
      nextAllocation.set_id ===
        'H3-20260921-R008',
    'NONEMPTY_ALLOCATION'
  );

  h3ReadingActivationAuditExpectThrow_(
    function () {
      h3ReadingAllocateIdentityFromStageRows_(
        '20260921',
        [
          {
            issue_no: 1,
            stage_id: 'DUP',
            set_id:
              'H3-20260921-R001'
          },
          {
            issue_no: 2,
            stage_id: 'DUP',
            set_id:
              'H3-20260921-R002'
          }
        ]
      );
    },
    'ALLOCATION_DUPLICATE_FAIL_CLOSED'
  );

  var plan =
    h3ReadingBuildMaterializationPlan_(
      '20260921',
      [],
      locked,
      '2026-09-21T01:05:00+09:00'
    );

  var stage =
    plan.stage;

  h3ReadingActivationAuditAssert_(
    stage.status ===
      'PREISSUE_READY' &&
      stage.issue_no === 1 &&
      stage.item_count === 2 &&
      stage.source_binding_sha256 ===
        locked.source_binding_sha256 &&
      stage.set_id ===
        'H3-20260921-R001',
    'MATERIALIZATION_STAGE'
  );

  h3ReadingActivationAuditAssert_(
    Array.isArray(
      plan.row_values
    ) &&
      plan.row_values.length ===
        H3_READING_STAGE_HEADERS_.length &&
      plan.row_values.length === 14 &&
      plan.row_values[9] ===
        stage.locked_bundle_json,
    'STAGE_ROW_SHAPE'
  );


  var existingP8 = [
    {
      issue_no: 1,
      stage_id:
        'READ-P8-20260921-001',
      set_id:
        'H3-20260921-R001',
      section_key:
        'H3-P8'
    }
  ];

  var p9Locked =
    h3ReadingLockBundle_(
      h3ReadingP9PilotFixture_()
    );
  var p9Plan =
    h3ReadingBuildSectionMaterializationPlan_(
      'H3-P9',
      '20260921',
      existingP8,
      p9Locked,
      '2026-09-21T01:06:00+09:00'
    );

  h3ReadingActivationAuditAssert_(
    p9Plan.schema ===
      'H3_READING_SECTION_MATERIALIZATION_PLAN_V1' &&
      p9Plan.section_key ===
        'H3-P9' &&
      p9Plan.stage.issue_no === 2 &&
      p9Plan.stage.stage_id ===
        'READ-P9-20260921-002' &&
      p9Plan.stage.set_id ===
        'H3-20260921-R002' &&
      p9Plan.stage.status ===
        'PREISSUE_READY',
    'P9_SECTION_ALLOCATION'
  );

  var p10Locked =
    h3ReadingLockBundle_(
      h3ReadingP10PilotFixture_()
    );
  var p10Plan =
    h3ReadingBuildSectionMaterializationPlan_(
      'H3-P10',
      '20260921',
      existingP8.concat([
        p9Plan.stage
      ]),
      p10Locked,
      '2026-09-21T01:07:00+09:00'
    );

  h3ReadingActivationAuditAssert_(
    p10Plan.section_key ===
      'H3-P10' &&
      p10Plan.stage.issue_no === 3 &&
      p10Plan.stage.stage_id ===
        'READ-P10-20260921-003' &&
      p10Plan.stage.set_id ===
        'H3-20260921-R003' &&
      p10Plan.stage.status ===
        'PREISSUE_READY',
    'P10_SECTION_ALLOCATION'
  );

  h3ReadingActivationAuditAssert_(
    h3ReadingParseStageId_(
      p9Plan.stage.stage_id
    ).serial ===
      h3ReadingParseSetId_(
        p9Plan.stage.set_id
      ).serial &&
      h3ReadingParseStageId_(
        p10Plan.stage.stage_id
      ).serial ===
        h3ReadingParseSetId_(
          p10Plan.stage.set_id
        ).serial,
    'SECTION_IDENTITY_PARITY'
  );

  h3ReadingActivationAuditExpectThrow_(
    function () {
      h3ReadingBuildSectionMaterializationPlan_(
        'H3-P10',
        '20260921',
        existingP8,
        p9Locked,
        '2026-09-21T01:08:00+09:00'
      );
    },
    'SECTION_LOCK_MISMATCH_FAIL_CLOSED'
  );

  h3ReadingActivationAuditExpectThrow_(
    function () {
      h3ReadingAllocateIdentityForSection_(
        'H3-P9',
        '20260921',
        [
          {
            issue_no: 1,
            stage_id:
              'READ-P8-20260921-002',
            set_id:
              'H3-20260921-R001',
            section_key:
              'H3-P8'
          }
        ]
      );
    },
    'EXISTING_IDENTITY_PARITY_FAIL_CLOSED'
  );

  h3ReadingActivationAuditExpectThrow_(
    function () {
      h3ReadingStageIdFromDateSerial_(
        'H3-P11',
        '20260921',
        4
      );
    },
    'UNSUPPORTED_SECTION_FAIL_CLOSED'
  );

  var storedLocked =
    h3ReadingParseLockedBundleJson_(
      stage.locked_bundle_json
    );

  h3ReadingActivationAuditAssert_(
    h3ReadingCanonicalJson_(
      storedLocked
    ) ===
      h3ReadingCanonicalJson_(
        locked
      ) &&
      h3ReadingHash_(
        storedLocked
      ) ===
        stage.locked_bundle_sha256,
    'LOCKED_JSON_PARITY'
  );

  var preissue =
    h3ReadingPreissueValidate_(
      stage,
      locked,
      []
    );

  h3ReadingActivationAuditAssert_(
    preissue.status ===
      'PREISSUE_READY' &&
      preissue.set_id ===
        stage.set_id,
    'PREISSUE'
  );

  h3ReadingActivationAuditExpectThrow_(
    function () {
      h3ReadingPreissueValidate_(
        stage,
        locked,
        [stage.set_id]
      );
    },
    'PREISSUE_COMMITTED_FAIL_CLOSED'
  );

  h3ReadingActivationAuditExpectThrow_(
    function () {
      var drift =
        JSON.parse(
          JSON.stringify(stage)
        );
      drift.locked_bundle_json =
        drift.locked_bundle_json
          .replace(
            'H3-P8-SK001',
            'H3-P8-SK999'
          );
      h3ReadingPreissueValidate_(
        drift,
        locked,
        []
      );
    },
    'LOCKED_JSON_DRIFT_FAIL_CLOSED'
  );

  var request = {
    schema:
      'H3_WEB_SUBMIT_V1',
    mode:
      'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    set_id:
      stage.set_id,
    answers: [
      {
        question_key:
          'OFF-H3-P8-001',
        answer: 3,
        uncertain: false
      },
      {
        question_key:
          'OFF-H3-P8-002',
        answer: 2,
        uncertain: true
      }
    ]
  };

  var normalized =
    h3ReadingNormalizeSubmission_(
      request,
      locked
    );

  h3ReadingActivationAuditAssert_(
    normalized.answers.length === 2 &&
      normalized.answers[0]
        .question_key ===
        'OFF-H3-P8-001',
    'NORMALIZE'
  );

  var txnPlan =
    h3ReadingBuildTxnPlan_(
      stage,
      locked,
      request
    );

  h3ReadingActivationAuditAssert_(
    txnPlan.journal_sheet ===
      'reading_web_txn_v1' &&
      txnPlan.request_fingerprint &&
      txnPlan.normalized_request
        .surface_family ===
        'READING',
    'TXN_PLAN'
  );

  var grade =
    h3ReadingGrade_(
      locked,
      normalized.answers
    );

  h3ReadingActivationAuditAssert_(
    grade.score === 1 &&
      grade.graded[0].mark ===
        '○' &&
      grade.graded[1].mark ===
        '×',
    'GRADE'
  );

  var retests =
    h3ReadingBuildRetestEvents_(
      grade
    );

  h3ReadingActivationAuditAssert_(
    retests.length === 1 &&
      retests[0].skill_id ===
        'H3-P8-SK005' &&
      retests[0].passage_id ===
        locked.passage.passage_id,
    'RETEST'
  );

  var result =
    h3ReadingBuildCommittedResult_(
      stage,
      locked,
      grade,
      'H3TX-20260921-999999'
    );

  h3ReadingActivationAuditAssert_(
    result.mode === 'WRITTEN' &&
      result.surface_family ===
        'READING' &&
      result.score === 1 &&
      result.total === 2 &&
      result.receipt.indexOf(
        'STATUS=COMMITTED'
      ) >= 0,
    'RESULT'
  );

  var issued =
    JSON.parse(
      JSON.stringify(stage)
    );
  issued.status =
    'ISSUED';
  issued.issued_at =
    '2026-09-21T01:10:00+09:00';

  var current =
    h3ReadingCurrentLearningCandidate_(
      issued,
      locked,
      false
    );

  h3ReadingActivationAuditAssert_(
    current &&
      current.surface_family ===
        'READING' &&
      current.set_id ===
        issued.set_id,
    'CURRENT_LEARNING'
  );

  h3ReadingActivationAuditAssert_(
    h3ReadingCurrentLearningCandidate_(
      issued,
      locked,
      true
    ) === null,
    'CURRENT_COMMITTED_EXCLUDED'
  );

  h3ReadingActivationAuditExpectThrow_(
    function () {
      var drift =
        JSON.parse(
          JSON.stringify(stage)
        );
      drift.source_binding_sha256 =
        'DRIFT';
      h3ReadingPreissueValidate_(
        drift,
        locked,
        []
      );
    },
    'SOURCE_DRIFT_FAIL_CLOSED'
  );

  return {
    schema:
      'H3_READING_ACTIVATION_CORE_AUDIT_V3',
    contract_id:
      H3_READING_ACTIVATION_CONTRACT_ID_,
    result:
      'PASS',
    checks:
      22,
    source_group_id:
      '245',
    item_count:
      2,
    allocated_set_id:
      allocation.set_id,
    allocated_stage_id:
      allocation.stage_id,
    p9_allocated_set_id:
      p9Plan.stage.set_id,
    p9_allocated_stage_id:
      p9Plan.stage.stage_id,
    p10_allocated_set_id:
      p10Plan.stage.set_id,
    p10_allocated_stage_id:
      p10Plan.stage.stage_id,
    locked_bundle_sha256:
      stage.locked_bundle_sha256,
    source_binding_sha256:
      stage.source_binding_sha256
  };
}
