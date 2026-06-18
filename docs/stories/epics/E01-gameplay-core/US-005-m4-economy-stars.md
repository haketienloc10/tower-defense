# US-005 M4 Economy and Stars

## Status

implemented

## Lane

normal

## Product Contract

Implement the M4 milestone from `docs/TECHNICAL_SPEC.md`: interest, streak
income, EXP/level progression, reroll and buy-EXP costs, level-based board caps,
star-rank refunds, and deterministic 3-to-1 auto-merge.

## Relevant Product Docs

- `docs/product/gameplay-core.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/PRODUCT_SPEC.md`

## Acceptance Criteria

- Resolving a combat wave updates win/loss streaks from home-base damage,
  awards automatic EXP, and grants next-wave setup gold from base + interest +
  streak + clean-wave bonus.
- Buying EXP costs 4 gold for 4 EXP, supports deterministic multi-level
  progression through the product level table, and updates the board unit cap.
- Board placement refuses when the current level cap is reached.
- Reroll costs 2 gold, refuses when gold is insufficient, and uses the existing
  seeded shop RNG.
- Selling 1-star, 2-star, and 3-star units refunds cost, cost x 3 - 1, and
  cost x 9 - 1 respectively.
- Buying or moving units auto-merges three matching units of the same `defId`
  and star into a single higher-star unit, capped at 3-star.
- The browser HUD exposes the new economy and star state with controls for
  reroll and buy EXP.

## Design Notes

- Commands: no CLI/API commands.
- Queries: none.
- API: no public HTTP API.
- Tables: none.
- Domain rules: economy, level progression, refunds, and merge logic stay in
  pure run-state helpers; render/UI only dispatches explicit intents.
- UI surfaces: browser canvas HUD and DOM controls around the canvas.

## Validation

When updating durable proof status, use numeric booleans:
`_harness/bin/harness-cli story update --id US-005 --unit 1 --integration 0 --e2e 0 --platform 1`.

| Layer       | Expected proof      |
| ----------- | ------------------- |
| Unit        | `npm test -- --run` |
| Integration | Not applicable      |
| E2E         | Not required for M4 |
| Platform    | `npm run build`     |
| Release     | Not required        |

## Harness Delta

None planned.

## Evidence

- `harness-cli story verify US-005` passed with evidence #8.
