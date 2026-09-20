/**
 * Listening provider for the Review / HOME core.
 *
 * Existing transaction-backed, legacy, media, and replay implementations
 * remain authoritative in WebAppReviewPersistence.js. This adapter only
 * exposes them through the common provider contract.
 */

function h3ListeningReviewReplayRetired_() {
  throw new Error(
    'REVIEW_REPLAY_RETIRED'
  );
}


function h3ListeningReviewProvider_() {
  return {
    kind: 'LISTENING',
    order: 0,
    historyEntries:
      h3ListeningReviewHistoryEntries_,
    currentLearning:
      h3ListeningReviewCurrentLearning_,
    openReview:
      h3ListeningReviewOpen_,
    openMedia:
      h3ListeningReviewOpenMedia_,
    openReplay:
      h3ListeningReviewReplayRetired_,
    openReplayMedia:
      h3ListeningReviewReplayRetired_,
    gradeReplay:
      h3ListeningReviewReplayRetired_
  };
}


function h3ListeningReviewHistoryEntries_(
  spreadsheet
) {
  return h3ReviewHistoryEntries_(
    spreadsheet
  ).concat(
    h3LegacyReviewHistoryEntries_(
      spreadsheet
    )
  );
}


function h3ListeningReviewOpen_(request) {
  if (
    request &&
    request.legacy_review_id
  ) {
    return getLegacyPersistentReviewPayload_(
      request
    );
  }

  return getPersistentReviewPayload_(
    request
  );
}


function h3ListeningReviewOpenMedia_(
  request
) {
  if (
    request &&
    request.legacy_review_id
  ) {
    return getLegacyPersistentReviewMediaPayload_(
      request
    );
  }

  return getPersistentReviewMediaPayload_(
    request
  );
}


function h3ListeningReviewCurrentLearning_(
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

  var legacyRegistered =
    h3LegacyReviewRegisteredSetIds_(
      spreadsheet
    );

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
        !committed[setId] &&
        !legacyRegistered[setId]
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
