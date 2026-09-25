# H3 Review Explanation Style Contract

CONTRACT_ID=H3-REVIEW-EXPLANATION-STYLE-20260925-V4

## 1. Purpose

This contract defines the learner-facing explanation style shared by Review surfaces
`5L | 5W | READING | TRANSLATION`.

It governs explanation prose and representative examples only. It does not change
question/source text, answer semantics, grading, learner history, score, uncertainty,
Review authority, scheduler, skill_queue, retest state, counters, pointers, or media
bindings.

## 2. Meta-text scope

For this contract, Japanese explanation meta-text is the umbrella category for
learner-facing explanatory prose. It includes the semantic roles corresponding to:

- `reason`: why the answer is correct or how it fits the source/context;
- `learning_blocks[].usage`: how the target word/grammar/expression works;
- `learning_blocks[].note`: supplemental nuance, contrast, caution, or other
  information that supports the main learning point.

Accordingly, `note` is a subtype of meta-text, not a parallel concept:
`note ⊂ meta-text`.

Provider-specific schemas may use equivalent fields, but the semantic role must be
the same.

The following are NOT meta-text and are excluded from style normalization:

- `body_ja`
- choice translations such as `choices[].ja`
- `example_ja`
- Korean source text or Korean examples
- quoted source/answer text embedded inside an explanation
- learner-facing dialogue/utterances whose honorific/register is part of the source
- short labels, glosses, headings, vocabulary entries, pronunciation notation, and
  other fragments that do not naturally take a Japanese sentence-ending register

## 3. Japanese rendering style

Review explanation meta-text uses concise, natural Japanese plain style, with existing
5L Review explanations as the rendering reference.

"Plain style" does NOT mean mechanically converting polite endings into `だ` or
`である`. Choose the sentence ending that gives the same compact, natural
explanatory rhythm as 5L.

Use an ordinary verbal predicate when that is the natural Japanese sentence shape,
for example:

- `～を表す。`
- `～が一致する。`
- `～になる。`
- `～に対応する。`
- `～に焦点がある。`
- `～ではない。`

Use a compact nominal/na-adjectival ending when it is clearer and more natural, for
example:

- `～が適切。`
- `～が自然。`
- `～という表現。`
- `～という意味。`
- `～自動詞。`
- `～固有数詞。`

For answer evaluation, prefer `～が適切。` over `～が合う。` when both
could express the intended judgment.

Do not mechanically add `だ` or `である` to short explanatory fragments.
Likewise, do not mechanically strip `だ` from every sentence. Natural predicates
such as `対照的だ。`, `実用的だ。`, or context sentences such as
`三日後だ。` may remain when `だ` is part of a natural ordinary sentence.

The governing principle is naturalness and compactness, not formal uniformity of the
ending.

### 3.1 5L reference examples

The following existing 5L patterns illustrate the target style:

- `予定表では8日に東京を出発して仙台へ行き、9日に東京へ戻るため、③の
  「1泊2日で出張」が一致する。①は英会話が土曜日、②は演劇の後に昼食、
  ④は帰京後に出社・報告なので一致しない。`
- `相手は試験が心配だと述べているため、具体的な勉強方法を提案する①が
  自然な応答になる。`
- `動作が進行中であることを表す。`
- `相手に「～してみるのはどうですか」と柔らかく提案する。`
- `～してもよい。許容・可能を表す。`
- `자꾸は繰り返し起こること、계속は継続性に重点がある。`
- `同じ予定の場面では、바로のほうが時間的な間を置かない感じが強い。`
- `本文では材料費は受講料に含まれているため、別払いではない。`

These examples are style references, not templates to be copied mechanically.

### 3.2 Excluded text

Source translations, answer-choice translations, `example_ja`, quoted source/answer
text, Korean examples, and learner-facing utterances preserve their own semantic
register and honorific meaning.

For example, a translation such as
`→ 同僚が手伝ってくれたおかげで、準備を早く終えました。`
remains polite if that is the intended translation. It is not meta-text.

The existing 5L Review meta-text is the reference direction for rendering only; this
contract does not make historical 5L payload rows mutable.

## 4. Representative-example non-duplication

A representative example must normally use a different surface from the exact correct
answer.

For this contract, a representative example includes:

- explicit `example_ko`
- a Korean example sentence embedded in `learning_blocks[].usage`
- a Korean example sentence embedded in `learning_blocks[].note`

The representative example must not, after whitespace and terminal-punctuation
normalization, be identical to:

- the exact correct choice surface; or
- the exact completed correct-answer surface used as the answer-bearing sentence.

If the exact answer surface needs to be cited to explain why it is correct, cite it in
the rationale/choice explanation. Do not reuse that same surface as the representative
example.

The preferred replacement is a short, modern, natural example that demonstrates the
same grammar/vocabulary point in a different context or surface. It must preserve the
same learning point and must not introduce rare, archaic, dialectal, or technical
language solely to avoid duplication.

## 4.1 Representative-example context separation

Changing only punctuation, politeness, a small adjunct, or one peripheral noun is not
sufficient when the result still reproduces the same answer-bearing context. The
representative example should normally move to a different ordinary situation while
preserving the target grammar/vocabulary relation.

The exact-surface duplicate gate is the deterministic minimum. Semantic/context
separation remains an authoring requirement and must be checked in source review when
it cannot be proven mechanically.

## 4.2 Shared pronunciation blocks

When a 3級 or 準2級 pronunciation point is genuinely useful, use the shared structured
learning block:

- `type: pronunciation`
- `surface`: the exact useful surface form from the question/context
- `actual`: the representative realized pronunciation

Render it as `surface → [actual]`. Normally show one representative surface per
pronunciation skill. Do not add unchanged pronunciation, lower-level mechanical
changes, duplicate dictionary/inflected forms, or a broad rule dump.

## 4.3 Shared Hanja network

Hanja explanation is shared across all Review families when a common, learning-useful
Sino-Korean word is present.

Use `word（漢字）` for the target. Related examples must be modern common standalone
words that share the relevant Hanja character; do not present a compound fragment,
repeat only the same component, or invent a rare/technical word merely to complete a
network.

When a compact text network is used, preserve exactly three semantic lines when
available:

```text
target（漢字）
⇒ related examples
≠ same-Hangul-syllable examples with different Hanja
```

Omit a related/homophone line when no safe modern-common example exists. The renderer
must preserve stored newline boundaries for every Review family.

## 4.4 Semantic relation symbols

Relation symbols must match the relation actually being explained.

- `⇒`: a directed related/example relation.
- `≠`: explicit non-equivalence, including Hanja same-syllable/different-character
  contrast.
- `↔`: a genuine paired contrast/alternation such as transitive↔intransitive or
  state↔change; do not use it for two expressions that are merely different in
  strength or meaning.

When a symbol would be ambiguous, use words instead of forcing a symbol.

## 4.5 Learner-oriented Japanese and test meta

Japanese source/body/choice/example translations are outside meta-style normalization
but still must be natural in their actual context. Prefer ordinary contemporary
Japanese over morpheme-by-morpheme literalism. When a materially ambiguous translation
cannot be resolved from the locked source alone, use an authorized primary dictionary
or reliable corpus as verification evidence rather than guessing.

Generic test-taking commentary is not a learning block. Phrases such as
`内容一致問題では…`, `タイトル選択では…`, or `この設問では…` must be
replaced by an explanation of the actual word, grammar, discourse relation, or source
meaning. Source-specific rationale may still compare numbered choices or explain why a
particular source fact supports the answer.

## 5. Historical Review policy

Locked or committed historical Review authorities remain immutable.

Historical corrections required by this contract must use an existing validated
Review overlay/display-normalization mechanism, or an equivalent source-bound,
fail-closed layer, keyed to the exact validated base authority.

Historical correction must not rewrite:

- learner history or answers
- score or uncertainty
- SET_ID / STAGE_ID / TXN_ID
- source-binding hashes or base Review hashes
- scheduler / skill_queue / retest state
- counters or pointers

A historical style correction is presentation/explanation content only.

## 6. Future authoring policy

Future Review explanation authoring must satisfy all of the following before issue/lock:

1. Japanese meta-text follows section 3: concise, natural plain explanatory Japanese
   aligned with 5L.
2. The renderer/author must choose between a verbal sentence and a compact nominal
   ending by naturalness; it must not apply mechanical polite→`だ/である` conversion
   or universal noun-ending truncation.
3. Answer-evaluation wording prefers `適切` over `合う` when that better expresses
   the judgment.
4. Representative examples do not duplicate the exact correct answer surface and
   normally use a meaningfully different ordinary context.
5. Generic test-taking meta-text is rejected; explain the actual linguistic or source
   relation instead.
6. Pronunciation blocks follow section 4.2 and only surface 3級/準2級 learning value.
7. Hanja networks follow section 4.3 and preserve stored line boundaries.
8. Relation symbols follow section 4.4 and must not imply a relation the text denies.
9. Text excluded by section 3.2 is not rewritten merely to satisfy meta-text style.

A future authoring/audit gate may reject or regenerate violations before issue. The
gate must inspect semantic roles, not blindly convert all Japanese strings.

## 7. Current migration direction

The current historical direction is:

- 5L: keep current plain-style meta-text; only independently identified example
  duplication requires correction.
- 5W: normalize explanation meta-text to plain style.
- READING: normalize explanation meta-text to plain style.
- TRANSLATION: normalize explanation meta-text to plain style.

This section defines direction only. It does not itself authorize rewriting historical
payloads.

## 8. Acceptance boundary

Conformance means:

- no polite-register endings remain in in-scope Japanese meta-text after the relevant
  historical/future migration, except inside excluded quoted/source material;
- no representative example equals the exact correct choice/completed-answer surface
  after the defined normalization;
- body/choice/example translations and source utterance register remain unchanged;
- all existing Review/source/learner-state integrity contracts continue to pass.
