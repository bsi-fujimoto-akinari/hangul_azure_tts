# H3 Web / Chat Contract

Version: H3-R3-04-CHAT-RECEIPT-CONTRACT-20260919-V1

## 1. Scope

This contract defines the learner-facing chat triggers and the receipt handoff between H3 Web Apps and ChatGPT.

It does not activate production Listening commits, issue L03, or migrate written runtime by itself.

## 2. Learner-facing trigger vocabulary

Current trigger strings:

- `K1`
  - Prepare the next Listening K1 visual item.
  - Persist and verify K1_READY.
  - Does not issue a 5L set by itself.

- `5L`
  - Start the Listening five-question flow.
  - Requires an eligible persistent K1_READY before bind/queue/issue.
  - R3 production uses a Web App.

- `5W`
  - Canonical learner-facing name for the written five-question flow.
  - Replaces the historical learner-facing trigger `5Q`.
  - Web App migration is a later R3-W phase.

- `5Q`
  - DEPRECATED for new learner requests.
  - Do not silently start a new written set from this trigger.
  - Historical SET IDs, logs, snapshots, and old documentation may retain `5Q`; do not rewrite history.

## 3. Audio dispatch contract

The historical one-minute trigger `processLatestPendingAudioJob()` remains a fallback.

The preferred R3 dispatch entry point is:

`processPendingAudioForSet(mode, setId)`

Allowed `mode` values:

- `5L`
- `5W`

Rules:

1. The caller must supply the exact target SET_ID.
2. The dispatcher must never choose another pending set.
3. ScriptLock protects against concurrent queue processing.
4. A non-runnable target is an error; do not fall through to another set.
5. The one-minute generic trigger remains a recovery/fallback path.
6. Web App wiring to the targeted dispatcher occurs only in the appropriate production activation phase.

## 4. Receipt grammar

Every committed H3 Web transaction handed back to Chat uses exactly four lines:

```text
[H3_WEB_SYNC]
SET_ID=<exact set id>
TXN_ID=H3TX-YYYYMMDD-NNNNNN
STATUS=COMMITTED
```

No score, answer vector, answer key, explanation, or journal name is part of the receipt.

The exact grammar is shared by:

- SYSTEM_TEST
- 5L production
- future 5W production

## 5. Chat receipt handling

When Chat receives a receipt:

1. Parse the four-line receipt exactly.
2. Do not infer success from the visible Web App screen alone.
3. Resolve the transaction against the canonical Sheet journal.
4. Require exactly one matching transaction authority for TXN_ID.
5. Require exact SET_ID equality.
6. Require STATUS=COMMITTED.
7. Read back RESULT_JSON / SCORE / fingerprint / hashes required for that route.
8. Verify route-specific state before producing learner-facing scoring/explanation.
9. Chat must not duplicate the backend answer/history write.
10. Re-pasting the same committed receipt is idempotent and must not create another write.

Route-specific checks:

### SYSTEM_TEST

Journal:
`listening_web_test_txn_v1`

Require:

- TXN_ID exact match
- SET_ID exact match
- MODE=SYSTEM_TEST
- STATUS=COMMITTED
- RESULT_JSON transaction identity matches the row
- PRESTATE_SHA256 equals POSTSTATE_SHA256

No learner history/state mutation is permitted.

### 5L production

Journal:
`listening_web_txn_v1`

Require:

- TXN_ID exact match
- SET_ID exact match
- MODE=LISTENING
- STATUS=COMMITTED
- RESULT_JSON transaction identity matches the row
- poststate hash/readback is consistent
- the exact five listening_log rows carry the committed results/provenance for the same TXN_ID
- listening_state_v1 reflects the committed transition
- no unresolved RECOVERY_REQUIRED production transaction exists

Only after these checks may Chat generate the normal post-answer explanation/artifacts.

### 5W production

The receipt grammar is already frozen by this contract.

The canonical written transaction journal and written-specific readback checks will be defined during R3-W migration. Chat must not guess them before that phase.

## 6. Failure behavior

The following are STOP conditions:

- malformed receipt
- unknown TXN_ID
- duplicate transaction authority across journals
- SET_ID mismatch
- STATUS other than COMMITTED
- RESULT_JSON identity mismatch
- hash/readback mismatch
- unresolved RECOVERY_REQUIRED
- route-specific canonical rows missing or ambiguous

On a STOP condition:

- do not treat the answer as committed
- do not write learner history from Chat
- do not issue the next set
- report the blocking reason and audit/recover the backend state

## 7. Ownership

Backend transaction:
- grades
- writes canonical answer/history/state where authorized
- commits journal
- returns receipt

Chat:
- verifies receipt against canonical state
- produces learner-facing explanation/artifacts
- coordinates the next issue
- never duplicates a committed backend mutation

This separation is mandatory for both 5L and future 5W.


## 8. Learner-facing Web launcher URL

The preferred learner-facing Chat link is the parameterless Apps Script Web App URL.

Rules:

1. Chat should not append SET_ID/mode query parameters to the ordinary learner-facing link when the backend has an authorized internal/default target.
2. Parameterless `/dev` and `/exec` must enter the H3 Web App router.
3. Query-string `mode=SYSTEM_TEST` / `mode=LISTENING` routes remain available for controlled diagnostics and internal verification.
4. `ping=1` remains a health-check route.
5. Other HTTP job execution remains disabled.
6. The backend, not the visible URL, is responsible for resolving the current authorized set during normal production flow.

This avoids unnecessary external-link safety interstitials observed for long query-string links while preserving backend authorization.

## 9. Script TXT storage

Script TXT artifacts are noncanonical learner conveniences and must be stored beside their audio:

- 5W: `03_AUDIO/01_5W/H3-YYYYMMDD.txt`.
- 5L: `03_AUDIO/02_5L/{LISTENING_SET_ID}.txt`.
- SYSTEM_TEST: `03_AUDIO/90_ARCHIVE/01_SYSTEM_TEST/{SET_ID}_script.txt`.

The canonical learner/history authority remains Google Sheets. TXT relocation or regeneration must not rewrite scores, history, pointers, or counters.

## 10. R3-09B frozen review target

The active R3-04 receipt grammar remains unchanged.

R3-09B freezes a future ownership transition defined normatively by `H3_REVIEW_ARCHITECTURE.md`. It is not active until the R3-09C/R3-09D implementation and verification steps pass.

After that activation:
- the Web App renders the full explanation immediately after a COMMITTED 5L transaction;
- persistent review can be reopened from canonical backend state after the page/browser is closed;
- the learner is not required to paste the receipt into Chat to obtain the explanation;
- the receipt remains an optional audit/coordination pointer;
- a later `5L` request resolves current backend state directly and does not require the previous receipt to have been pasted;
- Chat may still verify a receipt on request and must never duplicate backend learner writes.

The exact persistent-review and REVIEW_REPLAY boundaries are frozen in `H3_REVIEW_ARCHITECTURE.md`.

## 11. R3-09D persistent Review implementation

The persistent Review Web surface is implemented against the frozen R3-09B V2 contract.

Implemented:
- parameterless HOME with Review history;
- exact `mode=REVIEW&txn_id=<TXN_ID>` reopening;
- postgrade transition to the same persistent Review builder used by later reopening;
- inline exact audio and K1 image;
- full explanation in the Web App;
- receipt hidden under technical details.

Until R3-09E device validation passes, the existing Chat receipt workflow remains the operational fallback for the R3 test sequence. R3-09D implementation alone does not activate normal-live production or REVIEW_REPLAY.

### R3-09D device validation

The persistent Review learner surface has passed iPhone in-app-browser validation for L03:
- parameterless HOME;
- persistent Review history;
- reopen after page/browser closure;
- exact K1 image;
- inline audio UI;
- persisted answer/correct-answer rendering;
- full read-only Review route.

R3-09D is therefore `PASS_DEVICE_VALIDATED`.

Receipt-to-Chat remains available as the operational fallback until R3-09E completes the REVIEW_REPLAY/library device-validation scope. Normal-live production remains gated.
