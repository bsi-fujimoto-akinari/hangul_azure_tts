/**
 * Review / HOME common core.
 *
 * This file owns only provider-neutral primitives, history aggregation,
 * current-learning arbitration, and request dispatch. Listening and
 * historical Written Review are active providers; explicit request routing
 * keeps Listening transaction identities unambiguous.
 */

function h3ReviewWrittenProviderFactory_() {
  return h3WrittenReviewProvider_();
}


var H3_REVIEW_WRITTEN_PROVIDER_FACTORY_ =
  h3ReviewWrittenProviderFactory_;


function h3ReviewCanonicalizeValue_(
  value
) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return h3ReviewCanonicalizeValue_(
        item
      );
    });
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    var out = {};
    Object.keys(value)
      .sort()
      .forEach(function (key) {
        out[key] =
          h3ReviewCanonicalizeValue_(
            value[key]
          );
      });
    return out;
  }

  return value;
}


function h3ReviewCanonicalJson_(value) {
  return JSON.stringify(
    h3ReviewCanonicalizeValue_(value)
  );
}


function h3ReviewHash_(value) {
  return hash_(
    h3ReviewCanonicalJson_(value)
  );
}


function h3ReviewRequireExactHeader_(
  sheet,
  expected,
  code
) {
  if (!sheet) {
    throw new Error(code + '_SHEET_MISSING');
  }

  var actual = sheet
    .getRange(1, 1, 1, expected.length)
    .getDisplayValues()[0];

  if (
    JSON.stringify(actual) !==
    JSON.stringify(expected)
  ) {
    throw new Error(
      code + '_HEADER_MISMATCH'
    );
  }
}


function h3ReviewTable_(sheet) {
  return h3ProdSheetRows_(sheet);
}


var H3_REVIEW_AUDIO_BINDING_CONTRACT_ID_ =
  'H3-REVIEW-AUDIO-BINDING-20260923-V1';
var H3_REVIEW_AUDIO_BINDING_SHEET_ =
  'review_audio_asset_v1';
var H3_REVIEW_AUDIO_BINDING_SCHEMA_ =
  'H3_REVIEW_AUDIO_ASSET_V1';
var H3_REVIEW_AUDIO_BINDING_GENERATOR_ =
  'review-audio-v2-1200ms';
var H3_REVIEW_AUDIO_BINDING_HEADERS_ = [
  'SCHEMA',
  'SURFACE_FAMILY',
  'SET_ID',
  'SLOT_KEY',
  'SOURCE_REF_JSON',
  'SELECTION_JSON',
  'AUDIO_TEXT',
  'AUDIO_TEXT_SHA256',
  'VOICE_ASSIGNMENT_JSON',
  'AUDIO_FILE_ID',
  'AUDIO_URL',
  'DRIVE_FOLDER_ID',
  'STATUS',
  'CREATED_AT',
  'UPDATED_AT',
  'ERROR',
  'GENERATOR_VERSION'
];
var H3_REVIEW_AUDIO_BINDING_FOLDERS_ = {
  '5W': '1dLf1KhHic8SU-4XOGueZSM55vznS024C',
  '2R': '18V3zOrKRhIgTCL_McrXjWDu6OIZupNn5',
  '2T': '1zRCRDdP3G6tpkyGHU619xYUf0dW1UsUv'
};


function h3ReviewAudioSidecarFamily_(surfaceFamily) {
  var family = String(surfaceFamily || '');
  var map = {
    '5W': '5W',
    'READING': '2R',
    'TRANSLATION': '2T'
  };
  var sidecar = map[family];

  if (!sidecar) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_SURFACE_UNSUPPORTED:' +
        family
    );
  }

  return sidecar;
}


function h3ReviewAudioValidateSlot_(
  sidecarFamily,
  slotKey
) {
  var family = String(sidecarFamily || '');
  var slot = String(slotKey || '');
  var valid = false;

  if (family === '5W') {
    valid = [
      'D2', 'D3', 'D4', 'D5', 'D6'
    ].indexOf(slot) >= 0;
  } else if (family === '2R') {
    valid = [
      'PASSAGE_COMPLETE',
      'Q1_CHOICES',
      'Q2_CHOICES'
    ].indexOf(slot) >= 0;
  } else if (family === '2T') {
    valid =
      /^(?:P11|P12)_Q[12]$/.test(
        slot
      );
  }

  if (!valid) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_SLOT_INVALID:' +
        family + ':' + slot
    );
  }

  return slot;
}


function h3ReviewAudioQuestionNo_(
  question,
  label
) {
  var qNo = Number(
    question && question.q_no
  );

  if (
    !Number.isInteger(qNo) ||
    qNo < 1 ||
    qNo > 2
  ) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_QNO_INVALID:' +
        label
    );
  }

  return qNo;
}


function h3ReviewAudioExpectedBindings_(payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    !payload.set_id
  ) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_PAYLOAD_INVALID'
    );
  }

  var surfaceFamily = String(
    payload.surface_family || ''
  );
  var sidecarFamily =
    h3ReviewAudioSidecarFamily_(
      surfaceFamily
    );
  var out = [];

  if (surfaceFamily === '5W') {
    if (
      !Array.isArray(payload.sections) ||
      payload.sections.length !== 5
    ) {
      throw new Error(
        'REVIEW_AUDIO_BINDING_5W_SECTION_COUNT'
      );
    }

    payload.sections.forEach(
      function (section, index) {
        var slot =
          h3ReviewAudioValidateSlot_(
            sidecarFamily,
            section && section.section
          );

        out.push({
          target: 'SECTION',
          target_index: index,
          q_no: index + 1,
          slot_key: slot
        });
      }
    );
  } else if (
    surfaceFamily === 'READING'
  ) {
    if (
      !payload.passage ||
      !Array.isArray(payload.questions) ||
      payload.questions.length !== 2
    ) {
      throw new Error(
        'REVIEW_AUDIO_BINDING_READING_SHAPE'
      );
    }

    out.push({
      target: 'PASSAGE',
      target_index: null,
      q_no: null,
      slot_key: 'PASSAGE_COMPLETE'
    });

    payload.questions.forEach(
      function (question, index) {
        var qNo =
          h3ReviewAudioQuestionNo_(
            question,
            'READING'
          );

        out.push({
          target: 'QUESTION_CHOICES',
          target_index: index,
          q_no: qNo,
          slot_key:
            h3ReviewAudioValidateSlot_(
              sidecarFamily,
              'Q' + qNo + '_CHOICES'
            )
        });
      }
    );
  } else if (
    surfaceFamily === 'TRANSLATION'
  ) {
    if (
      !Array.isArray(payload.questions) ||
      payload.questions.length !== 2
    ) {
      throw new Error(
        'REVIEW_AUDIO_BINDING_TRANSLATION_SHAPE'
      );
    }

    payload.questions.forEach(
      function (question, index) {
        var qNo =
          h3ReviewAudioQuestionNo_(
            question,
            'TRANSLATION'
          );
        var section = String(
          question &&
          (
            question.section ||
            question.section_key
          ) ||
          ''
        ).replace(/^H3-/, '');

        if (
          section !== 'P11' &&
          section !== 'P12'
        ) {
          throw new Error(
            'REVIEW_AUDIO_BINDING_TRANSLATION_SECTION:' +
              section
          );
        }

        out.push({
          target: 'QUESTION',
          target_index: index,
          q_no: qNo,
          slot_key:
            h3ReviewAudioValidateSlot_(
              sidecarFamily,
              section + '_Q' + qNo
            )
        });
      }
    );
  }

  var seen = {};
  out.forEach(function (binding) {
    if (seen[binding.slot_key]) {
      throw new Error(
        'REVIEW_AUDIO_BINDING_EXPECTED_DUPLICATE:' +
          binding.slot_key
      );
    }

    seen[binding.slot_key] = true;
    binding.surface_family =
      surfaceFamily;
    binding.sidecar_family =
      sidecarFamily;
    binding.set_id =
      String(payload.set_id);
    binding.asset_key =
      binding.slot_key;
  });

  return out;
}


function h3ReviewAudioBindingTable_(
  spreadsheet
) {
  var sheet = spreadsheet.getSheetByName(
    H3_REVIEW_AUDIO_BINDING_SHEET_
  );

  if (!sheet) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_SHEET_MISSING'
    );
  }

  var table = h3ReviewTable_(sheet);

  if (
    JSON.stringify(table.header) !==
    JSON.stringify(
      H3_REVIEW_AUDIO_BINDING_HEADERS_
    )
  ) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_HEADER_MISMATCH'
    );
  }

  return table;
}


function h3ReviewAudioParseJsonField_(
  value,
  code
) {
  try {
    return JSON.parse(
      String(value || '')
    );
  } catch (_err) {
    throw new Error(code);
  }
}


function h3ReviewAudioBindingResolve_(
  spreadsheet,
  surfaceFamily,
  setId,
  slotKey
) {
  var family =
    h3ReviewAudioSidecarFamily_(
      surfaceFamily
    );
  var normalizedSetId =
    String(setId || '');
  var slot =
    h3ReviewAudioValidateSlot_(
      family,
      slotKey
    );

  if (!normalizedSetId) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_SET_ID_MISSING'
    );
  }

  var table =
    h3ReviewAudioBindingTable_(
      spreadsheet
    );
  var matches = table.rows.filter(
    function (row) {
      return (
        String(
          row[
            table.map.SURFACE_FAMILY
          ] || ''
        ) === family &&
        String(
          row[table.map.SET_ID] || ''
        ) === normalizedSetId &&
        String(
          row[table.map.SLOT_KEY] || ''
        ) === slot
      );
    }
  );

  if (matches.length !== 1) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_COUNT:' +
        family + ':' +
        normalizedSetId + ':' +
        slot + ':' +
        matches.length
    );
  }

  var row = matches[0];
  var get = function (name) {
    return String(
      row[table.map[name]] || ''
    );
  };

  if (
    get('SCHEMA') !==
      H3_REVIEW_AUDIO_BINDING_SCHEMA_ ||
    get('STATUS') !== 'DONE' ||
    get('ERROR') ||
    get('GENERATOR_VERSION') !==
      H3_REVIEW_AUDIO_BINDING_GENERATOR_ ||
    get('DRIVE_FOLDER_ID') !==
      H3_REVIEW_AUDIO_BINDING_FOLDERS_[
        family
      ] ||
    !get('AUDIO_FILE_ID') ||
    !get('AUDIO_URL') ||
    !/^[0-9a-f]{64}$/.test(
      get('AUDIO_TEXT_SHA256')
    )
  ) {
    throw new Error(
      'REVIEW_AUDIO_BINDING_ROW_INVALID:' +
        family + ':' +
        normalizedSetId + ':' +
        slot
    );
  }

  var sourceRef =
    h3ReviewAudioParseJsonField_(
      get('SOURCE_REF_JSON'),
      'REVIEW_AUDIO_BINDING_SOURCE_REF_INVALID'
    );
  var selection =
    h3ReviewAudioParseJsonField_(
      get('SELECTION_JSON'),
      'REVIEW_AUDIO_BINDING_SELECTION_INVALID'
    );

  h3ReviewAudioParseJsonField_(
    get('VOICE_ASSIGNMENT_JSON'),
    'REVIEW_AUDIO_BINDING_VOICE_INVALID'
  );

  return {
    schema:
      'H3_REVIEW_AUDIO_BINDING_V1',
    contract_id:
      H3_REVIEW_AUDIO_BINDING_CONTRACT_ID_,
    read_only: true,
    surface_family:
      String(surfaceFamily),
    sidecar_family: family,
    set_id: normalizedSetId,
    slot_key: slot,
    asset_key: slot,
    source_ref: sourceRef,
    selection: selection,
    audio_text_sha256:
      get('AUDIO_TEXT_SHA256'),
    audio_file_id:
      get('AUDIO_FILE_ID'),
    audio_url:
      get('AUDIO_URL'),
    drive_folder_id:
      get('DRIVE_FOLDER_ID'),
    generator_version:
      get('GENERATOR_VERSION')
  };
}


function h3ReviewAudioBindingResolveAll_(
  spreadsheet,
  payload
) {
  return h3ReviewAudioExpectedBindings_(
    payload
  ).map(function (expected) {
    var resolved =
      h3ReviewAudioBindingResolve_(
        spreadsheet,
        expected.surface_family,
        expected.set_id,
        expected.slot_key
      );

    resolved.target =
      expected.target;
    resolved.target_index =
      expected.target_index;
    resolved.q_no =
      expected.q_no;

    return resolved;
  });
}


function h3ReviewAudioApply5WBindings_(
  payload,
  bindings
) {
  if (
    !payload ||
    payload.mode !== 'REVIEW' ||
    payload.kind !== 'WRITTEN' ||
    !payload.set_id ||
    !Array.isArray(payload.sections) ||
    payload.sections.length !== 5 ||
    !Array.isArray(bindings) ||
    bindings.length !== 5
  ) {
    throw new Error(
      'REVIEW_AUDIO_5W_PROJECTION_INVALID'
    );
  }

  var out =
    JSON.parse(
      JSON.stringify(payload)
    );
  out.surface_family = '5W';

  var seen = {};
  bindings.forEach(
    function (binding) {
      if (
        !binding ||
        binding.target !== 'SECTION' ||
        !Number.isInteger(
          binding.target_index
        ) ||
        binding.target_index < 0 ||
        binding.target_index >=
          out.sections.length ||
        binding.surface_family !== '5W' ||
        binding.sidecar_family !== '5W' ||
        binding.set_id !==
          String(payload.set_id) ||
        !binding.slot_key ||
        binding.asset_key !==
          binding.slot_key ||
        !binding.audio_url
      ) {
        throw new Error(
          'REVIEW_AUDIO_5W_BINDING_INVALID'
        );
      }

      if (seen[binding.slot_key]) {
        throw new Error(
          'REVIEW_AUDIO_5W_BINDING_DUPLICATE:' +
            binding.slot_key
        );
      }
      seen[binding.slot_key] = true;

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
          'REVIEW_AUDIO_5W_SLOT_MISMATCH:' +
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


function h3ReviewAudioApplyReadingBindings_(
  payload,
  bindings
) {
  if (
    !payload ||
    payload.mode !== 'REVIEW' ||
    payload.kind !== 'WRITTEN' ||
    payload.surface_family !== 'READING' ||
    !payload.set_id ||
    !payload.passage ||
    !Array.isArray(payload.questions) ||
    payload.questions.length !== 2 ||
    !Array.isArray(payload.sections) ||
    payload.sections.length !== 2 ||
    !Array.isArray(bindings) ||
    bindings.length !== 3
  ) {
    throw new Error(
      'REVIEW_AUDIO_2R_PROJECTION_INVALID'
    );
  }

  var out =
    JSON.parse(
      JSON.stringify(payload)
    );
  var seen = {};
  var passageCount = 0;
  var questionCount = 0;

  bindings.forEach(
    function (binding) {
      if (
        !binding ||
        binding.surface_family !==
          'READING' ||
        binding.sidecar_family !== '2R' ||
        binding.set_id !==
          String(payload.set_id) ||
        !binding.slot_key ||
        binding.asset_key !==
          binding.slot_key ||
        !binding.audio_url
      ) {
        throw new Error(
          'REVIEW_AUDIO_2R_BINDING_INVALID'
        );
      }

      if (seen[binding.slot_key]) {
        throw new Error(
          'REVIEW_AUDIO_2R_BINDING_DUPLICATE:' +
            binding.slot_key
        );
      }
      seen[binding.slot_key] = true;

      if (binding.target === 'PASSAGE') {
        if (
          binding.slot_key !==
            'PASSAGE_COMPLETE' ||
          binding.target_index !== null ||
          binding.q_no !== null
        ) {
          throw new Error(
            'REVIEW_AUDIO_2R_PASSAGE_BINDING_INVALID'
          );
        }

        out.passage.audio_asset_key =
          binding.asset_key;
        out.passage.audio_fallback_url =
          binding.audio_url;
        passageCount += 1;
        return;
      }

      if (
        binding.target !==
          'QUESTION_CHOICES' ||
        !Number.isInteger(
          binding.target_index
        ) ||
        binding.target_index < 0 ||
        binding.target_index >=
          out.sections.length ||
        !Number.isInteger(
          binding.q_no
        ) ||
        (
          binding.q_no !== 1 &&
          binding.q_no !== 2
        ) ||
        binding.slot_key !==
          (
            'Q' +
            binding.q_no +
            '_CHOICES'
          )
      ) {
        throw new Error(
          'REVIEW_AUDIO_2R_QUESTION_BINDING_INVALID'
        );
      }

      var question =
        out.questions[
          binding.target_index
        ];
      var section =
        out.sections[
          binding.target_index
        ];

      if (
        !question ||
        !section ||
        Number(question.q_no) !==
          binding.q_no ||
        (
          question.item_id &&
          section.item_id &&
          String(question.item_id) !==
            String(section.item_id)
        )
      ) {
        throw new Error(
          'REVIEW_AUDIO_2R_QUESTION_TARGET_MISMATCH:' +
            binding.slot_key
        );
      }

      section.audio_asset_key =
        binding.asset_key;
      section.audio_fallback_url =
        binding.audio_url;
      questionCount += 1;
    }
  );

  if (
    passageCount !== 1 ||
    questionCount !== 2 ||
    !seen.PASSAGE_COMPLETE ||
    !seen.Q1_CHOICES ||
    !seen.Q2_CHOICES
  ) {
    throw new Error(
      'REVIEW_AUDIO_2R_BINDING_CARDINALITY'
    );
  }

  out.review_audio_binding_contract_id =
    H3_REVIEW_AUDIO_BINDING_CONTRACT_ID_;

  return out;
}


function h3ReviewAudioApplyTranslationBindings_(
  payload,
  bindings
) {
  if (
    !payload ||
    payload.mode !== 'REVIEW' ||
    payload.kind !== 'WRITTEN' ||
    payload.surface_family !== 'TRANSLATION' ||
    !payload.set_id ||
    !Array.isArray(payload.questions) ||
    payload.questions.length !== 2 ||
    !Array.isArray(bindings) ||
    bindings.length !== 2
  ) {
    throw new Error(
      'REVIEW_AUDIO_2T_PROJECTION_INVALID'
    );
  }

  var out =
    JSON.parse(
      JSON.stringify(payload)
    );
  var seen = {};
  var questionCount = 0;

  bindings.forEach(
    function (binding) {
      if (
        !binding ||
        binding.target !== 'QUESTION' ||
        binding.surface_family !==
          'TRANSLATION' ||
        binding.sidecar_family !== '2T' ||
        binding.set_id !==
          String(payload.set_id) ||
        !Number.isInteger(
          binding.target_index
        ) ||
        binding.target_index < 0 ||
        binding.target_index >=
          out.questions.length ||
        !Number.isInteger(
          binding.q_no
        ) ||
        (
          binding.q_no !== 1 &&
          binding.q_no !== 2
        ) ||
        !binding.slot_key ||
        binding.asset_key !==
          binding.slot_key ||
        !binding.audio_url
      ) {
        throw new Error(
          'REVIEW_AUDIO_2T_BINDING_INVALID'
        );
      }

      if (seen[binding.slot_key]) {
        throw new Error(
          'REVIEW_AUDIO_2T_BINDING_DUPLICATE:' +
            binding.slot_key
        );
      }
      seen[binding.slot_key] = true;

      var question =
        out.questions[
          binding.target_index
        ];
      var qNo =
        Number(
          question &&
          question.q_no
        );
      var section =
        String(
          question &&
          (
            question.section ||
            question.section_key
          ) ||
          ''
        ).replace(/^H3-/, '');
      var expectedSlot =
        section + '_Q' + qNo;

      if (
        !question ||
        (
          section !== 'P11' &&
          section !== 'P12'
        ) ||
        qNo !== binding.q_no ||
        expectedSlot !==
          binding.slot_key
      ) {
        throw new Error(
          'REVIEW_AUDIO_2T_QUESTION_TARGET_MISMATCH:' +
            binding.slot_key
        );
      }

      question.audio_asset_key =
        binding.asset_key;
      question.audio_fallback_url =
        binding.audio_url;
      questionCount += 1;
    }
  );

  if (questionCount !== 2) {
    throw new Error(
      'REVIEW_AUDIO_2T_BINDING_CARDINALITY'
    );
  }

  out.review_audio_binding_contract_id =
    H3_REVIEW_AUDIO_BINDING_CONTRACT_ID_;

  return out;
}


function h3ReviewProviders_() {
  var providers = [
    h3ListeningReviewProvider_()
  ];

  if (
    typeof
      H3_REVIEW_WRITTEN_PROVIDER_FACTORY_ ===
      'function'
  ) {
    providers.push(
      H3_REVIEW_WRITTEN_PROVIDER_FACTORY_()
    );
  }

  providers.forEach(
    function (provider) {
      if (
        !provider ||
        !provider.kind ||
        typeof provider.historyEntries !==
          'function' ||
        typeof provider.currentLearning !==
          'function' ||
        typeof provider.openReview !==
          'function' ||
        typeof provider.openMedia !==
          'function' ||
        typeof provider.openReplay !==
          'function' ||
        typeof provider.openReplayMedia !==
          'function' ||
        typeof provider.gradeReplay !==
          'function'
      ) {
        throw new Error(
          'REVIEW_PROVIDER_CONTRACT_INVALID'
        );
      }
    }
  );

  return providers;
}


function h3ReviewProviderForRequest_(
  request
) {
  var providers =
    h3ReviewProviders_();

  var explicitKind = String(
    request &&
    request.review_kind ||
    ''
  );
  var hasListeningIdentity = Boolean(
    request &&
    (
      request.txn_id ||
      request.legacy_review_id
    )
  );

  if (
    explicitKind &&
    hasListeningIdentity &&
    explicitKind !== 'LISTENING'
  ) {
    throw new Error(
      'REVIEW_PROVIDER_SELECTOR_CONFLICT'
    );
  }

  if (explicitKind) {
    var explicitMatches =
      providers.filter(
        function (provider) {
          return provider.kind ===
            explicitKind;
        }
      );

    if (explicitMatches.length === 1) {
      return explicitMatches[0];
    }

    if (!explicitMatches.length) {
      throw new Error(
        'REVIEW_PROVIDER_KIND_INVALID'
      );
    }

    throw new Error(
      'REVIEW_PROVIDER_ROUTE_AMBIGUOUS'
    );
  }

  if (hasListeningIdentity) {
    var listeningMatches =
      providers.filter(
        function (provider) {
          return provider.kind ===
            'LISTENING';
        }
      );

    if (listeningMatches.length === 1) {
      return listeningMatches[0];
    }

    throw new Error(
      'REVIEW_PROVIDER_ROUTE_AMBIGUOUS'
    );
  }

  if (providers.length !== 1) {
    throw new Error(
      'REVIEW_PROVIDER_ROUTE_AMBIGUOUS'
    );
  }

  return providers[0];
}


function h3ReviewSurfaceMetadata_(
  kind,
  surfaceFamily,
  level
) {
  var normalizedKind =
    String(kind || '');
  var normalizedFamily =
    String(surfaceFamily || '');
  var normalizedLevel =
    String(level || '');

  if (
    ['LISTENING', 'WRITTEN']
      .indexOf(normalizedKind) < 0
  ) {
    throw new Error(
      'REVIEW_SURFACE_PROVIDER_INVALID'
    );
  }

  if (!normalizedFamily) {
    normalizedFamily =
      normalizedKind === 'LISTENING'
        ? '5L'
        : '5W';
  }

  if (!normalizedLevel) {
    normalizedLevel = '3級';
  }

  if (
    ['5L', '5W', 'READING', 'TRANSLATION']
      .indexOf(normalizedFamily) < 0
  ) {
    throw new Error(
      'REVIEW_SURFACE_FAMILY_INVALID'
    );
  }

  if (
    ['3級', '準2級']
      .indexOf(normalizedLevel) < 0
  ) {
    throw new Error(
      'REVIEW_SURFACE_LEVEL_INVALID'
    );
  }

  if (
    normalizedKind === 'LISTENING' &&
    normalizedFamily !== '5L'
  ) {
    throw new Error(
      'REVIEW_SURFACE_PROVIDER_FAMILY_MISMATCH'
    );
  }

  if (
    normalizedKind === 'WRITTEN' &&
    normalizedFamily === '5L'
  ) {
    throw new Error(
      'REVIEW_SURFACE_PROVIDER_FAMILY_MISMATCH'
    );
  }

  return {
    learning_surface_schema:
      'H3_LEARNING_SURFACE_V1',
    provider_kind:
      normalizedKind,
    surface_family:
      normalizedFamily,
    level:
      normalizedLevel
  };
}



function h3ReviewAttachSurfaceMetadata_(
  provider,
  payload
) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error(
      'REVIEW_SURFACE_PAYLOAD_INVALID'
    );
  }

  var metadata =
    h3ReviewSurfaceMetadata_(
      provider && provider.kind,
      payload.surface_family,
      payload.level
    );

  payload.learning_surface_schema =
    metadata.learning_surface_schema;
  payload.provider_kind =
    metadata.provider_kind;

  if (
    payload.kind &&
    String(payload.kind) !==
      metadata.provider_kind
  ) {
    throw new Error(
      'REVIEW_SURFACE_KIND_MISMATCH'
    );
  }
  payload.kind =
    metadata.provider_kind;

  payload.surface_family =
    metadata.surface_family;
  payload.level =
    metadata.level;

  if (
    Array.isArray(payload.sections)
  ) {
    payload.item_count =
      payload.sections.length;
  } else if (
    Array.isArray(payload.questions)
  ) {
    payload.item_count =
      payload.questions.length;
  }

  if (
    typeof h3ReviewExplanationStyleApplyPayload_ ===
      'function'
  ) {
    return h3ReviewExplanationStyleApplyPayload_(
      payload
    );
  }

  return payload;
}


function h3ReviewHistoryEnvelope_(
  provider,
  entry
) {
  var timestamp = String(
    entry.committed_at ||
    entry.answered_at ||
    ''
  );

  /**
   * Preserve the existing HOME surface: legacy entries expose answered_at
   * and the derived committed_at field used by the common ordering logic.
   */
  if (
    !entry.committed_at &&
    entry.answered_at
  ) {
    entry.committed_at =
      entry.answered_at;
  }

  var surface =
    h3ReviewSurfaceMetadata_(
      provider.kind,
      entry.surface_family,
      entry.level
    );

  entry.provider_kind =
    surface.provider_kind;
  entry.surface_family =
    surface.surface_family;
  entry.level =
    surface.level;

  return {
    kind: provider.kind,
    surface_family:
      surface.surface_family,
    level:
      surface.level,
    set_id: String(
      entry.set_id || ''
    ),
    set_no: Number(
      entry.listening_set_no || 0
    ),
    answered_at: timestamp,
    score: Number(
      entry.score || 0
    ),
    total: Number(
      entry.total || 0
    ),
    wrong_count: Number(
      entry.wrong_count || 0
    ),
    uncertainty:
      entry.uncertain_count,
    review_source_id:
      entry.txn_id ||
      entry.legacy_review_id ||
      null,
    source_mode:
      entry.source_mode || null,
    entry: entry
  };
}



var H3_REVIEW_LEVEL_CONTRACT_ =
  'H3_REVIEW_PRIORITY_V4';

var H3_REVIEW_LEVEL_HALF_LIFE_DAYS_ =
  14;

var H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_ =
  0.40;

var H3_REVIEW_COOLDOWN_CAP_START_ =
  10;

var H3_REVIEW_COOLDOWN_CAP_24H_ =
  25;

var H3_REVIEW_COOLDOWN_CAP_HOURS_ =
  24;

var H3_REVIEW_COOLDOWN_RECOVERY_HOURS_ =
  96;

var H3_REVIEW_PRIORITY_ITEM_MAX_ =
  20;

var H3_REVIEW_PRIORITY_EXAM_BLEND_ =
  0.50;

var H3_REVIEW_PRIORITY_UNIFORM_SHARE_ =
  0.25;

var H3_REVIEW_PRIORITY_EXAM_SHARE_ = {
  '5L': 0.40,
  '5W': 0.36,
  'READING': 0.12,
  'TRANSLATION': 0.12
};

var H3_REVIEW_PRIORITY_MAX_BLEND_SHARE_ =
  (
    (
      1 -
      H3_REVIEW_PRIORITY_EXAM_BLEND_
    ) *
    H3_REVIEW_PRIORITY_UNIFORM_SHARE_
  ) +
  (
    H3_REVIEW_PRIORITY_EXAM_BLEND_ *
    H3_REVIEW_PRIORITY_EXAM_SHARE_[
      '5L'
    ]
  );

var H3_REVIEW_HOME_INDEX_SHEET_ =
  'review_home_index_v1';

var H3_REVIEW_HOME_INDEX_HEADERS_V1_ = [
  'KIND',
  'SET_ID',
  'SET_NO',
  'ANSWERED_AT',
  'SCORE',
  'TOTAL',
  'WRONG_COUNT',
  'UNCERTAINTY_KNOWN',
  'UNCERTAIN_COUNT',
  'BASE_PRIORITY',
  'REVIEW_SOURCE_ID',
  'SOURCE_MODE',
  'STATUS'
];

var H3_REVIEW_HOME_INDEX_HEADERS_V2_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V1_
    .concat([
      'SURFACE_FAMILY',
      'LEVEL'
    ]);

var H3_REVIEW_HOME_INDEX_HEADERS_V3_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V2_
    .concat([
      'LAST_REVIEWED_AT'
    ]);

var H3_REVIEW_HOME_INDEX_HEADERS_V4_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V3_
    .concat([
      'LAST_REVIEW_COMPLETION_KEY'
    ]);

var H3_REVIEW_HOME_INDEX_HEADERS_V5_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V4_
    .concat([
      'PRIORITY_STATE_JSON'
    ]);

var H3_REVIEW_HOME_INDEX_HEADERS_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V5_;


function h3ReviewNormalizeLevel_(
  value
) {
  var normalized =
    String(value || '3級')
      .trim();

  if (
    normalized === '3級' ||
    normalized === '3급'
  ) {
    return '3級';
  }

  if (
    normalized === '準2級' ||
    normalized === '준2급'
  ) {
    return '準2級';
  }

  throw new Error(
    'REVIEW_EVIDENCE_LEVEL_INVALID'
  );
}


function h3ReviewSkillEvidenceIndex_(
  spreadsheet,
  setAnsweredAtById
) {
  var bySet = {};
  var bySkill = {};
  var writtenSetSeen = {};
  var answeredAtBySet =
    setAnsweredAtById || {};

  function add(
    kind,
    level,
    setId,
    skillId,
    result,
    includeWrittenSet,
    answeredAt,
    surfaceKey
  ) {
    var normalizedResult =
      String(result || '');
    if (
      ['○', '△', '×'].indexOf(
        normalizedResult
      ) < 0
    ) {
      return;
    }

    var normalizedSetId =
      String(setId || '');
    if (!normalizedSetId) {
      return;
    }

    var normalizedLevel =
      h3ReviewNormalizeLevel_(
        level
      );
    var normalizedSkillId =
      String(skillId || '');
    var normalizedAnsweredAt =
      String(
        answeredAt ||
        answeredAtBySet[
          normalizedSetId
        ] ||
        ''
      );
    var normalizedSurfaceKey =
      String(
        surfaceKey ||
        (
          normalizedSetId +
          '|' +
          normalizedSkillId
        )
      );

    var setKey =
      kind + '|' +
      normalizedLevel + '|' +
      normalizedSetId;
    if (!bySet[setKey]) {
      bySet[setKey] = [];
    }

    var item = {
      skill_id:
        normalizedSkillId,
      result:
        normalizedResult,
      answered_at:
        normalizedAnsweredAt,
      surface_key:
        normalizedSurfaceKey,
      set_id:
        normalizedSetId
    };
    bySet[setKey].push(item);

    if (
      kind === 'WRITTEN' &&
      includeWrittenSet === true
    ) {
      writtenSetSeen[
        normalizedSetId
      ] = true;
    }

    if (!normalizedSkillId) {
      return;
    }

    var skillKey =
      kind + '|' +
      normalizedLevel + '|' +
      normalizedSkillId;
    if (!bySkill[skillKey]) {
      bySkill[skillKey] = {
        wrong: 0,
        uncertain: 0,
        correct: 0,
        events: []
      };
    }

    if (
      normalizedResult === '×'
    ) {
      bySkill[skillKey].wrong += 1;
    } else if (
      normalizedResult === '△'
    ) {
      bySkill[skillKey]
        .uncertain += 1;
    } else {
      bySkill[skillKey]
        .correct += 1;
    }

    bySkill[skillKey].events.push(
      item
    );
  }

  function rowLevel(
    table,
    row
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        table.map,
        'LEVEL'
      )
    ) {
      return h3ReviewNormalizeLevel_(
        row[table.map.LEVEL] ||
        '3級'
      );
    }
    return '3級';
  }

  function rowSurfaceKey(
    table,
    row,
    setId,
    skillId
  ) {
    var candidates = [
      'SURFACE_HASH',
      'QUESTION_KEY',
      'ITEM_ID',
      'PASSAGE_SHA256'
    ];

    for (
      var i = 0;
      i < candidates.length;
      i += 1
    ) {
      var name = candidates[i];
      if (
        Object.prototype
          .hasOwnProperty.call(
            table.map,
            name
          )
      ) {
        var value =
          String(
            row[table.map[name]] ||
            ''
          );
        if (value) {
          return name + ':' + value;
        }
      }
    }

    return (
      String(setId || '') +
      '|' +
      String(skillId || '')
    );
  }

  function rowAnsweredAt(
    table,
    row,
    setId
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        table.map,
        'ANSWERED_AT'
      )
    ) {
      var value =
        String(
          row[
            table.map.ANSWERED_AT
          ] || ''
        );
      if (value) {
        return value;
      }
    }

    return String(
      answeredAtBySet[
        String(setId || '')
      ] || ''
    );
  }

  function surfaceStageLevels(
    stageSheetName
  ) {
    var stageSheet =
      spreadsheet.getSheetByName(
        stageSheetName
      );
    var levels = {};

    if (!stageSheet) {
      return levels;
    }

    var stage =
      h3ReviewTable_(
        stageSheet
      );
    h3ProdRequireColumns_(
      stage,
      [
        'SET_ID',
        'STATUS',
        'LEVEL'
      ],
      stageSheetName
    );

    stage.rows.forEach(
      function (row) {
        var setId =
          String(
            row[stage.map.SET_ID] ||
            ''
          );
        if (
          !setId ||
          String(
            row[stage.map.STATUS] ||
            ''
          ) !== 'COMMITTED'
        ) {
          return;
        }

        if (
          Object.prototype
            .hasOwnProperty.call(
              levels,
              setId
            )
        ) {
          throw new Error(
            'REVIEW_EVIDENCE_STAGE_DUPLICATE:' +
              stageSheetName +
              ':' +
              setId
          );
        }

        levels[setId] =
          h3ReviewNormalizeLevel_(
            row[stage.map.LEVEL] ||
            '3級'
          );
      }
    );

    return levels;
  }

  function addSurfaceEvidence(
    stageSheetName,
    logSheetName
  ) {
    var levels =
      surfaceStageLevels(
        stageSheetName
      );
    var logSheet =
      spreadsheet.getSheetByName(
        logSheetName
      );

    if (!logSheet) {
      return;
    }

    var log =
      h3ReviewTable_(
        logSheet
      );
    h3ProdRequireColumns_(
      log,
      [
        'SET_ID',
        'SKILL_ID',
        'RESULT',
        'ANSWERED_AT'
      ],
      logSheetName
    );

    log.rows.forEach(
      function (row) {
        var setId =
          String(
            row[log.map.SET_ID] ||
            ''
          );
        if (
          !setId ||
          !Object.prototype
            .hasOwnProperty.call(
              levels,
              setId
            )
        ) {
          return;
        }

        var skillId =
          row[log.map.SKILL_ID];

        add(
          'WRITTEN',
          levels[setId],
          setId,
          skillId,
          row[log.map.RESULT],
          false,
          rowAnsweredAt(
            log,
            row,
            setId
          ),
          rowSurfaceKey(
            log,
            row,
            setId,
            skillId
          )
        );
      }
    );
  }

  var listeningSheet =
    spreadsheet.getSheetByName(
      'listening_log_v1'
    );
  if (listeningSheet) {
    var listening =
      h3ReviewTable_(
        listeningSheet
      );
    h3ProdRequireColumns_(
      listening,
      [
        'PARENT_SET_ID',
        'SKILL_ID',
        'STATUS',
        'USER_RESULT',
        'ANSWERED_AT',
        'SURFACE_HASH'
      ],
      'listening_log_v1'
    );

    listening.rows.forEach(
      function (row) {
        if (
          String(
            row[
              listening.map.STATUS
            ] || ''
          ) !== 'VALID'
        ) {
          return;
        }

        var setId =
          String(
            row[
              listening.map
                .PARENT_SET_ID
            ] || ''
          );
        var skillId =
          row[
            listening.map.SKILL_ID
          ];

        add(
          'LISTENING',
          rowLevel(
            listening,
            row
          ),
          setId,
          skillId,
          row[
            listening.map
              .USER_RESULT
          ],
          false,
          rowAnsweredAt(
            listening,
            row,
            setId
          ),
          rowSurfaceKey(
            listening,
            row,
            setId,
            skillId
          )
        );
      }
    );
  }

  var writtenSheet =
    spreadsheet.getSheetByName(
      'generation_log_v1'
    );
  if (writtenSheet) {
    var written =
      h3ReviewTable_(
        writtenSheet
      );
    h3ProdRequireColumns_(
      written,
      [
        'SET_ID',
        'SKILL_ID',
        'STATUS',
        'USER_RESULT',
        'ANSWERED_AT',
        'SURFACE_HASH'
      ],
      'generation_log_v1'
    );

    written.rows.forEach(
      function (row) {
        var setId = String(
          row[
            written.map.SET_ID
          ] || ''
        );

        if (
          setId &&
          String(
            row[
              written.map.STATUS
            ] || ''
          ) === 'ANSWERED'
        ) {
          writtenSetSeen[setId] =
            true;
        }

        if (
          String(
            row[
              written.map.STATUS
            ] || ''
          ) !== 'ANSWERED'
        ) {
          return;
        }

        var skillId =
          row[
            written.map.SKILL_ID
          ];

        add(
          'WRITTEN',
          rowLevel(
            written,
            row
          ),
          setId,
          skillId,
          row[
            written.map.USER_RESULT
          ],
          true,
          rowAnsweredAt(
            written,
            row,
            setId
          ),
          rowSurfaceKey(
            written,
            row,
            setId,
            skillId
          )
        );
      }
    );
  }

  addSurfaceEvidence(
    'reading_stage_v1',
    'reading_log_v1'
  );
  addSurfaceEvidence(
    'translation_stage_v1',
    'translation_log_v1'
  );
  addSurfaceEvidence(
    'translation_stage_v2',
    'translation_log_v2'
  );

  return {
    bySet: bySet,
    bySkill: bySkill,
    written_set_ids:
      Object.keys(
        writtenSetSeen
      ).sort()
  };
}

function h3ReviewPrioritySurfaceFamily_(
  kind,
  entry
) {
  var family =
    String(
      entry &&
      entry.surface_family ||
      ''
    );

  if (!family) {
    family =
      kind === 'LISTENING'
        ? '5L'
        : '5W';
  }

  if (
    !Object.prototype
      .hasOwnProperty.call(
        H3_REVIEW_PRIORITY_EXAM_SHARE_,
        family
      )
  ) {
    throw new Error(
      'REVIEW_PRIORITY_SURFACE_INVALID:' +
        family
    );
  }

  return family;
}


function h3ReviewPrioritySurfaceFactor_(
  kind,
  entry
) {
  var family =
    h3ReviewPrioritySurfaceFamily_(
      kind,
      entry
    );
  var blendedShare =
    (
      (
        1 -
        H3_REVIEW_PRIORITY_EXAM_BLEND_
      ) *
      H3_REVIEW_PRIORITY_UNIFORM_SHARE_
    ) +
    (
      H3_REVIEW_PRIORITY_EXAM_BLEND_ *
      H3_REVIEW_PRIORITY_EXAM_SHARE_[
        family
      ]
    );

  return (
    blendedShare /
    H3_REVIEW_PRIORITY_MAX_BLEND_SHARE_
  );
}


function h3ReviewBaseLevelForEntry_(
  kind,
  entry,
  evidence
) {
  var entryLevel =
    h3ReviewNormalizeLevel_(
      entry.level || '3級'
    );
  var setKey =
    kind + '|' +
    entryLevel + '|' +
    String(entry.set_id || '');
  var items =
    evidence.bySet[setKey] ||
    [];
  var raw = 0;
  var itemCount = 0;

  if (items.length) {
    itemCount = items.length;

    items.forEach(
      function (item) {
        if (item.result === '×') {
          raw += 12;
        } else if (
          item.result === '△'
        ) {
          raw += 6;
        }

        if (item.skill_id) {
          var stats =
            evidence.bySkill[
              kind + '|' +
              entryLevel + '|' +
              item.skill_id
            ];

          if (stats) {
            raw += Math.min(
              8,
              (
                Number(
                  stats.wrong || 0
                ) * 2
              ) +
              Number(
                stats.uncertain || 0
              )
            );
          }
        }
      }
    );
  } else {
    itemCount =
      Math.max(
        0,
        Number(entry.total || 0)
      );

    raw +=
      Number(
        entry.wrong_count || 0
      ) * 12;

    if (
      entry.uncertainty_known !==
        false
    ) {
      raw +=
        Number(
          entry.uncertain_count || 0
        ) * 6;
    }
  }

  if (
    !Number.isFinite(itemCount) ||
    itemCount <= 0
  ) {
    return 0;
  }

  var normalizedWeakness =
    Math.max(
      0,
      Math.min(
        100,
        (
          raw /
          (
            H3_REVIEW_PRIORITY_ITEM_MAX_ *
            itemCount
          )
        ) *
        100
      )
    );

  var weighted =
    normalizedWeakness *
    h3ReviewPrioritySurfaceFactor_(
      kind,
      entry
    );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(weighted)
    )
  );
}



function h3ReviewResultWeakness_(
  result
) {
  if (result === '×') {
    return 1;
  }
  if (result === '△') {
    return 0.65;
  }
  if (result === '○') {
    return 0;
  }
  throw new Error(
    'REVIEW_PRIORITY_RESULT_INVALID:' +
      String(result || '')
  );
}


function h3ReviewPriorityStateForEntry_(
  kind,
  entry,
  evidence
) {
  var entryAnsweredMs =
    h3ReviewTimestampMs_(
      entry.answered_at
    );

  if (entryAnsweredMs === null) {
    throw new Error(
      'REVIEW_PRIORITY_ANSWERED_AT_REQUIRED:' +
        String(entry.set_id || '')
    );
  }

  var level =
    h3ReviewNormalizeLevel_(
      entry.level || '3級'
    );
  var setKey =
    kind + '|' +
    level + '|' +
    String(entry.set_id || '');
  var sourceItems =
    (
      evidence.bySet[setKey] ||
      []
    ).slice();

  var itemCount =
    Math.max(
      0,
      Number(entry.total || 0)
    );

  function syntheticItems_() {
    var out = [];
    var wrong =
      Math.min(
        itemCount,
        Math.max(
          0,
          Number(
            entry.wrong_count || 0
          )
        )
      );
    var remaining =
      Math.max(
        0,
        itemCount - wrong
      );
    var uncertain =
      entry.uncertainty_known
        ? Math.min(
            remaining,
            Math.max(
              0,
              Number(
                entry.uncertain_count || 0
              )
            )
          )
        : 0;

    for (
      var i = 0;
      i < wrong;
      i += 1
    ) {
      out.push({
        skill_id: '',
        result: '×',
        answered_at:
          entry.answered_at,
        surface_key:
          'SYNTHETIC_WRONG_' + i,
        set_id:
          entry.set_id
      });
    }

    for (
      var j = 0;
      j < uncertain;
      j += 1
    ) {
      out.push({
        skill_id: '',
        result: '△',
        answered_at:
          entry.answered_at,
        surface_key:
          'SYNTHETIC_UNCERTAIN_' +
          j,
        set_id:
          entry.set_id
      });
    }

    while (
      out.length < itemCount
    ) {
      out.push({
        skill_id: '',
        result: '○',
        answered_at:
          entry.answered_at,
        surface_key:
          'SYNTHETIC_CORRECT_' +
          out.length,
        set_id:
          entry.set_id
      });
    }

    return out;
  }

  if (!sourceItems.length) {
    sourceItems =
      syntheticItems_();
  } else if (
    itemCount > sourceItems.length
  ) {
    var supplement =
      syntheticItems_();

    while (
      sourceItems.length < itemCount &&
      supplement.length
    ) {
      sourceItems.push(
        supplement.shift()
      );
    }
  }

  if (!sourceItems.length) {
    return {
      schema:
        'H3_REVIEW_PRIORITY_STATE_V1',
      item_count: 0,
      base_level: 0,
      items: []
    };
  }

  var states =
    sourceItems.map(
      function (item, index) {
        var originMs =
          h3ReviewTimestampMs_(
            item.answered_at ||
            entry.answered_at
          );

        if (originMs === null) {
          throw new Error(
            'REVIEW_PRIORITY_ITEM_ANSWERED_AT_REQUIRED:' +
              entry.set_id +
              ':' +
              index
          );
        }

        var skillId =
          String(
            item.skill_id || ''
          );
        var originSurface =
          String(
            item.surface_key ||
            (
              entry.set_id +
              '|ITEM|' +
              index
            )
          );
        var weakness =
          h3ReviewResultWeakness_(
            item.result
          );
        var latestResult =
          String(item.result);
        var latestMs =
          originMs;
        var correctSpacedCount = 0;

        if (skillId) {
          var skillKey =
            kind + '|' +
            level + '|' +
            skillId;
          var stats =
            evidence.bySkill[
              skillKey
            ];
          var events =
            stats &&
            Array.isArray(
              stats.events
            )
              ? stats.events.slice()
              : [];

          events = events.map(
            function (event) {
              return {
                set_id:
                  String(
                    event.set_id || ''
                  ),
                result:
                  String(
                    event.result || ''
                  ),
                surface_key:
                  String(
                    event.surface_key ||
                    ''
                  ),
                answered_at:
                  String(
                    event.answered_at ||
                    ''
                  ),
                answered_ms:
                  h3ReviewTimestampMs_(
                    event.answered_at
                  )
              };
            }
          ).filter(
            function (event) {
              return (
                event.set_id &&
                event.set_id !==
                  String(entry.set_id) &&
                event.answered_ms !==
                  null &&
                event.answered_ms >
                  originMs &&
                event.surface_key &&
                event.surface_key !==
                  originSurface
              );
            }
          ).sort(
            function (a, b) {
              if (
                a.answered_ms !==
                b.answered_ms
              ) {
                return (
                  a.answered_ms -
                  b.answered_ms
                );
              }
              return (
                a.set_id +
                '|' +
                a.surface_key
              ).localeCompare(
                b.set_id +
                '|' +
                b.surface_key
              );
            }
          );

          var seenEvidence = {};

          events.forEach(
            function (event) {
              var evidenceKey =
                event.set_id +
                '|' +
                event.surface_key;

              if (
                seenEvidence[
                  evidenceKey
                ]
              ) {
                return;
              }
              seenEvidence[
                evidenceKey
              ] = true;

              if (
                event.result === '×'
              ) {
                weakness = 1;
                correctSpacedCount = 0;
              } else if (
                event.result === '△'
              ) {
                weakness = 0.65;
                correctSpacedCount = 0;
              } else if (
                event.result === '○'
              ) {
                if (weakness > 0) {
                  correctSpacedCount += 1;
                  weakness =
                    correctSpacedCount >= 2
                      ? 0.10
                      : 0.35;
                } else {
                  weakness = 0;
                }
              } else {
                return;
              }

              latestResult =
                event.result;
              latestMs =
                event.answered_ms;
            }
          );
        }

        return {
          skill_id: skillId,
          source_result:
            String(item.result),
          latest_result:
            latestResult,
          weakness:
            Math.round(
              weakness * 100
            ) / 100,
          correct_spaced_count:
            correctSpacedCount,
          evidence_at:
            new Date(
              latestMs
            ).toISOString(),
          source_surface_key:
            originSurface
        };
      }
    );

  var meanWeakness =
    states.reduce(
      function (sum, item) {
        return sum +
          Number(
            item.weakness || 0
          );
      },
      0
    ) / states.length;

  var base =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          meanWeakness *
          100 *
          h3ReviewPrioritySurfaceFactor_(
            kind,
            entry
          )
        )
      )
    );

  return {
    schema:
      'H3_REVIEW_PRIORITY_STATE_V1',
    item_count:
      states.length,
    base_level:
      base,
    items:
      states
  };
}


function h3ReviewPriorityStateParse_(
  value,
  setId
) {
  var text =
    String(value || '').trim();

  if (!text) {
    return null;
  }

  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      'REVIEW_PRIORITY_STATE_JSON_INVALID:' +
        String(setId || '')
    );
  }

  if (
    !parsed ||
    parsed.schema !==
      'H3_REVIEW_PRIORITY_STATE_V1' ||
    !Array.isArray(parsed.items) ||
    Number(parsed.item_count) !==
      parsed.items.length
  ) {
    throw new Error(
      'REVIEW_PRIORITY_STATE_SCHEMA_INVALID:' +
        String(setId || '')
    );
  }

  return parsed;
}


function h3ReviewDynamicLevelFromState_(
  base,
  state,
  nowMs
) {
  var normalizedBase =
    Math.max(
      0,
      Math.min(
        100,
        Number(base || 0)
      )
    );

  if (!state) {
    throw new Error(
      'REVIEW_PRIORITY_STATE_REQUIRED'
    );
  }

  if (
    Math.round(
      normalizedBase
    ) !==
      Math.round(
        Number(
          state.base_level || 0
        )
      )
  ) {
    throw new Error(
      'REVIEW_PRIORITY_STATE_BASE_MISMATCH'
    );
  }

  if (!state.items.length) {
    return {
      base:
        Math.round(
          normalizedBase
        ),
      age_days: 0,
      forgetting_pressure: 0,
      level:
        Math.round(
          normalizedBase
        )
    };
  }

  var totalAgeDays = 0;
  var totalPressure = 0;

  state.items.forEach(
    function (item) {
      var evidenceMs =
        h3ReviewTimestampMs_(
          item.evidence_at
        );

      if (evidenceMs === null) {
        throw new Error(
          'REVIEW_PRIORITY_STATE_EVIDENCE_AT_INVALID'
        );
      }

      var ageDays =
        Math.max(
          0,
          (
            Number(nowMs) -
            Number(evidenceMs)
          ) /
          86400000
        );
      var pressure =
        1 - Math.pow(
          2,
          -ageDays /
          H3_REVIEW_LEVEL_HALF_LIFE_DAYS_
        );

      totalAgeDays +=
        ageDays;
      totalPressure +=
        pressure;
    }
  );

  var meanAgeDays =
    totalAgeDays /
    state.items.length;
  var meanPressure =
    totalPressure /
    state.items.length;
  var level =
    normalizedBase +
    (
      (100 - normalizedBase) *
      H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_ *
      meanPressure
    );

  return {
    base:
      Math.round(
        normalizedBase
      ),
    age_days:
      Math.round(
        meanAgeDays * 10
      ) / 10,
    forgetting_pressure:
      Math.round(
        meanPressure * 1000
      ) / 1000,
    level:
      Math.max(
        0,
        Math.min(
          100,
          Math.round(level)
        )
      )
  };
}


function h3ReviewHomeIndexTable_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_REVIEW_HOME_INDEX_SHEET_
    );

  if (!sheet) {
    throw new Error(
      'REVIEW_HOME_INDEX_SHEET_MISSING'
    );
  }

  var table =
    h3ReviewTable_(sheet);

  var isV1 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V1_
    );
  var isV2 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V2_
    );
  var isV3 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V3_
    );
  var isV4 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V4_
    );
  var isV5 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V5_
    );

  if (
    !isV1 &&
    !isV2 &&
    !isV3 &&
    !isV4 &&
    !isV5
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_HEADER_MISMATCH'
    );
  }

  return {
    sheet: sheet,
    table: table,
    schema_version:
      isV5
        ? 'H3_REVIEW_HOME_INDEX_V5'
        : (
            isV4
              ? 'H3_REVIEW_HOME_INDEX_V4'
              : (
                  isV3
                    ? 'H3_REVIEW_HOME_INDEX_V3'
                    : (
                        isV2
                          ? 'H3_REVIEW_HOME_INDEX_V2'
                          : 'H3_REVIEW_HOME_INDEX_V1'
                      )
                )
          )
  };
}


function h3ReviewHomeIndexBoolean_(
  value
) {
  var text =
    String(value || '')
      .toUpperCase();

  if (text === 'TRUE') {
    return true;
  }
  if (text === 'FALSE') {
    return false;
  }

  throw new Error(
    'REVIEW_HOME_INDEX_BOOLEAN_INVALID'
  );
}


function h3ReviewHomeIndexRowEntry_(
  row,
  map
) {
  var kind =
    String(row[map.KIND] || '');
  var setId =
    String(row[map.SET_ID] || '');
  var setNo =
    Number(row[map.SET_NO] || 0);
  var status =
    String(row[map.STATUS] || '');

  if (
    ['LISTENING', 'WRITTEN']
      .indexOf(kind) < 0 ||
    !setId ||
    !Number.isInteger(setNo) ||
    setNo < 1 ||
    status !== 'ACTIVE'
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_ROW_INVALID:' +
        kind +
        ':' +
        setId
    );
  }

  var uncertaintyKnown =
    h3ReviewHomeIndexBoolean_(
      row[map.UNCERTAINTY_KNOWN]
    );
  var uncertainText =
    String(
      row[map.UNCERTAIN_COUNT] || ''
    );
  var uncertainCount =
    uncertaintyKnown
      ? Number(uncertainText || 0)
      : null;

  if (
    uncertaintyKnown &&
    (
      !Number.isInteger(
        uncertainCount
      ) ||
      uncertainCount < 0
    )
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_UNCERTAIN_INVALID:' +
        setId
    );
  }

  var surface =
    h3ReviewSurfaceMetadata_(
      kind,
      Object.prototype.hasOwnProperty.call(
        map,
        'SURFACE_FAMILY'
      )
        ? row[map.SURFACE_FAMILY]
        : '',
      Object.prototype.hasOwnProperty.call(
        map,
        'LEVEL'
      )
        ? row[map.LEVEL]
        : ''
    );

  var entry = {
    review_kind: kind,
    provider_kind:
      surface.provider_kind,
    surface_family:
      surface.surface_family,
    level:
      surface.level,
    set_id: setId,
    answered_at:
      String(
        row[map.ANSWERED_AT] ||
        'UNKNOWN'
      ),
    score:
      Number(row[map.SCORE] || 0),
    total:
      Number(row[map.TOTAL] || 0),
    wrong_count:
      Number(
        row[map.WRONG_COUNT] || 0
      ),
    uncertainty_known:
      uncertaintyKnown,
    uncertain_count:
      uncertainCount,
    needs_review:
      Number(
        row[map.WRONG_COUNT] || 0
      ) > 0 ||
      (
        uncertaintyKnown &&
        uncertainCount > 0
      ),
    replay_capability:
      'unavailable',
    source_mode:
      String(
        row[map.SOURCE_MODE] || ''
      ),
    review_open_validation:
      'FULL_SOURCE_LOCK_ON_OPEN',
    review_base_level:
      Number(
        row[map.BASE_PRIORITY] || 0
      ),
    last_reviewed_at:
      Object.prototype
        .hasOwnProperty.call(
          map,
          'LAST_REVIEWED_AT'
        )
        ? String(
            row[
              map.LAST_REVIEWED_AT
            ] || ''
          )
        : '',
    last_review_completion_key:
      Object.prototype
        .hasOwnProperty.call(
          map,
          'LAST_REVIEW_COMPLETION_KEY'
        )
        ? String(
            row[
              map.LAST_REVIEW_COMPLETION_KEY
            ] || ''
          )
        : '',
    priority_state_json:
      Object.prototype
        .hasOwnProperty.call(
          map,
          'PRIORITY_STATE_JSON'
        )
        ? String(
            row[
              map.PRIORITY_STATE_JSON
            ] || ''
          )
        : ''
  };

  if (
    entry.last_reviewed_at &&
    h3ReviewTimestampMs_(
      entry.last_reviewed_at
    ) === null
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_LAST_REVIEWED_AT_INVALID:' +
        setId
    );
  }

  var reviewSourceId =
    String(
      row[
        map.REVIEW_SOURCE_ID
      ] || ''
    );

  if (kind === 'LISTENING') {
    entry.listening_set_no =
      setNo;

    if (
      entry.source_mode ===
        'LEGACY_PRE_WEB'
    ) {
      entry.legacy_review_id =
        reviewSourceId;
    } else {
      entry.txn_id =
        reviewSourceId;
    }
  } else {
    entry.written_set_no =
      setNo;
    entry.family_set_no =
      setNo;

    if (
      entry.surface_family ===
        'READING'
    ) {
      entry.reading_set_no =
        setNo;
    } else if (
      entry.surface_family ===
        'TRANSLATION'
    ) {
      entry.translation_set_no =
        setNo;
    }
  }

  return entry;
}


function h3ReviewHomeIndexEnvelopes_(
  spreadsheet
) {
  var indexed =
    h3ReviewHomeIndexTable_(
      spreadsheet
    );
  var out = [];
  var seen = {};

  indexed.table.rows.forEach(
    function (row) {
      if (
        !String(
          row[
            indexed.table.map.SET_ID
          ] || ''
        )
      ) {
        return;
      }

      if (
        String(
          row[
            indexed.table.map.STATUS
          ] || ''
        ) !== 'ACTIVE'
      ) {
        return;
      }

      var entry =
        h3ReviewHomeIndexRowEntry_(
          row,
          indexed.table.map
        );
      if (
        entry.review_kind === 'WRITTEN' &&
        typeof h3WrittenReviewAnsweredAtBackfillRecord_ ===
          'function'
      ) {
        var answeredAtBackfill =
          h3WrittenReviewAnsweredAtBackfillRecord_(
            spreadsheet,
            entry.set_id,
            entry.answered_at
          );

        if (answeredAtBackfill) {
          entry.answered_at =
            answeredAtBackfill.answeredAt;
          entry.answered_at_precision =
            answeredAtBackfill.precision;
          entry.answered_at_evidence =
            answeredAtBackfill.evidence;
          entry.answered_at_note =
            answeredAtBackfill.note;
        }
      }

      var key =
        entry.review_kind +
        '|' +
        entry.set_id;

      if (seen[key]) {
        throw new Error(
          'REVIEW_HOME_INDEX_DUPLICATE:' +
            key
        );
      }
      seen[key] = true;

      out.push({
        kind:
          entry.review_kind,
        surface_family:
          entry.surface_family,
        level:
          entry.level,
        set_id:
          entry.set_id,
        set_no:
          Number(
            entry.listening_set_no ||
            entry.written_set_no ||
            0
          ),
        answered_at:
          entry.answered_at,
        review_source_id:
          entry.txn_id ||
          entry.legacy_review_id ||
          entry.set_id,
        source_mode:
          entry.source_mode,
        entry: entry
      });
    }
  );

  return out;
}


function h3ReviewTimestampMs_(
  value
) {
  var normalized =
    String(value || '').trim();

  if (
    !normalized ||
    normalized === 'UNKNOWN'
  ) {
    return null;
  }

  var parsed =
    Date.parse(normalized);

  return isNaN(parsed)
    ? null
    : parsed;
}


function h3ReviewNowMs_() {
  return new Date().getTime();
}


function h3ReviewOldestKnownTimestampMs_(
  envelopes
) {
  var known =
    envelopes.map(
      function (envelope) {
        return h3ReviewTimestampMs_(
          envelope.answered_at
        );
      }
    ).filter(
      function (value) {
        return value !== null;
      }
    );

  if (!known.length) {
    return null;
  }

  return Math.min.apply(
    null,
    known
  );
}


function h3ReviewLevelFromBase_(
  base,
  effectiveTimestampMs,
  nowMs
) {
  var normalizedBase =
    Math.max(
      0,
      Math.min(
        100,
        Number(base || 0)
      )
    );
  var ageDays =
    Math.max(
      0,
      (
        Number(nowMs) -
        Number(effectiveTimestampMs)
      ) /
      86400000
    );
  var forgettingPressure =
    1 - Math.pow(
      2,
      -ageDays /
      H3_REVIEW_LEVEL_HALF_LIFE_DAYS_
    );
  var level =
    normalizedBase +
    (
      (100 - normalizedBase) *
      H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_ *
      forgettingPressure
    );

  return {
    base:
      Math.round(
        normalizedBase
      ),
    age_days:
      Math.round(
        ageDays * 10
      ) / 10,
    forgetting_pressure:
      Math.round(
        forgettingPressure * 1000
      ) / 1000,
    level: Math.max(
      0,
      Math.min(
        100,
        Math.round(level)
      )
    )
  };
}


function h3ReviewCooldownMeta_(
  priority,
  lastReviewedAt,
  nowMs
) {
  var normalizedPriority =
    Math.max(
      0,
      Math.min(
        100,
        Number(priority || 0)
      )
    );
  var lastReviewedMs =
    h3ReviewTimestampMs_(
      lastReviewedAt
    );

  if (lastReviewedMs === null) {
    return {
      active: false,
      factor: 1,
      age_hours: null,
      cap: null,
      level:
        Math.round(
          normalizedPriority
        )
    };
  }

  var ageHours =
    Math.max(
      0,
      (
        Number(nowMs) -
        Number(lastReviewedMs)
      ) /
      3600000
    );
  var level;
  var cap = null;

  if (
    ageHours <
    H3_REVIEW_COOLDOWN_CAP_HOURS_
  ) {
    cap =
      H3_REVIEW_COOLDOWN_CAP_START_ +
      (
        (
          H3_REVIEW_COOLDOWN_CAP_24H_ -
          H3_REVIEW_COOLDOWN_CAP_START_
        ) *
        (
          ageHours /
          H3_REVIEW_COOLDOWN_CAP_HOURS_
        )
      );
    level =
      Math.min(
        normalizedPriority,
        cap
      );
  } else if (
    ageHours <
    H3_REVIEW_COOLDOWN_RECOVERY_HOURS_
  ) {
    var start =
      Math.min(
        normalizedPriority,
        H3_REVIEW_COOLDOWN_CAP_24H_
      );
    var recoveryProgress =
      (
        ageHours -
        H3_REVIEW_COOLDOWN_CAP_HOURS_
      ) /
      (
        H3_REVIEW_COOLDOWN_RECOVERY_HOURS_ -
        H3_REVIEW_COOLDOWN_CAP_HOURS_
      );

    level =
      start +
      (
        (
          normalizedPriority -
          start
        ) *
        recoveryProgress
      );
  } else {
    level =
      normalizedPriority;
  }

  var roundedLevel =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(level)
      )
    );

  return {
    active:
      ageHours <
      H3_REVIEW_COOLDOWN_RECOVERY_HOURS_,
    factor:
      normalizedPriority > 0
        ? Math.round(
            (
              roundedLevel /
              normalizedPriority
            ) *
            1000
          ) / 1000
        : 1,
    age_hours:
      Math.round(
        ageHours * 10
      ) / 10,
    cap:
      cap === null
        ? null
        : Math.round(
            cap * 10
          ) / 10,
    level:
      roundedLevel
  };
}

function h3ReviewLevelForEntry_(
  kind,
  entry,
  evidence,
  effectiveTimestampMs,
  nowMs
) {
  return h3ReviewLevelFromBase_(
    h3ReviewBaseLevelForEntry_(
      kind,
      entry,
      evidence
    ),
    effectiveTimestampMs,
    nowMs
  );
}

function h3ReviewAttachHomeMetadata_(
  envelopes
) {
  var nowMs =
    h3ReviewNowMs_();

  envelopes.forEach(
    function (envelope) {
      var entry = envelope.entry;
      var actualTimestampMs =
        h3ReviewTimestampMs_(
          envelope.answered_at
        );

      if (
        actualTimestampMs === null
      ) {
        throw new Error(
          'REVIEW_ANSWERED_AT_REQUIRED:' +
            String(entry.set_id || '')
        );
      }

      var priorityState =
        h3ReviewPriorityStateParse_(
          entry.priority_state_json,
          entry.set_id
        );
      var levelMeta =
        priorityState
          ? h3ReviewDynamicLevelFromState_(
              entry.review_base_level,
              priorityState,
              nowMs
            )
          : h3ReviewLevelFromBase_(
              entry.review_base_level,
              actualTimestampMs,
              nowMs
            );
      var cooldownMeta =
        h3ReviewCooldownMeta_(
          levelMeta.level,
          entry.last_reviewed_at,
          nowMs
        );

      envelope.review_effective_at =
        new Date(
          actualTimestampMs
        ).toISOString();

      entry.review_effective_at =
        envelope.review_effective_at;
      entry.review_time_source =
        priorityState
          ? 'DYNAMIC_SKILL_EVIDENCE'
          : 'ANSWERED_AT_LEGACY';
      entry.review_age_days =
        levelMeta.age_days;
      entry.review_forgetting_pressure =
        levelMeta.forgetting_pressure;
      entry.review_base_level =
        levelMeta.base;
      entry.review_priority_before_cooldown =
        levelMeta.level;
      entry.review_dynamic_priority_active =
        !!priorityState;
      entry.review_cooldown_active =
        cooldownMeta.active;
      entry.review_cooldown_factor =
        cooldownMeta.factor;
      entry.review_cooldown_age_hours =
        cooldownMeta.age_hours;
      entry.review_cooldown_cap =
        cooldownMeta.cap;
      entry.review_level =
        cooldownMeta.level;
      entry.review_level_contract =
        H3_REVIEW_LEVEL_CONTRACT_;
    }
  );
}

function h3ReviewHomeHistory_(
  spreadsheet
) {
  var envelopes =
    h3ReviewHomeIndexEnvelopes_(
      spreadsheet
    );

  h3ReviewAttachHomeMetadata_(
    envelopes
  );

  envelopes.sort(function (a, b) {
    if (
      a.review_effective_at !==
      b.review_effective_at
    ) {
      return a.review_effective_at <
        b.review_effective_at
        ? 1
        : -1;
    }

    if (a.set_id !== b.set_id) {
      return a.set_id < b.set_id
        ? 1
        : -1;
    }

    return b.set_no - a.set_no;
  });

  return envelopes
    .slice(0, 50)
    .map(function (envelope) {
      return envelope.entry;
    });
}

function h3ReviewCurrentLearning_(
  spreadsheet
) {
  var candidates = [];

  h3ReviewProviders_().forEach(
    function (provider, index) {
      var current =
        provider.currentLearning(
          spreadsheet
        );

      if (current) {
        candidates.push({
          order:
            Number(
              provider.order || index
            ),
          current: current
        });
      }
    }
  );

  if (!candidates.length) {
    return null;
  }

  if (candidates.length > 1) {
    throw new Error(
      'REVIEW_CURRENT_LEARNING_AMBIGUOUS'
    );
  }

  return candidates[0].current;
}


function h3ConfirmedStabilityCoverage_(
  spreadsheet
) {
  var families = [
    'L',
    'W',
    'R',
    'T'
  ];
  var active = {
    L: {},
    W: {},
    R: {},
    T: {}
  };
  var stable = {
    L: {},
    W: {},
    R: {},
    T: {}
  };
  var evidence = {
    L: {},
    W: {},
    R: {},
    T: {}
  };
  var rtStableMeta = {};

  function familyForSkill(skillId) {
    var id = String(skillId || '');

    if (/^H3-K[1-5]-SK/.test(id)) {
      return 'L';
    }
    if (/^H3-P(?:[1-7])-SK/.test(id)) {
      return 'W';
    }
    if (/^H3-P(?:8|9|10)-SK/.test(id)) {
      return 'R';
    }
    if (/^H3-P(?:11|12)-SK/.test(id)) {
      return 'T';
    }

    return '';
  }

  function uniqueCount(map) {
    return Object.keys(map || {}).length;
  }

  function evidenceKey(
    family,
    skillId,
    direction
  ) {
    if (family === 'T') {
      return (
        String(skillId || '') +
        '|' +
        String(direction || '')
      );
    }

    return String(skillId || '');
  }

  function ensureEvidence(
    family,
    skillId,
    direction
  ) {
    var key =
      evidenceKey(
        family,
        skillId,
        direction
      );

    if (!evidence[family][key]) {
      evidence[family][key] = {
        sets: {},
        surfaces: {},
        sections: {}
      };
    }

    return evidence[family][key];
  }

  function addCorrectEvidence(
    family,
    skillId,
    direction,
    setId,
    surfaceKey,
    sectionKey
  ) {
    if (
      !active[family] ||
      !active[family][skillId]
    ) {
      return;
    }

    var item =
      ensureEvidence(
        family,
        skillId,
        direction
      );
    var normalizedSet =
      String(setId || '');
    var normalizedSurface =
      String(surfaceKey || '');
    var normalizedSection =
      String(sectionKey || '');

    if (normalizedSet) {
      item.sets[normalizedSet] =
        true;
    }
    if (normalizedSurface) {
      item.surfaces[
        normalizedSurface
      ] = true;
    }
    if (normalizedSection) {
      item.sections[
        normalizedSection
      ] = true;
    }
  }

  var masterSheet =
    spreadsheet.getSheetByName(
      'skill_master_v1'
    );
  if (!masterSheet) {
    throw new Error(
      'CONFIRMED_STABILITY_SKILL_MASTER_MISSING'
    );
  }

  var master =
    h3ReviewTable_(
      masterSheet
    );
  h3ProdRequireColumns_(
    master,
    [
      'SKILL_ID',
      'LEVEL',
      'SECTION',
      'NOTES'
    ],
    'skill_master_v1'
  );

  master.rows.forEach(
    function (row) {
      var level =
        String(
          row[master.map.LEVEL] || ''
        );
      if (
        level !== '3級' &&
        level !== '3급'
      ) {
        return;
      }

      var skillId =
        String(
          row[
            master.map.SKILL_ID
          ] || ''
        );
      var family =
        familyForSkill(skillId);
      var notes =
        String(
          row[master.map.NOTES] || ''
        );

      if (
        !family ||
        notes.indexOf(
          'T8C_PLANNED_NOT_ACTIVE'
        ) >= 0
      ) {
        return;
      }

      active[family][skillId] = {
        section:
          String(
            row[
              master.map.SECTION
            ] || ''
          )
      };
    }
  );

  var queueSheet =
    spreadsheet.getSheetByName(
      'skill_queue_v1'
    );
  if (!queueSheet) {
    throw new Error(
      'CONFIRMED_STABILITY_SKILL_QUEUE_MISSING'
    );
  }

  var queue =
    h3ReviewTable_(
      queueSheet
    );
  h3ProdRequireColumns_(
    queue,
    [
      'SKILL_ID',
      'STABILITY_STATUS'
    ],
    'skill_queue_v1'
  );

  queue.rows.forEach(
    function (row) {
      var skillId =
        String(
          row[
            queue.map.SKILL_ID
          ] || ''
        );
      var family =
        familyForSkill(skillId);

      if (
        (family === 'L' ||
          family === 'W') &&
        active[family][skillId] &&
        String(
          row[
            queue.map
              .STABILITY_STATUS
          ] || ''
        ) === 'STABLE'
      ) {
        stable[family][skillId] =
          true;
      }
    }
  );

  var rtQueueSheet =
    spreadsheet.getSheetByName(
      'rt_skill_queue_v1'
    );
  if (!rtQueueSheet) {
    throw new Error(
      'CONFIRMED_STABILITY_RT_QUEUE_MISSING'
    );
  }

  var rtQueue =
    h3ReviewTable_(
      rtQueueSheet
    );
  h3ProdRequireColumns_(
    rtQueue,
    [
      'LEVEL',
      'FAMILY',
      'SKILL_ID',
      'TRANSLATION_DIRECTION',
      'STABILITY_STATUS',
      'SECTION_EVIDENCE_JSON'
    ],
    'rt_skill_queue_v1'
  );

  rtQueue.rows.forEach(
    function (row) {
      var level =
        String(
          row[rtQueue.map.LEVEL] || ''
        );
      if (
        level !== '3級' &&
        level !== '3급'
      ) {
        return;
      }

      var familyName =
        String(
          row[
            rtQueue.map.FAMILY
          ] || ''
        );
      var family =
        familyName === 'READING'
          ? 'R'
          : (
              familyName ===
                'TRANSLATION'
                ? 'T'
                : ''
            );
      var skillId =
        String(
          row[
            rtQueue.map.SKILL_ID
          ] || ''
        );
      var direction =
        String(
          row[
            rtQueue.map
              .TRANSLATION_DIRECTION
          ] || ''
        );

      if (
        !family ||
        !active[family][skillId] ||
        String(
          row[
            rtQueue.map
              .STABILITY_STATUS
          ] || ''
        ) !== 'STABLE'
      ) {
        return;
      }

      var key =
        evidenceKey(
          family,
          skillId,
          direction
        );
      stable[family][key] =
        true;

      var sectionEvidence = {};
      try {
        sectionEvidence =
          JSON.parse(
            String(
              row[
                rtQueue.map
                  .SECTION_EVIDENCE_JSON
              ] || '{}'
            )
          ) || {};
      } catch (_err) {
        sectionEvidence = {};
      }

      rtStableMeta[
        family + '|' + key
      ] = {
        required_sections:
          Object.keys(
            sectionEvidence
          ).length > 1
            ? 2
            : 1
      };
    }
  );

  var writtenSheet =
    spreadsheet.getSheetByName(
      'generation_log_v1'
    );
  if (writtenSheet) {
    var written =
      h3ReviewTable_(
        writtenSheet
      );
    h3ProdRequireColumns_(
      written,
      [
        'SET_ID',
        'SKILL_ID',
        'SURFACE_HASH',
        'STATUS',
        'USER_RESULT'
      ],
      'generation_log_v1'
    );

    written.rows.forEach(
      function (row) {
        if (
          String(
            row[
              written.map.STATUS
            ] || ''
          ) !== 'ANSWERED' ||
          String(
            row[
              written.map
                .USER_RESULT
            ] || ''
          ) !== '○'
        ) {
          return;
        }

        var skillId =
          String(
            row[
              written.map.SKILL_ID
            ] || ''
          );
        if (
          familyForSkill(skillId) !==
            'W'
        ) {
          return;
        }

        addCorrectEvidence(
          'W',
          skillId,
          '',
          row[
            written.map.SET_ID
          ],
          row[
            written.map
              .SURFACE_HASH
          ],
          ''
        );
      }
    );
  }

  var listeningSheet =
    spreadsheet.getSheetByName(
      'listening_log_v1'
    );
  if (listeningSheet) {
    var listening =
      h3ReviewTable_(
        listeningSheet
      );
    h3ProdRequireColumns_(
      listening,
      [
        'PARENT_SET_ID',
        'SKILL_ID',
        'SURFACE_HASH',
        'STATUS',
        'USER_RESULT'
      ],
      'listening_log_v1'
    );

    listening.rows.forEach(
      function (row) {
        if (
          String(
            row[
              listening.map.STATUS
            ] || ''
          ) !== 'VALID' ||
          String(
            row[
              listening.map
                .USER_RESULT
            ] || ''
          ) !== '○'
        ) {
          return;
        }

        var skillId =
          String(
            row[
              listening.map
                .SKILL_ID
            ] || ''
          );
        if (
          familyForSkill(skillId) !==
            'L'
        ) {
          return;
        }

        addCorrectEvidence(
          'L',
          skillId,
          '',
          row[
            listening.map
              .PARENT_SET_ID
          ],
          row[
            listening.map
              .SURFACE_HASH
          ],
          ''
        );
      }
    );
  }

  var rtEvidenceSheet =
    spreadsheet.getSheetByName(
      'rt_evidence_v1'
    );
  if (!rtEvidenceSheet) {
    throw new Error(
      'CONFIRMED_STABILITY_RT_EVIDENCE_MISSING'
    );
  }

  var rtEvidence =
    h3ReviewTable_(
      rtEvidenceSheet
    );
  h3ProdRequireColumns_(
    rtEvidence,
    [
      'LEVEL',
      'FAMILY',
      'SKILL_ID',
      'TRANSLATION_DIRECTION',
      'SECTION_KEY',
      'SET_ID',
      'SURFACE_KEY',
      'RESULT'
    ],
    'rt_evidence_v1'
  );

  rtEvidence.rows.forEach(
    function (row) {
      var level =
        String(
          row[
            rtEvidence.map.LEVEL
          ] || ''
        );
      if (
        (
          level !== '3級' &&
          level !== '3급'
        ) ||
        String(
          row[
            rtEvidence.map.RESULT
          ] || ''
        ) !== '○'
      ) {
        return;
      }

      var familyName =
        String(
          row[
            rtEvidence.map.FAMILY
          ] || ''
        );
      var family =
        familyName === 'READING'
          ? 'R'
          : (
              familyName ===
                'TRANSLATION'
                ? 'T'
                : ''
            );
      var skillId =
        String(
          row[
            rtEvidence.map.SKILL_ID
          ] || ''
        );
      var direction =
        String(
          row[
            rtEvidence.map
              .TRANSLATION_DIRECTION
          ] || ''
        );

      if (
        !family ||
        familyForSkill(skillId) !==
          family ||
        (
          family === 'T' &&
          !direction
        )
      ) {
        return;
      }

      addCorrectEvidence(
        family,
        skillId,
        direction,
        row[
          rtEvidence.map.SET_ID
        ],
        row[
          rtEvidence.map
            .SURFACE_KEY
        ],
        row[
          rtEvidence.map
            .SECTION_KEY
        ]
      );
    }
  );

  function breadthPass(
    family,
    skillId,
    key
  ) {
    var item =
      evidence[family][key] || {
        sets: {},
        surfaces: {},
        sections: {}
      };
    var required =
      2;

    if (
      family === 'L' &&
      /^H3-K[145]-SK/.test(
        skillId
      )
    ) {
      required = 3;
    }

    if (
      uniqueCount(
        item.sets
      ) < required ||
      uniqueCount(
        item.surfaces
      ) < required
    ) {
      return false;
    }

    if (family === 'R') {
      var meta =
        rtStableMeta[
          'R|' + key
        ] || {
          required_sections: 1
        };

      if (
        uniqueCount(
          item.sections
        ) <
          Number(
            meta.required_sections ||
            1
          )
      ) {
        return false;
      }
    }

    return true;
  }

  var byFilter = {};
  var familyRates = [];

  families.forEach(
    function (family) {
      var denominator =
        Object.keys(
          active[family]
        ).length;
      var stableCount = 0;
      var confirmedCount = 0;

      Object.keys(
        active[family]
      ).forEach(
        function (skillId) {
          if (
            family === 'T'
          ) {
            var stableKeys =
              Object.keys(
                stable.T
              ).filter(
                function (key) {
                  return (
                    key.indexOf(
                      skillId + '|'
                    ) === 0
                  );
                }
              );

            if (stableKeys.length) {
              stableCount += 1;
            }

            var confirmed =
              stableKeys.some(
                function (key) {
                  return breadthPass(
                    'T',
                    skillId,
                    key
                  );
                }
              );

            if (confirmed) {
              confirmedCount += 1;
            }

            return;
          }

          var key =
            evidenceKey(
              family,
              skillId,
              ''
            );

          if (
            stable[family][key]
          ) {
            stableCount += 1;

            if (
              breadthPass(
                family,
                skillId,
                key
              )
            ) {
              confirmedCount += 1;
            }
          }
        }
      );

      var rate =
        denominator > 0
          ? confirmedCount /
            denominator
          : 0;
      var percent =
        Math.round(
          rate * 1000
        ) / 10;

      byFilter[family] = {
        numerator:
          confirmedCount,
        denominator:
          denominator,
        stable_count:
          stableCount,
        rate: rate,
        percent: percent
      };
      familyRates.push(rate);
    }
  );

  var allRate =
    familyRates.length
      ? familyRates.reduce(
          function (sum, value) {
            return sum + value;
          },
          0
        ) /
        familyRates.length
      : 0;

  byFilter.ALL = {
    aggregation:
      'FAMILY_MACRO_AVERAGE',
    family_count:
      familyRates.length,
    rate: allRate,
    percent:
      Math.round(
        allRate * 1000
      ) / 10
  };

  return {
    schema:
      'H3_CONFIRMED_STABILITY_COVERAGE_V1',
    level: '3級',
    definition:
      'Share of active skills that are stable and pass the breadth gate.',
    active_skill_definition:
      'Formal 3級 skills currently included in live learning.',
    evidence_basis:
      'DIRECT_CORRECT_EVIDENCE',
    all_aggregation:
      'FAMILY_MACRO_AVERAGE',
    breadth_gate: {
      W:
        '>=2 surfaces and >=2 sets',
      L:
        '>=2 audio surfaces and >=2 sets; K1/K4/K5 require >=3 and >=3',
      R:
        '>=2 text surfaces and >=2 sets; cross-section stable evidence requires >=2 sections',
      T:
        '>=2 sentence surfaces and >=2 sets within the same direction'
    },
    by_filter: byFilter
  };
}


function getConfirmedStabilityCoverage() {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  return h3ConfirmedStabilityCoverage_(
    spreadsheet
  );
}


function buildReviewHomePayload_() {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  return {
    schema:
      'H3_WEB_HOME_V1',
    mode: 'HOME',
    read_only: true,
    current_learning: null,
    review_history:
      h3ReviewHomeHistory_(
        spreadsheet
      ),
    review_filters: [
      'ALL',
      'LISTENING',
      'WRITTEN'
    ],
    review_sorts: [
      'RECENT',
      'REVIEW_LEVEL'
    ],
    review_level_contract:
      H3_REVIEW_LEVEL_CONTRACT_,
    review_home_index_contract:
      'H3_REVIEW_HOME_INDEX_V5_COMPAT',
    learning_surface_schema:
      'H3_LEARNING_SURFACE_V1',
    review_level_half_life_days:
      H3_REVIEW_LEVEL_HALF_LIFE_DAYS_,
    review_level_time_headroom_share:
      H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_,
    review_cooldown_cap_start:
      H3_REVIEW_COOLDOWN_CAP_START_,
    review_cooldown_cap_24h:
      H3_REVIEW_COOLDOWN_CAP_24H_,
    review_cooldown_cap_hours:
      H3_REVIEW_COOLDOWN_CAP_HOURS_,
    review_cooldown_recovery_hours:
      H3_REVIEW_COOLDOWN_RECOVERY_HOURS_
  };
}


function h3ReviewResolvePermalinkRequest_(
  request
) {
  if (
    !request ||
    request.mode !== 'REVIEW' ||
    !request.set_id ||
    !request.review_kind ||
    request.q_no === null ||
    request.q_no === undefined ||
    request.txn_id ||
    request.legacy_review_id ||
    request.materialized_record
  ) {
    return request;
  }

  var kind =
    String(
      request.review_kind || ''
    );
  var setId =
    String(
      request.set_id || ''
    );
  var requestedFamily =
    String(
      request.surface_family || ''
    );

  if (
    ['LISTENING', 'WRITTEN']
      .indexOf(kind) < 0
  ) {
    throw new Error(
      'REVIEW_PERMALINK_KIND_INVALID'
    );
  }

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var table =
    h3ReviewHomeIndexTable_(
      spreadsheet
    );
  var found =
    h3ReviewHomeIndexFind_(
      table,
      kind,
      setId
    );

  if (!found) {
    throw new Error(
      'REVIEW_PERMALINK_SET_NOT_FOUND:' +
        kind +
        ':' +
        setId
    );
  }

  var entry =
    h3ReviewHomeIndexRowEntry_(
      found.row,
      table.map
    );

  if (
    requestedFamily &&
    requestedFamily !==
      entry.surface_family
  ) {
    throw new Error(
      'REVIEW_PERMALINK_FAMILY_MISMATCH'
    );
  }

  var resolved = {};
  Object.keys(request).forEach(
    function (key) {
      resolved[key] = request[key];
    }
  );

  resolved.review_kind =
    kind;
  resolved.surface_family =
    entry.surface_family;

  if (kind === 'LISTENING') {
    resolved.txn_id =
      entry.txn_id || null;
    resolved.legacy_review_id =
      entry.legacy_review_id || null;

    if (
      !resolved.txn_id &&
      !resolved.legacy_review_id
    ) {
      throw new Error(
        'REVIEW_PERMALINK_LISTENING_IDENTITY_MISSING'
      );
    }
  } else {
    resolved.txn_id = null;
    resolved.legacy_review_id = null;
  }

  return resolved;
}


function h3ReviewRenderRequest_(request) {
  request =
    h3ReviewResolvePermalinkRequest_(
      request
    );

  if (
    request &&
    request.mode === 'HOME'
  ) {
    return buildReviewHomePayload_();
  }

  var provider =
    h3ReviewProviderForRequest_(
      request
    );

  if (
    request &&
    request.mode === 'REVIEW'
  ) {
    return h3ReviewAttachSurfaceMetadata_(
      provider,
      provider.openReview(request)
    );
  }

  if (
    request &&
    request.mode === 'REVIEW_REPLAY'
  ) {
    return provider.openReplay(request);
  }

  throw new Error(
    'REVIEW_RENDER_ROUTE_INVALID'
  );
}


function h3ReviewMediaRequest_(request) {
  var provider =
    h3ReviewProviderForRequest_(
      request
    );

  if (
    request &&
    request.mode === 'REVIEW'
  ) {
    return provider.openMedia(request);
  }

  if (
    request &&
    request.mode === 'REVIEW_REPLAY'
  ) {
    return provider.openReplayMedia(
      request
    );
  }

  throw new Error(
    'REVIEW_MEDIA_ROUTE_INVALID'
  );
}


function h3ReviewSubmitRequest_(request) {
  if (
    !request ||
    request.mode !== 'REVIEW_REPLAY'
  ) {
    throw new Error(
      'REVIEW_SUBMIT_ROUTE_INVALID'
    );
  }

  return h3ReviewProviderForRequest_(
    request
  )
    .gradeReplay(request);
}
