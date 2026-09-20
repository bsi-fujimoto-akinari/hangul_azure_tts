# H3 3級 NEWFMT Runtime Contract

Version: H3-H3-NEWFMT-RUNTIME-20260921-V1
Status: ACTIVE_FOR_SOURCE_BOUND_3KYU

## 1. Scope

This contract activates source-bound 2026 NEWFMT routing inside the existing 3級 5W scheduler without changing the current 20-question source ratio.

Existing ratio remains:

```text
20Q = TOWMI 11 / OFFICIAL 6 / ERROR 2 / NEWFMT 1
```

## 2. Canonical slot routing

A 3級 slot with `PRIMARY_BUCKET=NEWFMT` must resolve by section:

```text
D2 -> H3_D2_FILL7
D5 -> H3_D5_COMMON2
```

Any other section with `PRIMARY_BUCKET=NEWFMT` fails closed.

The source authority is:

```text
H3-2026-NEWFMT-SOURCE-20260921-V1
```

## 3. Planned-slot metadata

Every 3級 NEWFMT slot must carry:

- `format_id`
- `format_source_contract_id`
- `format_level=3級`
- `format_item_count`
- `format_points_each`
- `format_total_points`
- `format_answer_type`
- `format_prompt_semantics`
- `format_source_status=SOURCE_BOUND`

Non-NEWFMT slots must not receive these fields.

## 4. Stage binding

For unissued stages, `QUESTION_META_JSON.planned_slots[]` is the runtime authority for NEWFMT identity.

The stage-level metadata also carries:

```text
newfmt_runtime_contract_id=H3-H3-NEWFMT-RUNTIME-20260921-V1
newfmt_source_contract_id=H3-2026-NEWFMT-SOURCE-20260921-V1
```

Existing issued stages are immutable.

## 5. Retest behavior

A retest may occupy a NEWFMT slot only when:

- the retest section equals the slot section;
- its actual source is NEWFMT;
- the section resolves to one canonical source-bound format;
- the existing EDF/cap/ratio rules pass.

The NEWFMT format metadata is determined from the slot section, not from a historical free-text label.

## 6. Current stage migration

The current unissued stage `STD-B002-S1` is eligible for a metadata-only patch because it is `READY_TO_PATCH` and has no learner SET_ID, answer key, issue timestamp, or question payload.

Its D5 NEWFMT slot must bind to:

```text
format_id=H3_D5_COMMON2
```

No learner issue is performed by this migration.

## 7. Policy-sheet extension

`generation_policy_v1` receives additive NEWFMT runtime keys:

```text
NEWFMT_RUNTIME_CONTRACT_ID
NEWFMT_SOURCE_CONTRACT_ID
NEWFMT_LEVEL
NEWFMT_ALLOWED_SECTIONS
NEWFMT_D2_FORMAT
NEWFMT_D5_FORMAT
NEWFMT_RUNTIME_STATUS
```

The existing `POLICY_ID` and 11/6/2/1 ratio remain unchanged.

## 8. Explicit non-goals

This phase does not:

- author a learner question;
- issue `STD-B002-S1`;
- change source ratios;
- activate 準2級;
- modify Review/HOME;
- copy or mutate learner answer history.
