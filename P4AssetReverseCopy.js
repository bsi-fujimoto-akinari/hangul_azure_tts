var H3_P4_REVERSE_COPY_RESULT_SCHEMA_='H3_P4_ASSET_REVERSE_COPY_RESULT_V1';
var H3_P4_DRIVE_ROLLBACK_TARGET_SCHEMA_='H3_P4_DRIVE_ROLLBACK_TARGET_V1';

function h3P4ReverseCopyFail_(code){throw new Error(String(code));}
function h3P4ReverseCopyStr_(v,code){var s=String(v||'');if(!s||/[\x00-\x1f]/.test(s))h3P4ReverseCopyFail_(code);return s;}
function h3P4ReverseCopyHex_(v,code){var s=String(v||'');if(!/^[0-9a-f]{64}$/.test(s))h3P4ReverseCopyFail_(code);return s;}
function h3P4ReverseCopyFields_(c){
  var m={REVIEW_AUDIO:['surface_family','set_id','slot_key'],LISTENING_AUDIO_INDIVIDUAL:['set_id','slot_key','listen_gen_id'],LISTENING_K1_IMAGE:['k1_ready_id']};
  if(!m[c])h3P4ReverseCopyFail_('P4_REVERSE_COPY_ASSET_CLASS_INVALID');return m[c];
}
function h3P4ReverseCopyIdentity_(c,x){
  if(!x||typeof x!=='object'||Array.isArray(x))h3P4ReverseCopyFail_('P4_REVERSE_COPY_LOGICAL_IDENTITY_INVALID');
  var e=h3P4ReverseCopyFields_(c).slice().sort(),o=Object.keys(x).slice().sort(),r={};
  if(e.length!==o.length||e.some(function(k,i){return k!==o[i];}))h3P4ReverseCopyFail_('P4_REVERSE_COPY_LOGICAL_IDENTITY_INVALID');
  e.forEach(function(k){r[k]=h3P4ReverseCopyStr_(x[k],'P4_REVERSE_COPY_LOGICAL_IDENTITY_INVALID');});
  return JSON.stringify(r);
}
function h3P4ReverseCopyTarget_(r){
  var t=r&&r.pre_cutover_or_previous_drive_binding_snapshot;
  if(!t||typeof t!=='object'||Array.isArray(t))h3P4ReverseCopyFail_('P4_REVERSE_COPY_TARGET_MISSING');
  ['schema','target_mode','drive_folder_id','drive_file_name','binding_store','binding_table','binding_key_json','expected_r2_state']
    .forEach(function(k){h3P4ReverseCopyStr_(t[k],'P4_REVERSE_COPY_TARGET_INVALID');});
  var table={REVIEW_AUDIO:'review_audio_asset_v1',LISTENING_AUDIO_INDIVIDUAL:'listening_audio_queue_v1',LISTENING_K1_IMAGE:'listening_k1_ready_v1'}[r.asset_class];
  if(t.schema!==H3_P4_DRIVE_ROLLBACK_TARGET_SCHEMA_||t.binding_store!=='GOOGLE_SHEETS'||t.binding_table!==table)
    h3P4ReverseCopyFail_('P4_REVERSE_COPY_TARGET_INVALID');
  var k;try{k=JSON.parse(t.binding_key_json);}catch(_e){h3P4ReverseCopyFail_('P4_REVERSE_COPY_TARGET_INVALID');}
  if(h3P4ReverseCopyIdentity_(r.asset_class,k)!==h3P4ReverseCopyIdentity_(r.asset_class,r.logical_binding_identity))
    h3P4ReverseCopyFail_('P4_REVERSE_COPY_TARGET_BINDING_MISMATCH');
  if(r.asset_class==='LISTENING_K1_IMAGE'){
    if(t.target_mode!=='RESTORE_EXACT_EXISTING_FILE')h3P4ReverseCopyFail_('P4_REVERSE_COPY_TARGET_MODE_INVALID');
    h3P4ReverseCopyStr_(t.drive_file_id,'P4_REVERSE_COPY_DRIVE_FILE_ID_MISSING');
  }else if(t.target_mode!=='CREATE_OR_REUSE_EXACT_FILE'||t.drive_file_id){
    h3P4ReverseCopyFail_('P4_REVERSE_COPY_TARGET_MODE_INVALID');
  }
  return t;
}
function h3P4ReverseCopyValidateReceipt_(r){
  if(!r||typeof r!=='object'||Array.isArray(r))h3P4ReverseCopyFail_('P4_REVERSE_COPY_RECEIPT_MISSING');
  if(r.schema!=='H3_R2_PRIMARY_ASSET_WRITE_RECEIPT_V1'||r.storage_authority!=='CLOUDFLARE_R2_PRIVATE'||r.status!=='COMMITTED')
    h3P4ReverseCopyFail_('P4_REVERSE_COPY_RECEIPT_INVALID');
  h3P4ReverseCopyHex_(r.receipt_id,'P4_REVERSE_COPY_RECEIPT_ID_INVALID');
  h3P4ReverseCopyHex_(r.logical_binding_identity_sha256,'P4_REVERSE_COPY_LOGICAL_HASH_INVALID');
  h3P4ReverseCopyHex_(r.source_byte_sha256,'P4_REVERSE_COPY_SOURCE_HASH_INVALID');
  h3P4ReverseCopyStr_(r.r2_object_key,'P4_REVERSE_COPY_R2_OBJECT_KEY_INVALID');
  h3P4ReverseCopyStr_(r.mime_type,'P4_REVERSE_COPY_MIME_INVALID');
  if(!Number.isInteger(Number(r.size_bytes))||Number(r.size_bytes)<1)h3P4ReverseCopyFail_('P4_REVERSE_COPY_SIZE_INVALID');
  h3P4ReverseCopyIdentity_(r.asset_class,r.logical_binding_identity);
  return h3P4ReverseCopyTarget_(r);
}
function h3P4ReverseCopySha_(bytes){
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(function(b){return('0'+(((b+256)%256).toString(16))).slice(-2);}).join('');
}
function h3P4ReverseCopySpreadsheet_(){
  var p=PropertiesService.getScriptProperties(),a=String(p.getProperty('REVIEW_AUDIO_SHEET_ID')||''),b=String(p.getProperty('K1_READY_SHEET_ID')||'');
  if(a&&b&&a!==b)h3P4ReverseCopyFail_('P4_REVERSE_COPY_SPREADSHEET_ID_MISMATCH');
  var id=a||b;if(!id)h3P4ReverseCopyFail_('P4_REVERSE_COPY_SPREADSHEET_ID_MISSING');return SpreadsheetApp.openById(id);
}
function h3P4ReverseCopyTable_(sheet){
  if(!sheet)h3P4ReverseCopyFail_('P4_REVERSE_COPY_SHEET_MISSING');
  var nr=sheet.getLastRow(),nc=sheet.getLastColumn();if(nr<1||nc<1)h3P4ReverseCopyFail_('P4_REVERSE_COPY_SHEET_EMPTY');
  var v=sheet.getRange(1,1,nr,nc).getDisplayValues(),m={};v[0].forEach(function(x,i){m[String(x)]=i;});return{sheet:sheet,map:m,rows:v.slice(1)};
}
function h3P4ReverseCopyHeaders_(t,n){n.forEach(function(x){if(typeof t.map[x]!=='number')h3P4ReverseCopyFail_('P4_REVERSE_COPY_HEADER_MISSING:'+x);});}
function h3P4ReverseCopyRows_(t,p){var a=[];t.rows.forEach(function(r,i){if(p(r))a.push({row:r,rowNumber:i+2});});return a;}
function h3P4ReverseCopySet_(t,r,n,v){t.sheet.getRange(r,t.map[n]+1).setValue(v);}
function h3P4ReverseCopyReview_(r,f,t){
  var ss=h3P4ReverseCopySpreadsheet_(),x=h3P4ReverseCopyTable_(ss.getSheetByName('review_audio_asset_v1')),id=r.logical_binding_identity;
  h3P4ReverseCopyHeaders_(x,['SURFACE_FAMILY','SET_ID','SLOT_KEY','AUDIO_FILE_ID','AUDIO_URL','DRIVE_FOLDER_ID','STATUS']);
  var m=h3P4ReverseCopyRows_(x,function(z){return String(z[x.map.SURFACE_FAMILY]||'')===id.surface_family&&String(z[x.map.SET_ID]||'')===id.set_id&&String(z[x.map.SLOT_KEY]||'')===id.slot_key;});
  if(m.length!==1)h3P4ReverseCopyFail_('P4_REVERSE_COPY_REVIEW_ROW_COUNT');
  var q=m[0],z=q.row,s=String(z[x.map.STATUS]||''),fi=String(z[x.map.AUDIO_FILE_ID]||''),u=String(z[x.map.AUDIO_URL]||''),fo=String(z[x.map.DRIVE_FOLDER_ID]||'');
  if(s==='DONE'&&fi===f.id&&u===f.url&&fo===t.drive_folder_id)return{write_performed:false};
  if(s!=='DONE_R2'||fi||u||fo)h3P4ReverseCopyFail_('P4_REVERSE_COPY_REVIEW_BINDING_CONFLICT');
  h3P4ReverseCopySet_(x,q.rowNumber,'AUDIO_FILE_ID',f.id);h3P4ReverseCopySet_(x,q.rowNumber,'AUDIO_URL',f.url);h3P4ReverseCopySet_(x,q.rowNumber,'DRIVE_FOLDER_ID',t.drive_folder_id);h3P4ReverseCopySet_(x,q.rowNumber,'STATUS','DONE');SpreadsheetApp.flush();
  return{write_performed:true};
}
function h3P4ReverseCopyListeningState_(ss,r,f){
  var id=r.logical_binding_identity,q=h3P4ReverseCopyTable_(ss.getSheetByName('listening_audio_queue_v1'));
  h3P4ReverseCopyHeaders_(q,['LISTEN_GEN_ID','STATUS','AUDIO_FILE_ID','AUDIO_URL','STORAGE_MODE']);
  var qm=h3P4ReverseCopyRows_(q,function(z){return String(z[q.map.LISTEN_GEN_ID]||'')===id.listen_gen_id;});if(qm.length!==1)h3P4ReverseCopyFail_('P4_REVERSE_COPY_LISTENING_QUEUE_ROW_COUNT');
  var p=h3P4ReverseCopyTable_(ss.getSheetByName('listening_set_payload_v1'));h3P4ReverseCopyHeaders_(p,['LISTENING_SET_ID','AUDIO_BINDING_JSON']);
  var pm=h3P4ReverseCopyRows_(p,function(z){return String(z[p.map.LISTENING_SET_ID]||'')===id.set_id;});if(pm.length!==1)h3P4ReverseCopyFail_('P4_REVERSE_COPY_LISTENING_PAYLOAD_ROW_COUNT');
  var b;try{b=JSON.parse(String(pm[0].row[p.map.AUDIO_BINDING_JSON]||''));}catch(_e){h3P4ReverseCopyFail_('P4_REVERSE_COPY_LISTENING_BINDING_JSON_INVALID');}
  var a=b&&b.individual&&b.individual[id.slot_key];if(!a||String(a.listen_gen_id||'')!==id.listen_gen_id)h3P4ReverseCopyFail_('P4_REVERSE_COPY_LISTENING_BINDING_IDENTITY_MISMATCH');
  var z=qm[0].row,fi=String(z[q.map.AUDIO_FILE_ID]||''),u=String(z[q.map.AUDIO_URL]||''),mo=String(z[q.map.STORAGE_MODE]||''),au=String(a.storage_authority||''),afi=String(a.audio_file_id||''),auu=String(a.audio_url||'');
  var done=String(z[q.map.STATUS]||'')==='done'&&mo==='listening_audio_v1'&&fi===f.id&&u===f.url&&au==='GOOGLE_DRIVE'&&afi===f.id&&auu===f.url;
  if(!done&&(String(z[q.map.STATUS]||'')!=='done'||mo!=='listening_audio_r2_v1'||fi||u||au!=='CLOUDFLARE_R2_PRIVATE'||afi||auu))
    h3P4ReverseCopyFail_('P4_REVERSE_COPY_LISTENING_BINDING_CONFLICT');
  return{q:q,qm:qm[0],p:p,pm:pm[0],b:b,a:a,done:done};
}
function h3P4ReverseCopyListening_(r,f){
  var ss=h3P4ReverseCopySpreadsheet_(),s=h3P4ReverseCopyListeningState_(ss,r,f);if(s.done)return{write_performed:false};
  s.a.audio_file_id=f.id;s.a.audio_url=f.url;s.a.storage_authority='GOOGLE_DRIVE';
  h3P4ReverseCopySet_(s.p,s.pm.rowNumber,'AUDIO_BINDING_JSON',JSON.stringify(s.b));h3P4ReverseCopySet_(s.q,s.qm.rowNumber,'AUDIO_FILE_ID',f.id);h3P4ReverseCopySet_(s.q,s.qm.rowNumber,'AUDIO_URL',f.url);h3P4ReverseCopySet_(s.q,s.qm.rowNumber,'STORAGE_MODE','listening_audio_v1');SpreadsheetApp.flush();
  if(!h3P4ReverseCopyListeningState_(ss,r,f).done)h3P4ReverseCopyFail_('P4_REVERSE_COPY_LISTENING_READBACK_MISMATCH');return{write_performed:true};
}
function h3P4ReverseCopyK1_(r,f){
  var ss=h3P4ReverseCopySpreadsheet_(),t=h3P4ReverseCopyTable_(ss.getSheetByName('listening_k1_ready_v1')),id=r.logical_binding_identity;
  h3P4ReverseCopyHeaders_(t,['K1_READY_ID','IMAGE_FILE_ID','IMAGE_URL','IMAGE_SHA256']);
  var m=h3P4ReverseCopyRows_(t,function(z){return String(z[t.map.K1_READY_ID]||'')===id.k1_ready_id;});if(m.length!==1)h3P4ReverseCopyFail_('P4_REVERSE_COPY_K1_ROW_COUNT');
  var z=m[0].row;if(String(z[t.map.IMAGE_SHA256]||'')!==r.source_byte_sha256)h3P4ReverseCopyFail_('P4_REVERSE_COPY_K1_HASH_MISMATCH');
  var fi=String(z[t.map.IMAGE_FILE_ID]||''),u=String(z[t.map.IMAGE_URL]||'');if(fi===f.id&&u===f.url)return{write_performed:false};if(fi||u)h3P4ReverseCopyFail_('P4_REVERSE_COPY_K1_BINDING_CONFLICT');
  h3P4ReverseCopySet_(t,m[0].rowNumber,'IMAGE_FILE_ID',f.id);h3P4ReverseCopySet_(t,m[0].rowNumber,'IMAGE_URL',f.url);SpreadsheetApp.flush();return{write_performed:true};
}
function h3P4ReverseCopyRestore_(r,f,t){
  if(r.asset_class==='REVIEW_AUDIO')return h3P4ReverseCopyReview_(r,f,t);
  if(r.asset_class==='LISTENING_AUDIO_INDIVIDUAL')return h3P4ReverseCopyListening_(r,f);
  if(r.asset_class==='LISTENING_K1_IMAGE')return h3P4ReverseCopyK1_(r,f);
  h3P4ReverseCopyFail_('P4_REVERSE_COPY_ASSET_CLASS_INVALID');
}
function h3P4ReverseCopyInspect_(f){
  if(!f||f.isTrashed())h3P4ReverseCopyFail_('P4_REVERSE_COPY_DRIVE_FILE_INVALID');
  var p=[],it=f.getParents();while(it.hasNext())p.push(it.next().getId());var b=f.getBlob().getBytes();
  return{id:f.getId(),url:f.getUrl(),name:f.getName(),mime_type:f.getMimeType(),size_bytes:f.getSize(),parent_ids:p,sha256:h3P4ReverseCopySha_(b)};
}
function h3P4ReverseCopyDeps_(){
  return{
    fetchR2:function(c,i,n){return h3RuntimePrivateMediaRequest_(c,i,'',n);},
    sha256Bytes:h3P4ReverseCopySha_,
    findFiles:function(fid,n){var f=DriveApp.getFolderById(fid),a=[],it;if(f.isTrashed())h3P4ReverseCopyFail_('P4_REVERSE_COPY_DRIVE_FOLDER_INVALID');it=f.getFilesByName(n);while(it.hasNext())a.push(it.next());return a;},
    getFile:function(id){return DriveApp.getFileById(id);},
    createFile:function(fid,b,m,n){var f=DriveApp.getFolderById(fid);if(f.isTrashed())h3P4ReverseCopyFail_('P4_REVERSE_COPY_DRIVE_FOLDER_INVALID');return f.createFile(Utilities.newBlob(b,m,n));},
    inspectFile:h3P4ReverseCopyInspect_,
    restoreBinding:h3P4ReverseCopyRestore_
  };
}
function h3P4ReverseCopyExactFile_(i,t,r){
  if(!i||i.name!==t.drive_file_name||i.mime_type!==r.mime_type||Number(i.size_bytes)!==Number(r.size_bytes)||i.sha256!==r.source_byte_sha256||!Array.isArray(i.parent_ids)||i.parent_ids.indexOf(t.drive_folder_id)<0)
    h3P4ReverseCopyFail_('P4_REVERSE_COPY_DRIVE_TARGET_CONFLICT');
  if(t.target_mode==='RESTORE_EXACT_EXISTING_FILE'&&i.id!==t.drive_file_id)h3P4ReverseCopyFail_('P4_REVERSE_COPY_DRIVE_FILE_ID_CONFLICT');return i;
}
function h3P4AssetReverseCopyReceiptWithDeps_(r,d){
  var t=h3P4ReverseCopyValidateReceipt_(r),m=d.fetchR2(r.asset_class,r.logical_binding_identity,Number(r.size_bytes)),b=m&&m.bytes;
  if(!b||Number(m.size_bytes)!==Number(r.size_bytes)||m.mime_type!==r.mime_type||d.sha256Bytes(b)!==r.source_byte_sha256)
    h3P4ReverseCopyFail_('P4_REVERSE_COPY_R2_VERIFICATION_FAILED');
  var f,w=false;if(t.target_mode==='RESTORE_EXACT_EXISTING_FILE'){f=d.getFile(t.drive_file_id);}else{var a=d.findFiles(t.drive_folder_id,t.drive_file_name);if(!Array.isArray(a))h3P4ReverseCopyFail_('P4_REVERSE_COPY_DRIVE_LOOKUP_INVALID');if(a.length>1)h3P4ReverseCopyFail_('P4_REVERSE_COPY_DRIVE_MULTIPLE_FILES');if(a.length===1)f=a[0];else{f=d.createFile(t.drive_folder_id,b,r.mime_type,t.drive_file_name);w=true;}}
  var i=h3P4ReverseCopyExactFile_(d.inspectFile(f),t,r),x=d.restoreBinding(r,i,t)||{};
  return{schema:H3_P4_REVERSE_COPY_RESULT_SCHEMA_,status:'PASS',receipt_id:r.receipt_id,asset_class:r.asset_class,logical_binding_identity_sha256:r.logical_binding_identity_sha256,r2_object_key:r.r2_object_key,drive_file_id:i.id,drive_folder_id:t.drive_folder_id,drive_file_name:i.name,source_byte_sha256:r.source_byte_sha256,mime_type:r.mime_type,size_bytes:Number(r.size_bytes),drive_byte_write_performed:w,binding_write_performed:x.write_performed===true,r2_delete_count:0,receipt_delete_count:0};
}
function h3P4AssetReverseCopyReceipt(r){return h3P4AssetReverseCopyReceiptWithDeps_(r,h3P4ReverseCopyDeps_());}
function h3P4AssetReverseCopyAssertZeroUnreversedDelta_(n){if(!Number.isInteger(Number(n))||Number(n)!==0)h3P4ReverseCopyFail_('P4_REVERSE_COPY_UNREVERSED_DELTA_NONZERO');return true;}
