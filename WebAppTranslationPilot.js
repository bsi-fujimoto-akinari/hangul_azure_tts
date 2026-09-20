/**
 * H3 Translation P11/P12 repository-only pilot.
 *
 * No live route, Sheet, learner state, Review, or HOME mutation.
 */

var H3_TRANSLATION_PILOT_CONTRACT_ID_ =
  'H3-TRANSLATION-P11P12-PILOT-20260921-V1';

var H3_TRANSLATION_SOURCE_SCHEMA_ =
  'H3_TRANSLATION_SOURCE_BUNDLE_V1';

var H3_TRANSLATION_LOCKED_SCHEMA_ =
  'H3_TRANSLATION_LOCKED_BUNDLE_V1';

var H3_TRANSLATION_RENDER_SCHEMA_ =
  'H3_WEB_TRANSLATION_SET_V1';


function h3TranslationCanonicalize_(
  value
) {
  if (Array.isArray(value)) {
    return value.map(
      h3TranslationCanonicalize_
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
          h3TranslationCanonicalize_(
            value[key]
          );
      });
    return out;
  }

  return value;
}


function h3TranslationCanonicalJson_(
  value
) {
  return JSON.stringify(
    h3TranslationCanonicalize_(
      value
    )
  );
}


function h3TranslationHash_(
  value
) {
  if (typeof hash_ !== 'function') {
    throw new Error(
      'TRANSLATION_HASH_HELPER_MISSING'
    );
  }

  return hash_(
    h3TranslationCanonicalJson_(
      value
    )
  );
}


function h3TranslationRequireString_(
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


function h3TranslationDirectionForSection_(
  sectionKey
) {
  if (
    sectionKey === 'H3-P11'
  ) {
    return 'KR_TO_JP';
  }

  if (
    sectionKey === 'H3-P12'
  ) {
    return 'JP_TO_KR';
  }

  throw new Error(
    'TRANSLATION_SECTION_INVALID'
  );
}


function h3TranslationLanguageContract_(
  direction
) {
  if (direction === 'KR_TO_JP') {
    return {
      source_language: 'KO',
      choice_language: 'JA'
    };
  }

  if (direction === 'JP_TO_KR') {
    return {
      source_language: 'JA',
      choice_language: 'KO'
    };
  }

  throw new Error(
    'TRANSLATION_DIRECTION_INVALID'
  );
}


function h3TranslationValidateSourceBundle_(
  source
) {
  if (
    !source ||
    source.schema !==
      H3_TRANSLATION_SOURCE_SCHEMA_ ||
    source.provider_kind !==
      'WRITTEN' ||
    source.surface_family !==
      'TRANSLATION' ||
    source.level !== '3級' ||
    source.answer_type !==
      'MULTIPLE_CHOICE'
  ) {
    throw new Error(
      'TRANSLATION_SOURCE_SCOPE_INVALID'
    );
  }

  var expectedDirection =
    h3TranslationDirectionForSection_(
      source.section_key
    );

  if (
    source.translation_direction !==
      expectedDirection
  ) {
    throw new Error(
      'TRANSLATION_DIRECTION_SECTION_MISMATCH'
    );
  }

  var languages =
    h3TranslationLanguageContract_(
      source.translation_direction
    );

  if (
    source.source_language !==
      languages.source_language ||
    source.choice_language !==
      languages.choice_language
  ) {
    throw new Error(
      'TRANSLATION_LANGUAGE_CONTRACT_MISMATCH'
    );
  }

  if (
    !Array.isArray(source.items) ||
    source.items.length !== 2
  ) {
    throw new Error(
      'TRANSLATION_PILOT_ITEM_COUNT_INVALID'
    );
  }

  var expectedSection =
    source.section_key.replace(
      'H3-',
      ''
    );
  var seenItem = {};
  var seenQuestion = {};

  source.items.forEach(
    function (item, index) {
      if (
        !item ||
        Number(item.q_no) !==
          index + 1 ||
        String(item.section || '') !==
          expectedSection ||
        item.translation_direction !==
          source.translation_direction ||
        item.answer_type !==
          'MULTIPLE_CHOICE'
      ) {
        throw new Error(
          'TRANSLATION_ITEM_SCOPE_INVALID'
        );
      }

      [
        'item_id',
        'question_key',
        'site_item_id',
        'skill_id',
        'target_segment',
        'question_text'
      ].forEach(function (field) {
        h3TranslationRequireString_(
          item[field],
          'TRANSLATION_ITEM_FIELD_MISSING:' +
            field
        );
      });

      if (
        seenItem[item.item_id] ||
        seenQuestion[
          item.question_key
        ]
      ) {
        throw new Error(
          'TRANSLATION_ITEM_ID_DUPLICATE'
        );
      }
      seenItem[item.item_id] = true;
      seenQuestion[
        item.question_key
      ] = true;

      if (
        !Array.isArray(item.choices) ||
        item.choices.length !== 4
      ) {
        throw new Error(
          'TRANSLATION_CHOICES_INVALID'
        );
      }

      item.choices.forEach(
        function (choice) {
          if (!String(choice || '')) {
            throw new Error(
              'TRANSLATION_CHOICE_EMPTY'
            );
          }
        }
      );

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
          'TRANSLATION_ANSWER_INVALID'
        );
      }

      if (
        !/^H3-P(?:11|12)-SK\d+$/
          .test(
            String(item.skill_id)
          )
      ) {
        throw new Error(
          'TRANSLATION_SKILL_SCOPE_INVALID'
        );
      }
    }
  );

  return true;
}


function h3TranslationLockBundle_(
  source
) {
  h3TranslationValidateSourceBundle_(
    source
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
          translation_direction:
            item.translation_direction,
          answer_type:
            item.answer_type,
          target_segment:
            item.target_segment,
          question_text:
            item.question_text,
          choices:
            item.choices,
          correct_answer_position:
            Number(
              item.correct_answer_position
            )
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
                String(item.section)
                  .slice(1) +
                '／翻訳'
              )
            ),
          skill_id:
            item.skill_id,
          translation_direction:
            item.translation_direction,
          answer_type:
            item.answer_type,
          target_segment:
            item.target_segment,
          question_text:
            item.question_text,
          choices:
            item.choices.slice(),
          correct_answer_position:
            Number(
              item.correct_answer_position
            ),
          item_sha256:
            h3TranslationHash_(
              hashObject
            )
        };
      }
    );

  var binding = {
    contract_id:
      H3_TRANSLATION_PILOT_CONTRACT_ID_,
    provider_kind:
      source.provider_kind,
    surface_family:
      source.surface_family,
    level:
      source.level,
    section_key:
      source.section_key,
    translation_direction:
      source.translation_direction,
    answer_type:
      source.answer_type,
    source_language:
      source.source_language,
    choice_language:
      source.choice_language,
    site_group_id:
      String(
        source.site_group_id
      ),
    item_ids:
      items.map(function (item) {
        return item.item_id;
      }),
    item_sha256:
      items.map(function (item) {
        return item.item_sha256;
      }),
    source_batch_id:
      source.source_batch_id
  };

  return {
    schema:
      H3_TRANSLATION_LOCKED_SCHEMA_,
    contract_id:
      H3_TRANSLATION_PILOT_CONTRACT_ID_,
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    level:
      source.level,
    section_key:
      source.section_key,
    translation_direction:
      source.translation_direction,
    answer_type:
      source.answer_type,
    source_language:
      source.source_language,
    choice_language:
      source.choice_language,
    site_group_id:
      String(
        source.site_group_id
      ),
    source_batch_id:
      source.source_batch_id,
    source_file:
      source.source_file,
    items:
      items,
    source_binding_sha256:
      h3TranslationHash_(
        binding
      )
  };
}


function h3TranslationBuildRenderPayload_(
  locked,
  setId
) {
  if (
    !locked ||
    locked.schema !==
      H3_TRANSLATION_LOCKED_SCHEMA_
  ) {
    throw new Error(
      'TRANSLATION_LOCKED_BUNDLE_INVALID'
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
          translation_direction:
            item.translation_direction,
          answer_type:
            item.answer_type,
          target_segment:
            item.target_segment,
          question_text:
            item.question_text,
          choice_ids:
            [1, 2, 3, 4],
          visible_choices:
            item.choices.slice(),
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
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    level:
      locked.level,
    item_count:
      questions.length
  };

  h3LearningSurfaceValidate_(
    surface,
    questions
  );

  return {
    schema:
      H3_TRANSLATION_RENDER_SCHEMA_,
    mode:
      'WRITTEN',
    nonlearning:
      false,
    persisted:
      false,
    pilot_only:
      true,
    set_id:
      String(
        setId ||
        (
          'TRANSLATION-PILOT-' +
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
    translation_direction:
      locked.translation_direction,
    answer_type:
      locked.answer_type,
    source_language:
      locked.source_language,
    choice_language:
      locked.choice_language,
    source_binding_sha256:
      locked.source_binding_sha256,
    questions:
      questions,
    transport: {
      audio: 'NONE',
      image: 'NONE',
      review:
        'TRANSLATION_PILOT_NOT_ACTIVE'
    }
  };
}


function h3TranslationGrade_(
  locked,
  answers
) {
  if (
    !locked ||
    locked.schema !==
      H3_TRANSLATION_LOCKED_SCHEMA_ ||
    !Array.isArray(answers) ||
    answers.length !==
      locked.items.length
  ) {
    throw new Error(
      'TRANSLATION_GRADE_INPUT_INVALID'
    );
  }

  var byKey = {};
  answers.forEach(function (answer) {
    var key =
      h3TranslationRequireString_(
        answer &&
          answer.question_key,
        'TRANSLATION_GRADE_QUESTION_KEY_MISSING'
      );

    if (byKey[key]) {
      throw new Error(
        'TRANSLATION_GRADE_QUESTION_KEY_DUPLICATE'
      );
    }

    var position =
      Number(answer.answer);
    if (
      !Number.isInteger(position) ||
      position < 1 ||
      position > 4 ||
      typeof answer.uncertain !==
        'boolean'
    ) {
      throw new Error(
        'TRANSLATION_GRADE_ANSWER_INVALID'
      );
    }

    byKey[key] = {
      answer:
        position,
      uncertain:
        answer.uncertain
    };
  });

  var score = 0;
  var graded =
    locked.items.map(
      function (item) {
        var answer =
          byKey[
            item.question_key
          ];

        if (!answer) {
          throw new Error(
            'TRANSLATION_GRADE_QUESTION_MISSING:' +
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
          translation_direction:
            item.translation_direction,
          answer_type:
            item.answer_type,
          answer:
            answer.answer,
          correct_answer:
            item.correct_answer_position,
          uncertain:
            answer.uncertain,
          correct:
            correct,
          mark:
            mark
        };
      }
    );

  return {
    schema:
      'H3_TRANSLATION_GRADE_V1',
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    level:
      locked.level,
    section_key:
      locked.section_key,
    translation_direction:
      locked.translation_direction,
    answer_type:
      locked.answer_type,
    score:
      score,
    total:
      graded.length,
    graded:
      graded
  };
}


function h3TranslationBuildRetestEvents_(
  grade
) {
  if (
    !grade ||
    grade.schema !==
      'H3_TRANSLATION_GRADE_V1'
  ) {
    throw new Error(
      'TRANSLATION_RETEST_GRADE_INVALID'
    );
  }

  return grade.graded
    .filter(function (item) {
      return item.mark !== '○';
    })
    .map(function (item) {
      return {
        schema:
          'H3_TRANSLATION_RETEST_EVENT_V1',
        provider_kind:
          'WRITTEN',
        surface_family:
          'TRANSLATION',
        level:
          grade.level,
        section_key:
          grade.section_key,
        translation_direction:
          item.translation_direction,
        answer_type:
          item.answer_type,
        item_id:
          item.item_id,
        question_key:
          item.question_key,
        skill_id:
          item.skill_id,
        result:
          item.mark
      };
    });
}
