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
let waitCount=0;
let releaseCount=0;
const lock={
  waitLock(){
    assert.equal(held,false);
    held=true;
    waitCount++;
  },
  releaseLock(){
    assert.equal(held,true);
    held=false;
    releaseCount++;
  }
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
let status=context.h3P4AssetWriterStatus();
assert.equal(status.schema,'H3_P4_ASSET_WRITER_STATUS_V1');
assert.equal(status.mode,'DRIVE_PRIMARY');
assert.equal(status.quiesce_watermark,'');
assert.equal(status.transition_watermark,'');
assert.equal(status.fallback_trigger_count,1);
assert.equal(status.mutation_count,0);

assert.throws(
  ()=>context.h3P4AssetWriterSwitchToR2Primary(),
  /P4_ASSET_WRITER_R2_PRIMARY_PRECONDITION:DRIVE_PRIMARY/
);
assert.equal(context.h3P4AssetWriterMode_(),'DRIVE_PRIMARY');

const q=context.h3P4AssetWriterQuiesce();
assert.equal(q.before,'DRIVE_PRIMARY');
assert.equal(q.after,'QUIESCED');
assert.equal(q.mutation_count,1);
assert.equal(q.idempotent,false);
assert.ok(q.quiesce_watermark);
assert.ok(q.transition_watermark);
assert.throws(()=>context.h3P4AssetWriterRequireDrivePrimary_(),/P4_ASSET_WRITERS_QUIESCED/);

const q2=context.h3P4AssetWriterQuiesce();
assert.equal(q2.after,'QUIESCED');
assert.equal(q2.mutation_count,0);
assert.equal(q2.idempotent,true);
assert.equal(q2.quiesce_watermark,q.quiesce_watermark);
assert.equal(q2.transition_watermark,q.transition_watermark);

const r2=context.h3P4AssetWriterSwitchToR2Primary();
assert.equal(r2.before,'QUIESCED');
assert.equal(r2.after,'R2_PRIMARY');
assert.equal(r2.mutation_count,1);
assert.equal(r2.idempotent,false);
assert.equal(r2.quiesce_watermark,q.quiesce_watermark);
assert.ok(r2.transition_watermark);
status=context.h3P4AssetWriterStatus();
assert.equal(status.mode,'R2_PRIMARY');
assert.equal(status.quiesce_watermark,q.quiesce_watermark);
assert.equal(status.transition_watermark,r2.transition_watermark);
assert.throws(()=>context.h3P4AssetWriterRequireDrivePrimary_(),/P4_ASSET_WRITERS_QUIESCED/);

const r2Again=context.h3P4AssetWriterSwitchToR2Primary();
assert.equal(r2Again.after,'R2_PRIMARY');
assert.equal(r2Again.mutation_count,0);
assert.equal(r2Again.idempotent,true);
assert.equal(r2Again.transition_watermark,r2.transition_watermark);

const resume=context.h3P4AssetWriterResumeDrivePrimary();
assert.equal(resume.before,'R2_PRIMARY');
assert.equal(resume.after,'DRIVE_PRIMARY');
assert.equal(resume.mutation_count,1);
assert.equal(resume.idempotent,false);
assert.ok(resume.transition_watermark);
status=context.h3P4AssetWriterStatus();
assert.equal(status.mode,'DRIVE_PRIMARY');
assert.equal(status.quiesce_watermark,'');
assert.equal(status.transition_watermark,resume.transition_watermark);
assert.equal(context.h3P4AssetWriterRequireDrivePrimary_(),'DRIVE_PRIMARY');

const resumeAgain=context.h3P4AssetWriterResumeDrivePrimary();
assert.equal(resumeAgain.after,'DRIVE_PRIMARY');
assert.equal(resumeAgain.mutation_count,0);
assert.equal(resumeAgain.idempotent,true);
assert.equal(resumeAgain.transition_watermark,resume.transition_watermark);

props.set('H3_P4_ASSET_WRITER_MODE','UNKNOWN_MODE');
assert.throws(()=>context.h3P4AssetWriterMode_(),/P4_ASSET_WRITER_MODE_INVALID:UNKNOWN_MODE/);
assert.throws(()=>context.h3P4AssetWriterStatus(),/P4_ASSET_WRITER_MODE_INVALID:UNKNOWN_MODE/);
props.delete('H3_P4_ASSET_WRITER_MODE');
assert.equal(context.h3P4AssetWriterMode_(),'DRIVE_PRIMARY');

assert.equal(waitCount,7);
assert.equal(releaseCount,7);
assert.equal(held,false);

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
const reviewR2=body(
  review,
  'h3ReviewAudioGeneratePlannedR2Asset_',
  'h3ReviewAudioGeneratePlannedAsset_'
);
const reviewDispatch=body(
  review,
  'h3ReviewAudioGeneratePlannedAsset_',
  'h3ReviewAudioGeneratePlannedDriveAsset_'
);
const reviewDrive=body(
  review,
  'h3ReviewAudioGeneratePlannedDriveAsset_',
  'h3ReviewAudioValidateStaleCanonical_'
);
assert.match(reviewDispatch,/h3ReviewAudioWriterMode_\(\)/);
assert.match(
  reviewDispatch,
  /H3_P4_ASSET_WRITER_DRIVE_PRIMARY_/
);
assert.match(
  reviewDispatch,
  /h3ReviewAudioGeneratePlannedR2Asset_\(/
);
assert.match(
  reviewDrive,
  /h3P4AssetWriterRequireDrivePrimary_\(\)/
);
assert.match(reviewDrive,/DriveApp\.getFolderById/);
assert.match(reviewDrive,/folder\.createFile/);
assert.match(reviewR2,/synthesize_\(/);
assert.match(reviewR2,/h3RuntimeAssetWriteR2_\(/);
assert.match(reviewR2,/asset_class:'REVIEW_AUDIO'/);
assert.match(
  reviewR2,
  /pre_cutover_or_previous_drive_binding_snapshot:null/
);
assert.match(
  reviewR2,
  /h3ReviewAudioWriteR2AssetRow_\(/
);
assert.doesNotMatch(reviewR2,/DriveApp\./);
assert.doesNotMatch(reviewR2,/\.createFile\(/);
assert.ok(
  reviewR2.indexOf('h3RuntimeAssetWriteR2_(') <
  reviewR2.indexOf('h3ReviewAudioWriteR2AssetRow_(')
);
const reviewReadback=body(
  review,
  'h3ReviewAudioAssertSetReady_',
  'h3ReviewAudioEnsureForLockedReview_'
);
assert.match(reviewReadback,/DONE_R2/);
assert.match(reviewReadback,/!get\('AUDIO_FILE_ID'\)/);
assert.match(reviewReadback,/!get\('AUDIO_URL'\)/);
assert.match(reviewReadback,/!get\('DRIVE_FOLDER_ID'\)/);

const r2Write=body(
  review,
  'h3ReviewAudioWriteR2AssetRow_',
  'h3ReviewAudioAssertR2AssetRow_'
);
const r2Assert=body(
  review,
  'h3ReviewAudioAssertR2AssetRow_',
  'h3ReviewAudioGeneratePlannedR2Asset_'
);
const r2ctx=vm.createContext({
  Date,JSON,String,Array,Error,
  H3_REVIEW_AUDIO_HEADERS_:Array(17).fill(''),
  H3_REVIEW_AUDIO_SCHEMA_:'H3_REVIEW_AUDIO_ASSET_V1',
  H3_REVIEW_AUDIO_GENERATOR_VERSION_:'review-audio-v2-1200ms',
  SpreadsheetApp:{flush(){}}
});
vm.runInContext(r2Write+r2Assert+reviewR2,r2ctx);
const headers=[
  'SCHEMA','SURFACE_FAMILY','SET_ID','SLOT_KEY','SOURCE_REF_JSON',
  'SELECTION_JSON','AUDIO_TEXT','AUDIO_TEXT_SHA256',
  'VOICE_ASSIGNMENT_JSON','AUDIO_FILE_ID','AUDIO_URL','DRIVE_FOLDER_ID',
  'STATUS','CREATED_AT','UPDATED_AT','ERROR','GENERATOR_VERSION'
];
const map=Object.fromEntries(headers.map((x,i)=>[x,i]));
let persisted=null;
const events=[];
const fakeSheet={
  getLastRow:()=>1,
  getRange:()=>({
    setValues(values){
      events.push('row_write');
      persisted=values[0];
    }
  })
};
r2ctx.h3ReviewAudioAssetSheet_=()=>fakeSheet;
r2ctx.h3ReviewAudioFindAssetRow_=()=>persisted?{
  rowNumber:2,row:persisted,map
}:null;
r2ctx.h3ReviewAudioSsml_=()=>'<speak>review</speak>';
r2ctx.config_=()=>({});
r2ctx.synthesize_=()=>{
  events.push('synthesize');
  return{getBytes:()=>Array(128).fill(1)};
};
r2ctx.h3RuntimeAssetWriteR2_=request=>{
  events.push('receipt');
  assert.equal(request.asset_class,'REVIEW_AUDIO');
  assert.deepEqual(
    JSON.parse(JSON.stringify(request.logical_binding_identity)),
    {surface_family:'5W',set_id:'W-R2',slot_key:'D2'}
  );
  assert.equal(
    request.pre_cutover_or_previous_drive_binding_snapshot,
    null
  );
  return{
    schema:'H3_R2_PRIMARY_ASSET_WRITE_RECEIPT_V1',
    receipt_id:'a'.repeat(64),
    storage_authority:'CLOUDFLARE_R2_PRIVATE',
    source_byte_sha256:'b'.repeat(64),
    size_bytes:128
  };
};
const r2Plan={
  surface_family:'5W',
  set_id:'W-R2',
  slot_key:'D2',
  source_ref:{x:'source'},
  selection:{x:'selection'},
  audio_text:'테스트',
  audio_text_sha256:'c'.repeat(64),
  voice_assignment:{primary:{label:'Hyunsu'}},
  drive_folder_id:'DRIVE-FOLDER'
};
const r2Result=r2ctx.h3ReviewAudioGeneratePlannedR2Asset_(
  {},r2Plan
);
assert.deepEqual(events,['synthesize','receipt','row_write']);
assert.equal(r2Result.status,'DONE_R2');
assert.equal(persisted[9],'');
assert.equal(persisted[10],'');
assert.equal(persisted[11],'');
assert.equal(persisted[12],'DONE_R2');

const generateSet=body(review,'h3ReviewAudioGenerateSet_','runReviewAudioPilotFamily1');
assert.match(generateSet,/LockService\.getScriptLock\(\)/);
assert.match(generateSet,/h3ReviewAudioWriterMode_\(\)/);

const quiesceBody=body(source,'h3P4AssetWriterQuiesce','h3P4AssetWriterSwitchToR2Primary');
const r2Body=body(source,'h3P4AssetWriterSwitchToR2Primary','h3P4AssetWriterResumeDrivePrimary');
const resumeBody=body(source,'h3P4AssetWriterResumeDrivePrimary','h3P4AssetSheetRows_');
for(const transitionBody of [quiesceBody,r2Body,resumeBody]){
  const lockIndex=transitionBody.indexOf('LockService.getScriptLock()');
  const waitIndex=transitionBody.indexOf('lock.waitLock(30000)');
  const modeReadIndex=transitionBody.indexOf('h3P4AssetWriterMode_()');
  assert.ok(lockIndex>=0);
  assert.ok(waitIndex>lockIndex);
  assert.ok(modeReadIndex>waitIndex);
  assert.match(transitionBody,/finally\s*\{\s*lock\.releaseLock\(\)/);
}
assert.match(r2Body,/before!==H3_P4_ASSET_WRITER_QUIESCED_/);
assert.doesNotMatch(r2Body,/before===H3_P4_ASSET_WRITER_DRIVE_PRIMARY_/);
assert.match(resumeBody,/before!==H3_P4_ASSET_WRITER_R2_PRIMARY_/);

console.log(JSON.stringify({status:'PASS',tests:57}));
