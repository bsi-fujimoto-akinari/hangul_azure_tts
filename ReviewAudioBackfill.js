var H3_REVIEW_AUDIO_ASSET_SHEET_='review_audio_asset_v1';
var H3_REVIEW_AUDIO_SCHEMA_='H3_REVIEW_AUDIO_ASSET_V1';
var H3_REVIEW_AUDIO_GENERATOR_VERSION_='review-audio-v2-1200ms';
var H3_REVIEW_AUDIO_BREAK_MS_=1200;
var H3_REVIEW_AUDIO_FILE_VERSION_='rv2_1200ms';
var H3_REVIEW_AUDIO_FOLDER_IDS_={
  '5W':'1dLf1KhHic8SU-4XOGueZSM55vznS024C',
  '2R':'18V3zOrKRhIgTCL_McrXjWDu6OIZupNn5',
  '2T':'1zRCRDdP3G6tpkyGHU619xYUf0dW1UsUv'
};
var H3_REVIEW_AUDIO_HEADERS_=[
  'SCHEMA','SURFACE_FAMILY','SET_ID','SLOT_KEY','SOURCE_REF_JSON',
  'SELECTION_JSON','AUDIO_TEXT','AUDIO_TEXT_SHA256','VOICE_ASSIGNMENT_JSON',
  'AUDIO_FILE_ID','AUDIO_URL','DRIVE_FOLDER_ID','STATUS','CREATED_AT',
  'UPDATED_AT','ERROR','GENERATOR_VERSION'
];
var H3_REVIEW_AUDIO_VOICES_=[
  {label:'Hyunsu',id:'ko-KR-HyunsuNeural',rate:'+20%'},
  {label:'InJoon',id:'ko-KR-InJoonNeural',rate:'+5%'},
  {label:'JiMin',id:'ko-KR-JiMinNeural',rate:'+0%'},
  {label:'YuJin',id:'ko-KR-YuJinNeural',rate:'+0%'}
];

function h3ReviewAudioRuntimeSpreadsheet_(){
  var p=PropertiesService.getScriptProperties();
  var id=p.getProperty('REVIEW_AUDIO_SHEET_ID')||p.getProperty('K1_READY_SHEET_ID')||'';
  if(!id)throw new Error('REVIEW_AUDIO_RUNTIME_SHEET_ID_MISSING');
  return SpreadsheetApp.openById(id);
}

function h3ReviewAudioNormalizeText_(text){
  return String(text||'')
    .replace(/\r\n?/g,'\n')
    .replace(/\s+[＊*]+[）)]?\s*[가-힣]+\s*[:：][^\n]*$/gm,'')
    .replace(/[＊*]+/g,'')
    .replace(/[ \t]+\n/g,'\n')
    .trim();
}

function h3ReviewAudioSha256_(text){
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text||''),
    Utilities.Charset.UTF_8
  ).map(function(b){
    return('0'+(((b+256)%256).toString(16))).slice(-2);
  }).join('');
}

function h3ReviewAudioParseJson_(value,code){
  try{return JSON.parse(String(value||''));}
  catch(_e){throw new Error(code);}
}

function h3ReviewAudioHeaderMap_(header){
  var map={};
  header.forEach(function(name,i){map[String(name)]=i;});
  return map;
}

function h3ReviewAudioTable_(sheet){
  if(!sheet)throw new Error('REVIEW_AUDIO_SHEET_MISSING');
  var r=sheet.getLastRow(),c=sheet.getLastColumn();
  if(r<1||c<1)throw new Error('REVIEW_AUDIO_EMPTY_SHEET:'+sheet.getName());
  var v=sheet.getRange(1,1,r,c).getDisplayValues();
  return{header:v[0],map:h3ReviewAudioHeaderMap_(v[0]),rows:v.slice(1)};
}

function h3ReviewAudioRequireHeaders_(sheet,expected){
  if(!sheet)throw new Error('REVIEW_AUDIO_REQUIRED_SHEET_MISSING');
  var actual=sheet.getRange(1,1,1,expected.length).getDisplayValues()[0];
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    throw new Error('REVIEW_AUDIO_HEADER_MISMATCH:'+sheet.getName());
  }
}

function h3ReviewAudioFindRowBySet_(sheet,setId,jsonColumn,statusColumn){
  var t=h3ReviewAudioTable_(sheet);
  var si=t.map.SET_ID,ji=t.map[jsonColumn],sti=t.map[statusColumn||'STATUS'];
  if(typeof si!=='number'||typeof ji!=='number'){
    throw new Error('REVIEW_AUDIO_SOURCE_COLUMNS_MISSING:'+sheet.getName());
  }
  var m=t.rows.filter(function(row){return String(row[si]||'')===String(setId||'');});
  if(m.length!==1)throw new Error('REVIEW_AUDIO_SOURCE_COUNT:'+sheet.getName()+':'+setId+':'+m.length);
  if(typeof sti==='number'&&String(m[0][sti]||'')!=='LOCKED'){
    throw new Error('REVIEW_AUDIO_SOURCE_NOT_LOCKED:'+sheet.getName()+':'+setId);
  }
  return{json:h3ReviewAudioParseJson_(m[0][ji],'REVIEW_AUDIO_SOURCE_JSON_INVALID:'+setId),row:m[0]};
}

function h3ReviewAudioExtractHangulLines_(text){
  return h3ReviewAudioNormalizeText_(text).split('\n')
    .map(function(x){return x.trim();})
    .filter(function(x){return/[가-힣]/.test(x)&&!/^[①②③④]/.test(x);});
}

function h3ReviewAudioFillBlank_(text,value){
  var s=String(text||''),re=/(\([ \t\u3000]*\)|（[ \t\u3000]*）)/;
  if(!re.test(s))throw new Error('REVIEW_AUDIO_BLANK_NOT_FOUND');
  return s.replace(re,String(value||'').trim());
}

function h3ReviewAudioStripSpeaker_(line){
  return String(line||'').replace(/^[^:：\n]{1,30}[:：][ \t]*/,'').trim();
}

function h3ReviewAudioLegacy5WScript_(q){
  var sec=String(q.section||''),correct=String(q.correct_answer_text||'').trim();
  var surface=String(q.question_surface||q.question_body||'');
  if(!correct)throw new Error('REVIEW_AUDIO_5W_CORRECT_TEXT_MISSING:'+sec);

  if(sec==='D2'||sec==='D3'){
    var a=h3ReviewAudioExtractHangulLines_(surface);
    if(!a.length)throw new Error('REVIEW_AUDIO_5W_BODY_MISSING:'+sec);
    return h3ReviewAudioNormalizeText_(h3ReviewAudioFillBlank_(a[0],correct));
  }

  if(sec==='D4'){
    var e=h3ReviewAudioExtractHangulLines_(q.explanation_text||'');
    if(e.length>=2)return h3ReviewAudioNormalizeText_(e.slice(0,2).join('\n'));
    var d=h3ReviewAudioExtractHangulLines_(surface);
    if(!d.length)throw new Error('REVIEW_AUDIO_5W_D4_ORIGINAL_MISSING');
    var original=d[0],br=/\[([^\]]+)\]/;
    if(br.test(original)){
      return h3ReviewAudioNormalizeText_(original+'\n'+original.replace(br,correct));
    }
    if(/[.!?。？！]$/.test(correct)){
      return h3ReviewAudioNormalizeText_(original+'\n'+correct);
    }
    throw new Error('REVIEW_AUDIO_5W_D4_REPLACEMENT_UNRESOLVED');
  }

  if(sec==='D5'){
    var b=h3ReviewAudioExtractHangulLines_(surface);
    if(b.length<2)throw new Error('REVIEW_AUDIO_5W_D5_SENTENCES_MISSING');
    return h3ReviewAudioNormalizeText_(b.slice(0,2).map(function(x){
      return h3ReviewAudioFillBlank_(x.replace(/^[・•]\s*/,''),correct);
    }).join('\n'));
  }

  if(sec==='D6'){
    var c=h3ReviewAudioNormalizeText_(surface).split('\n')
      .map(function(x){return x.trim();})
      .filter(function(x){return/^[ABＡＢ][：:]/.test(x);});
    if(c.length<2)throw new Error('REVIEW_AUDIO_5W_D6_DIALOGUE_MISSING');
    return h3ReviewAudioNormalizeText_(c.map(function(x){
      if(/[（(][ \t\u3000]*[）)]/.test(x))x=h3ReviewAudioFillBlank_(x,correct);
      return h3ReviewAudioStripSpeaker_(x);
    }).join('\n'));
  }
  throw new Error('REVIEW_AUDIO_5W_SECTION_UNSUPPORTED:'+sec);
}

function h3ReviewAudioCanonicalize5WScript_(q,sec,script){
  var s=h3ReviewAudioNormalizeText_(script);
  if(sec!=='D5')return s;

  var surface=q.question_surface||q.question_body||'';
  var body=typeof surface==='string'?
    surface:
    String((surface&&surface.body)||(surface&&surface.rendered)||q.question_body||'');
  var correct=String(q.correct_answer_text||'').trim();
  var lines=h3ReviewAudioExtractHangulLines_(body);

  if(lines.length>=2&&correct){
    return h3ReviewAudioNormalizeText_(lines.slice(0,2).map(function(x){
      return h3ReviewAudioFillBlank_(x.replace(/^[・•]\s*/,''),correct);
    }).join('\n'));
  }

  var split=s.replace(/([.!?。？！])\s+(?=[가-힣])/g,'$1\n');
  if(split.indexOf('\n')<0){
    throw new Error('REVIEW_AUDIO_5W_D5_CANONICAL_NEWLINE_UNRESOLVED');
  }
  return h3ReviewAudioNormalizeText_(split);
}

function h3ReviewAudioVoiceByLabel_(label){
  var v=H3_REVIEW_AUDIO_VOICES_.filter(function(x){return x.label===String(label||'');})[0];
  if(!v)throw new Error('REVIEW_AUDIO_VOICE_LABEL_INVALID:'+label);
  return v;
}

function h3ReviewAudioParse5WAssignment_(raw){
  var s=String(raw||'').trim();
  if(!s||s==='UNKNOWN')return null;
  var out={};
  s.split(',').forEach(function(part){
    var p=part.split('=');
    if(p.length===2)out[p[0].trim()]=p[1].trim();
  });
  ['Q1','Q2','Q3','Q4','Q5A','Q5B'].forEach(function(k){
    if(!out[k])throw new Error('REVIEW_AUDIO_5W_ASSIGNMENT_INVALID:'+k);
    h3ReviewAudioVoiceByLabel_(out[k]);
  });
  return out;
}

function h3ReviewAudioFallback5WAssignment_(setId){
  var d=h3ReviewAudioSha256_(setId);
  var off=parseInt(d.slice(0,8),16)%H3_REVIEW_AUDIO_VOICES_.length;
  var labels=H3_REVIEW_AUDIO_VOICES_.map(function(v){return v.label;});
  var r=labels.slice(off).concat(labels.slice(0,off));
  var q5a=r[parseInt(d.slice(8,16),16)%r.length];
  var q5b=r[(r.indexOf(q5a)+1+(parseInt(d.slice(16,24),16)%3))%r.length];
  return{Q1:r[0],Q2:r[1],Q3:r[2],Q4:r[3],Q5A:q5a,Q5B:q5b};
}

function h3ReviewAudio5WVoiceAssignment_(a,sec){
  var key={D2:'Q1',D3:'Q2',D4:'Q3',D5:'Q4'}[sec];
  if(key)return{primary:h3ReviewAudioVoiceByLabel_(a[key])};
  if(sec==='D6'){
    return{
      primary:h3ReviewAudioVoiceByLabel_(a.Q5A),
      sequence:[
        h3ReviewAudioVoiceByLabel_(a.Q5A),
        h3ReviewAudioVoiceByLabel_(a.Q5B),
        h3ReviewAudioVoiceByLabel_(a.Q5A)
      ]
    };
  }
  throw new Error('REVIEW_AUDIO_5W_SECTION_VOICE_INVALID:'+sec);
}

function h3ReviewAudioQueueAssignment_(setId){
  if(typeof h3WrittenQueueSpreadsheet_!=='function')return'';
  var q=h3WrittenQueueSpreadsheet_().getSheetByName('queue');
  var t=h3ReviewAudioTable_(q),si=t.map.SET_ID,ai=t.map.ASSIGNMENT;
  var m=t.rows.filter(function(row){return String(row[si]||'')===String(setId||'');});
  if(m.length>1)throw new Error('REVIEW_AUDIO_5W_QUEUE_DUPLICATE:'+setId);
  return m.length&&typeof ai==='number'?String(m[0][ai]||''):'';
}

function h3ReviewAudioPlan5W_(ss,setId){
  var current=ss.getSheetByName('written_review_payload_v1');
  var legacy=ss.getSheetByName('written_legacy_review_payload_v1');
  var payload=null,source='',rawAssignment='';

  if(current&&current.getLastRow()>1){
    var t=h3ReviewAudioTable_(current),si=t.map.SET_ID,ji=t.map.REVIEW_JSON,sti=t.map.STATUS;
    var m=t.rows.filter(function(row){return String(row[si]||'')===String(setId||'');});
    if(m.length===1){
      if(String(m[0][sti]||'')!=='LOCKED')throw new Error('REVIEW_AUDIO_5W_CURRENT_NOT_LOCKED:'+setId);
      payload=h3ReviewAudioParseJson_(m[0][ji],'REVIEW_AUDIO_5W_CURRENT_JSON_INVALID');
      source='written_review_payload_v1';
    }else if(m.length>1)throw new Error('REVIEW_AUDIO_5W_CURRENT_DUPLICATE:'+setId);
  }

  if(!payload){
    var l=h3ReviewAudioFindRowBySet_(legacy,setId,'RECONSTRUCTION_JSON','STATUS');
    payload=l.json;
    source='written_legacy_review_payload_v1';
    rawAssignment=String(payload.assignment||'');
  }

  if(!rawAssignment)rawAssignment=h3ReviewAudioQueueAssignment_(setId);
  var assignment=h3ReviewAudioParse5WAssignment_(rawAssignment)||
    h3ReviewAudioFallback5WAssignment_(setId);

  var qs=payload.sections||payload.questions||[];
  if(qs.length!==5)throw new Error('REVIEW_AUDIO_5W_QUESTION_COUNT:'+setId+':'+qs.length);

  return qs.map(function(q,i){
    var sec=String(q.section||('D'+(i+2)));
    var script=String(q.script_text||'').trim()||h3ReviewAudioLegacy5WScript_(q);
    script=h3ReviewAudioCanonicalize5WScript_(q,sec,script);
    return h3ReviewAudioPlanEntry_(
      '5W',setId,sec,script,
      {sheet:source,source_schema:payload.schema||payload.reconstruction_schema||'',section:sec,q_no:i+1},
      {mode:'5W_CANONICAL_SCRIPT'},
      h3ReviewAudio5WVoiceAssignment_(assignment,sec)
    );
  });
}

function h3ReviewAudioDecomposeSyllable_(ch){
  var code=ch.charCodeAt(0)-0xAC00;
  if(code<0||code>11171)return null;
  var initials=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var vowels=['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var finals=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  return{
    initial:initials[Math.floor(code/588)],
    vowel:vowels[Math.floor((code%588)/28)],
    final:finals[code%28]
  };
}

function h3ReviewAudioPronunciationSkills_(text){
  var tokens=String(text||'').match(/[가-힣]+/g)||[],skills=[],seen={};
  function add(code,label,weight,ti,si){
    var k=[code,ti,si].join(':');
    if(!seen[k]){
      seen[k]=true;
      skills.push({code:code,label:label,weight:weight,token_index:ti,syllable_index:si});
    }
  }
  tokens.forEach(function(token,ti){
    var chars=Array.from(token);
    chars.forEach(function(ch,i){
      var a=h3ReviewAudioDecomposeSyllable_(ch);
      var b=i+1<chars.length?h3ReviewAudioDecomposeSyllable_(chars[i+1]):null;
      if(!a)return;
      if(['ㄳ','ㄵ','ㄶ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅄ'].indexOf(a.final)>=0){
        add('COMPLEX_CODA','겹받침',3,ti,i);
      }
      if(!b)return;
      if(['ㄱ','ㄲ','ㅋ','ㄳ','ㄺ'].indexOf(a.final)>=0&&['ㄴ','ㅁ'].indexOf(b.initial)>=0){
        add('NASAL_G','비음화(ㄱ계열)',4,ti,i);
      }
      if(['ㄷ','ㅅ','ㅆ','ㅈ','ㅊ','ㅌ','ㅎ'].indexOf(a.final)>=0&&['ㄴ','ㅁ'].indexOf(b.initial)>=0){
        add('NASAL_D','비음화(ㄷ계열)',4,ti,i);
      }
      if(['ㅂ','ㅍ','ㅄ','ㄼ','ㄿ'].indexOf(a.final)>=0&&['ㄴ','ㅁ'].indexOf(b.initial)>=0){
        add('NASAL_B','비음화(ㅂ계열)',4,ti,i);
      }
      if(['ㅁ','ㅇ','ㄱ','ㅂ'].indexOf(a.final)>=0&&b.initial==='ㄹ'){
        add('R_TO_N','ㄹ의 비음화',4,ti,i);
      }
      if((a.final==='ㄴ'&&b.initial==='ㄹ')||(a.final==='ㄹ'&&b.initial==='ㄴ')){
        add('LIQUID','유음화',4,ti,i);
      }
      if(['ㄷ','ㅌ','ㄾ'].indexOf(a.final)>=0&&b.initial==='ㅇ'&&['ㅣ','ㅕ'].indexOf(b.vowel)>=0){
        add('PALATAL','구개음화',4,ti,i);
      }
      if((a.final==='ㅎ'||a.final==='ㄶ'||a.final==='ㅀ')&&['ㄱ','ㄷ','ㅈ'].indexOf(b.initial)>=0){
        add('H_ASPIRATION','ㅎ 축약/거센소리',4,ti,i);
      }
      if(['ㄱ','ㄷ','ㅂ','ㅈ'].indexOf(a.final)>=0&&b.initial==='ㅎ'){
        add('H_ASPIRATION_REVERSE','ㅎ과의 축약',4,ti,i);
      }
      if(['ㄱ','ㄲ','ㅋ','ㄳ','ㄺ','ㄷ','ㅅ','ㅆ','ㅈ','ㅊ','ㅌ','ㅎ','ㅂ','ㅍ','ㅄ','ㄼ','ㄿ'].indexOf(a.final)>=0&&
         ['ㄱ','ㄷ','ㅂ','ㅅ','ㅈ'].indexOf(b.initial)>=0){
        add('TENSIFICATION','된소리되기',2,ti,i);
      }
      if(a.final&&b.initial==='ㅇ'){
        add('LIAISON','연음',1,ti,i);
      }
    });
  });
  return skills;
}

function h3ReviewAudioChoicePronScore_(choice){
  var s=h3ReviewAudioPronunciationSkills_(choice.text||choice);
  return{
    position:Number(choice.position||0),
    text:String(choice.text||choice||''),
    skills:s,
    skill_count:s.length,
    importance_score:s.reduce(function(sum,x){return sum+x.weight;},0)
  };
}

function h3ReviewAudioReadingFillChoice_(q1){
  var choices=q1.choices_ko||((q1.question_surface||{}).choices||[]).map(function(c){return c.text;});
  if(!Array.isArray(choices)||choices.length!==4)throw new Error('REVIEW_AUDIO_2R_Q1_CHOICES_INVALID');

  var correct=Number(q1.correct_answer_position||q1.correct_answer||0);
  if(correct<1||correct>4)throw new Error('REVIEW_AUDIO_2R_Q1_CORRECT_POSITION_INVALID');

  var prompt=String(q1.question_text||((q1.question_surface||{}).body)||'');
  var negative=/適切でない|適切ではない/.test(prompt);

  if(!negative){
    return{
      mode:'CORRECT_CHOICE',
      position:correct,
      text:String(choices[correct-1]),
      pronunciation_candidates:[]
    };
  }

  var cand=choices.map(function(text,i){return{position:i+1,text:String(text)};})
    .filter(function(c){return c.position!==correct;})
    .map(h3ReviewAudioChoicePronScore_);

  cand.sort(function(a,b){
    if(b.importance_score!==a.importance_score)return b.importance_score-a.importance_score;
    if(b.skill_count!==a.skill_count)return b.skill_count-a.skill_count;
    return a.position-b.position;
  });

  if(!cand.length||cand[0].skill_count<1){
    throw new Error('REVIEW_AUDIO_2R_NEGATIVE_NO_PRON_SKILL');
  }

  return{
    mode:'APPROPRIATE_PRONUNCIATION_PRIORITY',
    position:cand[0].position,
    text:cand[0].text,
    pronunciation_candidates:cand
  };
}

function h3ReviewAudioDeterministicVoice_(family,setId,slotKey){
  var d=h3ReviewAudioSha256_([family,setId,slotKey].join('|'));
  return H3_REVIEW_AUDIO_VOICES_[parseInt(d.slice(0,8),16)%H3_REVIEW_AUDIO_VOICES_.length];
}

function h3ReviewAudioReadingPassagePrepared_(setId,passageText){
  var lines=h3ReviewAudioNormalizeText_(passageText).split('\n')
    .map(function(x){return x.trim();}).filter(Boolean);
  var speakers=[];
  lines.forEach(function(line){
    var m=/^([^:：\n]{1,30})[:：][ \t]*(.+)$/.exec(line);
    if(m&&/[가-힣]/.test(m[1])&&speakers.indexOf(m[1])<0)speakers.push(m[1]);
  });

  if(!speakers.length){
    return{
      text:lines.join('\n'),
      voice_assignment:{primary:h3ReviewAudioDeterministicVoice_('2R',setId,'PASSAGE_COMPLETE')}
    };
  }

  var d=h3ReviewAudioSha256_(setId+'|PASSAGE_SPEAKERS');
  var off=parseInt(d.slice(0,8),16)%H3_REVIEW_AUDIO_VOICES_.length;
  var map={};
  speakers.forEach(function(s,i){map[s]=H3_REVIEW_AUDIO_VOICES_[(off+i)%H3_REVIEW_AUDIO_VOICES_.length];});

  var spoken=[],seq=[];
  lines.forEach(function(line){
    var m=/^([^:：\n]{1,30})[:：][ \t]*(.+)$/.exec(line);
    if(m&&map[m[1]]){
      spoken.push(m[2].trim());
      seq.push(map[m[1]]);
    }else{
      spoken.push(line);
      seq.push(H3_REVIEW_AUDIO_VOICES_[off]);
    }
  });

  return{text:spoken.join('\n'),voice_assignment:{primary:seq[0],sequence:seq,speaker_map:map}};
}

function h3ReviewAudioPlan2R_(ss,setId){
  var src=h3ReviewAudioFindRowBySet_(
    ss.getSheetByName('reading_review_payload_v1'),setId,'REVIEW_JSON','STATUS'
  );
  var p=src.json;
  if(!p.passage||!String(p.passage.text_ko||'').trim())throw new Error('REVIEW_AUDIO_2R_PASSAGE_MISSING:'+setId);
  if(!Array.isArray(p.questions)||p.questions.length!==2)throw new Error('REVIEW_AUDIO_2R_QUESTION_COUNT:'+setId);

  var q1=p.questions[0],q2=p.questions[1];
  var sel=h3ReviewAudioReadingFillChoice_(q1);
  var passage=h3ReviewAudioFillBlank_(p.passage.text_ko,sel.text);
  var prepared=h3ReviewAudioReadingPassagePrepared_(setId,passage);
  var c1=(q1.choices_ko||[]).map(String),c2=(q2.choices_ko||[]).map(String);
  if(c1.length!==4||c2.length!==4)throw new Error('REVIEW_AUDIO_2R_CHOICES_INVALID:'+setId);

  var ref={
    sheet:'reading_review_payload_v1',
    review_schema:p.schema||'',
    passage_id:p.passage.passage_id||'',
    passage_sha256:p.passage.passage_sha256||''
  };

  return[
    h3ReviewAudioPlanEntry_('2R',setId,'PASSAGE_COMPLETE',prepared.text,ref,sel,prepared.voice_assignment),
    h3ReviewAudioPlanEntry_('2R',setId,'Q1_CHOICES',c1.join('\n'),
      {sheet:'reading_review_payload_v1',q_no:1,item_id:q1.item_id||'',passage_id:p.passage.passage_id||''},
      {mode:'ALL_CHOICES_JOINED',positions:[1,2,3,4]}),
    h3ReviewAudioPlanEntry_('2R',setId,'Q2_CHOICES',c2.join('\n'),
      {sheet:'reading_review_payload_v1',q_no:2,item_id:q2.item_id||'',passage_id:p.passage.passage_id||''},
      {mode:'ALL_CHOICES_JOINED',positions:[1,2,3,4]})
  ];
}

function h3ReviewAudioPlan2T_(ss,setId){
  var src=h3ReviewAudioFindRowBySet_(
    ss.getSheetByName('translation_review_payload_v1'),setId,'REVIEW_JSON','STATUS'
  );
  var p=src.json;
  if(!Array.isArray(p.questions)||p.questions.length!==2)throw new Error('REVIEW_AUDIO_2T_QUESTION_COUNT:'+setId);

  return p.questions.map(function(q){
    var sec=String(q.section||q.section_key||''),text='',sel={};
    if(sec==='P11'){
      text=String(q.question_text||'').trim();
      sel={mode:'P11_ORIGINAL_KOREAN'};
    }else if(sec==='P12'){
      var pos=Number(q.correct_answer||q.correct_answer_position||0);
      if(!Array.isArray(q.choices)||pos<1||pos>q.choices.length){
        throw new Error('REVIEW_AUDIO_2T_P12_CORRECT_CHOICE_INVALID:'+setId);
      }
      text=String(q.choices[pos-1]||'').trim();
      sel={mode:'P12_CORRECT_KOREAN_ONLY',position:pos};
    }else throw new Error('REVIEW_AUDIO_2T_SECTION_INVALID:'+sec);

    if(!/[가-힣]/.test(text))throw new Error('REVIEW_AUDIO_2T_KOREAN_TEXT_MISSING:'+setId+':'+sec);

    return h3ReviewAudioPlanEntry_(
      '2T',setId,sec+'_Q'+String(q.q_no||''),text,
      {sheet:'translation_review_payload_v1',q_no:q.q_no||null,section:sec,item_id:q.item_id||'',question_key:q.question_key||''},
      sel
    );
  });
}

function h3ReviewAudioPlanEntry_(family,setId,slotKey,audioText,sourceRef,selection,voiceAssignment){
  var t=h3ReviewAudioNormalizeText_(audioText);
  if(!t||!/[가-힣]/.test(t))throw new Error('REVIEW_AUDIO_TEXT_INVALID:'+family+':'+setId+':'+slotKey);
  var primary=h3ReviewAudioDeterministicVoice_(family,setId,slotKey);
  return{
    schema:H3_REVIEW_AUDIO_SCHEMA_,
    surface_family:family,
    set_id:String(setId),
    slot_key:String(slotKey),
    source_ref:sourceRef||{},
    selection:selection||{},
    audio_text:t,
    audio_text_sha256:h3ReviewAudioSha256_(t),
    voice_assignment:voiceAssignment||{primary:primary},
    drive_folder_id:H3_REVIEW_AUDIO_FOLDER_IDS_[family],
    generator_version:H3_REVIEW_AUDIO_GENERATOR_VERSION_
  };
}

function h3ReviewAudioPlanForSet_(ss,family,setId){
  if(family==='5W')return h3ReviewAudioPlan5W_(ss,setId);
  if(family==='2R')return h3ReviewAudioPlan2R_(ss,setId);
  if(family==='2T')return h3ReviewAudioPlan2T_(ss,setId);
  throw new Error('REVIEW_AUDIO_FAMILY_INVALID:'+family);
}

function h3ReviewAudioBuildHistoricalPlan_(){
  var ss=h3ReviewAudioRuntimeSpreadsheet_();
  var t=h3ReviewAudioTable_(ss.getSheetByName('review_home_index_v1'));
  var fi=t.map.SURFACE_FAMILY,si=t.map.SET_ID,sti=t.map.STATUS,sets=[];
  t.rows.forEach(function(row){
    if(String(row[sti]||'')!=='ACTIVE')return;
    var family=String(row[fi]||'');
    if(['5W','READING','TRANSLATION'].indexOf(family)<0)return;
    sets.push({
      family:family==='READING'?'2R':family==='TRANSLATION'?'2T':'5W',
      set_id:String(row[si]||'')
    });
  });

  var plan=[];
  sets.forEach(function(s){plan=plan.concat(h3ReviewAudioPlanForSet_(ss,s.family,s.set_id));});
  return{
    schema:'H3_REVIEW_AUDIO_BACKFILL_PLAN_V1',
    set_count:sets.length,
    asset_count:plan.length,
    counts:plan.reduce(function(a,x){
      a[x.surface_family]=(a[x.surface_family]||0)+1;
      return a;
    },{}),
    assets:plan
  };
}

function h3ReviewAudioSsml_(plan){
  var parts=plan.audio_text.split('\n').filter(Boolean);
  var primary=plan.voice_assignment.primary;
  var seq=Array.isArray(plan.voice_assignment.sequence)?
    plan.voice_assignment.sequence:
    parts.map(function(){return primary;});

  if(!primary||seq.length!==parts.length){
    throw new Error('REVIEW_AUDIO_VOICE_SEQUENCE_INVALID:'+plan.set_id+':'+plan.slot_key);
  }

  var body=parts.map(function(part,i){
    var v=seq[i]||primary;
    return'<voice name="'+v.id+'"><prosody rate="'+v.rate+'">'+
      escapeXml_(part)+'</prosody><break time="'+H3_REVIEW_AUDIO_BREAK_MS_+'ms"/></voice>';
  }).join('');

  return'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR">'+body+'</speak>';
}

function h3ReviewAudioAssetSheet_(ss){
  var s=ss.getSheetByName(H3_REVIEW_AUDIO_ASSET_SHEET_);
  h3ReviewAudioRequireHeaders_(s,H3_REVIEW_AUDIO_HEADERS_);
  return s;
}

function h3ReviewAudioFindAssetRow_(sheet,plan){
  var t=h3ReviewAudioTable_(sheet),fi=t.map.SURFACE_FAMILY,si=t.map.SET_ID,ki=t.map.SLOT_KEY,m=[];
  t.rows.forEach(function(row,i){
    if(String(row[fi]||'')===plan.surface_family&&String(row[si]||'')===plan.set_id&&String(row[ki]||'')===plan.slot_key){
      m.push({rowNumber:i+2,row:row,map:t.map});
    }
  });
  if(m.length>1)throw new Error('REVIEW_AUDIO_ASSET_DUPLICATE:'+plan.set_id+':'+plan.slot_key);
  return m.length?m[0]:null;
}

function h3ReviewAudioFilename_(plan){
  return plan.set_id+'__'+plan.slot_key+'__'+plan.audio_text_sha256.slice(0,12)+'__'+
    H3_REVIEW_AUDIO_FILE_VERSION_+'.mp3';
}

function h3ReviewAudioFileDescription_(plan){
  return 'H3_REVIEW_AUDIO_V2:'+H3_REVIEW_AUDIO_GENERATOR_VERSION_+':'+plan.audio_text_sha256;
}

function h3ReviewAudioExistingFile_(folder,plan){
  var name=h3ReviewAudioFilename_(plan),it=folder.getFilesByName(name),files=[];
  while(it.hasNext())files.push(it.next());
  if(files.length>1)throw new Error('REVIEW_AUDIO_MULTIPLE_FILES:'+name);
  if(!files.length)return null;

  var f=files[0];
  if(f.isTrashed()||f.getMimeType()!=='audio/mpeg'||f.getSize()<128){
    throw new Error('REVIEW_AUDIO_EXISTING_FILE_INVALID:'+name);
  }
  if(String(f.getDescription()||'')!==h3ReviewAudioFileDescription_(plan)){
    throw new Error('REVIEW_AUDIO_EXISTING_FILE_RENDER_MISMATCH:'+name);
  }
  return f;
}

function h3ReviewAudioCollapseWhitespace_(text){
  return String(text||'').replace(/\s+/g,' ').trim();
}

function h3ReviewAudioValidateStaleCanonical_(row,plan){
  var oldGen=String(row.row[row.map.GENERATOR_VERSION]||'');
  var oldStatus=String(row.row[row.map.STATUS]||'');
  if(oldStatus!=='DONE'||oldGen===H3_REVIEW_AUDIO_GENERATOR_VERSION_)return null;

  var oldHash=String(row.row[row.map.AUDIO_TEXT_SHA256]||'');
  var oldText=String(row.row[row.map.AUDIO_TEXT]||'');
  var sameText=oldHash===plan.audio_text_sha256 ||
    h3ReviewAudioCollapseWhitespace_(oldText)===h3ReviewAudioCollapseWhitespace_(plan.audio_text);
  if(!sameText){
    throw new Error('REVIEW_AUDIO_STALE_TEXT_MISMATCH:'+plan.set_id+':'+plan.slot_key);
  }

  var oldFolder=String(row.row[row.map.DRIVE_FOLDER_ID]||'');
  if(oldFolder!==plan.drive_folder_id){
    throw new Error('REVIEW_AUDIO_STALE_FOLDER_MISMATCH:'+plan.set_id+':'+plan.slot_key);
  }

  var oldFileId=String(row.row[row.map.AUDIO_FILE_ID]||'');
  if(!oldFileId)throw new Error('REVIEW_AUDIO_STALE_FILE_ID_MISSING:'+plan.set_id+':'+plan.slot_key);

  var f=DriveApp.getFileById(oldFileId);
  if(f.isTrashed()||f.getMimeType()!=='audio/mpeg'||f.getSize()<128){
    throw new Error('REVIEW_AUDIO_STALE_FILE_INVALID:'+plan.set_id+':'+plan.slot_key);
  }
  var parentIds=[],parents=f.getParents();
  while(parents.hasNext())parentIds.push(parents.next().getId());
  if(parentIds.indexOf(plan.drive_folder_id)<0){
    throw new Error('REVIEW_AUDIO_STALE_FILE_PARENT_MISMATCH:'+plan.set_id+':'+plan.slot_key);
  }

  if(oldGen==='review-audio-v1'){
    var expectedName=plan.set_id+'__'+plan.slot_key+'__'+oldHash.slice(0,12)+'.mp3';
    var expectedDescription='H3_REVIEW_AUDIO_V1:'+oldHash;
    if(f.getName()!==expectedName){
      throw new Error('REVIEW_AUDIO_STALE_FILENAME_MISMATCH:'+plan.set_id+':'+plan.slot_key);
    }
    if(String(f.getDescription()||'')!==expectedDescription){
      throw new Error('REVIEW_AUDIO_STALE_DESCRIPTION_MISMATCH:'+plan.set_id+':'+plan.slot_key);
    }
  }

  return{file:f,file_id:oldFileId,generator_version:oldGen,audio_text_sha256:oldHash};
}

function h3ReviewAudioWriteAssetRow_(sheet,rowNumber,plan,file,status,errorText,createdAt){
  var now=new Date().toISOString();
  sheet.getRange(rowNumber,1,1,H3_REVIEW_AUDIO_HEADERS_.length).setValues([[
    H3_REVIEW_AUDIO_SCHEMA_,
    plan.surface_family,
    plan.set_id,
    plan.slot_key,
    JSON.stringify(plan.source_ref),
    JSON.stringify(plan.selection),
    plan.audio_text,
    plan.audio_text_sha256,
    JSON.stringify(plan.voice_assignment),
    file?file.getId():'',
    file?file.getUrl():'',
    plan.drive_folder_id,
    status,
    createdAt||now,
    now,
    errorText||'',
    H3_REVIEW_AUDIO_GENERATOR_VERSION_
  ]]);
  SpreadsheetApp.flush();
}

function h3ReviewAudioGeneratePlannedAsset_(ss,plan){
  var sheet=h3ReviewAudioAssetSheet_(ss);
  var row=h3ReviewAudioFindAssetRow_(sheet,plan);
  var migration=null;

  if(row){
    var oldHash=String(row.row[row.map.AUDIO_TEXT_SHA256]||'');
    var oldStatus=String(row.row[row.map.STATUS]||'');
    var oldGen=String(row.row[row.map.GENERATOR_VERSION]||'');

    if(oldStatus==='DONE'&&oldGen===H3_REVIEW_AUDIO_GENERATOR_VERSION_){
      if(oldHash!==plan.audio_text_sha256){
        throw new Error('REVIEW_AUDIO_EXISTING_ROW_HASH_MISMATCH:'+plan.set_id+':'+plan.slot_key);
      }
      return{status:'NO_OP',set_id:plan.set_id,slot_key:plan.slot_key};
    }

    migration=h3ReviewAudioValidateStaleCanonical_(row,plan);
    if(!migration&&oldHash!==plan.audio_text_sha256){
      throw new Error('REVIEW_AUDIO_EXISTING_ROW_HASH_MISMATCH:'+plan.set_id+':'+plan.slot_key);
    }
  }

  var folder=DriveApp.getFolderById(plan.drive_folder_id);
  var file=h3ReviewAudioExistingFile_(folder,plan);
  var rowNumber=row?row.rowNumber:sheet.getLastRow()+1;
  var createdAt=row?String(row.row[row.map.CREATED_AT]||''):new Date().toISOString();

  if(!migration){
    h3ReviewAudioWriteAssetRow_(sheet,rowNumber,plan,file,'PREPARED','',createdAt);
  }

  try{
    if(!file){
      var blob=synthesize_(h3ReviewAudioSsml_(plan),config_());
      blob.setName(h3ReviewAudioFilename_(plan));
      file=folder.createFile(blob);
      file.setDescription(h3ReviewAudioFileDescription_(plan));
    }

    if(file.isTrashed()||file.getMimeType()!=='audio/mpeg'||file.getSize()<128){
      throw new Error('REVIEW_AUDIO_NEW_FILE_INVALID:'+plan.set_id+':'+plan.slot_key);
    }

    h3ReviewAudioWriteAssetRow_(sheet,rowNumber,plan,file,'DONE','',createdAt);

    if(migration){
      migration.file.setTrashed(true);
      if(!migration.file.isTrashed()){
        throw new Error('REVIEW_AUDIO_STALE_FILE_NOT_TRASHED:'+plan.set_id+':'+plan.slot_key);
      }
    }

    return{
      status:'DONE',
      family:plan.surface_family,
      set_id:plan.set_id,
      slot_key:plan.slot_key,
      file_id:file.getId(),
      audio_url:file.getUrl(),
      audio_text_sha256:plan.audio_text_sha256,
      generator_version:H3_REVIEW_AUDIO_GENERATOR_VERSION_,
      replaced_file_id:migration?migration.file_id:''
    };
  }catch(e){
    if(!migration){
      h3ReviewAudioWriteAssetRow_(
        sheet,rowNumber,plan,file,'ERROR',
        String(e&&e.message||e).slice(0,1000),createdAt
      );
    }
    throw e;
  }
}

function h3ReviewAudioGenerateSet_(family,setId){
  var ss=h3ReviewAudioRuntimeSpreadsheet_();
  return h3ReviewAudioPlanForSet_(ss,family,setId).map(function(p){
    return h3ReviewAudioGeneratePlannedAsset_(ss,p);
  });
}


function runReviewAudioPilotFamily1(){
  var selfCheck=h3ReviewAudioSelfCheck_();
  var targets=[
    {family:'5W',set_id:'H3-20260913-01'},
    {family:'2R',set_id:'H3-20260921-R001'},
    {family:'2T',set_id:'H3-20260921-T001'}
  ];
  var results=[];
  targets.forEach(function(target){
    var generated=h3ReviewAudioGenerateSet_(target.family,target.set_id);
    results.push({
      family:target.family,
      set_id:target.set_id,
      asset_count:generated.length,
      results:generated
    });
  });
  return{
    schema:'H3_REVIEW_AUDIO_PILOT_FAMILY1_V1',
    generated_at:new Date().toISOString(),
    target_count:targets.length,
    self_check:selfCheck,
    results:results
  };
}

function h3ReviewAudioSelfCheck_(){
  var p=h3ReviewAudioBuildHistoricalPlan_();
  if(p.set_count!==24||p.asset_count!==105){
    throw new Error('REVIEW_AUDIO_PLAN_COUNT_MISMATCH:'+p.set_count+':'+p.asset_count);
  }
  if(p.counts['5W']!==90||p.counts['2R']!==9||p.counts['2T']!==6){
    throw new Error('REVIEW_AUDIO_FAMILY_COUNT_MISMATCH:'+JSON.stringify(p.counts));
  }
  if(H3_REVIEW_AUDIO_BREAK_MS_!==1200){
    throw new Error('REVIEW_AUDIO_BREAK_MS_MISMATCH:'+H3_REVIEW_AUDIO_BREAK_MS_);
  }

  var seen={},d5Count=0;
  p.assets.forEach(function(a){
    var k=[a.surface_family,a.set_id,a.slot_key].join('|');
    if(seen[k])throw new Error('REVIEW_AUDIO_PLAN_DUPLICATE:'+k);
    seen[k]=true;
    if(h3ReviewAudioSha256_(a.audio_text)!==a.audio_text_sha256){
      throw new Error('REVIEW_AUDIO_PLAN_HASH_MISMATCH:'+k);
    }
    if(a.surface_family==='5W'&&a.slot_key==='D5'){
      d5Count++;
      if(a.audio_text.indexOf('\n')<0){
        throw new Error('REVIEW_AUDIO_D5_NEWLINE_MISSING:'+a.set_id);
      }
    }
  });
  if(d5Count!==18)throw new Error('REVIEW_AUDIO_D5_COUNT_MISMATCH:'+d5Count);

  var probe={
    set_id:'SELF_CHECK',
    slot_key:'BREAK',
    audio_text:'가\n나',
    voice_assignment:{primary:H3_REVIEW_AUDIO_VOICES_[0]}
  };
  var ssml=h3ReviewAudioSsml_(probe);
  var breaks=ssml.match(/<break time="1200ms"\/>/g)||[];
  if(breaks.length!==2||/0\.65s|650ms/.test(ssml)){
    throw new Error('REVIEW_AUDIO_RENDER_BREAK_CONTRACT_MISMATCH');
  }

  return{
    ok:true,
    set_count:p.set_count,
    asset_count:p.asset_count,
    counts:p.counts,
    d5_newline_count:d5Count,
    break_ms:H3_REVIEW_AUDIO_BREAK_MS_,
    generator_version:H3_REVIEW_AUDIO_GENERATOR_VERSION_
  };
}


