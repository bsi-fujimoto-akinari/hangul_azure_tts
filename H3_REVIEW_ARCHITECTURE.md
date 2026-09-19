# H3 Review Architecture

Version: H3-R3-09B-REVIEW-ARCHITECTURE-20260919-V2  
Status: R3_09D_DEVICE_VALIDATED

## 1. Purpose

R3-09B freezes the learner-review architecture for Listening 5L before R3-10 full E2E audit.

The design goal is:

```text
issue -> answer -> COMMITTED -> full review in Web App
                              -> persistent review reopen
                              -> optional nonlearning replay
```

The existing production answer transaction, learner history, scheduler, retest, K1_READY, locked set payload, and individual audio architecture remain authoritative and are not redesigned by R3-09B.

R3-09B is architecture-only. It does not:
- create or alter learner answers;
- rewrite L02/L03 history;
- advance counters or pointers;
- change scheduler/retest state;
- enable normal-live production;
- change the current learner Web App behavior by itself.

## 2. Architectural decision

The Apps Script Web App becomes the complete learner surface for Listening:

1. issue and answering;
2. grading;
3. immediate full explanation;
4. persistent review after the page has been closed;
5. optional nonlearning replay.

Chat remains responsible for authoring/orchestration/audit and may verify a receipt, but a learner must not be required to send a receipt to Chat merely to obtain the explanation.

The receipt remains useful as an audit/coordination pointer and preserves the existing backend transaction contract.

## 3. Source-of-truth model

Existing authorities remain unchanged:

- `listening_web_txn_v1`
  - canonical committed answer transaction;
  - user answer vector, uncertainty, score, result, transaction identity.

- `listening_log_v1`
  - canonical learner result/history rows.

- `listening_state_v1`
  - canonical learner Listening runtime state.

- `listening_set_payload_v1`
  - immutable issued-set semantic payload, answer key, source provenance and audio binding.

- `listening_k1_ready_v1`
  - immutable bound K1 source after issue.

- `listening_audio_queue_v1` + bound Drive MP3
  - exact audio authority.

R3-09B adds one new normative content source and one lightweight persistent review binding.

## 4. Explanation payload

New sheet:

`listening_explanation_payload_v1`

Row unit:

`one LISTENING_SET_ID + one SECTION_KEY`

Required fields:

```text
LISTENING_SET_ID
SECTION_KEY
EXPLANATION_REVISION_ID
CREATED_AT
STATUS
EXPLANATION_JSON
EXPLANATION_SHA256
ITEM_PAYLOAD_SHA256
RULE_VERSION
EXPLANATION_SET_SHA256
LOCKED_AT
```

Allowed `SECTION_KEY`:
- K1
- K2
- K3
- K4
- K5

Normal issue status:
`LOCKED`

There must be exactly five LOCKED rows for one future issued set.

### 4.1 Content contract

`EXPLANATION_JSON` is semantic content, not rendered HTML.

It may contain:

```text
section
body_ko
body_ja
choices[]
correct_choice
reason
learning_blocks[]
```

`learning_blocks[]` may use the established explanation categories:
- meaning;
- grammar;
- pronunciation;
- vocabulary network;
- collocation/related expression;
- hanja.

Rendering follows the active Listening and general quiz explanation rules. The payload must not contain scheduler/progress/storage meta commentary.

### 4.2 Authoring timing

For new sets after activation:

```text
final item payload
-> answer audit PASS
-> explanation authoring
-> explanation audit
-> explanation LOCKED
-> explanation exact readback/hash
-> audio/source-lock/preissue
-> learner issue
```

The explanation is prepared before learner issue but is never exposed before grading.

This gives immediate postgrade review without generating explanation after the learner has already answered.

### 4.3 Hash contract

Each section has `EXPLANATION_SHA256`.

`EXPLANATION_SET_SHA256` is computed from canonical compact JSON containing:

```text
LISTENING_SET_ID
ITEM_PAYLOAD_SHA256
RULE_VERSION
ordered K1-K5 SECTION_KEY + EXPLANATION_REVISION_ID + EXPLANATION_SHA256
```

Order is exactly K1,K2,K3,K4,K5.

Any mismatch is a STOP condition for future sets after the review architecture is activated.

### 4.4 Immutability and corrections

A LOCKED explanation row is immutable.

Do not overwrite an issued explanation to improve wording later.

A correction, if required, must be an append-only new `EXPLANATION_REVISION_ID`. The transaction-specific review binding determines the exact revision used for reproducibility.

Correction-overlay UX is outside R3-09B v1.

## 5. Persistent review binding

New sheet:

`listening_review_binding_v1`

Row unit:

`one committed production TXN_ID`

Required fields:

```text
TXN_ID
LISTENING_SET_ID
LISTENING_SET_NO
CREATED_AT
STATUS
RESULT_SHA256
ITEM_PAYLOAD_SHA256
EXPLANATION_SET_SHA256
AUDIO_BINDING_SHA256
K1_IMAGE_SHA256
REVIEW_CONTRACT_ID
REVIEW_BINDING_SHA256
LOCKED_AT
```

Normal status:
`LOCKED`

This sheet does not replace the production journal.

The production journal remains the answer authority. The review binding exists only to make exact review reconstruction explicit and stable.

### 5.1 Binding hash

`REVIEW_BINDING_SHA256` is computed from canonical compact JSON containing:

```text
TXN_ID
LISTENING_SET_ID
LISTENING_SET_NO
RESULT_SHA256
ITEM_PAYLOAD_SHA256
EXPLANATION_SET_SHA256
AUDIO_BINDING_SHA256
K1_IMAGE_SHA256
REVIEW_CONTRACT_ID
```

### 5.2 Commit relationship

For new production transactions after activation, a COMMITTED transaction must not be returned to the learner unless the exact review binding can be read back and verified.

Implementation may use PREPARED/LOCKED staging, but the invariant is:

```text
COMMITTED learner transaction
=> exact persistent review is reopenable
```

A review-binding failure must never silently produce a transaction that is reported as successfully reviewable.

The detailed transaction implementation is R3-09C scope.

## 6. Review reconstruction

Persistent review must be reconstructed from canonical persisted sources, never from browser memory.

Exact inputs:

```text
TXN_ID
-> listening_web_txn_v1 exact COMMITTED row
-> exact LISTENING_SET_ID
-> listening_review_binding_v1 exact LOCKED row
-> listening_set_payload_v1 exact issued row
-> bound K1_READY
-> exact individual audio binding
-> exact five explanation rows / revisions
```

All hashes must match the review binding.

Browser-local state is never the source of truth.

Closing Safari, the ChatGPT in-app browser, or the Web App must not destroy the ability to reopen review.

## 7. Web routes

### 7.1 Learner launcher

The parameterless Web App remains the preferred learner URL.

It should expose two top-level destinations after implementation:

- current learning;
- review history.

### 7.2 Persistent review route

Authorized read-only route:

```text
mode=REVIEW&txn_id={TXN_ID}
```

Requirements:
- exact existing COMMITTED production transaction;
- exact LOCKED review binding;
- all source-lock hashes pass;
- no learner write;
- no counter/pointer/scheduler mutation.

An unknown, mismatched, non-COMMITTED, or hash-invalid transaction is a STOP condition.

### 7.3 Internal navigation

Normal learner navigation from the launcher/history list may construct the review route internally.

Chat does not need to expose a long query-string URL for ordinary operation.

## 8. Immediate postgrade review UI

After successful COMMITTED grading, the same Web App transitions directly into full review mode.

Top summary:

```text
score
Q1-Q5 result strip
filter: all / wrong / uncertain / correct
```

Per-question review block:

```text
Qx [display] result

your answer
correct answer
uncertain marker when applicable

inline audio player

script / visible question surface

full explanation
- reason
- needed grammar
- pronunciation when learning-relevant
- vocabulary network
- collocation / contrast
- hanja when relevant
```

K1 additionally retains the exact verified image.

K2/K3 scripts that were hidden before grading become visible only after grading.

### 8.1 Default emphasis

For immediate review:
- ×: explanation expanded;
- △: explanation expanded;
- ○: explanation may be collapsed by default but remains one tap away.

The learner may freely expand/collapse any section.

This is a presentation default only; it never changes learner history.


## 8A. Frozen Review UI contract (V2)

The learner-facing Review UI is frozen as follows.

### 8A.1 Immediate postgrade landing

```text
POSTGRADE_DEFAULT_VIEW=REVIEW
DEFAULT_FILTER=NEEDS_REVIEW
EXPAND_DEFAULT=WRONG,UNCERTAIN
COLLAPSE_DEFAULT=CORRECT
IMMEDIATE_REVIEW_BUILDER=PERSISTENT_REVIEW_BUILDER
RECEIPT_UI=TECHNICAL_DETAILS_COLLAPSED
```

Immediately after a successful COMMITTED transaction, the page must render the exact same persistent Review payload that a later reopen uses.

A separate transient postgrade-only explanation implementation is prohibited.

The initial filter preserves original Q1-Q5 order and hides only fully-correct `○` questions. The learner may switch to `ALL` at any time.

### 8A.2 Summary surface

The top Review summary contains only learner-useful information:

```text
5L set number
score
wrong count
uncertain count
Q1-Q5 result strip
filter: 要復習 / 全問
```

Do not make SET_ID, TXN_ID, hashes, scheduler state, or source metadata primary learner UI.

### 8A.3 Per-question Review card

Each question is one self-contained vertical Review card containing, in this order:

```text
Qx [section display] + result + inline audio control
user answer + uncertain marker
correct answer
exact problem/script surface
full explanation
```

For K1 the exact verified image is displayed in the same card.

For K2/K3 the Korean prompt/choices that were hidden before grading become visible after grading.

For K4/K5 the passage, visible choices, Japanese/Korean surfaces, and explanation remain in one card.

Audio, script, and explanation must not require navigation to separate pages.

### 8A.4 Explanation presentation

For `×` and `△`, full explanation is expanded by default.

For `○`, full explanation is collapsed by default but remains immediately expandable.

The full explanation follows the active H3 explanation rules and may include:
- reason / decisive cue;
- meaning;
- grammar;
- pronunciation only when H3/準2 learning value exists;
- vocabulary network;
- collocation / same-context contrast;
- Hanja when relevant.

System metadata, scheduler commentary, source-lock hashes, and progress diagnostics are not learner-facing explanation content.

### 8A.5 Audio behavior

The compact inline audio player remains on the question-title row when device width permits.

Rules:
- exact bound K1-K5 MP3 only;
- one active player at a time;
- replay freely during Review;
- Drive link is fallback only;
- playback-speed controls and sentence-level seeking are deferred from v1.

### 8A.6 Technical details

Receipt and transaction identifiers are retained but collapsed under a learner-secondary technical-details disclosure.

```text
[技術情報]
SET_ID
TXN_ID
receipt copy control
```

The receipt must not interrupt the normal Review flow.

### 8A.7 Review history UI

The parameterless launcher Review library uses the minimum v1 filters:

```text
すべて
要復習あり
```

Each history entry shows:
- date/time;
- 5L set number;
- score;
- wrong count;
- uncertain count;
- Review action;
- Replay action when available.

Default order is newest first.

### 8A.8 Builder identity

Both entry paths MUST call one server-side semantic builder:

```text
immediate COMMITTED result
  -> TXN_ID
  -> persistent Review builder
  -> Review renderer

later Review history / deep link
  -> TXN_ID
  -> the same persistent Review builder
  -> the same Review renderer
```

This is a hard reproducibility invariant. Browser-local answer state must never be required to reconstruct the Review page.

## 9. Review history library

The parameterless launcher must provide a read-only review library derived from committed production transactions with valid review bindings.

Minimum list information:

```text
date/time
5L set number
score
wrong count
uncertain count
```

Default order:
newest first.

Minimum filters:
- all;
- has wrong;
- has uncertain.

Selecting an entry opens the exact persistent REVIEW surface.

No delete/edit operation is learner-facing in v1.

## 10. REVIEW_REPLAY

REVIEW_REPLAY is an optional nonlearning practice mode launched from a persistent review.

Purpose:
re-answer the same locked Listening surface before revealing its stored explanation.

Rules:

```text
source = exact original set/audio
new audio generation = prohibited
new K1 generation = prohibited
learning history write = prohibited
listening_state write = prohibited
scheduler/retest write = prohibited
counter/pointer advance = prohibited
production journal write = prohibited
K1_READY mutation = prohibited
```

The replay hides:
- correct answer;
- prior user answer;
- explanation;
- K2/K3 scripts before local replay grading.

After local replay completion, it may reveal the persistent review content.

R3-09B v1 does not require replay-attempt persistence. Losing an unfinished replay on page close is acceptable because the canonical review itself remains permanently reopenable.

Replay results must never be interpreted as a formal retest.

## 11. Receipt and Chat ownership after activation

The four-line receipt grammar remains unchanged:

```text
[H3_WEB_SYNC]
SET_ID={LISTENING_SET_ID}
TXN_ID=H3TX-YYYYMMDD-NNNNNN
STATUS=COMMITTED
```

After review architecture activation:
- the Web App renders the full explanation immediately;
- sending the receipt to Chat is optional for the learner;
- Chat may verify the receipt for audit/troubleshooting/coordination;
- Chat must not duplicate backend answer/history writes;
- a later `5L` request reads current backend state and does not require the previous receipt to have been pasted.

This ownership change becomes active only after R3-09C/R3-09D implementation and verification.

## 12. Legacy L03 compatibility

L03 is already COMMITTED before R3-09B and therefore has no preissue explanation payload or review binding.

R3-09B freezes the compatibility rule:

- do not rewrite L03 answer history;
- do not rewrite its production transaction;
- do not change counters/pointers;
- R3-09C may create a postcommit explanation payload and review binding for L03 only after exact transaction/set/source readback;
- the backfill is review metadata, not a learning transaction;
- the backfill must be explicitly marked `LEGACY_POSTCOMMIT_BACKFILL`;
- no inferred answer or source data is permitted.

L03 becomes the first real persistent-review validation fixture after implementation.

## 13. Failure policy

Persistent review is fail-closed.

STOP conditions include:
- missing transaction;
- transaction not COMMITTED;
- SET_ID mismatch;
- missing or duplicate review binding;
- missing explanation section;
- explanation hash mismatch;
- item payload hash mismatch;
- audio binding mismatch;
- K1 image hash mismatch;
- cross-set source mixing;
- unresolved production RECOVERY_REQUIRED.

On STOP:
- do not fabricate explanation;
- do not substitute another set;
- do not regenerate learner history;
- report a review-source-lock failure.

## 14. Storage

The existing 5L script TXT remains:

`03_AUDIO/02_5L/{LISTENING_SET_ID}.txt`

It is a semantic listening script convenience/audit artifact, not the canonical explanation store.

R3-09B does not require new Drive explanation TXT files.

Canonical review content is persisted in Sheets and reconstructed by the Web App.

## 15. R3 phase plan

```text
R3-09B = REVIEW_ARCHITECTURE_FREEZE
R3-09C = REVIEW_PERSISTENCE_IMPLEMENTATION
R3-09D = REVIEW_WEB_UI_AND_ROUTE_IMPLEMENTATION
R3-09E = REVIEW_REPLAY_LIBRARY_DEVICE_VALIDATION
R3-10  = FULL_E2E_AUDIT including persistent review
R3-11  = NORMAL_LIVE_ACTIVATION
```

R3-10 must not PASS until:
- a committed learner transaction reopens after browser close;
- audio/script/explanation are all exact-source-bound;
- a review history entry reopens the same content;
- REVIEW route is read-only;
- REVIEW_REPLAY causes zero learner-runtime mutation;
- iPhone and PC validation pass.

## 16. R3-09B exit criteria

R3-09B is PASS when:
- this architecture is merged to protected main;
- repository audit passes;
- OPERATIONS.md references this contract;
- H3_WEB_CHAT_CONTRACT.md records the target ownership transition;
- no Apps Script learner behavior is changed by the freeze;
- no learner Sheet/runtime/history write is performed;
- next stage is R3-09C, not R3-10.

## 17. R3-09D device validation

R3-09D persistent Review was validated on iPhone in the ChatGPT in-app browser.

Validated learner path:

```text
close previous Web App page
-> open parameterless HOME
-> persistent history shows 5L #2
-> tap 復習する
-> persistent L03 Review reopens from TXN_ID
```

Observed Review surface:
- summary shows `3 / 5`;
- result strip shows `Q1 × / Q2 △ / Q3 × / Q4 ○ / Q5 △`;
- default filter is `要復習`, with `全問` available;
- Q1 renders exact source-bound K1 image;
- Q1 renders inline audio control;
- Q1 shows learner answer `④ ?` and correct answer `③`;
- persistent Review renders after browser/page closure and reopen;
- prior `REVIEW_ITEM_PAYLOAD_SHA_MISMATCH` was eliminated by explicit UTF-8 semantic hashing.

Canonical runtime readback after validation:
- `listening_review_binding_v1` for `H3TX-20260919-000005` remains `LOCKED`;
- learner answer/history/state/counters/pointers were not mutated by HOME or REVIEW access;
- Review remains read-only.

R3-09D exit:

```text
RESULT=PASS_DEVICE_VALIDATED
NEXT=R3-09E REVIEW_REPLAY_LIBRARY_DEVICE_VALIDATION
```

R3-09D does not claim PC validation, REVIEW_REPLAY validation, or normal-live activation. Those remain later gates.
