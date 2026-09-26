// Deterministic static QA gate for future 5W authored explanations.
// Read-only. No AI/model calls. Historical stages bypass unchanged.

function h3FsWrittenExplQaPolicyBoundStage_(stageId) {
  var current=h3FsWrittenD5StageParts_(stageId);
  var activation=h3FsWrittenD5StageParts_(
    H3_FS_W_EXPL_QA_ACTIVATION_STAGE_
  );
  if(current.block_no!==activation.block_no){
    return current.block_no>activation.block_no;
  }
  return current.set_offset>=activation.set_offset;
}

function h3FsWrittenExplQaCanonical_(value) {
  var text=String(
    value===null||value===undefined ? '' : value
  );
  if(text.normalize)text=text.normalize('NFC');
  text=text.replace(new RegExp('\\r\\n?','g'),'\n');
  text=text.replace(new RegExp('\\s+','g'),' ').trim();
  text=text.replace(
    new RegExp('(?:\\s*[.!?。！？…])+\\s*$','g'),
    ''
  );
  return text.trim();
}

function h3FsWrittenExplQaExplanation_(question) {
  var q=question||{};
  if(
    q.review &&
    Object.prototype.toString.call(q.review)==='[object Object]'
  )return q.review;
  if(
    q.explanation &&
    Object.prototype.toString.call(q.explanation)==='[object Object]'
  )return q.explanation;
  return null;
}

function h3FsWrittenExplQaCorrectSurface_(question) {
  var q=question||{};
  if(String(q.answer_text||'').trim())return String(q.answer_text);
  if(
    q.qa_meta &&
    String(q.qa_meta.correct_choice_surface||'').trim()
  )return String(q.qa_meta.correct_choice_surface);
  if(
    q.source_gate &&
    Array.isArray(q.source_gate.choices_ko)
  ){
    var pos=Number(q.source_gate.correct_position||0);
    if(pos>=1&&pos<=q.source_gate.choices_ko.length){
      return String(q.source_gate.choices_ko[pos-1]||'');
    }
  }
  if(String(q.correct_answer_text||'').trim()){
    return String(q.correct_answer_text);
  }
  return '';
}

function h3FsWrittenExplQaCompletedSurface_(question) {
  var q=question||{};
  if(
    q.qa_meta &&
    String(q.qa_meta.completed_answer_surface||'').trim()
  )return String(q.qa_meta.completed_answer_surface);
  if(String(q.audio||'').trim())return String(q.audio);
  if(Array.isArray(q.audio_segments)&&q.audio_segments.length){
    return q.audio_segments.map(function(x){
      return String(x||'');
    }).join('\n');
  }
  if(String(q.script_text||'').trim())return String(q.script_text);
  return '';
}

function h3FsWrittenExplQaExamples_(explanation) {
  var out=[];
  var blocks=
    explanation&&Array.isArray(explanation.learning_blocks)
      ? explanation.learning_blocks
      : [];
  blocks.forEach(function(block,blockIndex){
    if(!block||typeof block!=='object')return;
    if(typeof block.example_ko==='string'){
      String(block.example_ko)
        .replace(new RegExp('\\r\\n?','g'),'\n')
        .split('\n')
        .map(function(x){return String(x||'').trim();})
        .filter(function(x){return !!x;})
        .forEach(function(text,lineIndex){
          out.push({
            text:text,
            field_path:
              'review.learning_blocks['+
              blockIndex+
              '].example_ko['+
              lineIndex+
              ']'
          });
        });
    }
    var tagged=
      block.qa_meta &&
      block.qa_meta.representative_example_ko;
    var values=Array.isArray(tagged)
      ? tagged
      : typeof tagged==='string'
        ? [tagged]
        : [];
    values.forEach(function(value,taggedIndex){
      var text=String(value||'').trim();
      if(!text)return;
      out.push({
        text:text,
        field_path:
          'review.learning_blocks['+
          blockIndex+
          '].qa_meta.representative_example_ko['+
          taggedIndex+
          ']'
      });
    });
  });
  return out;
}

function h3FsWrittenExplQaMetaTexts_(explanation) {
  var out=[];
  if(explanation&&typeof explanation.reason==='string'){
    out.push({
      text:explanation.reason,
      field_path:'review.reason'
    });
  }
  var blocks=
    explanation&&Array.isArray(explanation.learning_blocks)
      ? explanation.learning_blocks
      : [];
  blocks.forEach(function(block,index){
    if(!block||typeof block!=='object')return;
    ['usage','note'].forEach(function(key){
      if(typeof block[key]==='string'){
        out.push({
          text:block[key],
          field_path:
            'review.learning_blocks['+
            index+
            '].'+key
        });
      }
    });
  });
  return out;
}

function h3FsWrittenExplQaFinding_(code,qNo,path,detail) {
  return {
    code:String(code||''),
    q_no:Number(qNo||0),
    field_path:String(path||''),
    detail:detail||{}
  };
}

function h3FsWrittenExplQaPronValid_(block) {
  if(!block||block.type!=='pronunciation')return false;
  if(
    block.level_band!=='3급' &&
    block.level_band!=='준2급'
  )return false;
  return (
    !!String(block.skill_id||'').trim() &&
    !!String(block.surface||'').trim() &&
    !!String(block.actual||'').trim() &&
    h3FsWrittenExplQaCanonical_(block.surface)!==
      h3FsWrittenExplQaCanonical_(block.actual)
  );
}

function h3FsWrittenExplanationStaticQaEvaluatePrepared_(
  stageId,
  meta
) {
  if(!h3FsWrittenExplQaPolicyBoundStage_(stageId)){
    return {
      applied:false,
      contract_id:'',
      result:'PREPOLICY_BYPASS',
      hard_failures:[],
      hard_fail_codes:[]
    };
  }
  if(
    !meta ||
    !Array.isArray(meta.questions) ||
    meta.questions.length!==5
  ){
    throw new Error(
      'WRITTEN_EXPL_QA_AUTHORITY_INCOMPLETE:META'
    );
  }

  var hard=[];
  var validPronCount=0;
  var pronSeen={};
  var politeRe=new RegExp(
    '(?:です|ます|でした|ました)[。.!?！？](?:\\s|$)'
  );
  var learnerPatterns=[
    'あなたの回答','あなたが選んだ','あなたが選択した',
    '今回の回答','今回選んだ','正解できた','正解した',
    '不正解だった','間違えた','誤答した'
  ];
  var testPatterns=[
    'この設問では','この問題では','内容一致問題では',
    'タイトル選択では','消去法で','選択肢を消去'
  ];

  meta.questions.forEach(function(question,index){
    var qNo=Number(question.q||question.q_no||index+1);
    var explanation=h3FsWrittenExplQaExplanation_(question);
    var correct=h3FsWrittenExplQaCorrectSurface_(question);
    var completed=h3FsWrittenExplQaCompletedSurface_(question);
    if(
      !explanation ||
      !h3FsWrittenExplQaCanonical_(correct) ||
      !h3FsWrittenExplQaCanonical_(completed)
    ){
      throw new Error(
        'WRITTEN_EXPL_QA_AUTHORITY_INCOMPLETE:'+qNo
      );
    }

    var answers=[
      {kind:'correct_choice',value:correct},
      {kind:'completed_answer',value:completed}
    ];

    h3FsWrittenExplQaExamples_(explanation).forEach(
      function(example){
        var normalized=
          h3FsWrittenExplQaCanonical_(example.text);
        answers.forEach(function(answer){
          if(
            normalized &&
            normalized===
              h3FsWrittenExplQaCanonical_(answer.value)
          ){
            hard.push(
              h3FsWrittenExplQaFinding_(
                'EXPL_EXAMPLE_EXACT_ANSWER_DUPLICATE',
                qNo,
                example.field_path,
                {
                  matched_kind:answer.kind,
                  normalized_example:normalized,
                  matched_answer_surface:
                    h3FsWrittenExplQaCanonical_(answer.value)
                }
              )
            );
          }
        });
      }
    );

    h3FsWrittenExplQaMetaTexts_(explanation).forEach(
      function(entry){
        learnerPatterns.forEach(function(pattern){
          if(String(entry.text).indexOf(pattern)>=0){
            hard.push(
              h3FsWrittenExplQaFinding_(
                'EXPL_LEARNER_ANSWER_META_FORBIDDEN',
                qNo,
                entry.field_path,
                {pattern:pattern}
              )
            );
          }
        });
        testPatterns.forEach(function(pattern){
          if(String(entry.text).indexOf(pattern)>=0){
            hard.push(
              h3FsWrittenExplQaFinding_(
                'EXPL_GENERIC_TEST_META_FORBIDDEN',
                qNo,
                entry.field_path,
                {pattern:pattern}
              )
            );
          }
        });
        if(politeRe.test(String(entry.text))){
          hard.push(
            h3FsWrittenExplQaFinding_(
              'EXPL_META_POLITE_REGISTER',
              qNo,
              entry.field_path,
              {matched:'sentence_final_polite'}
            )
          );
        }
      }
    );

    var blocks=Array.isArray(explanation.learning_blocks)
      ? explanation.learning_blocks
      : [];
    blocks.forEach(function(block,blockIndex){
      if(!block||typeof block!=='object')return;
      var basePath=
        'review.learning_blocks['+blockIndex+']';

      if(block.type==='hanja_network'){
        var target=block.target||{};
        var targetWord=String(target.word||'');
        var tw=targetWord.split('');
        var th=String(target.hanja||'').split('');
        var invalidStructure=!tw.length||!th.length;
        var related=Array.isArray(block.related)
          ? block.related
          : [];
        var homophone=Array.isArray(block.homophone)
          ? block.homophone
          : [];

        related.forEach(function(entry,relIndex){
          var ew=String(entry&&entry.word||'').split('');
          var eh=String(entry&&entry.hanja||'').split('');
          var ti=Number(entry&&entry.target_char_index);
          var ei=Number(entry&&entry.example_char_index);
          var field=
            basePath+'.related['+relIndex+']';
          if(
            !ew.length||!eh.length||
            !Number.isInteger(ti)||
            !Number.isInteger(ei)||
            ti<0||ti>=th.length||
            ei<0||ei>=eh.length
          ){
            invalidStructure=true;
            return;
          }
          if(
            targetWord &&
            String(entry.word||'').indexOf(targetWord)>=0
          ){
            hard.push(
              h3FsWrittenExplQaFinding_(
                'EXPL_HANJA_TARGET_CONTAINING_RELATED',
                qNo,
                field,
                {
                  target_word:targetWord,
                  related_word:String(entry.word||'')
                }
              )
            );
          }
          if(th[ti]!==eh[ei]){
            hard.push(
              h3FsWrittenExplQaFinding_(
                'EXPL_HANJA_RELATED_RELATION_INVALID',
                qNo,
                field,
                {
                  target_char:th[ti],
                  related_char:eh[ei]
                }
              )
            );
          }
        });

        homophone.forEach(function(entry,homIndex){
          var ew=String(entry&&entry.word||'').split('');
          var eh=String(entry&&entry.hanja||'').split('');
          var ti=Number(entry&&entry.target_syllable_index);
          var ei=Number(entry&&entry.example_syllable_index);
          var field=
            basePath+'.homophone['+homIndex+']';
          if(
            !ew.length||!eh.length||
            !Number.isInteger(ti)||
            !Number.isInteger(ei)||
            ti<0||ti>=tw.length||ti>=th.length||
            ei<0||ei>=ew.length||ei>=eh.length
          ){
            invalidStructure=true;
            return;
          }
          if(tw[ti]!==ew[ei]||th[ti]===eh[ei]){
            hard.push(
              h3FsWrittenExplQaFinding_(
                'EXPL_HANJA_HOMOPHONE_RELATION_INVALID',
                qNo,
                field,
                {
                  target_syllable:tw[ti],
                  example_syllable:ew[ei],
                  target_hanja:th[ti],
                  example_hanja:eh[ei]
                }
              )
            );
          }
        });

        if(invalidStructure){
          hard.push(
            h3FsWrittenExplQaFinding_(
              'EXPL_HANJA_STRUCTURE_INVALID',
              qNo,
              basePath,
              {
                reason:
                  'missing/invalid target or relation indexes'
              }
            )
          );
        }
      }

      if(block.type==='pronunciation'){
        var key=
          String(block.skill_id||'')+
          '||'+
          h3FsWrittenExplQaCanonical_(block.surface);
        var valid=h3FsWrittenExplQaPronValid_(block);
        if(!valid||pronSeen[key]){
          hard.push(
            h3FsWrittenExplQaFinding_(
              'EXPL_PRON_STRUCTURE_INVALID',
              qNo,
              basePath,
              {
                reason:!valid
                  ? 'required field/level/surface-actual invariant failed'
                  : 'duplicate skill_id+surface'
              }
            )
          );
        } else {
          pronSeen[key]=true;
          validPronCount++;
        }
      }
    });
  });

  if(validPronCount===0){
    hard.push(
      h3FsWrittenExplQaFinding_(
        'EXPL_PRON_COVERAGE_MISSING',
        0,
        'questions',
        {valid_pronunciation_blocks:0}
      )
    );
  }

  hard.sort(function(a,b){
    var ak=[
      String(a.q_no).padStart(5,'0'),
      a.field_path,
      a.code,
      JSON.stringify(a.detail)
    ].join('||');
    var bk=[
      String(b.q_no).padStart(5,'0'),
      b.field_path,
      b.code,
      JSON.stringify(b.detail)
    ].join('||');
    return ak<bk?-1:ak>bk?1:0;
  });

  var map={};
  var codes=[];
  hard.forEach(function(item){
    if(map[item.code])return;
    map[item.code]=true;
    codes.push(item.code);
  });
  codes.sort();

  return {
    applied:true,
    contract_id:H3_FS_W_EXPL_QA_CONTRACT_ID_,
    result:hard.length?'HARD_FAIL':'PASS',
    hard_failures:hard,
    hard_fail_codes:codes
  };
}

function h3FsWrittenExplanationStaticQaValidatePrepared_(
  stageId,
  meta
) {
  var result=
    h3FsWrittenExplanationStaticQaEvaluatePrepared_(
      stageId,
      meta
    );
  if(
    result.applied===true &&
    result.result!=='PASS'
  ){
    throw new Error(
      'WRITTEN_EXPL_QA_HARD_FAIL:'+
      result.hard_fail_codes.join(',')
    );
  }
  return result;
}
