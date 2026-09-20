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

Learner-facing URLs are a distinct authority from audio/job execution URLs.

Canonical Chat handoff URL:

```text
https://script.google.com/macros/s/AKfycby8I309RUkfVIsnJks808KA713QLppfrGiAFUTV2tA/dev
```

The normal 5L handoff is parameterless HOME. HOME resolves the current authorized uncommitted `ISSUED` set from canonical backend state and exposes it as `現在の5L` with an `開く` action.

After issue succeeds, Chat MUST obtain the URL authority through:

`getListeningLearnerUrl(SET_ID)`

The resolver validates the exact target set through the production render gate, but its learner-facing `url` field is always the parameterless HOME URL.

Rules:

1. Chat must return the resolver's `url` field, not `direct_url`.
2. `url` must equal the parameterless canonical base exactly.
3. `direct_url` may exist for internal diagnostics only and must not be emitted as the normal Chat learner link.
4. Never return a learner link containing `?mode=`, `set_id=`, `txn_id=`, `script.googleusercontent.com`, `/macros/echo`, `user_content_key`, or `lib=`.
5. HOME must resolve the latest renderable `ISSUED`, uncommitted Listening set and let the learner open it without changing the browser URL.
6. `mode=SYSTEM_TEST`, `mode=LISTENING`, `mode=REVIEW`, and `mode=REVIEW_REPLAY` remain controlled internal/diagnostic Web routes.
7. `ping=1` remains a health-check route.
8. Other HTTP job execution remains disabled and must never be repurposed as a learner link.
9. If HOME cannot resolve the just-issued target, stop and audit the backend state instead of falling back to a query-string link.

This parameterless handoff avoids the ChatGPT iOS external-link safety confirmation observed for long query-string Apps Script links while preserving exact backend authorization.

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

## 12. R3-09E REVIEW_REPLAY staged implementation

REVIEW_REPLAY is implemented as a nonlearning Web-only practice path.

It may be launched from Review history or an opened persistent Review. The learner re-answers the same exact source-bound 5L surface without exposing prior answers, correct answers, explanations, or K2/K3 scripts before local replay grading.

Replay grading produces no receipt and no canonical learner transaction. After grading, the Web App returns to the exact persistent Review and may show a transient `今回 / 元回答` score comparison.

Until iPhone zero-mutation validation passes, R3-09E remains staged. Normal-live production activation remains gated.

### R3-09E refined learner surface

The learner-facing Review surface is now page-based rather than a vertically stacked multi-question Review.

- one Q card at a time;
- five top Q buttons include `○/△/×`;
- no aggregate Review score/count/filter header;
- Review footer: `再挑戦` / `ホーム`;
- REVIEW_REPLAY starts directly with the question surface and has no separate intro block.

No Chat ownership or backend-write rule changes.

### R3-09E close

R3-09E has passed learner-device / zero-mutation validation.

Operational ownership after close:
- HOME / REVIEW / REVIEW_REPLAY are learner-facing Web surfaces;
- REVIEW_REPLAY remains nonlearning and nonpersistent;
- Chat is not required for replay grading;
- Chat may audit the canonical transaction and Review state;
- Chat must never synthesize or persist a replay result into learner history.

Canonical close state for the R3 validation set:
- `SET_ID=H3-20260919-L03`;
- `TXN_ID=H3TX-20260919-000005`;
- one COMMITTED production transaction only;
- five learner log rows only;
- Review binding remains LOCKED;
- learner state remains issue 2 / next set 3 / last set L03.

Next stage is R3-10 full E2E audit. Normal-live activation remains outside this contract until R3-11.

## 14. R3-10 device release policy

Default learner-device validation for Listening Web App releases is mobile-first.

- iPhone-class mobile validation is the required learner-facing device gate.
- PC validation is optional and nonblocking by default.
- Require PC validation only when the user explicitly requests it or the change is PC-specific.
- Absence of a PC check by itself must not block R3-10/R3-11 progression.
- This policy does not relax runtime, source-lock, transaction, scheduler, idempotency, audio, or Review integrity gates.

Canonical Listening render source: `H3-LISTENING-RENDER-RULES-20260920-V19`.

R3-10 exited with `BLOCKING=0`; R3-11 remains the separate normal-live activation stage.

## 15. R3-11 normal-live ownership

After R3-11 activation, the Web App is the learner-facing authority for ordinary Listening 5L issue/answer/Review surfaces.

Chat/coordination responsibilities:
- generate/prepare the next canonical 5L when requested;
- run the canonical preissue gate before issue;
- verify source/audio/scheduler bindings;
- never bypass `NORMAL_LIVE_ACTIVE` runtime gates;
- never duplicate a committed production transaction;
- never persist REVIEW_REPLAY as learner history.

Web responsibilities:
- render only an issued set matching canonical next-set state;
- commit one idempotent production transaction;
- persist learner grading/state through the production transaction;
- return persistent Review;
- keep HOME/REVIEW/REVIEW_REPLAY behavior unchanged.

R3-11 activation alone does not issue set no.3. The next 5L is prepared only on a subsequent learner request.

### R3-11 close

Normal-live Listening ownership is active.

Current learner trigger behavior:
- `5L` may now prepare the canonical next Listening set under the normal-live gate;
- the next set number is 3;
- the scheduler requires K4 as the set-3 retest slot;
- issue remains blocked until canonical preissue PASS;
- Web App grading remains the only production transaction path;
- postgrade persistent Review and REVIEW_REPLAY behavior are unchanged.

R3-11 activation itself created no new learner set or learner history.

## 16. R3 close

R3 is closed after R3-12 infrastructure finalization.

Learner-facing ownership remains:
- `K1`: prepare persistent K1_READY only;
- `5L`: normal-live Listening Web App flow;
- `5W`: written five-question flow;
- `5Q`: deprecated for new learner requests only.

R3 close does not change normal-live learner semantics. The next `5L` request prepares set no.3 using the persisted scheduler plan, with K4 as the currently scheduled retest slot.

## 17. Post-R3 learner URL authority fix

A post-R3 production incident showed that a redirected Apps Script content URL could be returned to the learner after a K1 -> 5L preparation flow:

```text
script.googleusercontent.com/macros/echo?...&lib=...
```

That URL is not a learner launcher. It reaches the disabled HTTP job surface and returns:

```text
Use the authorized Sheet queue. HTTP job execution is disabled.
```

The fix establishes one explicit URL authority:
- `getListeningLearnerUrl(SET_ID)` is the backend read-only URL resolver;
- it validates the issued production render before returning;
- it returns only the canonical `script.google.com/macros/s/.../dev?mode=LISTENING&set_id=...` form;
- Chat must use that result for post-issue 5L handoff;
- redirected `script.googleusercontent.com` URLs are forbidden as learner-facing output.

This fix changes no learner history, score, counter, pointer, scheduler, K1_READY, payload content, or production transaction.

### Parameterless handoff refinement

After iPhone validation showed the ChatGPT `Check this link is safe` interstitial for the direct `?mode=LISTENING&set_id=...` URL, the canonical Chat handoff was refined to parameterless HOME.

`getListeningLearnerUrl(SET_ID)` now returns:
- `url` = parameterless HOME URL;
- `handoff_mode=HOME_PARAMETERLESS`;
- `direct_url` = exact set route for internal diagnostics only.

HOME already validates and exposes the current `ISSUED`, uncommitted set through `h3ReviewCurrentLearning_()`, and the `開く` button loads that exact set client-side.

No learner state, score, history, scheduler, K1_READY, payload, or production transaction semantics change.

### Parameterless direct boot

The parameterless canonical learner URL now boots directly into the current authorized 5L when one exists.

Server-side boot behavior:
- no query parameters;
- read canonical HOME/current-learning state;
- if an `ISSUED`, uncommitted, production-renderable 5L exists, boot as `mode=LISTENING` for that exact SET_ID;
- otherwise boot as `mode=HOME`.

Therefore normal Chat handoff remains the short parameterless URL, but the learner does not need to tap `現在の5L -> 開く` while an active issued set exists.

Explicit query-string routes remain diagnostic/internal and do not change this default boot behavior.

## 18. Listening audio reliability

Canonical Listening render version is now `H3-LISTENING-RENDER-RULES-20260920-V20`.

For learner-facing 5L audio:
- question navigation must pause every non-active audio element;
- automatic transition to the next question must start that question at its beginning when its source is ready;
- background prefetch failure is local to the target asset and must not render a global learner error;
- media RPC receives one automatic retry;
- exhausted media loading exposes only the question-local fallback;
- K2/K3 preissue must source-lock prompt and all four choices against `AUDIO_PLAN_JSON`;
- a K2/K3 prompt omission or reordered/mismatched projection is a preissue STOP.

A live L04 K3 audit established that its generated source includes the prompt segments, so the current issued learner set is preserved rather than regenerated.

## 19. Official Listening audio parity V21

For every newly authored/unissued 5L after V21:

- K2 and K3 must announce ①–④ as `マルイチ / マルニ / マルサン / マルヨン` with Nanami immediately before each Korean choice;
- K3 prompt and response-choice voices must differ; the response voice is the canonical paired Korean voice;
- K4 and K5 must use Japanese `もう一度読みます` with Nanami between the two passage readings;
- Korean replay cue text is not allowed in new V21 audio;
- preissue must reject any violation before learner exposure.

The semantic Review script continues to omit control audio such as choice-number announcements and replay cues.

V21 applies prospectively only. Existing issued/committed L04 audio and history remain immutable.

## 20. Listening overload recovery V8

The learner-facing 5L remains exactly five section slots (K1-K5).

Outside overload, at most one section slot per normal 5L is a retest. When the canonical Listening state is in overload (`ACTIVE_WRONG_COUNT > ACTIVE_WRONG_CAP`), up to two different section slots may be retests in the same normal 5L. Each retest must remain in its matching section and use a new valid surface.

The preissue contract requires `H3_LISTENING_OVERLOAD_PLAN_V3` and exact agreement between the persisted `normal_retest_per_set_cap`, the planned retest sections, and the locked set payload. Any blocking overflow remains a STOP.

This is scheduler recovery only; it does not create a sixth learner-facing 5L item and does not permit Chat to issue a supplemental or normal 5L outside the dedicated learner workflow.

## 21. 5L #1 legacy Review phase-1 contract

The first valid Listening set, `H3-20260919-L02` / 5L #1, predates the Web transaction journal. Its canonical original result is 1/5 with K1○ and K2-K5×.

Phase 1 freezes a separate `LEGACY_PRE_WEB` Review source. Chat and the Web App must not create a synthetic COMMITTED transaction or synthetic TXN_ID for this set.

Future learner-facing behavior after Phase 3:

- the normal handoff remains the parameterless HOME URL;
- HOME may list 5L #1 beside normal transaction-backed Reviews;
- opening 5L #1 resolves a legacy review ID, not a TXN_ID;
- original uncertainty flags are shown as unknown because they were not recorded;
- Review and optional replay are read-only and zero-mutation.

Until Phase 2 and Phase 3 are completed, 5L #1 must not be exposed as a learner-facing persistent Review entry merely because the Phase-1 contract exists.
