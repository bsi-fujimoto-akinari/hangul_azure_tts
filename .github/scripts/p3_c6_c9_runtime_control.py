#!/usr/bin/env python3
"""Narrow credentialed P3 pre-C6/C6/C9/O1 controls; never prints Apps Script secret data."""

from __future__ import annotations
import json
import os
import re
import subprocess

ALLOWED = {"PRE_C6_READBACK", "C6_ACTIVATE", "C9_READBACK", "P4_ACCEPTANCE5_READBACK", "P4_PROSPECTIVE_ONE_SHOT", "O1_RESUME"}


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

    if mode == "P4_PROSPECTIVE_ONE_SHOT":
        for key, expected_value in (
            ("MIG_ASSET_ACCEPTANCE_2", "NONE"),
            ("REM09_VALIDATION", "NO"),
            ("REM09_REPAIR", "NONE"),
        ):
            if os.environ.get(key, expected_value) != expected_value:
                fail("P4 prospective one-shot requires isolated manual dispatch")
        source_digest = os.environ.get("SOURCE_DIGEST", "")
        if (len(source_digest) != 64 or
                any(c not in "0123456789abcdef" for c in source_digest)):
            fail("P4 prospective one-shot requires exact attested source digest")
        expected_fallback_trigger_count = 1

        def ensure_requiesced():
            control = call("h3P4AssetWriterRequiesceFromR2Primary")
            status = call("h3P4AssetWriterStatus")
            if not isinstance(control, dict):
                fail("P4 prospective cleanup control is not an object")
            if not isinstance(status, dict) or status.get("mode") != "QUIESCED":
                fail("P4 prospective cleanup did not restore QUIESCED mode")
            if status.get("fallback_trigger_count") != expected_fallback_trigger_count:
                fail("P4 prospective cleanup fallback trigger mismatch")
            return control, status

        try:
            result = call("h3P4AcceptanceProspectiveReviewAudioOneShotDiagnostic")
        except SystemExit:
            ensure_requiesced()
            raise
        cleanup_control, cleanup_status = ensure_requiesced()
        if not isinstance(result, dict):
            fail("P4 prospective one-shot result is not an object")
        if (result.get("schema") ==
                "H3_MIG_ASSET_PROSPECTIVE_ONE_SHOT_DIAGNOSTIC_V1" and
                result.get("status") == "FAIL"):
            diagnostic_stage = str(result.get("diagnostic_stage") or "")
            diagnostic_code = str(result.get("diagnostic_code") or "")
            allowed_stages = {
                "WRITER_PREFLIGHT",
                "PLAN_OR_BINDING_PREFLIGHT",
                "R2_PREFLIGHT",
                "DRIVE_PREFLIGHT",
                "WRITER_SWITCH",
                "FIRST_RECEIPT_VALIDATION",
                "SECOND_RECEIPT_VALIDATION",
                "R2_RECEIPT_WRITE",
                "REQUIESCE",
                "FINAL_STATE",
                "RUNTIME_RPC_OR_MEDIA",
                "UNCLASSIFIED",
            }
            allowed_prefixes = (
                "P4_ACCEPTANCE_ONE_SHOT_",
                "P4_ASSET_WRITER_",
                "R2_PRIMARY_",
                "H3_RUNTIME_",
                "MEDIA_",
                "REVIEW_AUDIO_",
            )
            if diagnostic_stage not in allowed_stages:
                fail("P4 prospective diagnostic stage invalid")
            if (re.fullmatch(r"[A-Z0-9_]{1,96}", diagnostic_code) is None or
                    not diagnostic_code.startswith(allowed_prefixes)):
                fail("P4 prospective diagnostic code invalid")
            writer_after = result.get("writer_after")
            if (not isinstance(writer_after, dict) or
                    writer_after.get("mode") != "QUIESCED" or
                    writer_after.get("fallback_trigger_count") !=
                        expected_fallback_trigger_count or
                    writer_after.get("mutation_count") != 0):
                fail("P4 prospective diagnostic writer readback invalid")
            print("P4_PROSPECTIVE_ONE_SHOT=FAIL")
            print(
                "P4_PROSPECTIVE_ONE_SHOT_DIAGNOSTIC_STAGE=" +
                diagnostic_stage
            )
            print(
                "P4_PROSPECTIVE_ONE_SHOT_DIAGNOSTIC_CODE=" +
                diagnostic_code
            )
            print("P4_PROSPECTIVE_ONE_SHOT_FINAL_WRITER_MODE=QUIESCED")
            fail("P4 prospective one-shot sanitized diagnostic failure")
        if result.get("schema") != "H3_MIG_ASSET_PROSPECTIVE_ONE_SHOT_V1":
            fail("P4 prospective one-shot schema mismatch")
        if result.get("status") != "PASS":
            fail("P4 prospective one-shot status is not PASS")
        target = result.get("target")
        expected_target = {
            "asset_class": "REVIEW_AUDIO",
            "surface_family": "2R",
            "set_id": "H3-20260921-R001",
            "slot_key": "PASSAGE_COMPLETE",
            "source_byte_sha256":
                "ce0a44fa94997affd15017c62ac9353702d115e9481037cff79e8ca9f3f83826",
            "size_bytes": 652800,
            "mime_type": "audio/mpeg",
        }
        if target != expected_target:
            fail("P4 prospective one-shot target mismatch")
        before = result.get("writer_before")
        after = result.get("writer_after")
        if not isinstance(before, dict) or before.get("mode") != "QUIESCED":
            fail("P4 prospective one-shot writer pre-state mismatch")
        if not isinstance(after, dict) or after.get("mode") != "QUIESCED":
            fail("P4 prospective one-shot writer final-state mismatch")
        if cleanup_status.get("mode") != "QUIESCED":
            fail("P4 prospective one-shot cleanup readback mismatch")
        if (before.get("fallback_trigger_count") != expected_fallback_trigger_count or
                after.get("fallback_trigger_count") != expected_fallback_trigger_count or
                after.get("fallback_trigger_count") != before.get("fallback_trigger_count")):
            fail("P4 prospective one-shot fallback trigger preservation mismatch")
        first = result.get("first_receipt")
        second = result.get("second_receipt")
        if not isinstance(first, dict) or first != second:
            fail("P4 prospective one-shot receipt idempotency mismatch")
        if (first.get("schema") != "H3_R2_PRIMARY_ASSET_WRITE_RECEIPT_V1" or
                first.get("status") != "COMMITTED" or
                first.get("source_byte_sha256") != expected_target["source_byte_sha256"] or
                first.get("size_bytes") != expected_target["size_bytes"] or
                first.get("mime_type") != expected_target["mime_type"]):
            fail("P4 prospective one-shot committed receipt mismatch")
        if result.get("receipt_created") is not True:
            fail("P4 prospective one-shot did not prove a new receipt")
        if result.get("idempotent_receipt_match") is not True:
            fail("P4 prospective one-shot did not prove idempotency")
        if result.get("r2_object_mutation") is not False:
            fail("P4 prospective one-shot unexpectedly mutated R2 bytes")
        evidence = {
            "schema": "H3_MIG_ASSET_PROSPECTIVE_ONE_SHOT_EVIDENCE_V1",
            "status": "PASS",
            "source_sha": source,
            "source_digest": source_digest,
            "result": result,
            "writer_resume_authorized": False,
            "p4_closure_authorized": False,
            "stage_advance_authorized": False,
        }
        with open(
            "/tmp/mig-asset-prospective-one-shot.json",
            "w", encoding="utf-8",
        ) as fh:
            json.dump(evidence, fh, separators=(",", ":"), sort_keys=True)
            fh.write("\n")
        print("P4_PROSPECTIVE_ONE_SHOT=PASS")
        print("P4_PROSPECTIVE_ONE_SHOT_RECEIPT_ID=" + str(first.get("receipt_id", "")))
        print("P4_PROSPECTIVE_ONE_SHOT_FINAL_WRITER_MODE=QUIESCED")
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
