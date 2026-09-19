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

function h3ReviewCanonicalizeValue_(value) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return h3ReviewCanonicalizeValue_(item);
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
    throw new Error(code + '_HEADER_MISMATCH');
  }
}

function h3ReviewTable_(sheet) {
  return h3ProdSheetRows_(sheet);
}

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

function h3ReviewCurrentLearning_(
  spreadsheet
) {
  var payloadSheet =
    spreadsheet.getSheetByName(
      'listening_set_payload_v1'
    );
  var txnSheet =
    spreadsheet.getSheetByName(
      H3_WEB_PROD_TXN_SHEET
    );

  if (!payloadSheet || !txnSheet) {
    return null;
  }

  var payload =
    h3ReviewTable_(
      payloadSheet
    );
  var txn =
    h3ReviewTable_(
      txnSheet
    );

  h3ProdRequireColumns_(
    payload,
    [
      'LISTENING_SET_ID',
      'LISTENING_SET_NO',
      'STATUS'
    ],
    'listening_set_payload_v1'
  );
  h3ProdRequireColumns_(
    txn,
    [
      'SET_ID',
      'STATUS'
    ],
    H3_WEB_PROD_TXN_SHEET
  );

  var committed = {};
  txn.rows.forEach(function (row) {
    if (
      String(
        row[txn.map.STATUS] || ''
      ) === 'COMMITTED'
    ) {
      committed[
        String(
          row[txn.map.SET_ID] || ''
        )
      ] = true;
    }
  });

  var candidates = [];
  payload.rows.forEach(
    function (row) {
      var setId = String(
        row[
          payload.map.LISTENING_SET_ID
        ] || ''
      );
      var setNo = Number(
        row[
          payload.map.LISTENING_SET_NO
        ]
      );

      if (
        String(
          row[
            payload.map.STATUS
          ] || ''
        ) === 'ISSUED' &&
        setId &&
        Number.isInteger(setNo) &&
        !committed[setId]
      ) {
        candidates.push({
          set_id: setId,
          listening_set_no:
            setNo
        });
      }
    }
  );

  if (!candidates.length) {
    return null;
  }

  candidates.sort(function (a, b) {
    return (
      b.listening_set_no -
      a.listening_set_no
    );
  });

  var latest =
    candidates[0];

  try {
    buildProductionRenderPayload_({
      schema:
        'H3_WEB_RENDER_REQUEST_V1',
      mode: 'LISTENING',
      set_id:
        latest.set_id
    });
    return latest;
  } catch (err) {
    return null;
  }
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
    current_learning:
      h3ReviewCurrentLearning_(
        spreadsheet
      ),
    review_history:
      h3ReviewHistoryEntries_(
        spreadsheet
      ),
    review_filters: [
      'ALL',
      'NEEDS_REVIEW'
    ]
  };
}

