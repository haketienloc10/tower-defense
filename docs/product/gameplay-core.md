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

## Non-Goals

- M0 has no combat, shop, data loading, spritesheet animation, audio, save data,
  or enemy spawning.
- M1 still has no combat simulation, shop interaction, enemy spawning, save
  data, audio, or real spritesheet atlas loading.
- No WebGL, Tauri, or external game engine.

## Validation Expectations

- Unit tests cover seeded RNG determinism, fixed-step loop stepping/clamping,
  and isometric coordinate round trips.
- Unit tests cover M1 data shape, static unit placement, and deterministic depth
  sorting.
- A production build must succeed.
