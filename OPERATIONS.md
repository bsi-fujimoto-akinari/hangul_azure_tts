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

### 2.1 Four-Phase code-change workflow contract

Contract: `H3_CODE_CHANGE_4PHASE_WORKFLOW_V1`.

Code-change work is canonically divided into exactly four ordered phases, but the normal execution unit is **one Chat**. Unless a concrete blocking reason requires a handoff, the same Chat should progress through Phase 1 -> Phase 4 and close the work completely.

```text
PHASE-1 DESIGN
-> PHASE-2 IMPLEMENT
-> PHASE-3 INTEGRATE
-> PHASE-4 ACCEPT_AND_CLOSE
```

The four phases are process boundaries, not Chat boundaries. They do not authorize weaker repository, runtime, audit, release, or recovery behavior.

#### One-Chat default

The default code-change lifecycle is:

```text
one Chat
  PHASE-1 DESIGN
  -> PHASE-2 IMPLEMENT
  -> PHASE-3 INTEGRATE
  -> PHASE-4 ACCEPT_AND_CLOSE
  -> continuity.state=clean
```

Do not split work into multiple Chats merely because a phase boundary was reached. Continue in the current Chat when the required tools, context, and execution time remain available.

A cross-Chat handoff is justified only by a concrete reason such as:

- an external wait or user/device acceptance that cannot complete in the current Chat;
- tool/session/runtime limits or a material timeout risk;
- a blocked dependency that requires later continuation;
- an incident/recovery path that benefits from an isolated repair context;
- an explicit user request to split the work.

When no such reason exists, closing the work in one Chat is the canonical behavior.

#### PHASE-1 DESIGN

Purpose: determine the cause, scope, authority, impact surface, implementation contract, and verification plan before product-code mutation.

Normal behavior:

- begin from fresh canonical state and exact current repository `main`;
- identify the work ID and authoritative files/data involved;
- inspect existing contracts, runtime boundaries, CI, release, and recovery requirements;
- define intended files, prohibited mutations, expected tests, post-merge verification, and any learner/device acceptance requirement;
- remain READ_ONLY against product code and learner runtime except for a permitted canonical work-start checkpoint when durable coordination state is required.

Phase-exit condition: the implementation scope and verification plan are fixed enough that PHASE-2 does not need to redesign the work.

#### PHASE-2 IMPLEMENT

Purpose: implement the bounded change in a feature branch and make the pull request green.

Normal behavior:

- branch from the exact main SHA established for the work;
- modify only the authorized scope;
- update canonical contract/audit files when the implementation changes a permanent rule;
- run repository CI and correct implementation or test-fixture defects;
- open or update one bounded pull request;
- do not treat unmerged branch state as deployed or authoritative runtime state.

Phase-exit checkpoint:

```text
PR=<number>
PR_HEAD_SHA=<immutable SHA>
CI=PASS
MERGED=false
```

If the same Chat continues into PHASE-3, this checkpoint remains part of the in-Chat transaction; it does not require a handoff message or a new Chat.

#### PHASE-3 INTEGRATE

Purpose: merge the verified PR and prove the exact resulting `main` in its execution environment.

Normal behavior:

- fresh-read PR mergeability/head SHA and current `main`;
- squash-merge through the reviewed PR path;
- record the exact merge/main SHA;
- require exact-main Repository audit and all applicable same-SHA audits;
- for Apps Script-impacting work, require exact target sync, source attestation, exact-source binding, and applicable automatic live smoke;
- inspect exact logs/results for any post-merge failure; do not infer success from merge alone;
- do not advance unrelated work or stages.

Phase-exit condition: exact-main PASS with all applicable synchronization/attestation/smoke evidence fixed to that SHA.

If post-merge verification fails, checkpoint the exact failure and keep the work open. A repair subphase such as `PHASE-3R` may be inserted; it remains part of PHASE-3 and does not redefine the canonical four-phase workflow.

#### PHASE-4 ACCEPT_AND_CLOSE

Purpose: perform any remaining user/device acceptance, remove temporary diagnostics, and close durable coordination state.

Normal behavior:

- perform only acceptance that cannot be proven by PHASE-3 automation;
- remove temporary smoke/diagnostic code through a reviewed cleanup PR when such artifacts exist;
- require fresh exact-main audit/attestation after cleanup when applicable;
- write the final canonical checkpoint/audit event;
- schema-validate state, commit it, raw-read it back, and verify the commit SHA;
- end with no unpersisted durable state.

Normal exit condition:

```text
continuity.state=clean
active_work_id=null
protected_runtime_mutation=0
next work/stage unchanged unless separately and explicitly authorized
```

#### Cross-Chat handoff payload

This payload is required only when the work actually crosses a Chat boundary. It is not required between phases that continue in the same Chat.

When applicable, persist or explicitly hand off:

```text
WORK_ID
CURRENT_PHASE
PURPOSE
APP_MAIN_SHA
STATE_MAIN_SHA
BRANCH
PR
PR_HEAD_SHA
CHANGED_FILES
CI_RUN_IDS_AND_RESULTS
APPS_SCRIPT_SYNC_RUN_ID_AND_RESULT
SOURCE_ATTESTATION
LIVE_SMOKE_RESULT
DEVICE_ACCEPTANCE_STATUS
UNFINISHED_ITEMS
NEXT_SINGLE_ACTION
PROHIBITIONS
UNRELATED_READY_WORK_STATUS
HANDOFF_REASON
```

Unknown or inapplicable values must be marked explicitly; they must not be guessed.

#### Valid cross-Chat boundaries

If a handoff is necessary, use a durable, independently re-readable checkpoint. Preferred handoff points are:

- PHASE-1 design/contract fixed;
- PHASE-2 PR green with exact head SHA;
- PHASE-3 merge plus exact-main post-merge verification complete;
- PHASE-4 acceptance/cleanup/state close complete.

Do not split an indivisible verification transaction across Chats. In particular, keep each of the following in one Chat transaction:

- canonical state edit -> schema validation -> commit -> raw readback -> commit-SHA verification;
- PR merge -> exact merge SHA capture;
- Apps Script push -> source attestation;
- live smoke -> exact result/log interpretation;
- temporary diagnostic execution -> diagnosis of that result.

When work resumes in a new Chat, fresh-read the authorities required by the current phase. Prior Chat summaries are handoff aids, never substitutes for canonical readback.

#### Compatibility for in-flight work

Historical or already-active coordination records may contain `CHAT-1`, `CHAT-2`, `CHAT-3`, or `CHAT-4` labels created under `H3_CODE_CHANGE_4CHAT_HANDOFF_V1`. Treat those labels as compatibility aliases for `PHASE-1` through `PHASE-4`; they do **not** require separate Chat conversations. Do not rewrite historical audit events solely to rename them.

### 2.2 Operations active manifest

```text
ACTIVE_CODE_CHANGE_WORKFLOW_CONTRACT=H3_CODE_CHANGE_4PHASE_WORKFLOW_V1
ACTIVE_CODE_CHANGE_WORKFLOW_CONTRACT_PATH=OPERATIONS.md
CODE_CHANGE_DEFAULT_CHAT_POLICY=ONE_CHAT_CLOSE
CODE_CHANGE_PHASE_COUNT=4
CROSS_CHAT_HANDOFF=EXCEPTION_ONLY
LEGACY_CODE_CHANGE_CONTRACT=H3_CODE_CHANGE_4CHAT_HANDOFF_V1
LEGACY_CODE_CHANGE_CONTRACT_STATUS=SUPERSEDED_COMPATIBILITY_ONLY
ACTIVE_REPO_ACCESS_FASTPATH_CONTRACT=H3_REPO_ACCESS_FASTPATH_V1
REPOSITORY_AUDIT_IMPACT_HELPER=.github/scripts/repository_audit_impact.py
```

### 2.3 Repository access fast path

Contract: `H3_REPO_ACCESS_FASTPATH_V1`.

The objective is to minimize repository/connector round trips without weakening exact-SHA, CI, source-attestation, smoke, or canonical-state guarantees.

#### Initial authority read

For a repo-dependent operation, read independent authorities in one parallel tool turn whenever available:

```text
application main HEAD
+ state main HEAD
+ current.json
+ current.schema.json
+ only the known canonical files needed by the current phase
```

Do not list or search a repository merely to rediscover a known canonical path. Prefer exact-path fetches when the path is known. Repository/code search is for unknown locations, not a prerequisite to known-file access.

#### Immutable-SHA reuse

Within one phase, an exact immutable commit SHA and file blob read from that SHA may be reused until a mutation/merge boundary that can invalidate it. Do not repeatedly re-fetch the same immutable file or schema merely for reconfirmation.

Fresh-read mutable authority when required by a decision boundary, including:

- before creating a branch from `main`;
- before merge, to verify PR head/mergeability and current `main`;
- after merge, to capture the exact new `main` SHA;
- before a state write, to verify current state-main/current preconditions;
- when resuming in another Chat or after an external dependency may have changed.

#### Workflow aggregation

After a merge, query workflow runs by the exact `head_sha` as one aggregate read per polling cycle. Evaluate all same-SHA audit conclusions from that aggregate result.

Do not poll each successful workflow run individually. Fetch a job or job log only when:

- a workflow failed or is unexpectedly skipped/cancelled;
- exact evidence not present in the aggregate run metadata is required, such as Apps Script source digest/source-attestation/live-smoke output;
- a recovery/diagnostic operation explicitly requires step-level evidence.

The Apps Script `workflow_run` may appear after Repository audit completion; poll for that dependent run as one aggregate query rather than opening unrelated completed runs.

#### Repository audit impact selection

`.github/workflows/repository-audit.yml` computes the changed-file set once near the start of the job.

Normal pull-request/push audits short-circuit a feature audit body before heavy work when none of the tracked files explicitly consumed by that audit changed. The GitHub step may still appear as successful in the run UI. The audit workflow itself is fail-safe:

- a change to `.github/workflows/repository-audit.yml` forces `full=true` and runs the complete audit suite;
- `workflow_dispatch` runs the complete audit suite;
- inability to determine the changed-file set runs the complete audit suite;
- tracked-file allowlist and credential/secret protections remain unconditional;
- impact selection controls execution cost only; it must never change the semantics of an audit that does run.

#### State transaction fast path

A canonical state transaction reads state-main, `current.json`, `current.schema.json`, and required audit material in one parallel turn. If the schema blob is unchanged during that same indivisible state transaction, reuse it for validation.

After commit, read back `current.json`, audit tail, state-main SHA, and commit identity in one parallel turn.

PHASE-4 must write the already verified exact application-main/audit/Apps-Script evidence into `current.json.application_repository` before closing the work. Do not intentionally defer this synchronization to a later reconciliation task.

#### Fast-path prohibitions

Speed optimization must not:

- replace an exact immutable SHA with a moving branch ref where exact identity is required;
- skip a required fresh read across a mutation/merge boundary;
- infer a workflow result that has not completed;
- suppress failure logs needed for diagnosis;
- relax Repository audit, Apps Script source-attestation, automatic live-smoke, or protected-runtime checks;
- use cached Chat context as canonical authority.

## 3. Repository and Apps Script synchronization

Normal direction is GitHub -> local -> Apps Script.

Before local synchronization, require a clean worktree. Use `git fetch` and `git pull --ff-only`; stop on divergence. Do not use `git reset --hard`, `git clean -fd`, or `clasp pull` as routine synchronization tools.

Every credentialed clasp operation in GitHub Actions must be bound to the exact current `main` commit and to a successful Repository audit `push` run for that same SHA before `CLASPRC_JSON` is materialized. A manual workflow dispatch must resolve to the exact current `main` SHA and independently verify a successful same-SHA Repository audit before credential use; a branch SHA, moving `main` ref, or merely related main-line commit is insufficient.

`.github/workflows/apps-script-auto-sync.yml` may synchronize an audited exact-`main` commit to Apps Script HEAD when Apps Script-impacting files change. It must verify the canonical `.clasp.json` target before `clasp push`. After a push, it must perform an authenticated source-attestation readback and fail closed unless the Apps Script HEAD file set and normalized source content match that exact audited GitHub commit. A change to the synchronization workflow itself may run the same readback without pushing, so the credential and attestation boundary can be verified without mutating Apps Script HEAD. `CLASPRC_JSON` exists only as a GitHub Actions secret and must never be printed or committed.

For source attestation only, `clasp pull` is permitted in an isolated temporary directory that contains the verified canonical `.clasp.json`. The pulled files are comparison evidence only: never pull into the tracked worktree, never treat the readback as a replacement source, never commit pulled output, and always discard the temporary directory after comparison. This exception does not authorize reverse synchronization. Recovery-oriented reverse synchronization remains separately authorized work and must return through a reviewed branch and pull request.

This workflow changes neither versioned `/exec` deployments, Drive assets, Azure configuration, nor learner state. The sole standing exceptions are the exact-main observability source binding in the allowlisted `H3_OBSERVABILITY_SOURCE_*` Script Properties and initialization/maintenance of the dedicated `web_runtime_error_log_v1` observability sheet. These are non-authoritative observability metadata and must never be used as learner score, history, queue, scheduler, pointer, or counter authority. Deployment promotion remains a separate, explicitly authorized operation.

### Exact-main observability source binding

After authenticated Apps Script HEAD source attestation succeeds for the exact current audited `main` SHA, `.github/workflows/apps-script-auto-sync.yml` may execute exactly one permanent credentialed binding call: `h3ObservabilityBindSource`. The call must be gated by `steps.source_binding_boundary.outputs.ready == 'true'`, must occur after source attestation and before the automatic smoke boundary, and may write only the following Script Properties:

- `H3_OBSERVABILITY_SOURCE_SCHEMA`
- `H3_OBSERVABILITY_SOURCE_SHA`
- `H3_OBSERVABILITY_SOURCE_DIGEST`
- `H3_OBSERVABILITY_SOURCE_FILE_COUNT`
- `H3_OBSERVABILITY_SOURCE_BOUND_AT`

The binding request must contain the exact immutable GitHub `main` SHA, the authenticated aggregate Apps Script source digest, and the attested Apps Script file count from the same job. The Apps Script function validates those shapes, writes the observability-only properties under ScriptLock, and returns exact readback; the workflow must fail on any mismatch. `appsscript.json` must retain both `executionApi.access=MYSELF` and `webapp.access=MYSELF`. No browser request value, learner payload, moving branch ref, or unaudited SHA may become `SOURCE_SHA` authority.

### Structured Web runtime error log

The runtime error contract is `H3_WEB_RUNTIME_ERROR_V1`, stored append-only in the dedicated `web_runtime_error_log_v1` sheet. Server learner RPC exceptions and browser `error` / `unhandledrejection` events record only whitelisted routing/context fields, sanitized message/stack, error fingerprint, and the current exact-main observability source binding. Raw request serialization, answers, answer keys, problem text, credentials, cookies, headers, or full query URLs are prohibited.

Retention is 90 days with a hard cap of 5000 events. The existing production monitoring cadence performs at most one prune per 24 hours; prune failure must not interrupt the monitoring observer. Error logging itself is best-effort: logging failure must never replace the original learner-facing exception. The learner-facing diagnostic handle is `H3ERR-...`; stack details remain in the observability log/console rather than the UI.

### Automatic live smoke

Normal audited `main` changes may run a permanent impact-selected read-only live smoke without `workflow_dispatch`. The permanent contract is `H3_AUTOMATIC_LIVE_SMOKE_REQUEST_V1` -> `H3_AUTOMATIC_LIVE_SMOKE_RESULT_V1`.

The verified automatic path is:

```text
GitHub exact current main SHA
-> Repository audit push PASS for the same exact SHA
-> automatic workflow_run in apps-script-auto-sync.yml
-> exact .clasp.json target verification
-> GitHub -> Apps Script HEAD sync when Apps Script source changed
-> authenticated source_attestation for that exact SHA
-> exact-main observability source binding/readback
-> impact-selected smoke plan
-> automatic_smoke_boundary ready=true
-> if: steps.automatic_smoke_boundary.outputs.ready == 'true'
-> clasp run-function h3AutomaticLiveSmoke --json
-> exact returned-suite/schema/no-write validation
```

The automatic surface accepts only fixed allowlisted suites and never an arbitrary function name or request route:

- `REVIEW_5W` — runs the persistent Written Review path for immutable historical set `H3-20260914-03` and requires `5W #6`, five sections, `read_only=true`, and the persistent Written Review schema.
- `SYSTEM_TEST_RENDER` — runs the frozen allowlisted SYSTEM_TEST render path and requires `H3_WEB_SET_V1`, `mode=SYSTEM_TEST`, five questions, and `nonlearning=true`.

Shared Web entrypoint/client/observability changes select both suites. Review/Written changes select `REVIEW_5W`. Other `WebApp*.js`, Index/Stylesheet, fixture/render, or manifest changes select `SYSTEM_TEST_RENDER`. Backend-only source changes do not run an unrelated Web smoke.

The automatic smoke source must contain no Sheet/Script-Property/Drive/mail/network/trigger mutation primitive and returns `write_performed=false`. Repository audit must enforce exactly one permanent automatic `clasp run-function h3AutomaticLiveSmoke` command, positioned after the automatic boundary and before the manual smoke boundary. Automatic smoke is allowed only on the successful exact-SHA Repository audit `workflow_run` path after immediate source attestation and source binding.

### Ad hoc manual read-only Apps Script live smoke

For an explicitly authorized one-off read-only smoke of a function already present in Apps Script HEAD, the verified path is:

```text
GitHub exact current main SHA
-> Repository audit push PASS for the same exact SHA
-> manual workflow_dispatch with intended_smoke_sha=<that exact immutable SHA>
-> run_attempt=1
-> existing allowlisted GitHub Actions workflow
-> existing CLASPRC_JSON
-> verify exact .clasp.json scriptId
-> authenticated source_attestation of Apps Script HEAD against that exact SHA in the same job
-> smoke_boundary ready=true
-> immediately clasp run-function <function> --json in that same job
-> validate returned read-only contract
-> fresh protected-runtime readback
-> remove any temporary CI job
-> cleanup PR + main audit PASS
```

Use the existing clasp credential unchanged unless a separate authentication change is explicitly required. Materialize it only inside the GitHub Actions job as `~/.clasprc.json` with restrictive permissions; never print or commit it. For a HEAD smoke, `clasp run-function` is used in its default development mode; do not add `--nondev` unless a versioned API-executable run is the explicit target. A temporary credentialed smoke is manual-dispatch only: it must supply an immutable full `intended_smoke_sha`, must run only on `github.run_attempt == 1`, and must not be attached to the automatic `workflow_run` path. An audit rerun or unrelated merge therefore cannot execute the temporary smoke.


Before creating or tracking any new `.github/workflows/*.yml` file, inspect the repository-audit tracked-file allowlist and existing workflow capabilities. Prefer an existing allowlisted workflow when it can perform the bounded operation. A one-off new workflow file must not be introduced merely as a shortcut; adding a new tracked workflow is itself a repository-policy change and requires intentional allowlist review.

A temporary bounded smoke step may be added only to `.github/workflows/apps-script-auto-sync.yml` and only immediately after its permanent `smoke_boundary` step. It must use `if: steps.smoke_boundary.outputs.ready == 'true'`; the boundary itself requires manual dispatch, the exact intended audited SHA, first run attempt, exact Apps Script target verification, and a successful source attestation. The `clasp run-function` call must follow that attestation/boundary in the same job with no push, sync, deployment, or other mutable Apps Script step between them. If the attestation or boundary is absent, skipped, stale, or failed, the smoke must not run. The step may call only the explicitly authorized read-only function, must validate the expected schema/mode and an explicit no-write result when the function contract provides one, and must not promote a versioned deployment or change OAuth credentials, manifest scopes, Script Properties, learner state, queue state, scheduler state, counters, or pointers.

After the smoke, remove the temporary job through a follow-up PR. Require fresh main-audit success after cleanup. If the smoke reads protected runtime data, compare fresh post-run state with the pre-run baseline and fail closed on any unexpected mutation.

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


### Plain-text Drive raw replacement connector contract

When replacing an existing raw Drive text file through the connected Drive API, preserve the existing Drive file ID and treat the transfer handle as an adapter contract, not as ordinary file content.

- An export/materialization call may return `file_uri` as a structured object containing fields such as `file_id`, `download_url`, MIME type, and file name.
- The Drive `update_file.file_uri` input is a scalar connector file reference. Do not pass the whole `file_uri` object and do not substitute its `download_url`.
- In the verified current connector runtime, if `file_uri.file_id` is returned as `sediment://file_...`, normalize it to the bare `file_...` token before calling `update_file`.
- A type/schema mismatch at this boundary is adapter-shape evidence, not evidence of missing Drive permission. Do not change permissions or infer access failure from that mismatch. Re-read the live connector schema, retry only with the validated scalar reference, or fail closed.
- After replacement, perform a fresh raw readback of the target file and verify the expected content/hash. Any format drift or unresolved adapter mismatch is fail-closed.

This rule applies to canonical/current plain-text maintenance and complements the existing raw-write/readback/hash policy; it does not relax scope, authorization, or stable-file-ID requirements.

## 9. Current production and Review invariants

- Production commit gate is `NORMAL_LIVE_ACTIVE`; no fixed one-set arm remains.
- Preissue is fail-closed for source-lock, recovery, scheduler overload, and audio parity.
- Production transactions are atomic and idempotent, with journal and receipt integrity.
- Persistent Review is reconstructed only from committed, locked, hash-valid sources.
- HOME history reads only derived `review_home_index_v1`; `BASE_PRIORITY` is refreshed after committed answers, HOME computes only elapsed-time pressure, and opening Review performs full source-lock validation.
- `REVIEW_REPLAY` is retired; active providers fail closed on replay requests.
- SYSTEM_TEST remains an explicit allowlisted diagnostic route and must not mutate learner runtime.
- HOME shows only the Review library. Each history card opens Review directly; filtering is `ALL/L/W` with default `ALL`, sorting is `Newest/Priority` with default `Priority`, and priority uses globally normalized `H3_REVIEW_PRIORITY_V3`. History cards omit the textual wrong/uncertainty/priority summary and retain the compact 0–100 priority bar. When all Review questions were displayed and the learner taps `ホーム`, only derived cooldown metadata (`LAST_REVIEWED_AT` and the stable per-session `LAST_REVIEW_COMPLETION_KEY`) is written to the derived HOME index; the HOME priority is then multiplied by a cooldown factor starting at 45% and recovering linearly to 100% over 72 hours. HOME navigation is non-blocking with respect to this write. Same-event retry reuses the completion key and cannot advance the timestamp twice; automatic retry is capped at one and is allowed only for typed transient or transport failure, never validation/integrity failure. This interaction metadata must not mutate learner history, score, retest/scheduler/skill_queue state, counters, or pointers. The segmented control block is sticky. Review shows one question card at a time with compact progress and a full-width `ホーム` control.

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

## 34. Reading P8 activation staging

Reading P8 is isolated from 5W. Its current live preparation identity is owned by `reading_stage_v1`; answer transactions and question-level answer logs are reserved to `reading_web_txn_v1` and `reading_log_v1`.

The first Reading allocation uses the Reading allocator contract, not a 5W/5L suffix convention:

```text
ISSUE_NO=1
STAGE_ID=READ-P8-20260921-001
SET_ID=H3-20260921-R001
```

The SET_ID numeric suffix is a date-local Reading allocation serial and is never ISSUE_NO semantics.

The P8 group 245 stage is permitted to reach `PREISSUE_READY` only with exact stored locked-bundle JSON plus source-binding and locked-bundle hash parity. `PREISSUE_READY` is not `ISSUED` and must not appear as current learning.

`WebAppReadingProduction.js` owns the Reading render/transaction path. Render requires `ISSUED`; the controlled Reading commit gate is enabled. After an authoritative COMMITTED Reading transaction, `WebAppReadingSchedulerProjection.js` idempotently projects the exact Reading log into `rt_evidence_v1`, refreshes the affected `rt_skill_queue_v1` identities, and advances `rt_lane_state_v1.READING_CLOCK` only for the new family clock. A post-commit projection failure is recorded as `POSTCOMMIT_PROJECTION:*` and blocks recurring Reading preparation until a same-transaction recovery succeeds. No 5W Answer Sync or 5W source ratio is reused; the shared 5W-derived R/T opportunity anchor is consumed only by the committed sidecar projection.


## S3-PREP-FINAL

Contract: `H3-FAMILY-SCHEDULER-PREP-FINAL-20260924-V1`

S3 normalizes the existing Family Scheduler preparation surfaces into one
READ_ONLY contract. `BLOCKED` is an orthogonal runtime gate; the three
semantic preparation states are `READY`, `PREPARE_REQUIRED`, and
`AUTHORING_REQUIRED`.

| Family | READY | PREPARE_REQUIRED | AUTHORING_REQUIRED | Source identity / provenance |
| --- | --- | --- | --- | --- |
| L | Next 5L payload is AUDIO_BOUND and unissued. | K1 READY and matching K2-K5 prestage READY exist; final payload is not materialized. | K1 READY or matching K2-K5 prestage is absent. | K1_READY_ID, IMAGE_SHA256, QA_PROFILE/AUDIT_RESULT; PRESTAGE_ID, policy IDs, scheduler snapshot SHA, SOURCE_PROVENANCE_JSON, PRESTAGE_SHA256. |
| W | Canonical stage is fully authored READY_TO_PATCH, unbound and unissued. | No separate W deterministic semantic-preparation state is currently defined. | Canonical stage exists but required semantic question/answer material is absent. | STAGE_ID, APPROVED_SOURCE, POLICY_ID, SOURCE_SNAPSHOT_ID. |
| R | An unissued PREISSUE_READY stage exists and validates. | A due Reading obligation has a valid official source group. | No due source exists, or no valid official group can satisfy the due obligation. | Ready SET_ID/SOURCE_BINDING_SHA256; otherwise skill, section, group, passage source item, source batch, content status. |
| T | An unissued LOCKED Translation V2 stage exists and validates. | Due obligations have valid unused OFFICIAL/AUTHORED_RETEST surfaces. | Required direction pool or required retest surface is missing. | Ready SET_ID/SOURCE_BINDING_SHA256; otherwise profile, skill IDs, item IDs, source kind/reference, source SHA, surface key. |

Public READ_ONLY preview:
`h3FamilySchedulerPrepFinalPreview()`
(`H3_FAMILY_SCHEDULER_PREP_FINAL_V1`).

The S3 surface must not call Reading/Translation materializers, listening
payload preparation, semantic authoring queue upsert/ensure, issue routes,
submit routes, or post-commit scheduler mutation. It reports
`write_performed:false`.

Existing READY material remains authoritative and must not be regenerated.
AUTHORED_RETEST Translation surfaces retain
`NO_OFFICIAL_PROVENANCE_CLAIM`; S3 must not promote them to official source.
S3 must not change learner history, score, Review, 5W/5L/R/T pointers or
counters, Family Scheduler clock, skill_queue/retest state, or existing
ISSUED/COMMITTED rows.

Fresh S3-start acceptance baseline on 2026-09-24:
L=PREPARE_REQUIRED, W=READY, R=PREPARE_REQUIRED, T=PREPARE_REQUIRED.
This baseline is for READ_ONLY verification only and does not authorize
materialization, issue, submit, or semantic generation.

## S4-R4-H production monitoring cutover

Contract: `H3_MONITOR_PRODUCTION_TRIGGER_V1`.

The canonical monitoring path is one Apps Script time-driven installable trigger
calling `h3MonitoringObserverEmailRun` once per hour. The trigger is owned by
the deploying user and is independent of learner issue/submit flows.

Production lifecycle functions:

- `h3MonitoringProductionPreflight()` — READ_ONLY; requires recipient config
  READY, a HEALTHY observer with zero action-required events at cutover, and a
  trigger state of ABSENT or READY.
- `h3MonitoringProductionTriggerStatus()` — READ_ONLY trigger inventory for the
  exact `h3MonitoringObserverEmailRun` handler.
- `h3MonitoringProductionTriggerEnsure()` — creates the hourly trigger only
  from an exact ABSENT state, persists its unique trigger identity and cadence
  metadata in Script Properties, and requires exact READY readback. Re-running
  against the same verified trigger is a no-op.
- `h3MonitoringProductionTriggerRemove()` — recovery-only removal of exactly
  one verified production trigger. Duplicate or identity-mismatched state is
  fail-closed and is never mass-deleted.

Exactly one matching trigger is allowed. More than one matching trigger,
or one trigger whose CLOCK source/identity metadata cannot be verified, is an
ERROR and blocks cutover. The implementation uses
`ScriptApp.newTrigger(...).timeBased().everyHours(1)` and requires the explicit
`script.scriptapp` OAuth scope.

The production trigger may update only monitoring-owned persistence
(`monitor_observer_v1` and, only when an action-required event exists or an
existing notification state resolves, `monitor_notification_v1`). It must not
perform semantic authoring, learner issue/submit, learner-history/score
mutation, pointer/counter changes, Family Scheduler mutation, RS13 closure, or
RS14 activation.

No synthetic action-required event or test email is created during cutover.
The first production verification uses the naturally HEALTHY runtime and must
report zero action-required events and `email_sent=false`. The deduplicated
notification contract from S4-R4-F remains authoritative for future real
action-required transitions.

The legacy ChatGPT Work monitoring tasks remain paused after cutover; they are
not deleted or re-enabled. Their paused state is retained as rollback/audit
evidence while Apps Script observer + HOME + deduplicated email becomes the
canonical monitoring path.
