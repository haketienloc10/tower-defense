# US-004 M3 Dual Phase

## Status

implemented

## Lane

normal

## Product Contract

Implement the M3 milestone from `docs/TECHNICAL_SPEC.md`: setup and combat phase
state, deterministic shop, buy/place/sell interactions, and a one-wave loop that
lets the player buy units, start combat, resolve the wave, and see the result.

## Relevant Product Docs

- `docs/product/gameplay-core.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/PRODUCT_SPEC.md`

## Acceptance Criteria

- A pure run state machine can start in setup, enter combat from current board
  units, resolve combat, and return to setup for the next wave or result after
  the final wave.
- Setup shop rolls 5 deterministic slots from seeded RNG and level-based unit
  cost odds, using existing unit data.
- Buying a shop unit spends gold, clears the slot, and adds a unit instance to
  the bench; invalid gold, slot, and bench-capacity cases are rejected.
- Bench units can be placed onto valid empty board tiles up to the current level
  cap, moved back to bench, and sold for the baseline 1-star refund.
- Combat setup locks arrangement actions and uses the existing M2 combat
  simulation with the board units selected during setup.
- The browser HUD exposes phase, gold, level, wave, shop, bench, selected
  unit/tile, and buttons/keyboard-compatible controls for buy, place, sell, and
  start combat.

## Design Notes

- Commands: no CLI/API commands.
- Queries: none.
- API: no public HTTP API.
- Tables: none.
- Domain rules: run/shop logic stays pure and deterministic; render reads state
  and dispatches explicit UI intents instead of owning economy or combat rules.
- UI surfaces: browser canvas HUD and DOM controls around the canvas.

## Validation

When updating durable proof status, use numeric booleans:
`_harness/bin/harness-cli story update --id US-004 --unit 1 --integration 0 --e2e 0 --platform 1`.

| Layer       | Expected proof      |
| ----------- | ------------------- |
| Unit        | `npm test -- --run` |
| Integration | Not applicable      |
| E2E         | Not required for M3 |
| Platform    | `npm run build`     |
| Release     | Not required        |

## Harness Delta

None planned.

## Evidence

- `harness-cli story verify US-004` passed with evidence #5.
