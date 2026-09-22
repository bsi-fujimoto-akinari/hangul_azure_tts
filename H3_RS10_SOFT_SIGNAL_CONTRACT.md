# H3 RS-10 Scheduler Soft Signal Contract

Version: 2026-09-22 V1  
Status: RS-10 integration candidate

## Purpose

Use multi-skill secondary evidence only as a scheduler tie-break signal.
Formal mastery, retest closure, stability, learner history, scores, Reviews,
family clocks, counters, pointers, DIRECT evidence, and existing committed
Reading/Translation history remain authoritative and unchanged.

## Priority order

1. EDF retest
2. anti-starvation / balance
3. mandatory coverage
4. intrinsic skill priority
5. cross-family soft signal
6. deterministic tie-break

Soft signal can never override items 1-4.

## Eligible evidence

Only rows in `multi_skill_evidence_v1` that satisfy all of the following:

- `EVENT_SCOPE=COMMITTED_LEARNING`
- `LINK_ROLE=CONTRIBUTORY` or `INCIDENTAL`
- `STATUS=ACTIVE_COMMITTED`
- `DIRECT_STATE_AUTHORITY=NO`
- `STATE_TRANSFER=NO`
- `RETEST_CLOSURE_TRANSFER=NO`
- `STABILITY_TRANSFER=NO`
- `SCHEDULER_USE=DIAGNOSTIC_ONLY`
- exact LEVEL + TARGET_SKILL_ID + CONCEPT_ID mapping exists in
  `skill_concept_map_v1`
- concept mapping is `APPLICATION_SKILL`, status `ACTIVE_PILOT` or `ACTIVE`
- concept mapping has `DIRECT_REUSE=NO`, no transfer, and
  `SCHEDULER_USE=DIAGNOSTIC_SELECTION_ONLY`
- SOURCE_FAMILY differs from target FAMILY

`SYSTEM_TEST_SHADOW`, DIRECT links, same-family observations, unmapped
concepts, level mismatches, and unsafe transfer rows are excluded or fail
closed.

## Soft vector

For each candidate, use the latest eligible observation per
LEVEL + TARGET_SKILL_ID + CONCEPT_ID + LINK_ROLE + SOURCE_FAMILY +
DIRECT_SKILL_ID channel.

The vector is lexicographically descending:

1. CONTRIBUTORY × count
2. CONTRIBUTORY △ count
3. INCIDENTAL × count
4. INCIDENTAL △ count

A later ○ in the same channel contributes zero and therefore removes the
earlier non-correct soft boost for that channel. This is scheduler diagnosis
only; it does not close retest, increment spaced-correct count, or establish
stability.

No negative score or mastery credit is created from secondary ○ evidence.

## Translation direction isolation

For TRANSLATION candidates, the exact mapped section controls direction:

- H3-P11 -> KR_TO_JP
- H3-P12 -> JP_TO_KR

A secondary observation for the opposite direction is not eligible.

## Determinism

Candidate comparison is:

`edf_rank -> balance_rank -> coverage_rank -> skill_priority_rank ->
soft_vector -> deterministic_key`

All first four fields are ascending. Soft vector is descending.
`deterministic_key` is the final stable lexical tie-break.

## RS-10 boundary

RS-10 adds the ranking primitive and contract only.

- no historical secondary backfill
- no learner-facing issue
- no stage materialization
- no mutation of existing runtime state
- no persisted Concept aggregate state
- no change to DIRECT evidence authority

RS-11 may dry-run the primitive against candidate fixtures after a fresh
readback and separate acceptance gate.
