#!/usr/bin/env python3
"""Narrow credentialed P3 C6/C9 controls; never prints Apps Script secret data."""

from __future__ import annotations
import json
import os
import subprocess

ALLOWED = {"C6_ACTIVATE", "C9_READBACK"}


def fail(message: str) -> None:
    raise SystemExit(message)


def call(function: str):
    completed = subprocess.run(
        ["npx", "-y", "@google/clasp@3.4.0", "--json", "run-function", function],
        text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if completed.returncode != 0:
        fail("Apps Script C6/C9 control execution failed")
    raw = completed.stdout.strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end < start:
        fail("Apps Script C6/C9 control returned no JSON object")
    try:
        envelope = json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        fail("Apps Script C6/C9 control returned invalid JSON")
    if envelope.get("error"):
        fail("Apps Script C6/C9 control returned an error")
    return envelope.get("response")


def main() -> None:
    mode = os.environ.get("MIGRATION_RUNTIME_CONTROL", "")
    if mode not in ALLOWED:
        fail("Unallowlisted migration runtime control")
    if os.environ.get("EVENT_NAME") != "workflow_dispatch":
        fail("C6/C9 controls require explicit manual workflow dispatch")
    source = os.environ.get("SOURCE_SHA", "")
    if (len(source) != 40 or any(c not in "0123456789abcdef" for c in source)
            or os.environ.get("INTENDED_SMOKE_SHA") != source):
        fail("C6/C9 controls require exact intended audited source SHA")
    if os.environ.get("SOURCE_ATTESTED") != "true":
        fail("C6/C9 controls require immediate authenticated source attestation")
    if os.environ.get("RUN_ATTEMPT") != "1":
        fail("C6/C9 controls permit run_attempt=1 only")

    if mode == "C6_ACTIVATE":
        response = call("h3RuntimeC6Activate")
        if response != {"mode": "D1", "cutover_locked": "1"}:
            fail("C6 activation immediate readback mismatch")
        print("C6_RUNTIME_AUTHORITY_TRANSITION=D1_LOCKED")
        return

    response = call("h3RuntimeC9Readback")
    expected = {
        "status": "PASS", "authority_mode": "D1", "cutover_locked": True,
        "expected_backend_url": True, "bearer_present": True,
        "health_status": "PASS", "database_status": "AVAILABLE",
        "worker_d1_route_verified": True, "mutation_count": 0,
    }
    if response != expected:
        fail("C9 safe readback did not match the exact production route")
    print("C9_RUNTIME_READBACK=PASS")
    print("C9_RUNTIME_MUTATION_COUNT=0")


if __name__ == "__main__":
    main()
