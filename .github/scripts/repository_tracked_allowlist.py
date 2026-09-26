#!/usr/bin/env python3
"""Tracked-file allowlist for Repository audit.

This logic is intentionally external to the workflow YAML.
"""

import subprocess
import sys

allowed = {
    '.clasp.json',
    '.gitignore',
    'Code.js',
    'WebApp.js',
    'WebAppObservability.js',
    'WebAppErrorState.js',
    'WebAppLiveSmoke.js',
    'WebAppFixture.js',
    'WebAppProduction.js',
    'WebAppTransactionCommon.js',
    'WebAppSurfaceCommon.js',
    'WebAppSurfaceCommonAudit.js',
    'WebAppLevelCommon.js',
    'WebAppLevelCommonAudit.js',
    'WebAppJun2Taxonomy.js',
    'WebAppJun2TaxonomyAudit.js',
    'WebAppFormatCommon.js',
    'WebAppFormatCommonAudit.js',
    'WebAppWrittenNewfmt.js',
    'WebAppWrittenNewfmtAudit.js',
    'WebAppWrittenProduction.js',
    'WebAppWrittenAnswerSync.js',
    'WebAppProductionRender.js',
    'WebAppReadingPilot.js',
    'WebAppReadingPilotAudit.js',
    'WebAppReadingActivation.js',
    'WebAppReadingActivationAudit.js',
    'WebAppReadingProduction.js',
    'WebAppReadingSchedulerProjection.js',
    'WebAppTranslationPilot.js',
    'WebAppTranslationPilotAudit.js',
    'WebAppTranslationActivation.js',
    'WebAppTranslationActivationAudit.js',
    'WebAppTranslationProduction.js',
    'WebAppTranslationV2.js',
    'WebAppTranslationV2Audit.js',
    'WebAppTranslationV2Production.js',
    'WebAppRtSoftSignal.js',
    'WebAppMultiSkillEvidence.js',
    'WebAppMultiSkillShadow.js',
    'WebAppConceptAuthoring.js',
    'WebAppRtSoftSignalPreflight.js',
    'WebAppK1SecondaryAuthority.js',
    'WebAppRs13GateReporter.js',
    'WebAppFamilyScheduler.js',
    'WebAppFamilySchedulerPreparation.js',
    'WebAppPreissue.js',
    'WebAppReceipt.js',
    'WebAppReviewCore.js',
    'WebAppReviewListeningAdapter.js',
    'WebAppReviewPersistence.js',
    'WebAppReviewWrittenAdapter.js',
    'WebAppSurfaceReviewBridge.js',
    'WebAppSurfaceReviewBridgeAudit.js',
    'ListeningBackendOrchestrator.js',
    'ReviewAudioBackfill.js',
    'H3_WEB_CHAT_CONTRACT.md',
    'H3_REVIEW_ARCHITECTURE.md',
    'H3_REVIEW_EXPLANATION_STYLE_CONTRACT.md',
    'H3_LEARNING_SURFACE_CONTRACT.md',
    'H3_LEVEL_RUNTIME_CONTRACT.md',
    'H3_JUN2_TAXONOMY_CONTRACT.md',
    'H3_NEWFMT_LEVEL_CONTRACT.md',
    'H3_2026_NEWFMT_SOURCE_CONTRACT.md',
    'H3_WRITTEN_NEWFMT_RUNTIME_CONTRACT.md',
    'H3_READING_P8_PILOT_CONTRACT.md',
    'H3_READING_ACTIVATION_CONTRACT.md',
    'H3_READING_PRODUCTION_CONTRACT.md',
    'H3_READING_P9_P10_PILOT_CONTRACT.md',
    'H3_TRANSLATION_P11_P12_PILOT_CONTRACT.md',
    'H3_TRANSLATION_ACTIVATION_CONTRACT.md',
    'H3_TRANSLATION_PRODUCTION_CONTRACT.md',
    'H3_TRANSLATION_V2_RUNTIME_CONTRACT.md',
    'H3_RS10_SOFT_SIGNAL_CONTRACT.md',
    'H3_RS12_PROSPECTIVE_EVIDENCE_CONTRACT.md',
    'H3_RS13_REAL_DATA_SHADOW_CONTRACT.md',
    'H3_RS13E_CONCEPT_AUTHORING_CONTRACT.md',
    'H3_RS14P_LIMITED_LIVE_PREFLIGHT_CONTRACT.md',
    'H3_RS13K1_K1_SECONDARY_AUTHORITY_CONTRACT.md',
    'H3_RS13G_GATE_REPORTER_CONTRACT.md',
    'H3_RS13K1A_K1_AUTHORITY_AUTHORING_HELPER_CONTRACT.md',
    'H3_SURFACE_REVIEW_BRIDGE_CONTRACT.md',
    'Index.html',
    'Stylesheet.html',
    'Client.html',
    'appsscript.json',
    'OPERATIONS.md',
    'RECOVERY.md',
    '.github/workflows/repository-audit.yml',
    '.github/scripts/repository_tracked_allowlist.py',
    '.github/scripts/workflow_lint_guard.py',
    '.github/workflows/workflow-lint.yml',
    '.github/scripts/repository_audit_impact.py',
    '.github/scripts/drive_raw_text_replace_helper.py',
    '.github/scripts/d5_context_quality_audit.cjs',
    '.github/scripts/error_state_contract_audit.py',
    '.github/scripts/production_trigger_alignment.py',
    '.github/scripts/apps_script_execution_boundary_audit.py',
    '.github/scripts/production_trigger_contract_audit.cjs',
    '.github/workflows/apps-script-auto-sync.yml',
    '.github/workflows/rs10-soft-signal-audit.yml',
    '.github/workflows/rs12-prospective-evidence-audit.yml',
    '.github/workflows/rs13-real-data-shadow-audit.yml',
    '.github/workflows/rs13e-concept-authoring-audit.yml',
    '.github/workflows/rs14p-limited-live-preflight-audit.yml',
    '.github/workflows/rs13k1-k1-secondary-authority-audit.yml',
    '.github/workflows/rs13g-gate-reporter-audit.yml',
    '.github/workflows/rs13k1a-authoring-helper-audit.yml',
    '.github/workflows/family-scheduler-f3-shadow-audit.yml',
}
tracked = set(
    subprocess.check_output(
        ['git', 'ls-files'], text=True
    ).splitlines()
)
unexpected = sorted(tracked - allowed)
missing = sorted({
    '.clasp.json', '.gitignore', 'Code.js',
    'WebApp.js', 'WebAppFixture.js', 'WebAppProduction.js', 'WebAppTransactionCommon.js', 'WebAppWrittenProduction.js', 'WebAppWrittenAnswerSync.js', 'ListeningBackendOrchestrator.js', 'WebAppProductionRender.js', 'WebAppPreissue.js', 'WebAppReceipt.js', 'Index.html',
    'Stylesheet.html', 'Client.html', 'appsscript.json'
} - tracked)

if unexpected:
    print('Unexpected tracked files:')
    print('\n'.join(f'  - {p}' for p in unexpected))
if missing:
    print('Required tracked files missing:')
    print('\n'.join(f'  - {p}' for p in missing))
if unexpected or missing:
    sys.exit(1)
