# H3 RS-13G Read-Only RS-13/14 Gate Reporter Contract

Version: 2026-09-22 V1
Status: integration candidate

## Purpose

Provide one read-only report that answers:

1. how many genuine prospective COMMITTED secondary evidence rows/events exist
2. whether every expected RS-13 shadow observation exists exactly once
3. whether any shadow row is missing, conflicting, or orphaned
4. whether RS-13 is ready for explicit human review
5. how close the frozen RS-14P activation gate is to passing

The reporter does not reconcile data and does not change any runtime state.

## Sources

Read-only inputs:

- `multi_skill_evidence_v1`
- `skill_concept_map_v1`
- `multi_skill_shadow_observation_v1`

The report reuses the canonical RS-13 shadow builder and the frozen RS-14P
activation-gate evaluator.

## Reconciliation

For every current `COMMITTED_LEARNING` secondary evidence row, the reporter
derives the exact expected RS-13 observation row from the current Concept map.

It then compares expected and actual shadow rows by deterministic
`OBSERVATION_ID`.

Reported classes:

- exact match
- missing observation
- conflicting observation
- orphan observation

Any missing/conflict/orphan makes reconciliation non-exact.

The reporter does not call `h3MultiSkillShadowReconcile_` and never appends
shadow rows.

## RS-13 readiness

Reporter states:

- `AWAIT_REAL_DATA`: no genuine COMMITTED secondary evidence
- `RECONCILIATION_REQUIRED`: real evidence exists but shadow is not exact
- `SAFETY_REVIEW_REQUIRED`: exact shadow exists but unsafe/scheduler-applied rows exist
- `EXPLICIT_REVIEW_READY`: genuine evidence exists, shadow is exact, unsafe=0,
  scheduler_applied_true=0

`EXPLICIT_REVIEW_READY` is advisory only.

The reporter never sets `RS13_CLOSED=TRUE`.

## RS-14P activation gate

The reporter calls the frozen RS-14P evaluator without altering its thresholds:

- >= 6 distinct events
- >= 2 Concepts
- >= 2 source families
- >= 1 × or △
- unsafe rows = 0
- scheduler_applied_true = 0

If RS-13 expected-vs-actual reconciliation is not exact, the reporter forces
the advisory gate result to false and adds
`RS13_RECONCILIATION_NOT_EXACT`.

It also returns remaining counts for event, Concept, and source-family
thresholds.

## Live callable

`h3Rs13GateReportLive()`

opens the canonical runtime spreadsheet read-only and returns the report
object. It performs no writes.

## Immutable boundaries

- no scheduler write
- no learner state/history/score/Review write
- no pointer/counter/clock write
- no evidence write
- no shadow reconcile/write
- no status file write
- no automatic RS-13 close
- no automatic RS-14 activation
- no historical backfill
