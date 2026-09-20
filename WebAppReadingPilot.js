/**
 * H3 Reading P8 pilot contract.
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
    source.section_key !== 'H3-P8'
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

  source.items.forEach(
    function (item, index) {
      if (
        !item ||
        Number(item.q_no) !==
          index + 1 ||
        String(item.section || '') !==
          'P8'
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
        !String(item.skill_id)
          .startsWith('H3-P8-SK')
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
              '筆8／読解'
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
    section_key: 'H3-P8',
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
    section_key: 'H3-P8',
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
        'READING-PILOT-H3-P8'
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
