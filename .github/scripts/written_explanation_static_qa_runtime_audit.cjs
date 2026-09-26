#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
const staticQa = require('./written_explanation_static_qa.cjs');

const schedulerSource = fs.readFileSync(
  'WebAppFamilyScheduler.js',
  'utf8'
);
const runtimeSource = fs.readFileSync(
  'WebAppWrittenExplanationStaticQa.js',
  'utf8'
);
const fixtures = JSON.parse(
  fs.readFileSync(
    '.github/scripts/written_explanation_static_qa_fixtures.json',
    'utf8'
  )
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
  {filename:'WebAppFamilyScheduler.js'}
);
vm.runInContext(
  runtimeSource,
  context,
  {filename:'WebAppWrittenExplanationStaticQa.js'}
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function codes(items) {
  return [...new Set((items || []).map(x => x.code))].sort();
}

const futureCases = fixtures.cases.filter(
  x => x.mode === 'future'
);
let compared = 0;

function runtimePayload(payload) {
  const copy = JSON.parse(JSON.stringify(payload));
  copy.questions = Array.isArray(copy.questions) ? copy.questions : [];
  while (copy.questions.length < 5) {
    const qNo = copy.questions.length + 1;
    copy.questions.push({
      q_no:qNo,
      qa_meta:{
        correct_choice_surface:'중립',
        completed_answer_surface:'중립 문장을 확인해요.'
      },
      explanation:{
        reason:'중립적인 설명을 제공한다.',
        learning_blocks:[{
          form:'중립',
          usage:'意味関係を簡潔に整理する。',
          example_ko:'다른 예문을 사용해요.'
        }]
      }
    });
  }
  return copy;
}

futureCases.forEach(caseDef => {
  const stageId =
    caseDef.payload.stage_id || 'STD-B999-S1';
  const staticResult = staticQa.validatePayload(
    caseDef.payload,
    {mode:'future'}
  );
  const runtimeResult =
    context.h3FsWrittenExplanationStaticQaEvaluatePrepared_(
      stageId,
      runtimePayload(caseDef.payload)
    );

  assert(
    runtimeResult.applied === true,
    caseDef.id + ': runtime gate unexpectedly bypassed'
  );
  assert(
    JSON.stringify(runtimeResult.hard_fail_codes) ===
      JSON.stringify(codes(staticResult.hard_failures)),
    caseDef.id + ': runtime/static hard-code mismatch'
  );
  assert(
    runtimeResult.result === staticResult.result,
    caseDef.id + ': runtime/static result mismatch'
  );
  compared += 1;
});

const original = fixtures.cases.find(
  x => x.id === 'historical_5w19_original_locked'
);
const approved = fixtures.cases.find(
  x => x.id === 'historical_5w19_approved_overlay'
);
assert(original && approved, '5W #19 regression fixtures missing');

const oldResult = staticQa.validatePayload(
  original.payload,
  {mode:'historical'}
);
const approvedResult = staticQa.validatePayload(
  approved.payload,
  {mode:'historical'}
);

function q4RedundancyMax(result) {
  const values = result.metrics
    .filter(x =>
      x.kind === 'reason_block_redundancy' &&
      Number(x.q_no) === 4
    )
    .map(x => Number(x.metrics.token_jaccard || 0));
  assert(values.length > 0, '5W #19 Q4 redundancy telemetry missing');
  return Math.max(...values);
}

const oldQ4 = q4RedundancyMax(oldResult);
const approvedQ4 = q4RedundancyMax(approvedResult);

assert(
  oldQ4 >= 0.5,
  '5W #19 original redundancy regression not detected'
);
assert(
  approvedQ4 < 0.5,
  '5W #19 approved rewrite still crosses calibration candidate'
);
assert(
  oldResult.result === 'PASS' &&
  approvedResult.result === 'PASS',
  'Historical regression fixtures must remain report-only'
);
assert(
  oldResult.hard_failures.some(
    x => x.code === 'EXPL_PRON_COVERAGE_MISSING'
  ) &&
  approvedResult.hard_failures.some(
    x => x.code === 'EXPL_PRON_COVERAGE_MISSING'
  ),
  'Historical pronunciation coverage diagnostic drifted'
);

const combinedSource = schedulerSource + '\n' + runtimeSource;
const callCount = (
  combinedSource.match(
    /h3FsWrittenExplanationStaticQaValidatePrepared_\s*\(/g
  ) || []
).length;
assert(
  callCount === 3,
  'Explanation QA call count must be definition + readiness + issue'
);

[
  'EXPL_EXAMPLE_EXACT_ANSWER_DUPLICATE',
  'EXPL_LEARNER_ANSWER_META_FORBIDDEN',
  'EXPL_GENERIC_TEST_META_FORBIDDEN',
  'EXPL_META_POLITE_REGISTER',
  'EXPL_HANJA_STRUCTURE_INVALID',
  'EXPL_HANJA_TARGET_CONTAINING_RELATED',
  'EXPL_HANJA_RELATED_RELATION_INVALID',
  'EXPL_HANJA_HOMOPHONE_RELATION_INVALID',
  'EXPL_PRON_STRUCTURE_INVALID',
  'EXPL_PRON_COVERAGE_MISSING'
].forEach(code => {
  assert(runtimeSource.includes(code), 'Runtime hard code missing: ' + code);
});

assert(
  schedulerSource.includes(
    'function h3FamilySchedulerWrittenAuthoringGenerationRebind()'
  ),
  'Written authoring generation rebind entrypoint missing'
);
assert(
  schedulerSource.includes(
    'H3-FAMILY-SCHEDULER-AUTHORING-GENERATION-20260926-V2'
  ),
  'Written authoring generation V2 missing'
);

console.log(
  'Written explanation static QA runtime parity: PASS; ' +
  'future_cases=' + compared +
  '; old_q4_token_jaccard=' + oldQ4 +
  '; approved_q4_token_jaccard=' + approvedQ4
);
