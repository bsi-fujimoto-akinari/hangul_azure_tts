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

  return {
    kind: provider.kind,
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
  'H3_REVIEW_LEVEL_V2';

var H3_REVIEW_LEVEL_HALF_LIFE_DAYS_ =
  14;

var H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_ =
  0.40;

var H3_REVIEW_HOME_INDEX_SHEET_ =
  'review_home_index_v1';

var H3_REVIEW_HOME_INDEX_HEADERS_ = [
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


function h3ReviewSkillEvidenceIndex_(
  spreadsheet
) {
  var bySet = {};
  var bySkill = {};
  var writtenSetSeen = {};

  function add(
    kind,
    setId,
    skillId,
    result
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

    var setKey =
      kind + '|' + normalizedSetId;
    if (!bySet[setKey]) {
      bySet[setKey] = [];
    }

    var normalizedSkillId =
      String(skillId || '');
    bySet[setKey].push({
      skill_id:
        normalizedSkillId,
      result:
        normalizedResult
    });

    if (
      kind === 'WRITTEN'
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
      normalizedSkillId;
    if (!bySkill[skillKey]) {
      bySkill[skillKey] = {
        wrong: 0,
        uncertain: 0,
        correct: 0
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
          ) !== 'VALID'
        ) {
          return;
        }

        add(
          'LISTENING',
          row[
            listening.map
              .PARENT_SET_ID
          ],
          row[
            listening.map.SKILL_ID
          ],
          row[
            listening.map
              .USER_RESULT
          ]
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
        'USER_RESULT'
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

        add(
          'WRITTEN',
          setId,
          row[
            written.map.SKILL_ID
          ],
          row[
            written.map.USER_RESULT
          ]
        );
      }
    );
  }

  return {
    bySet: bySet,
    bySkill: bySkill,
    written_set_ids:
      Object.keys(
        writtenSetSeen
      ).sort()
  };
}


function h3ReviewBaseLevelForEntry_(
  kind,
  entry,
  evidence
) {
  var setKey =
    kind + '|' +
    String(entry.set_id || '');
  var items =
    evidence.bySet[setKey] ||
    [];
  var level = 0;

  if (items.length) {
    items.forEach(
      function (item) {
        if (item.result === '×') {
          level += 12;
        } else if (
          item.result === '△'
        ) {
          level += 6;
        }

        if (item.skill_id) {
          var stats =
            evidence.bySkill[
              kind + '|' +
              item.skill_id
            ];

          if (stats) {
            level += Math.min(
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
    level +=
      Number(
        entry.wrong_count || 0
      ) * 12;

    if (
      entry.uncertainty_known !==
        false
    ) {
      level +=
        Number(
          entry.uncertain_count || 0
        ) * 6;
    }
  }

  return Math.max(
    0,
    Math.min(
      100,
      level
    )
  );
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

  if (
    JSON.stringify(table.header) !==
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_
    )
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_HEADER_MISMATCH'
    );
  }

  return {
    sheet: sheet,
    table: table
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

  var entry = {
    review_kind: kind,
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
      )
  };

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


function h3ReviewHomeIndexNextSetNo_(
  table,
  kind
) {
  var maxSetNo = 0;

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
  entry
) {
  return [
    entry.kind,
    entry.set_id,
    entry.set_no,
    entry.answered_at,
    entry.score,
    entry.total,
    entry.wrong_count,
    entry.uncertainty_known
      ? 'TRUE'
      : 'FALSE',
    entry.uncertainty_known
      ? entry.uncertain_count
      : '',
    Number(
      entry.base_priority || 0
    ),
    entry.review_source_id,
    entry.source_mode,
    'ACTIVE'
  ];
}


function h3ReviewHomeIndexRefreshBasePriorities_(
  spreadsheet
) {
  var indexed =
    h3ReviewHomeIndexTable_(
      spreadsheet
    );
  var evidence =
    h3ReviewSkillEvidenceIndex_(
      spreadsheet
    );
  var values = [];

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
        values.push([
          row[
            indexed.table.map
              .BASE_PRIORITY
          ] || ''
        ]);
        return;
      }

      var entry =
        h3ReviewHomeIndexRowEntry_(
          row,
          indexed.table.map
        );

      values.push([
        h3ReviewBaseLevelForEntry_(
          entry.review_kind,
          entry,
          evidence
        )
      ]);
    }
  );

  if (values.length) {
    indexed.sheet
      .getRange(
        2,
        indexed.table.map
          .BASE_PRIORITY + 1,
        values.length,
        1
      )
      .setValues(values);
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
      if (
        !reviewPayload ||
        reviewPayload.schema !==
          'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1' ||
        reviewPayload.kind !==
          'WRITTEN' ||
        reviewPayload.set_id !==
          setId
      ) {
        throw new Error(
          'REVIEW_HOME_INDEX_WRITTEN_REVIEW_INVALID'
        );
      }

      entry = {
        kind: kind,
        set_id: setId,
        set_no:
          existing
            ? Number(
                existing.row[
                  indexed.table.map.SET_NO
                ]
              )
            : h3ReviewHomeIndexNextSetNo_(
                indexed.table,
                'WRITTEN'
              ),
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
          'WRITTEN_PRODUCTION_WEB',
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

    var raw =
      h3ReviewHomeIndexRawRow_(
        entry
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

      indexed.sheet
        .getRange(
          existing.rowNumber,
          1,
          1,
          H3_REVIEW_HOME_INDEX_HEADERS_
            .length
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
  var oldestKnownMs =
    h3ReviewOldestKnownTimestampMs_(
      envelopes
    );

  envelopes.forEach(
    function (envelope) {
      var entry = envelope.entry;
      var actualTimestampMs =
        h3ReviewTimestampMs_(
          envelope.answered_at
        );
      var usedFallback =
        actualTimestampMs === null;
      var effectiveTimestampMs =
        actualTimestampMs;

      if (
        effectiveTimestampMs === null
      ) {
        effectiveTimestampMs =
          oldestKnownMs !== null
            ? oldestKnownMs
            : nowMs;
      }

      var levelMeta =
        h3ReviewLevelFromBase_(
          entry.review_base_level,
          effectiveTimestampMs,
          nowMs
        );

      envelope.review_effective_at =
        new Date(
          effectiveTimestampMs
        ).toISOString();

      entry.review_effective_at =
        envelope.review_effective_at;
      entry.review_time_source =
        usedFallback
          ? 'UNKNOWN_FALLBACK_OLDEST'
          : 'ACTUAL';
      entry.review_age_days =
        levelMeta.age_days;
      entry.review_forgetting_pressure =
        levelMeta.forgetting_pressure;
      entry.review_base_level =
        levelMeta.base;
      entry.review_level =
        levelMeta.level;
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

  candidates.sort(function (a, b) {
    return a.order - b.order;
  });

  return candidates[0].current;
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
      'LISTENING',
      'WRITTEN'
    ],
    review_sorts: [
      'RECENT',
      'REVIEW_LEVEL'
    ],
    review_level_contract:
      H3_REVIEW_LEVEL_CONTRACT_,
    review_level_half_life_days:
      H3_REVIEW_LEVEL_HALF_LIFE_DAYS_,
    review_level_time_headroom_share:
      H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_
  };
}


function h3ReviewRenderRequest_(request) {
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
    return provider.openReview(request);
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
