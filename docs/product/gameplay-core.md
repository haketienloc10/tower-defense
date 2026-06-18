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

## Non-Goals

- M0 has no combat, shop, data loading, spritesheet animation, audio, save data,
  or enemy spawning.
- M1 still has no combat simulation, shop interaction, enemy spawning, save
  data, audio, or real spritesheet atlas loading.
- M2 has no shop, economy, skills, projectiles, statuses, items, boss behavior,
  save data, audio, or real spritesheet atlas loading.
- M3 has no reroll cost, buy EXP, interest, streaks, auto-merge, item handling,
  synergy buffs, boss behavior, save data, audio, or real drag-and-drop UI.
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
- A production build must succeed.
