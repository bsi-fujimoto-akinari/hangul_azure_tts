# Recovery and Rollback Procedure

This document defines the incident-classification, evidence-preservation, recovery-source, repository, local, Apps Script production, reverse-recovery, wrong-target, secret-exposure, verification, and abort procedures for `hangul_azure_tts`.

`OPERATIONS.md` remains the governing source-of-truth and normal-operations policy. This document applies when recovery or rollback is required and does not replace the normal change workflow.

The normal direction remains:

```text
GitHub main
  -> local main
  -> Apps Script production
```

Recovery must preserve the repository source-of-truth model, protected history, and immutable production/baseline tags.

## 1. Recovery principles

1. Stop before changing more state.
2. Preserve evidence before cleanup or rollback.
3. Classify the incident before selecting a recovery source.
4. Use an explicitly identified commit, tag, or source; do not recover from an assumed state.
5. Keep GitHub, local, Apps Script production, credentials, and runtime data as separate surfaces.
6. Restore GitHub `main` through a recovery/fix pull request rather than by rewriting history.
7. Restore Apps Script production from GitHub through the normal GitHub -> local -> Apps Script direction whenever possible.
8. Existing production and baseline tags are immutable and are never moved as part of rollback.
9. A successful `clasp push`, successful merge, or passing CI check alone does not prove recovery is complete.
10. If a relevant state is unknown, record `UNKNOWN` and stop rather than guessing.

## 2. Incident classification

Use one or more of the following incident classes.

| Class | Name | Typical scope |
| --- | --- | --- |
| R1 | GitHub-only | Bad merge, bad commit, workflow/configuration/documentation error in GitHub |
| R2 | Local-only | Dirty/diverged/stale local clone, wrong branch, unpushed local commit |
| R3 | Production-code | Wrong or malfunctioning code deployed to Apps Script production while target identity is known |
| R4 | Reverse-recovery | Required good code exists only in Apps Script and must be recovered into GitHub |
| R5 | Target-mismatch | `.clasp.json` mismatch, wrong Apps Script project, or wrong-project deployment |
| R6 | Secret-exposure | Credential, token, key, secret, or private-key material exposed |
| R7 | Runtime-data/config | Script Properties, Google Sheets runtime data, queue/history state, Azure-side configuration, or other non-repository state |
| R8 | Multi-surface | Two or more of the above surfaces are affected at the same time |

For R8, record every applicable underlying class instead of using R8 alone.

Record at least:

```text
INCIDENT_CLASS =
GITHUB_AFFECTED = YES / NO / UNKNOWN
LOCAL_AFFECTED = YES / NO / UNKNOWN
PRODUCTION_AFFECTED = YES / NO / UNKNOWN
SECRET_EXPOSURE = YES / NO / UNKNOWN
RUNTIME_DATA_AFFECTED = YES / NO / UNKNOWN
```

### Severity

Use severity only to control recovery priority:

- `S1`: GitHub/local only; no known production, secret, or runtime-data impact.
- `S2`: production or runtime configuration affected; no known secret exposure.
- `S3`: secret exposure, wrong-target deployment, or multi-surface impact with potential for further damage.

Severity is not a quality score. It exists only to determine containment and recovery order.

## 3. Recovery source selection

Select a recovery source only after incident classification and evidence preservation.

Preferred order when applicable:

1. Current GitHub `main`, if the repository source of truth is known good.
2. Latest verified production tag, if `main` is not safe for the affected production files.
3. An explicitly identified known-good commit.
4. A baseline tag, only when the newer verified states are not suitable.
5. Apps Script production state, only for an explicitly authorized R4 reverse-recovery exception.

Do not assume that a newer commit is safer merely because it is newer.

Do not use a production tag merely because it exists. Confirm that the tag represents a known-good state for the affected behavior.

A baseline tag is a fallback reference, not the default rollback target.

Record:

```text
RECOVERY_SOURCE_TYPE = MAIN / PROD_TAG / COMMIT / BASELINE_TAG / APPS_SCRIPT_EXCEPTION
RECOVERY_SOURCE = <ref or SHA>
RECOVERY_SOURCE_REASON = <short reason>
```

If the recovery source cannot be selected confidently, stop and return to evidence collection.

## 4. Stop and preserve evidence

Before recovery changes:

1. Stop merges, deploys, tag creation, `clasp push`, and `clasp pull` for the affected path.
2. Record the current GitHub `main` SHA.
3. Record relevant production and baseline tag refs.
4. Record the suspected bad commit or pull request when known.
5. Record the local branch, local HEAD, and worktree status.
6. Record `.clasp.json` target identity and `clasp status` when Apps Script is relevant.
7. Record the last known deploy source SHA/tag when known.
8. Record relevant CI run/check status.
9. Record secret type/location without copying the secret value.
10. Record runtime-data impact separately from code impact.

Suggested local read-only checks:

```powershell
cd C:\Users\afuji\hangul_azure_tts

git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline

Get-Content .clasp.json
clasp status
```

At this phase, do not run `git pull`, `git reset`, `git clean`, `clasp push`, or `clasp pull` merely to make the state look clean.

Minimum incident evidence record:

```text
INCIDENT_CLASS =
SEVERITY =
GITHUB_MAIN_HEAD =
LATEST_PRODUCTION_TAG =
BASELINE_TAG =
LOCAL_BRANCH =
LOCAL_HEAD =
LOCAL_WORKTREE = CLEAN / DIRTY / UNKNOWN
CLASP_SCRIPT_ID =
CLASP_STATUS =
PRODUCTION_SOURCE_COMMIT =
PRODUCTION_STATE = KNOWN_GOOD / KNOWN_BAD / UNKNOWN
SECRET_EXPOSURE = YES / NO / UNKNOWN
RUNTIME_DATA_AFFECTED = YES / NO / UNKNOWN
RECOVERY_SOURCE =
RECOVERY_DIRECTION =
```

## 5. GitHub repository recovery

GitHub recovery is a forward corrective change. Do not move `main` backward by force.

Standard flow:

```text
evidence preserved
  -> recovery source selected
  -> current main synchronized locally
  -> recovery branch
  -> revert or forward fix
  -> diff audit
  -> pull request
  -> required audit PASS
  -> squash merge
  -> read back new main HEAD
```

Recommended branch naming:

```text
gh-05-recovery-<short-name>
```

### Revert

Prefer revert when a bounded bad change can be removed safely as a unit.

Example:

```powershell
cd C:\Users\afuji\hangul_azure_tts

git status --short
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c gh-05-recovery-<short-name>
git revert <BAD_COMMIT_SHA>
git status --short
git diff origin/main...HEAD
git log --oneline origin/main..HEAD
```

Push the recovery branch and use a pull request. Do not push directly to `main`.

### Forward fix

Prefer a forward fix when the bad commit also contains changes that must be kept, or when reverting the whole commit would break unrelated behavior.

### Control-plane failure

If the required `audit` check itself cannot run, record:

```text
RECOVERY_STATE = BLOCKED_BY_CONTROL_PLANE
```

Do not silently disable required checks or bypass repository protection. Any control-plane repair must be explicit, temporary, separately audited, and followed by restoration of the normal protection state.

## 6. Local repository recovery

The local clone is a working copy, not a source of truth.

### Clean stale local copy

When the local worktree is clean and GitHub `main` is known good:

```powershell
cd C:\Users\afuji\hangul_azure_tts

git status --short
git branch --show-current
git rev-parse HEAD
git fetch origin
git switch main
git pull --ff-only origin main
git rev-parse HEAD
git status --short
git log -1 --oneline
```

PASS conditions:

```text
LOCAL_BRANCH = main
LOCAL_HEAD = GITHUB_MAIN_HEAD
LOCAL_WORKTREE = CLEAN
```

### Dirty worktree

Do not destroy dirty worktree changes. First record:

```powershell
git status --short
git diff
git diff --staged
git ls-files --others --exclude-standard
```

Classify the differences as legitimate work, clearly disposable work, local-only/credential state, or unknown.

Unknown differences are a STOP condition.

### Local-only commits

Check:

```powershell
git log --oneline origin/main..HEAD
```

Do not erase local-only commits automatically. Preserve legitimate work on a dedicated feature/recovery branch and route it through review.

### Divergence

If both local and remote have unique commits, record:

```text
LOCAL_RECOVERY_STATE = DIVERGED
```

Do not auto-merge, auto-rebase, force-push, or use `git reset --hard` as the standard recovery action. Audit both sides first.

## 7. Apps Script production rollback

Production rollback normally restores production from a recovered GitHub `main`.

Standard flow:

```text
evidence preserved
  -> recovery source selected
  -> GitHub main corrected if necessary
  -> local main synchronized
  -> .clasp.json verified
  -> clasp status verified
  -> production-impacting diff verified
  -> clasp push
  -> production readback / functional verification
  -> optional new production tag after verification
```

Before deploy:

```powershell
cd C:\Users\afuji\hangul_azure_tts

git status --short
git branch --show-current
git rev-parse HEAD
Get-Content .clasp.json
clasp status
```

Required preconditions:

```text
LOCAL_BRANCH = main
LOCAL_HEAD = RECOVERED_GITHUB_MAIN
LOCAL_WORKTREE = CLEAN
CLASP_TARGET = VERIFIED
```

Then, and only then:

```powershell
clasp push
```

The direction is:

```text
GitHub main
  -> local main
  -> Apps Script production
```

A successful `clasp push` is not sufficient. Complete change-specific production verification before declaring recovery complete.

Do not use an old tag or detached HEAD as a routine direct deployment source. If `main` must return to code represented by a known-good historical ref, first restore the required repository-managed files through a recovery pull request so that `main` again reflects the intended production source.

### Emergency direct rollback

A direct temporary rollback from a historical ref before repairing `main` is not part of the standard procedure. If such an emergency mode is ever adopted, it must be separately defined and explicitly authorized, with immediate reconciliation back to `main`.

### Tags after rollback

Never move the old production tag. If the recovered deployment is to receive a production snapshot marker, create a new production tag only after production verification passes.

## 8. Reverse recovery exception

`clasp pull` is an exception path only. Use it only when a legitimate required state exists in Apps Script but not in GitHub, or when Apps Script state must be recovered for evidence and reconstruction.

Before `clasp pull`:

1. Preserve incident evidence.
2. Confirm GitHub `main` is synchronized and known.
3. Confirm the local worktree is clean.
4. Verify `.clasp.json` against the intended Apps Script project.
5. Explicitly authorize reverse recovery.
6. Create a dedicated recovery branch before pulling.

Example:

```powershell
cd C:\Users\afuji\hangul_azure_tts

git status --short
git fetch origin
git switch main
git pull --ff-only origin main
git status --short
git rev-parse HEAD
git switch -c gh-05-recovery-<short-name>
Get-Content .clasp.json
clasp status
clasp pull
git status --short
git diff -- Code.js appsscript.json
```

After pull, audit:

```text
EXPECTED_FILES = Code.js / appsscript.json
SECRET_EXPOSURE = NONE
UNEXPECTED_FILE = NONE
MANIFEST_CHANGE = EXPECTED / NONE
CODE_CHANGE = EXPECTED / NONE
CLASP_TARGET = VERIFIED
```

Unexpected files, credentials, manifest changes, or target uncertainty are STOP conditions.

Apps Script differences are recovery candidates, not automatically correct source-of-truth content.

Approved recovered differences must return through:

```text
recovery branch
  -> pull request
  -> audit PASS
  -> squash merge
  -> main
```

If production must then be synchronized, return to the normal GitHub -> local -> Apps Script direction.

## 9. Wrong target and `.clasp.json` incidents

Treat target incidents separately from ordinary production-code rollback.

### Cases

- Pre-deploy mismatch: target mismatch detected before push. Stop; do not deploy.
- Local-only mismatch: local `.clasp.json` differs from GitHub `main`. Recover local state from the verified repository state.
- Repository mismatch: GitHub `main` contains the wrong target. Correct through a recovery pull request before any deployment.
- Wrong-project push: code was actually pushed to a different Apps Script project. Treat as S3.
- Target unknown: actual deployment destination cannot be established. Stop all Apps Script changes until identified.

Record:

```text
INCIDENT_CLASS = R5
EXPECTED_SCRIPT_ID =
LOCAL_SCRIPT_ID =
GITHUB_SCRIPT_ID =
ACTUAL_PUSH_TARGET =
PUSH_OCCURRED = YES / NO / UNKNOWN
WRONG_PROJECT_AFFECTED = YES / NO / UNKNOWN
INTENDED_PRODUCTION_AFFECTED = YES / NO / UNKNOWN
RECOVERY_SOURCE_WRONG_PROJECT =
RECOVERY_SOURCE_PRODUCTION =
```

If a wrong-project push occurred, recover the wrong project from that project's own authoritative recovery source. Do not assume this repository's production tag or code is valid for the unrelated project.

Handle the intended production separately. If it was not changed and is already correct, do not deploy merely because a wrong-target incident occurred elsewhere.

Do not commit `.clasprc.json` or other local authentication state while diagnosing target incidents.

## 10. Secret exposure recovery

If a credential or secret is committed or otherwise published, treat the value as exposed. Deleting it from the current file is not sufficient.

### Exposure classes

- I1: suspected exposure, not yet confirmed.
- I2: local-only, never pushed.
- I3: pushed to a public branch or pull request.
- I4: present in `main` or Git history.
- I5: exposed through a secondary surface such as an Actions log, artifact, PR/issue text, or review comment.
- I6: multiple related credentials or tokens affected.

### Required order

```text
detect
  -> do not repeat the secret value
  -> identify credential type and exposure surface
  -> revoke / rotate
  -> remove live repository reference where necessary
  -> store replacement only in the approved secret store
  -> audit secondary surfaces
  -> verify replacement works
  -> verify old credential no longer works
  -> decide separately whether history remediation is required
```

Rotation or revocation takes priority over code cleanup.

Approved locations depend on the credential type and may include Script Properties or provider-managed/GitHub-managed secret storage. `.clasprc.json` remains local-only.

When recording the incident, store the secret type and location, not the secret value.

### History rewrite

History rewrite is not an automatic GH-05 recovery action. The normal recovery target is:

```text
SECRET_INVALIDATED = YES
CURRENT_TREE_CLEAN = YES
HISTORY_REWRITE = NOT_PERFORMED
```

If sensitive-history purge is separately required, treat it as a distinct high-impact incident procedure because it can change commit SHAs and disrupt tag/history traceability. Rotation remains mandatory even if history is rewritten.

### Secondary exposure surfaces

Check as applicable:

```text
SOURCE_CODE
GIT_HISTORY
PR / ISSUE TEXT
REVIEW COMMENT
ACTIONS LOG
ARTIFACT
OTHER PUBLIC OUTPUT
```

For each, record `EXPOSED`, `CLEAN`, or `UNKNOWN`.

## 11. Rollback verification checklist

Every recovery item is classified as:

```text
PASS
NOT_REQUIRED
FAIL
UNKNOWN
```

Required verification areas:

| ID | Area | PASS condition |
| --- | --- | --- |
| J1 | Incident scope | Incident class, severity, and affected surfaces established |
| J2 | Evidence preservation | Pre-recovery HEAD/tag/diff/target evidence recorded |
| J3 | Recovery source | Recovery ref/source uniquely identified |
| J4 | GitHub recovery | If required, recovery/fix PR merged through audit PASS and squash |
| J5 | GitHub main | Post-recovery main HEAD read back and expected |
| J6 | Local recovery | Local main clean and equal to GitHub main |
| J7 | Target verification | `.clasp.json` and `clasp status` match intended project |
| J8 | Production sync | If required, GitHub -> local -> Apps Script push succeeded |
| J9 | Production verification | Change-specific production verification passed |
| J10 | Reverse recovery | If used, pulled diff audited and GitHub source of truth restored |
| J11 | Wrong target | If applicable, wrong and intended projects both resolved |
| J12 | Secret recovery | If applicable, old credential invalid and replacement verified |
| J13 | Runtime data | No unintended runtime-data/config impact, or separate recovery completed |
| J14 | Tags | Existing production/baseline tags unchanged |
| J15 | Unexpected change | No unrelated changes remain |

Recovery can be marked complete only when all required items are `PASS`, inapplicable items are `NOT_REQUIRED`, and there are no `FAIL` or `UNKNOWN` results.

Suggested final recovery record:

```text
INCIDENT_CLASS =
SEVERITY =
RECOVERY_SOURCE =
RECOVERY_METHOD =
GITHUB_MAIN =
AUDIT = PASS / NOT_REQUIRED
LOCAL_SYNC = PASS / NOT_REQUIRED
LOCAL_HEAD =
LOCAL_WORKTREE = CLEAN / NOT_REQUIRED
CLASP_TARGET_VERIFIED = PASS / NOT_REQUIRED
PRODUCTION_SYNC = PASS / NOT_REQUIRED
PRODUCTION_VERIFICATION = PASS / NOT_REQUIRED
REVERSE_RECOVERY = PASS / NOT_REQUIRED
WRONG_TARGET_RECOVERY = PASS / NOT_REQUIRED
SECRET_RECOVERY = PASS / NOT_REQUIRED
RUNTIME_DATA_RECOVERY = PASS / NOT_REQUIRED
PRODUCTION_TAG = <new tag> / NOT_CREATED
EXISTING_TAG_MUTATION = NONE
SECRET_EXPOSURE = NONE / RESOLVED
UNEXPECTED_CHANGE = NONE
RECOVERY_VERIFICATION = PASS
```

If any relevant state remains unknown, use:

```text
RECOVERY_VERIFICATION = INCOMPLETE
```

## 12. Failure and abort conditions

Use these states:

- `STOP`: pause the current procedure while preserving state for investigation.
- `BLOCKED`: an external dependency, permission, target, credential, or control-plane condition prevents safe continuation.
- `ABORT`: the selected recovery plan or recovery source is no longer valid and must be reclassified.

### Mandatory STOP conditions

Stop when any of the following is true:

- Recovery source is not uniquely identified.
- Unexpected GitHub diff is present.
- Required `audit` fails.
- Pull-request base/head no longer matches the reviewed state.
- Local worktree contains unknown unpreserved changes.
- Local and remote histories diverge and have not been audited.
- `.clasp.json` target is wrong or uncertain.
- `clasp status` is unexpected.
- Actual production push target or pushed content is unknown.
- Production verification fails.
- Reverse recovery produces unexpected files, credentials, or manifest changes.
- Wrong-project deployment target or its recovery source is unknown.
- Secret exposure is suspected and credential status is not yet known.
- Runtime data/config side effects are suspected and unresolved.
- Production/baseline tag target appears inconsistent or changed unexpectedly.
- Pre-recovery evidence is insufficient to understand the current state.

### BLOCKED examples

```text
CONTROL_PLANE_BLOCKED
TARGET_RECOVERY_BLOCKED
SECRET_RECOVERY_BLOCKED
PRODUCTION_VERIFICATION_BLOCKED
```

Do not bypass protections merely to escape a blocked state.

### ABORT conditions

Abort the current plan when:

- the selected recovery source is discovered to be bad,
- incident scope expands materially,
- a single-surface incident becomes multi-surface,
- a supposedly safe production tag is no longer supported by evidence,
- wrong-target or secret exposure is newly discovered,
- or recovery causes additional unexpected change.

Then:

```text
ABORT CURRENT PLAN
  -> stop additional mutations
  -> preserve the new evidence state
  -> reclassify incident
  -> reselect recovery source
```

### Restart conditions

Recovery may restart only when:

```text
INCIDENT_CLASS = CONFIRMED
RECOVERY_SOURCE = CONFIRMED
GITHUB_STATE = KNOWN
LOCAL_STATE = KNOWN
CLASP_TARGET = VERIFIED / NOT_REQUIRED
SECRET_STATUS = KNOWN
UNEXPECTED_DIFF = NONE
```

For production work, also require:

```text
PRODUCTION_DIRECTION = GitHub -> Apps Script
PRODUCTION_TARGET = VERIFIED
```

## 13. Operations prohibited during recovery

The following remain prohibited during ordinary recovery:

- direct push to `main`,
- force push,
- routine history rewriting,
- moving, deleting, overwriting, or reusing an existing production/baseline tag,
- ruleset bypass as a normal recovery shortcut,
- merging with required CI failing,
- unreviewed automatic conflict resolution,
- `git reset --hard` or `git clean -fd` as a routine cleanup step,
- deploying from an unknown/dirty local state,
- `clasp push` without target and diff verification,
- `clasp push --force` as a routine rollback method,
- unauthorized `clasp pull`,
- treating direct Apps Script editor changes as the normal fix path,
- committing `.clasprc.json`, `.env`, credentials, private keys, or runtime secrets,
- treating deletion of an exposed secret as sufficient remediation,
- using documentation/CI-only changes as a reason to run `clasp push`,
- assuming a code rollback also restores Script Properties, Sheets data, Azure configuration, or other runtime state.

## 14. Recovery completion

Recovery is complete only when the relevant source-of-truth, local, production, credential, target, runtime-data, tag, and verification states are all resolved or explicitly `NOT_REQUIRED`.

A final report should identify the recovery source, recovery method, resulting GitHub `main` SHA, CI result, local state, production sync/verification state, target state, secret state, tag state, and any remaining unexpected change.

If uncertainty remains, the correct final state is `INCOMPLETE`, not a guessed `PASS`.
