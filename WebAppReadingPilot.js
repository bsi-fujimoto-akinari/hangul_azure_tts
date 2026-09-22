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

var H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_ =
  'H3-READING-P9P10-EXPLANATION-20260921-V1';

var H3_READING_P9_SOURCE_BINDING_SHA256_ =
  'eb2cdc555f9d70255d65cc34349fae8bec42265e69d69f636da544a83b9ab17d';

var H3_READING_P10_SOURCE_BINDING_SHA256_ =
  'c67e214de5583546d76d585dda847343bb29d03461b3b044f3d3b935a9242361';


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


function h3ReadingSecondaryLinks_(links) {
  if (links === undefined || links === null) return [];
  if (typeof h3MultiSkillNormalizeAuthoredLinks_ !== 'function') {
    throw new Error('READING_MULTI_SKILL_HELPER_MISSING');
  }
  return h3MultiSkillNormalizeAuthoredLinks_(links);
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

      h3ReadingSecondaryLinks_(
        item.secondary_evidence_links
      );
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
        var secondaryLinks =
          h3ReadingSecondaryLinks_(
            item.secondary_evidence_links
          );

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

        if (secondaryLinks.length) {
          hashObject.secondary_evidence_links =
            secondaryLinks;
        }

        var lockedItem = {
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

        if (secondaryLinks.length) {
          lockedItem.secondary_evidence_links =
            secondaryLinks;
        }

        return lockedItem;
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



var H3_READING_P9_P10_EXPLANATION_OVERLAY_V1_ = {
  'eb2cdc555f9d70255d65cc34349fae8bec42265e69d69f636da544a83b9ab17d': {
    section_key: 'H3-P9',
    passage_id: 'H3-P9-G1293',
    passage_sha256:
      'ca4f46f0469f458234ae0d59c5b9c38cda0a7956f43f381bc724aaf44bf66af4',
    source_batch_id:
      'd8da720b-9110-43c0-bc95-5b5d6f348cfa',
    items: {
      'OFF-H3-P9-001': {
        item_sha256:
          'c395587ae39ee0f59dad96f1338c495794586eae24f748931d12c72a18dddd1e',
        skill_id: 'H3-P9-SK001',
        explanation: {
          reason:
            '部長は字幕チームの増員について、事情をよりよく知るパク課長に一任している。④「私よりはパク課長の方が事情をよく知っているだろうから」が、その直後の「パク課長が全部担当してください」につながるため最も適切。',
          learning_blocks: [
            {
              form: '-(으)ㄹ 테니',
              usage:
            '話し手の判断・見込みを理由として示し、後続の依頼や指示につなげる。알 테니 で「知っているだろうから」。'
            },
            {
              form: '사정을 잘 알다',
              usage:
            '「事情をよく知っている」。人や組織の内部事情に詳しいことを表す。'
            },
            {
              form: '맡아서 하다',
              usage:
            '「引き受けて担当する」。전부 맡아서 해 주세요 で「全部担当してください」。'
            }
          ]
        }
      },
      'OFF-H3-P9-002': {
        item_sha256:
          '47560ec74717a0bf7cf9cea0aa5c87fcfe1f1e97d6cbe48b03997f9b413344f4',
        skill_id: 'H3-P8-SK003',
        explanation: {
          reason:
            '対話では、業務量が増えて現在の職員が大変なため「직원을 더 뽑아야 할 거 같다」と提案し、部長も「그렇게 하죠」と同意している。したがって③「この会社は追加で人を採用しようとしている」が一致する。',
          learning_blocks: [
            {
              form: '직원을 더 뽑다',
              usage:
            '「職員をさらに採用する」。뽑다 は人材を「選ぶ・採用する」の意味でもよく使う。'
            },
            {
              form: '그렇게 하죠',
              usage:
            '相手の提案を受けて「そうしましょう」と同意する表現。'
            },
            {
              form: '내용과 일치하다',
              usage:
            '内容一致問題では、本文に明示された事実と選択肢を一つずつ照合する。'
            }
          ]
        }
      }
    }
  },
  'c67e214de5583546d76d585dda847343bb29d03461b3b044f3d3b935a9242361': {
    section_key: 'H3-P10',
    passage_id: 'H3-P10-G706',
    passage_sha256:
      '4d01fa4a0604cccb832cdf33d27184a47744fe89a1d7a677dada56657bb40623',
    source_batch_id:
      '392f64a1-f584-44ab-a333-8821b328423f',
    items: {
      'OFF-H3-P10-001': {
        item_sha256:
          'e49e7d932fe9a5296f21bf0a6602371f7fb016406195717e96ab13c083159ac3',
        skill_id: 'H3-P8-SK001',
        explanation: {
          reason:
            '空欄の後は「夏が来る前に急いで買った」と続くため、空欄には早めに買う理由が必要。①暑くなりそう、②夏になると高くなりそう、④そのまま使うと止まりそう、はいずれも理由になる。③「インターネットではいつでも安く買えそう」は急ぐ理由にならないため、適切ではない。',
          learning_blocks: [
            {
              form: '-(으)ㄹ 것 같아서',
              usage:
            '「～しそうなので、～だと思うので」。見込みを理由として後続の行動につなげる。'
            },
            {
              form: '서둘러',
              usage:
            '「急いで」。서두르다 の副詞的な形で、行動を早めることを表す。'
            },
            {
              form: '그대로 계속 사용하다',
              usage:
            '「そのまま使い続ける」。故障しかけた機器などの文脈でも使われる。'
            }
          ]
        }
      },
      'OFF-H3-P10-002': {
        item_sha256:
          'c5b6b8c40393eb38b947f2f5ad4dbf549fc40f1d837ee3b826b8d032a40d8894',
        skill_id: 'H3-P8-SK003',
        explanation: {
          reason:
            '本文冒頭の「재작년 여름부터 에어컨 상태가 좋지 않았다」は、エアコンの状態が悪くなったのが一昨年の夏からだという意味なので③が一致する。購入は店頭ではなくインターネット、ポイントはためるためではなく既にためたものを使うため、到着は翌日ではなく三日後だ。',
          learning_blocks: [
            {
              form: '재작년',
              usage:
            '「一昨年」。時間関係を問う内容一致問題では重要な手掛かり。'
            },
            {
              form: '그동안 모아 둔 포인트',
              usage:
            '「その間ためておいたポイント」。-아/어 두다 は後で使うためにしておくことを表す。'
            },
            {
              form: '사흘 후',
              usage:
            '「三日後」。사흘 は「3日」を表す固有語。'
            }
          ]
        }
      }
    }
  }
};


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
            '前文は「一日くらい休めればちょうどよい」と述べた後、実際には休みにくい状況を受けて「心に余裕を持って木曜日を耐えてみよう」と続く。①②④はいずれも休めない事情を表すが、③は「そうするのが嫌だから」という本人の意思で、文脈上の制約とは合わない。',
      learning_blocks: [
        {
          form: '-(으)니',
          usage:
            '理由・原因を表す「～なので」。この設問では、後続の判断「마음의 여유를 가지고 … 견뎌 봅시다」の理由を作る。'
        },
        {
          form: '사정',
          usage:
            '事情、都合。그럴 사정이 안 되다 は「そうできる事情・都合ではない」という意味。'
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
            '本文の中心は、一般に月曜日がつらいと思われている一方、研究では木曜日のほうが疲労を強く感じやすいと確認された、という対比。したがって①が本文全体を最もよく表す。②は内容が広すぎ、③の「風邪との比較」は本文になく、④は「木曜日に休もう」という主張ではない。',
      learning_blocks: [
        {
          form: '월요병 / 목요병',
          usage:
            '本文では「月曜病」という一般的なイメージと、木曜日の疲労感を対比している。タイトル選択ではこの対比が中心情報。'
        },
        {
          form: '무기력에 빠지다',
          usage:
            '「無気力に陥る」。疲労がたまった結果として述べられている。'
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


function h3ReadingP9P10Explanation_(
  locked,
  item
) {
  var binding =
    String(
      locked &&
      locked.source_binding_sha256 ||
      ''
    );
  var spec =
    H3_READING_P9_P10_EXPLANATION_OVERLAY_V1_[
      binding
    ];

  if (
    !spec ||
    !locked ||
    !locked.passage ||
    locked.section_key !==
      spec.section_key ||
    locked.source_batch_id !==
      spec.source_batch_id ||
    locked.passage.passage_id !==
      spec.passage_id ||
    locked.passage.passage_sha256 !==
      spec.passage_sha256 ||
    !item ||
    item.passage_id !==
      spec.passage_id ||
    item.passage_sha256 !==
      spec.passage_sha256
  ) {
    throw new Error(
      'READING_P9P10_EXPLANATION_SOURCE_BINDING_INVALID'
    );
  }

  var itemSpec =
    spec.items[
      String(item.item_id || '')
    ];

  if (
    !itemSpec ||
    item.item_sha256 !==
      itemSpec.item_sha256 ||
    item.skill_id !==
      itemSpec.skill_id
  ) {
    throw new Error(
      'READING_P9P10_EXPLANATION_ITEM_MISMATCH:' +
        String(item.item_id || '')
    );
  }

  return {
    schema:
      'H3_READING_EXPLANATION_V1',
    contract_id:
      H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_,
    source_binding_sha256:
      binding,
    passage_sha256:
      item.passage_sha256,
    item_sha256:
      item.item_sha256,
    provenance_mode:
      'SOURCE_LINKED_AUTHORED',
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
      itemSpec.explanation.reason,
    learning_blocks:
      JSON.parse(
        JSON.stringify(
          itemSpec.explanation
            .learning_blocks
        )
      )
  };
}


function h3ReadingExplanationForItem_(
  locked,
  item
) {
  if (
    locked &&
    locked.section_key === 'H3-P8'
  ) {
    return h3ReadingP8Explanation_(
      locked,
      item
    );
  }

  return h3ReadingP9P10Explanation_(
    locked,
    item
  );
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

  var explanation =
    h3ReadingExplanationForItem_(
      locked,
      item
    );

  h3ReviewExplanationStyleValidateAuthoring_(
    explanation,
    [
      item.choices_ko[
        Number(
          result.correct_answer
        ) - 1
      ]
    ],
    'READING_FUTURE:' +
      String(item.item_id || '')
  );

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
      explanation,
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
