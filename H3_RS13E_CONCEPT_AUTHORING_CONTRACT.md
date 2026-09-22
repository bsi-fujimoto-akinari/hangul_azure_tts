# H3 RS-13E Concept Coverage & Authoring Gate Contract

Version: 2026-09-22 V1
Status: integration candidate

## Purpose

Increase the probability that normal future learning naturally produces
RS-13 real secondary evidence, without forcing scheduler choices or rewriting
already-created learner surfaces.

RS-13E combines:

1. exact/high Concept coverage expansion
2. deterministic cross-family annotation resolution
3. future-only prospective gates
4. source-lock and scheduler non-regression checks

RS-13 itself remains shadow-only and does not close merely because RS-13E is
deployed.

## Concept coverage

The existing RS-08 four Concepts remain unchanged.

RS-13E adds exactly three verified Concept pairs from
`current_skill_relation_v1`:

- `EXPR:대책이_안_서다`
  - LISTENING `H3-K2-SK006`
  - WRITTEN `H3-P4-SK011`
  - relation: `EXACT_EXPRESSION_SEMANTICS`, HIGH
- `EXPR:마음을_놓다`
  - LISTENING `H3-K2-SK059`
  - WRITTEN `H3-P4-SK014`
  - relation: `EXACT_EXPRESSION_SEMANTICS`, HIGH
- `VOCAB:답답하다`
  - LISTENING `H3-K2-SK063`
  - WRITTEN `H3-P2-SK012`
  - relation: `EXACT_LEXEME_MATCH`, HIGH

After expansion:

- Concept count = 7
- mapping rows = 14
- all mappings remain `APPLICATION_SKILL`
- `DIRECT_REUSE=NO`
- `STATE_TRANSFER=NO`
- `RETEST_CLOSURE=NO`
- `STABILITY_TRANSFER=NO`
- `SCHEDULER_USE=DIAGNOSTIC_SELECTION_ONLY`
- status = `ACTIVE_PILOT`

MEDIUM relations, FUNCTIONAL_ANALOGUE, BROAD_DIALOGUE_CONTEXT_ANALOGUE,
PASSAGE_CONTENT_MATCH_ANALOGUE, and lexical-overlap-only relations remain
excluded.

## Deterministic resolver

Contract:
`H3-RS13E-AUTO-ANNOTATION-20260922-V1`

Resolver input:

- LEVEL
- source FAMILY
- direct SKILL_ID
- current `skill_concept_map_v1`

A skill is auto-annotatable only when:

- source skill has exactly one active exact/high Concept
- source mapping family matches the actual source family
- at least one active exact/high target mapping exists in another family
- all source and target mappings satisfy the no-transfer safety contract

Auto-generated links are:

- `LINK_ROLE=CONTRIBUTORY`
- `CONFIDENCE=HIGH`
- annotation contract = RS-13E auto contract

If the direct skill maps to more than one exact Concept, automatic annotation
fails closed as ambiguous.

Explicit RS-12 `secondary_evidence_links` always take precedence over
automatic resolution.

## Non-hash-bearing annotation

RS-13E deliberately does not rewrite question text, locked bundle metadata, or
existing source hashes.

Automatic annotation is resolved at precommit and reused at capture time.
This allows RS-12 evidence capture and RS-13 shadow observation to receive the
same deterministic Concept link while keeping the original learning surface
source-lock unchanged.

The evidence row keeps:

`PROVENANCE_KIND=AUTHOR_VERIFIED_EXACT`

and `PROVENANCE_REF` records the actual annotation contract used, so explicit
RS-12 authoring and RS-13E deterministic auto annotation remain distinguishable.

## Future-only activation gates

Already-created surfaces are excluded.

First auto-eligible surfaces:

- 5W: strictly after Block 2 / Set Offset 1
  - current `STD-B002-S1` remains excluded
- 5L: Listening Set No. 5 or later
  - already-prestaged Set No. 4 remains excluded
- 2R: Reading Issue No. 4 or later
  - committed Issues 1-3 remain excluded
- 2T V2: Translation Issue No. 4 or later
  - committed Issue 3 remains excluded

The gates use stable runtime ordinals rather than wall-clock time.

## Scheduler boundary

RS-13E never changes which skill the scheduler selects.

Flow:

`normal scheduler selection -> future-only gate -> exact Concept lookup ->
secondary annotation -> learner answer -> RS-12 capture -> RS-13 shadow`

No Concept target is inserted into a slot merely to produce RS-13 data.

## Immutable boundaries

RS-13E does not change:

- learner history
- score
- Review
- existing locked / issued / prestaged surfaces
- 5W / 5L pointers
- R/T clocks
- DIRECT evidence authority
- mastery
- retest closure
- stability
- historical secondary evidence
- scheduler priority order
- source-binding hashes for existing surfaces

Historical secondary backfill remains forbidden.

## Close gate

RS-13E may close after:

- 7 Concept / 14 mapping readback PASS
- deterministic resolver CI PASS
- future-only gate CI PASS
- explicit-link precedence PASS
- source-lock compatibility PASS
- RS-10 / RS-12 / RS-13 regression audits PASS
- main Repository audit PASS
- Apps Script auto-sync PASS
- runtime non-regression PASS except intentional Concept-map expansion

A genuine learner answer is not required to close RS-13E.
That remains the separate close gate for RS-13.
