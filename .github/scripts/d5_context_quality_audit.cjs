#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

const schedulerSource = fs.readFileSync(
  'WebAppFamilyScheduler.js',
  'utf8'
);
const prepSource = fs.readFileSync(
  'WebAppFamilySchedulerPreparation.js',
  'utf8'
);

const context = vm.createContext({
  console,
  JSON,
  Object,
  Array,
  String,
  Number,
  Math,
  RegExp,
  Error,
  hash_: text => crypto
    .createHash('sha256')
    .update(String(text), 'utf8')
    .digest('hex')
});
vm.runInContext(
  schedulerSource,
  context,
  { filename: 'WebAppFamilyScheduler.js' }
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectError(fn, code) {
  let message = '';
  try {
    fn();
  } catch (err) {
    message = String(err && err.message || err);
  }
  assert(
    message.indexOf(code) === 0,
    'Expected ' + code + ', got ' + message
  );
}

function d5Meta(questionText, withMarker = true) {
  const questions = [
    { q: 1, section: '筆2／語彙', question: 'x' },
    { q: 2, section: '筆3／文法', question: 'x' },
    { q: 3, section: '筆4／置換', question: 'x' },
    {
      q: 4,
      section: '筆5／共通',
      question: questionText
    },
    { q: 5, section: '筆6／応答', question: 'x' }
  ];
  if (withMarker) {
    questions[3].d5_context_quality = {
      policy_id: 'H3-D5-CONTEXT-QUALITY-20260926-V1',
      semantic_pass: true,
      line_profiles: ['CONTEXTUAL', 'CONTEXTUAL'],
      rationale_code: 'TWO_DISTINCT_CONTEXTS'
    };
  }
  return { questions };
}

const validate =
  context.h3FsWrittenD5ContextValidatePrepared_;

expectError(
  () => validate(
    'STD-B002-S2',
    d5Meta(
      '여행 계획을 (　　　).\n한 해의 목표를 (　　　).'
    )
  ),
  'WRITTEN_D5_CONTEXT_BOTH_LINES_BARE'
);

expectError(
  () => validate(
    'STD-B002-S2',
    d5Meta(
      '여행 전에 전체 일정을 미리 (　　　).\n' +
      '새해가 되면 한 해의 목표를 (　　　).',
      false
    )
  ),
  'WRITTEN_D5_CONTEXT_POLICY_MARKER_MISSING'
);

[
  [
    'NORMAL_CONTEXT',
    '여행 전에 전체 일정을 미리 (　　　).\n' +
      '새해가 되면 한 해의 목표를 (　　　).'
  ],
  [
    'OFF-H3-P5-030',
    '오이를 된장에 (　　　) 먹었다.\n' +
      '여기에 도장을 (　　　) 주세요.'
  ],
  [
    'OFF-H3-P5-019',
    '할머님께 새해 인사를 (         ).\n' +
      '시험공부에 열을 (         ).'
  ]
].forEach(([id, text]) => {
  const result = validate(
    'STD-B002-S2',
    d5Meta(text)
  );
  assert(
    result.applied === true &&
      result.result === 'PASS',
    id + ' did not pass.'
  );
});

const historical = validate(
  'STD-B002-S1',
  d5Meta(
    '여행 계획을 (　　　).\n한 해의 목표를 (　　　).',
    false
  )
);
assert(
  historical.applied === false &&
    historical.result === 'PREPOLICY_BYPASS',
  'Prepolicy stage was not bypassed.'
);

const officialP5 = [
  ['OFF-H3-P5-001','어머님, 반찬은 이 (       )에 담을까요?\n그는 (       )가/이 큰 사람이니까 앞으로 큰일을 할 것이다.'],
  ['OFF-H3-P5-002','아기가 너무 귀여워서 눈을 (        ) 못하겠다.\n엄마, 벽에 붙어 있는 이 가수 사진은 절대로 (       ) 마세요.'],
  ['OFF-H3-P5-003','화가 (        ) 문을 세게 닫고 나와 버렸다.\n밖에서 고양이 우는 소리가 (        ) 창문을 열어 보았다.'],
  ['OFF-H3-P5-004','저에게 늘 (　　) 써 주셔서 정말 고맙습니다.\n(　　)이 급해서 뛰어 가다가 넘어져 버렸다.'],
  ['OFF-H3-P5-005','태양은 동쪽에서 떠서 서쪽으로 (　　).\n우리 팀은 저 팀에게는 매번 (　　).'],
  ['OFF-H3-P5-006','이 나물은 좀 (　　) 맛이 나면서도 아주 맛있다.\n저기 초록색 모자를 (　　) 아이가 우리 애예요.'],
  ['OFF-H3-P5-007','담배 (　　) 때문에 목이 아프다.\n그 배우의 (　　)에 감동을 받았다.'],
  ['OFF-H3-P5-008','서둘러서 뛰어오다가 지갑을 ( 　　　 ).\n슬픈 영화를 보고 눈물을 ( 　　　 ).'],
  ['OFF-H3-P5-009','사람들의 (　　)을 끌 만큼 언니는 예쁘다.\n언니는 (　　)이 너무 높아서 남자 친구가 없다.'],
  ['OFF-H3-P5-010','모두 능력이 있는 청년들이라 (　　)이 기대가 된다.\n차가 우리 집 (　　)을 지나가는 소리가 들렸다.'],
  ['OFF-H3-P5-011','마당에 (　　　  )들이 많이 자랐다.\n(　　　)로/으로 포스터를 붙이세요.'],
  ['OFF-H3-P5-012','길이 (   　　　　     ) 좀 늦을 것 같습니다.\n머리가 (   　　　　     ) 좀 쉬고 싶어요.'],
  ['OFF-H3-P5-013','나는 책임 (   　　　 ) 싫으니까 안 할게요.\n꽃이 다 (　　　　) 전에 구경하러 가요.'],
  ['OFF-H3-P5-014','눈에 (　　　  )가 들어가서 눈물이 났어요.\n사정이 있어서 시험이 (　　　　)가 되었습니다.'],
  ['OFF-H3-P5-015','길던 머리를 짧게 (  　　　  ).\n일을 못하는 직원의 목을 (　　　　  ).'],
  ['OFF-H3-P5-016','(   　  ) 약이 몸에 좋다고 한다.\n저기 초록색 모자를 (  　  ) 아이가 제 동생이에요.'],
  ['OFF-H3-P5-017','그것은 절대 (　　) 밖에 내면 안 돼요.\n모든 사람들이 (　　)을 모아서 칭찬했다.'],
  ['OFF-H3-P5-018','우리 오빠는 키가 커서 그런지 (        )도 크다.\n그 친구랑 나는 (        )이 잘 맞는다.'],
  ['OFF-H3-P5-019','할머님께 새해 인사를 (         ).\n시험공부에 열을 (         ).'],
  ['OFF-H3-P5-020','건강을 걱정해서 국을 일부러 (         ) 끓였나 봐요.\n내 말을 듣고 그는 (         ) 웃었다.'],
  ['OFF-H3-P5-021','나는 여동생과 말로 싸우면 매번 (    ).\n태양은 동쪽에서 떠서 서쪽으로 (    ).'],
  ['OFF-H3-P5-022','(      )도 안 되는 소리 하지 마세요.\n(      )을 아끼지 말고 어서 얘기해 봐요.'],
  ['OFF-H3-P5-023','공장이 있었던 (　　 )에 지금 아파트를 짓고 있다.\n열심히 노력한 결과 높은 (　　 )에 앉게 되었다.'],
  ['OFF-H3-P5-024','많이 걱정했는데 일이 잘 (　　　　).\n미안하다는 말을 들으니 화가 (　　　　).'],
  ['OFF-H3-P5-025','할머니께서 저를 (　　) 주셨습니다.\n나도 저 사람처럼 수염을 (　　) 보고 싶다.'],
  ['OFF-H3-P5-026','나는 (         )가/이 약해서 심한 운동을 할 수 없다.\n도쿄는 일본의 (          )라고/이라고 할 수 있다.'],
  ['OFF-H3-P5-027','꽃이 다 (      ) 전에 꽃구경 한번 가죠.\n그 사람은 책임을 (      ) 싫으니까 사라진 것 아닐까요?'],
  ['OFF-H3-P5-028','그는 (          )에 사는 어려운 분들을 도와주고 있습니다.\n그는 거짓말을 많이 하니까 (          )하지 않는 게 좋을 것 같습니다.'],
  ['OFF-H3-P5-029','(　　)이 너무 무거워서 호텔에 맡겼다.\n가족에게 (　　)이 되고 싶지 않아 나가서 살기로 했다.'],
  ['OFF-H3-P5-030','오이를 된장에 (　　　) 먹었다.\n여기에 도장을 (　　　) 주세요.'],
  ['OFF-H3-P5-031','공무원 시험을 (　　　) 붙으면 같이 한잔합시다.\n후추를 (　　　) 드시면 더 맛있어요.'],
  ['OFF-H3-P5-032','충격이 너무 커서 (  　   )을 잃고 쓰러졌다.\n이제 저도 (   　    ) 차리고 열심히 살아 보겠습니다.'],
  ['OFF-H3-P5-033','주인공을 맡은 배우가 (　　　)를/을 잘해서 감동했습니다.\n자료에 문제가 발견돼서 오늘 회의는 (　　　)가/이 되었습니다.'],
  ['OFF-H3-P5-034','어느새 해가 (　　　) 하늘에 달이 떠 있었다.\n사장님이 이번 사건의 책임을 (　　　) 회사를 떠났다.'],
  ['OFF-H3-P5-035','좀 더 (　　　　) 있게 말하는 게 좋을 것 같아요.\n자기 (　　　　)의 경험을 얘기해 보세요.'],
  ['OFF-H3-P5-036','（　　　） 농담은 그만하시지요.\n이 된장국 좀 （　　　） 것 같은데요.'],
  ['OFF-H3-P5-037','흰머리가 있네요. (　　) 드릴까요?\n좋아하는 걸 하나만 (　　) 주세요.'],
  ['OFF-H3-P5-038','졸업 전에 자격증을 (　　) 위해서 노력했다.\n딸기를 (　　) 전에 색깔을 잘 확인하세요.'],
  ['OFF-H3-P5-039','교통사고를 내고 도망을 가던 사람이 경찰한테 (　　　).\n미팅 날이 다음 주 월요일로 (　　　).']
];

let falsePositiveCount = 0;
officialP5.forEach(([id, text]) => {
  try {
    validate(
      'STD-B002-S2',
      d5Meta(text)
    );
  } catch (err) {
    falsePositiveCount += 1;
    console.error(
      id + ': ' +
      String(err && err.message || err)
    );
  }
});
assert(
  officialP5.length === 39,
  'Official P5 fixture count drifted.'
);
assert(
  falsePositiveCount === 0,
  'Official P5 false-positive count=' +
    falsePositiveCount
);

[
  'H3-FAMILY-SCHEDULER-W-PREP-20260926-V3',
  'H3_FAMILY_SCHEDULER_WRITTEN_AUTHORING_REQUEST_V3',
  'H3-D5-CONTEXT-QUALITY-20260926-V1',
  'authoring_constraints',
  'require_two_independent_natural_contexts:true',
  'reject_both_bare_object_blank:true',
  'allow_short_official_style:true',
  'forbid_padding:true',
  'echo_required_in_question_meta',
  'H3-WRITTEN-EXPLANATION-STATIC-QA-20260926-V1',
  'explanation_static_qa',
  'hard_fail_blocking:true',
  'heuristic_warnings_blocking:false'
].forEach(token => {
  assert(
    prepSource.includes(token),
    'Written preparation contract missing: ' + token
  );
});

const legacyIdentity =
  context.h3FsAuthoringStableTargetIdentity_(
    '3級',
    'W',
    {
      target_kind: 'WRITTEN_STAGE',
      target_id: 'STD-B002-S2'
    },
    ''
  );
assert(
  legacyIdentity.idempotency_key ===
    'H3AQK-aec46f2fa2e87012d81dc793514c15d5366ddc0f37de18a99ed7ee2de213314e',
  'Legacy authoring idempotency key changed.'
);

const generation =
  context.h3FsAuthoringGeneration_(
    'W',
    {
      authoring_request: {
        contract_id:
          'H3-FAMILY-SCHEDULER-W-PREP-20260926-V3',
        schema:
          'H3_FAMILY_SCHEDULER_WRITTEN_AUTHORING_REQUEST_V3',
        authoring_constraints: {
          d5_context: {
            policy_id:
              'H3-D5-CONTEXT-QUALITY-20260926-V1'
          },
          explanation_static_qa: {
            contract_id:
              'H3-WRITTEN-EXPLANATION-STATIC-QA-20260926-V1'
          }
        }
      }
    }
  );
assert(
  generation.includes(
    'H3-FAMILY-SCHEDULER-AUTHORING-GENERATION-20260926-V2'
  ),
  'Written V3 authoring generation missing.'
);

const v2Identity =
  context.h3FsAuthoringStableTargetIdentity_(
    '3級',
    'W',
    {
      target_kind: 'WRITTEN_STAGE',
      target_id: 'STD-B002-S2'
    },
    generation
  );
assert(
  v2Identity.idempotency_key !==
    legacyIdentity.idempotency_key,
  'Generation-aware key did not rotate.'
);
assert(
  v2Identity.authoring_generation === generation,
  'Generation not carried by stable identity.'
);

assert(
  context.h3FsAuthoringNeedsGenerationRebind_(
    {
      authoring_generation: generation
    },
    {
      exact: null,
      representative: {
        status: 'OPEN',
        authoring_generation: ''
      }
    }
  ) === true,
  'Previous-generation OPEN job did not require rebind.'
);
assert(
  context.h3FsAuthoringNeedsGenerationRebind_(
    {
      authoring_generation: generation
    },
    {
      exact: {
        status: 'OPEN',
        authoring_generation: generation
      },
      representative: {
        status: 'OPEN',
        authoring_generation: generation
      }
    }
  ) === false,
  'Exact V2 job incorrectly requires rebind.'
);

assert(
  context.h3FsAuthoringSafeOpenSupersedeCandidate_({
    status: 'OPEN',
    attempt_count: 0,
    result_ref: '',
    result_sha256: '',
    error: '',
    claimed_at: '',
    completed_at: ''
  }) === true,
  'Safe untouched OPEN candidate rejected.'
);
assert(
  context.h3FsAuthoringSafeOpenSupersedeCandidate_({
    status: 'OPEN',
    attempt_count: 1,
    result_ref: '',
    result_sha256: '',
    error: '',
    claimed_at: '',
    completed_at: ''
  }) === false,
  'Attempted OPEN candidate incorrectly accepted.'
);
assert(
  schedulerSource.includes(
    'function h3FamilySchedulerD5AuthoringGenerationRebind()'
  ) &&
  schedulerSource.includes(
    "statusCell.setValue('SUPERSEDED')"
  ) &&
  schedulerSource.includes(
    'FAMILY_SCHEDULER_AUTHORING_REBIND_READBACK_FAIL'
  ),
  'D5 rebind transaction contract missing.'
);

const validatorCalls = (
  schedulerSource.match(
    /h3FsWrittenD5ContextValidatePrepared_\s*\(/g
  ) || []
).length;
assert(
  validatorCalls === 3,
  'D5 validator call-site count must be definition + readiness + issue.'
);

console.log(
  'D5 context-quality regression: PASS; ' +
  'official_p5=39; false_positive_count=0'
);
