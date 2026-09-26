#!/usr/bin/env python3
"""Static contract audit for Error State Phase 2."""

from pathlib import Path

error_state = Path("WebAppErrorState.js").read_text(encoding="utf-8")
live_smoke = Path("WebAppLiveSmoke.js").read_text(encoding="utf-8")
ops = Path("OPERATIONS.md").read_text(encoding="utf-8")

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

required_smoke = [
    "h3ErrorStatePhase1SelfTest_()",
    "h3ErrorStatePhase2SelfTest_()",
    "error_state_phase1:",
    "error_state_phase2:",
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

print("Error State Phase 2 static contract: PASS")
