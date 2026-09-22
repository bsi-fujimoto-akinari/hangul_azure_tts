# H3 RS-13K1 Listening K1 Secondary Evidence Authority Contract

Version: 2026-09-22 V1
Status: integration candidate

## Purpose
Enable prospective secondary evidence for 5L K1 without treating H3-K1-SK001 as a semantic Concept skill. K1 is a format skill (visual/audio proposition match), so skill-level automatic Concept inference is forbidden.

## Authority identity
Sheet: listening_k1_secondary_authority_v1
Sheet ID: 950000713

A K1 authority is valid only when one ACTIVE_PROSPECTIVE row matches the exact future K1 item on:
- K1_READY_ID
- IMAGE_SHA256
- QA_PROFILE.item_id

Required row contract:
- K1_SKILL_ID=H3-K1-SK001
- AUTHORITY_ID=K1A|K1_READY_ID|TARGET_SKILL_ID|CONCEPT_ID
- LINK_ROLE=CONTRIBUTORY
- CONFIDENCE=HIGH
- ANNOTATION_CONTRACT_ID=H3-RS13K1-ITEM-AUTHORITY-20260922-V1
- STATUS=ACTIVE_PROSPECTIVE

Only one ACTIVE_PROSPECTIVE authority may exist per K1_READY_ID.

## Target validation
TARGET_SKILL_ID + CONCEPT_ID must match exactly one active 3級 row in skill_concept_map_v1 with APPLICATION_SKILL, EXACT_* match type, HIGH confidence, DIRECT_REUSE=NO, all transfer flags NO, and SCHEDULER_USE=DIAGNOSTIC_SELECTION_ONLY. Target family must not be LISTENING.

## Future-only boundary
Authority is ignored unless:
- Listening Set No. >= 4
- K1 READY CREATED_AT >= 2026-09-22T11:44:00+09:00

Existing K1 READY rows are never backfilled.

## Preissue behavior
Listening backend preflight validates the authority before source lock / learner issue.
- no authority -> NO_AUTHORITY and normal K1 flow
- valid authority -> PASS_AUTHORITY
- malformed/mismatched authority -> hard fail before learner issue

The sidecar does not mutate K1 image, choices, answer key, TTS script, K1 READY identity, payload hash, audio hash, or SOURCE_PROVENANCE_JSON.

## Answer capture
After a valid learner transaction commits, K1 participates in RS-12 multi-skill capture and RS-13 shadow observation using the same no-state-transfer contract as K2-K5.

## Immutable boundaries
- no historical K1 secondary backfill
- no skill-level K1 Concept inference
- no scheduler forcing
- no learner history/score/Review/pointer/clock rewrite
- no existing K1 READY/payload/log rewrite
- RS-13 remains open until genuine real secondary evidence is observed
- RS14 live remains inactive
