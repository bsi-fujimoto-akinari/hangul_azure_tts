#!/usr/bin/env python3
"""Impact selector for .github/workflows/repository-audit.yml.

Fail-safe rules:
- unknown/missing dependency metadata => RUN
- diff failure/empty diff/unsupported event => full audit
- selector/workflow self-change => full audit
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
import sys

WORKFLOW_PATH = ".github/workflows/repository-audit.yml"
HELPER_PATH = ".github/scripts/repository_audit_impact.py"
OPERATIONS_PATH = "OPERATIONS.md"

FORCE_FULL_FILES = {
    WORKFLOW_PATH,
    HELPER_PATH,
}

UNCONDITIONAL_STEPS = {
    "Checkout",
    "Detect repository audit impact",
    "Verify tracked-file allowlist",
    "Reject credential files and likely embedded secrets",
    "Audit repository access fast-path contract",
}

DEPENDENCIES = json.loads(r'''{
  "Checkout": [],
  "Verify tracked-file allowlist": [
    ".clasp.json",
    ".github/workflows/apps-script-auto-sync.yml",
    ".github/workflows/family-scheduler-f3-shadow-audit.yml",
    ".github/workflows/repository-audit.yml",
    ".github/scripts/drive_raw_text_replace_helper.py",
    ".github/workflows/rs10-soft-signal-audit.yml",
    ".github/workflows/rs12-prospective-evidence-audit.yml",
    ".github/workflows/rs13-real-data-shadow-audit.yml",
    ".github/workflows/rs13e-concept-authoring-audit.yml",
    ".github/workflows/rs13g-gate-reporter-audit.yml",
    ".github/workflows/rs13k1-k1-secondary-authority-audit.yml",
    ".github/workflows/rs13k1a-authoring-helper-audit.yml",
    ".github/workflows/rs14p-limited-live-preflight-audit.yml",
    ".gitignore",
    "Client.html",
    "Code.js",
    "H3_2026_NEWFMT_SOURCE_CONTRACT.md",
    "H3_JUN2_TAXONOMY_CONTRACT.md",
    "H3_LEARNING_SURFACE_CONTRACT.md",
    "H3_LEVEL_RUNTIME_CONTRACT.md",
    "H3_NEWFMT_LEVEL_CONTRACT.md",
    "H3_READING_ACTIVATION_CONTRACT.md",
    "H3_READING_P8_PILOT_CONTRACT.md",
    "H3_READING_P9_P10_PILOT_CONTRACT.md",
    "H3_READING_PRODUCTION_CONTRACT.md",
    "H3_REVIEW_ARCHITECTURE.md",
    "H3_REVIEW_EXPLANATION_STYLE_CONTRACT.md",
    "H3_RS10_SOFT_SIGNAL_CONTRACT.md",
    "H3_RS12_PROSPECTIVE_EVIDENCE_CONTRACT.md",
    "H3_RS13E_CONCEPT_AUTHORING_CONTRACT.md",
    "H3_RS13G_GATE_REPORTER_CONTRACT.md",
    "H3_RS13K1A_K1_AUTHORITY_AUTHORING_HELPER_CONTRACT.md",
    "H3_RS13K1_K1_SECONDARY_AUTHORITY_CONTRACT.md",
    "H3_RS13_REAL_DATA_SHADOW_CONTRACT.md",
    "H3_RS14P_LIMITED_LIVE_PREFLIGHT_CONTRACT.md",
    "H3_SURFACE_REVIEW_BRIDGE_CONTRACT.md",
    "H3_TRANSLATION_ACTIVATION_CONTRACT.md",
    "H3_TRANSLATION_P11_P12_PILOT_CONTRACT.md",
    "H3_TRANSLATION_PRODUCTION_CONTRACT.md",
    "H3_TRANSLATION_V2_RUNTIME_CONTRACT.md",
    "H3_WEB_CHAT_CONTRACT.md",
    "H3_WRITTEN_NEWFMT_RUNTIME_CONTRACT.md",
    "Index.html",
    "ListeningBackendOrchestrator.js",
    "OPERATIONS.md",
    "RECOVERY.md",
    "ReviewAudioBackfill.js",
    "Stylesheet.html",
    "WebApp.js",
    "WebAppConceptAuthoring.js",
    "WebAppFamilyScheduler.js",
    "WebAppFamilySchedulerPreparation.js",
    "WebAppFixture.js",
    "WebAppFormatCommon.js",
    "WebAppFormatCommonAudit.js",
    "WebAppJun2Taxonomy.js",
    "WebAppJun2TaxonomyAudit.js",
    "WebAppK1SecondaryAuthority.js",
    "WebAppLevelCommon.js",
    "WebAppLevelCommonAudit.js",
    "WebAppLiveSmoke.js",
    "WebAppMultiSkillEvidence.js",
    "WebAppMultiSkillShadow.js",
    "WebAppObservability.js",
    "WebAppPreissue.js",
    "WebAppProduction.js",
    "WebAppProductionRender.js",
    "WebAppReadingActivation.js",
    "WebAppReadingActivationAudit.js",
    "WebAppReadingPilot.js",
    "WebAppReadingPilotAudit.js",
    "WebAppReadingProduction.js",
    "WebAppReadingSchedulerProjection.js",
    "WebAppReceipt.js",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewPersistence.js",
    "WebAppReviewWrittenAdapter.js",
    "WebAppRs13GateReporter.js",
    "WebAppRtSoftSignal.js",
    "WebAppRtSoftSignalPreflight.js",
    "WebAppSurfaceCommon.js",
    "WebAppSurfaceCommonAudit.js",
    "WebAppSurfaceReviewBridge.js",
    "WebAppSurfaceReviewBridgeAudit.js",
    "WebAppTransactionCommon.js",
    "WebAppTranslationActivation.js",
    "WebAppTranslationActivationAudit.js",
    "WebAppTranslationPilot.js",
    "WebAppTranslationPilotAudit.js",
    "WebAppTranslationProduction.js",
    "WebAppTranslationV2.js",
    "WebAppTranslationV2Audit.js",
    "WebAppTranslationV2Production.js",
    "WebAppWrittenAnswerSync.js",
    "WebAppWrittenNewfmt.js",
    "WebAppWrittenNewfmtAudit.js",
    "WebAppWrittenProduction.js",
    "appsscript.json"
  ],
  "Audit canonical four-Phase code-change workflow contract": [
    "OPERATIONS.md"
  ],
  "Audit Drive raw TXT replace helper contract": [
    ".github/scripts/drive_raw_text_replace_helper.py",
    "OPERATIONS.md"
  ],
  "Verify credentialed Apps Script execution boundaries": [
    ".github/workflows/apps-script-auto-sync.yml",
    "OPERATIONS.md"
  ],
  "Audit automatic read-only live smoke contract": [
    ".github/workflows/apps-script-auto-sync.yml",
    "WebAppLiveSmoke.js"
  ],
  "Audit structured Web runtime observability contract": [
    "Client.html",
    "WebApp.js",
    "WebAppFamilyScheduler.js",
    "WebAppObservability.js",
    "appsscript.json"
  ],
  "Reject credential files and likely embedded secrets": [
    ".github/workflows/repository-audit.yml"
  ],
  "Verify gitignore protections": [
    ".gitignore"
  ],
  "Verify clasp target": [
    ".clasp.json"
  ],
  "Verify Apps Script manifest policy": [
    "appsscript.json"
  ],
  "Check SYSTEM_TEST transaction isolation": [
    "Client.html",
    "Index.html",
    "WebApp.js",
    "WebAppFixture.js"
  ],
  "Check production transaction and scheduler contract": [
    "Client.html",
    "WebApp.js",
    "WebAppFixture.js",
    "WebAppProduction.js"
  ],
  "Check Web receipt and targeted dispatch": [
    "Code.js",
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md",
    "WebApp.js",
    "WebAppProduction.js",
    "WebAppReceipt.js"
  ],
  "Check production rendering and source-lock": [
    "Code.js",
    "WebApp.js",
    "WebAppProduction.js",
    "WebAppProductionRender.js",
    "WebAppSurfaceCommon.js"
  ],
  "Check audio storage slim-down invariants": [
    "Code.js"
  ],
  "Check allowlisted SYSTEM_TEST fixture": [
    "Code.js",
    "WebApp.js",
    "WebAppFixture.js",
    "WebAppProduction.js"
  ],
  "Check production preissue gate": [
    "WebApp.js",
    "WebAppPreissue.js",
    "WebAppProduction.js"
  ],
  "Check normal-live production gate": [
    "WebAppPreissue.js",
    "WebAppProduction.js",
    "WebAppProductionRender.js"
  ],
  "Check production client mode routing": [
    "Client.html"
  ],
  "Check transaction provenance binder": [
    "WebAppProduction.js"
  ],
  "Check persistent Review storage and source-lock": [
    "OPERATIONS.md",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewPersistence.js"
  ],
  "Check Review HOME core extraction parity": [
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewPersistence.js"
  ],
  "Check Written Review projection and provider routing": [
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewWrittenAdapter.js"
  ],
  "Check production Written persistent Review loader": [
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewPersistence.js",
    "WebAppReviewWrittenAdapter.js"
  ],
  "Check production Written HOME and Review UI": [
    "Client.html",
    "Stylesheet.html",
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewPersistence.js",
    "WebAppReviewWrittenAdapter.js"
  ],
  "Check persistent Review routes and Web UI": [
    "Client.html",
    "H3_REVIEW_ARCHITECTURE.md",
    "H3_WEB_CHAT_CONTRACT.md",
    "Index.html",
    "OPERATIONS.md",
    "Stylesheet.html",
    "WebApp.js",
    "WebAppProductionRender.js",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewPersistence.js"
  ],
  "Check Review history index isolation": [
    "WebAppReviewPersistence.js"
  ],
  "Check UTF-8 Review hashing": [
    "Code.js",
    "WebAppPreissue.js",
    "WebAppReviewCore.js"
  ],
  "Check REVIEW_REPLAY retirement contract": [
    "Client.html",
    "H3_REVIEW_ARCHITECTURE.md",
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md",
    "WebApp.js",
    "WebAppReviewListeningAdapter.js"
  ],
  "Check current Review learner UI": [
    "Client.html",
    "H3_REVIEW_ARCHITECTURE.md",
    "H3_WEB_CHAT_CONTRACT.md",
    "Index.html",
    "OPERATIONS.md",
    "Stylesheet.html"
  ],
  "Check Written 5W explanation overlay boundary": [
    "Client.html",
    "H3_REVIEW_ARCHITECTURE.md",
    "Stylesheet.html",
    "WebAppReviewCore.js",
    "WebAppReviewPersistence.js",
    "WebAppReviewWrittenAdapter.js"
  ],
  "Check Written 5W ANSWERED_AT backfill boundary": [
    "H3_REVIEW_ARCHITECTURE.md",
    "WebAppReviewCore.js",
    "WebAppReviewPersistence.js",
    "WebAppReviewWrittenAdapter.js"
  ],
  "Check scheduler overload V3 behavior": [
    "WebAppPreissue.js",
    "WebAppProduction.js"
  ],
  "Check learner URL authority": [
    "Client.html",
    "Code.js",
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md",
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewPersistence.js"
  ],
  "Check parameterless direct boot": [
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md",
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewPersistence.js"
  ],
  "Check Listening audio reliability V21": [
    "Client.html",
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md",
    "WebAppPreissue.js",
    "WebAppProductionRender.js"
  ],
  "Check official Listening audio parity V21": [
    "Code.js",
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md",
    "WebAppPreissue.js",
    "WebAppProductionRender.js"
  ],
  "Check durable legacy Review compatibility": [
    "Client.html",
    "H3_REVIEW_ARCHITECTURE.md",
    "OPERATIONS.md",
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewPersistence.js"
  ],
  "Check minimal learner-facing Chat output contract": [
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md"
  ],
  "Check 5L audio set fast path": [
    "Code.js"
  ],
  "Check H3 normal hot-path invariants": [
    "Code.js",
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md",
    "WebAppPreissue.js"
  ],
  "Check production 5W current-learning render": [
    "Client.html",
    "H3_WEB_CHAT_CONTRACT.md",
    "OPERATIONS.md",
    "Stylesheet.html",
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewWrittenAdapter.js",
    "WebAppSurfaceCommon.js",
    "WebAppWrittenProduction.js"
  ],
  "Check production 5W Web transaction D3": [
    "Client.html",
    "WebApp.js",
    "WebAppProduction.js",
    "WebAppReceipt.js",
    "WebAppSurfaceCommon.js",
    "WebAppTransactionCommon.js",
    "WebAppWrittenProduction.js"
  ],
  "Check 5W Answer Sync production": [
    "WebApp.js",
    "WebAppFormatCommon.js",
    "WebAppLevelCommon.js",
    "WebAppWrittenAnswerSync.js",
    "WebAppWrittenNewfmt.js",
    "WebAppWrittenProduction.js"
  ],
  "Check Listening audio source attestation": [
    "Code.js"
  ],
  "Check Listening backend orchestrator": [
    "Code.js",
    "ListeningBackendOrchestrator.js",
    "WebAppPreissue.js"
  ],
  "Check staged P8 Reading pilot": [
    "Client.html",
    "H3_READING_ACTIVATION_CONTRACT.md",
    "H3_READING_P8_PILOT_CONTRACT.md",
    "H3_READING_P9_P10_PILOT_CONTRACT.md",
    "H3_READING_PRODUCTION_CONTRACT.md",
    "Stylesheet.html",
    "WebApp.js",
    "WebAppReadingActivation.js",
    "WebAppReadingActivationAudit.js",
    "WebAppReadingPilot.js",
    "WebAppReadingPilotAudit.js",
    "WebAppReadingProduction.js",
    "WebAppSurfaceCommon.js"
  ],
  "Check staged P11/P12 Translation pilot": [
    "Client.html",
    "H3_TRANSLATION_ACTIVATION_CONTRACT.md",
    "H3_TRANSLATION_P11_P12_PILOT_CONTRACT.md",
    "H3_TRANSLATION_PRODUCTION_CONTRACT.md",
    "WebApp.js",
    "WebAppSurfaceCommon.js",
    "WebAppTranslationActivation.js",
    "WebAppTranslationActivationAudit.js",
    "WebAppTranslationPilot.js",
    "WebAppTranslationPilotAudit.js",
    "WebAppTranslationProduction.js"
  ],
  "Check F1 Reading Translation Review bridge": [
    "Client.html",
    "H3_SURFACE_REVIEW_BRIDGE_CONTRACT.md",
    "WebAppReadingPilot.js",
    "WebAppReadingPilotAudit.js",
    "WebAppReviewCore.js",
    "WebAppReviewPersistence.js",
    "WebAppReviewWrittenAdapter.js",
    "WebAppSurfaceCommon.js",
    "WebAppSurfaceReviewBridge.js",
    "WebAppSurfaceReviewBridgeAudit.js",
    "WebAppTranslationPilot.js",
    "WebAppTranslationPilotAudit.js"
  ],
  "Check independent level runtime boundary": [
    "H3_LEARNING_SURFACE_CONTRACT.md",
    "H3_LEVEL_RUNTIME_CONTRACT.md",
    "WebAppLevelCommon.js",
    "WebAppLevelCommonAudit.js"
  ],
  "Check source-bound 準2級 taxonomy master": [
    "H3_JUN2_TAXONOMY_CONTRACT.md",
    "H3_LEVEL_RUNTIME_CONTRACT.md",
    "WebAppFormatCommon.js",
    "WebAppJun2Taxonomy.js",
    "WebAppJun2TaxonomyAudit.js",
    "WebAppLevelCommon.js"
  ],
  "Check source-bound 2026 new-format registry": [
    "H3_2026_NEWFMT_SOURCE_CONTRACT.md",
    "H3_NEWFMT_LEVEL_CONTRACT.md",
    "WebAppFormatCommon.js",
    "WebAppFormatCommonAudit.js",
    "WebAppLevelCommon.js"
  ],
  "Check 3級 NEWFMT written runtime": [
    "H3_WRITTEN_NEWFMT_RUNTIME_CONTRACT.md",
    "WebAppFormatCommon.js",
    "WebAppLevelCommon.js",
    "WebAppWrittenAnswerSync.js",
    "WebAppWrittenNewfmt.js",
    "WebAppWrittenNewfmtAudit.js"
  ],
  "Audit E5-B Review audio binding contract": [
    "H3_REVIEW_ARCHITECTURE.md",
    "WebAppReviewCore.js"
  ],
  "Audit E5-C 5W Review audio embedding": [
    "Client.html",
    "H3_REVIEW_ARCHITECTURE.md",
    "WebAppReviewCore.js",
    "WebAppReviewPersistence.js",
    "WebAppReviewWrittenAdapter.js"
  ],
  "Audit E5-D 2R Review audio embedding": [
    "Client.html",
    "H3_REVIEW_ARCHITECTURE.md",
    "WebAppReviewCore.js",
    "WebAppReviewWrittenAdapter.js",
    "WebAppSurfaceReviewBridge.js"
  ],
  "Audit E5-E 2T Review audio embedding": [
    "Client.html",
    "H3_REVIEW_ARCHITECTURE.md",
    "WebAppReviewCore.js",
    "WebAppReviewWrittenAdapter.js",
    "WebAppSurfaceReviewBridge.js"
  ],
  "Audit T003 body_ja register parity": [
    "WebAppSurfaceReviewBridge.js"
  ],
  "Audit learner-facing Japanese quality corrections": [
    "H3_REVIEW_ARCHITECTURE.md",
    "WebAppReviewPersistence.js"
  ],
  "Audit D6 Japanese dialogue presentation": [
    "H3_REVIEW_ARCHITECTURE.md",
    "WebAppReviewPersistence.js"
  ],
  "Audit E5-G Review audio close contract": [
    "H3_REVIEW_ARCHITECTURE.md",
    "WebAppReviewCore.js",
    "WebAppReviewWrittenAdapter.js"
  ],
  "Audit UXR-2B 5W Review content repair": [
    "ReviewAudioBackfill.js",
    "WebAppReviewPersistence.js",
    "WebAppSurfaceCommon.js",
    "WebAppWrittenProduction.js"
  ],
  "Audit UXR-4 question Review navigation media": [
    "Client.html",
    "Stylesheet.html",
    "WebAppProductionRender.js",
    "WebAppReadingPilot.js",
    "WebAppTranslationV2.js",
    "WebAppWrittenProduction.js"
  ],
  "Audit UXR-5 shared navigation and Review permalinks": [
    "Client.html",
    "Code.js",
    "H3_REVIEW_ARCHITECTURE.md",
    "Index.html",
    "Stylesheet.html",
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewPersistence.js",
    "WebAppSurfaceReviewBridge.js"
  ],
  "Check JavaScript syntax": [
    "Client.html",
    "Code.js",
    "ListeningBackendOrchestrator.js",
    "ReviewAudioBackfill.js",
    "WebApp.js",
    "WebAppConceptAuthoring.js",
    "WebAppFamilyScheduler.js",
    "WebAppFamilySchedulerPreparation.js",
    "WebAppFixture.js",
    "WebAppFormatCommon.js",
    "WebAppFormatCommonAudit.js",
    "WebAppJun2Taxonomy.js",
    "WebAppJun2TaxonomyAudit.js",
    "WebAppK1SecondaryAuthority.js",
    "WebAppLevelCommon.js",
    "WebAppLevelCommonAudit.js",
    "WebAppLiveSmoke.js",
    "WebAppMultiSkillEvidence.js",
    "WebAppMultiSkillShadow.js",
    "WebAppObservability.js",
    "WebAppPreissue.js",
    "WebAppProduction.js",
    "WebAppProductionRender.js",
    "WebAppReadingActivation.js",
    "WebAppReadingActivationAudit.js",
    "WebAppReadingPilot.js",
    "WebAppReadingPilotAudit.js",
    "WebAppReadingProduction.js",
    "WebAppReadingSchedulerProjection.js",
    "WebAppReceipt.js",
    "WebAppReviewCore.js",
    "WebAppReviewListeningAdapter.js",
    "WebAppReviewPersistence.js",
    "WebAppReviewWrittenAdapter.js",
    "WebAppRs13GateReporter.js",
    "WebAppRtSoftSignal.js",
    "WebAppRtSoftSignalPreflight.js",
    "WebAppSurfaceCommon.js",
    "WebAppSurfaceCommonAudit.js",
    "WebAppSurfaceReviewBridge.js",
    "WebAppSurfaceReviewBridgeAudit.js",
    "WebAppTransactionCommon.js",
    "WebAppTranslationActivation.js",
    "WebAppTranslationActivationAudit.js",
    "WebAppTranslationPilot.js",
    "WebAppTranslationPilotAudit.js",
    "WebAppTranslationProduction.js",
    "WebAppTranslationV2.js",
    "WebAppTranslationV2Audit.js",
    "WebAppTranslationV2Production.js",
    "WebAppWrittenAnswerSync.js",
    "WebAppWrittenNewfmt.js",
    "WebAppWrittenNewfmtAudit.js",
    "WebAppWrittenProduction.js"
  ],
  "Verify audio semantic invariants": [
    "Code.js"
  ],
  "Audit Review completion remediation contract": [
    "Client.html",
    "WebApp.js",
    "WebAppReviewCore.js",
    "WebAppReviewPersistence.js"
  ],
  "Verify Review explanation style contract": [
    "H3_REVIEW_ARCHITECTURE.md",
    "H3_REVIEW_EXPLANATION_STYLE_CONTRACT.md",
    "Stylesheet.html",
    "WebAppReadingPilot.js",
    "WebAppReviewCore.js",
    "WebAppSurfaceCommon.js",
    "WebAppSurfaceReviewBridge.js",
    "WebAppWrittenProduction.js"
  ]
}''')


def _git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def _has_commit(sha: str) -> bool:
    if not sha:
        return False
    probe = _git("cat-file", "-e", f"{sha}^{{commit}}", check=False)
    if probe.returncode == 0:
        return True
    fetch = _git(
        "fetch",
        "--no-tags",
        "--depth=1",
        "origin",
        sha,
        check=False,
    )
    if fetch.returncode != 0:
        return False
    return _git("cat-file", "-e", f"{sha}^{{commit}}", check=False).returncode == 0


def _changed_files() -> tuple[bool, set[str]]:
    event = os.environ.get("EVENT_NAME", "")
    changed: set[str] = set()
    full = False

    try:
        if event == "workflow_dispatch":
            full = True
        elif event == "pull_request":
            base = os.environ.get("PULL_BASE", "")
            head = os.environ.get("PULL_HEAD", "")
            if not (_has_commit(base) and _has_commit(head)):
                full = True
            else:
                result = _git("diff", "--name-only", base, head, check=False)
                if result.returncode != 0:
                    full = True
                else:
                    changed = {line for line in result.stdout.splitlines() if line}
        elif event == "push":
            before = os.environ.get("PUSH_BEFORE", "")
            if not before or set(before) == {"0"}:
                full = True
            elif not _has_commit(before):
                full = True
            else:
                result = _git("diff", "--name-only", before, "HEAD", check=False)
                if result.returncode != 0:
                    full = True
                else:
                    changed = {line for line in result.stdout.splitlines() if line}
        else:
            full = True
    except Exception:
        full = True

    if not full and not changed:
        full = True
    if changed & FORCE_FULL_FILES:
        full = True
    return full, changed


def detect() -> int:
    full, changed = _changed_files()
    marker = "|" + "|".join(sorted(changed)) + "|"
    env_path = os.environ.get("GITHUB_ENV")
    if not env_path:
        raise SystemExit("GITHUB_ENV is required for repository audit impact detection.")

    with open(env_path, "a", encoding="utf-8") as fh:
        fh.write(f"H3_AUDIT_FULL={'true' if full else 'false'}\n")
        fh.write(f"H3_AUDIT_FILES_MARKER={marker}\n")

    print(
        "Repository audit impact: "
        f"full={'true' if full else 'false'} "
        f"files={json.dumps(sorted(changed), ensure_ascii=False)}"
    )
    return 0


def decision(step_name: str) -> int:
    # Fail safe: unknown state or unknown step runs the audit body.
    if os.environ.get("H3_AUDIT_FULL", "true") == "true":
        print("RUN")
        return 0

    marker = os.environ.get("H3_AUDIT_FILES_MARKER", "")
    deps = DEPENDENCIES.get(step_name)
    if not marker or deps is None or not deps:
        print("RUN")
        return 0

    print("RUN" if any(f"|{path}|" in marker for path in deps) else "SKIP")
    return 0


def validate() -> int:
    workflow = Path(WORKFLOW_PATH).read_text(encoding="utf-8")
    operations = Path(OPERATIONS_PATH).read_text(encoding="utf-8")

    required_ops = [
        "H3_REPO_ACCESS_FASTPATH_V1",
        "read independent authorities in one parallel tool turn",
        "Prefer exact-path fetches when the path is known.",
        "query workflow runs by the exact `head_sha` as one aggregate read per polling cycle",
        "Do not poll each successful workflow run individually.",
        "Repository audit impact selection",
        "PHASE-4 must write the already verified exact application-main",
        "REPOSITORY_AUDIT_IMPACT_HELPER=.github/scripts/repository_audit_impact.py",
        "H3_DRIVE_RAW_TEXT_REPLACE_V1",
        "DRIVE_RAW_TEXT_REPLACE_HELPER=.github/scripts/drive_raw_text_replace_helper.py",
    ]
    missing = [token for token in required_ops if token not in operations]
    if missing:
        raise SystemExit(
            "Repository access fast-path contract missing: " + ", ".join(missing)
        )

    step_names = re.findall(r"^      - name:\s*(.+)$", workflow, flags=re.MULTILINE)
    missing_map = sorted(
        name
        for name in step_names
        if name not in UNCONDITIONAL_STEPS and name not in DEPENDENCIES
    )
    if missing_map:
        raise SystemExit(
            "Impact dependency mapping missing for: " + ", ".join(missing_map)
        )

    guard_calls = workflow.count("repository_audit_impact.py decision")
    expected = sum(
        1
        for name in step_names
        if name not in UNCONDITIONAL_STEPS
    )
    if guard_calls != expected:
        raise SystemExit(
            f"Impact guard coverage mismatch: {guard_calls} != {expected}"
        )

    for name in UNCONDITIONAL_STEPS:
        if name not in step_names:
            raise SystemExit(f"Missing unconditional step: {name}")

    if len(workflow.encode("utf-8")) >= 520_000:
        raise SystemExit(
            f"Repository audit workflow grew too large: {len(workflow.encode('utf-8'))} bytes"
        )

    print(
        "Repository access fast-path + impact selection contract: PASS; "
        f"guarded={guard_calls}; workflow_bytes={len(workflow.encode('utf-8'))}"
    )
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        raise SystemExit("usage: repository_audit_impact.py detect|decision|validate [step]")
    command = sys.argv[1]
    if command == "detect":
        return detect()
    if command == "decision":
        if len(sys.argv) != 3:
            raise SystemExit("decision requires an exact step name")
        return decision(sys.argv[2])
    if command == "validate":
        return validate()
    raise SystemExit(f"unknown command: {command}")


if __name__ == "__main__":
    raise SystemExit(main())
