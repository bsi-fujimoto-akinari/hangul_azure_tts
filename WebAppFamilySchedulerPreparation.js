/**
 * Family Scheduler deterministic Reading / Translation preissue preparation.
 *
 * This module may materialize source-locked PREISSUE_READY Reading rows and
 * LOCKED Translation V2 rows. It never issues a learner set, advances R/T
 * clocks, writes learner history, grades answers, or closes retest state.
 */

var H3_FS_RT_PREP_CONTRACT_ID_ =
  'H3-FAMILY-SCHEDULER-RT-PREP-20260924-V1';

var H3_FS_OFFICIAL_ITEMS_SHEET_ = 'official_items';
var H3_FS_OFFICIAL_ANSWER_SHEET_ = 'official_answer_detail_v1';
var H3_FS_OFFICIAL_SKILL_SHEET_ = 'official_item_skill_map_v2';
var H3_FS_OFFICIAL_GROUP_SHEET_ = 'official_group_content_v1';

function h3FsRtLaneRecord_(ss) {
  var t=h3FsTable_(ss.getSheetByName(H3_RT_LANE_STATE_SHEET_));
  h3FsRequire_(t,H3_RT_LANE_STATE_HEADERS_,H3_RT_LANE_STATE_SHEET_);
  var found=[];
  t.rows.forEach(function(r){
    if(String(r[t.map.LEVEL]||'')==='3級')found.push(r);
  });
  if(found.length!==1){
    throw new Error('FAMILY_SCHEDULER_RT_LANE_COUNT:'+found.length);
  }
  return {row:found[0],map:t.map};
}

function h3FsRtNextClock_(ss,family) {
  var lane=h3FsRtLaneRecord_(ss);
  var col=
    family==='READING'
      ? 'READING_CLOCK'
      : family==='TRANSLATION'
        ? 'TRANSLATION_CLOCK'
        : '';
  if(!col)throw new Error('FAMILY_SCHEDULER_RT_FAMILY_INVALID');
  var current=Number(lane.row[lane.map[col]]||0);
  if(!Number.isInteger(current)||current<0){
    throw new Error('FAMILY_SCHEDULER_RT_CLOCK_INVALID:'+family);
  }
  return current+1;
}

function h3FsRtDueObligations_(ss,family,direction) {
  var next=h3FsRtNextClock_(ss,family);
  var t=h3FsTable_(ss.getSheetByName(H3_RT_SKILL_QUEUE_SHEET_));
  h3FsRequire_(t,H3_RT_SKILL_QUEUE_HEADERS_,H3_RT_SKILL_QUEUE_SHEET_);
  var out=[];
  t.rows.forEach(function(r){
    if(String(r[t.map.LEVEL]||'')!=='3級')return;
    if(String(r[t.map.FAMILY]||'')!==family)return;
    var dir=String(r[t.map.TRANSLATION_DIRECTION]||'');
    if(direction && dir!==direction)return;
    var result=String(r[t.map.LATEST_RESULT]||'');
    if(result!=='×'&&result!=='△')return;
    if(String(r[t.map.STABILITY_STATUS]||'')==='STABLE')return;
    var dueMin=Number(r[t.map.DUE_MIN]||0);
    var dueMax=Number(r[t.map.DUE_MAX]||0);
    var origin=Number(r[t.map.STRICT_ORIGIN_CLOCK]||0);
    if(
      !Number.isInteger(dueMin)||
      !Number.isInteger(dueMax)||
      dueMin<1||
      dueMax<dueMin||
      next<dueMin
    )return;
    out.push({
      family:family,
      skill_id:String(r[t.map.SKILL_ID]||''),
      direction:dir,
      latest_result:result,
      due_min:dueMin,
      due_max:dueMax,
      strict_origin_clock:
        Number.isInteger(origin)?origin:0,
      next_clock:next,
      last_set_id:String(r[t.map.LAST_SET_ID]||''),
      last_surface_key:String(r[t.map.LAST_SURFACE_KEY]||'')
    });
  });
  out.sort(function(a,b){
    if(a.due_max!==b.due_max)return a.due_max-b.due_max;
    var aw=a.latest_result==='×'?0:1;
    var bw=b.latest_result==='×'?0:1;
    if(aw!==bw)return aw-bw;
    if(a.due_min!==b.due_min)return a.due_min-b.due_min;
    if(a.strict_origin_clock!==b.strict_origin_clock){
      return a.strict_origin_clock-b.strict_origin_clock;
    }
    var s=a.skill_id.localeCompare(b.skill_id);
    if(s)return s;
    return a.direction.localeCompare(b.direction);
  });
  return out;
}

function h3FsUsedItemIds_(ss,sheetNames) {
  var used={};
  (sheetNames||[]).forEach(function(name){
    var t=h3FsTable_(ss.getSheetByName(name));
    if(!t.headers.length||t.map.ITEM_ID===undefined)return;
    t.rows.forEach(function(r){
      var id=String(r[t.map.ITEM_ID]||'');
      if(id)used[id]=true;
    });
  });
  return used;
}

function h3FsOfficialTables_(ss) {
  var items=h3FsTable_(ss.getSheetByName(H3_FS_OFFICIAL_ITEMS_SHEET_));
  var answers=h3FsTable_(ss.getSheetByName(H3_FS_OFFICIAL_ANSWER_SHEET_));
  var skills=h3FsTable_(ss.getSheetByName(H3_FS_OFFICIAL_SKILL_SHEET_));
  var groups=h3FsTable_(ss.getSheetByName(H3_FS_OFFICIAL_GROUP_SHEET_));
  h3FsRequire_(items,[
    'ITEM_ID','LEVEL','SECTION','TARGET','QUESTION_TEXT',
    'CHOICES_CANONICAL_JSON','SITE_ITEM_ID_FIRST','SITE_GROUP_ID_FIRST',
    'ITEM_FINGERPRINT','FINGERPRINT_STATUS'
  ],H3_FS_OFFICIAL_ITEMS_SHEET_);
  h3FsRequire_(answers,[
    'ITEM_ID','SECTION_KEY','CORRECT_ANSWER_NUMBER',
    'CHOICE_1_JA_RAW','CHOICE_2_JA_RAW','CHOICE_3_JA_RAW','CHOICE_4_JA_RAW'
  ],H3_FS_OFFICIAL_ANSWER_SHEET_);
  h3FsRequire_(skills,['ITEM_ID','SKILL_ID'],H3_FS_OFFICIAL_SKILL_SHEET_);
  h3FsRequire_(groups,[
    'SECTION_KEY','SECTION','SITE_GROUP_ID','GROUP_ROLE','PASSAGE_RAW',
    'PASSAGE_JA_RAW','PASSAGE_SOURCE_SITE_ITEM_ID','ITEM_IDS_JSON',
    'CONTENT_STATUS','SOURCE_BATCH_ID'
  ],H3_FS_OFFICIAL_GROUP_SHEET_);
  return {items:items,answers:answers,skills:skills,groups:groups};
}

function h3FsOneRowBy_(table,column,value,label) {
  var found=[];
  table.rows.forEach(function(r){
    if(String(r[table.map[column]]||'')===String(value))found.push(r);
  });
  if(found.length!==1){
    throw new Error('FAMILY_SCHEDULER_SOURCE_ROW_COUNT:'+label+':'+found.length);
  }
  return found[0];
}

function h3FsReadingSectionSkips_(ss) {
  var lane=h3FsRtLaneRecord_(ss);
  var raw=String(lane.row[lane.map.READING_SECTION_SKIP_JSON]||'');
  var parsed=h3FsJson_(raw,{});
  var out={'H3-P8':0,'H3-P9':0,'H3-P10':0};
  Object.keys(out).forEach(function(k){
    var n=Number(parsed[k]||0);
    if(Number.isFinite(n)&&n>=0)out[k]=n;
  });
  return out;
}

function h3FsReadingGroupForObligation_(ss,obligation) {
  var tables=h3FsOfficialTables_(ss);
  var used=h3FsUsedItemIds_(ss,['reading_log_v1']);
  var skips=h3FsReadingSectionSkips_(ss);
  var candidates=[];

  tables.skills.rows.forEach(function(r){
    if(String(r[tables.skills.map.SKILL_ID]||'')!==obligation.skill_id)return;
    var itemId=String(r[tables.skills.map.ITEM_ID]||'');
    if(!itemId||used[itemId])return;
    var item=h3FsOneRowBy_(tables.items,'ITEM_ID',itemId,'READING_ITEM');
    if(String(item[tables.items.map.LEVEL]||'')!=='3級')return;
    var section=String(item[tables.items.map.SECTION]||'');
    var sectionKey=
      section.indexOf('筆8')===0?'H3-P8':
      section.indexOf('筆9')===0?'H3-P9':
      section.indexOf('筆10')===0?'H3-P10':'';
    if(!sectionKey)return;
    var groupId=String(item[tables.items.map.SITE_GROUP_ID_FIRST]||'');
    var groupRows=[];
    tables.groups.rows.forEach(function(g){
      if(
        String(g[tables.groups.map.SECTION_KEY]||'')===sectionKey &&
        String(g[tables.groups.map.SITE_GROUP_ID]||'')===groupId &&
        String(g[tables.groups.map.CONTENT_STATUS]||'')==='CONFIRMED_GROUP_SOURCE'
      )groupRows.push(g);
    });
    if(groupRows.length!==1)return;
    var siteIds=h3FsJson_(
      groupRows[0][tables.groups.map.ITEM_IDS_JSON],
      []
    ).map(function(x){return String(x);});
    if(siteIds.length!==2)return;

    var groupItems=[];
    var invalid=false;
    siteIds.forEach(function(siteId){
      var found=[];
      tables.items.rows.forEach(function(ir){
        if(
          String(ir[tables.items.map.SITE_ITEM_ID_FIRST]||'')===siteId &&
          String(ir[tables.items.map.SITE_GROUP_ID_FIRST]||'')===groupId &&
          String(ir[tables.items.map.SECTION]||'')===section
        )found.push(ir);
      });
      if(found.length!==1){
        invalid=true;
        return;
      }
      var gid=String(found[0][tables.items.map.ITEM_ID]||'');
      if(used[gid])invalid=true;
      groupItems.push(found[0]);
    });
    if(invalid||groupItems.length!==2)return;
    candidates.push({
      section_key:sectionKey,
      section:section,
      group_id:groupId,
      group:groupRows[0],
      items:groupItems,
      skip:Number(skips[sectionKey]||0),
      anchor_item_id:itemId
    });
  });

  candidates.sort(function(a,b){
    if(a.skip!==b.skip)return b.skip-a.skip;
    var s=a.section_key.localeCompare(b.section_key);
    if(s)return s;
    s=a.group_id.localeCompare(b.group_id);
    if(s)return s;
    return a.anchor_item_id.localeCompare(b.anchor_item_id);
  });
  return candidates.length?candidates[0]:null;
}

function h3FsBuildReadingSource_(ss,selected) {
  var tables=h3FsOfficialTables_(ss);
  var g=selected.group;
  var sectionCode=selected.section_key.replace('H3-','');
  var items=selected.items.map(function(item,index){
    var itemId=String(item[tables.items.map.ITEM_ID]||'');
    var answer=h3FsOneRowBy_(tables.answers,'ITEM_ID',itemId,'READING_ANSWER');
    if(String(answer[tables.answers.map.SECTION_KEY]||'')!==selected.section_key){
      throw new Error('FAMILY_SCHEDULER_READING_SECTION_DRIFT');
    }
    var skill=h3FsOneRowBy_(tables.skills,'ITEM_ID',itemId,'READING_SKILL');
    var choicesKo=h3FsJson_(
      item[tables.items.map.CHOICES_CANONICAL_JSON],
      []
    );
    var choicesJa=[
      answer[tables.answers.map.CHOICE_1_JA_RAW],
      answer[tables.answers.map.CHOICE_2_JA_RAW],
      answer[tables.answers.map.CHOICE_3_JA_RAW],
      answer[tables.answers.map.CHOICE_4_JA_RAW]
    ].map(function(x){return String(x||'');});
    if(
      choicesKo.length!==4||
      choicesJa.some(function(x){return !x;})
    ){
      throw new Error('FAMILY_SCHEDULER_READING_CHOICES_INVALID:'+itemId);
    }
    var correct=Number(answer[tables.answers.map.CORRECT_ANSWER_NUMBER]||0);
    if(!Number.isInteger(correct)||correct<1||correct>4){
      throw new Error('FAMILY_SCHEDULER_READING_ANSWER_INVALID:'+itemId);
    }
    return {
      item_id:itemId,
      question_key:itemId,
      site_item_id:String(item[tables.items.map.SITE_ITEM_ID_FIRST]||''),
      q_no:index+1,
      section:sectionCode,
      display:selected.section,
      skill_id:String(skill[tables.skills.map.SKILL_ID]||''),
      question_text:String(item[tables.items.map.QUESTION_TEXT]||''),
      choices_ko:choicesKo,
      choices_ja:choicesJa,
      correct_answer_position:correct
    };
  });

  return {
    schema:H3_READING_SOURCE_SCHEMA_,
    provider_kind:'WRITTEN',
    surface_family:'READING',
    level:'3級',
    section_key:selected.section_key,
    passage:{
      passage_id:
        'H3-'+sectionCode+'-G'+selected.group_id,
      site_group_id:selected.group_id,
      group_role:String(g[tables.groups.map.GROUP_ROLE]||''),
      passage_ko:String(g[tables.groups.map.PASSAGE_RAW]||''),
      passage_ja:String(g[tables.groups.map.PASSAGE_JA_RAW]||''),
      source_site_item_id:
        String(g[tables.groups.map.PASSAGE_SOURCE_SITE_ITEM_ID]||''),
      source_batch_id:String(g[tables.groups.map.SOURCE_BATCH_ID]||'')
    },
    items:items
  };
}

function h3FsReadingStageObjects_(table) {
  return table.rows.map(function(r){
    return {
      issue_no:Number(r[table.map.ISSUE_NO]||0),
      stage_id:String(r[table.map.STAGE_ID]||''),
      set_id:String(r[table.map.SET_ID]||''),
      section_key:String(r[table.map.SECTION_KEY]||'')
    };
  });
}

function h3FsPrepareReading_(ss) {
  var existing=h3FsFindPreparedReading_(ss);
  if(existing){
    return {
      status:'PREISSUE_READY',
      family:'R',
      set_id:existing.stage.set_id,
      skill_id:''
    };
  }

  var obligations=h3FsRtDueObligations_(ss,'READING','');
  if(!obligations.length){
    return {
      status:'AUTHORING_REQUIRED',
      family:'R',
      authoring_target:'READING_NO_DUE_SOURCE'
    };
  }

  var obligation=obligations[0];
  var selected=h3FsReadingGroupForObligation_(ss,obligation);
  if(!selected){
    return {
      status:'AUTHORING_REQUIRED',
      family:'R',
      authoring_target:
        'READING_RETEST_SOURCE:'+obligation.skill_id,
      skill_id:obligation.skill_id
    };
  }

  var source=h3FsBuildReadingSource_(ss,selected);
  var locked=h3ReadingLockBundle_(source);
  var sh=ss.getSheetByName('reading_stage_v1');
  var t=h3FsTable_(sh);
  h3FsRequire_(t,H3_READING_STAGE_HEADERS_,'reading_stage_v1');

  var datePart=Utilities.formatDate(new Date(),'Asia/Tokyo','yyyyMMdd');
  var timestamp=h3ReadingProdNowTokyo_();
  var plan=h3ReadingBuildSectionMaterializationPlan_(
    selected.section_key,
    datePart,
    h3FsReadingStageObjects_(t),
    locked,
    timestamp
  );

  sh.appendRow(plan.row_values);
  SpreadsheetApp.flush();

  var readback=h3FsFindPreparedReading_(ss);
  if(
    !readback||
    String(readback.stage.set_id)!==String(plan.stage.set_id)||
    String(readback.stage.source_binding_sha256)!==
      String(plan.stage.source_binding_sha256)
  ){
    throw new Error('FAMILY_SCHEDULER_READING_PREPARE_READBACK_FAIL');
  }

  return {
    status:'PREISSUE_READY',
    family:'R',
    set_id:readback.stage.set_id,
    skill_id:obligation.skill_id,
    section_key:selected.section_key,
    source_group_id:selected.group_id
  };
}

function h3FsTranslationUsed_(ss) {
  var usedItems={};
  ['translation_log_v1','translation_log_v2'].forEach(function(name){
    var t=h3FsTable_(ss.getSheetByName(name));
    if(!t.headers.length||t.map.ITEM_ID===undefined)return;
    t.rows.forEach(function(r){
      var id=String(r[t.map.ITEM_ID]||'');
      if(id)usedItems[id]=true;
    });
  });
  var surfaceKeys=[];
  var evidence=h3FsTable_(ss.getSheetByName(H3_RT_EVIDENCE_SHEET_));
  if(evidence.headers.length){
    h3FsRequire_(evidence,H3_RT_EVIDENCE_HEADERS_,H3_RT_EVIDENCE_SHEET_);
    evidence.rows.forEach(function(r){
      if(String(r[evidence.map.FAMILY]||'')!=='TRANSLATION')return;
      var key=String(r[evidence.map.SURFACE_KEY]||'');
      var item=String(r[evidence.map.ITEM_ID]||'');
      if(key)surfaceKeys.push(key);
      if(item)usedItems[item]=true;
    });
  }
  return {
    item_ids:Object.keys(usedItems),
    item_map:usedItems,
    surface_keys:surfaceKeys.filter(function(x,i,a){return a.indexOf(x)===i;})
  };
}

function h3FsAuthoredSurfaceSha_(x) {
  return h3FsSha_({
    level:String(x.level),
    section_key:String(x.section_key),
    translation_direction:String(x.translation_direction),
    skill_id:String(x.skill_id),
    source_kind:'AUTHORED_RETEST',
    item_id:String(x.item_id),
    question_key:String(x.question_key),
    target_segment:String(x.target_segment),
    question_text:String(x.question_text),
    choices:x.choices,
    correct_choice:Number(x.correct_choice),
    answer_type:'MULTIPLE_CHOICE'
  });
}

function h3FsTranslationAuthoredCandidates_(ss,obligation,used) {
  var t=h3FsTable_(ss.getSheetByName(H3_TRANSLATION_AUTHORED_SURFACE_SHEET_));
  h3FsRequire_(t,[
    'SURFACE_ID','LEVEL','SECTION_KEY','TRANSLATION_DIRECTION','SKILL_ID',
    'SOURCE_KIND','ITEM_ID','QUESTION_KEY','TARGET_SEGMENT','QUESTION_TEXT',
    'CHOICES_JSON','CORRECT_CHOICE','ANSWER_TYPE','SURFACE_SHA256',
    'CREATED_AT','STATUS'
  ],H3_TRANSLATION_AUTHORED_SURFACE_SHEET_);
  var out=[];
  t.rows.forEach(function(r){
    if(String(r[t.map.LEVEL]||'')!=='3級')return;
    if(String(r[t.map.STATUS]||'')!=='VERIFIED_READY')return;
    if(String(r[t.map.SOURCE_KIND]||'')!=='AUTHORED_RETEST')return;
    if(String(r[t.map.SKILL_ID]||'')!==obligation.skill_id)return;
    if(String(r[t.map.TRANSLATION_DIRECTION]||'')!==obligation.direction)return;
    var itemId=String(r[t.map.ITEM_ID]||'');
    if(!itemId||used.item_map[itemId])return;
    var choices=h3FsJson_(r[t.map.CHOICES_JSON],[]);
    var x={
      item_id:itemId,
      question_key:String(r[t.map.QUESTION_KEY]||''),
      section_key:String(r[t.map.SECTION_KEY]||''),
      translation_direction:String(r[t.map.TRANSLATION_DIRECTION]||''),
      answer_type:String(r[t.map.ANSWER_TYPE]||''),
      skill_id:String(r[t.map.SKILL_ID]||''),
      source_kind:'AUTHORED_RETEST',
      source_reference:
        H3_TRANSLATION_AUTHORED_SURFACE_SHEET_+':'+
        String(r[t.map.SURFACE_ID]||''),
      source_item_sha256:String(r[t.map.SURFACE_SHA256]||''),
      surface_key:'AUTHORED:'+String(r[t.map.SURFACE_SHA256]||''),
      target_segment:String(r[t.map.TARGET_SEGMENT]||''),
      question_text:String(r[t.map.QUESTION_TEXT]||''),
      choices:choices,
      correct_choice:Number(r[t.map.CORRECT_CHOICE]||0),
      created_at:String(r[t.map.CREATED_AT]||'')
    };
    if(
      x.answer_type!=='MULTIPLE_CHOICE'||
      h3FsAuthoredSurfaceSha_({
        level:'3級',
        section_key:x.section_key,
        translation_direction:x.translation_direction,
        skill_id:x.skill_id,
        item_id:x.item_id,
        question_key:x.question_key,
        target_segment:x.target_segment,
        question_text:x.question_text,
        choices:x.choices,
        correct_choice:x.correct_choice
      })!==x.source_item_sha256
    ){
      throw new Error(
        'FAMILY_SCHEDULER_AUTHORED_SURFACE_HASH_MISMATCH:'+itemId
      );
    }
    out.push(x);
  });
  out.sort(function(a,b){
    if(a.created_at!==b.created_at)return a.created_at.localeCompare(b.created_at);
    return a.item_id.localeCompare(b.item_id);
  });
  return out;
}

function h3FsTranslationOfficialCandidates_(ss,obligation,used) {
  var tables=h3FsOfficialTables_(ss);
  var out=[];
  tables.skills.rows.forEach(function(r){
    if(String(r[tables.skills.map.SKILL_ID]||'')!==obligation.skill_id)return;
    var itemId=String(r[tables.skills.map.ITEM_ID]||'');
    if(!itemId||used.item_map[itemId])return;
    var item=h3FsOneRowBy_(tables.items,'ITEM_ID',itemId,'TRANSLATION_ITEM');
    var answer=h3FsOneRowBy_(tables.answers,'ITEM_ID',itemId,'TRANSLATION_ANSWER');
    var sectionKey=String(answer[tables.answers.map.SECTION_KEY]||'');
    var direction=h3TranslationDirectionForSection_(sectionKey);
    if(direction!==obligation.direction)return;
    if(
      String(item[tables.items.map.LEVEL]||'')!=='3級'||
      String(item[tables.items.map.FINGERPRINT_STATUS]||'')!=='CONFIRMED_API'
    )return;
    var sha=String(item[tables.items.map.ITEM_FINGERPRINT]||'');
    if(!/^[0-9a-f]{64}$/.test(sha)){
      throw new Error('FAMILY_SCHEDULER_TRANSLATION_FINGERPRINT_INVALID:'+itemId);
    }
    var choices=h3FsJson_(item[tables.items.map.CHOICES_CANONICAL_JSON],[]);
    var correct=Number(answer[tables.answers.map.CORRECT_ANSWER_NUMBER]||0);
    var x={
      item_id:itemId,
      question_key:itemId,
      section_key:sectionKey,
      translation_direction:direction,
      answer_type:'MULTIPLE_CHOICE',
      skill_id:obligation.skill_id,
      source_kind:'OFFICIAL',
      source_reference:H3_FS_OFFICIAL_ITEMS_SHEET_+':'+itemId,
      source_item_sha256:sha,
      surface_key:'OFFICIAL:'+itemId,
      target_segment:String(item[tables.items.map.TARGET]||''),
      question_text:String(item[tables.items.map.QUESTION_TEXT]||''),
      choices:choices,
      correct_choice:correct
    };
    h3TranslationV2ValidateItem_(x,0);
    out.push(x);
  });
  out.sort(function(a,b){return a.item_id.localeCompare(b.item_id);});
  return out;
}

function h3FsTranslationSourceForObligation_(ss,obligation,used) {
  var official=h3FsTranslationOfficialCandidates_(ss,obligation,used);
  var authored=h3FsTranslationAuthoredCandidates_(ss,obligation,used);
  var all=official.concat(authored);
  for(var i=0;i<all.length;i++){
    try{
      h3TranslationV2ValidateRetestSurface_(
        all[i],
        obligation.skill_id,
        obligation.direction,
        used.surface_keys,
        used.item_ids
      );
      return all[i];
    }catch(err){
      var message=String(err&&err.message||err);
      if(
        message.indexOf('TRANSLATION_V2_RETEST_SURFACE_REUSED')<0 &&
        message.indexOf('TRANSLATION_V2_RETEST_ITEM_REUSED')<0
      ){
        throw err;
      }
    }
  }
  return null;
}

function h3FsTranslationSelection_(ss) {
  var next=h3FsRtNextClock_(ss,'TRANSLATION');
  var kr=h3FsRtDueObligations_(ss,'TRANSLATION','KR_TO_JP');
  var jp=h3FsRtDueObligations_(ss,'TRANSLATION','JP_TO_KR');

  var krCritical=kr.filter(function(x){return x.due_max<=next;});
  var jpCritical=jp.filter(function(x){return x.due_max<=next;});
  if(krCritical.length>=2){
    return {
      profile:'EDF_KR_TO_JP_2',
      override_reason:'DUE_MAX_AVOIDANCE',
      obligations:krCritical.slice(0,2)
    };
  }
  if(jpCritical.length>=2){
    return {
      profile:'EDF_JP_TO_KR_2',
      override_reason:'DUE_MAX_AVOIDANCE',
      obligations:jpCritical.slice(0,2)
    };
  }
  if(!kr.length||!jp.length){
    return {
      profile:'MIXED_1_1',
      override_reason:'',
      obligations:[],
      missing_direction:!kr.length?'KR_TO_JP':'JP_TO_KR'
    };
  }
  return {
    profile:'MIXED_1_1',
    override_reason:'',
    obligations:[kr[0],jp[0]]
  };
}

function h3FsTranslationIdentity_(ss) {
  var maxIssue=0;
  ['translation_stage_v1','translation_stage_v2'].forEach(function(name){
    var t=h3FsTable_(ss.getSheetByName(name));
    if(!t.headers.length||t.map.ISSUE_NO===undefined)return;
    t.rows.forEach(function(r){
      var n=Number(r[t.map.ISSUE_NO]||0);
      if(Number.isInteger(n)&&n>maxIssue)maxIssue=n;
    });
  });
  var issue=maxIssue+1;
  if(issue>999)throw new Error('FAMILY_SCHEDULER_TRANSLATION_ID_EXHAUSTED');
  var date=Utilities.formatDate(new Date(),'Asia/Tokyo','yyyyMMdd');
  var serial=String(issue).padStart(3,'0');
  return {
    issue_no:issue,
    set_id:'H3-'+date+'-T'+serial,
    stage_id:'TRANS-MIX-'+date+'-'+serial
  };
}

function h3FsPrepareTranslation_(ss) {
  var existing=h3FsFindPreparedTranslation_(ss);
  if(existing){
    return {
      status:'LOCKED',
      family:'T',
      set_id:existing.stage.set_id,
      profile:existing.stage.profile
    };
  }

  var selection=h3FsTranslationSelection_(ss);
  if(!selection.obligations.length){
    return {
      status:'AUTHORING_REQUIRED',
      family:'T',
      authoring_target:
        'TRANSLATION_DIRECTION_POOL:'+selection.missing_direction
    };
  }

  var used=h3FsTranslationUsed_(ss);
  var items=[];
  for(var i=0;i<selection.obligations.length;i++){
    var obligation=selection.obligations[i];
    var item=h3FsTranslationSourceForObligation_(ss,obligation,used);
    if(!item){
      return {
        status:'AUTHORING_REQUIRED',
        family:'T',
        authoring_target:
          'TRANSLATION_RETEST_SURFACE:'+
          obligation.skill_id+':'+obligation.direction,
        skill_id:obligation.skill_id,
        translation_direction:obligation.direction
      };
    }
    items.push(item);
    used.item_ids.push(item.item_id);
    used.item_map[item.item_id]=true;
    used.surface_keys.push(item.surface_key);
  }

  var source={
    schema:H3_TRANSLATION_V2_SOURCE_SCHEMA_,
    provider_kind:'WRITTEN',
    surface_family:'TRANSLATION',
    level:'3級',
    profile:selection.profile,
    override_reason:selection.override_reason,
    answer_type:'MULTIPLE_CHOICE',
    items:items
  };
  var locked=h3TranslationV2LockBundle_(source);
  var identity=h3FsTranslationIdentity_(ss);
  var stage=h3TranslationV2BuildStage_(
    identity,
    locked,
    h3ReadingProdNowTokyo_()
  );

  var sh=ss.getSheetByName(H3_TRANSLATION_V2_STAGE_SHEET_);
  if(!sh)throw new Error('FAMILY_SCHEDULER_TRANSLATION_STAGE_MISSING');
  var t=h3FsTable_(sh);
  h3FsRequire_(t,H3_TRANSLATION_V2_STAGE_HEADERS_,H3_TRANSLATION_V2_STAGE_SHEET_);

  sh.appendRow([
    stage.stage_id,
    stage.issue_no,
    stage.set_id,
    stage.status,
    stage.level,
    stage.profile,
    stage.answer_type,
    stage.item_count,
    stage.source_binding_sha256,
    stage.locked_bundle_sha256,
    stage.locked_bundle_json,
    stage.created_at,
    stage.locked_at,
    '',
    ''
  ]);
  SpreadsheetApp.flush();

  var readback=h3FsFindPreparedTranslation_(ss);
  if(
    !readback||
    String(readback.stage.set_id)!==String(stage.set_id)||
    String(readback.stage.source_binding_sha256)!==
      String(stage.source_binding_sha256)
  ){
    throw new Error('FAMILY_SCHEDULER_TRANSLATION_PREPARE_READBACK_FAIL');
  }

  return {
    status:'LOCKED',
    family:'T',
    set_id:stage.set_id,
    profile:stage.profile,
    skill_ids:selection.obligations.map(function(x){return x.skill_id;})
  };
}
