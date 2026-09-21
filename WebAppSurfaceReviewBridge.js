/**
 * F1 common persistent Review bridge for Reading / Translation.
 *
 * This file deliberately keeps the top-level Review provider kind as WRITTEN
 * and separates learner surfaces by surface_family.  It owns only the new
 * Reading/Translation persistent Review authorities; 5W overlay/backfill and
 * 5L Review authorities remain untouched.
 */

var H3_SURFACE_REVIEW_BRIDGE_CONTRACT_ID_ =
  'H3-SURFACE-REVIEW-BRIDGE-20260921-V1';

var H3_READING_PERSISTENT_REVIEW_SCHEMA_ =
  'H3_PERSISTENT_READING_REVIEW_PAYLOAD_V1';
var H3_TRANSLATION_PERSISTENT_REVIEW_SCHEMA_ =
  'H3_PERSISTENT_TRANSLATION_REVIEW_PAYLOAD_V1';

var H3_SURFACE_REVIEW_PAYLOAD_HEADERS_ = [
  'TXN_ID',
  'SET_ID',
  'STAGE_ID',
  'MATERIALIZED_AT',
  'STATUS',
  'REVIEW_SCHEMA',
  'REVIEW_JSON',
  'REVIEW_SHA256',
  'SOURCE_BINDING_SHA256',
  'RESULT_SHA256',
  'REVIEW_CONTRACT_ID',
  'LOCKED_AT'
];

var H3_SURFACE_REVIEW_BINDING_HEADERS_ = [
  'TXN_ID',
  'SET_ID',
  'STAGE_ID',
  'MATERIALIZED_AT',
  'STATUS',
  'RESULT_SHA256',
  'SOURCE_BINDING_SHA256',
  'REVIEW_SHA256',
  'REVIEW_CONTRACT_ID',
  'REVIEW_BINDING_SHA256',
  'LOCKED_AT'
];


function h3SurfaceReviewConfig_(surfaceFamily) {
  var family = String(surfaceFamily || '');

  if (family === 'READING') {
    return {
      family: family,
      schema:
        H3_READING_PERSISTENT_REVIEW_SCHEMA_,
      payload_sheet:
        'reading_review_payload_v1',
      binding_sheet:
        'reading_review_binding_v1',
      source_mode:
        'READING_PRODUCTION_WEB'
    };
  }

  if (family === 'TRANSLATION') {
    return {
      family: family,
      schema:
        H3_TRANSLATION_PERSISTENT_REVIEW_SCHEMA_,
      payload_sheet:
        'translation_review_payload_v1',
      binding_sheet:
        'translation_review_binding_v1',
      source_mode:
        'TRANSLATION_PRODUCTION_WEB'
    };
  }

  throw new Error(
    'SURFACE_REVIEW_FAMILY_INVALID'
  );
}


function h3SurfaceReviewStoredRowObject_(
  table,
  row
) {
  var out = {};
  table.header.forEach(
    function (name, index) {
      out[name] = row[index];
    }
  );
  return out;
}


function h3SurfaceReviewRowsBy_(
  table,
  column,
  value
) {
  var index = table.map[column];
  if (
    typeof index !== 'number'
  ) {
    throw new Error(
      'SURFACE_REVIEW_COLUMN_MISSING:' +
        column
    );
  }

  return table.rows
    .map(function (row, rowIndex) {
      return {
        row: row,
        rowNumber:
          rowIndex + 2
      };
    })
    .filter(function (record) {
      return (
        String(
          record.row[index] || ''
        ) === String(value || '')
      );
    });
}


function h3SurfaceReviewRequireSheets_(
  spreadsheet,
  surfaceFamily
) {
  var config =
    h3SurfaceReviewConfig_(
      surfaceFamily
    );
  var payloadSheet =
    spreadsheet.getSheetByName(
      config.payload_sheet
    );
  var bindingSheet =
    spreadsheet.getSheetByName(
      config.binding_sheet
    );

  h3ReviewRequireExactHeader_(
    payloadSheet,
    H3_SURFACE_REVIEW_PAYLOAD_HEADERS_,
    config.family +
      '_REVIEW_PAYLOAD'
  );
  h3ReviewRequireExactHeader_(
    bindingSheet,
    H3_SURFACE_REVIEW_BINDING_HEADERS_,
    config.family +
      '_REVIEW_BINDING'
  );

  return {
    config: config,
    payloadSheet: payloadSheet,
    payloadTable:
      h3ReviewTable_(payloadSheet),
    bindingSheet: bindingSheet,
    bindingTable:
      h3ReviewTable_(bindingSheet)
  };
}


function h3SurfaceReviewParseJson_(
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


function h3SurfaceReviewTxnContext_(
  spreadsheet,
  surfaceFamily,
  txnId
) {
  var family =
    String(surfaceFamily || '');
  var normalizedTxnId =
    String(txnId || '');

  if (!normalizedTxnId) {
    throw new Error(
      'SURFACE_REVIEW_TXN_ID_MISSING'
    );
  }

  var txnSheetName =
    family === 'READING'
      ? H3_READING_TXN_SHEET_
      : (
          family === 'TRANSLATION'
            ? H3_TRANSLATION_TXN_SHEET_
            : ''
        );
  var expectedHeaders =
    family === 'READING'
      ? H3_READING_TXN_HEADERS_
      : (
          family === 'TRANSLATION'
            ? H3_TRANSLATION_TXN_HEADERS_
            : null
        );

  if (!txnSheetName || !expectedHeaders) {
    throw new Error(
      'SURFACE_REVIEW_TXN_FAMILY_INVALID'
    );
  }

  var txnTable =
    family === 'READING'
      ? h3ReadingProdTable_(
          spreadsheet.getSheetByName(
            txnSheetName
          ),
          expectedHeaders,
          'READING_REVIEW_TXN'
        )
      : h3TranslationProdTable_(
          spreadsheet.getSheetByName(
            txnSheetName
          ),
          expectedHeaders,
          'TRANSLATION_REVIEW_TXN'
        );

  var matches =
    h3SurfaceReviewRowsBy_(
      txnTable,
      'TXN_ID',
      normalizedTxnId
    );

  if (matches.length !== 1) {
    throw new Error(
      'SURFACE_REVIEW_TXN_COUNT:' +
        family +
        ':' +
        matches.length
    );
  }

  var row = matches[0].row;
  var map = txnTable.map;
  var setId =
    String(row[map.SET_ID] || '');
  var stageId =
    String(row[map.STAGE_ID] || '');
  var status =
    String(row[map.STATUS] || '');
  var sourceBindingSha256 =
    String(
      row[
        map.SOURCE_BINDING_SHA256
      ] || ''
    );
  var committedAt =
    String(
      row[map.COMMITTED_AT] || ''
    );

  if (
    status !== 'COMMITTED' ||
    !setId ||
    !stageId ||
    !sourceBindingSha256 ||
    !committedAt ||
    String(
      row[map.SURFACE_FAMILY] || ''
    ) !== family
  ) {
    throw new Error(
      'SURFACE_REVIEW_TXN_NOT_COMMITTED:' +
        family
    );
  }

  var rawInput =
    h3SurfaceReviewParseJson_(
      row[map.RAW_INPUT_JSON],
      'SURFACE_REVIEW_RAW_INPUT_JSON_INVALID'
    );
  var storedResult =
    h3SurfaceReviewParseJson_(
      row[map.RESULT_JSON],
      'SURFACE_REVIEW_RESULT_JSON_INVALID'
    );

  var context =
    family === 'READING'
      ? h3ReadingProdReadContext_(
          spreadsheet,
          setId
        )
      : h3TranslationProdReadContext_(
          spreadsheet,
          setId
        );

  if (
    context.stage.stage_id !==
      stageId ||
    context.stage.set_id !==
      setId ||
    context.stage.status !==
      'COMMITTED' ||
    !context.stage.committed_at ||
    context.stage
      .source_binding_sha256 !==
      sourceBindingSha256
  ) {
    throw new Error(
      'SURFACE_REVIEW_STAGE_IDENTITY_MISMATCH:' +
        family
    );
  }

  var normalized =
    family === 'READING'
      ? h3ReadingNormalizeSubmission_(
          rawInput,
          context.locked
        )
      : h3TranslationNormalizeSubmission_(
          rawInput,
          context.locked
        );
  var grade =
    family === 'READING'
      ? h3ReadingGrade_(
          context.locked,
          normalized.answers
        )
      : h3TranslationGrade_(
          context.locked,
          normalized.answers
        );
  var expectedResult =
    family === 'READING'
      ? h3ReadingBuildCommittedResult_(
          context.stage,
          context.locked,
          grade,
          normalizedTxnId
        )
      : h3TranslationBuildCommittedResult_(
          context.stage,
          context.locked,
          grade,
          normalizedTxnId
        );

  if (
    h3ReviewHash_(storedResult) !==
      h3ReviewHash_(expectedResult) ||
    Number(row[map.SCORE] || 0) !==
      Number(grade.score)
  ) {
    throw new Error(
      'SURFACE_REVIEW_RESULT_MISMATCH:' +
        family
    );
  }

  if (
    family === 'TRANSLATION' &&
    (
      String(
        row[
          map.TRANSLATION_DIRECTION
        ] || ''
      ) !==
        context.stage
          .translation_direction ||
      String(
        row[map.ANSWER_TYPE] || ''
      ) !==
        context.stage.answer_type
    )
  ) {
    throw new Error(
      'SURFACE_REVIEW_TRANSLATION_IDENTITY_MISMATCH'
    );
  }

  return {
    family: family,
    txn_id: normalizedTxnId,
    set_id: setId,
    stage_id: stageId,
    committed_at: committedAt,
    source_binding_sha256:
      sourceBindingSha256,
    raw_input: normalized,
    result: expectedResult,
    result_sha256:
      h3ReviewHash_(expectedResult),
    grade: grade,
    stage: context.stage,
    locked: context.locked
  };
}


function h3SurfaceReviewBuildReadingPayload_(
  txn
) {
  var projection =
    h3ReadingBuildReviewProjection_(
      txn.locked,
      txn.grade
    );
  var wrongCount =
    txn.grade.graded.filter(
      function (item) {
        return item.mark === '×';
      }
    ).length;
  var uncertainCount =
    txn.grade.graded.filter(
      function (item) {
        return !!item.uncertain;
      }
    ).length;

  projection.schema =
    H3_READING_PERSISTENT_REVIEW_SCHEMA_;
  projection.persisted = true;
  projection.pilot_only = false;
  projection.set_id =
    txn.set_id;
  projection.stage_id =
    txn.stage_id;
  projection.txn_id =
    txn.txn_id;
  projection.issue_no =
    Number(txn.stage.issue_no);
  projection.section_key =
    String(
      txn.stage.section_key || ''
    );
  projection.answered_at =
    txn.committed_at;
  projection.score =
    Number(txn.grade.score);
  projection.total =
    Number(txn.grade.total);
  projection.wrong_count =
    wrongCount;
  projection.uncertainty_known =
    true;
  projection.uncertain_count =
    uncertainCount;

  return projection;
}


function h3SurfaceReviewBuildTranslationPayload_(
  txn
) {
  var resultByKey = {};
  txn.grade.graded.forEach(
    function (item) {
      resultByKey[
        item.question_key
      ] = item;
    }
  );

  var questions =
    txn.locked.items.map(
      function (item) {
        var result =
          resultByKey[
            item.question_key
          ];
        if (!result) {
          throw new Error(
            'TRANSLATION_REVIEW_RESULT_MISSING'
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
          user_answer:
            result.answer,
          correct_answer:
            result.correct_answer,
          mark:
            result.mark,
          explicit_uncertainty:
            result.uncertain
        };
      }
    );
  var wrongCount =
    txn.grade.graded.filter(
      function (item) {
        return item.mark === '×';
      }
    ).length;
  var uncertainCount =
    txn.grade.graded.filter(
      function (item) {
        return !!item.uncertain;
      }
    ).length;

  return {
    schema:
      H3_TRANSLATION_PERSISTENT_REVIEW_SCHEMA_,
    mode: 'REVIEW',
    kind: 'WRITTEN',
    provider_kind: 'WRITTEN',
    surface_family:
      'TRANSLATION',
    level:
      txn.locked.level,
    item_count:
      questions.length,
    read_only: true,
    persisted: true,
    pilot_only: false,
    set_id:
      txn.set_id,
    stage_id:
      txn.stage_id,
    txn_id:
      txn.txn_id,
    issue_no:
      Number(txn.stage.issue_no),
    section_key:
      txn.stage.section_key,
    translation_direction:
      txn.stage.translation_direction,
    answer_type:
      txn.stage.answer_type,
    source_language:
      txn.locked.source_language,
    choice_language:
      txn.locked.choice_language,
    source_binding_sha256:
      txn.source_binding_sha256,
    answered_at:
      txn.committed_at,
    score:
      Number(txn.grade.score),
    total:
      Number(txn.grade.total),
    wrong_count:
      wrongCount,
    uncertainty_known:
      true,
    uncertain_count:
      uncertainCount,
    questions:
      questions
  };
}


function h3SurfaceReviewBuildPayload_(
  txn
) {
  if (txn.family === 'READING') {
    return h3SurfaceReviewBuildReadingPayload_(
      txn
    );
  }
  if (
    txn.family === 'TRANSLATION'
  ) {
    return h3SurfaceReviewBuildTranslationPayload_(
      txn
    );
  }
  throw new Error(
    'SURFACE_REVIEW_BUILD_FAMILY_INVALID'
  );
}


function h3SurfaceReviewValidatePayload_(
  payload,
  config
) {
  if (
    !payload ||
    payload.schema !== config.schema ||
    payload.mode !== 'REVIEW' ||
    payload.kind !== 'WRITTEN' ||
    payload.provider_kind !==
      'WRITTEN' ||
    payload.surface_family !==
      config.family ||
    payload.read_only !== true ||
    payload.persisted !== true ||
    !payload.set_id ||
    !payload.stage_id ||
    !payload.txn_id ||
    !payload.answered_at ||
    !payload.source_binding_sha256 ||
    !Array.isArray(
      payload.questions
    ) ||
    !Number.isInteger(
      Number(payload.item_count)
    ) ||
    Number(payload.item_count) !==
      payload.questions.length ||
    Number(payload.total) !==
      payload.questions.length
  ) {
    throw new Error(
      'SURFACE_REVIEW_PAYLOAD_SHAPE_INVALID:' +
        config.family
    );
  }

  if (config.family === 'READING') {
    if (
      !payload.passage ||
      !payload.passage.passage_id ||
      !payload.passage.passage_sha256 ||
      !payload.passage.text_ko ||
      !payload.passage.text_ja ||
      !Array.isArray(
        payload.sections
      ) ||
      payload.sections.length !==
        payload.questions.length
    ) {
      throw new Error(
        'READING_REVIEW_PASSAGE_MISSING'
      );
    }

    payload.questions.forEach(
      function (question) {
        if (
          question.passage_id !==
            payload.passage.passage_id ||
          question.passage_sha256 !==
            payload.passage.passage_sha256
        ) {
          throw new Error(
            'READING_REVIEW_PASSAGE_BINDING_MISMATCH'
          );
        }
      }
    );

    payload.sections.forEach(
      function (section) {
        if (
          !section.explanation ||
          section.explanation.contract_id !==
            H3_READING_P8_EXPLANATION_CONTRACT_ID_ ||
          section.explanation.source_binding_sha256 !==
            payload.source_binding_sha256 ||
          section.explanation.passage_sha256 !==
            payload.passage.passage_sha256 ||
          section.passage_id !==
            payload.passage.passage_id ||
          section.passage_sha256 !==
            payload.passage.passage_sha256
        ) {
          throw new Error(
            'READING_REVIEW_EXPLANATION_BINDING_MISMATCH'
          );
        }
      }
    );
  }

  if (
    config.family === 'TRANSLATION'
  ) {
    if (
      !payload.translation_direction ||
      payload.answer_type !==
        'MULTIPLE_CHOICE'
    ) {
      throw new Error(
        'TRANSLATION_REVIEW_METADATA_MISSING'
      );
    }

    payload.questions.forEach(
      function (question) {
        if (
          question.translation_direction !==
            payload.translation_direction ||
          question.answer_type !==
            payload.answer_type
        ) {
          throw new Error(
            'TRANSLATION_REVIEW_METADATA_MISMATCH'
          );
        }
      }
    );
  }

  return payload;
}


function h3SurfaceReviewBindingObject_(
  config,
  txn,
  reviewSha256
) {
  return {
    surface_family:
      config.family,
    txn_id:
      txn.txn_id,
    set_id:
      txn.set_id,
    stage_id:
      txn.stage_id,
    result_sha256:
      txn.result_sha256,
    source_binding_sha256:
      txn.source_binding_sha256,
    review_sha256:
      reviewSha256,
    review_contract_id:
      H3_SURFACE_REVIEW_BRIDGE_CONTRACT_ID_
  };
}


function h3SurfaceReviewEnsure_(
  surfaceFamily,
  txnId
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var config =
    h3SurfaceReviewConfig_(
      surfaceFamily
    );
  var txn =
    h3SurfaceReviewTxnContext_(
      spreadsheet,
      config.family,
      txnId
    );
  var expected =
    h3SurfaceReviewValidatePayload_(
      h3SurfaceReviewBuildPayload_(
        txn
      ),
      config
    );
  var reviewSha256 =
    h3ReviewHash_(expected);
  var bindingSha256 =
    h3ReviewHash_(
      h3SurfaceReviewBindingObject_(
        config,
        txn,
        reviewSha256
      )
    );
  var sheets =
    h3SurfaceReviewRequireSheets_(
      spreadsheet,
      config.family
    );
  var payloadRows =
    h3SurfaceReviewRowsBy_(
      sheets.payloadTable,
      'TXN_ID',
      txn.txn_id
    );
  var bindingRows =
    h3SurfaceReviewRowsBy_(
      sheets.bindingTable,
      'TXN_ID',
      txn.txn_id
    );

  if (
    payloadRows.length > 1 ||
    bindingRows.length > 1
  ) {
    throw new Error(
      'SURFACE_REVIEW_DUPLICATE_TXN:' +
        config.family
    );
  }

  if (
    payloadRows.length === 0 &&
    bindingRows.length === 1
  ) {
    throw new Error(
      'SURFACE_REVIEW_RECOVERY_REQUIRED_BINDING_ONLY:' +
        config.family
    );
  }

  var now =
    h3NowTokyo_();

  if (payloadRows.length === 0) {
    sheets.payloadSheet.appendRow([
      txn.txn_id,
      txn.set_id,
      txn.stage_id,
      now,
      'PREPARED',
      config.schema,
      JSON.stringify(expected),
      reviewSha256,
      txn.source_binding_sha256,
      txn.result_sha256,
      H3_SURFACE_REVIEW_BRIDGE_CONTRACT_ID_,
      ''
    ]);
    SpreadsheetApp.flush();

    sheets =
      h3SurfaceReviewRequireSheets_(
        spreadsheet,
        config.family
      );
    payloadRows =
      h3SurfaceReviewRowsBy_(
        sheets.payloadTable,
        'TXN_ID',
        txn.txn_id
      );
  }

  if (payloadRows.length !== 1) {
    throw new Error(
      'SURFACE_REVIEW_PAYLOAD_PREPARE_FAILED:' +
        config.family
    );
  }

  var prepared =
    h3SurfaceReviewStoredRowObject_(
      sheets.payloadTable,
      payloadRows[0].row
    );
  var preparedStatus =
    String(prepared.STATUS || '');

  if (
    String(prepared.SET_ID || '') !==
      txn.set_id ||
    String(prepared.STAGE_ID || '') !==
      txn.stage_id ||
    String(prepared.REVIEW_SCHEMA || '') !==
      config.schema ||
    String(prepared.REVIEW_SHA256 || '') !==
      reviewSha256 ||
    String(
      prepared.SOURCE_BINDING_SHA256 ||
      ''
    ) !==
      txn.source_binding_sha256 ||
    String(prepared.RESULT_SHA256 || '') !==
      txn.result_sha256 ||
    String(
      prepared.REVIEW_CONTRACT_ID ||
      ''
    ) !==
      H3_SURFACE_REVIEW_BRIDGE_CONTRACT_ID_ ||
    ['PREPARED', 'LOCKED']
      .indexOf(preparedStatus) < 0
  ) {
    throw new Error(
      'SURFACE_REVIEW_PREPARED_IDENTITY_MISMATCH:' +
        config.family
    );
  }

  if (bindingRows.length === 1) {
    var existingBinding =
      h3SurfaceReviewStoredRowObject_(
        sheets.bindingTable,
        bindingRows[0].row
      );

    if (
      String(existingBinding.STATUS || '') !==
        'LOCKED' ||
      String(existingBinding.SET_ID || '') !==
        txn.set_id ||
      String(existingBinding.STAGE_ID || '') !==
        txn.stage_id ||
      String(
        existingBinding.RESULT_SHA256 ||
        ''
      ) !==
        txn.result_sha256 ||
      String(
        existingBinding
          .SOURCE_BINDING_SHA256 ||
        ''
      ) !==
        txn.source_binding_sha256 ||
      String(
        existingBinding.REVIEW_SHA256 ||
        ''
      ) !==
        reviewSha256 ||
      String(
        existingBinding
          .REVIEW_BINDING_SHA256 ||
        ''
      ) !==
        bindingSha256 ||
      String(
        existingBinding
          .REVIEW_CONTRACT_ID ||
        ''
      ) !==
        H3_SURFACE_REVIEW_BRIDGE_CONTRACT_ID_
    ) {
      throw new Error(
        'SURFACE_REVIEW_EXISTING_BINDING_MISMATCH:' +
          config.family
      );
    }
  }

  if (
    preparedStatus === 'LOCKED' &&
    bindingRows.length === 1
  ) {
    return h3SurfaceReviewContextBySet_(
      spreadsheet,
      config.family,
      txn.set_id
    ).payload;
  }

  if (bindingRows.length === 0) {
    sheets.bindingSheet.appendRow([
      txn.txn_id,
      txn.set_id,
      txn.stage_id,
      String(
        prepared.MATERIALIZED_AT ||
        now
      ),
      'LOCKED',
      txn.result_sha256,
      txn.source_binding_sha256,
      reviewSha256,
      H3_SURFACE_REVIEW_BRIDGE_CONTRACT_ID_,
      bindingSha256,
      now
    ]);
    SpreadsheetApp.flush();
  }

  sheets.payloadSheet
    .getRange(
      payloadRows[0].rowNumber,
      5
    )
    .setValue('LOCKED');
  sheets.payloadSheet
    .getRange(
      payloadRows[0].rowNumber,
      12
    )
    .setValue(now);
  SpreadsheetApp.flush();

  return h3SurfaceReviewContextBySet_(
    spreadsheet,
    config.family,
    txn.set_id
  ).payload;
}


function h3SurfaceReviewContextBySet_(
  spreadsheet,
  surfaceFamily,
  setId
) {
  var config =
    h3SurfaceReviewConfig_(
      surfaceFamily
    );
  var sheets =
    h3SurfaceReviewRequireSheets_(
      spreadsheet,
      config.family
    );
  var payloadRows =
    h3SurfaceReviewRowsBy_(
      sheets.payloadTable,
      'SET_ID',
      setId
    );
  var bindingRows =
    h3SurfaceReviewRowsBy_(
      sheets.bindingTable,
      'SET_ID',
      setId
    );

  if (
    payloadRows.length !== 1 ||
    bindingRows.length !== 1
  ) {
    throw new Error(
      'SURFACE_REVIEW_SET_COUNT:' +
        config.family +
        ':' +
        payloadRows.length +
        ':' +
        bindingRows.length
    );
  }

  var payloadRow =
    h3SurfaceReviewStoredRowObject_(
      sheets.payloadTable,
      payloadRows[0].row
    );
  var bindingRow =
    h3SurfaceReviewStoredRowObject_(
      sheets.bindingTable,
      bindingRows[0].row
    );

  if (
    String(payloadRow.STATUS || '') !==
      'LOCKED' ||
    String(bindingRow.STATUS || '') !==
      'LOCKED' ||
    String(payloadRow.TXN_ID || '') !==
      String(bindingRow.TXN_ID || '') ||
    String(payloadRow.STAGE_ID || '') !==
      String(bindingRow.STAGE_ID || '') ||
    String(payloadRow.REVIEW_SHA256 || '') !==
      String(bindingRow.REVIEW_SHA256 || '') ||
    String(payloadRow.RESULT_SHA256 || '') !==
      String(bindingRow.RESULT_SHA256 || '') ||
    String(
      payloadRow.SOURCE_BINDING_SHA256 ||
      ''
    ) !==
      String(
        bindingRow.SOURCE_BINDING_SHA256 ||
        ''
      ) ||
    String(
      payloadRow.REVIEW_CONTRACT_ID ||
      ''
    ) !==
      H3_SURFACE_REVIEW_BRIDGE_CONTRACT_ID_ ||
    String(
      bindingRow.REVIEW_CONTRACT_ID ||
      ''
    ) !==
      H3_SURFACE_REVIEW_BRIDGE_CONTRACT_ID_
  ) {
    throw new Error(
      'SURFACE_REVIEW_LOCK_IDENTITY_MISMATCH:' +
        config.family
    );
  }

  var payload =
    h3SurfaceReviewParseJson_(
      payloadRow.REVIEW_JSON,
      'SURFACE_REVIEW_JSON_INVALID:' +
        config.family
    );
  h3SurfaceReviewValidatePayload_(
    payload,
    config
  );

  var reviewSha256 =
    h3ReviewHash_(payload);
  if (
    reviewSha256 !==
      String(
        payloadRow.REVIEW_SHA256 ||
        ''
      )
  ) {
    throw new Error(
      'SURFACE_REVIEW_HASH_MISMATCH:' +
        config.family
    );
  }

  var txn =
    h3SurfaceReviewTxnContext_(
      spreadsheet,
      config.family,
      String(payloadRow.TXN_ID || '')
    );
  var expectedBindingSha256 =
    h3ReviewHash_(
      h3SurfaceReviewBindingObject_(
        config,
        txn,
        reviewSha256
      )
    );

  if (
    txn.set_id !== String(setId || '') ||
    txn.stage_id !==
      String(payloadRow.STAGE_ID || '') ||
    txn.result_sha256 !==
      String(payloadRow.RESULT_SHA256 || '') ||
    txn.source_binding_sha256 !==
      String(
        payloadRow.SOURCE_BINDING_SHA256 ||
        ''
      ) ||
    expectedBindingSha256 !==
      String(
        bindingRow
          .REVIEW_BINDING_SHA256 ||
        ''
      )
  ) {
    throw new Error(
      'SURFACE_REVIEW_SOURCE_LOCK_MISMATCH:' +
        config.family
    );
  }

  return {
    config: config,
    payload: payload,
    reviewSha256:
      reviewSha256,
    txn: txn
  };
}


function h3SurfaceReviewHistoryEntries_(
  spreadsheet,
  surfaceFamily
) {
  var config =
    h3SurfaceReviewConfig_(
      surfaceFamily
    );
  var sheets =
    h3SurfaceReviewRequireSheets_(
      spreadsheet,
      config.family
    );
  var entries = [];
  var seen = {};

  sheets.bindingTable.rows.forEach(
    function (row) {
      var setId =
        String(
          row[
            sheets.bindingTable.map.SET_ID
          ] || ''
        );
      if (!setId) {
        return;
      }

      if (seen[setId]) {
        throw new Error(
          'SURFACE_REVIEW_HISTORY_DUPLICATE_SET:' +
            config.family +
            ':' +
            setId
        );
      }
      seen[setId] = true;

      var context =
        h3SurfaceReviewContextBySet_(
          spreadsheet,
          config.family,
          setId
        );
      var payload =
        context.payload;

      entries.push({
        review_kind: 'WRITTEN',
        provider_kind:
          'WRITTEN',
        surface_family:
          config.family,
        level:
          payload.level,
        set_id:
          payload.set_id,
        answered_at:
          payload.answered_at,
        score:
          Number(payload.score),
        total:
          Number(payload.total),
        wrong_count:
          Number(
            payload.wrong_count || 0
          ),
        uncertainty_known:
          payload.uncertainty_known !==
            false,
        uncertain_count:
          Number(
            payload.uncertain_count || 0
          ),
        needs_review:
          payload.questions.some(
            function (question) {
              return (
                question.mark !== '○'
              );
            }
          ),
        replay_capability:
          'unavailable',
        source_mode:
          config.source_mode,
        review_open_validation:
          'FULL_SOURCE_LOCK_ON_OPEN'
      });
    }
  );

  return entries;
}


function h3SurfaceReviewOpen_(
  request
) {
  var family =
    String(
      request &&
      request.surface_family ||
      ''
    );
  var setId =
    String(
      request &&
      request.set_id ||
      ''
    );

  if (
    ['READING', 'TRANSLATION']
      .indexOf(family) < 0 ||
    !setId
  ) {
    throw new Error(
      'SURFACE_REVIEW_REQUEST_INVALID'
    );
  }

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  return h3SurfaceReviewContextBySet_(
    spreadsheet,
    family,
    setId
  ).payload;
}
