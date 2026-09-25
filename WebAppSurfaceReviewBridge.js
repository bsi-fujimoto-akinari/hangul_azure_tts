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


function h3SurfaceReviewComparableResult_(
  surfaceFamily,
  storedResult,
  expectedResult
) {
  var family =
    String(surfaceFamily || '');

  if (
    ['READING', 'TRANSLATION']
      .indexOf(family) < 0
  ) {
    return expectedResult;
  }

  var hasStoredStatus =
    Object.prototype.hasOwnProperty.call(
      storedResult || {},
      'status'
    );

  if (hasStoredStatus) {
    return expectedResult;
  }

  if (
    !expectedResult ||
    expectedResult.status !== 'COMMITTED' ||
    String(
      storedResult &&
      storedResult.receipt || ''
    ).split('\n').indexOf(
      'STATUS=COMMITTED'
    ) < 0
  ) {
    throw new Error(
      'SURFACE_REVIEW_' +
        family +
        '_LEGACY_RESULT_INVALID'
    );
  }

  var compatible =
    JSON.parse(
      JSON.stringify(
        expectedResult
      )
    );
  delete compatible.status;

  return compatible;
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

  var txnTable;
  var translationV2 = false;

  if (family === 'READING') {
    txnTable =
      h3ReadingProdTable_(
        spreadsheet.getSheetByName(
          H3_READING_TXN_SHEET_
        ),
        H3_READING_TXN_HEADERS_,
        'READING_REVIEW_TXN'
      );
  } else if (family === 'TRANSLATION') {
    var v1Table =
      h3TranslationProdTable_(
        spreadsheet.getSheetByName(
          H3_TRANSLATION_TXN_SHEET_
        ),
        H3_TRANSLATION_TXN_HEADERS_,
        'TRANSLATION_REVIEW_TXN'
      );
    var v2Table =
      h3TranslationV2ProdTable_(
        spreadsheet.getSheetByName(
          H3_TRANSLATION_V2_TXN_SHEET_
        ),
        H3_TRANSLATION_V2_TXN_HEADERS_,
        'TRANSLATION_V2_REVIEW_TXN'
      );
    var v1Matches =
      h3SurfaceReviewRowsBy_(
        v1Table,
        'TXN_ID',
        normalizedTxnId
      );
    var v2Matches =
      h3SurfaceReviewRowsBy_(
        v2Table,
        'TXN_ID',
        normalizedTxnId
      );

    if (
      v1Matches.length +
        v2Matches.length !==
          1
    ) {
      throw new Error(
        'SURFACE_REVIEW_TXN_COUNT:' +
          family +
          ':' +
          String(
            v1Matches.length +
            v2Matches.length
          )
      );
    }

    translationV2 =
      v2Matches.length === 1;
    txnTable =
      translationV2
        ? v2Table
        : v1Table;
  } else {
    throw new Error(
      'SURFACE_REVIEW_TXN_FAMILY_INVALID'
    );
  }

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
      : (
          translationV2
            ? h3TranslationV2ProdReadContext_(
                spreadsheet,
                setId
              )
            : h3TranslationProdReadContext_(
                spreadsheet,
                setId
              )
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
      : (
          translationV2
            ? h3TranslationV2NormalizeSubmission_(
                rawInput,
                context.locked
              )
            : h3TranslationNormalizeSubmission_(
                rawInput,
                context.locked
              )
        );
  var grade =
    family === 'READING'
      ? h3ReadingGrade_(
          context.locked,
          normalized.answers
        )
      : (
          translationV2
            ? h3TranslationV2Grade_(
                context.locked,
                normalized.answers
              )
            : h3TranslationGrade_(
                context.locked,
                normalized.answers
              )
        );
  var expectedResult =
    family === 'READING'
      ? h3ReadingBuildCommittedResult_(
          context.stage,
          context.locked,
          grade,
          normalizedTxnId
        )
      : (
          translationV2
            ? h3TranslationV2BuildCommittedResult_(
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
              )
        );

  var comparableExpectedResult =
    h3SurfaceReviewComparableResult_(
      family,
      storedResult,
      expectedResult
    );
  var comparableResultSha256 =
    h3ReviewHash_(
      comparableExpectedResult
    );

  if (
    h3ReviewHash_(storedResult) !==
      comparableResultSha256 ||
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
      (
        translationV2 &&
        (
          String(
            row[map.PROFILE] || ''
          ) !==
            context.stage.profile ||
          String(
            row[map.ANSWER_TYPE] || ''
          ) !==
            context.stage.answer_type
        )
      ) ||
      (
        !translationV2 &&
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
      )
    )
  ) {
    throw new Error(
      'SURFACE_REVIEW_TRANSLATION_IDENTITY_MISMATCH'
    );
  }

  return {
    family: family,
    translation_v2:
      translationV2,
    txn_id: normalizedTxnId,
    set_id: setId,
    stage_id: stageId,
    committed_at: committedAt,
    source_binding_sha256:
      sourceBindingSha256,
    raw_input: normalized,
    result:
      comparableExpectedResult,
    result_sha256:
      comparableResultSha256,
    grade: grade,
    stage: context.stage,
    locked: context.locked
  };
}function h3SurfaceReviewBuildReadingPayload_(
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
      function (item, index) {
        var result =
          resultByKey[
            item.question_key
          ];
        if (!result) {
          throw new Error(
            'TRANSLATION_REVIEW_RESULT_MISSING'
          );
        }

        var section =
          String(
            item.section ||
            item.section_key ||
            ''
          ).replace(
            /^H3-/,
            ''
          );

        return {
          item_id:
            item.item_id,
          question_key:
            item.question_key,
          q_no:
            Number(
              item.q_no ||
              index + 1
            ),
          section:
            section,
          section_key:
            String(
              item.section_key ||
              (
                section
                  ? 'H3-' + section
                  : ''
              )
            ),
          skill_id:
            item.skill_id,
          translation_direction:
            item.translation_direction,
          source_language:
            item.source_language,
          choice_language:
            item.choice_language,
          answer_type:
            item.answer_type,
          target_segment:
            item.target_segment,
          question_text:
            item.question_text,
          choices:
            item.choices.slice(),
          user_answer:
            Number(result.answer),
          correct_answer:
            Number(
              result.correct_answer
            ),
          mark:
            result.mark,
          explicit_uncertainty:
            result.uncertain,
          source_kind:
            String(
              item.source_kind || ''
            ),
          surface_key:
            String(
              item.surface_key || ''
            )
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

  var out = {
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
    answer_type:
      txn.stage.answer_type,
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

  if (txn.translation_v2) {
    out.translation_profile =
      txn.stage.profile;
  } else {
    out.section_key =
      txn.stage.section_key;
    out.translation_direction =
      txn.stage.translation_direction;
    out.source_language =
      txn.locked.source_language;
    out.choice_language =
      txn.locked.choice_language;
  }

  return out;
}var H3_TRANSLATION_EXPLANATION_CONTRACT_ID_ =
  'H3-TRANSLATION-EXPLANATION-20260921-V1';

var H3_TRANSLATION_EXPLANATION_OVERLAY_V1_ = {
  '4c863cedd0d640949995640f31872cf66bb055cf7bef32e2fd4b0c99779887dd': {
    section_key: 'H3-P11',
    items: {
      'OFF-H3-P11-001': {
        item_sha256:
          '0a9e5a3daab41331a5a5ff2afb1df3700a8b4cc1199df1bee74e7d26bef1e170',
        skill_id: 'H3-P11-SK001',
        explanation: {
          body_ja:
            '若いなんてとんでもないです。もう60ですよ。',
          reason:
            'ここで -기는요 は相手の評価を受けて強く打ち消す表現。後続の 벌써 예순인데요（もう60ですよ）が、その反駁を支えている。したがって①「若いなんてとんでもないです。」が適切。',
          learning_blocks: [
            {
              form: '-기는요',
              usage:
            '相手の発言・評価を「～だなんて、とんでもない」のように打ち消す。'
            },
            {
              form: '벌써',
              usage:
            '「もう、すでに」。予想より早い・進んでいるという感覚を伴うことがある。'
            },
            {
              form: '예순',
              usage:
            '60を表す固有数詞。'
            }
          ]
        }
      },
      'OFF-H3-P11-002': {
        item_sha256:
          'c2a43fa1ce4319a997ca9abcc0c1cefdc8f2272929bc1df59c987ad984d239fc',
        skill_id: 'H3-P11-SK002',
        explanation: {
          body_ja:
            '私は社長に言われたとおりにしただけです。',
          reason:
            '-는 대로 は「～する通りに」、-았/었을 뿐이다 は「～しただけだ」を表す。시키시는 대로 했을 뿐입니다 はこの二つが組み合わさり、「言われたとおりにしただけです。」となるため②が適切。',
          learning_blocks: [
            {
              form: '-는 대로',
              usage:
            '動作・指示の内容にそのまま従う「～する通りに」。시키시는 대로 で「指示なさる通りに」。'
            },
            {
              form: '-았/었을 뿐이다',
              usage:
            '「～しただけだ」。行為をそれ以上に広げず限定する。'
            },
            {
              form: '시키다',
              usage:
            '「させる、命じる」。文脈では 사장님께서 시키시다 が「社長が指示する」に当たる。'
            }
          ]
        }
      }
    }
  },
  'cd252fed03e56d00f73ea755a7fd5df729b1709caede38baa113c2f4d60ebfd4': {
    section_key: 'H3-P12',
    items: {
      'OFF-H3-P12-001': {
        item_sha256:
          '46156856bdd8d190b161e07c02870d13e81f463203fb592d1e11daa7ba410d14',
        skill_id: 'H3-P11-SK017',
        explanation: {
          choices: [
            {
              ko: '얼굴색만 보지 않고',
              ja: '顔の色だけ見ないで'
            },
            {
              ko: '눈치만 보지 말고',
              ja: '顔色ばかりうかがわないで'
            },
            {
              ko: '신경만 쓰지 말고',
              ja: '気ばかり使わないで'
            },
            {
              ko: '정신만 팔지 않고',
              ja: '気ばかり散らさないで'
            }
          ],
          reason:
            '「顔色をうかがう」は相手の反応や機嫌を気にする意味なので、慣用表現 눈치 보다 が対応する。さらに後続が「自分の意見を言ってください」なので、禁止から次の行動へつなぐ -지 말고 が自然。したがって② 눈치만 보지 말고 が適切。',
          learning_blocks: [
            {
              form: '눈치 보다',
              usage:
            '相手の反応・機嫌・周囲の空気を気にする「顔色をうかがう」。'
            },
            {
              form: '-지 말고',
              usage:
            '「～しないで、（代わりに）…」。前の行動を止め、後続の行動へつなげる。'
            }
          ]
        }
      },
      'OFF-H3-P12-002': {
        item_sha256:
          '984a2c8d473d92740e6b291f33fd10a92e9860efa6597fd8673401fb4151d372',
        skill_id: 'H3-P11-SK011',
        explanation: {
          choices: [
            {
              ko: '아픔이 더할 겁니다.',
              ja: '痛みが増すでしょう。'
            },
            {
              ko: '아픈 곳이 나을 겁니다.',
              ja: '痛いところが治るでしょう。'
            },
            {
              ko: '좀 덜 아플 거예요.',
              ja: '少し痛みが和らぐでしょう。'
            },
            {
              ko: '조금 심해질 거예요.',
              ja: '少しひどくなるでしょう。'
            }
          ],
          reason:
            '덜 は「より少なく」、아프다 は「痛い」なので 덜 아프다 は「痛みがより少ない＝痛みが和らぐ」に対応する。①と④は悪化する意味で反対、②の 낫다 は「治る」で意味が強すぎるため、③が適切。',
          learning_blocks: [
            {
              form: '덜 + 형용사',
              usage:
            '程度が「より少なく～だ」。덜 아프다 で「前より痛くない、痛みが和らぐ」。'
            },
            {
              form: '-(으)ㄹ 거예요',
              usage:
            '未来の見込み・予測を表す。ここでは薬を飲んだ後の状態の予測。'
            },
            {
              form: '낫다 ≠ 덜 아프다',
              usage:
            '낫다 は「治る・よくなる」、덜 아프다 は「痛みが軽くなる」。同じではない。'
            }
          ]
        }
      }
    }
  }
};


var H3_TRANSLATION_V2_EXPLANATION_OVERLAY_ = {
  'OFF-H3-P11-003': {
    source_item_sha256:
      '0f05dc338afa019ccba9389e3cf949093b3450ffdd0ea8d7400f8f25f3e59abf',
    explanation: {
      body_ja:
        'こういうものは最近めったにない。',
      reason:
            '보기 드물다 は「見ることが珍しい」から「めったに見ない、珍しい」を表す。この文脈では④「めったにない。」が対応する。',
      learning_blocks: [
        {
          form: '보기 드물다',
          usage:
            '「めったに見ない、珍しい」。보기 쉽다／어렵다 のように 보기 + 形容詞で「見るのが～」を表す形と関連する。'
        }
      ]
    }
  },
  'AUTH-H3-P12-RT-SK017-001': {
    source_item_sha256:
      '36052f02dbc145ddd880529d268fad9d143fc4b194facf94896dfebf4deaa2cb',
    explanation: {
      body_ja:
        '彼は周囲の顔色を気にしすぎて、会議で自分の考えを言えなかった。',
      reason:
            '눈치를 보다 は「顔色・反応をうかがう」、-느라 はある行為が原因で後続の望ましくない結果になったことを表す。したがって① 주변 사람들의 눈치를 너무 보느라 が最も自然。',
      learning_blocks: [
        {
          form: '눈치를 보다',
          usage:
            '周囲の反応や機嫌を気にする「顔色をうかがう」。'
        },
        {
          form: '-느라',
          usage:
            '「～するのに／～していたため」。前の行為が後ろの結果の原因になる場面で使われる。'
        }
      ]
    }
  }
};


function h3TranslationReviewApplyExplanationOverlay_(
  payload,
  locked
) {
  if (
    !payload ||
    payload.surface_family !==
      'TRANSLATION'
  ) {
    return payload;
  }

  if (
    locked &&
    typeof H3_TRANSLATION_V2_LOCKED_SCHEMA_ !==
      'undefined' &&
    locked.schema ===
      H3_TRANSLATION_V2_LOCKED_SCHEMA_
  ) {
    if (
      !Array.isArray(locked.items) ||
      !Array.isArray(payload.questions) ||
      locked.items.length !==
        payload.questions.length
    ) {
      throw new Error(
        'TRANSLATION_V2_EXPLANATION_SOURCE_MISMATCH'
      );
    }

    var v2Out =
      JSON.parse(
        JSON.stringify(payload)
      );

    v2Out.questions.forEach(
      function (question, index) {
        var lockedItem =
          locked.items[index];
        var spec =
          H3_TRANSLATION_V2_EXPLANATION_OVERLAY_[
            question.item_id
          ];

        if (!spec) {
          return;
        }

        if (
          !lockedItem ||
          lockedItem.item_id !==
            question.item_id ||
          lockedItem.question_key !==
            question.question_key ||
          lockedItem.skill_id !==
            question.skill_id ||
          lockedItem.source_item_sha256 !==
            spec.source_item_sha256
        ) {
          throw new Error(
            'TRANSLATION_V2_EXPLANATION_ITEM_MISMATCH:' +
              String(
                question.item_id || ''
              )
          );
        }

        var explanation =
          JSON.parse(
            JSON.stringify(
              spec.explanation
            )
          );
        explanation.schema =
          'H3_TRANSLATION_EXPLANATION_V2';
        explanation.contract_id =
          'H3-TRANSLATION-V2-EXPLANATION-20260922-V1';
        explanation.source_binding_sha256 =
          payload.source_binding_sha256;
        explanation.item_sha256 =
          spec.source_item_sha256;
        explanation.provenance_mode =
          lockedItem.source_kind ===
            'OFFICIAL'
            ? 'SOURCE_LINKED_AUTHORED'
            : 'AUTHORED_RETEST';

        h3ReviewExplanationStyleValidateAuthoring_(
          explanation,
          [
            Array.isArray(question.choices)
              ? String(
                  question.choices[
                    Number(
                      question.correct_answer
                    ) - 1
                  ] || ''
                )
              : ''
          ],
          'TRANSLATION_FUTURE:' +
            String(
              question.item_id || ''
            )
        );

        question.explanation =
          explanation;
      }
    );

    v2Out.explanation_contract_id =
      'H3-TRANSLATION-V2-EXPLANATION-20260922-V1';

    return v2Out;
  }

  var binding =
    String(
      payload.source_binding_sha256 ||
      ''
    );
  var spec =
    H3_TRANSLATION_EXPLANATION_OVERLAY_V1_[
      binding
    ];

  if (!spec) {
    return payload;
  }

  if (
    !locked ||
    locked.source_binding_sha256 !==
      binding ||
    locked.section_key !==
      spec.section_key ||
    !Array.isArray(locked.items) ||
    !Array.isArray(payload.questions) ||
    locked.items.length !==
      payload.questions.length
  ) {
    throw new Error(
      'TRANSLATION_EXPLANATION_SOURCE_MISMATCH'
    );
  }

  var out =
    JSON.parse(
      JSON.stringify(payload)
    );

  out.questions.forEach(
    function (question, index) {
      var lockedItem =
        locked.items[index];
      var itemSpec =
        spec.items[
          question.item_id
        ];

      if (
        !itemSpec ||
        !lockedItem ||
        lockedItem.item_id !==
          question.item_id ||
        lockedItem.question_key !==
          question.question_key ||
        lockedItem.skill_id !==
          question.skill_id ||
        lockedItem.item_sha256 !==
          itemSpec.item_sha256 ||
        question.skill_id !==
          itemSpec.skill_id
      ) {
        throw new Error(
          'TRANSLATION_EXPLANATION_ITEM_MISMATCH:' +
            String(
              question.item_id || ''
            )
        );
      }

      var explanation =
        JSON.parse(
          JSON.stringify(
            itemSpec.explanation
          )
        );
      explanation.schema =
        'H3_TRANSLATION_EXPLANATION_V1';
      explanation.contract_id =
        H3_TRANSLATION_EXPLANATION_CONTRACT_ID_;
      explanation.source_binding_sha256 =
        binding;
      explanation.item_sha256 =
        itemSpec.item_sha256;
      explanation.provenance_mode =
        'SOURCE_LINKED_AUTHORED';

      question.explanation =
        explanation;
    }
  );

  out.explanation_contract_id =
    H3_TRANSLATION_EXPLANATION_CONTRACT_ID_;

  return out;
}
function h3SurfaceReviewOpenForLearner_(
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
  var context =
    h3SurfaceReviewContextBySet_(
      spreadsheet,
      family,
      setId
    );

  if (family === 'READING') {
    var bindings =
      h3ReviewAudioBindingResolveAll_(
        spreadsheet,
        context.payload
      );

    return h3ReviewAudioApplyReadingBindings_(
      context.payload,
      bindings
    );
  }

  var translationPayload =
    h3TranslationReviewApplyExplanationOverlay_(
      context.payload,
      context.txn.locked
    );
  var translationBindings =
    h3ReviewAudioBindingResolveAll_(
      spreadsheet,
      translationPayload
    );

  return h3ReviewAudioApplyTranslationBindings_(
    translationPayload,
    translationBindings
  );
}


function h3SurfaceReviewMedia_(
  request
) {
  var family =
    String(
      request &&
      request.surface_family ||
      ''
    );

  if (
    !request ||
    request.schema !==
      'H3_WEB_MEDIA_REQUEST_V1' ||
    request.mode !== 'REVIEW' ||
    request.review_kind !== 'WRITTEN' ||
    ['READING', 'TRANSLATION']
      .indexOf(family) < 0 ||
    !request.set_id ||
    !request.asset_key ||
    request.txn_id ||
    request.legacy_review_id
  ) {
    throw new Error(
      'SURFACE_REVIEW_AUDIO_MEDIA_REQUEST_INVALID'
    );
  }

  var setId =
    String(request.set_id);
  var assetKey =
    String(request.asset_key);
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var context =
    h3SurfaceReviewContextBySet_(
      spreadsheet,
      family,
      setId
    );
  var expected =
    h3ReviewAudioExpectedBindings_(
      context.payload
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
      'SURFACE_REVIEW_AUDIO_ASSET_NOT_ALLOWED:' +
        assetKey
    );
  }

  var binding =
    h3ReviewAudioBindingResolve_(
      spreadsheet,
      family,
      setId,
      assetKey
    );
  var expectedSidecarFamily =
    family === 'READING'
      ? '2R'
      : '2T';

  if (
    binding.asset_key !==
      expected[0].asset_key ||
    binding.set_id !== setId ||
    binding.sidecar_family !==
      expectedSidecarFamily
  ) {
    throw new Error(
      'SURFACE_REVIEW_AUDIO_BINDING_MISMATCH:' +
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
    surface_family: family,
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



function h3SurfaceReviewExpectedReadingExplanationContract_(
  payload
) {
  var sectionKey =
    String(
      payload &&
      payload.section_key ||
      ''
    );
  var binding =
    String(
      payload &&
      payload.source_binding_sha256 ||
      ''
    );

  if (
    sectionKey === 'H3-P8' &&
    binding ===
      'a8c3a7c038fa251e195463a13157fb3683882ddef30d677d9962c58ff120761e'
  ) {
    return H3_READING_P8_EXPLANATION_CONTRACT_ID_;
  }

  if (
    sectionKey === 'H3-P9' &&
    binding ===
      H3_READING_P9_SOURCE_BINDING_SHA256_
  ) {
    return H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_;
  }

  if (
    sectionKey === 'H3-P10' &&
    binding ===
      H3_READING_P10_SOURCE_BINDING_SHA256_
  ) {
    return H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_;
  }

  throw new Error(
    'READING_REVIEW_EXPLANATION_SCOPE_INVALID'
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

    var expectedExplanationContract =
      h3SurfaceReviewExpectedReadingExplanationContract_(
        payload
      );
    var expectedSection =
      String(payload.section_key || '')
        .replace('H3-', '');

    payload.sections.forEach(
      function (section, index) {
        var question =
          payload.questions[index];
        var isP9P10 =
          expectedExplanationContract ===
            H3_READING_P9_P10_EXPLANATION_CONTRACT_ID_;

        if (
          !section.explanation ||
          section.explanation.contract_id !==
            expectedExplanationContract ||
          section.explanation.source_binding_sha256 !==
            payload.source_binding_sha256 ||
          section.explanation.passage_sha256 !==
            payload.passage.passage_sha256 ||
          section.explanation.item_sha256 !==
            section.item_sha256 ||
          (
            isP9P10 &&
            section.explanation.provenance_mode !==
              'SOURCE_LINKED_AUTHORED'
          ) ||
          section.section !==
            expectedSection ||
          section.passage_id !==
            payload.passage.passage_id ||
          section.passage_sha256 !==
            payload.passage.passage_sha256 ||
          !question ||
          section.item_id !==
            question.item_id ||
          section.question_key !==
            question.question_key ||
          section.skill_id !==
            question.skill_id
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
    var profile =
      String(
        payload.translation_profile ||
        ''
      );

    if (
      payload.answer_type !==
        'MULTIPLE_CHOICE'
    ) {
      throw new Error(
        'TRANSLATION_REVIEW_METADATA_MISSING'
      );
    }

    if (profile) {
      if (
        [
          'MIXED_1_1',
          'EDF_KR_TO_JP_2',
          'EDF_JP_TO_KR_2'
        ].indexOf(profile) < 0
      ) {
        throw new Error(
          'TRANSLATION_REVIEW_PROFILE_INVALID'
        );
      }

      var krToJp = 0;
      var jpToKr = 0;
      payload.questions.forEach(
        function (question) {
          var direction =
            String(
              question.translation_direction ||
              ''
            );
          var sectionKey =
            String(
              question.section_key ||
              ''
            );
          if (
            question.answer_type !==
              payload.answer_type ||
            (
              direction === 'KR_TO_JP' &&
              (
                sectionKey !== 'H3-P11' ||
                question.source_language !==
                  'KO' ||
                question.choice_language !==
                  'JA'
              )
            ) ||
            (
              direction === 'JP_TO_KR' &&
              (
                sectionKey !== 'H3-P12' ||
                question.source_language !==
                  'JA' ||
                question.choice_language !==
                  'KO'
              )
            ) ||
            [
              'KR_TO_JP',
              'JP_TO_KR'
            ].indexOf(direction) < 0
          ) {
            throw new Error(
              'TRANSLATION_REVIEW_METADATA_MISMATCH'
            );
          }
          if (direction === 'KR_TO_JP') {
            krToJp += 1;
          } else {
            jpToKr += 1;
          }
        }
      );

      if (
        (
          profile === 'MIXED_1_1' &&
          !(
            krToJp === 1 &&
            jpToKr === 1
          )
        ) ||
        (
          profile ===
            'EDF_KR_TO_JP_2' &&
          !(
            krToJp === 2 &&
            jpToKr === 0
          )
        ) ||
        (
          profile ===
            'EDF_JP_TO_KR_2' &&
          !(
            krToJp === 0 &&
            jpToKr === 2
          )
        )
      ) {
        throw new Error(
          'TRANSLATION_REVIEW_PROFILE_CARDINALITY_INVALID'
        );
      }
    } else {
      if (
        !payload.translation_direction
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
