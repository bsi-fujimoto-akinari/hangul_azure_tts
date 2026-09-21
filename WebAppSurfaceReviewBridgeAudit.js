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
    checks: 6,
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
