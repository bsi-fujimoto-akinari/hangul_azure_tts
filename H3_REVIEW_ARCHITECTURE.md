# H3 Review Architecture

Version: H3-REVIEW-ARCHITECTURE-CURRENT-20260920-V1
Status: R3_CLOSED_NORMAL_LIVE

This document defines the current durable Review contract. Completed R3 phase chronology and device-validation evidence remain in Git history and Drive `06_AUDIT`.

## 1. Authority and scope

The persistent Review is the learner-facing explanation authority after a committed 5L transaction. It does not replace the production answer transaction, learner history, scheduler, retest state, K1_READY, locked payload, or individual audio authorities.

The implementation must not:

- rewrite committed answers or learner history;
- change score, counters, pointers, scheduler, or retest state;
- regenerate K1 or Listening audio;
- substitute data from another set;
- treat replay results as learning transactions.

## 2. Source-of-truth model

Review reconstruction requires exact agreement across:

- `listening_web_txn_v1`: committed transaction authority;
- `listening_log_v1`: committed per-question result/provenance;
- locked 5L payload and source hashes;
- `listening_explanation_payload_v1`: immutable explanation content;
- `listening_review_binding_v1`: transaction/set/payload binding;
- existing K1 image and K1-K5 individual audio bindings.

The transaction must be `COMMITTED`; the set, transaction, payload, result, explanation, item, binding, image, and audio identities must agree.

## 3. Explanation payload

The payload is authored before issue from the exact locked set and stored independently of browser state. It contains five ordered sections, learner-facing translations/explanations, correct-answer rationale, and source-lock hashes.

Canonical properties:

```text
SCHEMA=H3_PERSISTENT_REVIEW_PAYLOAD_V1
ITEM_COUNT=5
IMMUTABLE=true
POSTGRADE_DEFAULT_VIEW=REVIEW
DEFAULT_FILTER=NEEDS_REVIEW
IMMEDIATE_REVIEW_BUILDER=PERSISTENT_REVIEW_BUILDER
RECEIPT_UI=TECHNICAL_DETAILS_COLLAPSED
```

Semantic hashes use canonical key ordering and explicit UTF-8 SHA-256. Any correction creates an explicit replacement/overlay contract; silent mutation of a committed payload is prohibited.

## 4. Persistent binding

`listening_review_binding_v1` binds exactly one committed TXN_ID and SET_ID to the explanation payload, result hash, locked item hash, image/audio identities, and binding hash. Duplicate or ambiguous bindings are invalid.

Binding creation may occur only after exact source readback. It is metadata persistence, not a second learning transaction, and must not alter learner state.

## 5. Reconstruction and HOME index

HOME lists committed Review entries newest first and exposes at least date/time, 5L number, score, wrong count, and uncertainty count. Filters may include all, wrong, and uncertain.

HOME uses a lightweight eligibility index. It must not perform full payload reconstruction or deep hash validation. Opening a Review performs full source-lock validation through `buildPersistentReviewPayload_()` before revealing content.

The current-learning resolver excludes committed sets and registered legacy Review sets. It may expose only an `ISSUED`, uncommitted, production-renderable set.

## 6. Routes and launcher

The learner launcher is the parameterless canonical Web App URL. Server boot resolves an active safe set as LISTENING; otherwise it renders HOME.

Controlled internal routes remain available for diagnostics and in-app navigation:

```text
mode=SYSTEM_TEST&set_id={SET_ID}
mode=LISTENING&set_id={SET_ID}
mode=REVIEW&txn_id={TXN_ID}
mode=REVIEW_REPLAY&txn_id={TXN_ID}
```

These routes are not the normal Chat handoff URL.

## 7. Persistent Review UI

After grading, the Web App opens the persistent Review immediately. The learner sees one question card at a time, compact progress such as `Q1 ×`, source-bound media, the learner answer, the correct answer, translation, and explanation.

Exactly one Review card is visible at a time. Navigation is provided by compact progress controls plus `再挑戦` and `ホーム`. Technical receipt/hash details remain collapsed by default.

Audio and images are loaded from the original bound artifacts. Review must not generate or replace media.

## 8. Review history library

The parameterless HOME provides read-only access to committed Review entries. Selecting an entry opens its exact persistent Review. No learner-facing delete or edit operation exists.

Chat receipt submission is optional for ordinary learning because the Web App owns postgrade Review. Chat may verify receipts for audit/troubleshooting but must never repeat the backend mutation.

## 9. REVIEW_REPLAY

REVIEW_REPLAY reuses the original locked set and media for transient, nonlearning practice.

Before local replay grading it hides the correct answer, prior answer, explanation, and protected Listening script content. After all local answers are supplied, it may reveal the already-persisted Review.

Required result contract:

```text
SCHEMA=H3_REVIEW_REPLAY_RESULT_V1
NONLEARNING=true
PERSISTED=false
RUNTIME_WRITE_COUNT=0
```

Replay must not write learner history, `listening_state_v1`, scheduler/retest state, counters, pointers, production journals, K1_READY, payloads, or audio. It must never be interpreted as a formal retest.

## 10. Failure policy

Persistent Review is fail-closed. STOP on:

- missing, duplicate, non-COMMITTED, or mismatched transaction/binding;
- explanation, result, item, or binding hash mismatch;
- image/audio identity mismatch;
- cross-set source mixing;
- unresolved `RECOVERY_REQUIRED`;
- any attempt to reconstruct missing facts by inference.

On STOP, do not fabricate content, substitute another set, regenerate history, or reveal partially validated Review data.

## 11. Storage

The semantic Listening script remains `03_AUDIO/02_5L/{LISTENING_SET_ID}.txt` as a convenience/audit artifact. It is not the explanation authority. Canonical Review content is stored in Sheets and reconstructed by the Web App.

## 12. Current runtime contract

The active implementation includes:

- persistent payload and binding validation;
- UTF-8 canonical hashing;
- parameterless HOME/current-learning resolution;
- persistent Review media retrieval;
- read-only Review history;
- zero-write REVIEW_REPLAY;
- normal-live production with no fixed-set arm;
- fail-closed preissue for recovery, overload scheduling, and audio parity.

Current production behavior is audited directly from runtime code. Completed phase labels are not active runtime requirements.

## 13. Current learner UI contract

HOME shows the current 5L when safe and a compact Review list; exactly one Review card is visible at a time. The standalone `再挑戦` explanatory block above the questions is removed. Replay uses the same compact question surface and reveals persistent Review only after local completion.

## 26. Legacy pre-Web Review compatibility

The historical set below remains intentionally reviewable:

```text
SET_ID=H3-20260919-L02
LISTENING_SET_NO=1
LEGACY_REVIEW_ID=H3LEG-20260919-L02-R1
SOURCE_MODE=LEGACY_PRE_WEB
STATUS=LOCKED
ORIGINAL_SCORE=1/5
UNCERTAINTY_KNOWN=false
```

`listening_legacy_review_v1` stores its immutable binding. The original result is reconstructed from canonical `listening_log_v1`; no synthetic Web transaction or TXN_ID is created. HOME merges the entry with transaction-backed history and excludes the set from current-learning resolution.

Review/media/replay use internal `legacy_review_id` routing without learner URL parameters. Unknown historical uncertainty is rendered as `?—`. Replay is transient and must not mutate learner history, score, counters, pointers, scheduler, K1_READY, payload, or audio.

## 28. Review / HOME provider core

`WebAppReviewCore.js` owns provider-neutral canonical JSON/hash helpers, exact table/header helpers, HOME history ordering, current-learning arbitration, and Review request dispatch. `WebAppReviewListeningAdapter.js` is the only active provider and delegates to the existing transaction-backed and legacy Listening persistence implementation.

The internal provider contract exposes history, current learning, Review/media, and replay operations without changing any learner-facing payload. The Written provider factory remains `null`: this is only a future adapter slot and does not enable a Written route, schema, transaction, history entry, or HOME card.

`WebAppReviewWrittenAdapter.js` adds a storage-independent, read-only projection from `H3_5W_HISTORICAL_RECONSTRUCTION_V1` and its uncertainty-corrected V2 successor. It preserves source question surfaces, parsed prompts, choices, dialogue, answers, marks, uncertainty, explanations, audio, generation provenance, and raw input without filling `UNKNOWN` or generating transaction identities. Its provider factory exists only as an unregistered seam; Written HOME, media, replay, submission, and production routing remain inactive.

Provider dispatch is explicit when more than one provider is present. `review_kind` selects an exact provider, while existing `txn_id` and `legacy_review_id` identities continue to select Listening. A selector conflict, an unknown kind, or a selector-free multi-provider request fails closed.

One-shot migration helpers are absent from active code. Detailed migration and validation evidence remains recoverable from Git history and Drive `06_AUDIT`.


## 27. Written historical Review staging

Historical 5W Review storage is materialized in the isolated read-only tables
`written_legacy_review_payload_v1` and
`written_legacy_review_binding_v1`.

The repository contains a fail-closed loader that requires exact headers,
`LOCKED` status, matching set/source identities, the V2 reconstruction
schema, the frozen Written legacy Review contract, canonical reconstruction
SHA-256, and canonical binding SHA-256 before returning a normalized
`H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1`.

This stage does not register the Written provider, expose Written entries in
HOME, add a learner Web route, enable media, or enable replay/submission.
`H3_REVIEW_WRITTEN_PROVIDER_FACTORY_` remains `null` until a later,
separately audited activation stage.


## 28. Written HOME and Review UI staging

Phase ② prepares the inactive Written provider for persistent HOME history and
Review rendering without changing production provider activation.

When the Written provider factory is enabled in a later audited phase, HOME
history reads the locked historical Written binding/payload tables through the
same fail-closed persistent context used by Review open. Written history
entries carry `review_kind=WRITTEN`, preserve score/uncertainty metadata, and
advertise `replay_capability=unavailable`.

The client is prepared to distinguish 5L and 5W history entries, request
Written Review by `review_kind=WRITTEN + set_id`, render D2-D6 symbolic
answers and stored explanation text, omit audio controls when no audio asset
key exists, and omit both HOME and Review replay controls for Written.

Production activation remains separate: the factory stays `null`, direct Web
boot routing is unchanged, and Written media/replay/grade capabilities remain
fail-closed until a later phase.


## 29. Written provider production activation

The historical Written Review provider is active in the common Review/HOME
provider registry through `h3ReviewWrittenProviderFactory_`.

Production HOME now aggregates Listening and Written history. Written entries
remain read-only and are opened only by the explicit selector
`review_kind=WRITTEN` plus `set_id`; Listening transaction and legacy
identities continue to route to the Listening provider. Requests without a
selector or Listening identity remain fail-closed when routing would be
ambiguous.

Written Review continues to expose no media, replay, replay media, or grading
capability. Those routes remain fail-closed with
`WRITTEN_REVIEW_CAPABILITY_UNAVAILABLE`. The historical payload/binding
tables remain immutable/read-only source material; provider activation does
not create `written_web_txn_v1` or mutate learner history, scheduler state,
or generation state.
