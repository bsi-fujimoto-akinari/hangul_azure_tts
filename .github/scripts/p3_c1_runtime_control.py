#!/usr/bin/env python3
"""Bounded Apps Script runtime-authority control for H3 P3 C1."""

from __future__ import annotations
import json
import os
import subprocess

ALLOWED = {"C1_READBACK", "C1_QUIESCE"}


def fail(message: str) -> None:
    raise SystemExit(message)


def call(args: list[str]):
    completed = subprocess.run(
        ["npx", "-y", "@google/clasp@3.4.0", "--json", "run-function", *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        fail("Apps Script C1 control execution failed")
    raw = completed.stdout.strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end < start:
        fail("Apps Script C1 control returned no JSON object")
    try:
        envelope = json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        fail("Apps Script C1 control returned invalid JSON")
    if envelope.get("error"):
        fail("Apps Script C1 control returned an error")
    return envelope.get("response")


def main() -> None:
    mode = os.environ.get("MIGRATION_RUNTIME_CONTROL", "")
    if mode not in ALLOWED:
        fail("Unallowlisted migration runtime control")
    if mode == "C1_READBACK":
        if call(["h3RuntimeC1AuthorityReadback"]) != "LEGACY":
            fail("C1 authority readback is not exact LEGACY/lock=0-compatible state")
        print("C1_RUNTIME_AUTHORITY_READBACK=LEGACY")
        return
    expected = {"mode": "QUIESCED", "cutover_locked": "0"}
    response = call(["h3RuntimeC1Quiesce"])
    if response != expected:
        fail("C1 quiesce readback mismatch")
    print("C1_RUNTIME_AUTHORITY_TRANSITION=QUIESCED")


if __name__ == "__main__":
    main()
