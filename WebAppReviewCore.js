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
  'H3_REVIEW_LEVEL_V1';


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


function h3ReviewLevelForEntry_(
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
      Math.round(level)
    )
  );
}


function h3ReviewAttachHomeMetadata_(
  envelopes,
  evidence
) {
  var writtenIds =
    evidence.written_set_ids
      .slice();

  envelopes.forEach(
    function (envelope) {
      var entry = envelope.entry;
      if (!entry.review_kind) {
        entry.review_kind =
          envelope.kind;
      }

      entry.review_level =
        h3ReviewLevelForEntry_(
          envelope.kind,
          entry,
          evidence
        );
      entry.review_level_contract =
        H3_REVIEW_LEVEL_CONTRACT_;

      if (
        envelope.kind ===
          'WRITTEN' &&
        writtenIds.indexOf(
          String(entry.set_id || '')
        ) < 0
      ) {
        writtenIds.push(
          String(entry.set_id || '')
        );
      }
    }
  );

  writtenIds.sort();
  var ordinalBySet = {};
  writtenIds.forEach(
    function (setId, index) {
      ordinalBySet[setId] =
        index + 1;
    }
  );

  envelopes.forEach(
    function (envelope) {
      if (
        envelope.kind ===
          'WRITTEN'
      ) {
        envelope.entry
          .written_set_no =
          Number(
            ordinalBySet[
              String(
                envelope.entry
                  .set_id || ''
              )
            ] || 0
          );
      }
    }
  );
}


function h3ReviewHomeHistory_(
  spreadsheet
) {
  var envelopes = [];

  h3ReviewProviders_().forEach(
    function (provider) {
      provider
        .historyEntries(
          spreadsheet
        )
        .forEach(function (entry) {
          envelopes.push(
            h3ReviewHistoryEnvelope_(
              provider,
              entry
            )
          );
        });
    }
  );

  h3ReviewAttachHomeMetadata_(
    envelopes,
    h3ReviewSkillEvidenceIndex_(
      spreadsheet
    )
  );

  envelopes.sort(function (a, b) {
    if (a.answered_at !== b.answered_at) {
      return a.answered_at <
        b.answered_at
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
    current_learning:
      h3ReviewCurrentLearning_(
        spreadsheet
      ),
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
      H3_REVIEW_LEVEL_CONTRACT_
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
