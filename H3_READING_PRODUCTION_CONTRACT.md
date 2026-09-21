# H3 Reading Production Route Contract

Version: H3-READING-PRODUCTION-20260921-V1
Status: P8_CONTROLLED_COMMIT_ENABLED_NOT_ISSUED

## Scope

This contract wires the Reading activation core to production render, Reading-owned transaction persistence, persistent Reading Review, and HOME.

F2B enables the controlled Reading submission/commit path, but it does not issue a Reading stage. The live P8 pilot must remain `PREISSUE_READY` until the separate F2C final preissue gate changes only that stage to `ISSUED`.

## Runtime authorities

- `reading_stage_v1`
- `reading_web_txn_v1`
- `reading_log_v1`
- `reading_review_payload_v1`
- `reading_review_binding_v1`
- `review_home_index_v1`

These authorities are Reading-specific except for the shared HOME index. They do not replace 5W queue, Written Answer Sync, Listening authorities, or scheduler state.

## Render route

A Reading render request is:

```text
schema=H3_WEB_RENDER_REQUEST_V1
mode=WRITTEN
surface_family=READING
set_id=<exact Reading SET_ID>
```

The route fails closed unless the exact stage is `ISSUED`, has nonblank `ISSUED_AT`, blank `COMMITTED_AT`, exact locked-bundle/hash parity, and no committed/PREPARED/RECOVERY_REQUIRED Reading transaction.

A `PREISSUE_READY` stage remains intentionally not renderable.

## Submit route

Reading submission uses `H3_WEB_SUBMIT_V1` with:

```text
mode=WRITTEN
provider_kind=WRITTEN
surface_family=READING
set_id=<exact Reading SET_ID>
answers=[{question_key,answer,uncertain}, ...]
```

The controlled production gate is `H3_READING_PRODUCTION_COMMIT_ENABLED_=true`.

The required success sequence is strictly:

```text
Reading transaction COMMITTED
→ persistent Reading Review LOCKED
→ review_home_index_v1 upsert
→ immediate persistent Review open/readback validation
→ learner success response
```

The Review payload remains bound to the exact committed transaction result, source-binding hash, shared passage hash, item hashes, and the F2A P8 explanation contract.

Reading transaction persistence remains PREPARED → exact answer-log rows → stage COMMITTED → transaction COMMITTED. A partial transaction write after PREPARED is marked `RECOVERY_REQUIRED` and fails closed.

Post-commit Review/HOME operations are idempotent and source-validated. A Review reopen mismatch raises `READING_REVIEW_POSTCOMMIT_OPEN_MISMATCH` and no learner success response is returned.

## Client boundary

Client submission is enabled only for `surface_family=READING` among the newly staged written families.

Reading browser answer identity is `question_key`, never the repeated section name. Translation submission remains disabled.

A successful Reading result opens `H3_PERSISTENT_READING_REVIEW_PAYLOAD_V1` only after the server post-commit chain has completed.

## Current learning

The common parameterless current-learning arbitration includes Reading through `h3ReadingCurrentLearning_` and remains fail-closed if more than one learning family is simultaneously current.

Reading itself resolves only one `ISSUED`, uncommitted, source-valid stage and blocks on PREPARED/RECOVERY_REQUIRED Reading transactions.

## Isolation

F2B does not:

- issue P8 or modify its live `PREISSUE_READY` row;
- create or issue P9/P10 live stages;
- activate Reading skill_queue or family scheduler state;
- modify 5W/5L learner history, counters, pointers, scheduler, source ratios, or Review content;
- modify Translation activation, Translation commit gate, P11/P12 live state, or 準2級 runtime.

## Next gate

F2C must perform a fresh final preissue readback immediately before learner issue, verify no concurrent current learning, verify the exact P8 source/locked hashes, and then make the sole intended live activation:

```text
PREISSUE_READY → ISSUED
```

Only one controlled P8 learner attempt is authorized after that transition.
