# H3 Review Architecture

Version: H3-R3-09B-REVIEW-ARCHITECTURE-20260919-V2  
Status: R3_CLOSED_NORMAL_LIVE

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

## 18. R3-09E REVIEW_REPLAY implementation

R3-09E implements the optional nonlearning replay surface defined in section 10.

Replay entry points:
- persistent Review -> `もう一度この5問を解く`;
- HOME review-history entry -> `再挑戦`;
- diagnostic deep route -> `mode=REVIEW_REPLAY&txn_id=<TXN_ID>`.

Server contract:

```text
TXN_ID
-> exact COMMITTED transaction
-> exact LOCKED review binding
-> full persistent source-lock validation
-> replay issue payload
```

The replay issue payload contains only what is required to re-answer the original surface:
- exact K1 source-bound image;
- exact K1-K5 bound audio;
- four choice IDs;
- K4 Japanese visible choices;
- K5 Korean visible choices.

Before replay grading it does NOT expose:
- prior learner answers;
- correct answers;
- explanations;
- K2/K3 scripts.

Replay grading is server-side but read-only:
- validates all five answers;
- reads the exact persisted Review source;
- computes local `○/△/×` and score;
- writes no production transaction;
- writes no learner history;
- writes no Listening state;
- writes no scheduler/retest data;
- advances no counter/pointer.

After local grading, the response returns the same canonical persistent Review payload and a transient comparison:

```text
今回 {replay_score}/5
元回答 {original_score}/5
```

The replay result itself is not persisted and must never be interpreted as a formal retest.

R3-09E implementation state:

```text
RESULT=IMPLEMENTED_AWAITING_DEVICE_VALIDATION
VALIDATION_TARGET=L03 / H3TX-20260919-000005
NEXT=R3-09E iPhone replay + zero-mutation validation
```

PC validation and the final full E2E audit remain R3-10 scope.

## 19. R3-09E UI refinement

The iPhone validation feedback refines the learner UI without changing any runtime or persistence authority.

### HOME

HOME is compacted into:
- one compact H3 5L header;
- one inline current-5L status row;
- one Review library card;
- compact history rows with `復習` / `再挑戦` actions.

The previous large explanatory hero/current-learning blocks are retired.

### Persistent Review

Persistent Review no longer uses a score/count/filter summary header.

The primary Review navigation is exactly five question buttons:

```text
Q1 ×
Q2 △
Q3 ×
Q4 ○
Q5 △
```

Rules:
- exactly one Review card is visible at a time;
- tapping a Q button switches the visible card;
- button text includes the persisted result;
- the active Q button is visibly selected;
- Review still renders exact image/audio/script/answer/explanation from the persistent source lock;
- no `3/5`, wrong-count, uncertain-count, or `要復習/全問` Review header is shown.

Review footer labels:
- `再挑戦`;
- `ホーム`.

### REVIEW_REPLAY

The standalone `再挑戦` explanatory block above the questions is removed.

Replay begins directly with the same Q1-Q5 question navigation used by normal issue/replay surfaces. The nonlearning/write-zero contract is unchanged.

R3-09E remains `IMPLEMENTED_AWAITING_DEVICE_VALIDATION` until this refined UI is revalidated on iPhone.

## 20. R3-09E close

R3-09E is closed after the learner replay/library path and the refined learner surface were accepted on iPhone, followed by an independent canonical zero-mutation readback.

Canonical close readback for L03 / `H3TX-20260919-000005`:
- `listening_web_txn_v1`: exactly one L03 transaction, still `COMMITTED`;
- transaction ID remains `H3TX-20260919-000005`;
- `listening_log_v1`: exactly five L03 learner rows, K1-K5 only;
- `listening_state_v1`: `LISTENING_ISSUE_NO=2`, `NEXT_LISTENING_SET_NO=3`, `LAST_LISTENING_SET_ID=H3-20260919-L03`;
- `listening_review_binding_v1`: exact L03 binding remains `LOCKED`;
- `listening_set_payload_v1`: L03 remains `ISSUED`;
- `listening_k1_ready_v1`: `H3-K1R-20260919-002` remains `CONSUMED`;
- no replay transaction, learner-log row, counter, pointer, scheduler, retest, K1_READY, payload, or Review-binding mutation was created by HOME / REVIEW / REVIEW_REPLAY access.

The replay attempt itself remains intentionally nonpersistent, so zero-mutation is verified from the absence of any additional canonical write surface rather than by a replay-history record.

Device / UI evidence boundary:
- the iPhone path for HOME, persistent Review, and REVIEW_REPLAY was observed during R3-09D/R3-09E validation;
- the refined UI was merged and audited after learner feedback;
- the user then authorized continuation of R3-09E;
- canonical backend zero-mutation was independently re-read after that continuation.

R3-09E exit:

```text
RESULT=PASS_DEVICE_VALIDATED_ZERO_MUTATION
L03_PRODUCTION_TXN_COUNT=1
L03_LEARNER_LOG_ROWS=5
REVIEW_BINDING=LOCKED
LISTENING_ISSUE_NO=2
NEXT_LISTENING_SET_NO=3
LAST_LISTENING_SET_ID=H3-20260919-L03
NEXT=R3-10 FULL_E2E_AUDIT
```

R3-09E does not activate normal live production. R3-10 must still perform the full cross-layer E2E audit, including PC validation, before R3-11 normal-live activation.

## 21. R3-10 audit status

R3-10 has completed the current cross-layer read-only audit but has not passed.

```text
RESULT=BLOCKED_2
R3-10-B1=Listening overload/retest plan remains stale after the committed L03 score
R3-10-B2=PC persistent Review/Replay validation is still pending
NORMAL_LIVE_ACTIVATION=BLOCKED
```

All of the following are currently PASS:
- production transaction uniqueness / COMMITTED state;
- learner history cardinality;
- counters and valid-count updates;
- per-section retest provenance;
- artifact existence and source-lock binding;
- persistent Review reopening on iPhone;
- REVIEW_REPLAY zero-mutation behavior;
- same-fingerprint idempotency and different-fingerprint conflict code paths;
- no unresolved production recovery row.

The scheduler blocker is not a learner-history corruption. It is a post-score planning synchronization gap: `NEXT_LISTENING_SET_NO` advanced to 3 while the stored `OVERLOAD_PLAN_JSON` remains a set-2 plan.

R3-10 may close only after the scheduler plan is safely regenerated/persisted and the current persistent Review/Replay surface passes PC validation.

## 22. R3-10 close

The R3-10 interim blockers are closed.

```text
RESULT=PASS
BLOCKING=0
SCHEDULER_PLAN=H3_LISTENING_OVERLOAD_PLAN_V2
NEXT_SET_NO=3
NEXT_RETEST=K4
PC_VALIDATION=OPTIONAL_NONBLOCKING_BY_DEFAULT
NEXT=R3-11 NORMAL_LIVE_ACTIVATION
```

Scheduler close evidence:
- the production transaction now recomputes and persists the next Listening retest plan after every scored 5L;
- preissue rejects missing/stale/blocked scheduler plans;
- the existing L03 state was backfilled from canonical history only;
- learner answer/history/score/counter/pointer values were not rewritten;
- the post-L03 plan is feasible with normal slots `3:K4,4:K1,5:K3,6:K2,7:K5` and no supplemental/overflow.

Device policy after R3-10:
- mobile/iPhone remains the primary learner-device validation surface;
- PC validation is not a default blocker;
- require PC only on explicit request or for a PC-specific change.

Normal-live activation remains outside R3-10 and requires R3-11.

## 23. R3-11 normal-live activation

R3-11 activates the persistent Review architecture for ordinary future Listening production sets, not only the controlled L03 E2E set.

```text
PRODUCTION_GATE=NORMAL_LIVE_ACTIVE
PRODUCTION_PREP_MODE=NORMAL_LIVE
FIXED_SET_ARM=NONE
NEXT_LISTENING_SET_NO=3
CURRENT_LAST_SET=H3-20260919-L03
```

For every future normal-live set:
- production issue/submit remains source-locked;
- successful COMMITTED grading creates/locks the persistent Review binding;
- postgrade and later reopen use the same Review builder;
- REVIEW_REPLAY remains read-only/nonpersistent;
- scheduler state is recomputed after each scored 5L;
- normal live does not relax K1 image/audio/hash/recovery/idempotency gates.

R3-11 activation itself performs no learner issue, grading, counter advancement, or Review creation.

## 24. R3-11 close

R3-11 normal-live activation is complete.

Live canonical readback after Apps Script HEAD synchronization:

```text
RESULT=PASS
PRODUCTION_GATE=NORMAL_LIVE_ACTIVE
PRODUCTION_PREP_MODE=NORMAL_LIVE
LISTENING_POLICY_ID=H3-LISTEN-POLICY-20260920-V7
LISTENING_ISSUE_NO=2
NEXT_LISTENING_SET_NO=3
LAST_LISTENING_SET_ID=H3-20260919-L03
OVERLOAD_STATUS=LISTENING_OVERLOAD_PLAN_READY
FIXED_SET_ARM=NONE
```

Retired current-runtime controls:
- `PREP_TARGET_SET_ID` is blank;
- `R3_07_PREP_TARGET_SET_ID` is blank;
- `E2E_TARGET_SET_ID` is blank;
- `E2E_TARGET_K1_READY_ID` is blank.

Activation integrity:
- Apps Script main source was audited before runtime gate change;
- Apps Script HEAD sync succeeded before Sheet activation;
- production code contains no hard-coded production SET_ID arm;
- no new 5L payload was generated or issued;
- production transaction count remains 1;
- learner log row count remains 10 total / 5 for L03;
- learner counters, last-set pointer, scheduler plan and committed L03 history are unchanged.

The system is now ready for the next ordinary `5L` learner request. That later request begins preparation of set no.3; R3-11 itself does not issue it.

## 25. R3-12 infrastructure close

R3 closes with normal-live Listening production active.

```text
R3_STATUS=R3_CLOSED_NORMAL_LIVE
NORMAL_LIVE=ACTIVE
PRODUCTION_GATE=NORMAL_LIVE_ACTIVE
PRODUCTION_PREP_MODE=NORMAL_LIVE
NEXT_LISTENING_SET_NO=3
LAST_LISTENING_SET_ID=H3-20260919-L03
R3_BLOCKING=0
```

R3-12 is infrastructure-only. It does not:
- issue set no.3;
- change learner answers/history;
- change counters, valid-counts, pointer, scheduler, or retest obligations;
- create Review/replay learning writes;
- alter the production transaction path.

R3-12 close duties:
- snapshot the current V19 Listening render canonical as an immutable Drive release;
- update the compact source manifest to the V19 release/current R3 close status;
- snapshot the final CURRENT state;
- archive superseded Chat-attached R2 HTML learner-surface diagnostics without changing their Drive IDs;
- leave historical SYSTEM_TEST fixtures, status snapshots, learner history, and production artifacts intact.

The next ordinary learner action is a `5L` request for set no.3 under the already-active normal-live path.

## 26. 5L #1 legacy pre-Web Review phase-1 freeze

Phase 1 freezes a review-only compatibility path for the first valid Listening set:

```text
SET_ID=H3-20260919-L02
LISTENING_SET_NO=1
LEGACY_MODE=LEGACY_PRE_WEB
ORIGINAL_SCORE=1/5
ORIGINAL_RESULTS=K1○,K2×,K3×,K4×,K5×
ORIGINAL_ANSWERS=K1:3,K2:1,K3:3,K4:2,K5:2
UNCERTAINTY=UNKNOWN_NOT_RECORDED
```

### 26.1 Verified source inventory

The following canonical source evidence exists and may be used by the legacy Review adapter:

- one exact `listening_set_payload_v1` row for `H3-20260919-L02`;
- five exact `listening_log_v1` rows for K1-K5;
- exact original answers, answer keys, and per-section results in those log/provenance rows;
- the bound K1_READY record `H3-K1R-20260919-001`, including image file ID and image SHA256;
- five individual source-locked audio bindings in the set payload;
- the exact K2-K5 item payloads and answer key.

The following do not exist for L02 and must never be fabricated:

- a `listening_web_txn_v1` transaction for L02;
- a COMMITTED TXN_ID;
- `listening_explanation_payload_v1` rows for L02;
- a `listening_review_binding_v1` row for L02;
- recorded uncertainty flags compatible with current Web submissions.

### 26.2 No fake transaction rule

L02 predates Web transaction ownership. Phase 2 must not create a synthetic or retroactive row in `listening_web_txn_v1`, and must not place a fake TXN_ID into `listening_review_binding_v1`.

The current transaction-backed path remains unchanged:

```text
COMMITTED TXN_ID
 -> listening_review_binding_v1 LOCKED
 -> buildPersistentReviewPayload_(txn_id)
```

L02 uses a separate read-only legacy path:

```text
LEGACY_REVIEW_ID
 -> listening_legacy_review_v1 LOCKED
 -> exact L02 set/log/K1/audio sources
 -> buildLegacyPersistentReviewPayload_(legacy_review_id)
```

### 26.3 Phase-2 legacy registry schema

Phase 2 may add exactly one new lightweight registry sheet:

`listening_legacy_review_v1`

Required columns:

```text
LEGACY_REVIEW_ID
LISTENING_SET_ID
LISTENING_SET_NO
ANSWERED_AT
STATUS
SOURCE_MODE
RESULT_JSON
RESULT_SHA256
ITEM_PAYLOAD_SHA256
EXPLANATION_SET_SHA256
AUDIO_BINDING_SHA256
K1_IMAGE_SHA256
REVIEW_CONTRACT_ID
LEGACY_REVIEW_BINDING_SHA256
LOCKED_AT
```

Required values for the first row:

```text
SOURCE_MODE=LEGACY_PRE_WEB
STATUS=LOCKED
LISTENING_SET_ID=H3-20260919-L02
LISTENING_SET_NO=1
```

`RESULT_JSON` is a review metadata object derived only from the five canonical L02 log/provenance rows. It is not a production transaction and must never be treated as one.

### 26.4 Explanation compatibility

Phase 2 may add five L02 explanation rows to `listening_explanation_payload_v1` only after exact L02 source readback.

Each row must:

- use the exact original L02 item surface and answer key;
- use provenance `LEGACY_PRE_WEB_BACKFILL`;
- be review metadata only;
- never alter original answers, results, retest evidence, history, counters, pointers, scheduler, K1_READY, audio, or set payload;
- fail closed if the item payload SHA or source surface cannot be verified.

New explanations may explain the already-locked source; they may not invent a different historical question or claim to reproduce an explanation that did not exist at answer time.

### 26.5 History and uncertainty semantics

HOME review history may merge transaction-backed entries and legacy entries, then sort by the original answer/commit timestamp.

For L02:

```text
score=1
total=5
wrong_count=4
needs_review=true
uncertainty_known=false
uncertain_count=null
```

The UI must render the unknown uncertainty count as an unknown marker such as `?—`, never `?0`.

### 26.6 Review / replay boundaries

Legacy Review is read-only.

Legacy REVIEW_REPLAY, if implemented in Phase 2 and exposed in Phase 3, must use the exact original L02 set, K1 image, and five existing audio bindings. It must remain nonlearning and nonpersistent:

- no production transaction write;
- no learner-history write;
- no scheduler/retest write;
- no counter/pointer write;
- no K1_READY mutation;
- no set-payload mutation;
- no audio regeneration.

The replay may compare the transient replay score with the stored original score 1/5. It must not invent historical uncertainty flags.

### 26.7 Current-learning exclusion

Because the historical L02 set payload remains `ISSUED` and has no COMMITTED Web transaction, Phase 2 must explicitly exclude every `LEGACY_PRE_WEB` registered set from `h3ReviewCurrentLearning_()`. Registration as legacy Review must never make L02 appear as an active uncommitted learning set.

### 26.8 Fail-closed rules

A legacy Review entry is not renderable if any of the following occurs:

- duplicate or missing legacy registry row;
- SET_ID / set number mismatch;
- missing or non-VALID K1-K5 source log rows;
- original answer/result mismatch across log/provenance and answer key;
- item payload hash mismatch;
- audio binding mismatch;
- K1 image hash mismatch;
- missing or unlocked explanation row after Phase 2;
- legacy binding hash mismatch;
- cross-set source mixing.

No fallback to another transaction, another set, regenerated image/audio, or inferred uncertainty is permitted.

### 26.9 Three-phase boundary

```text
Phase 1 = source audit + compatibility contract freeze
Phase 2 = code/schema implementation + L02 review-metadata backfill
Phase 3 = HOME history exposure + Review/Replay device validation
```

Phase 1 performs documentation/audit writes only and changes no learner runtime data.

## 27. 5L #1 legacy Review phase-2 close

Phase 2 is complete for `H3-20260919-L02` / 5L #1.

Implementation:
- dedicated registry `listening_legacy_review_v1`;
- source mode `LEGACY_PRE_WEB`;
- exact original result derived from `listening_log_v1` on every validation;
- dedicated legacy Review builder / validator / history preview;
- registered legacy sets excluded from `h3ReviewCurrentLearning_()`;
- HOME review history remains transaction-backed only until Phase 3.

Locked legacy identity:

```text
LEGACY_REVIEW_ID=H3LEG-20260919-L02-R1
SET_ID=H3-20260919-L02
LISTENING_SET_NO=1
ORIGINAL_SCORE=1/5
UNCERTAINTY_KNOWN=false
RESULT_SHA256=15de34e79bc8f661b1366a4313ffb5118948fc0b28f7226e0957c262247d7402
ITEM_PAYLOAD_SHA256=4e8d06171c598eab1c36a156c665e530c60cd23c82630fdcba644fe770a822fd
EXPLANATION_SET_SHA256=85264d1127287f682e6ac565bd5ea8e0fcf43659e1a732f319cc65df5acd8887
AUDIO_BINDING_SHA256=8e8062e4d89c1de1c899a29ed01ff934473c4c82a0aa5852da5ffd816f23b4bf
K1_IMAGE_SHA256=61f2de44bc7bc11bac54cf6b03f14940c0349c4871544351168530f584fba347
LEGACY_REVIEW_BINDING_SHA256=dc7b106e349a29b071e7d3e600da9cd734e7be1dab834dbd2f33c99d789606c8
```

Five explanation rows are LOCKED with provenance `LEGACY_PRE_WEB_BACKFILL` and the original L02 source surface.

Phase-2 validation:
- repository audit PASS;
- Apps Script main source synchronized;
- legacy registry cardinality = 1;
- L02 explanation cardinality = 5;
- result/audio/explanation/item/K1/binding hashes all independently recomputed and matched;
- L02 production transaction cardinality remains 0;
- L02 transaction-backed review binding cardinality remains 0;
- learner runtime state, score, counters, pointer, scheduler, K1_READY, payload and audio are unchanged.

Phase 2 does not expose the legacy entry in HOME. Phase 3 owns learner-visible history merge, Review/Replay routing, and device validation.

## 28. 5L #1 legacy Review phase-3 staged activation

Phase 3 learner-facing implementation is active in Apps Script HEAD for `H3-20260919-L02` / 5L #1.

Implemented:
- HOME merges transaction-backed Review history and the LOCKED `LEGACY_PRE_WEB` entry;
- the normal learner entry point remains the parameterless HOME/launcher URL;
- no legacy ID is accepted as a learner boot query parameter;
- 5L #1 Review uses `legacy_review_id` only as an internal Apps Script client/server reference;
- legacy Review media resolves the original K1 image and existing K1-K5 audio bindings;
- legacy REVIEW_REPLAY is nonlearning, `persisted=false`, and returns `runtime_write_count=0`;
- historical uncertainty unavailable in L02 is rendered as unknown (`?—`), never as zero;
- ordinary transaction-backed Review/Replay remains unchanged.

Expected HOME history order from current live timestamps:

```text
5L #3
5L #2
5L #1
```

Current-learning resolution:
- L02 is the only historical ISSUED set without a COMMITTED Web transaction;
- its LOCKED `LEGACY_PRE_WEB` registration explicitly excludes it from current-learning resolution;
- with no newer ISSUED/uncommitted production set, parameterless boot therefore resolves HOME.

Automated gates completed:
- PR #59 repository audit PASS;
- main merged at `5e60887b6472f9172de1faafe2e2e7a4b3efd02e`;
- Apps Script HEAD sync confirmed by project modified-time readback;
- live legacy registry cardinality remains 1;
- L02 synthetic Web transaction count remains 0;
- L02 transaction-backed Review binding count remains 0;
- Listening scheduler/state sentinel values remain unchanged.

Phase 3 is not closed until iPhone device validation is completed. Required device checks:
1. parameterless learner URL opens HOME when no current uncommitted set exists;
2. HOME lists 5L #1 after #3 and #2 and shows score 1/5, ×4, ?—;
3. 5L #1 Review opens all five exact items, K1 image, and all five audio assets;
4. Home -> Review -> Home -> Review reconstructs the same source-locked payload;
5. legacy Replay accepts five transient answers, grades them, returns to the exact legacy Review, and creates no learner-runtime writes.

Until those checks are confirmed, status is `IMPLEMENTED_DEVICE_VALIDATION_PENDING`, not Phase-3 closed.
