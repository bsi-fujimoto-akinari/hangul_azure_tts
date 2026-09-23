var H3_FS_STATE_SHEET_ = 'family_scheduler_state_v1';
var H3_FS_LOG_SHEET_ = 'family_scheduler_decision_log_v1';
var H3_FS_STATE_SCHEMA_ = 'H3_FAMILY_SCHEDULER_STATE_V1';
var H3_FS_OUTPUT_SCHEMA_ = 'H3_FAMILY_SCHEDULER_V1';
var H3_FS_FAMILIES_ = ['L','W','R','T'];
var H3_FS_TARGET_ = {L:0.40,W:0.36,R:0.12,T:0.12};
var H3_FS_SET_SIZE_ = {L:5,W:5,R:2,T:2};
var H3_FS_CAP_ = {L:6,W:6,R:7,T:7};
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
  h3FsRequire_(t,['SET_ID','ANSWERED_AT','TOTAL','STATUS','SURFACE_FAMILY','LEVEL'],'review_home_index_v1');
  var a=[];
  t.rows.forEach(function(r){
    if(String(r[t.map.STATUS]||'')!=='ACTIVE')return;
    if(String(r[t.map.LEVEL]||'')!==level)return;
    var f=h3FsFamily_(r[t.map.SURFACE_FAMILY]);
    if(!f)return;
    var id=String(r[t.map.SET_ID]||''),at=String(r[t.map.ANSWERED_AT]||''),total=Number(r[t.map.TOTAL]||0);
    if(!id||!at||!Number.isInteger(total)||total<1)throw new Error('FAMILY_SCHEDULER_HISTORY_INVALID');
    a.push({family:f,set_id:id,answered_at:at,total:total});
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
  t.rows.forEach(function(r){
    if(String(r[t.map.LEVEL]||'')!==level)return;
    var k=String(r[t.map.STATE_SCOPE]||''),o={};
    H3_FS_STATE_HEADERS_.forEach(function(h){o[h]=r[t.map[h]];});
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

function h3FsReadiness_(ss) {
  var out={},ls=h3FsKv_(ss,'listening_state_v1');
  if(String(ls.PRODUCTION_GATE||'')!=='NORMAL_LIVE_ACTIVE'||String(ls.ANSWER_SYNC_PHASE||'')!=='IDLE') {
    out.L={state:'BLOCKED',eligible:false,reason:'LISTENING_RUNTIME_GATE'};
  } else {
    var next=Number(ls.NEXT_LISTENING_SET_NO||0),ready=false;
    var p=h3FsTable_(ss.getSheetByName('listening_set_payload_v1'));
    p.rows.forEach(function(r){
      if(Number(r[p.map.LISTENING_SET_NO]||0)!==next)return;
      var st=String(r[p.map.STATUS]||''),issued=String(r[p.map.ISSUED_AT]||'');
      if(st==='AUDIO_BOUND'&&!issued)ready=true;
    });
    out.L={state:ready?'READY':'PREPARE_REQUIRED',eligible:true,reason:''};
  }
  var gs=h3FsKv_(ss,'generation_state_v1');
  out.W=String(gs.STATUS||'')==='VERIFIED'
    ? {state:'PREPARE_REQUIRED',eligible:true,reason:''}
    : {state:'BLOCKED',eligible:false,reason:'WRITTEN_RUNTIME_GATE'};
  var rt=h3FsTable_(ss.getSheetByName('rt_lane_state_v1'));
  if(!rt.headers.length) {
    out.R={state:'BLOCKED',eligible:false,reason:'RT_LANE_STATE_MISSING'};
    out.T={state:'BLOCKED',eligible:false,reason:'RT_LANE_STATE_MISSING'};
  } else {
    out.R={state:'PREPARE_REQUIRED',eligible:true,reason:''};
    out.T={state:'PREPARE_REQUIRED',eligible:true,reason:''};
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
    var aog=a._retest_origin_global===null?Infinity:a._retest_origin_global;
    var bog=b._retest_origin_global===null?Infinity:b._retest_origin_global;
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
  if(current.set_id)return {
    schema:H3_FS_OUTPUT_SCHEMA_,mode:'SHADOW',global_set_clock:clock,
    next_action:'RESUME_CURRENT',recommended_family:'NONE',
    primary_reason:'RESUME_CURRENT',candidate_order:[],
    family_metrics:metrics,current_set_id:current.set_id,result_status:'PASS'
  };
  var a=H3_FS_FAMILIES_.map(function(f){return metrics[f];})
    .filter(function(x){return x.eligible;});
  if(!a.length)return {
    schema:H3_FS_OUTPUT_SCHEMA_,mode:'SHADOW',global_set_clock:clock,
    next_action:'BLOCKED',recommended_family:'NONE',primary_reason:'ALL_BLOCKED',
    candidate_order:[],family_metrics:metrics,current_set_id:'',result_status:'BLOCKED'
  };
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

function h3FamilySchedulerShadowPreview() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  return h3FsEvaluate_(ss,'3級');
}

function h3FamilySchedulerShadowTick() {
  var lock=LockService.getScriptLock(); lock.waitLock(30000);
  try{
    var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
    var e=h3FsEvaluate_(ss,'3級'),log=h3FsAppend_(ss,'3級',e);
    e.event_id=log.event_id;
    e.decision_id=log.decision_id;
    e.snapshot_sha256=log.snapshot_sha256;
    e.scheduler_applied=false;
    return e;
  } finally {
    lock.releaseLock();
  }
}
