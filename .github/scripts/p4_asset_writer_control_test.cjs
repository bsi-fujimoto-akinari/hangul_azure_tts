const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('P4AssetWriterControl.js','utf8');
const code=fs.readFileSync('Code.js','utf8');
const review=fs.readFileSync('ReviewAudioBackfill.js','utf8');
const cloud=fs.readFileSync('WebAppCloudflareRuntime.js','utf8');
const orchestrator=fs.readFileSync('ListeningBackendOrchestrator.js','utf8');
const preissue=fs.readFileSync('WebAppPreissue.js','utf8');
const productionRender=fs.readFileSync('WebAppProductionRender.js','utf8');
const reviewCore=fs.readFileSync('WebAppReviewCore.js','utf8');
const reviewPersistence=fs.readFileSync('WebAppReviewPersistence.js','utf8');
const surfaceReview=fs.readFileSync('WebAppSurfaceReviewBridge.js','utf8');

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

const requiesce=context.h3P4AssetWriterRequiesceFromR2Primary();
assert.equal(requiesce.before,'R2_PRIMARY');
assert.equal(requiesce.after,'QUIESCED');
assert.equal(requiesce.mutation_count,1);
assert.equal(requiesce.idempotent,false);
assert.ok(requiesce.quiesce_watermark);
assert.equal(requiesce.transition_watermark,requiesce.quiesce_watermark);
status=context.h3P4AssetWriterStatus();
assert.equal(status.mode,'QUIESCED');
assert.equal(status.quiesce_watermark,requiesce.quiesce_watermark);

const requiesceAgain=context.h3P4AssetWriterRequiesceFromR2Primary();
assert.equal(requiesceAgain.after,'QUIESCED');
assert.equal(requiesceAgain.mutation_count,0);
assert.equal(requiesceAgain.idempotent,true);

const r2AfterRequiesce=context.h3P4AssetWriterSwitchToR2Primary();
assert.equal(r2AfterRequiesce.before,'QUIESCED');
assert.equal(r2AfterRequiesce.after,'R2_PRIMARY');
assert.equal(r2AfterRequiesce.mutation_count,1);

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

assert.equal(waitCount,10);
assert.equal(releaseCount,10);
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
const diagnosticCode=body(
  review,
  'h3P4AcceptanceOneShotDiagnosticCode_',
  'h3P4AcceptanceOneShotDiagnosticStage_'
);
const diagnosticStage=body(
  review,
  'h3P4AcceptanceOneShotDiagnosticStage_',
  'h3P4AcceptanceProspectiveReviewAudioOneShotDiagnostic'
);
const diagnosticWrapper=body(
  review,
  'h3P4AcceptanceProspectiveReviewAudioOneShotDiagnostic',
  'h3P4AcceptanceProspectiveReviewAudioOneShot'
);
const diagnosticContext=vm.createContext({
  String,Array,Error,RegExp
});
vm.runInContext(diagnosticCode+diagnosticStage,diagnosticContext);
assert.equal(
  diagnosticContext.h3P4AcceptanceOneShotDiagnosticCode_(
    new Error('R2_PRIMARY_WRITER_ENV_INVALID')
  ),
  'R2_PRIMARY_WRITER_ENV_INVALID'
);
assert.equal(
  diagnosticContext.h3P4AcceptanceOneShotDiagnosticCode_(
    new Error('Exception: secret material')
  ),
  'P4_ACCEPTANCE_ONE_SHOT_UNCLASSIFIED'
);
assert.equal(
  diagnosticContext.h3P4AcceptanceOneShotDiagnosticStage_(
    'R2_PRIMARY_LOGICAL_BINDING_CONFLICT'
  ),
  'R2_RECEIPT_WRITE'
);
assert.equal(
  diagnosticContext.h3P4AcceptanceOneShotDiagnosticStage_(
    'P4_ACCEPTANCE_ONE_SHOT_DRIVE_HASH_MISMATCH'
  ),
  'DRIVE_PREFLIGHT'
);
assert.match(
  diagnosticWrapper,
  /H3_MIG_ASSET_PROSPECTIVE_ONE_SHOT_DIAGNOSTIC_V1/
);
assert.match(
  diagnosticWrapper,
  /h3P4AssetWriterRequiesceFromR2Primary\(\)/
);
assert.match(
  diagnosticWrapper,
  /after\.fallback_trigger_count!==1/
);
assert.doesNotMatch(diagnosticWrapper,/error\.message/);
assert.doesNotMatch(diagnosticWrapper,/diagnostic_message/);

const oneShot=body(
  review,
  'h3P4AcceptanceProspectiveReviewAudioOneShot',
  'h3ReviewAudioGeneratePlannedR2Asset_'
);
assert.match(oneShot,/H3-20260921-R001/);
assert.match(oneShot,/PASSAGE_COMPLETE/);
assert.match(oneShot,/1T2NtwcwPpp0kIymvow-EZbPEkWc-5nzH/);
assert.match(
  oneShot,
  /ce0a44fa94997affd15017c62ac9353702d115e9481037cff79e8ca9f3f83826/
);
assert.match(oneShot,/expectedFallbackTriggerCount=1/);
assert.match(
  oneShot,
  /before\.fallback_trigger_count!==expectedFallbackTriggerCount/
);
assert.match(
  oneShot,
  /after\.fallback_trigger_count!==expectedFallbackTriggerCount/
);
assert.match(
  oneShot,
  /after\.fallback_trigger_count!==before\.fallback_trigger_count/
);
assert.match(oneShot,/h3ReviewAudioAssertR2AssetRow_\(/);
assert.match(oneShot,/h3RuntimePrivateMediaRequest_\(/);
assert.match(oneShot,/DriveApp\.getFileById/);
assert.equal(
  (oneShot.match(/h3RuntimeAssetWriteR2_\(request\)/g)||[]).length,
  2
);
assert.match(oneShot,/first\.written_at!==writtenAt/);
assert.match(oneShot,/h3P4AssetWriterSwitchToR2Primary\(\)/);
assert.match(oneShot,/h3P4AssetWriterRequiesceFromR2Primary\(\)/);
assert.match(oneShot,/idempotent_receipt_match:true/);
assert.match(oneShot,/receipt_created:true/);
assert.match(oneShot,/r2_object_mutation:false/);
assert.doesNotMatch(oneShot,/h3ReviewAudioWriteR2AssetRow_\(/);

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
  /pre_cutover_or_previous_drive_binding_snapshot:\s*\{/
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
  H3_REVIEW_AUDIO_ASSET_SHEET_:'review_audio_asset_v1',
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
r2ctx.h3ReviewAudioFilename_=plan=>
  plan.set_id+'__'+plan.slot_key+'__'+
  plan.audio_text_sha256.slice(0,12)+'__rv2_1200ms.mp3';
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
    request.pre_cutover_or_previous_drive_binding_snapshot.schema,
    'H3_P4_DRIVE_ROLLBACK_TARGET_V1'
  );
  assert.equal(
    request.pre_cutover_or_previous_drive_binding_snapshot.target_mode,
    'CREATE_OR_REUSE_EXACT_FILE'
  );
  assert.equal(
    request.pre_cutover_or_previous_drive_binding_snapshot.drive_folder_id,
    'DRIVE-FOLDER'
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

const pendingAudio=body(
  code,
  'processPendingAudioForSet',
  'processLatestPendingAudioJob'
);
const latestAudio=body(
  code,
  'processLatestPendingAudioJob',
  'idle_'
);
const listeningQueue=body(
  code,
  'processListeningAudioQueue_',
  'processListeningAudioSet_'
);
const listeningSet=body(
  code,
  'processListeningAudioSet_',
  'snapshotListeningSet_'
);
const listeningDispatch=body(
  code,
  'runListeningSetBatch_',
  'runListeningSetBatchDrive_'
);
const listeningDrive=body(
  code,
  'runListeningSetBatchDrive_'
);
const listeningR2=body(
  code,
  'runListeningSetBatchR2_',
  'runListeningSetBatch_'
);
const r2MemberAssert=body(
  code,
  'h3ListeningAssertDoneR2Member_',
  'listeningR2BatchState_'
);

assert.match(
  pendingAudio,
  /h3ListeningAudioWriterMode_\(\)/
);
assert.match(
  pendingAudio,
  /normalizedMode === '5W'/
);
assert.match(
  pendingAudio,
  /h3P4AssetWriterRequireDrivePrimary_\(\)/
);
assert.match(
  latestAudio,
  /H3_P4_ASSET_WRITER_R2_PRIMARY_/
);
assert.match(
  latestAudio,
  /processListeningAudioQueue_/
);
assert.match(
  latestAudio,
  /h3P4AssetWriterRequireDrivePrimary_\(\)/
);
assert.match(
  listeningQueue,
  /LISTENING_R2_SYSTEM_TEST_SINGLETON_FORBIDDEN/
);
assert.match(
  listeningSet,
  /h3ListeningAudioWriterMode_\(\)/
);
assert.match(
  listeningDispatch,
  /H3_P4_ASSET_WRITER_DRIVE_PRIMARY_/
);
assert.match(
  listeningDispatch,
  /runListeningSetBatchDrive_\(/
);
assert.match(
  listeningDispatch,
  /runListeningSetBatchR2_\(/
);
assert.match(listeningDrive,/DriveApp\.getFolderById/);
assert.match(listeningDrive,/\.createFile\(/);
assert.match(
  listeningR2,
  /asset_class:\s*'LISTENING_AUDIO_INDIVIDUAL'/
);
assert.match(
  listeningR2,
  /h3RuntimeAssetWriteR2_\(/
);
assert.match(
  listeningR2,
  /HQ_LISTENING_STORAGE_MODE_R2/
);
assert.doesNotMatch(listeningR2,/DriveApp\./);
assert.doesNotMatch(listeningR2,/\.createFile\(/);
assert.doesNotMatch(
  listeningR2,
  /LISTENING_AUDIO_COMBINED/
);
assert.match(
  r2MemberAssert,
  /values\[10\]/
);
assert.match(
  r2MemberAssert,
  /values\[11\]/
);
assert.match(
  r2MemberAssert,
  /HQ_LISTENING_STORAGE_MODE_R2/
);

// Dynamic R2 batch fixture: all five receipts must precede final row publication.
const r2ctx2=vm.createContext({
  Date,JSON,String,Array,Object,Error,Set,
  HQ_LISTENING_SET_SIZE:5,
  HQ_AUDIO_LISTENING_FOLDER_ID:'1xeDF4AYNhykK1YPTh5rckyTmsGHvihaF',
  HQ_LISTENING_TAB:'listening_audio_queue_v1',
  HQ_LISTENING_STORAGE_MODE:'listening_audio_v1',
  HQ_LISTENING_STORAGE_MODE_R2:'listening_audio_r2_v1',
  HQ_LISTENING_AUDIO_SOURCE_ATTESTATION_SCHEMA:
    'H3_LISTENING_AUDIO_SOURCE_ATTESTATION_V1',
  SpreadsheetApp:{flush(){}},
  UrlFetchApp:{
    fetchAll:reqs=>reqs.map((_,i)=>({index:i}))
  }
});
vm.runInContext(listeningR2,r2ctx2);

const eventLog=[];
const rows={};
const members2=['K1','K2','K3','K4','K5'].map((section,i)=>{
  const values=Array(15).fill('');
  values[0]='H3-L-20261002-'+String(i+1).padStart(3,'0');
  values[1]='pending';
  values[3]='H3-20261002-L01';
  values[5]=section;
  values[14]='listening_audio_v1';
  const member={row:i+2,values,note:''};
  rows[member.row]=member;
  return member;
});
const sheet2={
  getRange(row,col,_rc,_cc){
    return{
      setValue(value){
        eventLog.push('set:'+row+':'+col+':'+value);
        rows[row].values[col-1]=value;
      },
      clearContent(){
        eventLog.push('clear:'+row+':'+col);
        rows[row].values[col-1]='';
      },
      setValues(values){
        const data=values[0];
        eventLog.push(
          'setValues:'+row+':'+col+':'+data.length
        );
        data.forEach((v,i)=>{
          rows[row].values[col-1+i]=v;
        });
      }
    };
  }
};
r2ctx2.readListeningSnapshotJob_=member=>({
  id:member.values[0],
  status:member.values[1],
  parentSetId:member.values[3],
  section:member.values[5],
  storageMode:member.values[14],
  hash:'h'.repeat(64),
  plan:[]
});
r2ctx2.listeningR2BatchState_=(_member,job)=>({
  id:job.id,
  hash:job.hash,
  voice:'Hyunsu',
  audioVersion:'v',
  stage:'r2_prepared',
  attempts:0,
  storageAuthority:'CLOUDFLARE_R2_PRIVATE'
});
r2ctx2.listeningAudioSpec_=job=>({
  ssml:'<speak>'+job.section+'</speak>',
  assignment:'VOICE=Hyunsu'
});
r2ctx2.assertListeningBatchCurrent_=()=>{};
r2ctx2.listeningBatchCheckpoint_=()=>{};
r2ctx2.azureTtsFetchAllRequest_=ssml=>({ssml});
r2ctx2.azureTtsBlobFromResponse_=()=>({
  getBytes:()=>Array(128).fill(1)
});
r2ctx2.h3RuntimeAssetWriteR2_=request=>{
  eventLog.push(
    'receipt:'+request.logical_binding_identity.slot_key
  );
  assert.equal(
    request.asset_class,
    'LISTENING_AUDIO_INDIVIDUAL'
  );
  assert.equal(
    request.logical_binding_identity.set_id,
    'H3-20261002-L01'
  );
  assert.equal(
    request.pre_cutover_or_previous_drive_binding_snapshot.schema,
    'H3_P4_DRIVE_ROLLBACK_TARGET_V1'
  );
  assert.equal(
    request.pre_cutover_or_previous_drive_binding_snapshot.drive_folder_id,
    '1xeDF4AYNhykK1YPTh5rckyTmsGHvihaF'
  );
  assert.equal(
    request.pre_cutover_or_previous_drive_binding_snapshot.drive_file_name,
    request.logical_binding_identity.listen_gen_id+'.mp3'
  );
  return{
    schema:'H3_R2_PRIMARY_ASSET_WRITE_RECEIPT_V1',
    receipt_id:'a'.repeat(64),
    storage_authority:'CLOUDFLARE_R2_PRIVATE',
    status:'COMMITTED'
  };
};
r2ctx2.h3ListeningAssertDoneR2Member_=member=>{
  assert.equal(member.values[1],'done');
  assert.equal(member.values[10],'');
  assert.equal(member.values[11],'');
  assert.equal(
    member.values[14],
    'listening_audio_r2_v1'
  );
};
r2ctx2.publishListeningBatchError_=(_s,_i,stage,e)=>{
  throw new Error(stage+':'+e.message);
};

const batchResult=
  r2ctx2.runListeningSetBatchR2_(
    sheet2,
    'H3-20261002-L01',
    members2,
    {},
    {sha256:'f'.repeat(64)}
  );
assert.equal(batchResult.status,'done');
assert.equal(
  eventLog.filter(x=>x.startsWith('receipt:')).length,
  5
);
const lastReceipt=Math.max(
  ...eventLog.map((x,i)=>x.startsWith('receipt:')?i:-1)
);
const firstFinal=eventLog.findIndex(
  x=>x.endsWith(':9:7')
);
assert.ok(lastReceipt>=0);
assert.ok(firstFinal>lastReceipt);
assert.equal(
  eventLog.some(x=>x.includes('COMBINED')),
  false
);

const bindingAuthority=body(
  cloud,
  'h3RuntimeAudioBindingAuthority_',
  'h3RuntimeAudioMedia_'
);
const mediaRequest=body(
  cloud,
  'h3RuntimePrivateMediaRequest_',
  'h3RuntimePrivateMediaProbe_'
);
assert.match(
  cloud,
  /H3_RUNTIME_PRIVATE_MEDIA_PATH_[\s\S]*\/__internal\/h3\/media\/v1/
);
assert.match(
  mediaRequest,
  /H3_RUNTIME_PRIVATE_MEDIA_PATH_/
);
assert.match(mediaRequest,/bytes=0-0|Content-Range/);
assert.match(mediaRequest,/h3RuntimeR2CanonicalRecord_/);
assert.match(mediaRequest,/UrlFetchApp\.fetch/);

const authorityContext=vm.createContext({
  String,Array,Error
});
vm.runInContext(bindingAuthority,authorityContext);
assert.equal(
  authorityContext.h3RuntimeAudioBindingAuthority_({
    audio_file_id:'FILE',
    audio_url:'https://drive.example/FILE'
  }),
  'GOOGLE_DRIVE'
);
assert.equal(
  authorityContext.h3RuntimeAudioBindingAuthority_({
    audio_file_id:'',
    audio_url:'',
    storage_authority:'CLOUDFLARE_R2_PRIVATE'
  }),
  'CLOUDFLARE_R2_PRIVATE'
);
assert.throws(
  ()=>authorityContext.h3RuntimeAudioBindingAuthority_({
    audio_file_id:'FAKE',
    audio_url:'',
    storage_authority:'CLOUDFLARE_R2_PRIVATE'
  }),
  /AUDIO_R2_FAKE_DRIVE_BINDING/
);

const backendBinding=body(
  orchestrator,
  'h3BackendDoneAudioBinding_',
  'h3BackendBindAudioToPayload_'
);
assert.match(
  backendBinding,
  /HQ_LISTENING_STORAGE_MODE_R2/
);
assert.match(
  backendBinding,
  /h3RuntimePrivateMediaProbe_\(/
);
assert.match(
  backendBinding,
  /storage_authority:\s*'CLOUDFLARE_R2_PRIVATE'/
);

const preissueQueue=body(
  preissue,
  'h3PreissueRequireQueue_',
  'h3PreissueRequireScript_'
);
assert.match(preissueQueue,/r2Mode/);
assert.match(
  preissueQueue,
  /h3RuntimePrivateMediaProbe_\(/
);
assert.match(
  preissueQueue,
  /r2Mode\s*\? HQ_LISTENING_STORAGE_MODE/
);

const productionMedia=body(
  productionRender,
  'getProductionMediaPayload_',
  'h3ProdReviewScriptUrl_'
);
assert.match(
  productionMedia,
  /h3RuntimeAudioMedia_\(/
);
assert.match(
  productionMedia,
  /LISTENING_AUDIO_INDIVIDUAL/
);

const reviewResolve=body(
  reviewCore,
  'h3ReviewAudioBindingResolve_',
  'h3ReviewAudioBindingResolveAll_'
);
assert.match(reviewResolve,/DONE_R2/);
assert.match(
  reviewResolve,
  /CLOUDFLARE_R2_PRIVATE/
);
assert.match(
  reviewResolve,
  /!get\('AUDIO_FILE_ID'\)/
);
assert.match(
  reviewResolve,
  /!get\('AUDIO_URL'\)/
);

const persistentMedia=body(
  reviewPersistence,
  'getPersistentReviewMediaPayload_',
  'getLegacyPersistentReviewMediaPayload_'
);
assert.match(
  persistentMedia,
  /h3RuntimeAudioMedia_\(/
);
const writtenMedia=body(
  reviewPersistence,
  'getWrittenPersistentReviewMediaPayload_',
  'h3WrittenProductionReviewBuildPayload_'
);
assert.match(
  writtenMedia,
  /h3RuntimeAudioMedia_\(/
);
const surfaceMedia=body(
  surfaceReview,
  'h3SurfaceReviewMedia_'
);
assert.match(
  surfaceMedia,
  /h3RuntimeAudioMedia_\(/
);

assert.match(
  source,
  /P4_ASSET_R2_REVIEW_FAKE_DRIVE_BINDING/
);
assert.match(
  source,
  /P4_ASSET_R2_LISTENING_FAKE_DRIVE_BINDING/
);

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

require('./p4_asset_reverse_copy_test.cjs');
console.log(JSON.stringify({status:'PASS',tests:109}));
