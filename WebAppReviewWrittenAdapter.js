/**
 * Repository-only Written Review adapter.
 *
 * This file projects an already materialized historical reconstruction
 * record into the provider-neutral Review shape. It does not load storage,
 * register the provider, expose HOME history, or enable replay/submission.
 */

var H3_WRITTEN_REVIEW_SOURCE_MODES_ = [
  'WRITTEN_QUEUE_LEGACY',
  'WRITTEN_QUEUE_WITH_GENERATION_LOG'
];

var H3_WRITTEN_REVIEW_SOURCE_SCHEMAS_ = [
  'H3_5W_HISTORICAL_RECONSTRUCTION_V1',
  'H3_5W_HISTORICAL_RECONSTRUCTION_V2'
];


function h3WrittenReviewClone_(value) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return h3WrittenReviewClone_(
        item
      );
    });
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    var out = {};
    Object.keys(value).forEach(
      function (key) {
        out[key] =
          h3WrittenReviewClone_(
            value[key]
          );
      }
    );
    return out;
  }

  return value;
}


function h3WrittenReviewHas_(value, key) {
  return Object.prototype
    .hasOwnProperty.call(
      value,
      key
    );
}


function h3WrittenReviewValidateRecord_(
  record
) {
  if (
    !record ||
    typeof record !== 'object' ||
    Array.isArray(record)
  ) {
    throw new Error(
      'WRITTEN_REVIEW_RECORD_REQUIRED'
    );
  }

  if (
    H3_WRITTEN_REVIEW_SOURCE_SCHEMAS_
      .indexOf(record.schema) < 0
  ) {
    throw new Error(
      'WRITTEN_REVIEW_SOURCE_SCHEMA_INVALID'
    );
  }

  if (
    H3_WRITTEN_REVIEW_SOURCE_MODES_
      .indexOf(record.source_mode) < 0
  ) {
    throw new Error(
      'WRITTEN_REVIEW_SOURCE_MODE_INVALID'
    );
  }

  if (!String(record.set_id || '')) {
    throw new Error(
      'WRITTEN_REVIEW_SET_ID_REQUIRED'
    );
  }

  [
    'answered_at',
    'raw_input'
  ].forEach(function (field) {
    if (
      !h3WrittenReviewHas_(
        record,
        field
      )
    ) {
      throw new Error(
        'WRITTEN_REVIEW_FIELD_MISSING:' +
          field
      );
    }
  });

  if (
    !Number.isInteger(record.score) ||
    !Number.isInteger(record.total) ||
    record.total !== 5 ||
    record.score < 0 ||
    record.score > record.total
  ) {
    throw new Error(
      'WRITTEN_REVIEW_SCORE_INVALID'
    );
  }

  if (
    !Array.isArray(record.questions) ||
    record.questions.length !== 5
  ) {
    throw new Error(
      'WRITTEN_REVIEW_QUESTION_COUNT_INVALID'
    );
  }

  var recomputedScore = 0;
  record.questions.forEach(
    function (question, index) {
      if (
        !question ||
        typeof question !== 'object' ||
        Array.isArray(question) ||
        question.q_no !== index + 1
      ) {
        throw new Error(
          'WRITTEN_REVIEW_QUESTION_ORDER_INVALID'
        );
      }

      [
        'question_surface',
        'user_answer',
        'correct_answer',
        'mark',
        'explicit_uncertainty'
      ].forEach(function (field) {
        if (
          !h3WrittenReviewHas_(
            question,
            field
          )
        ) {
          throw new Error(
            'WRITTEN_REVIEW_FIELD_MISSING:' +
              field
          );
        }
      });

      if (
        ['○', '△', '×']
          .indexOf(question.mark) < 0
      ) {
        throw new Error(
          'WRITTEN_REVIEW_MARK_INVALID'
        );
      }

      if (
        question.explicit_uncertainty !==
          true &&
        question.explicit_uncertainty !==
          false &&
        question.explicit_uncertainty !==
          'UNKNOWN'
      ) {
        throw new Error(
          'WRITTEN_REVIEW_UNCERTAINTY_INVALID'
        );
      }

      if (
        question.mark === '○' ||
        question.mark === '△'
      ) {
        recomputedScore += 1;
      }
    }
  );

  if (recomputedScore !== record.score) {
    throw new Error(
      'WRITTEN_REVIEW_SCORE_MARK_MISMATCH'
    );
  }
}


function h3WrittenReviewProjectHistorical_(
  record
) {
  h3WrittenReviewValidateRecord_(
    record
  );

  var questions =
    h3WrittenReviewClone_(
      record.questions
    );
  var uncertaintyKnown = true;
  var uncertainCount = 0;
  var wrongCount = 0;

  questions.forEach(function (question) {
    if (
      question.explicit_uncertainty ===
        'UNKNOWN'
    ) {
      uncertaintyKnown = false;
    } else if (
      question.explicit_uncertainty ===
        true
    ) {
      uncertainCount += 1;
    }

    if (question.mark === '×') {
      wrongCount += 1;
    }
  });

  return {
    schema:
      'H3_REVIEW_WRITTEN_PROJECTION_V1',
    mode: 'REVIEW',
    kind: 'WRITTEN',
    read_only: true,
    source_schema: record.schema,
    source_mode: record.source_mode,
    set_id: record.set_id,
    answered_at: record.answered_at,
    raw_input: record.raw_input,
    score: record.score,
    total: record.total,
    wrong_count: wrongCount,
    uncertainty_known:
      uncertaintyKnown,
    uncertain_count:
      uncertaintyKnown
        ? uncertainCount
        : null,
    review_locator: {
      type: 'written_set_id',
      value: record.set_id
    },
    replay_capability:
      'unavailable',
    questions: questions
  };
}


function h3WrittenReviewPersistentHistory_(
  spreadsheet
) {
  return h3WrittenReviewAllHistoryEntries_(
    spreadsheet
  );
}


function h3WrittenReviewOpen_(request) {
  if (
    request &&
    request.materialized_record
  ) {
    return h3WrittenReviewProjectHistorical_(
      request.materialized_record
    );
  }

  return getWrittenPersistentReviewPayload_(
    request
  );
}


function h3WrittenReviewUnavailable_() {
  throw new Error(
    'WRITTEN_REVIEW_CAPABILITY_UNAVAILABLE'
  );
}


function h3WrittenReviewCurrentLearning_(
  spreadsheet
) {
  if (
    typeof h3WrittenCurrentLearning_ !==
      'function'
  ) {
    return null;
  }

  return h3WrittenCurrentLearning_(
    spreadsheet
  );
}


function h3WrittenReviewProvider_() {
  return {
    kind: 'WRITTEN',
    order: 1,
    historyEntries:
      h3WrittenReviewPersistentHistory_,
    currentLearning:
      h3WrittenReviewCurrentLearning_,
    openReview:
      h3WrittenReviewOpen_,
    openMedia:
      h3WrittenReviewUnavailable_,
    openReplay:
      h3WrittenReviewUnavailable_,
    openReplayMedia:
      h3WrittenReviewUnavailable_,
    gradeReplay:
      h3WrittenReviewUnavailable_
  };
}
