#!/usr/bin/env python3
"""Static contract audit for Error State Phases 2-3."""

from pathlib import Path

error_state = Path("WebAppErrorState.js").read_text(encoding="utf-8")
live_smoke = Path("WebAppLiveSmoke.js").read_text(encoding="utf-8")
ops = Path("OPERATIONS.md").read_text(encoding="utf-8")
family_scheduler = Path("WebAppFamilyScheduler.js").read_text(encoding="utf-8")

required_error_state = [
    "'H3_ERROR_INCIDENT_LIFECYCLE_V1'",
    "'error_incident_lifecycle_v1'",
    "'OPEN'",
    "'INVESTIGATING'",
    "'RESOLVED'",
    "'SUPERSEDED'",
    "'MATCH_THROUGH_AT'",
    "function h3ErrorStateReadRawErrors_(",
    "function h3ErrorStateReadIncidentLifecycle_(",
    "function h3ErrorStateErrorResolved_(",
    "function h3ErrorStateReconcileData_(",
    "function h3ErrorStateReconcile()",
    "function h3ErrorStatePhase2SelfTest_()",
]
missing = [token for token in required_error_state if token not in error_state]
if missing:
    raise SystemExit(
        "Error State Phase 2 implementation missing: " + ", ".join(missing)
    )

required_phase3 = [
    "'H3_ERROR_STATE_BOOT_SNAPSHOT_V1'",
    "function h3ErrorStateReadProjectionReadOnly_(",
    "function h3ErrorStateSemanticEqual_(",
    "function h3ErrorStateBootEvaluateData_(",
    "function h3ErrorStateBootSnapshot()",
    "function h3ErrorStatePhase3SelfTest_()",
    "'RAW_WATERMARK_MISMATCH'",
    "'PROJECTION_SEMANTIC_MISMATCH'",
    "'PROJECTION_UNAVAILABLE'",
    "'FRESH_SOURCE_READ_FAILED'",
    "current_summary_role:",
    "'DISPLAY_ONLY'",
    "write_performed:",
    "false",
]
missing = [token for token in required_phase3 if token not in error_state]
if missing:
    raise SystemExit(
        "Error State Phase 3 implementation missing: " + ", ".join(missing)
    )

required_phase4 = [
    "H3_MONITOR_ERROR_STATE_SOURCE_V1",
    "H3_ERROR_STATE_MONITOR_V1",
    "function h3MonitoringErrorStateFromBoot_(",
    "function h3MonitoringErrorStateSource_(",
    "function h3MonitoringErrorStatePhase4SelfTest_()",
    "UNRESOLVED_ERROR_PRESENT",
    "PRIMARY_SOURCE_UNKNOWN",
    "ERROR_STATE_STALE",
    "ERROR_STATE_NEW_UNRESOLVED",
    "ERROR_STATE_PRIMARY_SOURCE_UNKNOWN",
    "ERROR_STATE_RAW_WATERMARK_DRIFT",
    "lifecycle_only_semantic_drift_email:",
    "false",
]
missing = [token for token in required_phase4 if token not in family_scheduler]
if missing:
    raise SystemExit(
        "Error State Phase 4 observer implementation missing: "
        + ", ".join(missing)
    )

required_smoke = [
    "h3ErrorStatePhase1SelfTest_()",
    "h3ErrorStatePhase2SelfTest_()",
    "error_state_phase1:",
    "error_state_phase2:",
    "h3ErrorStatePhase3SelfTest_()",
    "error_state_phase3:",
    "h3MonitoringErrorStatePhase4SelfTest_()",
    "error_state_phase4:",
    "error_state_observer:",
    "write_performed:",
    "false",
]
missing = [token for token in required_smoke if token not in live_smoke]
if missing:
    raise SystemExit(
        "Error State live-smoke contract missing: " + ", ".join(missing)
    )

required_ops = [
    "H3_ERROR_STATE_RECONCILE_V1",
    "web_runtime_error_log_v1",
    "error_incident_lifecycle_v1",
    "MATCH_THROUGH_AT",
    "implicitly `OPEN`",
    "STATUS=UNKNOWN",
    "UNRESOLVED_COUNT",
    "H3_ERROR_STATE_BOOT_V1",
    "h3ErrorStateBootSnapshot",
    "current.json.error_summary",
    "display-only cache",
    "DRIFT=PRESENT",
    "ERROR=UNKNOWN",
    "DRIFT=UNKNOWN",
    "H3_ERROR_STATE_MONITOR_V1",
    "UNRESOLVED_ERROR_PRESENT",
    "PRIMARY_SOURCE_UNKNOWN",
    "ERROR_STATE_STALE",
    "ERROR_STATE_NEW_UNRESOLVED",
    "ERROR_STATE_PRIMARY_SOURCE_UNKNOWN",
    "ERROR_STATE_RAW_WATERMARK_DRIFT",
    "Lifecycle-only semantic drift",
]
missing = [token for token in required_ops if token not in ops]
if missing:
    raise SystemExit(
        "Error State operations contract missing: " + ", ".join(missing)
    )

for forbidden in [
    "learner_history",
    "ANSWER_SYNC_STATUS",
    "NEXT_BLOCK_NO",
    "NEXT_SET_OFFSET",
]:
    if forbidden in error_state:
        raise SystemExit(
            f"Error State implementation crosses protected runtime boundary: {forbidden}"
        )

print("Error State Phases 2-4 static contract: PASS")
