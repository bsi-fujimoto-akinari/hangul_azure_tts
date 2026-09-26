#!/usr/bin/env python3
"""Shared contract helper for Google Drive raw text-file replacement.

This helper does not call Google Drive itself. It standardizes the connector
handoff between export_file and update_file and verifies text/plain readback.

Canonical path:
temporary native Doc -> export text/plain -> unwrap file_uri.file_id
-> update existing raw file in place -> fresh readback -> verify normalized
line endings + BOM parity.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any


CONTRACT_ID = "H3_DRIVE_RAW_TEXT_REPLACE_V1"


def unwrap_update_file_uri(export_payload: Any) -> str:
    """Return the connector-local string accepted by update_file.file_uri.

    Args:
        export_payload: export_file result, full connector response, a file_uri
            object, or a connector-local file reference string.

    Returns:
        Connector-local file reference string.

    Raises:
        ValueError: If no usable string reference can be extracted.
    """
    value = export_payload
    if isinstance(value, dict) and "result" in value:
        value = value["result"]
    if isinstance(value, dict) and "file_uri" in value:
        value = value["file_uri"]

    if isinstance(value, str):
        if not value.strip():
            raise ValueError("file_uri string is empty")
        return value

    if isinstance(value, dict):
        file_id = value.get("file_id")
        if isinstance(file_id, str) and file_id.strip():
            return file_id
        raise ValueError("file_uri object does not contain a non-empty file_id")

    raise ValueError(
        "unsupported file_uri shape; expected string or object with file_id"
    )


def normalize_text_plain(value: str) -> str:
    """Normalize transport line endings without changing other characters."""
    return value.replace("\r\n", "\n").replace("\r", "\n")


def verify_text_plain_readback(expected: str, actual: str) -> dict[str, Any]:
    """Verify normalized semantic identity plus explicit BOM parity."""
    expected_bom = expected.startswith("\ufeff")
    actual_bom = actual.startswith("\ufeff")
    normalized_equal = normalize_text_plain(expected) == normalize_text_plain(actual)
    ok = normalized_equal and expected_bom == actual_bom
    return {
        "contract_id": CONTRACT_ID,
        "ok": ok,
        "normalized_equal": normalized_equal,
        "expected_bom": expected_bom,
        "actual_bom": actual_bom,
        "expected_crlf_count": expected.count("\r\n"),
        "actual_crlf_count": actual.count("\r\n"),
    }


def _self_test() -> None:
    current_shape = {
        "result": {
            "file_uri": {
                "download_url": "https://example.invalid/raw",
                "file_id": "sediment://file_123",
                "mime_type": "text/plain",
                "file_name": "rules.txt",
            }
        }
    }
    assert unwrap_update_file_uri(current_shape) == "sediment://file_123"
    assert unwrap_update_file_uri({"file_uri": "sediment://file_legacy"}) == (
        "sediment://file_legacy"
    )
    assert unwrap_update_file_uri({"file_id": "sediment://file_direct"}) == (
        "sediment://file_direct"
    )

    for bad in (None, "", {}, {"file_uri": {}}, {"file_uri": {"file_id": ""}}):
        try:
            unwrap_update_file_uri(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"invalid payload accepted: {bad!r}")

    expected = "\ufeffA\nB\n"
    actual = "\ufeffA\r\nB\r\n"
    check = verify_text_plain_readback(expected, actual)
    assert check["ok"] is True
    assert check["normalized_equal"] is True

    no_bom = verify_text_plain_readback(expected, "A\r\nB\r\n")
    assert no_bom["ok"] is False
    assert no_bom["normalized_equal"] is False

    changed = verify_text_plain_readback(expected, "\ufeffA\r\nC\r\n")
    assert changed["ok"] is False

    print(f"{CONTRACT_ID} self-test: PASS")


def _command_unwrap() -> int:
    payload = json.load(sys.stdin)
    print(unwrap_update_file_uri(payload))
    return 0


def _command_verify(expected_path: str, actual_path: str) -> int:
    expected = Path(expected_path).read_text(encoding="utf-8")
    actual = Path(actual_path).read_text(encoding="utf-8")
    result = verify_text_plain_readback(expected, actual)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0 if result["ok"] else 1


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("self-test")
    sub.add_parser("unwrap")
    verify = sub.add_parser("verify")
    verify.add_argument("expected")
    verify.add_argument("actual")
    args = parser.parse_args()

    if args.command == "self-test":
        _self_test()
        return 0
    if args.command == "unwrap":
        return _command_unwrap()
    if args.command == "verify":
        return _command_verify(args.expected, args.actual)
    raise AssertionError(args.command)


if __name__ == "__main__":
    raise SystemExit(main())
