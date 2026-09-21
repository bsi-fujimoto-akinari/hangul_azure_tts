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
      review.questions.length === 2 &&
      review.sections.length === 2 &&
      review.sections.every(
        function (section) {
          return (
            section.explanation &&
            section.explanation.contract_id ===
              H3_READING_P8_EXPLANATION_CONTRACT_ID_ &&
            section.explanation.source_binding_sha256 ===
              locked.source_binding_sha256 &&
            section.explanation.passage_sha256 ===
              locked.passage.passage_sha256 &&
            section.script_text.indexOf(
              source.passage.passage_ko
            ) < 0
          );
        }
      ),
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

function h3ReadingP9PilotFixture_() {
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
      'H3-P9',
    source_file:
      'hangul-api-batch-G30-h9-20260916-112344.json',
    passage: {
      passage_id:
        'H3-P9-G1293',
      site_group_id:
        '1293',
      group_role:
        'SHARED_READING_PASSAGE',
      passage_ko:
        '박 과장: 김 부장님, 업무가 너무 많아져서 아무래도 직원을 더 뽑아야 할 거 같은데요.\n김 부장: 다들 처리해야 할 일이 너무 많아 힘들어하는 거 같으니까 그렇게 하죠.\n박 과장: 감사합니다. 우선 자막을 만드는 팀에 사람을 추가하는 게 좋을 거 같습니다.\n김 부장: 그 부분은 (　　　　　　　　) 박 과장이 전부 맡아서 해 주세요.\n박 과장: 알겠습니다. 단기간 아르바이트로 뽑는 게 좋겠죠?\n김 부장: 앞으로 얼마나 더 주문이 들어올지 모르니까 그게 낫겠네요.\n박 과장: 네. 그럼 지금 말씀 드린 내용을 정리해서 다시 보고 드리겠습니다.\n김 부장: 고마워요. 그럼 수고 좀 해 줘요.',
      passage_ja:
        'パク課長：キム部長、業務があまりにも増えたので、どうしても職員を増やさないといけないようです。\nキム部長：皆、やらなきゃいけないことが多すぎて大変そうなのでそうしましょう。\nパク課長：ありがとうございます。まず字幕を作るチームに人を追加するのが良さそうです。\nキム部長：その部分は(　　　　　　　　　　)パク課長にすべて任せます。\nパク課長：分かりました。短期のアルバイトを雇ったほうがいいですよね？\nキム部長：この先どのくらい注文が入るかわからないのでその方が良さそうです。\nパク課長：はい。では、今申し上げた内容をまとめてまたご報告します。\nキム部長：ありがとう。ではよろしく頼みます。',
      source_site_item_id:
        '4415',
      source_batch_id:
        'd8da720b-9110-43c0-bc95-5b5d6f348cfa'
    },
    items: [
      {
        item_id:
          'OFF-H3-P9-001',
        question_key:
          'OFF-H3-P9-001',
        site_item_id:
          '4415',
        q_no: 1,
        section:
          'P9',
        display:
          '筆9／読解',
        skill_id:
          'H3-P9-SK001',
        question_text:
          '【問1】（　  　）に入れるのに最も適切なものを①〜④の中から１つ選びなさい。',
        choices_ko: [
          '없던 일로 하기로 했으니까',
          '내가 사장님과 의논을 해 봐야 하니',
          '지금까지 자막을 만드는 팀이 없었으니까',
          '나보다는 박 과장이 사정을 잘 알 테니'
        ],
        choices_ja: [
          'なかったことにすることにしたから',
          '私が社長と話し合ってみなければならないので',
          '今まで字幕を作るチームがなかったので',
          '私よりはパク課長の方が事情をよく知っているだろうから'
        ],
        correct_answer_position:
          4
      },
      {
        item_id:
          'OFF-H3-P9-002',
        question_key:
          'OFF-H3-P9-002',
        site_item_id:
          '4416',
        q_no: 2,
        section:
          'P9',
        display:
          '筆9／読解',
        skill_id:
          'H3-P8-SK003',
        question_text:
          '【問2】対話文の内容と一致するものを①〜④の中から１つ選びなさい。',
        choices_ko: [
          '두 사람은 새로운 사업에 대해 의논하고 있다.',
          '박 과장은 업무가 너무 많아 일을 그만둘 생각이다.',
          '이 회사는 추가로 사람을 더 뽑으려고 한다.',
          '현재 직원들만으로도 충분히 일 처리가 가능하다.'
        ],
        choices_ja: [
          '二人は新しい事業について話し合っている。',
          'パク課長は業務が多すぎて仕事を辞めようと思っている。',
          'この会社は追加で人を採用しようとしている。',
          '現在の職員だけでも十分に仕事の処理が可能だ。'
        ],
        correct_answer_position:
          3
      }
    ]
  };
}


function h3ReadingP10PilotFixture_() {
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
      'H3-P10',
    source_file:
      'hangul-api-batch-G30-h10-20260916-112415.json',
    passage: {
      passage_id:
        'H3-P10-G706',
      site_group_id:
        '706',
      group_role:
        'SHARED_READING_PASSAGE',
      passage_ko:
        '재작년 여름부터 에어컨 상태가 좋지 않았는데 그냥 참고 사용했었다. (                    ) 것 같아서 여름이 오기 전에 서둘러 샀다. 먼저 큰 전자 제품 매장*에 가서 마음에 드는 것이 있는지 가격은 어느 정도인지 알아봤다. 그리고 집에 돌아와서 그동안 모아 둔 포인트를 사용하려고 언제나 이용하는 인터넷 사이트에서 주문했다. 마음에 드는 제품을 매장보다 싸게 살 수 있었다. 사흘 후 에어컨이 도착했다. 이제 올해 여름은 안심하고 시원하게 보낼 수 있을 것이다.  ＊）매장：売り',
      passage_ja:
        '一昨年の夏からエアコンの状態が良くなかったが、そのまま我慢して使用してきた。(×インターネットではいつでも安く買え)そうなので、夏が来る前に急いで買った。まず大きな電気製品売り場に行って、気に入るものがあるか、価格はどの程度なのか調べてみた。それから家に帰って、今までためておいたポイントを使用しようと、いつも利用しているインターネットサイトで注文した。気に入った製品を売り場より安く買うことができた。三日後エアコンが届いた。もう今年の夏は安心して涼しく過ごすことができるだろう。',
      source_site_item_id:
        '2463',
      source_batch_id:
        '392f64a1-f584-44ab-a333-8821b328423f'
    },
    items: [
      {
        item_id:
          'OFF-H3-P10-001',
        question_key:
          'OFF-H3-P10-001',
        site_item_id:
          '2463',
        q_no: 1,
        section:
          'P10',
        display:
          '筆10／読解',
        skill_id:
          'H3-P8-SK001',
        question_text:
          '【問1】（　  　）に入れるのに<u>適切ではないもの</u>を①〜④の中から１つ選びなさい。',
        choices_ko: [
          '금년 여름도 아주 더울',
          '여름이 되면 에어컨이 비싸질',
          '인터넷으로는 언제든지 싸게 살 수 있을',
          '그대로 계속 사용하면 에어컨이 멈춰 버릴'
        ],
        choices_ja: [
          '今年の夏もとても暑くなり',
          '夏になるとエアコンが高くなり',
          'インターネットではいつでも安く買え',
          'そのままずっと使うとエアコンが止まり'
        ],
        correct_answer_position:
          3
      },
      {
        item_id:
          'OFF-H3-P10-002',
        question_key:
          'OFF-H3-P10-002',
        site_item_id:
          '2464',
        q_no: 2,
        section:
          'P10',
        display:
          '筆10／読解',
        skill_id:
          'H3-P8-SK003',
        question_text:
          '【問2】本文の内容と一致するものを①〜④の中から１つ選びなさい。',
        choices_ko: [
          '매장에서 현금으로 에어컨을 샀다.',
          '포인트를 모으기 위해 인터넷 사이트에서 에어컨을 샀다.',
          '에어컨 상태가 나빠진 것은 약 2년 전부터이다.',
          '에어컨을 주문한 다음날 에어컨이 도착했다.'
        ],
        choices_ja: [
          '売り場で現金でエアコンを買った。',
          'ポイントをためるためインターネットサイトでエアコンを買った。',
          'エアコンの状態が悪くなったのは約2年前からだ。',
          'エアコンを注文した翌日エアコンが届いた。'
        ],
        correct_answer_position:
          3
      }
    ]
  };
}


function auditReadingP9P10PilotV1_() {
  var p8 =
    h3ReadingLockBundle_(
      h3ReadingPilotFixture_()
    );
  var p9 =
    h3ReadingLockBundle_(
      h3ReadingP9PilotFixture_()
    );
  var p10 =
    h3ReadingLockBundle_(
      h3ReadingP10PilotFixture_()
    );

  h3ReadingPilotAuditAssert_(
    p8.source_binding_sha256 ===
      'a8c3a7c038fa251e195463a13157fb3683882ddef30d677d9962c58ff120761e' &&
      h3ReadingHash_(p8) ===
        'df49acc7d2495bdbf786020e0e462786d42fc8aa30deba30d73d30b0c6a03f08',
    'P8_HASH_BACKWARD_COMPAT'
  );

  h3ReadingPilotAuditAssert_(
    p9.section_key === 'H3-P9' &&
      p9.passage.site_group_id ===
        '1293' &&
      p9.items.length === 2 &&
      p9.items[0].correct_answer_position ===
        4 &&
      p9.items[1].correct_answer_position ===
        3,
    'P9_SOURCE_LOCK'
  );

  h3ReadingPilotAuditAssert_(
    p10.section_key === 'H3-P10' &&
      p10.passage.site_group_id ===
        '706' &&
      p10.items.length === 2 &&
      p10.items[0].correct_answer_position ===
        3 &&
      p10.items[1].correct_answer_position ===
        3,
    'P10_SOURCE_LOCK'
  );

  h3ReadingPilotAuditAssert_(
    p9.source_binding_sha256 ===
      H3_READING_P9_SOURCE_BINDING_SHA256_ &&
      p9.passage.passage_sha256 ===
        'ca4f46f0469f458234ae0d59c5b9c38cda0a7956f43f381bc724aaf44bf66af4' &&
      p9.items[0].item_sha256 ===
        'c395587ae39ee0f59dad96f1338c495794586eae24f748931d12c72a18dddd1e' &&
      p9.items[1].item_sha256 ===
        '47560ec74717a0bf7cf9cea0aa5c87fcfe1f1e97d6cbe48b03997f9b413344f4' &&
      p10.source_binding_sha256 ===
        H3_READING_P10_SOURCE_BINDING_SHA256_ &&
      p10.passage.passage_sha256 ===
        '4d01fa4a0604cccb832cdf33d27184a47744fe89a1d7a677dada56657bb40623' &&
      p10.items[0].item_sha256 ===
        'e49e7d932fe9a5296f21bf0a6602371f7fb016406195717e96ab13c083159ac3' &&
      p10.items[1].item_sha256 ===
        'c5b6b8c40393eb38b947f2f5ad4dbf549fc40f1d837ee3b826b8d032a40d8894',
    'P9_P10_EXACT_HASH_LOCK'
  );

  h3ReadingPilotAuditAssert_(
    p9.items[1].skill_id ===
      'H3-P8-SK003' &&
      p10.items[0].skill_id ===
        'H3-P8-SK001' &&
      p10.items[1].skill_id ===
        'H3-P8-SK003',
    'CROSS_SECTION_SKILL_REUSE'
  );

  var p9Render =
    h3ReadingBuildRenderPayload_(
      p9
    );
  var p10Render =
    h3ReadingBuildRenderPayload_(
      p10
    );

  h3ReadingPilotAuditAssert_(
    p9Render.set_id ===
      'READING-PILOT-H3-P9' &&
      p9Render.section_key ===
        'H3-P9' &&
      p9Render.questions.every(
        function (question) {
          return question.section ===
            'P9';
        }
      ),
    'P9_RENDER'
  );

  h3ReadingPilotAuditAssert_(
    p10Render.set_id ===
      'READING-PILOT-H3-P10' &&
      p10Render.section_key ===
        'H3-P10' &&
      p10Render.questions.every(
        function (question) {
          return question.section ===
            'P10';
        }
      ),
    'P10_RENDER'
  );

  var p9Grade =
    h3ReadingGrade_(
      p9,
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
          answer: 2,
          uncertain: true
        }
      ]
    );

  h3ReadingPilotAuditAssert_(
    p9Grade.score === 1 &&
      p9Grade.graded[0].mark ===
        '○' &&
      p9Grade.graded[1].mark ===
        '×',
    'P9_GRADE'
  );

  var p9Retest =
    h3ReadingBuildRetestEvents_(
      p9Grade
    );

  h3ReadingPilotAuditAssert_(
    p9Retest.length === 1 &&
      p9Retest[0].skill_id ===
        'H3-P8-SK003' &&
      p9Retest[0].passage_id ===
        'H3-P9-G1293',
    'P9_RETEST_PROVENANCE'
  );

  var p10Grade =
    h3ReadingGrade_(
      p10,
      [
        {
          question_key:
            'OFF-H3-P10-001',
          answer: 3,
          uncertain: true
        },
        {
          question_key:
            'OFF-H3-P10-002',
          answer: 3,
          uncertain: false
        }
      ]
    );

  h3ReadingPilotAuditAssert_(
    p10Grade.score === 2 &&
      p10Grade.graded[0].mark ===
        '△' &&
      p10Grade.graded[1].mark ===
        '○',
    'P10_GRADE'
  );

  var p10Retest =
    h3ReadingBuildRetestEvents_(
      p10Grade
    );

  h3ReadingPilotAuditAssert_(
    p10Retest.length === 1 &&
      p10Retest[0].result ===
        '△' &&
      p10Retest[0].skill_id ===
        'H3-P8-SK001',
    'P10_RETEST_PROVENANCE'
  );


  var p9Review =
    h3ReadingBuildReviewProjection_(
      p9,
      p9Grade
    );
  var p10Review =
    h3ReadingBuildReviewProjection_(
      p10,
      p10Grade
    );

  h3ReadingPilotAuditAssert_(
    p9Review.sections.every(
      function (section) {
        return (
          section.explanation &&
          section.explanation.contract_id ===
            H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_ &&
          section.explanation.source_binding_sha256 ===
            H3_READING_P9_SOURCE_BINDING_SHA256_ &&
          section.explanation.provenance_mode ===
            'SOURCE_LINKED_AUTHORED'
        );
      }
    ) &&
      p10Review.sections.every(
        function (section) {
          return (
            section.explanation &&
            section.explanation.contract_id ===
              H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_ &&
            section.explanation.source_binding_sha256 ===
              H3_READING_P10_SOURCE_BINDING_SHA256_ &&
            section.explanation.provenance_mode ===
              'SOURCE_LINKED_AUTHORED'
          );
        }
      ),
    'P9_P10_REVIEW_EXPLANATION'
  );

  var wrongBindingRejected = false;
  var wrongBinding =
    JSON.parse(
      JSON.stringify(p9)
    );
  wrongBinding.source_binding_sha256 =
    H3_READING_P10_SOURCE_BINDING_SHA256_;
  try {
    h3ReadingExplanationForItem_(
      wrongBinding,
      wrongBinding.items[0]
    );
  } catch (_err) {
    wrongBindingRejected = true;
  }
  h3ReadingPilotAuditAssert_(
    wrongBindingRejected,
    'P9_EXPLANATION_WRONG_BINDING_REJECTED'
  );

  var wrongItemRejected = false;
  var wrongItem =
    JSON.parse(
      JSON.stringify(
        p10.items[0]
      )
    );
  wrongItem.item_sha256 =
    '0'.repeat(64);
  try {
    h3ReadingExplanationForItem_(
      p10,
      wrongItem
    );
  } catch (_err2) {
    wrongItemRejected = true;
  }
  h3ReadingPilotAuditAssert_(
    wrongItemRejected,
    'P10_EXPLANATION_WRONG_ITEM_REJECTED'
  );

  h3ReadingPilotAuditAssert_(
    p8.source_binding_sha256 !==
      p9.source_binding_sha256 &&
      p9.source_binding_sha256 !==
        p10.source_binding_sha256 &&
      p8.source_binding_sha256 !==
        p10.source_binding_sha256,
    'SOURCE_BINDING_ISOLATION'
  );

  return {
    schema:
      'H3_READING_P9_P10_PILOT_AUDIT_V1',
    result:
      'PASS',
    checks:
      15,
    p8_source_binding_sha256:
      p8.source_binding_sha256,
    p9_group_id:
      p9.passage.site_group_id,
    p9_source_binding_sha256:
      p9.source_binding_sha256,
    p10_group_id:
      p10.passage.site_group_id,
    p10_source_binding_sha256:
      p10.source_binding_sha256
  };
}

