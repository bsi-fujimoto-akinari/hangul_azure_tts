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

function h3FsAppendCommitObserved_(ss,level,prior,commit,family,selectionSource) {
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
    'SHADOW',
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
    false,
    override,
    commit.set_id,
    commit.commit_key,
    'COMMITTED',
    'F4 SHADOW observation; actual family did not originate from scheduler.'
  ]);
  SpreadsheetApp.flush();
  return {
    status:'COMMITTED',
    recommended_family:recommended,
    actual_family:family,
    override_of_recommendation:override
  };
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
    observedResult=h3FsAppendCommitObserved_(
      ss,level,prior,commit,family,selectionSource
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
  var nextResult;
  if(!next){
    var e=h3FsEvaluate_(ss,level);
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

  return {
    schema:'H3_FAMILY_SCHEDULER_F4_OBSERVATION_V1',
    status:'PASS',
    mode:'SHADOW',
    scheduler_applied:false,
    sync_status:sync.status,
    observed_commit:observedResult,
    global_set_clock:commit.global_clock,
    next_evaluation:nextResult
  };
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
      Number(x.GLOBAL_SET_CLOCK)>=H3_FS_F4_START_CLOCK_
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
    evaluation_count:evaluations.length
  };
}

function h3FamilySchedulerShadowPreview() {
  var ss=SpreadsheetApp.openById(H3_WEB_RUNTIME_SPREADSHEET_ID);
  return h3FsEvaluate_(ss,'3級');
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
