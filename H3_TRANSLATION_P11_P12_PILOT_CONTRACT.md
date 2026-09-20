# H3 Translation P11/P12 Pilot Contract

Version: H3-TRANSLATION-P11P12-PILOT-20260921-V1
Status: STAGED_NOT_LEARNER_ACTIVE

## 1. Scope

This contract defines the first source-locked Translation-family pilot for official 3級 P11/P12. It is repository-only and does not activate a learner route, transaction journal, scheduler, Review, or HOME entry.

Translation remains a Written-provider surface:

```text
provider_kind=WRITTEN
surface_family=TRANSLATION
level=3級
answer_type=MULTIPLE_CHOICE
```

The initial production design is exact four-choice grading only. Free-text translation and LLM grading are explicitly outside this pilot.

## 2. Explicit direction

Translation direction is stored explicitly and must not be inferred at runtime solely from a section number.

The official pilot binds:

```text
H3-P11:
  translation_direction=KR_TO_JP
  source_language=KO
  choice_language=JA

H3-P12:
  translation_direction=JP_TO_KR
  source_language=JA
  choice_language=KO
```

The pilot validator also checks that the explicit direction is compatible with the official P11/P12 source family, so accidental direction drift fails closed.

## 3. P11 fixture

```text
section_key=H3-P11
site_group_id=707
source_batch_id=d5e325b2-c968-4c33-8d5f-4786a27e01bb
source_file=hangul-api-batch-G30-h11-20260916-113146.json

OFF-H3-P11-001
  site_item_id=2465
  skill_id=H3-P11-SK001
  answer=1

OFF-H3-P11-002
  site_item_id=2466
  skill_id=H3-P11-SK002
  answer=2
```

## 4. P12 fixture

```text
section_key=H3-P12
site_group_id=708
source_batch_id=648f2374-4902-4515-bda7-c7e6296135b1
source_file=hangul-api-batch-G30-h12-20260916-112512.json

OFF-H3-P12-001
  site_item_id=2468
  skill_id=H3-P11-SK017
  answer=2

OFF-H3-P12-002
  site_item_id=2469
  skill_id=H3-P11-SK011
  answer=3
```

P12 intentionally demonstrates canonical cross-section skill reuse: its current taxonomy maps these items to P11 Translation-equivalence skills. Runtime must preserve the exact mapped skill ID rather than fabricating a P12-prefixed copy.

## 5. Source authorities

The fixtures are grounded in exact canonical rows from:

- `official_items`
- `official_answer_detail_v1`
- `official_item_skill_map_v2`

The locked source includes exact item/question identity, target segment, full question text, ordered visible choices, correct answer position, skill ID, site item/group identity, source batch, direction, and answer type.

## 6. Hash domain

Each locked Translation bundle gets an independent SHA-256 source binding over:

- Translation pilot contract ID;
- provider/surface/level;
- section_key;
- explicit translation_direction;
- answer_type;
- source_language / choice_language;
- site_group_id;
- ordered item IDs and item hashes;
- source batch ID.

P11 and P12 bindings must be distinct.

## 7. Render contract

The pure pilot can project:

```text
schema=H3_WEB_TRANSLATION_SET_V1
mode=WRITTEN
surface_family=TRANSLATION
pilot_only=true
```

Each question carries its explicit direction and `answer_type=MULTIPLE_CHOICE`.

The Client Translation renderer is not activated by this phase, so this payload remains a repository/test projection only.

## 8. Grading and retest

Grading is exact choice-position comparison keyed by `question_key`.

Marks remain:

- ○ correct, no explicit uncertainty
- △ correct, explicit uncertainty
- × incorrect

Retest evidence is question-level and includes the exact canonical skill and translation direction.

## 9. Explicit non-goals

This pilot does not:

- create Translation runtime Sheet tabs;
- allocate Translation ISSUE_NO/STAGE_ID/SET_ID;
- activate a Client renderer or submit route;
- activate P11/P12 queue/scheduler state;
- persist Translation Review/HOME;
- implement free-text translation;
- call an LLM grader;
- alter Reading, 5W, 5L, historical Review, or learner state.

## 10. Next Translation step

After this source-lock pilot passes, the next independent phase may define Translation-owned runtime identity/stage/transaction contracts. Learner-facing activation remains serialized with common Review/HOME integration.
