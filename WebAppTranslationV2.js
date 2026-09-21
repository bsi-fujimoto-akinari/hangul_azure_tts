/**
 * H3 Translation V2 mixed-direction core.
 *
 * Parallel to V1. No route registration or learner issue is enabled here.
 * V2 makes SECTION_KEY / TRANSLATION_DIRECTION item-level so a normal 2T set
 * can contain P11 KR_TO_JP + P12 JP_TO_KR.
 */

var H3_TRANSLATION_V2_CONTRACT_ID_ =
  'H3-TRANSLATION-MIXED-CORE-20260922-V2';
var H3_TRANSLATION_V2_SOURCE_SCHEMA_ =
  'H3_TRANSLATION_SOURCE_BUNDLE_V2';
var H3_TRANSLATION_V2_LOCKED_SCHEMA_ =
  'H3_TRANSLATION_LOCKED_BUNDLE_V2';
var H3_TRANSLATION_V2_STAGE_SCHEMA_ =
  'H3_TRANSLATION_STAGE_V2';
var H3_TRANSLATION_V2_STAGE_SHEET_ =
  'translation_stage_v2';
var H3_TRANSLATION_V2_TXN_SHEET_ =
  'translation_web_txn_v2';
var H3_TRANSLATION_V2_LOG_SHEET_ =
  'translation_log_v2';
var H3_TRANSLATION_AUTHORED_SURFACE_SHEET_ =
  'translation_authored_surface_v1';

var H3_TRANSLATION_V2_STAGE_HEADERS_ = [
  'STAGE_ID','ISSUE_NO','SET_ID','STATUS','LEVEL','PROFILE','ANSWER_TYPE',
  'ITEM_COUNT','SOURCE_BINDING_SHA256','LOCKED_BUNDLE_SHA256',
  'LOCKED_BUNDLE_JSON','CREATED_AT','LOCKED_AT','ISSUED_AT','COMMITTED_AT'
];
var H3_TRANSLATION_V2_TXN_HEADERS_ = [
  'TXN_ID','SET_ID','STAGE_ID','MODE','SURFACE_FAMILY','PROFILE',
  'ANSWER_TYPE','RAW_INPUT_JSON','REQUEST_FINGERPRINT','SOURCE_BINDING_SHA256',
  'CREATED_AT','STATUS','RESULT_JSON','SCORE','COMMITTED_AT','ERROR'
];
var H3_TRANSLATION_V2_LOG_HEADERS_ = [
  'TXN_ID','SET_ID','Q_NO','ITEM_ID','QUESTION_KEY','SKILL_ID','SECTION_KEY',
  'RESULT','UNCERTAIN','TRANSLATION_DIRECTION','ANSWER_TYPE','ANSWERED_AT'
];

function h3TranslationV2Profile_(value) {
  var profile = String(value || '').trim();
  if (['MIXED_1_1','EDF_KR_TO_JP_2','EDF_JP_TO_KR_2'].indexOf(profile) < 0) {
    throw new Error('TRANSLATION_V2_PROFILE_INVALID');
  }
  return profile;
}

function h3TranslationV2ValidateItem_(item, index) {
  if (!item || typeof item !== 'object') {
    throw new Error('TRANSLATION_V2_ITEM_INVALID:' + index);
  }
  var section = h3TranslationActivationRequireId_(
    item.section_key,'TRANSLATION_V2_ITEM_SECTION_INVALID:' + index);
  var direction = h3TranslationActivationRequireId_(
    item.translation_direction,'TRANSLATION_V2_ITEM_DIRECTION_INVALID:' + index);
  if (direction !== h3TranslationDirectionForSection_(section)) {
    throw new Error('TRANSLATION_V2_ITEM_SECTION_DIRECTION_MISMATCH:' + index);
  }
  if (item.answer_type !== 'MULTIPLE_CHOICE') {
    throw new Error('TRANSLATION_V2_ITEM_ANSWER_TYPE_INVALID:' + index);
  }
  if (['OFFICIAL','AUTHORED_RETEST'].indexOf(String(item.source_kind || '')) < 0) {
    throw new Error('TRANSLATION_V2_ITEM_SOURCE_KIND_INVALID:' + index);
  }
  var target = h3TranslationRequireString_(
    item.target_segment,'TRANSLATION_V2_TARGET_INVALID:' + index);
  var question = h3TranslationRequireString_(
    item.question_text,'TRANSLATION_V2_QUESTION_TEXT_INVALID:' + index);
  if (question.indexOf(target) < 0) {
    throw new Error('TRANSLATION_V2_TARGET_NOT_IN_QUESTION:' + index);
  }
  if (!Array.isArray(item.choices) || item.choices.length !== 4) {
    throw new Error('TRANSLATION_V2_CHOICES_INVALID:' + index);
  }
  var choices = item.choices.map(function (choice, choiceIndex) {
    return h3TranslationRequireString_(
      choice,'TRANSLATION_V2_CHOICE_INVALID:' + index + ':' + choiceIndex);
  });
  var correct = Number(item.correct_choice);
  if (!Number.isInteger(correct) || correct < 1 || correct > 4) {
    throw new Error('TRANSLATION_V2_CORRECT_CHOICE_INVALID:' + index);
  }
  var lang = h3TranslationLanguageContract_(direction);
  return {
    item_id:h3TranslationActivationRequireId_(item.item_id,'TRANSLATION_V2_ITEM_ID_INVALID:' + index),
    question_key:h3TranslationActivationRequireId_(item.question_key,'TRANSLATION_V2_QUESTION_KEY_INVALID:' + index),
    section_key:section,
    translation_direction:direction,
    source_language:lang.source_language,
    choice_language:lang.choice_language,
    answer_type:'MULTIPLE_CHOICE',
    skill_id:h3TranslationActivationRequireId_(item.skill_id,'TRANSLATION_V2_SKILL_ID_INVALID:' + index),
    source_kind:String(item.source_kind),
    source_reference:String(item.source_reference || ''),
    surface_key:h3TranslationActivationRequireId_(item.surface_key,'TRANSLATION_V2_SURFACE_KEY_INVALID:' + index),
    target_segment:target,
    question_text:question,
    choices:choices,
    correct_choice:correct
  };
}

function h3TranslationV2LockBundle_(source) {
  if (!source || source.schema !== H3_TRANSLATION_V2_SOURCE_SCHEMA_ ||
      source.provider_kind !== 'WRITTEN' || source.surface_family !== 'TRANSLATION' ||
      source.level !== '3級' || source.answer_type !== 'MULTIPLE_CHOICE' ||
      !Array.isArray(source.items) || source.items.length !== 2) {
    throw new Error('TRANSLATION_V2_SOURCE_BUNDLE_INVALID');
  }
  var profile = h3TranslationV2Profile_(source.profile);
  var seenItem = {}, seenQuestion = {}, seenSurface = {};
  var items = source.items.map(function (item, index) {
    var x = h3TranslationV2ValidateItem_(item,index);
    if (seenItem[x.item_id] || seenQuestion[x.question_key] || seenSurface[x.surface_key]) {
      throw new Error('TRANSLATION_V2_SOURCE_DUPLICATE_IDENTITY');
    }
    seenItem[x.item_id] = true; seenQuestion[x.question_key] = true; seenSurface[x.surface_key] = true;
    return x;
  });
  var kr = items.filter(function (x) { return x.translation_direction === 'KR_TO_JP'; }).length;
  var jp = items.length - kr;
  var reason = String(source.override_reason || '');
  if (profile === 'MIXED_1_1' && !(kr === 1 && jp === 1)) {
    throw new Error('TRANSLATION_V2_PROFILE_CARDINALITY_INVALID');
  }
  if (profile === 'EDF_KR_TO_JP_2' &&
      (!(kr === 2 && jp === 0) || reason !== 'DUE_MAX_AVOIDANCE')) {
    throw new Error('TRANSLATION_V2_EDF_OVERRIDE_INVALID');
  }
  if (profile === 'EDF_JP_TO_KR_2' &&
      (!(kr === 0 && jp === 2) || reason !== 'DUE_MAX_AVOIDANCE')) {
    throw new Error('TRANSLATION_V2_EDF_OVERRIDE_INVALID');
  }
  var locked = {
    schema:H3_TRANSLATION_V2_LOCKED_SCHEMA_,
    provider_kind:'WRITTEN',surface_family:'TRANSLATION',level:'3級',
    profile:profile,override_reason:reason,answer_type:'MULTIPLE_CHOICE',
    item_count:2,items:items
  };
  locked.source_binding_sha256 = h3TranslationHash_({
    schema:'H3_TRANSLATION_V2_SOURCE_BINDING_V1',
    level:locked.level,profile:locked.profile,override_reason:locked.override_reason,items:locked.items
  });
  return locked;
}

function h3TranslationV2ValidateRetestSurface_(
  item,
  skillId,
  direction,
  priorSurfaceKeys,
  priorItemIds
) {
  var x = h3TranslationV2ValidateItem_(item,0);
  if (x.skill_id !== String(skillId || '') ||
      x.translation_direction !== String(direction || '')) {
    throw new Error('TRANSLATION_V2_RETEST_IDENTITY_MISMATCH');
  }
  var prior = (priorSurfaceKeys || []).map(function (value) {
    return String(value || '');
  });
  var priorItems = (priorItemIds || []).map(function (value) {
    return String(value || '');
  });
  if (prior.indexOf(x.surface_key) >= 0) {
    throw new Error('TRANSLATION_V2_RETEST_SURFACE_REUSED');
  }
  if (priorItems.indexOf(x.item_id) >= 0) {
    throw new Error('TRANSLATION_V2_RETEST_ITEM_REUSED');
  }
  return true;
}

function h3TranslationV2BuildStage_(identity, locked, createdAt) {
  if (!identity || !identity.stage_id || !identity.set_id || !identity.issue_no) {
    throw new Error('TRANSLATION_V2_STAGE_IDENTITY_INVALID');
  }
  if (!locked || locked.schema !== H3_TRANSLATION_V2_LOCKED_SCHEMA_) {
    throw new Error('TRANSLATION_V2_STAGE_LOCK_INVALID');
  }
  var created = h3TranslationActivationRequireId_(
    createdAt,'TRANSLATION_V2_STAGE_CREATED_AT_INVALID');
  return {
    schema:H3_TRANSLATION_V2_STAGE_SCHEMA_,
    contract_id:H3_TRANSLATION_V2_CONTRACT_ID_,
    provider_kind:'WRITTEN',surface_family:'TRANSLATION',
    issue_no:Number(identity.issue_no),stage_id:String(identity.stage_id),
    set_id:String(identity.set_id),status:'LOCKED',level:locked.level,
    profile:locked.profile,answer_type:locked.answer_type,item_count:locked.item_count,
    source_binding_sha256:locked.source_binding_sha256,
    locked_bundle_sha256:h3TranslationHash_(locked),
    locked_bundle_json:h3TranslationCanonicalJson_(locked),
    created_at:created,locked_at:created,issued_at:'',committed_at:''
  };
}

function h3TranslationV2ValidateStageLock_(stage, locked) {
  if (!stage || stage.schema !== H3_TRANSLATION_V2_STAGE_SCHEMA_ ||
      stage.contract_id !== H3_TRANSLATION_V2_CONTRACT_ID_ ||
      !locked || locked.schema !== H3_TRANSLATION_V2_LOCKED_SCHEMA_) {
    throw new Error('TRANSLATION_V2_STAGE_SCHEMA_INVALID');
  }
  var stored;
  try { stored = JSON.parse(String(stage.locked_bundle_json || '')); }
  catch (_err) { throw new Error('TRANSLATION_V2_LOCKED_BUNDLE_JSON_INVALID'); }
  if (stage.provider_kind !== 'WRITTEN' || stage.surface_family !== 'TRANSLATION' ||
      stage.level !== locked.level || stage.profile !== locked.profile ||
      stage.answer_type !== locked.answer_type || Number(stage.item_count) !== locked.item_count ||
      stage.source_binding_sha256 !== locked.source_binding_sha256 ||
      stage.locked_bundle_sha256 !== h3TranslationHash_(locked) ||
      h3TranslationCanonicalJson_(stored) !== h3TranslationCanonicalJson_(locked)) {
    throw new Error('TRANSLATION_V2_STAGE_SOURCE_BINDING_MISMATCH');
  }
  return true;
}

function h3TranslationV2BuildRenderPayload_(stage, locked) {
  h3TranslationV2ValidateStageLock_(stage,locked);
  return {
    schema:'H3_WEB_RENDER_V1',mode:'WRITTEN',provider_kind:'WRITTEN',
    surface_family:'TRANSLATION',level:stage.level,set_id:stage.set_id,stage_id:stage.stage_id,
    translation_profile:stage.profile,answer_type:stage.answer_type,
    source_binding_sha256:stage.source_binding_sha256,
    questions:locked.items.map(function (item,index) {
      return {
        q_no:index+1,section:item.section_key,section_key:item.section_key,
        item_id:item.item_id,question_key:item.question_key,skill_id:item.skill_id,
        translation_direction:item.translation_direction,source_language:item.source_language,
        choice_language:item.choice_language,answer_type:item.answer_type,
        target_segment:item.target_segment,question_text:item.question_text,
        choice_ids:[1,2,3,4],visible_choices:item.choices,
        source_kind:item.source_kind,surface_key:item.surface_key
      };
    })
  };
}

function h3TranslationV2NormalizeSubmission_(request, locked) {
  if (!request || request.schema !== 'H3_WEB_SUBMIT_V1' || request.mode !== 'WRITTEN' ||
      request.provider_kind !== 'WRITTEN' || request.surface_family !== 'TRANSLATION' ||
      !locked || locked.schema !== H3_TRANSLATION_V2_LOCKED_SCHEMA_ ||
      !Array.isArray(request.answers) || request.answers.length !== locked.items.length) {
    throw new Error('TRANSLATION_V2_SUBMIT_ENVELOPE_INVALID');
  }
  var expected = {}, seen = {};
  locked.items.forEach(function (item) { expected[item.question_key] = item; });
  var answers = request.answers.map(function (answer) {
    var key = h3TranslationActivationRequireId_(
      answer && answer.question_key,'TRANSLATION_V2_SUBMIT_QUESTION_KEY_INVALID');
    if (seen[key] || !expected[key]) {
      throw new Error('TRANSLATION_V2_SUBMIT_QUESTION_IDENTITY_INVALID');
    }
    seen[key] = true;
    var position = Number(answer.answer);
    if (!Number.isInteger(position) || position < 1 || position > 4 ||
        typeof answer.uncertain !== 'boolean') {
      throw new Error('TRANSLATION_V2_SUBMIT_ANSWER_INVALID');
    }
    return {question_key:key,answer:position,uncertain:answer.uncertain};
  });
  return {
    schema:'H3_WEB_SUBMIT_V1',mode:'WRITTEN',provider_kind:'WRITTEN',
    surface_family:'TRANSLATION',set_id:String(request.set_id || ''),
    profile:locked.profile,answer_type:locked.answer_type,answers:answers
  };
}

function h3TranslationV2Grade_(locked, answers) {
  var byKey = {};
  (answers || []).forEach(function (answer) { byKey[answer.question_key] = answer; });
  var score = 0;
  var graded = locked.items.map(function (item,index) {
    var answer = byKey[item.question_key];
    if (!answer) throw new Error('TRANSLATION_V2_GRADE_ANSWER_MISSING');
    var correct = Number(answer.answer) === Number(item.correct_choice);
    if (correct) score += 1;
    var mark = correct ? (answer.uncertain ? '△' : '○') : '×';
    return {
      q_no:index+1,item_id:item.item_id,question_key:item.question_key,skill_id:item.skill_id,
      section_key:item.section_key,mark:mark,uncertain:!!answer.uncertain,
      translation_direction:item.translation_direction,answer_type:item.answer_type,
      surface_key:item.surface_key
    };
  });
  return {schema:'H3_TRANSLATION_GRADE_V2',score:score,total:locked.items.length,graded:graded};
}

function h3TranslationV2BuildCommittedResult_(stage, locked, grade, txnId) {
  h3TranslationV2ValidateStageLock_(stage,locked);
  if (!grade || grade.schema !== 'H3_TRANSLATION_GRADE_V2' ||
      grade.total !== stage.item_count) {
    throw new Error('TRANSLATION_V2_RESULT_GRADE_INVALID');
  }
  return {
    schema:'H3_WEB_SUBMIT_RESULT_V1',mode:'WRITTEN',provider_kind:'WRITTEN',
    surface_family:'TRANSLATION',level:stage.level,translation_profile:stage.profile,
    answer_type:stage.answer_type,persisted:true,status:'COMMITTED',
    set_id:stage.set_id,stage_id:stage.stage_id,txn_id:String(txnId || ''),
    source_binding_sha256:stage.source_binding_sha256,score:grade.score,total:grade.total,
    summary:grade.graded.map(function (item) {
      return {
        q_no:item.q_no,item_id:item.item_id,question_key:item.question_key,
        skill_id:item.skill_id,section_key:item.section_key,result:item.mark,
        uncertain:item.uncertain,translation_direction:item.translation_direction,
        answer_type:item.answer_type,surface_key:item.surface_key
      };
    })
  };
}
