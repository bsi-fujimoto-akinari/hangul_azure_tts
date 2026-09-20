# H3 Level Runtime Contract

Version: H3-LEVEL-RUNTIME-20260921-V2
Status: JUN2_TAXONOMY_READY_QUEUE_INACTIVE

## 1. Purpose

This contract defines level as an independent runtime axis. A source-bound targeted 準2級 taxonomy now exists, while 準2級 queue/scheduler activation remains disabled.

Current live learning remains 3級 only. The active 5W, 5L, Reading and Translation learner states are not changed by this contract.

## 2. Canonical level labels

Persistent runtime labels are:

```text
3級
準2級
```

Korean prose aliases such as `3급` / `준2급` may appear in planning notes, but persistent runtime state must use the canonical labels above.

## 3. Independent state identity

A skill-state identity is:

```text
<LEVEL>|<SKILL_ID>
```

Examples:

```text
3級|H3-P2-SK001
準2級|<future 準2級 skill id>
```

The same conceptual knowledge may be related across levels, but wrong/uncertain/correct counts, stability, due windows, last issued set, retest obligations and promotion state must never be copied automatically across levels.

Cross-level relations are advisory selection metadata only.

## 4. Skill-ID requirement

Before learner activation, every active skill ID must resolve to exactly one canonical level master row and exactly one canonical LEVEL. The current authorities are `skill_master_v1` for 3級 and `jun2_skill_master_v1` for 準2級.

A skill ID may not be reused for two different LEVEL values in active runtime state.

If a future taxonomy needs to relate a 3級 skill and a 準2級 skill, it must use distinct skill IDs plus an explicit relation; it must not alias the IDs or transfer state.

### Canonical master authorities

```text
3級   -> skill_master_v1
準2級 -> jun2_skill_master_v1
```

`jun2_skill_master_v1` is deliberately separate so existing 3級 array formulas, queue state, and history are not rewritten.

## 5. Queue compatibility

The current `skill_queue_v1` does not carry a physical LEVEL column. Therefore any future level-aware scheduler must join each queue SKILL_ID back to the canonical master and require:

```text
master.SKILL_ID = queue.SKILL_ID
master.LEVEL = target scheduler level
```

Missing master rows, duplicate master rows, or level mismatch fail closed.

This contract does not migrate or rewrite `skill_queue_v1`. No 準2級 queue authority is activated in this phase.

## 6. Review compatibility

Common Review already supports `level=3級|準2級` and weakness identity includes level.

The canonical weakness identity is equivalent to:

```text
provider_kind | level | skill_id
```

No new Review/HOME write is performed in this phase.

## 7. Surface compatibility

The common learning surface contract already accepts:

```text
level = 3級 | 準2級
```

5W/5L learner production remains current-level 3級. Source-bound 準2級 D5 and D12 taxonomy rows exist, but no 準2級 learner route is activated.

## 8. Promotion policy

The existing `generation_policy_v1` states `LEVEL_POLICY=H3_FIRST`.

The staged promotion policy is monotonic and uses the existing project thresholds:

- accuracy < 70% -> `H3_CORE_RETEST`
- otherwise remain `H3_ONLY` until the stable threshold below is met;
- accuracy >= 80% with at least 3 stable sets -> `ADD_JUN2_ONE`;
- accuracy > 90% with at least 5 stable sets -> `JUN2_SHARE_UP`.

For accuracy > 90% with only 3-4 stable sets, the action remains `ADD_JUN2_ONE`; higher accuracy must not reduce an already-earned challenge share.

This is a planning/action contract only. It does not create a 準2級 question or advance a live scheduler.

## 9. Activation readiness

`準2級` learner activation remains fail-closed until all of the following exist and pass audit:

- authoritative source-bound 準2級 taxonomy/master rows;
- distinct 準2級 skill IDs with canonical LEVEL=準2級;
- a level-aware queue projection or successor queue schema;
- source/provenance for each active skill;
- explicit surface/format family;
- scheduler policy scoped to 準2級;
- no cross-level state transfer;
- regression proof that current 3級 5W/5L behavior is unchanged.

As of this contract version, `jun2_skill_master_v1` is the 準2級 master authority for the currently source-bound D5/D12 target scope. Queue/scheduler activation is still absent. Therefore activation status is:

```text
TAXONOMY_PRESENT_NOT_RUNTIME_ACTIVATED
```

## 10. New-format isolation

Existing 3級 5W source-ratio policy remains specific to 3級 D2-D6.

Future new-format families, including 準2級 D5 or D12 formats, must declare their own level and format-family identity. They must not inherit the 3級 11/6/2/1 source ratio merely because they are Written questions.

## 11. Explicit non-goals

This phase does not:

- infer 準2級 skills beyond the source-bound targeted taxonomy;
- relabel any 3級 skill;
- modify 3級 `skill_master_v1` or `skill_queue_v1`;
- activate 準2級 scheduling;
- copy 3級 results into 準2級;
- change 5W/5L ratios, pointers, history or retest state;
- change Review/HOME data;
- issue any learner question.
