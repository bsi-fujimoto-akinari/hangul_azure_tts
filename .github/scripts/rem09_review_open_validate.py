#!/usr/bin/env python3
import json
import re
import subprocess
import sys
from pathlib import Path

EXPECTED_TOTAL = 28
EXPECTED_5L = 3
EXPECTED_FAMILY_COUNTS = {"5W": 19, "5L": 3, "READING": 3, "TRANSLATION": 3}

def fail(code):
    raise SystemExit(code)

def load_targets(path):
    rows = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) != 4:
            fail("REM09_TARGET_ROW_INVALID")
        set_id, kind, family, source_id = parts
        rows.append((set_id, kind, family, source_id))
    if len(rows) != EXPECTED_TOTAL:
        fail("REM09_TARGET_COUNT_MISMATCH")
    counts = {}
    for _, _, family, _ in rows:
        counts[family] = counts.get(family, 0) + 1
    if counts != EXPECTED_FAMILY_COUNTS:
        fail("REM09_TARGET_FAMILY_COUNTS_MISMATCH")
    return rows

def call_runner(runner, request):
    params = json.dumps([request], ensure_ascii=False, separators=(",", ":"))
    completed = subprocess.run(
        [runner, params],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    return completed.returncode, completed.stdout, completed.stderr

SAFE_ERROR_CODE = re.compile(r"^[A-Z][A-Z0-9_]{2,159}$")
SAFE_ERROR_TOKEN = re.compile(r"\\b[A-Z][A-Z0-9_]{2,159}\\b")

def safe_error_code(error):
    if isinstance(error, dict):
        direct = str(error.get("code") or "").strip()
        if SAFE_ERROR_CODE.fullmatch(direct):
            return direct
        for key in ("message", "details"):
            value = str(error.get(key) or "")
            for token in SAFE_ERROR_TOKEN.findall(value):
                if "_" in token:
                    return token
        status = str(error.get("status") or "").strip()
        if SAFE_ERROR_CODE.fullmatch(status):
            return status
        return "UNKNOWN"
    value = str(error or "")
    for token in SAFE_ERROR_TOKEN.findall(value):
        if "_" in token:
            return token
    return "UNKNOWN"

def diagnostic(target_index, set_id, kind, family, source_id, error_code):
    fields = (
        ("target_index", str(target_index)),
        ("set_id", set_id),
        ("review_kind", kind),
        ("surface_family", family),
        ("review_source_id", source_id),
        ("error_code", error_code),
    )
    safe = []
    for key, value in fields:
        text = str(value)
        if not re.fullmatch(r"[A-Za-z0-9_.:-]{1,200}", text):
            text = "INVALID"
        safe.append(key + "=" + text)
    print("REM09_DIAGNOSTIC " + " ".join(safe), file=sys.stderr)

def parse_envelope(stdout):
    try:
        return json.loads(stdout)
    except Exception:
        fail("REM09_APPS_SCRIPT_ENVELOPE_INVALID")

def validate_success(stdout, target_index, set_id, kind, family, source_id):
    envelope = parse_envelope(stdout)
    error = envelope.get("error")
    if error:
        diagnostic(
            target_index, set_id, kind, family, source_id,
            safe_error_code(error),
        )
        fail("REM09_REVIEW_OPEN_APPS_SCRIPT_ERROR")
    result = envelope.get("response")
    if not isinstance(result, dict):
        fail("REM09_REVIEW_OPEN_RESPONSE_INVALID")
    if result.get("mode") != "REVIEW":
        fail("REM09_REVIEW_OPEN_MODE_MISMATCH")
    if result.get("set_id") != set_id:
        fail("REM09_REVIEW_OPEN_SET_ID_MISMATCH")
    if result.get("surface_family") != family:
        fail("REM09_REVIEW_OPEN_FAMILY_MISMATCH")
    actual_kind = str(result.get("kind") or result.get("provider_kind") or "")
    if actual_kind != kind:
        fail("REM09_REVIEW_OPEN_KIND_MISMATCH")
    if result.get("read_only") is not True:
        fail("REM09_REVIEW_OPEN_NOT_READ_ONLY")

    if family == "5L":
        sections = result.get("sections")
        if not isinstance(sections, list) or len(sections) != 5:
            fail("REM09_5L_SECTION_COUNT_MISMATCH")
        by_section = {
            str(item.get("section")): item
            for item in sections if isinstance(item, dict)
        }
        if set(by_section) != {"K1", "K2", "K3", "K4", "K5"}:
            fail("REM09_5L_SECTION_IDENTITY_MISMATCH")
        if any(not str(by_section[key].get("audio_fallback_url") or "") for key in by_section):
            fail("REM09_5L_AUDIO_HYDRATION_MISSING")
        surface = by_section["K1"].get("question_surface")
        if not isinstance(surface, dict):
            fail("REM09_5L_K1_SURFACE_INVALID")
        if not re.fullmatch(r"[0-9a-f]{64}", str(surface.get("image_sha256") or "")):
            fail("REM09_5L_IMAGE_HASH_INVALID")
        if not str(surface.get("image_data_uri") or "").startswith("data:image/"):
            fail("REM09_5L_IMAGE_HYDRATION_MISSING")
    elif family == "5W":
        sections = result.get("sections")
        if not isinstance(sections, list) or len(sections) != 5:
            fail("REM09_5W_SECTION_COUNT_MISMATCH")

def require_error(runner, request, expected):
    _, stdout, stderr = call_runner(runner, request)
    combined = stdout + "\n" + stderr
    try:
        envelope = json.loads(stdout)
        combined += "\n" + json.dumps(envelope.get("error"), ensure_ascii=False)
    except Exception:
        pass
    if expected not in combined:
        fail("REM09_FAIL_CLOSED_NOT_CONFIRMED_" + expected)

def main():
    if len(sys.argv) != 3:
        fail("REM09_ARGUMENTS_REQUIRED")
    runner, targets_path = sys.argv[1:3]
    rows = load_targets(targets_path)
    opened = 0
    listening = 0

    for target_index, (set_id, kind, family, source_id) in enumerate(rows, start=1):
        request = {
            "schema": "H3_WEB_RENDER_REQUEST_V1",
            "mode": "REVIEW",
            "set_id": set_id,
            "review_kind": kind,
            "surface_family": family,
            "review_source_id": source_id,
        }
        code, stdout, _ = call_runner(runner, request)
        if code != 0:
            diagnostic(
                target_index, set_id, kind, family, source_id,
                "TRANSPORT_NONZERO",
            )
            fail("REM09_REVIEW_OPEN_TRANSPORT_FAILED")
        validate_success(
            stdout, target_index, set_id, kind, family, source_id
        )
        opened += 1
        if family == "5L":
            listening += 1

    if opened != EXPECTED_TOTAL or listening != EXPECTED_5L:
        fail("REM09_OPEN_COUNT_MISMATCH")

    require_error(
        runner,
        {
            "schema": "H3_WEB_RENDER_REQUEST_V1",
            "mode": "REVIEW",
            "set_id": "H3-20260919-L02",
            "review_kind": "WRITTEN",
            "surface_family": "5L",
        },
        "REVIEW_RENDER_REQUEST_INVALID",
    )
    require_error(
        runner,
        {
            "schema": "H3_WEB_RENDER_REQUEST_V1",
            "mode": "REVIEW",
            "set_id": "H3-REM09-NOT-FOUND",
            "review_kind": "WRITTEN",
            "surface_family": "5W",
        },
        "REVIEW_PAYLOAD_NOT_FOUND",
    )
    print("REM09_REVIEW_OPEN_VALIDATION_PASS opened=28 five_l=3 fail_closed=2 mutation=0")

if __name__ == "__main__":
    main()
