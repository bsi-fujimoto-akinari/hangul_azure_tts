/**
 * Pure audit for H3 Reading activation core.
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
    h3ReadingBuildLockedBundle_(
      source
    );

  var stage =
    h3ReadingBuildStage_(
      {
        issue_no: 1,
        stage_id:
          'READING-P8-PILOT-STAGE-001',
        set_id:
          'READING-P8-PILOT-SET-001'
      },
      locked
    );

  h3ReadingActivationAuditAssert_(
    stage.status === 'LOCKED' &&
      stage.issue_no === 1 &&
      stage.item_count === 2 &&
      stage.source_binding_sha256 ===
        locked.source_binding_sha256,
    'STAGE_LOCK'
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

  var plan =
    h3ReadingBuildTxnPlan_(
      stage,
      locked,
      request
    );

  h3ReadingActivationAuditAssert_(
    plan.journal_sheet ===
      'reading_web_txn_v1' &&
      plan.request_fingerprint &&
      plan.normalized_request
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
      'H3TX-20260920-999999'
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
    '2026-09-20T15:00:00+09:00';

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
      'H3_READING_ACTIVATION_CORE_AUDIT_V1',
    result:
      'PASS',
    checks:
      10,
    source_group_id:
      '245',
    item_count:
      2
  };
}
