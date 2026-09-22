# H3 RS-12 Prospective Secondary Evidence Capture Contract

Version: 2026-09-22 V1  
Status: RS-12 integration candidate

## Purpose

Capture secondary evidence prospectively from future committed learning events
without inferring concepts from old questions and without changing formal
mastery state.

RS-12 is a capture layer only. It does not backfill history and does not
promote secondary evidence into DIRECT authority.

## Authoring boundary

A question may optionally contain `secondary_evidence_links`.

Each link must contain exactly the following semantic authorities:

- `link_role`: `CONTRIBUTORY` or `INCIDENTAL`
- `target_skill_id`: existing application skill
- `concept_id`: existing Concept sidecar identity
- `confidence`: `HIGH`
- `annotation_contract_id`: `H3-RS12-AUTHOR-VERIFIED-EXACT-V1`

Absence of `secondary_evidence_links` is a normal NO-OP.

RS-12 performs no text matching, embedding lookup, keyword inference, or
historical semantic reconstruction.

## Semantic preflight

Before learner mutation, an authored link must match an active
`skill_concept_map_v1` row with:

- exact LEVEL + TARGET_SKILL_ID + CONCEPT_ID
- `MAPPING_ROLE=APPLICATION_SKILL`
- `CONFIDENCE=HIGH`
- `DIRECT_REUSE=NO`
- `STATE_TRANSFER=NO`
- `RETEST_CLOSURE=NO`
- `STABILITY_TRANSFER=NO`
- `SCHEDULER_USE=DIAGNOSTIC_SELECTION_ONLY`
- status `ACTIVE_PILOT` or `ACTIVE`

The target family must differ from the source family.
A secondary target may not equal the direct skill.

Invalid authored metadata fails before the learner commit.

## Persisted evidence

After an authoritative learner transaction is COMMITTED, each eligible link
is written to `multi_skill_evidence_v1` as:

- `EVENT_SCOPE=COMMITTED_LEARNING`
- `LINK_ROLE=CONTRIBUTORY|INCIDENTAL`
- `CONFIDENCE=HIGH`
- `PROVENANCE_KIND=AUTHOR_VERIFIED_EXACT`
- `DIRECT_STATE_AUTHORITY=NO`
- `STATE_TRANSFER=NO`
- `RETEST_CLOSURE_TRANSFER=NO`
- `STABILITY_TRANSFER=NO`
- `SCHEDULER_USE=DIAGNOSTIC_ONLY`
- `STATUS=ACTIVE_COMMITTED`

The direct question result (○ / △ / ×) is copied only as diagnostic source
evidence.

## Identity and idempotency

`EVIDENCE_EVENT_ID = MSE|SOURCE_FAMILY|SOURCE_TXN_ID|Qn`

`LINK_ID = MSL|EVIDENCE_EVENT_ID|LINK_ROLE|TARGET_SKILL_ID|CONCEPT_ID`

- exact duplicate LINK_ID + identical row -> NO_OP
- same LINK_ID + different row -> HARD_STOP
- duplicate existing LINK_ID authority -> HARD_STOP

## Supported prospective surfaces

RS-12 hooks the current committed production paths:

- 5W WRITTEN: optional links in each `QUESTION_META_JSON.questions[]`
- 5L LISTENING: optional links in K2-K5 item JSON
- 2R READING: optional links in locked Reading item
- 2T TRANSLATION V2: optional links in locked Translation V2 item

K1 is not annotated by RS-12 because its current source-lock contract is
separate. It remains a normal NO-OP until a later explicitly designed K1
authoring authority exists.

## Failure semantics

Authoring/semantic errors fail precommit.

Postcommit sidecar persistence is attached as
`secondary_evidence_sync`. If an external write fails after the learner
transaction is already committed, the learner commit is not rolled back.
The response reports `RECOVERY_REQUIRED`; idempotent retry paths for 5W/5L
may repair the missing sidecar evidence.

Reading/Translation existing transaction retry semantics are unchanged by
RS-12.

## Immutable boundaries

RS-12 does not change:

- learner history
- score
- existing Review
- 5W/5L pointers
- R/T family clocks
- `rt_evidence_v1`
- `rt_skill_queue_v1`
- `rt_lane_state_v1`
- formal skill state
- mastery / retest closure / stability
- historical committed Reading/Translation history

Historical secondary backfill remains forbidden.
