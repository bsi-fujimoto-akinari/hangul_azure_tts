#!/usr/bin/env python3
"""Exact-main production monitor trigger alignment helper."""

from __future__ import annotations
import json
import os
import re
import subprocess
import sys

FUNCTION = "h3MonitoringProductionTriggerRealignToHour"

def fail(message):
    raise SystemExit(message)

def boundary():
    source_sha = os.environ.get("SOURCE_SHA", "")
    if re.fullmatch(r"[0-9a-f]{40}", source_sha) is None:
        fail("invalid source SHA")
    if os.environ.get("TRIGGER_NAME", "") != "workflow_run":
        fail("alignment requires workflow_run")
    if os.environ.get("TRIGGER_AUDIT_SHA", "") != source_sha:
        fail("audit SHA mismatch")
    if os.environ.get("TRIGGER_AUDIT_EVENT", "") != "push":
        fail("alignment requires push audit")
    if os.environ.get("TRIGGER_AUDIT_CONCLUSION", "") != "success":
        fail("alignment requires successful audit")
    if os.environ.get("SOURCE_ATTESTED", "") != "true":
        fail("alignment requires source attestation")
    print("ready=true")

def execute():
    completed = subprocess.run(
        [
            "npx", "-y", "@google/clasp@3.4.0", "--json",
            "run-function", FUNCTION,
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        sys.stderr.write(completed.stderr)
        sys.stderr.write(completed.stdout)
        fail("Apps Script alignment execution failed")
    envelope = json.loads(completed.stdout)
    if envelope.get("error"):
        fail("Apps Script alignment returned error envelope")
    result = envelope.get("response")
    if not isinstance(result, dict):
        fail("alignment response is not an object")
    if result.get("schema") != "H3_MONITOR_PRODUCTION_TRIGGER_V1":
        fail("alignment schema mismatch")
    if result.get("status") not in {"READY", "ABSENT"}:
        fail("alignment status mismatch")
    if not isinstance(result.get("migrated"), bool):
        fail("alignment migrated flag invalid")
    if not isinstance(result.get("write_performed"), bool):
        fail("alignment write flag invalid")
    if result.get("status") == "READY":
        trigger = result.get("trigger") or {}
        expected = {
            "configured_cadence_hours": 1,
            "configured_near_minute": 0,
            "configured_timezone": "Asia/Tokyo",
            "matching_trigger_count": 1,
            "metadata_match": True,
            "duplicate_trigger": False,
        }
        for key, value in expected.items():
            if trigger.get(key) != value:
                fail(f"alignment readback mismatch for {key}")
    elif result.get("migrated") or result.get("write_performed"):
        fail("ABSENT alignment result must be no-op")
    print("TRIGGER_ALIGNMENT_RESULT=" + json.dumps(result, sort_keys=True, separators=(",", ":")))

def main():
    if len(sys.argv) != 2:
        fail("usage: boundary|execute")
    if sys.argv[1] == "boundary":
        boundary()
    elif sys.argv[1] == "execute":
        execute()
    else:
        fail("usage: boundary|execute")

if __name__ == "__main__":
    main()
