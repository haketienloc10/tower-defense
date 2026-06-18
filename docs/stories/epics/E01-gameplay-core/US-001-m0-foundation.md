# US-001 M0 Foundation

## Status

planned

## Lane

normal

## Product Contract

Implement the M0 foundation from `docs/TECHNICAL_SPEC.md`: Vite + TypeScript
browser app, Canvas 2D render surface, fixed-step simulation loop, seedable RNG,
isometric grid drawing, and click-to-grid selection feedback.

## Relevant Product Docs

- `docs/product/gameplay-core.md`
- `docs/TECHNICAL_SPEC.md`

## Acceptance Criteria

- `npm run dev` starts a browser app with a Canvas 2D isometric board.
- The board draws a stable square-grid isometric map.
- Clicking inside the board updates visible selected tile coordinates.
- Core loop logic advances simulation in fixed 30 FPS ticks and clamps catch-up
  steps.
- Game logic randomness uses a deterministic seedable RNG utility.

## Design Notes

- Commands: Vite scripts in `package.json`.
- Queries: none.
- API: no public HTTP API.
- Tables: none.
- Domain rules: deterministic RNG, fixed timestep, stable isometric projection.
- UI surfaces: browser canvas plus minimal HUD text for seed, tick count, and
  selected tile.

## Validation

When updating durable proof status, use numeric booleans:
`_harness/bin/harness-cli story update --id US-001 --unit 1 --integration 0 --e2e 0 --platform 1`.

| Layer       | Expected proof                       |
| ----------- | ------------------------------------ |
| Unit        | `npm test -- --run`                  |
| Integration | Not applicable for M0                |
| E2E         | Not required for M0                  |
| Platform    | `npm run build`                      |
| Release     | Not required before later milestones |

## Harness Delta

- Created `docs/KNOWLEDGE_INDEX.md` because Harness orient file was missing.
- Initialized `_harness/harness.db` because durable state was absent.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
