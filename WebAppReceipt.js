/**
 * H3 Web receipt contract shared by SYSTEM_TEST, 5L and future 5W.
 */

var H3_WEB_RECEIPT_SCHEMA = 'H3_WEB_SYNC_V1';

function h3BuildWebReceipt_(setId, txnId) {
  if (!setId || !txnId) {
    throw new Error('RECEIPT_ID_MISSING');
  }

  return [
    '[H3_WEB_SYNC]',
    'SET_ID=' + String(setId),
    'TXN_ID=' + String(txnId),
    'STATUS=COMMITTED'
  ].join('\n');
}

function h3ParseWebReceipt_(text) {
  var lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split('\n');

  if (
    lines.length !== 4 ||
    lines[0] !== '[H3_WEB_SYNC]' ||
    lines[3] !== 'STATUS=COMMITTED'
  ) {
    throw new Error('INVALID_H3_WEB_RECEIPT');
  }

  var setMatch = /^SET_ID=(.+)$/.exec(lines[1]);
  var txnMatch = /^TXN_ID=(H3TX-\d{8}-\d{6})$/.exec(lines[2]);

  if (!setMatch || !txnMatch) {
    throw new Error('INVALID_H3_WEB_RECEIPT');
  }

  return {
    schema: H3_WEB_RECEIPT_SCHEMA,
    set_id: setMatch[1],
    txn_id: txnMatch[1],
    status: 'COMMITTED'
  };
}
