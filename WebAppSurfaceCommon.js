/**
 * Common learning-surface contract helpers.
 *
 * Phase 1 introduces provider/family/level/cardinality metadata without
 * changing current 5L or 5W source-lock, grading, scheduler, media, or
 * transaction ownership.
 */

var H3_LEARNING_SURFACE_SCHEMA_ =
  'H3_LEARNING_SURFACE_V1';

var H3_LEARNING_SURFACE_FAMILIES_ = [
  '5L',
  '5W',
  'READING',
  'TRANSLATION'
];

var H3_LEARNING_SURFACE_LEVELS_ = [
  '3級',
  '準2級'
];

var H3_LEARNING_SURFACE_MODE_DEFAULTS_ = {
  LISTENING: {
    provider_kind: 'LISTENING',
    surface_family: '5L',
    level: '3級'
  },
  WRITTEN: {
    provider_kind: 'WRITTEN',
    surface_family: '5W',
    level: '3級'
  }
};

function h3LearningSurfaceExpectedSections_(
  surfaceFamily
) {
  if (surfaceFamily === '5L') {
    return ['K1', 'K2', 'K3', 'K4', 'K5'];
  }

  if (surfaceFamily === '5W') {
    return ['D2', 'D3', 'D4', 'D5', 'D6'];
  }

  return null;
}

function h3LearningSurfaceValidate_(
  metadata,
  items
) {
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    Array.isArray(metadata)
  ) {
    throw new Error(
      'LEARNING_SURFACE_METADATA_REQUIRED'
    );
  }

  if (
    String(metadata.learning_surface_schema || '') !==
      H3_LEARNING_SURFACE_SCHEMA_
  ) {
    throw new Error(
      'LEARNING_SURFACE_SCHEMA_INVALID'
    );
  }

  var providerKind =
    String(metadata.provider_kind || '');
  var surfaceFamily =
    String(metadata.surface_family || '');
  var level =
    String(metadata.level || '');
  var itemCount =
    Number(metadata.item_count);

  if (
    ['LISTENING', 'WRITTEN']
      .indexOf(providerKind) < 0
  ) {
    throw new Error(
      'LEARNING_SURFACE_PROVIDER_INVALID'
    );
  }

  if (
    H3_LEARNING_SURFACE_FAMILIES_
      .indexOf(surfaceFamily) < 0
  ) {
    throw new Error(
      'LEARNING_SURFACE_FAMILY_INVALID'
    );
  }

  if (
    H3_LEARNING_SURFACE_LEVELS_
      .indexOf(level) < 0
  ) {
    throw new Error(
      'LEARNING_SURFACE_LEVEL_INVALID'
    );
  }

  if (
    surfaceFamily === '5L' &&
    providerKind !== 'LISTENING'
  ) {
    throw new Error(
      'LEARNING_SURFACE_PROVIDER_FAMILY_MISMATCH'
    );
  }

  if (
    surfaceFamily !== '5L' &&
    providerKind !== 'WRITTEN'
  ) {
    throw new Error(
      'LEARNING_SURFACE_PROVIDER_FAMILY_MISMATCH'
    );
  }

  if (
    !Number.isInteger(itemCount) ||
    itemCount < 1
  ) {
    throw new Error(
      'LEARNING_SURFACE_ITEM_COUNT_INVALID'
    );
  }

  if (!Array.isArray(items)) {
    throw new Error(
      'LEARNING_SURFACE_ITEMS_REQUIRED'
    );
  }

  if (items.length !== itemCount) {
    throw new Error(
      'LEARNING_SURFACE_ITEM_COUNT_MISMATCH'
    );
  }

  var expectedSections =
    h3LearningSurfaceExpectedSections_(
      surfaceFamily
    );

  if (expectedSections) {
    if (itemCount !== 5) {
      throw new Error(
        'LEARNING_SURFACE_FIXED_CARDINALITY_INVALID'
      );
    }

    items.forEach(function (item, index) {
      if (
        !item ||
        String(item.section || '') !==
          expectedSections[index]
      ) {
        throw new Error(
          'LEARNING_SURFACE_SECTION_ORDER_INVALID'
        );
      }
    });
  }

  return true;
}

function h3LearningSurfaceMetadataForMode_(
  mode,
  items
) {
  var normalizedMode =
    String(mode || '');
  var defaults =
    H3_LEARNING_SURFACE_MODE_DEFAULTS_[
      normalizedMode
    ];

  if (!defaults) {
    throw new Error(
      'LEARNING_SURFACE_MODE_INVALID'
    );
  }

  var metadata = {
    learning_surface_schema:
      H3_LEARNING_SURFACE_SCHEMA_,
    provider_kind:
      defaults.provider_kind,
    surface_family:
      defaults.surface_family,
    level:
      defaults.level,
    item_count:
      Array.isArray(items)
        ? items.length
        : 0
  };

  h3LearningSurfaceValidate_(
    metadata,
    items
  );

  return metadata;
}

function h3LearningSurfaceLegacyReviewMetadata_(
  providerKind
) {
  var normalized =
    String(providerKind || '');

  if (normalized === 'LISTENING') {
    return {
      learning_surface_schema:
        H3_LEARNING_SURFACE_SCHEMA_,
      provider_kind: 'LISTENING',
      surface_family: '5L',
      level: '3級'
    };
  }

  if (normalized === 'WRITTEN') {
    return {
      learning_surface_schema:
        H3_LEARNING_SURFACE_SCHEMA_,
      provider_kind: 'WRITTEN',
      surface_family: '5W',
      level: '3級'
    };
  }

  throw new Error(
    'LEARNING_SURFACE_LEGACY_PROVIDER_INVALID'
  );
}


var H3_REVIEW_EXPLANATION_STYLE_CONTRACT_ID_ =
  'H3-REVIEW-EXPLANATION-STYLE-20260925-V4';


function h3ReviewExplanationStyleComparable_(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[。.!?！？]+$/, '');
}


function h3ReviewExplanationStyleRegexEscape_(value) {
  return String(value || '')
    .replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
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

  // Match the compact, natural learner-facing rhythm already used by 5L.
  // This is intentionally narrow: it only adjusts answer-evaluation wording
  // and sentence-final nominal/na-adjectival predicates.
  out = out
    .replace(
      /が合う(?=[。！？!?]|$)/g,
      'が適切'
    )
    .replace(
      /(自然|適切|重要|同じ|自動詞|他動詞|表現|意味|予測|段階|語|数詞|固有数詞|固有語|手掛かり|対比|ニュアンス|状態|理由|形|焦点|必要|義務|許可|組み合わせ|勧誘|中心情報)だ(?=[。！？!?]|$)/g,
      '$1'
    )
    .replace(
      /([가-힣][가-힣A-Za-z0-9_+\-\/().]*) だ(?=[。！？!?]|$)/g,
      '$1'
    )
    .replace(
      '時間だけでなく、気持ち・経済面などにも使える「余裕がない」だ。',
      '時間だけでなく、気持ち・経済面などにも使える「余裕がない」という表現。'
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
  var normalized =
    String(value || '')
      .split('\n')
      .map(function (line) {
        return h3ReviewExplanationStyleMapUnquotedLine_(
          line,
          h3ReviewExplanationStylePlainSegment_
        );
      })
      .join('\n');

  // Two historical constructions cross a quoted gloss boundary, so the
  // segment-wise normalizer cannot see the predicate as a whole.
  normalized = normalized
    .replace(
      '時間だけでなく、気持ち・経済面などにも使える「余裕がない」だ。',
      '時間だけでなく、気持ち・経済面などにも使える「余裕がない」という表現。'
    )
    .replace(
      /사흘 は固有語で「([^」]+)」だ。/g,
      '사흘 は「$1」を表す固有語。'
    );

  return normalized;
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


function h3ReviewExplanationStyleHasAwkwardMeta_(
  value
) {
  var awkward =
    /(?:が合う|(自然|適切|重要|同じ|自動詞|他動詞|表現|意味|予測|段階|語|数詞|固有数詞|固有語|手掛かり|対比|ニュアンス|状態|理由|形|焦点|必要|義務|許可|組み合わせ|勧誘|中心情報)だ|[가-힣][가-힣A-Za-z0-9_+\-\/().]* だ)(?=[。！？!?]|$)/;

  return String(value || '')
    .split('\n')
    .some(function (line) {
      var found = false;

      h3ReviewExplanationStyleMapUnquotedLine_(
        line,
        function (segment) {
          if (awkward.test(segment)) {
            found = true;
          }
          awkward.lastIndex = 0;
          return segment;
        }
      );

      return found;
    });
}


function h3ReviewExplanationStyleHasGenericTestTakingMeta_(
  value
) {
  var generic =
    /(?:内容一致問題では|タイトル選択では|この設問では|設問では|この問題では|正解を選ぶ(?:には|とき)|選択肢を一つずつ照合)/;

  return String(value || '')
    .split('\n')
    .some(function (line) {
      var found = false;

      h3ReviewExplanationStyleMapUnquotedLine_(
        line,
        function (segment) {
          if (generic.test(segment)) {
            found = true;
          }
          generic.lastIndex = 0;
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

    if (
      entry.value &&
      h3ReviewExplanationStyleHasAwkwardMeta_(
        entry.value
      )
    ) {
      throw new Error(
        'REVIEW_EXPLANATION_STYLE_AWKWARD_META:' +
          String(label || '') +
          ':' +
          entry.field
      );
    }

    if (
      entry.value &&
      h3ReviewExplanationStyleHasGenericTestTakingMeta_(
        entry.value
      )
    ) {
      throw new Error(
        'REVIEW_EXPLANATION_STYLE_GENERIC_TEST_META:' +
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
    h3ReviewExplanationStyleNormalizeMetaText_(
      'この表現が合う。'
    ) !==
      'この表現が適切。' ||
    h3ReviewExplanationStyleNormalizeMetaText_(
      'この形が自然だ。'
    ) !==
      'この形が自然。' ||
    h3ReviewExplanationStyleNormalizeMetaText_(
      '60を表す固有数詞だ。'
    ) !==
      '60を表す固有数詞。' ||
    h3ReviewExplanationStyleNormalizeMetaText_(
      '共通して入るのは 세우다 だ。'
    ) !==
      '共通して入るのは 세우다。' ||
    h3ReviewExplanationStyleNormalizeMetaText_(
      '사흘 は固有語で「3日」だ。'
    ) !==
      '사흘 は「3日」を表す固有語。' ||
    h3ReviewExplanationStyleHasPoliteMeta_(
      probe.reason
    ) ||
    h3ReviewExplanationStyleHasPoliteMeta_(
      probe.learning_blocks[0].usage
    ) ||
    h3ReviewExplanationStyleHasAwkwardMeta_(
      h3ReviewExplanationStyleNormalizeMetaText_(
        'この表現が合う。'
      )
    ) ||
    !h3ReviewExplanationStyleHasGenericTestTakingMeta_(
      '内容一致問題では、本文と選択肢を照合する。'
    ) ||
    h3ReviewExplanationStyleHasGenericTestTakingMeta_(
      '本文では二つの状態を対比している。'
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
