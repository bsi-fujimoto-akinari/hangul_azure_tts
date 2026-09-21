# H3 Reading P9/P10 Pilot Contract

Version: H3-READING-P9P10-PILOT-20260921-V1
Status: STAGED_NOT_LEARNER_ACTIVE

## 1. Purpose

Extend the official Reading source-lock pilot from P8 to P9 and P10 without changing the live P8 stage, learner routing, scheduler, Review, HOME, or answer persistence.

The existing P8 source binding is a hard backward-compatibility invariant:

```text
P8 source_binding_sha256
= a8c3a7c038fa251e195463a13157fb3683882ddef30d677d9962c58ff120761e

P8 locked_bundle_sha256
= df49acc7d2495bdbf786020e0e462786d42fc8aa30deba30d73d30b0c6a03f08
```

Generalizing source validation must not change either value.

## 2. Reading family source scope

The common source-lock core accepts:

```text
section_key = H3-P8 | H3-P9 | H3-P10
surface_family = READING
provider_kind = WRITTEN
level = 3級
item_count = 2
group_role = SHARED_READING_PASSAGE
```

The question section must match its source section exactly: P8, P9, or P10.

Skill identity is not required to share the question section prefix. The canonical taxonomy may reuse a Reading skill across P8/P9/P10. The accepted pilot skill namespace is therefore H3-P8-SK*, H3-P9-SK*, or H3-P10-SK*, with the exact skill ID source-locked per question.

## 3. P9 official fixture

```text
section_key=H3-P9
site_group_id=1293
passage_id=H3-P9-G1293
items=OFF-H3-P9-001,OFF-H3-P9-002
site_item_ids=4415,4416
source_batch_id=d8da720b-9110-43c0-bc95-5b5d6f348cfa
source_file=hangul-api-batch-G30-h9-20260916-112344.json
```

Canonical answers and skills:

```text
OFF-H3-P9-001 answer=4 skill=H3-P9-SK001
OFF-H3-P9-002 answer=3 skill=H3-P8-SK003
```

The second question intentionally demonstrates cross-section skill reuse.

## 4. P10 official fixture

```text
section_key=H3-P10
site_group_id=706
passage_id=H3-P10-G706
items=OFF-H3-P10-001,OFF-H3-P10-002
site_item_ids=2463,2464
source_batch_id=392f64a1-f584-44ab-a333-8821b328423f
source_file=hangul-api-batch-G30-h10-20260916-112415.json
```

Canonical answers and skills:

```text
OFF-H3-P10-001 answer=3 skill=H3-P8-SK001
OFF-H3-P10-002 answer=3 skill=H3-P8-SK003
```

Both questions intentionally reuse P8 taxonomy skills.

## 5. Source authorities

The fixtures are grounded in the exact canonical rows from:

- `official_group_content_v1`
- `official_items`
- `official_answer_detail_v1`
- `official_item_skill_map_v2`

A fixture is valid only when group content, item identity, choices, answer position, skill ID, site item identity, and source batch all agree.


Reading source comparison uses one explicit text canonicalization rule before byte/hash validation:

- split passage text on `\n`;
- remove only trailing ASCII spaces from each line;
- preserve all non-trailing whitespace, punctuation, characters, blank lines, and line order;
- rejoin with `\n`;
- do not otherwise rewrite, normalize, translate, or repair the source text.

This rule exists only to ignore source-capture line-end padding. The canonical locked fixture is the line-end-trimmed form. A mismatch remaining after this normalization is a blocking source mismatch.


## 6. Hash behavior

Passage hash and question item hashes are computed from canonical locked source fields. Source-binding hash includes:

- existing Reading pilot contract hash-domain ID;
- provider/surface/level;
- exact section_key;
- passage identity/hash;
- ordered item IDs/hashes;
- source batch ID.

The existing P8 hash domain is retained deliberately so P8 live PREISSUE materialization remains byte/hash compatible.

P9 and P10 must produce distinct source-binding hashes from P8 and from each other.

## 7. Render and grading behavior

Pure pilot render uses the same `surface_family=READING` client contract. Default diagnostic set IDs are:

```text
READING-PILOT-H3-P9
READING-PILOT-H3-P10
```

Exact grading remains question_key-based. Retest evidence is question-level and preserves the exact question skill ID and passage provenance.

## 8. Explicit non-goals

This phase does not:

- add a P9 or P10 live stage row;
- allocate P9/P10 learner SET_ID or ISSUE_NO;
- issue P9/P10 to the learner;
- activate P9/P10 scheduler/queue state;
- change the live P8 PREISSUE_READY row;
- change Reading production commit/client submit gates;
- integrate Reading Review or HOME;
- mutate historical 5W Review/content data;
- change Translation or 準2級.

## 9. Section-aware activation status

Section-aware allocation is now defined by `H3-READING-ACTIVATION-CORE-20260921-V3`.

The Reading SET_ID serial is shared across P8/P9/P10, while STAGE_ID carries the exact section. P8 remains backward compatible through its wrapper and live PREISSUE_READY identity.

P9/P10 remain repository-only pilots. No P9/P10 live row may be materialized until a later explicit activation gate.
