# H3 Learning Surface Contract

Version: H3-LEARNING-SURFACE-CURRENT-20260920-V1

## 1. Scope

This contract introduces a compatibility envelope for current 5L/5W and future Reading/Translation surfaces without merging their family-specific internals.

```text
provider_kind  = LISTENING | WRITTEN
surface_family = 5L | 5W | READING | TRANSLATION
level          = 3級 | 準2級
item_count     = positive integer
```

The common layer must not assume five items globally. Family validators retain exact cardinality for current 5L and 5W.

## 2. Frozen compatibility families

### 5L

- provider_kind=LISTENING
- surface_family=5L
- current level=3級
- item_count=5
- exact order K1,K2,K3,K4,K5
- existing media, scheduler, overload, preissue and transaction semantics remain unchanged

### 5W

- provider_kind=WRITTEN
- surface_family=5W
- current level=3級
- item_count=5
- exact order D2,D3,D4,D5,D6
- existing Written transaction, Answer Sync, scheduler and 11/6/2/1 source-ratio semantics remain unchanged

## 3. Future families

READING and TRANSLATION are WRITTEN-provider families with dynamic item_count. This Phase 1 change does not activate either family.

READING will later add hash-locked passage entities. TRANSLATION will later add explicit translation_direction and initially remains exact multiple-choice only.

## 4. Level isolation

3級 and 準2級 are independent runtime/scheduler/retest axes. Cross-level state must not be copied automatically.

## 5. Runtime compatibility metadata

Current production render and committed result envelopes expose:

- learning_surface_schema=H3_LEARNING_SURFACE_V1
- provider_kind
- surface_family
- level
- item_count

Existing source-binding hashes, transaction journal schemas, set identities, scheduler state and learner history are not rewritten by this Phase 1 change.

## 6. Client compatibility

The common Client validates declared item_count against the received question array, then applies family-specific validation.

- 5L remains exactly five K1-K5 questions.
- 5W remains exactly five D2-D6 questions.
- SYSTEM_TEST preserves its existing five-question behavior.
- Reading/Translation rendering remains fail-closed until their family adapters are implemented.

## 7. Review/HOME compatibility boundary

Legacy Review compatibility defaults are defined as:

- LISTENING -> 5L / 3級
- WRITTEN -> 5W / 3級

Phase 1B wires this metadata into the common Review return envelope and HOME history model. The physical HOME table keeps its existing name `review_home_index_v1` and accepts both the legacy 13-column header and the staged V2-compatible header that appends `SURFACE_FAMILY` and `LEVEL`.

The compatibility reader derives 5L/5W + 3級 when those columns are absent. New writes materialize the explicit metadata only after the table has been migrated to the V2 header. `migrateReviewHomeIndexV2()` is an explicit, idempotent post-merge migration primitive; it is never called implicitly.

The parallel 5W Review reconstruction Chat is READ_ONLY. This branch may therefore stage ReviewCore/HOME code, but merge, Apps Script synchronization, and live HOME schema migration remain gated on the reconstruction report and a fresh main/runtime readback.

## 8. Non-goals

This phase does not:

- activate Reading, Translation or 準2級;
- alter current 5L/5W source-binding hashes;
- alter Sheet schemas;
- rewrite history;
- merge Listening/Written transaction journals;
- change scheduler eligibility;
- change Review explanation content.

## 9. Implementation status

Implemented and staged on the feature branch:

- Phase 1A common surface validation helpers and pure audit;
- 5L/5W render and committed-result envelope metadata;
- Client removal of the global five-question assumption;
- family-specific fixed-cardinality compatibility validation;
- Phase 1B Review dispatch metadata wiring;
- V1/V2-compatible HOME index surface_family/level handling;
- explicit idempotent HOME V2 migration primitive;
- Review weakness identity keyed by provider_kind + level + skill_id.

Still intentionally inactive:

- Reading learner issue, HOME/Review persistence, and scheduler activation;
- Translation learner route/issue, live stage/log sheets, HOME/Review persistence, and scheduler activation;
- 準2級 taxonomy/queue activation;
- live HOME V2 migration;
- merge / Apps Script sync while the parallel Review reconstruction read-only investigation is still open.

## 10. Reading activation-core staging

The repository now stages `H3-READING-ACTIVATION-CORE-20260921-V3` as the next compatibility layer for Reading.

It defines Reading-owned ISSUE_NO/STAGE_ID/SET_ID semantics across P8/P9/P10, deterministic `H3-YYYYMMDD-RNNN` allocation, the live `reading_stage_v1 / reading_web_txn_v1 / reading_log_v1` authorities, persisted locked-bundle JSON, question-key submission normalization, source-bound preissue validation, transaction planning, committed-result projection, and a pure current-learning candidate.

The explicit Reading server route and transaction persistence code are staged, but learner issue, Client submission, HOME/Review persistence, and scheduler activation remain disabled. The only live Reading stage is the P8 `PREISSUE_READY` pilot; P9/P10 remain repository-only. Current 5W D2-D6 scheduler/Answer Sync behavior is unchanged.

## 11. Translation activation-core staging

The repository now stages `H3-TRANSLATION-ACTIVATION-CORE-20260921-V1`.

It defines Translation-owned ISSUE_NO/STAGE_ID/SET_ID allocation across P11/P12, explicit translation_direction and answer_type binding, source/hash-bound preissue validation, question_key submission normalization, transaction planning, committed-result projection, and a pure current-learning candidate.

The global H3TX allocator reserves `translation_web_txn_v1`. No Translation physical Sheet, server route, learner issue, HOME/Review persistence, or scheduler activation is created by this phase.

Initial learner-answer scope remains `answer_type=MULTIPLE_CHOICE`; free-text Translation and LLM grading remain out of scope.

## 12. Independent level-runtime boundary

`H3-LEVEL-RUNTIME-20260921-V1` makes `level` an explicit state identity before any 準2級 taxonomy is activated.

The state key is `level|skill_id`; cross-level wrong/uncertain/correct, stability, retest due state, and scheduler state must not transfer automatically.

The existing common surface and Review envelopes already accept `3級 | 準2級`. Current learner/runtime sources remain 3級 only because no independent 準2級 taxonomy rows exist yet.

Any future queue selection for 準2級 must resolve its SKILL_ID back to exactly one canonical master row with `LEVEL=準2級`. The current 3級 5W/5L scheduler remains unchanged in this staging phase.

