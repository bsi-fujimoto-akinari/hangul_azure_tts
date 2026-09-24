var H3_FS_STATE_SHEET_ = 'family_scheduler_state_v1';
var H3_FS_LOG_SHEET_ = 'family_scheduler_decision_log_v1';
var H3_FS_STATE_SCHEMA_ = 'H3_FAMILY_SCHEDULER_STATE_V1';
var H3_FS_OUTPUT_SCHEMA_ = 'H3_FAMILY_SCHEDULER_V1';
var H3_FS_LIVE_RESOLVER_SCHEMA_ = 'H3_FAMILY_SCHEDULER_LIVE_RESOLVER_V1';
var H3_FS_ISSUE_ROUTE_SCHEMA_ = 'H3_FAMILY_SCHEDULER_ISSUE_ROUTE_V1';
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
var H3_FS_AUTHORING_CONTRACT_ID_ =
  'H3-SEMANTIC-AUTHORING-QUEUE-20260924-V1';
var H3_FS_AUTHORING_REQUEST_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_AUTHORING_JOB_REQUEST_V1';
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

function h3FsFindPreparedWritten_(ss) {
  var gs=h3FsKv_(ss,'generation_state_v1');
  var stageId=String(gs.WRITTEN_NEXT_STAGE_ID||'');
  if(!stageId){
    var block=Number(gs.NEXT_BLOCK_NO||0);
    var offset=Number(gs.NEXT_SET_OFFSET||0);
    if(Number.isInteger(block)&&block>0&&Number.isInteger(offset)&&offset>0){
      stageId='STD-B'+String(block).padStart(3,'0')+'-S'+String(offset);
    }
  }
  if(!stageId)return null;

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

  var answers=h3WrittenParseJson_(r[m.ANSWER_KEY_JSON],'FAMILY_SCHEDULER_WRITTEN_ANSWER_KEY_INVALID');
  var meta=h3WrittenParseJson_(r[m.QUESTION_META_JSON],'FAMILY_SCHEDULER_WRITTEN_META_INVALID');
  if(!Array.isArray(answers)||answers.length!==5||!meta||!Array.isArray(meta.questions)||meta.questions.length!==5){
    return null;
  }
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

function h3FsReadiness_(ss) {
  var out={},ls=h3FsKv_(ss,'listening_state_v1');
  if(String(ls.PRODUCTION_GATE||'')!=='NORMAL_LIVE_ACTIVE'||String(ls.ANSWER_SYNC_PHASE||'')!=='IDLE') {
    out.L={state:'BLOCKED',eligible:false,reason:'LISTENING_RUNTIME_GATE'};
  } else {
    var next=Number(ls.NEXT_LISTENING_SET_NO||0),ready=false,count=0;
    var p=h3FsTable_(ss.getSheetByName('listening_set_payload_v1'));
    h3FsRequire_(p,['LISTENING_SET_NO','STATUS','ISSUED_AT'],'listening_set_payload_v1');
    p.rows.forEach(function(r){
      if(Number(r[p.map.LISTENING_SET_NO]||0)!==next)return;
      if(String(r[p.map.STATUS]||'')==='AUDIO_BOUND'&&!String(r[p.map.ISSUED_AT]||'')){
        ready=true;count++;
      }
    });
    if(count>1)throw new Error('FAMILY_SCHEDULER_LISTENING_PREPARED_AMBIGUOUS');
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

  var rt=h3FsTable_(ss.getSheetByName('rt_lane_state_v1'));
  if(!rt.headers.length) {
    out.R={state:'BLOCKED',eligible:false,reason:'RT_LANE_STATE_MISSING'};
    out.T={state:'BLOCKED',eligible:false,reason:'RT_LANE_STATE_MISSING'};
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

function h3FsAuthoringUpsert_(ss,level,evaluation,prep) {
  if(!prep||String(prep.status||'')!=='AUTHORING_REQUIRED'){
    return {status:'NO_JOB',reason:'NOT_AUTHORING_REQUIRED'};
  }

  var family=String(prep.family||evaluation.recommended_family||'');
  if(H3_FS_FAMILIES_.indexOf(family)<0){
    throw new Error('FAMILY_SCHEDULER_AUTHORING_FAMILY_INVALID:'+family);
  }

  var q=h3FsAuthoringQueue_(ss);
  var identity=h3FsAuthoringTargetIdentity_(ss,family,prep);
  var metric=
    evaluation.family_metrics &&
    evaluation.family_metrics[family]
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
  var idempotencyKey='H3AQK-'+h3FsSha_({
    contract_id:H3_FS_AUTHORING_CONTRACT_ID_,
    family:family,
    target_id:identity.target_id,
    target_kind:identity.target_kind,
    snapshot_sha256:snapshot
  });
  var existing=null;
  q.table.rows.forEach(function(r,i){
    if(String(r[q.table.map.IDEMPOTENCY_KEY]||'')!==idempotencyKey)return;
    if(existing){
      throw new Error(
        'FAMILY_SCHEDULER_AUTHORING_DUPLICATE_IDEMPOTENCY_KEY:'+
        idempotencyKey
      );
    }
    existing={
      row_number:i+2,
      job_id:String(r[q.table.map.JOB_ID]||''),
      status:String(r[q.table.map.STATUS]||'')
    };
  });
  if(existing){
    return {
      status:'EXISTING',
      job_id:existing.job_id,
      job_status:existing.status,
      idempotency_key:idempotencyKey,
      snapshot_sha256:snapshot
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
  if(
    String(vr[vm.JOB_ID]||'')!==jobId ||
    String(vr[vm.STATUS]||'')!=='OPEN' ||
    String(vr[vm.SNAPSHOT_SHA256]||'')!==snapshot
  ){
    throw new Error('FAMILY_SCHEDULER_AUTHORING_QUEUE_READBACK_FAIL');
  }

  return {
    status:'OPEN_CREATED',
    job_id:jobId,
    job_status:'OPEN',
    idempotency_key:idempotencyKey,
    snapshot_sha256:snapshot,
    target_id:identity.target_id,
    target_kind:identity.target_kind
  };
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

  candidates.sort(function(a,b){
    var at=Date.parse(a.createdAt),bt=Date.parse(b.createdAt);
    if(!Number.isFinite(at)||!Number.isFinite(bt)){
      throw new Error('FAMILY_SCHEDULER_K1_READY_TIMESTAMP_INVALID');
    }
    if(at!==bt)return bt-at;
    return String(b.id).localeCompare(String(a.id));
  });

  if(
    candidates.length>1 &&
    candidates[0].createdAt===candidates[1].createdAt &&
    candidates[0].id===candidates[1].id
  ){
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
            2,
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

  var prior=h3FsEvaluationAtClock_(
    ss,
    '3級',
    evaluation.global_set_clock
  );
  var decisionId=
    prior
      ? String(
          prior.DECISION_ID||''
        )
      : '';
  var snapshotSha=
    prior
      ? String(
          prior.SNAPSHOT_SHA256||''
        )
      : '';

  var eventId=
    'H3FS-I-'+
    Utilities.getUuid();

  sh.appendRow([
    eventId,
    decisionId,
    'ISSUE_APPLIED',
    new Date().toISOString(),
    '3級',
    'LIMITED_LIVE',
    evaluation.global_set_clock,
    snapshotSha,
    evaluation.next_action,
    evaluation.recommended_family,
    evaluation.primary_reason,
    JSON.stringify(
      evaluation.candidate_order
    ),
    JSON.stringify(
      evaluation.family_metrics
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
  return eventId;
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
    var evaluation=h3FsEvaluate_(ss,'3級');
    var existing=h3FsEvaluationAtClock_(
      ss,
      '3級',
      evaluation.global_set_clock
    );
    if(!existing){
      h3FsAppend_(ss,'3級',evaluation);
    }

    var resolved=h3FsResolveLive_(evaluation);
    var current=h3ReviewCurrentLearning_(ss);
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
            out.prepared_set_id=wPrep.stage_id;
            out.prepare_request=wPrep.authoring_request;
            return out;
          }
          if(wPrep.status!=='READY'){
            throw new Error(
              'FAMILY_SCHEDULER_WRITTEN_PREPARE_STATUS_INVALID'
            );
          }
          out.preparation_status='READY';
          out.prepared_set_id=wPrep.stage_id;
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

      out.scheduler_applied=true;
      out.issue_performed=true;
      out.current_set_id=issued.set_id;
      out.provider_kind=issued.provider_kind;
      out.surface_family=issued.surface_family;
      out.readiness_state='ISSUED';
      out.requires_prepare=false;
      out.client_action='OPEN_ISSUED';
      out.render_request=issued.render_request;
      try {
        out.issue_event_id=h3FsAppendIssueApplied_(
          ss,
          evaluation,
          issued
        );
        out.issue_log_status='RECORDED';
      } catch(_logErr) {
        out.issue_event_id='';
        out.issue_log_status='RECOVERY_REQUIRED';
      }
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
