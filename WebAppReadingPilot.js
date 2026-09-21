/**
 * H3 Reading P8-P10 pilot source-lock core.
 *
 * Repository-only pilot. This file does not read/write Sheets, issue learner
 * sets, advance scheduler state, or register a production route.
 */

var H3_READING_PILOT_CONTRACT_ID_ =
  'H3-READING-P8-PILOT-20260920-V1';

var H3_READING_SOURCE_SCHEMA_ =
  'H3_READING_SOURCE_BUNDLE_V1';

var H3_READING_LOCKED_SCHEMA_ =
  'H3_READING_LOCKED_BUNDLE_V1';

var H3_READING_RENDER_SCHEMA_ =
  'H3_WEB_READING_SET_V1';

var H3_READING_REVIEW_SCHEMA_ =
  'H3_READING_REVIEW_PROJECTION_V1';

var H3_READING_P8_EXPLANATION_CONTRACT_ID_ =
  'H3-READING-P8-EXPLANATION-20260921-V1';


function h3ReadingCanonicalize_(value) {
  if (Array.isArray(value)) {
    return value.map(
      h3ReadingCanonicalize_
    );
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    var out = {};
    Object.keys(value)
      .sort()
      .forEach(function (key) {
        out[key] =
          h3ReadingCanonicalize_(
            value[key]
          );
      });
    return out;
  }

  return value;
}


function h3ReadingCanonicalJson_(value) {
  return JSON.stringify(
    h3ReadingCanonicalize_(value)
  );
}


function h3ReadingHash_(value) {
  if (typeof hash_ !== 'function') {
    throw new Error(
      'READING_HASH_HELPER_MISSING'
    );
  }

  return hash_(
    h3ReadingCanonicalJson_(value)
  );
}


function h3ReadingRequireString_(
  value,
  code
) {
  var normalized =
    String(value || '').trim();

  if (!normalized) {
    throw new Error(code);
  }

  return normalized;
}


function h3ReadingValidateSourceBundle_(
  source
) {
  if (
    !source ||
    source.schema !==
      H3_READING_SOURCE_SCHEMA_
  ) {
    throw new Error(
      'READING_SOURCE_SCHEMA_INVALID'
    );
  }

  if (
    source.provider_kind !== 'WRITTEN' ||
    source.surface_family !== 'READING' ||
    source.level !== '3級' ||
    [
      'H3-P8',
      'H3-P9',
      'H3-P10'
    ].indexOf(
      source.section_key
    ) < 0
  ) {
    throw new Error(
      'READING_SOURCE_SCOPE_INVALID'
    );
  }

  if (
    !source.passage ||
    !Array.isArray(source.items) ||
    source.items.length !== 2
  ) {
    throw new Error(
      'READING_SOURCE_GROUP_SHAPE_INVALID'
    );
  }

  var passage = source.passage;

  [
    'passage_id',
    'site_group_id',
    'passage_ko',
    'passage_ja',
    'source_site_item_id',
    'source_batch_id'
  ].forEach(function (field) {
    h3ReadingRequireString_(
      passage[field],
      'READING_PASSAGE_FIELD_MISSING:' +
        field
    );
  });

  if (
    passage.group_role !==
      'SHARED_READING_PASSAGE'
  ) {
    throw new Error(
      'READING_PASSAGE_ROLE_INVALID'
    );
  }

  var seenItem = {};
  var seenKey = {};
  var expectedSection =
    String(
      source.section_key
    ).replace(
      'H3-',
      ''
    );

  source.items.forEach(
    function (item, index) {
      if (
        !item ||
        Number(item.q_no) !==
          index + 1 ||
        String(item.section || '') !==
          expectedSection
      ) {
        throw new Error(
          'READING_ITEM_ORDER_INVALID'
        );
      }

      [
        'item_id',
        'question_key',
        'site_item_id',
        'skill_id',
        'question_text'
      ].forEach(function (field) {
        h3ReadingRequireString_(
          item[field],
          'READING_ITEM_FIELD_MISSING:' +
            field
        );
      });

      if (
        seenItem[item.item_id] ||
        seenKey[item.question_key]
      ) {
        throw new Error(
          'READING_ITEM_ID_DUPLICATE'
        );
      }
      seenItem[item.item_id] = true;
      seenKey[item.question_key] = true;

      if (
        !Array.isArray(
          item.choices_ko
        ) ||
        !Array.isArray(
          item.choices_ja
        ) ||
        item.choices_ko.length !== 4 ||
        item.choices_ja.length !== 4
      ) {
        throw new Error(
          'READING_ITEM_CHOICES_INVALID'
        );
      }

      var answer =
        Number(
          item.correct_answer_position
        );
      if (
        !Number.isInteger(answer) ||
        answer < 1 ||
        answer > 4
      ) {
        throw new Error(
          'READING_ITEM_ANSWER_INVALID'
        );
      }

      if (
        !/^H3-P(?:8|9|10)-SK\d+$/
          .test(
            String(item.skill_id)
          )
      ) {
        throw new Error(
          'READING_ITEM_SKILL_SCOPE_INVALID'
        );
      }
    }
  );

  return true;
}


function h3ReadingLockBundle_(
  source
) {
  h3ReadingValidateSourceBundle_(
    source
  );

  var passageHashObject = {
    passage_id:
      source.passage.passage_id,
    site_group_id:
      String(
        source.passage.site_group_id
      ),
    group_role:
      source.passage.group_role,
    passage_ko:
      source.passage.passage_ko,
    passage_ja:
      source.passage.passage_ja,
    source_site_item_id:
      String(
        source.passage
          .source_site_item_id
      ),
    source_batch_id:
      source.passage.source_batch_id
  };

  var passageSha =
    h3ReadingHash_(
      passageHashObject
    );

  var items =
    source.items.map(
      function (item) {
        var hashObject = {
          item_id:
            item.item_id,
          question_key:
            item.question_key,
          site_item_id:
            String(item.site_item_id),
          q_no:
            Number(item.q_no),
          section:
            item.section,
          skill_id:
            item.skill_id,
          question_text:
            item.question_text,
          choices_ko:
            item.choices_ko,
          choices_ja:
            item.choices_ja,
          correct_answer_position:
            Number(
              item.correct_answer_position
            ),
          passage_id:
            source.passage.passage_id,
          passage_sha256:
            passageSha
        };

        return {
          item_id:
            item.item_id,
          question_key:
            item.question_key,
          site_item_id:
            String(item.site_item_id),
          q_no:
            Number(item.q_no),
          section:
            item.section,
          display:
            String(
              item.display ||
              (
                '筆' +
                expectedSection
                  .slice(1) +
                '／読解'
              )
            ),
          skill_id:
            item.skill_id,
          question_text:
            item.question_text,
          choices_ko:
            item.choices_ko.slice(),
          choices_ja:
            item.choices_ja.slice(),
          correct_answer_position:
            Number(
              item.correct_answer_position
            ),
          passage_id:
            source.passage.passage_id,
          passage_sha256:
            passageSha,
          item_sha256:
            h3ReadingHash_(hashObject)
        };
      }
    );

  var bindingObject = {
    contract_id:
      H3_READING_PILOT_CONTRACT_ID_,
    provider_kind: 'WRITTEN',
    surface_family: 'READING',
    level: '3級',
    section_key:
      source.section_key,
    passage_id:
      source.passage.passage_id,
    passage_sha256:
      passageSha,
    item_ids:
      items.map(function (item) {
        return item.item_id;
      }),
    item_sha256:
      items.map(function (item) {
        return item.item_sha256;
      }),
    source_batch_id:
      source.passage.source_batch_id
  };

  return {
    schema:
      H3_READING_LOCKED_SCHEMA_,
    contract_id:
      H3_READING_PILOT_CONTRACT_ID_,
    provider_kind: 'WRITTEN',
    surface_family: 'READING',
    level: '3級',
    section_key:
      source.section_key,
    source_batch_id:
      source.passage.source_batch_id,
    passage: {
      passage_id:
        source.passage.passage_id,
      site_group_id:
        String(
          source.passage.site_group_id
        ),
      group_role:
        source.passage.group_role,
      passage_ko:
        source.passage.passage_ko,
      passage_ja:
        source.passage.passage_ja,
      source_site_item_id:
        String(
          source.passage
            .source_site_item_id
        ),
      passage_sha256:
        passageSha
    },
    items: items,
    source_binding_sha256:
      h3ReadingHash_(
        bindingObject
      )
  };
}


function h3ReadingBuildRenderPayload_(
  locked,
  setId
) {
  if (
    !locked ||
    locked.schema !==
      H3_READING_LOCKED_SCHEMA_ ||
    !Array.isArray(locked.items) ||
    locked.items.length !== 2
  ) {
    throw new Error(
      'READING_LOCKED_BUNDLE_INVALID'
    );
  }

  var questions =
    locked.items.map(
      function (item) {
        return {
          item_id:
            item.item_id,
          question_key:
            item.question_key,
          q_no:
            item.q_no,
          section:
            item.section,
          display:
            item.display,
          skill_id:
            item.skill_id,
          question_text:
            item.question_text,
          choice_ids:
            [1, 2, 3, 4],
          visible_choices:
            item.choices_ko.slice(),
          passage_id:
            item.passage_id,
          passage_sha256:
            item.passage_sha256,
          audio_asset_key:
            null,
          audio_fallback_url:
            null
        };
      }
    );

  var surface = {
    learning_surface_schema:
      'H3_LEARNING_SURFACE_V1',
    provider_kind: 'WRITTEN',
    surface_family: 'READING',
    level: locked.level,
    item_count:
      questions.length
  };

  h3LearningSurfaceValidate_(
    surface,
    questions
  );

  return {
    schema:
      H3_READING_RENDER_SCHEMA_,
    mode: 'WRITTEN',
    nonlearning: false,
    persisted: false,
    pilot_only: true,
    set_id:
      String(
        setId ||
        (
          'READING-PILOT-' +
          locked.section_key
        )
      ),
    learning_surface_schema:
      surface.learning_surface_schema,
    provider_kind:
      surface.provider_kind,
    surface_family:
      surface.surface_family,
    level:
      surface.level,
    item_count:
      surface.item_count,
    section_key:
      locked.section_key,
    source_binding_sha256:
      locked.source_binding_sha256,
    passages: [
      {
        passage_id:
          locked.passage.passage_id,
        passage_sha256:
          locked.passage.passage_sha256,
        text_ko:
          locked.passage.passage_ko
      }
    ],
    questions: questions,
    transport: {
      audio: 'NONE',
      image: 'NONE',
      review:
        'READING_PILOT_NOT_ACTIVE'
    }
  };
}


function h3ReadingGrade_(
  locked,
  answers
) {
  if (
    !locked ||
    locked.schema !==
      H3_READING_LOCKED_SCHEMA_
  ) {
    throw new Error(
      'READING_GRADE_LOCK_INVALID'
    );
  }

  if (
    !Array.isArray(answers) ||
    answers.length !==
      locked.items.length
  ) {
    throw new Error(
      'READING_GRADE_ANSWER_COUNT_INVALID'
    );
  }

  var byKey = {};
  answers.forEach(function (answer) {
    var key =
      h3ReadingRequireString_(
        answer &&
          answer.question_key,
        'READING_GRADE_QUESTION_KEY_MISSING'
      );

    if (byKey[key]) {
      throw new Error(
        'READING_GRADE_QUESTION_KEY_DUPLICATE'
      );
    }

    var position =
      Number(answer.answer);
    if (
      !Number.isInteger(position) ||
      position < 1 ||
      position > 4
    ) {
      throw new Error(
        'READING_GRADE_ANSWER_INVALID'
      );
    }

    byKey[key] = {
      answer: position,
      uncertain:
        !!answer.uncertain
    };
  });

  var score = 0;
  var graded =
    locked.items.map(
      function (item) {
        var answer =
          byKey[item.question_key];

        if (!answer) {
          throw new Error(
            'READING_GRADE_QUESTION_MISSING:' +
              item.question_key
          );
        }

        var correct =
          answer.answer ===
          item.correct_answer_position;
        var mark =
          correct
            ? (
                answer.uncertain
                  ? '△'
                  : '○'
              )
            : '×';

        if (correct) {
          score += 1;
        }

        return {
          item_id:
            item.item_id,
          question_key:
            item.question_key,
          q_no:
            item.q_no,
          section:
            item.section,
          skill_id:
            item.skill_id,
          passage_id:
            item.passage_id,
          passage_sha256:
            item.passage_sha256,
          answer:
            answer.answer,
          correct_answer:
            item.correct_answer_position,
          uncertain:
            answer.uncertain,
          correct: correct,
          mark: mark
        };
      }
    );

  return {
    schema:
      'H3_READING_GRADE_V1',
    provider_kind: 'WRITTEN',
    surface_family: 'READING',
    level: locked.level,
    score: score,
    total:
      graded.length,
    graded: graded
  };
}


function h3ReadingBuildRetestEvents_(
  grade
) {
  if (
    !grade ||
    grade.schema !==
      'H3_READING_GRADE_V1'
  ) {
    throw new Error(
      'READING_RETEST_GRADE_INVALID'
    );
  }

  return grade.graded
    .filter(function (item) {
      return item.mark !== '○';
    })
    .map(function (item) {
      return {
        schema:
          'H3_READING_RETEST_EVENT_V1',
        provider_kind: 'WRITTEN',
        surface_family: 'READING',
        level:
          grade.level,
        item_id:
          item.item_id,
        question_key:
          item.question_key,
        skill_id:
          item.skill_id,
        result:
          item.mark,
        passage_id:
          item.passage_id,
        passage_sha256:
          item.passage_sha256
      };
    });
}


function h3ReadingP8Explanation_(
  locked,
  item
) {
  if (
    !locked ||
    locked.section_key !== 'H3-P8' ||
    locked.source_binding_sha256 !==
      'a8c3a7c038fa251e195463a13157fb3683882ddef30d677d9962c58ff120761e' ||
    !item ||
    item.passage_id !==
      locked.passage.passage_id ||
    item.passage_sha256 !==
      locked.passage.passage_sha256
  ) {
    throw new Error(
      'READING_P8_EXPLANATION_SOURCE_BINDING_INVALID'
    );
  }

  var specs = {
    'OFF-H3-P8-001': {
      reason:
        '前文は「一日くらい休めればちょうどよい」と述べた後、実際には休みにくい状況を受けて「心に余裕を持って木曜日を耐えてみよう」と続きます。①②④はいずれも休めない事情を表しますが、③は「そうするのが嫌だから」という本人の意思で、文脈上の制約とは合いません。',
      learning_blocks: [
        {
          form: '-(으)니',
          usage:
            '理由・原因を表す「～なので」。この設問では、後続の判断「마음의 여유를 가지고 … 견뎌 봅시다」の理由を作ります。'
        },
        {
          form: '사정',
          usage:
            '事情、都合。그럴 사정이 안 되다 は「そうできる事情・都合ではない」という意味です。'
        },
        {
          form: '자기 마음대로',
          usage:
            '自分の思いどおりに、勝手に。자기 마음대로 쉴 수 없다 で「勝手に休むことはできない」。'
        }
      ]
    },
    'OFF-H3-P8-002': {
      reason:
        '本文の中心は、一般に月曜日がつらいと思われている一方、研究では木曜日のほうが疲労を強く感じやすいと確認された、という対比です。したがって①が本文全体を最もよく表します。②は内容が広すぎ、③の「風邪との比較」は本文になく、④は「木曜日に休もう」という主張ではありません。',
      learning_blocks: [
        {
          form: '월요병 / 목요병',
          usage:
            '本文では「月曜病」という一般的なイメージと、木曜日の疲労感を対比しています。タイトル選択ではこの対比が中心情報です。'
        },
        {
          form: '무기력에 빠지다',
          usage:
            '「無気力に陥る」。疲労がたまった結果として述べられています。'
        },
        {
          form: '견디다',
          usage:
            '「耐える、持ちこたえる」。목요일을 잘 견뎌 봅시다 で「木曜日をうまく乗り切ってみましょう」。'
        }
      ]
    }
  };

  var spec =
    specs[String(item.item_id || '')];

  if (!spec) {
    throw new Error(
      'READING_P8_EXPLANATION_ITEM_UNSUPPORTED'
    );
  }

  return {
    schema:
      'H3_READING_EXPLANATION_V1',
    contract_id:
      H3_READING_P8_EXPLANATION_CONTRACT_ID_,
    source_binding_sha256:
      locked.source_binding_sha256,
    passage_sha256:
      item.passage_sha256,
    item_sha256:
      item.item_sha256,
    choices:
      item.choices_ko.map(
        function (choice, index) {
          return {
            ko: choice,
            ja: item.choices_ja[index]
          };
        }
      ),
    reason:
      spec.reason,
    learning_blocks:
      JSON.parse(
        JSON.stringify(
          spec.learning_blocks
        )
      )
  };
}


function h3ReadingBuildReviewSection_(
  locked,
  item,
  result
) {
  if (
    !result ||
    result.question_key !==
      item.question_key
  ) {
    throw new Error(
      'READING_REVIEW_SECTION_RESULT_INVALID'
    );
  }

  var symbols = [
    '①', '②', '③', '④'
  ];
  var choiceSurface =
    item.choices_ko.map(
      function (choice, index) {
        return {
          position: index + 1,
          symbol: symbols[index],
          text: choice
        };
      }
    );
  var rendered = [
    item.question_text
  ].concat(
    choiceSurface.map(
      function (choice) {
        return (
          choice.symbol +
          ' ' +
          choice.text
        );
      }
    )
  ).join('\n');

  return {
    section:
      item.section,
    display:
      item.display,
    result:
      result.mark,
    user_answer:
      result.answer,
    user_answer_position:
      result.answer,
    user_answer_text:
      item.choices_ko[
        result.answer - 1
      ],
    correct_answer:
      result.correct_answer,
    correct_answer_position:
      result.correct_answer,
    correct_answer_text:
      item.choices_ko[
        result.correct_answer - 1
      ],
    uncertain_known: true,
    uncertain:
      !!result.uncertain,
    item_id:
      item.item_id,
    question_key:
      item.question_key,
    skill_id:
      item.skill_id,
    passage_id:
      item.passage_id,
    passage_sha256:
      item.passage_sha256,
    item_sha256:
      item.item_sha256,
    question_surface: {
      rendered: rendered,
      body:
        item.question_text,
      choices:
        choiceSurface,
      dialogue_components: []
    },
    script_text:
      rendered,
    explanation:
      h3ReadingP8Explanation_(
        locked,
        item
      ),
    audio_asset_key: null,
    audio_fallback_url: null
  };
}


function h3ReadingBuildReviewProjection_(
  locked,
  grade
) {
  if (
    !locked ||
    !grade ||
    grade.total !==
      locked.items.length
  ) {
    throw new Error(
      'READING_REVIEW_INPUT_INVALID'
    );
  }

  var resultByKey = {};
  grade.graded.forEach(function (item) {
    resultByKey[item.question_key] =
      item;
  });

  return {
    schema:
      H3_READING_REVIEW_SCHEMA_,
    mode: 'REVIEW',
    kind: 'WRITTEN',
    provider_kind: 'WRITTEN',
    surface_family: 'READING',
    level: locked.level,
    item_count:
      locked.items.length,
    read_only: true,
    pilot_only: true,
    source_binding_sha256:
      locked.source_binding_sha256,
    passage: {
      passage_id:
        locked.passage.passage_id,
      passage_sha256:
        locked.passage.passage_sha256,
      text_ko:
        locked.passage.passage_ko,
      text_ja:
        locked.passage.passage_ja
    },
    sections:
      locked.items.map(
        function (item) {
          var result =
            resultByKey[
              item.question_key
            ];

          if (!result) {
            throw new Error(
              'READING_REVIEW_RESULT_MISSING'
            );
          }

          return h3ReadingBuildReviewSection_(
            locked,
            item,
            result
          );
        }
      ),
    questions:
      locked.items.map(
        function (item) {
          var result =
            resultByKey[
              item.question_key
            ];

          if (!result) {
            throw new Error(
              'READING_REVIEW_RESULT_MISSING'
            );
          }

          return {
            item_id:
              item.item_id,
            question_key:
              item.question_key,
            q_no:
              item.q_no,
            section:
              item.section,
            skill_id:
              item.skill_id,
            question_text:
              item.question_text,
            choices_ko:
              item.choices_ko.slice(),
            choices_ja:
              item.choices_ja.slice(),
            user_answer:
              result.answer,
            correct_answer:
              result.correct_answer,
            mark:
              result.mark,
            explicit_uncertainty:
              result.uncertain,
            passage_id:
              item.passage_id,
            passage_sha256:
              item.passage_sha256
          };
        }
      )
  };
}
