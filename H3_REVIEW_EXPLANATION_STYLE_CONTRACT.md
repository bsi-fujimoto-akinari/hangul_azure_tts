# H3 Review Explanation Style Contract

CONTRACT_ID=H3-REVIEW-EXPLANATION-STYLE-20260922-V2

## 1. Purpose

This contract defines the learner-facing explanation style shared by Review surfaces
`5L | 5W | READING | TRANSLATION`.

It governs explanation prose and representative examples only. It does not change
question/source text, answer semantics, grading, learner history, score, uncertainty,
Review authority, scheduler, skill_queue, retest state, counters, pointers, or media
bindings.

## 2. Meta-text scope

For this contract, Japanese explanation meta-text means explanatory prose stored or
materialized in the semantic roles corresponding to:

- `reason`
- `learning_blocks[].usage`
- `learning_blocks[].note`

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

## 3. Japanese register

Review explanation meta-text uses Japanese plain explanatory style (常体).

Preferred expression follows the concise, natural direction already used by 5L.
In particular:

- `～を表す。`
- `～が適切。`
- `～が自然。`
- `～が自然な応答になる。`
- `～に対応する。`
- `～に焦点がある。`
- `～という意味。` when the sentence naturally functions as a compact definition

Avoid `～が合う。` as an answer-evaluation conclusion when `～が適切。` is
clearer. Avoid mechanically closing short nominal or na-adjectival explanation
fragments with `だ`; forms such as `表現。`, `意味。`, `自動詞。`,
`自然。`, and `適切。` are preferred when they read naturally.

Do not force noun-ending fragments where a verbal sentence is clearer. Forms such as
`～を表す。`, `～になる。`, `～が一致する。`, and
`～に焦点がある。` remain normal. The goal is the same compact explanatory
rhythm as 5L, not uniform truncation.

Source translations, example translations, quoted answer text, and Korean utterances
must preserve their own semantic register and honorific meaning. A polite utterance
inside an example is not a violation of this contract.

The existing 5L Review meta-text is the reference direction for register only; this
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

Future Review explanation authoring must satisfy both rules before issue/lock:

1. Japanese meta-text uses concise natural plain explanatory style aligned with 5L,
   including the compact nominal-ending policy in section 3.
2. Representative examples do not duplicate the exact correct answer surface.

A future authoring/audit gate may reject violations before issue. The gate must inspect
semantic roles, not blindly convert all Japanese strings.

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
