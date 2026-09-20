# H3 Reading Activation Core Contract

Version: H3-READING-ACTIVATION-CORE-20260920-V1
Status: STAGED_NOT_ROUTE_ACTIVE

## 1. Scope

This contract advances the staged P8 Reading pilot from a pure source/render prototype to a production-compatible activation core without issuing a learner set.

It defines Reading-owned runtime identity, stage identity, transaction shape, submission normalization, preissue validation, committed-result projection, and current-learning candidate rules.

This phase does not create or mutate any live Sheet, issue any learner set, register any Web route, write learner answers/history, expose Reading through HOME, or persist Reading Review.

## 2. Provider and surface identity

```text
provider_kind=WRITTEN
surface_family=READING
level=3級
section_key=H3-P8
```

Reading remains a Written-provider surface but is not the 5W surface. It never inherits the D2-D6 fixed cardinality or the 5W 11/6/2/1 source-ratio policy.

## 3. Identity scope

Reading owns its own issue sequence.

```text
ISSUE_NO = ordinal within surface_family=READING
STAGE_ID = Reading preparation identity
SET_ID   = allocated learner-set identity after stage lock
```

Historical 5W and 5L ISSUE_NO values remain unchanged.

The activation core accepts only explicit IDs. It never predicts the next live SET_ID.

## 4. Future physical authorities

The activation core reserves the following authorities for a later bounded live-schema phase:

- `reading_stage_v1`
- `reading_web_txn_v1`
- `reading_log_v1`

The global H3TX allocator includes `reading_web_txn_v1` in its namespace scan. Missing physical sheet is valid before activation and contributes zero rows.

No physical sheet is created in this phase.

## 5. Stage contract

A Reading stage binds exactly one locked Reading bundle to:

- ISSUE_NO
- STAGE_ID
- SET_ID
- level
- section_key
- item_count
- source_binding_sha256
- locked_bundle_sha256

Staged status is `LOCKED`. A preissue validator may project `PREISSUE_READY` only when the exact locked bundle, stage identity, source binding, cardinality, and transaction state all agree.

The P8 pilot has item_count=2 and one shared passage.

## 6. Submission contract

Reading learner submission uses the common envelope:

```text
schema=H3_WEB_SUBMIT_V1
mode=WRITTEN
provider_kind=WRITTEN
surface_family=READING
set_id=<exact set>
answers=[
  {question_key, answer, uncertain},
  ...
]
```

Question order is not inferred from repeated section=P8 values. Exact `question_key` is mandatory.

## 7. Transaction contract

The future `reading_web_txn_v1` journal is Reading-owned and uses the global H3TX namespace.

Transaction fingerprint covers:

- mode/provider/surface
- exact SET_ID
- ordered question_key
- answer position
- explicit uncertainty

The source binding is the exact locked Reading bundle source-binding hash.

This phase constructs and validates the transaction plan only. It does not append a journal row.

## 8. Preissue gate

Reading preissue fails closed unless all of the following hold:

- stage schema/status/identity valid;
- locked bundle schema is `H3_READING_LOCKED_BUNDLE_V1`;
- provider/surface/level/section match;
- stage item_count equals locked item count;
- stage source-binding hash equals locked source-binding hash;
- stage locked-bundle hash equals a fresh canonical hash of the locked bundle;
- SET_ID is explicit and nonblank;
- no committed Reading transaction is already bound to the exact SET_ID.

The gate does not mutate any source.

## 9. Result and retest projection

The activation core delegates exact grading to `h3ReadingGrade_`.

A committed-result projection uses:

- `H3_WEB_SUBMIT_RESULT_V1`
- mode=WRITTEN
- provider_kind=WRITTEN
- surface_family=READING
- exact SET_ID / STAGE_ID / TXN_ID
- score/total
- per-question question_key/item_id/skill/result/uncertainty
- source_binding_sha256
- common four-line H3 Web receipt

Retest evidence remains question-level. The shared passage is provenance only and never a mastery key.

## 10. Current-learning candidate boundary

The pure candidate builder accepts only a stage that is:

- `ISSUED`;
- bound to an explicit SET_ID;
- uncommitted;
- source/hash-valid against the locked bundle.

It returns a provider-neutral current-learning candidate but does not register it in HOME or provider routing.

## 11. Explicit non-goals

This phase does not:

- create `reading_stage_v1`, `reading_web_txn_v1`, or `reading_log_v1`;
- activate a Reading GET/submit route;
- modify `WebApp.js` dispatch;
- modify HOME or Review provider persistence;
- modify 5W transaction, Answer Sync, queue, scheduler, or ratio policy;
- activate P8 skills in `skill_queue_v1`;
- modify P9/P10;
- modify Translation or 準2級;
- issue or score any learner attempt.

## 12. Next activation phase

After this core is merged and audited, the next bounded phase is:

```text
live schema creation
→ exact P8 stage materialization
→ preissue readback
→ Reading route wiring
→ one pilot issue
→ transaction/log persistence
→ Review/HOME integration
```

Review/HOME integration remains serialized against any concurrent historical 5W Review write work.
