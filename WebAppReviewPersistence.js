var H3_REVIEW_EXPLANATION_SHEET =
  'listening_explanation_payload_v1';
var H3_REVIEW_BINDING_SHEET =
  'listening_review_binding_v1';

var H3_REVIEW_EXPLANATION_HEADERS = [
  'LISTENING_SET_ID',
  'SECTION_KEY',
  'EXPLANATION_REVISION_ID',
  'CREATED_AT',
  'STATUS',
  'EXPLANATION_JSON',
  'EXPLANATION_SHA256',
  'ITEM_PAYLOAD_SHA256',
  'RULE_VERSION',
  'EXPLANATION_SET_SHA256',
  'LOCKED_AT'
];

var H3_REVIEW_BINDING_HEADERS = [
  'TXN_ID',
  'LISTENING_SET_ID',
  'LISTENING_SET_NO',
  'CREATED_AT',
  'STATUS',
  'RESULT_SHA256',
  'ITEM_PAYLOAD_SHA256',
  'EXPLANATION_SET_SHA256',
  'AUDIO_BINDING_SHA256',
  'K1_IMAGE_SHA256',
  'REVIEW_CONTRACT_ID',
  'REVIEW_BINDING_SHA256',
  'LOCKED_AT'
];

var H3_REVIEW_CONTRACT_ID =
  'H3-REVIEW-CONTRACT-20260919-V1';

var H3_LEGACY_REVIEW_SHEET =
  'listening_legacy_review_v1';

var H3_LEGACY_REVIEW_HEADERS = [
  'LEGACY_REVIEW_ID',
  'LISTENING_SET_ID',
  'LISTENING_SET_NO',
  'ANSWERED_AT',
  'STATUS',
  'SOURCE_MODE',
  'RESULT_JSON',
  'RESULT_SHA256',
  'ITEM_PAYLOAD_SHA256',
  'EXPLANATION_SET_SHA256',
  'AUDIO_BINDING_SHA256',
  'K1_IMAGE_SHA256',
  'REVIEW_CONTRACT_ID',
  'LEGACY_REVIEW_BINDING_SHA256',
  'LOCKED_AT'
];

var H3_LEGACY_REVIEW_CONTRACT_ID =
  'H3-LEGACY-REVIEW-CONTRACT-20260920-V1';

function h3ReviewTxnContext_(
  spreadsheet,
  txnId
) {
  var txnSheet =
    spreadsheet.getSheetByName(
      H3_WEB_PROD_TXN_SHEET
    );

  if (!txnSheet) {
    throw new Error(
      'REVIEW_TXN_SHEET_MISSING'
    );
  }

  var txnTable = h3ReviewTable_(txnSheet);
  h3ProdRequireColumns_(
    txnTable,
    [
      'TXN_ID',
      'SET_ID',
      'LISTENING_SET_NO',
      'MODE',
      'RAW_INPUT_JSON',
      'STATUS',
      'RESULT_JSON',
      'COMMITTED_AT'
    ],
    H3_WEB_PROD_TXN_SHEET
  );

  var txnRecord = h3ProdOneRowBy_(
    txnTable,
    'TXN_ID',
    txnId,
    H3_WEB_PROD_TXN_SHEET
  );

  var row = txnRecord.row;
  var map = txnTable.map;

  if (
    String(row[map.MODE] || '') !==
      'LISTENING' ||
    String(row[map.STATUS] || '') !==
      'COMMITTED'
  ) {
    throw new Error(
      'REVIEW_TXN_NOT_COMMITTED_LISTENING'
    );
  }

  var result = h3ProdParseJson_(
    row[map.RESULT_JSON],
    'REVIEW_RESULT_JSON_INVALID'
  );
  var rawInput = h3ProdParseJson_(
    row[map.RAW_INPUT_JSON],
    'REVIEW_RAW_INPUT_JSON_INVALID'
  );

  if (
    result.txn_id !== String(txnId) ||
    result.set_id !==
      String(row[map.SET_ID] || '') ||
    result.status !== 'COMMITTED'
  ) {
    throw new Error(
      'REVIEW_TXN_RESULT_IDENTITY_MISMATCH'
    );
  }

  if (
    !rawInput ||
    rawInput.mode !== 'LISTENING' ||
    rawInput.set_id !== result.set_id ||
    !Array.isArray(rawInput.answers) ||
    rawInput.answers.length !== 5
  ) {
    throw new Error(
      'REVIEW_RAW_INPUT_CONTRACT_INVALID'
    );
  }

  return {
    record: txnRecord,
    table: txnTable,
    row: row,
    map: map,
    txnId: String(txnId),
    setId: result.set_id,
    setNo: Number(
      row[map.LISTENING_SET_NO]
    ),
    result: result,
    rawInput: rawInput
  };
}

function h3ReviewSourceContext_(
  spreadsheet,
  setId
) {
  var payloadSheet =
    spreadsheet.getSheetByName(
      'listening_set_payload_v1'
    );
  var k1Sheet =
    spreadsheet.getSheetByName(
      'listening_k1_ready_v1'
    );

  if (!payloadSheet || !k1Sheet) {
    throw new Error(
      'REVIEW_SOURCE_SHEET_MISSING'
    );
  }

  var payload =
    h3ReviewTable_(payloadSheet);
  var k1 =
    h3ReviewTable_(k1Sheet);

  h3ProdRequireColumns_(
    payload,
    [
      'LISTENING_SET_ID',
      'LISTENING_SET_NO',
      'STATUS',
      'K1_READY_ID',
      'K2_ITEM_JSON',
      'K3_ITEM_JSON',
      'K4_ITEM_JSON',
      'K5_ITEM_JSON',
      'ANSWER_KEY_JSON',
      'ITEM_PAYLOAD_SHA256',
      'AUDIO_BINDING_JSON'
    ],
    'listening_set_payload_v1'
  );

  h3ProdRequireColumns_(
    k1,
    [
      'K1_READY_ID',
      'STATUS',
      'IMAGE_FILE_ID',
      'IMAGE_URL',
      'IMAGE_SHA256',
      'FINAL_CHOICES_JSON',
      'ANSWER_KEY',
      'BOUND_LISTENING_SET_ID',
      'CONSUMED_AT'
    ],
    'listening_k1_ready_v1'
  );

  var payloadRecord = h3ProdOneRowBy_(
    payload,
    'LISTENING_SET_ID',
    setId,
    'listening_set_payload_v1'
  );
  var p = payloadRecord.row;
  var pm = payload.map;

  if (
    String(p[pm.STATUS] || '') !==
      'ISSUED'
  ) {
    throw new Error(
      'REVIEW_SET_NOT_ISSUED'
    );
  }

  var k1ReadyId = String(
    p[pm.K1_READY_ID] || ''
  );
  var k1Record = h3ProdOneRowBy_(
    k1,
    'K1_READY_ID',
    k1ReadyId,
    'listening_k1_ready_v1'
  );
  var kr = k1Record.row;
  var km = k1.map;

  if (
    String(kr[km.STATUS] || '') !==
      'CONSUMED' ||
    String(
      kr[km.BOUND_LISTENING_SET_ID] ||
      ''
    ) !== String(setId) ||
    !String(kr[km.CONSUMED_AT] || '')
  ) {
    throw new Error(
      'REVIEW_K1_BINDING_INVALID'
    );
  }

  var audioBinding =
    h3ProdParseJson_(
      p[pm.AUDIO_BINDING_JSON],
      'REVIEW_AUDIO_BINDING_JSON_INVALID'
    );
  var answerKey =
    h3ProdParseJson_(
      p[pm.ANSWER_KEY_JSON],
      'REVIEW_ANSWER_KEY_JSON_INVALID'
    );
  var k1Choices =
    h3ProdParseJson_(
      kr[km.FINAL_CHOICES_JSON],
      'REVIEW_K1_CHOICES_JSON_INVALID'
    );

  if (
    !audioBinding ||
    !audioBinding.individual ||
    !Array.isArray(k1Choices) ||
    k1Choices.length !== 4
  ) {
    throw new Error(
      'REVIEW_SOURCE_PAYLOAD_INVALID'
    );
  }

  if (
    Number(kr[km.ANSWER_KEY]) !==
      Number(answerKey.K1)
  ) {
    throw new Error(
      'REVIEW_K1_ANSWER_KEY_MISMATCH'
    );
  }

  var sourceItems = {};
  ['K2','K3','K4','K5']
    .forEach(function (section) {
      sourceItems[section] =
        h3ProdParseJson_(
          p[
            pm[
              section +
              '_ITEM_JSON'
            ]
          ],
          'REVIEW_ITEM_JSON_INVALID:' +
            section
        );
    });

  var itemHashObject = {
    LISTENING_SET_ID:
      String(setId),
    LISTENING_SET_NO:
      Number(
        p[pm.LISTENING_SET_NO]
      ),
    K1_READY_ID:
      k1ReadyId,
    K1_READY_IMAGE_SHA256:
      String(
        kr[km.IMAGE_SHA256] || ''
      ),
    K1_READY_FINAL_CHOICES_JSON:
      k1Choices,
    K1_READY_ANSWER_KEY:
      Number(answerKey.K1),
    K2_ITEM_JSON:
      sourceItems.K2,
    K3_ITEM_JSON:
      sourceItems.K3,
    K4_ITEM_JSON:
      sourceItems.K4,
    K5_ITEM_JSON:
      sourceItems.K5,
    ANSWER_KEY_JSON:
      answerKey
  };

  var calculatedItemSha =
    h3ReviewHash_(
      itemHashObject
    );
  var storedItemSha =
    String(
      p[
        pm.ITEM_PAYLOAD_SHA256
      ] || ''
    );

  if (
    calculatedItemSha !==
      storedItemSha
  ) {
    throw new Error(
      'REVIEW_ITEM_PAYLOAD_SHA_MISMATCH'
    );
  }

  H3_WEB_PROD_SECTIONS.forEach(
    function (section) {
      var binding =
        audioBinding.individual[
          section
        ];
      if (
        !binding ||
        !binding.audio_file_id ||
        !binding.audio_url ||
        !binding.payload_hash
      ) {
        throw new Error(
          'REVIEW_AUDIO_BINDING_INVALID:' +
            section
        );
      }
      if (
        !Object.prototype.hasOwnProperty.call(
          answerKey,
          section
        )
      ) {
        throw new Error(
          'REVIEW_ANSWER_KEY_MISSING:' +
            section
        );
      }
    }
  );

  return {
    payloadRecord: payloadRecord,
    payloadTable: payload,
    payloadRow: p,
    payloadMap: pm,
    k1Record: k1Record,
    k1Table: k1,
    k1Row: kr,
    k1Map: km,
    setId: String(setId),
    setNo: Number(
      p[pm.LISTENING_SET_NO]
    ),
    itemPayloadSha256:
      calculatedItemSha,
    sourceItems:
      sourceItems,
    audioBinding: audioBinding,
    answerKey: answerKey,
    k1Choices: k1Choices,
    k1ImageSha256: String(
      kr[km.IMAGE_SHA256] || ''
    )
  };
}

function h3ReviewExplanationSet_(
  spreadsheet,
  source
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_REVIEW_EXPLANATION_SHEET
    );

  h3ReviewRequireExactHeader_(
    sheet,
    H3_REVIEW_EXPLANATION_HEADERS,
    'REVIEW_EXPLANATION'
  );

  var table = h3ReviewTable_(sheet);
  var map = table.map;
  var matches = [];

  table.rows.forEach(
    function (row, i) {
      if (
        String(
          row[
            map.LISTENING_SET_ID
          ] || ''
        ) === source.setId
      ) {
        matches.push({
          rowNumber: i + 2,
          row: row
        });
      }
    }
  );

  if (matches.length !== 5) {
    throw new Error(
      'REVIEW_EXPLANATION_ROW_COUNT_MISMATCH'
    );
  }

  var bySection = {};
  var ruleVersion = '';
  var declaredSetSha = '';

  matches.forEach(
    function (record) {
      var row = record.row;
      var section = String(
        row[map.SECTION_KEY] || ''
      );

      if (
        H3_WEB_PROD_SECTIONS.indexOf(
          section
        ) < 0 ||
        bySection[section]
      ) {
        throw new Error(
          'REVIEW_EXPLANATION_SECTION_INVALID'
        );
      }

      if (
        String(row[map.STATUS] || '') !==
          'LOCKED' ||
        !String(
          row[
            map.EXPLANATION_REVISION_ID
          ] || ''
        ) ||
        !String(
          row[map.LOCKED_AT] || ''
        )
      ) {
        throw new Error(
          'REVIEW_EXPLANATION_NOT_LOCKED:' +
            section
        );
      }

      if (
        String(
          row[
            map.ITEM_PAYLOAD_SHA256
          ] || ''
        ) !== source.itemPayloadSha256
      ) {
        throw new Error(
          'REVIEW_EXPLANATION_ITEM_HASH_MISMATCH:' +
            section
        );
      }

      var explanation =
        h3ProdParseJson_(
          row[map.EXPLANATION_JSON],
          'REVIEW_EXPLANATION_JSON_INVALID'
        );

      if (
        explanation.section !== section
      ) {
        throw new Error(
          'REVIEW_EXPLANATION_SECTION_JSON_MISMATCH'
        );
      }

      var actualHash =
        h3ReviewHash_(explanation);
      var declaredHash = String(
        row[
          map.EXPLANATION_SHA256
        ] || ''
      );

      if (
        actualHash !== declaredHash
      ) {
        throw new Error(
          'REVIEW_EXPLANATION_HASH_MISMATCH:' +
            section
        );
      }

      var rowRuleVersion = String(
        row[map.RULE_VERSION] || ''
      );
      var rowSetSha = String(
        row[
          map.EXPLANATION_SET_SHA256
        ] || ''
      );

      if (!ruleVersion) {
        ruleVersion = rowRuleVersion;
      }
      if (!declaredSetSha) {
        declaredSetSha = rowSetSha;
      }

      if (
        rowRuleVersion !== ruleVersion ||
        rowSetSha !== declaredSetSha
      ) {
        throw new Error(
          'REVIEW_EXPLANATION_SET_METADATA_MISMATCH'
        );
      }

      bySection[section] = {
        rowNumber: record.rowNumber,
        revisionId: String(
          row[
            map.EXPLANATION_REVISION_ID
          ] || ''
        ),
        explanation: explanation,
        sha256: declaredHash
      };
    }
  );

  var setHashObject = {
    LISTENING_SET_ID:
      source.setId,
    ITEM_PAYLOAD_SHA256:
      source.itemPayloadSha256,
    RULE_VERSION:
      ruleVersion,
    SECTIONS:
      H3_WEB_PROD_SECTIONS.map(
        function (section) {
          return {
            SECTION_KEY: section,
            EXPLANATION_REVISION_ID:
              bySection[
                section
              ].revisionId,
            EXPLANATION_SHA256:
              bySection[
                section
              ].sha256
          };
        }
      )
  };

  var actualSetSha =
    h3ReviewHash_(
      setHashObject
    );

  if (
    actualSetSha !==
      declaredSetSha
  ) {
    throw new Error(
      'REVIEW_EXPLANATION_SET_HASH_MISMATCH'
    );
  }

  return {
    sheet: sheet,
    table: table,
    bySection: bySection,
    ruleVersion: ruleVersion,
    sha256: actualSetSha
  };
}

function h3ReviewBindingHashObject_(
  txn,
  source,
  explanations
) {
  return {
    TXN_ID: txn.txnId,
    LISTENING_SET_ID:
      txn.setId,
    LISTENING_SET_NO:
      txn.setNo,
    RESULT_SHA256:
      h3ReviewHash_(
        txn.result
      ),
    ITEM_PAYLOAD_SHA256:
      source.itemPayloadSha256,
    EXPLANATION_SET_SHA256:
      explanations.sha256,
    AUDIO_BINDING_SHA256:
      h3ReviewHash_(
        source.audioBinding
      ),
    K1_IMAGE_SHA256:
      source.k1ImageSha256,
    REVIEW_CONTRACT_ID:
      H3_REVIEW_CONTRACT_ID
  };
}

function h3ReviewRequireBinding_(
  spreadsheet,
  txn,
  source,
  explanations
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_REVIEW_BINDING_SHEET
    );

  h3ReviewRequireExactHeader_(
    sheet,
    H3_REVIEW_BINDING_HEADERS,
    'REVIEW_BINDING'
  );

  var table = h3ReviewTable_(sheet);
  var matches = [];
  table.rows.forEach(
    function (row, i) {
      if (
        String(
          row[
            table.map.TXN_ID
          ] || ''
        ) === txn.txnId
      ) {
        matches.push({
          rowNumber: i + 2,
          row: row
        });
      }
    }
  );

  if (matches.length !== 1) {
    throw new Error(
      'REVIEW_BINDING_CARDINALITY:' +
        matches.length
    );
  }

  var row = matches[0].row;
  var map = table.map;
  var expected =
    h3ReviewBindingHashObject_(
      txn,
      source,
      explanations
    );
  var expectedBindingSha =
    h3ReviewHash_(expected);

  if (
    String(row[map.STATUS] || '') !==
      'LOCKED' ||
    !String(row[map.LOCKED_AT] || '') ||
    String(
      row[map.LISTENING_SET_ID] ||
      ''
    ) !== txn.setId ||
    Number(
      row[map.LISTENING_SET_NO]
    ) !== txn.setNo ||
    String(
      row[map.RESULT_SHA256] || ''
    ) !== expected.RESULT_SHA256 ||
    String(
      row[
        map.ITEM_PAYLOAD_SHA256
      ] || ''
    ) !==
      expected.ITEM_PAYLOAD_SHA256 ||
    String(
      row[
        map.EXPLANATION_SET_SHA256
      ] || ''
    ) !==
      expected.EXPLANATION_SET_SHA256 ||
    String(
      row[
        map.AUDIO_BINDING_SHA256
      ] || ''
    ) !==
      expected.AUDIO_BINDING_SHA256 ||
    String(
      row[map.K1_IMAGE_SHA256] || ''
    ) !==
      expected.K1_IMAGE_SHA256 ||
    String(
      row[map.REVIEW_CONTRACT_ID] ||
      ''
    ) !== H3_REVIEW_CONTRACT_ID ||
    String(
      row[
        map.REVIEW_BINDING_SHA256
      ] || ''
    ) !== expectedBindingSha
  ) {
    throw new Error(
      'REVIEW_BINDING_HASH_MISMATCH'
    );
  }

  return {
    sheet: sheet,
    table: table,
    record: matches[0],
    sha256: expectedBindingSha,
    hashes: expected
  };
}

function h3ReviewQuestionSurface_(
  source,
  section
) {
  var p = source.payloadRow;
  var pm = source.payloadMap;
  var km = source.k1Map;
  var kr = source.k1Row;

  if (section === 'K1') {
    var image =
      h3DriveDataUri_(
        String(
          kr[km.IMAGE_FILE_ID] || ''
        ),
        null,
        source.k1ImageSha256,
        1024 * 1024
      );

    return {
      choices: source.k1Choices.slice(),
      image_file_id: String(
        kr[km.IMAGE_FILE_ID] || ''
      ),
      image_url: String(
        kr[km.IMAGE_URL] || ''
      ),
      image_sha256:
        source.k1ImageSha256,
      image_data_uri:
        image.data_uri,
      image_size_bytes:
        image.size_bytes
    };
  }

  var column =
    section + '_ITEM_JSON';
  var item =
    h3ProdParseJson_(
      p[pm[column]],
      'REVIEW_ITEM_JSON_INVALID:' +
        section
    );

  return item;
}

function h3ReviewScriptFromSurface_(
  section,
  surface
) {
  var numbers =
    ['①', '②', '③', '④'];

  if (section === 'K1') {
    return surface.choices
      .map(function (text, i) {
        return numbers[i] +
          ' ' + text;
      })
      .join('\n');
  }

  if (
    section === 'K2' ||
    section === 'K3'
  ) {
    return [
      surface.prompt,
      surface.choices
        .map(function (text, i) {
          return numbers[i] +
            ' ' + text;
        })
        .join('\n')
    ].join('\n');
  }

  return String(
    surface.passage || ''
  );
}

function h3ReviewSummaryMap_(txn) {
  var summary = {};
  txn.result.summary.forEach(
    function (item) {
      summary[item.section] = item;
    }
  );

  var answers = {};
  txn.rawInput.answers.forEach(
    function (item) {
      answers[item.section] = item;
    }
  );

  return {
    summary: summary,
    answers: answers
  };
}

function buildPersistentReviewPayload_(
  txnId
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var txn =
    h3ReviewTxnContext_(
      spreadsheet,
      txnId
    );
  var source =
    h3ReviewSourceContext_(
      spreadsheet,
      txn.setId
    );

  if (source.setNo !== txn.setNo) {
    throw new Error(
      'REVIEW_SET_NO_MISMATCH'
    );
  }

  var explanations =
    h3ReviewExplanationSet_(
      spreadsheet,
      source
    );
  var binding =
    h3ReviewRequireBinding_(
      spreadsheet,
      txn,
      source,
      explanations
    );
  var indexed =
    h3ReviewSummaryMap_(txn);

  return {
    schema:
      'H3_PERSISTENT_REVIEW_PAYLOAD_V1',
    mode: 'REVIEW',
    read_only: true,
    persisted: true,
    review_contract_id:
      H3_REVIEW_CONTRACT_ID,
    review_binding_sha256:
      binding.sha256,
    txn_id: txn.txnId,
    set_id: txn.setId,
    listening_set_no:
      txn.setNo,
    score: Number(
      txn.result.score
    ),
    total: Number(
      txn.result.total
    ),
    default_filter:
      'NEEDS_REVIEW',
    sections:
      H3_WEB_PROD_SECTIONS.map(
        function (section) {
          var summary =
            indexed.summary[section];
          var answer =
            indexed.answers[section];
          var surface =
            h3ReviewQuestionSurface_(
              source,
              section
            );

          if (!summary || !answer) {
            throw new Error(
              'REVIEW_SECTION_RESULT_MISSING:' +
                section
            );
          }

          return {
            section: section,
            display:
              H3_R3_SECTION_DISPLAY[
                section
              ],
            result:
              summary.result,
            user_answer:
              Number(answer.answer),
            uncertain:
              !!answer.uncertain,
            correct_answer:
              Number(
                summary.correct_answer
              ),
            audio_asset_key:
              section,
            audio_fallback_url:
              source.audioBinding
                .individual[section]
                .audio_url,
            script_text:
              h3ReviewScriptFromSurface_(
                section,
                surface
              ),
            question_surface:
              surface,
            explanation:
              explanations
                .bySection[section]
                .explanation,
            explanation_revision_id:
              explanations
                .bySection[section]
                .revisionId,
            explanation_sha256:
              explanations
                .bySection[section]
                .sha256
          };
        }
      ),
    technical: {
      receipt:
        String(
          txn.result.receipt || ''
        ),
      result_sha256:
        binding.hashes.RESULT_SHA256,
      item_payload_sha256:
        binding.hashes
          .ITEM_PAYLOAD_SHA256,
      explanation_set_sha256:
        binding.hashes
          .EXPLANATION_SET_SHA256,
      audio_binding_sha256:
        binding.hashes
          .AUDIO_BINDING_SHA256,
      k1_image_sha256:
        binding.hashes
          .K1_IMAGE_SHA256
    }
  };
}

function validatePersistentReviewBinding_(
  txnId
) {
  var payload =
    buildPersistentReviewPayload_(
      txnId
    );

  return {
    schema:
      'H3_REVIEW_PERSISTENCE_GATE_V1',
    status: 'PASS',
    read_only: true,
    txn_id:
      payload.txn_id,
    set_id:
      payload.set_id,
    review_binding_sha256:
      payload.review_binding_sha256,
    section_count:
      payload.sections.length
  };
}

function h3ReviewEnsureBindingForCommittedTxn_(
  txnId
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var txn =
    h3ReviewTxnContext_(
      spreadsheet,
      txnId
    );
  var source =
    h3ReviewSourceContext_(
      spreadsheet,
      txn.setId
    );
  var explanations =
    h3ReviewExplanationSet_(
      spreadsheet,
      source
    );

  var sheet =
    spreadsheet.getSheetByName(
      H3_REVIEW_BINDING_SHEET
    );
  h3ReviewRequireExactHeader_(
    sheet,
    H3_REVIEW_BINDING_HEADERS,
    'REVIEW_BINDING'
  );

  var table =
    h3ReviewTable_(sheet);
  var existing = [];
  table.rows.forEach(
    function (row, i) {
      if (
        String(
          row[table.map.TXN_ID] ||
          ''
        ) === txn.txnId
      ) {
        existing.push(i + 2);
      }
    }
  );

  if (existing.length > 1) {
    throw new Error(
      'REVIEW_BINDING_DUPLICATE'
    );
  }

  if (existing.length === 1) {
    return h3ReviewRequireBinding_(
      spreadsheet,
      txn,
      source,
      explanations
    );
  }

  var hashes =
    h3ReviewBindingHashObject_(
      txn,
      source,
      explanations
    );
  var bindingSha =
    h3ReviewHash_(hashes);
  var now = h3NowTokyo_();

  sheet.appendRow([
    txn.txnId,
    txn.setId,
    txn.setNo,
    now,
    'LOCKED',
    hashes.RESULT_SHA256,
    hashes.ITEM_PAYLOAD_SHA256,
    hashes.EXPLANATION_SET_SHA256,
    hashes.AUDIO_BINDING_SHA256,
    hashes.K1_IMAGE_SHA256,
    H3_REVIEW_CONTRACT_ID,
    bindingSha,
    now
  ]);
  SpreadsheetApp.flush();

  return h3ReviewRequireBinding_(
    spreadsheet,
    txn,
    source,
    explanations
  );
}

function r309cValidateL03Persistence() {
  return validatePersistentReviewBinding_(
    'H3TX-20260919-000005'
  );
}

function h3ReviewValidateRequest_(request) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_RENDER_REQUEST_V1' ||
    request.mode !== 'REVIEW' ||
    !request.txn_id
  ) {
    throw new Error(
      'INVALID_REVIEW_RENDER_REQUEST'
    );
  }

  var txnId = String(
    request.txn_id
  );

  if (
    txnId.length > 128 ||
    /[\x00-\x1F]/.test(txnId)
  ) {
    throw new Error(
      'INVALID_REVIEW_TXN_ID'
    );
  }

  return txnId;
}

function getPersistentReviewPayload_(
  request
) {
  var txnId =
    h3ReviewValidateRequest_(
      request
    );
  return buildPersistentReviewPayload_(
    txnId
  );
}

function getPersistentReviewMediaPayload_(
  request
) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_MEDIA_REQUEST_V1' ||
    request.mode !== 'REVIEW' ||
    !request.txn_id ||
    !request.asset_key
  ) {
    throw new Error(
      'INVALID_REVIEW_MEDIA_REQUEST'
    );
  }

  var section = String(
    request.asset_key
  );
  if (
    H3_WEB_PROD_SECTIONS.indexOf(
      section
    ) < 0
  ) {
    throw new Error(
      'REVIEW_MEDIA_ASSET_NOT_ALLOWLISTED'
    );
  }

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var txn =
    h3ReviewTxnContext_(
      spreadsheet,
      String(request.txn_id)
    );

  if (
    request.set_id &&
    String(request.set_id) !==
      txn.setId
  ) {
    throw new Error(
      'REVIEW_MEDIA_SET_MISMATCH'
    );
  }

  var source =
    h3ReviewSourceContext_(
      spreadsheet,
      txn.setId
    );
  var explanations =
    h3ReviewExplanationSet_(
      spreadsheet,
      source
    );

  h3ReviewRequireBinding_(
    spreadsheet,
    txn,
    source,
    explanations
  );

  var binding =
    source.audioBinding
      .individual[section];

  if (
    !binding ||
    !binding.audio_file_id ||
    !binding.audio_url
  ) {
    throw new Error(
      'REVIEW_MEDIA_BINDING_INVALID:' +
        section
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
    txn_id: txn.txnId,
    set_id: txn.setId,
    asset_key: section,
    data_uri:
      media.data_uri,
    mime_type:
      media.mime_type,
    size_bytes:
      media.size_bytes,
    trim_start_ms: 0,
    fallback_url:
      binding.audio_url
  };
}


function h3LegacyReviewValidateRequest_(
  request,
  schemaName
) {
  if (
    !request ||
    request.schema !== schemaName ||
    request.mode !== 'REVIEW' ||
    !request.legacy_review_id ||
    request.txn_id
  ) {
    throw new Error(
      'INVALID_LEGACY_REVIEW_REQUEST'
    );
  }

  var legacyReviewId = String(
    request.legacy_review_id
  );

  if (
    legacyReviewId.length > 128 ||
    /[\x00-\x1F]/.test(
      legacyReviewId
    )
  ) {
    throw new Error(
      'INVALID_LEGACY_REVIEW_ID'
    );
  }

  return legacyReviewId;
}

function getLegacyPersistentReviewPayload_(
  request
) {
  var legacyReviewId =
    h3LegacyReviewValidateRequest_(
      request,
      'H3_WEB_RENDER_REQUEST_V1'
    );

  return buildLegacyPersistentReviewPayload_(
    legacyReviewId
  );
}

function getLegacyPersistentReviewMediaPayload_(
  request
) {
  var legacyReviewId =
    h3LegacyReviewValidateRequest_(
      request,
      'H3_WEB_MEDIA_REQUEST_V1'
    );

  if (!request.asset_key) {
    throw new Error(
      'INVALID_LEGACY_REVIEW_MEDIA_REQUEST'
    );
  }

  var section = String(
    request.asset_key
  );

  if (
    H3_WEB_PROD_SECTIONS.indexOf(
      section
    ) < 0
  ) {
    throw new Error(
      'LEGACY_REVIEW_MEDIA_ASSET_NOT_ALLOWLISTED'
    );
  }

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  var legacy =
    h3LegacyReviewContext_(
      spreadsheet,
      legacyReviewId
    );

  if (
    request.set_id &&
    String(request.set_id) !==
      legacy.setId
  ) {
    throw new Error(
      'LEGACY_REVIEW_MEDIA_SET_MISMATCH'
    );
  }

  var binding =
    legacy.source
      .audioBinding
      .individual[
        section
      ];

  if (
    !binding ||
    !binding.audio_file_id ||
    !binding.audio_url
  ) {
    throw new Error(
      'LEGACY_REVIEW_MEDIA_BINDING_INVALID:' +
        section
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
    legacy_review_id:
      legacy.legacyReviewId,
    set_id:
      legacy.setId,
    asset_key:
      section,
    data_uri:
      media.data_uri,
    mime_type:
      media.mime_type,
    size_bytes:
      media.size_bytes,
    trim_start_ms: 0,
    fallback_url:
      binding.audio_url
  };
}

function h3LegacyReviewResultFromLog_(
  spreadsheet,
  source
) {
  var sheet =
    spreadsheet.getSheetByName(
      'listening_log_v1'
    );

  if (!sheet) {
    throw new Error(
      'LEGACY_REVIEW_LOG_SHEET_MISSING'
    );
  }

  var table =
    h3ReviewTable_(sheet);

  h3ProdRequireColumns_(
    table,
    [
      'PARENT_SET_ID',
      'LISTENING_ISSUE_NO',
      'SECTION_KEY',
      'STATUS',
      'USER_RESULT',
      'ANSWERED_AT',
      'PROVENANCE_JSON'
    ],
    'listening_log_v1'
  );

  var bySection = {};
  var answeredAt = '';

  table.rows.forEach(
    function (row) {
      if (
        String(
          row[
            table.map.PARENT_SET_ID
          ] || ''
        ) !== source.setId
      ) {
        return;
      }

      var section = String(
        row[
          table.map.SECTION_KEY
        ] || ''
      );

      if (
        H3_WEB_PROD_SECTIONS.indexOf(
          section
        ) < 0
      ) {
        return;
      }

      if (bySection[section]) {
        throw new Error(
          'LEGACY_REVIEW_LOG_DUPLICATE:' +
            section
        );
      }

      if (
        Number(
          row[
            table.map
              .LISTENING_ISSUE_NO
          ]
        ) !== source.setNo ||
        String(
          row[
            table.map.STATUS
          ] || ''
        ) !== 'VALID'
      ) {
        throw new Error(
          'LEGACY_REVIEW_LOG_INVALID:' +
            section
        );
      }

      var provenance =
        h3ProdParseJson_(
          row[
            table.map
              .PROVENANCE_JSON
          ],
          'LEGACY_REVIEW_PROVENANCE_INVALID:' +
            section
        );

      var rowAnsweredAt = String(
        row[
          table.map.ANSWERED_AT
        ] || ''
      );

      if (!answeredAt) {
        answeredAt = rowAnsweredAt;
      }

      if (
        !rowAnsweredAt ||
        rowAnsweredAt !== answeredAt ||
        provenance.set_id !==
          source.setId ||
        Number(
          provenance.listening_set_no
        ) !== source.setNo ||
        provenance.answer_source !==
          'manual_chat_submission' ||
        String(
          provenance.result || ''
        ) !==
          String(
            row[
              table.map.USER_RESULT
            ] || ''
          ) ||
        Number(
          provenance.correct_answer
        ) !==
          Number(
            source.answerKey[
              section
            ]
          )
      ) {
        throw new Error(
          'LEGACY_REVIEW_LOG_SOURCE_MISMATCH:' +
            section
        );
      }

      bySection[section] = {
        answer:
          Number(
            provenance.raw_answer
          ),
        correct_answer:
          Number(
            provenance.correct_answer
          ),
        result:
          String(
            provenance.result || ''
          )
      };
    }
  );

  H3_WEB_PROD_SECTIONS.forEach(
    function (section) {
      if (!bySection[section]) {
        throw new Error(
          'LEGACY_REVIEW_LOG_SECTION_MISSING:' +
            section
        );
      }
    }
  );

  var summary =
    H3_WEB_PROD_SECTIONS.map(
      function (section) {
        var item =
          bySection[section];
        return {
          section: section,
          answer: item.answer,
          correct_answer:
            item.correct_answer,
          result: item.result
        };
      }
    );

  var score =
    summary.filter(
      function (item) {
        return item.result === '○';
      }
    ).length;

  return {
    schema:
      'H3_LEGACY_REVIEW_RESULT_V1',
    source_mode:
      'LEGACY_PRE_WEB',
    set_id:
      source.setId,
    listening_set_no:
      source.setNo,
    answered_at:
      answeredAt,
    score: score,
    total: 5,
    uncertainty_known: false,
    summary: summary
  };
}

function h3LegacyReviewBindingHashObject_(
  legacy,
  source,
  explanations
) {
  return {
    LEGACY_REVIEW_ID:
      legacy.legacyReviewId,
    LISTENING_SET_ID:
      legacy.setId,
    LISTENING_SET_NO:
      legacy.setNo,
    SOURCE_MODE:
      legacy.sourceMode,
    RESULT_SHA256:
      h3ReviewHash_(
        legacy.result
      ),
    ITEM_PAYLOAD_SHA256:
      source.itemPayloadSha256,
    EXPLANATION_SET_SHA256:
      explanations.sha256,
    AUDIO_BINDING_SHA256:
      h3ReviewHash_(
        source.audioBinding
      ),
    K1_IMAGE_SHA256:
      source.k1ImageSha256,
    REVIEW_CONTRACT_ID:
      H3_LEGACY_REVIEW_CONTRACT_ID
  };
}

function h3LegacyReviewContext_(
  spreadsheet,
  legacyReviewId
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_LEGACY_REVIEW_SHEET
    );

  h3ReviewRequireExactHeader_(
    sheet,
    H3_LEGACY_REVIEW_HEADERS,
    'LEGACY_REVIEW'
  );

  var table =
    h3ReviewTable_(sheet);

  var record =
    h3ProdOneRowBy_(
      table,
      'LEGACY_REVIEW_ID',
      legacyReviewId,
      H3_LEGACY_REVIEW_SHEET
    );

  var row = record.row;
  var map = table.map;

  var setId = String(
    row[
      map.LISTENING_SET_ID
    ] || ''
  );
  var setNo = Number(
    row[
      map.LISTENING_SET_NO
    ]
  );
  var sourceMode = String(
    row[
      map.SOURCE_MODE
    ] || ''
  );

  if (
    String(
      row[map.STATUS] || ''
    ) !== 'LOCKED' ||
    !String(
      row[map.LOCKED_AT] || ''
    ) ||
    sourceMode !==
      'LEGACY_PRE_WEB'
  ) {
    throw new Error(
      'LEGACY_REVIEW_NOT_LOCKED'
    );
  }

  var source =
    h3ReviewSourceContext_(
      spreadsheet,
      setId
    );

  if (source.setNo !== setNo) {
    throw new Error(
      'LEGACY_REVIEW_SET_NO_MISMATCH'
    );
  }

  var derivedResult =
    h3LegacyReviewResultFromLog_(
      spreadsheet,
      source
    );
  var storedResult =
    h3ProdParseJson_(
      row[
        map.RESULT_JSON
      ],
      'LEGACY_REVIEW_RESULT_JSON_INVALID'
    );

  if (
    h3ReviewCanonicalJson_(
      storedResult
    ) !==
      h3ReviewCanonicalJson_(
        derivedResult
      )
  ) {
    throw new Error(
      'LEGACY_REVIEW_RESULT_SOURCE_MISMATCH'
    );
  }

  var resultSha =
    h3ReviewHash_(
      derivedResult
    );

  if (
    String(
      row[
        map.RESULT_SHA256
      ] || ''
    ) !== resultSha ||
    String(
      row[
        map.ANSWERED_AT
      ] || ''
    ) !==
      derivedResult.answered_at
  ) {
    throw new Error(
      'LEGACY_REVIEW_RESULT_HASH_MISMATCH'
    );
  }

  var explanations =
    h3ReviewExplanationSet_(
      spreadsheet,
      source
    );

  var legacy = {
    legacyReviewId:
      String(legacyReviewId),
    setId: setId,
    setNo: setNo,
    sourceMode:
      sourceMode,
    result:
      derivedResult
  };

  var expected =
    h3LegacyReviewBindingHashObject_(
      legacy,
      source,
      explanations
    );
  var bindingSha =
    h3ReviewHash_(
      expected
    );

  if (
    String(
      row[
        map.ITEM_PAYLOAD_SHA256
      ] || ''
    ) !==
      expected.ITEM_PAYLOAD_SHA256 ||
    String(
      row[
        map.EXPLANATION_SET_SHA256
      ] || ''
    ) !==
      expected.EXPLANATION_SET_SHA256 ||
    String(
      row[
        map.AUDIO_BINDING_SHA256
      ] || ''
    ) !==
      expected.AUDIO_BINDING_SHA256 ||
    String(
      row[
        map.K1_IMAGE_SHA256
      ] || ''
    ) !==
      expected.K1_IMAGE_SHA256 ||
    String(
      row[
        map.REVIEW_CONTRACT_ID
      ] || ''
    ) !==
      H3_LEGACY_REVIEW_CONTRACT_ID ||
    String(
      row[
        map.LEGACY_REVIEW_BINDING_SHA256
      ] || ''
    ) !== bindingSha
  ) {
    throw new Error(
      'LEGACY_REVIEW_BINDING_HASH_MISMATCH'
    );
  }

  return {
    sheet: sheet,
    table: table,
    record: record,
    legacyReviewId:
      String(legacyReviewId),
    setId: setId,
    setNo: setNo,
    sourceMode:
      sourceMode,
    result:
      derivedResult,
    source: source,
    explanations:
      explanations,
    bindingSha256:
      bindingSha,
    hashes: expected
  };
}

function h3LegacyReviewSummaryMap_(
  legacy
) {
  var out = {};
  legacy.result.summary.forEach(
    function (item) {
      out[item.section] = item;
    }
  );
  return out;
}

function buildLegacyPersistentReviewPayload_(
  legacyReviewId
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var legacy =
    h3LegacyReviewContext_(
      spreadsheet,
      legacyReviewId
    );
  var indexed =
    h3LegacyReviewSummaryMap_(
      legacy
    );

  return {
    schema:
      'H3_LEGACY_PERSISTENT_REVIEW_PAYLOAD_V1',
    mode: 'REVIEW',
    read_only: true,
    persisted: true,
    source_mode:
      'LEGACY_PRE_WEB',
    legacy_review_id:
      legacy.legacyReviewId,
    set_id:
      legacy.setId,
    listening_set_no:
      legacy.setNo,
    answered_at:
      legacy.result.answered_at,
    score:
      legacy.result.score,
    total:
      legacy.result.total,
    uncertainty_known: false,
    uncertain_count: null,
    default_filter:
      'NEEDS_REVIEW',
    review_contract_id:
      H3_LEGACY_REVIEW_CONTRACT_ID,
    legacy_review_binding_sha256:
      legacy.bindingSha256,
    sections:
      H3_WEB_PROD_SECTIONS.map(
        function (section) {
          var summary =
            indexed[section];
          var surface =
            h3ReviewQuestionSurface_(
              legacy.source,
              section
            );

          if (!summary) {
            throw new Error(
              'LEGACY_REVIEW_SECTION_RESULT_MISSING:' +
                section
            );
          }

          return {
            section: section,
            display:
              H3_R3_SECTION_DISPLAY[
                section
              ],
            result:
              summary.result,
            user_answer:
              Number(
                summary.answer
              ),
            uncertain_known:
              false,
            uncertain: null,
            correct_answer:
              Number(
                summary.correct_answer
              ),
            audio_asset_key:
              section,
            audio_fallback_url:
              legacy.source
                .audioBinding
                .individual[
                  section
                ]
                .audio_url,
            script_text:
              h3ReviewScriptFromSurface_(
                section,
                surface
              ),
            question_surface:
              surface,
            explanation:
              legacy.explanations
                .bySection[
                  section
                ]
                .explanation,
            explanation_revision_id:
              legacy.explanations
                .bySection[
                  section
                ]
                .revisionId,
            explanation_sha256:
              legacy.explanations
                .bySection[
                  section
                ]
                .sha256
          };
        }
      ),
    technical: {
      result_sha256:
        legacy.hashes
          .RESULT_SHA256,
      item_payload_sha256:
        legacy.hashes
          .ITEM_PAYLOAD_SHA256,
      explanation_set_sha256:
        legacy.hashes
          .EXPLANATION_SET_SHA256,
      audio_binding_sha256:
        legacy.hashes
          .AUDIO_BINDING_SHA256,
      k1_image_sha256:
        legacy.hashes
          .K1_IMAGE_SHA256
    }
  };
}

function h3LegacyReviewHistoryEntries_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_LEGACY_REVIEW_SHEET
    );

  if (!sheet) {
    return [];
  }

  h3ReviewRequireExactHeader_(
    sheet,
    H3_LEGACY_REVIEW_HEADERS,
    'LEGACY_REVIEW'
  );

  var table =
    h3ReviewTable_(sheet);
  var entries = [];

  table.rows.forEach(
    function (row) {
      var id = String(
        row[
          table.map
            .LEGACY_REVIEW_ID
        ] || ''
      );

      if (!id) return;

      var legacy;
      try {
        legacy =
          h3LegacyReviewContext_(
            spreadsheet,
            id
          );
      } catch (err) {
        return;
      }

      var wrongCount =
        legacy.result.summary.filter(
          function (item) {
            return (
              item.result !== '○'
            );
          }
        ).length;

      entries.push({
        legacy_review_id:
          legacy.legacyReviewId,
        source_mode:
          'LEGACY_PRE_WEB',
        set_id:
          legacy.setId,
        listening_set_no:
          legacy.setNo,
        answered_at:
          legacy.result.answered_at,
        score:
          legacy.result.score,
        total:
          legacy.result.total,
        wrong_count:
          wrongCount,
        uncertainty_known:
          false,
        uncertain_count:
          null,
        needs_review:
          wrongCount > 0,
        review_open_validation:
          'FULL_SOURCE_LOCK_ON_OPEN'
      });
    }
  );

  entries.sort(function (a, b) {
    var at = String(
      a.answered_at || ''
    );
    var bt = String(
      b.answered_at || ''
    );

    if (at !== bt) {
      return at < bt ? 1 : -1;
    }

    return (
      Number(
        b.listening_set_no || 0
      ) -
      Number(
        a.listening_set_no || 0
      )
    );
  });

  return entries.slice(0, 50);
}

function h3LegacyReviewRegisteredSetIds_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_LEGACY_REVIEW_SHEET
    );

  if (!sheet) {
    return {};
  }

  h3ReviewRequireExactHeader_(
    sheet,
    H3_LEGACY_REVIEW_HEADERS,
    'LEGACY_REVIEW'
  );

  var table =
    h3ReviewTable_(sheet);
  var out = {};

  table.rows.forEach(
    function (row) {
      if (
        String(
          row[
            table.map.STATUS
          ] || ''
        ) === 'LOCKED' &&
        String(
          row[
            table.map
              .SOURCE_MODE
          ] || ''
        ) === 'LEGACY_PRE_WEB'
      ) {
        var setId = String(
          row[
            table.map
              .LISTENING_SET_ID
          ] || ''
        );
        if (setId) {
          out[setId] = true;
        }
      }
    }
  );

  return out;
}

function h3ReviewHistoryEntries_(
  spreadsheet
) {
  var bindingSheet =
    spreadsheet.getSheetByName(
      H3_REVIEW_BINDING_SHEET
    );
  var txnSheet =
    spreadsheet.getSheetByName(
      H3_WEB_PROD_TXN_SHEET
    );

  h3ReviewRequireExactHeader_(
    bindingSheet,
    H3_REVIEW_BINDING_HEADERS,
    'REVIEW_BINDING'
  );

  if (!txnSheet) {
    throw new Error(
      'REVIEW_TXN_SHEET_MISSING'
    );
  }

  var bindingTable =
    h3ReviewTable_(
      bindingSheet
    );
  var txnTable =
    h3ReviewTable_(
      txnSheet
    );

  h3ProdRequireColumns_(
    txnTable,
    [
      'TXN_ID',
      'SET_ID',
      'LISTENING_SET_NO',
      'MODE',
      'RAW_INPUT_JSON',
      'STATUS',
      'RESULT_JSON',
      'COMMITTED_AT'
    ],
    H3_WEB_PROD_TXN_SHEET
  );

  var txnById = {};
  txnTable.rows.forEach(
    function (row) {
      var txnId = String(
        row[txnTable.map.TXN_ID] ||
        ''
      );
      if (!txnId) return;

      if (txnById[txnId]) {
        txnById[txnId] =
          'DUPLICATE';
        return;
      }

      txnById[txnId] = row;
    }
  );

  var entries = [];

  bindingTable.rows.forEach(
    function (row) {
      var map =
        bindingTable.map;
      var txnId = String(
        row[map.TXN_ID] || ''
      );

      if (
        !txnId ||
        String(
          row[map.STATUS] || ''
        ) !== 'LOCKED' ||
        !String(
          row[map.LOCKED_AT] || ''
        )
      ) {
        return;
      }

      var txnRow =
        txnById[txnId];

      if (
        !txnRow ||
        txnRow === 'DUPLICATE'
      ) {
        return;
      }

      if (
        String(
          txnRow[
            txnTable.map.MODE
          ] || ''
        ) !== 'LISTENING' ||
        String(
          txnRow[
            txnTable.map.STATUS
          ] || ''
        ) !== 'COMMITTED'
      ) {
        return;
      }

      var setId = String(
        row[
          map.LISTENING_SET_ID
        ] || ''
      );
      var setNo = Number(
        row[
          map.LISTENING_SET_NO
        ]
      );

      if (
        String(
          txnRow[
            txnTable.map.SET_ID
          ] || ''
        ) !== setId ||
        Number(
          txnRow[
            txnTable.map
              .LISTENING_SET_NO
          ]
        ) !== setNo
      ) {
        return;
      }

      var result;
      var rawInput;
      try {
        result =
          h3ProdParseJson_(
            txnRow[
              txnTable.map.RESULT_JSON
            ],
            'REVIEW_HISTORY_RESULT_INVALID'
          );
        rawInput =
          h3ProdParseJson_(
            txnRow[
              txnTable.map.RAW_INPUT_JSON
            ],
            'REVIEW_HISTORY_INPUT_INVALID'
          );
      } catch (err) {
        return;
      }

      if (
        !result ||
        result.txn_id !== txnId ||
        result.set_id !== setId ||
        result.status !==
          'COMMITTED' ||
        !Array.isArray(
          result.summary
        ) ||
        result.summary.length !== 5 ||
        !rawInput ||
        rawInput.mode !==
          'LISTENING' ||
        rawInput.set_id !==
          setId ||
        !Array.isArray(
          rawInput.answers
        ) ||
        rawInput.answers.length !== 5
      ) {
        return;
      }

      var wrongCount = 0;
      result.summary.forEach(
        function (item) {
          if (
            item.result === '×'
          ) {
            wrongCount += 1;
          }
        }
      );

      var uncertainCount = 0;
      rawInput.answers.forEach(
        function (item) {
          if (item.uncertain) {
            uncertainCount += 1;
          }
        }
      );

      entries.push({
        txn_id: txnId,
        set_id: setId,
        listening_set_no:
          setNo,
        committed_at: String(
          txnRow[
            txnTable.map.COMMITTED_AT
          ] || ''
        ),
        score: Number(
          result.score
        ),
        total: Number(
          result.total
        ),
        wrong_count:
          wrongCount,
        uncertain_count:
          uncertainCount,
        needs_review:
          result.summary.some(
            function (item) {
              return (
                item.result !== '○'
              );
            }
          ),
        review_open_validation:
          'FULL_SOURCE_LOCK_ON_OPEN'
      });
    }
  );

  entries.sort(function (a, b) {
    var at =
      String(a.committed_at || '');
    var bt =
      String(b.committed_at || '');

    if (at !== bt) {
      return at < bt ? 1 : -1;
    }

    return (
      Number(
        b.listening_set_no || 0
      ) -
      Number(
        a.listening_set_no || 0
      )
    );
  });

  return entries.slice(0, 50);
}


function h3ReviewReplayValidateLegacyId_(
  request,
  schemaName
) {
  if (
    !request ||
    request.schema !== schemaName ||
    request.mode !== 'REVIEW_REPLAY' ||
    !request.legacy_review_id ||
    request.txn_id
  ) {
    throw new Error(
      'INVALID_LEGACY_REVIEW_REPLAY_REQUEST'
    );
  }

  var legacyReviewId = String(
    request.legacy_review_id
  );

  if (
    legacyReviewId.length > 128 ||
    /[\x00-\x1F]/.test(
      legacyReviewId
    )
  ) {
    throw new Error(
      'INVALID_LEGACY_REVIEW_REPLAY_ID'
    );
  }

  return legacyReviewId;
}

function h3ReviewReplayPayloadFromReview_(
  review
) {
  var questions =
    review.sections.map(
      function (part) {
        var visibleChoices = null;
        var surface =
          part.question_surface || {};

        if (
          part.section === 'K4' &&
          Array.isArray(
            surface.choices_ja
          )
        ) {
          visibleChoices =
            surface.choices_ja.slice();
        } else if (
          part.section === 'K5' &&
          Array.isArray(
            surface.choices_ko
          )
        ) {
          visibleChoices =
            surface.choices_ko.slice();
        }

        var question = {
          section:
            part.section,
          display:
            part.display,
          audio_asset_key:
            part.audio_asset_key,
          audio_fallback_url:
            part.audio_fallback_url,
          choice_ids:
            [1, 2, 3, 4],
          visible_choices:
            visibleChoices
        };

        if (
          part.section === 'K1'
        ) {
          question.image_data_uri =
            surface.image_data_uri;
          question.image_sha256 =
            surface.image_sha256;
          question.image_size_bytes =
            surface.image_size_bytes;
        }

        return question;
      }
    );

  return {
    schema:
      'H3_REVIEW_REPLAY_SET_V1',
    mode:
      'REVIEW_REPLAY',
    nonlearning: true,
    persisted: false,
    read_only_source: true,
    txn_id:
      review.txn_id || null,
    legacy_review_id:
      review.legacy_review_id ||
      null,
    set_id:
      review.set_id,
    listening_set_no:
      review.listening_set_no,
    source_review_binding_sha256:
      review.review_binding_sha256 ||
      review
        .legacy_review_binding_sha256,
    canonical_render_version:
      H3_R3_LISTENING_RENDER_VERSION,
    surface_contract_id:
      H3_R3_WEB_SURFACE_CONTRACT_ID,
    replay_contract_id:
      'H3-REVIEW-REPLAY-20260920-V1',
    questions:
      questions
  };
}

function h3ReviewReplayValidateTxnId_(request, schemaName) {
  if (
    !request ||
    request.schema !== schemaName ||
    request.mode !== 'REVIEW_REPLAY' ||
    !request.txn_id
  ) {
    throw new Error(
      'INVALID_REVIEW_REPLAY_REQUEST'
    );
  }

  var txnId = String(
    request.txn_id
  );

  if (
    txnId.length > 128 ||
    /[\x00-\x1F]/.test(txnId)
  ) {
    throw new Error(
      'INVALID_REVIEW_REPLAY_TXN_ID'
    );
  }

  return txnId;
}

function buildReviewReplayPayload_(
  txnId
) {
  var review =
    buildPersistentReviewPayload_(
      txnId
    );

  var questions =
    review.sections.map(
      function (part) {
        var visibleChoices = null;
        var surface =
          part.question_surface || {};

        if (
          part.section === 'K4' &&
          Array.isArray(
            surface.choices_ja
          )
        ) {
          visibleChoices =
            surface.choices_ja.slice();
        } else if (
          part.section === 'K5' &&
          Array.isArray(
            surface.choices_ko
          )
        ) {
          visibleChoices =
            surface.choices_ko.slice();
        }

        var question = {
          section:
            part.section,
          display:
            part.display,
          audio_asset_key:
            part.audio_asset_key,
          audio_fallback_url:
            part.audio_fallback_url,
          choice_ids:
            [1, 2, 3, 4],
          visible_choices:
            visibleChoices
        };

        if (
          part.section === 'K1'
        ) {
          question.image_data_uri =
            surface.image_data_uri;
          question.image_sha256 =
            surface.image_sha256;
          question.image_size_bytes =
            surface.image_size_bytes;
        }

        return question;
      }
    );

  return {
    schema:
      'H3_REVIEW_REPLAY_SET_V1',
    mode:
      'REVIEW_REPLAY',
    nonlearning: true,
    persisted: false,
    read_only_source: true,
    txn_id:
      review.txn_id,
    set_id:
      review.set_id,
    listening_set_no:
      review.listening_set_no,
    source_review_binding_sha256:
      review.review_binding_sha256,
    canonical_render_version:
      H3_R3_LISTENING_RENDER_VERSION,
    surface_contract_id:
      H3_R3_WEB_SURFACE_CONTRACT_ID,
    replay_contract_id:
      'H3-REVIEW-REPLAY-20260920-V1',
    questions:
      questions
  };
}

function buildLegacyReviewReplayPayload_(
  legacyReviewId
) {
  return h3ReviewReplayPayloadFromReview_(
    buildLegacyPersistentReviewPayload_(
      legacyReviewId
    )
  );
}

function getReviewReplayPayload_(
  request
) {
  if (
    request &&
    request.legacy_review_id
  ) {
    var legacyReviewId =
      h3ReviewReplayValidateLegacyId_(
        request,
        'H3_WEB_RENDER_REQUEST_V1'
      );

    return buildLegacyReviewReplayPayload_(
      legacyReviewId
    );
  }

  var txnId =
    h3ReviewReplayValidateTxnId_(
      request,
      'H3_WEB_RENDER_REQUEST_V1'
    );

  return buildReviewReplayPayload_(
    txnId
  );
}

function getReviewReplayMediaPayload_(
  request
) {
  var media;

  if (
    request &&
    request.legacy_review_id
  ) {
    var legacyReviewId =
      h3ReviewReplayValidateLegacyId_(
        request,
        'H3_WEB_MEDIA_REQUEST_V1'
      );

    media =
      getLegacyPersistentReviewMediaPayload_({
        schema:
          'H3_WEB_MEDIA_REQUEST_V1',
        mode:
          'REVIEW',
        legacy_review_id:
          legacyReviewId,
        set_id:
          request.set_id || null,
        asset_key:
          request.asset_key
      });
  } else {
    var txnId =
      h3ReviewReplayValidateTxnId_(
        request,
        'H3_WEB_MEDIA_REQUEST_V1'
      );

    media =
      getPersistentReviewMediaPayload_({
        schema:
          'H3_WEB_MEDIA_REQUEST_V1',
        mode:
          'REVIEW',
        txn_id:
          txnId,
        set_id:
          request.set_id || null,
        asset_key:
          request.asset_key
      });
  }

  media.mode =
    'REVIEW_REPLAY';
  media.nonlearning =
    true;
  media.persisted =
    false;

  return media;
}

function h3ReviewReplayNormalizeAnswers_(
  request
) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_SUBMIT_V1' ||
    request.mode !==
      'REVIEW_REPLAY' ||
    (
      !request.txn_id &&
      !request.legacy_review_id
    ) ||
    (
      request.txn_id &&
      request.legacy_review_id
    ) ||
    !request.set_id ||
    !Array.isArray(
      request.answers
    ) ||
    request.answers.length !== 5
  ) {
    throw new Error(
      'INVALID_REVIEW_REPLAY_SUBMIT'
    );
  }

  var bySection = {};

  request.answers.forEach(
    function (item) {
      var section =
        String(
          item &&
          item.section ||
          ''
        );
      var answer =
        Number(
          item &&
          item.answer
        );

      if (
        H3_WEB_PROD_SECTIONS
          .indexOf(section) < 0 ||
        bySection[section] ||
        !Number.isInteger(
          answer
        ) ||
        answer < 1 ||
        answer > 4
      ) {
        throw new Error(
          'REVIEW_REPLAY_ANSWER_INVALID'
        );
      }

      bySection[section] = {
        section:
          section,
        answer:
          answer,
        uncertain:
          !!item.uncertain
      };
    }
  );

  return H3_WEB_PROD_SECTIONS.map(
    function (section) {
      if (!bySection[section]) {
        throw new Error(
          'REVIEW_REPLAY_SECTION_MISSING:' +
            section
        );
      }

      return bySection[section];
    }
  );
}

function gradeReviewReplay_(
  request
) {
  var txnId =
    String(
      request &&
      request.txn_id ||
      ''
    );
  var legacyReviewId =
    String(
      request &&
      request.legacy_review_id ||
      ''
    );

  if (
    (
      !txnId &&
      !legacyReviewId
    ) ||
    (
      txnId &&
      legacyReviewId
    ) ||
    txnId.length > 128 ||
    legacyReviewId.length > 128 ||
    /[\x00-\x1F]/.test(
      txnId + legacyReviewId
    )
  ) {
    throw new Error(
      'INVALID_REVIEW_REPLAY_REFERENCE'
    );
  }

  var answers =
    h3ReviewReplayNormalizeAnswers_(
      request
    );
  var review =
    legacyReviewId
      ? buildLegacyPersistentReviewPayload_(
          legacyReviewId
        )
      : buildPersistentReviewPayload_(
          txnId
        );

  if (
    String(request.set_id) !==
      review.set_id
  ) {
    throw new Error(
      'REVIEW_REPLAY_SET_MISMATCH'
    );
  }

  var correctBySection = {};
  review.sections.forEach(
    function (part) {
      correctBySection[
        part.section
      ] =
        Number(
          part.correct_answer
        );
    }
  );

  var score = 0;
  var summary =
    answers.map(
      function (item) {
        var correct =
          correctBySection[
            item.section
          ];

        var isCorrect =
          item.answer === correct;

        if (isCorrect) {
          score += 1;
        }

        return {
          section:
            item.section,
          answer:
            item.answer,
          uncertain:
            item.uncertain,
          correct_answer:
            correct,
          result:
            isCorrect
              ? (
                  item.uncertain
                    ? '△'
                    : '○'
                )
              : '×'
        };
      }
    );

  return {
    schema:
      'H3_REVIEW_REPLAY_RESULT_V1',
    mode:
      'REVIEW_REPLAY',
    nonlearning: true,
    persisted: false,
    runtime_write_count: 0,
    txn_id:
      review.txn_id || null,
    legacy_review_id:
      review.legacy_review_id ||
      null,
    set_id:
      review.set_id,
    listening_set_no:
      review.listening_set_no,
    score:
      score,
    total: 5,
    original_score:
      Number(
        review.score
      ),
    summary:
      summary,
    after_replay:
      review
  };
}



/* =========================================================
 * Written 5W learner-facing explanation overlay
 * =======================================================*/

var H3_WRITTEN_REVIEW_EXPLANATION_OVERLAY_SHEET_ =
  'written_review_explanation_overlay_v1';
var H3_WRITTEN_REVIEW_EXPLANATION_BINDING_SHEET_ =
  'written_review_explanation_binding_v1';
var H3_WRITTEN_REVIEW_EXPLANATION_OVERLAY_CONTRACT_ID_ =
  'H3-WRITTEN-REVIEW-EXPLANATION-OVERLAY-20260921-V1';
var H3_WRITTEN_REVIEW_EXPLANATION_DISPLAY_SCHEMA_ =
  'H3_5W_REVIEW_EXPLANATION_DISPLAY_V1';
var H3_WRITTEN_REVIEW_EXPLANATION_APPROVED_TEXT_SHA256_ =
  '9b13effe68f565a1ef1fea5c13441dddf7ef3bed5296050c3e62931db48a670f';

var H3_WRITTEN_REVIEW_EXPLANATION_OVERLAY_HEADERS_ = [
  'SET_ID',
  'BASE_SOURCE_MODE',
  'BASE_AUTHORITY_SHA256',
  'DISPLAY_SCHEMA',
  'DISPLAY_JSON',
  'DISPLAY_SHA256',
  'PROVENANCE_JSON',
  'STATUS',
  'OVERLAY_CONTRACT_ID',
  'LOCKED_AT'
];

var H3_WRITTEN_REVIEW_EXPLANATION_BINDING_HEADERS_ = [
  'SET_ID',
  'BASE_SOURCE_MODE',
  'BASE_AUTHORITY_SHA256',
  'DISPLAY_SHA256',
  'OVERLAY_CONTRACT_ID',
  'OVERLAY_BINDING_SHA256',
  'STATUS',
  'LOCKED_AT'
];

var H3_WRITTEN_REVIEW_EXPLANATION_PROVENANCE_MODES_ = [
  'HISTORICAL_REFORMAT',
  'HISTORICAL_WHY_EXPAND',
  'SOURCE_LINKED_REBUILD',
  'CURRENT_REGENERATED_FROM_VERIFIED_SOURCES',
  'CURRENT_NATIVE_STRICT'
];


function h3WrittenReviewExplanationOverlayBindingObject_(
  setId,
  baseSourceMode,
  baseAuthoritySha256,
  displaySha256
) {
  return {
    BASE_AUTHORITY_SHA256:
      String(baseAuthoritySha256 || ''),
    BASE_SOURCE_MODE:
      String(baseSourceMode || ''),
    DISPLAY_SHA256:
      String(displaySha256 || ''),
    OVERLAY_CONTRACT_ID:
      H3_WRITTEN_REVIEW_EXPLANATION_OVERLAY_CONTRACT_ID_,
    SET_ID:
      String(setId || '')
  };
}


function h3WrittenReviewExplanationOverlayTables_(
  spreadsheet
) {
  var payloadSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_REVIEW_EXPLANATION_OVERLAY_SHEET_
    );
  var bindingSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_REVIEW_EXPLANATION_BINDING_SHEET_
    );

  if (!payloadSheet && !bindingSheet) {
    return null;
  }
  if (!payloadSheet || !bindingSheet) {
    throw new Error(
      'WRITTEN_REVIEW_EXPLANATION_OVERLAY_PARTIAL_STORAGE'
    );
  }

  h3ReviewRequireExactHeader_(
    payloadSheet,
    H3_WRITTEN_REVIEW_EXPLANATION_OVERLAY_HEADERS_,
    'WRITTEN_REVIEW_EXPLANATION_OVERLAY'
  );
  h3ReviewRequireExactHeader_(
    bindingSheet,
    H3_WRITTEN_REVIEW_EXPLANATION_BINDING_HEADERS_,
    'WRITTEN_REVIEW_EXPLANATION_BINDING'
  );

  return {
    payload:
      h3ReviewTable_(payloadSheet),
    binding:
      h3ReviewTable_(bindingSheet)
  };
}


function h3WrittenReviewExplanationRowsBySet_(
  table,
  setId
) {
  return table.rows.filter(
    function (row) {
      return String(
        row[table.map.SET_ID] || ''
      ) === String(setId || '');
    }
  );
}


function h3WrittenReviewExplanationBaseChoiceText_(
  choice
) {
  if (
    choice !== null &&
    typeof choice === 'object'
  ) {
    return String(
      choice.text ||
      choice.ko ||
      ''
    );
  }
  return String(choice || '');
}


function h3WrittenReviewExplanationSourceGateBody_(
  part
) {
  var body =
    String(
      part &&
      part.question_surface &&
      part.question_surface.body ||
      ''
    );
  var section =
    String(
      part &&
      part.section ||
      ''
    );

  if (
    section !== 'D4' &&
    section !== 'D5'
  ) {
    return body;
  }

  var lines =
    body.split(/\r?\n/);

  if (
    lines.length > 1 &&
    /[\u3040-\u30ff]/.test(
      lines[0]
    ) &&
    !/[가-힣]/.test(
      lines[0]
    )
  ) {
    return lines
      .slice(1)
      .join('\n');
  }

  return body;
}


function h3WrittenReviewExplanationValidateDisplay_(
  display,
  review
) {
  if (
    !display ||
    display.schema !==
      H3_WRITTEN_REVIEW_EXPLANATION_DISPLAY_SCHEMA_ ||
    display.set_id !== review.set_id ||
    display.approved_text_sha256 !==
      H3_WRITTEN_REVIEW_EXPLANATION_APPROVED_TEXT_SHA256_ ||
    !Array.isArray(display.questions) ||
    display.questions.length !== 5 ||
    !Array.isArray(review.sections) ||
    review.sections.length !== 5
  ) {
    throw new Error(
      'WRITTEN_REVIEW_EXPLANATION_DISPLAY_IDENTITY_MISMATCH'
    );
  }

  display.questions.forEach(
    function (item, index) {
      var part =
        review.sections[index];
      var gate =
        item && item.source_gate;
      var explanation =
        item && item.explanation;
      var baseChoices =
        (
          part &&
          part.question_surface &&
          Array.isArray(
            part.question_surface.choices
          )
            ? part.question_surface.choices
            : []
        ).map(
          h3WrittenReviewExplanationBaseChoiceText_
        );

      if (
        !item ||
        item.q_no !== index + 1 ||
        H3_WRITTEN_REVIEW_EXPLANATION_PROVENANCE_MODES_
          .indexOf(
            item.provenance_mode
          ) < 0 ||
        !gate ||
        String(gate.body_ko || '') !==
          h3WrittenReviewExplanationSourceGateBody_(
            part
          ) ||
        JSON.stringify(
          gate.choices_ko || []
        ) !==
          JSON.stringify(baseChoices) ||
        Number(gate.correct_position) !==
          Number(
            part.correct_answer_position
          ) ||
        String(gate.mark || '') !==
          String(part.result || '') ||
        !explanation ||
        typeof explanation !== 'object' ||
        !String(
          explanation.body_ja || ''
        ) ||
        !Array.isArray(
          explanation.choices
        ) ||
        explanation.choices.length !== 4 ||
        !String(
          explanation.reason || ''
        ) ||
        !Array.isArray(
          explanation.learning_blocks
        )
      ) {
        throw new Error(
          'WRITTEN_REVIEW_EXPLANATION_DISPLAY_Q_MISMATCH:Q' +
            String(index + 1)
        );
      }

      explanation.choices.forEach(
        function (choice, choiceIndex) {
          if (
            !choice ||
            String(choice.ko || '') !==
              String(
                baseChoices[
                  choiceIndex
                ] || ''
              ) ||
            !String(choice.ja || '')
          ) {
            throw new Error(
              'WRITTEN_REVIEW_EXPLANATION_CHOICE_MISMATCH:Q' +
                String(index + 1) +
                ':C' +
                String(choiceIndex + 1)
            );
          }
        }
      );
    }
  );
}


function h3WrittenReviewApplyExplanationOverlay_(
  spreadsheet,
  baseReview,
  baseSourceMode,
  baseAuthoritySha256
) {
  var tables =
    h3WrittenReviewExplanationOverlayTables_(
      spreadsheet
    );

  if (!tables) {
    return baseReview;
  }

  var setId =
    String(
      baseReview &&
      baseReview.set_id ||
      ''
    );
  var payloadRows =
    h3WrittenReviewExplanationRowsBySet_(
      tables.payload,
      setId
    );
  var bindingRows =
    h3WrittenReviewExplanationRowsBySet_(
      tables.binding,
      setId
    );

  if (
    payloadRows.length === 0 &&
    bindingRows.length === 0
  ) {
    return baseReview;
  }
  if (
    payloadRows.length !== 1 ||
    bindingRows.length !== 1
  ) {
    throw new Error(
      'WRITTEN_REVIEW_EXPLANATION_OVERLAY_AUTHORITY_COUNT:' +
        payloadRows.length +
        ':' +
        bindingRows.length
    );
  }

  var p =
    h3WrittenReviewStoredRowObject_(
      tables.payload,
      payloadRows[0]
    );
  var b =
    h3WrittenReviewStoredRowObject_(
      tables.binding,
      bindingRows[0]
    );
  var fields = [
    'SET_ID',
    'BASE_SOURCE_MODE',
    'BASE_AUTHORITY_SHA256',
    'DISPLAY_SHA256',
    'OVERLAY_CONTRACT_ID',
    'STATUS',
    'LOCKED_AT'
  ];

  fields.forEach(function (field) {
    if (
      String(p[field] || '') !==
        String(b[field] || '')
    ) {
      throw new Error(
        'WRITTEN_REVIEW_EXPLANATION_OVERLAY_BINDING_FIELD_MISMATCH:' +
          field
      );
    }
  });

  if (
    String(p.STATUS || '') !== 'LOCKED' ||
    !String(p.LOCKED_AT || '') ||
    String(p.OVERLAY_CONTRACT_ID || '') !==
      H3_WRITTEN_REVIEW_EXPLANATION_OVERLAY_CONTRACT_ID_ ||
    String(p.DISPLAY_SCHEMA || '') !==
      H3_WRITTEN_REVIEW_EXPLANATION_DISPLAY_SCHEMA_ ||
    String(p.BASE_SOURCE_MODE || '') !==
      String(baseSourceMode || '') ||
    String(p.BASE_AUTHORITY_SHA256 || '') !==
      String(baseAuthoritySha256 || '') ||
    !/^[0-9a-f]{64}$/.test(
      String(p.BASE_AUTHORITY_SHA256 || '')
    )
  ) {
    throw new Error(
      'WRITTEN_REVIEW_EXPLANATION_OVERLAY_BASE_MISMATCH'
    );
  }

  var display =
    h3WrittenParseJson_(
      p.DISPLAY_JSON,
      'WRITTEN_REVIEW_EXPLANATION_DISPLAY_JSON_INVALID'
    );
  var displaySha =
    h3ReviewHash_(display);

  if (
    displaySha !==
      String(p.DISPLAY_SHA256 || '') ||
    displaySha !==
      String(b.DISPLAY_SHA256 || '')
  ) {
    throw new Error(
      'WRITTEN_REVIEW_EXPLANATION_DISPLAY_HASH_MISMATCH'
    );
  }

  var provenance =
    h3WrittenParseJson_(
      p.PROVENANCE_JSON,
      'WRITTEN_REVIEW_EXPLANATION_PROVENANCE_JSON_INVALID'
    );

  if (
    !provenance ||
    provenance.set_id !== setId ||
    provenance.approved_text_sha256 !==
      H3_WRITTEN_REVIEW_EXPLANATION_APPROVED_TEXT_SHA256_ ||
    !Array.isArray(
      provenance.questions
    ) ||
    provenance.questions.length !== 5
  ) {
    throw new Error(
      'WRITTEN_REVIEW_EXPLANATION_PROVENANCE_INVALID'
    );
  }

  provenance.questions.forEach(
    function (question, index) {
      if (
        !question ||
        question.q_no !== index + 1 ||
        question.provenance_mode !==
          display.questions[
            index
          ].provenance_mode
      ) {
        throw new Error(
          'WRITTEN_REVIEW_EXPLANATION_PROVENANCE_MISMATCH:Q' +
            String(index + 1)
        );
      }
    }
  );

  h3WrittenReviewExplanationValidateDisplay_(
    display,
    baseReview
  );

  var bindingSha =
    h3ReviewHash_(
      h3WrittenReviewExplanationOverlayBindingObject_(
        setId,
        baseSourceMode,
        baseAuthoritySha256,
        displaySha
      )
    );

  if (
    bindingSha !==
      String(
        b.OVERLAY_BINDING_SHA256 || ''
      )
  ) {
    throw new Error(
      'WRITTEN_REVIEW_EXPLANATION_OVERLAY_BINDING_HASH_MISMATCH'
    );
  }

  var review =
    h3WrittenReviewClone_(
      baseReview
    );

  display.questions.forEach(
    function (item, index) {
      review.sections[index]
        .explanation =
          h3WrittenReviewClone_(
            item.explanation
          );
    }
  );

  review.technical =
    review.technical || {};
  review.technical
    .explanation_overlay = {
      contract_id:
        H3_WRITTEN_REVIEW_EXPLANATION_OVERLAY_CONTRACT_ID_,
      display_sha256:
        displaySha,
      overlay_binding_sha256:
        bindingSha,
      provenance:
        h3WrittenReviewClone_(
          provenance
        )
    };

  return review;
}


/**
 * Written 5W ANSWERED_AT backfill sidecar.
 *
 * Legacy Review payloads remain immutable. This optional, fail-closed sidecar
 * supplies only a repaired answered_at plus explicit observation precision
 * and evidence provenance. Serialized seconds ':00' are convention-only for
 * MINUTE / MINUTE_APPROX observations.
 */
var H3_WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_SHEET_ =
  'written_review_answered_at_backfill_v1';

var H3_WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_CONTRACT_ID_ =
  'H3-WRITTEN-REVIEW-ANSWERED-AT-BACKFILL-20260921-V1';

var H3_WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_HEADERS_ = [
  'SET_ID',
  'ANSWERED_AT',
  'PRECISION',
  'EVIDENCE',
  'NOTE',
  'STATUS',
  'CONTRACT_ID',
  'RECORD_SHA256',
  'LOCKED_AT'
];


function h3WrittenReviewAnsweredAtBackfillHashObject_(
  row
) {
  return {
    ANSWERED_AT:
      String(row.ANSWERED_AT || ''),
    CONTRACT_ID:
      String(row.CONTRACT_ID || ''),
    EVIDENCE:
      String(row.EVIDENCE || ''),
    LOCKED_AT:
      String(row.LOCKED_AT || ''),
    NOTE:
      String(row.NOTE || ''),
    PRECISION:
      String(row.PRECISION || ''),
    SET_ID:
      String(row.SET_ID || ''),
    STATUS:
      String(row.STATUS || '')
  };
}


function h3WrittenReviewAnsweredAtBackfillTable_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_SHEET_
    );

  if (!sheet) {
    return null;
  }

  h3ReviewRequireExactHeader_(
    sheet,
    H3_WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_HEADERS_,
    'WRITTEN_REVIEW_ANSWERED_AT_BACKFILL'
  );

  return h3ReviewTable_(sheet);
}


function h3WrittenReviewAnsweredAtBackfillRecord_(
  spreadsheet,
  setId,
  baseAnsweredAt
) {
  var table =
    h3WrittenReviewAnsweredAtBackfillTable_(
      spreadsheet
    );

  if (!table) {
    return null;
  }

  var normalizedSetId =
    String(setId || '').trim();
  var rows =
    table.rows.filter(
      function (row) {
        return String(
          row[table.map.SET_ID] || ''
        ) === normalizedSetId;
      }
    );

  if (!rows.length) {
    return null;
  }

  if (rows.length !== 1) {
    throw new Error(
      'WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_DUPLICATE:' +
        normalizedSetId
    );
  }

  var row =
    h3WrittenReviewStoredRowObject_(
      table,
      rows[0]
    );
  var answeredAt =
    String(row.ANSWERED_AT || '');
  var precision =
    String(row.PRECISION || '');
  var evidence =
    String(row.EVIDENCE || '');
  var note =
    String(row.NOTE || '');
  var status =
    String(row.STATUS || '');
  var contractId =
    String(row.CONTRACT_ID || '');
  var recordSha =
    String(row.RECORD_SHA256 || '');
  var lockedAt =
    String(row.LOCKED_AT || '');

  if (
    !/^H3-\d{8}-\d{2,3}$/.test(
      normalizedSetId
    ) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+09:00$/.test(
      answeredAt
    ) ||
    answeredAt.slice(0, 10) !==
      normalizedSetId.slice(3, 7) +
      '-' +
      normalizedSetId.slice(7, 9) +
      '-' +
      normalizedSetId.slice(9, 11) ||
    status !== 'LOCKED' ||
    contractId !==
      H3_WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_CONTRACT_ID_ ||
    !lockedAt ||
    !/^[0-9a-f]{64}$/.test(
      recordSha
    )
  ) {
    throw new Error(
      'WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_ROW_INVALID:' +
        normalizedSetId
    );
  }

  if (
    (
      precision === 'MINUTE' &&
      evidence === 'CHAT_HISTORY'
    ) === false &&
    (
      precision === 'MINUTE_APPROX' &&
      evidence === 'USER_ASSIGNED_FALLBACK' &&
      note
    ) === false
  ) {
    throw new Error(
      'WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_PROVENANCE_INVALID:' +
        normalizedSetId
    );
  }

  var calculatedSha =
    h3ReviewHash_(
      h3WrittenReviewAnsweredAtBackfillHashObject_(
        row
      )
    );

  if (calculatedSha !== recordSha) {
    throw new Error(
      'WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_HASH_MISMATCH:' +
        normalizedSetId
    );
  }

  var base =
    String(baseAnsweredAt || 'UNKNOWN');

  if (
    base !== 'UNKNOWN' &&
    base !== answeredAt
  ) {
    throw new Error(
      'WRITTEN_REVIEW_ANSWERED_AT_BACKFILL_CONFLICT:' +
        normalizedSetId
    );
  }

  return {
    setId: normalizedSetId,
    answeredAt: answeredAt,
    precision: precision,
    evidence: evidence,
    note: note,
    contractId: contractId,
    recordSha256: recordSha,
    lockedAt: lockedAt,
    serializedSecondPolicy:
      'CONVENTION_ONLY_NOT_OBSERVED'
  };
}


function h3WrittenReviewApplyAnsweredAtBackfill_(
  spreadsheet,
  baseReview
) {
  if (
    !baseReview ||
    baseReview.kind !== 'WRITTEN'
  ) {
    return baseReview;
  }

  var backfill =
    h3WrittenReviewAnsweredAtBackfillRecord_(
      spreadsheet,
      baseReview.set_id,
      baseReview.answered_at
    );

  if (!backfill) {
    return baseReview;
  }

  var review =
    h3WrittenReviewClone_(
      baseReview
    );

  review.answered_at =
    backfill.answeredAt;
  review.technical =
    review.technical || {};
  review.technical.answered_at_backfill =
    h3WrittenReviewClone_(
      backfill
    );

  return review;
}


/**
 * Historical Written Review persistent loader.
 *
 * This layer is intentionally read-only and does not register the Written
 * provider. It validates the isolated historical payload/binding tables,
 * projects the stored reconstruction through WebAppReviewWrittenAdapter.js,
 * and normalizes the result into a future learner-facing Review payload.
 */
var H3_WRITTEN_LEGACY_REVIEW_PAYLOAD_SHEET_ =
  'written_legacy_review_payload_v1';

var H3_WRITTEN_LEGACY_REVIEW_BINDING_SHEET_ =
  'written_legacy_review_binding_v1';

var H3_WRITTEN_LEGACY_REVIEW_CONTRACT_ID_ =
  'H3-WRITTEN-LEGACY-REVIEW-CONTRACT-20260920-V1';

var H3_WRITTEN_LEGACY_REVIEW_SCHEMA_ =
  'H3_5W_HISTORICAL_RECONSTRUCTION_V2';

var H3_WRITTEN_LEGACY_REVIEW_PAYLOAD_HEADERS_ = [
  'LOGICAL_KEY',
  'PAYLOAD_KEY',
  'SET_ID',
  'SOURCE_QUEUE_ROW',
  'SOURCE_MODE',
  'MATERIALIZED_AT',
  'STATUS',
  'RECONSTRUCTION_SCHEMA',
  'RECONSTRUCTION_JSON',
  'RECONSTRUCTION_SHA256',
  'REVIEW_CONTRACT_ID',
  'LOCKED_AT'
];

var H3_WRITTEN_LEGACY_REVIEW_BINDING_HEADERS_ = [
  'LOGICAL_KEY',
  'SET_ID',
  'SOURCE_QUEUE_ROW',
  'SOURCE_MODE',
  'MATERIALIZED_AT',
  'STATUS',
  'RECONSTRUCTION_SCHEMA',
  'RECONSTRUCTION_SHA256',
  'REVIEW_CONTRACT_ID',
  'REVIEW_BINDING_SHA256',
  'LOCKED_AT'
];


function h3WrittenReviewStoredRowObject_(
  table,
  row
) {
  var out = {};
  Object.keys(table.map).forEach(
    function (key) {
      out[key] = row[table.map[key]];
    }
  );
  return out;
}


function h3WrittenReviewStoredText_(
  row,
  key
) {
  return String(
    row && row[key] || ''
  );
}


function h3WrittenReviewStoredInteger_(
  row,
  key
) {
  var value = Number(
    row && row[key]
  );
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      'WRITTEN_REVIEW_STORED_INTEGER_INVALID:' +
        key
    );
  }
  return value;
}


function h3WrittenReviewBindingHashObject_(
  binding
) {
  return {
    LOGICAL_KEY:
      binding.logicalKey,
    RECONSTRUCTION_SCHEMA:
      binding.reconstructionSchema,
    RECONSTRUCTION_SHA256:
      binding.reconstructionSha256,
    REVIEW_CONTRACT_ID:
      binding.reviewContractId,
    SET_ID:
      binding.setId,
    SOURCE_MODE:
      binding.sourceMode,
    SOURCE_QUEUE_ROW:
      binding.sourceQueueRow
  };
}


function h3WrittenReviewPersistentValidateRows_(
  payloadRow,
  bindingRow
) {
  var payloadStatus =
    h3WrittenReviewStoredText_(
      payloadRow,
      'STATUS'
    );
  var bindingStatus =
    h3WrittenReviewStoredText_(
      bindingRow,
      'STATUS'
    );

  if (
    payloadStatus !== 'LOCKED' ||
    bindingStatus !== 'LOCKED' ||
    !h3WrittenReviewStoredText_(
      payloadRow,
      'LOCKED_AT'
    ) ||
    !h3WrittenReviewStoredText_(
      bindingRow,
      'LOCKED_AT'
    )
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_NOT_LOCKED'
    );
  }

  var setId =
    h3WrittenReviewStoredText_(
      payloadRow,
      'SET_ID'
    );

  if (
    !/^H3-\d{8}-\d{2,3}$/.test(
      setId
    ) ||
    h3WrittenReviewStoredText_(
      bindingRow,
      'SET_ID'
    ) !== setId
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_SET_ID_MISMATCH'
    );
  }

  var logicalKey =
    'LEGACY_WRITTEN_REVIEW::' +
    setId;

  if (
    h3WrittenReviewStoredText_(
      payloadRow,
      'LOGICAL_KEY'
    ) !== logicalKey ||
    h3WrittenReviewStoredText_(
      bindingRow,
      'LOGICAL_KEY'
    ) !== logicalKey
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_LOGICAL_KEY_MISMATCH'
    );
  }

  var sourceQueueRow =
    h3WrittenReviewStoredInteger_(
      payloadRow,
      'SOURCE_QUEUE_ROW'
    );
  var bindingQueueRow =
    h3WrittenReviewStoredInteger_(
      bindingRow,
      'SOURCE_QUEUE_ROW'
    );

  if (
    sourceQueueRow !==
      bindingQueueRow
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_QUEUE_ROW_MISMATCH'
    );
  }

  var sourceMode =
    h3WrittenReviewStoredText_(
      payloadRow,
      'SOURCE_MODE'
    );

  if (
    H3_WRITTEN_REVIEW_SOURCE_MODES_
      .indexOf(sourceMode) < 0 ||
    h3WrittenReviewStoredText_(
      bindingRow,
      'SOURCE_MODE'
    ) !== sourceMode
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_SOURCE_MODE_MISMATCH'
    );
  }

  var reconstructionSchema =
    h3WrittenReviewStoredText_(
      payloadRow,
      'RECONSTRUCTION_SCHEMA'
    );

  if (
    reconstructionSchema !==
      H3_WRITTEN_LEGACY_REVIEW_SCHEMA_ ||
    h3WrittenReviewStoredText_(
      bindingRow,
      'RECONSTRUCTION_SCHEMA'
    ) !== reconstructionSchema
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_SCHEMA_MISMATCH'
    );
  }

  var reviewContractId =
    h3WrittenReviewStoredText_(
      payloadRow,
      'REVIEW_CONTRACT_ID'
    );

  if (
    reviewContractId !==
      H3_WRITTEN_LEGACY_REVIEW_CONTRACT_ID_ ||
    h3WrittenReviewStoredText_(
      bindingRow,
      'REVIEW_CONTRACT_ID'
    ) !== reviewContractId
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_CONTRACT_MISMATCH'
    );
  }

  var materializedAt =
    h3WrittenReviewStoredText_(
      payloadRow,
      'MATERIALIZED_AT'
    );

  if (
    !materializedAt ||
    h3WrittenReviewStoredText_(
      bindingRow,
      'MATERIALIZED_AT'
    ) !== materializedAt
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_MATERIALIZED_AT_MISMATCH'
    );
  }

  var reconstructionSha256 =
    h3WrittenReviewStoredText_(
      payloadRow,
      'RECONSTRUCTION_SHA256'
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      reconstructionSha256
    ) ||
    h3WrittenReviewStoredText_(
      bindingRow,
      'RECONSTRUCTION_SHA256'
    ) !== reconstructionSha256
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_RECONSTRUCTION_HASH_MISMATCH'
    );
  }

  var payloadKey =
    h3WrittenReviewStoredText_(
      payloadRow,
      'PAYLOAD_KEY'
    );

  if (
    payloadKey !==
      logicalKey +
      '::' +
      reconstructionSha256
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_PAYLOAD_KEY_MISMATCH'
    );
  }

  var record =
    h3ProdParseJson_(
      payloadRow.RECONSTRUCTION_JSON,
      'WRITTEN_REVIEW_RECONSTRUCTION_JSON_INVALID'
    );

  h3WrittenReviewValidateRecord_(
    record
  );

  if (
    record.schema !==
      reconstructionSchema ||
    record.set_id !== setId ||
    record.source_mode !== sourceMode ||
    Number(
      record.source_queue_row
    ) !== sourceQueueRow
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_RECORD_IDENTITY_MISMATCH'
    );
  }

  var calculatedReconstructionSha =
    h3ReviewHash_(record);

  if (
    calculatedReconstructionSha !==
      reconstructionSha256
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_RECONSTRUCTION_HASH_MISMATCH'
    );
  }

  var binding = {
    logicalKey: logicalKey,
    setId: setId,
    sourceQueueRow:
      sourceQueueRow,
    sourceMode: sourceMode,
    reconstructionSchema:
      reconstructionSchema,
    reconstructionSha256:
      reconstructionSha256,
    reviewContractId:
      reviewContractId
  };

  var calculatedBindingSha =
    h3ReviewHash_(
      h3WrittenReviewBindingHashObject_(
        binding
      )
    );
  var storedBindingSha =
    h3WrittenReviewStoredText_(
      bindingRow,
      'REVIEW_BINDING_SHA256'
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      storedBindingSha
    ) ||
    calculatedBindingSha !==
      storedBindingSha
  ) {
    throw new Error(
      'WRITTEN_REVIEW_PERSISTENCE_BINDING_HASH_MISMATCH'
    );
  }

  return {
    logicalKey: logicalKey,
    payloadKey: payloadKey,
    setId: setId,
    sourceQueueRow:
      sourceQueueRow,
    sourceMode: sourceMode,
    materializedAt:
      materializedAt,
    reconstructionSchema:
      reconstructionSchema,
    reconstructionSha256:
      reconstructionSha256,
    reviewContractId:
      reviewContractId,
    reviewBindingSha256:
      storedBindingSha,
    payloadLockedAt:
      h3WrittenReviewStoredText_(
        payloadRow,
        'LOCKED_AT'
      ),
    bindingLockedAt:
      h3WrittenReviewStoredText_(
        bindingRow,
        'LOCKED_AT'
      ),
    record: record,
    projection:
      h3WrittenReviewProjectHistorical_(
        record
      )
  };
}


function h3WrittenReviewPersistentContext_(
  spreadsheet,
  setId
) {
  var normalizedSetId =
    String(setId || '').trim();

  if (
    !/^H3-\d{8}-\d{2,3}$/.test(
      normalizedSetId
    )
  ) {
    throw new Error(
      'WRITTEN_REVIEW_SET_ID_INVALID'
    );
  }

  var payloadSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_LEGACY_REVIEW_PAYLOAD_SHEET_
    );
  var bindingSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_LEGACY_REVIEW_BINDING_SHEET_
    );

  h3ReviewRequireExactHeader_(
    payloadSheet,
    H3_WRITTEN_LEGACY_REVIEW_PAYLOAD_HEADERS_,
    'WRITTEN_REVIEW_PAYLOAD'
  );
  h3ReviewRequireExactHeader_(
    bindingSheet,
    H3_WRITTEN_LEGACY_REVIEW_BINDING_HEADERS_,
    'WRITTEN_REVIEW_BINDING'
  );

  var payloadTable =
    h3ReviewTable_(
      payloadSheet
    );
  var bindingTable =
    h3ReviewTable_(
      bindingSheet
    );

  var payloadRecord =
    h3ProdOneRowBy_(
      payloadTable,
      'SET_ID',
      normalizedSetId,
      H3_WRITTEN_LEGACY_REVIEW_PAYLOAD_SHEET_
    );
  var bindingRecord =
    h3ProdOneRowBy_(
      bindingTable,
      'SET_ID',
      normalizedSetId,
      H3_WRITTEN_LEGACY_REVIEW_BINDING_SHEET_
    );

  return h3WrittenReviewPersistentValidateRows_(
    h3WrittenReviewStoredRowObject_(
      payloadTable,
      payloadRecord.row
    ),
    h3WrittenReviewStoredRowObject_(
      bindingTable,
      bindingRecord.row
    )
  );
}


function h3WrittenReviewAnswerPosition_(
  value
) {
  return {
    '①': 1,
    '②': 2,
    '③': 3,
    '④': 4
  }[
    String(value || '')
  ] || null;
}


function h3WrittenReviewNormalizePersistent_(
  context
) {
  var projection =
    context.projection;

  return {
    schema:
      'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1',
    mode: 'REVIEW',
    kind: 'WRITTEN',
    read_only: true,
    persisted: true,
    review_contract_id:
      context.reviewContractId,
    review_binding_sha256:
      context.reviewBindingSha256,
    set_id:
      projection.set_id,
    answered_at:
      projection.answered_at,
    raw_input:
      projection.raw_input,
    score:
      projection.score,
    total:
      projection.total,
    wrong_count:
      projection.wrong_count,
    uncertainty_known:
      projection.uncertainty_known,
    uncertain_count:
      projection.uncertain_count,
    default_filter:
      'NEEDS_REVIEW',
    replay_capability:
      'unavailable',
    sections:
      projection.questions.map(
        function (question) {
          var uncertaintyKnown =
            question
              .explicit_uncertainty !==
              'UNKNOWN';

          return {
            section:
              String(
                question.section || ''
              ),
            display:
              String(
                question.section || ''
              ),
            result:
              question.mark,
            user_answer:
              question.user_answer,
            user_answer_position:
              h3WrittenReviewAnswerPosition_(
                question.user_answer
              ),
            user_answer_text:
              h3WrittenReviewHas_(
                question,
                'user_answer_text'
              )
                ? question.user_answer_text
                : null,
            correct_answer:
              question.correct_answer,
            correct_answer_position:
              h3WrittenReviewAnswerPosition_(
                question.correct_answer
              ),
            correct_answer_text:
              h3WrittenReviewHas_(
                question,
                'correct_answer_text'
              )
                ? question.correct_answer_text
                : null,
            uncertain_known:
              uncertaintyKnown,
            uncertain:
              uncertaintyKnown
                ? Boolean(
                    question
                      .explicit_uncertainty
                  )
                : null,
            question_surface: {
              rendered:
                question.question_surface,
              body:
                h3WrittenReviewHas_(
                  question,
                  'question_body'
                )
                  ? question.question_body
                  : null,
              choices:
                Array.isArray(
                  question.choices
                )
                  ? h3WrittenReviewClone_(
                      question.choices
                    )
                  : [],
              dialogue_components:
                Array.isArray(
                  question
                    .dialogue_components
                )
                  ? h3WrittenReviewClone_(
                      question
                        .dialogue_components
                    )
                  : []
            },
            script_text:
              question.question_surface,
            explanation: {
              text:
                h3WrittenReviewHas_(
                  question,
                  'explanation_text'
                )
                  ? question.explanation_text
                  : 'UNKNOWN',
              source:
                h3WrittenReviewHas_(
                  question,
                  'explanation_source'
                )
                  ? question.explanation_source
                  : 'UNKNOWN',
              key_expression:
                h3WrittenReviewHas_(
                  question,
                  'key_expression'
                )
                  ? question.key_expression
                  : 'UNKNOWN'
            },
            audio_sources:
              h3WrittenReviewHas_(
                question,
                'audio_sources'
              )
                ? h3WrittenReviewClone_(
                    question.audio_sources
                  )
                : 'UNKNOWN',
            provenance: {
              generation_log:
                h3WrittenReviewHas_(
                  question,
                  'generation_log'
                )
                  ? h3WrittenReviewClone_(
                      question.generation_log
                    )
                  : 'UNKNOWN',
              evidence:
                h3WrittenReviewHas_(
                  question,
                  'evidence'
                )
                  ? h3WrittenReviewClone_(
                      question.evidence
                    )
                  : 'UNKNOWN'
            }
          };
        }
      ),
    technical: {
      logical_key:
        context.logicalKey,
      payload_key:
        context.payloadKey,
      source_queue_row:
        context.sourceQueueRow,
      source_mode:
        context.sourceMode,
      materialized_at:
        context.materializedAt,
      reconstruction_schema:
        context.reconstructionSchema,
      reconstruction_sha256:
        context.reconstructionSha256,
      review_binding_sha256:
        context.reviewBindingSha256,
      payload_locked_at:
        context.payloadLockedAt,
      binding_locked_at:
        context.bindingLockedAt
    }
  };
}


function buildWrittenPersistentReviewPayload_(
  setId
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  return h3WrittenReviewNormalizePersistent_(
    h3WrittenReviewPersistentContext_(
      spreadsheet,
      setId
    )
  );
}


function validateWrittenPersistentReviewBinding_(
  setId
) {
  var payload =
    buildWrittenPersistentReviewPayload_(
      setId
    );

  return {
    schema:
      'H3_WRITTEN_REVIEW_PERSISTENCE_GATE_V1',
    status: 'PASS',
    read_only: true,
    provider_active: true,
    set_id:
      payload.set_id,
    review_binding_sha256:
      payload.review_binding_sha256,
    section_count:
      payload.sections.length
  };
}



function h3WrittenReviewPersistentHistoryEntries_(
  spreadsheet
) {
  var bindingSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_LEGACY_REVIEW_BINDING_SHEET_
    );

  h3ReviewRequireExactHeader_(
    bindingSheet,
    H3_WRITTEN_LEGACY_REVIEW_BINDING_HEADERS_,
    'WRITTEN_REVIEW_BINDING'
  );

  var table =
    h3ReviewTable_(
      bindingSheet
    );
  var seen = {};
  var entries = [];

  table.rows.forEach(
    function (row) {
      var setId = String(
        row[
          table.map.SET_ID
        ] || ''
      );

      if (!setId) {
        return;
      }

      if (seen[setId]) {
        throw new Error(
          'WRITTEN_REVIEW_HISTORY_DUPLICATE_SET_ID:' +
            setId
        );
      }
      seen[setId] = true;

      var context =
        h3WrittenReviewPersistentContext_(
          spreadsheet,
          setId
        );
      var payload =
        h3WrittenReviewNormalizePersistent_(
          context
        );

      entries.push({
        review_kind: 'WRITTEN',
        set_id:
          payload.set_id,
        answered_at:
          payload.answered_at,
        score:
          payload.score,
        total:
          payload.total,
        wrong_count:
          payload.wrong_count,
        uncertainty_known:
          payload.uncertainty_known,
        uncertain_count:
          payload.uncertain_count,
        needs_review:
          payload.sections.some(
            function (part) {
              return (
                part.result !== '○'
              );
            }
          ),
        replay_capability:
          'unavailable',
        source_mode:
          context.sourceMode,
        review_open_validation:
          'FULL_SOURCE_LOCK_ON_OPEN'
      });
    }
  );

  entries.sort(function (a, b) {
    var at =
      String(a.answered_at || '');
    var bt =
      String(b.answered_at || '');

    if (at !== bt) {
      return at < bt ? 1 : -1;
    }

    return (
      String(b.set_id || '') <
      String(a.set_id || '')
        ? -1
        : 1
    );
  });

  return entries.slice(0, 50);
}


function h3WrittenReviewValidateRequest_(
  request
) {
  if (
    !request ||
    request.schema !==
      'H3_WEB_RENDER_REQUEST_V1' ||
    request.mode !== 'REVIEW' ||
    request.review_kind !== 'WRITTEN' ||
    !request.set_id ||
    request.txn_id ||
    request.legacy_review_id
  ) {
    throw new Error(
      'INVALID_WRITTEN_REVIEW_REQUEST'
    );
  }

  var setId = String(
    request.set_id
  );

  if (
    setId.length > 128 ||
    !/^H3-\d{8}-\d{2,3}$/.test(
      setId
    )
  ) {
    throw new Error(
      'INVALID_WRITTEN_REVIEW_SET_ID'
    );
  }

  return setId;
}


function getWrittenPersistentReviewPayload_(
  request
) {
  var setId =
    h3WrittenReviewValidateRequest_(
      request
    );
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  if (
    h3WrittenProductionReviewHasSet_(
      spreadsheet,
      setId
    )
  ) {
    var productionContext =
      h3WrittenProductionReviewContextBySet_(
        spreadsheet,
        setId
      );
    return h3WrittenReviewApplyAnsweredAtBackfill_(
      spreadsheet,
      h3WrittenReviewApplyExplanationOverlay_(
        spreadsheet,
        productionContext.payload,
        'WRITTEN_PRODUCTION_WEB',
        productionContext.reviewSha256
      )
    );
  }

  var legacyContext =
    h3WrittenReviewPersistentContext_(
      spreadsheet,
      setId
    );
  return h3WrittenReviewApplyAnsweredAtBackfill_(
    spreadsheet,
    h3WrittenReviewApplyExplanationOverlay_(
      spreadsheet,
      h3WrittenReviewNormalizePersistent_(
        legacyContext
      ),
      legacyContext.sourceMode,
      legacyContext.reconstructionSha256
    )
  );
}


function getWrittenPersistentReviewPayloadWithAudio_(
  request
) {
  var payload =
    getWrittenPersistentReviewPayload_(
      request
    );
  var bindingPayload =
    JSON.parse(
      JSON.stringify(payload)
    );
  bindingPayload.surface_family =
    '5W';

  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var bindings =
    h3ReviewAudioBindingResolveAll_(
      spreadsheet,
      bindingPayload
    );

  return h3ReviewAudioApply5WBindings_(
    payload,
    bindings
  );
}


function getWrittenPersistentReviewMediaPayload_(
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
    JSON.parse(
      JSON.stringify(review)
    );
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


function validateWrittenPersistentReviewBackfill_() {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var bindingSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_LEGACY_REVIEW_BINDING_SHEET_
    );

  h3ReviewRequireExactHeader_(
    bindingSheet,
    H3_WRITTEN_LEGACY_REVIEW_BINDING_HEADERS_,
    'WRITTEN_REVIEW_BINDING'
  );

  var bindingTable =
    h3ReviewTable_(
      bindingSheet
    );
  var seen = {};
  var results = [];

  bindingTable.rows.forEach(
    function (row) {
      var setId = String(
        row[
          bindingTable.map.SET_ID
        ] || ''
      );

      if (!setId) {
        return;
      }

      if (seen[setId]) {
        throw new Error(
          'WRITTEN_REVIEW_BACKFILL_DUPLICATE_SET_ID:' +
            setId
        );
      }
      seen[setId] = true;

      var payload =
        h3WrittenReviewNormalizePersistent_(
          h3WrittenReviewPersistentContext_(
            spreadsheet,
            setId
          )
        );

      results.push({
        set_id:
          payload.set_id,
        review_binding_sha256:
          payload.review_binding_sha256,
        section_count:
          payload.sections.length
      });
    }
  );

  return {
    schema:
      'H3_WRITTEN_REVIEW_BACKFILL_GATE_V1',
    status: 'PASS',
    read_only: true,
    provider_active: true,
    set_count:
      results.length,
    sets: results
  };
}

/* =========================================================
 * Production Written persistent Review
 * =======================================================*/

var H3_WRITTEN_PRODUCTION_REVIEW_PAYLOAD_SHEET_ =
  'written_review_payload_v1';

var H3_WRITTEN_PRODUCTION_REVIEW_BINDING_SHEET_ =
  'written_review_binding_v1';

var H3_WRITTEN_PRODUCTION_REVIEW_CONTRACT_ID_ =
  'H3-WRITTEN-PRODUCTION-REVIEW-CONTRACT-20260920-V1';

var H3_WRITTEN_PRODUCTION_REVIEW_SCHEMA_ =
  'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1';

var H3_WRITTEN_PRODUCTION_REVIEW_PAYLOAD_HEADERS_ = [
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

var H3_WRITTEN_PRODUCTION_REVIEW_BINDING_HEADERS_ = [
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


function h3WrittenProductionReviewRowsBy_(
  table,
  column,
  value
) {
  var out = [];
  var col = table.map[column];

  if (typeof col !== 'number') {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_COLUMN_MISSING:' +
        column
    );
  }

  table.rows.forEach(function (row, index) {
    if (
      String(row[col] || '') ===
      String(value || '')
    ) {
      out.push({
        rowNumber: index + 2,
        row: row
      });
    }
  });

  return out;
}


function h3WrittenProductionReviewRequireSheets_(
  spreadsheet
) {
  var payloadSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_PRODUCTION_REVIEW_PAYLOAD_SHEET_
    );
  var bindingSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_PRODUCTION_REVIEW_BINDING_SHEET_
    );

  h3ReviewRequireExactHeader_(
    payloadSheet,
    H3_WRITTEN_PRODUCTION_REVIEW_PAYLOAD_HEADERS_,
    'WRITTEN_PRODUCTION_REVIEW_PAYLOAD'
  );
  h3ReviewRequireExactHeader_(
    bindingSheet,
    H3_WRITTEN_PRODUCTION_REVIEW_BINDING_HEADERS_,
    'WRITTEN_PRODUCTION_REVIEW_BINDING'
  );

  return {
    payloadSheet: payloadSheet,
    bindingSheet: bindingSheet,
    payloadTable:
      h3ReviewTable_(payloadSheet),
    bindingTable:
      h3ReviewTable_(bindingSheet)
  };
}


function h3WrittenProductionReviewTxnContext_(
  spreadsheet,
  txnId
) {
  var journal =
    h3WrittenRequireJournal_(
      spreadsheet
    );
  var table =
    h3ReviewTable_(journal);
  var txnRows =
    h3WrittenProductionReviewRowsBy_(
      table,
      'TXN_ID',
      txnId
    );

  if (txnRows.length !== 1) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_TXN_AUTHORITY_COUNT:' +
        txnRows.length
    );
  }

  var row =
    txnRows[0].row;
  var map =
    table.map;

  if (
    String(row[map.MODE] || '') !==
      'WRITTEN' ||
    String(row[map.STATUS] || '') !==
      'COMMITTED'
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_TXN_NOT_COMMITTED'
    );
  }

  var setId =
    String(row[map.SET_ID] || '');
  var stageId =
    String(row[map.STAGE_ID] || '');
  var sourceBindingSha =
    String(
      row[
        map.SOURCE_BINDING_SHA256
      ] || ''
    );
  var result =
    h3WrittenParseJson_(
      row[map.RESULT_JSON],
      'WRITTEN_PRODUCTION_REVIEW_RESULT_JSON_INVALID'
    );

  if (
    result.schema !==
      'H3_WEB_SUBMIT_RESULT_V1' ||
    result.mode !== 'WRITTEN' ||
    result.status !== 'COMMITTED' ||
    result.txn_id !== String(txnId) ||
    result.set_id !== setId ||
    result.stage_id !== stageId ||
    result.source_binding_sha256 !==
      sourceBindingSha ||
    !Array.isArray(result.summary) ||
    result.summary.length !== 5
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_RESULT_IDENTITY_MISMATCH'
    );
  }

  var syncSheet =
    spreadsheet.getSheetByName(
      H3_WRITTEN_ANSWER_SYNC_SHEET
    );
  h3ReviewRequireExactHeader_(
    syncSheet,
    H3_WRITTEN_ANSWER_SYNC_HEADERS,
    'WRITTEN_PRODUCTION_REVIEW_ANSWER_SYNC'
  );
  var syncTable =
    h3ReviewTable_(syncSheet);
  var syncRows =
    h3WrittenProductionReviewRowsBy_(
      syncTable,
      'TXN_ID',
      txnId
    );

  if (syncRows.length !== 1) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_SYNC_AUTHORITY_COUNT:' +
        syncRows.length
    );
  }

  var syncRow =
    syncRows[0].row;
  var syncMap =
    syncTable.map;

  if (
    String(syncRow[syncMap.SET_ID] || '') !==
      setId ||
    String(syncRow[syncMap.STAGE_ID] || '') !==
      stageId ||
    String(syncRow[syncMap.STATUS] || '') !==
      'COMMITTED' ||
    String(syncRow[syncMap.PHASE] || '') !==
      'CORE_COMPLETE'
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_SYNC_NOT_COMPLETE'
    );
  }

  return {
    txnId: String(txnId),
    setId: setId,
    stageId: stageId,
    sourceBindingSha256:
      sourceBindingSha,
    result: result,
    resultSha256:
      h3ReviewHash_(result),
    committedAt:
      String(row[map.COMMITTED_AT] || '')
  };
}


function h3WrittenProductionReviewQuestionMeta_(
  context
) {
  var meta =
    h3WrittenParseJson_(
      context.questionMetaJson,
      'WRITTEN_PRODUCTION_REVIEW_META_INVALID'
    );

  if (
    !meta ||
    meta.stage_id !==
      context.stageId ||
    !Array.isArray(meta.questions) ||
    meta.questions.length !== 5
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_META_SHAPE_INVALID'
    );
  }

  return meta;
}


function h3WrittenProductionReviewQuestionSurface_(
  question,
  index
) {
  var choices =
    (question.choices || []).map(
      function (text, choiceIndex) {
        return {
          position: choiceIndex + 1,
          symbol:
            ['①', '②', '③', '④'][
              choiceIndex
            ],
          text: String(text || '')
        };
      }
    );

  return {
    rendered:
      'Q' +
      String(index + 1) +
      ' [' +
      String(
        H3_WRITTEN_DISPLAY[
          H3_WEB_WRITTEN_SECTIONS[index]
        ] || ''
      ) +
      ']\n' +
      String(question.question || '') +
      '\n' +
      choices.map(
        function (choice) {
          return (
            choice.symbol +
            ' ' +
            choice.text
          );
        }
      ).join('\n'),
    body:
      String(question.question || ''),
    choices:
      choices,
    dialogue_components:
      String(question.question || '')
        .split('\n')
        .filter(function (line) {
          return /^[AB]：/.test(line);
        })
  };
}


function h3WrittenProductionReviewBuildPayload_(
  txn,
  context
) {
  var authoring =
    h3WrittenReviewAuthoring_(
      context
    );
  var meta =
    h3WrittenProductionReviewQuestionMeta_(
      context
    );

  var wrongCount = 0;
  var uncertainCount = 0;

  var sections =
    txn.result.summary.map(
      function (item, index) {
        var question =
          meta.questions[index];
        var userPosition =
          Number(item.answer);
        var correctPosition =
          Number(item.correct_answer);

        if (item.mark === '×') {
          wrongCount += 1;
        }
        if (item.uncertain) {
          uncertainCount += 1;
        }

        return {
          section:
            H3_WEB_WRITTEN_SECTIONS[index],
          display:
            H3_WRITTEN_DISPLAY[
              H3_WEB_WRITTEN_SECTIONS[index]
            ],
          result:
            item.mark,
          user_answer:
            userPosition,
          user_answer_position:
            userPosition,
          user_answer_text:
            String(
              question.choices[
                userPosition - 1
              ] || ''
            ),
          correct_answer:
            correctPosition,
          correct_answer_position:
            correctPosition,
          correct_answer_text:
            String(
              question.choices[
                correctPosition - 1
              ] || ''
            ),
          uncertain_known: true,
          uncertain:
            Boolean(item.uncertain),
          question_surface:
            h3WrittenProductionReviewQuestionSurface_(
              question,
              index
            ),
          script_text:
            h3WrittenReviewScriptForQuestion_(
              context,
              index
            ),
          explanation:
            h3WrittenReviewClone_(
              authoring[index]
            ),
          audio_asset_key: null,
          audio_fallback_url: null
        };
      }
    );

  return {
    schema:
      H3_WRITTEN_PRODUCTION_REVIEW_SCHEMA_,
    mode: 'REVIEW',
    kind: 'WRITTEN',
    read_only: true,
    persisted: true,
    review_contract_id:
      H3_WRITTEN_PRODUCTION_REVIEW_CONTRACT_ID_,
    review_binding_sha256: '',
    txn_id:
      txn.txnId,
    set_id:
      txn.setId,
    stage_id:
      txn.stageId,
    answered_at:
      txn.committedAt,
    raw_input:
      txn.result.summary.map(
        function (item) {
          return (
            String(item.answer) +
            (
              item.uncertain
                ? '?'
                : ''
            )
          );
        }
      ).join(' '),
    score:
      Number(txn.result.score),
    total:
      Number(txn.result.total),
    wrong_count:
      wrongCount,
    uncertainty_known: true,
    uncertain_count:
      uncertainCount,
    default_filter:
      'NEEDS_REVIEW',
    replay_capability:
      'unavailable',
    source_binding_sha256:
      txn.sourceBindingSha256,
    authoring_mode:
      'ISSUE_LOCKED_META',
    sections:
      sections,
    technical: {
      receipt:
        txn.result.receipt
    }
  };
}


function h3WrittenProductionReviewBindingHashObject_(
  txn,
  reviewSha
) {
  return {
    RESULT_SHA256:
      txn.resultSha256,
    REVIEW_CONTRACT_ID:
      H3_WRITTEN_PRODUCTION_REVIEW_CONTRACT_ID_,
    REVIEW_SHA256:
      reviewSha,
    SET_ID:
      txn.setId,
    SOURCE_BINDING_SHA256:
      txn.sourceBindingSha256,
    STAGE_ID:
      txn.stageId,
    TXN_ID:
      txn.txnId
  };
}


function h3WrittenProductionReviewValidatePayloadShape_(
  payload,
  txn
) {
  if (
    !payload ||
    payload.schema !==
      H3_WRITTEN_PRODUCTION_REVIEW_SCHEMA_ ||
    payload.mode !== 'REVIEW' ||
    payload.kind !== 'WRITTEN' ||
    payload.read_only !== true ||
    payload.persisted !== true ||
    payload.review_contract_id !==
      H3_WRITTEN_PRODUCTION_REVIEW_CONTRACT_ID_ ||
    payload.txn_id !== txn.txnId ||
    payload.set_id !== txn.setId ||
    payload.stage_id !== txn.stageId ||
    payload.source_binding_sha256 !==
      txn.sourceBindingSha256 ||
    Number(payload.score) !==
      Number(txn.result.score) ||
    Number(payload.total) !== 5 ||
    !Array.isArray(payload.sections) ||
    payload.sections.length !== 5
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_PAYLOAD_IDENTITY_MISMATCH'
    );
  }

  payload.sections.forEach(
    function (part, index) {
      if (
        !part ||
        part.section !==
          H3_WEB_WRITTEN_SECTIONS[index] ||
        ['○', '△', '×']
          .indexOf(part.result) < 0 ||
        !String(part.script_text || '') ||
        !part.explanation ||
        typeof part.explanation !==
          'object'
      ) {
        throw new Error(
          'WRITTEN_PRODUCTION_REVIEW_SECTION_INVALID:Q' +
            String(index + 1)
        );
      }
    }
  );
}


function h3WrittenProductionReviewContextBySet_(
  spreadsheet,
  setId
) {
  var sheets =
    h3WrittenProductionReviewRequireSheets_(
      spreadsheet
    );
  var payloadRows =
    h3WrittenProductionReviewRowsBy_(
      sheets.payloadTable,
      'SET_ID',
      setId
    );
  var bindingRows =
    h3WrittenProductionReviewRowsBy_(
      sheets.bindingTable,
      'SET_ID',
      setId
    );

  if (
    payloadRows.length !== 1 ||
    bindingRows.length !== 1
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_AUTHORITY_COUNT:' +
        payloadRows.length +
        ':' +
        bindingRows.length
    );
  }

  var pr =
    h3WrittenReviewStoredRowObject_(
      sheets.payloadTable,
      payloadRows[0].row
    );
  var br =
    h3WrittenReviewStoredRowObject_(
      sheets.bindingTable,
      bindingRows[0].row
    );

  if (
    h3WrittenReviewStoredText_(
      pr,
      'STATUS'
    ) !== 'LOCKED' ||
    h3WrittenReviewStoredText_(
      br,
      'STATUS'
    ) !== 'LOCKED' ||
    !h3WrittenReviewStoredText_(
      pr,
      'LOCKED_AT'
    ) ||
    !h3WrittenReviewStoredText_(
      br,
      'LOCKED_AT'
    )
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_NOT_LOCKED'
    );
  }

  var txnId =
    h3WrittenReviewStoredText_(
      pr,
      'TXN_ID'
    );

  if (
    !txnId ||
    h3WrittenReviewStoredText_(
      br,
      'TXN_ID'
    ) !== txnId
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_TXN_MISMATCH'
    );
  }

  var txn =
    h3WrittenProductionReviewTxnContext_(
      spreadsheet,
      txnId
    );

  [
    'SET_ID',
    'STAGE_ID',
    'MATERIALIZED_AT',
    'RESULT_SHA256',
    'SOURCE_BINDING_SHA256',
    'REVIEW_SHA256',
    'REVIEW_CONTRACT_ID'
  ].forEach(function (field) {
    if (
      h3WrittenReviewStoredText_(
        pr,
        field
      ) !==
      h3WrittenReviewStoredText_(
        br,
        field
      )
    ) {
      throw new Error(
        'WRITTEN_PRODUCTION_REVIEW_BINDING_FIELD_MISMATCH:' +
          field
      );
    }
  });

  if (
    h3WrittenReviewStoredText_(
      pr,
      'SET_ID'
    ) !== txn.setId ||
    h3WrittenReviewStoredText_(
      pr,
      'STAGE_ID'
    ) !== txn.stageId ||
    h3WrittenReviewStoredText_(
      pr,
      'RESULT_SHA256'
    ) !== txn.resultSha256 ||
    h3WrittenReviewStoredText_(
      pr,
      'SOURCE_BINDING_SHA256'
    ) !== txn.sourceBindingSha256 ||
    h3WrittenReviewStoredText_(
      pr,
      'REVIEW_SCHEMA'
    ) !==
      H3_WRITTEN_PRODUCTION_REVIEW_SCHEMA_ ||
    h3WrittenReviewStoredText_(
      pr,
      'REVIEW_CONTRACT_ID'
    ) !==
      H3_WRITTEN_PRODUCTION_REVIEW_CONTRACT_ID_
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_STORED_IDENTITY_MISMATCH'
    );
  }

  var review =
    h3WrittenParseJson_(
      pr.REVIEW_JSON,
      'WRITTEN_PRODUCTION_REVIEW_JSON_INVALID'
    );
  h3WrittenProductionReviewValidatePayloadShape_(
    review,
    txn
  );

  var reviewSha =
    h3ReviewHash_(review);

  if (
    reviewSha !==
      h3WrittenReviewStoredText_(
        pr,
        'REVIEW_SHA256'
      )
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_HASH_MISMATCH'
    );
  }

  var sourceContext =
    h3WrittenValidateSourceIdentity_(
      h3WrittenReadContext_(
        spreadsheet,
        txn.setId
      )
    );
  var sourceBinding =
    h3WrittenSourceBinding_(
      sourceContext
    );

  if (
    sourceBinding.sha256 !==
      txn.sourceBindingSha256
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_SOURCE_DRIFT'
    );
  }

  var bindingSha =
    h3ReviewHash_(
      h3WrittenProductionReviewBindingHashObject_(
        txn,
        reviewSha
      )
    );

  if (
    bindingSha !==
      h3WrittenReviewStoredText_(
        br,
        'REVIEW_BINDING_SHA256'
      )
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_BINDING_HASH_MISMATCH'
    );
  }

  if (
    review.review_binding_sha256 &&
    review.review_binding_sha256 !==
      bindingSha
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_PAYLOAD_BINDING_MISMATCH'
    );
  }

  review.review_binding_sha256 =
    bindingSha;

  return {
    txn: txn,
    payload: review,
    reviewSha256:
      reviewSha,
    reviewBindingSha256:
      bindingSha,
    payloadRowNumber:
      payloadRows[0].rowNumber,
    bindingRowNumber:
      bindingRows[0].rowNumber
  };
}


function h3WrittenProductionReviewHasSet_(
  spreadsheet,
  setId
) {
  var sheets =
    h3WrittenProductionReviewRequireSheets_(
      spreadsheet
    );
  var payloadRows =
    h3WrittenProductionReviewRowsBy_(
      sheets.payloadTable,
      'SET_ID',
      setId
    );
  var bindingRows =
    h3WrittenProductionReviewRowsBy_(
      sheets.bindingTable,
      'SET_ID',
      setId
    );

  if (
    payloadRows.length > 1 ||
    bindingRows.length > 1
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_DUPLICATE_SET'
    );
  }

  return (
    payloadRows.length === 1 ||
    bindingRows.length === 1
  );
}


function h3WrittenProductionReviewEnsure_(
  txnId
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
  var txn =
    h3WrittenProductionReviewTxnContext_(
      spreadsheet,
      txnId
    );
  var sourceContext =
    h3WrittenValidateSourceIdentity_(
      h3WrittenReadContext_(
        spreadsheet,
        txn.setId
      )
    );
  var sourceBinding =
    h3WrittenSourceBinding_(
      sourceContext
    );

  if (
    sourceBinding.sha256 !==
      txn.sourceBindingSha256
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_SOURCE_BINDING_MISMATCH'
    );
  }

  var expected =
    h3WrittenProductionReviewBuildPayload_(
      txn,
      sourceContext
    );
  var expectedSha =
    h3ReviewHash_(expected);
  var bindingSha =
    h3ReviewHash_(
      h3WrittenProductionReviewBindingHashObject_(
        txn,
        expectedSha
      )
    );

  var sheets =
    h3WrittenProductionReviewRequireSheets_(
      spreadsheet
    );
  var payloadRows =
    h3WrittenProductionReviewRowsBy_(
      sheets.payloadTable,
      'TXN_ID',
      txn.txnId
    );
  var bindingRows =
    h3WrittenProductionReviewRowsBy_(
      sheets.bindingTable,
      'TXN_ID',
      txn.txnId
    );

  if (
    payloadRows.length > 1 ||
    bindingRows.length > 1
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_DUPLICATE_TXN'
    );
  }

  if (
    payloadRows.length === 0 &&
    bindingRows.length === 1
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_RECOVERY_REQUIRED_BINDING_ONLY'
    );
  }

  var now =
    h3NowTokyo_();

  if (payloadRows.length === 0) {
    sheets.payloadSheet.appendRow([
      txn.txnId,
      txn.setId,
      txn.stageId,
      now,
      'PREPARED',
      H3_WRITTEN_PRODUCTION_REVIEW_SCHEMA_,
      JSON.stringify(expected),
      expectedSha,
      txn.sourceBindingSha256,
      txn.resultSha256,
      H3_WRITTEN_PRODUCTION_REVIEW_CONTRACT_ID_,
      ''
    ]);
    SpreadsheetApp.flush();

    sheets =
      h3WrittenProductionReviewRequireSheets_(
        spreadsheet
      );
    payloadRows =
      h3WrittenProductionReviewRowsBy_(
        sheets.payloadTable,
        'TXN_ID',
        txn.txnId
      );
  }

  if (payloadRows.length !== 1) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_PAYLOAD_PREPARE_FAILED'
    );
  }

  var prepared =
    h3WrittenReviewStoredRowObject_(
      sheets.payloadTable,
      payloadRows[0].row
    );
  var materializedAt =
    h3WrittenReviewStoredText_(
      prepared,
      'MATERIALIZED_AT'
    );

  if (!materializedAt) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_MATERIALIZED_AT_MISSING'
    );
  }

  if (
    h3WrittenReviewStoredText_(
      prepared,
      'SET_ID'
    ) !== txn.setId ||
    h3WrittenReviewStoredText_(
      prepared,
      'STAGE_ID'
    ) !== txn.stageId ||
    h3WrittenReviewStoredText_(
      prepared,
      'REVIEW_SHA256'
    ) !== expectedSha ||
    h3WrittenReviewStoredText_(
      prepared,
      'RESULT_SHA256'
    ) !== txn.resultSha256 ||
    h3WrittenReviewStoredText_(
      prepared,
      'SOURCE_BINDING_SHA256'
    ) !== txn.sourceBindingSha256 ||
    ['PREPARED', 'LOCKED'].indexOf(
      h3WrittenReviewStoredText_(
        prepared,
        'STATUS'
      )
    ) < 0
  ) {
    throw new Error(
      'WRITTEN_PRODUCTION_REVIEW_PREPARED_IDENTITY_MISMATCH'
    );
  }

  if (bindingRows.length === 1) {
    var existingBinding =
      h3WrittenReviewStoredRowObject_(
        sheets.bindingTable,
        bindingRows[0].row
      );

    if (
      h3WrittenReviewStoredText_(
        existingBinding,
        'STATUS'
      ) !== 'LOCKED' ||
      h3WrittenReviewStoredText_(
        existingBinding,
        'SET_ID'
      ) !== txn.setId ||
      h3WrittenReviewStoredText_(
        existingBinding,
        'STAGE_ID'
      ) !== txn.stageId ||
      h3WrittenReviewStoredText_(
        existingBinding,
        'RESULT_SHA256'
      ) !== txn.resultSha256 ||
      h3WrittenReviewStoredText_(
        existingBinding,
        'SOURCE_BINDING_SHA256'
      ) !== txn.sourceBindingSha256 ||
      h3WrittenReviewStoredText_(
        existingBinding,
        'REVIEW_SHA256'
      ) !== expectedSha ||
      h3WrittenReviewStoredText_(
        existingBinding,
        'REVIEW_BINDING_SHA256'
      ) !== bindingSha
    ) {
      throw new Error(
        'WRITTEN_PRODUCTION_REVIEW_EXISTING_BINDING_MISMATCH'
      );
    }
  }

  if (
    h3WrittenReviewStoredText_(
      prepared,
      'STATUS'
    ) === 'LOCKED' &&
    bindingRows.length === 1
  ) {
    return h3WrittenProductionReviewContextBySet_(
      spreadsheet,
      txn.setId
    ).payload;
  }

  if (bindingRows.length === 0) {
    sheets.bindingSheet.appendRow([
      txn.txnId,
      txn.setId,
      txn.stageId,
      materializedAt,
      'LOCKED',
      txn.resultSha256,
      txn.sourceBindingSha256,
      expectedSha,
      H3_WRITTEN_PRODUCTION_REVIEW_CONTRACT_ID_,
      bindingSha,
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

  return h3WrittenProductionReviewContextBySet_(
    spreadsheet,
    txn.setId
  ).payload;
}


function h3WrittenProductionReviewHistoryEntries_(
  spreadsheet
) {
  var sheets =
    h3WrittenProductionReviewRequireSheets_(
      spreadsheet
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
      var status =
        String(
          row[
            sheets.bindingTable.map.STATUS
          ] || ''
        );

      if (!setId) {
        return;
      }
      if (status !== 'LOCKED') {
        throw new Error(
          'WRITTEN_PRODUCTION_REVIEW_HISTORY_NOT_LOCKED:' +
            setId
        );
      }
      if (seen[setId]) {
        throw new Error(
          'WRITTEN_PRODUCTION_REVIEW_HISTORY_DUPLICATE_SET:' +
            setId
        );
      }
      seen[setId] = true;

      var payloadRows =
        h3WrittenProductionReviewRowsBy_(
          sheets.payloadTable,
          'SET_ID',
          setId
        );

      if (payloadRows.length !== 1) {
        throw new Error(
          'WRITTEN_PRODUCTION_REVIEW_HISTORY_PAYLOAD_COUNT:' +
            setId +
            ':' +
            payloadRows.length
        );
      }

      var pr =
        h3WrittenReviewStoredRowObject_(
          sheets.payloadTable,
          payloadRows[0].row
        );
      var br =
        h3WrittenReviewStoredRowObject_(
          sheets.bindingTable,
          row
        );

      if (
        h3WrittenReviewStoredText_(
          pr,
          'STATUS'
        ) !== 'LOCKED' ||
        h3WrittenReviewStoredText_(
          pr,
          'TXN_ID'
        ) !==
          h3WrittenReviewStoredText_(
            br,
            'TXN_ID'
          ) ||
        h3WrittenReviewStoredText_(
          pr,
          'REVIEW_SHA256'
        ) !==
          h3WrittenReviewStoredText_(
            br,
            'REVIEW_SHA256'
          ) ||
        h3WrittenReviewStoredText_(
          pr,
          'REVIEW_CONTRACT_ID'
        ) !==
          H3_WRITTEN_PRODUCTION_REVIEW_CONTRACT_ID_
      ) {
        throw new Error(
          'WRITTEN_PRODUCTION_REVIEW_HISTORY_IDENTITY_MISMATCH:' +
            setId
        );
      }

      var payload =
        h3WrittenParseJson_(
          pr.REVIEW_JSON,
          'WRITTEN_PRODUCTION_REVIEW_HISTORY_JSON_INVALID'
        );
      var reviewSha =
        h3ReviewHash_(payload);

      if (
        reviewSha !==
          h3WrittenReviewStoredText_(
            pr,
            'REVIEW_SHA256'
          ) ||
        payload.schema !==
          H3_WRITTEN_PRODUCTION_REVIEW_SCHEMA_ ||
        payload.kind !== 'WRITTEN' ||
        payload.set_id !== setId ||
        !Array.isArray(payload.sections) ||
        payload.sections.length !== 5
      ) {
        throw new Error(
          'WRITTEN_PRODUCTION_REVIEW_HISTORY_HASH_MISMATCH:' +
            setId
        );
      }

      entries.push({
        review_kind: 'WRITTEN',
        set_id:
          payload.set_id,
        answered_at:
          payload.answered_at,
        score:
          payload.score,
        total:
          payload.total,
        wrong_count:
          payload.wrong_count,
        uncertainty_known:
          true,
        uncertain_count:
          payload.uncertain_count,
        needs_review:
          payload.sections.some(
            function (part) {
              return (
                part.result !== '○'
              );
            }
          ),
        replay_capability:
          'unavailable',
        source_mode:
          'WRITTEN_PRODUCTION_WEB',
        review_open_validation:
          'FULL_SOURCE_LOCK_ON_OPEN'
      });
    }
  );

  return entries;
}

function h3WrittenReviewAllHistoryEntries_(
  spreadsheet
) {
  var legacy =
    h3WrittenReviewPersistentHistoryEntries_(
      spreadsheet
    );
  var production =
    h3WrittenProductionReviewHistoryEntries_(
      spreadsheet
    );
  var seen = {};

  return legacy
    .concat(production)
    .map(function (entry) {
      if (seen[entry.set_id]) {
        throw new Error(
          'WRITTEN_REVIEW_HISTORY_CROSS_SOURCE_DUPLICATE:' +
            entry.set_id
        );
      }
      seen[entry.set_id] = true;
      return entry;
    })
    .sort(function (a, b) {
      var at =
        String(a.answered_at || '');
      var bt =
        String(b.answered_at || '');
      if (at !== bt) {
        return at < bt ? 1 : -1;
      }
      return (
        String(b.set_id || '') <
        String(a.set_id || '')
          ? -1
          : 1
      );
    })
    .slice(0, 50);
}


function getWrittenProductionPersistentReviewPayload_(
  setId
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  var productionContext =
    h3WrittenProductionReviewContextBySet_(
      spreadsheet,
      setId
    );

  return h3WrittenReviewApplyExplanationOverlay_(
    spreadsheet,
    productionContext.payload,
    'WRITTEN_PRODUCTION_WEB',
    productionContext.reviewSha256
  );
}

/* =========================================================
 * HOME lightweight index persistence
 * =======================================================*/

function h3ReviewHomeIndexNextSetNo_(
  table,
  kind,
  surfaceFamily
) {
  var maxSetNo = 0;
  var normalizedFamily =
    String(surfaceFamily || '');
  var hasFamilyColumn =
    Object.prototype
      .hasOwnProperty.call(
        table.map,
        'SURFACE_FAMILY'
      );

  if (
    normalizedFamily &&
    !hasFamilyColumn
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_SURFACE_FAMILY_COLUMN_MISSING'
    );
  }

  table.rows.forEach(
    function (row) {
      if (
        String(
          row[table.map.KIND] || ''
        ) !== kind ||
        String(
          row[table.map.STATUS] || ''
        ) !== 'ACTIVE'
      ) {
        return;
      }

      if (
        normalizedFamily &&
        String(
          row[
            table.map.SURFACE_FAMILY
          ] || ''
        ) !== normalizedFamily
      ) {
        return;
      }

      maxSetNo =
        Math.max(
          maxSetNo,
          Number(
            row[
              table.map.SET_NO
            ] || 0
          )
        );
    }
  );

  return maxSetNo + 1;
}


function h3ReviewHomeIndexFind_(
  table,
  kind,
  setId
) {
  var matches = [];

  table.rows.forEach(
    function (row, index) {
      if (
        String(
          row[table.map.KIND] || ''
        ) === kind &&
        String(
          row[table.map.SET_ID] || ''
        ) === setId
      ) {
        matches.push({
          rowNumber: index + 2,
          row: row
        });
      }
    }
  );

  if (matches.length > 1) {
    throw new Error(
      'REVIEW_HOME_INDEX_SET_DUPLICATE:' +
        kind +
        ':' +
        setId
    );
  }

  return matches.length
    ? matches[0]
    : null;
}


function h3ReviewHomeIndexRawRow_(
  entry,
  table
) {
  if (
    !table ||
    !Array.isArray(table.header)
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_TABLE_REQUIRED'
    );
  }

  var values = {
    KIND:
      entry.kind,
    SET_ID:
      entry.set_id,
    SET_NO:
      entry.set_no,
    ANSWERED_AT:
      entry.answered_at,
    SCORE:
      entry.score,
    TOTAL:
      entry.total,
    WRONG_COUNT:
      entry.wrong_count,
    UNCERTAINTY_KNOWN:
      entry.uncertainty_known
        ? 'TRUE'
        : 'FALSE',
    UNCERTAIN_COUNT:
      entry.uncertainty_known
        ? entry.uncertain_count
        : '',
    BASE_PRIORITY:
      Number(
        entry.base_priority || 0
      ),
    REVIEW_SOURCE_ID:
      entry.review_source_id,
    SOURCE_MODE:
      entry.source_mode,
    STATUS:
      'ACTIVE',
    SURFACE_FAMILY:
      entry.surface_family,
    LEVEL:
      entry.level,
    LAST_REVIEWED_AT:
      String(
        entry.last_reviewed_at || ''
      ),
    LAST_REVIEW_COMPLETION_KEY:
      String(
        entry.last_review_completion_key ||
        ''
      ),
    PRIORITY_STATE_JSON:
      String(
        entry.priority_state_json || ''
      )
  };

  return table.header.map(
    function (name) {
      if (
        !Object.prototype.hasOwnProperty.call(
          values,
          name
        )
      ) {
        throw new Error(
          'REVIEW_HOME_INDEX_RAW_FIELD_UNSUPPORTED:' +
            name
        );
      }
      return values[name];
    }
  );
}


function h3ReviewHomeIndexRefreshBasePriorities_(
  spreadsheet
) {
  var indexed =
    h3ReviewHomeIndexTable_(
      spreadsheet
    );
  var answeredAtBySet = {};

  indexed.table.rows.forEach(
    function (row) {
      var setId =
        String(
          row[
            indexed.table.map.SET_ID
          ] || ''
        );
      var answeredAt =
        String(
          row[
            indexed.table.map
              .ANSWERED_AT
          ] || ''
        );

      if (setId && answeredAt) {
        answeredAtBySet[
          setId
        ] = answeredAt;
      }
    }
  );

  var evidence =
    h3ReviewSkillEvidenceIndex_(
      spreadsheet,
      answeredAtBySet
    );
  var baseValues = [];
  var stateValues = [];
  var hasPriorityState =
    Object.prototype
      .hasOwnProperty.call(
        indexed.table.map,
        'PRIORITY_STATE_JSON'
      );

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
        baseValues.push([
          row[
            indexed.table.map
              .BASE_PRIORITY
          ] || ''
        ]);
        if (hasPriorityState) {
          stateValues.push([
            row[
              indexed.table.map
                .PRIORITY_STATE_JSON
            ] || ''
          ]);
        }
        return;
      }

      var entry =
        h3ReviewHomeIndexRowEntry_(
          row,
          indexed.table.map
        );

      if (hasPriorityState) {
        var state =
          h3ReviewPriorityStateForEntry_(
            entry.review_kind,
            entry,
            evidence
          );

        baseValues.push([
          Number(
            state.base_level || 0
          )
        ]);
        stateValues.push([
          JSON.stringify(state)
        ]);
      } else {
        baseValues.push([
          h3ReviewBaseLevelForEntry_(
            entry.review_kind,
            entry,
            evidence
          )
        ]);
      }
    }
  );

  if (baseValues.length) {
    indexed.sheet
      .getRange(
        2,
        indexed.table.map
          .BASE_PRIORITY + 1,
        baseValues.length,
        1
      )
      .setValues(baseValues);
  }

  if (
    hasPriorityState &&
    stateValues.length
  ) {
    indexed.sheet
      .getRange(
        2,
        indexed.table.map
          .PRIORITY_STATE_JSON + 1,
        stateValues.length,
        1
      )
      .setValues(stateValues);
  }
}

function migrateReviewHomeIndexV2() {
  var lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var indexed =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      indexed.schema_version ===
        'H3_REVIEW_HOME_INDEX_V2'
    ) {
      return {
        schema:
          'H3_REVIEW_HOME_INDEX_MIGRATION_V2',
        status: 'ALREADY_V2',
        rows:
          indexed.table.rows.length
      };
    }

    if (
      indexed.schema_version !==
        'H3_REVIEW_HOME_INDEX_V1'
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_MIGRATION_SOURCE_INVALID'
      );
    }

    var surfaceValues =
      indexed.table.rows.map(
        function (row) {
          var kind =
            String(
              row[
                indexed.table.map.KIND
              ] || ''
            );
          var metadata =
            h3ReviewSurfaceMetadata_(
              kind,
              '',
              ''
            );
          return [
            metadata.surface_family,
            metadata.level
          ];
        }
      );

    indexed.sheet
      .getRange(
        1,
        H3_REVIEW_HOME_INDEX_HEADERS_V1_
          .length + 1,
        1,
        2
      )
      .setValues([
        ['SURFACE_FAMILY', 'LEVEL']
      ]);

    if (surfaceValues.length) {
      indexed.sheet
        .getRange(
          2,
          H3_REVIEW_HOME_INDEX_HEADERS_V1_
            .length + 1,
          surfaceValues.length,
          2
        )
        .setValues(surfaceValues);
    }

    SpreadsheetApp.flush();

    var readback =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      readback.schema_version !==
        'H3_REVIEW_HOME_INDEX_V2'
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_MIGRATION_READBACK_INVALID'
      );
    }

    h3ReviewHomeIndexRefreshBasePriorities_(
      spreadsheet
    );
    SpreadsheetApp.flush();

    return {
      schema:
        'H3_REVIEW_HOME_INDEX_MIGRATION_V2',
      status: 'PASS',
      rows:
        readback.table.rows.length
    };
  } finally {
    lock.releaseLock();
  }
}


function migrateReviewHomeIndexV3() {
  var lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var indexed =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      indexed.schema_version ===
        'H3_REVIEW_HOME_INDEX_V3'
    ) {
      return {
        schema:
          'H3_REVIEW_HOME_INDEX_MIGRATION_V3',
        status: 'ALREADY_V3',
        rows:
          indexed.table.rows.length
      };
    }

    if (
      indexed.schema_version !==
        'H3_REVIEW_HOME_INDEX_V2'
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_V3_MIGRATION_SOURCE_INVALID'
      );
    }

    indexed.sheet
      .getRange(
        1,
        H3_REVIEW_HOME_INDEX_HEADERS_V2_
          .length + 1
      )
      .setValue(
        'LAST_REVIEWED_AT'
      );

    SpreadsheetApp.flush();

    var readback =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      readback.schema_version !==
        'H3_REVIEW_HOME_INDEX_V3'
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_V3_MIGRATION_READBACK_INVALID'
      );
    }

    return {
      schema:
        'H3_REVIEW_HOME_INDEX_MIGRATION_V3',
      status: 'PASS',
      rows:
        readback.table.rows.length
    };
  } finally {
    lock.releaseLock();
  }
}


function migrateReviewHomeIndexV4() {
  var lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var indexed =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      indexed.schema_version ===
        'H3_REVIEW_HOME_INDEX_V4'
    ) {
      return {
        schema:
          'H3_REVIEW_HOME_INDEX_MIGRATION_V4',
        status: 'ALREADY_V4',
        rows:
          indexed.table.rows.length
      };
    }

    if (
      indexed.schema_version !==
        'H3_REVIEW_HOME_INDEX_V3'
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_V4_MIGRATION_SOURCE_INVALID'
      );
    }

    indexed.sheet
      .getRange(
        1,
        H3_REVIEW_HOME_INDEX_HEADERS_V3_
          .length + 1
      )
      .setValue(
        'LAST_REVIEW_COMPLETION_KEY'
      );

    SpreadsheetApp.flush();

    var readback =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      readback.schema_version !==
        'H3_REVIEW_HOME_INDEX_V4'
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_V4_MIGRATION_READBACK_INVALID'
      );
    }

    return {
      schema:
        'H3_REVIEW_HOME_INDEX_MIGRATION_V4',
      status: 'PASS',
      rows:
        readback.table.rows.length
    };
  } finally {
    lock.releaseLock();
  }
}



function migrateReviewHomeIndexV5() {
  var lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var indexed =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      indexed.schema_version ===
        'H3_REVIEW_HOME_INDEX_V5'
    ) {
      return {
        schema:
          'H3_REVIEW_HOME_INDEX_MIGRATION_V5',
        status: 'ALREADY_V5',
        rows:
          indexed.table.rows.length
      };
    }

    if (
      indexed.schema_version !==
        'H3_REVIEW_HOME_INDEX_V4'
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_V5_MIGRATION_SOURCE_INVALID'
      );
    }

    indexed.sheet
      .getRange(
        1,
        H3_REVIEW_HOME_INDEX_HEADERS_V4_
          .length + 1
      )
      .setValue(
        'PRIORITY_STATE_JSON'
      );

    SpreadsheetApp.flush();

    var readback =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      readback.schema_version !==
        'H3_REVIEW_HOME_INDEX_V5'
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_V5_MIGRATION_READBACK_INVALID'
      );
    }

    h3ReviewHomeIndexRefreshBasePriorities_(
      spreadsheet
    );
    SpreadsheetApp.flush();

    return {
      schema:
        'H3_REVIEW_HOME_INDEX_MIGRATION_V5',
      status: 'PASS',
      rows:
        readback.table.rows.length
    };
  } finally {
    lock.releaseLock();
  }
}


function h3ReviewCompletionError_(
  code,
  errorClass,
  retryable
) {
  var err =
    new Error(String(code || ''));

  err.h3_review_error_code =
    String(code || '');
  err.h3_review_error_class =
    String(errorClass || 'UNCLASSIFIED');
  err.h3_review_retryable =
    retryable === true;

  return err;
}


function h3ReviewCompletionFailureResult_(
  err
) {
  var code =
    err &&
    err.h3_review_error_code
      ? String(
          err.h3_review_error_code
        )
      : 'REVIEW_COMPLETE_UNCLASSIFIED_RUNTIME';
  var errorClass =
    err &&
    err.h3_review_error_class
      ? String(
          err.h3_review_error_class
        )
      : 'UNCLASSIFIED';
  var retryable =
    errorClass === 'TRANSIENT' &&
    err &&
    err.h3_review_retryable === true;

  return {
    schema:
      'H3_REVIEW_COMPLETE_RESULT_V2',
    status: 'ERROR',
    error_code: code,
    error_class:
      errorClass,
    retryable: retryable
  };
}


function h3ReviewCompleteSession_(
  request
) {
  if (
    !request ||
    request.schema !==
      'H3_REVIEW_COMPLETE_REQUEST_V2'
  ) {
    throw h3ReviewCompletionError_(
      'REVIEW_COMPLETE_REQUEST_INVALID',
      'VALIDATION',
      false
    );
  }

  var kind =
    String(
      request.review_kind || ''
    );
  var setId =
    String(
      request.set_id || ''
    );
  var reviewSourceId =
    String(
      request.review_source_id || ''
    );
  var surfaceFamily =
    String(
      request.surface_family || ''
    );
  var viewedCount =
    Number(
      request.viewed_count || 0
    );
  var completionEventKey =
    String(
      request.completion_event_key || ''
    );

  if (
    ['LISTENING', 'WRITTEN']
      .indexOf(kind) < 0 ||
    !setId ||
    !reviewSourceId ||
    !surfaceFamily ||
    !Number.isInteger(viewedCount) ||
    viewedCount < 1 ||
    !/^H3RC-[0-9a-f]{32}$/.test(
      completionEventKey
    )
  ) {
    throw h3ReviewCompletionError_(
      'REVIEW_COMPLETE_IDENTITY_INVALID',
      'VALIDATION',
      false
    );
  }

  var lock =
    LockService.getScriptLock();
  var locked = false;

  try {
    if (!lock.tryLock(30000)) {
      throw h3ReviewCompletionError_(
        'REVIEW_COMPLETE_LOCK_BUSY',
        'TRANSIENT',
        true
      );
    }
    locked = true;

    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var indexed =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );

    if (
      [
        'H3_REVIEW_HOME_INDEX_V4',
        'H3_REVIEW_HOME_INDEX_V5'
      ].indexOf(
        indexed.schema_version
      ) < 0
    ) {
      throw h3ReviewCompletionError_(
        'REVIEW_COMPLETE_HOME_INDEX_V4_OR_V5_REQUIRED',
        'INTEGRITY',
        false
      );
    }

    var found =
      h3ReviewHomeIndexFind_(
        indexed.table,
        kind,
        setId
      );

    if (!found) {
      throw h3ReviewCompletionError_(
        'REVIEW_COMPLETE_HOME_ENTRY_MISSING',
        'INTEGRITY',
        false
      );
    }

    var row = found.row;
    var map = indexed.table.map;
    var status =
      String(
        row[map.STATUS] || ''
      );
    var storedSourceId =
      String(
        row[
          map.REVIEW_SOURCE_ID
        ] || ''
      );
    var storedSurfaceFamily =
      String(
        row[
          map.SURFACE_FAMILY
        ] || ''
      );
    var total =
      Number(
        row[map.TOTAL] || 0
      );

    if (
      status !== 'ACTIVE' ||
      storedSourceId !==
        reviewSourceId ||
      storedSurfaceFamily !==
        surfaceFamily ||
      !Number.isInteger(total) ||
      total < 1 ||
      viewedCount !== total
    ) {
      throw h3ReviewCompletionError_(
        'REVIEW_COMPLETE_VALIDATION_MISMATCH',
        'INTEGRITY',
        false
      );
    }

    var storedCompletionKey =
      String(
        row[
          map.LAST_REVIEW_COMPLETION_KEY
        ] || ''
      );
    var storedCompletedAt =
      String(
        row[
          map.LAST_REVIEWED_AT
        ] || ''
      );

    if (
      storedCompletionKey ===
        completionEventKey
    ) {
      if (!storedCompletedAt) {
        throw h3ReviewCompletionError_(
          'REVIEW_COMPLETE_DUPLICATE_STATE_INVALID',
          'INTEGRITY',
          false
        );
      }

      return {
        schema:
          'H3_REVIEW_COMPLETE_RESULT_V2',
        status: 'ALREADY_RECORDED',
        review_kind: kind,
        surface_family:
          surfaceFamily,
        set_id: setId,
        completion_event_key:
          completionEventKey,
        last_reviewed_at:
          storedCompletedAt,
        retryable: false,
        scheduler_mutation_count: 0,
        learner_history_mutation_count: 0
      };
    }

    if (
      map.LAST_REVIEW_COMPLETION_KEY !==
        map.LAST_REVIEWED_AT + 1
    ) {
      throw h3ReviewCompletionError_(
        'REVIEW_COMPLETE_V4_COLUMN_ORDER_INVALID',
        'INTEGRITY',
        false
      );
    }

    var completedAt =
      new Date().toISOString();

    indexed.sheet
      .getRange(
        found.rowNumber,
        map.LAST_REVIEWED_AT + 1,
        1,
        2
      )
      .setValues([[
        completedAt,
        completionEventKey
      ]]);

    SpreadsheetApp.flush();

    var readback =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );
    var stored =
      h3ReviewHomeIndexFind_(
        readback.table,
        kind,
        setId
      );

    if (
      !stored ||
      String(
        stored.row[
          readback.table.map
            .LAST_REVIEWED_AT
        ] || ''
      ) !== completedAt ||
      String(
        stored.row[
          readback.table.map
            .LAST_REVIEW_COMPLETION_KEY
        ] || ''
      ) !== completionEventKey
    ) {
      throw h3ReviewCompletionError_(
        'REVIEW_COMPLETE_READBACK_MISMATCH',
        'INTEGRITY',
        false
      );
    }

    return {
      schema:
        'H3_REVIEW_COMPLETE_RESULT_V2',
      status: 'RECORDED',
      review_kind: kind,
      surface_family:
        surfaceFamily,
      set_id: setId,
      completion_event_key:
        completionEventKey,
      last_reviewed_at:
        completedAt,
      retryable: false,
      scheduler_mutation_count: 0,
      learner_history_mutation_count: 0
    };
  } finally {
    if (locked) {
      lock.releaseLock();
    }
  }
}


function h3ReviewHomeIndexUpsertAfterCommit_(
  result,
  reviewPayload
) {
  if (
    !result ||
    result.status !== 'COMMITTED' ||
    ['LISTENING', 'WRITTEN']
      .indexOf(
        String(result.mode || '')
      ) < 0
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_COMMIT_RESULT_INVALID'
    );
  }

  var lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var spreadsheet =
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      );
    var indexed =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );
    var kind =
      String(result.mode);
    var setId =
      String(result.set_id || '');
    var surface =
      h3ReviewSurfaceMetadata_(
        kind,
        result.surface_family ||
          (
            reviewPayload &&
            reviewPayload.surface_family
          ) ||
          '',
        result.level ||
          (
            reviewPayload &&
            reviewPayload.level
          ) ||
          ''
      );

    if (
      result.provider_kind &&
      String(result.provider_kind) !==
        surface.provider_kind
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_PROVIDER_METADATA_MISMATCH'
      );
    }
    if (
      result.learning_surface_schema &&
      String(
        result.learning_surface_schema
      ) !==
        surface.learning_surface_schema
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_SURFACE_SCHEMA_MISMATCH'
      );
    }

    var existing =
      h3ReviewHomeIndexFind_(
        indexed.table,
        kind,
        setId
      );
    var entry = null;

    if (kind === 'LISTENING') {
      var txn =
        h3ReviewTxnContext_(
          spreadsheet,
          result.txn_id
        );

      if (
        !reviewPayload ||
        reviewPayload.schema !==
          'H3_PERSISTENT_REVIEW_PAYLOAD_V1' ||
        reviewPayload.set_id !== setId ||
        reviewPayload.txn_id !==
          String(result.txn_id)
      ) {
        throw new Error(
          'REVIEW_HOME_INDEX_LISTENING_REVIEW_INVALID'
        );
      }

      var wrongCount =
        result.summary.filter(
          function (item) {
            return (
              item.result === '×'
            );
          }
        ).length;
      var uncertainCount =
        txn.rawInput.answers.filter(
          function (item) {
            return !!item.uncertain;
          }
        ).length;

      entry = {
        kind: kind,
        surface_family:
          surface.surface_family,
        level:
          surface.level,
        set_id: setId,
        set_no:
          txn.setNo,
        answered_at:
          String(
            txn.row[
              txn.map.COMMITTED_AT
            ] || ''
          ),
        score:
          Number(result.score),
        total:
          Number(result.total),
        wrong_count:
          wrongCount,
        uncertainty_known: true,
        uncertain_count:
          uncertainCount,
        review_source_id:
          String(result.txn_id),
        source_mode:
          'LISTENING_PRODUCTION_WEB',
        base_priority: 0
      };
    } else {
      var writtenFamily =
        surface.surface_family;
      var expectedReviewSchema =
        writtenFamily === '5W'
          ? 'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1'
          : (
              writtenFamily === 'READING'
                ? H3_READING_PERSISTENT_REVIEW_SCHEMA_
                : (
                    writtenFamily === 'TRANSLATION'
                      ? H3_TRANSLATION_PERSISTENT_REVIEW_SCHEMA_
                      : ''
                  )
            );

      if (
        !expectedReviewSchema ||
        !reviewPayload ||
        reviewPayload.schema !==
          expectedReviewSchema ||
        reviewPayload.kind !==
          'WRITTEN' ||
        reviewPayload.provider_kind &&
          reviewPayload.provider_kind !==
            'WRITTEN' ||
        reviewPayload.set_id !==
          setId ||
        writtenFamily !== '5W' &&
          reviewPayload.surface_family !==
            writtenFamily
      ) {
        throw new Error(
          'REVIEW_HOME_INDEX_WRITTEN_REVIEW_INVALID'
        );
      }

      var familySetNo =
        writtenFamily === '5W'
          ? (
              existing
                ? Number(
                    existing.row[
                      indexed.table.map.SET_NO
                    ]
                  )
                : h3ReviewHomeIndexNextSetNo_(
                    indexed.table,
                    'WRITTEN',
                    '5W'
                  )
            )
          : Number(
              reviewPayload.issue_no || 0
            );

      if (
        !Number.isInteger(familySetNo) ||
        familySetNo < 1
      ) {
        throw new Error(
          'REVIEW_HOME_INDEX_FAMILY_SET_NO_INVALID'
        );
      }

      entry = {
        kind: kind,
        surface_family:
          surface.surface_family,
        level:
          surface.level,
        set_id: setId,
        set_no:
          familySetNo,
        answered_at:
          String(
            reviewPayload
              .answered_at || ''
          ),
        score:
          Number(
            reviewPayload.score
          ),
        total:
          Number(
            reviewPayload.total
          ),
        wrong_count:
          Number(
            reviewPayload
              .wrong_count || 0
          ),
        uncertainty_known:
          reviewPayload
            .uncertainty_known !==
            false,
        uncertain_count:
          reviewPayload
            .uncertainty_known ===
            false
            ? null
            : Number(
                reviewPayload
                  .uncertain_count || 0
              ),
        review_source_id:
          setId,
        source_mode:
          writtenFamily === '5W'
            ? 'WRITTEN_PRODUCTION_WEB'
            : (
                writtenFamily === 'READING'
                  ? 'READING_PRODUCTION_WEB'
                  : 'TRANSLATION_PRODUCTION_WEB'
              ),
        base_priority: 0
      };
    }

    if (
      !entry.answered_at ||
      !entry.review_source_id
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_ENTRY_IDENTITY_MISSING'
      );
    }

    entry.last_reviewed_at = '';
    entry.last_review_completion_key = '';
    if (
      existing &&
      Object.prototype
        .hasOwnProperty.call(
          indexed.table.map,
          'LAST_REVIEWED_AT'
        )
    ) {
      entry.last_reviewed_at =
        String(
          existing.row[
            indexed.table.map
              .LAST_REVIEWED_AT
          ] || ''
        );
    }
    if (
      existing &&
      Object.prototype
        .hasOwnProperty.call(
          indexed.table.map,
          'LAST_REVIEW_COMPLETION_KEY'
        )
    ) {
      entry.last_review_completion_key =
        String(
          existing.row[
            indexed.table.map
              .LAST_REVIEW_COMPLETION_KEY
          ] || ''
        );
    }

    var raw =
      h3ReviewHomeIndexRawRow_(
        entry,
        indexed.table
      );

    if (existing) {
      var existingSourceId =
        String(
          existing.row[
            indexed.table.map
              .REVIEW_SOURCE_ID
          ] || ''
        );
      var existingSetNo =
        Number(
          existing.row[
            indexed.table.map.SET_NO
          ] || 0
        );

      if (
        existingSourceId !==
          entry.review_source_id ||
        existingSetNo !==
          Number(entry.set_no)
      ) {
        throw new Error(
          'REVIEW_HOME_INDEX_EXISTING_IDENTITY_MISMATCH'
        );
      }

      var existingEntry =
        h3ReviewHomeIndexRowEntry_(
          existing.row,
          indexed.table.map
        );

      if (
        existingEntry.surface_family !==
          entry.surface_family ||
        existingEntry.level !==
          entry.level
      ) {
        throw new Error(
          'REVIEW_HOME_INDEX_EXISTING_SURFACE_MISMATCH'
        );
      }

      indexed.sheet
        .getRange(
          existing.rowNumber,
          1,
          1,
          indexed.table.header.length
        )
        .setValues([raw]);
    } else {
      indexed.sheet
        .appendRow(raw);
    }

    SpreadsheetApp.flush();

    h3ReviewHomeIndexRefreshBasePriorities_(
      spreadsheet
    );
    SpreadsheetApp.flush();

    var readback =
      h3ReviewHomeIndexTable_(
        spreadsheet
      );
    var stored =
      h3ReviewHomeIndexFind_(
        readback.table,
        kind,
        setId
      );

    if (!stored) {
      throw new Error(
        'REVIEW_HOME_INDEX_READBACK_MISSING'
      );
    }

    var storedEntry =
      h3ReviewHomeIndexRowEntry_(
        stored.row,
        readback.table.map
      );

    if (
      storedEntry.review_kind !==
        kind ||
      storedEntry.surface_family !==
        surface.surface_family ||
      storedEntry.level !==
        surface.level ||
      storedEntry.set_id !== setId ||
      Number(
        storedEntry.listening_set_no ||
        storedEntry.written_set_no ||
        0
      ) !== Number(entry.set_no)
    ) {
      throw new Error(
        'REVIEW_HOME_INDEX_READBACK_MISMATCH'
      );
    }

    return {
      schema:
        'H3_REVIEW_HOME_INDEX_SYNC_V1',
      status: 'PASS',
      kind: kind,
      surface_family:
        surface.surface_family,
      level:
        surface.level,
      set_id: setId,
      set_no:
        Number(entry.set_no),
      base_priority:
        Number(
          storedEntry
            .review_base_level || 0
        )
    };
  } finally {
    lock.releaseLock();
  }
}

