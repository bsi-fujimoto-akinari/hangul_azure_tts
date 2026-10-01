const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('P4AssetWriterControl.js','utf8');
const code=fs.readFileSync('Code.js','utf8');
const review=fs.readFileSync('ReviewAudioBackfill.js','utf8');

const props=new Map();
const properties={
  getProperty:key=>props.has(key)?props.get(key):null,
  setProperty:(key,value)=>props.set(String(key),String(value)),
  setProperties:obj=>Object.entries(obj).forEach(([k,v])=>props.set(String(k),String(v))),
  deleteProperty:key=>props.delete(String(key))
};
let held=false;
const lock={
  waitLock(){assert.equal(held,false);held=true;},
  releaseLock(){assert.equal(held,true);held=false;}
};
const binding={
  individual:Object.fromEntries(['K1','K2','K3','K4','K5'].map((slot,i)=>[slot,{
    listen_gen_id:'GEN-'+slot,payload_hash:String(i+1).padStart(64,'a'),
    audio_file_id:'FILE-'+slot,audio_url:'https://drive.example/'+slot
  }])),
  combined:{
    parent_set_id:'L1',payload_hash:'b'.repeat(64),
    audio_file_id:'FILE-C',audio_url:'https://drive.example/C'
  }
};
const sheets={
  review_home_index_v1:[
    ['SET_ID','STATUS','SURFACE_FAMILY'],
    ['W1','ACTIVE','5W'],['L1','ACTIVE','5L'],['R1','ACTIVE','READING'],['T1','ACTIVE','TRANSLATION']
  ],
  review_audio_asset_v1:[
    ['SURFACE_FAMILY','SET_ID','SLOT_KEY','AUDIO_TEXT_SHA256','AUDIO_FILE_ID','AUDIO_URL','STATUS'],
    ['5W','W1','D2','1'.repeat(64),'RF1','https://drive.example/RF1','DONE'],
    ['2R','R1','Q1','2'.repeat(64),'RF2','https://drive.example/RF2','DONE'],
    ['2T','T1','P11','3'.repeat(64),'RF3','https://drive.example/RF3','DONE'],
    ['5W','OLD','D2','4'.repeat(64),'OLD','https://drive.example/OLD','DONE']
  ],
  listening_set_payload_v1:[
    ['LISTENING_SET_ID','STATUS','K1_READY_ID','AUDIO_BINDING_JSON'],
    ['L1','ISSUED','K1R1',JSON.stringify(binding)],
    ['L2','LOCKED','K1R2','']
  ],
  listening_k1_ready_v1:[
    ['K1_READY_ID','STATUS','IMAGE_FILE_ID','IMAGE_URL','IMAGE_SHA256','BOUND_LISTENING_SET_ID'],
    ['K1R1','CONSUMED','IMG1','https://drive.example/IMG1','5'.repeat(64),'L1'],
    ['K1R2','READY','IMG2','https://drive.example/IMG2','6'.repeat(64),'L2']
  ]
};
const ss={
  getSheetByName(name){
    const values=sheets[name];
    return values?{getDataRange:()=>({getDisplayValues:()=>values})}:null;
  }
};
const context=vm.createContext({
  PropertiesService:{getScriptProperties:()=>properties},
  LockService:{getScriptLock:()=>lock},
  ScriptApp:{getProjectTriggers:()=>[{getHandlerFunction:()=> 'processLatestPendingAudioJob'}]},
  SpreadsheetApp:{openById:id=>{assert.equal(id,'SHEET');return ss;}},
  Date,JSON,String,Object,Array,Error,Set
});
vm.runInContext(source,context);

assert.equal(context.h3P4AssetWriterMode_(),'DRIVE_PRIMARY');
assert.equal(context.h3P4AssetWriterStatus().fallback_trigger_count,1);
const q=context.h3P4AssetWriterQuiesce();
assert.equal(q.after,'QUIESCED');
assert.equal(q.mutation_count,1);
assert.throws(()=>context.h3P4AssetWriterRequireDrivePrimary_(),/P4_ASSET_WRITERS_QUIESCED/);
assert.equal(context.h3P4AssetWriterQuiesce().idempotent,true);
const resume=context.h3P4AssetWriterResumeDrivePrimary();
assert.equal(resume.after,'DRIVE_PRIMARY');
assert.equal(context.h3P4AssetWriterRequireDrivePrimary_(),'DRIVE_PRIMARY');

props.set('REVIEW_AUDIO_SHEET_ID','SHEET');
props.set('K1_READY_SHEET_ID','SHEET');
const snap=context.h3P4AssetBindingSnapshot();
assert.equal(snap.schema,'H3_P4_ASSET_BINDING_SNAPSHOT_V1');
assert.equal(snap.active_home_total,4);
assert.equal(snap.issued_listening_set_count,1);
assert.equal(snap.active_binding_count,10);
assert.deepEqual(JSON.parse(JSON.stringify(snap.binding_class_counts)),{
  LISTENING_AUDIO_COMBINED:1,
  LISTENING_AUDIO_INDIVIDUAL:5,
  LISTENING_K1_IMAGE:1,
  REVIEW_AUDIO:3
});
assert.equal(snap.unmapped_active_binding_count,0);
assert.equal(snap.mutation_count,0);

function body(text,name,next){
  const start=text.indexOf('function '+name);
  assert.notEqual(start,-1,name+' missing');
  const end=next?text.indexOf('function '+next,start+1):text.length;
  return text.slice(start,end<0?text.length:end);
}
assert.match(body(code,'processPendingAudioForSet','processLatestPendingAudioJob'),/h3P4AssetWriterRequireDrivePrimary_\(\)/);
assert.match(body(code,'processLatestPendingAudioJob','idle_'),/h3P4AssetWriterRequireDrivePrimary_\(\)/);
assert.match(body(review,'h3ReviewAudioGeneratePlannedAsset_','h3ReviewAudioValidateStaleCanonical_'),/h3P4AssetWriterRequireDrivePrimary_\(\)/);
const generateSet=body(review,'h3ReviewAudioGenerateSet_','runReviewAudioPilotFamily1');
assert.match(generateSet,/LockService\.getScriptLock\(\)/);
assert.match(generateSet,/h3P4AssetWriterRequireDrivePrimary_\(\)/);

console.log(JSON.stringify({status:'PASS',tests:16}));
