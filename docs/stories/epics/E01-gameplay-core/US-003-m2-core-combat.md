# US-003 M2 Core Combat

## Status

implemented

## Lane

normal

## Product Contract

Implement the M2 milestone from `docs/TECHNICAL_SPEC.md`: spawn enemies, move
them through a deterministic flow field, target the nearest enemy, apply basic
attack damage, and remove defeated enemies so one allied unit group can clear a
basic wave.

## Relevant Product Docs

- `docs/product/gameplay-core.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/PRODUCT_SPEC.md`

## Acceptance Criteria

- A pure combat simulation can instantiate allied units and enemy spawns from
  typed data without depending on Canvas or browser APIs.
- Enemies follow a deterministic flow field from their spawn gate to the home
  base and can be blocked by occupied board tiles.
- Allied units select the nearest live enemy in range with stable id tie-breaks.
- Basic attacks use the armor mitigation formula and deterministic attack
  timing; dead enemies are removed from active combat.
- The browser HUD/render surface shows seeded M2 combat progress for a small
  Chapter 1 wave.

## Design Notes

- Commands: no CLI/API commands.
- Queries: none.
- API: no public HTTP API.
- Tables: none.
- Domain rules: simulation code stays pure and deterministic; render reads
  combat snapshots and must not own combat rules.
- UI surfaces: browser canvas and HUD text.

## Validation

When updating durable proof status, use numeric booleans:
`_harness/bin/harness-cli story update --id US-003 --unit 1 --integration 0 --e2e 0 --platform 1`.

| Layer       | Expected proof      |
| ----------- | ------------------- |
| Unit        | `npm test -- --run` |
| Integration | Not applicable      |
| E2E         | Not required for M2 |
| Platform    | `npm run build`     |
| Release     | Not required        |

## Harness Delta

None planned.

## Evidence

- `harness-cli story verify US-003` passed with evidence #4.
