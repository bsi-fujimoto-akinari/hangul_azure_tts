/**
 * H3 R3-07 production preissue gate.
 *
 * READ-ONLY:
 * - validates one AUDIO_BOUND, unissued 5L set
 * - validates the bound READY K1 payload
 * - validates queue/audio/TXT source lock
 * - validates retest slot plan
 * - validates that learner log/production transaction rows do not yet exist
 *
 * R3-08 must call this gate before any issue mutation.
 */

var H3_WEB_AUDIO_QUEUE_SPREADSHEET_ID =
  '18c5SAfWH473fslNViN_i282ChdDFE1gvGay5l9CZJXI';

function h3PreissueCanonicalize_(value) {
  if (Array.isArray(value)) {
    return value.map(h3PreissueCanonicalize_);
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
          h3PreissueCanonicalize_(
            value[key]
          );
      });
    return out;
  }

  return value;
}

function h3PreissueCanonicalJson_(value) {
  return JSON.stringify(
    h3PreissueCanonicalize_(value)
  );
}

function h3PreissueBytesSha256Hex_(bytes) {
  return Utilities
    .computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      bytes
    )
    .map(function (b) {
      return (
        '0' +
        (
          (b + 256) %
          256
        ).toString(16)
      ).slice(-2);
    })
    .join('');
}

function h3PreissueRowsBy_(
  table,
  column,
  value
) {
  var col = table.map[column];
  if (typeof col !== 'number') {
    throw new Error(
      'PREISSUE_COLUMN_MISSING:' +
      column
    );
  }

  var matches = [];
  table.rows.forEach(function (row, i) {
    if (
      String(row[col] || '') ===
      String(value)
    ) {
      matches.push({
        rowNumber: i + 2,
        row: row
      });
    }
  });
  return matches;
}

function h3PreissueRequireK1_(
  k1Table,
  k1Record,
  setId,
  answerKey
) {
  h3ProdRequireColumns_(
    k1Table,
    [
      'K1_READY_ID',
      'STATUS',
      'IMAGE_FILE_ID',
      'IMAGE_URL',
      'IMAGE_SHA256',
      'FINAL_CHOICES_JSON',
      'ANSWER_KEY',
      'TTS_SCRIPT_JSON',
      'QA_PROFILE',
      'AUDIT_RESULT',
      'BOUND_LISTENING_SET_ID',
      'CONSUMED_AT'
    ],
    'listening_k1_ready_v1'
  );

  var row = k1Record.row;
  var map = k1Table.map;

  if (
    String(row[map.STATUS] || '') !==
      'READY' ||
    String(
      row[
        map.BOUND_LISTENING_SET_ID
      ] || ''
    ) !== String(setId) ||
    String(
      row[map.CONSUMED_AT] || ''
    ) !== ''
  ) {
    throw new Error(
      'PREISSUE_K1_READY_STATE_INVALID'
    );
  }

  if (
    Number(row[map.ANSWER_KEY]) !==
    Number(answerKey.K1)
  ) {
    throw new Error(
      'PREISSUE_K1_ANSWER_MISMATCH'
    );
  }

  var choices = h3ProdParseJson_(
    row[map.FINAL_CHOICES_JSON],
    'PREISSUE_K1_CHOICES_INVALID'
  );
  if (
    !Array.isArray(choices) ||
    choices.length !== 4 ||
    choices.some(function (x) {
      return !String(x || '').trim();
    })
  ) {
    throw new Error(
      'PREISSUE_K1_CHOICES_INVALID'
    );
  }

  var tts = h3ProdParseJson_(
    row[map.TTS_SCRIPT_JSON],
    'PREISSUE_K1_TTS_INVALID'
  );
  if (
    !tts ||
    !Array.isArray(tts.segments) ||
    !tts.segments.length
  ) {
    throw new Error(
      'PREISSUE_K1_TTS_INVALID'
    );
  }

  var qa = h3ProdParseJson_(
    row[map.QA_PROFILE],
    'PREISSUE_K1_QA_PROFILE_INVALID'
  );
  if (
    !qa ||
    !String(qa.mode || '').trim() ||
    !String(qa.item_id || '').trim() ||
    !String(qa.profile || '').trim() ||
    !String(qa.image_source || '').trim()
  ) {
    throw new Error(
      'PREISSUE_K1_QA_PROFILE_INVALID'
    );
  }

  var audit = h3ProdParseJson_(
    row[map.AUDIT_RESULT],
    'PREISSUE_K1_AUDIT_INVALID'
  );
  if (
    !audit ||
    audit.result !== 'PASS' ||
    audit.visual_qa !== 'PASS' ||
    audit.blind_audit !== 'PASS' ||
    Number(audit.exactly_one_choice) !==
      Number(answerKey.K1)
  ) {
    throw new Error(
      'PREISSUE_K1_AUDIT_NOT_PASS'
    );
  }

  var imageId =
    String(
      row[map.IMAGE_FILE_ID] || ''
    );
  var imageSha =
    String(
      row[map.IMAGE_SHA256] || ''
    );

  if (
    !imageId ||
    !/^[0-9a-f]{64}$/.test(imageSha)
  ) {
    throw new Error(
      'PREISSUE_K1_IMAGE_BINDING_INVALID'
    );
  }

  var file =
    DriveApp.getFileById(imageId);
  if (
    file.isTrashed() ||
    file.getSize() <= 0
  ) {
    throw new Error(
      'PREISSUE_K1_IMAGE_FILE_INVALID'
    );
  }

  var mime =
    String(
      file.getMimeType() || ''
    );
  if (
    mime !== 'image/jpeg' &&
    mime !== 'image/png'
  ) {
    throw new Error(
      'PREISSUE_K1_IMAGE_MIME_INVALID'
    );
  }

  var actualSha =
    h3PreissueBytesSha256Hex_(
      file.getBlob().getBytes()
    );

  if (actualSha !== imageSha) {
    throw new Error(
      'PREISSUE_K1_IMAGE_SHA_MISMATCH'
    );
  }

  return {
    row: row,
    map: map,
    choices: choices,
    image_sha256: imageSha
  };
}

function h3PreissueRequireItems_(
  payloadTable,
  payloadRow,
  answerKey
) {
  var pm = payloadTable.map;
  h3ProdRequireColumns_(
    payloadTable,
    [
      'K2_ITEM_JSON',
      'K3_ITEM_JSON',
      'K4_ITEM_JSON',
      'K5_ITEM_JSON'
    ],
    'listening_set_payload_v1'
  );

  var items = {};

  ['K2','K3','K4','K5']
    .forEach(function (section) {
      var item =
        h3ProdParseJson_(
          payloadRow[
            pm[section + '_ITEM_JSON']
          ],
          'PREISSUE_ITEM_JSON_INVALID:' +
            section
        );

      var skillId =
        String(
          item &&
          item.skill_id ||
          ''
        );

      if (
        !item ||
        item.section !== section ||
        skillId.indexOf(
          'H3-' + section + '-SK'
        ) !== 0 ||
        !/^\d{3}$/.test(
          skillId.slice(
            ('H3-' + section + '-SK').length
          )
        )
      ) {
        throw new Error(
          'PREISSUE_ITEM_IDENTITY_INVALID:' +
          section
        );
      }

      if (
        !Number.isInteger(
          Number(answerKey[section])
        ) ||
        Number(answerKey[section]) < 1 ||
        Number(answerKey[section]) > 4
      ) {
        throw new Error(
          'PREISSUE_ANSWER_KEY_INVALID:' +
          section
        );
      }

      if (
        section === 'K2' ||
        section === 'K3'
      ) {
        if (
          item.visibility !== 'audio_only' ||
          !String(item.prompt || '').trim() ||
          !Array.isArray(item.choices) ||
          item.choices.length !== 4
        ) {
          throw new Error(
            'PREISSUE_AUDIO_ONLY_ITEM_INVALID:' +
            section
          );
        }
      } else if (section === 'K4') {
        if (
          item.visibility !==
            'visible_Japanese_choices' ||
          !String(item.passage || '').trim() ||
          !Array.isArray(item.choices_ja) ||
          item.choices_ja.length !== 4
        ) {
          throw new Error(
            'PREISSUE_K4_ITEM_INVALID'
          );
        }
      } else if (
        item.visibility !==
          'visible_Korean_choices' ||
        !String(item.passage || '').trim() ||
        !Array.isArray(item.choices_ko) ||
        item.choices_ko.length !== 4
      ) {
        throw new Error(
          'PREISSUE_K5_ITEM_INVALID'
        );
      }

      items[section] = item;
    });

  return items;
}

function h3PreissueRequireProvenance_(
  sourceProv,
  setNo,
  stateMap,
  policyMap
) {
  if (
    !sourceProv ||
    sourceProv.hash_canonicalization !==
      'JSON_SORT_KEYS_COMPACT_UTF8_V1'
  ) {
    throw new Error(
      'PREISSUE_HASH_CANONICALIZATION_INVALID'
    );
  }

  var retests = [];

  H3_WEB_PROD_SECTIONS
    .forEach(function (section) {
      var p =
        sourceProv &&
        sourceProv[section];

      if (!p) {
        throw new Error(
          'PREISSUE_SOURCE_PROVENANCE_MISSING:' +
          section
        );
      }

      if (
        p.slot_role !== 'PRIMARY' &&
        p.slot_role !== 'RETEST'
      ) {
        throw new Error(
          'PREISSUE_SLOT_ROLE_INVALID:' +
          section
        );
      }

      if (
        String(p.skill_id || '')
          .indexOf(
            'H3-' + section + '-SK'
          ) !== 0
      ) {
        throw new Error(
          'PREISSUE_PROVENANCE_SKILL_MISMATCH:' +
          section
        );
      }

      if (
        String(p.authoring_audit || '') !==
          'PASS_UNIQUE_ANSWER'
      ) {
        throw new Error(
          'PREISSUE_AUTHORING_AUDIT_NOT_PASS:' +
          section
        );
      }

      if (p.slot_role === 'RETEST') {
        if (
          Number(
            p.retest_due_min_set_no
          ) > setNo ||
          Number(
            p.retest_due_max_set_no
          ) < setNo ||
          Number(
            p.retest_origin_set_no
          ) < 1 ||
          p.same_section_slot !== true
        ) {
          throw new Error(
            'PREISSUE_RETEST_WINDOW_INVALID:' +
            section
          );
        }
        retests.push({
          section: section,
          skill_id:
            String(p.skill_id)
        });
      }
    });

  var cap =
    Number(
      policyMap
        .LISTENING_RETEST_PER_SET_CAP ||
      1
    );

  if (
    retests.length > cap
  ) {
    throw new Error(
      'PREISSUE_RETEST_CAP_EXCEEDED'
    );
  }

  var overloadText =
    stateMap.OVERLOAD_PLAN_JSON &&
    stateMap.OVERLOAD_PLAN_JSON.value;

  if (!overloadText) {
    throw new Error(
      'PREISSUE_OVERLOAD_PLAN_MISSING'
    );
  }

  if (overloadText) {
    var overload =
      h3ProdParseJson_(
        overloadText,
        'PREISSUE_OVERLOAD_PLAN_INVALID'
      );

    if (
      String(overload.schema || '') !==
        'H3_LISTENING_OVERLOAD_PLAN_V2' ||
      Number(overload.next_set_no) !==
        Number(setNo)
    ) {
      throw new Error(
        'PREISSUE_OVERLOAD_PLAN_STALE'
      );
    }

    if (
      Array.isArray(
        overload.blocking_overflow
      ) &&
      overload.blocking_overflow.length
    ) {
      throw new Error(
        'PREISSUE_OVERLOAD_PLAN_BLOCKED'
      );
    }

    var planned =
      (
        overload.normal_retests ||
        []
      ).filter(function (x) {
        return Number(x.set_no) ===
          Number(setNo);
      });

    if (planned.length > 1) {
      throw new Error(
        'PREISSUE_OVERLOAD_PLAN_CARDINALITY'
      );
    }

    if (
      planned.length === 1 &&
      (
        retests.length !== 1 ||
        retests[0].section !==
          String(planned[0].section) ||
        retests[0].skill_id !==
          String(planned[0].skill_id)
      )
    ) {
      throw new Error(
        'PREISSUE_RETEST_PLAN_MISMATCH'
      );
    }
  }

  return retests;
}

function h3PreissueRequireQueue_(
  setId,
  setNo,
  audioBinding,
  sourceProv
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_AUDIO_QUEUE_SPREADSHEET_ID
    );
  var sheet =
    spreadsheet.getSheetByName(
      'listening_audio_queue_v1'
    );

  if (!sheet) {
    throw new Error(
      'PREISSUE_AUDIO_QUEUE_MISSING'
    );
  }

  var table =
    h3ProdSheetRows_(sheet);

  h3ProdRequireColumns_(
    table,
    [
      'LISTEN_GEN_ID',
      'STATUS',
      'CREATED_AT',
      'PARENT_SET_ID',
      'LISTENING_ISSUE_NO',
      'SECTION_KEY',
      'SKILL_ID',
      'AUDIO_PLAN_JSON',
      'PAYLOAD_HASH',
      'ASSIGNMENT',
      'AUDIO_FILE_ID',
      'AUDIO_URL',
      'ERROR',
      'PROCESSED_AT',
      'STORAGE_MODE'
    ],
    'listening_audio_queue_v1'
  );

  var rows =
    h3PreissueRowsBy_(
      table,
      'PARENT_SET_ID',
      setId
    );

  if (rows.length !== 5) {
    throw new Error(
      'PREISSUE_AUDIO_ROW_COUNT_MISMATCH'
    );
  }

  rows.sort(function (a, b) {
    return (
      H3_WEB_PROD_SECTIONS.indexOf(
        String(
          a.row[
            table.map.SECTION_KEY
          ] || ''
        )
      ) -
      H3_WEB_PROD_SECTIONS.indexOf(
        String(
          b.row[
            table.map.SECTION_KEY
          ] || ''
        )
      )
    );
  });

  rows.forEach(function (record, i) {
    var row = record.row;
    var section =
      H3_WEB_PROD_SECTIONS[i];
    var binding =
      audioBinding &&
      audioBinding.individual &&
      audioBinding.individual[section];

    if (
      String(
        row[
          table.map.SECTION_KEY
        ] || ''
      ) !== section ||
      Number(
        row[
          table.map.LISTENING_ISSUE_NO
        ]
      ) !== Number(setNo) ||
      String(
        row[table.map.STATUS] || ''
      ) !== 'done' ||
      String(
        row[table.map.ERROR] || ''
      ) !== '' ||
      !String(
        row[table.map.PROCESSED_AT] || ''
      ) ||
      String(
        row[table.map.STORAGE_MODE] || ''
      ) !== HQ_LISTENING_STORAGE_MODE
    ) {
      throw new Error(
        'PREISSUE_AUDIO_ROW_STATE_INVALID:' +
        section
      );
    }

    if (
      String(
        row[
          table.map.SKILL_ID
        ] || ''
      ) !==
      String(
        sourceProv[section].skill_id
      )
    ) {
      throw new Error(
        'PREISSUE_AUDIO_SKILL_MISMATCH:' +
        section
      );
    }

    var calculatedPayloadHash =
      h3Sha256Hex_(
        JSON.stringify([
          String(
            row[table.map.LISTEN_GEN_ID] || ''
          ),
          String(
            row[table.map.CREATED_AT] || ''
          ),
          String(
            row[table.map.PARENT_SET_ID] || ''
          ),
          Number(
            row[table.map.LISTENING_ISSUE_NO]
          ),
          section,
          String(
            row[table.map.SKILL_ID] || ''
          ),
          String(
            row[table.map.AUDIO_PLAN_JSON] || ''
          ),
          String(
            row[table.map.STORAGE_MODE] || ''
          )
        ])
      );

    if (
      calculatedPayloadHash !==
      String(
        row[table.map.PAYLOAD_HASH] || ''
      )
    ) {
      throw new Error(
        'PREISSUE_AUDIO_PAYLOAD_HASH_MISMATCH:' +
        section
      );
    }

    if (
      !binding ||
      String(binding.listen_gen_id) !==
        String(
          row[
            table.map.LISTEN_GEN_ID
          ] || ''
        ) ||
      String(binding.payload_hash) !==
        String(
          row[
            table.map.PAYLOAD_HASH
          ] || ''
        ) ||
      String(binding.assignment) !==
        String(
          row[
            table.map.ASSIGNMENT
          ] || ''
        ) ||
      String(binding.audio_file_id) !==
        String(
          row[
            table.map.AUDIO_FILE_ID
          ] || ''
        ) ||
      String(binding.audio_url) !==
        String(
          row[
            table.map.AUDIO_URL
          ] || ''
        )
    ) {
      throw new Error(
        'PREISSUE_AUDIO_BINDING_MISMATCH:' +
        section
      );
    }

    var file =
      DriveApp.getFileById(
        String(
          row[
            table.map.AUDIO_FILE_ID
          ] || ''
        )
      );

    if (
      file.isTrashed() ||
      file.getSize() <= 0 ||
      file.getMimeType() !==
        'audio/mpeg'
    ) {
      throw new Error(
        'PREISSUE_AUDIO_FILE_INVALID:' +
        section
      );
    }

    var parents =
      file.getParents();
    var inTargetFolder = false;
    while (parents.hasNext()) {
      if (
        parents.next().getId() ===
          HQ_AUDIO_LISTENING_FOLDER_ID
      ) {
        inTargetFolder = true;
      }
    }
    if (!inTargetFolder) {
      throw new Error(
        'PREISSUE_AUDIO_FOLDER_MISMATCH:' +
        section
      );
    }
  });

  return {
    table: table,
    rows: rows
  };
}

function h3PreissueRequireScript_(
  setId,
  queueRows
) {
  var folder =
    DriveApp.getFolderById(
      HQ_AUDIO_LISTENING_FOLDER_ID
    );

  var iterator =
    folder.getFilesByName(
      String(setId) + '.txt'
    );
  var files = [];

  while (iterator.hasNext()) {
    files.push(
      iterator.next()
    );
  }

  if (files.length !== 1) {
    throw new Error(
      'PREISSUE_SCRIPT_TXT_CARDINALITY:' +
      files.length
    );
  }

  var expected =
    normalized_(
      buildListeningSetScript_(
        setId,
        queueRows.rows.map(
          function (x) {
            return {
              values: x.row
            };
          }
        )
      )
    );

  var actual =
    normalized_(
      files[0]
        .getBlob()
        .getDataAsString('UTF-8')
    );

  if (
    !actual ||
    actual !== expected
  ) {
    throw new Error(
      'PREISSUE_SCRIPT_TXT_MISMATCH'
    );
  }

  return {
    file_id:
      files[0].getId(),
    url:
      files[0].getUrl()
  };
}

function h3ProdValidatePreissueSet_(
  setId
) {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  var payloadSheet =
    spreadsheet.getSheetByName(
      'listening_set_payload_v1'
    );
  var logSheet =
    spreadsheet.getSheetByName(
      'listening_log_v1'
    );
  var stateSheet =
    spreadsheet.getSheetByName(
      'listening_state_v1'
    );
  var policySheet =
    spreadsheet.getSheetByName(
      'listening_policy_v1'
    );
  var k1Sheet =
    spreadsheet.getSheetByName(
      'listening_k1_ready_v1'
    );
  var txnSheet =
    spreadsheet.getSheetByName(
      H3_WEB_PROD_TXN_SHEET
    );

  if (
    !payloadSheet ||
    !logSheet ||
    !stateSheet ||
    !policySheet ||
    !k1Sheet ||
    !txnSheet
  ) {
    throw new Error(
      'PREISSUE_SOURCE_SHEET_MISSING'
    );
  }

  var payload =
    h3ProdSheetRows_(payloadSheet);
  var logs =
    h3ProdSheetRows_(logSheet);
  var state =
    h3ProdSheetRows_(stateSheet);
  var policy =
    h3ProdSheetRows_(policySheet);
  var k1 =
    h3ProdSheetRows_(k1Sheet);
  var txn =
    h3ProdSheetRows_(txnSheet);

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
      'AUDIO_BINDING_JSON',
      'SOURCE_PROVENANCE_JSON',
      'LOCKED_AT',
      'ISSUED_AT'
    ],
    'listening_set_payload_v1'
  );

  var payloadRecord =
    h3ProdOneRowBy_(
      payload,
      'LISTENING_SET_ID',
      setId,
      'listening_set_payload_v1'
    );

  var p =
    payloadRecord.row;
  var pm =
    payload.map;

  if (
    String(p[pm.STATUS] || '') !==
      'AUDIO_BOUND' ||
    !String(
      p[pm.LOCKED_AT] || ''
    ) ||
    String(
      p[pm.ISSUED_AT] || ''
    ) !== ''
  ) {
    throw new Error(
      'PREISSUE_PAYLOAD_NOT_AUDIO_BOUND'
    );
  }

  var setNo =
    Number(
      p[pm.LISTENING_SET_NO]
    );

  if (
    !Number.isInteger(setNo) ||
    setNo < 1
  ) {
    throw new Error(
      'PREISSUE_SET_NO_INVALID'
    );
  }

  var answerKey =
    h3ProdParseJson_(
      p[pm.ANSWER_KEY_JSON],
      'PREISSUE_ANSWER_KEY_JSON_INVALID'
    );

  H3_WEB_PROD_SECTIONS
    .forEach(function (section) {
      var value =
        Number(answerKey[section]);
      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 4
      ) {
        throw new Error(
          'PREISSUE_ANSWER_KEY_INVALID:' +
          section
        );
      }
    });

  var audioBinding =
    h3ProdParseJson_(
      p[pm.AUDIO_BINDING_JSON],
      'PREISSUE_AUDIO_BINDING_INVALID'
    );

  if (
    !audioBinding ||
    audioBinding.audio_mode !==
      'INDIVIDUAL_K1_K5_ONLY' ||
    !audioBinding.individual
  ) {
    throw new Error(
      'PREISSUE_AUDIO_MODE_INVALID'
    );
  }

  var sourceProv =
    h3ProdParseJson_(
      p[pm.SOURCE_PROVENANCE_JSON],
      'PREISSUE_SOURCE_PROVENANCE_INVALID'
    );

  var stateMap =
    h3ProdStateMap_(state);
  var policyMap =
    h3ProdPolicyMap_(policy);

  if (
    Number(
      stateMap.NEXT_LISTENING_SET_NO &&
      stateMap.NEXT_LISTENING_SET_NO.value
    ) !== setNo ||
    Number(
      stateMap.LISTENING_ISSUE_NO &&
      stateMap.LISTENING_ISSUE_NO.value
    ) !== setNo - 1 ||
    String(
      stateMap.LAST_LISTENING_SET_ID &&
      stateMap.LAST_LISTENING_SET_ID.value ||
      ''
    ) === String(setId) ||
    String(
      stateMap.ANSWER_SYNC_PHASE &&
      stateMap.ANSWER_SYNC_PHASE.value ||
      ''
    ) !== 'IDLE' ||
    String(
      stateMap.STATUS &&
      stateMap.STATUS.value ||
      ''
    ) !== 'N5_AUDIO_TIMING_STAGED' ||
    String(
      stateMap.PRODUCTION_GATE &&
      stateMap.PRODUCTION_GATE.value ||
      ''
    ) !== H3_R3_PRODUCTION_GATE_MODE
  ) {
    throw new Error(
      'PREISSUE_STATE_BINDING_INVALID'
    );
  }

  if (
    String(
      policyMap.PRODUCTION_PREP_MODE ||
      ''
    ) !== 'NORMAL_LIVE' ||
    String(
      policyMap.STATUS || ''
    ) !== 'N5_AUDIO_TIMING_STAGED' ||
    String(
      policyMap.PRODUCTION_GATE ||
      ''
    ) !== H3_R3_PRODUCTION_GATE_MODE ||
    H3_R3_PRODUCTION_COMMIT_ENABLED !== true
  ) {
    throw new Error(
      'PREISSUE_POLICY_GATE_INVALID'
    );
  }

  var k1ReadyId =
    String(
      p[pm.K1_READY_ID] || ''
    );

  var k1Record =
    h3ProdOneRowBy_(
      k1,
      'K1_READY_ID',
      k1ReadyId,
      'listening_k1_ready_v1'
    );

  var k1Info =
    h3PreissueRequireK1_(
      k1,
      k1Record,
      setId,
      answerKey
    );

  var items =
    h3PreissueRequireItems_(
      payload,
      p,
      answerKey
    );

  var hashObject = {
    LISTENING_SET_ID:
      String(setId),
    LISTENING_SET_NO:
      setNo,
    K1_READY_ID:
      k1ReadyId,
    K1_READY_IMAGE_SHA256:
      k1Info.image_sha256,
    K1_READY_FINAL_CHOICES_JSON:
      k1Info.choices,
    K1_READY_ANSWER_KEY:
      Number(answerKey.K1),
    K2_ITEM_JSON:
      items.K2,
    K3_ITEM_JSON:
      items.K3,
    K4_ITEM_JSON:
      items.K4,
    K5_ITEM_JSON:
      items.K5,
    ANSWER_KEY_JSON:
      answerKey
  };

  var calculatedItemHash =
    hash_(
      h3PreissueCanonicalJson_(
        hashObject
      )
    );

  if (
    calculatedItemHash !==
    String(
      p[
        pm.ITEM_PAYLOAD_SHA256
      ] || ''
    )
  ) {
    throw new Error(
      'PREISSUE_ITEM_PAYLOAD_SHA_MISMATCH'
    );
  }

  var retests =
    h3PreissueRequireProvenance_(
      sourceProv,
      setNo,
      stateMap,
      policyMap
    );

  var logMatches =
    h3PreissueRowsBy_(
      logs,
      'PARENT_SET_ID',
      setId
    );

  if (logMatches.length !== 0) {
    throw new Error(
      'PREISSUE_LEARNER_LOG_ALREADY_EXISTS'
    );
  }

  h3ProdRequireColumns_(
    txn,
    [
      'TXN_ID',
      'SET_ID',
      'STATUS'
    ],
    H3_WEB_PROD_TXN_SHEET
  );

  var txnMatches =
    h3PreissueRowsBy_(
      txn,
      'SET_ID',
      setId
    );

  if (txnMatches.length !== 0) {
    throw new Error(
      'PREISSUE_PRODUCTION_TXN_ALREADY_EXISTS'
    );
  }

  txn.rows.forEach(function (row) {
    if (
      String(
        row[txn.map.STATUS] || ''
      ) === 'RECOVERY_REQUIRED'
    ) {
      throw new Error(
        'PREISSUE_RECOVERY_REQUIRED_EXISTS'
      );
    }
  });

  var queue =
    h3PreissueRequireQueue_(
      setId,
      setNo,
      audioBinding,
      sourceProv
    );

  var script =
    h3PreissueRequireScript_(
      setId,
      queue
    );

  return {
    schema:
      'H3_PRODUCTION_PREISSUE_GATE_V1',
    status: 'PASS',
    set_id:
      String(setId),
    listening_set_no:
      setNo,
    payload_status:
      'AUDIO_BOUND',
    k1_ready_id:
      k1ReadyId,
    item_payload_sha256:
      calculatedItemHash,
    retest_sections:
      retests.map(function (x) {
        return x.section;
      }),
    audio_rows:
      queue.rows.length,
    script_file_id:
      script.file_id,
    learner_log_rows: 0,
    production_txn_rows: 0,
    issue_performed: false
  };
}

function validateProductionPreissueSet(
  setId
) {
  return h3ProdValidatePreissueSet_(
    setId
  );
}
