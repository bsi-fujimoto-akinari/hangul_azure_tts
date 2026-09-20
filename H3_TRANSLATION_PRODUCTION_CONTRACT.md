# H3 Translation Production Route Contract

Version: H3-TRANSLATION-PRODUCTION-20260921-V1
Status: ROUTE_STAGED_COMMIT_DISABLED

## 1. Scope

This contract wires the P11/P12 Translation activation core to production render and Translation-owned transaction persistence without issuing a learner set and without integrating Review/HOME.

The live P11 stage remains `PREISSUE_READY`. No learner-facing Translation issue is authorized by this contract.

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

The implementation contains Translation-owned `PREPARED -> translation_log_v1 -> COMMITTED` persistence and the global H3TX allocator, but production commit remains disabled by:

```text
H3_TRANSLATION_PRODUCTION_COMMIT_ENABLED_=false
```

until learner issue and common Review/HOME integration are complete.

Any partial write after PREPARED is marked `RECOVERY_REQUIRED` and blocks a new attempt for the same SET_ID.

## 5. Direction and answer-type invariants

Every stage, transaction, result, and log entry preserves:

- `translation_direction`
- `answer_type=MULTIPLE_CHOICE`

P11 uses `KR_TO_JP`; P12 uses `JP_TO_KR`.

Direction is never inferred from learner input and cross-section skill reuse is not rewritten.

## 6. Current-learning primitive

`h3TranslationCurrentLearning_(spreadsheet)` resolves at most one ISSUED, uncommitted, source/hash-valid Translation stage.

It is intentionally not integrated into the parameterless HOME/current-learning resolver in this phase.

## 7. Isolation

This phase does not:

- change the live P11 stage from PREISSUE_READY;
- issue P11 or materialize P12;
- enable Translation answer submission in Client;
- integrate Translation into HOME or Review persistence;
- activate P11/P12 scheduler/skill_queue state;
- change 5W, 5L, Reading, or historical Review content;
- introduce free-text/LLM Translation grading.

The explicit server render/submit dispatch may be staged, but the current P11 stage remains non-renderable and the submit mutation path remains disabled.

## 8. Next gate

After merge/audit/sync, learner activation still requires a separate serialized phase:

```text
common Review/HOME integration
→ Client Translation renderer/submit activation
→ final preissue readback
→ P11 PREISSUE_READY -> ISSUED
→ one pilot attempt
```

Review/HOME integration must not race concurrent historical 5W Review writes.
