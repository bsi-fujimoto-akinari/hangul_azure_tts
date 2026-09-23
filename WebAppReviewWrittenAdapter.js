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
  var entries =
    h3WrittenReviewAllHistoryEntries_(
      spreadsheet
    ).slice();

  if (
    typeof h3SurfaceReviewHistoryEntries_ ===
      'function'
  ) {
    entries = entries.concat(
      h3SurfaceReviewHistoryEntries_(
        spreadsheet,
        'READING'
      ),
      h3SurfaceReviewHistoryEntries_(
        spreadsheet,
        'TRANSLATION'
      )
    );
  }

  return entries;
}


function h3WrittenReviewAttach5WAudio_(
  payload
) {
  if (
    !payload ||
    payload.mode !== 'REVIEW' ||
    payload.kind !== 'WRITTEN' ||
    !payload.set_id ||
    !Array.isArray(payload.sections) ||
    payload.sections.length !== 5
  ) {
    throw new Error(
      'WRITTEN_REVIEW_AUDIO_PAYLOAD_INVALID'
    );
  }

  var out =
    h3WrittenReviewClone_(payload);
  out.surface_family = '5W';

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var bindings =
    h3ReviewAudioBindingResolveAll_(
      spreadsheet,
      out
    );

  if (
    bindings.length !==
    out.sections.length
  ) {
    throw new Error(
      'WRITTEN_REVIEW_AUDIO_BINDING_COUNT'
    );
  }

  bindings.forEach(
    function (binding) {
      if (
        binding.target !== 'SECTION' ||
        !Number.isInteger(
          binding.target_index
        ) ||
        binding.target_index < 0 ||
        binding.target_index >=
          out.sections.length
      ) {
        throw new Error(
          'WRITTEN_REVIEW_AUDIO_TARGET_INVALID'
        );
      }

      var section =
        out.sections[
          binding.target_index
        ];

      if (
        !section ||
        String(section.section || '') !==
          binding.slot_key
      ) {
        throw new Error(
          'WRITTEN_REVIEW_AUDIO_SLOT_MISMATCH:' +
            binding.slot_key
        );
      }

      section.audio_asset_key =
        binding.asset_key;
      section.audio_fallback_url =
        binding.audio_url;
    }
  );

  out.review_audio_binding_contract_id =
    H3_REVIEW_AUDIO_BINDING_CONTRACT_ID_;

  return out;
}


function h3WrittenReviewMedia_(
  request
) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_MEDIA_REQUEST_V1' ||
    request.mode !== 'REVIEW' ||
    request.review_kind !== 'WRITTEN' ||
    request.surface_family !== '5W' ||
    !request.set_id ||
    !request.asset_key ||
    request.txn_id ||
    request.legacy_review_id
  ) {
    throw new Error(
      'WRITTEN_REVIEW_AUDIO_MEDIA_REQUEST_INVALID'
    );
  }

  var setId =
    String(request.set_id);
  var assetKey =
    String(request.asset_key);

  var review =
    getWrittenPersistentReviewPayload_({
      schema:
        'H3_WEB_RENDER_REQUEST_V1',
      mode: 'REVIEW',
      review_kind: 'WRITTEN',
      surface_family: '5W',
      set_id: setId,
      txn_id: null,
      legacy_review_id: null
    });
  var bindingPayload =
    h3WrittenReviewClone_(review);
  bindingPayload.surface_family =
    '5W';

  var expected =
    h3ReviewAudioExpectedBindings_(
      bindingPayload
    ).filter(
      function (binding) {
        return (
          binding.slot_key ===
          assetKey
        );
      }
    );

  if (expected.length !== 1) {
    throw new Error(
      'WRITTEN_REVIEW_AUDIO_ASSET_NOT_ALLOWED:' +
        assetKey
    );
  }

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var binding =
    h3ReviewAudioBindingResolve_(
      spreadsheet,
      '5W',
      setId,
      assetKey
    );

  if (
    binding.asset_key !==
      expected[0].asset_key ||
    binding.set_id !== setId ||
    binding.sidecar_family !== '5W'
  ) {
    throw new Error(
      'WRITTEN_REVIEW_AUDIO_BINDING_MISMATCH:' +
        assetKey
    );
  }

  var media =
    h3DriveDataUri_(
      binding.audio_file_id,
      'audio/mpeg',
      null,
      8 * 1024 * 1024
    );

  return {
    schema:
      'H3_WEB_MEDIA_V1',
    mode: 'REVIEW',
    read_only: true,
    provider_kind: 'WRITTEN',
    surface_family: '5W',
    set_id: setId,
    asset_key: assetKey,
    data_uri:
      media.data_uri,
    mime_type:
      media.mime_type,
    size_bytes:
      media.size_bytes,
    trim_start_ms: 0,
    fallback_url:
      binding.audio_url,
    review_audio_binding_contract_id:
      H3_REVIEW_AUDIO_BINDING_CONTRACT_ID_
  };
}


function h3WrittenReviewOpen_(request) {
  var surfaceFamily = String(
    request &&
    request.surface_family ||
    ''
  );

  if (
    surfaceFamily === 'READING' ||
    surfaceFamily === 'TRANSLATION'
  ) {
    if (
      typeof h3SurfaceReviewOpen_ !==
        'function'
    ) {
      throw new Error(
        'SURFACE_REVIEW_BRIDGE_UNAVAILABLE'
      );
    }
    if (
      surfaceFamily === 'TRANSLATION' &&
      typeof h3SurfaceReviewOpenForLearner_ ===
        'function'
    ) {
      return h3SurfaceReviewOpenForLearner_(
        request
      );
    }

    return h3SurfaceReviewOpen_(request);
  }

  if (
    surfaceFamily &&
    surfaceFamily !== '5W'
  ) {
    throw new Error(
      'WRITTEN_REVIEW_SURFACE_FAMILY_INVALID'
    );
  }

  if (
    request &&
    request.materialized_record
  ) {
    return h3WrittenReviewProjectHistorical_(
      request.materialized_record
    );
  }

  return h3WrittenReviewAttach5WAudio_(
    getWrittenPersistentReviewPayload_(
      request
    )
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
  var candidates = [];

  if (
    typeof h3WrittenCurrentLearning_ ===
      'function'
  ) {
    var written =
      h3WrittenCurrentLearning_(
        spreadsheet
      );
    if (written) {
      candidates.push(written);
    }
  }

  if (
    typeof h3ReadingCurrentLearning_ ===
      'function'
  ) {
    var reading =
      h3ReadingCurrentLearning_(
        spreadsheet
      );
    if (reading) {
      candidates.push(reading);
    }
  }

  if (
    typeof h3TranslationCurrentLearning_ ===
      'function'
  ) {
    var translation =
      h3TranslationCurrentLearning_(
        spreadsheet
      );
    if (translation) {
      candidates.push(translation);
    }
  }

  if (
    typeof h3TranslationV2CurrentLearning_ ===
      'function'
  ) {
    var translationV2 =
      h3TranslationV2CurrentLearning_(
        spreadsheet
      );
    if (translationV2) {
      candidates.push(translationV2);
    }
  }

  if (candidates.length > 1) {
    throw new Error(
      'WRITTEN_SURFACE_CURRENT_AMBIGUOUS'
    );
  }

  return candidates.length
    ? candidates[0]
    : null;
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
      h3WrittenReviewMedia_,
    openReplay:
      h3WrittenReviewUnavailable_,
    openReplayMedia:
      h3WrittenReviewUnavailable_,
    gradeReplay:
      h3WrittenReviewUnavailable_
  };
}
