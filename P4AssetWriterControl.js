var H3_P4_ASSET_WRITER_MODE_KEY_='H3_P4_ASSET_WRITER_MODE';
var H3_P4_ASSET_WRITER_WATERMARK_KEY_='H3_P4_ASSET_WRITER_QUIESCE_WATERMARK';
var H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_='H3_P4_ASSET_WRITER_TRANSITION_WATERMARK';
var H3_P4_ASSET_WRITER_DRIVE_PRIMARY_='DRIVE_PRIMARY';
var H3_P4_ASSET_WRITER_QUIESCED_='QUIESCED';
var H3_P4_ASSET_WRITER_R2_PRIMARY_='R2_PRIMARY';

function h3P4AssetWriterMode_(){
  var raw=String(
    PropertiesService.getScriptProperties()
      .getProperty(H3_P4_ASSET_WRITER_MODE_KEY_) || ''
  ).trim();
  if(!raw)return H3_P4_ASSET_WRITER_DRIVE_PRIMARY_;
  if(
    raw!==H3_P4_ASSET_WRITER_DRIVE_PRIMARY_ &&
    raw!==H3_P4_ASSET_WRITER_QUIESCED_ &&
    raw!==H3_P4_ASSET_WRITER_R2_PRIMARY_
  )throw new Error('P4_ASSET_WRITER_MODE_INVALID:'+raw);
  return raw;
}

function h3P4AssetWriterRequireDrivePrimary_(){
  var mode=h3P4AssetWriterMode_();
  if(mode!==H3_P4_ASSET_WRITER_DRIVE_PRIMARY_){
    throw new Error('P4_ASSET_WRITERS_QUIESCED');
  }
  return mode;
}

function h3P4AssetWriterStatus(){
  var props=PropertiesService.getScriptProperties();
  var triggers=ScriptApp.getProjectTriggers();
  var fallback=triggers.filter(function(t){
    return String(t.getHandlerFunction())==='processLatestPendingAudioJob';
  });
  return{
    schema:'H3_P4_ASSET_WRITER_STATUS_V1',
    mode:h3P4AssetWriterMode_(),
    quiesce_watermark:String(
      props.getProperty(H3_P4_ASSET_WRITER_WATERMARK_KEY_) || ''
    ),
    transition_watermark:String(
      props.getProperty(H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_) || ''
    ),
    fallback_trigger_count:fallback.length,
    mutation_count:0
  };
}

function h3P4AssetWriterQuiesce(){
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    var props=PropertiesService.getScriptProperties();
    var before=h3P4AssetWriterMode_();
    if(before===H3_P4_ASSET_WRITER_QUIESCED_){
      var existing=h3P4AssetWriterStatus();
      return{
        schema:'H3_P4_ASSET_WRITER_CONTROL_V1',
        action:'QUIESCE',
        before:before,
        after:existing.mode,
        quiesce_watermark:existing.quiesce_watermark,
        transition_watermark:existing.transition_watermark,
        fallback_trigger_count:existing.fallback_trigger_count,
        mutation_count:0,
        idempotent:true
      };
    }
    if(before!==H3_P4_ASSET_WRITER_DRIVE_PRIMARY_){
      throw new Error('P4_ASSET_WRITER_QUIESCE_PRECONDITION:'+before);
    }
    var watermark=new Date().toISOString();
    props.setProperties((function(){
      var x={};
      x[H3_P4_ASSET_WRITER_MODE_KEY_]=H3_P4_ASSET_WRITER_QUIESCED_;
      x[H3_P4_ASSET_WRITER_WATERMARK_KEY_]=watermark;
      x[H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_]=watermark;
      return x;
    })(),false);
    var after=h3P4AssetWriterStatus();
    if(
      after.mode!==H3_P4_ASSET_WRITER_QUIESCED_ ||
      after.quiesce_watermark!==watermark ||
      after.transition_watermark!==watermark
    )throw new Error('P4_ASSET_WRITER_QUIESCE_READBACK_MISMATCH');
    return{
      schema:'H3_P4_ASSET_WRITER_CONTROL_V1',
      action:'QUIESCE',
      before:before,
      after:after.mode,
      quiesce_watermark:watermark,
      transition_watermark:watermark,
      fallback_trigger_count:after.fallback_trigger_count,
      mutation_count:1,
      idempotent:false
    };
  }finally{
    lock.releaseLock();
  }
}

function h3P4AssetWriterSwitchToR2Primary(){
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    var props=PropertiesService.getScriptProperties();
    var before=h3P4AssetWriterMode_();
    var oldQuiesceWatermark=String(
      props.getProperty(H3_P4_ASSET_WRITER_WATERMARK_KEY_) || ''
    );
    var oldTransitionWatermark=String(
      props.getProperty(H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_) || ''
    );

    if(before===H3_P4_ASSET_WRITER_R2_PRIMARY_){
      var existing=h3P4AssetWriterStatus();
      return{
        schema:'H3_P4_ASSET_WRITER_CONTROL_V1',
        action:'SWITCH_R2_PRIMARY',
        before:before,
        after:existing.mode,
        quiesce_watermark:existing.quiesce_watermark,
        transition_watermark:existing.transition_watermark,
        previous_transition_watermark:oldTransitionWatermark,
        mutation_count:0,
        idempotent:true
      };
    }
    if(before!==H3_P4_ASSET_WRITER_QUIESCED_){
      throw new Error('P4_ASSET_WRITER_R2_PRIMARY_PRECONDITION:'+before);
    }
    if(!oldQuiesceWatermark){
      throw new Error('P4_ASSET_WRITER_R2_PRIMARY_QUIESCE_WATERMARK_MISSING');
    }

    var transitionWatermark=new Date().toISOString();
    props.setProperties((function(){
      var x={};
      x[H3_P4_ASSET_WRITER_MODE_KEY_]=H3_P4_ASSET_WRITER_R2_PRIMARY_;
      x[H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_]=transitionWatermark;
      return x;
    })(),false);

    var after=h3P4AssetWriterStatus();
    if(
      after.mode!==H3_P4_ASSET_WRITER_R2_PRIMARY_ ||
      after.quiesce_watermark!==oldQuiesceWatermark ||
      after.transition_watermark!==transitionWatermark
    )throw new Error('P4_ASSET_WRITER_R2_PRIMARY_READBACK_MISMATCH');

    return{
      schema:'H3_P4_ASSET_WRITER_CONTROL_V1',
      action:'SWITCH_R2_PRIMARY',
      before:before,
      after:after.mode,
      quiesce_watermark:after.quiesce_watermark,
      transition_watermark:after.transition_watermark,
      previous_transition_watermark:oldTransitionWatermark,
      mutation_count:1,
      idempotent:false
    };
  }finally{
    lock.releaseLock();
  }
}

function h3P4AssetWriterRequiesceFromR2Primary(){
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    var props=PropertiesService.getScriptProperties();
    var before=h3P4AssetWriterMode_();
    var previousQuiesceWatermark=String(
      props.getProperty(H3_P4_ASSET_WRITER_WATERMARK_KEY_) || ''
    );
    var previousTransitionWatermark=String(
      props.getProperty(H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_) || ''
    );
    if(before===H3_P4_ASSET_WRITER_QUIESCED_){
      var existing=h3P4AssetWriterStatus();
      return{
        schema:'H3_P4_ASSET_WRITER_CONTROL_V1',
        action:'REQUIESCE_R2_PRIMARY',
        before:before,
        after:existing.mode,
        quiesce_watermark:existing.quiesce_watermark,
        transition_watermark:existing.transition_watermark,
        previous_quiesce_watermark:previousQuiesceWatermark,
        previous_transition_watermark:previousTransitionWatermark,
        fallback_trigger_count:existing.fallback_trigger_count,
        mutation_count:0,
        idempotent:true
      };
    }
    if(before!==H3_P4_ASSET_WRITER_R2_PRIMARY_){
      throw new Error(
        'P4_ASSET_WRITER_REQUIESCE_PRECONDITION:'+before
      );
    }
    var watermark=new Date().toISOString();
    props.setProperties((function(){
      var x={};
      x[H3_P4_ASSET_WRITER_MODE_KEY_]=H3_P4_ASSET_WRITER_QUIESCED_;
      x[H3_P4_ASSET_WRITER_WATERMARK_KEY_]=watermark;
      x[H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_]=watermark;
      return x;
    })(),false);
    var after=h3P4AssetWriterStatus();
    if(
      after.mode!==H3_P4_ASSET_WRITER_QUIESCED_ ||
      after.quiesce_watermark!==watermark ||
      after.transition_watermark!==watermark
    )throw new Error(
      'P4_ASSET_WRITER_REQUIESCE_READBACK_MISMATCH'
    );
    return{
      schema:'H3_P4_ASSET_WRITER_CONTROL_V1',
      action:'REQUIESCE_R2_PRIMARY',
      before:before,
      after:after.mode,
      quiesce_watermark:watermark,
      transition_watermark:watermark,
      previous_quiesce_watermark:previousQuiesceWatermark,
      previous_transition_watermark:previousTransitionWatermark,
      fallback_trigger_count:after.fallback_trigger_count,
      mutation_count:1,
      idempotent:false
    };
  }finally{
    lock.releaseLock();
  }
}

function h3P4AssetWriterResumeDrivePrimary(){
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    var props=PropertiesService.getScriptProperties();
    var before=h3P4AssetWriterMode_();
    var oldWatermark=String(
      props.getProperty(H3_P4_ASSET_WRITER_WATERMARK_KEY_) || ''
    );
    var oldTransitionWatermark=String(
      props.getProperty(H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_) || ''
    );
    if(before===H3_P4_ASSET_WRITER_DRIVE_PRIMARY_){
      return{
        schema:'H3_P4_ASSET_WRITER_CONTROL_V1',
        action:'RESUME_DRIVE_PRIMARY',
        before:before,
        after:before,
        previous_quiesce_watermark:oldWatermark,
        transition_watermark:oldTransitionWatermark,
        previous_transition_watermark:oldTransitionWatermark,
        mutation_count:0,
        idempotent:true
      };
    }
    if(
      before!==H3_P4_ASSET_WRITER_QUIESCED_ &&
      before!==H3_P4_ASSET_WRITER_R2_PRIMARY_
    ){
      throw new Error('P4_ASSET_WRITER_RESUME_PRECONDITION:'+before);
    }

    var transitionWatermark=new Date().toISOString();
    props.setProperties((function(){
      var x={};
      x[H3_P4_ASSET_WRITER_MODE_KEY_]=H3_P4_ASSET_WRITER_DRIVE_PRIMARY_;
      x[H3_P4_ASSET_WRITER_TRANSITION_WATERMARK_KEY_]=transitionWatermark;
      return x;
    })(),false);
    props.deleteProperty(H3_P4_ASSET_WRITER_WATERMARK_KEY_);

    var after=h3P4AssetWriterStatus();
    if(
      after.mode!==H3_P4_ASSET_WRITER_DRIVE_PRIMARY_ ||
      after.quiesce_watermark!=='' ||
      after.transition_watermark!==transitionWatermark
    )throw new Error('P4_ASSET_WRITER_RESUME_READBACK_MISMATCH');

    return{
      schema:'H3_P4_ASSET_WRITER_CONTROL_V1',
      action:'RESUME_DRIVE_PRIMARY',
      before:before,
      after:after.mode,
      previous_quiesce_watermark:oldWatermark,
      transition_watermark:transitionWatermark,
      previous_transition_watermark:oldTransitionWatermark,
      mutation_count:1,
      idempotent:false
    };
  }finally{
    lock.releaseLock();
  }
}

function h3P4AssetSheetRows_(ss,name,required){
  var sheet=ss.getSheetByName(name);
  if(!sheet)throw new Error('P4_ASSET_SHEET_MISSING:'+name);
  var values=sheet.getDataRange().getDisplayValues();
  if(values.length<1)throw new Error('P4_ASSET_SHEET_EMPTY:'+name);
  var headers=values[0].map(String);
  var map={};
  headers.forEach(function(h,i){map[h]=i;});
  required.forEach(function(h){
    if(map[h]===undefined)throw new Error('P4_ASSET_HEADER_MISSING:'+name+':'+h);
  });
  return values.slice(1).map(function(row,index){
    var out={_row:index+2};
    headers.forEach(function(h,i){out[h]=String(row[i]===undefined?'':row[i]);});
    return out;
  });
}

function h3P4AssetJson_(raw,label){
  try{
    var value=JSON.parse(String(raw||''));
    if(!value || typeof value!=='object' || Array.isArray(value)){
      throw new Error('not object');
    }
    return value;
  }catch(e){
    throw new Error('P4_ASSET_JSON_INVALID:'+label);
  }
}

function h3P4AssetRequire_(value,label){
  var out=String(value||'');
  if(!out)throw new Error('P4_ASSET_REQUIRED_VALUE_MISSING:'+label);
  return out;
}

function h3P4AssetBindingSnapshot(){
  var props=PropertiesService.getScriptProperties();
  var reviewId=String(props.getProperty('REVIEW_AUDIO_SHEET_ID')||'');
  var k1Id=String(props.getProperty('K1_READY_SHEET_ID')||'');
  if(reviewId && k1Id && reviewId!==k1Id){
    throw new Error('P4_ASSET_SPREADSHEET_ID_MISMATCH');
  }
  var spreadsheetId=reviewId||k1Id;
  if(!spreadsheetId)throw new Error('P4_ASSET_SPREADSHEET_ID_MISSING');
  var ss=SpreadsheetApp.openById(spreadsheetId);

  var homes=h3P4AssetSheetRows_(
    ss,'review_home_index_v1',
    ['SET_ID','STATUS','SURFACE_FAMILY']
  );
  var reviewRows=h3P4AssetSheetRows_(
    ss,'review_audio_asset_v1',
    ['SURFACE_FAMILY','SET_ID','SLOT_KEY','AUDIO_TEXT_SHA256','AUDIO_FILE_ID','AUDIO_URL','STATUS']
  );
  var payloadRows=h3P4AssetSheetRows_(
    ss,'listening_set_payload_v1',
    ['LISTENING_SET_ID','STATUS','K1_READY_ID','AUDIO_BINDING_JSON']
  );
  var k1Rows=h3P4AssetSheetRows_(
    ss,'listening_k1_ready_v1',
    ['K1_READY_ID','STATUS','IMAGE_FILE_ID','IMAGE_URL','IMAGE_SHA256','BOUND_LISTENING_SET_ID']
  );

  var familyMap={
    '5W':'5W',
    '5L':'5L',
    'READING':'2R',
    'TRANSLATION':'2T'
  };
  var activeReviewKeys={};
  var active5L={};
  var activeHomeCount=0;
  homes.forEach(function(row){
    if(row.STATUS!=='ACTIVE')return;
    activeHomeCount++;
    var mapped=familyMap[row.SURFACE_FAMILY];
    if(!mapped)throw new Error('P4_ASSET_HOME_FAMILY_UNSUPPORTED:'+row.SURFACE_FAMILY);
    activeReviewKeys[mapped+'|'+row.SET_ID]=true;
    if(row.SURFACE_FAMILY==='5L')active5L[row.SET_ID]=true;
  });

  var entries=[];
  reviewRows.forEach(function(row){
    if(row.STATUS==='DONE_R2'){
      if(row.AUDIO_FILE_ID||row.AUDIO_URL){
        throw new Error(
          'P4_ASSET_R2_REVIEW_FAKE_DRIVE_BINDING:'+
          row.SURFACE_FAMILY+':'+row.SET_ID+':'+row.SLOT_KEY
        );
      }
      return;
    }
    if(row.STATUS!=='DONE')return;
    if(!activeReviewKeys[row.SURFACE_FAMILY+'|'+row.SET_ID])return;
    entries.push({
      binding_class:'REVIEW_AUDIO',
      source_table:'review_audio_asset_v1',
      source_row:row._row,
      source_binding_identity:{
        surface_family:h3P4AssetRequire_(row.SURFACE_FAMILY,'review.surface_family'),
        set_id:h3P4AssetRequire_(row.SET_ID,'review.set_id'),
        slot_key:h3P4AssetRequire_(row.SLOT_KEY,'review.slot_key')
      },
      source_file_id:h3P4AssetRequire_(row.AUDIO_FILE_ID,'review.audio_file_id'),
      source_url:h3P4AssetRequire_(row.AUDIO_URL,'review.audio_url'),
      source_semantic_hashes:{
        audio_text_sha256:h3P4AssetRequire_(row.AUDIO_TEXT_SHA256,'review.audio_text_sha256')
      },
      target:{
        asset_class:'review_audio',
        object_key_template:'v1/review_audio/sha256/{source_byte_sha256}'
      }
    });
  });

  var issued={};
  payloadRows.forEach(function(row){
    if(row.STATUS!=='ISSUED')return;
    var setId=h3P4AssetRequire_(row.LISTENING_SET_ID,'payload.set_id');
    if(!active5L[setId]){
      throw new Error('P4_ASSET_ISSUED_SET_NOT_ACTIVE_5L:'+setId);
    }
    issued[setId]=row;
    var binding=h3P4AssetJson_(row.AUDIO_BINDING_JSON,'payload.audio_binding_json');
    var individual=binding.individual;
    if(!individual || typeof individual!=='object' || Array.isArray(individual)){
      throw new Error('P4_ASSET_INDIVIDUAL_BINDING_INVALID:'+setId);
    }
    ['K1','K2','K3','K4','K5'].forEach(function(slot){
      var a=individual[slot];
      if(!a || typeof a!=='object'){
        throw new Error('P4_ASSET_INDIVIDUAL_SLOT_MISSING:'+setId+':'+slot);
      }
      var authority=String(a.storage_authority||'');
      if(authority==='CLOUDFLARE_R2_PRIVATE'){
        if(a.audio_file_id||a.audio_url){
          throw new Error(
            'P4_ASSET_R2_LISTENING_FAKE_DRIVE_BINDING:'+
            setId+':'+slot
          );
        }
        h3P4AssetRequire_(
          a.listen_gen_id,
          'individual.listen_gen_id'
        );
        h3P4AssetRequire_(
          a.payload_hash,
          'individual.payload_hash'
        );
        return;
      }
      if(authority && authority!=='GOOGLE_DRIVE'){
        throw new Error(
          'P4_ASSET_LISTENING_STORAGE_AUTHORITY_INVALID:'+
          setId+':'+slot
        );
      }
      entries.push({
        binding_class:'LISTENING_AUDIO_INDIVIDUAL',
        source_table:'listening_set_payload_v1',
        source_row:row._row,
        source_binding_identity:{
          set_id:setId,
          slot_key:slot,
          listen_gen_id:h3P4AssetRequire_(a.listen_gen_id,'individual.listen_gen_id')
        },
        source_file_id:h3P4AssetRequire_(a.audio_file_id,'individual.audio_file_id'),
        source_url:h3P4AssetRequire_(a.audio_url,'individual.audio_url'),
        source_semantic_hashes:{
          payload_hash:h3P4AssetRequire_(a.payload_hash,'individual.payload_hash')
        },
        target:{
          asset_class:'listening_audio_individual',
          object_key_template:'v1/listening_audio_individual/sha256/{source_byte_sha256}'
        }
      });
    });
    if(binding.combined && typeof binding.combined==='object'){
      var combined=binding.combined;
      if(combined.audio_file_id){
        entries.push({
          binding_class:'LISTENING_AUDIO_COMBINED',
          source_table:'listening_set_payload_v1',
          source_row:row._row,
          source_binding_identity:{
            set_id:setId,
            slot_key:'COMBINED',
            parent_set_id:h3P4AssetRequire_(combined.parent_set_id,'combined.parent_set_id')
          },
          source_file_id:h3P4AssetRequire_(combined.audio_file_id,'combined.audio_file_id'),
          source_url:h3P4AssetRequire_(combined.audio_url,'combined.audio_url'),
          source_semantic_hashes:{
            payload_hash:h3P4AssetRequire_(combined.payload_hash,'combined.payload_hash')
          },
          target:{
            asset_class:'listening_audio_combined',
            object_key_template:'v1/listening_audio_combined/sha256/{source_byte_sha256}'
          }
        });
      }
    }
  });

  var k1ById={};
  k1Rows.forEach(function(row){
    if(row.STATUS!=='CONSUMED')return;
    if(!issued[row.BOUND_LISTENING_SET_ID])return;
    k1ById[row.K1_READY_ID]=row;
  });
  Object.keys(issued).sort().forEach(function(setId){
    var payload=issued[setId];
    var readyId=h3P4AssetRequire_(payload.K1_READY_ID,'payload.k1_ready_id');
    var row=k1ById[readyId];
    if(!row || row.BOUND_LISTENING_SET_ID!==setId){
      throw new Error('P4_ASSET_K1_BINDING_MISSING:'+setId+':'+readyId);
    }
    entries.push({
      binding_class:'LISTENING_K1_IMAGE',
      source_table:'listening_k1_ready_v1',
      source_row:row._row,
      source_binding_identity:{
        k1_ready_id:readyId,
        bound_listening_set_id:setId
      },
      source_file_id:h3P4AssetRequire_(row.IMAGE_FILE_ID,'k1.image_file_id'),
      source_url:h3P4AssetRequire_(row.IMAGE_URL,'k1.image_url'),
      source_semantic_hashes:{
        image_sha256:h3P4AssetRequire_(row.IMAGE_SHA256,'k1.image_sha256')
      },
      target:{
        asset_class:'listening_k1_image',
        object_key_template:'v1/listening_k1_image/sha256/{source_byte_sha256}'
      }
    });
  });

  entries.sort(function(a,b){
    var ka=a.binding_class+'|'+JSON.stringify(a.source_binding_identity);
    var kb=b.binding_class+'|'+JSON.stringify(b.source_binding_identity);
    return ka<kb?-1:(ka>kb?1:0);
  });

  var counts={};
  entries.forEach(function(e){
    counts[e.binding_class]=(counts[e.binding_class]||0)+1;
  });

  return{
    schema:'H3_P4_ASSET_BINDING_SNAPSHOT_V1',
    source_authority:'GOOGLE_SHEETS_DRIVE',
    source_spreadsheet_id:spreadsheetId,
    captured_at:new Date().toISOString(),
    asset_writer_mode:h3P4AssetWriterMode_(),
    active_home_total:activeHomeCount,
    issued_listening_set_count:Object.keys(issued).length,
    active_binding_count:entries.length,
    binding_class_counts:counts,
    unmapped_active_binding_count:0,
    entries:entries,
    mutation_count:0
  };
}
