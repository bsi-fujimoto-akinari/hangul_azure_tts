# H3 Reading Production Route Contract

Version: H3-READING-PRODUCTION-20260921-V1
Status: F2C_P8_ISSUED_UI_REPAIR_PENDING_LEARNER_COMMIT

## Scope

This contract wires the Reading activation core to production render, Reading-owned transaction persistence, persistent Reading Review, and HOME.

F2B enabled the controlled Reading submission/commit path. F2C has now passed the final preissue gate and changed only the exact live P8 stage to `ISSUED`. The same P8 pilot remains the sole authorized learner attempt until it reaches COMMITTED; it must not be reissued.

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

Post-commit Review/HOME operations are idempotent and source-validated. The committed submit result carries `status=COMMITTED`; for a pre-fix committed row whose immutable `RESULT_JSON` lacks that field, idempotent readback derives the status from the authoritative transaction journal in memory only and does not rewrite the stored result. A Review reopen mismatch raises `READING_REVIEW_POSTCOMMIT_OPEN_MISMATCH` and no learner success response is returned.

## Client boundary

Client submission is enabled only for `surface_family=READING` among the newly staged written families.

Reading browser answer identity is `question_key`, never the repeated section name. Translation is governed separately by the F3 production contract and is not modified by this Reading repair.

A successful Reading result opens `H3_PERSISTENT_READING_REVIEW_PAYLOAD_V1` only after the server post-commit chain has completed.

### Learner UI invariants

For the live 2-question Reading surface:

- HOME family cards use `2R` / `2T`, while learner and Review question titles use the source-bound section display (`筆8/読解`, `筆11/翻訳`, `筆12/翻訳`) in the same style as 5W (`筆2/語彙`, etc.);
- 5L / 5W / 2R / 2T share the same submit interaction: there are no learner Reset / Grade buttons, and submission begins automatically when the choice that completes the final unanswered item is selected;
- this UI repair does not alter the existing P8 issue timestamp, stage status, or learner source binding;
- the shared Reading passage is rendered in a bordered card with the same outer width as the question card;
- raw source passage text and all source/locked hashes remain immutable;
- if the captured source contains orphan footnote markers but no captured footnote body, the learner display may suppress only those orphan markers at render time; an explicit captured footnote body is preserved;
- learner-facing explanation content is visible by default; collapsible `<details>` is reserved in principle for technical information.

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

P8 is already `ISSUED` with the exact source/bundle hashes preserved. After this learner-UI repair is audited and synced:

```text
reload the same current P8 learner surface
→ answer Q1/Q2
→ explicit Grade
→ Reading transaction COMMITTED
→ exactly two reading_log_v1 rows
→ persistent Reading Review/binding LOCKED
→ HOME upsert
→ immediate Review open validation
→ F2C PASS
```

No new P8 issue write is authorized.
