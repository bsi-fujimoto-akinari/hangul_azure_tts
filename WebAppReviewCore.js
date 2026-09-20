/**
 * Review / HOME common core.
 *
 * This file owns only provider-neutral primitives, history aggregation,
 * current-learning arbitration, and request dispatch. The only active
 * provider remains Listening. Written is an intentionally inactive slot.
 */

var H3_REVIEW_WRITTEN_PROVIDER_FACTORY_ =
  null;


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
      'ALL',
      'NEEDS_REVIEW'
    ]
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
