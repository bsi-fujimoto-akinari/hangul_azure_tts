/**
 * Pure audit for H3 Reading P8 pilot.
 * Exact source fixture: official P8 site group 245.
 */

function h3ReadingPilotAuditAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'READING_PILOT_AUDIT_FAIL:' +
        code
    );
  }
}


function h3ReadingPilotFixture_() {
  return {
    schema:
      'H3_READING_SOURCE_BUNDLE_V1',
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    level:
      '3級',
    section_key:
      'H3-P8',
    source_file:
      'hangul-api-batch-G30-h8-20260916-112313.json',
    passage: {
      passage_id:
        'H3-P8-G245',
      site_group_id:
        '245',
      group_role:
        'SHARED_READING_PASSAGE',
      passage_ko:
        '여러분은 일주일 가운데 무슨 요일이 제일 힘드신가요? 월요병이란 말이 있는 것처럼 많은 사람들이 월요일이라고 답한다고 하는데요. 그런데 실제＊로는 월요일보다 목요일을 더 힘들다고 느낀다는 사실이 연구를 통해 확인됐다고 합니다. 월요일부터 수요일까지 업무와 공부에 집중하던 사람들이 목요일이 되면 매우 피곤해져 무기력＊에 빠질 수도 있다고 합니다. 사흘을 열심히 달렸으니 하루쯤은 쉬어 가면 딱 좋은데 (   　   ) 마음의 여유를 가지고 목요일을 잘 견뎌 봅시다.',
      passage_ja:
        '皆さんは一週間の中で何曜日が一番大変ですか。「月曜病」という言葉があるように、多くの人が月曜日だと答えるそうですが。しかし実際には月曜日より木曜日をより大変だと感じているという事実が、研究を通じて確認されたそうです。月曜日から水曜日まで業務と勉強に集中していた人たちが木曜日になると非常に疲れてきて、無気力に陥ることもあるそうです。三日間一生懸命走ったので、一日くらいは休んでいけばちょうどいいのですが、(  　　  )　 心の余裕をもって木曜日をうまく耐えてみましょう。',
      source_site_item_id:
        '2159',
      source_batch_id:
        '6440dcde-26d7-42b4-b29f-b8ace8ae7d0e'
    },
    items: [
      {
        item_id:
          'OFF-H3-P8-001',
        question_key:
          'OFF-H3-P8-001',
        site_item_id:
          '2159',
        q_no: 1,
        section:
          'P8',
        display:
          '筆8／読解',
        skill_id:
          'H3-P8-SK001',
        question_text:
          '【問1】（　　　）に入れるのに適切でないものを①～④の中から１つ選びなさい。',
        choices_ko: [
          '현실적으로 불가능하니',
          '그럴 사정이 안 되니',
          '그렇게 하기는 싫으니',
          '자기 마음대로 쉴 수 없으니'
        ],
        choices_ja: [
          '現実的に不可能だから',
          'そうするわけにはいかないから',
          'そのようにするのは嫌だから',
          '勝手に休むことはできないから'
        ],
        correct_answer_position:
          3
      },
      {
        item_id:
          'OFF-H3-P8-002',
        question_key:
          'OFF-H3-P8-002',
        site_item_id:
          '2160',
        q_no: 2,
        section:
          'P8',
        display:
          '筆8／読解',
        skill_id:
          'H3-P8-SK005',
        question_text:
          '【問2】本文のタイトルとして最も適切なものを①～④の中から１つ選びなさい。',
        choices_ko: [
          '‘월요병’보다 조심해야 할 ‘목요병’',
          '피곤해지지 않기 위해서는? ',
          '감기보다 걸리기 쉬운 ‘월요병’',
          '목요일은 하루 쉬어 가자'
        ],
        choices_ja: [
          '「月曜病」より気を付けなければならない「木曜病」',
          '疲れないためには？',
          '風邪よりかかりやすい「月曜病」',
          '木曜日は一日休んでいこう'
        ],
        correct_answer_position:
          1
      }
    ]
  };
}


function auditReadingP8PilotV1_() {
  var source =
    h3ReadingPilotFixture_();

  h3ReadingValidateSourceBundle_(
    source
  );

  var locked =
    h3ReadingLockBundle_(
      source
    );

  h3ReadingPilotAuditAssert_(
    locked.passage.passage_id ===
      'H3-P8-G245',
    'PASSAGE_ID'
  );
  h3ReadingPilotAuditAssert_(
    locked.items.length === 2 &&
      locked.items[0].section === 'P8' &&
      locked.items[1].section === 'P8',
    'SHARED_SECTION'
  );
  h3ReadingPilotAuditAssert_(
    locked.items[0].question_key !==
      locked.items[1].question_key,
    'UNIQUE_QUESTION_KEYS'
  );
  h3ReadingPilotAuditAssert_(
    locked.items.every(
      function (item) {
        return (
          item.passage_id ===
            locked.passage.passage_id &&
          item.passage_sha256 ===
            locked.passage.passage_sha256
        );
      }
    ),
    'PASSAGE_BINDING'
  );

  var render =
    h3ReadingBuildRenderPayload_(
      locked,
      'READING-PILOT-H3-P8-G245'
    );

  h3ReadingPilotAuditAssert_(
    render.provider_kind ===
      'WRITTEN' &&
      render.surface_family ===
        'READING' &&
      render.level === '3級' &&
      render.item_count === 2,
    'SURFACE_METADATA'
  );
  h3ReadingPilotAuditAssert_(
    render.passages.length === 1 &&
      render.passages[0]
        .passage_id ===
        'H3-P8-G245',
    'RENDER_PASSAGE_ONCE'
  );
  h3ReadingPilotAuditAssert_(
    JSON.stringify(render)
      .indexOf(
        'correct_answer'
      ) < 0 &&
      JSON.stringify(render)
        .indexOf(
          'correct_answer_position'
        ) < 0,
    'NO_ANSWER_LEAK'
  );
  h3ReadingPilotAuditAssert_(
    !Object.prototype
      .hasOwnProperty.call(
        render.passages[0],
        'text_ja'
      ),
    'NO_PASSAGE_JA_PREANSWER'
  );

  var grade =
    h3ReadingGrade_(
      locked,
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
          answer: 2,
          uncertain: false
        }
      ]
    );

  h3ReadingPilotAuditAssert_(
    grade.score === 1 &&
      grade.total === 2 &&
      grade.graded[0].mark === '△' &&
      grade.graded[1].mark === '×',
    'GRADE_MARKS'
  );

  var retests =
    h3ReadingBuildRetestEvents_(
      grade
    );

  h3ReadingPilotAuditAssert_(
    retests.length === 2 &&
      retests[0].skill_id ===
        'H3-P8-SK001' &&
      retests[1].skill_id ===
        'H3-P8-SK005',
    'QUESTION_LEVEL_RETEST'
  );
  h3ReadingPilotAuditAssert_(
    retests.every(
      function (event) {
        return (
          event.skill_id !==
            locked.passage.passage_id &&
          event.question_key &&
          event.item_id
        );
      }
    ),
    'PASSAGE_NOT_SKILL'
  );

  var review =
    h3ReadingBuildReviewProjection_(
      locked,
      grade
    );

  h3ReadingPilotAuditAssert_(
    review.passage.text_ja ===
      source.passage.passage_ja &&
      review.questions.length === 2,
    'POSTGRADE_GROUPED_REVIEW'
  );
  h3ReadingPilotAuditAssert_(
    review.questions.every(
      function (question) {
        return (
          question.passage_sha256 ===
            review.passage
              .passage_sha256
        );
      }
    ),
    'REVIEW_PASSAGE_BINDING'
  );

  return {
    schema:
      'H3_READING_P8_PILOT_AUDIT_V1',
    result: 'PASS',
    source_group_id: '245',
    item_count: 2,
    passage_sha256:
      locked.passage.passage_sha256,
    source_binding_sha256:
      locked.source_binding_sha256,
    checks: 12
  };
}
