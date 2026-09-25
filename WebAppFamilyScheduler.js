var H3_FS_STATE_SHEET_ = 'family_scheduler_state_v1';
var H3_FS_LOG_SHEET_ = 'family_scheduler_decision_log_v1';
var H3_FS_STATE_SCHEMA_ = 'H3_FAMILY_SCHEDULER_STATE_V1';
var H3_FS_OUTPUT_SCHEMA_ = 'H3_FAMILY_SCHEDULER_V1';
var H3_FS_LIVE_RESOLVER_SCHEMA_ = 'H3_FAMILY_SCHEDULER_LIVE_RESOLVER_V1';
var H3_FS_ISSUE_ROUTE_SCHEMA_ = 'H3_FAMILY_SCHEDULER_ISSUE_ROUTE_V1';
var H3_FS_FAMILY_LAUNCH_PREVIEW_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_FAMILY_LAUNCH_PREVIEW_V1';
var H3_FS_FAMILY_LAUNCH_RESULT_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_FAMILY_LAUNCH_RESULT_V1';
var H3_FS_S2_BUTTON_MODE_ =
  'MODE_B_FAMILY_SPECIFIC_LAUNCH_ONLY_IF_ELIGIBLE';
var H3_FS_ISSUE_ROUTE_BINDINGS_ = {
  L: {
    provider_kind:'LISTENING',
    surface_family:'5L',
    route_target:'LISTENING'
  },
  W: {
    provider_kind:'WRITTEN',
    surface_family:'5W',
    route_target:'WRITTEN'
  },
  R: {
    provider_kind:'WRITTEN',
    surface_family:'READING',
    route_target:'READING'
  },
  T: {
    provider_kind:'WRITTEN',
    surface_family:'TRANSLATION',
    route_target:'TRANSLATION'
  }
};
var H3_FS_FAMILIES_ = ['L','W','R','T'];
var H3_FS_TARGET_ = {L:0.40,W:0.36,R:0.12,T:0.12};
var H3_FS_SET_SIZE_ = {L:5,W:5,R:2,T:2};
var H3_FS_CAP_ = {L:6,W:6,R:7,T:7};
var H3_FS_F4_START_CLOCK_ = 27;
var H3_FS_F4_TARGET_COMMITS_ = 20;
var H3_FS_STATE_HEADERS_ = [
  'LEVEL','STATE_SCOPE','SCHEMA_VERSION','MODE','ACTIVATED_AT',
  'ACTIVATION_COMMIT_KEY','GLOBAL_SET_CLOCK','LAST_PROCESSED_COMMIT_KEY',
  'LAST_PROCESSED_COMMIT_AT','LAST_GLOBAL_CLOCK','LAST_COMMITTED_SET_ID',
  'LAST_COMMITTED_AT','FAMILY_COMMITTED_SET_COUNT',
  'PROSPECTIVE_OBLIGATIONS_JSON','LAST_STATE_SYNC_AT','STATE_SHA256','NOTES'
];
var H3_FS_LOG_HEADERS_ = [
  'EVENT_ID','DECISION_ID','EVENT_KIND','CREATED_AT','LEVEL','MODE',
  'GLOBAL_SET_CLOCK','SNAPSHOT_SHA256','NEXT_ACTION','RECOMMENDED_FAMILY',
  'PRIMARY_REASON','CANDIDATE_ORDER_JSON','FAMILY_METRICS_JSON',
  'CURRENT_SET_ID','ACTUAL_FAMILY','SELECTION_SOURCE','SCHEDULER_APPLIED',
  'OVERRIDE_OF_RECOMMENDATION','COMMITTED_SET_ID','COMMIT_KEY',
  'RESULT_STATUS','NOTES'
];

var H3_FS_AUTHORING_QUEUE_SHEET_ = 'authoring_queue_v1';
var H3_FS_AUTHORING_QUEUE_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_AUTHORING_QUEUE_V1';
var H3_FS_AUTHORING_TARGET_IDENTITY_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_AUTHORING_TARGET_IDENTITY_V1';
var H3_FS_AUTHORING_CONTRACT_ID_ =
  'H3-SEMANTIC-AUTHORING-QUEUE-20260924-V1';
var H3_FS_AUTHORING_REQUEST_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_AUTHORING_JOB_REQUEST_V1';
var H3_FS_AUTHORING_RECONCILIATION_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_AUTHORING_RECONCILIATION_V1';
var H3_FS_AUTHORING_OBSERVABILITY_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_AUTHORING_OBSERVABILITY_V1';
var H3_FS_AUTHORING_OBSERVABILITY_RECENT_HOURS_ = 24;
var H3_FS_AUTHORING_RECOVERY_POLICY_ID_ =
  'H3-SEMANTIC-AUTHORING-RECOVERY-20260924-V1';
var H3_FS_AUTHORING_CLAIM_STALE_MINUTES_ = 120;
var H3_FS_AUTHORING_RETRY_BACKOFF_MINUTES_ = 60;
var H3_FS_AUTHORING_MAX_ATTEMPTS_ = 3;
var H3_FS_AUTHORING_QUEUE_HEADERS_ = [
  'JOB_ID','CREATED_AT','UPDATED_AT','LEVEL','FAMILY','TARGET_ID',
  'TARGET_KIND','AUTHORING_TARGET','STATUS','PRIORITY','SNAPSHOT_SHA256',
  'IDEMPOTENCY_KEY','SOURCE_CONSTRAINT_JSON','SCHEDULER_CONTEXT_JSON',
  'AUTHORING_REQUEST_JSON','RESULT_REF','RESULT_SHA256','ERROR',
  'ATTEMPT_COUNT','CLAIMED_AT','COMPLETED_AT'
];

var H3_MONITOR_OBSERVER_SHEET_ = 'monitor_observer_v1';
var H3_MONITOR_OBSERVER_SCHEMA_ = 'H3_MONITOR_OBSERVER_V1';
var H3_MONITOR_OBSERVER_SNAPSHOT_SCHEMA_ =
  'H3_MONITOR_OBSERVER_SNAPSHOT_V1';
var H3_MONITOR_OBSERVER_HEADERS_ = [
  'LEVEL','SCHEMA_VERSION','LAST_CHECKED_AT','STATUS','SOURCE_COUNT',
  'ERROR_COUNT','ACTION_REQUIRED_COUNT','SNAPSHOT_SHA256','SNAPSHOT_JSON'
];

var H3_MONITOR_SEMANTIC_AUTHORING_SCHEMA_ =
  'H3_MONITOR_SEMANTIC_AUTHORING_SOURCE_V1';
var H3_MONITOR_SEMANTIC_AUTHORING_SOURCE_ID_ =
  'SEMANTIC_AUTHORING_QUEUE';

var H3_MONITOR_RS13_RS14_SCHEMA_ =
  'H3_MONITOR_RS13_RS14_GATE_SOURCE_V1';
var H3_MONITOR_RS13_RS14_SOURCE_ID_ =
  'RS13_RS14_GATE';
var H3_MONITOR_RS13_RS14_REPORT_CONTRACT_ =
  'H3-RS13G-GATE-REPORTER-20260922-V1';
var H3_MONITOR_RS13_RS14_K1_CONTRACT_ =
  'H3-RS13K1-K1-SECONDARY-AUTHORITY-20260922-V1';
var H3_MONITOR_RS13_RS14_THRESHOLDS_ = {
  distinct_events:6,
  concepts:2,
  source_families:2,
  require_noncorrect:1,
  unsafe_rows:0,
  scheduler_applied_true:0
};



var H3_MONITOR_NOTIFICATION_SHEET_ = 'monitor_notification_v1';
var H3_MONITOR_NOTIFICATION_SCHEMA_ = 'H3_MONITOR_NOTIFICATION_V1';
var H3_MONITOR_EMAIL_CONFIG_SCHEMA_ = 'H3_MONITOR_EMAIL_CONFIG_V1';
var H3_MONITOR_EMAIL_CONFIG_KEY_ = 'H3_MONITOR_EMAIL_TO';
var H3_MONITOR_NOTIFICATION_MAX_ATTEMPTS_ = 3;
var H3_MONITOR_NOTIFICATION_HEADERS_ = [
  'IDENTITY','SCHEMA_VERSION','SOURCE_ID','EVENT_TYPE','EVENT_KEY',
  'ACTIVE','GENERATION','STATUS','ATTEMPT_COUNT','FIRST_SEEN_AT',
  'LAST_SEEN_AT','LAST_ATTEMPT_AT','LAST_SENT_AT','LAST_ERROR',
  'DETAIL_HASH'
];

var H3_MONITOR_HOME_READ_MODEL_SCHEMA_ =
  'H3_MONITOR_HOME_READ_MODEL_V1';
var H3_MONITOR_HOME_EVENT_LIMIT_ = 6;
function h3FsAuthoringRecoveryPolicy_() {
  return {
    policy_id:H3_FS_AUTHORING_RECOVERY_POLICY_ID_,
    claim_stale_minutes:H3_FS_AUTHORING_CLAIM_STALE_MINUTES_,
    retry_backoff_minutes:H3_FS_AUTHORING_RETRY_BACKOFF_MINUTES_,
    max_attempts:H3_FS_AUTHORING_MAX_ATTEMPTS_
  };
}

function h3FsTable_(sheet) {
  if (!sheet) return {headers:[],map:{},rows:[]};
  var v=sheet.getDataRange().getValues();
  if (!v.length) return {headers:[],map:{},rows:[]};
  var h=v[0].map(function(x){return String(x||'');}),m={};
  h.forEach(function(x,i){if(x)m[x]=i;});
  return {headers:h,map:m,rows:v.slice(1)};
}

function h3FsRequire_(t,names,label) {
  names.forEach(function(n){
    if(t.map[n]===undefined) throw new Error('FAMILY_SCHEDULER_MISSING_COLUMN:'+label+':'+n);
  });
}

function h3FsCanonical_(x) {
  function norm(v) {
    if(Array.isArray(v)) return v.map(norm);
    if(v && Object.prototype.toString.call(v)==='[object Object]') {
      var o={};
      Object.keys(v).sort().forEach(function(k){o[k]=norm(v[k]);});
      return o;
    }
    return v;
  }
  return JSON.stringify(norm(x));
}

function h3FsSha_(x) {
  return hash_(typeof x==='string' ? x : h3FsCanonical_(x));
}

function h3FsJson_(x,d) {
  if(x===''||x===null||x===undefined) return d;
  try{return JSON.parse(String(x));}
  catch(e){throw new Error('FAMILY_SCHEDULER_JSON_INVALID');}
}

function h3FsFamily_(surface) {
  surface=String(surface||'');
  if(surface==='5L')return 'L';
  if(surface==='5W')return 'W';
  if(surface==='READING')return 'R';
  if(surface==='TRANSLATION')return 'T';
  return '';
}

function h3FsHistory_(ss,level) {
  var t=h3FsTable_(ss.getSheetByName('review_home_index_v1'));
  h3FsRequire_(t,['SET_ID','SET_NO','ANSWERED_AT','TOTAL','STATUS','SURFACE_FAMILY','LEVEL'],'review_home_index_v1');
  var a=[];
  t.rows.forEach(function(r){
    if(String(r[t.map.STATUS]||'')!=='ACTIVE')return;
    if(String(r[t.map.LEVEL]||'')!==level)return;
    var f=h3FsFamily_(r[t.map.SURFACE_FAMILY]);
    if(!f)return;
    var id=String(r[t.map.SET_ID]||''),at=String(r[t.map.ANSWERED_AT]||''),total=Number(r[t.map.TOTAL]||0),setNo=Number(r[t.map.SET_NO]||0);
    if(!id||!at||!Number.isInteger(total)||total<1||!Number.isInteger(setNo)||setNo<1)throw new Error('FAMILY_SCHEDULER_HISTORY_INVALID');
    a.push({family:f,set_id:id,set_no:setNo,answered_at:at,total:total});
  });
  a.sort(function(x,y){
    var d=Date.parse(x.answered_at)-Date.parse(y.answered_at);
    if(d)return d;
    return x.set_id<y.set_id?-1:x.set_id>y.set_id?1:0;
  });
  var c={L:0,W:0,R:0,T:0};
  a.forEach(function(x,i){
    c[x.family]+=1;
    x.global_clock=i+1;
    x.family_clock=c[x.family];
    x.commit_key=[x.family,x.set_id,x.answered_at].join('|');
  });
  return a;
}

function h3FsStateHash_(o) {
  var a=H3_FS_STATE_HEADERS_.filter(function(h){return h!=='STATE_SHA256';})
    .map(function(h){return o[h]===undefined?'':o[h];});
  return h3FsSha_(JSON.stringify(a));
}

function h3FsState_(ss,level) {
  var sh=ss.getSheetByName(H3_FS_STATE_SHEET_);
  if(!sh)throw new Error('FAMILY_SCHEDULER_STATE_SHEET_MISSING');
  var t=h3FsTable_(sh);
  h3FsRequire_(t,H3_FS_STATE_HEADERS_,H3_FS_STATE_SHEET_);
  var s={};
  t.rows.forEach(function(r,rowIndex){
    if(String(r[t.map.LEVEL]||'')!==level)return;
    var k=String(r[t.map.STATE_SCOPE]||''),o={};
    H3_FS_STATE_HEADERS_.forEach(function(h){o[h]=r[t.map[h]];});
    o._rowNumber=rowIndex+2;
    if(s[k])throw new Error('FAMILY_SCHEDULER_DUPLICATE_SCOPE:'+k);
    s[k]=o;
  });
  ['GLOBAL'].concat(H3_FS_FAMILIES_).forEach(function(k){
    if(!s[k])throw new Error('FAMILY_SCHEDULER_SCOPE_MISSING:'+k);
    if(String(s[k].SCHEMA_VERSION)!==H3_FS_STATE_SCHEMA_)throw new Error('FAMILY_SCHEDULER_SCHEMA_MISMATCH');
    if(String(s[k].MODE)!=='SHADOW')throw new Error('FAMILY_SCHEDULER_NOT_SHADOW');
    if(String(s[k].STATE_SHA256||'')!==h3FsStateHash_(s[k]))throw new Error('FAMILY_SCHEDULER_STATE_HASH_MISMATCH:'+k);
  });
  return s;
}

function h3FsKv_(ss,name) {
  var t=h3FsTable_(ss.getSheetByName(name)),o={};
  if(!t.headers.length)return o;
  var ki=t.map.STATE_KEY!==undefined?t.map.STATE_KEY:0;
  var vi=t.map.VALUE!==undefined?t.map.VALUE:1;
  t.rows.forEach(function(r){var k=String(r[ki]||'');if(k)o[k]=r[vi];});
  return o;
}

function h3FsCurrent_(ss,history) {
  var done={}; history.forEach(function(x){done[x.set_id]=true;});
  var found=[];
  function scan(name,setCol,issuedCol,statusCol){
    var t=h3FsTable_(ss.getSheetByName(name));
    if(t.map[setCol]===undefined)return;
    t.rows.forEach(function(r){
      var id=String(r[t.map[setCol]]||'');
      if(!id||done[id])return;
      var issued=t.map[issuedCol]===undefined?'':String(r[t.map[issuedCol]]||'');
      var status=t.map[statusCol]===undefined?'':String(r[t.map[statusCol]]||'');
      if(issued||status==='ISSUED')found.push(id);
    });
  }
  scan('written_set_stage_v1','ACTUAL_SET_ID','ISSUED_AT','STATUS');
  scan('listening_set_payload_v1','LISTENING_SET_ID','ISSUED_AT','STATUS');
  scan('reading_stage_v1','SET_ID','ISSUED_AT','STATUS');
  scan('translation_stage_v2','SET_ID','ISSUED_AT','STATUS');
  found=found.filter(function(x,i,a){return a.indexOf(x)===i;});
  if(found.length>1)return {ambiguous:true,set_id:''};
  return {ambiguous:false,set_id:found.length?found[0]:''};
}

function h3FsWrittenPointerState_(ss) {
  var gs=h3FsKv_(ss,'generation_state_v1');
  var block=Number(gs.NEXT_BLOCK_NO||0);
  var offset=Number(gs.NEXT_SET_OFFSET||0);
  if(
    !Number.isInteger(block)||block<1||
    !Number.isInteger(offset)||offset<1
  ){
    throw new Error(
      'FAMILY_SCHEDULER_WRITTEN_POINTER_INVALID'
    );
  }

  var derived=
    'STD-B'+String(block).padStart(3,'0')+
    '-S'+String(offset);
  var nextId=String(
    gs.WRITTEN_NEXT_STAGE_ID||''
  ).trim();
  var canonicalId=String(
    gs.WRITTEN_NEXT_STAGE_CANONICAL_ID||''
  ).trim();

  if(
    !nextId||
    !canonicalId||
    nextId!==canonicalId||
    nextId!==derived
  ){
    throw new Error(
      'FAMILY_SCHEDULER_WRITTEN_POINTER_DIVERGED'
    );
  }
  if(
    String(
      gs.WRITTEN_NEXT_STAGE_STATUS||''
    )!=='READY_TO_PATCH'
  ){
    throw new Error(
      'FAMILY_SCHEDULER_WRITTEN_POINTER_STATUS_INVALID'
    );
  }

  return {
    stage_id:nextId,
    block_no:block,
    set_offset:offset,
    state:gs
  };
}

function h3FsWrittenAnswerSyncGate_(ss,stageId) {
  var pointer=h3FsWrittenPointerState_(ss);
  if(
    String(stageId||'')!==pointer.stage_id
  ){
    throw new Error(
      'FAMILY_SCHEDULER_WRITTEN_SYNC_STAGE_POINTER_MISMATCH'
    );
  }

  var sh=ss.getSheetByName(
    'written_answer_sync_v1'
  );
  if(!sh){
    throw new Error(
      'FAMILY_SCHEDULER_WRITTEN_SYNC_JOURNAL_MISSING'
    );
  }
  var t=h3FsTable_(sh);
  h3FsRequire_(t,[
    'TXN_ID','SET_ID','STATUS','PHASE',
    'NEXT_STAGE_ID','NEXT_STAGE_STATUS',
    'COMPLETED_AT','ERROR'
  ],'written_answer_sync_v1');

  var found=[];
  t.rows.forEach(function(r,i){
    if(
      String(
        r[t.map.NEXT_STAGE_ID]||''
      )===pointer.stage_id
    ){
      found.push({
        row:r,
        rowNumber:i+2
      });
    }
  });
  if(found.length!==1){
    throw new Error(
      'FAMILY_SCHEDULER_WRITTEN_SYNC_COUNT:'+
      found.length
    );
  }

  var row=found[0].row;
  var setId=String(
    row[t.map.SET_ID]||''
  );
  if(
    String(row[t.map.STATUS]||'')!=='COMMITTED'||
    String(row[t.map.PHASE]||'')!=='CORE_COMPLETE'||
    String(row[t.map.NEXT_STAGE_STATUS]||'')!=='READY_TO_PATCH'||
    !String(row[t.map.COMPLETED_AT]||'')||
    String(row[t.map.ERROR]||'')
  ){
    throw new Error(
      'FAMILY_SCHEDULER_WRITTEN_SYNC_NOT_CORE_COMPLETE'
    );
  }

  var gs=pointer.state;
  if(
    !setId||
    String(gs.ANSWER_SYNC_PHASE||'')!=='COMPLETE'||
    String(gs.ANSWER_SYNC_SET_ID||'')!==setId||
    String(gs.ANSWER_SYNC_STATUS||'')!==
      setId+'_CORE_COMPLETE'||
    String(gs.WRITTEN_LAST_SYNCED_SET||'')!==setId
  ){
    throw new Error(
      'FAMILY_SCHEDULER_WRITTEN_SYNC_STATE_DRIFT'
    );
  }

  return {
    txn_id:String(row[t.map.TXN_ID]||''),
    set_id:setId,
    stage_id:pointer.stage_id,
    status:'COMMITTED',
    phase:'CORE_COMPLETE'
  };
}

function h3FsFindPreparedWritten_(ss) {
  var pointer=h3FsWrittenPointerState_(ss);
  var stageId=pointer.stage_id;
  h3FsWrittenAnswerSyncGate_(
    ss,
    stageId
  );

  var sh=ss.getSheetByName('written_set_stage_v1');
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(t,[
    'STAGE_ID','STATUS','QUESTIONS_LOG_TEMPLATE','ANSWER_KEY_JSON',
    'QUESTION_META_JSON','Q1_AUDIO','Q2_AUDIO','Q3_AUDIO','Q4_AUDIO',
    'Q5A1','Q5B1','Q5A2','APPROVED_SOURCE','POLICY_ID',
    'SOURCE_SNAPSHOT_ID','ACTUAL_SET_ID','ISSUED_AT'
  ],'written_set_stage_v1');

  var found=[];
  t.rows.forEach(function(r,i){
    if(String(r[t.map.STAGE_ID]||'')!==stageId)return;
    found.push({row:r,rowNumber:i+2,map:t.map,sheet:sh,stage_id:stageId});
  });
  if(found.length!==1)return null;

  var x=found[0],r=x.row,m=x.map;
  if(
    String(r[m.STATUS]||'')!=='READY_TO_PATCH' ||
    String(r[m.ACTUAL_SET_ID]||'') ||
    String(r[m.ISSUED_AT]||'')
  )return null;

  var required=[
    'QUESTIONS_LOG_TEMPLATE','ANSWER_KEY_JSON','QUESTION_META_JSON',
    'Q1_AUDIO','Q2_AUDIO','Q3_AUDIO','Q4_AUDIO','Q5A1','Q5B1','Q5A2',
    'APPROVED_SOURCE','POLICY_ID','SOURCE_SNAPSHOT_ID'
  ];
  for(var i=0;i<required.length;i++){
    if(!String(r[m[required[i]]]||'').trim())return null;
  }

  var answers=h3WrittenParseJson_(
    r[m.ANSWER_KEY_JSON],
    'FAMILY_SCHEDULER_WRITTEN_ANSWER_KEY_INVALID'
  );
  var meta=h3WrittenParseJson_(
    r[m.QUESTION_META_JSON],
    'FAMILY_SCHEDULER_WRITTEN_META_INVALID'
  );
  if(
    !Array.isArray(answers)||
    answers.length!==5||
    !meta||
    !Array.isArray(meta.questions)||
    meta.questions.length!==5||
    !Array.isArray(meta.planned_slots)||
    meta.planned_slots.length!==5
  ){
    return null;
  }

  meta.planned_slots.forEach(
    function(slot,index){
      if(
        Number(slot.q)!==index+1||
        !String(slot.section||'')||
        !String(slot.bucket||'')
      ){
        throw new Error(
          'FAMILY_SCHEDULER_WRITTEN_SLOT_INVALID:'+
          (index+1)
        );
      }
    }
  );
  h3WrittenNewfmtValidatePlannedSlots_(
    meta.planned_slots
  );

  return x;
}

function h3FsFindPreparedReading_(ss) {
  var sh=ss.getSheetByName('reading_stage_v1');
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(t,H3_READING_STAGE_HEADERS_,'reading_stage_v1');
  var found=[];
  t.rows.forEach(function(r,i){
    if(
      String(r[t.map.STATUS]||'')==='PREISSUE_READY' &&
      !String(r[t.map.ISSUED_AT]||'') &&
      !String(r[t.map.COMMITTED_AT]||'')
    )found.push({row:r,rowNumber:i+2});
  });
  if(found.length>1)throw new Error('FAMILY_SCHEDULER_READING_PREPARED_AMBIGUOUS');
  if(!found.length)return null;
  var parsed=h3ReadingProdStageFromRow_(t,found[0]);
  var committed=t.rows.filter(function(r){
    return String(r[t.map.COMMITTED_AT]||'');
  }).map(function(r){return String(r[t.map.SET_ID]||'');});
  h3ReadingPreissueValidate_(parsed.stage,parsed.locked,committed);
  return {
    sheet:sh,
    table:t,
    rowNumber:parsed.rowNumber,
    stage:parsed.stage,
    locked:parsed.locked
  };
}

function h3FsFindPreparedTranslation_(ss) {
  var sh=ss.getSheetByName(H3_TRANSLATION_V2_STAGE_SHEET_);
  if(!sh)return null;
  var t=h3TranslationV2ProdTable_(
    sh,
    H3_TRANSLATION_V2_STAGE_HEADERS_,
    'TRANSLATION_V2_STAGE'
  );
  var found=[];
  t.rows.forEach(function(r,i){
    if(
      String(r[t.map.STATUS]||'')==='LOCKED' &&
      !String(r[t.map.ISSUED_AT]||'') &&
      !String(r[t.map.COMMITTED_AT]||'')
    )found.push({row:r,rowNumber:i+2});
  });
  if(found.length>1)throw new Error('FAMILY_SCHEDULER_TRANSLATION_PREPARED_AMBIGUOUS');
  if(!found.length)return null;
  var parsed=h3TranslationV2ProdStageFromRow_(t,found[0]);
  h3TranslationV2BuildRenderPayload_(parsed.stage,parsed.locked);
  return {
    sheet:sh,
    table:t,
    rowNumber:parsed.rowNumber,
    stage:parsed.stage,
    locked:parsed.locked
  };
}

function h3FsRtLaneReadiness_(ss) {
  var rt=h3FsTable_(ss.getSheetByName('rt_lane_state_v1'));
  if(
    typeof H3_RT_LANE_STATE_HEADERS_==='undefined'||
    JSON.stringify(rt.headers)!==JSON.stringify(H3_RT_LANE_STATE_HEADERS_)
  ){
    return {ok:false,reason:'RT_LANE_STATE_SCHEMA'};
  }
  var matches=rt.rows.filter(function(r){
    return String(r[rt.map.LEVEL]||'')==='3級';
  });
  if(matches.length!==1){
    return {ok:false,reason:'RT_LANE_STATE_LEVEL_COUNT'};
  }
  return {ok:true,row:matches[0],map:rt.map};
}

function h3FsReadiness_(ss) {
  var out={},ls=h3FsKv_(ss,'listening_state_v1');
  if(String(ls.PRODUCTION_GATE||'')!=='NORMAL_LIVE_ACTIVE'||String(ls.ANSWER_SYNC_PHASE||'')!=='IDLE') {
    out.L={state:'BLOCKED',eligible:false,reason:'LISTENING_RUNTIME_GATE'};
  } else {
    var next=Number(ls.NEXT_LISTENING_SET_NO||0);
    var ready=!!h3FsReadyListeningPayload_(ss,next);
    out.L={state:ready?'READY':'PREPARE_REQUIRED',eligible:true,reason:''};
  }

  var gs=h3FsKv_(ss,'generation_state_v1');
  if(String(gs.STATUS||'')!=='VERIFIED'){
    out.W={state:'BLOCKED',eligible:false,reason:'WRITTEN_RUNTIME_GATE'};
  } else {
    out.W={
      state:h3FsFindPreparedWritten_(ss)?'READY':'PREPARE_REQUIRED',
      eligible:true,
      reason:''
    };
  }

  var rtGate=h3FsRtLaneReadiness_(ss);
  if(!rtGate.ok) {
    out.R={state:'BLOCKED',eligible:false,reason:rtGate.reason};
    out.T={state:'BLOCKED',eligible:false,reason:rtGate.reason};
  } else {
    out.R={
      state:h3FsFindPreparedReading_(ss)?'READY':'PREPARE_REQUIRED',
      eligible:true,
      reason:''
    };
    out.T={
      state:h3FsFindPreparedTranslation_(ss)?'READY':'PREPARE_REQUIRED',
      eligible:true,
      reason:''
    };
  }
  return out;
}

function h3FsBalance_(history,f) {
  var q=[];
  history.forEach(function(x){for(var i=0;i<x.total;i++)q.push(x.family);});
  q=q.slice(Math.max(0,q.length-40));
  for(var j=0;j<H3_FS_SET_SIZE_[f];j++)q.push(f);
  if(q.length>40)q=q.slice(q.length-40);
  var c={L:0,W:0,R:0,T:0}; q.forEach(function(x){c[x]++;});
  var loss=0;
  H3_FS_FAMILIES_.forEach(function(k){loss+=Math.abs(c[k]/q.length-H3_FS_TARGET_[k]);});
  return Math.round(loss*1000000)/1000000;
}

function h3FsPressure_(ss) {
  var o={L:{x:0,t:0,n:0},W:{x:0,t:0,n:0},R:{x:0,t:0,n:0},T:{x:0,t:0,n:0}};
  var ls=h3FsKv_(ss,'listening_state_v1'),plan=h3FsJson_(ls.OVERLOAD_PLAN_JSON||'',{}),nextL=Number(ls.NEXT_LISTENING_SET_NO||0);
  (plan.active_obligations||[]).forEach(function(a){
    if(Number(a.due_min_set_no)<=nextL&&nextL<=Number(a.due_max_set_no)){
      if(String(a.latest_result)==='×')o.L.x++;
      if(String(a.latest_result)==='△')o.L.t++;
    }
    if(Number(a.correct_spaced_count||0)===1)o.L.n++;
  });
  var w=h3FsTable_(ss.getSheetByName('skill_queue_v1'));
  h3FsRequire_(w,['SKILL_ID','EFFECTIVE_STATE','ELIGIBLE_OVERRIDE','STABILITY_STATUS','CORRECT_SPACED_COUNT','LAST_RESULT','NOTES'],'skill_queue_v1');
  w.rows.forEach(function(r){
    var id=String(r[w.map.SKILL_ID]||'');
    if(!(/^H3-P[2-6]-SK/.test(id)||/^RT-H3-/.test(id)))return;
    if(String(r[w.map.NOTES]||'').indexOf('T8C_PLANNED_NOT_ACTIVE')>=0)return;
    var e=String(r[w.map.EFFECTIVE_STATE]||''),el=String(r[w.map.ELIGIBLE_OVERRIDE]||'');
    if(e==='RETEST_WRONG'&&el==='ELIGIBLE')o.W.x++;
    if(e==='RETEST_UNCERTAIN'&&el==='ELIGIBLE')o.W.t++;
    if(String(r[w.map.STABILITY_STATUS]||'')==='UNSTABLE'&&Number(r[w.map.CORRECT_SPACED_COUNT]||0)===1&&String(r[w.map.LAST_RESULT]||'')==='○')o.W.n++;
  });
  var rt=h3FsTable_(ss.getSheetByName('rt_skill_queue_v1'));
  h3FsRequire_(rt,['LEVEL','FAMILY','LATEST_NONCORRECT_RESULT','DUE_MIN','DUE_MAX','SPACED_CORRECT_COUNT','STABILITY_STATUS','LATEST_RESULT'],'rt_skill_queue_v1');
  var lane=h3FsTable_(ss.getSheetByName('rt_lane_state_v1')),rc=0,tc=0;
  if(lane.rows.length){rc=Number(lane.rows[0][lane.map.READING_CLOCK]||0);tc=Number(lane.rows[0][lane.map.TRANSLATION_CLOCK]||0);}
  rt.rows.forEach(function(r){
    if(String(r[rt.map.LEVEL]||'')!=='3級')return;
    var n=String(r[rt.map.FAMILY]||''),f=n==='READING'?'R':n==='TRANSLATION'?'T':'';
    if(!f)return;
    var next=(f==='R'?rc:tc)+1,mark=String(r[rt.map.LATEST_NONCORRECT_RESULT]||'');
    if(Number(r[rt.map.DUE_MIN]||0)<=next&&next<=Number(r[rt.map.DUE_MAX]||0)){
      if(mark==='×')o[f].x++;
      if(mark==='△')o[f].t++;
    }
    if(String(r[rt.map.STABILITY_STATUS]||'')==='UNSTABLE'&&Number(r[rt.map.SPACED_CORRECT_COUNT]||0)===1&&String(r[rt.map.LATEST_RESULT]||'')==='○')o[f].n++;
  });
  return o;
}

function h3FsP1_(state,globalClock,familyClock) {
  var a=h3FsJson_(state.PROSPECTIVE_OBLIGATIONS_JSON||'[]',[]);
  if(!a.length)return null;
  var best=null;
  a.forEach(function(x){
    var visits=Math.max(1,Number(x.local_due_min)-familyClock);
    var m={
      slack:Number(x.global_service_deadline)-globalClock-visits,
      result:String(x.origin_result||''),
      due_max:Number(x.local_due_max),
      origin_global:Number(x.origin_global_clock)
    };
    if(!best||m.slack<best.slack||
      (m.slack===best.slack&&m.result==='×'&&best.result!=='×')||
      (m.slack===best.slack&&m.result===best.result&&m.due_max<best.due_max)||
      (m.slack===best.slack&&m.result===best.result&&m.due_max===best.due_max&&m.origin_global<best.origin_global))best=m;
  });
  return best;
}

function h3FsVecCmp_(a,b) {
  for(var i=0;i<a.length;i++){if(a[i]!==b[i])return b[i]-a[i];}
  return 0;
}

function h3FsCmp_(a,b) {
  var ap=a.retest_advance_slack===null?Infinity:a.retest_advance_slack;
  var bp=b.retest_advance_slack===null?Infinity:b.retest_advance_slack;
  if(ap!==bp)return ap-bp;
  if(a.retest_origin_result!==b.retest_origin_result){
    if(a.retest_origin_result==='×')return -1;
    if(b.retest_origin_result==='×')return 1;
  }
  if(
    a.retest_origin_result &&
    b.retest_origin_result
  ){
    if(a.retest_local_due_max!==b.retest_local_due_max){
      return a.retest_local_due_max-b.retest_local_due_max;
    }
    var aog=a._retest_origin_global==null?Infinity:Number(a._retest_origin_global);
    var bog=b._retest_origin_global==null?Infinity:Number(b._retest_origin_global);
    if(aog!==bog)return aog-bog;
  }
  var as=a.sets_since_last>=a.starvation_cap,bs=b.sets_since_last>=b.starvation_cap;
  if(as!==bs)return as?-1:1;
  if(as&&bs){
    var ar=a.sets_since_last/a.starvation_cap,br=b.sets_since_last/b.starvation_cap;
    if(ar!==br)return br-ar;
    if(a.sets_since_last!==b.sets_since_last)return b.sets_since_last-a.sets_since_last;
    if(a.last_global_clock!==b.last_global_clock)return a.last_global_clock-b.last_global_clock;
  }
  if(a.projected_balance_loss!==b.projected_balance_loss)return a.projected_balance_loss-b.projected_balance_loss;
  var ac=a.coverage_shortfall===true,bc=b.coverage_shortfall===true;
  if(ac!==bc)return ac?-1:1;
  var v=h3FsVecCmp_(a.skill_pressure_vector,b.skill_pressure_vector);
  if(v)return v;
  if(a.last_global_clock!==b.last_global_clock)return a.last_global_clock-b.last_global_clock;
  return H3_FS_FAMILIES_.indexOf(a.family)-H3_FS_FAMILIES_.indexOf(b.family);
}

function h3FsReason_(a,b) {
  if(!b)return 'P6_TIEBREAK';
  var ap=a.retest_advance_slack===null?Infinity:a.retest_advance_slack;
  var bp=b.retest_advance_slack===null?Infinity:b.retest_advance_slack;
  if(ap!==bp||a.retest_origin_result!==b.retest_origin_result)return 'P1_RETEST_ADVANCE';
  if(
    a.retest_origin_result &&
    b.retest_origin_result &&
    (
      a.retest_local_due_max!==b.retest_local_due_max ||
      a._retest_origin_global!==b._retest_origin_global
    )
  )return 'P1_RETEST_ADVANCE';
  var as=a.sets_since_last>=a.starvation_cap,bs=b.sets_since_last>=b.starvation_cap;
  if(
    as!==bs ||
    (
      as&&bs&&(
        a.sets_since_last/a.starvation_cap!==b.sets_since_last/b.starvation_cap ||
        a.sets_since_last!==b.sets_since_last ||
        a.last_global_clock!==b.last_global_clock
      )
    )
  )return 'P2_STARVATION';
  if(a.projected_balance_loss!==b.projected_balance_loss)return 'P3_BALANCE';
  if((a.coverage_shortfall===true)!==(b.coverage_shortfall===true))return 'P4_COVERAGE';
  if(h3FsVecCmp_(a.skill_pressure_vector,b.skill_pressure_vector)!==0)return 'P5_SKILL_PRESSURE';
  return 'P6_TIEBREAK';
}

function h3FsEvaluate_(ss,level) {
  var state=h3FsState_(ss,level),history=h3FsHistory_(ss,level),clock=Number(state.GLOBAL.GLOBAL_SET_CLOCK||0);
  if(history.length!==clock)throw new Error('FAMILY_SCHEDULER_GLOBAL_CLOCK_DRIFT');
  var current=h3FsCurrent_(ss,history);
  if(current.ambiguous)return {
    schema:H3_FS_OUTPUT_SCHEMA_,mode:'SHADOW',global_set_clock:clock,
    next_action:'BLOCKED',recommended_family:'NONE',primary_reason:'ALL_BLOCKED',
    candidate_order:[],family_metrics:{},current_set_id:'',result_status:'BLOCKED'
  };
  var ready=h3FsReadiness_(ss),pressure=h3FsPressure_(ss),metrics={};
  H3_FS_FAMILIES_.forEach(function(f){
    var fc=Number(state[f].FAMILY_COMMITTED_SET_COUNT||0),p1=h3FsP1_(state[f],clock,fc);
    var last=state[f].LAST_GLOBAL_CLOCK===''?0:Number(state[f].LAST_GLOBAL_CLOCK||0);
    metrics[f]={
      family:f,readiness_state:ready[f].state,eligible:ready[f].eligible,
      exclusion_reason:ready[f].reason,last_global_clock:last||null,
      sets_since_last:last?clock-last:clock,starvation_cap:H3_FS_CAP_[f],
      retest_advance_slack:p1?p1.slack:null,
      retest_origin_result:p1?p1.result:'',
      retest_local_due_max:p1?p1.due_max:null,
      _retest_origin_global:p1?p1.origin_global:null,
      projected_balance_loss:h3FsBalance_(history,f),
      coverage_shortfall:null,coverage_deadline:null,
      x_due:pressure[f].x,triangle_due:pressure[f].t,near_stable:pressure[f].n,
      skill_pressure_vector:[
        Math.min(2,pressure[f].x),
        Math.min(2,pressure[f].t),
        Math.min(2,pressure[f].n)
      ]
    };
  });
  if(current.set_id){
    Object.keys(metrics).forEach(function(f){
      delete metrics[f]._retest_origin_global;
    });
    return {
      schema:H3_FS_OUTPUT_SCHEMA_,mode:'SHADOW',global_set_clock:clock,
      next_action:'RESUME_CURRENT',recommended_family:'NONE',
      primary_reason:'RESUME_CURRENT',candidate_order:[],
      family_metrics:metrics,current_set_id:current.set_id,result_status:'PASS'
    };
  }
  var a=H3_FS_FAMILIES_.map(function(f){return metrics[f];})
    .filter(function(x){return x.eligible;});
  if(!a.length){
    Object.keys(metrics).forEach(function(f){
      delete metrics[f]._retest_origin_global;
    });
    return {
      schema:H3_FS_OUTPUT_SCHEMA_,mode:'SHADOW',global_set_clock:clock,
      next_action:'BLOCKED',recommended_family:'NONE',primary_reason:'ALL_BLOCKED',
      candidate_order:[],family_metrics:metrics,current_set_id:'',result_status:'BLOCKED'
    };
  }
  a.sort(h3FsCmp_);
  var primaryReason=h3FsReason_(a[0],a[1]);
  Object.keys(metrics).forEach(function(f){
    delete metrics[f]._retest_origin_global;
  });
  return {
    schema:H3_FS_OUTPUT_SCHEMA_,mode:'SHADOW',global_set_clock:clock,
    next_action:'RECOMMEND_FAMILY',recommended_family:a[0].family,
    primary_reason:primaryReason,
    candidate_order:a.map(function(x){return x.family;}),
    family_metrics:metrics,current_set_id:'',result_status:'PASS'
  };
}

function h3FsResolveLive_(evaluation) {
  if(!evaluation || String(evaluation.schema||'')!==H3_FS_OUTPUT_SCHEMA_){
    throw new Error('FAMILY_SCHEDULER_LIVE_RESOLVER_SCHEMA_INVALID');
  }

  var clock=Number(evaluation.global_set_clock);
  if(!isFinite(clock) || clock<0){
    throw new Error('FAMILY_SCHEDULER_LIVE_RESOLVER_CLOCK_INVALID');
  }

  var action=String(evaluation.next_action||'');
  var status=String(evaluation.result_status||'');
  var family=String(evaluation.recommended_family||'');
  var currentSetId=String(evaluation.current_set_id||'');
  var reason=String(evaluation.primary_reason||'');

  var result={
    schema:H3_FS_LIVE_RESOLVER_SCHEMA_,
    mode:'LIVE_RESOLVER',
    scheduler_applied:false,
    global_set_clock:clock,
    source_next_action:action,
    primary_reason:reason,
    route_kind:'',
    family:'NONE',
    current_set_id:'',
    result_status:''
  };

  if(action==='RESUME_CURRENT'){
    if(status!=='PASS' || !currentSetId || family!=='NONE'){
      throw new Error('FAMILY_SCHEDULER_LIVE_RESOLVER_RESUME_INVALID');
    }
    result.route_kind='CURRENT_SET';
    result.current_set_id=currentSetId;
    result.result_status='READY';
    return result;
  }

  if(action==='BLOCKED'){
    if(status!=='BLOCKED' || currentSetId || family!=='NONE'){
      throw new Error('FAMILY_SCHEDULER_LIVE_RESOLVER_BLOCKED_INVALID');
    }
    result.route_kind='BLOCKED';
    result.result_status='BLOCKED';
    return result;
  }

  if(action==='RECOMMEND_FAMILY'){
    if(
      status!=='PASS' ||
      currentSetId ||
      H3_FS_FAMILIES_.indexOf(family)<0
    ){
      throw new Error('FAMILY_SCHEDULER_LIVE_RESOLVER_FAMILY_INVALID');
    }
    result.route_kind='FAMILY';
    result.family=family;
    result.result_status='READY';
    return result;
  }

  throw new Error('FAMILY_SCHEDULER_LIVE_RESOLVER_ACTION_INVALID');
}

function h3FsIssueRoute_(resolved,readiness,currentLearning) {
  if(
    !resolved ||
    String(resolved.schema||'')!==H3_FS_LIVE_RESOLVER_SCHEMA_ ||
    String(resolved.mode||'')!=='LIVE_RESOLVER' ||
    resolved.scheduler_applied!==false
  ){
    throw new Error('FAMILY_SCHEDULER_ISSUE_ROUTE_RESOLVER_INVALID');
  }

  var kind=String(resolved.route_kind||'');
  var base={
    schema:H3_FS_ISSUE_ROUTE_SCHEMA_,
    mode:'ISSUE_ROUTE',
    scheduler_applied:false,
    issue_performed:false,
    global_set_clock:Number(resolved.global_set_clock),
    route_kind:kind,
    family:'NONE',
    provider_kind:'',
    surface_family:'',
    route_target:'',
    current_set_id:'',
    readiness_state:'',
    requires_prepare:false,
    result_status:''
  };

  if(!isFinite(base.global_set_clock)||base.global_set_clock<0){
    throw new Error('FAMILY_SCHEDULER_ISSUE_ROUTE_CLOCK_INVALID');
  }

  if(kind==='CURRENT_SET'){
    var setId=String(resolved.current_set_id||'');
    if(
      !setId ||
      !currentLearning ||
      String(currentLearning.set_id||'')!==setId
    ){
      throw new Error('FAMILY_SCHEDULER_ISSUE_ROUTE_CURRENT_MISMATCH');
    }

    var surface=String(currentLearning.surface_family||'');
    var provider=String(currentLearning.provider_kind||'');
    var routeTarget='';
    if(provider==='LISTENING'&&surface==='5L')routeTarget='LISTENING';
    else if(provider==='WRITTEN'&&surface==='5W')routeTarget='WRITTEN';
    else if(provider==='WRITTEN'&&surface==='READING')routeTarget='READING';
    else if(provider==='WRITTEN'&&surface==='TRANSLATION')routeTarget='TRANSLATION';
    else throw new Error('FAMILY_SCHEDULER_ISSUE_ROUTE_CURRENT_SURFACE_INVALID');

    base.current_set_id=setId;
    base.provider_kind=provider;
    base.surface_family=surface;
    base.route_target=routeTarget;
    base.readiness_state='CURRENT_SET';
    base.result_status='READY';
    return base;
  }

  if(currentLearning){
    throw new Error('FAMILY_SCHEDULER_ISSUE_ROUTE_UNEXPECTED_CURRENT');
  }

  if(kind==='BLOCKED'){
    base.readiness_state='BLOCKED';
    base.result_status='BLOCKED';
    return base;
  }

  if(kind==='FAMILY'){
    var family=String(resolved.family||'');
    var binding=H3_FS_ISSUE_ROUTE_BINDINGS_[family];
    var ready=readiness&&readiness[family];

    if(
      !binding ||
      !ready ||
      ready.eligible!==true ||
      ['READY','PREPARE_REQUIRED'].indexOf(String(ready.state||''))<0
    ){
      throw new Error('FAMILY_SCHEDULER_ISSUE_ROUTE_FAMILY_NOT_ELIGIBLE');
    }

    base.family=family;
    base.provider_kind=binding.provider_kind;
    base.surface_family=binding.surface_family;
    base.route_target=binding.route_target;
    base.readiness_state=String(ready.state);
    base.requires_prepare=String(ready.state)!=='READY';
    base.result_status='READY';
    return base;
  }

  throw new Error('FAMILY_SCHEDULER_ISSUE_ROUTE_KIND_INVALID');
}

function h3FsSnapshot_(state,evaluation,history) {
  var tail=[];
  history.forEach(function(x){for(var i=0;i<x.total;i++)tail.push(x.family);});
  tail=tail.slice(Math.max(0,tail.length-40));
  return {
    schema:'H3_FAMILY_SCHEDULER_SNAPSHOT_V1',
    level:'3級',mode:'SHADOW',
    global_set_clock:evaluation.global_set_clock,
    activation_commit_key:String(state.GLOBAL.ACTIVATION_COMMIT_KEY||''),
    current_set_id:evaluation.current_set_id||'',
    last40_family_questions:tail,
    family_metrics:evaluation.family_metrics
  };
}

function h3FsAppend_(ss,level,e) {
  if(h3FsEvaluationAtClock_(ss,level,e.global_set_clock)){
    throw new Error(
      'FAMILY_SCHEDULER_EVALUATION_ALREADY_EXISTS:'+e.global_set_clock
    );
  }
  var sh=ss.getSheetByName(H3_FS_LOG_SHEET_);
  if(!sh)throw new Error('FAMILY_SCHEDULER_LOG_SHEET_MISSING');
  var t=h3FsTable_(sh); h3FsRequire_(t,H3_FS_LOG_HEADERS_,H3_FS_LOG_SHEET_);
  var state=h3FsState_(ss,level),history=h3FsHistory_(ss,level);
  var snap=h3FsSnapshot_(state,e,history),sha=h3FsSha_(snap);
  var suffix=sha.slice(0,12)+'-'+Utilities.getUuid().slice(0,8);
  var did='H3FS-D-'+suffix,eid='H3FS-E-'+suffix;
  sh.appendRow([
    eid,did,'EVALUATION',new Date().toISOString(),level,'SHADOW',
    e.global_set_clock,sha,e.next_action,e.recommended_family,e.primary_reason,
    JSON.stringify(e.candidate_order),JSON.stringify(e.family_metrics),
    e.current_set_id||'','','',false,'','','',
    e.result_status||'PASS','F3 SHADOW; scheduler not applied to issue selection.'
  ]);
  SpreadsheetApp.flush();
  return {event_id:eid,decision_id:did,snapshot_sha256:sha};
}


function h3FsLogRows_(ss,level) {
  var t=h3FsTable_(ss.getSheetByName(H3_FS_LOG_SHEET_));
  h3FsRequire_(t,H3_FS_LOG_HEADERS_,H3_FS_LOG_SHEET_);
  var out=[];
  t.rows.forEach(function(r,rowIndex){
    if(String(r[t.map.LEVEL]||'')!==level)return;
    var o={_rowNumber:rowIndex+2};
    H3_FS_LOG_HEADERS_.forEach(function(h){o[h]=r[t.map[h]];});
    out.push(o);
  });
  return out;
}

function h3FsEvaluationAtClock_(ss,level,clock) {
  var a=h3FsLogRows_(ss,level),found=[];
  a.forEach(function(x){
    if(
      String(x.EVENT_KIND||'')==='EVALUATION' &&
      String(x.MODE||'')==='SHADOW' &&
      Number(x.GLOBAL_SET_CLOCK)===Number(clock)
    ) found.push(x);
  });
  if(found.length>1)throw new Error('FAMILY_SCHEDULER_DUPLICATE_EVALUATION_CLOCK:'+clock);
  return found.length?found[0]:null;
}


function h3FsPersistedEvaluation_(row) {
  if(!row){
    throw new Error('FAMILY_SCHEDULER_PERSISTED_EVALUATION_MISSING');
  }
  var clock=Number(row.GLOBAL_SET_CLOCK);
  if(!isFinite(clock)||clock<0){
    throw new Error('FAMILY_SCHEDULER_PERSISTED_EVALUATION_CLOCK_INVALID');
  }
  return {
    schema:H3_FS_OUTPUT_SCHEMA_,
    mode:'SHADOW',
    global_set_clock:clock,
    next_action:String(row.NEXT_ACTION||''),
    recommended_family:String(row.RECOMMENDED_FAMILY||''),
    primary_reason:String(row.PRIMARY_REASON||''),
    candidate_order:h3FsJson_(
      row.CANDIDATE_ORDER_JSON||'[]',
      []
    ),
    family_metrics:h3FsJson_(
      row.FAMILY_METRICS_JSON||'{}',
      {}
    ),
    current_set_id:String(row.CURRENT_SET_ID||''),
    result_status:String(row.RESULT_STATUS||''),
    event_id:String(row.EVENT_ID||''),
    decision_id:String(row.DECISION_ID||''),
    snapshot_sha256:String(row.SNAPSHOT_SHA256||'')
  };
}

function h3FsAssertEvaluationReplay_(persisted,fresh) {
  if(!persisted||!fresh){
    throw new Error('FAMILY_SCHEDULER_EVALUATION_REPLAY_INPUT_MISSING');
  }
  var clock=Number(fresh.global_set_clock);
  if(
    Number(persisted.GLOBAL_SET_CLOCK)!==clock ||
    String(persisted.NEXT_ACTION||'')!==String(fresh.next_action||'') ||
    String(persisted.RECOMMENDED_FAMILY||'')!==
      String(fresh.recommended_family||'') ||
    String(persisted.PRIMARY_REASON||'')!==
      String(fresh.primary_reason||'') ||
    String(persisted.CANDIDATE_ORDER_JSON||'')!==
      JSON.stringify(fresh.candidate_order) ||
    String(persisted.CURRENT_SET_ID||'')!==
      String(fresh.current_set_id||'') ||
    String(persisted.RESULT_STATUS||'')!==
      String(fresh.result_status||'')
  ){
    throw new Error(
      'FAMILY_SCHEDULER_DETERMINISM_REPLAY_MISMATCH:'+clock
    );
  }
  return true;
}

function h3FsAssertIssueEvaluationBinding_(persisted,evaluation) {
  var canonical=h3FsPersistedEvaluation_(persisted);
  if(
    Number(canonical.global_set_clock)!==
      Number(evaluation.global_set_clock) ||
    canonical.next_action!==String(evaluation.next_action||'') ||
    canonical.recommended_family!==
      String(evaluation.recommended_family||'') ||
    canonical.primary_reason!==
      String(evaluation.primary_reason||'') ||
    h3FsCanonical_(canonical.candidate_order)!==
      h3FsCanonical_(evaluation.candidate_order||[]) ||
    h3FsCanonical_(canonical.family_metrics)!==
      h3FsCanonical_(evaluation.family_metrics||{}) ||
    canonical.current_set_id!==
      String(evaluation.current_set_id||'') ||
    canonical.result_status!==
      String(evaluation.result_status||'')
  ){
    throw new Error(
      'FAMILY_SCHEDULER_ISSUE_EVALUATION_BINDING_MISMATCH:'+
      canonical.global_set_clock
    );
  }
  return canonical;
}

function h3FsCommitObservedByKey_(ss,level,commitKey) {
  var a=h3FsLogRows_(ss,level),found=[];
  a.forEach(function(x){
    if(
      String(x.EVENT_KIND||'')==='COMMIT_OBSERVED' &&
      String(x.COMMIT_KEY||'')===String(commitKey)
    ) found.push(x);
  });
  if(found.length>1)throw new Error('FAMILY_SCHEDULER_DUPLICATE_COMMIT_OBSERVED:'+commitKey);
  return found.length?found[0]:null;
}

function h3FsStateValues_(o) {
  return H3_FS_STATE_HEADERS_.map(function(h){
    return o[h]===undefined?'':o[h];
  });
}

function h3FsWriteState_(ss,level,state) {
  var scopes=['GLOBAL'].concat(H3_FS_FAMILIES_);
  var rows=scopes.map(function(k){return state[k];});
  rows.forEach(function(o){
    if(!o||!o._rowNumber)throw new Error('FAMILY_SCHEDULER_STATE_ROWNUMBER_MISSING');
    o.STATE_SHA256=h3FsStateHash_(o);
  });
  var sorted=rows.slice().sort(function(a,b){return a._rowNumber-b._rowNumber;});
  for(var i=1;i<sorted.length;i++){
    if(sorted[i]._rowNumber!==sorted[i-1]._rowNumber+1){
      throw new Error('FAMILY_SCHEDULER_STATE_ROWS_NOT_CONTIGUOUS');
    }
  }
  var sh=ss.getSheetByName(H3_FS_STATE_SHEET_);
  sh.getRange(
    sorted[0]._rowNumber,
    1,
    sorted.length,
    H3_FS_STATE_HEADERS_.length
  ).setValues(sorted.map(h3FsStateValues_));
  SpreadsheetApp.flush();
  var readback=h3FsState_(ss,level);
  scopes.forEach(function(k){
    if(String(readback[k].STATE_SHA256)!==String(state[k].STATE_SHA256)){
      throw new Error('FAMILY_SCHEDULER_STATE_WRITE_READBACK_MISMATCH:'+k);
    }
  });
  return readback;
}

function h3FsHistoryRecord_(history,family,setId) {
  var found=history.filter(function(x){
    return x.family===family && x.set_id===setId;
  });
  if(found.length!==1)throw new Error('FAMILY_SCHEDULER_COMMIT_HISTORY_IDENTITY_INVALID:'+family+':'+setId);
  return found[0];
}

function h3FsObligationBaseKey_(skillId,direction) {
  return String(skillId||'')+'|'+String(direction||'');
}

function h3FsOpenObligations_(ss,family) {
  var out={};
  if(family==='L'){
    var ls=h3FsKv_(ss,'listening_state_v1');
    var plan=h3FsJson_(ls.OVERLOAD_PLAN_JSON||'',{});
    (plan.active_obligations||[]).forEach(function(a){
      var mark=String(a.latest_result||'');
      if(['×','△'].indexOf(mark)<0)return;
      var skill=String(a.skill_id||'');
      if(!skill)return;
      out[h3FsObligationBaseKey_(skill,'')]={
        skill_id:skill,
        direction:'',
        section:String(a.section||''),
        mark:mark,
        local_due_min:Number(a.due_min_set_no),
        local_due_max:Number(a.due_max_set_no),
        origin_family_clock:Number(a.origin_set_no||0)
      };
    });
    return out;
  }

  if(family==='W'){
    var w=h3FsTable_(ss.getSheetByName('skill_queue_v1'));
    h3FsRequire_(w,[
      'SKILL_ID','EFFECTIVE_STATE','LAST_RESULT',
      'RETEST_MIN_GAP_SETS','RETEST_MAX_GAP_SETS',
      'LAST_ISSUED_SET_ID','STATE_OVERRIDE','NOTES'
    ],'skill_queue_v1');
    w.rows.forEach(function(r){
      var skill=String(r[w.map.SKILL_ID]||'');
      if(!skill)return;
      if(!(/^H3-P[2-6]-SK/.test(skill)||/^RT-H3-/.test(skill)))return;
      if(String(r[w.map.NOTES]||'').indexOf('T8C_PLANNED_NOT_ACTIVE')>=0)return;
      var state=String(r[w.map.EFFECTIVE_STATE]||'');
      var mark=String(r[w.map.LAST_RESULT]||'');
      if(
        ['RETEST_WRONG','RETEST_UNCERTAIN'].indexOf(state)<0 ||
        ['×','△'].indexOf(mark)<0
      )return;
      var override=String(r[w.map.STATE_OVERRIDE]||''),section='';
      var m=/SECTION=([^;]+)/.exec(override);
      if(m)section=m[1];
      out[h3FsObligationBaseKey_(skill,'')]={
        skill_id:skill,
        direction:'',
        section:section,
        mark:mark,
        gap_min:Number(r[w.map.RETEST_MIN_GAP_SETS]||0),
        gap_max:Number(r[w.map.RETEST_MAX_GAP_SETS]||0),
        last_set_id:String(r[w.map.LAST_ISSUED_SET_ID]||'')
      };
    });
    return out;
  }

  var rt=h3FsTable_(ss.getSheetByName('rt_skill_queue_v1'));
  h3FsRequire_(rt,[
    'LEVEL','FAMILY','SKILL_ID','TRANSLATION_DIRECTION',
    'LATEST_RESULT','STRICT_ORIGIN_CLOCK','DUE_MIN','DUE_MAX',
    'LAST_SET_ID','STABILITY_STATUS'
  ],'rt_skill_queue_v1');
  var target=family==='R'?'READING':'TRANSLATION';
  rt.rows.forEach(function(r){
    if(String(r[rt.map.LEVEL]||'')!=='3級')return;
    if(String(r[rt.map.FAMILY]||'')!==target)return;
    var mark=String(r[rt.map.LATEST_RESULT]||'');
    if(['×','△'].indexOf(mark)<0)return;
    if(String(r[rt.map.STABILITY_STATUS]||'')==='STABLE')return;
    var skill=String(r[rt.map.SKILL_ID]||'');
    var direction=String(r[rt.map.TRANSLATION_DIRECTION]||'');
    if(!skill)return;
    out[h3FsObligationBaseKey_(skill,direction)]={
      skill_id:skill,
      direction:direction,
      section:'',
      mark:mark,
      local_due_min:Number(r[rt.map.DUE_MIN]||0),
      local_due_max:Number(r[rt.map.DUE_MAX]||0),
      origin_family_clock:Number(r[rt.map.STRICT_ORIGIN_CLOCK]||0),
      last_set_id:String(r[rt.map.LAST_SET_ID]||'')
    };
  });
  return out;
}

function h3FsReconcileObligations_(ss,family,currentJson) {
  var current=h3FsJson_(currentJson||'[]',[]);
  var open=h3FsOpenObligations_(ss,family),kept=[];
  current.forEach(function(x){
    var k=h3FsObligationBaseKey_(x.skill_id,x.direction);
    var a=open[k];
    if(!a)return;
    if(String(a.mark||'')!==String(x.origin_result||''))return;
    if(a.local_due_min){
      x.local_due_min=Number(a.local_due_min);
      x.local_due_max=Number(a.local_due_max);
    }
    kept.push(x);
  });
  kept.sort(function(a,b){
    return String(a.obligation_key).localeCompare(String(b.obligation_key));
  });
  return kept;
}

function h3FsNewCommitObligations_(ss,family,commit,globalClock,familyClock) {
  var out=[],open=h3FsOpenObligations_(ss,family);

  Object.keys(open).sort().forEach(function(k){
    var a=open[k],isNew=false,localMin=0,localMax=0,originClock=familyClock;

    if(family==='L'){
      isNew=Number(a.origin_family_clock)===Number(commit.set_no);
      localMin=Number(a.local_due_min);
      localMax=Number(a.local_due_max);
      originClock=Number(a.origin_family_clock);
    } else if(family==='W'){
      isNew=String(a.last_set_id||'')===String(commit.set_id);
      localMin=familyClock+Number(a.gap_min||0);
      localMax=familyClock+Number(a.gap_max||0);
    } else {
      isNew=String(a.last_set_id||'')===String(commit.set_id);
      localMin=Number(a.local_due_min);
      localMax=Number(a.local_due_max);
      originClock=Number(a.origin_family_clock);
      if(isNew && originClock!==Number(familyClock)){
        throw new Error('FAMILY_SCHEDULER_RT_ORIGIN_CLOCK_MISMATCH:'+family+':'+a.skill_id);
      }
    }

    if(!isNew)return;
    if(!localMin||!localMax||localMin>localMax){
      throw new Error('FAMILY_SCHEDULER_NEW_OBLIGATION_DUE_INVALID:'+family+':'+a.skill_id);
    }

    var mark=String(a.mark||'');
    var direction=String(a.direction||'');
    out.push({
      obligation_key:[
        'H3FSO',family,a.skill_id,direction,commit.commit_key
      ].join('|'),
      skill_id:String(a.skill_id||''),
      direction:direction,
      section:String(a.section||''),
      origin_result:mark,
      origin_family_clock:Number(originClock),
      origin_global_clock:Number(globalClock),
      local_due_min:Number(localMin),
      local_due_max:Number(localMax),
      global_service_deadline:Number(globalClock)+(mark==='×'?3:5),
      origin_set_id:String(commit.set_id),
      origin_commit_key:String(commit.commit_key)
    });
  });

  out.sort(function(a,b){
    return String(a.obligation_key).localeCompare(String(b.obligation_key));
  });
  return out;
}

function h3FsMergeObligations_(existing,newOnes) {
  var m={};
  existing.forEach(function(x){
    m[h3FsObligationBaseKey_(x.skill_id,x.direction)]=x;
  });
  newOnes.forEach(function(x){
    m[h3FsObligationBaseKey_(x.skill_id,x.direction)]=x;
  });
  return Object.keys(m).sort().map(function(k){return m[k];});
}

function h3FsSyncCommittedHistory_(ss,level,family,setId) {
  var state=h3FsState_(ss,level);
  var history=h3FsHistory_(ss,level);
  var commit=h3FsHistoryRecord_(history,family,setId);
  var oldClock=Number(state.GLOBAL.GLOBAL_SET_CLOCK||0);

  if(commit.global_clock<=oldClock){
    return {
      status:'ALREADY_SYNCED',
      previous_clock:commit.global_clock-1,
      global_clock:oldClock,
      commit:commit,
      state:state
    };
  }

  if(commit.global_clock!==oldClock+1 || history.length!==oldClock+1){
    throw new Error(
      'FAMILY_SCHEDULER_COMMIT_CLOCK_GAP:state='+
      oldClock+':commit='+commit.global_clock+':history='+history.length
    );
  }

  var previous=history[oldClock-1];
  if(
    oldClock>0 &&
    (
      !previous ||
      String(previous.commit_key)!==
        String(state.GLOBAL.LAST_PROCESSED_COMMIT_KEY||'')
    )
  ){
    throw new Error('FAMILY_SCHEDULER_PREVIOUS_COMMIT_CHECKPOINT_MISMATCH');
  }

  var now=new Date().toISOString();
  var reconciled={};
  H3_FS_FAMILIES_.forEach(function(f){
    reconciled[f]=h3FsReconcileObligations_(
      ss,
      f,
      state[f].PROSPECTIVE_OBLIGATIONS_JSON
    );
  });

  var familyHistory=history.filter(function(x){return x.family===family;});
  var newOnes=h3FsNewCommitObligations_(
    ss,
    family,
    commit,
    commit.global_clock,
    familyHistory.length
  );
  reconciled[family]=h3FsMergeObligations_(
    reconciled[family],
    newOnes
  );

  state.GLOBAL.GLOBAL_SET_CLOCK=history.length;
  state.GLOBAL.LAST_PROCESSED_COMMIT_KEY=commit.commit_key;
  state.GLOBAL.LAST_PROCESSED_COMMIT_AT=commit.answered_at;

  H3_FS_FAMILIES_.forEach(function(f){
    var fh=history.filter(function(x){return x.family===f;});
    var last=fh.length?fh[fh.length-1]:null;
    state[f].LAST_GLOBAL_CLOCK=last?last.global_clock:'';
    state[f].LAST_COMMITTED_SET_ID=last?last.set_id:'';
    state[f].LAST_COMMITTED_AT=last?last.answered_at:'';
    state[f].FAMILY_COMMITTED_SET_COUNT=fh.length;
    state[f].PROSPECTIVE_OBLIGATIONS_JSON=JSON.stringify(reconciled[f]);
    state[f].LAST_STATE_SYNC_AT=now;
  });
  state.GLOBAL.LAST_STATE_SYNC_AT=now;

  var readback=h3FsWriteState_(ss,level,state);
  return {
    status:'SYNCED',
    previous_clock:oldClock,
    global_clock:history.length,
    commit:commit,
    state:readback,
    new_obligations:newOnes.length
  };
}

function h3FsAppendCommitObserved_(ss,level,prior,commit,family,selectionSource,schedulerApplied) {
  var sh=ss.getSheetByName(H3_FS_LOG_SHEET_);
  if(!sh)throw new Error('FAMILY_SCHEDULER_LOG_SHEET_MISSING');
  var suffix=h3FsSha_(
    String(commit.commit_key)+'|'+String(prior.DECISION_ID||'')
  ).slice(0,12)+'-'+Utilities.getUuid().slice(0,8);
  var recommended=String(prior.RECOMMENDED_FAMILY||'');
  var override=(
    H3_FS_FAMILIES_.indexOf(recommended)>=0
      ? recommended!==family
      : ''
  );
  sh.appendRow([
    'H3FS-C-'+suffix,
    String(prior.DECISION_ID||''),
    'COMMIT_OBSERVED',
    new Date().toISOString(),
    level,
    schedulerApplied===true?'LIMITED_LIVE':'SHADOW',
    Number(prior.GLOBAL_SET_CLOCK||0),
    String(prior.SNAPSHOT_SHA256||''),
    String(prior.NEXT_ACTION||''),
    recommended,
    String(prior.PRIMARY_REASON||''),
    String(prior.CANDIDATE_ORDER_JSON||'[]'),
    String(prior.FAMILY_METRICS_JSON||'{}'),
    '',
    family,
    selectionSource||'LEGACY_TRIGGER',
    schedulerApplied===true,
    override,
    commit.set_id,
    commit.commit_key,
    'COMMITTED',
    schedulerApplied===true
      ? 'LIMITED LIVE observation; actual family originated from Family Scheduler.'
      : 'F4 SHADOW observation; actual family did not originate from scheduler.'
  ]);
  SpreadsheetApp.flush();
  return {
    status:'COMMITTED',
    recommended_family:recommended,
    actual_family:family,
    override_of_recommendation:override
  };
}

function h3FsIssueAppliedForSet_(ss,level,setId) {
  var rows=h3FsLogRows_(ss,level),found=[];
  rows.forEach(function(x){
    if(
      String(x.EVENT_KIND||'')==='ISSUE_APPLIED' &&
      String(x.MODE||'')==='LIMITED_LIVE' &&
      String(x.CURRENT_SET_ID||'')===String(setId||'') &&
      String(x.SCHEDULER_APPLIED).toUpperCase()==='TRUE'
    )found.push(x);
  });
  if(found.length>1){
    throw new Error('FAMILY_SCHEDULER_DUPLICATE_ISSUE_APPLIED:'+setId);
  }
  return found.length?found[0]:null;
}

function h3FsObserveCommitted_(ss,level,family,setId,selectionSource) {
  if(H3_FS_FAMILIES_.indexOf(family)<0){
    throw new Error('FAMILY_SCHEDULER_FAMILY_INVALID:'+family);
  }

  var history=h3FsHistory_(ss,level);
  var commit=h3FsHistoryRecord_(history,family,setId);

  if(commit.global_clock<=H3_FS_F4_START_CLOCK_){
    return {
      schema:'H3_FAMILY_SCHEDULER_F4_OBSERVATION_V1',
      status:'PRE_F4_COMMIT_IGNORED',
      mode:'SHADOW',
      scheduler_applied:false,
      global_set_clock:commit.global_clock,
      set_id:commit.set_id
    };
  }

  var stateBefore=h3FsState_(ss,level);
  var stateClockBefore=Number(stateBefore.GLOBAL.GLOBAL_SET_CLOCK||0);
  var priorClock=commit.global_clock-1;
  var prior=h3FsEvaluationAtClock_(ss,level,priorClock);
  if(!prior){
    throw new Error('FAMILY_SCHEDULER_PRIOR_EVALUATION_MISSING:'+priorClock);
  }

  var sync=h3FsSyncCommittedHistory_(ss,level,family,setId);

  var observed=h3FsCommitObservedByKey_(ss,level,commit.commit_key);
  var observedResult;
  if(!observed){
    var appliedIssue=h3FsIssueAppliedForSet_(ss,level,setId);
    observedResult=h3FsAppendCommitObserved_(
      ss,
      level,
      prior,
      commit,
      family,
      appliedIssue?'FAMILY_SCHEDULER':selectionSource,
      !!appliedIssue
    );
  } else {
    observedResult={
      status:'ALREADY_RECORDED',
      recommended_family:String(observed.RECOMMENDED_FAMILY||''),
      actual_family:String(observed.ACTUAL_FAMILY||''),
      override_of_recommendation:observed.OVERRIDE_OF_RECOMMENDATION
    };
  }

  if(stateClockBefore>commit.global_clock){
    return {
      schema:'H3_FAMILY_SCHEDULER_F4_OBSERVATION_V1',
      status:'ALREADY_OBSERVED',
      mode:'SHADOW',
      scheduler_applied:false,
      sync_status:sync.status,
      observed_commit:observedResult,
      global_set_clock:stateClockBefore,
      next_evaluation:null
    };
  }

  var next=h3FsEvaluationAtClock_(ss,level,commit.global_clock);
  var nextResult,nextEvaluation;
  if(!next){
    var e=h3FsEvaluate_(ss,level);
    nextEvaluation=e;
    if(Number(e.global_set_clock)!==Number(commit.global_clock)){
      throw new Error('FAMILY_SCHEDULER_POSTCOMMIT_EVAL_CLOCK_MISMATCH');
    }
    var logged=h3FsAppend_(ss,level,e);
    nextResult={
      recommended_family:e.recommended_family,
      primary_reason:e.primary_reason,
      decision_id:logged.decision_id,
      event_id:logged.event_id
    };
  } else {
    var replay=h3FsEvaluate_(ss,level);
    nextEvaluation=replay;
    if(
      String(next.RECOMMENDED_FAMILY||'')!==String(replay.recommended_family||'') ||
      String(next.PRIMARY_REASON||'')!==String(replay.primary_reason||'') ||
      String(next.CANDIDATE_ORDER_JSON||'')!==JSON.stringify(replay.candidate_order)
    ){
      throw new Error('FAMILY_SCHEDULER_DETERMINISM_REPLAY_MISMATCH:'+commit.global_clock);
    }
    nextResult={
      recommended_family:String(next.RECOMMENDED_FAMILY||''),
      primary_reason:String(next.PRIMARY_REASON||''),
      decision_id:String(next.DECISION_ID||''),
      event_id:String(next.EVENT_ID||'')
    };
  }

  var authoringBridge=
    h3FsSemanticAuthoringBridge_(ss,level,nextEvaluation);

  return {
    schema:'H3_FAMILY_SCHEDULER_F4_OBSERVATION_V1',
    status:'PASS',
    mode:'SHADOW',
    scheduler_applied:false,
    sync_status:sync.status,
    observed_commit:observedResult,
    global_set_clock:commit.global_clock,
    next_evaluation:nextResult,
    authoring_bridge:authoringBridge
  };
}

function h3FsAuthoringQueue_(ss) {
  var sh=ss.getSheetByName(H3_FS_AUTHORING_QUEUE_SHEET_);
  if(!sh)throw new Error('FAMILY_SCHEDULER_AUTHORING_QUEUE_MISSING');
  var t=h3FsTable_(sh);
  h3FsRequire_(
    t,
    H3_FS_AUTHORING_QUEUE_HEADERS_,
    H3_FS_AUTHORING_QUEUE_SHEET_
  );
  return {sheet:sh,table:t};
}

function h3FsAuthoringTargetIdentity_(ss,family,prep) {
  var target=String(prep.authoring_target||'');
  if(family==='W'){
    return {
      target_id:String(prep.stage_id||target),
      target_kind:'WRITTEN_STAGE'
    };
  }
  if(family==='L'){
    var ls=h3FsKv_(ss,'listening_state_v1');
    var next=Number(ls.NEXT_LISTENING_SET_NO||0);
    if(!Number.isInteger(next)||next<1){
      throw new Error('FAMILY_SCHEDULER_AUTHORING_LISTENING_SET_NO_INVALID');
    }
    return {
      target_id:
        '5L:'+String(next)+
        (prep.k1_ready_id?':'+String(prep.k1_ready_id):''),
      target_kind:
        target==='K1_READY'
          ? 'LISTENING_K1_READY'
          : 'LISTENING_K2_K5_PRESTAGE'
    };
  }
  if(family==='R'){
    return {
      target_id:String(prep.skill_id||target),
      target_kind:'READING_SOURCE'
    };
  }
  if(family==='T'){
    return {
      target_id:[
        String(prep.skill_id||target),
        String(prep.translation_direction||'')
      ].join(':'),
      target_kind:'TRANSLATION_SURFACE'
    };
  }
  throw new Error('FAMILY_SCHEDULER_AUTHORING_FAMILY_INVALID:'+family);
}

function h3FsAuthoringStableTargetIdentity_(level,family,identity) {
  var stable={
    schema:H3_FS_AUTHORING_TARGET_IDENTITY_SCHEMA_,
    level:String(level||''),
    family:String(family||''),
    target_kind:String(identity&&identity.target_kind||''),
    target_id:String(identity&&identity.target_id||'')
  };
  if(
    !stable.level||
    H3_FS_FAMILIES_.indexOf(stable.family)<0||
    !stable.target_kind||
    !stable.target_id
  ){
    throw new Error('FAMILY_SCHEDULER_AUTHORING_TARGET_IDENTITY_INVALID');
  }
  stable.idempotency_key='H3AQK-'+h3FsSha_(stable);
  return stable;
}

function h3FsAuthoringJobSpec_(ss,level,evaluation,prep) {
  if(!prep||String(prep.status||'')!=='AUTHORING_REQUIRED'){
    throw new Error('FAMILY_SCHEDULER_AUTHORING_SPEC_NOT_REQUIRED');
  }
  var family=String(prep.family||evaluation.recommended_family||'');
  if(H3_FS_FAMILIES_.indexOf(family)<0){
    throw new Error('FAMILY_SCHEDULER_AUTHORING_FAMILY_INVALID:'+family);
  }
  var identity=h3FsAuthoringTargetIdentity_(ss,family,prep);
  var stableIdentity=
    h3FsAuthoringStableTargetIdentity_(level,family,identity);
  var metric=
    evaluation.family_metrics && evaluation.family_metrics[family]
      ? evaluation.family_metrics[family]
      : {};
  var schedulerContext={
    schema:H3_FS_AUTHORING_QUEUE_SCHEMA_,
    global_set_clock:Number(evaluation.global_set_clock||0),
    recommended_family:String(evaluation.recommended_family||''),
    primary_reason:String(evaluation.primary_reason||''),
    readiness_state:String(metric.readiness_state||''),
    family_metric:metric
  };
  var sourceConstraint={
    contract_id:H3_FS_AUTHORING_CONTRACT_ID_,
    semantic_authoring_only:true,
    use_current_authority:true,
    no_official_provenance_invention:true,
    no_issue:true,
    no_learner_history_score_pointer_counter_write:true,
    recovery_policy:h3FsAuthoringRecoveryPolicy_()
  };
  var authoringRequest={
    schema:H3_FS_AUTHORING_REQUEST_SCHEMA_,
    contract_id:H3_FS_AUTHORING_CONTRACT_ID_,
    level:String(level),
    family:family,
    target_id:identity.target_id,
    target_kind:identity.target_kind,
    authoring_target:String(prep.authoring_target||''),
    preparation_request:prep.authoring_request||null,
    preparation_context:prep,
    boundary:{
      semantic_authoring_required:true,
      deterministic_preparation_owned_by_apps_script:true,
      issue_performed:false,
      learner_state_mutated:false,
      recovery_policy:h3FsAuthoringRecoveryPolicy_()
    }
  };
  var snapshot=h3FsSha_({
    contract_id:H3_FS_AUTHORING_CONTRACT_ID_,
    level:String(level),
    family:family,
    target_id:identity.target_id,
    target_kind:identity.target_kind,
    authoring_target:String(prep.authoring_target||''),
    scheduler_context:schedulerContext,
    source_constraint:sourceConstraint,
    authoring_request:authoringRequest
  });
  return {
    family:family,
    identity:identity,
    scheduler_context:schedulerContext,
    source_constraint:sourceConstraint,
    authoring_request:authoringRequest,
    snapshot_sha256:snapshot,
    target_identity:stableIdentity,
    idempotency_key:stableIdentity.idempotency_key
  };
}

function h3FsAuthoringUpsert_(ss,level,evaluation,prep) {
  if(!prep||String(prep.status||'')!=='AUTHORING_REQUIRED'){
    return {status:'NO_JOB',reason:'NOT_AUTHORING_REQUIRED'};
  }

  var family=String(prep.family||evaluation.recommended_family||'');
  if(H3_FS_FAMILIES_.indexOf(family)<0){
    throw new Error('FAMILY_SCHEDULER_AUTHORING_FAMILY_INVALID:'+family);
  }

  var q=h3FsAuthoringQueue_(ss);
  var spec=h3FsAuthoringJobSpec_(ss,level,evaluation,prep);
  var identity=spec.identity;
  var schedulerContext=spec.scheduler_context;
  var sourceConstraint=spec.source_constraint;
  var authoringRequest=spec.authoring_request;
  var snapshot=spec.snapshot_sha256;
  var idempotencyKey=spec.idempotency_key;
  var match=h3FsAuthoringQueueMatch_(q,level,spec);
  var existing=match.exact||match.representative;
  if(existing){
    return {
      status:'EXISTING',
      job_id:existing.job_id,
      job_status:existing.status,
      idempotency_key:idempotencyKey,
      snapshot_sha256:snapshot,
      target_history_count:match.history.length
    };
  }

  var now=new Date().toISOString();
  var jobId='H3AQ-'+idempotencyKey.slice(-20);
  q.sheet.appendRow([
    jobId,
    now,
    now,
    String(level),
    family,
    identity.target_id,
    identity.target_kind,
    String(prep.authoring_target||''),
    'OPEN',
    100,
    snapshot,
    idempotencyKey,
    h3FsCanonical_(sourceConstraint),
    h3FsCanonical_(schedulerContext),
    h3FsCanonical_(authoringRequest),
    '',
    '',
    '',
    0,
    '',
    ''
  ]);
  SpreadsheetApp.flush();

  var verify=h3FsAuthoringQueue_(ss),matches=[];
  verify.table.rows.forEach(function(r,i){
    if(String(r[verify.table.map.IDEMPOTENCY_KEY]||'')===idempotencyKey){
      matches.push({row:r,row_number:i+2});
    }
  });
  if(matches.length!==1){
    throw new Error(
      'FAMILY_SCHEDULER_AUTHORING_QUEUE_READBACK_COUNT:'+matches.length
    );
  }
  var vr=matches[0].row,vm=verify.table.map;
  var readbackStatus=String(vr[vm.STATUS]||'');
  if(
    String(vr[vm.JOB_ID]||'')!==jobId ||
    String(vr[vm.LEVEL]||'')!==String(level) ||
    String(vr[vm.FAMILY]||'')!==family ||
    String(vr[vm.TARGET_ID]||'')!==identity.target_id ||
    String(vr[vm.TARGET_KIND]||'')!==identity.target_kind ||
    String(vr[vm.IDEMPOTENCY_KEY]||'')!==idempotencyKey ||
    String(vr[vm.SNAPSHOT_SHA256]||'')!==snapshot ||
    ['OPEN','CLAIMED','COMPLETED'].indexOf(readbackStatus)<0
  ){
    throw new Error('FAMILY_SCHEDULER_AUTHORING_QUEUE_READBACK_FAIL');
  }

  return {
    status:'OPEN_CREATED',
    job_id:jobId,
    job_status:readbackStatus,
    idempotency_key:idempotencyKey,
    snapshot_sha256:snapshot,
    target_id:identity.target_id,
    target_kind:identity.target_kind
  };
}

function h3FsAuthoringPreparationPreview_(ss,family) {
  if(family==='L')return h3FsBuildListeningPrepare_(ss);
  if(family==='W')return h3FsPrepareWritten_(ss);

  if(family==='R'){
    var preparedR=h3FsFindPreparedReading_(ss);
    if(preparedR){
      return {
        status:'PREISSUE_READY',family:'R',
        set_id:String(preparedR.stage.set_id||'')
      };
    }
    var rOb=h3FsRtDueObligations_(ss,'READING','');
    if(!rOb.length){
      return {
        status:'AUTHORING_REQUIRED',family:'R',
        authoring_target:'READING_NO_DUE_SOURCE'
      };
    }
    var rSel=h3FsReadingGroupForObligation_(ss,rOb[0]);
    if(!rSel){
      return {
        status:'AUTHORING_REQUIRED',family:'R',
        authoring_target:'READING_RETEST_SOURCE:'+rOb[0].skill_id,
        skill_id:rOb[0].skill_id
      };
    }
    return {
      status:'PREPARE_REQUIRED',family:'R',
      skill_id:rOb[0].skill_id,
      section_key:rSel.section_key,
      source_group_id:rSel.group_id
    };
  }

  if(family==='T'){
    var preparedT=h3FsFindPreparedTranslation_(ss);
    if(preparedT){
      return {
        status:'LOCKED',family:'T',
        set_id:String(preparedT.stage.set_id||'')
      };
    }
    var selection=h3FsTranslationSelection_(ss);
    if(!selection.obligations.length){
      return {
        status:'AUTHORING_REQUIRED',family:'T',
        authoring_target:
          'TRANSLATION_DIRECTION_POOL:'+selection.missing_direction
      };
    }
    var used=h3FsTranslationUsed_(ss),itemIds=[];
    for(var i=0;i<selection.obligations.length;i++){
      var obligation=selection.obligations[i];
      var item=h3FsTranslationSourceForObligation_(ss,obligation,used);
      if(!item){
        return {
          status:'AUTHORING_REQUIRED',family:'T',
          authoring_target:
            'TRANSLATION_RETEST_SURFACE:'+
            obligation.skill_id+':'+obligation.direction,
          skill_id:obligation.skill_id,
          translation_direction:obligation.direction
        };
      }
      itemIds.push(item.item_id);
      used.item_ids.push(item.item_id);
      used.item_map[item.item_id]=true;
      used.surface_keys.push(item.surface_key);
      used.question_keys.push(item.question_key);
      used.question_key_map[item.question_key]=true;
    }
    return {
      status:'PREPARE_REQUIRED',family:'T',
      profile:selection.profile,
      skill_ids:selection.obligations.map(function(x){return x.skill_id;}),
      source_item_ids:itemIds
    };
  }

  throw new Error('FAMILY_SCHEDULER_AUTHORING_FAMILY_INVALID:'+family);
}

function h3FsAuthoringHistoryRepresentative_(history) {
  var rows=history||[],active=[];
  rows.forEach(function(x){
    if(['OPEN','CLAIMED','FAILED_RETRYABLE'].indexOf(String(x.status||''))>=0){
      active.push(x);
    }
  });
  if(active.length)return active[active.length-1];
  return rows.length?rows[rows.length-1]:null;
}

function h3FsAuthoringQueueMatch_(q,level,spec) {
  var exact=[],history=[];
  q.table.rows.forEach(function(r,i){
    var x={
      row_number:i+2,
      job_id:String(r[q.table.map.JOB_ID]||''),
      level:String(r[q.table.map.LEVEL]||''),
      family:String(r[q.table.map.FAMILY]||''),
      target_id:String(r[q.table.map.TARGET_ID]||''),
      target_kind:String(r[q.table.map.TARGET_KIND]||''),
      status:String(r[q.table.map.STATUS]||''),
      snapshot_sha256:String(r[q.table.map.SNAPSHOT_SHA256]||''),
      idempotency_key:String(r[q.table.map.IDEMPOTENCY_KEY]||'')
    };
    if(
      x.level===String(level) &&
      x.family===spec.family &&
      x.target_id===spec.identity.target_id &&
      x.target_kind===spec.identity.target_kind
    )history.push(x);
    if(x.idempotency_key===spec.idempotency_key)exact.push(x);
  });
  if(exact.length>1){
    throw new Error(
      'FAMILY_SCHEDULER_AUTHORING_DUPLICATE_IDEMPOTENCY_KEY:'+
      spec.idempotency_key
    );
  }
  return {
    exact:exact.length?exact[0]:null,
    history:history,
    representative:h3FsAuthoringHistoryRepresentative_(history)
  };
}

function h3FsAuthoringReconciliationDecision_(
  readinessState,
  preparationStatus,
  jobStatus
) {
  var ready=String(readinessState||'');
  var prep=String(preparationStatus||'');
  var job=String(jobStatus||'');
  if(ready==='READY'){
    return {action:'NO_ACTION',reason:'READY'};
  }
  if(ready!=='PREPARE_REQUIRED'){
    return {
      action:'NO_ACTION',
      reason:'READINESS_'+(ready||'UNKNOWN')
    };
  }
  if(prep!=='AUTHORING_REQUIRED'){
    return {
      action:'NO_ACTION',
      reason:'DETERMINISTIC_PREPARATION_AVAILABLE'
    };
  }
  if(!job){
    return {action:'ENSURE_OPEN',reason:'MISSING_AUTHORING_JOB'};
  }
  if(['OPEN','CLAIMED','FAILED_RETRYABLE'].indexOf(job)>=0){
    return {action:'EXISTING_NO_DUPLICATE',reason:'ACTIVE_JOB_'+job};
  }
  if(job==='COMPLETED'){
    return {action:'BLOCKED_HISTORY',reason:'COMPLETED_NOT_READY'};
  }
  if(job==='SUPERSEDED'||job==='FAILED_BLOCKED'){
    return {action:'BLOCKED_HISTORY',reason:'HISTORICAL_'+job};
  }
  return {action:'BLOCKED_HISTORY',reason:'UNKNOWN_JOB_STATUS_'+job};
}

function h3FsAuthoringReconciliationPreviewCore_(ss,level) {
  var evaluation=h3FsEvaluate_(ss,level);
  var out={
    schema:H3_FS_AUTHORING_RECONCILIATION_SCHEMA_,
    mode:'READ_ONLY_PREVIEW',
    global_set_clock:Number(evaluation.global_set_clock||0),
    recommended_family:String(evaluation.recommended_family||'NONE'),
    readiness_state:'',
    preparation_status:'',
    action:'NO_ACTION',
    reason:'',
    target_id:'',
    target_kind:'',
    snapshot_sha256:'',
    idempotency_key:'',
    existing_job_id:'',
    existing_job_status:'',
    target_history_count:0,
    write_performed:false
  };
  if(String(evaluation.next_action||'')!=='RECOMMEND_FAMILY'){
    out.reason='SCHEDULER_'+String(evaluation.next_action||'UNKNOWN');
    return {public_result:out,evaluation:evaluation,prep:null,spec:null};
  }

  var family=String(evaluation.recommended_family||'');
  if(H3_FS_FAMILIES_.indexOf(family)<0){
    throw new Error('FAMILY_SCHEDULER_RECONCILIATION_FAMILY_INVALID');
  }
  var readiness=h3FsReadiness_(ss),current=readiness[family];
  if(!current||current.eligible!==true){
    out.readiness_state=current?String(current.state||''):'UNKNOWN';
    out.reason='FAMILY_NOT_ELIGIBLE';
    return {public_result:out,evaluation:evaluation,prep:null,spec:null};
  }
  out.readiness_state=String(current.state||'');
  if(out.readiness_state==='READY'){
    out.reason='READY';
    return {public_result:out,evaluation:evaluation,prep:null,spec:null};
  }

  var prep=h3FsAuthoringPreparationPreview_(ss,family);
  out.preparation_status=String(prep.status||'');
  var noJobDecision=h3FsAuthoringReconciliationDecision_(
    out.readiness_state,
    out.preparation_status,
    ''
  );
  if(out.preparation_status!=='AUTHORING_REQUIRED'){
    out.action=noJobDecision.action;
    out.reason=noJobDecision.reason;
    return {public_result:out,evaluation:evaluation,prep:prep,spec:null};
  }

  var spec=h3FsAuthoringJobSpec_(ss,level,evaluation,prep);
  var q=h3FsAuthoringQueue_(ss);
  var match=h3FsAuthoringQueueMatch_(q,level,spec);
  var existing=match.exact||match.representative;
  var decision=h3FsAuthoringReconciliationDecision_(
    out.readiness_state,
    out.preparation_status,
    existing?existing.status:''
  );
  out.action=decision.action;
  out.reason=decision.reason;
  out.target_id=spec.identity.target_id;
  out.target_kind=spec.identity.target_kind;
  out.snapshot_sha256=spec.snapshot_sha256;
  out.idempotency_key=spec.idempotency_key;
  out.target_history_count=match.history.length;
  if(existing){
    out.existing_job_id=existing.job_id;
    out.existing_job_status=existing.status;
  }
  return {public_result:out,evaluation:evaluation,prep:prep,spec:spec};
}

function h3FamilySchedulerAuthoringReconciliationPreview() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  return h3FsAuthoringReconciliationPreviewCore_(ss,'3級').public_result;
}

function h3FamilySchedulerAuthoringReconciliationEnsure() {
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
    var first=h3FsAuthoringReconciliationPreviewCore_(ss,'3級');
    if(first.public_result.action!=='ENSURE_OPEN'){
      return first.public_result;
    }
    var confirm=h3FsAuthoringReconciliationPreviewCore_(ss,'3級');
    if(
      confirm.public_result.action!=='ENSURE_OPEN' ||
      !confirm.spec || !first.spec ||
      confirm.spec.idempotency_key!==first.spec.idempotency_key
    ){
      return confirm.public_result;
    }
    var ensured=h3FsAuthoringUpsert_(
      ss,'3級',confirm.evaluation,confirm.prep
    );
    var out=confirm.public_result;
    out.write_performed=String(ensured.status||'')==='OPEN_CREATED';
    out.ensure_status=String(ensured.status||'');
    out.existing_job_id=String(ensured.job_id||'');
    out.existing_job_status=String(ensured.job_status||'OPEN');
    out.action='EXISTING_NO_DUPLICATE';
    out.reason=out.write_performed?'OPEN_ENSURED':'ACTIVE_JOB_OPEN';
    return out;
  } finally {
    try{lock.releaseLock();}catch(_ignore){}
  }
}

function h3FsAuthoringTimestampMs_(value) {
  if(value===null||value===undefined||value==='')return null;
  var t;
  if(Object.prototype.toString.call(value)==='[object Date]'){
    t=value.getTime();
  } else {
    t=Date.parse(String(value));
  }
  return isFinite(t)?t:null;
}

function h3FsAuthoringAgeMinutes_(value,nowMs) {
  var t=h3FsAuthoringTimestampMs_(value);
  if(t===null)return null;
  var age=(Number(nowMs)-t)/60000;
  if(!isFinite(age)||age<0)return null;
  return Math.floor(age);
}

function h3FsAuthoringHealthFromTable_(table,nowMs) {
  h3FsRequire_(
    table,
    H3_FS_AUTHORING_QUEUE_HEADERS_,
    H3_FS_AUTHORING_QUEUE_SHEET_
  );
  var m=table.map;
  var counts={};
  var oldestOpen=null,oldestClaimed=null;
  var staleClaimed=0,retryDue=0,failedBlocked=0;
  var recentCompleted=0,superseded=0,retryExhaustedNotBlocked=0;
  var timestampFindings=0,attemptCounterFindings=0;
  var idempotencyCounts={};

  function bumpStatus_(status) {
    status=String(status||'BLANK');
    counts[status]=(counts[status]||0)+1;
  }
  function maxAge_(current,value) {
    return current===null||value>current?value:current;
  }

  table.rows.forEach(function(r){
    var status=String(r[m.STATUS]||'');
    var attemptsRaw=r[m.ATTEMPT_COUNT];
    var attempts=Number(attemptsRaw);
    var attemptsValid=(
      attemptsRaw!=='' &&
      attemptsRaw!==null &&
      attemptsRaw!==undefined &&
      Number.isInteger(attempts) &&
      attempts>=0
    );
    var key=String(r[m.IDEMPOTENCY_KEY]||'');
    bumpStatus_(status);

    if(key){
      idempotencyCounts[key]=(idempotencyCounts[key]||0)+1;
    }

    if(status==='OPEN'){
      var openAge=h3FsAuthoringAgeMinutes_(r[m.CREATED_AT],nowMs);
      if(openAge===null)timestampFindings++;
      else oldestOpen=maxAge_(oldestOpen,openAge);
    }

    if(status==='CLAIMED'){
      var claimedAge=h3FsAuthoringAgeMinutes_(r[m.CLAIMED_AT],nowMs);
      if(claimedAge===null)timestampFindings++;
      else {
        oldestClaimed=maxAge_(oldestClaimed,claimedAge);
        if(claimedAge>=H3_FS_AUTHORING_CLAIM_STALE_MINUTES_)staleClaimed++;
      }
    }

    if(status==='FAILED_RETRYABLE'){
      var retryAge=h3FsAuthoringAgeMinutes_(r[m.UPDATED_AT],nowMs);
      if(retryAge===null)timestampFindings++;
      if(!attemptsValid){
        attemptCounterFindings++;
      } else {
        if(
          retryAge!==null &&
          attempts<H3_FS_AUTHORING_MAX_ATTEMPTS_ &&
          retryAge>=H3_FS_AUTHORING_RETRY_BACKOFF_MINUTES_
        ){
          retryDue++;
        }
        if(attempts>=H3_FS_AUTHORING_MAX_ATTEMPTS_){
          retryExhaustedNotBlocked++;
        }
      }
    }

    if(status==='FAILED_BLOCKED')failedBlocked++;

    if(status==='COMPLETED'){
      var completedAge=h3FsAuthoringAgeMinutes_(r[m.COMPLETED_AT],nowMs);
      if(completedAge===null)timestampFindings++;
      else if(
        completedAge<=
          H3_FS_AUTHORING_OBSERVABILITY_RECENT_HOURS_*60
      ){
        recentCompleted++;
      }
    }

    if(status==='SUPERSEDED')superseded++;
  });

  var duplicateKeys=Object.keys(idempotencyCounts)
    .filter(function(k){return idempotencyCounts[k]>1;})
    .sort();

  return {
    queue_total_rows:table.rows.length,
    queue_count_by_status:counts,
    oldest_OPEN_age_minutes:oldestOpen,
    oldest_CLAIMED_age_minutes:oldestClaimed,
    stale_CLAIMED_count:staleClaimed,
    FAILED_RETRYABLE_due_count:retryDue,
    FAILED_BLOCKED_count:failedBlocked,
    completed_recent_window_hours:
      H3_FS_AUTHORING_OBSERVABILITY_RECENT_HOURS_,
    completed_recent_count:recentCompleted,
    superseded_count:superseded,
    duplicate_idempotency_violation_count:duplicateKeys.length,
    duplicate_idempotency_keys:duplicateKeys,
    retry_exhausted_not_blocked_count:retryExhaustedNotBlocked,
    timestamp_finding_count:timestampFindings,
    attempt_counter_finding_count:attemptCounterFindings
  };
}

function h3FsAuthoringHealthCore_(ss,level,nowMs) {
  var q=h3FsAuthoringQueue_(ss);
  var metrics=h3FsAuthoringHealthFromTable_(q.table,nowMs);
  var reconciliation=null;
  var reconciliationError='';
  var missing=[];

  try {
    reconciliation=
      h3FsAuthoringReconciliationPreviewCore_(ss,level).public_result;
    if(
      String(reconciliation.action||'')==='ENSURE_OPEN' &&
      String(reconciliation.reason||'')==='MISSING_AUTHORING_JOB'
    ){
      missing.push({
        family:String(reconciliation.recommended_family||''),
        target_id:String(reconciliation.target_id||''),
        target_kind:String(reconciliation.target_kind||''),
        idempotency_key:String(reconciliation.idempotency_key||''),
        reason:'MISSING_AUTHORING_JOB'
      });
    }
  } catch(err) {
    reconciliationError=String(
      err&&err.message ? err.message : err
    );
  }

  return {
    schema:H3_FS_AUTHORING_OBSERVABILITY_SCHEMA_,
    mode:'READ_ONLY_HEALTH',
    level:String(level),
    generated_at:new Date(Number(nowMs)).toISOString(),
    recovery_policy:h3FsAuthoringRecoveryPolicy_(),
    queue_total_rows:metrics.queue_total_rows,
    queue_count_by_status:metrics.queue_count_by_status,
    oldest_OPEN_age_minutes:metrics.oldest_OPEN_age_minutes,
    oldest_CLAIMED_age_minutes:metrics.oldest_CLAIMED_age_minutes,
    stale_CLAIMED_count:metrics.stale_CLAIMED_count,
    FAILED_RETRYABLE_due_count:metrics.FAILED_RETRYABLE_due_count,
    FAILED_BLOCKED_count:metrics.FAILED_BLOCKED_count,
    completed_recent_window_hours:metrics.completed_recent_window_hours,
    completed_recent_count:metrics.completed_recent_count,
    superseded_count:metrics.superseded_count,
    duplicate_idempotency_violation_count:
      metrics.duplicate_idempotency_violation_count,
    duplicate_idempotency_keys:metrics.duplicate_idempotency_keys,
    retry_exhausted_not_blocked_count:
      metrics.retry_exhausted_not_blocked_count,
    timestamp_finding_count:metrics.timestamp_finding_count,
    attempt_counter_finding_count:metrics.attempt_counter_finding_count,
    missing_job_reconciliation_finding_count:missing.length,
    missing_job_reconciliation_findings:missing,
    reconciliation_status:
      reconciliationError ? 'ERROR' : 'PASS',
    reconciliation_error:reconciliationError,
    reconciliation:reconciliation,
    alert_states:{
      stale_claimed:metrics.stale_CLAIMED_count>0,
      retry_due:metrics.FAILED_RETRYABLE_due_count>0,
      failed_blocked:metrics.FAILED_BLOCKED_count>0,
      duplicate_idempotency:
        metrics.duplicate_idempotency_violation_count>0,
      retry_exhausted_not_blocked:
        metrics.retry_exhausted_not_blocked_count>0,
      timestamp_finding:metrics.timestamp_finding_count>0,
      attempt_counter_finding:metrics.attempt_counter_finding_count>0,
      missing_authoring_job:missing.length>0,
      reconciliation_error:!!reconciliationError
    },
    write_performed:false
  };
}

function h3FamilySchedulerAuthoringHealthPreview() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  return h3FsAuthoringHealthCore_(ss,'3級',Date.now());
}


function h3FsSemanticAuthoringBridge_(ss,level,evaluation) {
  if(
    !evaluation ||
    H3_FS_FAMILIES_.indexOf(
      String(evaluation.recommended_family||'')
    )<0
  ){
    return {status:'NO_JOB',reason:'NO_RECOMMENDED_FAMILY'};
  }

  var family=String(evaluation.recommended_family);
  var readiness=h3FsReadiness_(ss);
  var current=readiness[family];
  if(!current||current.eligible!==true){
    return {status:'NO_JOB',reason:'FAMILY_NOT_ELIGIBLE',family:family};
  }
  if(String(current.state||'')==='READY'){
    return {status:'NO_JOB',reason:'READY',family:family};
  }
  if(String(current.state||'')!=='PREPARE_REQUIRED'){
    return {
      status:'NO_JOB',
      reason:'READINESS_'+String(current.state||'UNKNOWN'),
      family:family
    };
  }

  var prep;
  if(family==='L'){
    prep=h3FsBuildListeningPrepare_(ss);
  } else if(family==='W'){
    prep=h3FsPrepareWritten_(ss);
  } else if(family==='R'){
    prep=h3FsPrepareReading_(ss);
  } else {
    prep=h3FsPrepareTranslation_(ss);
  }

  if(String(prep.status||'')!=='AUTHORING_REQUIRED'){
    return {
      status:'NO_JOB',
      reason:'DETERMINISTIC_PREPARATION_AVAILABLE',
      family:family,
      preparation_status:String(prep.status||'')
    };
  }
  return h3FsAuthoringUpsert_(ss,level,evaluation,prep);
}

function h3FamilySchedulerObserveAfterCommit_(
  family,
  setId,
  selectionSource
) {
  var lock=LockService.getScriptLock(),acquired=false;
  try{
    acquired=lock.tryLock(2000);
    if(!acquired){
      return {
        schema:'H3_FAMILY_SCHEDULER_F4_OBSERVATION_V1',
        status:'RECOVERY_REQUIRED',
        mode:'SHADOW',
        scheduler_applied:false,
        family:String(family||''),
        set_id:String(setId||''),
        error:'FAMILY_SCHEDULER_SHADOW_LOCK_BUSY'
      };
    }
    var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
    return h3FsObserveCommitted_(
      ss,
      '3級',
      family,
      String(setId||''),
      selectionSource||'LEGACY_TRIGGER'
    );
  } catch(err) {
    return {
      schema:'H3_FAMILY_SCHEDULER_F4_OBSERVATION_V1',
      status:'RECOVERY_REQUIRED',
      mode:'SHADOW',
      scheduler_applied:false,
      family:String(family||''),
      set_id:String(setId||''),
      error:String(err&&err.message?err.message:err)
    };
  } finally {
    if(acquired){
      try{lock.releaseLock();}catch(_ignore){}
    }
  }
}

function h3FamilySchedulerF4Status() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var level='3級',state=h3FsState_(ss,level),history=h3FsHistory_(ss,level);
  var rows=h3FsLogRows_(ss,level);
  var commits=rows.filter(function(x){
    return (
      String(x.EVENT_KIND||'')==='COMMIT_OBSERVED' &&
      String(x.MODE||'')==='SHADOW' &&
      Number(x.GLOBAL_SET_CLOCK)>=H3_FS_F4_START_CLOCK_
    );
  });
  var liveCommits=rows.filter(function(x){
    return (
      String(x.EVENT_KIND||'')==='COMMIT_OBSERVED' &&
      String(x.MODE||'')==='LIMITED_LIVE'
    );
  });
  var evaluations=rows.filter(function(x){
    return (
      String(x.EVENT_KIND||'')==='EVALUATION' &&
      Number(x.GLOBAL_SET_CLOCK)>=H3_FS_F4_START_CLOCK_
    );
  });

  var overrides=0,matches=0,appliedViolations=0,byFamily={L:0,W:0,R:0,T:0};
  commits.forEach(function(x){
    var actual=String(x.ACTUAL_FAMILY||''),recommended=String(x.RECOMMENDED_FAMILY||'');
    if(byFamily[actual]!==undefined)byFamily[actual]++;
    if(recommended===actual)matches++;
    else if(H3_FS_FAMILIES_.indexOf(recommended)>=0)overrides++;
    if(String(x.SCHEDULER_APPLIED).toUpperCase()==='TRUE')appliedViolations++;
  });
  evaluations.forEach(function(x){
    if(String(x.SCHEDULER_APPLIED).toUpperCase()==='TRUE')appliedViolations++;
  });

  var unresolved=0,missed=0;
  H3_FS_FAMILIES_.forEach(function(f){
    var a=h3FsJson_(state[f].PROSPECTIVE_OBLIGATIONS_JSON||'[]',[]);
    unresolved+=a.length;
    a.forEach(function(x){
      if(Number(x.global_service_deadline)<Number(state.GLOBAL.GLOBAL_SET_CLOCK||0))missed++;
    });
  });

  var observedQuestions={L:0,W:0,R:0,T:0};
  history.forEach(function(x){
    if(Number(x.global_clock)<=H3_FS_F4_START_CLOCK_)return;
    observedQuestions[x.family]+=x.total;
  });
  var totalObservedQuestions=0;
  H3_FS_FAMILIES_.forEach(function(f){totalObservedQuestions+=observedQuestions[f];});
  var observedShares={};
  H3_FS_FAMILIES_.forEach(function(f){
    observedShares[f]=totalObservedQuestions
      ? observedQuestions[f]/totalObservedQuestions
      : 0;
  });

  var remaining=Math.max(0,H3_FS_F4_TARGET_COMMITS_-commits.length);
  return {
    schema:'H3_FAMILY_SCHEDULER_F4_STATUS_V1',
    mode:'SHADOW',
    start_global_clock:H3_FS_F4_START_CLOCK_,
    target_commits:H3_FS_F4_TARGET_COMMITS_,
    observed_commits:commits.length,
    remaining_commits:remaining,
    gate_status:remaining>0?'OBSERVING':'READY_FOR_F4_REVIEW',
    current_global_set_clock:Number(state.GLOBAL.GLOBAL_SET_CLOCK||0),
    history_global_set_clock:history.length,
    state_history_aligned:Number(state.GLOBAL.GLOBAL_SET_CLOCK||0)===history.length,
    recommendation_match_count:matches,
    manual_override_count:overrides,
    actual_family_count:byFamily,
    observed_question_count:observedQuestions,
    observed_question_share:observedShares,
    unresolved_prospective_obligations:unresolved,
    missed_global_service_deadlines:missed,
    scheduler_applied_true_count:appliedViolations,
    limited_live_commit_count:liveCommits.length,
    evaluation_count:evaluations.length
  };
}


function h3FsLatestReadyK1_(ss) {
  var sh=ss.getSheetByName('listening_k1_ready_v1');
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(t,[
    'K1_READY_ID','CREATED_AT','STATUS',
    'BOUND_LISTENING_SET_ID','CONSUMED_AT'
  ],'listening_k1_ready_v1');

  var candidates=[];
  t.rows.forEach(function(r,i){
    if(
      String(r[t.map.STATUS]||'')==='READY' &&
      !String(r[t.map.BOUND_LISTENING_SET_ID]||'') &&
      !String(r[t.map.CONSUMED_AT]||'')
    ){
      candidates.push({
        rowNumber:i+2,
        createdAt:String(r[t.map.CREATED_AT]||''),
        id:String(r[t.map.K1_READY_ID]||'')
      });
    }
  });
  if(!candidates.length)return null;
  if(candidates.length>1){
    throw new Error('FAMILY_SCHEDULER_K1_READY_AMBIGUOUS');
  }

  var record=k1ReadyRecordFromRow_(
    sh,
    candidates[0].rowNumber
  );
  validateK1ReadyPayload_(record);
  return record;
}

function h3FsReadyListeningPrestage_(ss,nextSetNo) {
  var sh=ss.getSheetByName(H3_BACKEND_PRESTAGE_TAB);
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(t,H3_BACKEND_PRESTAGE_HEADERS,H3_BACKEND_PRESTAGE_TAB);

  var found=[];
  t.rows.forEach(function(r,i){
    if(
      String(r[t.map.STATUS]||'')==='READY' &&
      Number(r[t.map.TARGET_LISTENING_SET_NO]||0)===Number(nextSetNo) &&
      !String(r[t.map.BOUND_LISTENING_SET_ID]||'') &&
      !String(r[t.map.CONSUMED_AT]||'')
    ){
      found.push({
        row:r,
        rowNumber:i+2,
        id:String(r[t.map.PRESTAGE_ID]||'')
      });
    }
  });
  if(found.length>1){
    throw new Error('FAMILY_SCHEDULER_LISTENING_PRESTAGE_AMBIGUOUS');
  }
  return found.length?found[0]:null;
}

function h3FsReadyListeningPayload_(ss,nextSetNo) {
  var sh=ss.getSheetByName('listening_set_payload_v1');
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(t,[
    'LISTENING_SET_ID','LISTENING_SET_NO','STATUS',
    'K1_READY_ID','ISSUED_AT'
  ],'listening_set_payload_v1');

  var found=[];
  t.rows.forEach(function(r,i){
    if(
      Number(r[t.map.LISTENING_SET_NO]||0)===Number(nextSetNo) &&
      String(r[t.map.STATUS]||'')==='AUDIO_BOUND' &&
      !String(r[t.map.ISSUED_AT]||'')
    ){
      found.push({
        row:r,
        rowNumber:i+2,
        set_id:String(r[t.map.LISTENING_SET_ID]||''),
        k1_ready_id:String(r[t.map.K1_READY_ID]||'')
      });
    }
  });
  if(found.length>1){
    throw new Error('FAMILY_SCHEDULER_LISTENING_PREPARED_AMBIGUOUS');
  }
  return found.length?found[0]:null;
}

function h3FsLockedListeningPayload_(ss,nextSetNo) {
  var sh=ss.getSheetByName('listening_set_payload_v1');
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(t,[
    'LISTENING_SET_ID','LISTENING_SET_NO','STATUS',
    'K1_READY_ID','ISSUED_AT'
  ],'listening_set_payload_v1');

  var found=[];
  t.rows.forEach(function(r,i){
    if(
      Number(r[t.map.LISTENING_SET_NO]||0)===Number(nextSetNo) &&
      String(r[t.map.STATUS]||'')==='LOCKED' &&
      !String(r[t.map.ISSUED_AT]||'')
    ){
      found.push({
        row:r,
        rowNumber:i+2,
        set_id:String(r[t.map.LISTENING_SET_ID]||''),
        k1_ready_id:String(r[t.map.K1_READY_ID]||'')
      });
    }
  });
  if(found.length>1){
    throw new Error('FAMILY_SCHEDULER_LISTENING_RESUME_PAYLOAD_AMBIGUOUS');
  }
  return found.length?found[0]:null;
}

function h3FsBoundListeningK1Row_(ss,k1ReadyId,setId) {
  var sh=ss.getSheetByName('listening_k1_ready_v1');
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(t,[
    'K1_READY_ID','STATUS','BOUND_LISTENING_SET_ID','CONSUMED_AT'
  ],'listening_k1_ready_v1');

  var found=[];
  t.rows.forEach(function(r,i){
    if(String(r[t.map.K1_READY_ID]||'')===String(k1ReadyId||'')){
      found.push({row:r,rowNumber:i+2});
    }
  });
  if(found.length>1){
    throw new Error('FAMILY_SCHEDULER_LISTENING_BOUND_K1_AMBIGUOUS');
  }
  if(!found.length)return null;

  var r=found[0].row;
  if(
    String(r[t.map.STATUS]||'')!=='READY' ||
    String(r[t.map.BOUND_LISTENING_SET_ID]||'')!==String(setId||'') ||
    String(r[t.map.CONSUMED_AT]||'')
  ){
    throw new Error('FAMILY_SCHEDULER_LISTENING_BOUND_K1_STATE_INVALID');
  }
  return found[0];
}

function h3FsBoundListeningPrestage_(ss,nextSetNo,setId) {
  var sh=ss.getSheetByName(H3_BACKEND_PRESTAGE_TAB);
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(t,H3_BACKEND_PRESTAGE_HEADERS,H3_BACKEND_PRESTAGE_TAB);

  var found=[];
  t.rows.forEach(function(r,i){
    if(
      String(r[t.map.STATUS]||'')==='BOUND' &&
      Number(r[t.map.TARGET_LISTENING_SET_NO]||0)===Number(nextSetNo) &&
      String(r[t.map.BOUND_LISTENING_SET_ID]||'')===String(setId||'') &&
      !String(r[t.map.CONSUMED_AT]||'')
    ){
      found.push({
        row:r,
        rowNumber:i+2,
        id:String(r[t.map.PRESTAGE_ID]||'')
      });
    }
  });
  if(found.length>1){
    throw new Error('FAMILY_SCHEDULER_LISTENING_BOUND_PRESTAGE_AMBIGUOUS');
  }
  return found.length?found[0]:null;
}

function h3FsResumableListeningPrepare_(ss,nextSetNo) {
  var payload=h3FsLockedListeningPayload_(ss,nextSetNo);
  if(!payload)return null;
  if(!payload.set_id||!payload.k1_ready_id){
    throw new Error('FAMILY_SCHEDULER_LISTENING_RESUME_PAYLOAD_INVALID');
  }

  var k1=h3FsBoundListeningK1Row_(
    ss,
    payload.k1_ready_id,
    payload.set_id
  );
  if(!k1){
    throw new Error('FAMILY_SCHEDULER_LISTENING_RESUME_K1_MISSING');
  }

  var prestage=h3FsBoundListeningPrestage_(
    ss,
    nextSetNo,
    payload.set_id
  );
  if(!prestage){
    throw new Error('FAMILY_SCHEDULER_LISTENING_RESUME_PRESTAGE_MISSING');
  }

  return {
    status:'READY_TO_PREPARE',
    authoring_target:'',
    family:'L',
    prestage_id:prestage.id,
    resume:true,
    request:{
      schema:H3_BACKEND_PREPARE_SCHEMA,
      set_id:payload.set_id,
      k1_ready_id:payload.k1_ready_id
    }
  };
}

function h3FsAllocateListeningSetId_(ss) {
  var date=Utilities.formatDate(
    new Date(),
    'Asia/Tokyo',
    'yyyyMMdd'
  );
  var prefix='H3-'+date+'-L';
  var used={},max=0;

  function collect(sheetName,columnName) {
    var sh=ss.getSheetByName(sheetName);
    if(!sh)return;
    var t=h3FsTable_(sh);
    if(t.map[columnName]===undefined)return;
    t.rows.forEach(function(r){
      var id=String(r[t.map[columnName]]||'');
      if(!id)return;
      used[id]=true;
      if(id.indexOf(prefix)!==0)return;
      var tail=id.slice(prefix.length);
      var digits=
        tail.length>=2 &&
        tail.length<=3 &&
        tail.split('').every(function(ch){
          return ch>='0' && ch<='9';
        });
      if(digits){
        max=Math.max(max,Number(tail));
      }
    });
  }

  collect('listening_set_payload_v1','LISTENING_SET_ID');
  collect('listening_log_v1','PARENT_SET_ID');
  collect('listening_k1_ready_v1','BOUND_LISTENING_SET_ID');

  // LISTENING_SET_NO remains the learner-family clock.
  // The ID suffix is date-local uniqueness only and is not
  // derived from NEXT_LISTENING_SET_NO / LISTENING_ISSUE_NO.
  for(var n=max+1;n<1000;n++){
    var id=prefix+String(n).padStart(2,'0');
    if(!used[id])return id;
  }
  throw new Error(
    'FAMILY_SCHEDULER_LISTENING_SET_ID_EXHAUSTED'
  );
}

function h3FsBuildListeningPrepare_(ss) {
  var ls=h3FsKv_(ss,'listening_state_v1');
  var next=Number(ls.NEXT_LISTENING_SET_NO||0);
  if(!Number.isInteger(next)||next<1){
    throw new Error(
      'FAMILY_SCHEDULER_LISTENING_NEXT_SET_NO_INVALID'
    );
  }

  var resume=h3FsResumableListeningPrepare_(ss,next);
  if(resume)return resume;

  var k1=h3FsLatestReadyK1_(ss);
  if(!k1){
    return {
      status:'AUTHORING_REQUIRED',
      authoring_target:'K1_READY',
      family:'L'
    };
  }

  var prestage=h3FsReadyListeningPrestage_(ss,next);
  if(!prestage){
    return {
      status:'AUTHORING_REQUIRED',
      authoring_target:'K2_K5_PRESTAGE',
      family:'L',
      k1_ready_id:k1.id
    };
  }

  return {
    status:'READY_TO_PREPARE',
    authoring_target:'',
    family:'L',
    prestage_id:prestage.id,
    resume:false,
    request:{
      schema:H3_BACKEND_PREPARE_SCHEMA,
      set_id:h3FsAllocateListeningSetId_(ss),
      k1_ready_id:k1.id
    }
  };
}

function h3FsAuthoringTarget_(family) {
  if(family==='W')return 'WRITTEN_STAGE_AUTHORING';
  if(family==='R')return 'READING_SOURCE_AUTHORING';
  if(family==='T')return 'TRANSLATION_SOURCE_AUTHORING';
  if(family==='L')return 'K1_READY';
  throw new Error(
    'FAMILY_SCHEDULER_AUTHORING_FAMILY_INVALID:'+family
  );
}

function h3FsRenderRequest_(provider,surface,setId) {
  return {
    schema:'H3_WEB_RENDER_REQUEST_V1',
    mode:provider==='LISTENING'?'LISTENING':'WRITTEN',
    surface_family:
      surface==='READING'||surface==='TRANSLATION'
        ? surface
        : null,
    set_id:String(setId||''),
    txn_id:null
  };
}

function h3FsAllocateWrittenSetId_(queueSheet) {
  var rows=h3WrittenReadRows_(queueSheet,HQ_HEADERS.length);
  if(JSON.stringify(rows.header)!==JSON.stringify(HQ_HEADERS)){
    throw new Error('FAMILY_SCHEDULER_WRITTEN_QUEUE_HEADER_MISMATCH');
  }
  var date=Utilities.formatDate(new Date(),'Asia/Tokyo','yyyyMMdd');
  var re=new RegExp('^H3-'+date+'-(\\d{2,3})$'),max=0;
  rows.rows.forEach(function(r){
    var m=re.exec(String(r[rows.map.SET_ID]||''));
    if(m)max=Math.max(max,Number(m[1]||0));
  });
  var n=max+1;
  return 'H3-'+date+'-'+String(n).padStart(2,'0');
}

function h3FsIssueWritten_(ss) {
  var prepared=h3FsFindPreparedWritten_(ss);
  if(!prepared)throw new Error('FAMILY_SCHEDULER_WRITTEN_NOT_PREPARED');

  var stageSheet=prepared.sheet;
  var stageSnapshot=stageSheet
    .getRange(prepared.rowNumber,1,1,24)
    .getValues()[0];

  var queueSpreadsheet=h3WrittenQueueSpreadsheet_();
  var queueSheet=queueSpreadsheet.getSheetByName('queue');
  if(!queueSheet)throw new Error('FAMILY_SCHEDULER_WRITTEN_QUEUE_MISSING');

  var setId=h3FsAllocateWrittenSetId_(queueSheet);
  var issuedAt=h3NowTokyo_();
  var r=prepared.row,m=prepared.map;
  var questions=h3WrittenMaterializeQuestions_(
    r[m.QUESTIONS_LOG_TEMPLATE],
    setId
  );
  var queueValues=new Array(HQ_HEADERS.length).fill('');
  var qm=h3WrittenHeaderMap_(HQ_HEADERS);
  queueValues[qm.SET_ID]=setId;
  queueValues[qm.CREATED_AT]=issuedAt;
  queueValues[qm.QUESTIONS_LOG]=questions;
  queueValues[qm.ANSWERS_LOG]='';
  queueValues[qm.Q1_AUDIO]=String(r[m.Q1_AUDIO]||'');
  queueValues[qm.Q2_AUDIO]=String(r[m.Q2_AUDIO]||'');
  queueValues[qm.Q3_AUDIO]=String(r[m.Q3_AUDIO]||'');
  queueValues[qm.Q4_AUDIO]=String(r[m.Q4_AUDIO]||'');
  queueValues[qm.Q5A1]=String(r[m.Q5A1]||'');
  queueValues[qm.Q5B1]=String(r[m.Q5B1]||'');
  queueValues[qm.Q5A2]=String(r[m.Q5A2]||'');
  queueValues[qm.STORAGE_MODE]=HQ_STORAGE_MODE;

  var queueRow=queueSheet.getLastRow()+1;
  var queueInserted=false;
  try {
    queueSheet
      .getRange(queueRow,1,1,HQ_HEADERS.length)
      .setValues([queueValues]);
    queueInserted=true;
    SpreadsheetApp.flush();

    var stageValues=stageSnapshot.slice();
    stageValues[m.STATUS]='ISSUED';
    stageValues[m.ACTUAL_SET_ID]=setId;
    stageValues[m.ISSUED_AT]=issuedAt;
    stageSheet
      .getRange(prepared.rowNumber,1,1,24)
      .setValues([stageValues]);
    SpreadsheetApp.flush();

    queueSheet
      .getRange(queueRow,qm.STATUS+1)
      .setValue('pending');
    SpreadsheetApp.flush();

    var context=h3WrittenValidateSourceIdentity_(
      h3WrittenReadContext_(ss,setId)
    );
    h3WrittenReviewAuthoring_(context);
    buildWrittenProductionRenderPayload_(
      h3FsRenderRequest_('WRITTEN','5W',setId)
    );

    return {
      family:'W',
      set_id:setId,
      provider_kind:'WRITTEN',
      surface_family:'5W',
      render_request:
        h3FsRenderRequest_(
          'WRITTEN',
          '5W',
          setId
        )
    };
  } catch(err) {
    try {
      stageSheet
        .getRange(prepared.rowNumber,1,1,24)
        .setValues([stageSnapshot]);
      if(queueInserted){
        var rowId=String(
          queueSheet
            .getRange(queueRow,1)
            .getDisplayValue()||''
        );
        if(rowId===setId){
          queueSheet.deleteRow(queueRow);
        }
      }
      SpreadsheetApp.flush();
    } catch(_rollbackErr) {}
    throw err;
  }
}

function h3FsIssueReading_(ss) {
  var prepared=h3FsFindPreparedReading_(ss);
  if(!prepared)throw new Error('FAMILY_SCHEDULER_READING_NOT_PREPARED');

  var sh=prepared.sheet;
  var rowNumber=prepared.rowNumber;
  var width=H3_READING_STAGE_HEADERS_.length;
  var snapshot=sh
    .getRange(rowNumber,1,1,width)
    .getValues()[0];
  var issuedAt=h3NowTokyo_();

  try {
    var stage=JSON.parse(
      JSON.stringify(prepared.stage)
    );
    stage.status='ISSUED';
    stage.issued_at=issuedAt;

    sh.getRange(rowNumber,1,1,width)
      .setValues([
        h3ReadingStageRowValues_(stage)
      ]);
    SpreadsheetApp.flush();

    var ctx=h3ReadingProdReadContext_(
      ss,
      stage.set_id
    );
    h3ReadingProdRequireIssued_(ctx);
    buildReadingProductionRenderPayload_(
      h3FsRenderRequest_(
        'WRITTEN',
        'READING',
        stage.set_id
      )
    );

    return {
      family:'R',
      set_id:stage.set_id,
      provider_kind:'WRITTEN',
      surface_family:'READING',
      render_request:
        h3FsRenderRequest_(
          'WRITTEN',
          'READING',
          stage.set_id
        )
    };
  } catch(err) {
    try {
      sh.getRange(rowNumber,1,1,width)
        .setValues([snapshot]);
      SpreadsheetApp.flush();
    } catch(_rollbackErr) {}
    throw err;
  }
}

function h3FsIssueTranslation_(ss) {
  var prepared=h3FsFindPreparedTranslation_(ss);
  if(!prepared)throw new Error('FAMILY_SCHEDULER_TRANSLATION_NOT_PREPARED');

  var sh=prepared.sheet;
  var t=prepared.table;
  var rowNumber=prepared.rowNumber;
  var width=H3_TRANSLATION_V2_STAGE_HEADERS_.length;
  var snapshot=sh
    .getRange(rowNumber,1,1,width)
    .getValues()[0];
  var issuedAt=h3NowTokyo_();

  try {
    sh.getRange(rowNumber,t.map.STATUS+1)
      .setValue('ISSUED');
    sh.getRange(rowNumber,t.map.ISSUED_AT+1)
      .setValue(issuedAt);
    SpreadsheetApp.flush();

    var ctx=h3TranslationV2ProdReadContext_(
      ss,
      prepared.stage.set_id
    );
    h3TranslationV2RequireIssued_(ctx);
    buildTranslationV2ProductionRenderPayload_(
      h3FsRenderRequest_(
        'WRITTEN',
        'TRANSLATION',
        prepared.stage.set_id
      )
    );

    return {
      family:'T',
      set_id:prepared.stage.set_id,
      provider_kind:'WRITTEN',
      surface_family:'TRANSLATION',
      render_request:
        h3FsRenderRequest_(
          'WRITTEN',
          'TRANSLATION',
          prepared.stage.set_id
        )
    };
  } catch(err) {
    try {
      sh.getRange(rowNumber,1,1,width)
        .setValues([snapshot]);
      SpreadsheetApp.flush();
    } catch(_rollbackErr) {}
    throw err;
  }
}

function h3FsIssueListening_(ss) {
  var ls=h3FsKv_(ss,'listening_state_v1');
  var next=Number(
    ls.NEXT_LISTENING_SET_NO||0
  );
  var payloadSheet=ss.getSheetByName(
    'listening_set_payload_v1'
  );
  var logSheet=ss.getSheetByName(
    'listening_log_v1'
  );
  var k1Sheet=ss.getSheetByName(
    'listening_k1_ready_v1'
  );

  if(!payloadSheet||!logSheet||!k1Sheet){
    throw new Error(
      'FAMILY_SCHEDULER_LISTENING_SOURCE_MISSING'
    );
  }

  var p=h3FsTable_(payloadSheet);
  h3FsRequire_(p,[
    'LISTENING_SET_ID',
    'LISTENING_SET_NO',
    'STATUS',
    'K1_READY_ID',
    'ANSWER_KEY_JSON',
    'AUDIO_BINDING_JSON',
    'SOURCE_PROVENANCE_JSON',
    'ITEM_PAYLOAD_SHA256',
    'ISSUED_AT'
  ],'listening_set_payload_v1');

  var found=[];
  p.rows.forEach(function(r,i){
    if(
      Number(
        r[p.map.LISTENING_SET_NO]||0
      )===next &&
      String(
        r[p.map.STATUS]||''
      )==='AUDIO_BOUND' &&
      !String(
        r[p.map.ISSUED_AT]||''
      )
    ){
      found.push({
        row:r,
        rowNumber:i+2
      });
    }
  });

  if(found.length!==1){
    throw new Error(
      'FAMILY_SCHEDULER_LISTENING_PREPARED_COUNT:'+
      found.length
    );
  }

  var rec=found[0];
  var setId=String(
    rec.row[p.map.LISTENING_SET_ID]||''
  );
  var gate=validateProductionPreissueSet(
    setId
  );

  if(
    !gate ||
    gate.status!=='PASS' ||
    gate.payload_status!=='AUDIO_BOUND' ||
    gate.issue_performed!==false ||
    Number(gate.learner_log_rows)!==0 ||
    Number(gate.production_txn_rows)!==0
  ){
    throw new Error(
      'FAMILY_SCHEDULER_LISTENING_PREISSUE_FAIL'
    );
  }

  var payloadSnapshot=payloadSheet
    .getRange(
      rec.rowNumber,
      1,
      1,
      p.headers.length
    )
    .getValues()[0];

  var k1t=h3FsTable_(k1Sheet);
  h3FsRequire_(k1t,[
    'K1_READY_ID',
    'STATUS',
    'BOUND_LISTENING_SET_ID',
    'CONSUMED_AT'
  ],'listening_k1_ready_v1');

  var k1Id=String(
    rec.row[p.map.K1_READY_ID]||''
  );
  var k1Found=[];
  k1t.rows.forEach(function(r,i){
    if(
      String(
        r[k1t.map.K1_READY_ID]||''
      )===k1Id
    ){
      k1Found.push({
        row:r,
        rowNumber:i+2
      });
    }
  });

  if(k1Found.length!==1){
    throw new Error(
      'FAMILY_SCHEDULER_LISTENING_K1_COUNT:'+
      k1Found.length
    );
  }

  var k1Snapshot=k1Sheet
    .getRange(
      k1Found[0].rowNumber,
      1,
      1,
      k1t.headers.length
    )
    .getValues()[0];

  var audio=h3ProdParseJson_(
    rec.row[p.map.AUDIO_BINDING_JSON],
    'FAMILY_SCHEDULER_LISTENING_AUDIO_INVALID'
  );
  var provenance=h3ProdParseJson_(
    rec.row[p.map.SOURCE_PROVENANCE_JSON],
    'FAMILY_SCHEDULER_LISTENING_PROVENANCE_INVALID'
  );
  var policyId=String(
    ls.POLICY_ID||''
  );
  if(!policyId){
    throw new Error(
      'FAMILY_SCHEDULER_LISTENING_POLICY_ID_MISSING'
    );
  }

  var lt=h3FsTable_(logSheet);
  h3FsRequire_(lt,[
    'LISTEN_GEN_ID',
    'PARENT_SET_ID',
    'LISTENING_ISSUE_NO',
    'CREATED_AT',
    'LEVEL',
    'SECTION_KEY',
    'SKILL_ID',
    'SOURCE_PROVENANCE',
    'POLICY_ID',
    'SURFACE_HASH',
    'STATUS',
    'USER_RESULT',
    'ANSWERED_AT',
    'AUDIO_PLAY_COUNT',
    'AUDIO_VALID',
    'VISUAL_VALID',
    'TRANSCRIPT_REVEALED_BEFORE_ANSWER',
    'CHOICE_LANGUAGE',
    'QUEUE_UPDATE_STATUS',
    'PROVENANCE_JSON',
    'NOTES'
  ],'listening_log_v1');

  var issuedAt=h3NowTokyo_();
  var sections=['K1','K2','K3','K4','K5'];
  var rows=sections.map(function(section){
    var a=
      audio &&
      audio.individual &&
      audio.individual[section];
    var s=
      provenance &&
      provenance[section];

    if(
      !a ||
      !a.listen_gen_id ||
      !a.payload_hash ||
      !s ||
      !s.skill_id ||
      !s.mode
    ){
      throw new Error(
        'FAMILY_SCHEDULER_LISTENING_SECTION_INVALID:'+
        section
      );
    }

    var row=new Array(
      lt.headers.length
    ).fill('');
    row[lt.map.LISTEN_GEN_ID]=
      String(a.listen_gen_id);
    row[lt.map.PARENT_SET_ID]=
      setId;
    row[lt.map.LISTENING_ISSUE_NO]=
      next;
    row[lt.map.CREATED_AT]=
      issuedAt;
    row[lt.map.LEVEL]=
      '3級';
    row[lt.map.SECTION_KEY]=
      section;
    row[lt.map.SKILL_ID]=
      String(s.skill_id);
    row[lt.map.SOURCE_PROVENANCE]=
      String(s.mode);
    row[lt.map.POLICY_ID]=
      policyId;
    row[lt.map.SURFACE_HASH]=
      String(a.payload_hash);
    row[lt.map.STATUS]=
      'VALID';
    row[lt.map.AUDIO_VALID]=
      true;
    row[lt.map.VISUAL_VALID]=
      section==='K1'?true:'';
    row[
      lt.map.TRANSCRIPT_REVEALED_BEFORE_ANSWER
    ]=false;
    row[lt.map.CHOICE_LANGUAGE]=
      section==='K4'
        ? 'JA'
        : (
            section==='K5'
              ? 'KO'
              : 'AUDIO_ONLY'
          );
    return row;
  });

  var firstLogRow=logSheet.getLastRow()+1;
  var logsInserted=false;

  try {
    logSheet
      .getRange(
        firstLogRow,
        1,
        rows.length,
        lt.headers.length
      )
      .setValues(rows);
    logsInserted=true;

    payloadSheet
      .getRange(
        rec.rowNumber,
        p.map.STATUS+1
      )
      .setValue('ISSUED');
    payloadSheet
      .getRange(
        rec.rowNumber,
        p.map.ISSUED_AT+1
      )
      .setValue(issuedAt);
    SpreadsheetApp.flush();

    consumeK1ReadyAfterIssue_(
      k1Id,
      setId,
      true
    );
    SpreadsheetApp.flush();

    h3ProdReadContext_(
      ss,
      setId
    );
    buildProductionRenderPayload_(
      h3FsRenderRequest_(
        'LISTENING',
        '5L',
        setId
      )
    );

    return {
      family:'L',
      set_id:setId,
      provider_kind:'LISTENING',
      surface_family:'5L',
      render_request:
        h3FsRenderRequest_(
          'LISTENING',
          '5L',
          setId
        )
    };
  } catch(err) {
    try {
      payloadSheet
        .getRange(
          rec.rowNumber,
          1,
          1,
          p.headers.length
        )
        .setValues([payloadSnapshot]);

      k1Sheet
        .getRange(
          k1Found[0].rowNumber,
          1,
          1,
          k1t.headers.length
        )
        .setValues([k1Snapshot]);

      if(logsInserted){
        var ids=logSheet
          .getRange(
            firstLogRow,
            lt.map.PARENT_SET_ID+1,
            rows.length,
            1
          )
          .getDisplayValues();
        var allMine=ids.every(
          function(x){
            return String(
              x[0]||''
            )===setId;
          }
        );
        if(allMine){
          logSheet.deleteRows(
            firstLogRow,
            rows.length
          );
        }
      }
      SpreadsheetApp.flush();
    } catch(_rollbackErr) {}
    throw err;
  }
}

function h3FsIssuePreparedFamily_(ss,family) {
  if(family==='L'){
    return h3FsIssueListening_(ss);
  }
  if(family==='W'){
    return h3FsIssueWritten_(ss);
  }
  if(family==='R'){
    return h3FsIssueReading_(ss);
  }
  if(family==='T'){
    return h3FsIssueTranslation_(ss);
  }
  throw new Error(
    'FAMILY_SCHEDULER_ISSUE_FAMILY_INVALID:'+
    family
  );
}

function h3FsIssueIntentAtClock_(ss,level,clock) {
  var rows=h3FsLogRows_(ss,level),found=[];
  rows.forEach(function(x){
    if(
      String(x.EVENT_KIND||'')==='ISSUE_INTENT' &&
      String(x.MODE||'')==='LIMITED_LIVE' &&
      Number(x.GLOBAL_SET_CLOCK)===Number(clock) &&
      String(x.RESULT_STATUS||'')==='PENDING'
    )found.push(x);
  });
  if(found.length>1){
    throw new Error(
      'FAMILY_SCHEDULER_DUPLICATE_ISSUE_INTENT:'+clock
    );
  }
  return found.length?found[0]:null;
}

function h3FsEnsureIssueIntent_(ss,evaluation,family) {
  var persisted=h3FsEvaluationAtClock_(
    ss,
    '3級',
    evaluation.global_set_clock
  );
  var canonical=h3FsAssertIssueEvaluationBinding_(
    persisted,
    evaluation
  );
  if(H3_FS_FAMILIES_.indexOf(String(family||''))<0){
    throw new Error('FAMILY_SCHEDULER_ISSUE_INTENT_FAMILY_INVALID');
  }

  var existing=h3FsIssueIntentAtClock_(
    ss,
    '3級',
    canonical.global_set_clock
  );
  if(existing){
    if(
      String(existing.DECISION_ID||'')!==canonical.decision_id ||
      String(existing.SNAPSHOT_SHA256||'')!==canonical.snapshot_sha256 ||
      String(existing.ACTUAL_FAMILY||'')!==String(family)
    ){
      throw new Error(
        'FAMILY_SCHEDULER_ISSUE_INTENT_BINDING_MISMATCH:'+
        canonical.global_set_clock
      );
    }
    return String(existing.EVENT_ID||'');
  }

  var sh=ss.getSheetByName(H3_FS_LOG_SHEET_);
  if(!sh){
    throw new Error('FAMILY_SCHEDULER_LOG_SHEET_MISSING');
  }
  var eventId='H3FS-P-'+Utilities.getUuid();
  sh.appendRow([
    eventId,
    canonical.decision_id,
    'ISSUE_INTENT',
    new Date().toISOString(),
    '3級',
    'LIMITED_LIVE',
    canonical.global_set_clock,
    canonical.snapshot_sha256,
    canonical.next_action,
    canonical.recommended_family,
    canonical.primary_reason,
    JSON.stringify(canonical.candidate_order),
    JSON.stringify(canonical.family_metrics),
    '',
    String(family),
    'FAMILY_SCHEDULER',
    false,
    false,
    '',
    '',
    'PENDING',
    'Durable scheduler issue intent; ISSUE_APPLIED must be recorded before learner open.'
  ]);
  SpreadsheetApp.flush();

  var readback=h3FsIssueIntentAtClock_(
    ss,
    '3級',
    canonical.global_set_clock
  );
  if(
    !readback ||
    String(readback.EVENT_ID||'')!==eventId ||
    String(readback.DECISION_ID||'')!==canonical.decision_id ||
    String(readback.SNAPSHOT_SHA256||'')!==canonical.snapshot_sha256 ||
    String(readback.ACTUAL_FAMILY||'')!==String(family)
  ){
    throw new Error(
      'FAMILY_SCHEDULER_ISSUE_INTENT_READBACK_FAIL:'+
      canonical.global_set_clock
    );
  }
  return eventId;
}

function h3FsValidateIssueApplied_(
  row,
  persisted,
  issued
) {
  var canonical=h3FsPersistedEvaluation_(persisted);
  if(
    !row ||
    String(row.DECISION_ID||'')!==canonical.decision_id ||
    String(row.SNAPSHOT_SHA256||'')!==canonical.snapshot_sha256 ||
    Number(row.GLOBAL_SET_CLOCK)!==canonical.global_set_clock ||
    String(row.NEXT_ACTION||'')!==canonical.next_action ||
    String(row.RECOMMENDED_FAMILY||'')!==canonical.recommended_family ||
    String(row.PRIMARY_REASON||'')!==canonical.primary_reason ||
    h3FsCanonical_(
      h3FsJson_(row.CANDIDATE_ORDER_JSON||'[]',[])
    )!==h3FsCanonical_(canonical.candidate_order) ||
    h3FsCanonical_(
      h3FsJson_(row.FAMILY_METRICS_JSON||'{}',{})
    )!==h3FsCanonical_(canonical.family_metrics) ||
    String(row.CURRENT_SET_ID||'')!==String(issued.set_id||'') ||
    String(row.ACTUAL_FAMILY||'')!==String(issued.family||'') ||
    String(row.SELECTION_SOURCE||'')!=='FAMILY_SCHEDULER' ||
    String(row.SCHEDULER_APPLIED).toUpperCase()!=='TRUE' ||
    String(row.RESULT_STATUS||'')!=='ISSUED'
  ){
    throw new Error(
      'FAMILY_SCHEDULER_ISSUE_APPLIED_BINDING_MISMATCH:'+
      String(issued.set_id||'')
    );
  }
  return row;
}

function h3FsAppendIssueApplied_(
  ss,
  evaluation,
  issued
) {
  var sh=ss.getSheetByName(
    H3_FS_LOG_SHEET_
  );
  if(!sh){
    throw new Error(
      'FAMILY_SCHEDULER_LOG_SHEET_MISSING'
    );
  }

  var t=h3FsTable_(sh);
  h3FsRequire_(
    t,
    H3_FS_LOG_HEADERS_,
    H3_FS_LOG_SHEET_
  );

  var persisted=h3FsEvaluationAtClock_(
    ss,
    '3級',
    evaluation.global_set_clock
  );
  var canonical=h3FsAssertIssueEvaluationBinding_(
    persisted,
    evaluation
  );

  var existing=h3FsIssueAppliedForSet_(
    ss,
    '3級',
    issued.set_id
  );
  if(existing){
    h3FsValidateIssueApplied_(
      existing,
      persisted,
      issued
    );
    return String(existing.EVENT_ID||'');
  }

  var eventId=
    'H3FS-I-'+
    Utilities.getUuid();

  sh.appendRow([
    eventId,
    canonical.decision_id,
    'ISSUE_APPLIED',
    new Date().toISOString(),
    '3級',
    'LIMITED_LIVE',
    canonical.global_set_clock,
    canonical.snapshot_sha256,
    canonical.next_action,
    canonical.recommended_family,
    canonical.primary_reason,
    JSON.stringify(
      canonical.candidate_order
    ),
    JSON.stringify(
      canonical.family_metrics
    ),
    issued.set_id,
    issued.family,
    'FAMILY_SCHEDULER',
    true,
    false,
    '',
    '',
    'ISSUED',
    'Provisional LIVE issue; family selected by Family Scheduler.'
  ]);
  SpreadsheetApp.flush();

  var readback=h3FsIssueAppliedForSet_(
    ss,
    '3級',
    issued.set_id
  );
  if(!readback){
    throw new Error(
      'FAMILY_SCHEDULER_ISSUE_APPLIED_READBACK_MISSING:'+
      issued.set_id
    );
  }
  h3FsValidateIssueApplied_(
    readback,
    persisted,
    issued
  );
  return String(readback.EVENT_ID||'');
}

function h3FsRecordIssueApplied_(
  ss,
  evaluation,
  issued
) {
  var firstError=null;
  try {
    return {
      event_id:h3FsAppendIssueApplied_(
        ss,
        evaluation,
        issued
      ),
      status:'RECORDED'
    };
  } catch(err) {
    firstError=err;
  }

  var persisted=h3FsEvaluationAtClock_(
    ss,
    '3級',
    evaluation.global_set_clock
  );
  var existing=h3FsIssueAppliedForSet_(
    ss,
    '3級',
    issued.set_id
  );
  if(existing){
    h3FsValidateIssueApplied_(
      existing,
      persisted,
      issued
    );
    return {
      event_id:String(existing.EVENT_ID||''),
      status:'RECOVERED_READBACK'
    };
  }

  try {
    return {
      event_id:h3FsAppendIssueApplied_(
        ss,
        evaluation,
        issued
      ),
      status:'RECOVERED_RETRY'
    };
  } catch(secondError) {
    existing=h3FsIssueAppliedForSet_(
      ss,
      '3級',
      issued.set_id
    );
    if(existing){
      h3FsValidateIssueApplied_(
        existing,
        persisted,
        issued
      );
      return {
        event_id:String(existing.EVENT_ID||''),
        status:'RECOVERED_READBACK'
      };
    }
    throw new Error(
      'FAMILY_SCHEDULER_ISSUE_LOG_RECOVERY_REQUIRED:'+
      String(issued.set_id||'')+':'+
      String(
        secondError&&secondError.message
          ? secondError.message
          : firstError
      )
    );
  }
}

function h3FsRecoverPendingIssueApplied_(
  ss,
  persisted,
  current
) {
  if(!persisted||!current||!current.set_id){
    return null;
  }
  var intent=h3FsIssueIntentAtClock_(
    ss,
    '3級',
    Number(persisted.GLOBAL_SET_CLOCK)
  );
  if(!intent){
    return null;
  }

  var family=h3FsFamily_(
    current.surface_family
  );
  if(
    H3_FS_FAMILIES_.indexOf(family)<0 ||
    String(intent.DECISION_ID||'')!==
      String(persisted.DECISION_ID||'') ||
    String(intent.SNAPSHOT_SHA256||'')!==
      String(persisted.SNAPSHOT_SHA256||'') ||
    String(intent.ACTUAL_FAMILY||'')!==family
  ){
    throw new Error(
      'FAMILY_SCHEDULER_PENDING_ISSUE_RECOVERY_BINDING_MISMATCH:'+
      String(current.set_id||'')
    );
  }

  var evaluation=h3FsPersistedEvaluation_(
    persisted
  );
  var issued={
    set_id:String(current.set_id),
    family:family
  };
  return h3FsRecordIssueApplied_(
    ss,
    evaluation,
    issued
  );
}

function h3FamilySchedulerShadowPreview() {
  var ss=SpreadsheetApp.openById(
    H3_WEB_RUNTIME_SPREADSHEET_ID
  );
  return h3FsEvaluate_(
    ss,
    '3級'
  );
}

function h3FamilySchedulerLiveResolverPreview() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  return h3FsResolveLive_(h3FsEvaluate_(ss,'3級'));
}

function h3FamilySchedulerIssueRoutePreview() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var evaluation=h3FsEvaluate_(ss,'3級');
  var resolved=h3FsResolveLive_(evaluation);
  var current=h3ReviewCurrentLearning_(ss);
  var readiness=h3FsReadiness_(ss);
  return h3FsIssueRoute_(resolved,readiness,current);
}

function h3FsHomeNextLocked_() {
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
    var freshEvaluation=h3FsEvaluate_(ss,'3級');
    var current=h3ReviewCurrentLearning_(ss);
    var existing=h3FsEvaluationAtClock_(
      ss,
      '3級',
      freshEvaluation.global_set_clock
    );
    var evaluation=freshEvaluation;

    if(current){
      if(String(freshEvaluation.next_action||'')!=='RESUME_CURRENT'){
        throw new Error(
          'FAMILY_SCHEDULER_HOME_NEXT_CURRENT_EVALUATION_MISMATCH'
        );
      }
    } else {
      if(existing){
        h3FsAssertEvaluationReplay_(
          existing,
          freshEvaluation
        );
      } else {
        h3FsAppend_(
          ss,
          '3級',
          freshEvaluation
        );
        existing=h3FsEvaluationAtClock_(
          ss,
          '3級',
          freshEvaluation.global_set_clock
        );
        if(!existing){
          throw new Error(
            'FAMILY_SCHEDULER_EVALUATION_READBACK_MISSING:'+
            freshEvaluation.global_set_clock
          );
        }
      }
      evaluation=h3FsPersistedEvaluation_(
        existing
      );
    }

    var resolved=h3FsResolveLive_(evaluation);
    var readiness=h3FsReadiness_(ss);
    var route=h3FsIssueRoute_(
      resolved,
      readiness,
      current
    );

    var out={
      schema:'H3_FAMILY_SCHEDULER_HOME_NEXT_V1',
      scheduler_applied:false,
      issue_performed:false,
      preparation_performed:false,
      preparation_status:'',
      prepared_set_id:'',
      prepared_stage_id:'',
      route_kind:String(route.route_kind||''),
      family:String(route.family||'NONE'),
      provider_kind:String(route.provider_kind||''),
      surface_family:String(route.surface_family||''),
      route_target:String(route.route_target||''),
      current_set_id:String(route.current_set_id||''),
      readiness_state:String(route.readiness_state||''),
      requires_prepare:route.requires_prepare===true,
      result_status:String(route.result_status||''),
      client_action:'NONE',
      authoring_target:'',
      prepare_request:null,
      render_request:null,
      issue_event_id:'',
      issue_log_status:''
    };

    if(route.result_status==='BLOCKED'){
      out.client_action='BLOCKED';
      return out;
    }

    if(route.result_status!=='READY'){
      throw new Error(
        'FAMILY_SCHEDULER_HOME_NEXT_ROUTE_NOT_READY'
      );
    }

    if(route.route_kind==='CURRENT_SET'){
      var recovered=h3FsRecoverPendingIssueApplied_(
        ss,
        existing,
        current
      );
      if(recovered){
        out.issue_event_id=recovered.event_id;
        out.issue_log_status=recovered.status;
      }
      out.client_action='OPEN_CURRENT';
      out.render_request=h3FsRenderRequest_(
        route.provider_kind,
        route.surface_family,
        route.current_set_id
      );
      return out;
    }

    if(route.route_kind==='FAMILY'){
      if(route.requires_prepare){
        if(route.family==='L'){
          var prep=h3FsBuildListeningPrepare_(ss);
          if(prep.status==='READY_TO_PREPARE'){
            out.client_action='PREPARE_LISTENING';
            out.prepare_request=prep.request;
            out.prepared_set_id=prep.request.set_id;
            out.preparation_status='READY_TO_PREPARE';
            return out;
          }
          out.client_action='AUTHORING_REQUIRED';
          out.authoring_target=prep.authoring_target;
          out.preparation_status='AUTHORING_REQUIRED';
          return out;
        }

        if(route.family==='W'){
          var wPrep=h3FsPrepareWritten_(ss);
          if(wPrep.status==='AUTHORING_REQUIRED'){
            out.client_action='AUTHORING_REQUIRED';
            out.authoring_target=wPrep.authoring_target;
            out.preparation_status=wPrep.status;
            out.prepared_set_id='PENDING_ALLOCATION';
            out.prepared_stage_id=wPrep.stage_id;
            out.prepare_request=wPrep.authoring_request;
            return out;
          }
          if(wPrep.status!=='READY'){
            throw new Error(
              'FAMILY_SCHEDULER_WRITTEN_PREPARE_STATUS_INVALID'
            );
          }
          out.preparation_status='READY';
          out.prepared_set_id='PENDING_ALLOCATION';
          out.prepared_stage_id=wPrep.stage_id;
          out.requires_prepare=false;
          route.requires_prepare=false;
        } else if(route.family==='R'||route.family==='T'){
          var rtPrep=
            route.family==='R'
              ? h3FsPrepareReading_(ss)
              : h3FsPrepareTranslation_(ss);
          if(rtPrep.status==='AUTHORING_REQUIRED'){
            out.client_action='AUTHORING_REQUIRED';
            out.authoring_target=rtPrep.authoring_target;
            out.preparation_status='AUTHORING_REQUIRED';
            return out;
          }
          if(!rtPrep.set_id){
            throw new Error(
              'FAMILY_SCHEDULER_RT_PREPARE_SET_ID_MISSING'
            );
          }
          out.preparation_performed=true;
          out.preparation_status=rtPrep.status;
          out.prepared_set_id=rtPrep.set_id;
          out.requires_prepare=false;
          route.requires_prepare=false;
        } else {
          out.client_action='AUTHORING_REQUIRED';
          out.authoring_target=
            h3FsAuthoringTarget_(route.family);
          out.preparation_status='AUTHORING_REQUIRED';
          return out;
        }
      }

      h3FsEnsureIssueIntent_(
        ss,
        evaluation,
        route.family
      );

      var issued=h3FsIssuePreparedFamily_(
        ss,
        route.family
      );
      var currentAfter=
        h3ReviewCurrentLearning_(ss);
      if(
        !currentAfter ||
        String(currentAfter.set_id||'')!==String(issued.set_id||'')
      ){
        throw new Error(
          'FAMILY_SCHEDULER_ISSUE_CURRENT_READBACK_MISMATCH'
        );
      }

      var issueLog=h3FsRecordIssueApplied_(
        ss,
        evaluation,
        issued
      );

      out.scheduler_applied=true;
      out.issue_performed=true;
      out.current_set_id=issued.set_id;
      out.provider_kind=issued.provider_kind;
      out.surface_family=issued.surface_family;
      out.readiness_state='ISSUED';
      out.requires_prepare=false;
      out.client_action='OPEN_ISSUED';
      out.render_request=issued.render_request;
      out.issue_event_id=issueLog.event_id;
      out.issue_log_status=issueLog.status;
      return out;
    }

    throw new Error(
      'FAMILY_SCHEDULER_HOME_NEXT_ROUTE_KIND_INVALID'
    );
  } finally {
    lock.releaseLock();
  }
}

function h3FamilySchedulerHomeNext() {
  var first=h3FsHomeNextLocked_();

  if(first.client_action!=='PREPARE_LISTENING'){
    return first;
  }

  var request=first.prepare_request;
  if(
    !request ||
    request.schema!==H3_BACKEND_PREPARE_SCHEMA ||
    !request.set_id ||
    !request.k1_ready_id
  ){
    throw new Error(
      'FAMILY_SCHEDULER_LISTENING_PREPARE_REQUEST_INVALID'
    );
  }

  // This call owns its own source/finalization locks and runs
  // targeted audio between them; no outer scheduler lock is held.
  var prepared=prepareListeningBackendSet(
    request
  );
  if(
    !prepared ||
    prepared.schema!==H3_BACKEND_RESULT_SCHEMA ||
    prepared.status!=='PREISSUE_READY' ||
    prepared.preissue!=='PASS' ||
    prepared.issue_performed!==false ||
    String(prepared.set_id||'')!==String(request.set_id)
  ){
    throw new Error(
      'FAMILY_SCHEDULER_LISTENING_PREPARE_READBACK_FAIL'
    );
  }

  var second=h3FsHomeNextLocked_();
  second.preparation_performed=true;
  second.preparation_status='PREISSUE_READY';
  second.prepared_set_id=String(prepared.set_id||'');

  if(
    second.client_action!=='OPEN_ISSUED' &&
    second.client_action!=='OPEN_CURRENT'
  ){
    throw new Error(
      'FAMILY_SCHEDULER_POST_PREPARE_ROUTE_INVALID'
    );
  }

  return second;
}

function h3FsFamilyLaunchPreviewCore_(ss) {
  var evaluation=h3FsEvaluate_(ss,'3級');
  var current=h3ReviewCurrentLearning_(ss);
  var readiness=h3FsReadiness_(ss);
  var out={
    schema:H3_FS_FAMILY_LAUNCH_PREVIEW_SCHEMA_,
    button_mode:H3_FS_S2_BUTTON_MODE_,
    scheduler_applied:false,
    global_set_clock:Number(evaluation.global_set_clock),
    recommended_family:String(evaluation.recommended_family||''),
    families:{}
  };

  if(!isFinite(out.global_set_clock)||out.global_set_clock<0){
    throw new Error('FAMILY_LAUNCH_PREVIEW_CLOCK_INVALID');
  }

  H3_FS_FAMILIES_.forEach(function(family){
    var binding=H3_FS_ISSUE_ROUTE_BINDINGS_[family];
    var ready=readiness&&readiness[family];
    var item={
      family:family,
      provider_kind:binding.provider_kind,
      surface_family:binding.surface_family,
      route_target:binding.route_target,
      current_set_id:'',
      readiness_state:ready?String(ready.state||''):'',
      preparation_state:'',
      requires_prepare:false,
      result_status:'BLOCKED',
      client_action:'BLOCKED',
      authoring_target:'',
      reason:''
    };

    if(current){
      if(String(evaluation.next_action||'')!=='RESUME_CURRENT'){
        throw new Error('FAMILY_LAUNCH_PREVIEW_CURRENT_EVALUATION_MISMATCH');
      }
      var currentFamily=h3FsFamily_(current.surface_family);
      if(currentFamily===family){
        if(
          String(current.provider_kind||'')!==binding.provider_kind ||
          String(current.surface_family||'')!==binding.surface_family ||
          !String(current.set_id||'')
        ){
          throw new Error('FAMILY_LAUNCH_PREVIEW_CURRENT_BINDING_INVALID');
        }
        item.current_set_id=String(current.set_id);
        item.readiness_state='CURRENT_SET';
        item.result_status='READY';
        item.client_action='OPEN_CURRENT';
      } else {
        item.reason='CURRENT_OTHER_FAMILY';
      }
      out.families[family]=item;
      return;
    }

    if(
      String(evaluation.result_status||'')==='BLOCKED' ||
      String(evaluation.next_action||'')==='BLOCKED'
    ){
      item.reason='SCHEDULER_GLOBAL_BLOCK';
      out.families[family]=item;
      return;
    }

    if(String(evaluation.next_action||'')!=='RECOMMEND_FAMILY'){
      throw new Error('FAMILY_LAUNCH_PREVIEW_EVALUATION_INVALID');
    }

    if(
      !ready ||
      ready.eligible!==true ||
      ['READY','PREPARE_REQUIRED'].indexOf(
        String(ready.state||'')
      )<0
    ){
      item.reason=String(
        ready&&ready.reason||
        'FAMILY_NOT_ELIGIBLE'
      );
      out.families[family]=item;
      return;
    }

    if(String(ready.state)==='READY'){
      item.result_status='READY';
      item.client_action='LAUNCH';
      out.families[family]=item;
      return;
    }

    var prep=h3FsAuthoringPreparationPreview_(
      ss,
      family
    );
    var prepStatus=String(
      prep&&prep.status||''
    );
    item.preparation_state=prepStatus;
    item.authoring_target=String(
      prep&&prep.authoring_target||''
    );

    if(prepStatus==='AUTHORING_REQUIRED'){
      item.client_action='AUTHORING_REQUIRED';
      item.reason='AUTHORING_REQUIRED';
      out.families[family]=item;
      return;
    }

    if(
      ['READY_TO_PREPARE','PREPARE_REQUIRED']
        .indexOf(prepStatus)>=0
    ){
      item.requires_prepare=true;
      item.result_status='READY';
      item.client_action='LAUNCH';
      out.families[family]=item;
      return;
    }

    item.reason='PREPARATION_STATE_INVALID';
    out.families[family]=item;
  });

  return out;
}

function h3FamilySchedulerFamilyLaunchPreview() {
  var ss=SpreadsheetApp.openById(
    H3_WEB_RUNTIME_SPREADSHEET_ID
  );
  return h3FsFamilyLaunchPreviewCore_(ss);
}

function h3FsManualFamilyResolved_(
  evaluation,
  family
) {
  if(
    !evaluation ||
    String(evaluation.schema||'')!==H3_FS_OUTPUT_SCHEMA_ ||
    String(evaluation.result_status||'')!=='PASS' ||
    String(evaluation.next_action||'')!=='RECOMMEND_FAMILY' ||
    H3_FS_FAMILIES_.indexOf(family)<0
  ){
    throw new Error(
      'FAMILY_LAUNCH_RESOLVER_INPUT_INVALID'
    );
  }
  return {
    schema:H3_FS_LIVE_RESOLVER_SCHEMA_,
    mode:'LIVE_RESOLVER',
    scheduler_applied:false,
    global_set_clock:Number(
      evaluation.global_set_clock
    ),
    source_next_action:
      'FAMILY_SPECIFIC_LAUNCH',
    primary_reason:'S2_MODE_B',
    route_kind:'FAMILY',
    family:family,
    current_set_id:'',
    result_status:'READY'
  };
}

function h3FsHomeFamilyBase_(
  evaluation,
  family
) {
  var binding=
    H3_FS_ISSUE_ROUTE_BINDINGS_[family];
  return {
    schema:H3_FS_FAMILY_LAUNCH_RESULT_SCHEMA_,
    button_mode:H3_FS_S2_BUTTON_MODE_,
    selection_source:
      'FAMILY_SPECIFIC_LAUNCH',
    scheduler_applied:false,
    issue_performed:false,
    preparation_performed:false,
    preparation_status:'',
    prepared_set_id:'',
    prepared_stage_id:'',
    global_set_clock:Number(
      evaluation.global_set_clock
    ),
    recommended_family:String(
      evaluation.recommended_family||''
    ),
    route_kind:'FAMILY',
    family:family,
    provider_kind:
      binding?binding.provider_kind:'',
    surface_family:
      binding?binding.surface_family:'',
    route_target:
      binding?binding.route_target:'',
    current_set_id:'',
    readiness_state:'',
    requires_prepare:false,
    result_status:'BLOCKED',
    client_action:'BLOCKED',
    authoring_target:'',
    prepare_request:null,
    render_request:null,
    reason:''
  };
}

function h3FsHomeFamilyLocked_(family) {
  family=String(family||'');
  if(H3_FS_FAMILIES_.indexOf(family)<0){
    throw new Error(
      'FAMILY_LAUNCH_FAMILY_INVALID'
    );
  }

  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss=SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );
    var evaluation=h3FsEvaluate_(
      ss,
      '3級'
    );
    var out=h3FsHomeFamilyBase_(
      evaluation,
      family
    );
    var current=h3ReviewCurrentLearning_(ss);

    if(current){
      if(
        String(evaluation.next_action||'')!==
          'RESUME_CURRENT'
      ){
        throw new Error(
          'FAMILY_LAUNCH_CURRENT_EVALUATION_MISMATCH'
        );
      }
      var currentFamily=
        h3FsFamily_(current.surface_family);
      if(currentFamily!==family){
        out.reason='CURRENT_OTHER_FAMILY';
        return out;
      }
      var binding=
        H3_FS_ISSUE_ROUTE_BINDINGS_[family];
      if(
        String(current.provider_kind||'')!==
          binding.provider_kind ||
        String(current.surface_family||'')!==
          binding.surface_family ||
        !String(current.set_id||'')
      ){
        throw new Error(
          'FAMILY_LAUNCH_CURRENT_BINDING_INVALID'
        );
      }
      out.route_kind='CURRENT_SET';
      out.current_set_id=String(
        current.set_id
      );
      out.readiness_state='CURRENT_SET';
      out.requires_prepare=false;
      out.result_status='READY';
      out.client_action='OPEN_CURRENT';
      out.render_request=
        h3FsRenderRequest_(
          binding.provider_kind,
          binding.surface_family,
          current.set_id
        );
      return out;
    }

    if(
      String(evaluation.result_status||'')===
        'BLOCKED' ||
      String(evaluation.next_action||'')===
        'BLOCKED'
    ){
      out.reason='SCHEDULER_GLOBAL_BLOCK';
      return out;
    }

    if(
      String(evaluation.next_action||'')!==
        'RECOMMEND_FAMILY'
    ){
      throw new Error(
        'FAMILY_LAUNCH_EVALUATION_INVALID'
      );
    }

    var existing=h3FsEvaluationAtClock_(
      ss,
      '3級',
      evaluation.global_set_clock
    );
    if(!existing){
      h3FsAppend_(
        ss,
        '3級',
        evaluation
      );
    }

    var readiness=h3FsReadiness_(ss);
    var ready=readiness&&readiness[family];
    if(
      !ready ||
      ready.eligible!==true ||
      ['READY','PREPARE_REQUIRED'].indexOf(
        String(ready.state||'')
      )<0
    ){
      out.readiness_state=String(
        ready&&ready.state||'BLOCKED'
      );
      out.reason=String(
        ready&&ready.reason||
        'FAMILY_NOT_ELIGIBLE'
      );
      return out;
    }

    var route=h3FsIssueRoute_(
      h3FsManualFamilyResolved_(
        evaluation,
        family
      ),
      readiness,
      null
    );
    out.route_kind=route.route_kind;
    out.readiness_state=
      route.readiness_state;
    out.requires_prepare=
      route.requires_prepare===true;
    out.result_status='READY';

    if(route.requires_prepare){
      if(family==='L'){
        var prep=h3FsBuildListeningPrepare_(ss);
        if(prep.status==='READY_TO_PREPARE'){
          out.client_action='PREPARE_LISTENING';
          out.prepare_request=prep.request;
          out.prepared_set_id=
            prep.request.set_id;
          out.preparation_status=
            'READY_TO_PREPARE';
          return out;
        }
        out.client_action='AUTHORING_REQUIRED';
        out.authoring_target=
          prep.authoring_target;
        out.preparation_status=
          'AUTHORING_REQUIRED';
        out.result_status='BLOCKED';
        out.reason='AUTHORING_REQUIRED';
        return out;
      }

      if(family==='W'){
        var wPrep=h3FsPrepareWritten_(ss);
        if(
          wPrep.status===
            'AUTHORING_REQUIRED'
        ){
          out.client_action=
            'AUTHORING_REQUIRED';
          out.authoring_target=
            wPrep.authoring_target;
          out.preparation_status=
            wPrep.status;
          out.prepared_set_id=
            'PENDING_ALLOCATION';
          out.prepared_stage_id=
            wPrep.stage_id;
          out.prepare_request=
            wPrep.authoring_request;
          out.result_status='BLOCKED';
          out.reason='AUTHORING_REQUIRED';
          return out;
        }
        if(wPrep.status!=='READY'){
          throw new Error(
            'FAMILY_LAUNCH_WRITTEN_PREPARE_STATUS_INVALID'
          );
        }
        out.preparation_status='READY';
        out.prepared_set_id=
          'PENDING_ALLOCATION';
        out.prepared_stage_id=
          wPrep.stage_id;
        out.requires_prepare=false;
      } else if(
        family==='R' ||
        family==='T'
      ){
        var rtPrep=
          family==='R'
            ? h3FsPrepareReading_(ss)
            : h3FsPrepareTranslation_(ss);
        if(
          rtPrep.status===
            'AUTHORING_REQUIRED'
        ){
          out.client_action=
            'AUTHORING_REQUIRED';
          out.authoring_target=
            rtPrep.authoring_target;
          out.preparation_status=
            'AUTHORING_REQUIRED';
          out.result_status='BLOCKED';
          out.reason='AUTHORING_REQUIRED';
          return out;
        }
        if(!rtPrep.set_id){
          throw new Error(
            'FAMILY_LAUNCH_RT_PREPARE_SET_ID_MISSING'
          );
        }
        out.preparation_performed=true;
        out.preparation_status=
          rtPrep.status;
        out.prepared_set_id=
          rtPrep.set_id;
        out.requires_prepare=false;
      } else {
        throw new Error(
          'FAMILY_LAUNCH_PREPARE_FAMILY_INVALID'
        );
      }
    }

    var issued=h3FsIssuePreparedFamily_(
      ss,
      family
    );
    var currentAfter=
      h3ReviewCurrentLearning_(ss);
    if(
      !currentAfter ||
      String(currentAfter.set_id||'')!==
        String(issued.set_id||'')
    ){
      throw new Error(
        'FAMILY_LAUNCH_ISSUE_CURRENT_READBACK_MISMATCH'
      );
    }

    out.issue_performed=true;
    out.current_set_id=issued.set_id;
    out.provider_kind=
      issued.provider_kind;
    out.surface_family=
      issued.surface_family;
    out.readiness_state='ISSUED';
    out.requires_prepare=false;
    out.result_status='READY';
    out.client_action='OPEN_ISSUED';
    out.render_request=
      issued.render_request;
    return out;
  } finally {
    lock.releaseLock();
  }
}

function h3FamilySchedulerHomeFamily(family) {
  var selected=String(family||'');
  var first=
    h3FsHomeFamilyLocked_(selected);

  if(
    first.client_action!==
      'PREPARE_LISTENING'
  ){
    return first;
  }

  var request=first.prepare_request;
  if(
    !request ||
    request.schema!==
      H3_BACKEND_PREPARE_SCHEMA ||
    !request.set_id ||
    !request.k1_ready_id
  ){
    throw new Error(
      'FAMILY_LAUNCH_LISTENING_PREPARE_REQUEST_INVALID'
    );
  }

  var prepared=
    prepareListeningBackendSet(
      request
    );
  if(
    !prepared ||
    prepared.schema!==
      H3_BACKEND_RESULT_SCHEMA ||
    prepared.status!==
      'PREISSUE_READY' ||
    prepared.preissue!=='PASS' ||
    prepared.issue_performed!==false ||
    String(prepared.set_id||'')!==
      String(request.set_id)
  ){
    throw new Error(
      'FAMILY_LAUNCH_LISTENING_PREPARE_READBACK_FAIL'
    );
  }

  var second=
    h3FsHomeFamilyLocked_(
      selected
    );
  second.preparation_performed=true;
  second.preparation_status=
    'PREISSUE_READY';
  second.prepared_set_id=
    String(prepared.set_id||'');

  if(
    second.client_action!==
      'OPEN_ISSUED' &&
    second.client_action!==
      'OPEN_CURRENT'
  ){
    throw new Error(
      'FAMILY_LAUNCH_POST_PREPARE_ROUTE_INVALID'
    );
  }

  return second;
}


function h3FamilySchedulerShadowTick() {
  var lock=LockService.getScriptLock(); lock.waitLock(30000);
  try{
    var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
    var e=h3FsEvaluate_(ss,'3級');
    var existing=h3FsEvaluationAtClock_(ss,'3級',e.global_set_clock);
    if(existing){
      if(
        String(existing.RECOMMENDED_FAMILY||'')!==String(e.recommended_family||'') ||
        String(existing.PRIMARY_REASON||'')!==String(e.primary_reason||'') ||
        String(existing.CANDIDATE_ORDER_JSON||'')!==JSON.stringify(e.candidate_order)
      ){
        throw new Error(
          'FAMILY_SCHEDULER_DETERMINISM_REPLAY_MISMATCH:'+e.global_set_clock
        );
      }
      e.event_id=String(existing.EVENT_ID||'');
      e.decision_id=String(existing.DECISION_ID||'');
      e.snapshot_sha256=String(existing.SNAPSHOT_SHA256||'');
      e.scheduler_applied=false;
      e.log_status='ALREADY_RECORDED';
      return e;
    }
    var log=h3FsAppend_(ss,'3級',e);
    e.event_id=log.event_id;
    e.decision_id=log.decision_id;
    e.snapshot_sha256=log.snapshot_sha256;
    e.scheduler_applied=false;
    e.log_status='RECORDED';
    return e;
  } finally {
    lock.releaseLock();
  }
}

// S4-R4-B COMMON MONITORING OBSERVER FOUNDATION START
function h3MonitoringObserverErrorText_(err) {
  var s=String(err&&err.message ? err.message : err || 'UNKNOWN_ERROR');
  return s.length>500 ? s.slice(0,500) : s;
}

function h3MonitoringObserverIsoTime_(value) {
  var n=Number(value);
  if(!isFinite(n))return '';
  var d=new Date(n);
  if(!isFinite(d.getTime()))return '';
  try { return d.toISOString(); } catch(_ignore) { return ''; }
}

function h3MonitoringObserverNormalizeEvent_(sourceId,event,index) {
  event=event&&Object.prototype.toString.call(event)==='[object Object]'
    ? event : {detail:String(event||'')};
  var type=String(event.event_type||'ACTION_REQUIRED');
  var key=String(
    event.event_key||[
      String(sourceId),type,String(index)
    ].join(':')
  );
  return {
    source_id:String(sourceId),
    event_type:type,
    event_key:key,
    detail:String(event.detail||'')
  };
}

function h3MonitoringObserverReadSource_(spec,nowMs) {
  var sourceId=String(spec&&spec.source_id||'');
  if(!sourceId)throw new Error('MONITOR_OBSERVER_SOURCE_ID_REQUIRED');
  if(!spec||typeof spec.reader!=='function'){
    throw new Error('MONITOR_OBSERVER_SOURCE_READER_REQUIRED:'+sourceId);
  }

  try {
    var raw=spec.reader(nowMs);
    if(!raw||Object.prototype.toString.call(raw)!=='[object Object]'){
      throw new Error('MONITOR_OBSERVER_SOURCE_RESULT_INVALID:'+sourceId);
    }
    var status=String(raw.status||'OK');
    if(['OK','WARNING','ERROR'].indexOf(status)<0){
      throw new Error(
        'MONITOR_OBSERVER_SOURCE_STATUS_INVALID:'+sourceId+':'+status
      );
    }
    var events=Array.isArray(raw.action_required_events)
      ? raw.action_required_events.map(function(event,index){
          return h3MonitoringObserverNormalizeEvent_(
            sourceId,event,index
          );
        })
      : [];
    var errorText=String(raw.error||'');
    if(status==='ERROR'&&!events.length){
      events.push(h3MonitoringObserverNormalizeEvent_(
        sourceId,
        {
          event_type:'SOURCE_STATUS_ERROR',
          event_key:sourceId+':SOURCE_STATUS_ERROR',
          detail:errorText
        },
        0
      ));
    }
    return {
      source_id:sourceId,
      status:status,
      error:errorText,
      action_required_events:events,
      data:raw.data===undefined ? null : raw.data
    };
  } catch(err) {
    var error=h3MonitoringObserverErrorText_(err);
    return {
      source_id:sourceId,
      status:'ERROR',
      error:error,
      action_required_events:[
        h3MonitoringObserverNormalizeEvent_(
          sourceId,
          {
            event_type:'SOURCE_READ_ERROR',
            event_key:sourceId+':SOURCE_READ_ERROR',
            detail:error
          },
          0
        )
      ],
      data:null
    };
  }
}

function h3MonitoringObserverSnapshotHash_(snapshot) {
  return h3FsSha_({
    schema:String(snapshot.schema||''),
    level:String(snapshot.level||''),
    last_checked_at:String(snapshot.last_checked_at||''),
    status:String(snapshot.status||''),
    health:snapshot.health||{},
    sources:snapshot.sources||[],
    action_required_events:snapshot.action_required_events||[]
  });
}

function h3MonitoringObserverBuildSnapshot_(level,sourceSpecs,nowMs) {
  level=String(level||'');
  if(!level)throw new Error('MONITOR_OBSERVER_LEVEL_REQUIRED');
  if(!Array.isArray(sourceSpecs)){
    throw new Error('MONITOR_OBSERVER_SOURCE_SPECS_REQUIRED');
  }
  var nowIso=h3MonitoringObserverIsoTime_(nowMs);
  if(!nowIso){
    throw new Error('MONITOR_OBSERVER_TIME_INVALID');
  }

  var specs=sourceSpecs.slice().sort(function(a,b){
    var x=String(a&&a.source_id||'');
    var y=String(b&&b.source_id||'');
    return x<y?-1:x>y?1:0;
  });
  var seen={};
  specs.forEach(function(spec){
    var id=String(spec&&spec.source_id||'');
    if(!id)throw new Error('MONITOR_OBSERVER_SOURCE_ID_REQUIRED');
    if(seen[id])throw new Error('MONITOR_OBSERVER_DUPLICATE_SOURCE:'+id);
    seen[id]=true;
  });

  var sources=specs.map(function(spec){
    return h3MonitoringObserverReadSource_(spec,Number(nowMs));
  });
  var events=[];
  var errorCount=0,warningCount=0;
  sources.forEach(function(source){
    if(source.status==='ERROR')errorCount++;
    if(source.status==='WARNING')warningCount++;
    (source.action_required_events||[]).forEach(function(event){
      events.push(event);
    });
  });
  events.sort(function(a,b){
    var ak=String(a.event_key||''),bk=String(b.event_key||'');
    if(ak!==bk)return ak<bk?-1:1;
    var as=String(a.source_id||''),bs=String(b.source_id||'');
    return as<bs?-1:as>bs?1:0;
  });

  var status=
    errorCount>0 ? 'ERROR' :
    events.length>0 ? 'ACTION_REQUIRED' :
    warningCount>0 ? 'DEGRADED' :
    'HEALTHY';
  var snapshot={
    schema:H3_MONITOR_OBSERVER_SNAPSHOT_SCHEMA_,
    level:level,
    last_checked_at:nowIso,
    status:status,
    health:{
      source_count:sources.length,
      ok_count:sources.filter(function(x){return x.status==='OK';}).length,
      warning_count:warningCount,
      error_count:errorCount,
      action_required_count:events.length
    },
    sources:sources,
    action_required_events:events,
    write_performed:false
  };
  snapshot.snapshot_sha256=h3MonitoringObserverSnapshotHash_(snapshot);
  return snapshot;
}

function h3MonitoringObserverFatalSnapshot_(level,nowMs,err) {
  var error=h3MonitoringObserverErrorText_(err);
  var fallbackIso=
    h3MonitoringObserverIsoTime_(nowMs) ||
    h3MonitoringObserverIsoTime_(Date.now()) ||
    '1970-01-01T00:00:00.000Z';
  var snapshot={
    schema:H3_MONITOR_OBSERVER_SNAPSHOT_SCHEMA_,
    level:String(level||''),
    last_checked_at:fallbackIso,
    status:'ERROR',
    health:{
      source_count:1,
      ok_count:0,
      warning_count:0,
      error_count:1,
      action_required_count:1
    },
    sources:[{
      source_id:'OBSERVER_CONFIG',
      status:'ERROR',
      error:error,
      action_required_events:[{
        source_id:'OBSERVER_CONFIG',
        event_type:'OBSERVER_CONFIG_ERROR',
        event_key:'OBSERVER_CONFIG:ERROR',
        detail:error
      }],
      data:null
    }],
    action_required_events:[{
      source_id:'OBSERVER_CONFIG',
      event_type:'OBSERVER_CONFIG_ERROR',
      event_key:'OBSERVER_CONFIG:ERROR',
      detail:error
    }],
    write_performed:false
  };
  snapshot.snapshot_sha256=h3MonitoringObserverSnapshotHash_(snapshot);
  return snapshot;
}

function h3MonitoringObserverSnapshot_(level,sourceSpecs,nowMs) {
  try {
    return h3MonitoringObserverBuildSnapshot_(level,sourceSpecs,nowMs);
  } catch(err) {
    return h3MonitoringObserverFatalSnapshot_(level,nowMs,err);
  }
}

function h3MonitoringObserverTelemetrySheet_(ss) {
  var sh=ss.getSheetByName(H3_MONITOR_OBSERVER_SHEET_);
  if(!sh){
    sh=ss.insertSheet(H3_MONITOR_OBSERVER_SHEET_);
    sh.getRange(
      1,1,1,H3_MONITOR_OBSERVER_HEADERS_.length
    ).setValues([H3_MONITOR_OBSERVER_HEADERS_]);
  }
  var t=h3FsTable_(sh);
  h3FsRequire_(
    t,H3_MONITOR_OBSERVER_HEADERS_,H3_MONITOR_OBSERVER_SHEET_
  );
  if(
    t.headers.length!==H3_MONITOR_OBSERVER_HEADERS_.length ||
    t.headers.some(function(h,i){
      return h!==H3_MONITOR_OBSERVER_HEADERS_[i];
    })
  ){
    throw new Error('MONITOR_OBSERVER_HEADER_MISMATCH');
  }
  return {sheet:sh,table:t};
}

function h3MonitoringObserverWriteSnapshotUnlocked_(ss,snapshot) {
  if(
    !snapshot ||
    String(snapshot.schema||'')!==H3_MONITOR_OBSERVER_SNAPSHOT_SCHEMA_
  ){
    throw new Error('MONITOR_OBSERVER_SNAPSHOT_SCHEMA_MISMATCH');
  }
  var expectedHash=h3MonitoringObserverSnapshotHash_(snapshot);
  if(String(snapshot.snapshot_sha256||'')!==expectedHash){
    throw new Error('MONITOR_OBSERVER_SNAPSHOT_HASH_MISMATCH');
  }

  var q=h3MonitoringObserverTelemetrySheet_(ss);
  var m=q.table.map,matches=[];
  q.table.rows.forEach(function(row,index){
    if(String(row[m.LEVEL]||'')===String(snapshot.level||'')){
      matches.push(index+2);
    }
  });
  if(matches.length>1){
    throw new Error('MONITOR_OBSERVER_DUPLICATE_LEVEL');
  }

  var rowValues=[
    String(snapshot.level||''),
    H3_MONITOR_OBSERVER_SCHEMA_,
    String(snapshot.last_checked_at||''),
    String(snapshot.status||''),
    Number(snapshot.health&&snapshot.health.source_count||0),
    Number(snapshot.health&&snapshot.health.error_count||0),
    Number(snapshot.health&&snapshot.health.action_required_count||0),
    String(snapshot.snapshot_sha256||''),
    h3FsCanonical_(snapshot)
  ];
  var rowNumber;
  if(matches.length===1){
    rowNumber=matches[0];
    q.sheet.getRange(
      rowNumber,1,1,H3_MONITOR_OBSERVER_HEADERS_.length
    ).setValues([rowValues]);
  } else {
    rowNumber=q.table.rows.length+2;
    q.sheet.getRange(
      rowNumber,1,1,H3_MONITOR_OBSERVER_HEADERS_.length
    ).setValues([rowValues]);
  }
  SpreadsheetApp.flush();

  var verify=h3MonitoringObserverTelemetrySheet_(ss);
  var vm=verify.table.map,found=[];
  verify.table.rows.forEach(function(row,index){
    if(String(row[vm.LEVEL]||'')===String(snapshot.level||'')){
      found.push({row:row,row_number:index+2});
    }
  });
  if(found.length!==1){
    throw new Error('MONITOR_OBSERVER_READBACK_COUNT:'+found.length);
  }
  var vr=found[0].row;
  if(
    String(vr[vm.SCHEMA_VERSION]||'')!==H3_MONITOR_OBSERVER_SCHEMA_ ||
    String(vr[vm.SNAPSHOT_SHA256]||'')!==String(snapshot.snapshot_sha256) ||
    String(vr[vm.SNAPSHOT_JSON]||'')!==h3FsCanonical_(snapshot)
  ){
    throw new Error('MONITOR_OBSERVER_READBACK_MISMATCH');
  }

  return {
    schema:H3_MONITOR_OBSERVER_SCHEMA_,
    status:'RECORDED',
    level:String(snapshot.level||''),
    last_checked_at:String(snapshot.last_checked_at||''),
    observer_status:String(snapshot.status||''),
    snapshot_sha256:String(snapshot.snapshot_sha256||''),
    telemetry_row_number:found[0].row_number,
    write_performed:true
  };
}

function h3MonitoringObserverWriteSnapshot_(ss,snapshot) {
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000)){
    throw new Error('MONITOR_OBSERVER_LOCK_BUSY');
  }
  try {
    return h3MonitoringObserverWriteSnapshotUnlocked_(ss,snapshot);
  } finally {
    try{lock.releaseLock();}catch(_ignore){}
  }
}

function h3MonitoringObserverStoredSnapshot_(ss,level) {
  var sh=ss.getSheetByName(H3_MONITOR_OBSERVER_SHEET_);
  if(!sh)return null;
  var t=h3FsTable_(sh);
  h3FsRequire_(
    t,H3_MONITOR_OBSERVER_HEADERS_,H3_MONITOR_OBSERVER_SHEET_
  );
  var m=t.map,matches=[];
  t.rows.forEach(function(row){
    if(String(row[m.LEVEL]||'')===String(level||''))matches.push(row);
  });
  if(matches.length>1){
    throw new Error('MONITOR_OBSERVER_DUPLICATE_LEVEL');
  }
  if(!matches.length)return null;
  var r=matches[0];
  var snapshot=h3FsJson_(r[m.SNAPSHOT_JSON],null);
  var expectedHash=snapshot
    ? h3MonitoringObserverSnapshotHash_(snapshot)
    : '';
  if(
    !snapshot ||
    String(snapshot.schema||'')!==H3_MONITOR_OBSERVER_SNAPSHOT_SCHEMA_ ||
    String(r[m.SCHEMA_VERSION]||'')!==H3_MONITOR_OBSERVER_SCHEMA_ ||
    String(snapshot.level||'')!==String(level||'') ||
    String(r[m.LEVEL]||'')!==String(level||'') ||
    String(snapshot.snapshot_sha256||'')!==expectedHash ||
    String(r[m.SNAPSHOT_SHA256]||'')!==expectedHash
  ){
    throw new Error('MONITOR_OBSERVER_STORED_SNAPSHOT_INVALID');
  }
  return snapshot;
}

function h3MonitoringObserverSourceSpecs_(ss) {
  return [{
    source_id:'RUNTIME_AUTHORITY',
    reader:function(){
      var actual=String(ss.getId ? ss.getId() : '');
      var expected=String(H3_WEB_RUNTIME_SPREADSHEET_ID||'');
      if(!actual||actual!==expected){
        throw new Error('MONITOR_OBSERVER_RUNTIME_AUTHORITY_MISMATCH');
      }
      return {
        status:'OK',
        data:{
          authority:'RUNTIME_SPREADSHEET',
          spreadsheet_id:actual
        },
        action_required_events:[]
      };
    }
  },{
    source_id:H3_MONITOR_SEMANTIC_AUTHORING_SOURCE_ID_,
    reader:function(observedAtMs){
      return h3MonitoringSemanticAuthoringSource_(
        ss,'3級',Number(observedAtMs)
      );
    }
  },{
    source_id:H3_MONITOR_RS13_RS14_SOURCE_ID_,
    reader:function(){
      return h3MonitoringRs13Rs14Source_(ss);
    }
  }];
}

function h3MonitoringObserverPreview() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  return h3MonitoringObserverSnapshot_(
    '3級',h3MonitoringObserverSourceSpecs_(ss),Date.now()
  );
}

function h3MonitoringObserverRun() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var snapshot=h3MonitoringObserverSnapshot_(
    '3級',h3MonitoringObserverSourceSpecs_(ss),Date.now()
  );
  return h3MonitoringObserverWriteSnapshot_(ss,snapshot);
}

function h3MonitoringObserverCurrent() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var snapshot=h3MonitoringObserverStoredSnapshot_(ss,'3級');
  return {
    schema:H3_MONITOR_OBSERVER_SCHEMA_,
    status:snapshot ? 'READY' : 'EMPTY',
    snapshot:snapshot,
    write_performed:false
  };
}
// S4-R4-B COMMON MONITORING OBSERVER FOUNDATION END


// S4-R4-C SEMANTIC AUTHORING QUEUE OBSERVER START
function h3MonitoringSemanticAuthoringPolicyValid_(health) {
  if(
    !health ||
    String(health.schema||'')!==H3_FS_AUTHORING_OBSERVABILITY_SCHEMA_ ||
    String(health.mode||'')!=='READ_ONLY_HEALTH' ||
    health.write_performed!==false
  ){
    return false;
  }

  var actual=health.recovery_policy||{};
  var expected=h3FsAuthoringRecoveryPolicy_();
  return (
    String(actual.policy_id||'')===String(expected.policy_id||'') &&
    Number(actual.claim_stale_minutes)===
      Number(expected.claim_stale_minutes) &&
    Number(actual.retry_backoff_minutes)===
      Number(expected.retry_backoff_minutes) &&
    Number(actual.max_attempts)===Number(expected.max_attempts)
  );
}

function h3MonitoringSemanticAuthoringEvent_(type,detail) {
  type=String(type||'SEMANTIC_ACTION_REQUIRED');
  return {
    source_id:H3_MONITOR_SEMANTIC_AUTHORING_SOURCE_ID_,
    event_type:type,
    event_key:'SEMANTIC_AUTHORING:'+type,
    detail:String(detail||'')
  };
}

function h3MonitoringSemanticAuthoringFromHealth_(health) {
  if(!h3MonitoringSemanticAuthoringPolicyValid_(health)){
    throw new Error('MONITOR_SEMANTIC_AUTHORING_HEALTH_CONTRACT_INVALID');
  }

  var counts=health.queue_count_by_status||{};
  var openCount=Number(counts.OPEN||0);
  var retryDue=Number(health.FAILED_RETRYABLE_due_count||0);
  var staleClaimed=Number(health.stale_CLAIMED_count||0);
  var failedBlocked=Number(health.FAILED_BLOCKED_count||0);
  var alerts=health.alert_states||{};
  var events=[];

  if(openCount>0){
    events.push(h3MonitoringSemanticAuthoringEvent_(
      'SEMANTIC_OPEN',
      'OPEN='+String(openCount)
    ));
  }
  if(retryDue>0){
    events.push(h3MonitoringSemanticAuthoringEvent_(
      'SEMANTIC_RETRY_DUE',
      'FAILED_RETRYABLE_due='+String(retryDue)
    ));
  }
  if(staleClaimed>0){
    events.push(h3MonitoringSemanticAuthoringEvent_(
      'SEMANTIC_STALE_CLAIMED',
      'stale_CLAIMED='+String(staleClaimed)
    ));
  }
  if(failedBlocked>0){
    events.push(h3MonitoringSemanticAuthoringEvent_(
      'SEMANTIC_FAILED_BLOCKED',
      'FAILED_BLOCKED='+String(failedBlocked)
    ));
  }

  var authorityFailure=
    String(health.reconciliation_status||'')==='ERROR' ||
    alerts.reconciliation_error===true;
  if(authorityFailure){
    events.push(h3MonitoringSemanticAuthoringEvent_(
      'SEMANTIC_AUTHORITY_SCHEMA_UNREADABLE',
      String(health.reconciliation_error||'RECONCILIATION_ERROR')
    ));
  }

  var homeOnlyFinding=(
    alerts.duplicate_idempotency===true ||
    alerts.retry_exhausted_not_blocked===true ||
    alerts.timestamp_finding===true ||
    alerts.attempt_counter_finding===true ||
    alerts.missing_authoring_job===true
  );

  return {
    status:authorityFailure
      ? 'ERROR'
      : (events.length>0 || homeOnlyFinding ? 'WARNING' : 'OK'),
    data:{
      schema:H3_MONITOR_SEMANTIC_AUTHORING_SCHEMA_,
      monitor_contract:'S4-R4-C',
      health:health,
      semantic_write_performed:false
    },
    action_required_events:events
  };
}

function h3MonitoringSemanticAuthoringSource_(ss,level,nowMs) {
  try {
    var health=h3FsAuthoringHealthCore_(
      ss,String(level||'3級'),Number(nowMs)
    );
    return h3MonitoringSemanticAuthoringFromHealth_(health);
  } catch(err) {
    var error=h3MonitoringObserverErrorText_(err);
    return {
      status:'ERROR',
      error:error,
      data:{
        schema:H3_MONITOR_SEMANTIC_AUTHORING_SCHEMA_,
        monitor_contract:'S4-R4-C',
        health:null,
        error:error,
        semantic_write_performed:false
      },
      action_required_events:[
        h3MonitoringSemanticAuthoringEvent_(
          'SEMANTIC_AUTHORITY_SCHEMA_UNREADABLE',
          error
        )
      ]
    };
  }
}
// S4-R4-C SEMANTIC AUTHORING QUEUE OBSERVER END


// S4-R4-D RS13/RS14 GATE OBSERVER START
function h3MonitoringRs13Rs14Event_(type,detail) {
  type=String(type||'RS13_RS14_ACTION_REQUIRED');
  return {
    source_id:H3_MONITOR_RS13_RS14_SOURCE_ID_,
    event_type:type,
    event_key:'RS13_RS14:'+type,
    detail:String(detail||'')
  };
}

function h3MonitoringRs13Rs14ValidateReport_(report) {
  if(
    !report ||
    String(report.schema||'')!=='H3_RS13G_GATE_REPORT_V1' ||
    String(report.contract_id||'')!==
      H3_MONITOR_RS13_RS14_REPORT_CONTRACT_ ||
    report.read_only!==true ||
    Number(report.writes_performed)!==0
  ){
    throw new Error('MONITOR_RS13_RS14_REPORT_CONTRACT_INVALID');
  }

  var rs13=report.rs13||{};
  var rs14p=report.rs14p||{};
  var gate=rs14p.activation_gate||{};
  var progress=rs14p.progress||{};
  var metrics=gate.metrics||{};
  var thresholds=H3_MONITOR_RS13_RS14_THRESHOLDS_;
  var validStates=[
    'AWAIT_REAL_DATA',
    'RECONCILIATION_REQUIRED',
    'SAFETY_REVIEW_REQUIRED',
    'EXPLICIT_REVIEW_READY'
  ];

  if(
    validStates.indexOf(String(rs13.state||''))<0 ||
    rs13.close_automatic!==false ||
    rs14p.live_activation_automatic!==false ||
    typeof gate.gate_pass!=='boolean' ||
    !report.reconciliation ||
    typeof report.reconciliation.exact!=='boolean'
  ){
    throw new Error('MONITOR_RS13_RS14_SAFETY_CONTRACT_INVALID');
  }

  if(
    !progress.distinct_events ||
    Number(progress.distinct_events.required)!==
      thresholds.distinct_events ||
    !progress.concepts ||
    Number(progress.concepts.required)!==thresholds.concepts ||
    !progress.source_families ||
    Number(progress.source_families.required)!==
      thresholds.source_families ||
    !progress.unsafe_rows ||
    Number(progress.unsafe_rows.required)!==thresholds.unsafe_rows ||
    !progress.scheduler_applied_true ||
    Number(progress.scheduler_applied_true.required)!==
      thresholds.scheduler_applied_true ||
    !progress.require_noncorrect
  ){
    throw new Error('MONITOR_RS13_RS14_THRESHOLD_DRIFT');
  }

  var metricKeys=[
    'distinct_event_count','concept_count','source_family_count',
    'noncorrect_count','unsafe_rows','scheduler_applied_true'
  ];
  var normalizedMetrics={};
  metricKeys.forEach(function(key){
    var value=Number(metrics[key]);
    if(!Number.isInteger(value)||value<0){
      throw new Error('MONITOR_RS13_RS14_METRICS_INVALID');
    }
    normalizedMetrics[key]=value;
  });
  var frozenGatePass=(
    normalizedMetrics.distinct_event_count>=thresholds.distinct_events &&
    normalizedMetrics.concept_count>=thresholds.concepts &&
    normalizedMetrics.source_family_count>=thresholds.source_families &&
    normalizedMetrics.noncorrect_count>=thresholds.require_noncorrect &&
    normalizedMetrics.unsafe_rows===thresholds.unsafe_rows &&
    normalizedMetrics.scheduler_applied_true===
      thresholds.scheduler_applied_true
  );
  if(gate.gate_pass!==frozenGatePass){
    throw new Error('MONITOR_RS13_RS14_GATE_PREDICATE_DRIFT');
  }

  return report;
}

function h3MonitoringRs13Rs14K1AuthorityHealth_(ss) {
  if(
    typeof h3Rs13k1DescribeContract_!=='function' ||
    typeof h3Rs13k1ReadValues_!=='function' ||
    typeof h3Rs13k1RequireExactHeader_!=='function' ||
    typeof H3_RS13K1_AUTHORITY_SHEET_==='undefined' ||
    typeof H3_RS13K1_AUTHORITY_HEADERS_==='undefined'
  ){
    throw new Error('MONITOR_RS13_RS14_K1_DEPENDENCY_MISSING');
  }

  var contract=h3Rs13k1DescribeContract_();
  if(
    !contract ||
    String(contract.contract_id||'')!==
      H3_MONITOR_RS13_RS14_K1_CONTRACT_ ||
    contract.skill_level_concept_inference!==false ||
    contract.historical_backfill!==false ||
    contract.state_transfer!==false
  ){
    throw new Error('MONITOR_RS13_RS14_K1_CONTRACT_INVALID');
  }

  var values=h3Rs13k1ReadValues_(
    ss,
    H3_RS13K1_AUTHORITY_SHEET_,
    H3_RS13K1_AUTHORITY_HEADERS_,
    'MONITOR_RS13K1_AUTHORITY'
  );
  var table=h3Rs13k1RequireExactHeader_(
    values,
    H3_RS13K1_AUTHORITY_HEADERS_,
    'MONITOR_RS13K1_AUTHORITY'
  );
  return {
    contract_id:String(contract.contract_id||''),
    sheet:String(H3_RS13K1_AUTHORITY_SHEET_||''),
    row_count:table.rows.filter(function(row){
      return row.some(function(value){return String(value||'')!=='';});
    }).length,
    skill_level_concept_inference:false,
    historical_backfill:false,
    state_transfer:false
  };
}

function h3MonitoringRs13Rs14BoundedList_(values) {
  values=Array.isArray(values)?values:[];
  return {
    count:values.length,
    values:values.slice(0,10).map(function(value){
      return String(value||'').slice(0,256);
    }),
    truncated:values.length>10
  };
}
function h3MonitoringRs13Rs14BoundedReport_(report) {
  var evidence=report.evidence||{},reconciliation=report.reconciliation||{};
  var rs13=report.rs13||{},rs14p=report.rs14p||{};
  var gate=rs14p.activation_gate||{},metrics=gate.metrics||{},progress=rs14p.progress||{};
  var missing=h3MonitoringRs13Rs14BoundedList_(reconciliation.missing_observation_ids);
  var conflict=h3MonitoringRs13Rs14BoundedList_(reconciliation.conflict_observation_ids);
  var orphan=h3MonitoringRs13Rs14BoundedList_(reconciliation.orphan_observation_ids);
  var reasons=h3MonitoringRs13Rs14BoundedList_(gate.reasons);
  function n_(value){var n=Number(value);return isFinite(n)?n:0;}
  function p_(value){
    value=value||{};
    return {
      current:n_(value.current),
      required:value.required===undefined?null:n_(value.required),
      remaining:value.remaining===undefined?null:n_(value.remaining),
      satisfied:typeof value.satisfied==='boolean'?value.satisfied:undefined
    };
  }
  return {
    schema:String(report.schema||''),contract_id:String(report.contract_id||''),
    read_only:report.read_only===true,writes_performed:n_(report.writes_performed),
    evidence:{
      committed_rows:n_(evidence.committed_rows),distinct_event_count:n_(evidence.distinct_event_count),
      source_family_count:n_(evidence.source_family_count),concept_count:n_(evidence.concept_count),
      contributory_rows:n_(evidence.contributory_rows),incidental_rows:n_(evidence.incidental_rows),
      correct_rows:n_(evidence.correct_rows),triangle_rows:n_(evidence.triangle_rows),wrong_rows:n_(evidence.wrong_rows)
    },
    reconciliation:{
      expected_observation_rows:n_(reconciliation.expected_observation_rows),
      actual_observation_rows:n_(reconciliation.actual_observation_rows),
      exact_match_rows:n_(reconciliation.exact_match_rows),
      missing_observation_ids:missing.values,missing_observation_count:missing.count,
      missing_observation_ids_truncated:missing.truncated,
      conflict_observation_ids:conflict.values,conflict_observation_count:conflict.count,
      conflict_observation_ids_truncated:conflict.truncated,
      orphan_observation_ids:orphan.values,orphan_observation_count:orphan.count,
      orphan_observation_ids_truncated:orphan.truncated,exact:reconciliation.exact===true
    },
    rs13:{
      state:String(rs13.state||'').slice(0,100),
      explicit_review_ready:rs13.explicit_review_ready===true,
      close_automatic:rs13.close_automatic===true
    },
    rs14p:{
      activation_gate:{
        schema:String(gate.schema||'').slice(0,100),
        contract_id:String(gate.contract_id||'').slice(0,200),
        gate_pass:gate.gate_pass===true,
        metrics:{
          observed_rows:n_(metrics.observed_rows),distinct_event_count:n_(metrics.distinct_event_count),
          concept_count:n_(metrics.concept_count),source_family_count:n_(metrics.source_family_count),
          noncorrect_count:n_(metrics.noncorrect_count),unsafe_rows:n_(metrics.unsafe_rows),
          scheduler_applied_true:n_(metrics.scheduler_applied_true)
        },
        reasons:reasons.values,reason_count:reasons.count,reasons_truncated:reasons.truncated
      },
      progress:{
        distinct_events:p_(progress.distinct_events),concepts:p_(progress.concepts),
        source_families:p_(progress.source_families),require_noncorrect:p_(progress.require_noncorrect),
        unsafe_rows:p_(progress.unsafe_rows),scheduler_applied_true:p_(progress.scheduler_applied_true)
      },
      live_activation_automatic:rs14p.live_activation_automatic===true
    },
    next_advisory:String(report.next_advisory||'').slice(0,500)
  };
}

function h3MonitoringRs13Rs14FromReport_(report,k1Health) {
  report=h3MonitoringRs13Rs14ValidateReport_(report);
  k1Health=k1Health||{
    contract_id:H3_MONITOR_RS13_RS14_K1_CONTRACT_,
    sheet:'listening_k1_secondary_authority_v1',
    row_count:0,
    skill_level_concept_inference:false,
    historical_backfill:false,
    state_transfer:false
  };

  if(
    String(k1Health.contract_id||'')!==
      H3_MONITOR_RS13_RS14_K1_CONTRACT_ ||
    k1Health.skill_level_concept_inference!==false ||
    k1Health.historical_backfill!==false ||
    k1Health.state_transfer!==false
  ){
    throw new Error('MONITOR_RS13_RS14_K1_HEALTH_INVALID');
  }

  var events=[];
  var reconciliation=report.reconciliation||{};
  var rs13=report.rs13||{};
  var rs14p=report.rs14p||{};
  var gate=rs14p.activation_gate||{};
  var metrics=gate.metrics||{};
  var genuineSecondaryCount=
    Number(reconciliation.expected_observation_rows||0);

  if(genuineSecondaryCount>0){
    events.push(h3MonitoringRs13Rs14Event_(
      'RS13_FIRST_GENUINE_EVIDENCE',
      'genuine_secondary_rows='+String(genuineSecondaryCount)
    ));
  }
  if(reconciliation.exact!==true){
    events.push(h3MonitoringRs13Rs14Event_(
      'RS13_RECONCILIATION_BAD',
      [
        'missing='+String(
          (reconciliation.missing_observation_ids||[]).length
        ),
        'conflict='+String(
          (reconciliation.conflict_observation_ids||[]).length
        ),
        'orphan='+String(
          (reconciliation.orphan_observation_ids||[]).length
        )
      ].join(';')
    ));
  }
  if(
    Number(metrics.unsafe_rows||0)!==0 ||
    Number(metrics.scheduler_applied_true||0)!==0
  ){
    events.push(h3MonitoringRs13Rs14Event_(
      'RS13_SAFETY_BAD',
      [
        'unsafe_rows='+String(Number(metrics.unsafe_rows||0)),
        'scheduler_applied_true='+
          String(Number(metrics.scheduler_applied_true||0))
      ].join(';')
    ));
  }
  if(String(rs13.state||'')==='EXPLICIT_REVIEW_READY'){
    events.push(h3MonitoringRs13Rs14Event_(
      'RS13_EXPLICIT_REVIEW_READY',
      'manual_review_required'
    ));
  }
  if(gate.gate_pass===true){
    events.push(h3MonitoringRs13Rs14Event_(
      'RS14P_GATE_PASS',
      'MANUAL_ACTIVATION_REQUIRED'
    ));
  }

  return {
    status:events.length ? 'WARNING' : 'OK',
    data:{
      schema:H3_MONITOR_RS13_RS14_SCHEMA_,
      monitor_contract:'S4-R4-D',
      frozen_report_contract:
        H3_MONITOR_RS13_RS14_REPORT_CONTRACT_,
      frozen_thresholds:H3_MONITOR_RS13_RS14_THRESHOLDS_,
      report:h3MonitoringRs13Rs14BoundedReport_(report),
      k1_authority:k1Health,
      observer_write_performed:false,
      reconciliation_write_performed:false,
      historical_backfill_performed:false,
      rs13_close_performed:false,
      rs14_activation_performed:false,
      thresholds_changed:false
    },
    action_required_events:events
  };
}

function h3MonitoringRs13Rs14Source_(ss) {
  try {
    if(typeof h3Rs13gGateReport_!=='function'){
      throw new Error('MONITOR_RS13_RS14_REPORTER_DEPENDENCY_MISSING');
    }
    var k1Health=h3MonitoringRs13Rs14K1AuthorityHealth_(ss);
    var report=h3Rs13gGateReport_(ss);
    return h3MonitoringRs13Rs14FromReport_(report,k1Health);
  } catch(err) {
    var error=h3MonitoringObserverErrorText_(err);
    return {
      status:'ERROR',
      error:error,
      data:{
        schema:H3_MONITOR_RS13_RS14_SCHEMA_,
        monitor_contract:'S4-R4-D',
        error:error,
        observer_write_performed:false,
        reconciliation_write_performed:false,
        historical_backfill_performed:false,
        rs13_close_performed:false,
        rs14_activation_performed:false,
        thresholds_changed:false
      },
      action_required_events:[
        h3MonitoringRs13Rs14Event_(
          'RS13_RS14_AUTHORITY_UNREADABLE',
          error
        )
      ]
    };
  }
}
// S4-R4-D RS13/RS14 GATE OBSERVER END

// S4-R4-F DEDUPLICATED ACTION-REQUIRED EMAIL START
function h3MonitoringEmailRecipient_() {
  var raw=String(
    PropertiesService.getScriptProperties()
      .getProperty(H3_MONITOR_EMAIL_CONFIG_KEY_) || ''
  ).trim();
  if(!raw){
    throw new Error('MONITOR_EMAIL_CONFIG_MISSING');
  }
  if(
    raw.length>254 ||
    /[;,\s]/.test(raw) ||
    !/^[^@]+@[^@]+\.[^@]+$/.test(raw)
  ){
    throw new Error('MONITOR_EMAIL_CONFIG_INVALID');
  }
  return raw;
}

function h3MonitoringEmailConfigStatus_() {
  try {
    h3MonitoringEmailRecipient_();
    return {
      schema:H3_MONITOR_EMAIL_CONFIG_SCHEMA_,
      status:'READY',
      configured:true,
      valid:true,
      recipient_count:1,
      write_performed:false
    };
  } catch(err) {
    return {
      schema:H3_MONITOR_EMAIL_CONFIG_SCHEMA_,
      status:'ERROR',
      configured:String(
        h3MonitoringObserverErrorText_(err)
      )!=='MONITOR_EMAIL_CONFIG_MISSING',
      valid:false,
      recipient_count:0,
      error:h3MonitoringObserverErrorText_(err),
      write_performed:false
    };
  }
}

function h3MonitoringEmailConfigStatus() {
  return h3MonitoringEmailConfigStatus_();
}

function h3MonitoringNotificationIdentity_(event) {
  var source=String(event&&event.source_id||'');
  var key=String(event&&event.event_key||'');
  if(!source||!key){
    throw new Error('MONITOR_NOTIFICATION_EVENT_IDENTITY_INVALID');
  }
  return source+'|'+key;
}

function h3MonitoringNotificationSheet_(ss,createIfMissing) {
  var sh=ss.getSheetByName(H3_MONITOR_NOTIFICATION_SHEET_);
  if(!sh&&!createIfMissing)return null;
  if(!sh){
    sh=ss.insertSheet(H3_MONITOR_NOTIFICATION_SHEET_);
    sh.getRange(
      1,1,1,H3_MONITOR_NOTIFICATION_HEADERS_.length
    ).setValues([H3_MONITOR_NOTIFICATION_HEADERS_]);
  }
  var t=h3FsTable_(sh);
  h3FsRequire_(
    t,H3_MONITOR_NOTIFICATION_HEADERS_,H3_MONITOR_NOTIFICATION_SHEET_
  );
  if(
    t.headers.length!==H3_MONITOR_NOTIFICATION_HEADERS_.length ||
    t.headers.some(function(h,i){
      return h!==H3_MONITOR_NOTIFICATION_HEADERS_[i];
    })
  ){
    throw new Error('MONITOR_NOTIFICATION_HEADER_MISMATCH');
  }
  return {sheet:sh,table:t};
}

function h3MonitoringNotificationReadStates_(ss) {
  var q=h3MonitoringNotificationSheet_(ss,false);
  if(!q)return [];
  var m=q.table.map,seen={};
  return q.table.rows.map(function(row){
    var identity=String(row[m.IDENTITY]||'');
    if(!identity||seen[identity]){
      throw new Error('MONITOR_NOTIFICATION_IDENTITY_INVALID');
    }
    seen[identity]=true;
    if(
      String(row[m.SCHEMA_VERSION]||'')!==
        H3_MONITOR_NOTIFICATION_SCHEMA_
    ){
      throw new Error('MONITOR_NOTIFICATION_SCHEMA_MISMATCH');
    }
    var generation=Number(row[m.GENERATION]||0);
    var attempts=Number(row[m.ATTEMPT_COUNT]||0);
    if(
      !Number.isInteger(generation) || generation<0 ||
      !Number.isInteger(attempts) || attempts<0
    ){
      throw new Error('MONITOR_NOTIFICATION_COUNTER_INVALID');
    }
    return {
      identity:identity,
      source_id:String(row[m.SOURCE_ID]||''),
      event_type:String(row[m.EVENT_TYPE]||''),
      event_key:String(row[m.EVENT_KEY]||''),
      active:row[m.ACTIVE]===true ||
        String(row[m.ACTIVE]||'').toUpperCase()==='TRUE',
      generation:generation,
      status:String(row[m.STATUS]||''),
      attempt_count:attempts,
      first_seen_at:String(row[m.FIRST_SEEN_AT]||''),
      last_seen_at:String(row[m.LAST_SEEN_AT]||''),
      last_attempt_at:String(row[m.LAST_ATTEMPT_AT]||''),
      last_sent_at:String(row[m.LAST_SENT_AT]||''),
      last_error:String(row[m.LAST_ERROR]||''),
      detail_hash:String(row[m.DETAIL_HASH]||'')
    };
  });
}

function h3MonitoringNotificationRow_(state) {
  return [
    String(state.identity||''),
    H3_MONITOR_NOTIFICATION_SCHEMA_,
    String(state.source_id||''),
    String(state.event_type||''),
    String(state.event_key||''),
    state.active===true,
    Number(state.generation||0),
    String(state.status||''),
    Number(state.attempt_count||0),
    String(state.first_seen_at||''),
    String(state.last_seen_at||''),
    String(state.last_attempt_at||''),
    String(state.last_sent_at||''),
    String(state.last_error||''),
    String(state.detail_hash||'')
  ];
}

function h3MonitoringNotificationWriteStates_(ss,states) {
  states=(states||[]).slice().sort(function(a,b){
    return String(a.identity)<String(b.identity)?-1:
      String(a.identity)>String(b.identity)?1:0;
  });
  if(!states.length)return {write_performed:false,row_count:0};
  var q=h3MonitoringNotificationSheet_(ss,true);
  var m=q.table.map,rowByIdentity={};
  q.table.rows.forEach(function(row,index){
    var identity=String(row[m.IDENTITY]||'');
    if(identity){
      if(rowByIdentity[identity]){
        throw new Error('MONITOR_NOTIFICATION_DUPLICATE_IDENTITY');
      }
      rowByIdentity[identity]=index+2;
    }
  });
  states.forEach(function(state){
    var rowNumber=rowByIdentity[state.identity];
    if(!rowNumber){
      rowNumber=q.table.rows.length+2;
      q.table.rows.push([]);
      rowByIdentity[state.identity]=rowNumber;
    }
    q.sheet.getRange(
      rowNumber,1,1,H3_MONITOR_NOTIFICATION_HEADERS_.length
    ).setValues([h3MonitoringNotificationRow_(state)]);
  });
  SpreadsheetApp.flush();

  var verify=h3MonitoringNotificationReadStates_(ss);
  var expected={};
  states.forEach(function(state){
    expected[state.identity]=state;
  });
  states.forEach(function(state){
    var found=verify.filter(function(x){
      return x.identity===state.identity;
    });
    if(
      found.length!==1 ||
      h3FsCanonical_(found[0])!==h3FsCanonical_(state)
    ){
      throw new Error(
        'MONITOR_NOTIFICATION_READBACK_MISMATCH:'+state.identity
      );
    }
  });
  return {write_performed:true,row_count:verify.length};
}

function h3MonitoringNotificationPlan_(priorStates,events,nowIso) {
  var prior={},current={},eventByIdentity={};
  (priorStates||[]).forEach(function(state){
    if(prior[state.identity]){
      throw new Error('MONITOR_NOTIFICATION_DUPLICATE_PRIOR');
    }
    prior[state.identity]=JSON.parse(JSON.stringify(state));
  });
  (events||[]).forEach(function(event){
    var identity=h3MonitoringNotificationIdentity_(event);
    if(current[identity]){
      throw new Error('MONITOR_NOTIFICATION_DUPLICATE_CURRENT');
    }
    current[identity]=true;
    eventByIdentity[identity]=event;
  });

  var states=Object.keys(prior).map(function(identity){
    return prior[identity];
  });
  var byIdentity={};
  states.forEach(function(state){byIdentity[state.identity]=state;});

  Object.keys(byIdentity).forEach(function(identity){
    var state=byIdentity[identity];
    if(state.active===true&&!current[identity]){
      state.active=false;
      state.status='RESOLVED';
      state.last_error='';
    }
  });

  var candidates=[];
  Object.keys(current).sort().forEach(function(identity){
    var event=eventByIdentity[identity];
    var state=byIdentity[identity];
    if(!state){
      state={
        identity:identity,
        source_id:String(event.source_id||''),
        event_type:String(event.event_type||''),
        event_key:String(event.event_key||''),
        active:true,
        generation:1,
        status:'PENDING',
        attempt_count:0,
        first_seen_at:String(nowIso||''),
        last_seen_at:String(nowIso||''),
        last_attempt_at:'',
        last_sent_at:'',
        last_error:'',
        detail_hash:h3FsSha_(String(event.detail||''))
      };
      states.push(state);
      byIdentity[identity]=state;
      candidates.push(identity);
      return;
    }

    if(state.active!==true){
      state.active=true;
      state.generation=Number(state.generation||0)+1;
      state.status='PENDING';
      state.attempt_count=0;
      state.first_seen_at=String(nowIso||'');
      state.last_attempt_at='';
      state.last_sent_at='';
      state.last_error='';
    }
    state.source_id=String(event.source_id||'');
    state.event_type=String(event.event_type||'');
    state.event_key=String(event.event_key||'');
    state.last_seen_at=String(nowIso||'');
    state.detail_hash=h3FsSha_(String(event.detail||''));

    if(state.status==='CLAIMED'){
      state.status='AMBIGUOUS';
      state.last_error='MONITOR_EMAIL_PRIOR_CLAIM_UNRESOLVED';
    }

    if(
      state.status==='PENDING' ||
      state.status==='CONFIG_ERROR' ||
      (
        state.status==='SEND_ERROR' &&
        Number(state.attempt_count||0)<
          H3_MONITOR_NOTIFICATION_MAX_ATTEMPTS_
      )
    ){
      candidates.push(identity);
    }
  });

  states.sort(function(a,b){
    return String(a.identity)<String(b.identity)?-1:
      String(a.identity)>String(b.identity)?1:0;
  });
  return {
    states:states,
    candidate_identities:candidates,
    event_by_identity:eventByIdentity
  };
}

function h3MonitoringNotificationClaim_(plan,nowIso) {
  var wanted={};
  (plan.candidate_identities||[]).forEach(function(identity){
    wanted[identity]=true;
  });
  plan.states.forEach(function(state){
    if(!wanted[state.identity])return;
    state.status='CLAIMED';
    state.attempt_count=Number(state.attempt_count||0)+1;
    state.last_attempt_at=String(nowIso||'');
    state.last_error='';
  });
  return plan;
}

function h3MonitoringNotificationMarkConfigError_(plan,error) {
  var wanted={};
  (plan.candidate_identities||[]).forEach(function(identity){
    wanted[identity]=true;
  });
  plan.states.forEach(function(state){
    if(!wanted[state.identity])return;
    state.status='CONFIG_ERROR';
    state.last_error=String(error||'MONITOR_EMAIL_CONFIG_ERROR');
  });
  return plan;
}

function h3MonitoringNotificationMarkSendResult_(
  plan,ok,nowIso,error
) {
  var wanted={};
  (plan.candidate_identities||[]).forEach(function(identity){
    wanted[identity]=true;
  });
  plan.states.forEach(function(state){
    if(!wanted[state.identity])return;
    if(ok){
      state.status='SENT';
      state.last_sent_at=String(nowIso||'');
      state.last_error='';
    } else {
      state.status=
        Number(state.attempt_count||0)>=
          H3_MONITOR_NOTIFICATION_MAX_ATTEMPTS_
          ? 'RETRY_EXHAUSTED'
          : 'SEND_ERROR';
      state.last_error=h3MonitoringObserverErrorText_(error);
    }
  });
  return plan;
}

function h3MonitoringNotificationMessage_(plan,snapshot) {
  var wanted={};
  (plan.candidate_identities||[]).forEach(function(identity){
    wanted[identity]=true;
  });
  var events=Object.keys(plan.event_by_identity||{})
    .filter(function(identity){return wanted[identity];})
    .sort()
    .map(function(identity){return plan.event_by_identity[identity];});
  if(!events.length){
    throw new Error('MONITOR_NOTIFICATION_EMPTY_BATCH');
  }
  var subject=events.length===1
    ? '[H3] Action required: '+String(events[0].event_type||'EVENT')
    : '[H3] '+String(events.length)+' action-required events';
  var lines=[
    'HANGUL monitoring requires attention.',
    'Detected: '+String(snapshot.last_checked_at||''),
    '',
    'Events:'
  ];
  events.forEach(function(event){
    lines.push(
      '- '+String(event.source_id||'')+
      ' / '+String(event.event_type||'')
    );
    if(String(event.detail||'')){
      lines.push('  '+String(event.detail||''));
    }
  });
  lines.push(
    '',
    'No learner, score, pointer, scheduler, RS13-close, or RS14-activation action was performed.',
    'Review the Web App HOME monitor before taking action.'
  );
  return {subject:subject,body:lines.join('\n'),events:events};
}

function h3MonitoringNotificationSend_(recipient,message) {
  var quota=Number(MailApp.getRemainingDailyQuota());
  if(!isFinite(quota)||quota<1){
    throw new Error('MONITOR_EMAIL_QUOTA_EXHAUSTED');
  }
  MailApp.sendEmail(
    String(recipient),
    String(message.subject||''),
    String(message.body||'')
  );
}

function h3MonitoringNotificationProcess_(ss,snapshot,nowMs) {
  if(
    !snapshot ||
    String(snapshot.schema||'')!==H3_MONITOR_OBSERVER_SNAPSHOT_SCHEMA_ ||
    snapshot.write_performed!==false ||
    String(snapshot.snapshot_sha256||'')!==
      h3MonitoringObserverSnapshotHash_(snapshot)
  ){
    throw new Error('MONITOR_NOTIFICATION_SNAPSHOT_INVALID');
  }
  nowMs=Number(nowMs);
  if(!isFinite(nowMs)){
    throw new Error('MONITOR_NOTIFICATION_TIME_INVALID');
  }
  var nowIso=new Date(nowMs).toISOString();
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000)){
    return {
      schema:H3_MONITOR_NOTIFICATION_SCHEMA_,
      status:'LOCK_BUSY',
      write_performed:false,
      email_sent:false
    };
  }
  try {
    var prior=h3MonitoringNotificationReadStates_(ss);
    var plan=h3MonitoringNotificationPlan_(
      prior,snapshot.action_required_events||[],nowIso
    );

    if(!plan.candidate_identities.length){
      var passive=h3MonitoringNotificationWriteStates_(ss,plan.states);
      return {
        schema:H3_MONITOR_NOTIFICATION_SCHEMA_,
        status:'NO_EMAIL',
        candidate_count:0,
        email_sent:false,
        state_write_performed:passive.write_performed,
        write_performed:passive.write_performed
      };
    }

    var config=h3MonitoringEmailConfigStatus_();
    if(config.status!=='READY'){
      h3MonitoringNotificationMarkConfigError_(
        plan,String(config.error||'MONITOR_EMAIL_CONFIG_ERROR')
      );
      var configWrite=
        h3MonitoringNotificationWriteStates_(ss,plan.states);
      return {
        schema:H3_MONITOR_NOTIFICATION_SCHEMA_,
        status:'CONFIG_ERROR',
        candidate_count:plan.candidate_identities.length,
        email_sent:false,
        state_write_performed:configWrite.write_performed,
        write_performed:configWrite.write_performed
      };
    }

    h3MonitoringNotificationClaim_(plan,nowIso);
    h3MonitoringNotificationWriteStates_(ss,plan.states);
    var message=h3MonitoringNotificationMessage_(plan,snapshot);
    try {
      h3MonitoringNotificationSend_(
        h3MonitoringEmailRecipient_(),message
      );
    } catch(sendErr) {
      h3MonitoringNotificationMarkSendResult_(
        plan,false,nowIso,sendErr
      );
      h3MonitoringNotificationWriteStates_(ss,plan.states);
      return {
        schema:H3_MONITOR_NOTIFICATION_SCHEMA_,
        status:plan.states.some(function(state){
          return plan.candidate_identities.indexOf(state.identity)>=0 &&
            state.status==='RETRY_EXHAUSTED';
        }) ? 'RETRY_EXHAUSTED' : 'SEND_ERROR',
        candidate_count:plan.candidate_identities.length,
        email_sent:false,
        state_write_performed:true,
        error:h3MonitoringObserverErrorText_(sendErr),
        write_performed:true
      };
    }

    h3MonitoringNotificationMarkSendResult_(
      plan,true,nowIso,''
    );
    h3MonitoringNotificationWriteStates_(ss,plan.states);
    return {
      schema:H3_MONITOR_NOTIFICATION_SCHEMA_,
      status:'SENT',
      candidate_count:plan.candidate_identities.length,
      email_sent:true,
      state_write_performed:true,
      write_performed:true
    };
  } finally {
    lock.releaseLock();
  }
}

function h3MonitoringNotificationHomeState_(ss) {
  var config=h3MonitoringEmailConfigStatus_();
  var states=h3MonitoringNotificationReadStates_(ss);
  var active=states.filter(function(x){return x.active===true;});
  var errors=active.filter(function(x){
    return [
      'CONFIG_ERROR','SEND_ERROR','RETRY_EXHAUSTED','AMBIGUOUS'
    ].indexOf(x.status)>=0;
  });
  var pending=active.filter(function(x){
    return ['PENDING','CLAIMED'].indexOf(x.status)>=0;
  });
  var sent=active.filter(function(x){return x.status==='SENT';});
  var ambiguous=active.filter(function(x){return x.status==='AMBIGUOUS';});
  var lastSent='';
  var lastAttempt='';
  var lastError='';
  states.forEach(function(state){
    if(String(state.last_sent_at||'')>lastSent){
      lastSent=String(state.last_sent_at||'');
    }
    if(String(state.last_attempt_at||'')>lastAttempt){
      lastAttempt=String(state.last_attempt_at||'');
    }
    if(!lastError&&String(state.last_error||'')){
      lastError=String(state.last_error||'');
    }
  });
  var status=
    config.status!=='READY' || errors.length>0 ? 'ERROR' :
    pending.length>0 ? 'PENDING' :
    'READY';
  return {
    schema:H3_MONITOR_NOTIFICATION_SCHEMA_,
    status:status,
    config_status:String(config.status||''),
    active_count:active.length,
    sent_current_count:sent.length,
    pending_count:pending.length,
    error_count:errors.length,
    ambiguous_count:ambiguous.length,
    last_attempt_at:lastAttempt,
    last_sent_at:lastSent,
    last_error:lastError,
    max_attempts:H3_MONITOR_NOTIFICATION_MAX_ATTEMPTS_,
    read_only:true,
    write_performed:false
  };
}

function h3MonitoringNotificationCurrent() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  return h3MonitoringNotificationHomeState_(ss);
}

function h3MonitoringObserverEmailRun() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var snapshot=h3MonitoringObserverSnapshot_(
    '3級',h3MonitoringObserverSourceSpecs_(ss),Date.now()
  );
  var observer=h3MonitoringObserverWriteSnapshot_(ss,snapshot);
  var notification=h3MonitoringNotificationProcess_(
    ss,snapshot,Date.now()
  );
  return {
    schema:'H3_MONITOR_OBSERVER_EMAIL_RUN_V1',
    status:String(notification.status||''),
    observer:observer,
    notification:notification,
    production_trigger_created:false,
    semantic_authoring_performed:false,
    rs13_close_performed:false,
    rs14_activation_performed:false
  };
}
// S4-R4-F DEDUPLICATED ACTION-REQUIRED EMAIL END


// S4-R4-H PRODUCTION MONITOR CUTOVER START
var H3_MONITOR_PRODUCTION_TRIGGER_SCHEMA_ =
  'H3_MONITOR_PRODUCTION_TRIGGER_V1';
var H3_MONITOR_PRODUCTION_PREFLIGHT_SCHEMA_ =
  'H3_MONITOR_PRODUCTION_PREFLIGHT_V1';
var H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_ =
  'S4-R4-H';
var H3_MONITOR_PRODUCTION_TRIGGER_HANDLER_ =
  'h3MonitoringObserverEmailRun';
var H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_HOURS_ = 1;
var H3_MONITOR_PRODUCTION_TRIGGER_ID_KEY_ =
  'H3_MONITOR_PRODUCTION_TRIGGER_ID';
var H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_KEY_ =
  'H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_HOURS';
var H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_KEY_ =
  'H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT';
var H3_MONITOR_PRODUCTION_REQUIRED_SCOPES_ = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/script.external_request',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/script.send_mail',
  'https://www.googleapis.com/auth/script.scriptapp'
];

function h3MonitoringProductionRequireScopes_() {
  ScriptApp.requireScopes(
    ScriptApp.AuthMode.FULL,
    H3_MONITOR_PRODUCTION_REQUIRED_SCOPES_
  );
}

function h3MonitoringProductionTriggerMatches_() {
  return ScriptApp.getProjectTriggers().filter(function(trigger){
    return String(trigger.getHandlerFunction()||'')===
      H3_MONITOR_PRODUCTION_TRIGGER_HANDLER_;
  });
}

function h3MonitoringProductionTriggerMetadata_() {
  var props=PropertiesService.getScriptProperties();
  return {
    trigger_id:String(
      props.getProperty(H3_MONITOR_PRODUCTION_TRIGGER_ID_KEY_)||''
    ),
    cadence_hours:String(
      props.getProperty(H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_KEY_)||''
    ),
    contract:String(
      props.getProperty(H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_KEY_)||''
    )
  };
}

function h3MonitoringProductionTriggerClearMetadata_() {
  var props=PropertiesService.getScriptProperties();
  props.deleteProperty(H3_MONITOR_PRODUCTION_TRIGGER_ID_KEY_);
  props.deleteProperty(H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_KEY_);
  props.deleteProperty(H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_KEY_);
}

function h3MonitoringProductionTriggerStatus_() {
  var all=ScriptApp.getProjectTriggers();
  var matches=all.filter(function(trigger){
    return String(trigger.getHandlerFunction()||'')===
      H3_MONITOR_PRODUCTION_TRIGGER_HANDLER_;
  });
  var meta=h3MonitoringProductionTriggerMetadata_();
  var one=matches.length===1 ? matches[0] : null;
  var uniqueId=one ? String(one.getUniqueId()||'') : '';
  var eventType=one ? String(one.getEventType()||'') : '';
  var triggerSource=one ? String(one.getTriggerSource()||'') : '';
  var clockOk=!!one &&
    one.getEventType()===ScriptApp.EventType.CLOCK &&
    one.getTriggerSource()===ScriptApp.TriggerSource.CLOCK;
  var metadataPresent=!!(
    meta.trigger_id || meta.cadence_hours || meta.contract
  );
  var metadataMatch=!!one &&
    meta.trigger_id===uniqueId &&
    meta.cadence_hours===
      String(H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_HOURS_) &&
    meta.contract===H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_;
  var status;
  if(matches.length===0){
    status=metadataPresent ? 'ERROR' : 'ABSENT';
  } else if(matches.length===1 && clockOk && metadataMatch){
    status='READY';
  } else {
    status='ERROR';
  }
  return {
    schema:H3_MONITOR_PRODUCTION_TRIGGER_SCHEMA_,
    status:status,
    trigger_handler:H3_MONITOR_PRODUCTION_TRIGGER_HANDLER_,
    configured_cadence_hours:
      H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_HOURS_,
    project_trigger_count:all.length,
    matching_trigger_count:matches.length,
    event_type:eventType,
    trigger_source:triggerSource,
    metadata_present:metadataPresent,
    metadata_match:metadataMatch,
    duplicate_trigger:matches.length>1,
    write_performed:false
  };
}

function h3MonitoringProductionTriggerStatus() {
  return h3MonitoringProductionTriggerStatus_();
}

function h3MonitoringProductionPreflight_() {
  var config=h3MonitoringEmailConfigStatus_();
  var snapshot=h3MonitoringObserverPreview();
  var trigger=h3MonitoringProductionTriggerStatus_();
  var observerReady=
    snapshot &&
    String(snapshot.schema||'')===
      H3_MONITOR_OBSERVER_SNAPSHOT_SCHEMA_ &&
    snapshot.write_performed===false &&
    String(snapshot.status||'')==='HEALTHY' &&
    Number(snapshot.health&&snapshot.health.error_count||0)===0 &&
    Number(
      snapshot.health&&snapshot.health.action_required_count||0
    )===0;
  var triggerReady=
    trigger.status==='ABSENT' || trigger.status==='READY';
  var ready=
    config.status==='READY' &&
    config.valid===true &&
    Number(config.recipient_count||0)===1 &&
    config.write_performed===false &&
    observerReady &&
    triggerReady;
  return {
    schema:H3_MONITOR_PRODUCTION_PREFLIGHT_SCHEMA_,
    status:ready ? 'READY' : 'ERROR',
    email_config_status:String(config.status||''),
    observer_status:String(snapshot&&snapshot.status||''),
    observer_error_count:Number(
      snapshot&&snapshot.health&&snapshot.health.error_count||0
    ),
    action_required_count:Number(
      snapshot&&snapshot.health&&
      snapshot.health.action_required_count||0
    ),
    trigger_status:String(trigger.status||''),
    matching_trigger_count:Number(
      trigger.matching_trigger_count||0
    ),
    write_performed:false
  };
}

function h3MonitoringProductionPreflight() {
  return h3MonitoringProductionPreflight_();
}

function h3MonitoringProductionTriggerEnsure() {
  h3MonitoringProductionRequireScopes_();
  var preflight=h3MonitoringProductionPreflight_();
  if(preflight.status!=='READY'){
    throw new Error('MONITOR_PRODUCTION_PREFLIGHT_NOT_READY');
  }

  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000)){
    throw new Error('MONITOR_PRODUCTION_TRIGGER_LOCK_BUSY');
  }
  try {
    var before=h3MonitoringProductionTriggerStatus_();
    if(before.status==='READY'){
      return {
        schema:H3_MONITOR_PRODUCTION_TRIGGER_SCHEMA_,
        status:'READY',
        created:false,
        trigger:before,
        write_performed:false
      };
    }
    if(before.status!=='ABSENT'){
      throw new Error('MONITOR_PRODUCTION_TRIGGER_NOT_ABSENT');
    }

    var created=ScriptApp
      .newTrigger(H3_MONITOR_PRODUCTION_TRIGGER_HANDLER_)
      .timeBased()
      .everyHours(H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_HOURS_)
      .create();
    var props=PropertiesService.getScriptProperties();
    props.setProperty(
      H3_MONITOR_PRODUCTION_TRIGGER_ID_KEY_,
      String(created.getUniqueId()||'')
    );
    props.setProperty(
      H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_KEY_,
      String(H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_HOURS_)
    );
    props.setProperty(
      H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_KEY_,
      H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_
    );

    var after=h3MonitoringProductionTriggerStatus_();
    if(
      after.status!=='READY' ||
      Number(after.matching_trigger_count)!==1
    ){
      try { ScriptApp.deleteTrigger(created); } catch(ignore) {}
      h3MonitoringProductionTriggerClearMetadata_();
      throw new Error(
        'MONITOR_PRODUCTION_TRIGGER_READBACK_MISMATCH'
      );
    }
    return {
      schema:H3_MONITOR_PRODUCTION_TRIGGER_SCHEMA_,
      status:'READY',
      created:true,
      trigger:after,
      write_performed:true
    };
  } finally {
    lock.releaseLock();
  }
}

function h3MonitoringProductionTriggerRemove() {
  h3MonitoringProductionRequireScopes_();
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000)){
    throw new Error('MONITOR_PRODUCTION_TRIGGER_LOCK_BUSY');
  }
  try {
    var status=h3MonitoringProductionTriggerStatus_();
    if(status.status==='ABSENT'){
      return {
        schema:H3_MONITOR_PRODUCTION_TRIGGER_SCHEMA_,
        status:'ABSENT',
        removed:false,
        write_performed:false
      };
    }
    if(status.status!=='READY'){
      throw new Error(
        'MONITOR_PRODUCTION_TRIGGER_REMOVE_FAIL_CLOSED'
      );
    }
    var meta=h3MonitoringProductionTriggerMetadata_();
    var matches=h3MonitoringProductionTriggerMatches_();
    if(
      matches.length!==1 ||
      String(matches[0].getUniqueId()||'')!==meta.trigger_id
    ){
      throw new Error(
        'MONITOR_PRODUCTION_TRIGGER_REMOVE_IDENTITY_MISMATCH'
      );
    }
    ScriptApp.deleteTrigger(matches[0]);
    h3MonitoringProductionTriggerClearMetadata_();
    var after=h3MonitoringProductionTriggerStatus_();
    if(after.status!=='ABSENT'){
      throw new Error(
        'MONITOR_PRODUCTION_TRIGGER_REMOVE_READBACK_MISMATCH'
      );
    }
    return {
      schema:H3_MONITOR_PRODUCTION_TRIGGER_SCHEMA_,
      status:'ABSENT',
      removed:true,
      write_performed:true
    };
  } finally {
    lock.releaseLock();
  }
}
// S4-R4-H PRODUCTION MONITOR CUTOVER END


// S4-R4-E HOME MONITOR READ MODEL START
function h3MonitoringHomeSource_(snapshot,sourceId) {
  var matches=(snapshot.sources||[]).filter(function(source){
    return String(source&&source.source_id||'')===String(sourceId||'');
  });
  if(matches.length!==1){
    throw new Error(
      'MONITOR_HOME_SOURCE_COUNT:'+String(sourceId)+':'+matches.length
    );
  }
  return matches[0];
}

function h3MonitoringHomeProgress_(raw,required) {
  raw=raw||{};
  var current=Number(raw.current||0);
  var expected=Number(
    raw.required===undefined || raw.required===null
      ? required
      : raw.required
  );
  if(
    !isFinite(current) ||
    current<0 ||
    !isFinite(expected) ||
    expected<0
  ){
    throw new Error('MONITOR_HOME_PROGRESS_INVALID');
  }
  return {
    current:current,
    required:expected,
    satisfied:typeof raw.satisfied==='boolean'
      ? raw.satisfied
      : current>=expected
  };
}

function h3MonitoringHomeUnavailableProgress_(required) {
  return {current:0,required:Number(required||0),satisfied:false,available:false};
}

function h3MonitoringHomeReadModelFromSnapshot_(snapshot) {
  if(
    !snapshot ||
    String(snapshot.schema||'')!==H3_MONITOR_OBSERVER_SNAPSHOT_SCHEMA_ ||
    snapshot.write_performed!==false
  ){
    throw new Error('MONITOR_HOME_SNAPSHOT_INVALID');
  }
  if(
    String(snapshot.snapshot_sha256||'')!==
      h3MonitoringObserverSnapshotHash_(snapshot)
  ){
    throw new Error('MONITOR_HOME_SNAPSHOT_HASH_MISMATCH');
  }

  var fatalSources=(snapshot.sources||[]).filter(function(source){
    return String(source&&source.source_id||'')==='OBSERVER_CONFIG';
  });
  if(String(snapshot.status||'')==='ERROR'&&(snapshot.sources||[]).length===1&&fatalSources.length===1){
    var fatal=fatalSources[0]||{};
    var fatalError=String(fatal.error||fatal.action_required_events&&fatal.action_required_events[0]&&fatal.action_required_events[0].detail||'OBSERVER_CONFIG_ERROR');
    var fatalRecent=(snapshot.action_required_events||[]).slice(0,H3_MONITOR_HOME_EVENT_LIMIT_).map(function(event){
      return {source_id:String(event&&event.source_id||''),event_type:String(event&&event.event_type||''),detail:String(event&&event.detail||'')};
    });
    var ft=H3_MONITOR_RS13_RS14_THRESHOLDS_;
    return {
      schema:H3_MONITOR_HOME_READ_MODEL_SCHEMA_,level:String(snapshot.level||''),status:'ERROR',
      last_checked_at:String(snapshot.last_checked_at||''),
      observer_health:{
        source_count:Number(snapshot.health&&snapshot.health.source_count||0),
        ok_count:Number(snapshot.health&&snapshot.health.ok_count||0),
        warning_count:Number(snapshot.health&&snapshot.health.warning_count||0),
        error_count:Number(snapshot.health&&snapshot.health.error_count||0),
        action_required_count:Number(snapshot.health&&snapshot.health.action_required_count||0)
      },
      runtime_authority:{status:'ERROR',spreadsheet_id:'',error:fatalError},
      semantic_authoring:{
        status:'ERROR',queue_total_rows:0,open_count:0,claimed_count:0,retry_due_count:0,
        stale_claimed_count:0,failed_blocked_count:0,duplicate_idempotency_count:0,
        retry_exhausted_not_blocked_count:0,timestamp_finding_count:0,
        attempt_counter_finding_count:0,missing_job_finding_count:0,
        reconciliation_status:'ERROR',error:fatalError
      },
      rs13_rs14:{
        status:'ERROR',rs13_state:'ERROR',genuine_secondary_rows:0,reconciliation_exact:false,
        k1_authority_rows:0,rs14p_gate_pass:false,error:fatalError,
        progress:{
          distinct_events:h3MonitoringHomeUnavailableProgress_(ft.distinct_events),
          concepts:h3MonitoringHomeUnavailableProgress_(ft.concepts),
          source_families:h3MonitoringHomeUnavailableProgress_(ft.source_families),
          noncorrect:h3MonitoringHomeUnavailableProgress_(ft.require_noncorrect),
          unsafe_rows:h3MonitoringHomeUnavailableProgress_(ft.unsafe_rows),
          scheduler_applied_true:h3MonitoringHomeUnavailableProgress_(ft.scheduler_applied_true)
        }
      },
      recent_events:fatalRecent,recent_events_truncated:(snapshot.action_required_events||[]).length>fatalRecent.length,
      fatal_observer_error:fatalError,read_only:true,write_performed:false
    };
  }

  var semantic=h3MonitoringHomeSource_(
    snapshot,H3_MONITOR_SEMANTIC_AUTHORING_SOURCE_ID_
  );
  var gate=h3MonitoringHomeSource_(
    snapshot,H3_MONITOR_RS13_RS14_SOURCE_ID_
  );
  var runtime=h3MonitoringHomeSource_(
    snapshot,'RUNTIME_AUTHORITY'
  );

  var semanticData=semantic.data||{};
  var semanticHealth=semanticData.health||{};
  var queueCounts=semanticHealth.queue_count_by_status||{};
  var gateData=gate.data||{};
  var report=gateData.report||{};
  var reconciliation=report.reconciliation||{};
  var rs13=report.rs13||{};
  var rs14p=report.rs14p||{};
  var activation=rs14p.activation_gate||{};
  var progress=rs14p.progress||{};
  var k1=gateData.k1_authority||{};
  var thresholds=H3_MONITOR_RS13_RS14_THRESHOLDS_;

  var recent=(snapshot.action_required_events||[])
    .slice(0,H3_MONITOR_HOME_EVENT_LIMIT_)
    .map(function(event){
      return {
        source_id:String(event&&event.source_id||''),
        event_type:String(event&&event.event_type||''),
        detail:String(event&&event.detail||'')
      };
    });

  return {
    schema:H3_MONITOR_HOME_READ_MODEL_SCHEMA_,
    level:String(snapshot.level||''),
    status:String(snapshot.status||''),
    last_checked_at:String(snapshot.last_checked_at||''),
    observer_health:{
      source_count:Number(snapshot.health&&snapshot.health.source_count||0),
      ok_count:Number(snapshot.health&&snapshot.health.ok_count||0),
      warning_count:Number(snapshot.health&&snapshot.health.warning_count||0),
      error_count:Number(snapshot.health&&snapshot.health.error_count||0),
      action_required_count:Number(
        snapshot.health&&snapshot.health.action_required_count||0
      )
    },
    runtime_authority:{
      status:String(runtime.status||''),
      spreadsheet_id:String(
        runtime.data&&runtime.data.spreadsheet_id||''
      )
    },
    semantic_authoring:{
      status:String(semantic.status||''),
      queue_total_rows:Number(semanticHealth.queue_total_rows||0),
      open_count:Number(queueCounts.OPEN||0),
      claimed_count:Number(queueCounts.CLAIMED||0),
      retry_due_count:Number(
        semanticHealth.FAILED_RETRYABLE_due_count||0
      ),
      stale_claimed_count:Number(
        semanticHealth.stale_CLAIMED_count||0
      ),
      failed_blocked_count:Number(
        semanticHealth.FAILED_BLOCKED_count||0
      ),
      duplicate_idempotency_count:Number(
        semanticHealth.duplicate_idempotency_violation_count||0
      ),
      retry_exhausted_not_blocked_count:Number(
        semanticHealth.retry_exhausted_not_blocked_count||0
      ),
      timestamp_finding_count:Number(
        semanticHealth.timestamp_finding_count||0
      ),
      attempt_counter_finding_count:Number(
        semanticHealth.attempt_counter_finding_count||0
      ),
      missing_job_finding_count:Number(
        semanticHealth.missing_job_reconciliation_finding_count||0
      ),
      reconciliation_status:String(
        semanticHealth.reconciliation_status||''
      ),
      error:String(semantic.error||semanticData.error||'')
    },
    rs13_rs14:{
      status:String(gate.status||''),
      rs13_state:String(rs13.state||''),
      genuine_secondary_rows:Number(
        reconciliation.expected_observation_rows||0
      ),
      reconciliation_exact:reconciliation.exact===true,
      k1_authority_rows:Number(k1.row_count||0),
      rs14p_gate_pass:activation.gate_pass===true,
      error:String(gate.error||gateData.error||''),
      progress:{
        distinct_events:h3MonitoringHomeProgress_(
          progress.distinct_events,thresholds.distinct_events
        ),
        concepts:h3MonitoringHomeProgress_(
          progress.concepts,thresholds.concepts
        ),
        source_families:h3MonitoringHomeProgress_(
          progress.source_families,thresholds.source_families
        ),
        noncorrect:h3MonitoringHomeProgress_(
          progress.require_noncorrect,thresholds.require_noncorrect
        ),
        unsafe_rows:h3MonitoringHomeProgress_(
          progress.unsafe_rows,thresholds.unsafe_rows
        ),
        scheduler_applied_true:h3MonitoringHomeProgress_(
          progress.scheduler_applied_true,
          thresholds.scheduler_applied_true
        )
      }
    },
    recent_events:recent,
    recent_events_truncated:
      (snapshot.action_required_events||[]).length>recent.length,
    read_only:true,
    write_performed:false
  };
}

function h3MonitoringHomeReadModel() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  var snapshot=h3MonitoringObserverSnapshot_(
    '3級',
    h3MonitoringObserverSourceSpecs_(ss),
    Date.now()
  );
  var model=h3MonitoringHomeReadModelFromSnapshot_(snapshot);
  model.email_notifications=h3MonitoringNotificationHomeState_(ss);
  return model;
}
// S4-R4-E HOME MONITOR READ MODEL END

