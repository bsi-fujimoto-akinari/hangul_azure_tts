# H3 Reading P8 Pilot Contract

Version: H3-READING-P8-PILOT-20260920-V1
Status: STAGED_NOT_LEARNER_ACTIVE
F2A_READING_REVIEW=READY_SOURCE_BOUND

## 1. Purpose

Pilot the first future Written reading surface without changing the current 5W D2-D6 scheduler, transaction path, or learner history.

The pilot uses one exact official P8 two-question group as the regression fixture. It proves that a shared passage can be source-locked once while grading, uncertainty, skill evidence, and retest obligations remain question-level.

## 2. Surface identity

```text
provider_kind=WRITTEN
surface_family=READING
level=3級
section_key=H3-P8
item_count=2 for the pilot group
```

Reading is not a new top-level Review provider.

## 3. Passage entity

A Reading group contains a passage entity with:

- passage_id
- site_group_id
- passage_ko
- passage_ja
- source_site_item_id
- source_batch_id
- passage_sha256

The passage is context/source authority only. It is never a skill_id, mastery key, scheduler skill state, or retest obligation.

Each question references exactly the same passage_id + passage_sha256 for the group.

## 4. Question identity

Questions use unique `item_id` and `question_key`. The section value `P8` is not unique and must not be used as the browser answer-state key.

Current 5L/5W remain backward compatible because their question key falls back to their unique section identity.

## 5. Source binding

The source binding covers:

- contract ID
- provider/family/level/section scope
- passage ID + passage hash
- ordered item IDs + item hashes
- exact source batch ID

The learner render payload exposes no correct-answer field.

## 6. Grading and retest

Grading is exact four-choice grading per question_key.

Marks remain:

```text
○ = correct, no explicit uncertainty
△ = correct, explicit uncertainty
× = wrong
```

Retest events are emitted only for △/× and carry item_id, question_key, skill_id, and the passage binding for provenance. The passage itself never becomes the retest skill.

## 7. Review

Review groups the two questions under one shared passage and may expose the locked Japanese passage only postgrade. Each question keeps its own skill/result/uncertainty identity.

The P8 pilot has final learner-facing explanation blocks bound to the exact P8 source binding, passage hash, and item hash. Review renders the shared passage once and keeps question-level explanations separate. P9/P10 explanation content remains outside this P8 review gate.

## 8. Exact pilot fixture

The canonical repository audit fixture is official P8 site group 245:

- passage source site item: 2159
- item pair: OFF-H3-P8-001 / OFF-H3-P8-002
- site items: 2159 / 2160
- skills: H3-P8-SK001 / H3-P8-SK005
- correct positions: 3 / 1
- source batch: 6440dcde-26d7-42b4-b29f-b8ace8ae7d0e
- source file: hangul-api-batch-G30-h8-20260916-112313.json
- official group status: CONFIRMED_GROUP_SOURCE
- answer detail status: CONFIRMED_HISTORY

## 9. Activation boundary

This phase does not:

- add P8 skills to the active dynamic queue;
- relax the current P2-P6 5W scheduler fence;
- allocate a learner SET_ID or ISSUE_NO;
- create a Reading Web transaction journal;
- write learner answers/history;
- activate a Reading server route;
- alter P9/P10;
- alter Translation or 準2級.

A later activation phase must define Reading scheduler/transaction ownership before learner issue.
