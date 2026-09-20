# H3 Web / Chat Contract

Version: H3-WEB-CHAT-CURRENT-20260920-V4

This document defines the current learner trigger, Web handoff, receipt, and minimal Chat response contract. Completed migration chronology remains in Git history.

## 1. Learner triggers

- `K1`: prepare and verify persistent K1_READY; does not issue 5L.
- `5L`: start the Listening five-question Web flow.
- `5W`: current written five-question trigger.
- `5Q`: DEPRECATED for new requests; do not rewrite historical identifiers.

## 2. Targeted audio dispatch

Normal dispatch is `processPendingAudioForSet(mode, setId)` with exact mode `5L` or `5W`. The supplied SET_ID is mandatory and the dispatcher must never fall through to another pending set. `processLatestPendingAudioJob()` remains fallback-only.

## 3. Receipt grammar

Committed H3 Web transactions use exactly four lines:

```text
[H3_WEB_SYNC]
SET_ID=<exact set id>
TXN_ID=H3TX-YYYYMMDD-NNNNNN
STATUS=COMMITTED
```

The receipt contains no score, answers, answer key, explanation, or journal name. The grammar is shared by SYSTEM_TEST, 5L production, and 5W production.

## 4. Receipt verification

Chat must parse the receipt exactly and verify canonical backend state. A visible success screen is not proof.

Common requirements:

- exactly one matching transaction authority;
- exact TXN_ID and SET_ID;
- `STATUS=COMMITTED`;
- matching RESULT_JSON identity, fingerprints, and hashes;
- no unresolved `RECOVERY_REQUIRED`;
- idempotent handling of repeated receipts;
- no duplicate history/state write from Chat.

SYSTEM_TEST reads `listening_web_test_txn_v1`, requires `MODE=SYSTEM_TEST`, and requires equal prestate/poststate hashes. It must not mutate learner runtime.

5L reads `listening_web_txn_v1`, requires `MODE=LISTENING`, verifies the exact five `listening_log_v1` rows and `listening_state_v1` transition, and then relies on the Web App's persistent Review for ordinary explanation.

5W reads `written_web_txn_v1`, requires `MODE=WRITTEN`, exact committed queue-E poststate identity, and a matching `written_answer_sync_v1` row with `STATUS=COMMITTED` and `PHASE=CORE_COMPLETE`. The sync journal plan/hash and exact next-stage identity must agree with current `generation_log_v1`, `skill_queue_v1`, `generation_state_v1`, and `written_set_stage_v1`. Any `RECOVERY_REQUIRED`, mixed pre/post state, or missing CORE_COMPLETE sync is a STOP condition. Chat must never repeat backend generation-log, skill-queue, scheduler, or pointer mutations.

## 5. Failure behavior

Malformed, unknown, duplicate, non-COMMITTED, mismatched, hash-invalid, incomplete, or recovery-blocked receipts are STOP conditions. Do not treat them as committed, write learner history, or issue the next set.

## 6. Ownership

The backend grades, performs authorized canonical writes, commits the journal, and returns the receipt. The Web App owns immediate persistent Review. Chat verifies canonical state when a receipt is supplied, coordinates later work, and never duplicates backend mutations.

## 7. Learner-facing Web launcher

Canonical learner URL:

```text
https://script.google.com/macros/s/AKfycby8I309RUkfVIsnJks808KA713QLppfrGiAFUTV2tA/dev
```

The normal learner handoff for both 5L and 5W is parameterless HOME. After successful 5L issue, Chat calls `getListeningLearnerUrl(SET_ID)`; after successful 5W issue, Chat calls `getWrittenLearnerUrl(SET_ID)`. Both must return `handoff_mode=HOME_PARAMETERLESS`.

### Parameterless handoff refinement

Chat must return the resolver's `url` field, not `direct_url`. The returned `url` is exactly the parameterless canonical base.

Do not return a normal learner link containing `?mode=`, `set_id=`, `txn_id=`, `script.googleusercontent.com`, `/macros/echo`, `user_content_key`, or `lib=`. `direct_url` is internal diagnostics only.

Parameterless boot resolves the latest safe `ISSUED`, uncommitted, production-renderable 5L or 5W. Failure to resolve the just-issued target is a STOP condition, not permission to fall back to a query-string link.

### Parameterless direct boot

With no query parameters, server boot checks canonical HOME/current-learning state. If an authorized active learning set exists, it boots that exact mode and SET_ID: `LISTENING` for 5L or `WRITTEN` for 5W. Otherwise it boots HOME. Thus the learner does not need to tap the current-set button during an active issue.

Explicit `SYSTEM_TEST`, `LISTENING`, `WRITTEN`, and `REVIEW` routes remain controlled internal/diagnostic paths. `REVIEW_REPLAY` is retired and is not a learner boot route. `ping=1` remains a health check. HTTP job execution stays disabled.


### 5W current-learning and question render

A 5W set is current-learning only when the exact `written_set_stage_v1` row is
`STATUS=ISSUED`, has one exact `ACTUAL_SET_ID` and `ISSUED_AT`, the matching
queue row still has blank `ANSWERS_LOG`, no committed Written Web transaction
exists for that SET_ID, and the full Written render source-lock passes.

The learner render is derived from the same issued stage/queue authority used by
`h3WrittenSubmit_`. It exposes only D2-D6 question text, the four visible
choices, display headings, and source-binding identity. It never exposes
`answer_pos`, `answer_text`, the answer key, or explanation before grading.
Written current-learning has no pre-answer media dependency.

For newly authored or unissued 5W sets, each question in `QUESTION_META_JSON` must also carry issue-locked Review authoring metadata. The Review object must include a Japanese body translation, exactly four choice translations whose Korean text exactly matches the issued choices, a nonblank rationale, and a learning-block array. Written render and new-submit fail closed when this metadata is missing or mismatched. Because `QUESTION_META_JSON` participates in `H3_WRITTEN_SOURCE_BINDING_V1`, the learner-facing explanation is source-locked before answer submission.

Already issued or committed sets are immutable. A historical production repair may populate only the dedicated production Review payload/binding tables from already committed source/result evidence; it must not rewrite the issued stage, queue answer history, scheduler, counters, or pointers.

The 5W UI keeps D2-D6 dynamic section order, renders Korean line breaks exactly,
shows the `?` uncertainty control, and requires an explicit `採点` action
after all five answers are selected. `リセット` is available only before
grading. First successful grading locks the answer snapshot and routes the
submission through the Written transaction + Answer Sync backend.

## 8. Script TXT storage

- 5W: `03_AUDIO/01_5W/H3-YYYYMMDD.txt`
- 5L: `03_AUDIO/02_5L/{LISTENING_SET_ID}.txt`
- SYSTEM_TEST: `03_AUDIO/90_ARCHIVE/01_SYSTEM_TEST/{SET_ID}_script.txt`

TXT files are noncanonical conveniences. Moving or regenerating them must not rewrite learner state.

For 5L, SCRIPT_TXT is explicitly outside the learner issue critical path. Audio completion, source-lock validation, preissue, and issue do not require a script TXT file. It may be materialized later for Review/audit convenience.

## 9. Persistent Review

Committed 5L answers open the persistent Review built from exact transaction, payload, binding, image, and audio sources. HOME lists committed Reviews. Opening a Review performs full source-lock validation.

For 5W, a committed production answer must also materialize an immediate persistent Written Review and make the exact committed set available from HOME. The production sequence is `WRITTEN COMMIT → Answer Sync CORE_COMPLETE → Written Review PREPARED/LOCKED → immediate Review response`. The Review binding must agree with the exact Written TXN_ID/SET_ID/STAGE_ID, result hash, Written source-binding hash, Review payload hash, and production Review contract. A missing or hash-invalid production Written Review is an implementation defect and must not be worked around by reproducing explanation or script content in Chat.

`REVIEW_REPLAY` is retired. Listening and Written Review are read-only postgrade surfaces; the learner-facing UI provides no replay/retry action.

## 10. Learner-facing explanation and script ownership

This contract applies equally to 5L and 5W learner-facing postgrade content.

- The Web App immediate Review / persistent Review page is the only learner-facing surface for translations, explanations, correct-answer rationale, comparison notes, pronunciation notes, Hanja notes, and semantic audio-script text.
- Chat must not reproduce those explanation or script contents after grading. Chat remains limited to the contract-approved handoff, receipt verification, integrity status, and coordination outputs.
- Chat must not attach or link a Daily TXT as a learner-facing script handoff.
- Script TXT files may continue to exist as noncanonical internal/audit conveniences, but they are not a learner-facing artifact and must not be used as a fallback when Review persistence or rendering is missing.
- Review reconstruction must retain or source-lock the exact script content required for the Review page without depending on chat-local state.
- HOME history must reopen the same source-bound explanation and script content for the exact committed set.
- HOME does not render an unanswered/current-learning header. Active issued learning is resolved by parameterless boot before HOME is shown.
- Written history receives a stable chronological `5W #N` ordinal; Listening retains `5L #N`.
- HOME cards themselves are the Review navigation target; separate `復習` and `再挑戦` buttons are not learner-facing controls.
- HOME filters are `聞きとり` and `筆記`; sorting supports newest-first and descending Review level.
- Review level uses `H3_REVIEW_LEVEL_V1` (0–100): each item contributes result severity `×=12 / △=6 / ○=0` plus up to 8 points from repeated weakness on the same skill (`2×historical wrong + historical uncertain`). Higher values mean higher review priority.

## 18. Listening audio reliability

Question navigation pauses non-active audio. Automatic transition starts the next question at its beginning. Media RPC retries once; exhausted loading shows a question-local fallback. Background prefetch failure must not become a global learner error.

Preissue source-locks K2/K3 prompt and all four choices against `AUDIO_PLAN_JSON`; omission or ordering mismatch is a STOP condition.

## 19. Official Listening audio parity V21

For newly authored/unissued 5L:

- K2/K3 use Nanami for `マルイチ` through `マルヨン` immediately before each Korean choice;
- K3 uses distinct canonical prompt/response Korean voices;
- K4/K5 use Nanami's `もう一度読みます` between passage readings;
- Korean replay cues are forbidden;
- preissue rejects parity failures.

Issued and committed sets remain immutable.

## 20. Listening overload scheduler

The learner surface remains five K1-K5 slots. Normal sets allow at most one retest; overload permits up to two different section-matched retests. `H3_LISTENING_OVERLOAD_PLAN_V3`, persisted cap, selected sections, and locked payload must agree. Blocking overflow stops issue.

## 21. Legacy Review compatibility

`H3-20260919-L02` remains a `LEGACY_PRE_WEB` Review without synthetic transaction/TXN_ID. HOME may list it through its immutable legacy binding. Unknown historical uncertainty is `?—`; Review and replay are read-only and zero-mutation.

## 22. Minimal Chat output contract

After a successful `5L` or `5W` issue, Chat returns the parameterless Web App URL and nothing else.

After authoritative `[H3_WEB_SYNC]` verification, Chat returns exactly one of:

```text
No issues detected.
```

```text
Issue detected.
```

Do not add score, answers, explanation, progress, audit detail, or next-step commentary in that turn. Minimal output never weakens canonical verification.

## 23. NORMAL_HOTPATH_READBACK_V1

`NORMAL_HOTPATH_READBACK_V1` is the canonical normal-flow readback contract for `K1`, `5L`, and `[H3_WEB_SYNC]`.

General rules:

1. Read only the canonical Sheet ranges required by the current operation.
2. Independent reads must be issued in one parallel fan-out at the connector/tool layer (for example, `Promise.all` in one tool turn); serial independent Sheet reads are prohibited in normal flow.
3. GitHub `main`, `HANGUL_INFRA_STATUS_CURRENT`, source manifest, canonical release files, and historical audit/release material are not per-request normal-flow reads.
4. Those version/canonical surfaces are read only for version drift, a canonical change, recovery, mismatch, explicit audit, or another concrete integrity signal.
5. This optimization never removes source-lock, item/audio hash validation, scheduler gates, idempotency checks, preissue validation, receipt verification, or fail-closed recovery behavior.
6. Do not create a new runtime Sheet/tab merely to aggregate hot-path reads.

### A. K1 preparation readback

Normal K1 preparation uses one bounded parallel read bundle for only the runtime inputs required to author/persist the next K1 surface, such as the current Listening state/policy and any K1_READY row needed for supersede/eligibility checks. After a new K1_READY row is atomically persisted, its exact A:M verification follows the one-shot K1 contract; the same row is not repeatedly re-read merely to reconfirm already-verified immutable fields.

### B. 5L preparation and preissue readback

Normal 5L preparation begins with one bounded parallel fan-out for independent runtime authorities needed for the target set: Listening state/policy, the eligible persisted K1_READY, scheduler/retest inputs, and relevant target-set/log/transaction/audio state. Reads that depend on a newly created identifier or prior write still occur after that dependency, but independent authorities must not be serialized. The final preissue gate remains authoritative and fail-closed.

### C. H3_WEB_SYNC receipt verification readback

After exact four-line receipt parsing, Chat resolves the exact TXN_ID/SET_ID and performs one bounded parallel authoritative verification bundle for the matching production transaction, exact five learner-log rows, current Listening state, and unresolved `RECOVERY_REQUIRED` condition. The receipt itself is never treated as proof of commit. A PASS still requires the same identity/hash/state checks defined by this contract.

This contract changes read scheduling only. It does not authorize live writes, relaxed validation, inferred state, or cached-state substitution for an authoritative required readback.

## 24. K1_READY_ONE_SHOT_V1

`K1_READY_ONE_SHOT_V1` defines the fail-closed K1 persist/bind readback contract.

### New K1_READY persist

- Write exactly one complete K1_READY row atomically with all required A:M fields.
- Perform exactly one immediate exact A:M readback for that new row.
- Use that same readback to verify the exact header/schema, literal-value requirement, persisted values, K1_READY_ID, required JSON/hash fields, `STATUS=READY`, blank `BOUND_LISTENING_SET_ID`, and blank `CONSUMED_AT`.
- Do not perform duplicate same-content readbacks merely to reconfirm fields already verified by that exact A:M readback.
- A mismatch remains a hard STOP; do not infer or repair the row from chat-local cache.

### K1_READY bind

Before binding, retain the full persistent payload validation, including image-file existence and exact image SHA256 verification. Bind may write only column L (`BOUND_LISTENING_SET_ID`).

After the column-L write, perform one exact same-row A:M readback and require:

- the same K1_READY_ID;
- `STATUS=READY`;
- exact target `BOUND_LISTENING_SET_ID`;
- blank `CONSUMED_AT`;
- every column other than L exactly unchanged from the already-validated prebind row.

When all of those conditions pass, the post-bind readback proves that the validated immutable payload was not changed by bind. A second Drive blob read / image SHA256 recomputation is therefore not required after bind.

`consumeK1ReadyAfterIssue_()` keeps its existing post-write readback semantics. This optimization does not relax consume eligibility, source-lock, audio-start validation, or fail-closed behavior.
