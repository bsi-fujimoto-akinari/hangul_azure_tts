# Operations Policy

This document defines the source-of-truth, change, synchronization, deployment, secret-handling, tag, verification, and prohibited-operation policy for `hangul_azure_tts`.

## 1. Source of truth

- GitHub `main` is the sole source of truth for repository-managed code, manifest, workflow, and operations documentation.
- Feature branches and pull requests are change workspaces, not sources of truth.
- A local clone is a working copy, not a source of truth.
- Apps Script production is the execution environment, not the code source of truth.
- Production and baseline tags are immutable snapshot markers, not substitutes for `main`.
- Google Sheets runtime/queue/history data are separate data sources of truth and are not to be centralized into this repository.
- Script Properties are the runtime location for secrets and runtime configuration that must not be committed.

## 2. Standard change workflow

All repository-managed changes use this path:

```text
main
  -> feature branch
  -> pull request
  -> required `audit` PASS
  -> squash merge
  -> main
```

Rules:

- Direct pushes to `main` are prohibited.
- Force pushes are prohibited.
- Pull requests are required.
- Required approval count may remain zero for single-maintainer operation, but required CI must pass.
- The required status check is `audit`.
- Squash merge is the standard merge method.
- Ruleset bypass is not part of normal operation.
- A pull request should normally contain one logical change or one bounded work item.
- A merged change updates the GitHub source of truth only. It does not automatically deploy to Apps Script production.

Recommended feature branch naming:

```text
gh-<work-id>-<short-name>
```

Example: `gh-04-operations-doc`.

## 3. GitHub -> local synchronization

Normal synchronization direction is **GitHub -> local**.

```powershell
cd C:\Users\afuji\hangul_azure_tts

git status --short
git fetch origin
git branch --show-current
git pull --ff-only origin main
git rev-parse HEAD
git status --short
git log -1 --oneline
```

PASS conditions:

- Worktree is clean before synchronization.
- Current branch is `main` for normal production synchronization.
- Pull succeeds with `--ff-only`.
- Local HEAD equals GitHub `main` HEAD.
- Worktree remains clean after synchronization.

Do not use `clasp pull` in this procedure. Do not use `git reset --hard` or `git clean -fd` as normal synchronization tools. If fast-forward synchronization cannot proceed, stop and audit the divergence instead of auto-resolving it.

## 4. GitHub -> Apps Script production synchronization

Normal production direction is **GitHub -> local -> Apps Script production**.

Production synchronization is normally required when either of these files changes:

- `Code.js`
- `appsscript.json`

It is normally not required for documentation, GitHub Actions workflow changes, repository rulesets, or tag administration alone.

Pre-deploy checks:

1. Complete GitHub -> local synchronization.
2. Confirm the local worktree is clean.
3. Confirm the production-impacting diff is expected.
4. Confirm `.clasp.json` targets the intended production Apps Script project.
5. Run `clasp status` and verify only expected Apps Script files are tracked for push.
6. Confirm no secret or local-only file is part of the change.

Standard command sequence:

```powershell
cd C:\Users\afuji\hangul_azure_tts

git status --short
git rev-parse HEAD
Get-Content .clasp.json
clasp status
clasp push
git status --short
git rev-parse HEAD
```

Rules:

- Do not use `clasp pull` in the normal deploy path.
- Do not use `clasp push --force` as a normal operation.
- A successful `clasp push` means files were pushed; it does not by itself prove production verification passed.
- Record or retain the GitHub commit SHA used as the deploy source.
- GitHub Actions automatic Apps Script deployment is not adopted at this time.

## 5. Apps Script -> GitHub reverse synchronization

Reverse synchronization is an exception path only. It may be used when a legitimate production-side change must be recovered, for example after an emergency direct edit or when reconstructing missing repository state.

Before `clasp pull`:

- Worktree must be clean.
- GitHub `main` must first be synchronized locally.
- `.clasp.json` must be verified against the intended production project.
- The reverse direction must be explicitly authorized for the recovery task.

After `clasp pull`:

```text
Apps Script
  -> local diff
  -> audit
  -> feature branch
  -> pull request
  -> `audit` PASS
  -> squash merge
  -> main
```

Never assume production-side differences are correct merely because they exist. Review the diff before commit. Do not commit unexpected generated files, credentials, or local-only state.

## 6. Secrets and local-only files

Secrets and credentials must never be committed to this public repository.

Examples that belong outside GitHub include:

- Azure Speech keys
- OAuth/client secrets
- service-account or private keys
- GitHub personal access tokens
- `.clasprc.json`
- `.env`
- runtime-only secret/config values stored in Script Properties

Repository policy distinguishes:

- `.clasp.json`: repository-managed target configuration for the Apps Script project.
- `.clasprc.json`: local authentication state; never commit.

`node_modules/` and routine log files are also local-only unless a future policy explicitly changes that rule.

The repository audit is a guardrail, not a substitute for human diff review. If a secret is committed, deleting the file is not sufficient; treat the value as exposed and rotate/revoke it as appropriate.

## 7. Tags and baselines

Tags are fixed markers of verified states, not deployment mechanisms.

Policy:

- Existing production and baseline tags are immutable.
- Do not move, overwrite, delete, or reuse an existing production/baseline tag name.
- A new verified production state receives a new tag.
- Production tags should normally follow a pattern that is covered by the active tag ruleset, such as `*-prod-YYYYMMDD`.
- Baseline tags should use an explicit baseline name plus date and must also use a protected naming pattern.
- Create a production tag only after deployment and production verification have completed.
- Prefer annotated tags for production snapshots, with a message that makes the purpose traceable.
- `main` may advance beyond the most recent production tag; this is allowed as long as the difference is traceable.

Detailed rollback execution belongs to the recovery/rollback procedure. Rollback uses a tag or known commit as a reference point; it does not move the tag itself.

## 8. Production change boundary

Keep these states distinct:

```text
GitHub main
  = repository code source of truth

Apps Script production
  = code currently executing in production

Production tag
  = immutable marker of a deployed and verified production state
```

A pull request merge changes `main`; it does not by itself change production.

If `Code.js` or `appsscript.json` changes, the normal completion path is:

```text
merge to main
  -> GitHub -> local sync
  -> production target/diff verification
  -> clasp push
  -> production verification
  -> optional new production tag
```

Changes limited to `.github/**`, `OPERATIONS.md`, README/documentation, repository rulesets, or tag administration do not normally require `clasp push`.

A change to `.clasp.json` is an infrastructure-sensitive target change and must receive explicit target verification before any subsequent deploy.

Script Properties, Google Sheets data, and Azure-side configuration are outside `clasp push` and must not be treated as though a GitHub deploy changed them.

## 9. Verification checklist

For each repository change, verify as applicable:

### Pull request

- Feature branch used; no direct `main` change.
- Diff contains only the intended logical change.
- No secret, credential, or local-only file is present.
- Required `audit` status is PASS.
- Squash merge is used.
- No ruleset bypass is used.

### After merge

- GitHub `main` HEAD is read back and recorded.
- Repository CI is healthy.
- Production impact is classified by checking whether `Code.js` and/or `appsscript.json` changed.

### Local synchronization

- Worktree clean before and after sync.
- Branch is `main`.
- `git pull --ff-only` succeeds.
- Local HEAD equals GitHub `main` HEAD.

### Before production deploy, when required

- `.clasp.json` targets the intended production project.
- `clasp status` is as expected.
- Direction is GitHub -> Apps Script.
- `clasp pull` was not used in the normal deploy path.

### After production deploy, when required

- `clasp push` completes successfully.
- Pushed files are the expected Apps Script files.
- Local worktree remains clean.
- The GitHub source commit is identifiable.
- Change-specific production readback or functional verification passes.
- No unrelated Sheet, queue, audio, or runtime state is changed unintentionally.

### Tagging, when required

- Tag is created only after deploy and verification.
- Tag points to the verified commit.
- No existing production/baseline tag is moved, deleted, or reused.

Suggested final status block:

```text
GITHUB_MAIN = <commit SHA>
AUDIT = PASS
LOCAL_SYNC = PASS / NOT_REQUIRED
PRODUCTION_SYNC = PASS / NOT_REQUIRED
PRODUCTION_VERIFICATION = PASS / NOT_REQUIRED
PRODUCTION_TAG = <tag> / NOT_CREATED
SECRET_EXPOSURE = NONE
UNEXPECTED_CHANGE = NONE
```

## 10. Prohibited operations

The following are prohibited in normal operation:

- Direct push to `main`
- Force push or history rewriting as a routine fix
- Moving, deleting, or reusing an existing production/baseline tag
- Normal use of `clasp pull`
- Treating Apps Script editor direct edits as the normal development path
- `clasp push` without target and diff verification
- Committing secrets, credentials, `.clasprc.json`, `.env`, or private-key material
- Merging while required CI is failing
- Bypassing repository rulesets
- Using `git reset --hard` or `git clean -fd` as normal synchronization steps
- Unreviewed automatic conflict resolution
- Creating a production tag before production verification
- Running `clasp push` for documentation/CI-only changes
- Enabling automatic GitHub Actions production deployment without a separately approved policy change
- Rewriting history as the normal rollback method
- Moving runtime data or secrets into GitHub merely to centralize sources of truth

Recovery exceptions must be explicitly authorized and audited. Even during recovery, do not solve problems by force-pushing `main`, moving protected tags, or treating deletion of an exposed secret as sufficient remediation.

## 11. Canonical release history

Release history is interpreted by role, not by treating every commit as a release.

Canonical history classes:

- `BASELINE`: an immutable verified fallback marker.
- `PRODUCTION`: repository changes that reached Apps Script production and are represented by a verified production snapshot tag.
- `INFRASTRUCTURE`: repository CI, audit, or safety controls that do not by themselves create a production release.
- `POLICY`: operations, recovery, governance, or history documentation that does not by itself create a production release.

The normalized history through GH-07 is:

| Commit | Class | Meaning |
| --- | --- | --- |
| `e52a133eeaa48866f284b7e76a1ccfd44df4057b` | BASELINE | G1 live PASS / Listening Stage B ACTIVE historical baseline |
| `a0db5fe89416df7d4df41272e5c4bf6bc18b86f5` | PRODUCTION | Restrict web-app access to deployer only |
| `372581317bc42a486fb2873742698b5f92d65513` | INFRASTRUCTURE | Add secret-free repository audit CI |
| `73d7fb62eebc41c1c740603e1b82ff438f5c5ae7` | PRODUCTION | Preserve v4 audio compatibility and add the 2.1 s final tail |
| `67419486c6594762cf0f4582fa2ff6bb08edcab4` | PRODUCTION | Add K1 Japanese choice-number voice segments; verified production snapshot |
| `877e9fd26c8f8d4e6229fba1a5e72d152b65b32e` | INFRASTRUCTURE | Add semantic audio regression checks |
| `c83425b78449a0a1d65096a80763721bcd80abf0` | POLICY | Add source-of-truth operations policy |
| `3d6393020d87c9e96cf3fd762809156c8c3f2512` | POLICY | Add recovery and rollback procedure |

Protected snapshot markers:

```text
g1-live-pass-stageb-active-20260917
  -> e52a133eeaa48866f284b7e76a1ccfd44df4057b

k1-jp-number-audio-prod-20260917
  -> 67419486c6594762cf0f4582fa2ff6bb08edcab4
```

The production tag, not every production-affecting intermediate commit, is the canonical marker of a verified production release. The intermediate production commits remain part of traceable Git history.

`main` may contain later infrastructure or policy changes while Apps Script production remains represented by the latest verified production tag. Such a state is normal when `Code.js`, `appsscript.json`, and `.clasp.json` have not drifted from the production snapshot.

A historical baseline is a fallback reference, not a routine direct full-snapshot deployment source. Recovery must follow `RECOVERY.md`, including recovery-source selection and forward corrective history.

GitHub Release objects are optional presentation metadata and are not a source of truth. They are not required retroactively for existing tags. If adopted later, they must reference existing immutable tags rather than replace or redefine them.
