# H3 Web / Chat Contract

Version: H3-WEB-CHAT-CURRENT-20260920-V1

This document defines the current learner trigger, Web handoff, receipt, and minimal Chat response contract. Completed migration chronology remains in Git history.

## 1. Learner triggers

- `K1`: prepare and verify persistent K1_READY; does not issue 5L.
- `5L`: start the Listening five-question Web flow.
- `5W`: current written five-question trigger.
- `5Q`: DEPRECATED for new requests; do not rewrite historical identifiers.

## 2. Targeted audio dispatch

Normal dispatch is `processPendingAudioForSet(mode, setId)` with exact mode `5L` or `5W`. The supplied SET_ID is mandatory and the dispatcher must never fall through to another pending set. `processLatestPendingAudioJob()` remains fallback-only.

## 3. Receipt grammar

Committed H3 Web transactions use exactly four lines:

```text
[H3_WEB_SYNC]
SET_ID=<exact set id>
TXN_ID=H3TX-YYYYMMDD-NNNNNN
STATUS=COMMITTED
```

The receipt contains no score, answers, answer key, explanation, or journal name. The grammar is shared by SYSTEM_TEST, 5L production, and future 5W production.

## 4. Receipt verification

Chat must parse the receipt exactly and verify canonical backend state. A visible success screen is not proof.

Common requirements:

- exactly one matching transaction authority;
- exact TXN_ID and SET_ID;
- `STATUS=COMMITTED`;
- matching RESULT_JSON identity, fingerprints, and hashes;
- no unresolved `RECOVERY_REQUIRED`;
- idempotent handling of repeated receipts;
- no duplicate history/state write from Chat.

SYSTEM_TEST reads `listening_web_test_txn_v1`, requires `MODE=SYSTEM_TEST`, and requires equal prestate/poststate hashes. It must not mutate learner runtime.

5L reads `listening_web_txn_v1`, requires `MODE=LISTENING`, verifies the exact five `listening_log_v1` rows and `listening_state_v1` transition, and then relies on the Web App's persistent Review for ordinary explanation.

The written journal/readback contract must be explicitly defined before 5W Web transactions use this receipt; Chat must not invent it.

## 5. Failure behavior

Malformed, unknown, duplicate, non-COMMITTED, mismatched, hash-invalid, incomplete, or recovery-blocked receipts are STOP conditions. Do not treat them as committed, write learner history, or issue the next set.

## 6. Ownership

The backend grades, performs authorized canonical writes, commits the journal, and returns the receipt. The Web App owns immediate persistent Review. Chat verifies canonical state when a receipt is supplied, coordinates later work, and never duplicates backend mutations.

## 7. Learner-facing Web launcher

Canonical learner URL:

```text
https://script.google.com/macros/s/AKfycby8I309RUkfVIsnJks808KA713QLppfrGiAFUTV2tA/dev
```

The normal 5L handoff is parameterless HOME. After successful issue, Chat calls `getListeningLearnerUrl(SET_ID)` and requires `handoff_mode=HOME_PARAMETERLESS`.

### Parameterless handoff refinement

Chat must return the resolver's `url` field, not `direct_url`. The returned `url` is exactly the parameterless canonical base.

Do not return a normal learner link containing `?mode=`, `set_id=`, `txn_id=`, `script.googleusercontent.com`, `/macros/echo`, `user_content_key`, or `lib=`. `direct_url` is internal diagnostics only.

HOME resolves only the latest safe `ISSUED`, uncommitted, production-renderable 5L. Failure to resolve the just-issued target is a STOP condition, not permission to fall back to a query-string link.

### Parameterless direct boot

With no query parameters, server boot checks canonical HOME/current-learning state. If an authorized active 5L exists, it boots LISTENING for that exact SET_ID; otherwise it boots HOME. Thus the learner does not need to tap the current-set button during an active issue.

Explicit `SYSTEM_TEST`, `LISTENING`, `REVIEW`, and `REVIEW_REPLAY` routes remain controlled internal/diagnostic paths. `ping=1` remains a health check. HTTP job execution stays disabled.

## 8. Script TXT storage

- 5W: `03_AUDIO/01_5W/H3-YYYYMMDD.txt`
- 5L: `03_AUDIO/02_5L/{LISTENING_SET_ID}.txt`
- SYSTEM_TEST: `03_AUDIO/90_ARCHIVE/01_SYSTEM_TEST/{SET_ID}_script.txt`

TXT files are noncanonical conveniences. Moving or regenerating them must not rewrite learner state.

## 9. Persistent Review and replay

Committed 5L answers open the persistent Review built from exact transaction, payload, binding, image, and audio sources. HOME lists committed Reviews. Opening a Review performs full source-lock validation.

REVIEW_REPLAY is nonlearning, reuses the original locked media, hides protected answers/explanation until local completion, and performs zero learner-runtime writes. Detailed invariants are in `H3_REVIEW_ARCHITECTURE.md`.

## 18. Listening audio reliability

Question navigation pauses non-active audio. Automatic transition starts the next question at its beginning. Media RPC retries once; exhausted loading shows a question-local fallback. Background prefetch failure must not become a global learner error.

Preissue source-locks K2/K3 prompt and all four choices against `AUDIO_PLAN_JSON`; omission or ordering mismatch is a STOP condition.

## 19. Official Listening audio parity V21

For newly authored/unissued 5L:

- K2/K3 use Nanami for `マルイチ` through `マルヨン` immediately before each Korean choice;
- K3 uses distinct canonical prompt/response Korean voices;
- K4/K5 use Nanami's `もう一度読みます` between passage readings;
- Korean replay cues are forbidden;
- preissue rejects parity failures.

Issued and committed sets remain immutable.

## 20. Listening overload scheduler

The learner surface remains five K1-K5 slots. Normal sets allow at most one retest; overload permits up to two different section-matched retests. `H3_LISTENING_OVERLOAD_PLAN_V3`, persisted cap, selected sections, and locked payload must agree. Blocking overflow stops issue.

## 21. Legacy Review compatibility

`H3-20260919-L02` remains a `LEGACY_PRE_WEB` Review without synthetic transaction/TXN_ID. HOME may list it through its immutable legacy binding. Unknown historical uncertainty is `?—`; Review and replay are read-only and zero-mutation.

## 22. Minimal Chat output contract

After a successful `5L` issue, Chat returns the parameterless Web App URL and nothing else.

After authoritative `[H3_WEB_SYNC]` verification, Chat returns exactly one of:

```text
No issues detected.
```

```text
Issue detected.
```

Do not add score, answers, explanation, progress, audit detail, or next-step commentary in that turn. Minimal output never weakens canonical verification.
