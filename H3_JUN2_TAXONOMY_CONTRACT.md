# H3 準2級 Targeted Taxonomy / Master Contract

Version: H3-JUN2-TAXONOMY-20260921-V1
Status: SOURCE_BOUND_MASTER_READY_QUEUE_INACTIVE

## 1. Scope

This contract defines the authoritative 準2級 taxonomy/master for the currently source-bound 2026 target formats only.

It is not a claim to exhaust every 準2級 exam skill.

Current authoritative source scope:

- 準2級 D5: common expression for two blanks, 2 questions, 2 points each.
- 準2級 D12: Japanese-to-Korean multiple-choice translation, 4 questions, 2 points each.

Source contract:

```text
H3-2026-NEWFMT-SOURCE-20260921-V1
```

## 2. Master authority

3級 keeps its existing authority:

```text
skill_master_v1
```

準2級 uses an independent successor authority:

```text
jun2_skill_master_v1
```

No row is appended to `skill_master_v1`.

## 3. Canonical rows

### JUN2-D5-SK001

```text
LEVEL=準2級
SECTION=筆5／共通
KNOWLEDGE_DOMAIN=COMMON_EXPRESSION
SKILL_LABEL=2つの文の空欄に共通して入る表現を選ぶ
KNOWLEDGE_KEY=JUN2:D5:COMMON_EXPRESSION_TWO_BLANKS
FORMAT_ID=JUN2_D5_COMMON2X2
SURFACE_FAMILY=5W
ANSWER_TYPE=MULTIPLE_CHOICE
TRANSLATION_DIRECTION=
POOL=JUN2_CORE
AUTOGEN_STATUS=STAGED_NOT_QUEUE_ACTIVE
```

### JUN2-D12-SK001

```text
LEVEL=準2級
SECTION=筆12／翻訳
KNOWLEDGE_DOMAIN=TRANSLATION
SKILL_LABEL=下線部の日本語に最も適切な韓国語訳を選ぶ
KNOWLEDGE_KEY=JUN2:D12:JP_TO_KR_MULTIPLE_CHOICE
FORMAT_ID=JUN2_D12_JP_TO_KR_4X2
SURFACE_FAMILY=TRANSLATION
ANSWER_TYPE=MULTIPLE_CHOICE
TRANSLATION_DIRECTION=JP_TO_KR
POOL=JUN2_CORE
AUTOGEN_STATUS=STAGED_NOT_QUEUE_ACTIVE
```

## 4. Source fields

Both rows must carry:

```text
SOURCE_ID=HANGUL_ASSOC_20260306_FORMAT_CHANGE
SOURCE_CONTRACT_ID=H3-2026-NEWFMT-SOURCE-20260921-V1
SOURCE_STATUS=SOURCE_BOUND
```

The format registry is the machine-readable source of exact item counts and point values.

## 5. State isolation

Every 準2級 skill ID begins with `JUN2-` and is distinct from every active 3級 skill ID.

No 3級 wrong/correct/uncertain count, stability state, due window, issue pointer, or retest obligation is copied into these rows.

Cross-level similarity may be modeled later as advisory relation metadata only.

## 6. Queue boundary

This phase creates no 準2級 queue row.

```text
AUTOGEN_STATUS=STAGED_NOT_QUEUE_ACTIVE
```

means the taxonomy exists but cannot yet be selected by the production scheduler.

Queue/scheduler activation belongs to the next phase.

## 7. Physical schema

`jun2_skill_master_v1` has exactly these columns:

```text
SKILL_ID
LEVEL
SECTION
KNOWLEDGE_DOMAIN
SKILL_LABEL
KNOWLEDGE_KEY
FORMAT_ID
SURFACE_FAMILY
ANSWER_TYPE
TRANSLATION_DIRECTION
SOURCE_ID
SOURCE_CONTRACT_ID
SOURCE_STATUS
POOL
AUTOGEN_STATUS
NOTES
```

Initial data rows are exactly the two source-bound rows in this contract.

## 8. Readiness

After repository audit and exact live readback:

```text
TAXONOMY_STATUS=READY
QUEUE_STATUS=NOT_ACTIVE
SCHEDULER_STATUS=NOT_ACTIVE
LEARNER_ISSUE=NO
```

## 9. Source coverage boundary

The Drive source audit found no independent 準2級 TOWMI canonical rows and the configured `03_準2級_収集` folder is currently empty.

Therefore no vocabulary/grammar taxonomy beyond the two official 2026 source-bound target formats is invented in this phase.

## 10. Non-goals

This phase does not:

- create `jun2_skill_queue_v1`;
- modify `skill_queue_v1`;
- modify 3級 `skill_master_v1`;
- activate 準2級 scheduling;
- issue a learner question;
- modify Review/HOME;
- infer unsupported 準2級 skills.
