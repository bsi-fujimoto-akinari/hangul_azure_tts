/**
 * H3 R3-01 SYSTEM_TEST Web App POC.
 * Non-learning only. No Sheet/runtime/history mutation is authorized here.\n * CI sync marker: R3-01 route fix verified after audited manifest push.
 */

function h3WebDoGet_(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.bootJson = JSON.stringify(h3WebBootRequest_(e));
  return template
    .evaluate()
    .setTitle('H3 5L SYSTEM TEST')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getListeningWebSet(request) {
  validateSystemTestRenderRequest_(request);
  return buildSystemTestRenderPayload_();
}

function submitListeningWebAnswers(request) {
  return gradeSystemTestSubmission_(request);
}

function h3WebBootRequest_(e) {
  var expected = H3_WEB_SYSTEM_TEST_FIXTURE.set_id;
  var mode = 'SYSTEM_TEST';
  var setId = expected;

  if (e && e.parameter) {
    if (e.parameter.mode === 'SYSTEM_TEST') mode = 'SYSTEM_TEST';
    if (e.parameter.set_id === expected) setId = expected;
  }

  return {
    schema: 'H3_WEB_RENDER_REQUEST_V1',
    mode: mode,
    set_id: setId
  };
}

function h3Sha256Hex_(value) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return digest.map(function (b) {
    var n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function h3ExactDriveImageDataUri_(fileId, expectedSha256) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  var bytes = blob.getBytes();
  var actualSha256 = h3Sha256Hex_(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new Error('K1_IMAGE_SHA256_MISMATCH');
  }
  var mime = blob.getContentType() || 'image/png';
  return 'data:' + mime + ';base64,' + Utilities.base64Encode(bytes);
}
