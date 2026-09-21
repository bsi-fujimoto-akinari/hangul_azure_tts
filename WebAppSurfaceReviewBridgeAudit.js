/**
 * Pure F1 audit for the Reading / Translation persistent Review bridge.
 */

function h3SurfaceReviewBridgeAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'SURFACE_REVIEW_BRIDGE_AUDIT_FAIL:' +
        code
    );
  }
}


function auditSurfaceReviewBridgeV1_() {
  var readingLocked =
    h3ReadingLockBundle_(
      h3ReadingPilotFixture_()
    );
  var readingGrade =
    h3ReadingGrade_(
      readingLocked,
      [
        {
          question_key:
            'OFF-H3-P8-001',
          answer: 3,
          uncertain: true
        },
        {
          question_key:
            'OFF-H3-P8-002',
          answer: 1,
          uncertain: false
        }
      ]
    );
  var readingTxn = {
    family: 'READING',
    txn_id:
      'H3TX-20260921-900001',
    set_id:
      'H3-20260921-R001',
    stage_id:
      'READ-P8-20260921-001',
    committed_at:
      '2026-09-21T12:00:00+09:00',
    source_binding_sha256:
      readingLocked
        .source_binding_sha256,
    result_sha256:
      'a'.repeat(64),
    grade:
      readingGrade,
    stage: {
      issue_no: 1,
      section_key: 'H3-P8'
    },
    locked:
      readingLocked
  };
  var reading =
    h3SurfaceReviewBuildReadingPayload_(
      readingTxn
    );

  h3SurfaceReviewValidatePayload_(
    reading,
    h3SurfaceReviewConfig_(
      'READING'
    )
  );

  h3SurfaceReviewBridgeAssert_(
    reading.item_count === 2 &&
      reading.total === 2 &&
      reading.questions.length === 2,
    'READING_DYNAMIC_ITEM_COUNT'
  );
  h3SurfaceReviewBridgeAssert_(
    reading.passage.passage_id ===
      'H3-P8-G245' &&
      reading.questions.every(
        function (question) {
          return (
            question.passage_id ===
              reading.passage
                .passage_id &&
            question.passage_sha256 ===
              reading.passage
                .passage_sha256
          );
        }
      ),
    'READING_SHARED_PASSAGE'
  );
  h3SurfaceReviewBridgeAssert_(
    reading.persisted === true &&
      reading.pilot_only === false &&
      reading.surface_family ===
        'READING',
    'READING_PERSISTENT_ENVELOPE'
  );


  var p9Locked =
    h3ReadingLockBundle_(
      h3ReadingP9PilotFixture_()
    );
  var p9Grade =
    h3ReadingGrade_(
      p9Locked,
      [
        {
          question_key:
            'OFF-H3-P9-001',
          answer: 4,
          uncertain: false
        },
        {
          question_key:
            'OFF-H3-P9-002',
          answer: 3,
          uncertain: true
        }
      ]
    );
  var p9Reading =
    h3SurfaceReviewBuildReadingPayload_({
      family: 'READING',
      txn_id:
        'H3TX-20260921-900004',
      set_id:
        'H3-20260921-R002',
      stage_id:
        'READ-P9-20260921-002',
      committed_at:
        '2026-09-21T12:15:00+09:00',
      source_binding_sha256:
        p9Locked.source_binding_sha256,
      result_sha256:
        'd'.repeat(64),
      grade:
        p9Grade,
      stage: {
        issue_no: 2,
        section_key: 'H3-P9'
      },
      locked:
        p9Locked
    });
  h3SurfaceReviewValidatePayload_(
    p9Reading,
    h3SurfaceReviewConfig_(
      'READING'
    )
  );
  h3SurfaceReviewBridgeAssert_(
    p9Reading.sections.every(
      function (section) {
        return (
          section.explanation.contract_id ===
            H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_ &&
          section.explanation.source_binding_sha256 ===
            H3_READING_P9_SOURCE_BINDING_SHA256_
        );
      }
    ),
    'READING_P9_EXPLANATION_CONTRACT'
  );

  var p10Locked =
    h3ReadingLockBundle_(
      h3ReadingP10PilotFixture_()
    );
  var p10Grade =
    h3ReadingGrade_(
      p10Locked,
      [
        {
          question_key:
            'OFF-H3-P10-001',
          answer: 3,
          uncertain: false
        },
        {
          question_key:
            'OFF-H3-P10-002',
          answer: 3,
          uncertain: false
        }
      ]
    );
  var p10Reading =
    h3SurfaceReviewBuildReadingPayload_({
      family: 'READING',
      txn_id:
        'H3TX-20260921-900005',
      set_id:
        'H3-20260921-R003',
      stage_id:
        'READ-P10-20260921-003',
      committed_at:
        '2026-09-21T12:20:00+09:00',
      source_binding_sha256:
        p10Locked.source_binding_sha256,
      result_sha256:
        'e'.repeat(64),
      grade:
        p10Grade,
      stage: {
        issue_no: 3,
        section_key: 'H3-P10'
      },
      locked:
        p10Locked
    });
  h3SurfaceReviewValidatePayload_(
    p10Reading,
    h3SurfaceReviewConfig_(
      'READING'
    )
  );
  h3SurfaceReviewBridgeAssert_(
    p10Reading.sections.every(
      function (section) {
        return (
          section.explanation.contract_id ===
            H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_ &&
          section.explanation.source_binding_sha256 ===
            H3_READING_P10_SOURCE_BINDING_SHA256_
        );
      }
    ),
    'READING_P10_EXPLANATION_CONTRACT'
  );

  var wrongContract =
    JSON.parse(
      JSON.stringify(p9Reading)
    );
  wrongContract.sections[0]
    .explanation.contract_id =
      H3_READING_P8_EXPLANATION_CONTRACT_ID_;
  var wrongContractRejected = false;
  try {
    h3SurfaceReviewValidatePayload_(
      wrongContract,
      h3SurfaceReviewConfig_(
        'READING'
      )
    );
  } catch (_err) {
    wrongContractRejected = true;
  }
  h3SurfaceReviewBridgeAssert_(
    wrongContractRejected,
    'READING_P9_WRONG_CONTRACT_REJECTED'
  );

  var translationLocked =
    h3TranslationLockBundle_(
      h3TranslationP11Fixture_()
    );
  var translationGrade =
    h3TranslationGrade_(
      translationLocked,
      [
        {
          question_key:
            'OFF-H3-P11-001',
          answer: 1,
          uncertain: false
        },
        {
          question_key:
            'OFF-H3-P11-002',
          answer: 2,
          uncertain: true
        }
      ]
    );
  var translationTxn = {
    family: 'TRANSLATION',
    txn_id:
      'H3TX-20260921-900002',
    set_id:
      'H3-20260921-T001',
    stage_id:
      'TRANS-P11-20260921-001',
    committed_at:
      '2026-09-21T12:05:00+09:00',
    source_binding_sha256:
      translationLocked
        .source_binding_sha256,
    result_sha256:
      'b'.repeat(64),
    grade:
      translationGrade,
    stage: {
      issue_no: 1,
      section_key:
        'H3-P11',
      translation_direction:
        'KR_TO_JP',
      answer_type:
        'MULTIPLE_CHOICE'
    },
    locked:
      translationLocked
  };
  var translation =
    h3SurfaceReviewBuildTranslationPayload_(
      translationTxn
    );

  h3SurfaceReviewValidatePayload_(
    translation,
    h3SurfaceReviewConfig_(
      'TRANSLATION'
    )
  );

  h3SurfaceReviewBridgeAssert_(
    translation.item_count === 2 &&
      translation.total === 2 &&
      translation.questions.length === 2,
    'TRANSLATION_DYNAMIC_ITEM_COUNT'
  );
  h3SurfaceReviewBridgeAssert_(
    translation.translation_direction ===
      'KR_TO_JP' &&
      translation.answer_type ===
        'MULTIPLE_CHOICE' &&
      translation.questions.every(
        function (question) {
          return (
            question.translation_direction ===
              'KR_TO_JP' &&
            question.answer_type ===
              'MULTIPLE_CHOICE'
          );
        }
      ),
    'TRANSLATION_DIRECTION_TYPE'
  );

  var translationExplained =
    h3TranslationReviewApplyExplanationOverlay_(
      translation,
      translationLocked
    );

  h3SurfaceReviewBridgeAssert_(
    translationExplained.questions
      .every(function (question) {
        return (
          question.explanation &&
          question.explanation
            .contract_id ===
            H3_TRANSLATION_EXPLANATION_CONTRACT_ID_ &&
          question.explanation
            .source_binding_sha256 ===
            translationLocked
              .source_binding_sha256
        );
      }) &&
      translationExplained.questions[0]
        .explanation.body_ja ===
        '若いなんてとんでもないです。もう60ですよ。',
    'TRANSLATION_P11_EXPLANATION_OVERLAY'
  );

  var translationP12Locked =
    h3TranslationLockBundle_(
      h3TranslationP12Fixture_()
    );
  var translationP12Grade =
    h3TranslationGrade_(
      translationP12Locked,
      [
        {
          question_key:
            'OFF-H3-P12-001',
          answer: 2,
          uncertain: false
        },
        {
          question_key:
            'OFF-H3-P12-002',
          answer: 3,
          uncertain: true
        }
      ]
    );
  var translationP12 =
    h3SurfaceReviewBuildTranslationPayload_({
      family: 'TRANSLATION',
      txn_id:
        'H3TX-20260921-900003',
      set_id:
        'H3-20260921-T002',
      stage_id:
        'TRANS-P12-20260921-002',
      committed_at:
        '2026-09-21T12:10:00+09:00',
      source_binding_sha256:
        translationP12Locked
          .source_binding_sha256,
      result_sha256:
        'c'.repeat(64),
      grade:
        translationP12Grade,
      stage: {
        issue_no: 2,
        section_key:
          'H3-P12',
        translation_direction:
          'JP_TO_KR',
        answer_type:
          'MULTIPLE_CHOICE'
      },
      locked:
        translationP12Locked
    });
  var translationP12Explained =
    h3TranslationReviewApplyExplanationOverlay_(
      translationP12,
      translationP12Locked
    );

  h3SurfaceReviewBridgeAssert_(
    translationP12Explained.questions[0]
      .explanation.choices[1].ko ===
        '눈치만 보지 말고' &&
      translationP12Explained.questions[0]
        .explanation.choices[1].ja ===
        '顔色ばかりうかがわないで' &&
      translationP12Explained.questions[1]
        .explanation.learning_blocks
        .length >= 2,
    'TRANSLATION_P12_EXPLANATION_OVERLAY'
  );

  var currentReadingResult = {
    schema:
      'H3_WEB_SUBMIT_RESULT_V1',
    status:
      'COMMITTED',
    surface_family:
      'READING',
    receipt:
      [
        '[H3_WEB_SYNC]',
        'SET_ID=H3-20260921-R001',
        'TXN_ID=H3TX-20260921-900001',
        'STATUS=COMMITTED'
      ].join('\n')
  };
  var legacyReadingResult =
    JSON.parse(
      JSON.stringify(
        currentReadingResult
      )
    );
  delete legacyReadingResult.status;
  var compatibleLegacyReadingResult =
    h3SurfaceReviewComparableResult_(
      'READING',
      legacyReadingResult,
      currentReadingResult
    );

  h3SurfaceReviewBridgeAssert_(
    !Object.prototype.hasOwnProperty.call(
      compatibleLegacyReadingResult,
      'status'
    ) &&
      h3ReviewHash_(
        compatibleLegacyReadingResult
      ) ===
        h3ReviewHash_(
          legacyReadingResult
        ),
    'READING_LEGACY_RESULT_COMPATIBILITY'
  );

  var currentTranslationResult = {
    schema:
      'H3_WEB_SUBMIT_RESULT_V1',
    status:
      'COMMITTED',
    surface_family:
      'TRANSLATION',
    receipt:
      [
        '[H3_WEB_SYNC]',
        'SET_ID=H3-20260921-T001',
        'TXN_ID=H3TX-20260921-900002',
        'STATUS=COMMITTED'
      ].join('\n')
  };
  var legacyTranslationResult =
    JSON.parse(
      JSON.stringify(
        currentTranslationResult
      )
    );
  delete legacyTranslationResult.status;
  var compatibleLegacyResult =
    h3SurfaceReviewComparableResult_(
      'TRANSLATION',
      legacyTranslationResult,
      currentTranslationResult
    );

  h3SurfaceReviewBridgeAssert_(
    !Object.prototype.hasOwnProperty.call(
      compatibleLegacyResult,
      'status'
    ) &&
      h3ReviewHash_(
        compatibleLegacyResult
      ) ===
        h3ReviewHash_(
          legacyTranslationResult
        ),
    'TRANSLATION_LEGACY_RESULT_COMPATIBILITY'
  );

  var readingBinding =
    h3ReviewHash_(
      h3SurfaceReviewBindingObject_(
        h3SurfaceReviewConfig_(
          'READING'
        ),
        readingTxn,
        h3ReviewHash_(reading)
      )
    );
  var translationBinding =
    h3ReviewHash_(
      h3SurfaceReviewBindingObject_(
        h3SurfaceReviewConfig_(
          'TRANSLATION'
        ),
        translationTxn,
        h3ReviewHash_(translation)
      )
    );

  h3SurfaceReviewBridgeAssert_(
    /^[0-9a-f]{64}$/.test(
      readingBinding
    ) &&
      /^[0-9a-f]{64}$/.test(
        translationBinding
      ) &&
      readingBinding !==
        translationBinding,
    'FAMILY_BINDING_ISOLATION'
  );

  return {
    schema:
      'H3_SURFACE_REVIEW_BRIDGE_AUDIT_V1',
    result: 'PASS',
    checks: 11,
    reading_item_count:
      reading.item_count,
    translation_item_count:
      translation.item_count,
    reading_passage_sha256:
      reading.passage
        .passage_sha256,
    translation_direction:
      translation
        .translation_direction
  };
}
