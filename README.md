# HANGUL canonical state

This orphan branch is the machine-readable continuity authority for the HANGUL_EXAM project.

- `current.json`: sole hot-state authority.
- `current.schema.json`: strict JSON Schema for `current.json`.
- `audit/state-events.jsonl`: append-only state transition summary.
- Exact pre-migration Drive CURRENT bytes remain preserved by Drive revision IDs recorded in `current.json`.

Application code remains on `main`. Do not merge `state-current` into `main`. State commits must update only this branch.

Update protocol: read branch head -> read and validate `current.json` -> produce desired state -> validate against schema -> create one commit -> fast-forward `state-current` with `force=false` -> read back and validate.
