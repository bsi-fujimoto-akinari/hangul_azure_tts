# H3 Translation Activation Core Contract

Version: H3-TRANSLATION-ACTIVATION-CORE-20260921-V1
Status: PREISSUE_CAPABLE_ROUTE_INACTIVE

## 1. Scope

This contract advances the source-locked official P11/P12 Translation pilot to a production-compatible activation core without issuing a learner set.

It defines Translation-owned runtime identity, stage identity, transaction envelope, submission normalization, preissue validation, committed-result projection, and current-learning candidate rules.

This phase does not create or mutate learner history, activate a learner route, register HOME/Review persistence, or issue any Translation set.

## 2. Provider and surface identity

```text
provider_kind=WRITTEN
surface_family=TRANSLATION
level=3級
section_key=H3-P11 | H3-P12
answer_type=MULTIPLE_CHOICE
translation_direction=
  H3-P11 -> KR_TO_JP
  H3-P12 -> JP_TO_KR
```

Translation remains a Written-provider surface but never inherits the 5W D2-D6 cardinality or source-ratio policy.

## 3. Identity and allocation

Translation owns one ISSUE_NO sequence and one SET_ID namespace across P11/P12.

```text
ISSUE_NO = ordinal within surface_family=TRANSLATION
SET_ID   = H3-YYYYMMDD-TNNN
STAGE_ID = TRANS-P11-YYYYMMDD-NNN
        | TRANS-P12-YYYYMMDD-NNN
```

Rules:

- `YYYYMMDD` is the Asia/Tokyo allocation date supplied by the caller.
- `NNN` is `max(existing Translation serial for that date)+1` across P11/P12. Gaps are never reused.
- SET_ID serial is shared across P11/P12.
- STAGE_ID section must match SECTION_KEY.
- STAGE_ID date and serial must exactly match SET_ID.
- ISSUE_NO is max(existing Translation ISSUE_NO)+1.
- malformed, duplicate, or parity-invalid historical identities fail closed.
- before allocation, coordination reports `SET_ID=PENDING_ALLOCATION`; IDs must never be guessed.

## 4. Future physical authorities

The activation core reserves:

- `translation_stage_v1`
- `translation_web_txn_v1`
- `translation_log_v1`

The global H3TX allocator includes `translation_web_txn_v1`. A missing physical journal before schema activation contributes zero rows.

## 5. Stage contract

A Translation stage binds one exact locked Translation bundle to:

- ISSUE_NO / STAGE_ID / SET_ID
- level / section_key
- translation_direction
- answer_type
- item_count
- source_binding_sha256
- locked_bundle_sha256
- locked_bundle_json

Initial stage status is `LOCKED`. Preissue may project `PREISSUE_READY` only when identity, source, direction, answer type, cardinality, and hashes agree.

## 6. Submission contract

```text
schema=H3_WEB_SUBMIT_V1
mode=WRITTEN
provider_kind=WRITTEN
surface_family=TRANSLATION
set_id=<exact Translation SET_ID>
answers=[
  {question_key, answer, uncertain},
  ...
]
```

Exact question_key is mandatory. The answer is the selected choice position 1..4. Translation direction is source-locked and is never inferred from learner input.

## 7. Transaction contract

The future `translation_web_txn_v1` journal uses the global H3TX namespace.

Fingerprint covers:

- mode/provider/surface
- exact SET_ID
- ordered question_key
- answer position
- explicit uncertainty

Transaction source binding is the locked Translation bundle source-binding hash.

This phase constructs the transaction plan only; it does not append a journal row.

## 8. Preissue gate

Preissue fails closed unless:

- stage schema/status/identity are valid;
- locked bundle schema is `H3_TRANSLATION_LOCKED_BUNDLE_V1`;
- provider/surface/level/section agree;
- explicit direction agrees with locked source and section;
- answer_type is `MULTIPLE_CHOICE`;
- item_count matches;
- source-binding hash matches;
- locked-bundle hash matches a fresh canonical hash;
- stored `LOCKED_BUNDLE_JSON` canonicalizes byte-for-byte to the fresh locked bundle and hashes to `LOCKED_BUNDLE_SHA256`;
- SET_ID is explicit;
- no committed Translation transaction is already bound to that SET_ID.

## 9. Result and retest projection

Exact grading delegates to `h3TranslationGrade_`.

Committed-result projection uses:

- `H3_WEB_SUBMIT_RESULT_V1`
- mode=WRITTEN
- provider_kind=WRITTEN
- surface_family=TRANSLATION
- exact SET_ID / STAGE_ID / TXN_ID
- translation_direction / answer_type
- score / total
- per-question question_key / item_id / skill / result / uncertainty
- source_binding_sha256

Retest evidence remains question-level and preserves canonical cross-section skill reuse.

## 10. Current-learning candidate

A pure candidate may exist only for a stage that is:

- `ISSUED`;
- bound to an explicit SET_ID;
- uncommitted;
- source/hash/direction-valid.

The candidate is not registered in HOME or common provider routing in this phase.

## 11. Explicit non-goals

This phase does not:

- create live Translation Sheet tabs;
- create P11/P12 live stage rows;
- issue a learner Translation set;
- activate a server route or Client submit path;
- persist Translation Review/HOME;
- activate P11/P12 skill_queue rows;
- mutate 5W/5L/Reading state;
- add free-text Translation or LLM grading;
- modify historical 5W Review/content.

## 12. Next phase

After repository audit/merge:

```text
Translation live schema creation
→ exact P11 stage materialization
→ preissue readback
→ route/transaction persistence staging
→ Review/HOME integration
→ one pilot issue
```

Review/HOME integration remains serialized against concurrent historical 5W Review work.
