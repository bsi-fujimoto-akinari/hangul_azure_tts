#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');

const backfill = fs.readFileSync('ReviewAudioBackfill.js', 'utf8');
const web = fs.readFileSync('WebApp.js', 'utf8');
const architecture = fs.readFileSync('H3_REVIEW_ARCHITECTURE.md', 'utf8');

const contract = 'H3-REVIEW-AUDIO-PROSPECTIVE-ENSURE-20260926-V1';

[
  contract,
  'function h3ReviewAudioEnsureForLockedReview_(',
  'function h3ReviewAudioAssertSetReady_(',
  'h3ReviewAudioPlanForSet_(',
  'h3ReviewAudioGeneratePlannedAsset_(',
  'LockService.getScriptLock()',
  'lock.waitLock(30000)',
  "'REVIEW_AUDIO_ENSURE_SET_COUNT:'",
  "'REVIEW_AUDIO_ENSURE_SLOT_COUNT:'",
  "'REVIEW_AUDIO_ENSURE_ROW_INVALID:'",
  "'H3_REVIEW_AUDIO_PROSPECTIVE_ENSURE_RESULT_V1'"
].forEach(token => {
  assert(
    backfill.includes(token),
    'Prospective Review-audio implementation missing: ' + token
  );
});

assert(
  architecture.includes('## 48. Prospective Review audio lifecycle ensure'),
  'Prospective Review-audio architecture section missing.'
);
assert(
  architecture.includes(contract),
  'Prospective Review-audio contract ID missing from architecture.'
);

const calls = (web.match(/h3ReviewAudioEnsureForLockedReview_\(/g) || []).length;
assert.strictEqual(
  calls,
  3,
  'WebApp must contain exactly three production ensure calls.'
);

function assertOrder(label, segment, orderedTokens) {
  let cursor = -1;
  for (const token of orderedTokens) {
    const next = segment.indexOf(token, cursor + 1);
    assert(
      next >= 0,
      label + ' missing token: ' + token
    );
    assert(
      next > cursor,
      label + ' token order invalid: ' + token
    );
    cursor = next;
  }
}

const readingStart = web.indexOf("if (\n      request.surface_family ===\n        'READING'");
const translationStart = web.indexOf("if (\n      request.surface_family ===\n        'TRANSLATION'");
const writtenStart = web.indexOf('    var writtenResult =');
assert(readingStart >= 0 && translationStart > readingStart && writtenStart > translationStart);

const reading = web.slice(readingStart, translationStart);
const translation = web.slice(translationStart, writtenStart);
const written = web.slice(writtenStart, web.indexOf('\n    return writtenResult;', writtenStart) + 30);

assertOrder('READING', reading, [
  "h3SurfaceReviewEnsure_(\n          'READING'",
  "h3ReviewAudioEnsureForLockedReview_(\n        'READING'",
  'h3ReviewHomeIndexUpsertAfterCommit_',
  'h3SurfaceReviewOpen_'
]);

assertOrder('TRANSLATION', translation, [
  "h3SurfaceReviewEnsure_(\n            'TRANSLATION'",
  "h3ReviewAudioEnsureForLockedReview_(\n        'TRANSLATION'",
  'h3ReviewHomeIndexUpsertAfterCommit_',
  'h3SurfaceReviewOpen_'
]);

assertOrder('5W', written, [
  'h3WrittenAnswerSync_(',
  'h3WrittenProductionReviewEnsure_(',
  "h3ReviewAudioEnsureForLockedReview_(\n      '5W'",
  'getWrittenProductionPersistentReviewPayload_(',
  'h3ReviewHomeIndexUpsertAfterCommit_('
]);

const readBoundary = web.slice(
  web.indexOf('function h3GetListeningWebSetCore_('),
  web.indexOf('function submitListeningWebAnswers(')
);
assert(
  !readBoundary.includes('h3ReviewAudioEnsureForLockedReview_('),
  'Review-audio generation must not occur in the Review/read path.'
);

console.log('Prospective Review audio lifecycle contract: PASS');
