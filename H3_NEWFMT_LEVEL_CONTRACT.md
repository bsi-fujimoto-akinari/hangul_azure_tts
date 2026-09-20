# H3 2026 New-Format Level Contract

Version: H3-NEWFMT-LEVEL-20260921-V2
Status: SOURCE_BOUND_RUNTIME_READY_FOR_H3

## 1. Purpose

This contract binds the approved 2026 format registry to the official 2026 format-change notice.

Source authority is `H3-2026-NEWFMT-SOURCE-20260921-V1`.

## 2. Canonical source-bound formats

```text
3級
  H3_D2_FILL7
  section=D2
  item_count=7
  points_each=1
  total_points=7
  source_status=SOURCE_BOUND

3級
  H3_D5_COMMON2
  section=D5
  item_count=2
  points_each=1
  total_points=2
  source_status=SOURCE_BOUND

準2級
  JUN2_D5_COMMON2X2
  section=D5
  item_count=2
  points_each=2
  total_points=4
  source_status=SOURCE_BOUND

準2級
  JUN2_D12_JP_TO_KR_4X2
  section=D12
  item_count=4
  points_each=2
  total_points=8
  surface_family=TRANSLATION
  translation_direction=JP_TO_KR
  source_status=SOURCE_BOUND
```

## 3. D12 legacy alias

`D12_KRtoJP4x2` is retained as a deprecated input alias only.

Canonical behavior is:

```text
D12_KRtoJP4x2
  -> JUN2_D12_JP_TO_KR_4X2
  -> translation_direction=JP_TO_KR
```

No runtime component may derive direction from the legacy token spelling.

## 4. Level isolation

A 3級 NEWFMT slot may select only level=3級 formats.

準2級 formats never inherit:
- the current 3級 20Q source ratio;
- 3級 skill state;
- 3級 retest obligations;
- 3級 scheduler pointers;
- 3級 coverage counters.

`H3-LEVEL-RUNTIME-20260921-V1` remains authoritative for state isolation.

## 5. Current 3級 ratio compatibility

The live 3級 5W ratio remains exactly:

```text
20Q = TOWMI 11 / OFFICIAL 6 / ERROR 2 / NEWFMT 1
```

The source-bound registry changes only which 3級 format is legal when a NEWFMT slot is assigned to D2 or D5.

## 6. Section-aware 3級 selection

For level=3級:

```text
section=D2 -> H3_D2_FILL7
section=D5 -> H3_D5_COMMON2
```

Any other section with primary_bucket=NEWFMT fails closed.

## 7. 準2級 readiness

The source layer is now bound for:
- D5 common-two-blanks format;
- D12 JP_TO_KR multiple-choice translation format.

Runtime activation still requires distinct 準2級 taxonomy/master rows and a later level-aware queue/scheduler phase.

## 8. Explicit non-goals

This contract does not:
- create learner question wording;
- activate a 準2級 scheduler;
- copy 3級 state into 準2級;
- change the 3級 source ratio;
- issue learner content.
