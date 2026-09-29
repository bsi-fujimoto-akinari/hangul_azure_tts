#!/usr/bin/env python3
"""Execute one explicitly authorized REM-09 single-target D4 audio parity repair."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

FUNCTION = "runRem09D4AudioParityRepair"
ARCHIVE_FOLDER_ID = "1CcFqmt9ljhgiTXheYAQ0suxGZZkWTGEp"
ALLOWED = {
    "H3-20260914-02": {
        "hash": "7a68b6db4162e4ebb0065f5574eda0cf32f38896f2f58ebbcecc264603471614",
        "old_file": "1eBPnqb--fQa62yrtp6NdnNE_XTJKJTAA",
    },
    "H3-20260914-04": {
        "hash": "4a681bccc1bfe81aeea20ec4707dcc7cb7e86866526c8c7fa29dd30801b018d3",
        "old_file": "1dByJWmpjXrZSLUBptJLDeLGQ0yQbuH6-",
    },
}


def fail(message: str) -> "NoReturn":
    raise SystemExit(message)


def require_exact_boundary() -> str:
    event_name = os.environ.get("EVENT_NAME", "")
    run_attempt = os.environ.get("RUN_ATTEMPT", "")
    source_sha = os.environ.get("SOURCE_SHA", "")
    intended_sha = os.environ.get("INTENDED_SMOKE_SHA", "")
    source_attested = os.environ.get("SOURCE_ATTESTED", "")
    validation = os.environ.get("REM09_VALIDATION", "")
    migration = os.environ.get("MIGRATION_CONTROL", "")
    target = os.environ.get("TARGET_SET_ID", "")

    if event_name != "workflow_dispatch":
        fail("REM-09 D4 audio repair is manual-dispatch only.")
    if run_attempt != "1":
        fail("REM-09 D4 audio repair is one-attempt only.")
    if re.fullmatch(r"[0-9a-f]{40}", source_sha) is None:
        fail("REM-09 D4 audio repair source SHA is invalid.")
    if intended_sha != source_sha:
        fail("REM-09 D4 audio repair intended SHA does not match source SHA.")
    if source_attested != "true":
        fail("REM-09 D4 audio repair requires successful source attestation.")
    if validation != "NO" or migration != "NONE":
        fail("REM-09 D4 audio repair must run in an isolated dispatch.")
    if target not in ALLOWED:
        fail("REM-09 D4 audio repair target is not allowlisted.")
    return target


def invoke(target: str) -> dict:
    params = json.dumps([target], ensure_ascii=False, separators=(",", ":"))
    completed = subprocess.run(
        [
            "npx",
            "-y",
            "@google/clasp@3.4.0",
            "--json",
            "run-function",
            FUNCTION,
            "--params",
            params,
        ],
        check=False,
        text=True,
        capture_output=True,
    )
    if completed.returncode != 0:
        fail(
            "REM-09 D4 audio repair Apps Script execution failed "
            f"(exit={completed.returncode})."
        )
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        fail("REM-09 D4 audio repair returned invalid JSON.") from exc


def validate(envelope: dict, target: str) -> None:
    if envelope.get("error"):
        fail("REM-09 D4 audio repair returned an error envelope.")
    response = envelope.get("response")
    if not isinstance(response, dict):
        fail("REM-09 D4 audio repair response missing.")
    if response.get("schema") != "H3_REM09_D4_AUDIO_PARITY_REPAIR_V1":
        fail("Unexpected REM-09 D4 repair schema.")
    if (
        response.get("status") != "PASS"
        or response.get("set_id") != target
        or response.get("slot_key") != "D4"
    ):
        fail("REM-09 D4 repair identity/status mismatch.")

    result = response.get("result") or {}
    expected = ALLOWED[target]
    if result.get("audio_text_sha256") != expected["hash"]:
        fail("REM-09 D4 repaired hash mismatch.")
    if result.get("replaced_file_id") != expected["old_file"]:
        fail("REM-09 D4 replaced-file mismatch.")
    if result.get("retired_mode") != "STALE_REPLACED_ARCHIVE":
        fail("REM-09 D4 retire mode mismatch.")
    if result.get("stale_replaced_folder_id") != ARCHIVE_FOLDER_ID:
        fail("REM-09 D4 archive folder mismatch.")

    readback = response.get("readback") or {}
    if readback.get("asset_count") != 5:
        fail("REM-09 D4 post-repair set readback mismatch.")

    print("REM-09 bounded D4 audio parity repair: PASS")
    print(f"set_id={target}")
    print(f"audio_text_sha256={expected['hash']}")


def main() -> int:
    target = require_exact_boundary()
    validate(invoke(target), target)
    return 0


if __name__ == "__main__":
    sys.exit(main())
