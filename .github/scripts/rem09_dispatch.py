#!/usr/bin/env python3
import json
import os
import re
import urllib.error
import urllib.request

CONFIRMATION = "AUTHORIZE_REM09_28_OPEN_READONLY"

def fail(code):
    raise SystemExit(code)

def request_json(url, token, method="GET", payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        fail("REM09_GITHUB_API_HTTP_" + str(exc.code))

def main():
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    token = os.environ.get("GH_TOKEN", "")
    sha = os.environ.get("INTENDED_APP_SHA", "")
    confirmation = os.environ.get("CONFIRMATION", "")
    if not repo or not token:
        fail("REM09_GITHUB_CONTEXT_MISSING")
    if re.fullmatch(r"[0-9a-f]{40}", sha) is None:
        fail("REM09_INTENDED_SHA_INVALID")
    if confirmation != CONFIRMATION:
        fail("REM09_CONFIRMATION_MISSING")

    status, ref = request_json(
        "https://api.github.com/repos/" + repo + "/git/ref/heads/main",
        token,
    )
    if status != 200 or not isinstance(ref, dict):
        fail("REM09_MAIN_READBACK_FAILED")
    current = str(((ref.get("object") or {}).get("sha")) or "")
    if current != sha:
        fail("REM09_INTENDED_SHA_NOT_CURRENT_MAIN")

    payload = {
        "ref": "main",
        "inputs": {
            "intended_smoke_sha": sha,
            "migration_runtime_control": "C9_READBACK",
            "rem09_review_open_validation": CONFIRMATION,
        },
    }
    status, _ = request_json(
        "https://api.github.com/repos/" + repo
        + "/actions/workflows/apps-script-auto-sync.yml/dispatches",
        token,
        method="POST",
        payload=payload,
    )
    if status != 204:
        fail("REM09_CHILD_DISPATCH_FAILED")
    print("REM09_CHILD_DISPATCH_ACCEPTED")

if __name__ == "__main__":
    main()
