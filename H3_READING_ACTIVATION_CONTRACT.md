# H3 Reading Activation Core Contract

Version: H3-READING-ACTIVATION-CORE-20260921-V3
Status: SECTION_AWARE_PREISSUE_CAPABLE_ROUTE_INACTIVE

## 1. Scope

This contract generalizes the Reading activation core from the existing P8 pilot to the complete 3級 Reading family:

```text
section_key = H3-P8 | H3-P9 | H3-P10
provider_kind = WRITTEN
surface_family = READING
level = 3級
```

It defines section-aware runtime identity, stage identity, transaction shape, preissue validation, committed-result projection, and current-learning candidate rules.

This contract permits bounded Reading-only stage materialization through `PREISSUE_READY`. It does not itself issue a learner set, enable Client submission, integrate Review/HOME, or activate scheduler/queue state.

The already materialized P8 stage remains the only live Reading stage:

```text
ISSUE_NO=1
STAGE_ID=READ-P8-20260921-001
SET_ID=H3-20260921-R001
STATUS=PREISSUE_READY
```

## 2. Reading source compatibility

A locked source bundle must satisfy the common Reading source-lock contract and must use one of:

- `H3-P8`
- `H3-P9`
- `H3-P10`

The section in every question must match the locked bundle section. Skill IDs may be reused across Reading sections when canonical taxonomy maps them that way.

P8 source and locked hashes remain immutable compatibility sentinels:

```text
P8 source_binding_sha256
= a8c3a7c038fa251e195463a13157fb3683882ddef30d677d9962c58ff120761e

P8 locked_bundle_sha256
= df49acc7d2495bdbf786020e0e462786d42fc8aa30deba30d73d30b0c6a03f08
```

## 3. Identity scope and allocation

Reading owns one ISSUE_NO sequence and one SET_ID allocation namespace across P8/P9/P10.

```text
ISSUE_NO = ordinal within surface_family=READING

SET_ID
= H3-YYYYMMDD-RNNN

STAGE_ID
= READ-P{8|9|10}-YYYYMMDD-NNN
```

Rules:

- `YYYYMMDD` is the Asia/Tokyo allocation date.
- `NNN` is the next unused Reading allocation serial for that date across all Reading sections.
- SET_ID serial is shared across P8/P9/P10; it is not section-local.
- STAGE_ID section must match the locked source section.
- STAGE_ID date and serial must exactly match SET_ID date and serial.
- ISSUE_NO is `max(existing Reading ISSUE_NO)+1`.
- allocation fails closed on malformed, duplicate, or stage/set-parity-invalid historical identities.
- before allocation, coordination reports `SET_ID=PENDING_ALLOCATION`; callers must not predict an ID.

The legacy helper `h3ReadingAllocateIdentityFromStageRows_(datePart, rows)` remains as a P8 compatibility wrapper.

The general helper is:

```text
h3ReadingAllocateIdentityForSection_(
  sectionKey,
  datePart,
  rows
)
```

## 4. Physical authorities

Reading runtime authorities remain:

- `reading_stage_v1`
- `reading_web_txn_v1`
- `reading_log_v1`

The global H3TX allocator includes `reading_web_txn_v1`.

The stage table is section-neutral. SECTION_KEY distinguishes P8/P9/P10.

## 5. Stage contract

A Reading stage binds one locked Reading bundle to:

- ISSUE_NO
- STAGE_ID
- SET_ID
- STATUS
- LEVEL
- SECTION_KEY
- ITEM_COUNT
- SOURCE_BINDING_SHA256
- LOCKED_BUNDLE_SHA256
- LOCKED_BUNDLE_JSON
- CREATED_AT
- LOCKED_AT
- ISSUED_AT
- COMMITTED_AT

Stage status begins as `LOCKED`. Preissue projects `PREISSUE_READY` only when exact source/hash/identity parity passes.

Stored `LOCKED_BUNDLE_JSON` must canonicalize to the fresh locked bundle and hash to `LOCKED_BUNDLE_SHA256`.

## 6. Materialization contracts

P8 compatibility materialization remains:

```text
h3ReadingBuildMaterializationPlan_(
  datePart,
  existingStages,
  locked,
  timestamp
)
```

It is a wrapper for `H3-P8`.

Section-aware materialization is:

```text
h3ReadingBuildSectionMaterializationPlan_(
  sectionKey,
  datePart,
  existingStages,
  locked,
  timestamp
)
```

The requested section must exactly equal `locked.section_key`.

The section-aware plan returns schema:

```text
H3_READING_SECTION_MATERIALIZATION_PLAN_V1
```

No P9/P10 live materialization is authorized solely by this contract.

## 7. Submission contract

Reading learner submission remains:

```text
schema=H3_WEB_SUBMIT_V1
mode=WRITTEN
provider_kind=WRITTEN
surface_family=READING
set_id=<exact Reading SET_ID>
answers=[
  {question_key, answer, uncertain},
  ...
]
```

Question identity is always `question_key`; repeated section names are never browser answer-state keys.

## 8. Transaction contract

`reading_web_txn_v1` remains the Reading-owned journal and uses the global H3TX namespace.

Transaction fingerprint covers:

- provider/mode/surface
- exact SET_ID
- ordered question_key
- answer position
- explicit uncertainty

The source binding is the locked Reading bundle source-binding hash.

Production commit is separately gated by `H3_READING_PRODUCTION_COMMIT_ENABLED_`.

## 9. Preissue gate

Preissue fails closed unless:

- stage schema/identity are valid;
- section is P8/P9/P10;
- STAGE_ID section matches SECTION_KEY;
- STAGE_ID date+serial match SET_ID date+serial;
- locked bundle schema/provider/surface/level/section agree;
- item_count agrees;
- source-binding hash agrees;
- locked-bundle hash agrees;
- stored locked JSON canonicalizes to the exact locked bundle;
- SET_ID is explicit;
- no committed Reading transaction already binds the set;
- stage has not already been issued or committed.

## 10. Result and retest projection

Exact grading delegates to `h3ReadingGrade_`.

Retest evidence remains question-level:

- item_id
- question_key
- skill_id
- result
- passage_id
- passage_sha256

The shared passage remains provenance/context and is not itself a mastery key.

## 11. Current-learning boundary

`h3ReadingCurrentLearning_` may resolve exactly one ISSUED, uncommitted, source-valid Reading stage. This contract does not merge Reading into parameterless HOME resolution.

## 12. Explicit non-goals

This phase does not:

- create P9/P10 live stage rows;
- allocate live P9/P10 SET_IDs;
- issue P8, P9, or P10;
- enable Reading Client submission;
- enable Reading production commit;
- integrate Reading Review/HOME;
- activate P8/P9/P10 skill_queue rows;
- modify 5W transaction, Answer Sync, source ratio, scheduler, history, pointer, or Review content;
- modify Translation or 準2級.

## 13. Next activation boundary

The next learner-facing Reading step remains serialized with Review/HOME work:

```text
Reading Review/HOME persistence contract
→ current-learning arbitration including READING
→ enable Reading Client submit + production commit
→ exact issue transition
→ one P8 pilot issue
→ committed transaction/log verification
```

Until that shared boundary is available, P9/P10 may continue only as source-locked repository pilots and pure section-aware materialization tests.
