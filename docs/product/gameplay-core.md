# Gameplay Core

## Purpose

The game is an Auto-battler Tower Defense implemented without a game engine. The
first playable foundation must prove the browser runtime, deterministic
simulation utilities, and isometric board interaction described in
`docs/TECHNICAL_SPEC.md`.

## M0 Foundation Contract

- The app runs as a Vite + TypeScript browser surface.
- Rendering uses HTML5 Canvas 2D, not a game engine.
- Simulation timing uses a fixed 30 ticks/second loop with a render callback
  that receives interpolation alpha.
- Randomness uses a seedable PRNG instead of `Math.random()` for game logic.
- The first board is an isometric square grid with deterministic
  `gridToScreen()` and `screenToGrid()` conversion helpers.
- The player can click the canvas and see the selected grid coordinate.

## M1 Render & Data Contract

- Static gameplay content is loaded from JSON-style data modules rather than
  hardcoded directly inside render code.
- Unit definitions include id, display name, cost tier, traits, base combat
  stats, star scaling, target role, and sprite metadata needed by later systems.
- Trait definitions and the first level definition exist as data contracts that
  mirror `docs/TECHNICAL_SPEC.md`.
- The board can render at least one static unit instance on a tile using
  bottom-center anchoring.
- Render ordering sorts board actors by isometric depth (`gx + gy`) with a
  stable id tie-break so entities on lower tiles draw in front.
- The visible HUD exposes selected tile, loaded level, unit count, and data
  milestone state for the M1 slice.

## M2 Core Combat Contract

- The simulation can spawn enemies from a `WaveDef` into a pure combat world
  without requiring Canvas or browser APIs.
- Enemy movement uses a deterministic grid flow field from gates toward the home
  base and respects board blockers.
- The first combat targeting policy selects the nearest live enemy in range with
  stable id tie-breaks.
- Combat attacks apply the armor mitigation formula from
  `docs/TECHNICAL_SPEC.md` and remove dead entities deterministically.
- The browser slice can run a small seeded combat demo where static allied units
  fight a basic Chapter 1 wave.
- The HUD exposes combat wave progress, alive enemy count, defeated enemy count,
  and whether the wave has ended.

## M3 Dual-Phase Contract

- A run has an explicit phase state machine for setup and combat.
- Setup can roll a deterministic 5-slot shop from seeded RNG and unit cost odds.
- Buying a shop unit spends gold, removes the shop slot, creates a bench unit,
  and refuses purchases when gold, slot, or bench capacity is invalid.
- Bench units can be placed on valid empty board tiles up to the current player
  level cap, moved back to bench, and sold for the baseline 1-star refund.
- Starting combat builds a pure combat world from the current board units and
  locks setup changes until the wave resolves.
- Resolving a combat wave returns to setup for the next wave and grants the next
  wave prep gold; after the final wave the run enters a result state.
- The browser HUD exposes phase, gold, player level, wave, shop, bench, selected
  unit/tile, and M3 controls for buy/place/sell/start interactions.

## M4 Economy & Stars Contract

- Wave income uses the product formula: base gold plus interest capped at 5,
  streak bonus from the absolute win/loss streak, and a clean-wave bonus when
  the home base took no damage.
- Combat resolution updates win/loss streaks deterministically from home-base
  damage, grants the next setup income, and keeps the run in setup until the
  final result.
- Player level and EXP follow the product table; each resolved wave grants
  automatic EXP, and buying EXP costs 4 gold for 4 EXP with deterministic
  multi-level progression.
- Board placement is limited by the unit cap associated with the current player
  level.
- Selling units refunds according to star rank and original unit cost: 1-star =
  cost, 2-star = cost x 3 - 1, 3-star = cost x 9 - 1.
- Buying or moving units triggers auto-merge: three units with the same
  definition and star rank merge into one higher-star unit up to 3-star.
- Shop reroll costs 2 gold, refuses when gold is insufficient, and rolls from
  the seeded shop RNG.
- The browser HUD exposes interest, streaks, EXP progress, level cap, reroll,
  buy EXP, star rank, and refund information for the M4 slice.

## M5 Synergy & Item Contract

- Board synergies count distinct unit definitions per trait and activate the
  Fighter, Assassin, Frost, and Tech breakpoints from `docs/PRODUCT_SPEC.md`.
- Combat world creation applies active synergy and equipped item stats to allied
  combat entities deterministically.
- Allied targeting supports the four MVP roles: Tanker nearest target, Marksman
  closest-to-home target, Mage densest enemy cluster, and Assassin weakest
  target.
- The run supports a basic item inventory, MVP component recipes, item equip cap
  of 3 per unit, and item return when selling a unit.
- The browser HUD exposes active synergy progress and unit item slots.

## M6 Boss & Chapter Contract

- Chapter 1 has a playable 10-wave sequence matching the MVP campaign shape:
  ordinary waves, a Vua Slime mini-boss at wave 5, and a Rồng Máy boss at
  wave 10.
- Enemy definitions can mark mini-boss and boss entities, scale their stats by
  wave, and attach deterministic special behavior hooks.
- Vua Slime splits into 8 fast Slime Con enemies on death.
- Rồng Máy periodically telegraphs a board column before damaging allied units
  in that column.
- The run reaches a final result only after the last Chapter 1 wave resolves,
  reports win/loss, and awards 1-3 stars from remaining home HP percentage.
- The browser HUD exposes boss/miniboss wave state, telegraph state, and final
  result stars for the M6 slice.

## Non-Goals

- M0 has no combat, shop, data loading, spritesheet animation, audio, save data,
  or enemy spawning.
- M1 still has no combat simulation, shop interaction, enemy spawning, save
  data, audio, or real spritesheet atlas loading.
- M2 has no shop, economy, skills, projectiles, statuses, items, boss behavior,
  save data, audio, or real spritesheet atlas loading.
- M3 has no reroll cost, buy EXP, interest, streaks, auto-merge, item handling,
  synergy buffs, boss behavior, save data, audio, or real drag-and-drop UI.
- M4 has no synergy buffs, item handling, boss behavior, save data, audio, real
  drag-and-drop UI, or campaign/meta progression.
- M5 has no boss behavior, full chapter result screen, meta progression, save
  data, audio, real drag-and-drop UI, or campaign map.
- M6 has no meta progression, save data, challenge modifiers, audio, real
  drag-and-drop UI, or campaign map.
- No WebGL, Tauri, or external game engine.

## Validation Expectations

- Unit tests cover seeded RNG determinism, fixed-step loop stepping/clamping,
  and isometric coordinate round trips.
- Unit tests cover M1 data shape, static unit placement, and deterministic depth
  sorting.
- Unit tests cover M2 flow-field movement, nearest-target selection, armor
  damage calculation, deterministic wave outcomes, and enemy death handling.
- Unit tests cover M3 seeded shop determinism, buy/place/sell constraints, phase
  transitions, and one-wave setup-to-combat resolution.
- Unit tests cover M4 income, streaks, EXP/level progression, reroll cost,
  star-rank refunds, auto-merge, and level-cap placement.
- Unit tests cover M5 synergy breakpoints, targeting roles, item recipes, equip
  limits, and item return on sell.
- Unit tests cover M6 chapter wave data, Vua Slime split on death, Rồng Máy
  column telegraph damage, final win/loss, and star rating thresholds.
- A production build must succeed.
