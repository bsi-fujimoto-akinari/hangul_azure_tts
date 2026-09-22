# H3 RS-14P Limited-Live Soft-Signal Preflight Contract

Version: 2026-09-22 V1
Status: PREFLIGHT_ONLY

## Purpose

Freeze and test the future limited-live soft-signal contract before RS-13
produces enough genuine prospective data.

RS-14P is PRELIVE ONLY. It must not alter production scheduler selection.

## Frozen hierarchy

The scheduler ordering remains:

1. EDF retest
2. anti-starvation / balance
3. mandatory coverage
4. intrinsic skill priority
5. CONTRIBUTORY binary soft signal
6. deterministic tiebreak

Soft signal may only break an exact tie across all four primary ranks.

## Live-pilot soft vector

The initial limited-live pilot will ignore INCIDENTAL rows.

Only current RS-10 latest-channel CONTRIBUTORY observations are eligible.

Candidate vector:

- component 1: any current CONTRIBUTORY × exists -> 1 else 0
- component 2: any current CONTRIBUTORY △ exists -> 1 else 0

Each component is binary-capped at 1.

Multiple observations, Concepts, source families, or channels cannot increase a
component above 1.

○ remains no boost. RS-10 latest-channel semantics already allow a later ○ in
the same channel to clear an older × / △ contribution.

Translation direction isolation remains mandatory.

## Activation gate

RS-14 limited live must not activate until RS-13 review confirms all of:

- at least 6 distinct genuine COMMITTED secondary evidence events
- at least 2 distinct Concepts
- at least 2 distinct source families
- at least one × or △ observation
- unsafe shadow rows = 0
- scheduler_applied_true = 0

These thresholds are operational minimums, not statistical sufficiency claims.

## Dual-run

RS-14P computes two orderings from the same candidate set:

- baseline: four primary ranks, then deterministic tiebreak
- pilot: four primary ranks, then binary CONTRIBUTORY vector, then deterministic tiebreak

Any pair of candidates with different primary tuples must keep the same relative
ordering in both outputs.

A primary hierarchy inversion is a hard failure.

## Stop conditions

Future limited-live activation must immediately disable soft-signal use on any
of the following:

- primary hierarchy inversion
- same-family or Translation-direction violation
- transfer flag violation
- Concept mapping mismatch
- duplicate/conflict identity failure
- nondeterministic selection
- unexpected learner history / score / Review / pointer / clock / formal-state mutation

## Rollback

The rollback switch is logical, not destructive.

When `soft_signal_enabled=false`, selection must return the exact baseline
ordering.

RS-14P tests a simulated enable state only when:

- activation_gate_pass=true
- simulation_only=true

Any attempt to use the preflight module as production wiring fails closed.

## Current boundary

- production wiring: NONE
- `RS14_ACTIVE=FALSE`
- RS-13 remains `IMPLEMENTED_AWAIT_REAL_DATA`
- no historical secondary backfill
- no state / retest / stability transfer
- no scheduler forcing
- no learner-facing issue

## RS-14P A-D close criteria

A. contract frozen and CI-readable  
B. CONTRIBUTORY binary cap verified  
C. baseline-vs-soft dual-run verified with no primary inversion  
D. fail-closed activation + rollback-to-baseline verified  

RS-14P A-D may close while RS-13 remains open.
Actual RS-14 live activation remains a later explicit stage.
