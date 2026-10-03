#!/usr/bin/env python3
"""Narrow credentialed P3 pre-C6/C6/C9/O1 controls; never prints Apps Script secret data."""

from __future__ import annotations
import json
import os
import subprocess

ALLOWED = {"PRE_C6_READBACK", "C6_ACTIVATE", "C9_READBACK", "P4_ACCEPTANCE5_READBACK", "O1_RESUME"}


def fail(message: str) -> None:
    raise SystemExit(message)


def call(function: str):
    completed = subprocess.run(
        ["npx", "-y", "@google/clasp@3.4.0", "--json", "run-function", function],
        text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if completed.returncode != 0:
        fail("Apps Script bounded P3 runtime control execution failed")
    raw = completed.stdout.strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end < start:
        fail("Apps Script bounded P3 runtime control returned no JSON object")
    try:
        envelope = json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        fail("Apps Script bounded P3 runtime control returned invalid JSON")
    if envelope.get("error"):
        fail("Apps Script bounded P3 runtime control returned an error")
    return envelope.get("response")


def main() -> None:
    mode = os.environ.get("MIGRATION_RUNTIME_CONTROL", "")
    if mode not in ALLOWED:
        fail("Unallowlisted migration runtime control")
    if os.environ.get("EVENT_NAME") != "workflow_dispatch":
        fail("Bounded P3 runtime controls require explicit manual workflow dispatch")
    source = os.environ.get("SOURCE_SHA", "")
    if (len(source) != 40 or any(c not in "0123456789abcdef" for c in source)
            or os.environ.get("INTENDED_SMOKE_SHA") != source):
        fail("Bounded P3 runtime controls require exact intended audited source SHA")
    if os.environ.get("SOURCE_ATTESTED") != "true":
        fail("Bounded P3 runtime controls require immediate authenticated source attestation")
    if os.environ.get("RUN_ATTEMPT") != "1":
        fail("Bounded P3 runtime controls permit run_attempt=1 only")

    if mode == "PRE_C6_READBACK":
        response = call("h3RuntimePreC6Readback")
        expected = {
            "status": "PASS",
            "authority_mode": "QUIESCED",
            "cutover_locked": False,
            "mutation_count": 0,
        }
        if response != expected:
            fail("Pre-C6 safe readback did not match exact QUIESCED/0 state")
        print("PRE_C6_RUNTIME_READBACK=QUIESCED_UNLOCKED")
        print("PRE_C6_RUNTIME_MUTATION_COUNT=0")
        return

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
        fail("Post-C6 safe readback did not match the exact production route")
    if mode == "C9_READBACK":
        print("C9_RUNTIME_READBACK=PASS")
        print("C9_RUNTIME_MUTATION_COUNT=0")
        return

    if mode == "P4_ACCEPTANCE5_READBACK":
        source_digest = os.environ.get("SOURCE_DIGEST", "")
        if (len(source_digest) != 64 or
                any(c not in "0123456789abcdef" for c in source_digest)):
            fail("P4 acceptance readback requires exact attested source digest")
        writer = call("h3P4AssetWriterStatus")
        if not isinstance(writer, dict):
            fail("P4 asset-writer status is not an object")
        if writer.get("schema") != "H3_P4_ASSET_WRITER_STATUS_V1":
            fail("P4 asset-writer status schema mismatch")
        if writer.get("mode") != "QUIESCED":
            fail("P4 asset writer is not QUIESCED")
        if writer.get("mutation_count") != 0:
            fail("P4 asset-writer readback mutation_count is not zero")
        fallback_count = writer.get("fallback_trigger_count")
        if (not isinstance(fallback_count, int) or
                isinstance(fallback_count, bool) or fallback_count < 0):
            fail("P4 asset-writer fallback trigger count is invalid")
        for key in ("quiesce_watermark", "transition_watermark"):
            if not isinstance(writer.get(key), str):
                fail("P4 asset-writer watermark is invalid: " + key)
        evidence = {
            "schema": "H3_MIG_ASSET_ACCEPTANCE_5_STATE_READBACK_V1",
            "status": "PASS_READ_ONLY",
            "source_sha": source,
            "source_digest": source_digest,
            "authority": response,
            "asset_writer": writer,
            "write_performed": False,
        }
        with open(
            "/tmp/mig-asset-acceptance-5-state-readback.json",
            "w", encoding="utf-8",
        ) as fh:
            json.dump(evidence, fh, separators=(",", ":"), sort_keys=True)
            fh.write("\n")
        print("P4_ACCEPTANCE5_RUNTIME_READBACK=PASS")
        print("P4_ACCEPTANCE5_WRITER_MODE=QUIESCED")
        print("P4_ACCEPTANCE5_MUTATION_COUNT=0")
        return

    trigger = call("h3MonitoringProductionTriggerEnsure")
    if not isinstance(trigger, dict):
        fail("O1 production monitor trigger result is not an object")
    if trigger.get("schema") != "H3_MONITOR_PRODUCTION_TRIGGER_V1":
        fail("O1 production monitor trigger schema mismatch")
    if trigger.get("status") != "READY":
        fail("O1 production monitor trigger is not READY")
    created = trigger.get("created")
    write_performed = trigger.get("write_performed")
    if not isinstance(created, bool) or not isinstance(write_performed, bool):
        fail("O1 production monitor trigger flags are invalid")
    if write_performed is not created:
        fail("O1 trigger write flag does not match creation state")
    status = trigger.get("trigger")
    if not isinstance(status, dict):
        fail("O1 production monitor trigger readback is missing")
    expected_trigger = {
        "status": "READY",
        "matching_trigger_count": 1,
        "metadata_match": True,
        "duplicate_trigger": False,
        "configured_cadence_hours": 1,
        "configured_near_minute": 0,
        "configured_timezone": "Asia/Tokyo",
        "trigger_handler": "h3MonitoringObserverEmailRun",
        "trigger_source": "CLOCK",
    }
    for key, value in expected_trigger.items():
        if status.get(key) != value:
            fail("O1 production monitor trigger readback mismatch: " + key)
    print("O1_D1_RUNTIME_READBACK=PASS")
    print("O1_BACKGROUND_TRIGGER_STATUS=READY")
    print("O1_BACKGROUND_TRIGGER_CREATED=" + str(created).lower())
    print("O1_BACKGROUND_TRIGGER_WRITE_PERFORMED=" + str(write_performed).lower())


if __name__ == "__main__":
    main()
