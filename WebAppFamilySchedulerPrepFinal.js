/**
 * S3 PREP final contract.
 *
 * Read-only normalization of Family Scheduler L/W/R/T preparation state.
 * This module never materializes preparation rows, issues learner sets,
 * submits answers, advances clocks/pointers, or generates semantic content.
 */

var H3_FS_PREP_FINAL_SCHEMA_ =
  'H3_FAMILY_SCHEDULER_PREP_FINAL_V1';
var H3_FS_PREP_FINAL_CONTRACT_ID_ =
  'H3-FAMILY-SCHEDULER-PREP-FINAL-20260924-V1';

function h3FsPrepFinalClassify_(
  readinessState,
  eligible,
  preparationStatus
) {
  var ready=String(readinessState||'');
  var prep=String(preparationStatus||'');

  if(eligible!==true){
    return {
      state:'BLOCKED',
      gate_state:'BLOCKED',
      deterministic_preparation_available:false,
      semantic_authoring_required:false
    };
  }
  if(ready==='READY'){
    return {
      state:'READY',
      gate_state:'ELIGIBLE',
      deterministic_preparation_available:false,
      semantic_authoring_required:false
    };
  }
  if(ready!=='PREPARE_REQUIRED'){
    throw new Error(
      'FAMILY_SCHEDULER_PREP_FINAL_READINESS_INVALID:'+
      (ready||'UNKNOWN')
    );
  }
  if(prep==='AUTHORING_REQUIRED'){
    return {
      state:'AUTHORING_REQUIRED',
      gate_state:'ELIGIBLE',
      deterministic_preparation_available:false,
      semantic_authoring_required:true
    };
  }
  if(
    prep==='READY_TO_PREPARE' ||
    prep==='PREPARE_REQUIRED'
  ){
    return {
      state:'PREPARE_REQUIRED',
      gate_state:'ELIGIBLE',
      deterministic_preparation_available:true,
      semantic_authoring_required:false
    };
  }
  throw new Error(
    'FAMILY_SCHEDULER_PREP_FINAL_PREPARATION_INVALID:'+
    (prep||'UNKNOWN')
  );
}

function h3FsPrepFinalListeningIdentity_(ss,prep) {
  var ls=h3FsKv_(ss,'listening_state_v1');
  var next=Number(ls.NEXT_LISTENING_SET_NO||0);
  var k1Id='';

  if(prep&&prep.request&&prep.request.k1_ready_id){
    k1Id=String(prep.request.k1_ready_id);
  } else if(prep&&prep.k1_ready_id){
    k1Id=String(prep.k1_ready_id);
  } else {
    var latest=h3FsLatestReadyK1_(ss);
    if(latest)k1Id=String(latest.id||'');
  }

  var out={
    kind:'LISTENING_COMPONENTS',
    next_listening_set_no:next,
    k1:null,
    k2_k5:null
  };

  if(k1Id){
    var k1=h3FsTable_(
      ss.getSheetByName('listening_k1_ready_v1')
    );
    h3FsRequire_(k1,[
      'K1_READY_ID','STATUS','IMAGE_SHA256',
      'QA_PROFILE','AUDIT_RESULT',
      'BOUND_LISTENING_SET_ID','CONSUMED_AT'
    ],'listening_k1_ready_v1');

    var k1Rows=k1.rows.filter(function(r){
      return String(r[k1.map.K1_READY_ID]||'')===k1Id;
    });
    if(k1Rows.length!==1){
      throw new Error(
        'FAMILY_SCHEDULER_PREP_FINAL_K1_IDENTITY_COUNT:'+
        k1Rows.length
      );
    }
    var kr=k1Rows[0];
    out.k1={
      k1_ready_id:k1Id,
      status:String(kr[k1.map.STATUS]||''),
      image_sha256:String(kr[k1.map.IMAGE_SHA256]||''),
      qa_profile:String(kr[k1.map.QA_PROFILE]||''),
      audit_result:String(kr[k1.map.AUDIT_RESULT]||'')
    };
  }

  var prestageId=
    prep&&prep.prestage_id
      ? String(prep.prestage_id)
      : '';
  var prestage=
    prestageId
      ? null
      : h3FsReadyListeningPrestage_(ss,next);
  if(!prestageId&&prestage){
    prestageId=String(prestage.id||'');
  }

  if(prestageId){
    var pt=h3FsTable_(
      ss.getSheetByName(H3_BACKEND_PRESTAGE_TAB)
    );
    h3FsRequire_(pt,[
      'PRESTAGE_ID','STATUS',
      'TARGET_LISTENING_SET_NO','POLICY_ID',
      'PRIMARY_POLICY_ID','SCHEDULER_SNAPSHOT_SHA256',
      'SOURCE_PROVENANCE_JSON','PRESTAGE_SHA256',
      'BOUND_LISTENING_SET_ID','CONSUMED_AT'
    ],H3_BACKEND_PRESTAGE_TAB);

    var pRows=pt.rows.filter(function(r){
      return String(r[pt.map.PRESTAGE_ID]||'')===prestageId;
    });
    if(pRows.length!==1){
      throw new Error(
        'FAMILY_SCHEDULER_PREP_FINAL_PRESTAGE_IDENTITY_COUNT:'+
        pRows.length
      );
    }
    var pr=pRows[0];
    out.k2_k5={
      prestage_id:prestageId,
      status:String(pr[pt.map.STATUS]||''),
      target_listening_set_no:Number(
        pr[pt.map.TARGET_LISTENING_SET_NO]||0
      ),
      policy_id:String(pr[pt.map.POLICY_ID]||''),
      primary_policy_id:String(
        pr[pt.map.PRIMARY_POLICY_ID]||''
      ),
      scheduler_snapshot_sha256:String(
        pr[pt.map.SCHEDULER_SNAPSHOT_SHA256]||''
      ),
      source_provenance_json:String(
        pr[pt.map.SOURCE_PROVENANCE_JSON]||''
      ),
      prestage_sha256:String(
        pr[pt.map.PRESTAGE_SHA256]||''
      )
    };
  }
  return out;
}

function h3FsPrepFinalReadingIdentity_(ss,prep) {
  var prepared=h3FsFindPreparedReading_(ss);
  if(prepared){
    return {
      kind:'READING_LOCKED_SOURCE',
      set_id:String(prepared.stage.set_id||''),
      section_key:String(prepared.stage.section_key||''),
      source_binding_sha256:String(
        prepared.stage.source_binding_sha256||''
      )
    };
  }

  if(prep&&String(prep.status||'')==='PREPARE_REQUIRED'){
    var gt=h3FsTable_(
      ss.getSheetByName(H3_FS_OFFICIAL_GROUP_SHEET_)
    );
    h3FsRequire_(gt,[
      'SECTION_KEY','SITE_GROUP_ID',
      'PASSAGE_SOURCE_SITE_ITEM_ID',
      'SOURCE_BATCH_ID','CONTENT_STATUS'
    ],H3_FS_OFFICIAL_GROUP_SHEET_);

    var groups=gt.rows.filter(function(row){
      return (
        String(row[gt.map.SECTION_KEY]||'')===
          String(prep.section_key||'') &&
        String(row[gt.map.SITE_GROUP_ID]||'')===
          String(prep.source_group_id||'')
      );
    });
    if(groups.length!==1){
      throw new Error(
        'FAMILY_SCHEDULER_PREP_FINAL_READING_SOURCE_COUNT:'+
        groups.length
      );
    }
    var g=groups[0];
    return {
      kind:'OFFICIAL_READING_GROUP',
      skill_id:String(prep.skill_id||''),
      section_key:String(prep.section_key||''),
      source_group_id:String(prep.source_group_id||''),
      passage_source_site_item_id:String(
        g[gt.map.PASSAGE_SOURCE_SITE_ITEM_ID]||''
      ),
      source_batch_id:String(
        g[gt.map.SOURCE_BATCH_ID]||''
      ),
      content_status:String(
        g[gt.map.CONTENT_STATUS]||''
      )
    };
  }

  return {
    kind:'READING_AUTHORING_TARGET',
    skill_id:String((prep&&prep.skill_id)||''),
    authoring_target:String(
      (prep&&prep.authoring_target)||''
    )
  };
}

function h3FsPrepFinalTranslationBindings_(ss,prep) {
  var selection=h3FsTranslationSelection_(ss);
  var used=h3FsTranslationUsed_(ss);
  var bindings=[];

  for(var i=0;i<selection.obligations.length;i++){
    var obligation=selection.obligations[i];
    var item=h3FsTranslationSourceForObligation_(
      ss,
      obligation,
      used
    );
    if(!item){
      throw new Error(
        'FAMILY_SCHEDULER_PREP_FINAL_TRANSLATION_SOURCE_MISSING:'+
        obligation.skill_id+':'+obligation.direction
      );
    }
    bindings.push({
      item_id:String(item.item_id||''),
      source_kind:String(item.source_kind||''),
      source_reference:String(item.source_reference||''),
      source_item_sha256:String(
        item.source_item_sha256||''
      ),
      surface_key:String(item.surface_key||'')
    });
    used.item_ids.push(item.item_id);
    used.item_map[item.item_id]=true;
    used.surface_keys.push(item.surface_key);
  }

  var previewIds=
    prep&&Array.isArray(prep.source_item_ids)
      ? prep.source_item_ids.map(String)
      : [];
  var bindingIds=bindings.map(function(x){
    return x.item_id;
  });
  if(
    previewIds.length!==bindingIds.length ||
    previewIds.some(function(id,index){
      return id!==bindingIds[index];
    })
  ){
    throw new Error(
      'FAMILY_SCHEDULER_PREP_FINAL_TRANSLATION_IDENTITY_DRIFT'
    );
  }
  return bindings;
}

function h3FsPrepFinalTranslationIdentity_(ss,prep) {
  var prepared=h3FsFindPreparedTranslation_(ss);
  if(prepared){
    return {
      kind:'TRANSLATION_LOCKED_SOURCE',
      set_id:String(prepared.stage.set_id||''),
      profile:String(prepared.stage.profile||''),
      source_binding_sha256:String(
        prepared.stage.source_binding_sha256||''
      )
    };
  }

  if(prep&&String(prep.status||'')==='PREPARE_REQUIRED'){
    return {
      kind:'TRANSLATION_SOURCE_SET',
      profile:String(prep.profile||''),
      skill_ids:prep.skill_ids||[],
      source_bindings:
        h3FsPrepFinalTranslationBindings_(ss,prep)
    };
  }

  return {
    kind:'TRANSLATION_AUTHORING_TARGET',
    skill_id:String((prep&&prep.skill_id)||''),
    translation_direction:String(
      (prep&&prep.translation_direction)||''
    ),
    authoring_target:String(
      (prep&&prep.authoring_target)||''
    )
  };
}

function h3FsPrepFinalSourceIdentity_(ss,family,prep) {
  if(family==='L'){
    return h3FsPrepFinalListeningIdentity_(ss,prep);
  }

  if(family==='W'){
    var prepared=h3FsFindPreparedWritten_(ss);
    if(prepared){
      return {
        kind:'WRITTEN_STAGE',
        stage_id:String(prepared.stage_id||''),
        approved_source:String(
          prepared.row[prepared.map.APPROVED_SOURCE]||''
        ),
        policy_id:String(
          prepared.row[prepared.map.POLICY_ID]||''
        ),
        source_snapshot_id:String(
          prepared.row[prepared.map.SOURCE_SNAPSHOT_ID]||''
        )
      };
    }

    var req=
      prep&&prep.authoring_request
        ? prep.authoring_request
        : null;
    return {
      kind:'WRITTEN_STAGE',
      stage_id:String((prep&&prep.stage_id)||''),
      approved_source:
        req?String(req.approved_source||''):'',
      policy_id:
        req?String(req.policy_id||''):'',
      source_snapshot_id:
        req?String(req.source_snapshot_id||''):''
    };
  }

  if(family==='R'){
    return h3FsPrepFinalReadingIdentity_(ss,prep);
  }
  if(family==='T'){
    return h3FsPrepFinalTranslationIdentity_(ss,prep);
  }

  throw new Error(
    'FAMILY_SCHEDULER_PREP_FINAL_FAMILY_INVALID:'+family
  );
}

function h3FsPrepFinalPreviewCore_(ss,level) {
  var readiness=h3FsReadiness_(ss);
  var families={};

  H3_FS_FAMILIES_.forEach(function(family){
    var current=readiness[family];
    if(!current){
      throw new Error(
        'FAMILY_SCHEDULER_PREP_FINAL_READINESS_MISSING:'+
        family
      );
    }

    var prep=null;
    if(
      current.eligible===true &&
      String(current.state||'')!=='READY'
    ){
      prep=h3FsAuthoringPreparationPreview_(ss,family);
    }

    var classified=h3FsPrepFinalClassify_(
      current.state,
      current.eligible===true,
      prep?prep.status:''
    );

    families[family]={
      family:family,
      state:classified.state,
      gate_state:classified.gate_state,
      eligible:current.eligible===true,
      readiness_state:String(current.state||''),
      preparation_status:
        prep?String(prep.status||''):'',
      readiness_reason:String(current.reason||''),
      deterministic_preparation_available:
        classified.deterministic_preparation_available,
      semantic_authoring_required:
        classified.semantic_authoring_required,
      source_identity:
        classified.state==='BLOCKED'
          ? {kind:'BLOCKED_GATE'}
          : h3FsPrepFinalSourceIdentity_(
              ss,
              family,
              prep
            )
    };
  });

  return {
    schema:H3_FS_PREP_FINAL_SCHEMA_,
    contract_id:H3_FS_PREP_FINAL_CONTRACT_ID_,
    mode:'READ_ONLY_PREVIEW',
    level:String(level),
    families:families,
    write_performed:false
  };
}

function h3FamilySchedulerPrepFinalPreview() {
  var ss=SpreadsheetApp.openById(
    H3_WEB_RUNTIME_SPREADSHEET_ID
  );
  return h3FsPrepFinalPreviewCore_(ss,'3級');
}
