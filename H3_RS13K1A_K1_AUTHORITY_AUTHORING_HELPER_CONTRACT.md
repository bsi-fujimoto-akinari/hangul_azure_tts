# H3 RS-13K1A K1 Authority Authoring Helper Contract

Version: 2026-09-22 V1
Status: integration candidate

## Purpose

Provide a safe helper for explicitly authoring future K1 secondary-evidence
authority rows.

This helper does not infer Concepts from K1 content or from H3-K1-SK001.

A caller must explicitly identify the target skill and Concept and affirm that
the relation has been author-verified exact.

## Public helper calls

Preview only:

`h3Rs13K1AuthorityPreview(request)`

Write:

`h3Rs13K1AuthorityAuthor(request)`

## Required request

- `k1_ready_id`
- `listening_set_no`
- `target_skill_id`
- `concept_id`
- `source_ref`
- `author_verified_exact=true`

Optional:

- `notes`

IMAGE_SHA256 and QA_PROFILE.item_id are never accepted from the caller.
They are derived from the canonical K1 READY row.

## K1 eligibility

Authoring is permitted only when the canonical K1 READY row is:

- created at or after the RS-13K1 prospective boundary
- STATUS=READY
- CONSUMED_AT empty
- BOUND_LISTENING_SET_ID empty

Existing consumed or bound K1 items cannot receive authority through this
helper.

The requested Listening Set No. must be >= 4.

## Target validation

The requested TARGET_SKILL_ID + CONCEPT_ID must resolve to exactly one current
3級 Concept mapping satisfying the RS-13K1 contract:

- active
- APPLICATION_SKILL
- EXACT_* match type
- HIGH confidence
- cross-family target (not LISTENING)
- DIRECT_REUSE=NO
- state/retest/stability transfer all NO
- SCHEDULER_USE=DIAGNOSTIC_SELECTION_ONLY

## Deterministic row

The helper derives:

- K1_SKILL_ID=H3-K1-SK001
- IMAGE_SHA256 from K1 READY
- SOURCE_ITEM_ID from QA_PROFILE.item_id
- LINK_ROLE=CONTRIBUTORY
- CONFIDENCE=HIGH
- ANNOTATION_CONTRACT_ID=H3-RS13K1-ITEM-AUTHORITY-20260922-V1
- STATUS=ACTIVE_PROSPECTIVE

AUTHORITY_ID:

`K1A|K1_READY_ID|TARGET_SKILL_ID|CONCEPT_ID`

## Idempotency and conflict

If the same K1 already has the same semantic authority
(identity + source_ref), repeat authoring is NO_OP.

CREATED_AT and NOTES from the original row are preserved.

If the same K1_READY_ID already has a different authority, authoring hard-stops.

AUTHORITY_ID collision on another K1 is also a hard failure.

## Write verification

On APPEND:

1. append exactly one authority row
2. SpreadsheetApp.flush()
3. exact row readback
4. run the normal RS-13K1 authority resolver against the stored row

Failure at any verification step is an error.

## Immutable boundaries

- no Concept inference
- no historical K1 backfill
- no existing K1 READY/payload/log rewrite
- no scheduler write
- no learner history/score/Review/pointer/clock write
- no RS-13 automatic close
- no RS-14 automatic activation
