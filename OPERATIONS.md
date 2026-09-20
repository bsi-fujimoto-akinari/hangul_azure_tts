# Operations Policy

This document contains the current operating contract for `hangul_azure_tts`. Completed migration chronology remains available in Git history.

## 1. Source of truth

- GitHub `main` is authoritative for repository-managed code, workflows, manifests, and documentation.
- Feature branches and pull requests are change workspaces.
- Apps Script is the execution environment, not the code source of truth.
- Google Sheets remain authoritative for runtime, queue, and learner history data.
- Script Properties hold environment-specific configuration and secrets.
- Production and baseline tags are immutable verified snapshots.

## 2. Standard change workflow

```text
main -> feature branch -> pull request -> audit PASS -> squash merge -> main
```

Direct pushes and force pushes to `main` are prohibited. Each pull request should contain one bounded change. Do not bypass the required `audit` check or auto-resolve conflicts.

## 3. Repository and Apps Script synchronization

Normal direction is GitHub -> local -> Apps Script.

Before local synchronization, require a clean worktree. Use `git fetch` and `git pull --ff-only`; stop on divergence. Do not use `git reset --hard`, `git clean -fd`, or `clasp pull` as routine synchronization tools.

`.github/workflows/apps-script-auto-sync.yml` may synchronize an audited `main` commit to Apps Script HEAD when Apps Script-impacting files change. It must verify the canonical `.clasp.json` target before `clasp push`. `CLASPRC_JSON` exists only as a GitHub Actions secret and must never be printed or committed.

This workflow changes neither versioned `/exec` deployments nor Script Properties, Sheets, Drive assets, Azure configuration, or learner state. Deployment promotion is a separate, explicitly authorized operation. Reverse synchronization with `clasp pull` is recovery-only and must return through a reviewed branch and pull request.

## 4. Secrets and tracked files

Never commit credentials, `.clasprc.json`, `.env`, private keys, tokens, or generated local state. `.clasp.json` is tracked because it identifies the canonical Apps Script project; changing it requires explicit target verification.

The repository audit is a guardrail, not a substitute for diff review. If a secret is exposed, rotate or revoke it; deleting the file alone is insufficient.

## 5. Production boundary

Keep these states distinct:

```text
GitHub main       = code source of truth
Apps Script HEAD  = synchronized execution source
Versioned /exec   = explicitly promoted deployment
Production tag    = immutable verified snapshot
```

Documentation- or CI-only changes do not require Apps Script synchronization. Apps Script-impacting changes require audit PASS, exact-target sync, change-specific verification, and explicit deployment promotion when applicable.

## 6. Persistent K1_READY

`Code.js` is authoritative for the implementation; `listening_k1_ready_v1` is authoritative for persistent data. Chat-local state is only a cache.

Required order:

```text
persist -> exact readback -> prebind gate -> bind SET_ID -> audio queue
-> K1-K5 individual audio -> exact audio binding -> learner issue -> consume
```

Fresh binding requires `STATUS=READY`, blank `CONSUMED_AT`, blank `BOUND_LISTENING_SET_ID`, complete fields, and exact payload validation. Binding changes only `BOUND_LISTENING_SET_ID` and must read back exactly. Audio processing re-reads the bound record and verifies queue parity before any audio work.

For normal 5L, audio processing also performs `H3_LISTENING_AUDIO_SOURCE_ATTESTATION_V1` before any Azure or Drive mutation. The attestation re-reads the locked `listening_set_payload_v1` row, verifies the stored item-payload SHA, exact K2-K5 skill/provenance identity, and the semantic projection from each canonical item into `AUDIO_PLAN_JSON`. The resulting set-level attestation SHA is checkpointed on every non-done audio row. A source or checkpoint mismatch is fail-closed and must not be repaired by inference.

Consumption is post-issue only and changes only `STATUS=CONSUMED` and `CONSUMED_AT`. Audio completion, AUDIO_BOUND state, or a failed issue must not consume K1_READY. Missing or ambiguous state is a STOP condition; never infer, rebuild, or rebind it.

`K1_READY_ONE_SHOT_V1`: persist uses one exact A:M readback; bind keeps one full prebind payload/image-SHA validation followed by one exact A:M post-bind readback. When only column L changed as authorized, do not repeat the Drive image blob/SHA validation.

## 7. Learner triggers, targeted audio, and receipts

- `K1`: prepare and verify persistent K1_READY only.
- `5L`: Listening five-question Web flow.
- `5W`: current written five-question trigger.
- `5Q`: deprecated for new learner requests; historical identifiers remain unchanged.

The one-minute `processLatestPendingAudioJob()` trigger is fallback-only. Normal processing uses:

```text
processPendingAudioForSet(mode, setId)
```

`mode` must be `5L` or `5W`, and processing must never fall through to another pending set.

Committed Web transactions return:

```text
[H3_WEB_SYNC]
SET_ID=<exact set id>
TXN_ID=H3TX-YYYYMMDD-NNNNNN
STATUS=COMMITTED
```

Chat treats the receipt as a lookup key, performs canonical readback, and never duplicates backend mutations. The detailed contract is `H3_WEB_CHAT_CONTRACT.md`.


### 5W Written transaction D3

The production Written transaction journal is `written_web_txn_v1` with the
16-column `H3_WEB_WRITTEN_TXN_HEADERS` contract. The journal may contain
`PREPARED`, `COMMITTED`, `RECOVERY_REQUIRED`, and terminal recovery/error
states owned by `WebAppWrittenProduction.js`.

The production submit route accepts `schema=H3_WEB_SUBMIT_V1`,
`mode=WRITTEN`, one exact issued `SET_ID`, and ordered D2-D6 answers with
explicit boolean uncertainty. The transaction performs source-lock validation,
allocates from the global H3TX namespace, writes a PREPARED journal row, writes
only the exact queue `ANSWERS_LOG` cell, verifies the poststate hash, and then
promotes the journal row to COMMITTED.

At the D3 transaction boundary, the transaction itself ends at queue
`ANSWERS_LOG`. The production Web route then immediately invokes
`h3WrittenAnswerSync_(TXN_ID)`.

Answer Sync uses `written_answer_sync_v1` as a recovery journal and requires
the committed Written transaction plus exact queue-E poststate hash before any
scheduler/runtime write. Its bounded transaction updates exactly
`generation_log_v1`, affected `skill_queue_v1` rows, ratio-safe unissued
`source_block_plan_v1` slots when necessary, the next
`written_set_stage_v1` READY_TO_PATCH plan, and the corresponding
`generation_state_v1` pointer/state keys. × schedules +1..3, △ schedules
+2..5, ○ uses two different-set/different-surface evidence for STABLE, normal
retest cap is 2, deadline-risk cap is 3, active wrong cap is 5, and the
20-question primary-source ratio remains 11/6/2/1.

Answer Sync snapshots every exact target row before mutation. A successful
poststate hash promotes the sync journal to COMMITTED/CORE_COMPLETE. Verified
prestate may be safely replayed; verified poststate may be promoted; mixed
runtime state becomes RECOVERY_REQUIRED. The queue history row itself is never
rewritten by Answer Sync.

R9 DAILY_TXT remains Chat-owned until the canonical backend migration specified
by `hangul_quiz_rules_v4`. Scheduler continuity therefore closes at
CORE_COMPLETE before learner handoff; DAILY_TXT is noncanonical artifact
finalization.

Current-learning discovery/rendering for a new 5W set and automatic persistent
Review materialization for newly committed 5W transactions remain separate
later phases. Historical Written Review remains independently available through
the existing locked backfill provider.

## 8. Drive and hot canonical policy

Current folders are role-based: `00_SOURCE`, `01_OFFICIAL_MEDIA`, `02_TOWMI`, `03_AUDIO`, `04_LEARNER_ARTIFACTS`, `05_STATUS`, and `06_AUDIT`.

Audio storage is:

```text
03_AUDIO/01_5W
03_AUDIO/02_5L
03_AUDIO/90_ARCHIVE/01_SYSTEM_TEST
03_AUDIO/90_ARCHIVE/02_PRE_R3_5L
03_AUDIO/90_ARCHIVE/03_LEGACY_COMBINED
03_AUDIO/90_ARCHIVE/04_STALE_REPLACED
```

New 5L sets use K1-K5 individual audio only. Do not create new combined 5L audio. Preserve file IDs and URLs when moving verified artifacts. Hot canonical files retain current gates, hashes, pointers, and contracts; completed detail belongs in release/audit storage or Git history.

SCRIPT_TXT is not a preissue prerequisite. When needed for Review/audit convenience, materialize it explicitly after the five audio rows are done with `persistListeningSetScript(SET_ID)`; failure to create this noncanonical TXT must not invalidate an otherwise-valid learner issue.

## 9. Current production and Review invariants

- Production commit gate is `NORMAL_LIVE_ACTIVE`; no fixed one-set arm remains.
- Preissue is fail-closed for source-lock, recovery, scheduler overload, and audio parity.
- Production transactions are atomic and idempotent, with journal and receipt integrity.
- Persistent Review is reconstructed only from committed, locked, hash-valid sources.
- HOME history reads only derived `review_home_index_v1`; `BASE_PRIORITY` is refreshed after committed answers, HOME computes only elapsed-time pressure, and opening Review performs full source-lock validation.
- `REVIEW_REPLAY` is retired; active providers fail closed on replay requests.
- SYSTEM_TEST remains an explicit allowlisted diagnostic route and must not mutate learner runtime.
- HOME shows only the Review library. Each history card opens Review directly; provider selection is exclusive `L/W`, sorting is `Newest/Priority`, priority uses `H3_REVIEW_LEVEL_V2`, and the segmented control block is sticky. Review shows one question card at a time with compact progress and a full-width `ホーム` control.

Detailed Review storage, reconstruction, failure, retired-replay, HOME priority, and legacy rules are in `H3_REVIEW_ARCHITECTURE.md`.

## 10. Verification and prohibited operations

For every change, verify intended diff, tracked-file safety, credential safety, manifest/target policy, JavaScript syntax, and all relevant durable runtime invariants. After merge, confirm the `main` audit and classify production impact before any synchronization.

Prohibited without a separately authorized recovery or release operation:

- direct or force push to `main`;
- history rewrite, tag movement, or ruleset bypass;
- unreviewed conflict resolution;
- `clasp pull` as normal development;
- unverified `clasp push` or versioned deployment promotion;
- moving secrets or runtime data into GitHub;
- changing learner history, score, counters, pointers, scheduler, K1_READY, or audio as a side effect of maintenance.

Follow `RECOVERY.md` for incident handling.

## 23. Learner URL authority

Canonical learner URL:

```text
https://script.google.com/macros/s/AKfycby8I309RUkfVIsnJks808KA713QLppfrGiAFUTV2tA/dev
```

Normal 5L handoff:

1. complete canonical preissue and issue;
2. call `getListeningLearnerUrl(SET_ID)`;
3. require `handoff_mode=HOME_PARAMETERLESS`;
4. return only the `url` field.

Do not return as the normal Chat link:

- `direct_url`;
- any URL containing `?mode=`, `set_id=`, or `txn_id=`;
- `script.googleusercontent.com`, `/macros/echo`, `user_content_key`, or `lib=` URLs.

HOME resolves only an `ISSUED`, uncommitted, production-renderable set. If it cannot resolve the just-issued set, stop and audit rather than falling back to a diagnostic URL.

### Parameterless direct boot

With no query parameters, the server reads canonical current-learning state. If a safe active set exists, boot directly in its canonical mode: LISTENING for 5L or WRITTEN for 5W, with that exact SET_ID; otherwise boot as HOME. Explicit query routes remain internal/diagnostic.

## 24. Listening audio reliability patch

Current learner audio behavior:

- pause every non-active audio element on navigation;
- start an automatically advanced question at its beginning;
- keep background prefetch failures local to the affected asset;
- retry media RPC once before exposing a question-local fallback;
- source-lock K2/K3 prompts and four choices against `AUDIO_PLAN_JSON` at preissue.

Global learner errors must not be raised by background prefetch failure.

## 25. Official Listening audio parity V21

For newly authored/unissued 5L:

- K2/K3 announce ①-④ as `マルイチ`, `マルニ`, `マルサン`, `マルヨン` with Nanami immediately before each Korean choice;
- K3 prompt and response voices differ according to the canonical Korean voice pair;
- K4/K5 place Nanami's `もう一度読みます` between the two passage readings;
- Korean replay cues are forbidden;
- preissue rejects any parity violation.

Semantic Review scripts omit control audio. Existing issued/committed sets remain immutable.

## 26. Listening overload scheduler

Each 5L remains exactly K1-K5. Normally at most one slot is a retest. During canonical overload, up to two different section-matched retests are allowed. `H3_LISTENING_OVERLOAD_PLAN_V3`, the persisted cap, selected retest sections, and locked payload must agree exactly. Blocking overflow is a STOP condition.

## 27. Legacy pre-Web Review runtime

`H3-20260919-L02` is a permanent `LEGACY_PRE_WEB` compatibility surface. Its original result is reconstructed from canonical `listening_log_v1`; no synthetic transaction or TXN_ID is created.

`listening_legacy_review_v1` stores the immutable binding. HOME merges its entry with transaction-backed history, excludes registered legacy sets from current-learning resolution, and routes Review/media/replay internally by `legacy_review_id`. Unknown historical uncertainty is shown as `?—`. Replay is transient and zero-mutation.

Completed migration helpers are not runtime code. Migration evidence remains in Git history and Drive `06_AUDIT`.

## 28. Minimal learner-facing Chat output

- successful `5L` trigger -> the exact parameterless Web App URL only
- verified `[H3_WEB_SYNC]` -> `No issues detected.` only
- failed `[H3_WEB_SYNC]` verification -> `Issue detected.` only

Minimal output never permits skipping canonical issue, receipt, source-lock, scheduler, or recovery checks.

## 30. Normal hot-path readback

Operational normal-flow reads follow `NORMAL_HOTPATH_READBACK_V1` in `H3_WEB_CHAT_CONTRACT.md`.

- `K1`: perform one bounded parallel runtime read bundle, then one exact A:M readback after atomic K1_READY persist. Do not repeatedly read the same immutable K1_READY fields.
- `5L`: fan out independent state/policy/K1_READY/scheduler/target-set/log/transaction/audio reads in parallel; preserve write-dependent sequencing and the final fail-closed preissue gate.
- `H3_WEB_SYNC`: after exact receipt parsing, fan out exact transaction, five learner-log rows, current Listening state, and recovery-status verification in parallel, then evaluate the existing identity/hash/state contract.

Normal flow does not re-read GitHub `main`, `HANGUL_INFRA_STATUS_CURRENT`, manifest, or canonical release files on every learner request. Read those only for drift, canonical change, mismatch, recovery, or explicit audit.

Connector/tool implementations must batch independent reads in one tool turn (for example with `Promise.all`) rather than serialize them. No new runtime aggregation Sheet/tab is authorized.


## 31. Listening backend orchestrator

`prepareListeningBackendSet(request)` is the preparation-only coordinator for one explicit future 5L set. It requires `schema=H3_LISTENING_BACKEND_PREPARE_V1`, an explicit `set_id`, and an explicit persisted `k1_ready_id`. It never allocates the learner SET_ID.

The recovery-safe order is:

```text
O0 fresh policy/state/K1/pre-stage/source preflight
-> O1 exact LOCKED listening_set_payload_v1 source lock
-> O2 exactly five K1-K5 listening_audio_queue_v1 rows
-> O3 K1_READY bind + pre-stage BOUND
-> source attestation
-> O4 targeted processPendingAudioForSet('5L', SET_ID)
-> O5 exact AUDIO_BOUND binding
-> O6 immutable SCRIPT_TXT materialization
-> O7 validateProductionPreissueSet(SET_ID) PASS
-> PREISSUE_READY
```

The outer coordinator does not hold ScriptLock while calling `processPendingAudioForSet`, because that targeted audio primitive owns its own ScriptLock. O0-O3 and O5-O7 each run under an orchestrator ScriptLock; the existing audio path re-validates bound K1 and `H3_LISTENING_AUDIO_SOURCE_ATTESTATION_V1` before any Azure/Drive mutation.

Preparation writes are limited to the canonical preparation surfaces: `listening_set_payload_v1`, `listening_audio_queue_v1`, K1 `BOUND_LISTENING_SET_ID`, pre-stage `STATUS/BOUND_LISTENING_SET_ID`, source-attested split audio files, and the semantic set TXT. Exact prior LOCKED/AUDIO_BOUND state may be resumed only when source/hash/binding identity still matches. Partial audio rows, source drift, policy/scheduler drift, conflicting same-SET payload, K1 bound elsewhere, nonblank `ISSUED_AT`, or blocking overload are STOP conditions.

This orchestrator does not issue a learner set, set `ISSUED_AT`, consume K1_READY, create learner log or production transaction rows, update `listening_state_v1` counters/pointers, or advance the scheduler. Learner issue remains a separate dedicated flow after a verified `PREISSUE_READY`.

For current set no.4, K2-K5 pre-stage may remain READY while no new K1_READY exists. In that state the correct runtime behavior is to perform no backend materialization or audio start until a new valid K1_READY is supplied explicitly.


## 32. Written current-learning and render

`h3WrittenCurrentLearning_(spreadsheet)` is the production 5W current-learning
resolver. It accepts only one exact `written_set_stage_v1` row with
`STATUS=ISSUED`, nonblank `ACTUAL_SET_ID`/`ISSUED_AT`, blank queue
`ANSWERS_LOG`, no committed Written transaction, and no PREPARED or
RECOVERY_REQUIRED transaction for the same set. More than one safe unanswered
Written set is a fail-closed ambiguity.

`buildWrittenProductionRenderPayload_(request)` reuses
`h3WrittenReadContext_`, `h3WrittenValidateSourceIdentity_`, and the same
source-binding contract as Written submit. It additionally verifies that every
rendered question and choice is present in the locked queue question surface.
The payload contains only safe pre-answer fields and never exposes answer
positions/text or explanations.

The normal learner handoff for an issued 5W set is
`getWrittenLearnerUrl(SET_ID)`; it verifies both exact renderability and
current-learning identity, then returns the same parameterless HOME URL used by
5L. Direct `?mode=WRITTEN&set_id=...` is diagnostics-only.

The client renders D2-D6 dynamically, preserves Korean line breaks, shows
①-④ choices plus the explicit `?` control, and does not request audio for 5W.
Unlike Listening, selecting Q5 does not auto-submit. The Written learner must
press `採点` after all five answers are present; `リセット` is available
before grading only.


## 33. Runtime identity hierarchy

`H3_RUNTIME_IDENTITY_V1` standardizes coordination for 5W and 5L without renaming historical IDs or adding drift-prone alias counters.

```text
ISSUE_NO = learner-facing ordinal
STAGE_ID = preissue preparation/scheduling identity
SET_ID   = immutable learner-set identity
```

Canonical mappings:

- 5W: `ISSUE_NO` = stable Written ordinal; `STAGE_ID` = `written_set_stage_v1.STAGE_ID`; `SET_ID` = `ACTUAL_SET_ID` after allocation/issue.
- 5L: `ISSUE_NO` = `LISTENING_ISSUE_NO / NEXT_LISTENING_SET_NO`; `STAGE_ID` = selected `listening_k2_k5_stage_v1.PRESTAGE_ID`; `SET_ID` = `listening_set_payload_v1.LISTENING_SET_ID` after allocation/lock.
- K1_READY remains an independent subordinate source identity for 5L.
- A `SET_ID` suffix is never interpreted as `ISSUE_NO`.
- Before exact SET_ID allocation, report `PENDING_ALLOCATION`; do not predict an ID.
- Coordination reports must always use the same `ISSUE_NO / STAGE_ID / SET_ID` tuple for both modalities.

The detailed rules and current snapshot example are in `H3_WEB_CHAT_CONTRACT.md` section 25.

## H3 Web / Review active manifest

```text
MANIFEST_ID=H3-WEB-REVIEW-MANIFEST-20260920-V8
ACTIVE_WEB_CHAT_CONTRACT=H3-WEB-CHAT-CURRENT-20260920-V7
ACTIVE_WEB_CHAT_CONTRACT_PATH=H3_WEB_CHAT_CONTRACT.md
ACTIVE_WEB_CHAT_CONTRACT_BLOB_SHA=33bbbe833da8e00d52a7f6aeec1ce51fc1a9b2a4
ACTIVE_REVIEW_ARCHITECTURE=H3-REVIEW-ARCHITECTURE-CURRENT-20260920-V8
ACTIVE_REVIEW_ARCHITECTURE_PATH=H3_REVIEW_ARCHITECTURE.md
ACTIVE_REVIEW_ARCHITECTURE_BLOB_SHA=5d641ff76645d22fce08d9b365008ec05ba4e645
ACTIVE_WRITTEN_PRODUCTION_REVIEW_CONTRACT=H3-WRITTEN-PRODUCTION-REVIEW-CONTRACT-20260920-V1
ACTIVE_WRITTEN_PRODUCTION_REVIEW_SCHEMA=H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1
ACTIVE_WRITTEN_REVIEW_PAYLOAD_SHEET=written_review_payload_v1
ACTIVE_WRITTEN_REVIEW_BINDING_SHEET=written_review_binding_v1
ACTIVE_REVIEW_LEVEL_CONTRACT=H3_REVIEW_LEVEL_V2
ACTIVE_REVIEW_HOME_INDEX_SHEET=review_home_index_v1
ACTIVE_RUNTIME_IDENTITY_CONTRACT=H3_RUNTIME_IDENTITY_V1
LEARNER_CONTENT_AUTHORITY=WEB_APP_REVIEW_ONLY
```

