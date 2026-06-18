# US-002 M1 Render & Data

## Status

implemented

## Lane

normal

## Product Contract

Implement the M1 milestone from `docs/TECHNICAL_SPEC.md`: data-driven content
definitions, static unit placement, and deterministic render ordering for the
browser canvas board.

## Relevant Product Docs

- `docs/product/gameplay-core.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/PRODUCT_SPEC.md`

## Acceptance Criteria

- Static content for the first units, traits, and Chapter 1 level is available
  as typed JSON-style data modules.
- The browser board renders one or more static unit instances from data instead
  of hardcoding actor display details in the renderer.
- Unit sprites are represented with deterministic placeholder canvas art using
  bottom-center anchoring until real atlas assets exist.
- Board actors sort by `gx + gy` and stable id tie-break so overlapping
  isometric entities draw predictably.
- The HUD reports selected tile, level name, unit count, and M1 data/render
  state.

## Design Notes

- Commands: no CLI/API commands.
- Queries: none.
- API: no public HTTP API.
- Tables: none.
- Domain rules: content data remains separate from render code; depth sorting
  must be deterministic for replay/debug readiness.
- UI surfaces: browser canvas and HUD text.

## Validation

When updating durable proof status, use numeric booleans:
`_harness/bin/harness-cli story update --id US-002 --unit 1 --integration 0 --e2e 0 --platform 1`.

| Layer       | Expected proof      |
| ----------- | ------------------- |
| Unit        | `npm test -- --run` |
| Integration | Not applicable      |
| E2E         | Not required for M1 |
| Platform    | `npm run build`     |
| Release     | Not required        |

## Harness Delta

None planned.

## Evidence

- `harness-cli story verify US-002` passed with evidence #2.
