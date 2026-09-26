#!/usr/bin/env python3
from pathlib import Path
import re

sync_path = Path('.github/workflows/apps-script-auto-sync.yml')
ops_path = Path('OPERATIONS.md')
alignment_helper_path = Path('.github/scripts/production_trigger_alignment.py')
sync = sync_path.read_text(encoding='utf-8')
ops = ops_path.read_text(encoding='utf-8')
alignment_helper = alignment_helper_path.read_text(encoding='utf-8')
github_attempt_token = '$' + '{{ github.run_attempt }}'
command = 'run-' + 'function'

required_sync = [
    'intended_smoke_sha:',
    'Detect read-only smoke preflight request',
    'Detect automatic live smoke plan',
    'Validate exact-main observability source-binding boundary',
    'Bind exact-main observability source provenance',
    'h3ObservabilityBindSource',
    'steps.source_binding_boundary.outputs.ready',
    'Validate automatic read-only live smoke boundary',
    'Run impact-selected automatic live smoke',
    'h3AutomaticLiveSmoke',
    'steps.automatic_smoke_boundary.outputs.ready',
    'Validate one-revision read-only smoke boundary',
    github_attempt_token,
    'steps.source_attestation.outputs.attested',
    'steps.smoke_boundary.outputs.ready',
]
missing_sync = [token for token in required_sync if token not in sync]
if missing_sync:
    raise SystemExit(
        'Apps Script credentialed execution boundary missing from auto-sync: '
        + ', '.join(missing_sync)
    )

required_ops = [
    'Exact-main observability source binding',
    'Automatic live smoke',
    'H3_AUTOMATIC_LIVE_SMOKE_REQUEST_V1',
    'H3_OBSERVABILITY_SOURCE_SHA',
    'H3_OBSERVABILITY_SOURCE_DIGEST',
    'manual workflow_dispatch with intended_smoke_sha=',
    'run_attempt=1',
    'authenticated source_attestation',
    'Production monitor trigger alignment',
    'h3MonitoringProductionTriggerRealignToHour',
    'nearMinute(0)',
    "if: steps.automatic_smoke_boundary.outputs.ready == 'true'",
    "if: steps.smoke_boundary.outputs.ready == 'true'",
    'Remote-only deletion refresh',
]
missing_ops = [token for token in required_ops if token not in ops]
if missing_ops:
    raise SystemExit(
        'Apps Script credentialed execution documentation missing: '
        + ', '.join(missing_ops)
    )


required_alignment_helper = [
    'FUNCTION = "h3MonitoringProductionTriggerRealignToHour"',
    '"run-function"',
    '"@google/clasp@3.4.0"',
    '"configured_near_minute": 0',
    '"configured_timezone": "Asia/Tokyo"',
    'os.environ.get("TRIGGER_NAME", "") != "workflow_run"',
    'os.environ.get("TRIGGER_AUDIT_SHA", "") != source_sha',
]
missing_alignment_helper = [
    token for token in required_alignment_helper
    if token not in alignment_helper
]
if missing_alignment_helper:
    raise SystemExit(
        'Production trigger alignment helper contract missing: '
        + ', '.join(missing_alignment_helper)
    )

for helper_path in sorted(Path('.github/scripts').glob('*')):
    if helper_path == alignment_helper_path or not helper_path.is_file():
        continue
    try:
        helper_text = helper_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    if re.search(r'\\bclasp\\b[^\\n]*\\brun-function\\b', helper_text):
        raise SystemExit(
            'Credentialed clasp run-function is not allowlisted in helper scripts: '
            + str(helper_path)
        )

d=sync.find('Detect Apps Script remote file-set drift')
p=sync.find('Push audited main to Apps Script HEAD')
a=sync.find('Attest Apps Script HEAD source against exact audited main')
if not (0 <= d < p < a):
    raise SystemExit('Delete-only sync order invalid.')
w=sync[p:a]
for t in ['H3_DELETE_ONLY_SYNC_REFRESH','git diff --exit-code -- "$marker_file"',"steps.remote_file_set.outputs.refresh == 'true'"]:
    if t not in w:
        raise SystemExit('Delete-only sync guard missing: '+t)

command_refs = []
pattern = re.compile(
    rf'(?m)^[^#\n]*\bclasp\b[^\n]*\b{re.escape(command)}\b'
)
for path in sorted(Path('.github/workflows').glob('*.yml')):
    contents = path.read_text(encoding='utf-8')
    for match in pattern.finditer(contents):
        line_end = contents.find('\n', match.start())
        if line_end < 0:
            line_end = len(contents)
        command_refs.append((
            path,
            match.start(),
            contents,
            contents[match.start():line_end],
        ))

binding_refs = 0
automatic_refs = 0
manual_refs = 0

for path, pos, contents, line in command_refs:
    if path != sync_path:
        raise SystemExit(
            f'Credentialed clasp execution is only allowed in {sync_path}: {path}'
        )

    binding_boundary_pos = contents.find(
        'Validate exact-main observability source-binding boundary'
    )
    automatic_boundary_pos = contents.find(
        'Validate automatic read-only live smoke boundary'
    )
    manual_boundary_pos = contents.find(
        'Validate one-revision read-only smoke boundary'
    )

    if 'h3ObservabilityBindSource' in line:
        binding_refs += 1
        if (
            binding_boundary_pos < 0
            or automatic_boundary_pos < 0
            or pos <= binding_boundary_pos
            or pos >= automatic_boundary_pos
        ):
            raise SystemExit(
                'Observability source binding must occur after its '
                'exact-main boundary and before the automatic smoke boundary.'
            )
        prefix = contents[max(binding_boundary_pos, pos - 2200):pos]
        if (
            "if: steps.source_binding_boundary.outputs.ready == 'true'"
            not in prefix
        ):
            raise SystemExit(
                'Observability source binding must be gated by '
                'source_binding_boundary ready=true.'
            )
        continue

    if 'h3AutomaticLiveSmoke' in line:
        automatic_refs += 1
        if (
            automatic_boundary_pos < 0
            or manual_boundary_pos < 0
            or pos <= automatic_boundary_pos
            or pos >= manual_boundary_pos
        ):
            raise SystemExit(
                'Automatic live smoke must occur after its permanent '
                'automatic boundary and before the manual smoke boundary.'
            )
        prefix = contents[max(automatic_boundary_pos, pos - 2600):pos]
        if (
            "if: steps.automatic_smoke_boundary.outputs.ready == 'true'"
            not in prefix
        ):
            raise SystemExit(
                'Automatic live smoke must be gated by '
                'automatic_smoke_boundary ready=true.'
            )
        continue

    manual_refs += 1
    if manual_boundary_pos < 0 or pos <= manual_boundary_pos:
        raise SystemExit(
            'Ad hoc credentialed smoke execution must occur after the manual smoke boundary.'
        )
    prefix = contents[max(manual_boundary_pos, pos - 1200):pos]
    if "if: steps.smoke_boundary.outputs.ready == 'true'" not in prefix:
        raise SystemExit(
            'Ad hoc credentialed smoke execution must be gated by smoke_boundary ready=true.'
        )

if binding_refs != 1:
    raise SystemExit(
        f'Expected exactly one permanent observability binding command; found {binding_refs}.'
    )
if automatic_refs != 1:
    raise SystemExit(
        f'Expected exactly one permanent automatic live smoke command; found {automatic_refs}.'
    )


print(
    'Credentialed Apps Script execution boundaries: PASS; '
    f'observability binding refs={binding_refs}; '
    f'automatic smoke refs={automatic_refs}; '
    f'ad hoc smoke refs={manual_refs}'
)
