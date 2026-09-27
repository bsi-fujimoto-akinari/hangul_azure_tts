const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('WebApp.js','utf8');
const adapter=fs.readFileSync('WebAppCloudflareRuntime.js','utf8');
function context(mode,locked){
  const values={H3_RUNTIME_AUTHORITY_MODE:mode,H3_RUNTIME_CUTOVER_LOCKED:locked};
  const props={getProperty:k=>values[k]??null,setProperties:o=>Object.assign(values,o)};
  const calls=[];
  const x=vm.createContext({PropertiesService:{getScriptProperties:()=>props},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Utilities:{getUuid:()=> 'fixed-uuid'},console});
  vm.runInContext(adapter,x);vm.runInContext(app,x);
  x.h3RuntimeRpc_=(op,payload)=>{calls.push(op);return op==='CURRENT_LEARNING'?{current_learning:null}:{status:'RECORDED'};};
  return {x,calls,values};
}
{
  const {x,calls}=context('D1','1');
  assert.equal(x.h3WebRuntimeMode_(),'D1');
  assert.equal(x.h3SubmitListeningWebAnswersCore_({mode:'WRITTEN',set_id:'S'}).status,'RECORDED');
  assert.equal(x.completeReviewSession({schema:'H3_REVIEW_COMPLETE_REQUEST_V2'}).status,'RECORDED');
  assert.deepEqual(calls,['SUBMIT','REVIEW_COMPLETE']);
  assert.throws(()=>x.h3RuntimeRequireLegacyMutation_(),/D1_LEGACY_WRITE_FORBIDDEN/);
}
{
  const {x,calls}=context('QUIESCED','0');
  assert.throws(()=>x.h3SubmitListeningWebAnswersCore_({mode:'WRITTEN'}),/QUIESCED/);
  assert.throws(()=>x.h3RuntimeRequireLegacyMutation_(),/QUIESCED/);
  assert.deepEqual(calls,[]);
}
{
  const {x,calls}=context('LEGACY','0');
  assert.equal(x.h3RuntimeRequireLegacyMutation_(),undefined);
  assert.throws(()=>x.h3SubmitListeningWebAnswersCore_({mode:'HOME'}),/READ_ONLY_MODE_SUBMIT_FORBIDDEN/);
  assert.deepEqual(calls,[]);
}
{
  const {x}=context('LEGACY','1');
  assert.throws(()=>x.h3WebRuntimeMode_(),/CUTOVER_LOCKED/);
}
{
  const {x,values}=context('LEGACY','0');
  assert.throws(()=>x.h3RuntimeSetAuthority_('LEGACY','D1','0','1'),/TRANSITION_FORBIDDEN/);
  assert.equal(x.h3RuntimeSetAuthority_('LEGACY','QUIESCED','0','0').mode,'QUIESCED');
  assert.equal(values.H3_RUNTIME_AUTHORITY_MODE,'QUIESCED');
  assert.throws(()=>x.h3RuntimeSetAuthority_('QUIESCED','D1','0','1'),/D1_PREREQUISITE_INVALID/);
}
{
  const {x}=context('D1','1');
  assert.equal(x.h3RuntimeSetAuthority_('D1','QUIESCED','1','1').mode,'QUIESCED');
  assert.throws(()=>x.h3RuntimeSetAuthority_('QUIESCED','LEGACY','1','0'),/TRANSITION_FORBIDDEN/);
}
for(const [file,fn] of [
 ['WebAppProduction.js','h3ProdSubmit_'],
 ['WebAppWrittenProduction.js','h3WrittenSubmit_'],
 ['WebAppReadingProduction.js','h3ReadingSubmit_'],
 ['WebAppTranslationProduction.js','h3TranslationSubmit_'],
 ['WebAppTranslationV2Production.js','h3TranslationV2Submit_'],
 ['WebAppWrittenAnswerSync.js','h3WrittenAnswerSync_'],
 ['WebAppReviewPersistence.js','h3ReviewCompleteSession_'],
 ['WebAppFamilyScheduler.js','h3FamilySchedulerShadowTick'],
 ['ListeningBackendOrchestrator.js','prepareListeningBackendSet'],
 ['WebAppErrorState.js','h3ErrorStateWrite_']
]){
 const source=fs.readFileSync(file,'utf8');
 const part=source.slice(source.indexOf('function '+fn+'('));
 assert.match(part.slice(0,2500),/h3RuntimeRequireLegacyMutation_\(\)/,file+' lock guard');
}
console.log('R1-D authority adapter fixtures PASS');
