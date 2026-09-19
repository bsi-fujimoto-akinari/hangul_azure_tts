/**
 * Frozen R3-01B non-learning fixture.
 * Source: H3_L5E2E_R2_05_SYSTEM_TEST_FIXTURE_v1.txt
 */

var H3_WEB_SYSTEM_TEST_FIXTURE = {
  set_id: 'SYSTEM_TEST-H3-L5E2E-R2-20260919-01',
  source_set_reference: 'H3-20260919-L02',
  canonical_render_version: 'H3-LISTENING-RENDER-RULES-20260919-V16',
  surface_contract_id: 'H3-L5E2E-R2-SURFACE-CONTRACT-20260919-V1',
  expected_vector: ['3', '2?', '3', '2', '3'],
  expected_results: ['○', '△', '×', '×', '○'],
  web_audio_skip_start_ms: 5000,
  combined_audio_file_id: '18yA11jUMjSOmwJiO_p4Imt5v8xYnC93p',
  combined_audio_url: 'https://drive.google.com/file/d/18yA11jUMjSOmwJiO_p4Imt5v8xYnC93p/view?usp=drivesdk',
  review_script_file_id: '11MuPzLBqUWywjIZj-EOQhvKpLbBB7ePL',
  review_script_url: 'https://drive.google.com/file/d/11MuPzLBqUWywjIZj-EOQhvKpLbBB7ePL/view?usp=drivesdk',
  questions: [
    {
      section: 'K1',
      display: '[聞1/絵]',
      answer_key: 3,
      audio_file_id: '1G0EPlkQGRHRJVA1r31OV4PIMFuB0vsiz',
      audio_url: 'https://drive.google.com/file/d/1G0EPlkQGRHRJVA1r31OV4PIMFuB0vsiz/view?usp=drivesdk',
      image_file_id: '1L0gr8SrxOKLtbnAxKfEwY-WsqQual782',
      image_url: 'https://drive.google.com/file/d/1L0gr8SrxOKLtbnAxKfEwY-WsqQual782/view?usp=drivesdk',
      image_sha256: '61f2de44bc7bc11bac54cf6b03f14940c0349c4871544351168530f584fba347',
      visible_choices: null
    },
    {
      section: 'K2',
      display: '[聞2/一致]',
      answer_key: 2,
      audio_file_id: '1sA2hZzlKIKoJJXTNeuPwG0vLyvy9vTBh',
      audio_url: 'https://drive.google.com/file/d/1sA2hZzlKIKoJJXTNeuPwG0vLyvy9vTBh/view?usp=drivesdk',
      visible_choices: null
    },
    {
      section: 'K3',
      display: '[聞3/応答]',
      answer_key: 2,
      audio_file_id: '1s5snCIO9KyfJ7Yaq8J0qOgU5_GCZ3oDn',
      audio_url: 'https://drive.google.com/file/d/1s5snCIO9KyfJ7Yaq8J0qOgU5_GCZ3oDn/view?usp=drivesdk',
      visible_choices: null
    },
    {
      section: 'K4',
      display: '[聞4/一致]',
      answer_key: 3,
      audio_file_id: '1v2Ww3KionnpwZbopwb_YOJiwmqLzAnLI',
      audio_url: 'https://drive.google.com/file/d/1v2Ww3KionnpwZbopwb_YOJiwmqLzAnLI/view?usp=drivesdk',
      visible_choices: [
        'ミンスさんは今、会社まで歩いて10分です。',
        '新しい家は今の家より会社から遠いです。',
        '引っ越したら朝は少し遅く起きてもよさそうです。',
        'ミンスさんは来月会社を辞める予定です。'
      ]
    },
    {
      section: 'K5',
      display: '[聞5/一致]',
      answer_key: 3,
      audio_file_id: '1YgYBBICtIvv19n-H-lodikiQacbbJZQA',
      audio_url: 'https://drive.google.com/file/d/1YgYBBICtIvv19n-H-lodikiQacbbJZQA/view?usp=drivesdk',
      visible_choices: [
        '행사는 금요일 오전 열 시에 시작합니다.',
        '참가하려면 돈을 내야 합니다.',
        '어린이를 위한 책 읽기 행사입니다.',
        '자리가 많아서 신청하지 않아도 됩니다.'
      ]
    }
  ]
};

function validateSystemTestRenderRequest_(request) {
  if (!request || request.schema !== 'H3_WEB_RENDER_REQUEST_V1') {
    throw new Error('INVALID_RENDER_SCHEMA');
  }
  if (request.mode !== 'SYSTEM_TEST') {
    throw new Error('R3_01_SYSTEM_TEST_ONLY');
  }
  if (request.set_id !== H3_WEB_SYSTEM_TEST_FIXTURE.set_id) {
    throw new Error('SYSTEM_TEST_SET_NOT_ALLOWLISTED');
  }
}

function buildSystemTestRenderPayload_() {
  var f = H3_WEB_SYSTEM_TEST_FIXTURE;
  var k1 = f.questions[0];
  var image = h3DriveDataUri_(k1.image_file_id, 'image/jpeg', k1.image_sha256, 1024 * 1024);

  var questions = f.questions.map(function (q) {
    return {
      section: q.section,
      display: q.display,
      audio_asset_key: q.section,
      audio_fallback_url: q.audio_url,
      choice_ids: [1, 2, 3, 4],
      visible_choices: q.visible_choices
    };
  });

  questions[0].image_data_uri = image.data_uri;
  questions[0].image_sha256 = k1.image_sha256;
  questions[0].image_size_bytes = image.size_bytes;

  return {
    schema: 'H3_WEB_SET_V1',
    mode: 'SYSTEM_TEST',
    nonlearning: true,
    persisted: false,
    set_id: f.set_id,
    source_set_reference: f.source_set_reference,
    canonical_render_version: f.canonical_render_version,
    surface_contract_id: f.surface_contract_id,
    transport: {
      audio: 'APPS_SCRIPT_LAZY_DATA_URI',
      image: 'APPS_SCRIPT_INLINE_EXACT_SHA256_VERIFIED',
      review: 'POSTGRADE_INLINE_SCRIPT_LAZY_AUDIO'
    },
    questions: questions
  };
}

function getSystemTestMediaPayload_(request) {
  if (!request || request.schema !== 'H3_WEB_MEDIA_REQUEST_V1') {
    throw new Error('INVALID_MEDIA_SCHEMA');
  }
  if (request.mode !== 'SYSTEM_TEST') {
    throw new Error('R3_01_SYSTEM_TEST_ONLY');
  }
  if (request.set_id !== H3_WEB_SYSTEM_TEST_FIXTURE.set_id) {
    throw new Error('SYSTEM_TEST_SET_NOT_ALLOWLISTED');
  }

  var assetKey = String(request.asset_key || '');
  var fileId = null;
  var fallbackUrl = null;

  if (assetKey === 'COMBINED') {
    fileId = H3_WEB_SYSTEM_TEST_FIXTURE.combined_audio_file_id;
    fallbackUrl = H3_WEB_SYSTEM_TEST_FIXTURE.combined_audio_url;
  } else {
    H3_WEB_SYSTEM_TEST_FIXTURE.questions.forEach(function (q) {
      if (q.section === assetKey) {
        fileId = q.audio_file_id;
        fallbackUrl = q.audio_url;
      }
    });
  }

  if (!fileId) {
    throw new Error('MEDIA_ASSET_NOT_ALLOWLISTED');
  }

  var media = h3DriveDataUri_(fileId, 'audio/mpeg', null, 8 * 1024 * 1024);
  return {
    schema: 'H3_WEB_MEDIA_V1',
    set_id: H3_WEB_SYSTEM_TEST_FIXTURE.set_id,
    asset_key: assetKey,
    data_uri: media.data_uri,
    mime_type: media.mime_type,
    size_bytes: media.size_bytes,
    trim_start_ms: H3_WEB_SYSTEM_TEST_FIXTURE.web_audio_skip_start_ms,
    fallback_url: fallbackUrl
  };
}

function parseSystemTestReviewSections_(text) {
  var normalized = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim();

  var markerRegex = /^\[聞([1-5])\/([^\]]+)\]\s*$/gm;
  var markers = [];
  var match;

  while ((match = markerRegex.exec(normalized)) !== null) {
    markers.push({
      number: Number(match[1]),
      label: match[0].trim(),
      index: match.index,
      content_start: markerRegex.lastIndex
    });
  }

  if (markers.length !== 5) {
    throw new Error('REVIEW_SCRIPT_SECTION_COUNT_MISMATCH');
  }

  return markers.map(function (marker, i) {
    if (marker.number !== i + 1) {
      throw new Error('REVIEW_SCRIPT_SECTION_ORDER_MISMATCH');
    }

    var nextIndex =
      i + 1 < markers.length
        ? markers[i + 1].index
        : normalized.length;

    var scriptText = normalized
      .slice(marker.content_start, nextIndex)
      .trim();

    if (!scriptText) {
      throw new Error('REVIEW_SCRIPT_SECTION_EMPTY:K' + marker.number);
    }

    return {
      section: 'K' + marker.number,
      display: marker.label,
      script_text: scriptText
    };
  });
}

function buildSystemTestReviewPayload_() {
  var f = H3_WEB_SYSTEM_TEST_FIXTURE;
  var scriptText = h3DriveUtf8Text_(f.review_script_file_id, 100000);
  var parsed = parseSystemTestReviewSections_(scriptText);

  return {
    sections: parsed.map(function (part, i) {
      var q = f.questions[i];
      if (part.section !== q.section) {
        throw new Error('REVIEW_SCRIPT_FIXTURE_SECTION_MISMATCH');
      }

      return {
        section: part.section,
        display: part.display,
        audio_asset_key: q.section,
        audio_fallback_url: q.audio_url,
        script_text: part.script_text
      };
    }),
    review_script_fallback_url: f.review_script_url
  };
}

function gradeSystemTestSubmission_(request) {
  if (!request || request.schema !== 'H3_WEB_SUBMIT_V1') {
    throw new Error('INVALID_SUBMIT_SCHEMA');
  }
  if (request.mode !== 'SYSTEM_TEST') {
    throw new Error('R3_01_SYSTEM_TEST_ONLY');
  }
  if (request.set_id !== H3_WEB_SYSTEM_TEST_FIXTURE.set_id) {
    throw new Error('SYSTEM_TEST_SET_NOT_ALLOWLISTED');
  }
  if (!Array.isArray(request.answers) || request.answers.length !== 5) {
    throw new Error('ANSWERS_MUST_BE_EXACTLY_5');
  }

  var expectedSections = ['K1', 'K2', 'K3', 'K4', 'K5'];
  var keys = H3_WEB_SYSTEM_TEST_FIXTURE.questions.map(function (q) { return q.answer_key; });
  var normalized = request.answers.map(function (a, i) {
    if (!a || a.section !== expectedSections[i]) throw new Error('SECTION_ORDER_MISMATCH');
    if (typeof a.answer !== 'number' || a.answer < 1 || a.answer > 4 || a.answer % 1 !== 0) {
      throw new Error('ANSWER_OUT_OF_RANGE');
    }
    if (typeof a.uncertain !== 'boolean') throw new Error('UNCERTAIN_MUST_BE_BOOLEAN');
    return { section: a.section, answer: a.answer, uncertain: a.uncertain };
  });

  var score = 0;
  var summary = normalized.map(function (a, i) {
    var correct = a.answer === keys[i];
    if (correct) score += 1;
    var result = correct ? (a.uncertain ? '△' : '○') : '×';
    return {
      section: a.section,
      answer: String(a.answer) + (a.uncertain ? '?' : ''),
      correct_answer: keys[i],
      result: result
    };
  });

  var fingerprintInput = H3_WEB_SYSTEM_TEST_FIXTURE.set_id + '|' + summary.map(function (x) {
    return x.answer;
  }).join(',');
  var txnId = 'R3-01-POC-' + h3Sha256Hex_(fingerprintInput).slice(0, 16).toUpperCase();
  var receipt = [
    '[H3_WEB_SYNC]',
    'SET_ID=' + H3_WEB_SYSTEM_TEST_FIXTURE.set_id,
    'TXN_ID=' + txnId,
    'STATUS=COMMITTED'
  ].join('\n');

  return {
    schema: 'H3_WEB_SUBMIT_RESULT_V1',
    mode: 'SYSTEM_TEST',
    nonlearning: true,
    persisted: false,
    commit_scope: 'R3_01_POC_MEMORY_ONLY',
    set_id: H3_WEB_SYSTEM_TEST_FIXTURE.set_id,
    txn_id: txnId,
    status: 'COMMITTED',
    score: score,
    total: 5,
    summary: summary,
    receipt: receipt,
    after_sync: buildSystemTestReviewPayload_()
  };
}
