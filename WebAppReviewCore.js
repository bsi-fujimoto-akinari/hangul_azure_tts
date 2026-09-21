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
  'H3_REVIEW_PRIORITY_V3';

var H3_REVIEW_LEVEL_HALF_LIFE_DAYS_ =
  14;

var H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_ =
  0.40;

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

var H3_REVIEW_HOME_INDEX_HEADERS_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V2_;


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
  spreadsheet
) {
  var bySet = {};
  var bySkill = {};
  var writtenSetSeen = {};

  function add(
    kind,
    level,
    setId,
    skillId,
    result,
    includeWrittenSet
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

    var setKey =
      kind + '|' +
      normalizedLevel + '|' +
      normalizedSetId;
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
        'RESULT'
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

        add(
          'WRITTEN',
          levels[setId],
          setId,
          row[log.map.SKILL_ID],
          row[log.map.RESULT],
          false
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
          rowLevel(
            listening,
            row
          ),
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
          ],
          false
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
          rowLevel(
            written,
            row
          ),
          setId,
          row[
            written.map.SKILL_ID
          ],
          row[
            written.map.USER_RESULT
          ],
          true
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

  if (!isV1 && !isV2) {
    throw new Error(
      'REVIEW_HOME_INDEX_HEADER_MISMATCH'
    );
  }

  return {
    sheet: sheet,
    table: table,
    schema_version:
      isV2
        ? 'H3_REVIEW_HOME_INDEX_V2'
        : 'H3_REVIEW_HOME_INDEX_V1'
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

  if (candidates.length > 1) {
    throw new Error(
      'REVIEW_CURRENT_LEARNING_AMBIGUOUS'
    );
  }

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
      'H3_REVIEW_HOME_INDEX_V2_COMPAT',
    learning_surface_schema:
      'H3_LEARNING_SURFACE_V1',
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
