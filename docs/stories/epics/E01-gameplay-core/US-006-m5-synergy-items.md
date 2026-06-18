# US-006 — M5 Synergy & Item

**Epic:** E01-gameplay-core  
**Lane:** normal  
**Intake:** #6

---

## Overview

Triển khai M5 theo TECHNICAL_SPEC milestone 16:

- **4 trait synergy breakpoints** (Fighter/Assassin/Frost/Tech) áp buff vào combat
- **4 chính sách targeting** (Tanker→nearest, Marksman→closest-to-home, Mage→densest-cluster, Assassin→weakest/highest-value)
- **Item system** cơ bản: 6 mảnh component + 3 công thức ghép đồ (MVP); equip tối đa 3/lính; bán nhả lại đồ
- **HUD synergy display**: hiển thị trait active và progress tới mốc kế

### Current Behavior
- Tất cả lính đều dùng `pickNearestEnemyTarget()` bất kể role
- Không có synergy buff nào được tính khi vào combat
- Không có item nào trong game

### Target Behavior
- Lính Marksman bắn quái gần Nhà Chính nhất; Mage AoE vào cụm đông; Assassin nhắm quái yếu nhất
- Fighter/Frost/Assassin/Tech synergy kích hoạt theo số lính distinct trên board
- Có thể mua mảnh component từ shop, ghép thành đồ hoàn chỉnh, gắn vào lính

### Non-Goals
- Boss cơ chế đặc biệt (M6)
- Thêm lính mới hoặc thay đổi số liệu balance
- UI drag-and-drop (giữ button-based như hiện tại)
- Audio, sprite animation (post-M5)

---

## Scope & Work Phases

**Phase 1 — Synergy computation**
- `src/sim/synergy.ts`: `computeActiveSynergies(board, unitDefs)` → `Record<TraitId, {count, tier}>`
- `src/data/types.ts`: thêm `BuffEffect` type (hp%, armor flat, critChance%, freezeChance%, healRate%)
- Áp buff khi `createCombatWorld()`: tính effective stats từ synergy

**Phase 2 — Targeting policies**
- `src/sim/combat.ts`: thêm `pickTarget(ally, world)` routing theo `role`
  - `Tanker` → `pickNearestEnemyTarget` (existing)
  - `Marksman` → enemy gần Nhà Chính nhất (flow-field distance max)
  - `Mage` → ô mật độ cao nhất trong tầm (cluster)
  - `Assassin` → quái HP thấp nhất trong tầm (nếu nhiều, tie-break id)
- Lưu `role` trong `CombatEntity`

**Phase 3 — Item types & equip**
- `src/data/types.ts`: thêm `ItemDef`, `ItemRecipe`, `ItemEffect`
- `src/data/gameData.ts`: định nghĩa 6 component + 3 công thức MVP
- `UnitInstance.items: string[]` (tối đa 3 item ids)
- `src/sim/run.ts`: `buyItem`, `equipItem`, `craftItem`, `sellUnit` nhả đồ
- Áp item stats khi tính combat entity stats

**Phase 4 — HUD synergy display**
- `src/main.ts`: render synergy panel (trait, count/target mốc kế, active/inactive)
- Hiển thị item slots mỗi lính trong danh sách board/bench

---

## Validation

- Unit tests: `synergy.test.ts` — verify breakpoints đúng số liệu spec
- Unit tests: `combat.test.ts` — extend với targeting policy cho từng role
- Unit tests: `items.test.ts` — craft recipe, equip cap 3, sell nhả đồ
- Chạy `npm test` tất cả green

---

## Definition of Done

- [ ] `computeActiveSynergies` đúng với distinct-count logic
- [ ] Fighter/Assassin/Frost/Tech buff khớp bảng PRODUCT_SPEC §4
- [ ] 4 targeting policies hoạt động đúng mô tả
- [ ] 6 component + 3 recipe hợp lệ trong data
- [ ] Equip/craft/sell logic đúng; cap 3/lính enforced
- [ ] HUD hiển thị synergy panel
- [ ] Tất cả tests pass
