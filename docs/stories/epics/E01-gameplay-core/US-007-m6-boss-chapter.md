# US-007 — M6 Boss & Chapter

**Epic:** E01-gameplay-core  
**Lane:** normal  
**Intake:** #7

---

## Overview

Triển khai M6 theo `docs/TECHNICAL_SPEC.md` milestone 16:

- Chapter 1 có 10 wave chơi được, gồm mini-boss wave 5 và boss wave 10
- Vua Slime tách 8 Slime Con nhanh khi chết
- Rồng Máy telegraph một cột rồi gây sát thương theo cột
- Run kết thúc sau wave cuối với win/loss và chấm 1-3 sao theo HP Nhà Chính
- HUD hiển thị trạng thái boss/miniboss, telegraph và kết quả cuối

### Current Behavior

- Level đầu tiên chỉ có wave combat cơ bản; chưa có chapter 10 wave.
- Enemy data chưa biểu diễn đủ mini-boss/boss behavior đặc biệt.
- Run result hiện chỉ phân biệt hết wave đơn giản, chưa có star rating.

### Target Behavior

- Người chơi có thể tiến qua Chapter 1 gồm 10 wave trong run hiện tại.
- Wave 5 spawn Vua Slime; khi chết sinh 8 Slime Con nhanh ở cùng vị trí.
- Wave 10 spawn Rồng Máy; boss telegraph cột rồi gây sát thương ally trong cột.
- Khi wave cuối resolve, run chuyển sang result với `victory`, `stars`,
  `homeHpRemaining`, và `wavesCompleted`.

### Non-Goals

- Campaign map, save/meta progression, challenge modifiers
- Full boss art/audio animation
- Bosses Chapter 2-3
- Real drag-and-drop UI

---

## Scope & Work Phases

**Phase 1 — Chapter data**

- Extend enemy definitions with mini-boss/boss metadata and optional behavior.
- Extend Chapter 1 level data to 10 waves matching the MVP campaign shape.
- Add star thresholds to level data if not already available.

**Phase 2 — Boss behavior simulation**

- Add deterministic death behavior for Vua Slime splitting into 8 fast Slime
  Con.
- Add deterministic timed telegraph state for Rồng Máy column attack.
- Apply column damage after the telegraph delay and clear the telegraph state.

**Phase 3 — Run result**

- Keep setup/combat progression through all 10 waves.
- Compute final result after the last wave based on home HP and level star
  thresholds.
- Preserve existing one-wave setup/combat flow behavior for earlier tests.

**Phase 4 — HUD**

- Show current wave out of total waves and boss/miniboss label when applicable.
- Show active telegraph column when Rồng Máy is preparing an attack.
- Show final result win/loss and stars.

---

## Validation

- Unit tests: chapter data contains 10 waves with mini-boss wave 5 and boss
  wave 10.
- Unit tests: Vua Slime death spawns exactly 8 faster Slime Con enemies.
- Unit tests: Rồng Máy telegraph damages allies in the targeted column after
  delay.
- Unit tests: final result computes 1-3 stars from HP thresholds.
- Run `npm test` and `npm run build`.

---

## Definition of Done

- [ ] Chapter 1 10-wave data is present and deterministic.
- [ ] Mini-boss/boss metadata is represented in enemy or wave data.
- [ ] Vua Slime split behavior works in pure simulation.
- [ ] Rồng Máy telegraph and column damage work in pure simulation.
- [ ] Final run result includes win/loss and star rating.
- [ ] Browser HUD exposes M6 state.
- [ ] Tests and build pass.
