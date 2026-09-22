# H3 Review Explanation Style Contract

CONTRACT_ID=H3-REVIEW-EXPLANATION-STYLE-20260923-V3

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
4. Representative examples do not duplicate the exact correct answer surface.
5. Text excluded by section 3.2 is not rewritten merely to satisfy meta-text style.

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
