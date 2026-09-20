/**
 * H3 Translation activation core.
 *
 * Pure / repository-safe activation primitives. No Sheet/Drive writes,
 * learner issue, route registration, or Review persistence.
 */

var H3_TRANSLATION_ACTIVATION_CONTRACT_ID_ =
  'H3-TRANSLATION-ACTIVATION-CORE-20260921-V1';

var H3_TRANSLATION_STAGE_SCHEMA_ =
  'H3_TRANSLATION_STAGE_V1';

var H3_TRANSLATION_TXN_PLAN_SCHEMA_ =
  'H3_TRANSLATION_TXN_PLAN_V1';

var H3_TRANSLATION_CURRENT_SCHEMA_ =
  'H3_TRANSLATION_CURRENT_LEARNING_V1';

var H3_TRANSLATION_STAGE_SHEET_ =
  'translation_stage_v1';

var H3_TRANSLATION_TXN_SHEET_ =
  'translation_web_txn_v1';

var H3_TRANSLATION_LOG_SHEET_ =
  'translation_log_v1';

var H3_TRANSLATION_STAGE_HEADERS_ = [
  'STAGE_ID',
  'ISSUE_NO',
  'SET_ID',
  'STATUS',
  'LEVEL',
  'SECTION_KEY',
  'TRANSLATION_DIRECTION',
  'ANSWER_TYPE',
  'ITEM_COUNT',
  'SOURCE_BINDING_SHA256',
  'LOCKED_BUNDLE_SHA256',
  'LOCKED_BUNDLE_JSON',
  'CREATED_AT',
  'LOCKED_AT',
  'ISSUED_AT',
  'COMMITTED_AT'
];

var H3_TRANSLATION_TXN_HEADERS_ = [
  'TXN_ID',
  'SET_ID',
  'STAGE_ID',
  'MODE',
  'SURFACE_FAMILY',
  'TRANSLATION_DIRECTION',
  'ANSWER_TYPE',
  'RAW_INPUT_JSON',
  'REQUEST_FINGERPRINT',
  'SOURCE_BINDING_SHA256',
  'CREATED_AT',
  'STATUS',
  'RESULT_JSON',
  'SCORE',
  'COMMITTED_AT',
  'ERROR'
];

var H3_TRANSLATION_LOG_HEADERS_ = [
  'TXN_ID',
  'SET_ID',
  'Q_NO',
  'ITEM_ID',
  'QUESTION_KEY',
  'SKILL_ID',
  'RESULT',
  'UNCERTAIN',
  'TRANSLATION_DIRECTION',
  'ANSWER_TYPE',
  'ANSWERED_AT'
];


function h3TranslationActivationRequireId_(
  value,
  code
) {
  var normalized =
    String(value || '').trim();

  if (
    !normalized ||
    normalized.length > 160 ||
    /[\x00-\x1F]/.test(normalized)
  ) {
    throw new Error(code);
  }

  return normalized;
}


function h3TranslationSectionToken_(
  sectionKey
) {
  if (sectionKey === 'H3-P11') {
    return 'P11';
  }
  if (sectionKey === 'H3-P12') {
    return 'P12';
  }
  throw new Error(
    'TRANSLATION_ACTIVATION_SECTION_INVALID'
  );
}


function h3TranslationDatePart_(
  value
) {
  var text =
    String(value || '').trim();

  if (!/^\d{8}$/.test(text)) {
    throw new Error(
      'TRANSLATION_ALLOCATION_DATE_INVALID'
    );
  }

  return text;
}


function h3TranslationSerialText_(
  serial
) {
  var n = Number(serial);

  if (
    !Number.isInteger(n) ||
    n < 1 ||
    n > 999
  ) {
    throw new Error(
      'TRANSLATION_ALLOCATION_SERIAL_INVALID'
    );
  }

  return String(n).padStart(
    3,
    '0'
  );
}


function h3TranslationSetIdFromDateSerial_(
  datePart,
  serial
) {
  return (
    'H3-' +
    h3TranslationDatePart_(
      datePart
    ) +
    '-T' +
    h3TranslationSerialText_(
      serial
    )
  );
}


function h3TranslationStageIdFromDateSerial_(
  sectionKey,
  datePart,
  serial
) {
  return (
    'TRANS-' +
    h3TranslationSectionToken_(
      sectionKey
    ) +
    '-' +
    h3TranslationDatePart_(
      datePart
    ) +
    '-' +
    h3TranslationSerialText_(
      serial
    )
  );
}


function h3TranslationParseSetId_(
  setId
) {
  var text =
    String(setId || '');
  var match =
    /^H3-(\d{8})-T(\d{3})$/
      .exec(text);

  if (!match) {
    throw new Error(
      'TRANSLATION_SET_ID_FORMAT_INVALID'
    );
  }

  return {
    date_part: match[1],
    serial: Number(match[2])
  };
}


function h3TranslationParseStageId_(
  stageId
) {
  var text =
    String(stageId || '');
  var match =
    /^TRANS-(P11|P12)-(\d{8})-(\d{3})$/
      .exec(text);

  if (!match) {
    throw new Error(
      'TRANSLATION_STAGE_ID_FORMAT_INVALID'
    );
  }

  return {
    section_key:
      'H3-' + match[1],
    date_part: match[2],
    serial: Number(match[3])
  };
}


function h3TranslationActivationIdentity_(
  issueNo,
  stageId,
  setId,
  sectionKey
) {
  var normalizedIssueNo =
    Number(issueNo);

  if (
    !Number.isInteger(
      normalizedIssueNo
    ) ||
    normalizedIssueNo < 1
  ) {
    throw new Error(
      'TRANSLATION_ISSUE_NO_INVALID'
    );
  }

  var normalizedStageId =
    h3TranslationActivationRequireId_(
      stageId,
      'TRANSLATION_STAGE_ID_INVALID'
    );
  var normalizedSetId =
    h3TranslationActivationRequireId_(
      setId,
      'TRANSLATION_SET_ID_INVALID'
    );
  var normalizedSection =
    'H3-' +
    h3TranslationSectionToken_(
      sectionKey
    );

  var parsedStage =
    h3TranslationParseStageId_(
      normalizedStageId
    );
  var parsedSet =
    h3TranslationParseSetId_(
      normalizedSetId
    );

  if (
    parsedStage.section_key !==
      normalizedSection ||
    parsedStage.date_part !==
      parsedSet.date_part ||
    parsedStage.serial !==
      parsedSet.serial
  ) {
    throw new Error(
      'TRANSLATION_RUNTIME_IDENTITY_PARITY_INVALID'
    );
  }

  return {
    schema:
      'H3_TRANSLATION_RUNTIME_IDENTITY_V1',
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    issue_no:
      normalizedIssueNo,
    stage_id:
      normalizedStageId,
    set_id:
      normalizedSetId,
    section_key:
      normalizedSection,
    date_part:
      parsedSet.date_part,
    serial:
      parsedSet.serial
  };
}


function h3TranslationStageRowIdentity_(
  row
) {
  if (
    !row ||
    !Array.isArray(row)
  ) {
    throw new Error(
      'TRANSLATION_STAGE_ROW_INVALID'
    );
  }

  var stageId =
    String(row[0] || '').trim();
  var issueNo =
    Number(row[1]);
  var setId =
    String(row[2] || '').trim();
  var sectionKey =
    String(row[5] || '').trim();

  return h3TranslationActivationIdentity_(
    issueNo,
    stageId,
    setId,
    sectionKey
  );
}


function h3TranslationAllocateIdentity_(
  sectionKey,
  datePart,
  existingRows
) {
  var section =
    'H3-' +
    h3TranslationSectionToken_(
      sectionKey
    );
  var date =
    h3TranslationDatePart_(
      datePart
    );
  var maxIssue = 0;
  var maxDateSerial = 0;
  var seenStage = {};
  var seenSet = {};

  (existingRows || []).forEach(
    function (row) {
      if (
        !row ||
        !Array.isArray(row) ||
        row.every(
          function (value) {
            return !String(
              value || ''
            ).trim();
          }
        )
      ) {
        return;
      }

      var identity =
        h3TranslationStageRowIdentity_(
          row
        );

      if (
        seenStage[
          identity.stage_id
        ] ||
        seenSet[
          identity.set_id
        ]
      ) {
        throw new Error(
          'TRANSLATION_ALLOCATION_DUPLICATE_IDENTITY'
        );
      }

      seenStage[
        identity.stage_id
      ] = true;
      seenSet[
        identity.set_id
      ] = true;
      maxIssue =
        Math.max(
          maxIssue,
          identity.issue_no
        );

      if (
        identity.date_part === date
      ) {
        maxDateSerial =
          Math.max(
            maxDateSerial,
            identity.serial
          );
      }
    }
  );

  var serial =
    maxDateSerial + 1;

  if (serial > 999) {
    throw new Error(
      'TRANSLATION_ALLOCATION_EXHAUSTED'
    );
  }

  var issueNo =
    maxIssue + 1;

  return h3TranslationActivationIdentity_(
    issueNo,
    h3TranslationStageIdFromDateSerial_(
      section,
      date,
      serial
    ),
    h3TranslationSetIdFromDateSerial_(
      date,
      serial
    ),
    section
  );
}


function h3TranslationLockedBundleJson_(
  locked
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

  return h3TranslationCanonicalJson_(
    locked
  );
}


function h3TranslationParseLockedBundleJson_(
  value
) {
  var text =
    String(value || '');

  if (!text) {
    throw new Error(
      'TRANSLATION_LOCKED_BUNDLE_JSON_MISSING'
    );
  }

  var parsed;
  try {
    parsed =
      JSON.parse(text);
  } catch (_err) {
    throw new Error(
      'TRANSLATION_LOCKED_BUNDLE_JSON_INVALID'
    );
  }

  if (
    !parsed ||
    parsed.schema !==
      H3_TRANSLATION_LOCKED_SCHEMA_
  ) {
    throw new Error(
      'TRANSLATION_LOCKED_BUNDLE_JSON_SCHEMA_INVALID'
    );
  }

  return parsed;
}


function h3TranslationLockedBundleHash_(
  locked
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

  return h3TranslationHash_(
    locked
  );
}


function h3TranslationBuildStage_(
  identity,
  locked,
  createdAt
) {
  if (
    !identity ||
    identity.schema !==
      'H3_TRANSLATION_RUNTIME_IDENTITY_V1'
  ) {
    throw new Error(
      'TRANSLATION_STAGE_IDENTITY_INVALID'
    );
  }

  if (
    !locked ||
    locked.schema !==
      H3_TRANSLATION_LOCKED_SCHEMA_ ||
    locked.provider_kind !==
      'WRITTEN' ||
    locked.surface_family !==
      'TRANSLATION' ||
    locked.level !== '3級' ||
    identity.section_key !==
      locked.section_key ||
    locked.answer_type !==
      'MULTIPLE_CHOICE' ||
    !Array.isArray(
      locked.items
    ) ||
    locked.items.length < 1
  ) {
    throw new Error(
      'TRANSLATION_STAGE_LOCK_INVALID'
    );
  }

  var expectedDirection =
    h3TranslationDirectionForSection_(
      locked.section_key
    );

  if (
    locked.translation_direction !==
      expectedDirection
  ) {
    throw new Error(
      'TRANSLATION_STAGE_DIRECTION_INVALID'
    );
  }

  var normalizedCreatedAt =
    h3TranslationActivationRequireId_(
      createdAt,
      'TRANSLATION_STAGE_CREATED_AT_INVALID'
    );

  return {
    schema:
      H3_TRANSLATION_STAGE_SCHEMA_,
    activation_contract_id:
      H3_TRANSLATION_ACTIVATION_CONTRACT_ID_,
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    issue_no:
      identity.issue_no,
    stage_id:
      identity.stage_id,
    set_id:
      identity.set_id,
    status:
      'LOCKED',
    level:
      locked.level,
    section_key:
      locked.section_key,
    translation_direction:
      locked.translation_direction,
    answer_type:
      locked.answer_type,
    item_count:
      locked.items.length,
    source_binding_sha256:
      locked.source_binding_sha256,
    locked_bundle_sha256:
      h3TranslationLockedBundleHash_(
        locked
      ),
    locked_bundle_json:
      h3TranslationLockedBundleJson_(
        locked
      ),
    created_at:
      normalizedCreatedAt,
    locked_at:
      normalizedCreatedAt,
    issued_at: '',
    committed_at: ''
  };
}


function h3TranslationValidateStageLock_(
  stage,
  locked
) {
  if (
    !stage ||
    stage.schema !==
      H3_TRANSLATION_STAGE_SCHEMA_ ||
    stage.activation_contract_id !==
      H3_TRANSLATION_ACTIVATION_CONTRACT_ID_
  ) {
    throw new Error(
      'TRANSLATION_STAGE_SCHEMA_INVALID'
    );
  }

  h3TranslationActivationIdentity_(
    stage.issue_no,
    stage.stage_id,
    stage.set_id,
    stage.section_key
  );

  if (
    !locked ||
    locked.schema !==
      H3_TRANSLATION_LOCKED_SCHEMA_
  ) {
    throw new Error(
      'TRANSLATION_STAGE_LOCKED_SOURCE_INVALID'
    );
  }

  var storedLocked =
    h3TranslationParseLockedBundleJson_(
      stage.locked_bundle_json
    );

  if (
    stage.provider_kind !==
      'WRITTEN' ||
    stage.surface_family !==
      'TRANSLATION' ||
    stage.level !==
      locked.level ||
    stage.section_key !==
      locked.section_key ||
    stage.translation_direction !==
      locked.translation_direction ||
    stage.translation_direction !==
      h3TranslationDirectionForSection_(
        stage.section_key
      ) ||
    stage.answer_type !==
      'MULTIPLE_CHOICE' ||
    stage.answer_type !==
      locked.answer_type ||
    Number(stage.item_count) !==
      locked.items.length ||
    stage.source_binding_sha256 !==
      locked.source_binding_sha256 ||
    stage.locked_bundle_sha256 !==
      h3TranslationLockedBundleHash_(
        locked
      ) ||
    h3TranslationCanonicalJson_(
      storedLocked
    ) !==
      h3TranslationCanonicalJson_(
        locked
      ) ||
    h3TranslationHash_(
      storedLocked
    ) !==
      stage.locked_bundle_sha256
  ) {
    throw new Error(
      'TRANSLATION_STAGE_SOURCE_BINDING_MISMATCH'
    );
  }

  return true;
}


function h3TranslationPreissueValidate_(
  stage,
  locked,
  committedSetIds
) {
  h3TranslationValidateStageLock_(
    stage,
    locked
  );

  if (
    [
      'LOCKED',
      'PREISSUE_READY'
    ].indexOf(
      stage.status
    ) < 0
  ) {
    throw new Error(
      'TRANSLATION_PREISSUE_STAGE_STATUS_INVALID'
    );
  }

  if (
    stage.issued_at ||
    stage.committed_at
  ) {
    throw new Error(
      'TRANSLATION_PREISSUE_ALREADY_ISSUED'
    );
  }

  var committed =
    (committedSetIds || []).map(
      function (value) {
        return String(value || '');
      }
    );

  if (
    committed.indexOf(
      String(stage.set_id)
    ) >= 0
  ) {
    throw new Error(
      'TRANSLATION_PREISSUE_ALREADY_COMMITTED'
    );
  }

  return {
    schema:
      'H3_TRANSLATION_PREISSUE_V1',
    status:
      'PREISSUE_READY',
    issue_no:
      stage.issue_no,
    stage_id:
      stage.stage_id,
    set_id:
      stage.set_id,
    section_key:
      stage.section_key,
    translation_direction:
      stage.translation_direction,
    answer_type:
      stage.answer_type,
    item_count:
      stage.item_count,
    source_binding_sha256:
      stage.source_binding_sha256,
    locked_bundle_sha256:
      stage.locked_bundle_sha256
  };
}


function h3TranslationBuildMaterializationPlan_(
  sectionKey,
  datePart,
  existingRows,
  locked,
  createdAt,
  committedSetIds
) {
  var identity =
    h3TranslationAllocateIdentity_(
      sectionKey,
      datePart,
      existingRows
    );
  var stage =
    h3TranslationBuildStage_(
      identity,
      locked,
      createdAt
    );
  var preissue =
    h3TranslationPreissueValidate_(
      stage,
      locked,
      committedSetIds || []
    );

  stage.status =
    preissue.status;

  var row = [
    stage.stage_id,
    stage.issue_no,
    stage.set_id,
    stage.status,
    stage.level,
    stage.section_key,
    stage.translation_direction,
    stage.answer_type,
    stage.item_count,
    stage.source_binding_sha256,
    stage.locked_bundle_sha256,
    stage.locked_bundle_json,
    stage.created_at,
    stage.locked_at,
    stage.issued_at,
    stage.committed_at
  ];

  return {
    schema:
      'H3_TRANSLATION_MATERIALIZATION_PLAN_V1',
    activation_contract_id:
      H3_TRANSLATION_ACTIVATION_CONTRACT_ID_,
    status:
      'PREISSUE_READY',
    issue_performed: false,
    identity:
      identity,
    stage:
      stage,
    preissue:
      preissue,
    sheet_name:
      H3_TRANSLATION_STAGE_SHEET_,
    headers:
      H3_TRANSLATION_STAGE_HEADERS_
        .slice(),
    row:
      row
  };
}


function h3TranslationNormalizeSubmission_(
  request,
  locked
) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_SUBMIT_V1' ||
    request.mode !==
      'WRITTEN' ||
    request.provider_kind !==
      'WRITTEN' ||
    request.surface_family !==
      'TRANSLATION'
  ) {
    throw new Error(
      'TRANSLATION_SUBMIT_ENVELOPE_INVALID'
    );
  }

  var setId =
    h3TranslationActivationRequireId_(
      request.set_id,
      'TRANSLATION_SUBMIT_SET_ID_INVALID'
    );

  if (
    !locked ||
    locked.schema !==
      H3_TRANSLATION_LOCKED_SCHEMA_ ||
    !Array.isArray(
      locked.items
    ) ||
    !Array.isArray(
      request.answers
    ) ||
    request.answers.length !==
      locked.items.length
  ) {
    throw new Error(
      'TRANSLATION_SUBMIT_SHAPE_INVALID'
    );
  }

  var expected = {};
  locked.items.forEach(
    function (item) {
      expected[
        item.question_key
      ] = item;
    }
  );

  var seen = {};
  var answers =
    request.answers.map(
      function (answer) {
        var key =
          h3TranslationActivationRequireId_(
            answer &&
              answer.question_key,
            'TRANSLATION_SUBMIT_QUESTION_KEY_INVALID'
          );

        if (
          seen[key] ||
          !expected[key]
        ) {
          throw new Error(
            'TRANSLATION_SUBMIT_QUESTION_IDENTITY_INVALID'
          );
        }
        seen[key] = true;

        var position =
          Number(
            answer.answer
          );

        if (
          !Number.isInteger(position) ||
          position < 1 ||
          position > 4 ||
          typeof answer.uncertain !==
            'boolean'
        ) {
          throw new Error(
            'TRANSLATION_SUBMIT_ANSWER_INVALID'
          );
        }

        return {
          question_key: key,
          answer: position,
          uncertain:
            answer.uncertain
        };
      }
    );

  locked.items.forEach(
    function (item) {
      if (
        !seen[item.question_key]
      ) {
        throw new Error(
          'TRANSLATION_SUBMIT_QUESTION_MISSING:' +
            item.question_key
        );
      }
    }
  );

  return {
    schema:
      'H3_WEB_SUBMIT_V1',
    mode:
      'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    set_id:
      setId,
    translation_direction:
      locked.translation_direction,
    answer_type:
      locked.answer_type,
    answers:
      answers
  };
}


function h3TranslationRequestFingerprint_(
  normalized
) {
  if (
    !normalized ||
    normalized.schema !==
      'H3_WEB_SUBMIT_V1' ||
    normalized.surface_family !==
      'TRANSLATION'
  ) {
    throw new Error(
      'TRANSLATION_FINGERPRINT_INPUT_INVALID'
    );
  }

  return h3TranslationHash_({
    schema:
      'H3_TRANSLATION_REQUEST_FINGERPRINT_V1',
    mode:
      normalized.mode,
    provider_kind:
      normalized.provider_kind,
    surface_family:
      normalized.surface_family,
    set_id:
      normalized.set_id,
    translation_direction:
      normalized.translation_direction,
    answer_type:
      normalized.answer_type,
    answers:
      normalized.answers
  });
}


function h3TranslationBuildTxnPlan_(
  stage,
  locked,
  request
) {
  h3TranslationValidateStageLock_(
    stage,
    locked
  );

  var normalized =
    h3TranslationNormalizeSubmission_(
      request,
      locked
    );

  if (
    normalized.set_id !==
      stage.set_id
  ) {
    throw new Error(
      'TRANSLATION_TXN_SET_ID_MISMATCH'
    );
  }

  return {
    schema:
      H3_TRANSLATION_TXN_PLAN_SCHEMA_,
    activation_contract_id:
      H3_TRANSLATION_ACTIVATION_CONTRACT_ID_,
    journal_sheet:
      H3_TRANSLATION_TXN_SHEET_,
    mode:
      'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    issue_no:
      stage.issue_no,
    stage_id:
      stage.stage_id,
    set_id:
      stage.set_id,
    section_key:
      stage.section_key,
    translation_direction:
      stage.translation_direction,
    answer_type:
      stage.answer_type,
    source_binding_sha256:
      stage.source_binding_sha256,
    request_fingerprint:
      h3TranslationRequestFingerprint_(
        normalized
      ),
    normalized_request:
      normalized
  };
}


function h3TranslationBuildCommittedResult_(
  stage,
  locked,
  grade,
  txnId
) {
  h3TranslationValidateStageLock_(
    stage,
    locked
  );

  if (
    !grade ||
    grade.schema !==
      'H3_TRANSLATION_GRADE_V1' ||
    grade.total !==
      stage.item_count
  ) {
    throw new Error(
      'TRANSLATION_RESULT_GRADE_INVALID'
    );
  }

  var normalizedTxnId =
    h3TranslationActivationRequireId_(
      txnId,
      'TRANSLATION_RESULT_TXN_ID_INVALID'
    );

  return {
    schema:
      'H3_WEB_SUBMIT_RESULT_V1',
    mode:
      'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    level:
      stage.level,
    section_key:
      stage.section_key,
    translation_direction:
      stage.translation_direction,
    answer_type:
      stage.answer_type,
    persisted:
      true,
    set_id:
      stage.set_id,
    stage_id:
      stage.stage_id,
    txn_id:
      normalizedTxnId,
    source_binding_sha256:
      stage.source_binding_sha256,
    score:
      grade.score,
    total:
      grade.total,
    summary:
      grade.graded.map(
        function (item) {
          return {
            q_no:
              item.q_no,
            item_id:
              item.item_id,
            question_key:
              item.question_key,
            skill_id:
              item.skill_id,
            result:
              item.mark,
            uncertain:
              item.uncertain,
            translation_direction:
              item.translation_direction,
            answer_type:
              item.answer_type
          };
        }
      ),
    receipt:
      [
        '[H3_WEB_SYNC]',
        'SET_ID=' +
          stage.set_id,
        'TXN_ID=' +
          normalizedTxnId,
        'STATUS=COMMITTED'
      ].join('\n')
  };
}


function h3TranslationCurrentLearningCandidate_(
  stage,
  locked,
  committed
) {
  h3TranslationValidateStageLock_(
    stage,
    locked
  );

  if (
    stage.status !== 'ISSUED' ||
    !stage.issued_at ||
    stage.committed_at ||
    committed === true
  ) {
    return null;
  }

  return {
    schema:
      H3_TRANSLATION_CURRENT_SCHEMA_,
    provider_kind:
      'WRITTEN',
    surface_family:
      'TRANSLATION',
    level:
      stage.level,
    issue_no:
      stage.issue_no,
    stage_id:
      stage.stage_id,
    set_id:
      stage.set_id,
    section_key:
      stage.section_key,
    translation_direction:
      stage.translation_direction,
    answer_type:
      stage.answer_type,
    item_count:
      stage.item_count,
    source_binding_sha256:
      stage.source_binding_sha256
  };
}
