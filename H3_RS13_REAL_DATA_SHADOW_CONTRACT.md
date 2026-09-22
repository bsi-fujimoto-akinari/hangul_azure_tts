# H3 RS-13 Real-Data Shadow Observation Contract

Version: 2026-09-22 V1  
Status: IMPLEMENTED_AWAIT_REAL_DATA

## Purpose

Observe prospective real COMMITTED secondary evidence produced by RS-12
without allowing the observation layer to change learner state or scheduler
selection.

RS-13 is an observation layer. RS-14 scheduler shadow comparison remains a
separate later gate.

## Source scope

Only `multi_skill_evidence_v1` rows satisfying all of the following are
observable:

- `EVENT_SCOPE=COMMITTED_LEARNING`
- `LINK_ROLE=CONTRIBUTORY` or `INCIDENTAL`
- `STATUS=ACTIVE_COMMITTED`
- `PROVENANCE_KIND=AUTHOR_VERIFIED_EXACT`
- `DIRECT_STATE_AUTHORITY=NO`
- `STATE_TRANSFER=NO`
- `RETEST_CLOSURE_TRANSFER=NO`
- `STABILITY_TRANSFER=NO`
- `SCHEDULER_USE=DIAGNOSTIC_ONLY`
- exact active HIGH-confidence Concept mapping exists
- source family differs from target family

SYSTEM_TEST_SHADOW and DIRECT evidence are ignored.

## Shadow sidecar

Sheet: `multi_skill_shadow_observation_v1`  
Sheet ID: `950000712`

Each row records:

- exact evidence and Concept identities
- source and target family
- CONTRIBUTORY / INCIDENTAL role
- learner result ○ / △ / ×
- RS-10 soft-signal class
- safety flags
- `SCHEDULER_APPLIED=FALSE`
- `SHADOW_ONLY=TRUE`

Observation identity:

`OBSERVATION_ID = MSO|LINK_ID`

Exact duplicate is NO_OP. Same observation ID with different content is
HARD_STOP.

## Capture hook

RS-12 capture invokes RS-13 only after the secondary evidence write/readback
has completed.

RS-13 is fail-soft relative to the authoritative learner transaction and the
RS-12 evidence row:

- observation PASS -> diagnostic row persisted
- observation duplicate -> NO_OP
- observation failure -> `shadow_observation_sync=RECOVERY_REQUIRED`
- learner transaction is not rolled back
- RS-12 secondary evidence row is not rolled back

A separate `h3MultiSkillShadowReconcile_` can reconstruct missing shadow
observations from valid RS-12 evidence rows. This is observation
reconciliation, not historical evidence backfill.

## Metrics

Derived metrics may count:

- distinct evidence events
- source-family distribution
- target-family distribution
- role distribution
- result distribution
- Concept distribution
- unexpected scheduler-applied rows
- unsafe rows

No aggregate mastery or Concept state is persisted.

## Immutable boundaries

RS-13 never changes:

- scheduler candidate ordering
- DIRECT evidence authority
- mastery / retest closure / stability
- learner history
- score
- Review
- 5W / 5L pointers
- R/T clocks
- existing committed Reading / Translation history
- historical secondary evidence

## Close gate

RS-13 does not auto-close from code deployment alone.

`STATUS=IMPLEMENTED_AWAIT_REAL_DATA` remains until at least one genuine
prospective COMMITTED secondary observation exists and a later explicit
review confirms the observation path and distribution are acceptable.

RS-14 must not be treated as active merely because RS-13 code is deployed.
