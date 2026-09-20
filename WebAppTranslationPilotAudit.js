/**
 * Pure audit for official P11/P12 Translation pilot.
 */

function h3TranslationPilotAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'TRANSLATION_PILOT_AUDIT_FAIL:' +
        code
    );
  }
}


function h3TranslationPilotExpectThrow_(
  fn,
  code
) {
  var threw = false;
  try {
    fn();
  } catch (_err) {
    threw = true;
  }

  h3TranslationPilotAssert_(
    threw,
    code
  );
}


function h3TranslationP11Fixture_() {
  return {
    schema:
      'H3_TRANSLATION_SOURCE_BUNDLE_V1',
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    level:
      '3級',
    section_key:
      'H3-P11',
    translation_direction:
      'KR_TO_JP',
    answer_type:
      'MULTIPLE_CHOICE',
    source_language:
      'KO',
    choice_language:
      'JA',
    site_group_id:
      '707',
    source_batch_id:
      'd5e325b2-c968-4c33-8d5f-4786a27e01bb',
    source_file:
      'hangul-api-batch-G30-h11-20260916-113146.json',
    items: [
      {
        item_id:
          'OFF-H3-P11-001',
        question_key:
          'OFF-H3-P11-001',
        site_item_id:
          '2465',
        q_no:
          1,
        section:
          'P11',
        display:
          '筆11／翻訳',
        skill_id:
          'H3-P11-SK001',
        translation_direction:
          'KR_TO_JP',
        answer_type:
          'MULTIPLE_CHOICE',
        target_segment:
          '젊기는요.',
        question_text:
          '젊기는요. 벌써 예순인데요.',
        choices: [
          '若いなんてとんでもないです。',
          '若いはずがありません。',
          'まだまだ若いです。',
          '若いことは若いです。'
        ],
        correct_answer_position:
          1
      },
      {
        item_id:
          'OFF-H3-P11-002',
        question_key:
          'OFF-H3-P11-002',
        site_item_id:
          '2466',
        q_no:
          2,
        section:
          'P11',
        display:
          '筆11／翻訳',
        skill_id:
          'H3-P11-SK002',
        translation_direction:
          'KR_TO_JP',
        answer_type:
          'MULTIPLE_CHOICE',
        target_segment:
          '시키시는 대로 했을 뿐입니다.',
        question_text:
          '저는 사장님께서 시키시는 대로 했을 뿐입니다.',
        choices: [
          '注文を受けたばかりです。',
          '言われたとおりにしただけです。',
          '指示どおりにすればいいです。',
          '頼まれたことだけしました。'
        ],
        correct_answer_position:
          2
      }
    ]
  };
}


function h3TranslationP12Fixture_() {
  return {
    schema:
      'H3_TRANSLATION_SOURCE_BUNDLE_V1',
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    level:
      '3級',
    section_key:
      'H3-P12',
    translation_direction:
      'JP_TO_KR',
    answer_type:
      'MULTIPLE_CHOICE',
    source_language:
      'JA',
    choice_language:
      'KO',
    site_group_id:
      '708',
    source_batch_id:
      '648f2374-4902-4515-bda7-c7e6296135b1',
    source_file:
      'hangul-api-batch-G30-h12-20260916-112512.json',
    items: [
      {
        item_id:
          'OFF-H3-P12-001',
        question_key:
          'OFF-H3-P12-001',
        site_item_id:
          '2468',
        q_no:
          1,
        section:
          'P12',
        display:
          '筆12／翻訳',
        skill_id:
          'H3-P11-SK017',
        translation_direction:
          'JP_TO_KR',
        answer_type:
          'MULTIPLE_CHOICE',
        target_segment:
          '顔色ばかりうかがわないで',
        question_text:
          '人の顔色ばかりうかがわないで、自分の意見を言ってください。',
        choices: [
          '얼굴색만 보지 않고',
          '눈치만 보지 말고',
          '신경만 쓰지 말고',
          '정신만 팔지 않고'
        ],
        correct_answer_position:
          2
      },
      {
        item_id:
          'OFF-H3-P12-002',
        question_key:
          'OFF-H3-P12-002',
        site_item_id:
          '2469',
        q_no:
          2,
        section:
          'P12',
        display:
          '筆12／翻訳',
        skill_id:
          'H3-P11-SK011',
        translation_direction:
          'JP_TO_KR',
        answer_type:
          'MULTIPLE_CHOICE',
        target_segment:
          '少し痛みが和らぐでしょう。',
        question_text:
          'この薬を飲めば、少し痛みが和らぐでしょう。',
        choices: [
          '아픔이 더할 겁니다.',
          '아픈 곳이 나을 겁니다.　',
          '좀 덜 아플 거예요.',
          '조금 심해질 거예요.'
        ],
        correct_answer_position:
          3
      }
    ]
  };
}


function auditTranslationP11P12PilotV1_() {
  var p11 =
    h3TranslationLockBundle_(
      h3TranslationP11Fixture_()
    );
  var p12 =
    h3TranslationLockBundle_(
      h3TranslationP12Fixture_()
    );

  h3TranslationPilotAssert_(
    p11.section_key ===
      'H3-P11' &&
      p11.translation_direction ===
        'KR_TO_JP' &&
      p11.source_language ===
        'KO' &&
      p11.choice_language ===
        'JA' &&
      p11.items[0]
        .correct_answer_position ===
        1 &&
      p11.items[1]
        .correct_answer_position ===
        2,
    'P11_SOURCE_LOCK'
  );

  h3TranslationPilotAssert_(
    p12.section_key ===
      'H3-P12' &&
      p12.translation_direction ===
        'JP_TO_KR' &&
      p12.source_language ===
        'JA' &&
      p12.choice_language ===
        'KO' &&
      p12.items[0]
        .correct_answer_position ===
        2 &&
      p12.items[1]
        .correct_answer_position ===
        3,
    'P12_SOURCE_LOCK'
  );

  h3TranslationPilotAssert_(
    p12.items[0].skill_id ===
      'H3-P11-SK017' &&
      p12.items[1].skill_id ===
        'H3-P11-SK011',
    'P12_CROSS_SECTION_SKILL_REUSE'
  );

  h3TranslationPilotAssert_(
    p11.source_binding_sha256 !==
      p12.source_binding_sha256 &&
      /^[0-9a-f]{64}$/.test(
        p11.source_binding_sha256
      ) &&
      /^[0-9a-f]{64}$/.test(
        p12.source_binding_sha256
      ),
    'SOURCE_BINDING_ISOLATION'
  );

  var p11Render =
    h3TranslationBuildRenderPayload_(
      p11
    );
  var p12Render =
    h3TranslationBuildRenderPayload_(
      p12
    );

  h3TranslationPilotAssert_(
    p11Render.surface_family ===
      'TRANSLATION' &&
      p11Render.translation_direction ===
        'KR_TO_JP' &&
      p11Render.set_id ===
        'TRANSLATION-PILOT-H3-P11' &&
      p11Render.questions.length ===
        2,
    'P11_RENDER'
  );

  h3TranslationPilotAssert_(
    p12Render.translation_direction ===
      'JP_TO_KR' &&
      p12Render.set_id ===
        'TRANSLATION-PILOT-H3-P12' &&
      p12Render.questions[0]
        .visible_choices[1] ===
        '눈치만 보지 말고',
    'P12_RENDER'
  );

  var p11Grade =
    h3TranslationGrade_(
      p11,
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
          answer: 1,
          uncertain: true
        }
      ]
    );

  h3TranslationPilotAssert_(
    p11Grade.score === 1 &&
      p11Grade.graded[0].mark ===
        '○' &&
      p11Grade.graded[1].mark ===
        '×',
    'P11_GRADE'
  );

  var p11Retest =
    h3TranslationBuildRetestEvents_(
      p11Grade
    );

  h3TranslationPilotAssert_(
    p11Retest.length === 1 &&
      p11Retest[0].skill_id ===
        'H3-P11-SK002' &&
      p11Retest[0]
        .translation_direction ===
        'KR_TO_JP',
    'P11_RETEST'
  );

  var p12Grade =
    h3TranslationGrade_(
      p12,
      [
        {
          question_key:
            'OFF-H3-P12-001',
          answer: 2,
          uncertain: true
        },
        {
          question_key:
            'OFF-H3-P12-002',
          answer: 3,
          uncertain: false
        }
      ]
    );

  h3TranslationPilotAssert_(
    p12Grade.score === 2 &&
      p12Grade.graded[0].mark ===
        '△' &&
      p12Grade.graded[1].mark ===
        '○',
    'P12_GRADE'
  );

  var p12Retest =
    h3TranslationBuildRetestEvents_(
      p12Grade
    );

  h3TranslationPilotAssert_(
    p12Retest.length === 1 &&
      p12Retest[0].result ===
        '△' &&
      p12Retest[0].skill_id ===
        'H3-P11-SK017' &&
      p12Retest[0]
        .translation_direction ===
        'JP_TO_KR',
    'P12_RETEST'
  );

  h3TranslationPilotExpectThrow_(
    function () {
      var drift =
        JSON.parse(
          JSON.stringify(
            h3TranslationP11Fixture_()
          )
        );
      drift.translation_direction =
        'JP_TO_KR';
      h3TranslationLockBundle_(
        drift
      );
    },
    'DIRECTION_SECTION_FAIL_CLOSED'
  );

  h3TranslationPilotExpectThrow_(
    function () {
      var freeText =
        JSON.parse(
          JSON.stringify(
            h3TranslationP12Fixture_()
          )
        );
      freeText.answer_type =
        'FREE_TEXT_TRANSLATION';
      h3TranslationLockBundle_(
        freeText
      );
    },
    'FREE_TEXT_NOT_ACTIVE'
  );

  return {
    schema:
      'H3_TRANSLATION_P11_P12_PILOT_AUDIT_V1',
    result:
      'PASS',
    checks:
      12,
    p11_group_id:
      p11.site_group_id,
    p11_source_binding_sha256:
      p11.source_binding_sha256,
    p12_group_id:
      p12.site_group_id,
    p12_source_binding_sha256:
      p12.source_binding_sha256
  };
}
