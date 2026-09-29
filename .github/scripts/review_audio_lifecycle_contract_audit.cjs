#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const backfill = fs.readFileSync('ReviewAudioBackfill.js', 'utf8');
const runtime = fs.readFileSync('WebAppCloudflareRuntime.js', 'utf8');
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
  const normalized = segment.replace(/\s+/g, ' ');
  let cursor = -1;
  for (const token of orderedTokens) {
    const next = normalized.indexOf(token, cursor + 1);
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

const submitStart = web.indexOf(
  'function h3SubmitListeningWebAnswersCore_('
);
assert(submitStart >= 0, 'Submit core missing.');

const submit = web.slice(submitStart);
const readingStart = submit.indexOf('      var readingResult =');
const translationStart = submit.indexOf('      var translationResult =');
const writtenStart = submit.indexOf('    var writtenResult =');
assert(
  readingStart >= 0 &&
  translationStart > readingStart &&
  writtenStart > translationStart,
  'Submit family boundaries are missing or reordered.'
);

const reading = submit.slice(readingStart, translationStart);
const translation = submit.slice(translationStart, writtenStart);
const written = submit.slice(
  writtenStart,
  submit.indexOf('\n    return writtenResult;', writtenStart) + 30
);

assertOrder('READING', reading, [
  "h3SurfaceReviewEnsure_( 'READING'",
  "h3ReviewAudioEnsureForLockedReview_( 'READING'",
  'h3ReviewHomeIndexUpsertAfterCommit_',
  'h3SurfaceReviewOpen_'
]);

assertOrder('TRANSLATION', translation, [
  "h3SurfaceReviewEnsure_( 'TRANSLATION'",
  "h3ReviewAudioEnsureForLockedReview_( 'TRANSLATION'",
  'h3ReviewHomeIndexUpsertAfterCommit_',
  'h3SurfaceReviewOpen_'
]);

assertOrder('5W', written, [
  'h3WrittenAnswerSync_(',
  'h3WrittenProductionReviewEnsure_(',
  "h3ReviewAudioEnsureForLockedReview_( '5W'",
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

const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(backfill, sandbox);
vm.runInContext(runtime, sandbox);

const structuredD4 = sandbox.h3ReviewAudioLegacy5WScript_({
  section: 'D4',
  correct_answer_text: '담당할게요',
  question_surface: {
    rendered: '次の下線部と最も近い意味のものを選んでください。\n이번 일은 제가 맡을게요.'
  },
  explanation: {
    learning_blocks: [
      {
        usage:
          '맡다 / 담당하다\n' +
          '이번 일은 제가 맡을게요.\n' +
          '→ 今回の仕事は私が引き受けます。\n' +
          '이번 일은 제가 담당할게요.\n' +
          '→ 今回の仕事は私が担当します。'
      }
    ]
  }
});
assert.strictEqual(
  structuredD4,
  '이번 일은 제가 맡을게요.\n이번 일은 제가 담당할게요.',
  'Structured D4 explanation overlay must reconstruct the canonical 5W audio script.'
);

const bracketPriorityD4 = sandbox.h3ReviewAudioLegacy5WScript_({
  section: 'D4',
  correct_answer_text: '한 번 더 살펴봤어요.',
  question_surface: {
    rendered:
      '次の下線部と最も近い意味のものを選んでください。\n' +
      '회의 시간이 바뀌었다는 말을 듣고 일정을 [다시 확인했어요].'
  },
  explanation: {
    learning_blocks: [{
      usage:
        '다시 확인하다\n' +
        '일정을 한 번 더 살펴봤어요.'
    }]
  }
});
assert.strictEqual(
  bracketPriorityD4,
  '회의 시간이 바뀌었다는 말을 듣고 일정을 [다시 확인했어요].\n' +
    '회의 시간이 바뀌었다는 말을 듣고 일정을 한 번 더 살펴봤어요.',
  'Bracketed D4 replacement must preserve the full original context before structured overlay fallback.'
);

const rem09Target5Canonical = sandbox.h3ReviewAudioCanonicalize5WScript_(
  {
    question_surface: {
      rendered:
        '次の文全体と最も近い意味のものを選んでください。\n' +
        '이 영화는 생각보다 재미있어서 시간 가는 줄 몰랐어요.'
    },
    correct_answer_text:
      '너무 재미있어서 시간이 빨리 간 것처럼 느꼈어요.'
  },
  'D4',
  '이 영화는 생각보다 재미있어서 시간 가는 줄 몰랐어요.\n' +
    '너무 재미있어서 시간이 빨리 간 것처럼 느꼈어요 が最も近い。',
  'H3-20260914-02'
);
assert.strictEqual(
  rem09Target5Canonical,
  '이 영화는 생각보다 재미있어서 시간 가는 줄 몰랐어요.\n' +
    '너무 재미있어서 시간이 빨리 간 것처럼 느꼈어요.'
);
assert.strictEqual(
  crypto.createHash('sha256').update(rem09Target5Canonical).digest('hex'),
  '7a68b6db4162e4ebb0065f5574eda0cf32f38896f2f58ebbcecc264603471614'
);

const rem09Target7Canonical = sandbox.h3ReviewAudioCanonicalize5WScript_(
  {
    question_surface: {
      rendered:
        '次の文全体と最も近い意味のものを選んでください。\n' +
        '그는 작은 실수도 놓치지 않고 꼼꼼하게 확인해요.'
    },
    correct_answer_text: '세세한 부분까지 주의 깊게 살펴봐요.'
  },
  'D4',
  '작은 실수도 놓치지 않고 꼼꼼하게 확인하다≈세세한 부분까지 주의 깊게 살펴보다.\n' +
    '꼼꼼하다=細かい部分まで注意深く丁寧だ。',
  'H3-20260914-04'
);
assert.strictEqual(
  rem09Target7Canonical,
  '그는 작은 실수도 놓치지 않고 꼼꼼하게 확인해요.\n' +
    '세세한 부분까지 주의 깊게 살펴봐요.'
);
assert.strictEqual(
  crypto.createHash('sha256').update(rem09Target7Canonical).digest('hex'),
  '4a681bccc1bfe81aeea20ec4707dcc7cb7e86866526c8c7fa29dd30801b018d3'
);

assert.throws(
  () => sandbox.h3ReviewAudioCanonicalize5WScript_(
    {
      question_surface: {rendered: '다른 문장입니다.'},
      correct_answer_text:
        '너무 재미있어서 시간이 빨리 간 것처럼 느꼈어요.'
    },
    'D4',
    'irrelevant',
    'H3-20260914-02'
  ),
  /REVIEW_AUDIO_REM09_D4_SOURCE_MISMATCH/,
  'REM-09 D4 canonicalization must fail closed on source drift.'
);

for (const token of [
  "H3_REVIEW_AUDIO_REM09_D4_REPAIR_MODE_='REM09_D4_PARITY_REPAIR'",
  "'H3-20260914-02':{",
  "'H3-20260914-04':{",
  "old_hash:'968137e9c373c7d286b29ea1b94e7aa1589a991aabaf5052c23d2d7877dd2f4a'",
  "old_hash:'a007bad415d99c991a2a7704d2ba0225ac5cd80ce5b9a1bb0fd96a5fb0f797c6'",
  'function runRem09D4AudioParityRepair(targetSetId)',
  "retire_mode:'STALE_REPLACED_ARCHIVE'"
]) {
  assert(
    backfill.includes(token),
    'Missing bounded REM-09 D4 parity repair contract token: ' + token
  );
}

const target2Expected =
  '요즘 회사 일이 많아서 아주 바빠요.\n' +
  '할 일이 많아서 정신이 없어요.';

const target2Payload = {
  schema: 'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1',
  surface_family: '5W',
  set_id: 'H3-20260913-02',
  sections: [
    {
      section: 'D2',
      correct_answer_text: '기뻤어요',
      question_surface: {
        rendered: '오랫동안 준비한 일이 잘 끝나서 정말 (　).'
      },
      explanation: {}
    },
    {
      section: 'D3',
      correct_answer_text: '하기로 했어요',
      question_surface: {
        rendered: '내일부터 운동을 (　).'
      },
      explanation: {}
    },
    {
      section: 'D4',
      correct_answer_text: '할 일이 많아서 정신이 없어요',
      question_surface: {
        rendered:
          '次の文全体と最も近い意味のものを選んでください。\n' +
          '요즘 회사 일이 많아서 아주 바빠요.\n' +
          '① 할 일이 별로 없어요\n' +
          '② 할 일이 많아서 정신이 없어요\n' +
          '③ 회사 일이 재미없어요\n' +
          '④ 회사에 자주 늦어요'
      },
      explanation: {
        reason: 'runtime overlay fixture',
        learning_blocks: [
          {
            usage:
              '바쁘다 / 정신이 없다\n' +
              '요즘 일이 많아서 정신이 없어요.'
          }
        ]
      }
    },
    {
      section: 'D5',
      correct_answer_text: '신경',
      question_surface: {
        rendered:
          '시험을 앞두고 공부에 (　)을 쓰고 있어요.\n' +
          '요즘 건강에 더 (　)을 써야겠어요.'
      },
      explanation: {}
    },
    {
      section: 'D6',
      correct_answer_text: '정말 축하해요.',
      question_surface: {
        rendered:
          'A：시험에 합격했다면서요?\n' +
          'B：네. 좋은 결과가 나왔어요.\n' +
          'A：(　)'
      },
      explanation: {}
    }
  ]
};

target2Payload.sections.forEach(section => {
  section.script_text = section.question_surface.rendered;
});

const target2Texts =
  sandbox.h3RuntimeReviewAudioTexts_(target2Payload);
assert.strictEqual(
  target2Texts.D4,
  target2Expected,
  'REM-09 target 2 must reconstruct the canonical D4 audio text.'
);

assert.strictEqual(
  crypto.createHash('sha256').update(target2Texts.D4).digest('hex'),
  'f8caafd5ffdcf4b41aff5194a1e5f775ceeb772ee938fcaaa20cb93e65a66f07',
  'REM-09 target 2 reconstructed D4 text must match the locked asset text hash.'
);

const target2Question = target2Payload.sections[2];
assert.throws(
  () => sandbox.h3RuntimeReviewD4FallbackScript_(
    target2Payload,
    target2Question,
    new Error('REVIEW_AUDIO_5W_D4_ORIGINAL_MISSING')
  ),
  /REVIEW_AUDIO_5W_D4_ORIGINAL_MISSING/,
  'D4 fallback must not catch unrelated Review-audio errors.'
);
assert.throws(
  () => sandbox.h3RuntimeReviewD4FallbackScript_(
    Object.assign({}, target2Payload, {schema: 'OTHER_SCHEMA'}),
    target2Question,
    new Error('REVIEW_AUDIO_5W_D4_REPLACEMENT_UNRESOLVED')
  ),
  /REVIEW_AUDIO_5W_D4_REPLACEMENT_UNRESOLVED/,
  'D4 fallback must be limited to persistent Written Review payloads.'
);
assert.throws(
  () => sandbox.h3RuntimeReviewD4FallbackScript_(
    target2Payload,
    Object.assign({}, target2Question, {section: 'D3'}),
    new Error('REVIEW_AUDIO_5W_D4_REPLACEMENT_UNRESOLVED')
  ),
  /REVIEW_AUDIO_5W_D4_REPLACEMENT_UNRESOLVED/,
  'D4 fallback must not apply to another section.'
);

sandbox.SpreadsheetApp = {
  openById: () => ({})
};
sandbox.H3_WEB_RUNTIME_SPREADSHEET_ID = 'TEST_ONLY';
sandbox.h3ReviewAudioExpectedBindings_ = () => [{
  slot_key: 'D4',
  surface_family: '5W',
  set_id: 'H3-20260913-02',
  target: 'sections',
  target_index: 2,
  q_no: 3
}];
sandbox.h3ReviewAudioBindingResolve_ = () => ({
  audio_text_sha256: '0'.repeat(64)
});
sandbox.h3ReviewAudioSha256_ = text =>
  crypto.createHash('sha256').update(String(text || '')).digest('hex');

assert.throws(
  () => sandbox.h3RuntimeHydrateReviewAudio_(target2Payload),
  /ASSET_HASH_MISMATCH/,
  'Runtime D4 fallback must remain fail-closed behind the locked asset hash.'
);

console.log('Prospective Review audio lifecycle contract: PASS');
