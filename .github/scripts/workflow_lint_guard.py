#!/usr/bin/env python3
"""Fail-closed GitHub Actions workflow lint and inline-growth guard."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.request

ACTIONLINT_VERSION = "1.7.12"
ACTIONLINT_LINUX_AMD64_SHA256 = (
    "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8"
)
WORKFLOW_DIR = Path(".github/workflows")
REPOSITORY_AUDIT = WORKFLOW_DIR / "repository-audit.yml"
WORKFLOW_LINT = WORKFLOW_DIR / "workflow-lint.yml"
GUARD_INVOCATION = "python3 .github/scripts/workflow_lint_guard.py"
NEW_WORKFLOW_INLINE_BLOCK_LIMIT = 4


def fail(message: str) -> "NoReturn":
    raise SystemExit(message)


def workflow_files() -> list[Path]:
    paths = sorted(
        list(WORKFLOW_DIR.glob("*.yml"))
        + list(WORKFLOW_DIR.glob("*.yaml"))
    )
    if not paths:
        fail("No GitHub Actions workflow files found.")
    return paths


def install_actionlint(tmp: Path) -> Path:
    if platform.system() != "Linux" or platform.machine().lower() not in {
        "x86_64",
        "amd64",
    }:
        fail(
            "Workflow lint runner must be Linux amd64; "
            f"got {platform.system()} {platform.machine()}."
        )

    asset = f"actionlint_{ACTIONLINT_VERSION}_linux_amd64.tar.gz"
    url = (
        "https://github.com/rhysd/actionlint/releases/download/"
        f"v{ACTIONLINT_VERSION}/{asset}"
    )
    archive = tmp / asset
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "hangul-workflow-lint/1"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        archive.write_bytes(response.read())

    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != ACTIONLINT_LINUX_AMD64_SHA256:
        fail(
            "actionlint archive digest mismatch: "
            f"{digest} != {ACTIONLINT_LINUX_AMD64_SHA256}"
        )

    with tarfile.open(archive, "r:gz") as tf:
        member = next(
            (
                item
                for item in tf.getmembers()
                if item.isfile() and Path(item.name).name == "actionlint"
            ),
            None,
        )
        if member is None:
            fail("actionlint binary not found in verified archive.")
        handle = tf.extractfile(member)
        if handle is None:
            fail("actionlint binary could not be read from archive.")
        binary = tmp / "actionlint"
        binary.write_bytes(handle.read())
        binary.chmod(0o755)
    return binary


def run_actionlint(paths: list[Path]) -> None:
    with tempfile.TemporaryDirectory(prefix="h3-actionlint-") as raw_tmp:
        binary = install_actionlint(Path(raw_tmp))
        command = [str(binary), "-oneline"] + [str(path) for path in paths]
        completed = subprocess.run(command, check=False)
        if completed.returncode != 0:
            fail(f"actionlint failed with exit code {completed.returncode}.")


def inline_block_body_lines(text: str) -> int:
    lines = text.splitlines()
    total = 0
    index = 0
    while index < len(lines):
        match = re.match(r"^(\s*)run:\s*[|>][-+]?\s*$", lines[index])
        if not match:
            index += 1
            continue
        base_indent = len(match.group(1))
        index += 1
        while index < len(lines):
            line = lines[index]
            if not line.strip():
                total += 1
                index += 1
                continue
            indent = len(line) - len(line.lstrip(" "))
            if indent <= base_indent:
                break
            total += 1
            index += 1
    return total


def event_base_sha() -> str | None:
    event_name = os.environ.get("GITHUB_EVENT_NAME", "")
    event_path = os.environ.get("GITHUB_EVENT_PATH", "")
    if event_name == "workflow_dispatch":
        return None
    if not event_path or not Path(event_path).is_file():
        fail("GITHUB_EVENT_PATH is required for pull_request/push lint.")
    payload = json.loads(Path(event_path).read_text(encoding="utf-8"))
    if event_name == "pull_request":
        value = (
            payload.get("pull_request", {})
            .get("base", {})
            .get("sha", "")
        )
    elif event_name == "push":
        value = payload.get("before", "")
    else:
        fail(f"Unsupported workflow-lint event: {event_name!r}.")
    value = str(value or "")
    if not re.fullmatch(r"[0-9a-f]{40}", value) or value == "0" * 40:
        fail(f"Valid base SHA is required for {event_name}: {value!r}.")
    return value


def git_show(sha: str, path: Path) -> str | None:
    spec = f"{sha}:{path.as_posix()}"
    probe = subprocess.run(
        ["git", "cat-file", "-e", spec],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if probe.returncode != 0:
        return None
    return subprocess.check_output(
        ["git", "show", spec],
        text=True,
        encoding="utf-8",
    )


def changed_workflow_paths(base_sha: str) -> list[Path]:
    raw = subprocess.check_output(
        [
            "git",
            "diff",
            "--name-only",
            base_sha,
            "HEAD",
            "--",
            ".github/workflows",
        ],
        text=True,
        encoding="utf-8",
    )
    return [
        Path(line.strip())
        for line in raw.splitlines()
        if line.strip().endswith((".yml", ".yaml"))
    ]


def enforce_inline_growth(base_sha: str | None) -> None:
    if base_sha is None:
        return
    subprocess.run(
        ["git", "cat-file", "-e", f"{base_sha}^{{commit}}"],
        check=True,
        stdout=subprocess.DEVNULL,
    )
    failures: list[str] = []
    for path in changed_workflow_paths(base_sha):
        current_text = path.read_text(encoding="utf-8") if path.exists() else ""
        current_count = inline_block_body_lines(current_text)
        base_text = git_show(base_sha, path)
        if base_text is None:
            if current_count > NEW_WORKFLOW_INLINE_BLOCK_LIMIT:
                failures.append(
                    f"{path}: new workflow has {current_count} inline run-block "
                    f"lines; limit={NEW_WORKFLOW_INLINE_BLOCK_LIMIT}"
                )
            continue
        base_count = inline_block_body_lines(base_text)
        if current_count > base_count:
            failures.append(
                f"{path}: inline run-block lines increased "
                f"{base_count}->{current_count}; move validation logic to "
                ".github/scripts/"
            )
    if failures:
        fail("Workflow inline-growth guard failed:\n" + "\n".join(failures))


def effective_job_names(text: str) -> list[tuple[str, str]]:
    lines = text.splitlines()
    in_jobs = False
    jobs: list[tuple[str, str]] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if line == "jobs:":
            in_jobs = True
            index += 1
            continue
        if in_jobs and line and not line.startswith(" "):
            in_jobs = False
        if not in_jobs:
            index += 1
            continue
        match = re.match(r"^  ([A-Za-z0-9_-]+):\s*$", line)
        if not match:
            index += 1
            continue
        job_id = match.group(1)
        job_name = job_id
        probe = index + 1
        while probe < len(lines):
            candidate = lines[probe]
            if re.match(r"^  [A-Za-z0-9_-]+:\s*$", candidate):
                break
            name_match = re.match(r"^    name:\s*['\"]?([^'\"]+?)['\"]?\s*$", candidate)
            if name_match:
                job_name = name_match.group(1).strip()
                break
            probe += 1
        jobs.append((job_id, job_name))
        index += 1
    return jobs


def enforce_required_audit_uniqueness(paths: list[Path]) -> None:
    audit_contexts: list[str] = []
    for path in paths:
        for _job_id, job_name in effective_job_names(
            path.read_text(encoding="utf-8")
        ):
            if job_name == "audit":
                audit_contexts.append(path.as_posix())
    expected = [REPOSITORY_AUDIT.as_posix()]
    if audit_contexts != expected:
        fail(
            "Required status context 'audit' must be unique to "
            f"{REPOSITORY_AUDIT}: got {audit_contexts!r}"
        )

    repository_text = REPOSITORY_AUDIT.read_text(encoding="utf-8")
    if repository_text.count(GUARD_INVOCATION) != 1:
        fail(
            "Repository audit must invoke workflow_lint_guard.py exactly once."
        )
    lint_text = WORKFLOW_LINT.read_text(encoding="utf-8")
    if lint_text.count(GUARD_INVOCATION) != 1:
        fail(
            "Workflow Lint workflow must invoke workflow_lint_guard.py exactly once."
        )


def main() -> int:
    paths = workflow_files()
    run_actionlint(paths)
    enforce_required_audit_uniqueness(paths)
    enforce_inline_growth(event_base_sha())
    print(
        "Workflow lint PASS: "
        f"actionlint=v{ACTIONLINT_VERSION}; workflows={len(paths)}; "
        "required_audit_context=unique; inline_growth=PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
