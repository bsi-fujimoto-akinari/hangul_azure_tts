/**
 * Shared H3 Web transaction helpers.
 *
 * H3TX IDs form one global namespace across SYSTEM_TEST, 5L, 5W, Reading and staged Translation.
 * Call h3NextWebTxnId_ only while the caller holds ScriptLock.
 */

var H3_WEB_TXN_JOURNAL_SHEETS = [
  'listening_web_test_txn_v1',
  'listening_web_txn_v1',
  'written_web_txn_v1',
  'reading_web_txn_v1',
  'translation_web_txn_v1',
  'translation_web_txn_v2'
];

function h3NextWebTxnIdFromRows_(datePart, journalRows) {
  var normalizedDate = String(datePart || '');
  if (!/^\d{8}$/.test(normalizedDate)) {
    throw new Error('WEB_TXN_DATE_INVALID');
  }

  var prefix = 'H3TX-' + normalizedDate + '-';
  var max = 0;
  var seen = {};

  Object.keys(journalRows || {}).forEach(function (sheetName) {
    var rows = journalRows[sheetName] || [];
    rows.forEach(function (row) {
      var value = String(
        Array.isArray(row) ? row[0] || '' : row || ''
      );
      if (!/^H3TX-\d{8}-\d{6}$/.test(value)) return;

      if (Object.prototype.hasOwnProperty.call(seen, value)) {
        throw new Error(
          'WEB_TXN_DUPLICATE_AUTHORITY:' + value
        );
      }
      seen[value] = sheetName;

      if (value.indexOf(prefix) !== 0) return;
      max = Math.max(
        max,
        Number(value.slice(prefix.length))
      );
    });
  });

  var next = String(max + 1);
  while (next.length < 6) next = '0' + next;
  return prefix + next;
}

function h3NextWebTxnId_(spreadsheet) {
  if (!spreadsheet) {
    throw new Error('WEB_TXN_SPREADSHEET_REQUIRED');
  }

  var journalRows = {};
  H3_WEB_TXN_JOURNAL_SHEETS.forEach(function (sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) {
      journalRows[sheetName] = [];
      return;
    }

    journalRows[sheetName] = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 1)
      .getDisplayValues();
  });

  return h3NextWebTxnIdFromRows_(
    Utilities.formatDate(
      new Date(),
      'Asia/Tokyo',
      'yyyyMMdd'
    ),
    journalRows
  );
}
