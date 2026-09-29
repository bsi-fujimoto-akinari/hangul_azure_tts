import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const runtimeCode=readFileSync(new URL('../WebAppCloudflareRuntime.js',import.meta.url),'utf8');
const context={console,JSON,String,Error,RegExp,Array,Object,Number,Boolean,Math,Date};
vm.createContext(context);
vm.runInContext(runtimeCode,context,{filename:'WebAppCloudflareRuntime.js'});

test('REM-04 canonicalizes Listening Review request and keeps legacy id only as source identity',()=>{
  const payload=context.h3RuntimeReviewRequestPayload_({
    schema:'H3_WEB_RENDER_REQUEST_V1',mode:'REVIEW',
    set_id:'H3-20260919-L03',review_kind:'LISTENING',surface_family:'5L',
    txn_id:'H3TX-20260919-000005',review_source_id:'H3TX-20260919-000005'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(payload)),{
    schema:'H3_WEB_RENDER_REQUEST_V1',mode:'REVIEW',
    set_id:'H3-20260919-L03',review_kind:'LISTENING',surface_family:'5L',
    review_source_id:'H3TX-20260919-000005'
  });
  assert.throws(()=>context.h3RuntimeReviewRequestPayload_({
    schema:'H3_WEB_RENDER_REQUEST_V1',mode:'REVIEW',
    set_id:'',review_kind:'LISTENING',surface_family:'5L',
    txn_id:'H3TX-20260919-000005'
  }),/REVIEW_RENDER_REQUEST_INVALID/);
  assert.throws(()=>context.h3RuntimeReviewRequestPayload_({
    schema:'H3_WEB_RENDER_REQUEST_V1',mode:'REVIEW',
    set_id:'H3-20260919-L03',review_kind:'LISTENING',surface_family:'5L',
    txn_id:'H3TX-20260919-000005',review_source_id:'H3TX-MISMATCH'
  }),/REVIEW_SOURCE_ID_MISMATCH/);
});

test('REM-04 hydrates 5L retained image and audio refs only after exact hashes match',()=>{
  const imageHash='a'.repeat(64),audioBindingHash='b'.repeat(64);
  const retained={
    image:{set_id:'H3-20260919-L03',slot_key:'K1_IMAGE',sha256:imageHash,
      file_id:'IMG',url:'https://drive.example/image',data_uri:'data:image/jpeg;base64,AA==',size_bytes:1},
    audio:Object.fromEntries(['K1','K2','K3','K4','K5'].map(k=>[k,{
      set_id:'H3-20260919-L03',slot_key:k,payload_hash:'c'.repeat(64),
      file_id:'A-'+k,url:'https://drive.example/'+k,listen_gen_id:'LG-'+k
    }])),
    audio_binding_sha256:audioBindingHash
  };
  context.h3RuntimeRetainedListening_=()=>retained;
  const review={
    mode:'REVIEW',kind:'LISTENING',surface_family:'5L',set_id:'H3-20260919-L03',
    technical:{k1_image_sha256:imageHash,audio_binding_sha256:audioBindingHash},
    sections:['K1','K2','K3','K4','K5'].map(k=>({
      section:k,audio_asset_key:k,audio_fallback_url:null,
      question_surface:k==='K1'?{}:{prompt:k}
    }))
  };
  const out=context.h3RuntimeHydrateListeningReview_(review);
  assert.equal(out.sections[0].question_surface.image_sha256,imageHash);
  assert.equal(out.sections[0].question_surface.image_data_uri,'data:image/jpeg;base64,AA==');
  assert.equal(out.sections[4].audio_fallback_url,'https://drive.example/K5');
  assert.equal(review.sections[0].question_surface.image_data_uri,undefined);
  assert.throws(()=>context.h3RuntimeHydrateListeningReview_({
    ...review,technical:{...review.technical,audio_binding_sha256:'d'.repeat(64)}
  }),/ASSET_HASH_MISMATCH/);
});

test('REM-04 5L Review media stays on retained Drive path',()=>{
  const retained={
    image:{sha256:'a'.repeat(64)},
    audio:{K3:{file_id:'A-K3',url:'https://drive.example/K3'}},
    audio_binding_sha256:'b'.repeat(64)
  };
  context.h3RuntimeRender_=()=>({
    mode:'REVIEW',kind:'LISTENING',provider_kind:'LISTENING',
    surface_family:'5L',set_id:'H3-20260919-L03',
    sections:[{section:'K3',audio_fallback_url:'https://drive.example/K3'}]
  });
  context.h3RuntimeRetainedListening_=()=>retained;
  context.h3DriveDataUri_=()=>({data_uri:'data:audio/mpeg;base64,AA==',mime_type:'audio/mpeg',size_bytes:1});
  const out=context.h3RuntimeReviewMedia_({
    schema:'H3_WEB_MEDIA_REQUEST_V1',mode:'REVIEW',
    set_id:'H3-20260919-L03',asset_key:'K3',
    review_kind:'LISTENING',surface_family:'5L'
  });
  assert.equal(out.provider_kind,'LISTENING');
  assert.equal(out.surface_family,'5L');
  assert.equal(out.fallback_url,'https://drive.example/K3');
});

test('REM-04 Client HOME open sends canonical tuple for Listening entries',()=>{
  const client=readFileSync(new URL('../Client.html',import.meta.url),'utf8');
  const txn=client.slice(client.indexOf('function loadReviewTxn'),client.indexOf('function loadLegacyReview'));
  const legacy=client.slice(client.indexOf('function loadLegacyReview'),client.indexOf('function loadWrittenReview'));
  assert.match(txn,/review_kind:\s*'LISTENING'/);
  assert.match(txn,/surface_family:\s*'5L'/);
  assert.match(txn,/set_id:\s*String\(setId\)/);
  assert.match(txn,/review_source_id:\s*String\(txnId\)/);
  assert.doesNotMatch(txn,/set_id:\s*null/);
  assert.match(legacy,/review_kind:\s*'LISTENING'/);
  assert.match(legacy,/surface_family:\s*'5L'/);
  assert.match(legacy,/set_id:\s*String\(setId\)/);
  assert.match(legacy,/review_source_id:\s*String\(legacyReviewId\)/);
  assert.doesNotMatch(legacy,/set_id:\s*null/);
  const open=client.slice(client.indexOf('function openReviewHistoryEntry_'),client.indexOf('function reviewFamilyKeyForEntry_'));
  assert.match(open,/loadLegacyReview\([\s\S]*entry\.legacy_review_id,[\s\S]*entry\.set_id/);
  assert.match(open,/loadReviewTxn\([\s\S]*entry\.txn_id,[\s\S]*entry\.set_id/);
});
