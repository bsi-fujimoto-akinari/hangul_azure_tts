/**
 * Pure audit for H3 Translation V2 mixed-direction core.
 */
function auditTranslationV2MixedCoreV1_() {
  var p11 = {
    item_id:'OFF-H3-P11-003',question_key:'OFF-H3-P11-003',
    section_key:'H3-P11',translation_direction:'KR_TO_JP',
    answer_type:'MULTIPLE_CHOICE',skill_id:'H3-P11-SK003',
    source_kind:'OFFICIAL',source_reference:'official_items:OFF-H3-P11-003',
    source_item_sha256:'0f05dc338afa019ccba9389e3cf949093b3450ffdd0ea8d7400f8f25f3e59abf',
    surface_key:'OFFICIAL:OFF-H3-P11-003',target_segment:'보기 드물다.',
    question_text:'이런 물건은 요즘 보기 드물다.',
    choices:['偽物が多い。','見かけるようになった。','手に入らない。','めったにない。'],
    correct_choice:4
  };
  var p12 = {
    item_id:'AUTH-H3-P12-RT-SK017-001',question_key:'AUTH-H3-P12-RT-SK017-001',
    section_key:'H3-P12',translation_direction:'JP_TO_KR',
    answer_type:'MULTIPLE_CHOICE',skill_id:'H3-P11-SK017',
    source_kind:'AUTHORED_RETEST',
    source_reference:'translation_authored_surface_v1:AUTH-H3-P12-RT-SK017-001',
    source_item_sha256:'36052f02dbc145ddd880529d268fad9d143fc4b194facf94896dfebf4deaa2cb',
    surface_key:'AUTHORED:36052f02dbc145ddd880529d268fad9d143fc4b194facf94896dfebf4deaa2cb',
    target_segment:'周囲の顔色を気にしすぎて',
    question_text:'彼は周囲の顔色を気にしすぎて、会議で自分の考えを言えなかった。',
    choices:['주변 사람들의 눈치를 너무 보느라','주변 사람들의 눈길을 너무 끌어서','주변 사람들과 눈을 너무 맞추느라','주변 사람들의 눈에 너무 띄어서'],
    correct_choice:1
  };
  var locked = h3TranslationV2LockBundle_({
    schema:H3_TRANSLATION_V2_SOURCE_SCHEMA_,provider_kind:'WRITTEN',
    surface_family:'TRANSLATION',level:'3級',profile:'MIXED_1_1',
    override_reason:'',answer_type:'MULTIPLE_CHOICE',items:[p11,p12]
  });
  h3TranslationV2ValidateRetestSurface_(
    p12,
    'H3-P11-SK017',
    'JP_TO_KR',
    ['T|46156856bdd8d190b161e07c02870d13e81f463203fb592d1e11daa7ba410d14'],
    ['OFF-H3-P12-001']
  );
  var reused = false;
  try {
    h3TranslationV2ValidateRetestSurface_(
      p12,'H3-P11-SK017','JP_TO_KR',[p12.surface_key],[]);
  } catch (err) {
    reused = String(err && err.message || err).indexOf(
      'TRANSLATION_V2_RETEST_SURFACE_REUSED') >= 0;
  }
  if (!reused) throw new Error('TRANSLATION_V2_AUDIT_REUSE_NOT_REJECTED');

  var stage = h3TranslationV2BuildStage_({
    issue_no:3,stage_id:'TRANS-MIX-20260922-001',set_id:'H3-20260922-T001'
  },locked,'2026-09-22T08:03:00+09:00');
  var render = h3TranslationV2BuildRenderPayload_(stage,locked);
  if (render.translation_profile !== 'MIXED_1_1' ||
      render.questions[0].translation_direction !== 'KR_TO_JP' ||
      render.questions[1].translation_direction !== 'JP_TO_KR' ||
      render.questions[0].source_language !== 'KO' ||
      render.questions[1].source_language !== 'JA') {
    throw new Error('TRANSLATION_V2_AUDIT_RENDER_INVALID');
  }

  var normalized = h3TranslationV2NormalizeSubmission_({
    schema:'H3_WEB_SUBMIT_V1',mode:'WRITTEN',provider_kind:'WRITTEN',
    surface_family:'TRANSLATION',set_id:stage.set_id,
    answers:[
      {question_key:p11.question_key,answer:4,uncertain:false},
      {question_key:p12.question_key,answer:1,uncertain:false}
    ]
  },locked);
  var grade = h3TranslationV2Grade_(locked,normalized.answers);
  var result = h3TranslationV2BuildCommittedResult_(
    stage,locked,grade,'H3TX-20260922-000001');
  if (result.score !== 2 ||
      grade.graded[0].answer !== 4 ||
      grade.graded[0].correct_answer !== 4 ||
      grade.graded[1].answer !== 1 ||
      grade.graded[1].correct_answer !== 1 ||
      result.summary[1].surface_key !== p12.surface_key) {
    throw new Error('TRANSLATION_V2_AUDIT_RESULT_INVALID');
  }
  return {
    schema:'H3_TRANSLATION_V2_CORE_AUDIT_V1',status:'PASS',
    profile:locked.profile,source_binding_sha256:locked.source_binding_sha256,
    authored_surface_key:p12.surface_key,reused_surface_rejected:reused,
    item_level_direction:true,score:result.score,total:result.total
  };
}
