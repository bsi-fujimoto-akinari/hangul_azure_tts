/**
 * H3 Reading activation core.
 *
 * Pure / repository-safe activation primitives. No Sheet/Drive writes,
 * learner issue, route registration, or Review persistence.
 */

var H3_READING_ACTIVATION_CONTRACT_ID_ =
  'H3-READING-ACTIVATION-CORE-20260921-V3';

var H3_READING_STAGE_SCHEMA_ =
  'H3_READING_STAGE_V1';

var H3_READING_TXN_PLAN_SCHEMA_ =
  'H3_READING_TXN_PLAN_V1';

var H3_READING_CURRENT_SCHEMA_ =
  'H3_READING_CURRENT_LEARNING_V1';

var H3_READING_TXN_SHEET_ =
  'reading_web_txn_v1';

var H3_READING_STAGE_HEADERS_ = [
  'STAGE_ID',
  'ISSUE_NO',
  'SET_ID',
  'STATUS',
  'LEVEL',
  'SECTION_KEY',
  'ITEM_COUNT',
  'SOURCE_BINDING_SHA256',
  'LOCKED_BUNDLE_SHA256',
  'LOCKED_BUNDLE_JSON',
  'CREATED_AT',
  'LOCKED_AT',
  'ISSUED_AT',
  'COMMITTED_AT'
];

var H3_READING_TXN_HEADERS_ = [
  'TXN_ID',
  'SET_ID',
  'STAGE_ID',
  'MODE',
  'SURFACE_FAMILY',
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

var H3_READING_LOG_HEADERS_ = [
  'TXN_ID',
  'SET_ID',
  'Q_NO',
  'ITEM_ID',
  'QUESTION_KEY',
  'SKILL_ID',
  'RESULT',
  'UNCERTAIN',
  'PASSAGE_ID',
  'PASSAGE_SHA256',
  'ANSWERED_AT'
];


function h3ReadingActivationRequireId_(
  value,
  code
) {
  var normalized =
    String(value || '').trim();

  if (
    !normalized ||
    normalized.length > 128 ||
    /[\x00-\x1F]/.test(normalized)
  ) {
    throw new Error(code);
  }

  return normalized;
}


function h3ReadingActivationIdentity_(
  issueNo,
  stageId,
  setId
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
      'READING_ISSUE_NO_INVALID'
    );
  }

  return {
    schema:
      'H3_READING_RUNTIME_IDENTITY_V1',
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    issue_no:
      normalizedIssueNo,
    stage_id:
      h3ReadingActivationRequireId_(
        stageId,
        'READING_STAGE_ID_INVALID'
      ),
    set_id:
      h3ReadingActivationRequireId_(
        setId,
        'READING_SET_ID_INVALID'
      )
  };
}


function h3ReadingLockedBundleHash_(
  locked
) {
  if (
    !locked ||
    locked.schema !==
      H3_READING_LOCKED_SCHEMA_
  ) {
    throw new Error(
      'READING_LOCKED_BUNDLE_INVALID'
    );
  }

  return h3ReadingHash_(
    locked
  );
}


function h3ReadingPad3_(value) {
  var text = String(Number(value));
  while (text.length < 3) {
    text = '0' + text;
  }
  return text;
}


function h3ReadingSetIdFromDateSerial_(
  datePart,
  serial
) {
  var date =
    String(datePart || '');
  var normalizedSerial =
    Number(serial);

  if (
    !/^\d{8}$/.test(date) ||
    !Number.isInteger(normalizedSerial) ||
    normalizedSerial < 1 ||
    normalizedSerial > 999
  ) {
    throw new Error(
      'READING_SET_ID_ALLOCATION_INVALID'
    );
  }

  return (
    'H3-' +
    date +
    '-R' +
    h3ReadingPad3_(
      normalizedSerial
    )
  );
}


function h3ReadingSectionCode_(
  sectionKey
) {
  var normalized =
    String(sectionKey || '');

  if (
    [
      'H3-P8',
      'H3-P9',
      'H3-P10'
    ].indexOf(normalized) < 0
  ) {
    throw new Error(
      'READING_STAGE_SECTION_INVALID'
    );
  }

  return normalized.replace(
    'H3-',
    ''
  );
}


function h3ReadingStageIdFromDateSerial_(
  sectionKey,
  datePart,
  serial
) {
  var code =
    h3ReadingSectionCode_(
      sectionKey
    );
  var date =
    String(datePart || '');
  var normalizedSerial =
    Number(serial);

  if (
    !/^\d{8}$/.test(date) ||
    !Number.isInteger(normalizedSerial) ||
    normalizedSerial < 1 ||
    normalizedSerial > 999
  ) {
    throw new Error(
      'READING_STAGE_ID_ALLOCATION_INVALID'
    );
  }

  return (
    'READ-' +
    code +
    '-' +
    date +
    '-' +
    h3ReadingPad3_(
      normalizedSerial
    )
  );
}


function h3ReadingParseSetId_(
  setId
) {
  var match =
    /^H3-(\d{8})-R(\d{3})$/
      .exec(
        String(setId || '')
      );

  if (!match) {
    throw new Error(
      'READING_SET_ID_FORMAT_INVALID'
    );
  }

  return {
    date_part:
      match[1],
    serial:
      Number(match[2])
  };
}


function h3ReadingParseStageId_(
  stageId
) {
  var match =
    /^READ-(P8|P9|P10)-(\d{8})-(\d{3})$/
      .exec(
        String(stageId || '')
      );

  if (!match) {
    throw new Error(
      'READING_STAGE_ID_FORMAT_INVALID'
    );
  }

  return {
    section_key:
      'H3-' + match[1],
    date_part:
      match[2],
    serial:
      Number(match[3])
  };
}


function h3ReadingValidateIdentityParity_(
  sectionKey,
  stageId,
  setId
) {
  var expectedSection =
    'H3-' +
    h3ReadingSectionCode_(
      sectionKey
    );
  var stage =
    h3ReadingParseStageId_(
      stageId
    );
  var set =
    h3ReadingParseSetId_(
      setId
    );

  if (
    stage.section_key !==
      expectedSection ||
    stage.date_part !==
      set.date_part ||
    stage.serial !==
      set.serial
  ) {
    throw new Error(
      'READING_IDENTITY_PARITY_INVALID'
    );
  }

  return true;
}


function h3ReadingAllocateIdentityForSection_(
  sectionKey,
  datePart,
  rows
) {
  var normalizedSection =
    'H3-' +
    h3ReadingSectionCode_(
      sectionKey
    );
  if (!/^\d{8}$/.test(String(datePart || ''))) {
    throw new Error(
      'READING_ALLOCATION_DATE_INVALID'
    );
  }

  var maxIssueNo = 0;
  var maxDateSerial = 0;
  var seenSet = {};
  var seenStage = {};

  (rows || []).forEach(
    function (row) {
      row = row || {};

      var issueNo =
        Number(row.issue_no);
      if (
        !Number.isInteger(issueNo) ||
        issueNo < 1
      ) {
        throw new Error(
          'READING_ALLOCATION_EXISTING_ISSUE_INVALID'
        );
      }
      maxIssueNo =
        Math.max(
          maxIssueNo,
          issueNo
        );

      var setId =
        h3ReadingActivationRequireId_(
          row.set_id,
          'READING_ALLOCATION_EXISTING_SET_INVALID'
        );
      var stageId =
        h3ReadingActivationRequireId_(
          row.stage_id,
          'READING_ALLOCATION_EXISTING_STAGE_INVALID'
        );

      if (
        seenSet[setId] ||
        seenStage[stageId]
      ) {
        throw new Error(
          'READING_ALLOCATION_EXISTING_DUPLICATE'
        );
      }
      seenSet[setId] = true;
      seenStage[stageId] = true;

      var setParsed =
        h3ReadingParseSetId_(
          setId
        );
      var stageParsed =
        h3ReadingParseStageId_(
          stageId
        );

      if (
        stageParsed.date_part !==
          setParsed.date_part ||
        stageParsed.serial !==
          setParsed.serial
      ) {
        throw new Error(
          'READING_ALLOCATION_EXISTING_IDENTITY_PARITY_INVALID'
        );
      }

      if (
        row.section_key &&
        String(row.section_key) !==
          stageParsed.section_key
      ) {
        throw new Error(
          'READING_ALLOCATION_EXISTING_SECTION_MISMATCH'
        );
      }

      if (
        setParsed.date_part ===
          String(datePart)
      ) {
        maxDateSerial =
          Math.max(
            maxDateSerial,
            setParsed.serial
          );
      }
    }
  );

  var nextSerial =
    maxDateSerial + 1;

  if (nextSerial > 999) {
    throw new Error(
      'READING_ALLOCATION_SERIAL_EXHAUSTED'
    );
  }

  return h3ReadingActivationIdentity_(
    maxIssueNo + 1,
    h3ReadingStageIdFromDateSerial_(
      normalizedSection,
      datePart,
      nextSerial
    ),
    h3ReadingSetIdFromDateSerial_(
      datePart,
      nextSerial
    )
  );
}


function h3ReadingAllocateIdentityFromStageRows_(
  datePart,
  rows
) {
  return h3ReadingAllocateIdentityForSection_(
    'H3-P8',
    datePart,
    rows
  );
}


function h3ReadingLockedBundleJson_(
  locked
) {
  if (
    !locked ||
    locked.schema !==
      H3_READING_LOCKED_SCHEMA_
  ) {
    throw new Error(
      'READING_LOCKED_BUNDLE_INVALID'
    );
  }

  return h3ReadingCanonicalJson_(
    locked
  );
}


function h3ReadingParseLockedBundleJson_(
  value
) {
  var text =
    String(value || '');

  if (!text) {
    throw new Error(
      'READING_LOCKED_BUNDLE_JSON_MISSING'
    );
  }

  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_err) {
    throw new Error(
      'READING_LOCKED_BUNDLE_JSON_INVALID'
    );
  }

  if (
    !parsed ||
    parsed.schema !==
      H3_READING_LOCKED_SCHEMA_
  ) {
    throw new Error(
      'READING_LOCKED_BUNDLE_JSON_SCHEMA_INVALID'
    );
  }

  return parsed;
}


function h3ReadingBuildStage_(
  params,
  locked
) {
  params = params || {};

  var identity =
    h3ReadingActivationIdentity_(
      params.issue_no,
      params.stage_id,
      params.set_id
    );

  var createdAt =
    h3ReadingActivationRequireId_(
      params.created_at,
      'READING_STAGE_CREATED_AT_INVALID'
    );
  var lockedAt =
    h3ReadingActivationRequireId_(
      params.locked_at,
      'READING_STAGE_LOCKED_AT_INVALID'
    );

  if (
    !locked ||
    locked.schema !==
      H3_READING_LOCKED_SCHEMA_ ||
    locked.provider_kind !==
      'WRITTEN' ||
    locked.surface_family !==
      'READING' ||
    locked.level !== '3級' ||
    [
      'H3-P8',
      'H3-P9',
      'H3-P10'
    ].indexOf(
      locked.section_key
    ) < 0 ||
    !Array.isArray(
      locked.items
    ) ||
    locked.items.length < 1
  ) {
    throw new Error(
      'READING_STAGE_LOCK_INVALID'
    );
  }

  h3ReadingValidateIdentityParity_(
    locked.section_key,
    identity.stage_id,
    identity.set_id
  );

  return {
    schema:
      H3_READING_STAGE_SCHEMA_,
    activation_contract_id:
      H3_READING_ACTIVATION_CONTRACT_ID_,
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    issue_no:
      identity.issue_no,
    stage_id:
      identity.stage_id,
    set_id:
      identity.set_id,
    status: 'LOCKED',
    level:
      locked.level,
    section_key:
      locked.section_key,
    item_count:
      locked.items.length,
    source_binding_sha256:
      locked.source_binding_sha256,
    locked_bundle_sha256:
      h3ReadingLockedBundleHash_(
        locked
      ),
    locked_bundle_json:
      h3ReadingLockedBundleJson_(
        locked
      ),
    created_at:
      createdAt,
    locked_at:
      lockedAt,
    issued_at: null,
    committed_at: null
  };
}


function h3ReadingValidateStageLock_(
  stage,
  locked
) {
  if (
    !stage ||
    stage.schema !==
      H3_READING_STAGE_SCHEMA_ ||
    stage.activation_contract_id !==
      H3_READING_ACTIVATION_CONTRACT_ID_
  ) {
    throw new Error(
      'READING_STAGE_SCHEMA_INVALID'
    );
  }

  h3ReadingActivationIdentity_(
    stage.issue_no,
    stage.stage_id,
    stage.set_id
  );
  h3ReadingValidateIdentityParity_(
    stage.section_key,
    stage.stage_id,
    stage.set_id
  );

  if (
    !locked ||
    locked.schema !==
      H3_READING_LOCKED_SCHEMA_
  ) {
    throw new Error(
      'READING_STAGE_LOCKED_SOURCE_INVALID'
    );
  }

  var storedLocked =
    h3ReadingParseLockedBundleJson_(
      stage.locked_bundle_json
    );

  if (
    stage.provider_kind !==
      'WRITTEN' ||
    stage.surface_family !==
      'READING' ||
    stage.level !==
      locked.level ||
    stage.section_key !==
      locked.section_key ||
    Number(stage.item_count) !==
      locked.items.length ||
    stage.source_binding_sha256 !==
      locked.source_binding_sha256 ||
    stage.locked_bundle_sha256 !==
      h3ReadingLockedBundleHash_(
        locked
      ) ||
    h3ReadingCanonicalJson_(
      storedLocked
    ) !==
      h3ReadingCanonicalJson_(
        locked
      ) ||
    h3ReadingHash_(
      storedLocked
    ) !==
      stage.locked_bundle_sha256
  ) {
    throw new Error(
      'READING_STAGE_SOURCE_BINDING_MISMATCH'
    );
  }

  return true;
}


function h3ReadingPreissueValidate_(
  stage,
  locked,
  committedSetIds
) {
  h3ReadingValidateStageLock_(
    stage,
    locked
  );

  if (
    ['LOCKED', 'PREISSUE_READY']
      .indexOf(stage.status) < 0
  ) {
    throw new Error(
      'READING_PREISSUE_STAGE_STATUS_INVALID'
    );
  }

  if (
    stage.issued_at ||
    stage.committed_at
  ) {
    throw new Error(
      'READING_PREISSUE_ALREADY_ISSUED'
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
      'READING_PREISSUE_ALREADY_COMMITTED'
    );
  }

  return {
    schema:
      'H3_READING_PREISSUE_V1',
    status:
      'PREISSUE_READY',
    issue_no:
      stage.issue_no,
    stage_id:
      stage.stage_id,
    set_id:
      stage.set_id,
    item_count:
      stage.item_count,
    source_binding_sha256:
      stage.source_binding_sha256,
    locked_bundle_sha256:
      stage.locked_bundle_sha256
  };
}


function h3ReadingStageRowValues_(
  stage
) {
  if (
    !stage ||
    stage.schema !==
      H3_READING_STAGE_SCHEMA_
  ) {
    throw new Error(
      'READING_STAGE_ROW_INPUT_INVALID'
    );
  }

  return [
    stage.stage_id,
    stage.issue_no,
    stage.set_id,
    stage.status,
    stage.level,
    stage.section_key,
    stage.item_count,
    stage.source_binding_sha256,
    stage.locked_bundle_sha256,
    stage.locked_bundle_json,
    stage.created_at,
    stage.locked_at,
    stage.issued_at || '',
    stage.committed_at || ''
  ];
}


function h3ReadingBuildSectionMaterializationPlan_(
  sectionKey,
  datePart,
  existingStages,
  locked,
  timestamp
) {
  var normalizedSection =
    'H3-' +
    h3ReadingSectionCode_(
      sectionKey
    );

  if (
    !locked ||
    locked.section_key !==
      normalizedSection
  ) {
    throw new Error(
      'READING_MATERIALIZATION_SECTION_MISMATCH'
    );
  }

  var identity =
    h3ReadingAllocateIdentityForSection_(
      normalizedSection,
      datePart,
      existingStages
    );

  var stage =
    h3ReadingBuildStage_(
      {
        issue_no:
          identity.issue_no,
        stage_id:
          identity.stage_id,
        set_id:
          identity.set_id,
        created_at:
          timestamp,
        locked_at:
          timestamp
      },
      locked
    );

  var preissue =
    h3ReadingPreissueValidate_(
      stage,
      locked,
      []
    );

  var readyStage =
    JSON.parse(
      JSON.stringify(stage)
    );
  readyStage.status =
    preissue.status;

  return {
    schema:
      'H3_READING_SECTION_MATERIALIZATION_PLAN_V1',
    activation_contract_id:
      H3_READING_ACTIVATION_CONTRACT_ID_,
    section_key:
      normalizedSection,
    identity:
      identity,
    stage:
      readyStage,
    row_values:
      h3ReadingStageRowValues_(
        readyStage
      ),
    preissue:
      preissue
  };
}


function h3ReadingBuildMaterializationPlan_(
  datePart,
  existingStages,
  locked,
  timestamp
) {
  var plan =
    h3ReadingBuildSectionMaterializationPlan_(
      'H3-P8',
      datePart,
      existingStages,
      locked,
      timestamp
    );

  plan.schema =
    'H3_READING_MATERIALIZATION_PLAN_V1';

  return plan;
}


function h3ReadingNormalizeSubmission_(
  request,
  locked
) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_SUBMIT_V1' ||
    request.mode !== 'WRITTEN' ||
    request.provider_kind !==
      'WRITTEN' ||
    request.surface_family !==
      'READING'
  ) {
    throw new Error(
      'READING_SUBMIT_ENVELOPE_INVALID'
    );
  }

  var setId =
    h3ReadingActivationRequireId_(
      request.set_id,
      'READING_SUBMIT_SET_ID_INVALID'
    );

  if (
    !locked ||
    locked.schema !==
      H3_READING_LOCKED_SCHEMA_ ||
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
      'READING_SUBMIT_SHAPE_INVALID'
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
          h3ReadingActivationRequireId_(
            answer &&
              answer.question_key,
            'READING_SUBMIT_QUESTION_KEY_INVALID'
          );

        if (
          seen[key] ||
          !expected[key]
        ) {
          throw new Error(
            'READING_SUBMIT_QUESTION_IDENTITY_INVALID'
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
            'READING_SUBMIT_ANSWER_INVALID'
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
          'READING_SUBMIT_QUESTION_MISSING:' +
            item.question_key
        );
      }
    }
  );

  return {
    schema:
      'H3_WEB_SUBMIT_V1',
    mode: 'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    set_id:
      setId,
    answers:
      answers
  };
}


function h3ReadingRequestFingerprint_(
  normalized
) {
  if (
    !normalized ||
    normalized.schema !==
      'H3_WEB_SUBMIT_V1' ||
    normalized.surface_family !==
      'READING'
  ) {
    throw new Error(
      'READING_FINGERPRINT_INPUT_INVALID'
    );
  }

  return h3ReadingHash_({
    schema:
      'H3_READING_REQUEST_FINGERPRINT_V1',
    mode:
      normalized.mode,
    provider_kind:
      normalized.provider_kind,
    surface_family:
      normalized.surface_family,
    set_id:
      normalized.set_id,
    answers:
      normalized.answers
  });
}


function h3ReadingBuildTxnPlan_(
  stage,
  locked,
  request
) {
  h3ReadingValidateStageLock_(
    stage,
    locked
  );

  var normalized =
    h3ReadingNormalizeSubmission_(
      request,
      locked
    );

  if (
    normalized.set_id !==
      stage.set_id
  ) {
    throw new Error(
      'READING_TXN_SET_ID_MISMATCH'
    );
  }

  return {
    schema:
      H3_READING_TXN_PLAN_SCHEMA_,
    activation_contract_id:
      H3_READING_ACTIVATION_CONTRACT_ID_,
    journal_sheet:
      H3_READING_TXN_SHEET_,
    mode: 'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    issue_no:
      stage.issue_no,
    stage_id:
      stage.stage_id,
    set_id:
      stage.set_id,
    source_binding_sha256:
      stage.source_binding_sha256,
    request_fingerprint:
      h3ReadingRequestFingerprint_(
        normalized
      ),
    normalized_request:
      normalized
  };
}


function h3ReadingBuildCommittedResult_(
  stage,
  locked,
  grade,
  txnId
) {
  h3ReadingValidateStageLock_(
    stage,
    locked
  );

  if (
    !grade ||
    grade.schema !==
      'H3_READING_GRADE_V1' ||
    grade.total !==
      stage.item_count
  ) {
    throw new Error(
      'READING_RESULT_GRADE_INVALID'
    );
  }

  var normalizedTxnId =
    h3ReadingActivationRequireId_(
      txnId,
      'READING_RESULT_TXN_ID_INVALID'
    );

  return {
    schema:
      'H3_WEB_SUBMIT_RESULT_V1',
    mode: 'WRITTEN',
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    level:
      stage.level,
    persisted: true,
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
            passage_id:
              item.passage_id,
            passage_sha256:
              item.passage_sha256
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


function h3ReadingCurrentLearningCandidate_(
  stage,
  locked,
  committed
) {
  h3ReadingValidateStageLock_(
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
      H3_READING_CURRENT_SCHEMA_,
    provider_kind:
      'WRITTEN',
    surface_family:
      'READING',
    level:
      stage.level,
    issue_no:
      stage.issue_no,
    stage_id:
      stage.stage_id,
    set_id:
      stage.set_id,
    item_count:
      stage.item_count,
    source_binding_sha256:
      stage.source_binding_sha256
  };
}
