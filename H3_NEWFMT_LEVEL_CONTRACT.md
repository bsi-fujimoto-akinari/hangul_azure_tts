# H3 2026 New-Format Level Contract

Version: H3-NEWFMT-LEVEL-20260921-V1
Status: POLICY_STAGED_SOURCE_UNBOUND

## 1. Purpose

This contract separates the 2026 new-format family identity from the current 3級 5W source-ratio scheduler.

The current live `generation_policy_v1` reserves `NEWFMT=1` in the 20-question 3級 5W window, but it does not define the detailed D2/D5/D12 format families. This contract records the already-approved project format tokens without inventing official source content or cardinality semantics that have not yet been source-verified.

No learner question is activated by this contract.

## 2. Canonical planned format tokens

The staged format registry is:

```text
level=3級
  format_id=H3_D2_FILL7
  section=D2
  raw_token=D2_fill7

level=3級
  format_id=H3_D5_COMMON2
  section=D5
  raw_token=D5_common2

level=準2級
  format_id=JUN2_D5_COMMON2X2
  section=D5
  raw_token=D5_common2x2

level=準2級
  format_id=JUN2_D12_KR_TO_JP_4X2
  section=D12
  raw_token=D12_KRtoJP4x2
  translation_direction=KR_TO_JP
```

The numeric and `x2` parts remain opaque format-token components in this phase. They must not be reinterpreted as a runtime item-count rule until the authoritative 2026 source defines that meaning.

## 3. Level isolation

Every format definition has an explicit canonical LEVEL.

A 3級 NEWFMT slot may select only a `level=3級` format definition.

A 準2級 format must not inherit:

- the current 3級 20Q source ratio;
- 3級 skill state;
- 3級 retest obligations;
- 3級 scheduler pointers;
- 3級 coverage counters.

The independent level-runtime contract `H3-LEVEL-RUNTIME-20260921-V1` remains authoritative for state isolation.

## 4. Current 3級 ratio compatibility

The existing live ratio remains:

```text
20Q = TOWMI 11 / OFFICIAL 6 / ERROR 2 / NEWFMT 1
```

This ratio remains specific to the current 3級 5W core window.

The new-format registry does not change the ratio, does not choose a format for the next live set, and does not alter any 5W stage.

## 5. Source-lock requirement

Every format remains `SOURCE_UNBOUND` until an authoritative 2026 source supplies enough evidence to lock:

- exact format identity;
- exact prompt/body structure;
- exact item/cardinality semantics;
- answer representation;
- level;
- section;
- direction where applicable;
- source provenance/hash.

A format token alone is insufficient to author learner content.

## 6. Translation boundary

`JUN2_D12_KR_TO_JP_4X2` is a Translation-family format candidate because its approved token explicitly declares KR-to-JP direction.

That does not activate it in the existing 3級 P11/P12 Translation runtime.

Future 準2級 D12 implementation must use:

```text
surface_family=TRANSLATION
level=準2級
translation_direction=KR_TO_JP
```

and an independent 準2級 source/taxonomy.

## 7. Activation readiness

A format may become runtime-eligible only when all are true:

- canonical level is valid;
- authoritative source is bound;
- exact format semantics are verified;
- required taxonomy exists for that level;
- target surface supports the format;
- scheduler policy explicitly admits that level+format;
- no cross-level state transfer occurs.

Until then, readiness is `SOURCE_UNBOUND`.

## 8. Explicit non-goals

This phase does not:

- add official 2026 source rows;
- infer the meaning of `7`, `2`, `2x2`, or `4x2`;
- change `generation_policy_v1`;
- change the 3級 11/6/2/1 ratio;
- activate any 準2級 skill or question;
- modify 5W/5L/Reading/Translation live stages;
- modify Review/HOME;
- issue learner content.
