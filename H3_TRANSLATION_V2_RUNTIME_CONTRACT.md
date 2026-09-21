# H3 Translation V2 Mixed Runtime Contract

Version: 2026-09-22 V1
Status: RS-06 remediation / server-side core only / live routing disabled

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
This contract does not route learner traffic.
WebApp.js, Client.html, Review persistence, and live issue remain V1 until RS-07 activation.
