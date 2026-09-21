# H3 Reading Production Route Contract

Version: H3-READING-PRODUCTION-20260921-V1
Status: ROUTE_STAGED_COMMIT_DISABLED

## Scope

This contract wires the Reading P8 activation core to production render and Reading-owned transaction persistence without issuing a learner set and without integrating Review/HOME.

The active Reading pilot remains `PREISSUE_READY`. No learner-facing Reading issue is authorized by this contract.

## Runtime authorities

- `reading_stage_v1`
- `reading_web_txn_v1`
- `reading_log_v1`

All three authorities are Reading-only. They do not replace 5W queue, Written Answer Sync, or 5W Review authorities.

## Render route

A Reading render request is:

```text
schema=H3_WEB_RENDER_REQUEST_V1
mode=WRITTEN
surface_family=READING
set_id=<exact Reading SET_ID>
```

The route fails closed unless the exact stage is `ISSUED`, has nonblank `ISSUED_AT`, blank `COMMITTED_AT`, exact locked-bundle/hash parity, and no committed/PREPARED/RECOVERY_REQUIRED Reading transaction.

Before issue, a PREISSUE_READY stage is intentionally not renderable.

## Submit route

Reading submission uses the common `H3_WEB_SUBMIT_V1` envelope plus `provider_kind=WRITTEN`, `surface_family=READING`, and exact question_key answers.

The implementation contains Reading-owned PREPARED -> log -> COMMITTED persistence and global H3TX allocation, but production commit remains disabled by `H3_READING_PRODUCTION_COMMIT_ENABLED_=false` until Review/HOME integration and the issue gate are complete.

Any partial write after PREPARED is marked RECOVERY_REQUIRED and blocks new attempts for that SET_ID.

## Current learning

`h3ReadingCurrentLearning_(spreadsheet)` can resolve exactly one ISSUED, uncommitted, hash-valid Reading stage. It is not yet merged into the parameterless HOME resolver in this phase.

## Isolation

This phase does not:

- issue the P8 pilot;
- change `ISSUED_AT`;
- enable Reading answer submission in Client;
- integrate Reading into HOME or Review persistence;
- write Reading transactions or answer logs;
- mutate 5W/5L scheduler/history/pointers;
- touch historical 5W Review payload/binding content.

The explicit Web render route may be staged in server dispatch, but remains unusable for the PREISSUE_READY pilot until a later issue transition.

## F1 Review bridge status

The shared F1 Review bridge contract
`H3-SURFACE-REVIEW-BRIDGE-20260921-V1` is staged. Reading now has a dedicated
persistent Review authority and HOME/open-routing contract, but this production
route still keeps `H3_READING_PRODUCTION_COMMIT_ENABLED_=false`.

Activation remains serialized: finalize Reading explanation content, wire the
post-commit Review/HOME sequence, enable Client submit and the commit gate, then
perform the final P8 preissue readback before issue.
