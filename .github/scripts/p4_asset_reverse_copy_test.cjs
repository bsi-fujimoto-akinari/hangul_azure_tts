const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('P4AssetReverseCopy.js','utf8');
const x=vm.createContext({JSON,String,Number,Array,Object,Error});
vm.runInContext(src,x);
const bytes=Buffer.from([1,2,3,4]);
const sha=b=>crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
const target=()=>({schema:'H3_P4_DRIVE_ROLLBACK_TARGET_V1',target_mode:'CREATE_OR_REUSE_EXACT_FILE',drive_folder_id:'FOLDER',drive_file_name:'asset.mp3',binding_store:'GOOGLE_SHEETS',binding_table:'review_audio_asset_v1',binding_key_json:JSON.stringify({set_id:'SET',slot_key:'D2',surface_family:'5W'}),expected_r2_state:'STATUS=DONE_R2;AUDIO_FILE_ID=;AUDIO_URL=;DRIVE_FOLDER_ID='});
const receipt=()=>({schema:'H3_R2_PRIMARY_ASSET_WRITE_RECEIPT_V1',receipt_id:'a'.repeat(64),asset_class:'REVIEW_AUDIO',logical_binding_identity:{surface_family:'5W',set_id:'SET',slot_key:'D2'},logical_binding_identity_sha256:'b'.repeat(64),r2_object_key:'v1/review_audio/sha256/'+sha(bytes),source_byte_sha256:sha(bytes),mime_type:'audio/mpeg',size_bytes:4,written_at:'2026-10-02T02:00:00Z',pre_cutover_or_previous_drive_binding_snapshot:target(),drive_rollback_target_class:'REVIEW_AUDIO',storage_authority:'CLOUDFLARE_R2_PRIVATE',status:'COMMITTED'});
function deps(o={}){
  let f=o.file||null,c=0;
  return{api:{fetchR2:()=>({bytes:o.r2||bytes,mime_type:'audio/mpeg',size_bytes:(o.r2||bytes).length}),sha256Bytes:sha,findFiles:()=>o.multiple?[f,f]:f?[f]:[],getFile:()=>f,createFile:(_d,b,m,n)=>{c++;f={id:'FILE',url:'url',name:n,mime_type:m,size_bytes:b.length,parent_ids:['FOLDER'],sha256:sha(b)};return f;},inspectFile:v=>v,restoreBinding:()=>({write_performed:true})},count:()=>c};
}
{const d=deps(),r=receipt();const a=x.h3P4AssetReverseCopyReceiptWithDeps_(r,d.api);assert.equal(a.drive_byte_write_performed,true);const b=x.h3P4AssetReverseCopyReceiptWithDeps_(r,d.api);assert.equal(b.drive_byte_write_performed,false);assert.equal(d.count(),1);assert.equal(a.r2_delete_count,0);assert.equal(a.receipt_delete_count,0);}
{const r=receipt();r.pre_cutover_or_previous_drive_binding_snapshot=null;const d=deps();assert.throws(()=>x.h3P4AssetReverseCopyReceiptWithDeps_(r,d.api),/TARGET_MISSING/);assert.equal(d.count(),0);}
{const d=deps({r2:Buffer.from([9,9,9,9])});assert.throws(()=>x.h3P4AssetReverseCopyReceiptWithDeps_(receipt(),d.api),/R2_VERIFICATION_FAILED/);assert.equal(d.count(),0);}
{const f={id:'FILE',url:'url',name:'asset.mp3',mime_type:'audio/mpeg',size_bytes:4,parent_ids:['FOLDER'],sha256:sha(Buffer.from([8,8,8,8]))},d=deps({file:f});assert.throws(()=>x.h3P4AssetReverseCopyReceiptWithDeps_(receipt(),d.api),/DRIVE_TARGET_CONFLICT/);assert.equal(d.count(),0);}
{const f={id:'FILE',url:'url',name:'asset.mp3',mime_type:'audio/mpeg',size_bytes:4,parent_ids:['FOLDER'],sha256:sha(bytes)},d=deps({file:f,multiple:true});assert.throws(()=>x.h3P4AssetReverseCopyReceiptWithDeps_(receipt(),d.api),/DRIVE_MULTIPLE_FILES/);}
assert.equal(x.h3P4AssetReverseCopyAssertZeroUnreversedDelta_(0),true);
assert.throws(()=>x.h3P4AssetReverseCopyAssertZeroUnreversedDelta_(1),/UNREVERSED_DELTA_NONZERO/);
console.log(JSON.stringify({status:'PASS_STATIC_UNIT_FIXTURES',production_mutation:0}));
