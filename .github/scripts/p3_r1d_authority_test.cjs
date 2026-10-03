const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const app=fs.readFileSync('WebApp.js','utf8');
const adapter=fs.readFileSync('WebAppCloudflareRuntime.js','utf8');
function context(mode,locked){
  const values={H3_RUNTIME_AUTHORITY_MODE:mode,H3_RUNTIME_CUTOVER_LOCKED:locked};
  const props={getProperty:k=>values[k]??null,setProperties:o=>Object.assign(values,o)};
  const calls=[];
  const x=vm.createContext({PropertiesService:{getScriptProperties:()=>props},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Utilities:{
      getUuid:()=> 'fixed-uuid',
      DigestAlgorithm:{SHA_256:'SHA_256'},
      Charset:{UTF_8:'UTF_8'},
      computeDigest:(_algorithm,value)=>Array.from(
        crypto.createHash('sha256')
          .update(Array.isArray(value)
            ? Buffer.from(value.map(x=>(x+256)%256))
            : Buffer.from(String(value),'utf8'))
          .digest()
      ).map(x=>x>127?x-256:x),
      base64Encode:value=>Buffer.from(
        value.map(x=>(x+256)%256)
      ).toString('base64')
    },console});
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

{
  const {x}=context('D1','1');
  const bytes=[1,2,3,-1];
  const input={
    asset_class:'LISTENING_AUDIO_INDIVIDUAL',
    logical_binding_identity:{
      set_id:'H3-20261002-L01',
      slot_key:'K1',
      listen_gen_id:'GEN-K1'
    },
    bytes,
    mime_type:'audio/mpeg',
    written_at:'2026-10-01T21:00:00Z',
    pre_cutover_or_previous_drive_binding_snapshot:null,
    drive_rollback_target_class:'LISTENING_AUDIO_INDIVIDUAL'
  };
  const identity={
    listen_gen_id:'GEN-K1',
    set_id:'H3-20261002-L01',
    slot_key:'K1'
  };
  const identityJson=JSON.stringify(identity);
  const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
  const sourceHash=crypto.createHash('sha256')
    .update(Buffer.from(bytes.map(v=>(v+256)%256))).digest('hex');
  const identityHash=sha(
    'LISTENING_AUDIO_INDIVIDUAL\n'+identityJson
  );
  const receiptId=sha(
    'H3_R2_PRIMARY_ASSET_WRITE_RECEIPT_V1\n'+
      'LISTENING_AUDIO_INDIVIDUAL\n'+identityHash
  );
  let observed=null;
  const receipt={
    schema:'H3_R2_PRIMARY_ASSET_WRITE_RECEIPT_V1',
    receipt_id:receiptId,
    asset_class:'LISTENING_AUDIO_INDIVIDUAL',
    logical_binding_identity:identity,
    logical_binding_identity_sha256:identityHash,
    r2_object_key:
      'v1/listening_audio_individual/sha256/'+sourceHash,
    source_byte_sha256:sourceHash,
    mime_type:'audio/mpeg',
    size_bytes:4,
    written_at:'2026-10-01T21:00:00Z',
    pre_cutover_or_previous_drive_binding_snapshot:null,
    drive_rollback_target_class:'LISTENING_AUDIO_INDIVIDUAL',
    storage_authority:'CLOUDFLARE_R2_PRIVATE',
    status:'COMMITTED'
  };
  x.h3RuntimeRpc_=(op,payload)=>{
    observed={op,payload};
    return receipt;
  };
  assert.equal(x.h3RuntimeAssetWriteR2_(input),receipt);
  assert.equal(observed.op,'ASSET_WRITE_R2');
  assert.deepEqual(
    JSON.parse(JSON.stringify(observed.payload.logical_binding_identity)),
    identity
  );
  assert.equal(
    observed.payload.bytes_base64,
    Buffer.from(bytes.map(v=>(v+256)%256)).toString('base64')
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(observed.payload,'bytes'),
    false
  );

  assert.throws(
    ()=>x.h3RuntimeAssetWriteR2_({...input,unexpected:true}),
    /R2_PRIMARY_WRITE_REQUEST_INVALID/
  );
  assert.throws(
    ()=>x.h3RuntimeAssetWriteR2_({
      ...input,
      logical_binding_identity:{...input.logical_binding_identity,extra:'X'}
    }),
    /R2_PRIMARY_LOGICAL_IDENTITY_INVALID/
  );

  x.h3RuntimeRpc_=()=>({...receipt,source_byte_sha256:'0'.repeat(64)});
  assert.throws(
    ()=>x.h3RuntimeAssetWriteR2_(input),
    /R2_PRIMARY_RECEIPT_HASH_MISMATCH/
  );

  const malformed={...receipt};
  delete malformed.receipt_id;
  x.h3RuntimeRpc_=()=>malformed;
  assert.throws(
    ()=>x.h3RuntimeAssetWriteR2_(input),
    /R2_PRIMARY_RECEIPT_INVALID/
  );

  x.h3RuntimeRpc_=()=>{throw new Error('R2_PRIMARY_WRITER_ENV_INVALID');};
  assert.throws(
    ()=>x.h3RuntimeAssetWriteR2_(input),
    /R2_PRIMARY_WRITER_ENV_INVALID/
  );

  const assetWriteStart=
    adapter.indexOf('function h3RuntimeAssetWriteR2_(');
  const assetWriteEnd=
    adapter.indexOf('function ',assetWriteStart+9);
  const body=adapter.slice(assetWriteStart,assetWriteEnd);
  assert.match(body,/h3RuntimeRpc_\('ASSET_WRITE_R2'/);
  assert.doesNotMatch(body,/UrlFetchApp\.fetch/);
}
{
  const {x,values}=context('D1','1');
  const setId='H3-20261002-L01';
  const k1Id='H3-K1R-20261002-001';
  const imageHash='a'.repeat(64);
  const binding={individual:{}};
  ['K1','K2','K3','K4','K5'].forEach(section=>{
    binding.individual[section]={
      payload_hash:'b'.repeat(64),
      listen_gen_id:'GEN-'+section,
      storage_authority:'CLOUDFLARE_R2_PRIVATE',
      audio_file_id:'',
      audio_url:''
    };
  });
  values.H3_RUNTIME_BACKEND_BASE_URL=x.H3_RUNTIME_EXPECTED_WORKER_URL_;
  values.H3_RUNTIME_BEARER_TOKEN='media-token';
  const payloadTable={
    map:{K1_READY_ID:0,AUDIO_BINDING_JSON:1}
  };
  const k1Table={
    map:{BOUND_LISTENING_SET_ID:0,IMAGE_SHA256:1,K1_READY_ID:2}
  };
  x.SpreadsheetApp={
    openById:()=>({
      getSheetByName:name=>({name})
    })
  };
  x.h3ProdSheetRows_=sheet=>
    sheet.name==='listening_set_payload_v1'
      ? payloadTable
      : k1Table;
  x.h3ProdRequireColumns_=()=>{};
  x.h3ProdOneRowBy_=(_table,key)=>{
    if(key==='LISTENING_SET_ID'){
      return{row:[k1Id,JSON.stringify(binding)]};
    }
    if(key==='K1_READY_ID'){
      return{row:[setId,imageHash,k1Id]};
    }
    throw new Error('UNEXPECTED_LOOKUP');
  };
  x.h3ProdParseJson_=value=>JSON.parse(value);
  x.h3ReviewHash_=()=> 'c'.repeat(64);
  x.h3DriveDataUri_=()=>{
    throw new Error('DRIVE_HOT_PATH_USED');
  };
  let observed=null;
  x.UrlFetchApp={
    fetch:(url,options)=>{
      observed={url,options};
      return{
        getResponseCode:()=>200,
        getAllHeaders:()=>({'Content-Type':'image/jpeg'}),
        getContent:()=>[1,2,3]
      };
    }
  };

  const retained=x.h3RuntimeRetainedListening_(setId);
  assert.equal(retained.image.sha256,imageHash);
  assert.equal(retained.image.file_id,'');
  assert.equal(retained.image.url,'');
  assert.equal(retained.image.storage_authority,'CLOUDFLARE_R2_PRIVATE');
  assert.equal(retained.image.data_uri,'data:image/jpeg;base64,AQID');
  assert.equal(retained.image.size_bytes,3);
  const mediaUrl=new URL(observed.url);
  assert.equal(
    mediaUrl.pathname,
    '/__internal/h3/media/v1'
  );
  assert.equal(
    mediaUrl.searchParams.get('asset_class'),
    'LISTENING_K1_IMAGE'
  );
  assert.equal(mediaUrl.searchParams.get('k1_ready_id'),k1Id);
  assert.equal(
    mediaUrl.searchParams.get('bound_listening_set_id'),
    setId
  );
  assert.equal(observed.options.method,'get');
  assert.equal(
    observed.options.headers.Authorization,
    'Bearer media-token'
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      x.h3RuntimeR2AssetSpec_('LISTENING_K1_IMAGE').identity_fields
    )),
    ['k1_ready_id']
  );
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
