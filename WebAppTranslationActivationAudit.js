/**
 * Pure audit for H3 Translation activation core.
 */

function h3TranslationActivationAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'TRANSLATION_ACTIVATION_AUDIT_FAIL:' +
        code
    );
  }
}


function h3TranslationActivationExpectThrow_(
  fn,
  code
) {
  var threw = false;
  try {
    fn();
  } catch (_err) {
    threw = true;
  }

  h3TranslationActivationAssert_(
    threw,
    code
  );
}


function auditTranslationActivationCoreV1_() {
  var p11 =
    h3TranslationLockBundle_(
      h3TranslationP11Fixture_()
    );
  var p12 =
    h3TranslationLockBundle_(
      h3TranslationP12Fixture_()
    );

  var first =
    h3TranslationAllocateIdentity_(
      'H3-P11',
      '20260921',
      []
    );

  h3TranslationActivationAssert_(
    first.issue_no === 1 &&
      first.stage_id ===
        'TRANS-P11-20260921-001' &&
      first.set_id ===
        'H3-20260921-T001',
    'EMPTY_ALLOCATION'
  );

  var rows = [
    [
      'TRANS-P11-20260920-001',
      1,
      'H3-20260920-T001',
      'COMMITTED',
      '3級',
      'H3-P11'
    ],
    [
      'TRANS-P12-20260921-002',
      2,
      'H3-20260921-T002',
      'PREISSUE_READY',
      '3級',
      'H3-P12'
    ]
  ];

  var next =
    h3TranslationAllocateIdentity_(
      'H3-P11',
      '20260921',
      rows
    );

  h3TranslationActivationAssert_(
    next.issue_no === 3 &&
      next.stage_id ===
        'TRANS-P11-20260921-003' &&
      next.set_id ===
        'H3-20260921-T003',
    'MONOTONIC_SHARED_DATE_SERIAL_ALLOCATION'
  );

  var p11Plan =
    h3TranslationBuildMaterializationPlan_(
      'H3-P11',
      '20260921',
      [],
      p11,
      '2026-09-21T02:00:00+09:00',
      []
    );

  h3TranslationActivationAssert_(
    p11Plan.status ===
      'PREISSUE_READY' &&
      p11Plan.issue_performed ===
        false &&
      p11Plan.identity.set_id ===
        'H3-20260921-T001' &&
      p11Plan.stage.section_key ===
        'H3-P11' &&
      p11Plan.stage.translation_direction ===
        'KR_TO_JP' &&
      p11Plan.stage.answer_type ===
        'MULTIPLE_CHOICE' &&
      p11Plan.row.length ===
        H3_TRANSLATION_STAGE_HEADERS_.length,
    'P11_MATERIALIZATION'
  );

  var p12Plan =
    h3TranslationBuildMaterializationPlan_(
      'H3-P12',
      '20260921',
      [
        p11Plan.row
      ],
      p12,
      '2026-09-21T02:01:00+09:00',
      []
    );

  h3TranslationActivationAssert_(
    p12Plan.identity.issue_no === 2 &&
      p12Plan.identity.stage_id ===
        'TRANS-P12-20260921-002' &&
      p12Plan.identity.set_id ===
        'H3-20260921-T002' &&
      p12Plan.stage.translation_direction ===
        'JP_TO_KR',
    'P12_MATERIALIZATION'
  );

  h3TranslationActivationExpectThrow_(
    function () {
      h3TranslationAllocateIdentity_(
        'H3-P11',
        '20260921',
        [
          [
            'TRANS-P12-20260921-001',
            1,
            'H3-20260921-T002',
            'LOCKED',
            '3級',
            'H3-P12'
          ]
        ]
      );
    },
    'STAGE_SET_PARITY_FAIL_CLOSED'
  );

  var request = {
    schema:
      'H3_WEB_SUBMIT_V1',
    mode:
      'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    set_id:
      p11Plan.identity.set_id,
    answers: [
      {
        question_key:
          'OFF-H3-P11-001',
        answer:
          p11.items[0]
            .correct_answer_position,
        uncertain:
          false
      },
      {
        question_key:
          'OFF-H3-P11-002',
        answer: 1,
        uncertain:
          true
      }
    ]
  };

  var normalized =
    h3TranslationNormalizeSubmission_(
      request,
      p11
    );

  h3TranslationActivationAssert_(
    normalized.translation_direction ===
      'KR_TO_JP' &&
      normalized.answer_type ===
        'MULTIPLE_CHOICE' &&
      normalized.answers.length === 2,
    'NORMALIZE'
  );

  var txn =
    h3TranslationBuildTxnPlan_(
      p11Plan.stage,
      p11,
      request
    );

  h3TranslationActivationAssert_(
    txn.journal_sheet ===
      'translation_web_txn_v1' &&
      txn.translation_direction ===
        'KR_TO_JP' &&
      txn.request_fingerprint,
    'TXN_PLAN'
  );

  var grade =
    h3TranslationGrade_(
      p11,
      normalized.answers
    );

  h3TranslationActivationAssert_(
    grade.total === 2 &&
      grade.score === 1 &&
      grade.graded[0].mark ===
        '○' &&
      grade.graded[1].mark ===
        '×',
    'GRADE'
  );

  var result =
    h3TranslationBuildCommittedResult_(
      p11Plan.stage,
      p11,
      grade,
      'H3TX-20260921-999998'
    );

  h3TranslationActivationAssert_(
    result.surface_family ===
      'TRANSLATION' &&
      result.translation_direction ===
        'KR_TO_JP' &&
      result.answer_type ===
        'MULTIPLE_CHOICE' &&
      result.status ===
        'COMMITTED' &&
      result.total === 2 &&
      result.receipt.indexOf(
        'STATUS=COMMITTED'
      ) >= 0,
    'RESULT'
  );

  var issued =
    JSON.parse(
      JSON.stringify(
        p11Plan.stage
      )
    );
  issued.status =
    'ISSUED';
  issued.issued_at =
    '2026-09-21T02:10:00+09:00';

  var current =
    h3TranslationCurrentLearningCandidate_(
      issued,
      p11,
      false
    );

  h3TranslationActivationAssert_(
    current &&
      current.surface_family ===
        'TRANSLATION' &&
      current.section_key ===
        'H3-P11' &&
      current.set_id ===
        issued.set_id,
    'CURRENT'
  );

  h3TranslationActivationAssert_(
    h3TranslationCurrentLearningCandidate_(
      issued,
      p11,
      true
    ) === null,
    'CURRENT_COMMITTED_EXCLUDED'
  );

  h3TranslationActivationExpectThrow_(
    function () {
      var drift =
        JSON.parse(
          JSON.stringify(
            p11Plan.stage
          )
        );
      drift.translation_direction =
        'JP_TO_KR';
      h3TranslationPreissueValidate_(
        drift,
        p11,
        []
      );
    },
    'DIRECTION_DRIFT_FAIL_CLOSED'
  );


  h3TranslationActivationExpectThrow_(
    function () {
      var drift =
        JSON.parse(
          JSON.stringify(
            p11Plan.stage
          )
        );
      drift.locked_bundle_json =
        drift.locked_bundle_json.replace(
          'H3-P11-SK001',
          'H3-P11-SK999'
        );
      h3TranslationPreissueValidate_(
        drift,
        p11,
        []
      );
    },
    'LOCKED_JSON_DRIFT_FAIL_CLOSED'
  );

  h3TranslationActivationAssert_(
    h3TranslationCanonicalJson_(
      h3TranslationParseLockedBundleJson_(
        p11Plan.stage
          .locked_bundle_json
      )
    ) ===
      h3TranslationCanonicalJson_(
        p11
      ) &&
      h3TranslationHash_(
        h3TranslationParseLockedBundleJson_(
          p11Plan.stage
            .locked_bundle_json
        )
      ) ===
        p11Plan.stage
          .locked_bundle_sha256,
    'LOCKED_JSON_PARITY'
  );

  h3TranslationActivationExpectThrow_(
    function () {
      h3TranslationPreissueValidate_(
        p11Plan.stage,
        p11,
        [
          p11Plan.stage.set_id
        ]
      );
    },
    'COMMITTED_SET_FAIL_CLOSED'
  );

  return {
    schema:
      'H3_TRANSLATION_ACTIVATION_CORE_AUDIT_V1',
    result:
      'PASS',
    checks: 14,
    p11_set_id:
      p11Plan.identity.set_id,
    p11_stage_id:
      p11Plan.identity.stage_id,
    p12_set_id:
      p12Plan.identity.set_id,
    p12_stage_id:
      p12Plan.identity.stage_id,
    p11_source_binding_sha256:
      p11.source_binding_sha256,
    p12_source_binding_sha256:
      p12.source_binding_sha256
  };
}
