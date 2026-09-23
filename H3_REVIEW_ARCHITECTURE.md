# H3 Review Architecture

Version: H3-REVIEW-ARCHITECTURE-CURRENT-20260920-V8
Status: R3_CLOSED_NORMAL_LIVE

This document defines the current durable Review contract. Completed R3 phase chronology and device-validation evidence remain in Git history and Drive `06_AUDIT`.

## 1. Authority and scope

The persistent Review is the learner-facing explanation authority after a committed 5L or 5W transaction. It does not replace the production answer transaction, learner history, scheduler, retest state, Listening K1_READY/locked payload authority, Written issued-stage/queue authority, or bound media authorities.

The implementation must not:

- rewrite committed answers or learner history;
- change score, counters, pointers, scheduler, or retest state;
- regenerate K1 or Listening audio;
- substitute data from another set;
- treat replay results as learning transactions.

## 2. Source-of-truth model

Review reconstruction is provider-specific but always fail-closed.

Listening requires exact agreement across:

- `listening_web_txn_v1`: committed transaction authority;
- `listening_log_v1`: committed per-question result/provenance;
- locked 5L payload and source hashes;
- `listening_explanation_payload_v1`: immutable explanation content;
- `listening_review_binding_v1`: transaction/set/payload binding;
- existing K1 image and K1-K5 individual audio bindings.

Production Written requires exact agreement across:

- `written_web_txn_v1`: committed Written transaction authority;
- `written_answer_sync_v1`: `STATUS=COMMITTED` and `PHASE=CORE_COMPLETE`;
- exact issued `written_set_stage_v1` and queue source binding;
- `written_review_payload_v1`: locked learner-facing Review payload;
- `written_review_binding_v1`: TXN/set/stage/result/source/Review binding.

The relevant transaction must be `COMMITTED`; every identity and hash required by that provider must agree before Review content is returned.

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

HOME lists committed Review entries newest first and exposes provider-appropriate identity plus date/time, score, wrong count, uncertainty count, and computed Review level. Provider filtering is the exclusive `L / W` control; sorting is `Newest / Priority`.

HOME uses the derived `review_home_index_v1` as its only history source. The table stores one ACTIVE row per `KIND + SET_ID` with stable set number, stored answer timestamp, score/count metadata, Review locator/source mode, and precomputed `BASE_PRIORITY`. The current reader accepts both the legacy 13-column layout and the V2-compatible layout that appends `SURFACE_FAMILY` and `LEVEL`; missing metadata is interpreted only through the frozen legacy mapping LISTENING→5L/3級 and WRITTEN→5W/3級. The index remains a display index only: it is not learner history, transaction authority, Review payload authority, or scheduler state.

HOME performs exactly one lightweight index read, computes only time-dependent Review-level metadata, and must not scan `listening_log_v1` or `generation_log_v1`, reconstruct Review payloads, or perform deep hash validation. `BASE_PRIORITY` is refreshed only after a committed Listening answer or Written Answer Sync, when the canonical logs already contain the new result. Opening a Review remains the full source-lock validation boundary through the existing provider-specific persistent Review loaders.

The current-learning resolver excludes committed sets and registered legacy Review sets. It may expose only an `ISSUED`, uncommitted, production-renderable 5L or 5W set, with provider arbitration failing closed on ambiguity. Parameterless boot owns this resolution; if it selects HOME, the HOME payload does not run the resolver a second time and exposes `current_learning=null`.

## 6. Routes and launcher

The learner launcher is the parameterless canonical Web App URL. Server boot resolves an active safe set as LISTENING or WRITTEN according to current-learning arbitration; otherwise it renders HOME.

Controlled internal routes remain available for diagnostics and in-app navigation:

```text
mode=SYSTEM_TEST&set_id={SET_ID}
mode=LISTENING&set_id={SET_ID}
mode=WRITTEN&set_id={SET_ID}
mode=REVIEW&txn_id={TXN_ID}
```

`REVIEW_REPLAY` is retired and is not an active learner boot route. These routes are not the normal Chat handoff URL.

## 7. Persistent Review UI

After grading, the Web App opens the persistent Review immediately. The learner sees one question card at a time, compact progress such as `Q1 ×`, source-bound media where applicable, the learner answer, the correct answer, translation, and explanation.

Exactly one Review card is visible at a time. Navigation is provided by compact progress controls plus a full-width `ホーム` action. Learner-facing replay/retry controls are absent. Technical receipt/hash details remain collapsed by default.

Audio and images are loaded from the original bound artifacts. Review must not generate or replace media.

## 8. Review history library

The parameterless HOME provides read-only access to committed Review entries. HOME itself has no unanswered/current-learning header; active issued learning is resolved before HOME through parameterless boot.

Each history card is the navigation target for its exact persistent Review. Separate `復習` and `再挑戦` buttons are removed. Listening keeps its canonical `5L #N` sequence. Written history receives a stable chronological `5W #N` ordinal derived from answered Written SET_ID order.

HOME uses the segmented filter `ALL` / `L` / `W`; `ALL` is the default and shows both providers together. `L` and `W` remain provider filters only and do not change stored Review history. Sorting is a second segmented control, `Newest` / `Priority`, with `Priority` as the default. The control block remains sticky while the history list scrolls.

Review priority is `H3_REVIEW_PRIORITY_V3` and is globally normalized to 0–100. First compute raw item weakness: `×=12 / △=6 / ○=0`, plus same-skill historical weakness `min(8, 2×wrong_count + uncertain_count)`, so one item has a theoretical maximum of 20. Normalize for set length as `N = 100 × raw_sum / (20 × item_count)`. This removes the structural five-question versus two-question advantage. Then apply a 50:50 blend of equal-surface importance and the exam-score shares `5L=40%, 5W=36%, 2R=12%, 2T=12%`: `q = 0.50×0.25 + 0.50×exam_share`. Finally divide by the largest blended share, `0.325` for 5L, so the base priority remains globally 0–100: surface factors are `5L=1.0000`, `5W≈0.9385`, `2R≈0.5692`, `2T≈0.5692`. Same-skill evidence is keyed by `provider_kind + level + skill_id`, so 3級 and 準2級 evidence never cross-contaminates. Evidence includes committed 5L, 5W, Reading, and Translation item logs. Reading/Translation resolve level from their exact COMMITTED stage row before their item log is admitted; their SET_IDs do not enter the 5W ordinal pool. Legacy logs without a LEVEL field keep the frozen legacy 3級 interpretation only where that legacy authority applies. Missing skill identity contributes no skill bonus. After the normalized and exam-weighted base `B`, compute elapsed-day pressure `F = 1 - 2^(-d/14)` and final priority `P = B + (100-B)×0.40×F`, clamped and rounded to 0–100. The 14-day half-life is a simple exponential forgetting approximation, not a personalized memory estimate. Time can fill at most 40% of the remaining headroom. After that ordinary priority is calculated, a Review-completion cooldown may temporarily lower only the HOME display/order priority: immediately after a completed Review the factor is 45%, then it recovers linearly to 100% over 72 hours. Opening a Review alone does not trigger cooldown.

For `answered_at=UNKNOWN`, HOME uses the oldest valid timestamp among the current history entries as a provisional effective timestamp for sorting and age. The stored/displayed timestamp is not rewritten and remains `UNKNOWN`. If no valid timestamp exists, the current load time is used as the fail-safe fallback. Review priority changes display order only and must not mutate scheduler/retest state.

No learner-facing delete or edit operation exists. Chat receipt submission is optional for ordinary learning because the Web App owns postgrade Review. Chat may verify receipts for audit/troubleshooting but must never repeat the backend mutation.

## 9. Retired REVIEW_REPLAY

`REVIEW_REPLAY` is no longer a learner capability. HOME and persistent Review expose no replay/retry action, direct parameter boot is not allowlisted, and the active Listening provider routes replay/render/media/grade requests to a fail-closed `REVIEW_REPLAY_RETIRED` guard.

Legacy replay helper code may remain temporarily as unreachable compatibility/audit history, but it is not an active learner surface and must not become reachable without a separately reviewed contract change.

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
- retired REVIEW_REPLAY fail-closed guard;
- normal-live production with no fixed-set arm;
- fail-closed preissue for recovery, overload scheduling, and audio parity.

Current production behavior is audited directly from runtime code. Completed phase labels are not active runtime requirements.

## 13. Current learner UI contract

HOME shows only the compact Review library; active learning is resolved before HOME. History cards are directly tappable, the sticky controls are segmented `ALL/L/W` (default `ALL`) and `Newest/Priority` (default `Priority`), Written uses stable `5W #N`, and exactly one Review card is visible at a time. History cards show the set label, score, date, and a compact 0–100 priority bar. The textual summary line such as `×3　?2　復習優先度 47` is not rendered. The bar and `Priority` sorting use the post-cooldown priority when a valid `LAST_REVIEWED_AT` exists; otherwise they use the ordinary normalized priority. `Newest` continues to use the original answer timestamp and is not changed by Review completion. The priority is an ordering heuristic, not a mastery score. The Review footer contains only a full-width `ホーム` action. Within persistent 5W Review cards, the card heading is `Qn ［筆n/種別］ mark`; the question block does not repeat that Q/display header, and D4 bracket-marked target text is rendered as an underline without the brackets. Translation Review does not show learner-facing labels such as `訳す部分`; it underlines only the exact stored `target_segment` within `question_text`.

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

`listening_legacy_review_v1` stores its immutable binding. The original result is reconstructable from canonical `listening_log_v1`; no synthetic Web transaction or TXN_ID is created. For HOME, its lightweight metadata is represented only through `review_home_index_v1`; opening the legacy Review still uses the immutable legacy binding and full source validation.

Review/media use internal `legacy_review_id` routing without learner URL parameters. Unknown historical uncertainty is rendered as `?—`. Replay is retired; legacy history remains Review-only and must not mutate learner history, score, counters, pointers, scheduler, K1_READY, payload, or audio.

## 28. Review / HOME provider core

`WebAppReviewCore.js` owns provider-neutral canonical JSON/hash helpers, exact table/header helpers, HOME history ordering, current-learning arbitration, and Review request dispatch. Both Listening and Written providers are active.

`WebAppReviewListeningAdapter.js` delegates to transaction-backed and legacy Listening persistence. `WebAppReviewWrittenAdapter.js` exposes the common Written provider over two isolated persistence classes: immutable historical reconstruction tables and transaction-backed production Written Review tables.

Provider dispatch is explicit when more than one provider is present. `review_kind=WRITTEN + set_id` selects Written Review, while Listening transaction and legacy identities continue to select Listening. A selector conflict, an unknown kind, or a selector-free ambiguous request fails closed.

Written media/replay/grade operations remain unavailable; enabling Written Review history does not grant those capabilities. One-shot migration helpers are absent from active code. Detailed migration and validation evidence remains recoverable from Git history and Drive `06_AUDIT`.


## 27. Written historical Review compatibility

Historical 5W Review storage remains isolated and read-only in
`written_legacy_review_payload_v1` and
`written_legacy_review_binding_v1`.

The fail-closed legacy loader requires exact headers, `LOCKED` status,
matching set/source identities, the V2 reconstruction schema, the frozen
Written legacy Review contract, canonical reconstruction SHA-256, and
canonical binding SHA-256 before returning a normalized
`H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1`.

These legacy tables are not reused for new production answers. They remain
immutable compatibility sources and are merged into HOME history only through
the active Written provider.


## 28A. Written HOME and Review UI

HOME does not read legacy or production Written Review tables directly. Their lightweight metadata is represented in `review_home_index_v1`; legacy and production persistent tables remain the authority only when opening the exact Review.
Every Written entry carries `review_kind=WRITTEN`, preserves
score/uncertainty metadata, and advertises
`replay_capability=unavailable`.

The client distinguishes 5L and 5W history entries, requests Written Review by
`review_kind=WRITTEN + set_id`, renders D2-D6 symbolic answers, exact
source-bound semantic script, translations, rationale, and learning blocks,
and omits audio controls when no audio asset key exists. Written replay/media
controls remain unavailable.


## 29. Written production persistent Review

New production 5W Review uses dedicated tables:

- `written_review_payload_v1`
- `written_review_binding_v1`

The frozen production contract is
`H3-WRITTEN-PRODUCTION-REVIEW-CONTRACT-20260920-V1`; the learner payload
schema is `H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1`.

The normal postgrade order is:

```text
WRITTEN transaction COMMITTED
→ written_answer_sync_v1 STATUS=COMMITTED / PHASE=CORE_COMPLETE
→ Review payload PREPARED
→ exact result/source/review binding LOCKED
→ payload LOCKED
→ immediate persistent Review
```

The production binding covers the exact TXN_ID, SET_ID, STAGE_ID,
canonical result SHA-256, Written source-binding SHA-256, Review payload
SHA-256, and Review contract. Partial or conflicting authority is fail-closed;
same-hash completed materialization is idempotent.

For newly authored or unissued 5W, learner-facing Review authoring is stored
inside each question's `QUESTION_META_JSON.review` before issue. The
Written source binding hashes `QUESTION_META_JSON`, so Japanese body/choice
translations, rationale, and learning blocks are locked before submission.
Missing or mismatched Review authoring blocks fail render and new-submit.

Already issued or committed stages are immutable. A one-time production repair
may create only production Review payload/binding rows from already committed
source/result evidence, with no rewrite of stage, queue history, scheduler,
learner history, counters, or pointers.

Production HOME merges these rows with the separate immutable legacy Written
Review tables. Opening a production Review performs full source-lock
validation; HOME history remains a lightweight index. Written media, replay,
replay media, and grading capabilities continue to fail closed with
`WRITTEN_REVIEW_CAPABILITY_UNAVAILABLE`.

## 30. Learner-facing explanation and script ownership

The Web App Review surface is the sole learner-facing authority for postgrade explanation and semantic script content for both Listening (5L) and Written (5W).

- Immediate Review and Review history may show translations, rationale, vocabulary/grammar notes, pronunciation/Hanja notes where applicable, and the exact source-bound semantic script.
- Chat must not duplicate those explanation or script contents after grading and must not provide a Daily TXT as a learner-facing substitute.
- Stored script TXT files remain noncanonical internal/audit conveniences only. Their presence or absence must not change learner state, and they are never the fallback presentation surface.
- Listening Review must derive the displayed script from the locked/bound Review sources, not from chat-local text.
- Written production Review must persist or reconstruct the exact committed set's learner-facing explanation and script content under full source-lock and make it reopenable from HOME.
- Failure to materialize or open a production Written Review is a persistence/rendering defect. It does not authorize Chat or TXT fallback disclosure.
- Review history must reopen the same source-bound learner-facing content for the exact committed set without mutating score, history, scheduler, retest state, counters, or pointers.



## 32. Learning-surface compatibility envelope

Review remains provider-routed at the top level (`LISTENING | WRITTEN`) while learner surfaces are identified independently by `surface_family = 5L | 5W | READING | TRANSLATION` and `level = 3級 | 準2級`.

Opening a Review performs provider-specific source-lock validation first and only then attaches the common learning-surface metadata to the returned learner envelope. This avoids changing canonical stored Review hashes solely to expose routing metadata.

The HOME index reader is backward compatible with the current physical V1 header. `migrateReviewHomeIndexV2()` is the explicit idempotent migration that appends `SURFACE_FAMILY` and `LEVEL` and materializes the frozen legacy values for existing rows. The migration is never implicit and does not alter learner history, answers, scores, scheduler state, or Review payload authority.

Reading and Translation learner pilots are active and source-locked, while their scheduler/skill_queue integration remains inactive until F4. 準2級 remains taxonomy-ready but runtime-inactive until its dedicated activation gate.

## 33. Review explanation visibility and structured text

Across learner Review surfaces (`5L | 5W | READING | TRANSLATION`), the learner explanation is structurally always visible for `○ / △ / ×`. The explanation container is an ordinary non-disclosure block, not a `<details>` element, and it has no result-dependent open/closed state. The separate technical-information block remains the Review disclosure: it uses `<details>` and remains independently collapsible.

This visibility rule is presentation-only. It does not change scoring, learner history, provider routing, source authority, Review hashes, or active-learning answer behavior.

Structured Written learning-block text must preserve stored newline boundaries. In particular, a Hanja network stored as target, `⇒` related examples, and `≠` homophone examples on separate lines must render as the same three visual lines. The renderer must not infer or synthesize line splits when the stored content itself is one line; such content corrections belong to the source/payload layer.

## 34. Written 5W approved explanation overlay

Committed historical and production Review authorities remain immutable. Learner-facing
5W explanation corrections use the optional Review-only
\`written_review_explanation_overlay_v1\` plus
\`written_review_explanation_binding_v1\` overlay.

The overlay is bound to the exact immutable base authority hash
(\`RECONSTRUCTION_SHA256\` for historical Written Review or \`REVIEW_SHA256\` for
production Written Review), the exact SET_ID, source mode, approved-display hash,
and \`H3-WRITTEN-REVIEW-EXPLANATION-OVERLAY-20260921-V1\`. It may replace only the
learner-facing \`sections[].explanation\` object after the normal provider-specific
base Review has passed all existing source-lock validation. It must not alter score,
mark, uncertainty, answered_at, raw_input, SET_ID, STAGE_ID, TXN_ID, source binding,
learner history, scheduler, retest state, counters, pointers, Listening data, or
active-learning behavior.

If both overlay tables are absent, the existing base Review remains readable
unchanged. If only one overlay table exists, rows are duplicate/ambiguous, a hash
or source gate mismatches, or a stored source body/choice/correct-answer/mark gate
does not match the validated base Review, opening the affected overlay fails closed.

The internal provenance vocabulary supports
\`HISTORICAL_REFORMAT\`, \`HISTORICAL_WHY_EXPAND\`,
\`SOURCE_LINKED_REBUILD\`, \`CURRENT_REGENERATED_FROM_VERIFIED_SOURCES\`, and
\`CURRENT_NATIVE_STRICT\`. Provenance remains technical/collapsible and is never
shown as learner explanation content. The approved #1-#18 learner-facing source
text is bound by SHA-256
\`9b13effe68f565a1ef1fea5c13441dddf7ef3bed5296050c3e62931db48a670f\`.

Written 5W body-translation paragraphs and learning blocks preserve stored newline
boundaries. Other Review families use the same always-visible explanation container;
provider-specific translation and source-lock behavior remains unchanged.

## 35. Written 5W ANSWERED_AT backfill sidecar

Historical Written Review reconstruction remains immutable. A timestamp-only repair for
legacy 5W Review uses the optional `written_review_answered_at_backfill_v1` sidecar under
`H3-WRITTEN-REVIEW-ANSWERED-AT-BACKFILL-20260921-V1`.

Each LOCKED row binds the exact SET_ID, serialized ANSWERED_AT, observation PRECISION,
EVIDENCE, NOTE, contract ID, LOCKED_AT, and canonical RECORD_SHA256. The only supported
provenance pairs are `MINUTE + CHAT_HISTORY` and
`MINUTE_APPROX + USER_ASSIGNED_FALLBACK`; fallback rows require an explanatory note.
The serialized `:00` second is a storage convention only and must never be interpreted as
an observed second.

The sidecar may replace only an `UNKNOWN` Written Review answered_at, or validate
idempotently when the lightweight HOME index already contains the same repaired value. A
conflicting non-UNKNOWN timestamp fails closed. The sidecar must not change answers,
marks, score, uncertainty, question surfaces, explanations, source bindings, immutable
legacy reconstruction hashes, production Review hashes, queue/history, scheduler, retest
state, counters, pointers, Listening, or active-learning behavior.

HOME applies the same validated sidecar before sorting/rendering Written history. The
physical `review_home_index_v1.ANSWERED_AT` may be repaired to the same serialized value
for index consistency, while precision/evidence authority remains exclusively in the
versioned sidecar.

## 36. Reading / Translation persistent Review bridge

F1 is frozen by `H3-SURFACE-REVIEW-BRIDGE-20260921-V1`.

Reading and Translation remain `provider_kind=WRITTEN` learner surfaces and
use dedicated persistent Review authorities:

- `reading_review_payload_v1` / `reading_review_binding_v1`
- `translation_review_payload_v1` / `translation_review_binding_v1`

The 5W explanation overlay and 5W ANSWERED_AT sidecar remain 5W-only and are
not generalized to these families.

Reading Review preserves one grouped shared passage and exact passage hash
binding. Translation Review preserves exact `translation_direction` and
`answer_type`. Both use dynamic `item_count` rather than a five-item
assumption.

HOME remains lightweight-index-only. Reading/Translation entries retain
`KIND=WRITTEN` plus the exact `SURFACE_FAMILY`/level. Review opening for
these families requires explicit `surface_family`.

Current-learning arbitration is fail-closed at both boundaries: more than one
5W/Reading/Translation Written candidate is an error, and simultaneous
Listening plus Written-provider candidates are also an error.

F1 itself keeps P8/P11 PREISSUE_READY, both production commit gates disabled,
and all learner-facing issue/submit/scheduler paths inactive.


## 37. Translation source-bound explanation overlay

The immutable `translation_review_payload_v1` and
`translation_review_binding_v1` rows remain the base Review authority. The current
P11/P12 pilot explanations are attached only after that base Review passes its full
transaction, result, source-binding, payload-hash, and binding-hash validation.

`H3-TRANSLATION-EXPLANATION-20260921-V1` is keyed by the exact Translation
`SOURCE_BINDING_SHA256` and checks the ordered locked item identity, skill ID, and
locked item SHA before adding learner-facing `question.explanation`. The overlay is
in-memory and read-only; it does not rewrite the committed transaction, locked Review
JSON, Review SHA, binding SHA, score, mark, uncertainty, learner history, scheduler,
queue, counters, or pointers.

The explanatory reason/learning blocks are authored from the verified official
question/answer/translation capture plus the canonical skill map. They are not
represented as official publisher commentary. P11/P12 choices and translations that
are shown in the explanation must come from the verified source-bound capture.

The current pilot bindings for P11 and P12 are covered. Any later Translation source
binding must obtain its own verified explanation binding before it can claim the same
learner explanation coverage.


## 38. Dynamic Review priority and completion cooldown

Review priority uses `H3_REVIEW_PRIORITY_V4`. The originating Review result is evidence,
not a permanent sentence on that set's rank. Each item starts from residual weakness
`×=1.00`, `△=0.65`, `○=0.00`. Later authoritative learner evidence with the same
`skill_id` may update that item only when it comes from a different set and a different
surface. A later `×` resets weakness to `1.00`; a later `△` resets it to `0.65`;
the first independent `○` after non-correct evidence lowers it to `0.35`; the second
lowers it to `0.10`. Further independent `○` evidence keeps the residual floor at
`0.10` while refreshing the evidence clock. A later `×` or `△` resets the recovery.
This mirrors the learner-state rule that two spaced corrects deprioritize/stabilize but
do not prove mastery.

The derived V5 HOME index adds `PRIORITY_STATE_JSON`. It records only the computed
per-item Review-priority state (skill identity, source/latest result, residual weakness,
spaced-correct count, source surface identity, and latest evidence timestamp). It is not
learner history and never replaces the committed logs that produced it. `BASE_PRIORITY`
is the mean residual weakness after the existing family weighting. Both fields are
refreshed after committed answer/Answer Sync; HOME remains a lightweight read of
`review_home_index_v1`.

For each item's latest evidence age `d_i` in days:

```text
F_i = 1 - 2^(-d_i / 14)
F = mean(F_i)
P = B + (100 - B) × 0.40 × F
```

Thus a later independent correct answer can reduce an old Review set and restart the
forgetting clock for the affected skill without rewriting that historical set. Missing
or invalid `ANSWERED_AT` is fail-closed. The former oldest-known timestamp substitution
is removed because historical ACTIVE Review timestamps have been backfilled.

Review completion remains UI-state metadata, not learner-result evidence. A session is
eligible only after all Review questions have been displayed at least once in that
session and the learner then taps `ホーム`. Merely opening a Review, viewing only a
subset, refreshing, or leaving by another route must not change priority.

A completed session writes only `LAST_REVIEWED_AT` plus
`LAST_REVIEW_COMPLETION_KEY`. It must not alter score, answer/uncertainty marks,
immutable Review payload or binding hashes, learner history, retest state, scheduler,
skill_queue, counters, pointers, or source identity.

Let `P` be the ordinary 0–100 dynamic Review priority before cooldown and `h` hours
since the latest completed Review:

```text
0 <= h < 24:
  CAP = 10 + 15 × (h / 24)
  HOME_PRIORITY = min(P, CAP)

24 <= h < 96:
  START = min(P, 25)
  HOME_PRIORITY = START + (P - START) × ((h - 24) / 72)

h >= 96:
  HOME_PRIORITY = P
```

The 0–24h cap strongly suppresses an immediately reviewed set; 24–96h restores its
ordinary priority continuously. Cooldown never counts as mastery and never changes
`BASE_PRIORITY` or `PRIORITY_STATE_JSON`.

### Completion failure isolation and retry

The `ホーム` transition is mandatory and is not conditional on cooldown persistence.
After all questions have been viewed, the client starts the completion metadata RPC
and immediately loads HOME. A persistence failure leaves the set at ordinary,
uncooldowned priority and must not strand the learner on Review or require a second
HOME tap.

Completion identity uses canonical provider metadata (`provider_kind`, with
`kind` accepted only as compatibility fallback) and remains fail-closed on
identity, schema, source, surface, row, or integrity mismatch. Such failures are not
retried. Only an explicitly typed transient server result, or a transport-level RPC
failure, may be retried automatically, and at most once. The retry reuses the exact
same completion-event key, so an accepted first request followed by a lost response
cannot refresh the cooldown timestamp twice. Unknown runtime errors are not guessed
to be transient.

## 39. Review display normalization and Translation UI cleanup

Learner-facing Review presentation may apply deterministic display-only normalization
after the exact stored Review/source authority has passed its existing validation.
These normalizations do not rewrite committed learner history, score, answer/uncertainty
state, scheduler state, counters, pointers, or source-binding hashes.

Common Review translation presentation:
- Learner-facing Japanese translation bodies are shown without a leading arrow across all Review families (5L / 5W / READING / TRANSLATION).
- Reading shared-passage Japanese translation follows the same no-leading-arrow rule.

Reading presentation rules:
- Stored newline boundaries in Japanese passage translations remain visible.
- A parenthesized source marker of the form `(×...)` is rendered as an unfilled blank
  so a Review translation does not disclose an intentionally inappropriate choice in
  the passage blank.
- Reading footnotes normalize full-width asterisk/parenthesis notation to a half-width
  `* ` marker. The verified historical `매장：売り` truncation is displayed as
  `매장：売場`.
- Literal `<u>...</u>` source markup is not interpreted as arbitrary HTML. The client
  parses only the explicit underline marker and creates a DOM `u` element; all other
  text remains text content.

Translation presentation rules:
- The redundant family header `Translation`, the aggregate direction line, and
  per-question direction lines are not rendered.
- Question headings derive from the locked section identity:
  `H3-P11 -> 筆11/翻訳`, `H3-P12 -> 筆12/翻訳`.

Technical Review information always exposes a copy action for the displayed canonical
identifiers. Existing receipt-copy behavior remains separate.

Historical Listening display correction:
- For `H3-20260919-L02` K5 only, and only when the original locked explanation SHA is
  `d5fbcf3e695219d43ec0068d504067f00a0b1ca4c767cac3b54ace4230f52fc5`,
  the learner-facing reason removes the erroneous Korean quotation particle from the
  mixed Japanese explanatory sentence. The locked historical explanation row remains
  the validated authority; this is a source-identity-gated display correction.



## 40. Review explanation style contract

Shared learner-facing explanation style is governed by
`H3_REVIEW_EXPLANATION_STYLE_CONTRACT.md`
(`H3-REVIEW-EXPLANATION-STYLE-20260923-V3`).

The contract defines Japanese Review explanation meta-text as the explanatory semantic
roles corresponding to `reason`, `learning_blocks[].usage`, and
`learning_blocks[].note`. Across `5L | 5W | READING | TRANSLATION`, that meta-text
uses Japanese plain explanatory style (常体). Source/body translations, choice
translations, example translations, quoted source/answer text, Korean examples, and
source utterance honorific/register are excluded and retain their semantic form.

Representative examples must not duplicate the exact correct choice or completed
correct-answer surface after the contract's normalization. Exact answer wording may
still be cited in rationale/choice explanation; the separate representative example
uses a different short, natural surface demonstrating the same learning point.

This is an explanation/presentation contract only. Historical locked/committed Review
authorities remain immutable and any historical correction must use a validated,
source-bound overlay/display layer. No learner result, Review identity, source binding,
scheduler, skill_queue, retest state, counter, or pointer may be changed merely to
satisfy explanation style.

## 41. E5 Review audio binding contract

Contract ID: `H3-REVIEW-AUDIO-BINDING-20260923-V1`.

Status at E5-B: **binding contract ready; learner-facing embedding is not active yet**.
E5-B adds only read-only binding/validation helpers. It does not attach audio keys to
Review payloads, change the media route, or alter the existing inline audio component.

The E4 sidecar `review_audio_asset_v1` is the persisted Review-audio asset authority
for the E4 families only after the corresponding persistent Review/source authority has
already passed its existing validation. The exact lookup identity is:

```text
(SURFACE_FAMILY, SET_ID, SLOT_KEY)
```

No filename-based, nearest-set, cross-family, cross-set, or first-row fallback is
permitted. A lookup must resolve exactly one row. The row must retain the exact
17-column schema, `SCHEMA=H3_REVIEW_AUDIO_ASSET_V1`, `STATUS=DONE`, empty
`ERROR`, `GENERATOR_VERSION=review-audio-v2-1200ms`, a non-empty file ID/URL,
a valid audio-text SHA-256, and the canonical family folder. Missing, duplicate, stale,
wrong-family, wrong-folder, malformed, or non-DONE rows fail closed.

Review surface to sidecar-family mapping is fixed:

```text
5W          -> 5W
READING     -> 2R
TRANSLATION -> 2T
```

5L is intentionally excluded from this E5 binding contract and continues to use its
existing validated Listening Review media path.

Slot derivation is deterministic from the already validated Review payload:

```text
5W:
  D2 -> D2
  D3 -> D3
  D4 -> D4
  D5 -> D5
  D6 -> D6

READING:
  shared passage -> PASSAGE_COMPLETE
  question q_no=1 -> Q1_CHOICES
  question q_no=2 -> Q2_CHOICES

TRANSLATION:
  slot = {normalized section}_Q{q_no}
  section is exactly P11 or P12
  examples:
    T001 actual layout -> P11_Q1, P11_Q2
    mixed layout may  -> P11_Q1, P12_Q2
```

The client-facing logical `asset_key` for these future Review integrations is the
validated `SLOT_KEY`; file ID and URL are resolved server-side from the exact tuple and
are never selectors. E5-B exposes a read-only expected-binding plan and an exact
sidecar resolver, but deliberately does not inject them into 5W/2R/2T Review payloads.
That activation belongs to E5-C / E5-D / E5-E respectively.

The binding layer must never write or regenerate audio, rewrite locked Review payloads,
or mutate learner history, answers, uncertainty, score, scheduler, skill_queue, retest
state, generation history, pointers, counters, committed Reading/Translation history,
source provenance, or existing audio file identities.

## 42. E5-C 5W Review audio embedding

Status: **active for 5W only**.

E5-C activates the E5-B binding contract on persistent 5W Review without changing the
locked Review authority or any E4 audio asset. The raw validated Review payload is
cloned for learner-facing projection, `surface_family=5W` is applied to that clone,
and all five expected E5-B bindings are resolved before the payload is returned.

Each 5W card receives only display-time fields:

```text
D2 -> audio_asset_key=D2
D3 -> audio_asset_key=D3
D4 -> audio_asset_key=D4
D5 -> audio_asset_key=D5
D6 -> audio_asset_key=D6
```

`audio_fallback_url` comes from the same exact sidecar row. The existing integrated
inline play/pause + seekbar component is reused unchanged; no second audio control is
introduced.

For media loading, Review requests now identify the provider and surface explicitly.
A 5W media request uses `review_kind=WRITTEN`, `surface_family=5W`, `set_id`, and
`asset_key=SLOT_KEY`. Listening-only transaction identities are omitted from Written
media requests so provider routing remains unambiguous. The Written provider accepts
Review media only for 5W at this stage. Reading and Translation remain unavailable
through this media path until E5-D and E5-E.

Before returning bytes, the server re-opens the exact persisted 5W Review through the
existing source-lock validation, derives the allowlisted slots from that validated
payload, resolves the exact E5-B sidecar tuple, and then reads only that bound file.
There is no filename fallback, cross-set fallback, cross-family fallback, or silent
substitution.

E5-C is display/read-only integration. It does not modify locked Review JSON, Review
binding hashes, learner history, answers, uncertainty, score, scheduler, skill_queue,
retest state, generation history, pointers, counters, source provenance, or any of the
90 completed 5W Review audio assets.

