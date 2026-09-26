const fs = require('fs');
const vm = require('vm');

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

const server = fs.readFileSync('WebAppFamilyScheduler.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('appsscript.json', 'utf8'));
const ops = fs.readFileSync('OPERATIONS.md', 'utf8');

for (const token of [
  'H3_MONITOR_PRODUCTION_TRIGGER_V1',
  'H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_HOURS_ = 1',
  'H3_MONITOR_PRODUCTION_TRIGGER_NEAR_MINUTE_ = 0',
  "'Asia/Tokyo'",
  'function h3MonitoringProductionTriggerRealignToHour()',
  '.nearMinute(H3_MONITOR_PRODUCTION_TRIGGER_NEAR_MINUTE_)',
  '.everyHours(H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_HOURS_)',
  '.inTimezone(H3_MONITOR_PRODUCTION_TRIGGER_TIMEZONE_)',
]) {
  assert(server.includes(token), 'missing trigger token: ' + token);
}
for (const scope of [
  'https://www.googleapis.com/auth/script.scriptapp',
]) {
  assert((manifest.oauthScopes || []).includes(scope), 'missing scope: ' + scope);
}
for (const token of [
  'h3MonitoringProductionTriggerRealignToHour()',
  'nearMinute(0)',
  'Asia/Tokyo',
]) {
  assert(ops.includes(token), 'OPERATIONS trigger contract missing: ' + token);
}

const props = new Map([['H3_MONITOR_EMAIL_TO', 'owner@example.com']]);
let failSetPropertyKey = '';
global.PropertiesService = {
  getScriptProperties:()=>({
    getProperty:key => props.has(key) ? props.get(key) : null,
    setProperty:(key,value)=>{
      if(String(key)===failSetPropertyKey){
        failSetPropertyKey='';
        throw new Error('fixture setProperty failure:'+String(key));
      }
      props.set(String(key),String(value));
    },
    deleteProperty:key=>props.delete(String(key))
  })
};

let triggers=[];
let nextId=1;
const makeTrigger=(handler,id,schedule)=>({
  _schedule:schedule||{},
  getHandlerFunction:()=>handler,
  getUniqueId:()=>id,
  getEventType:()=>ScriptApp.EventType.CLOCK,
  getTriggerSource:()=>ScriptApp.TriggerSource.CLOCK
});
function builder(handler){
  const schedule={};
  const api={
    nearMinute:minute=>{schedule.nearMinute=minute;return api;},
    everyHours:hours=>{schedule.everyHours=hours;return api;},
    inTimezone:timezone=>{schedule.timezone=timezone;return api;},
    create:()=>{
      assert(schedule.nearMinute===0,'nearMinute drift');
      assert(schedule.everyHours===1,'cadence drift');
      assert(schedule.timezone==='Asia/Tokyo','timezone drift');
      const t=makeTrigger(handler,'TRIG-'+String(nextId++),{...schedule});
      triggers.push(t);
      return t;
    }
  };
  return api;
}
global.ScriptApp={
  AuthMode:{FULL:'FULL'},
  EventType:{CLOCK:'CLOCK'},
  TriggerSource:{CLOCK:'CLOCK'},
  requireScopes:()=>{},
  getProjectTriggers:()=>triggers.slice(),
  newTrigger:handler=>({timeBased:()=>builder(handler)}),
  deleteTrigger:trigger=>{triggers=triggers.filter(x=>x!==trigger);}
};
global.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
global.MailApp={sendEmail:()=>{throw new Error('must not send mail');}};

vm.runInThisContext(server);
h3MonitoringObserverPreview=()=>({
  schema:'H3_MONITOR_OBSERVER_SNAPSHOT_V1',
  status:'HEALTHY',
  health:{error_count:0,action_required_count:0},
  write_performed:false
});

let ensured=h3MonitoringProductionTriggerEnsure();
assert(ensured.status==='READY' && ensured.created===true,'ensure failed');
let status=h3MonitoringProductionTriggerStatus();
assert(status.configured_near_minute===0,'near minute mismatch');
assert(status.configured_timezone==='Asia/Tokyo','timezone mismatch');
h3MonitoringProductionTriggerRemove();

const legacy=makeTrigger(H3_MONITOR_PRODUCTION_TRIGGER_HANDLER_,'LEGACY-1',{everyHours:1});
triggers.push(legacy);
props.set(H3_MONITOR_PRODUCTION_TRIGGER_ID_KEY_,'LEGACY-1');
props.set(H3_MONITOR_PRODUCTION_TRIGGER_CADENCE_KEY_,'1');
props.set(H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_KEY_,H3_MONITOR_PRODUCTION_TRIGGER_CONTRACT_);
props.delete(H3_MONITOR_PRODUCTION_TRIGGER_NEAR_MINUTE_KEY_);
props.delete(H3_MONITOR_PRODUCTION_TRIGGER_TIMEZONE_KEY_);

assert(h3MonitoringProductionTriggerLegacyReady_().ready===true,'legacy identity not recognized');
const migrated=h3MonitoringProductionTriggerRealignToHour();
assert(migrated.status==='READY' && migrated.migrated===true,'migration failed');
assert(triggers.length===1,'migration trigger count mismatch');
status=h3MonitoringProductionTriggerStatus();
assert(status.status==='READY','migrated trigger not READY');
assert(status.configured_near_minute===0,'migrated near minute mismatch');
assert(status.configured_timezone==='Asia/Tokyo','migrated timezone mismatch');

console.log('production trigger lifecycle PASS; nearMinute=0; timezone=Asia/Tokyo');