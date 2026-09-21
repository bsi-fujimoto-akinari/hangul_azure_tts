# H3 Reading / Translation Review Bridge Contract

Version: H3-SURFACE-REVIEW-BRIDGE-20260921-V1
Status: F1_COMPLETE_LEARNER_INACTIVE

## 1. Scope

This contract completes F1 REVIEW BRIDGE only. It connects the already-staged
Reading and Translation production families to dedicated persistent Review
authorities, the common HOME index, Review open routing, and fail-closed
current-learning arbitration.

It does not issue a learner set, enable Reading/Translation submit in Client,
enable either production commit gate, materialize P9/P10/P12, activate any
scheduler/skill_queue state, or mutate 5L/5W learner history.

## 2. Provider and family model

The top-level Review provider remains:

```text
provider_kind = LISTENING | WRITTEN
```

Reading and Translation remain Written-provider learner surfaces:

```text
surface_family = 5W | READING | TRANSLATION
```

No new top-level READING or TRANSLATION Review provider is introduced.
Review routing for non-5W Written history requires explicit `surface_family`.

## 3. Persistent Review authorities

Reading:

- `reading_review_payload_v1`
- `reading_review_binding_v1`
- schema: `H3_PERSISTENT_READING_REVIEW_PAYLOAD_V1`

Translation:

- `translation_review_payload_v1`
- `translation_review_binding_v1`
- schema: `H3_PERSISTENT_TRANSLATION_REVIEW_PAYLOAD_V1`

Both use the shared F1 contract ID:

```text
H3-SURFACE-REVIEW-BRIDGE-20260921-V1
```

Each payload/binding pair is bound to exact TXN_ID, SET_ID, STAGE_ID,
committed result SHA-256, source-binding SHA-256, Review SHA-256 and Review
binding SHA-256. The stored Review is accepted only after full source/transaction
reconstruction from the family-owned stage and transaction authorities.

## 4. Dynamic cardinality

Persistent Review uses `item_count = questions.length`. There is no global
five-question assumption for Reading/Translation Review. The Review total must
equal the exact stored item count.

## 5. Reading shared passage

Reading persistent Review stores one grouped passage object and preserves:

- passage_id
- passage_sha256
- Korean passage text
- Japanese passage text

Every Reading question in the Review must bind to that exact passage ID/hash.
The passage is not converted into a pseudo-skill.

## 6. Translation invariants

Translation persistent Review preserves the exact source-locked:

- translation_direction
- answer_type
- source_language
- choice_language

Current answer_type remains `MULTIPLE_CHOICE`. Every Review question must
match the top-level direction/type. Free-text/LLM grading remains out of scope.

## 7. HOME integration

`review_home_index_v1` remains the only lightweight HOME history index.
Reading/Translation rows continue to use `KIND=WRITTEN` and carry their exact
`SURFACE_FAMILY` and `LEVEL`.

For 5W, existing Written set numbering is unchanged. For Reading/Translation,
`SET_NO` stores the family ISSUE_NO, so the UI can display a family-specific
stable card label without relabeling historical 5W.

HOME opening sends:

```text
review_kind=WRITTEN
surface_family=READING|TRANSLATION
set_id=<exact family SET_ID>
```

## 8. Current-learning arbitration

The Written provider evaluates 5W, Reading and Translation current-learning
candidates. More than one active Written-family candidate is an error.

The common provider arbiter also fails closed if both Listening and Written
providers simultaneously return current-learning candidates. It no longer
silently selects the first ordered provider.

## 9. Explicit non-goals and prohibitions

F1 does not:

- enable `H3_READING_PRODUCTION_COMMIT_ENABLED_`
- enable `H3_TRANSLATION_PRODUCTION_COMMIT_ENABLED_`
- change P8/P11 from PREISSUE_READY
- write Reading/Translation transaction or answer-log rows
- enable the Translation learner renderer
- enable Reading/Translation Client submit
- create live P9/P10/P12 stage rows
- activate Reading/Translation/準2級 scheduler state
- reuse the 5W explanation overlay
- generalize the 5W ANSWERED_AT sidecar
- rewrite any 5W/5L source-binding hash

The 5W explanation overlay and 5W ANSWERED_AT sidecar remain 5W-only.

## 10. Activation handoff

After this bridge is merged, synced and live authority headers are verified,
F2 Reading and F3 Translation may proceed independently.

Before the first family commit is enabled, that family activation phase must
wire its post-commit sequence as:

```text
family transaction COMMITTED
→ family persistent Review LOCKED
→ review_home_index_v1 upsert
→ immediate Review open validation
→ learner success response
```

F2 must also finalize learner-facing Reading explanation blocks before P8 issue.
F3 must implement the Translation learner renderer before P11 issue.
