#!/usr/bin/env python3
import json
import re
import sys


def fail(message: str) -> None:
    raise SystemExit(message)


def main() -> None:
    if len(sys.argv) != 6:
        fail('usage: validate.py authority.json writer.json source_sha source_digest evidence.json')
    authority_path, writer_path, source_sha, source_digest, evidence_path = sys.argv[1:6]
    if re.fullmatch(r'[0-9a-f]{40}', source_sha) is None:
        fail('Invalid source SHA.')
    if re.fullmatch(r'[0-9a-f]{64}', source_digest) is None:
        fail('Invalid source digest.')

    with open(authority_path, encoding='utf-8') as fh:
        authority_env = json.load(fh)
    with open(writer_path, encoding='utf-8') as fh:
        writer_env = json.load(fh)
    if authority_env.get('error') is not None:
        fail('Authority readback returned an Apps Script error.')
    if writer_env.get('error') is not None:
        fail('Writer-state readback returned an Apps Script error.')

    authority = authority_env.get('response')
    writer = writer_env.get('response')
    expected_authority = {
        'status': 'PASS',
        'authority_mode': 'D1',
        'cutover_locked': True,
        'expected_backend_url': True,
        'bearer_present': True,
        'health_status': 'PASS',
        'database_status': 'AVAILABLE',
        'worker_d1_route_verified': True,
        'mutation_count': 0,
    }
    if not isinstance(authority, dict):
        fail('Authority readback response is not an object.')
    for key, value in expected_authority.items():
        if authority.get(key) != value:
            fail(f'Authority readback mismatch for {key}: {authority.get(key)!r} != {value!r}')

    if not isinstance(writer, dict):
        fail('Writer-state readback response is not an object.')
    if writer.get('schema') != 'H3_P4_ASSET_WRITER_STATUS_V1':
        fail('Unexpected asset-writer status schema.')
    if writer.get('mode') != 'QUIESCED':
        fail(f"Asset writer is not QUIESCED: {writer.get('mode')!r}")
    if writer.get('mutation_count') != 0:
        fail('Asset-writer readback mutation_count is not zero.')
    count = writer.get('fallback_trigger_count')
    if not isinstance(count, int) or isinstance(count, bool) or count < 0:
        fail('Asset-writer fallback_trigger_count is invalid.')
    for key in ('quiesce_watermark', 'transition_watermark'):
        if not isinstance(writer.get(key), str):
            fail(f'Asset-writer {key} is not a string.')

    evidence = {
        'schema': 'H3_MIG_ASSET_ACCEPTANCE_5_STATE_READBACK_V1',
        'status': 'PASS_READ_ONLY',
        'source_sha': source_sha,
        'source_digest': source_digest,
        'authority': authority,
        'asset_writer': writer,
        'write_performed': False,
    }
    with open(evidence_path, 'w', encoding='utf-8') as fh:
        json.dump(evidence, fh, separators=(',', ':'), sort_keys=True)
        fh.write('\n')
    print('MIG-ASSET-ACCEPTANCE-5 state readback PASS')


if __name__ == '__main__':
    main()
