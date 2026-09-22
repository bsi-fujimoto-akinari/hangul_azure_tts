/**
 * Review / HOME common core.
 *
 * This file owns only provider-neutral primitives, history aggregation,
 * current-learning arbitration, and request dispatch. Listening and
 * historical Written Review are active providers; explicit request routing
 * keeps Listening transaction identities unambiguous.
 */

function h3ReviewWrittenProviderFactory_() {
  return h3WrittenReviewProvider_();
}


var H3_REVIEW_WRITTEN_PROVIDER_FACTORY_ =
  h3ReviewWrittenProviderFactory_;


function h3ReviewCanonicalizeValue_(
  value
) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return h3ReviewCanonicalizeValue_(
        item
      );
    });
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    var out = {};
    Object.keys(value)
      .sort()
      .forEach(function (key) {
        out[key] =
          h3ReviewCanonicalizeValue_(
            value[key]
          );
      });
    return out;
  }

  return value;
}


function h3ReviewCanonicalJson_(value) {
  return JSON.stringify(
    h3ReviewCanonicalizeValue_(value)
  );
}


function h3ReviewHash_(value) {
  return hash_(
    h3ReviewCanonicalJson_(value)
  );
}


function h3ReviewRequireExactHeader_(
  sheet,
  expected,
  code
) {
  if (!sheet) {
    throw new Error(code + '_SHEET_MISSING');
  }

  var actual = sheet
    .getRange(1, 1, 1, expected.length)
    .getDisplayValues()[0];

  if (
    JSON.stringify(actual) !==
    JSON.stringify(expected)
  ) {
    throw new Error(
      code + '_HEADER_MISMATCH'
    );
  }
}


function h3ReviewTable_(sheet) {
  return h3ProdSheetRows_(sheet);
}


function h3ReviewProviders_() {
  var providers = [
    h3ListeningReviewProvider_()
  ];

  if (
    typeof
      H3_REVIEW_WRITTEN_PROVIDER_FACTORY_ ===
      'function'
  ) {
    providers.push(
      H3_REVIEW_WRITTEN_PROVIDER_FACTORY_()
    );
  }

  providers.forEach(
    function (provider) {
      if (
        !provider ||
        !provider.kind ||
        typeof provider.historyEntries !==
          'function' ||
        typeof provider.currentLearning !==
          'function' ||
        typeof provider.openReview !==
          'function' ||
        typeof provider.openMedia !==
          'function' ||
        typeof provider.openReplay !==
          'function' ||
        typeof provider.openReplayMedia !==
          'function' ||
        typeof provider.gradeReplay !==
          'function'
      ) {
        throw new Error(
          'REVIEW_PROVIDER_CONTRACT_INVALID'
        );
      }
    }
  );

  return providers;
}


function h3ReviewProviderForRequest_(
  request
) {
  var providers =
    h3ReviewProviders_();

  var explicitKind = String(
    request &&
    request.review_kind ||
    ''
  );
  var hasListeningIdentity = Boolean(
    request &&
    (
      request.txn_id ||
      request.legacy_review_id
    )
  );

  if (
    explicitKind &&
    hasListeningIdentity &&
    explicitKind !== 'LISTENING'
  ) {
    throw new Error(
      'REVIEW_PROVIDER_SELECTOR_CONFLICT'
    );
  }

  if (explicitKind) {
    var explicitMatches =
      providers.filter(
        function (provider) {
          return provider.kind ===
            explicitKind;
        }
      );

    if (explicitMatches.length === 1) {
      return explicitMatches[0];
    }

    if (!explicitMatches.length) {
      throw new Error(
        'REVIEW_PROVIDER_KIND_INVALID'
      );
    }

    throw new Error(
      'REVIEW_PROVIDER_ROUTE_AMBIGUOUS'
    );
  }

  if (hasListeningIdentity) {
    var listeningMatches =
      providers.filter(
        function (provider) {
          return provider.kind ===
            'LISTENING';
        }
      );

    if (listeningMatches.length === 1) {
      return listeningMatches[0];
    }

    throw new Error(
      'REVIEW_PROVIDER_ROUTE_AMBIGUOUS'
    );
  }

  if (providers.length !== 1) {
    throw new Error(
      'REVIEW_PROVIDER_ROUTE_AMBIGUOUS'
    );
  }

  return providers[0];
}


function h3ReviewSurfaceMetadata_(
  kind,
  surfaceFamily,
  level
) {
  var normalizedKind =
    String(kind || '');
  var normalizedFamily =
    String(surfaceFamily || '');
  var normalizedLevel =
    String(level || '');

  if (
    ['LISTENING', 'WRITTEN']
      .indexOf(normalizedKind) < 0
  ) {
    throw new Error(
      'REVIEW_SURFACE_PROVIDER_INVALID'
    );
  }

  if (!normalizedFamily) {
    normalizedFamily =
      normalizedKind === 'LISTENING'
        ? '5L'
        : '5W';
  }

  if (!normalizedLevel) {
    normalizedLevel = '3級';
  }

  if (
    ['5L', '5W', 'READING', 'TRANSLATION']
      .indexOf(normalizedFamily) < 0
  ) {
    throw new Error(
      'REVIEW_SURFACE_FAMILY_INVALID'
    );
  }

  if (
    ['3級', '準2級']
      .indexOf(normalizedLevel) < 0
  ) {
    throw new Error(
      'REVIEW_SURFACE_LEVEL_INVALID'
    );
  }

  if (
    normalizedKind === 'LISTENING' &&
    normalizedFamily !== '5L'
  ) {
    throw new Error(
      'REVIEW_SURFACE_PROVIDER_FAMILY_MISMATCH'
    );
  }

  if (
    normalizedKind === 'WRITTEN' &&
    normalizedFamily === '5L'
  ) {
    throw new Error(
      'REVIEW_SURFACE_PROVIDER_FAMILY_MISMATCH'
    );
  }

  return {
    learning_surface_schema:
      'H3_LEARNING_SURFACE_V1',
    provider_kind:
      normalizedKind,
    surface_family:
      normalizedFamily,
    level:
      normalizedLevel
  };
}



var H3_REVIEW_EXPLANATION_STYLE_CONTRACT_ID_ =
  'H3-REVIEW-EXPLANATION-STYLE-20260922-V1';


function h3ReviewExplanationStyleComparable_(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[。.!?！？]+$/, '');
}


function h3ReviewExplanationStyleRegexEscape_(value) {
  return String(value || '')
    .replace(/[.*+?^$()|[\]\\{}]/g, '\\function h3ReviewAttachSurfaceMetadata_(
');
}


function h3ReviewExplanationStylePlainSegment_(value) {
  var out = String(value || '');
  var boundary =
    '(?=[。！？!?]|$|が[、,]|ので|から|ため|けれど|けれども|一方)';
  var exact = [
    ['そんなはずがありません', 'そんなはずがない'],
    ['そんなことはできません', 'そんなことはできない'],
    ['ではありませんでした', 'ではなかった'],
    ['ではありません', 'ではない'],
    ['ありませんでした', 'なかった'],
    ['ありません', 'ない'],
    ['できませんでした', 'できなかった'],
    ['できません', 'できない'],
    ['なりませんでした', 'ならなかった'],
    ['なりません', 'ならない'],
    ['いませんでした', 'いなかった'],
    ['いません', 'いない'],
    ['表しています', '表している'],
    ['述べています', '述べている'],
    ['同意しています', '同意している'],
    ['対比しています', '対比している'],
    ['支えています', '支えている'],
    ['使われています', '使われている'],
    ['気を配っています', '気を配っている'],
    ['気をつけています', '気をつけている'],
    ['勉強しています', '勉強している'],
    ['混雑しています', '混雑している'],
    ['空いています', '空いている'],
    ['暮らしています', '暮らしている'],
    ['過ごしています', '過ごしている'],
    ['言っています', '言っている'],
    ['焦点があります', '焦点がある'],
    ['ことがあります', 'ことがある'],
    ['があります', 'がある'],
    ['使い分けやすくなります', '使い分けやすくなる'],
    ['なります', 'なる'],
    ['あります', 'ある'],
    ['使われます', '使われる'],
    ['表せます', '表せる'],
    ['使えます', '使える'],
    ['求められます', '求められる'],
    ['述べられます', '述べられる'],
    ['用いられます', '用いられる'],
    ['感じられます', '感じられる'],
    ['対応します', '対応する'],
    ['一致します', '一致する'],
    ['確認します', '確認する'],
    ['担当します', '担当する'],
    ['表します', '表す'],
    ['示します', '示す'],
    ['使います', '使う'],
    ['合います', '合う'],
    ['異なります', '異なる'],
    ['つながります', 'つながる'],
    ['続きます', '続く'],
    ['指します', '指す'],
    ['当たります', '当たる'],
    ['広がります', '広がる'],
    ['変わります', '変わる'],
    ['分かれます', '分かれる'],
    ['させます', 'させる'],
    ['伝えます', '伝える'],
    ['述べます', '述べる'],
    ['求めます', '求める'],
    ['作ります', '作る'],
    ['持ちます', '持つ'],
    ['できます', 'できる'],
    ['言えます', '言える'],
    ['なれます', 'なれる']
  ];

  exact.forEach(function (pair) {
    out = out.replace(
      new RegExp(
        h3ReviewExplanationStyleRegexEscape_(
          pair[0]
        ) + boundary,
        'g'
      ),
      pair[1]
    );
  });

  out = out
    .replace(
      new RegExp(
        '使えるです' + boundary,
        'g'
      ),
      '使える'
    )
    .replace(
      new RegExp(
        '((?:ない|たい|やすい|にくい|かった|高い|低い|強い|弱い|多い|少ない|広い|狭い|難しい|易しい|近い|遠い|早い|遅い|よい|良い|うれしい|忙しい|惜しい))です' +
          boundary,
        'g'
      ),
      '$1'
    )
    .replace(
      new RegExp(
        '(自然|適切|重要|同じ|自動詞|他動詞|表現|意味|予測|段階|語|数詞|手掛かり|対比|ニュアンス|状態|理由|形|焦点|必要|義務|許可)です' +
          boundary,
        'g'
      ),
      '$1だ'
    )
    .replace(
      new RegExp(
        'です' + boundary,
        'g'
      ),
      'だ'
    )
    .replace(
      new RegExp(
        'しています' + boundary,
        'g'
      ),
      'している'
    )
    .replace(
      new RegExp(
        'ています' + boundary,
        'g'
      ),
      'ている'
    )
    .replace(
      new RegExp(
        'えます' + boundary,
        'g'
      ),
      'える'
    )
    .replace(
      new RegExp(
        'れます' + boundary,
        'g'
      ),
      'れる'
    )
    .replace(
      new RegExp(
        'けます' + boundary,
        'g'
      ),
      'ける'
    )
    .replace(
      new RegExp(
        'げます' + boundary,
        'g'
      ),
      'げる'
    )
    .replace(
      new RegExp(
        'せます' + boundary,
        'g'
      ),
      'せる'
    )
    .replace(
      new RegExp(
        'めます' + boundary,
        'g'
      ),
      'める'
    )
    .replace(
      new RegExp(
        'きます' + boundary,
        'g'
      ),
      'く'
    )
    .replace(
      new RegExp(
        'ぎます' + boundary,
        'g'
      ),
      'ぐ'
    )
    .replace(
      new RegExp(
        'ちます' + boundary,
        'g'
      ),
      'つ'
    )
    .replace(
      new RegExp(
        'びます' + boundary,
        'g'
      ),
      'ぶ'
    )
    .replace(
      new RegExp(
        'ります' + boundary,
        'g'
      ),
      'る'
    )
    .replace(
      new RegExp(
        'います' + boundary,
        'g'
      ),
      'う'
    )
    .replace(
      new RegExp(
        'します' + boundary,
        'g'
      ),
      'する'
    )
    .replace(
      new RegExp(
        'ます' + boundary,
        'g'
      ),
      'る'
    )
    .replace(
      new RegExp(
        'かったです' + boundary,
        'g'
      ),
      'かった'
    )
    .replace(
      new RegExp(
        'でした' + boundary,
        'g'
      ),
      'だった'
    )
    .replace(
      new RegExp(
        'でしょう' + boundary,
        'g'
      ),
      'だろう'
    )
    .replace(
      new RegExp(
        'ましょう' + boundary,
        'g'
      ),
      'よう'
    );

  return out;
}


function h3ReviewExplanationStyleMapUnquotedLine_(
  line,
  mapper
) {
  var value = String(line || '');

  if (/^\s*→/.test(value)) {
    return value;
  }

  var out = '';
  var buffer = '';
  var depth = 0;

  function flush() {
    if (!buffer) {
      return;
    }
    out += mapper(buffer);
    buffer = '';
  }

  for (var i = 0; i < value.length; i++) {
    var ch = value.charAt(i);

    if (ch === '「' || ch === '『') {
      flush();
      depth++;
      out += ch;
      continue;
    }

    if (ch === '」' || ch === '』') {
      out += ch;
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth > 0) {
      out += ch;
    } else {
      buffer += ch;
    }
  }

  flush();
  return out;
}


function h3ReviewExplanationStyleNormalizeMetaText_(
  value
) {
  return String(value || '')
    .split('\n')
    .map(function (line) {
      return h3ReviewExplanationStyleMapUnquotedLine_(
        line,
        h3ReviewExplanationStylePlainSegment_
      );
    })
    .join('\n');
}


function h3ReviewExplanationStyleHasPoliteMeta_(
  value
) {
  var polite =
    /(?:です|ます|でした|ません|でしょう|ましょう|ください|ございます)(?=[。！？!?]|$|が[、,]|ので|から|ため|けれど|けれども|一方)/;

  return String(value || '')
    .split('\n')
    .some(function (line) {
      var found = false;

      h3ReviewExplanationStyleMapUnquotedLine_(
        line,
        function (segment) {
          if (polite.test(segment)) {
            found = true;
          }
          polite.lastIndex = 0;
          return segment;
        }
      );

      return found;
    });
}


function h3ReviewExplanationStyleRepresentativeLines_(
  explanation
) {
  var lines = [];

  (
    explanation &&
    explanation.learning_blocks ||
    []
  ).forEach(function (block) {
    if (!block || typeof block !== 'object') {
      return;
    }

    if (String(block.example_ko || '').trim()) {
      lines.push(
        String(block.example_ko)
      );
    }

    ['usage', 'note'].forEach(
      function (field) {
        String(block[field] || '')
          .split(/\r?\n/)
          .forEach(function (line) {
            if (
              /[가-힣]/.test(line) &&
              !/^\s*→/.test(line) &&
              (
                /\s/.test(line) ||
                /[.!?。！？]$/.test(
                  String(line || '').trim()
                )
              )
            ) {
              lines.push(line);
            }
          });
      }
    );
  });

  return lines;
}


function h3ReviewExplanationStyleValidateAuthoring_(
  explanation,
  correctSurfaces,
  label
) {
  if (
    !explanation ||
    typeof explanation !== 'object' ||
    Array.isArray(explanation)
  ) {
    throw new Error(
      'REVIEW_EXPLANATION_STYLE_OBJECT_INVALID:' +
        String(label || '')
    );
  }

  var meta = [
    {
      field: 'reason',
      value: explanation.reason
    }
  ];

  (
    explanation.learning_blocks || []
  ).forEach(function (block, index) {
    meta.push({
      field:
        'learning_blocks[' +
        String(index) +
        '].usage',
      value:
        block && block.usage
    });
    meta.push({
      field:
        'learning_blocks[' +
        String(index) +
        '].note',
      value:
        block && block.note
    });
  });

  meta.forEach(function (entry) {
    if (
      entry.value &&
      h3ReviewExplanationStyleHasPoliteMeta_(
        entry.value
      )
    ) {
      throw new Error(
        'REVIEW_EXPLANATION_STYLE_POLITE_META:' +
          String(label || '') +
          ':' +
          entry.field
      );
    }
  });

  var correct = (
    correctSurfaces || []
  )
    .map(
      h3ReviewExplanationStyleComparable_
    )
    .filter(Boolean);

  h3ReviewExplanationStyleRepresentativeLines_(
    explanation
  ).forEach(function (line) {
    var normalized =
      h3ReviewExplanationStyleComparable_(
        line
      );

    if (
      normalized &&
      correct.indexOf(normalized) >= 0
    ) {
      throw new Error(
        'REVIEW_EXPLANATION_STYLE_EXAMPLE_DUPLICATES_ANSWER:' +
          String(label || '')
      );
    }
  });

  return true;
}


function h3ReviewExplanationStyleNormalizeExplanation_(
  explanation
) {
  if (
    !explanation ||
    typeof explanation !== 'object'
  ) {
    return explanation;
  }

  if (explanation.reason) {
    explanation.reason =
      h3ReviewExplanationStyleNormalizeMetaText_(
        explanation.reason
      );
  }

  (
    explanation.learning_blocks || []
  ).forEach(function (block) {
    if (!block || typeof block !== 'object') {
      return;
    }

    if (block.usage) {
      block.usage =
        h3ReviewExplanationStyleNormalizeMetaText_(
          block.usage
        );
    }
    if (block.note) {
      block.note =
        h3ReviewExplanationStyleNormalizeMetaText_(
          block.note
        );
    }
  });

  return explanation;
}


var H3_REVIEW_EXPLANATION_STYLE_EXAMPLE_FIXES_ = {
  '5L|H3-20260919-L02|K3': {
    type: 'EXPLICIT',
    old_ko:
      '주말에는 푹 쉬는 게 어때요?',
    new_ko:
      '오늘은 일찍 자는 게 어때요?',
    old_ja:
      '週末はゆっくり休むのはどうですか。',
    new_ja:
      '今日は早めに寝るのはどうですか。'
  },
  '5W|H3-20260914-03|D6': {
    type: 'USAGE_PAIR',
    old_ko:
      '같이 전시회 보러 갈래요?',
    new_ko:
      '주말에 같이 산책할래요?',
    old_ja:
      '一緒に展示会を見に行きませんか？',
    new_ja:
      '週末に一緒に散歩しませんか？'
  },
  '5W|H3-20260914-05|D6': {
    type: 'USAGE_PAIR',
    old_ko:
      '네, 부탁드려요.',
    new_ko:
      '그럼 이것도 부탁드려요.',
    old_ja:
      'はい、お願いします。',
    new_ja:
      'では、これもお願いします。'
  },
  '5W|H3-20260916-01|D3': {
    type: 'USAGE_PAIR',
    old_ko:
      '준비해야 해요.',
    new_ko:
      '내일까지 자료를 준비해야 해요.',
    old_ja:
      '準備しなければなりません。',
    new_ja:
      '明日までに資料を準備しなければなりません。'
  },
  '5W|H3-20260918-01|D6': {
    type: 'USAGE_PAIR',
    old_ko:
      '중간에 넘어졌던 참가자 말이죠?',
    new_ko:
      '어제 발표했던 학생 말이죠?',
    old_ja:
      '途中で転んだ参加者のことですよね？',
    new_ja:
      '昨日発表した学生のことですよね？'
  },
  '5W|H3-20260918-03|D6': {
    type: 'USAGE_PAIR',
    old_ko:
      '친구와 북한산에 가기로 했어요.',
    new_ko:
      '다음 달부터 아침마다 운동하기로 했어요.',
    old_ja:
      '友達と北漢山に行くことにしました。',
    new_ja:
      '来月から毎朝運動することにしました。'
  }
};


function h3ReviewExplanationStyleApplyExampleFix_(
  family,
  setId,
  part
) {
  var explanation =
    part && part.explanation;

  if (!explanation) {
    return;
  }

  var key = [
    String(family || ''),
    String(setId || ''),
    String(part.section || '')
  ].join('|');
  var fix =
    H3_REVIEW_EXPLANATION_STYLE_EXAMPLE_FIXES_[
      key
    ];

  if (!fix) {
    return;
  }

  var matched = false;

  (
    explanation.learning_blocks || []
  ).forEach(function (block) {
    if (!block || typeof block !== 'object') {
      return;
    }

    if (
      fix.type === 'EXPLICIT' &&
      String(block.example_ko || '') ===
        fix.old_ko &&
      String(block.example_ja || '') ===
        fix.old_ja
    ) {
      block.example_ko = fix.new_ko;
      block.example_ja = fix.new_ja;
      matched = true;
      return;
    }

    if (
      fix.type === 'USAGE_PAIR' &&
      block.usage
    ) {
      var oldPair =
        fix.old_ko +
        '\n→ ' +
        fix.old_ja;
      var newPair =
        fix.new_ko +
        '\n→ ' +
        fix.new_ja;

      if (
        String(block.usage)
          .indexOf(oldPair) >= 0
      ) {
        block.usage =
          String(block.usage)
            .replace(
              oldPair,
              newPair
            );
        matched = true;
      }
    }
  });

  if (!matched) {
    throw new Error(
      'REVIEW_EXPLANATION_STYLE_EXAMPLE_FIX_GATE_MISMATCH:' +
        key
    );
  }
}


function h3ReviewExplanationStyleCorrectSurfaces_(
  family,
  part
) {
  var out = [];

  if (!part) {
    return out;
  }

  if (part.correct_answer_text) {
    out.push(
      String(part.correct_answer_text)
    );
  }

  if (
    typeof part.correct_answer ===
      'string'
  ) {
    out.push(
      String(part.correct_answer)
    );
  }

  var position = Number(
    part.correct_answer_position ||
    (
      typeof part.correct_answer ===
        'number'
        ? part.correct_answer
        : 0
    )
  );
  var choices =
    part.question_surface &&
    Array.isArray(
      part.question_surface.choices
    )
      ? part.question_surface.choices
      : [];

  if (
    position >= 1 &&
    position <= choices.length
  ) {
    var choice =
      choices[position - 1];

    out.push(
      typeof choice === 'object'
        ? String(
            choice.text ||
            choice.ko ||
            ''
          )
        : String(choice || '')
    );
  }

  if (
    String(family || '') === '5W' &&
    part.script_text
  ) {
    String(part.script_text)
      .split(/\r?\n/)
      .forEach(function (line) {
        if (String(line || '').trim()) {
          out.push(line);
        }
      });
  }

  return out;
}


function h3ReviewExplanationStyleApplyPayload_(
  payload
) {
  var family =
    String(
      payload &&
      payload.surface_family ||
      ''
    );
  var setId =
    String(
      payload &&
      payload.set_id ||
      ''
    );
  var parts =
    Array.isArray(
      payload && payload.sections
    )
      ? payload.sections
      : (
          Array.isArray(
            payload &&
            payload.questions
          )
            ? payload.questions
            : []
        );

  parts.forEach(function (part, index) {
    if (
      !part ||
      !part.explanation
    ) {
      return;
    }

    h3ReviewExplanationStyleApplyExampleFix_(
      family,
      setId,
      part
    );

    if (
      family === '5W' ||
      family === 'READING' ||
      family === 'TRANSLATION'
    ) {
      h3ReviewExplanationStyleNormalizeExplanation_(
        part.explanation
      );
    }

    h3ReviewExplanationStyleValidateAuthoring_(
      part.explanation,
      h3ReviewExplanationStyleCorrectSurfaces_(
        family,
        part
      ),
      [
        family,
        setId,
        String(
          part.section ||
          part.item_id ||
          index + 1
        )
      ].join('|')
    );
  });

  return payload;
}


function h3ReviewExplanationStyleSelfCheck_() {
  var probe = {
    reason:
      'この形は原因を表します。',
    learning_blocks: [
      {
        usage:
          '例文では自然に使えますが、別の場面では意味が異なります。',
        example_ko:
          '오늘은 일찍 자요.',
        example_ja:
          '今日は早く寝ます。'
      }
    ]
  };

  h3ReviewExplanationStyleNormalizeExplanation_(
    probe
  );

  if (
    probe.reason !==
      'この形は原因を表す。' ||
    probe.learning_blocks[0].usage !==
      '例文では自然に使えるが、別の場面では意味が異なる。' ||
    h3ReviewExplanationStyleHasPoliteMeta_(
      probe.reason
    ) ||
    h3ReviewExplanationStyleHasPoliteMeta_(
      probe.learning_blocks[0].usage
    )
  ) {
    throw new Error(
      'REVIEW_EXPLANATION_STYLE_SELF_CHECK_NORMALIZATION_FAILED'
    );
  }

  h3ReviewExplanationStyleValidateAuthoring_(
    probe,
    ['別の正答'],
    'SELF_CHECK'
  );

  var rejected = false;
  try {
    h3ReviewExplanationStyleValidateAuthoring_(
      {
        reason: '常体の説明だ。',
        learning_blocks: [
          {
            example_ko:
              '정답 문장.'
          }
        ]
      },
      ['정답 문장.'],
      'SELF_CHECK_DUP'
    );
  } catch (e) {
    rejected =
      String(
        e && e.message || e
      ).indexOf(
        'REVIEW_EXPLANATION_STYLE_EXAMPLE_DUPLICATES_ANSWER'
      ) === 0;
  }

  if (!rejected) {
    throw new Error(
      'REVIEW_EXPLANATION_STYLE_SELF_CHECK_DUPLICATE_GATE_FAILED'
    );
  }

  return {
    ok: true,
    contract_id:
      H3_REVIEW_EXPLANATION_STYLE_CONTRACT_ID_,
    known_example_fix_count:
      Object.keys(
        H3_REVIEW_EXPLANATION_STYLE_EXAMPLE_FIXES_
      ).length
  };
}


function h3ReviewAttachSurfaceMetadata_(
  provider,
  payload
) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error(
      'REVIEW_SURFACE_PAYLOAD_INVALID'
    );
  }

  var metadata =
    h3ReviewSurfaceMetadata_(
      provider && provider.kind,
      payload.surface_family,
      payload.level
    );

  payload.learning_surface_schema =
    metadata.learning_surface_schema;
  payload.provider_kind =
    metadata.provider_kind;

  if (
    payload.kind &&
    String(payload.kind) !==
      metadata.provider_kind
  ) {
    throw new Error(
      'REVIEW_SURFACE_KIND_MISMATCH'
    );
  }
  payload.kind =
    metadata.provider_kind;

  payload.surface_family =
    metadata.surface_family;
  payload.level =
    metadata.level;

  if (
    Array.isArray(payload.sections)
  ) {
    payload.item_count =
      payload.sections.length;
  } else if (
    Array.isArray(payload.questions)
  ) {
    payload.item_count =
      payload.questions.length;
  }

  return h3ReviewExplanationStyleApplyPayload_(
    payload
  );
}


function h3ReviewHistoryEnvelope_(
  provider,
  entry
) {
  var timestamp = String(
    entry.committed_at ||
    entry.answered_at ||
    ''
  );

  /**
   * Preserve the existing HOME surface: legacy entries expose answered_at
   * and the derived committed_at field used by the common ordering logic.
   */
  if (
    !entry.committed_at &&
    entry.answered_at
  ) {
    entry.committed_at =
      entry.answered_at;
  }

  var surface =
    h3ReviewSurfaceMetadata_(
      provider.kind,
      entry.surface_family,
      entry.level
    );

  entry.provider_kind =
    surface.provider_kind;
  entry.surface_family =
    surface.surface_family;
  entry.level =
    surface.level;

  return {
    kind: provider.kind,
    surface_family:
      surface.surface_family,
    level:
      surface.level,
    set_id: String(
      entry.set_id || ''
    ),
    set_no: Number(
      entry.listening_set_no || 0
    ),
    answered_at: timestamp,
    score: Number(
      entry.score || 0
    ),
    total: Number(
      entry.total || 0
    ),
    wrong_count: Number(
      entry.wrong_count || 0
    ),
    uncertainty:
      entry.uncertain_count,
    review_source_id:
      entry.txn_id ||
      entry.legacy_review_id ||
      null,
    source_mode:
      entry.source_mode || null,
    entry: entry
  };
}



var H3_REVIEW_LEVEL_CONTRACT_ =
  'H3_REVIEW_PRIORITY_V4';

var H3_REVIEW_LEVEL_HALF_LIFE_DAYS_ =
  14;

var H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_ =
  0.40;

var H3_REVIEW_COOLDOWN_CAP_START_ =
  10;

var H3_REVIEW_COOLDOWN_CAP_24H_ =
  25;

var H3_REVIEW_COOLDOWN_CAP_HOURS_ =
  24;

var H3_REVIEW_COOLDOWN_RECOVERY_HOURS_ =
  96;

var H3_REVIEW_PRIORITY_ITEM_MAX_ =
  20;

var H3_REVIEW_PRIORITY_EXAM_BLEND_ =
  0.50;

var H3_REVIEW_PRIORITY_UNIFORM_SHARE_ =
  0.25;

var H3_REVIEW_PRIORITY_EXAM_SHARE_ = {
  '5L': 0.40,
  '5W': 0.36,
  'READING': 0.12,
  'TRANSLATION': 0.12
};

var H3_REVIEW_PRIORITY_MAX_BLEND_SHARE_ =
  (
    (
      1 -
      H3_REVIEW_PRIORITY_EXAM_BLEND_
    ) *
    H3_REVIEW_PRIORITY_UNIFORM_SHARE_
  ) +
  (
    H3_REVIEW_PRIORITY_EXAM_BLEND_ *
    H3_REVIEW_PRIORITY_EXAM_SHARE_[
      '5L'
    ]
  );

var H3_REVIEW_HOME_INDEX_SHEET_ =
  'review_home_index_v1';

var H3_REVIEW_HOME_INDEX_HEADERS_V1_ = [
  'KIND',
  'SET_ID',
  'SET_NO',
  'ANSWERED_AT',
  'SCORE',
  'TOTAL',
  'WRONG_COUNT',
  'UNCERTAINTY_KNOWN',
  'UNCERTAIN_COUNT',
  'BASE_PRIORITY',
  'REVIEW_SOURCE_ID',
  'SOURCE_MODE',
  'STATUS'
];

var H3_REVIEW_HOME_INDEX_HEADERS_V2_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V1_
    .concat([
      'SURFACE_FAMILY',
      'LEVEL'
    ]);

var H3_REVIEW_HOME_INDEX_HEADERS_V3_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V2_
    .concat([
      'LAST_REVIEWED_AT'
    ]);

var H3_REVIEW_HOME_INDEX_HEADERS_V4_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V3_
    .concat([
      'LAST_REVIEW_COMPLETION_KEY'
    ]);

var H3_REVIEW_HOME_INDEX_HEADERS_V5_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V4_
    .concat([
      'PRIORITY_STATE_JSON'
    ]);

var H3_REVIEW_HOME_INDEX_HEADERS_ =
  H3_REVIEW_HOME_INDEX_HEADERS_V5_;


function h3ReviewNormalizeLevel_(
  value
) {
  var normalized =
    String(value || '3級')
      .trim();

  if (
    normalized === '3級' ||
    normalized === '3급'
  ) {
    return '3級';
  }

  if (
    normalized === '準2級' ||
    normalized === '준2급'
  ) {
    return '準2級';
  }

  throw new Error(
    'REVIEW_EVIDENCE_LEVEL_INVALID'
  );
}


function h3ReviewSkillEvidenceIndex_(
  spreadsheet,
  setAnsweredAtById
) {
  var bySet = {};
  var bySkill = {};
  var writtenSetSeen = {};
  var answeredAtBySet =
    setAnsweredAtById || {};

  function add(
    kind,
    level,
    setId,
    skillId,
    result,
    includeWrittenSet,
    answeredAt,
    surfaceKey
  ) {
    var normalizedResult =
      String(result || '');
    if (
      ['○', '△', '×'].indexOf(
        normalizedResult
      ) < 0
    ) {
      return;
    }

    var normalizedSetId =
      String(setId || '');
    if (!normalizedSetId) {
      return;
    }

    var normalizedLevel =
      h3ReviewNormalizeLevel_(
        level
      );
    var normalizedSkillId =
      String(skillId || '');
    var normalizedAnsweredAt =
      String(
        answeredAt ||
        answeredAtBySet[
          normalizedSetId
        ] ||
        ''
      );
    var normalizedSurfaceKey =
      String(
        surfaceKey ||
        (
          normalizedSetId +
          '|' +
          normalizedSkillId
        )
      );

    var setKey =
      kind + '|' +
      normalizedLevel + '|' +
      normalizedSetId;
    if (!bySet[setKey]) {
      bySet[setKey] = [];
    }

    var item = {
      skill_id:
        normalizedSkillId,
      result:
        normalizedResult,
      answered_at:
        normalizedAnsweredAt,
      surface_key:
        normalizedSurfaceKey,
      set_id:
        normalizedSetId
    };
    bySet[setKey].push(item);

    if (
      kind === 'WRITTEN' &&
      includeWrittenSet === true
    ) {
      writtenSetSeen[
        normalizedSetId
      ] = true;
    }

    if (!normalizedSkillId) {
      return;
    }

    var skillKey =
      kind + '|' +
      normalizedLevel + '|' +
      normalizedSkillId;
    if (!bySkill[skillKey]) {
      bySkill[skillKey] = {
        wrong: 0,
        uncertain: 0,
        correct: 0,
        events: []
      };
    }

    if (
      normalizedResult === '×'
    ) {
      bySkill[skillKey].wrong += 1;
    } else if (
      normalizedResult === '△'
    ) {
      bySkill[skillKey]
        .uncertain += 1;
    } else {
      bySkill[skillKey]
        .correct += 1;
    }

    bySkill[skillKey].events.push(
      item
    );
  }

  function rowLevel(
    table,
    row
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        table.map,
        'LEVEL'
      )
    ) {
      return h3ReviewNormalizeLevel_(
        row[table.map.LEVEL] ||
        '3級'
      );
    }
    return '3級';
  }

  function rowSurfaceKey(
    table,
    row,
    setId,
    skillId
  ) {
    var candidates = [
      'SURFACE_HASH',
      'QUESTION_KEY',
      'ITEM_ID',
      'PASSAGE_SHA256'
    ];

    for (
      var i = 0;
      i < candidates.length;
      i += 1
    ) {
      var name = candidates[i];
      if (
        Object.prototype
          .hasOwnProperty.call(
            table.map,
            name
          )
      ) {
        var value =
          String(
            row[table.map[name]] ||
            ''
          );
        if (value) {
          return name + ':' + value;
        }
      }
    }

    return (
      String(setId || '') +
      '|' +
      String(skillId || '')
    );
  }

  function rowAnsweredAt(
    table,
    row,
    setId
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        table.map,
        'ANSWERED_AT'
      )
    ) {
      var value =
        String(
          row[
            table.map.ANSWERED_AT
          ] || ''
        );
      if (value) {
        return value;
      }
    }

    return String(
      answeredAtBySet[
        String(setId || '')
      ] || ''
    );
  }

  function surfaceStageLevels(
    stageSheetName
  ) {
    var stageSheet =
      spreadsheet.getSheetByName(
        stageSheetName
      );
    var levels = {};

    if (!stageSheet) {
      return levels;
    }

    var stage =
      h3ReviewTable_(
        stageSheet
      );
    h3ProdRequireColumns_(
      stage,
      [
        'SET_ID',
        'STATUS',
        'LEVEL'
      ],
      stageSheetName
    );

    stage.rows.forEach(
      function (row) {
        var setId =
          String(
            row[stage.map.SET_ID] ||
            ''
          );
        if (
          !setId ||
          String(
            row[stage.map.STATUS] ||
            ''
          ) !== 'COMMITTED'
        ) {
          return;
        }

        if (
          Object.prototype
            .hasOwnProperty.call(
              levels,
              setId
            )
        ) {
          throw new Error(
            'REVIEW_EVIDENCE_STAGE_DUPLICATE:' +
              stageSheetName +
              ':' +
              setId
          );
        }

        levels[setId] =
          h3ReviewNormalizeLevel_(
            row[stage.map.LEVEL] ||
            '3級'
          );
      }
    );

    return levels;
  }

  function addSurfaceEvidence(
    stageSheetName,
    logSheetName
  ) {
    var levels =
      surfaceStageLevels(
        stageSheetName
      );
    var logSheet =
      spreadsheet.getSheetByName(
        logSheetName
      );

    if (!logSheet) {
      return;
    }

    var log =
      h3ReviewTable_(
        logSheet
      );
    h3ProdRequireColumns_(
      log,
      [
        'SET_ID',
        'SKILL_ID',
        'RESULT',
        'ANSWERED_AT'
      ],
      logSheetName
    );

    log.rows.forEach(
      function (row) {
        var setId =
          String(
            row[log.map.SET_ID] ||
            ''
          );
        if (
          !setId ||
          !Object.prototype
            .hasOwnProperty.call(
              levels,
              setId
            )
        ) {
          return;
        }

        var skillId =
          row[log.map.SKILL_ID];

        add(
          'WRITTEN',
          levels[setId],
          setId,
          skillId,
          row[log.map.RESULT],
          false,
          rowAnsweredAt(
            log,
            row,
            setId
          ),
          rowSurfaceKey(
            log,
            row,
            setId,
            skillId
          )
        );
      }
    );
  }

  var listeningSheet =
    spreadsheet.getSheetByName(
      'listening_log_v1'
    );
  if (listeningSheet) {
    var listening =
      h3ReviewTable_(
        listeningSheet
      );
    h3ProdRequireColumns_(
      listening,
      [
        'PARENT_SET_ID',
        'SKILL_ID',
        'STATUS',
        'USER_RESULT',
        'ANSWERED_AT',
        'SURFACE_HASH'
      ],
      'listening_log_v1'
    );

    listening.rows.forEach(
      function (row) {
        if (
          String(
            row[
              listening.map.STATUS
            ] || ''
          ) !== 'VALID'
        ) {
          return;
        }

        var setId =
          String(
            row[
              listening.map
                .PARENT_SET_ID
            ] || ''
          );
        var skillId =
          row[
            listening.map.SKILL_ID
          ];

        add(
          'LISTENING',
          rowLevel(
            listening,
            row
          ),
          setId,
          skillId,
          row[
            listening.map
              .USER_RESULT
          ],
          false,
          rowAnsweredAt(
            listening,
            row,
            setId
          ),
          rowSurfaceKey(
            listening,
            row,
            setId,
            skillId
          )
        );
      }
    );
  }

  var writtenSheet =
    spreadsheet.getSheetByName(
      'generation_log_v1'
    );
  if (writtenSheet) {
    var written =
      h3ReviewTable_(
        writtenSheet
      );
    h3ProdRequireColumns_(
      written,
      [
        'SET_ID',
        'SKILL_ID',
        'STATUS',
        'USER_RESULT',
        'ANSWERED_AT',
        'SURFACE_HASH'
      ],
      'generation_log_v1'
    );

    written.rows.forEach(
      function (row) {
        var setId = String(
          row[
            written.map.SET_ID
          ] || ''
        );

        if (
          setId &&
          String(
            row[
              written.map.STATUS
            ] || ''
          ) === 'ANSWERED'
        ) {
          writtenSetSeen[setId] =
            true;
        }

        if (
          String(
            row[
              written.map.STATUS
            ] || ''
          ) !== 'ANSWERED'
        ) {
          return;
        }

        var skillId =
          row[
            written.map.SKILL_ID
          ];

        add(
          'WRITTEN',
          rowLevel(
            written,
            row
          ),
          setId,
          skillId,
          row[
            written.map.USER_RESULT
          ],
          true,
          rowAnsweredAt(
            written,
            row,
            setId
          ),
          rowSurfaceKey(
            written,
            row,
            setId,
            skillId
          )
        );
      }
    );
  }

  addSurfaceEvidence(
    'reading_stage_v1',
    'reading_log_v1'
  );
  addSurfaceEvidence(
    'translation_stage_v1',
    'translation_log_v1'
  );
  addSurfaceEvidence(
    'translation_stage_v2',
    'translation_log_v2'
  );

  return {
    bySet: bySet,
    bySkill: bySkill,
    written_set_ids:
      Object.keys(
        writtenSetSeen
      ).sort()
  };
}

function h3ReviewPrioritySurfaceFamily_(
  kind,
  entry
) {
  var family =
    String(
      entry &&
      entry.surface_family ||
      ''
    );

  if (!family) {
    family =
      kind === 'LISTENING'
        ? '5L'
        : '5W';
  }

  if (
    !Object.prototype
      .hasOwnProperty.call(
        H3_REVIEW_PRIORITY_EXAM_SHARE_,
        family
      )
  ) {
    throw new Error(
      'REVIEW_PRIORITY_SURFACE_INVALID:' +
        family
    );
  }

  return family;
}


function h3ReviewPrioritySurfaceFactor_(
  kind,
  entry
) {
  var family =
    h3ReviewPrioritySurfaceFamily_(
      kind,
      entry
    );
  var blendedShare =
    (
      (
        1 -
        H3_REVIEW_PRIORITY_EXAM_BLEND_
      ) *
      H3_REVIEW_PRIORITY_UNIFORM_SHARE_
    ) +
    (
      H3_REVIEW_PRIORITY_EXAM_BLEND_ *
      H3_REVIEW_PRIORITY_EXAM_SHARE_[
        family
      ]
    );

  return (
    blendedShare /
    H3_REVIEW_PRIORITY_MAX_BLEND_SHARE_
  );
}


function h3ReviewBaseLevelForEntry_(
  kind,
  entry,
  evidence
) {
  var entryLevel =
    h3ReviewNormalizeLevel_(
      entry.level || '3級'
    );
  var setKey =
    kind + '|' +
    entryLevel + '|' +
    String(entry.set_id || '');
  var items =
    evidence.bySet[setKey] ||
    [];
  var raw = 0;
  var itemCount = 0;

  if (items.length) {
    itemCount = items.length;

    items.forEach(
      function (item) {
        if (item.result === '×') {
          raw += 12;
        } else if (
          item.result === '△'
        ) {
          raw += 6;
        }

        if (item.skill_id) {
          var stats =
            evidence.bySkill[
              kind + '|' +
              entryLevel + '|' +
              item.skill_id
            ];

          if (stats) {
            raw += Math.min(
              8,
              (
                Number(
                  stats.wrong || 0
                ) * 2
              ) +
              Number(
                stats.uncertain || 0
              )
            );
          }
        }
      }
    );
  } else {
    itemCount =
      Math.max(
        0,
        Number(entry.total || 0)
      );

    raw +=
      Number(
        entry.wrong_count || 0
      ) * 12;

    if (
      entry.uncertainty_known !==
        false
    ) {
      raw +=
        Number(
          entry.uncertain_count || 0
        ) * 6;
    }
  }

  if (
    !Number.isFinite(itemCount) ||
    itemCount <= 0
  ) {
    return 0;
  }

  var normalizedWeakness =
    Math.max(
      0,
      Math.min(
        100,
        (
          raw /
          (
            H3_REVIEW_PRIORITY_ITEM_MAX_ *
            itemCount
          )
        ) *
        100
      )
    );

  var weighted =
    normalizedWeakness *
    h3ReviewPrioritySurfaceFactor_(
      kind,
      entry
    );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(weighted)
    )
  );
}



function h3ReviewResultWeakness_(
  result
) {
  if (result === '×') {
    return 1;
  }
  if (result === '△') {
    return 0.65;
  }
  if (result === '○') {
    return 0;
  }
  throw new Error(
    'REVIEW_PRIORITY_RESULT_INVALID:' +
      String(result || '')
  );
}


function h3ReviewPriorityStateForEntry_(
  kind,
  entry,
  evidence
) {
  var entryAnsweredMs =
    h3ReviewTimestampMs_(
      entry.answered_at
    );

  if (entryAnsweredMs === null) {
    throw new Error(
      'REVIEW_PRIORITY_ANSWERED_AT_REQUIRED:' +
        String(entry.set_id || '')
    );
  }

  var level =
    h3ReviewNormalizeLevel_(
      entry.level || '3級'
    );
  var setKey =
    kind + '|' +
    level + '|' +
    String(entry.set_id || '');
  var sourceItems =
    (
      evidence.bySet[setKey] ||
      []
    ).slice();

  var itemCount =
    Math.max(
      0,
      Number(entry.total || 0)
    );

  function syntheticItems_() {
    var out = [];
    var wrong =
      Math.min(
        itemCount,
        Math.max(
          0,
          Number(
            entry.wrong_count || 0
          )
        )
      );
    var remaining =
      Math.max(
        0,
        itemCount - wrong
      );
    var uncertain =
      entry.uncertainty_known
        ? Math.min(
            remaining,
            Math.max(
              0,
              Number(
                entry.uncertain_count || 0
              )
            )
          )
        : 0;

    for (
      var i = 0;
      i < wrong;
      i += 1
    ) {
      out.push({
        skill_id: '',
        result: '×',
        answered_at:
          entry.answered_at,
        surface_key:
          'SYNTHETIC_WRONG_' + i,
        set_id:
          entry.set_id
      });
    }

    for (
      var j = 0;
      j < uncertain;
      j += 1
    ) {
      out.push({
        skill_id: '',
        result: '△',
        answered_at:
          entry.answered_at,
        surface_key:
          'SYNTHETIC_UNCERTAIN_' +
          j,
        set_id:
          entry.set_id
      });
    }

    while (
      out.length < itemCount
    ) {
      out.push({
        skill_id: '',
        result: '○',
        answered_at:
          entry.answered_at,
        surface_key:
          'SYNTHETIC_CORRECT_' +
          out.length,
        set_id:
          entry.set_id
      });
    }

    return out;
  }

  if (!sourceItems.length) {
    sourceItems =
      syntheticItems_();
  } else if (
    itemCount > sourceItems.length
  ) {
    var supplement =
      syntheticItems_();

    while (
      sourceItems.length < itemCount &&
      supplement.length
    ) {
      sourceItems.push(
        supplement.shift()
      );
    }
  }

  if (!sourceItems.length) {
    return {
      schema:
        'H3_REVIEW_PRIORITY_STATE_V1',
      item_count: 0,
      base_level: 0,
      items: []
    };
  }

  var states =
    sourceItems.map(
      function (item, index) {
        var originMs =
          h3ReviewTimestampMs_(
            item.answered_at ||
            entry.answered_at
          );

        if (originMs === null) {
          throw new Error(
            'REVIEW_PRIORITY_ITEM_ANSWERED_AT_REQUIRED:' +
              entry.set_id +
              ':' +
              index
          );
        }

        var skillId =
          String(
            item.skill_id || ''
          );
        var originSurface =
          String(
            item.surface_key ||
            (
              entry.set_id +
              '|ITEM|' +
              index
            )
          );
        var weakness =
          h3ReviewResultWeakness_(
            item.result
          );
        var latestResult =
          String(item.result);
        var latestMs =
          originMs;
        var correctSpacedCount = 0;

        if (skillId) {
          var skillKey =
            kind + '|' +
            level + '|' +
            skillId;
          var stats =
            evidence.bySkill[
              skillKey
            ];
          var events =
            stats &&
            Array.isArray(
              stats.events
            )
              ? stats.events.slice()
              : [];

          events = events.map(
            function (event) {
              return {
                set_id:
                  String(
                    event.set_id || ''
                  ),
                result:
                  String(
                    event.result || ''
                  ),
                surface_key:
                  String(
                    event.surface_key ||
                    ''
                  ),
                answered_at:
                  String(
                    event.answered_at ||
                    ''
                  ),
                answered_ms:
                  h3ReviewTimestampMs_(
                    event.answered_at
                  )
              };
            }
          ).filter(
            function (event) {
              return (
                event.set_id &&
                event.set_id !==
                  String(entry.set_id) &&
                event.answered_ms !==
                  null &&
                event.answered_ms >
                  originMs &&
                event.surface_key &&
                event.surface_key !==
                  originSurface
              );
            }
          ).sort(
            function (a, b) {
              if (
                a.answered_ms !==
                b.answered_ms
              ) {
                return (
                  a.answered_ms -
                  b.answered_ms
                );
              }
              return (
                a.set_id +
                '|' +
                a.surface_key
              ).localeCompare(
                b.set_id +
                '|' +
                b.surface_key
              );
            }
          );

          var seenEvidence = {};

          events.forEach(
            function (event) {
              var evidenceKey =
                event.set_id +
                '|' +
                event.surface_key;

              if (
                seenEvidence[
                  evidenceKey
                ]
              ) {
                return;
              }
              seenEvidence[
                evidenceKey
              ] = true;

              if (
                event.result === '×'
              ) {
                weakness = 1;
                correctSpacedCount = 0;
              } else if (
                event.result === '△'
              ) {
                weakness = 0.65;
                correctSpacedCount = 0;
              } else if (
                event.result === '○'
              ) {
                if (weakness > 0) {
                  correctSpacedCount += 1;
                  weakness =
                    correctSpacedCount >= 2
                      ? 0.10
                      : 0.35;
                } else {
                  weakness = 0;
                }
              } else {
                return;
              }

              latestResult =
                event.result;
              latestMs =
                event.answered_ms;
            }
          );
        }

        return {
          skill_id: skillId,
          source_result:
            String(item.result),
          latest_result:
            latestResult,
          weakness:
            Math.round(
              weakness * 100
            ) / 100,
          correct_spaced_count:
            correctSpacedCount,
          evidence_at:
            new Date(
              latestMs
            ).toISOString(),
          source_surface_key:
            originSurface
        };
      }
    );

  var meanWeakness =
    states.reduce(
      function (sum, item) {
        return sum +
          Number(
            item.weakness || 0
          );
      },
      0
    ) / states.length;

  var base =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          meanWeakness *
          100 *
          h3ReviewPrioritySurfaceFactor_(
            kind,
            entry
          )
        )
      )
    );

  return {
    schema:
      'H3_REVIEW_PRIORITY_STATE_V1',
    item_count:
      states.length,
    base_level:
      base,
    items:
      states
  };
}


function h3ReviewPriorityStateParse_(
  value,
  setId
) {
  var text =
    String(value || '').trim();

  if (!text) {
    return null;
  }

  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      'REVIEW_PRIORITY_STATE_JSON_INVALID:' +
        String(setId || '')
    );
  }

  if (
    !parsed ||
    parsed.schema !==
      'H3_REVIEW_PRIORITY_STATE_V1' ||
    !Array.isArray(parsed.items) ||
    Number(parsed.item_count) !==
      parsed.items.length
  ) {
    throw new Error(
      'REVIEW_PRIORITY_STATE_SCHEMA_INVALID:' +
        String(setId || '')
    );
  }

  return parsed;
}


function h3ReviewDynamicLevelFromState_(
  base,
  state,
  nowMs
) {
  var normalizedBase =
    Math.max(
      0,
      Math.min(
        100,
        Number(base || 0)
      )
    );

  if (!state) {
    throw new Error(
      'REVIEW_PRIORITY_STATE_REQUIRED'
    );
  }

  if (
    Math.round(
      normalizedBase
    ) !==
      Math.round(
        Number(
          state.base_level || 0
        )
      )
  ) {
    throw new Error(
      'REVIEW_PRIORITY_STATE_BASE_MISMATCH'
    );
  }

  if (!state.items.length) {
    return {
      base:
        Math.round(
          normalizedBase
        ),
      age_days: 0,
      forgetting_pressure: 0,
      level:
        Math.round(
          normalizedBase
        )
    };
  }

  var totalAgeDays = 0;
  var totalPressure = 0;

  state.items.forEach(
    function (item) {
      var evidenceMs =
        h3ReviewTimestampMs_(
          item.evidence_at
        );

      if (evidenceMs === null) {
        throw new Error(
          'REVIEW_PRIORITY_STATE_EVIDENCE_AT_INVALID'
        );
      }

      var ageDays =
        Math.max(
          0,
          (
            Number(nowMs) -
            Number(evidenceMs)
          ) /
          86400000
        );
      var pressure =
        1 - Math.pow(
          2,
          -ageDays /
          H3_REVIEW_LEVEL_HALF_LIFE_DAYS_
        );

      totalAgeDays +=
        ageDays;
      totalPressure +=
        pressure;
    }
  );

  var meanAgeDays =
    totalAgeDays /
    state.items.length;
  var meanPressure =
    totalPressure /
    state.items.length;
  var level =
    normalizedBase +
    (
      (100 - normalizedBase) *
      H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_ *
      meanPressure
    );

  return {
    base:
      Math.round(
        normalizedBase
      ),
    age_days:
      Math.round(
        meanAgeDays * 10
      ) / 10,
    forgetting_pressure:
      Math.round(
        meanPressure * 1000
      ) / 1000,
    level:
      Math.max(
        0,
        Math.min(
          100,
          Math.round(level)
        )
      )
  };
}


function h3ReviewHomeIndexTable_(
  spreadsheet
) {
  var sheet =
    spreadsheet.getSheetByName(
      H3_REVIEW_HOME_INDEX_SHEET_
    );

  if (!sheet) {
    throw new Error(
      'REVIEW_HOME_INDEX_SHEET_MISSING'
    );
  }

  var table =
    h3ReviewTable_(sheet);

  var isV1 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V1_
    );
  var isV2 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V2_
    );
  var isV3 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V3_
    );
  var isV4 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V4_
    );
  var isV5 =
    JSON.stringify(table.header) ===
    JSON.stringify(
      H3_REVIEW_HOME_INDEX_HEADERS_V5_
    );

  if (
    !isV1 &&
    !isV2 &&
    !isV3 &&
    !isV4 &&
    !isV5
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_HEADER_MISMATCH'
    );
  }

  return {
    sheet: sheet,
    table: table,
    schema_version:
      isV5
        ? 'H3_REVIEW_HOME_INDEX_V5'
        : (
            isV4
              ? 'H3_REVIEW_HOME_INDEX_V4'
              : (
                  isV3
                    ? 'H3_REVIEW_HOME_INDEX_V3'
                    : (
                        isV2
                          ? 'H3_REVIEW_HOME_INDEX_V2'
                          : 'H3_REVIEW_HOME_INDEX_V1'
                      )
                )
          )
  };
}


function h3ReviewHomeIndexBoolean_(
  value
) {
  var text =
    String(value || '')
      .toUpperCase();

  if (text === 'TRUE') {
    return true;
  }
  if (text === 'FALSE') {
    return false;
  }

  throw new Error(
    'REVIEW_HOME_INDEX_BOOLEAN_INVALID'
  );
}


function h3ReviewHomeIndexRowEntry_(
  row,
  map
) {
  var kind =
    String(row[map.KIND] || '');
  var setId =
    String(row[map.SET_ID] || '');
  var setNo =
    Number(row[map.SET_NO] || 0);
  var status =
    String(row[map.STATUS] || '');

  if (
    ['LISTENING', 'WRITTEN']
      .indexOf(kind) < 0 ||
    !setId ||
    !Number.isInteger(setNo) ||
    setNo < 1 ||
    status !== 'ACTIVE'
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_ROW_INVALID:' +
        kind +
        ':' +
        setId
    );
  }

  var uncertaintyKnown =
    h3ReviewHomeIndexBoolean_(
      row[map.UNCERTAINTY_KNOWN]
    );
  var uncertainText =
    String(
      row[map.UNCERTAIN_COUNT] || ''
    );
  var uncertainCount =
    uncertaintyKnown
      ? Number(uncertainText || 0)
      : null;

  if (
    uncertaintyKnown &&
    (
      !Number.isInteger(
        uncertainCount
      ) ||
      uncertainCount < 0
    )
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_UNCERTAIN_INVALID:' +
        setId
    );
  }

  var surface =
    h3ReviewSurfaceMetadata_(
      kind,
      Object.prototype.hasOwnProperty.call(
        map,
        'SURFACE_FAMILY'
      )
        ? row[map.SURFACE_FAMILY]
        : '',
      Object.prototype.hasOwnProperty.call(
        map,
        'LEVEL'
      )
        ? row[map.LEVEL]
        : ''
    );

  var entry = {
    review_kind: kind,
    provider_kind:
      surface.provider_kind,
    surface_family:
      surface.surface_family,
    level:
      surface.level,
    set_id: setId,
    answered_at:
      String(
        row[map.ANSWERED_AT] ||
        'UNKNOWN'
      ),
    score:
      Number(row[map.SCORE] || 0),
    total:
      Number(row[map.TOTAL] || 0),
    wrong_count:
      Number(
        row[map.WRONG_COUNT] || 0
      ),
    uncertainty_known:
      uncertaintyKnown,
    uncertain_count:
      uncertainCount,
    needs_review:
      Number(
        row[map.WRONG_COUNT] || 0
      ) > 0 ||
      (
        uncertaintyKnown &&
        uncertainCount > 0
      ),
    replay_capability:
      'unavailable',
    source_mode:
      String(
        row[map.SOURCE_MODE] || ''
      ),
    review_open_validation:
      'FULL_SOURCE_LOCK_ON_OPEN',
    review_base_level:
      Number(
        row[map.BASE_PRIORITY] || 0
      ),
    last_reviewed_at:
      Object.prototype
        .hasOwnProperty.call(
          map,
          'LAST_REVIEWED_AT'
        )
        ? String(
            row[
              map.LAST_REVIEWED_AT
            ] || ''
          )
        : '',
    last_review_completion_key:
      Object.prototype
        .hasOwnProperty.call(
          map,
          'LAST_REVIEW_COMPLETION_KEY'
        )
        ? String(
            row[
              map.LAST_REVIEW_COMPLETION_KEY
            ] || ''
          )
        : '',
    priority_state_json:
      Object.prototype
        .hasOwnProperty.call(
          map,
          'PRIORITY_STATE_JSON'
        )
        ? String(
            row[
              map.PRIORITY_STATE_JSON
            ] || ''
          )
        : ''
  };

  if (
    entry.last_reviewed_at &&
    h3ReviewTimestampMs_(
      entry.last_reviewed_at
    ) === null
  ) {
    throw new Error(
      'REVIEW_HOME_INDEX_LAST_REVIEWED_AT_INVALID:' +
        setId
    );
  }

  var reviewSourceId =
    String(
      row[
        map.REVIEW_SOURCE_ID
      ] || ''
    );

  if (kind === 'LISTENING') {
    entry.listening_set_no =
      setNo;

    if (
      entry.source_mode ===
        'LEGACY_PRE_WEB'
    ) {
      entry.legacy_review_id =
        reviewSourceId;
    } else {
      entry.txn_id =
        reviewSourceId;
    }
  } else {
    entry.written_set_no =
      setNo;
    entry.family_set_no =
      setNo;

    if (
      entry.surface_family ===
        'READING'
    ) {
      entry.reading_set_no =
        setNo;
    } else if (
      entry.surface_family ===
        'TRANSLATION'
    ) {
      entry.translation_set_no =
        setNo;
    }
  }

  return entry;
}


function h3ReviewHomeIndexEnvelopes_(
  spreadsheet
) {
  var indexed =
    h3ReviewHomeIndexTable_(
      spreadsheet
    );
  var out = [];
  var seen = {};

  indexed.table.rows.forEach(
    function (row) {
      if (
        !String(
          row[
            indexed.table.map.SET_ID
          ] || ''
        )
      ) {
        return;
      }

      if (
        String(
          row[
            indexed.table.map.STATUS
          ] || ''
        ) !== 'ACTIVE'
      ) {
        return;
      }

      var entry =
        h3ReviewHomeIndexRowEntry_(
          row,
          indexed.table.map
        );
      if (
        entry.review_kind === 'WRITTEN' &&
        typeof h3WrittenReviewAnsweredAtBackfillRecord_ ===
          'function'
      ) {
        var answeredAtBackfill =
          h3WrittenReviewAnsweredAtBackfillRecord_(
            spreadsheet,
            entry.set_id,
            entry.answered_at
          );

        if (answeredAtBackfill) {
          entry.answered_at =
            answeredAtBackfill.answeredAt;
          entry.answered_at_precision =
            answeredAtBackfill.precision;
          entry.answered_at_evidence =
            answeredAtBackfill.evidence;
          entry.answered_at_note =
            answeredAtBackfill.note;
        }
      }

      var key =
        entry.review_kind +
        '|' +
        entry.set_id;

      if (seen[key]) {
        throw new Error(
          'REVIEW_HOME_INDEX_DUPLICATE:' +
            key
        );
      }
      seen[key] = true;

      out.push({
        kind:
          entry.review_kind,
        surface_family:
          entry.surface_family,
        level:
          entry.level,
        set_id:
          entry.set_id,
        set_no:
          Number(
            entry.listening_set_no ||
            entry.written_set_no ||
            0
          ),
        answered_at:
          entry.answered_at,
        review_source_id:
          entry.txn_id ||
          entry.legacy_review_id ||
          entry.set_id,
        source_mode:
          entry.source_mode,
        entry: entry
      });
    }
  );

  return out;
}


function h3ReviewTimestampMs_(
  value
) {
  var normalized =
    String(value || '').trim();

  if (
    !normalized ||
    normalized === 'UNKNOWN'
  ) {
    return null;
  }

  var parsed =
    Date.parse(normalized);

  return isNaN(parsed)
    ? null
    : parsed;
}


function h3ReviewNowMs_() {
  return new Date().getTime();
}


function h3ReviewOldestKnownTimestampMs_(
  envelopes
) {
  var known =
    envelopes.map(
      function (envelope) {
        return h3ReviewTimestampMs_(
          envelope.answered_at
        );
      }
    ).filter(
      function (value) {
        return value !== null;
      }
    );

  if (!known.length) {
    return null;
  }

  return Math.min.apply(
    null,
    known
  );
}


function h3ReviewLevelFromBase_(
  base,
  effectiveTimestampMs,
  nowMs
) {
  var normalizedBase =
    Math.max(
      0,
      Math.min(
        100,
        Number(base || 0)
      )
    );
  var ageDays =
    Math.max(
      0,
      (
        Number(nowMs) -
        Number(effectiveTimestampMs)
      ) /
      86400000
    );
  var forgettingPressure =
    1 - Math.pow(
      2,
      -ageDays /
      H3_REVIEW_LEVEL_HALF_LIFE_DAYS_
    );
  var level =
    normalizedBase +
    (
      (100 - normalizedBase) *
      H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_ *
      forgettingPressure
    );

  return {
    base:
      Math.round(
        normalizedBase
      ),
    age_days:
      Math.round(
        ageDays * 10
      ) / 10,
    forgetting_pressure:
      Math.round(
        forgettingPressure * 1000
      ) / 1000,
    level: Math.max(
      0,
      Math.min(
        100,
        Math.round(level)
      )
    )
  };
}


function h3ReviewCooldownMeta_(
  priority,
  lastReviewedAt,
  nowMs
) {
  var normalizedPriority =
    Math.max(
      0,
      Math.min(
        100,
        Number(priority || 0)
      )
    );
  var lastReviewedMs =
    h3ReviewTimestampMs_(
      lastReviewedAt
    );

  if (lastReviewedMs === null) {
    return {
      active: false,
      factor: 1,
      age_hours: null,
      cap: null,
      level:
        Math.round(
          normalizedPriority
        )
    };
  }

  var ageHours =
    Math.max(
      0,
      (
        Number(nowMs) -
        Number(lastReviewedMs)
      ) /
      3600000
    );
  var level;
  var cap = null;

  if (
    ageHours <
    H3_REVIEW_COOLDOWN_CAP_HOURS_
  ) {
    cap =
      H3_REVIEW_COOLDOWN_CAP_START_ +
      (
        (
          H3_REVIEW_COOLDOWN_CAP_24H_ -
          H3_REVIEW_COOLDOWN_CAP_START_
        ) *
        (
          ageHours /
          H3_REVIEW_COOLDOWN_CAP_HOURS_
        )
      );
    level =
      Math.min(
        normalizedPriority,
        cap
      );
  } else if (
    ageHours <
    H3_REVIEW_COOLDOWN_RECOVERY_HOURS_
  ) {
    var start =
      Math.min(
        normalizedPriority,
        H3_REVIEW_COOLDOWN_CAP_24H_
      );
    var recoveryProgress =
      (
        ageHours -
        H3_REVIEW_COOLDOWN_CAP_HOURS_
      ) /
      (
        H3_REVIEW_COOLDOWN_RECOVERY_HOURS_ -
        H3_REVIEW_COOLDOWN_CAP_HOURS_
      );

    level =
      start +
      (
        (
          normalizedPriority -
          start
        ) *
        recoveryProgress
      );
  } else {
    level =
      normalizedPriority;
  }

  var roundedLevel =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(level)
      )
    );

  return {
    active:
      ageHours <
      H3_REVIEW_COOLDOWN_RECOVERY_HOURS_,
    factor:
      normalizedPriority > 0
        ? Math.round(
            (
              roundedLevel /
              normalizedPriority
            ) *
            1000
          ) / 1000
        : 1,
    age_hours:
      Math.round(
        ageHours * 10
      ) / 10,
    cap:
      cap === null
        ? null
        : Math.round(
            cap * 10
          ) / 10,
    level:
      roundedLevel
  };
}

function h3ReviewLevelForEntry_(
  kind,
  entry,
  evidence,
  effectiveTimestampMs,
  nowMs
) {
  return h3ReviewLevelFromBase_(
    h3ReviewBaseLevelForEntry_(
      kind,
      entry,
      evidence
    ),
    effectiveTimestampMs,
    nowMs
  );
}

function h3ReviewAttachHomeMetadata_(
  envelopes
) {
  var nowMs =
    h3ReviewNowMs_();

  envelopes.forEach(
    function (envelope) {
      var entry = envelope.entry;
      var actualTimestampMs =
        h3ReviewTimestampMs_(
          envelope.answered_at
        );

      if (
        actualTimestampMs === null
      ) {
        throw new Error(
          'REVIEW_ANSWERED_AT_REQUIRED:' +
            String(entry.set_id || '')
        );
      }

      var priorityState =
        h3ReviewPriorityStateParse_(
          entry.priority_state_json,
          entry.set_id
        );
      var levelMeta =
        priorityState
          ? h3ReviewDynamicLevelFromState_(
              entry.review_base_level,
              priorityState,
              nowMs
            )
          : h3ReviewLevelFromBase_(
              entry.review_base_level,
              actualTimestampMs,
              nowMs
            );
      var cooldownMeta =
        h3ReviewCooldownMeta_(
          levelMeta.level,
          entry.last_reviewed_at,
          nowMs
        );

      envelope.review_effective_at =
        new Date(
          actualTimestampMs
        ).toISOString();

      entry.review_effective_at =
        envelope.review_effective_at;
      entry.review_time_source =
        priorityState
          ? 'DYNAMIC_SKILL_EVIDENCE'
          : 'ANSWERED_AT_LEGACY';
      entry.review_age_days =
        levelMeta.age_days;
      entry.review_forgetting_pressure =
        levelMeta.forgetting_pressure;
      entry.review_base_level =
        levelMeta.base;
      entry.review_priority_before_cooldown =
        levelMeta.level;
      entry.review_dynamic_priority_active =
        !!priorityState;
      entry.review_cooldown_active =
        cooldownMeta.active;
      entry.review_cooldown_factor =
        cooldownMeta.factor;
      entry.review_cooldown_age_hours =
        cooldownMeta.age_hours;
      entry.review_cooldown_cap =
        cooldownMeta.cap;
      entry.review_level =
        cooldownMeta.level;
      entry.review_level_contract =
        H3_REVIEW_LEVEL_CONTRACT_;
    }
  );
}

function h3ReviewHomeHistory_(
  spreadsheet
) {
  var envelopes =
    h3ReviewHomeIndexEnvelopes_(
      spreadsheet
    );

  h3ReviewAttachHomeMetadata_(
    envelopes
  );

  envelopes.sort(function (a, b) {
    if (
      a.review_effective_at !==
      b.review_effective_at
    ) {
      return a.review_effective_at <
        b.review_effective_at
        ? 1
        : -1;
    }

    if (a.set_id !== b.set_id) {
      return a.set_id < b.set_id
        ? 1
        : -1;
    }

    return b.set_no - a.set_no;
  });

  return envelopes
    .slice(0, 50)
    .map(function (envelope) {
      return envelope.entry;
    });
}

function h3ReviewCurrentLearning_(
  spreadsheet
) {
  var candidates = [];

  h3ReviewProviders_().forEach(
    function (provider, index) {
      var current =
        provider.currentLearning(
          spreadsheet
        );

      if (current) {
        candidates.push({
          order:
            Number(
              provider.order || index
            ),
          current: current
        });
      }
    }
  );

  if (!candidates.length) {
    return null;
  }

  if (candidates.length > 1) {
    throw new Error(
      'REVIEW_CURRENT_LEARNING_AMBIGUOUS'
    );
  }

  return candidates[0].current;
}


function buildReviewHomePayload_() {
  var spreadsheet =
    SpreadsheetApp.openById(
      H3_WEB_RUNTIME_SPREADSHEET_ID
    );

  return {
    schema:
      'H3_WEB_HOME_V1',
    mode: 'HOME',
    read_only: true,
    current_learning: null,
    review_history:
      h3ReviewHomeHistory_(
        spreadsheet
      ),
    review_filters: [
      'ALL',
      'LISTENING',
      'WRITTEN'
    ],
    review_sorts: [
      'RECENT',
      'REVIEW_LEVEL'
    ],
    review_level_contract:
      H3_REVIEW_LEVEL_CONTRACT_,
    review_home_index_contract:
      'H3_REVIEW_HOME_INDEX_V5_COMPAT',
    learning_surface_schema:
      'H3_LEARNING_SURFACE_V1',
    review_level_half_life_days:
      H3_REVIEW_LEVEL_HALF_LIFE_DAYS_,
    review_level_time_headroom_share:
      H3_REVIEW_LEVEL_TIME_HEADROOM_SHARE_,
    review_cooldown_cap_start:
      H3_REVIEW_COOLDOWN_CAP_START_,
    review_cooldown_cap_24h:
      H3_REVIEW_COOLDOWN_CAP_24H_,
    review_cooldown_cap_hours:
      H3_REVIEW_COOLDOWN_CAP_HOURS_,
    review_cooldown_recovery_hours:
      H3_REVIEW_COOLDOWN_RECOVERY_HOURS_
  };
}


function h3ReviewRenderRequest_(request) {
  if (
    request &&
    request.mode === 'HOME'
  ) {
    return buildReviewHomePayload_();
  }

  var provider =
    h3ReviewProviderForRequest_(
      request
    );

  if (
    request &&
    request.mode === 'REVIEW'
  ) {
    return h3ReviewAttachSurfaceMetadata_(
      provider,
      provider.openReview(request)
    );
  }

  if (
    request &&
    request.mode === 'REVIEW_REPLAY'
  ) {
    return provider.openReplay(request);
  }

  throw new Error(
    'REVIEW_RENDER_ROUTE_INVALID'
  );
}


function h3ReviewMediaRequest_(request) {
  var provider =
    h3ReviewProviderForRequest_(
      request
    );

  if (
    request &&
    request.mode === 'REVIEW'
  ) {
    return provider.openMedia(request);
  }

  if (
    request &&
    request.mode === 'REVIEW_REPLAY'
  ) {
    return provider.openReplayMedia(
      request
    );
  }

  throw new Error(
    'REVIEW_MEDIA_ROUTE_INVALID'
  );
}


function h3ReviewSubmitRequest_(request) {
  if (
    !request ||
    request.mode !== 'REVIEW_REPLAY'
  ) {
    throw new Error(
      'REVIEW_SUBMIT_ROUTE_INVALID'
    );
  }

  return h3ReviewProviderForRequest_(
    request
  )
    .gradeReplay(request);
}
