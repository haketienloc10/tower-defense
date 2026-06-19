# US-008 — M7 Visual Polish

**Epic:** E01-gameplay-core  
**Lane:** normal  
**Intake:** #8

---

## Overview

Nâng cấp đồ họa browser slice sau M6 để game bắt mắt hơn: lính và quái có hình
ảnh riêng, combat có hiệu ứng đánh nhau/kỹ năng/chết/lên cấp, và board/HUD có
thêm phản hồi sống động.

### Current Behavior

- Board, units, enemies, and bosses mostly render as simple Canvas shapes.
- Visual feedback for attacks, deaths, boss telegraph, merge/level-up, and wave
  state is sparse.
- Render metadata exists but has not yet become a replaceable character-art
  layer.

### Target Behavior

- Allied units and enemies have distinct visual identities in Canvas render.
- Combat exposes hit flashes, damage numbers, projectile or attack trails, skill
  casts, death bursts, boss telegraph emphasis, and level-up/merge celebrations.
- Visual effects are derived from simulation state or UI actions and never
  change deterministic combat results.
- Static art assets can be generated or replaced independently from simulation
  code.

### Non-Goals

- Audio system
- WebGL renderer or external game engine
- New combat balance or enemy AI behavior
- Save/meta progression
- Campaign map

---

## Scope & Work Phases

**Phase 1 — Visual asset layer**

- Add project-local game art assets for ally/enemy identities when useful.
- Add or extend unit/enemy render metadata to map definitions to art style.
- Preserve current data-driven content shape.

**Phase 2 — Canvas presentation**

- Redesign board, actor, shadow, health, star, gate, home, and HUD treatment.
- Render ally and enemy silhouettes/portraits distinctly.
- Keep responsive canvas behavior intact.

**Phase 3 — Effects**

- Add render-only effects for attacks, projectiles, damage numbers, deaths,
  skill casts, merge/level-up, and boss telegraph.
- Drive effects from deterministic deltas or UI action outcomes.

**Phase 4 — Validation**

- Cover any pure derivation helpers with unit tests.
- Run `npm test` and `npm run build`.

## Validation

- Unit tests: render metadata or visual event derivation remains deterministic.
- Build: `npm run build` succeeds.
- Manual browser smoke: visual effects appear during combat without console
  errors.

## Definition of Done

- [x] Distinct ally/enemy visuals are visible in the browser game.
- [x] Combat has readable attack, hit, skill, death, boss telegraph, and damage
  feedback.
- [x] Merge/level-up actions show a celebration effect.
- [x] Art/visual metadata stays data-driven and simulation-safe.
- [x] Tests and build pass.

## Evidence

- Harness verify evidence #13: `npm run validate:quick` passed
  (33 Vitest tests + production build).
- Screenshot evidence #14:
  `_harness/evidence/US-008/screenshot-4cb3329f8b1995b4.png`.
