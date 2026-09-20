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

## 7. Review/HOME parallel-work gate

Legacy Review compatibility defaults are defined as:

- LISTENING -> 5L / 3級
- WRITTEN -> 5W / 3級

Direct integration into shared Review Core / HOME index is intentionally deferred while the parallel 5W Review reconstruction work owns that shared surface. Do not modify Review Core/HOME schema from this branch until that reconstruction is complete and fresh main is re-read.

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

Implemented in the Phase 1A branch:

- common surface validation helpers;
- common pure audit;
- 5L/5W render envelope metadata;
- 5L/5W committed-result envelope metadata;
- Client removal of the global five-question assumption;
- family-specific fixed-cardinality compatibility validation.

Deferred by the parallel-work gate:

- Review dispatch metadata wiring;
- HOME index surface_family/level materialization;
- Review weakness level-key migration.

These deferred items are Phase 1B and require a fresh readback after the 5W Review reconstruction branch is complete.
