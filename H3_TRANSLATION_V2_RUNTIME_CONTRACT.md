# H3 Translation V2 Mixed Runtime Contract

Version: 2026-09-26 V2
Status: RS-07 activation candidate / V2 routing integrated / issue remains transaction-gated

## Purpose
Preserve immutable Translation V1 history while adding a parallel V2 contract for future 2T sets.

## Normal profile
MIXED_1_1 = one P11 KR_TO_JP item plus one P12 JP_TO_KR item.

## EDF override
EDF_KR_TO_JP_2 or EDF_JP_TO_KR_2 is valid only with override_reason=DUE_MAX_AVOIDANCE.

## Identity
Translation mastery/retest identity remains LEVEL + TRANSLATION + SKILL_ID + TRANSLATION_DIRECTION.
SECTION_KEY and TRANSLATION_DIRECTION are item-level authorities in V2.

## Retest surface
A strict retest must use the same skill and same direction but a different concrete question surface.
Cross-version uniqueness checks compare both immutable SURFACE_KEY and ITEM_ID/QUESTION_KEY authority so a V1 official item cannot become a false new surface merely because V2 uses a different key representation.
Official items use an OFFICIAL surface key for new V2 records.
Authored retests use an AUTHORED surface key based on an immutable authored-surface hash.
Authored retests must not copy official wording and must not claim official provenance.

## Runtime sheets
translation_authored_surface_v1
translation_stage_v2
translation_web_txn_v2
translation_log_v2

## Activation boundary
RS-07 adds V2-aware WebApp routing, mixed-direction Client validation/rendering,
V2 Review source-lock handling, and V2 transaction persistence.
V1 Translation history remains immutable and is selected whenever SET_ID belongs to V1.
A V2 set becomes learner-visible only after an authoritative translation_stage_v2 row
is written with STATUS=ISSUED and ISSUED_AT populated.
LOCKED/PREISSUE/ISSUED alone never advances Translation family clock or consumes the
5W-derived R/T opportunity. Those scheduler sidecars advance only after COMMITTED.
RS-07 first activation is limited to one audited MIXED_1_1 set; recurring automatic
materialization is outside this initial activation transaction.


## Post-COMMIT projection recovery hardening
A COMMITTED `translation_web_txn_v2` row whose `ERROR` begins with
`POSTCOMMIT_PROJECTION:` is an unresolved scheduler-sidecar recovery obligation.

- Family Scheduler Translation preparation and issue must fail closed while any
  such row exists.
- The authoritative learner result remains COMMITTED; recovery must not rewrite
  the learner answer, score, Translation log, stage identity, or family clock by
  inference.
- Recovery is performed only by replaying the same COMMITTED transaction
  identity and request fingerprint through the idempotent scheduler projection.
- A replay is valid only when the Translation stage and transaction are both
  COMMITTED and retain the same SET_ID authority.
- `POSTCOMMIT_PROJECTION:` is cleared only after the same transaction projects
  successfully. A failed replay retains/replaces the recovery error and remains
  scheduler-blocking.
