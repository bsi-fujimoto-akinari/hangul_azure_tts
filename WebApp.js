/**
 * H3 R3-01B SYSTEM_TEST Web App.
 * Non-learning only. No Sheet/runtime/history mutation is authorized here.
 * Media transport is optimized for mobile: exact Drive files stream on demand.
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

function h3DriveMediaDescriptor_(fileId, expectedMimeType, expectedSha256) {
  var file = DriveApp.getFileById(fileId);
  var mimeType = file.getMimeType();

  if (expectedMimeType && mimeType !== expectedMimeType) {
    throw new Error('MEDIA_MIME_MISMATCH:' + fileId);
  }

  if (expectedSha256) {
    var bytes = file.getBlob().getBytes();
    var actualSha256 = h3Sha256Hex_(bytes);
    if (actualSha256 !== expectedSha256) {
      throw new Error('MEDIA_SHA256_MISMATCH:' + fileId);
    }
  }

  var downloadUrl = file.getDownloadUrl();
  if (!downloadUrl) {
    throw new Error('MEDIA_DOWNLOAD_URL_UNAVAILABLE:' + fileId);
  }

  return {
    download_url: downloadUrl,
    view_url: file.getUrl(),
    mime_type: mimeType,
    size_bytes: file.getSize()
  };
}

function h3DriveUtf8Text_(fileId, maxBytes) {
  var file = DriveApp.getFileById(fileId);
  var size = file.getSize();
  if (size > maxBytes) {
    throw new Error('TEXT_FILE_TOO_LARGE:' + fileId);
  }

  var text = file.getBlob().getDataAsString('UTF-8');
  if (text && text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  return text;
}
