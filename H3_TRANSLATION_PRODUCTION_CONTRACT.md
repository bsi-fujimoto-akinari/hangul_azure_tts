# H3 Translation Production Route Contract

Version: H3-TRANSLATION-PRODUCTION-20260921-V1
Status: F3C_P11_PILOT_PASS_P12_GATED

## 1. Scope

This contract completes the F3 runtime activation boundary for source-locked P11/P12 Translation: learner rendering, exact question-key submission, Translation-owned transaction persistence, persistent Review, HOME integration, and immediate Review-open validation.

Repository activation does not itself issue a learner set. P11 has completed one controlled real learner pilot and is now closed as PASS. P12 remains the next gated Translation learner pilot.

## 2. Runtime authorities

- `translation_stage_v1`
- `translation_web_txn_v1`
- `translation_log_v1`

These authorities are Translation-only and do not replace 5W Answer Sync, Reading journals, or Review authorities.

## 3. Render route

A Translation render request is:

```text
schema=H3_WEB_RENDER_REQUEST_V1
mode=WRITTEN
surface_family=TRANSLATION
set_id=<exact Translation SET_ID>
```

The route fails closed unless the exact stage is `ISSUED`, has nonblank `ISSUED_AT`, blank `COMMITTED_AT`, exact locked source/hash/direction/type parity, and no committed/PREPARED/RECOVERY_REQUIRED Translation transaction.

A `PREISSUE_READY` stage is intentionally not renderable.

A production payload is derived from the source-locked Translation render payload and changes only transport/runtime metadata:

- `persisted=true`
- `pilot_only=false`
- exact `issue_no`
- exact `stage_id`
- `transport.review=TRANSLATION_PRODUCTION`

## 4. Submit route

Translation submission uses `H3_WEB_SUBMIT_V1` with:

```text
mode=WRITTEN
provider_kind=WRITTEN
surface_family=TRANSLATION
set_id=<exact Translation SET_ID>
answers=[{question_key,answer,uncertain},...]
```

The implementation contains Translation-owned `PREPARED -> translation_log_v1 -> COMMITTED` persistence and the global H3TX allocator. F3 enables the production commit gate:

```text
H3_TRANSLATION_PRODUCTION_COMMIT_ENABLED_=true
```

After transaction COMMITTED, the server must complete this sequence before returning learner success:

```text
Translation persistent Review LOCKED
→ review_home_index_v1 upsert
→ immediate full source-lock Review open validation
→ learner success
```

A same-fingerprint retry of an already committed transaction re-runs the idempotent post-commit Review/HOME sequence, allowing post-commit side effects to heal without downgrading the committed transaction. The committed submit result carries `status=COMMITTED`; for a pre-fix committed row whose immutable `RESULT_JSON` lacks that field, idempotent readback derives the same status from the authoritative transaction journal in memory only and does not rewrite the stored result. Any partial transaction write before COMMITTED is marked `RECOVERY_REQUIRED` and blocks a new attempt for the same SET_ID.

## 5. Direction and answer-type invariants

Every stage, transaction, result, and log entry preserves:

- `translation_direction`
- `answer_type=MULTIPLE_CHOICE`

P11 uses `KR_TO_JP`; P12 uses `JP_TO_KR`.

Direction is never inferred from learner input and cross-section skill reuse is not rewritten.

## 6. Current-learning primitive

`h3TranslationCurrentLearning_(spreadsheet)` resolves at most one ISSUED, uncommitted, source/hash-valid Translation stage.

The F1 Written-provider arbiter includes Translation and fails closed on concurrent Written-family candidates. The common provider arbiter also fails closed on simultaneous provider candidates.

## 7. Isolation

The F3 repository activation does not:

- issue P11 as a side effect of merge/sync;
- materialize P12 before P11 pilot PASS;
- activate P11/P12 scheduler/skill_queue state;
- change 5W, 5L, Reading, or historical Review content;
- introduce free-text/LLM Translation grading.

A PREISSUE_READY P11 remains non-renderable. Only the separately authorized exact live issue write makes the source-locked set renderable.

## 8. P11 pilot close and next gate

P11 controlled learner pilot is closed as PASS with:

- SET_ID `H3-20260921-T001`
- stage status `COMMITTED`
- exactly two Translation log rows
- both learner results recorded as explicit-uncertainty correct (`△`)
- persistent Translation Review and binding `LOCKED`
- HOME history entry present
- learner Review open validated from HOME
- source-binding SHA-256 unchanged
- Reading P8 left `PREISSUE_READY`
- this close state was confirmed by a fresh live authority readback after learner Review-open validation

P11 must not be reissued or replayed as another pilot.

The next Translation gate is:

```text
fresh current/main and live authority readback
→ materialize exact source-bound P12 live stage
→ final P12 preissue gate
→ verify no current-learning conflict
→ P12 PREISSUE_READY -> ISSUED
→ one controlled learner P12 pilot
→ txn/log/Review/HOME/open verification
```

F4, not F3, owns scheduler/skill_queue activation.

## 9. Learner-facing UI handoff

Translation remains the internal `surface_family=TRANSLATION`, but learner-facing Web App labels must use English-family notation such as `Translation` and/or `2T`, not the Japanese label `翻訳`.

For Review presentation, explanatory learning content is visible by default. Collapsible `<details>` treatment is reserved in principle for technical information; the learner-facing explanation block must not be collapsed by default.

## F1 Review bridge status

The shared F1 Review bridge contract
`H3-SURFACE-REVIEW-BRIDGE-20260921-V1` remains authoritative. Translation uses
its dedicated persistent Review authority and HOME/open-routing contract while
preserving exact `translation_direction` and `answer_type`.

F3 activates the Translation learner renderer, exact question-key submit path,
post-commit Review/HOME/open validation sequence, and production commit gate.
The live issue boundary remains separate and fail-closed.
