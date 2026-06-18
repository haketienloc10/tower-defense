# ĐẶC TẢ KỸ THUẬT (TECHNICAL SPEC)
## Auto-battler Tower Defense — Dựng từ con số 0, không dùng game engine

> Tài liệu này biến Game Design Document (GDD) thành kế hoạch kỹ thuật có thể code được: chọn nền tảng, kiến trúc, mô hình dữ liệu, từng hệ thống con, và lộ trình. Mọi quyết định "engine-level" (vòng lặp, render, va chạm, pathfinding, scene) đều tự xây.

---

## 0. Tóm tắt lựa chọn (TL;DR)

| Hạng mục | Quyết định | Lý do |
| --- | --- | --- |
| Ngôn ngữ | **TypeScript** | Type-safe, vòng lặp dev nhanh, dễ debug, không cần engine |
| Render | **HTML5 Canvas 2D** (nâng cấp WebGL2 nếu cần) | Đủ cho pixel-art isometric với vài trăm sprite |
| Build/dev | **Vite** | Chỉ là bundler/dev-server, **không phải engine** |
| Đóng gói | Trình duyệt; sau này **Tauri** cho bản desktop | Cross-platform, nhẹ |
| Hình ảnh | **Pixel-art 2.5D isometric** | Voxel/3D thật đòi tự viết renderer 3D — chi phí quá cao. Nếu muốn "cảm giác voxel" thì pre-render model voxel thành sprite 2D |
| Phụ thuộc ngoài | Gần như không; tự viết RNG có seed, loop, ECS | Giữ "không engine" đúng nghĩa |

Toàn bộ phần còn lại của spec giả định stack trên. Nếu bạn muốn đổi sang C++/SDL2, Rust/macroquad hay Python/pygame, kiến trúc và mô hình dữ liệu vẫn giữ nguyên — chỉ thay lớp render và I/O.

---

## 1. Kiến trúc tổng thể

Game tách thành các lớp độc lập, giao tiếp một chiều từ trên xuống:

```
┌─────────────────────────────────────────────┐
│  Platform layer  (canvas, input, audio, time)│
├─────────────────────────────────────────────┤
│  Engine core     (game loop, RNG, ECS, scene)│
├─────────────────────────────────────────────┤
│  Systems         (combat, economy, synergy…) │
├─────────────────────────────────────────────┤
│  Data            (config JSON: unit/item/wave)│
├─────────────────────────────────────────────┤
│  UI / Render     (HUD, shop, board, sprites)  │
└─────────────────────────────────────────────┘
```

Nguyên tắc cốt lõi:

- **Data-driven:** lính, trang bị, synergy, quái, wave, boss, màn chơi đều định nghĩa trong file JSON. Code đọc data, không hardcode số liệu. Cân bằng game = sửa JSON, không sửa code.
- **Mô phỏng tách khỏi render:** trạng thái trận đấu (simulation) cập nhật theo tick cố định; lớp render chỉ đọc trạng thái và vẽ. Có thể chạy sim không cần vẽ (test, tua nhanh).
- **Deterministic combat:** với cùng một seed + cùng đội hình, pha chiến đấu cho ra kết quả y hệt. Bắt buộc cho debug, test cân bằng, và mở đường cho tính năng "xem lại trận".

---

## 2. Vòng lặp game (Game Loop)

Dùng **fixed timestep** cho mô phỏng, **render interpolation** cho hình ảnh mượt:

```ts
const TICK = 1000 / 30;      // 30 sim ticks/giây (combat tính theo tick)
let acc = 0, last = performance.now();

function frame(now: number) {
  acc += now - last; last = now;
  let steps = 0;
  while (acc >= TICK && steps < 5) {     // clamp để tránh "spiral of death"
    simulate(TICK);                      // cập nhật trạng thái 1 tick
    acc -= TICK; steps++;
  }
  render(acc / TICK);                    // alpha để nội suy vị trí sprite
  requestAnimationFrame(frame);
}
```

- 30 tick/s là đủ cho auto-battler; render vẫn chạy 60fps nhờ nội suy.
- `simulate()` **chỉ** được phép gọi RNG có seed (mục 3) → đảm bảo determinism.
- Pha Chuẩn Bị không cần fixed-step, nhưng vẫn chạy chung loop (sim chỉ xử lý UI/animation).

---

## 3. RNG có seed

Auto-battler đầy yếu tố ngẫu nhiên (shop, chí mạng, đóng băng, thẻ bài, drop đồ). Tự viết một PRNG nhỏ (Mulberry32/xorshift) thay cho `Math.random()`:

```ts
class Rng {
  constructor(private s: number) {}
  next(): number { /* mulberry32 → [0,1) */ }
  int(maxExclusive: number): number { return Math.floor(this.next() * maxExclusive); }
  pick<T>(arr: T[]): T { return arr[this.int(arr.length)]; }
  chance(p: number): boolean { return this.next() < p; }
}
```

- Mỗi **run** (lượt chơi 1 màn) có 1 seed gốc. Mỗi hệ thống dùng stream con riêng (vd `rngShop`, `rngCombat`) để thay đổi logic shop không làm lệch kết quả combat.
- Lưu seed trong save → tái lập lỗi dễ dàng.

---

## 4. Hệ tọa độ Isometric & Render

### 4.1 Lưới và phép chiếu

Bản đồ là lưới ô vuông `(gx, gy)`. Chuyển sang tọa độ màn hình (diamond isometric):

```ts
const TILE_W = 64, TILE_H = 32;   // tỉ lệ 2:1 chuẩn iso
function gridToScreen(gx, gy, originX, originY) {
  return {
    x: (gx - gy) * (TILE_W / 2) + originX,
    y: (gx + gy) * (TILE_H / 2) + originY,
  };
}
function screenToGrid(sx, sy, originX, originY) {  // dùng cho click chuột
  const a = (sx - originX) / (TILE_W / 2);
  const b = (sy - originY) / (TILE_H / 2);
  return { gx: Math.round((a + b) / 2), gy: Math.round((b - a) / 2) };
}
```

> Nếu chọn lưới lục giác (hexagon) như GDD nêu phương án 2, thay bằng axial coordinates `(q, r)` và công thức hex-to-pixel tương ứng. Khuyến nghị **bắt đầu bằng ô vuông** cho đơn giản, đổi sau nếu cần.

### 4.2 Thứ tự vẽ (depth sorting)

- Vẽ nền (tiles) trước, theo thứ tự `gx + gy` tăng dần.
- Vẽ entity (lính/quái/đạn) sau, sort theo khóa `(gx + gy)` rồi tới layer (đất → bóng → thân → bay). Painter's algorithm là đủ.
- Sprite "neo" ở đáy (anchor bottom-center) để đứng đúng trên ô.

### 4.3 Camera & hiệu năng

- Camera = offset `(originX, originY)` + zoom. Hỗ trợ kéo/zoom.
- **Culling:** chỉ vẽ entity nằm trong viewport.
- Vài trăm sprite → Canvas 2D ổn. Khi vượt ~1000 sprite/đạn hoặc cần hiệu ứng nặng, chuyển lớp render sang **WebGL2 + sprite batcher** tự viết (giữ nguyên simulation).
- Dùng **spritesheet/atlas** + `drawImage` cắt frame; gom animation theo state.

---

## 5. Mô hình dữ liệu (Data Schemas)

Đây là "xương sống". Tất cả là TypeScript interface; bản chạy thật là JSON.

### 5.1 Định nghĩa tĩnh (config — không đổi trong lúc chơi)

```ts
interface UnitDef {
  id: string;
  name: string;
  cost: 1 | 2 | 3 | 4 | 5;        // giá ở shop
  traits: TraitId[];               // tộc/hệ: ['fighter', 'frost']…
  baseStats: { hp: number; atk: number; atkSpeed: number; range: number;
               armor: number; moveSpeed: number; energyMax: number };
  skill?: SkillDef;                // kỹ năng khi đầy năng lượng
  starScaling: number;             // hệ số nhân chỉ số mỗi sao (vd 1.8)
  sprite: string;
}

interface TraitDef {               // synergy
  id: TraitId;
  name: string;
  breakpoints: { count: number; effect: BuffEffect }[];  // 2/4/6…
}

interface ItemDef {
  id: string; name: string;
  tier: 'component' | 'completed';
  stats?: Partial<Stats>;          // cộng chỉ số
  onHit?: EffectRef; onCombatStart?: EffectRef;  // hiệu ứng
}
interface ItemRecipe { result: string; inputs: [string, string]; } // 2 mảnh = 1 đồ

interface EnemyDef {
  id: string; name: string;
  stats: { hp; atk; armor; moveSpeed; range };
  behavior: 'walker' | 'flyer' | 'phaser' | 'splitter';
  onDeath?: EffectRef;             // vd: Vua Slime tách 8 con
  reward: { gold: number; itemDropTable?: string };
  isBoss?: boolean; isMiniBoss?: boolean;
}

interface WaveDef {
  index: number;
  spawns: { enemyId: string; count: number; gateId: string; intervalMs: number }[];
  prepGold: number;                // vàng phát đầu wave
}

interface LevelDef {
  id: string; chapter: string; name: string;
  gridSize: { w: number; h: number };
  homePos: { gx: number; gy: number };
  gates: { id: string; gx: number; gy: number }[];
  terrain: TerrainTile[];          // ô dung nham, bụi rậm…
  waves: WaveDef[];
  bossWaves: number[];             // wave nào có boss
  starThresholds: { three: number; two: number };  // % máu Nhà Chính
}
```

### 5.2 Trạng thái runtime (thay đổi liên tục)

```ts
interface UnitInstance {           // 1 lính cụ thể trên bàn
  uid: string; defId: string;
  star: 1 | 2 | 3;
  items: string[];                 // tối đa 3
  tile: { gx: number; gy: number } | null;  // null = đang ở băng ghế dự bị
  // chỉ số đã tính = baseStats * starScaling^(star-1) + items + buff synergy
}

interface CombatEntity {           // thực thể trong pha chiến đấu (lính HOẶC quái)
  eid: string; team: 'ally' | 'enemy';
  pos: Vec2;                       // tọa độ liên tục (không khóa vào ô)
  stats: Stats; hp: number; energy: number;
  target: string | null;
  statuses: Status[];              // frozen, stunned, shielded…
  state: 'idle' | 'moving' | 'attacking' | 'casting' | 'dead';
}

interface RunState {               // trạng thái 1 lượt chơi
  seed: number;
  levelId: string;
  gold: number; level: number; exp: number;  // "level" = số lính tối đa
  bench: UnitInstance[]; board: UnitInstance[];
  homeHp: number; homeHpMax: number;
  waveIndex: number;
  winStreak: number; lossStreak: number;
  shop: (string | null)[];         // 5 ô lính đang bày
  activeSynergies: Record<TraitId, number>;
}

interface SaveProfile {            // tiến trình vĩnh viễn (meta)
  crystals: number;                // Mảnh Tinh Thể
  skillTree: Record<string, number>;
  unlockedUnits: string[];
  levelStars: Record<string, 0|1|2|3>;
  unlockedChallenges: string[];
}
```

---

## 6. ECS nhẹ (Entity-Component-System)

Auto-battler có nhiều thực thể giống nhau, hành vi khác nhau theo trang bị/synergy → ECS rất hợp.

- **Entity:** chỉ là một id.
- **Component:** dữ liệu thuần (Position, Health, Attack, Movement, StatusEffects, Sprite…).
- **System:** hàm chạy mỗi tick, lọc entity theo component cần thiết.

Thứ tự chạy system mỗi tick trong pha chiến đấu:

```
1. SpawnSystem        – nhả quái theo WaveDef
2. TargetingSystem    – chọn mục tiêu (mục 7.2)
3. MovementSystem     – di chuyển theo flow-field / đuổi mục tiêu (mục 7.1)
4. CombatSystem       – tính đòn đánh, nạp năng lượng, chí mạng
5. SkillSystem        – kích hoạt kỹ năng khi đầy năng lượng, AoE
6. StatusSystem       – đếm ngược frozen/stun, hiệu ứng theo thời gian
7. DeathSystem        – xử lý chết, onDeath (slime tách đôi), rớt đồ
8. HomeBaseSystem     – quái chạm Nhà Chính gây damage; awakening <50%
9. WinLoseSystem      – kiểm tra hết quái (thắng) / Nhà Chính = 0 (thua)
```

Để giữ **determinism**: lặp entity theo thứ tự id ổn định, mọi tie-break (mục tiêu gần bằng nhau) giải bằng id, mọi random qua `rngCombat`.

---

## 7. Hệ thống Chiến đấu (Combat)

### 7.1 Di chuyển & Pathfinding

Quái phải tìm đường tới Nhà Chính, vòng qua lính chặn. Với số lượng quái lớn, **flow field** hiệu quả hơn A* cho từng con:

1. Coi ô có lính / chướng ngại là **không đi được**.
2. Chạy BFS/Dijkstra **một lần** từ ô Nhà Chính ra toàn bản đồ → mỗi ô có vector "hướng về nhà".
3. Mọi quái chỉ việc đọc vector ở ô của mình → O(1)/con.
4. Recompute flow field **chỉ khi** bố trí lính thay đổi (đầu pha chiến đấu, hoặc khi có lính chết/bị đẩy).
5. Thêm **local steering** (tránh chồng lên nhau) bằng lực đẩy nhẹ giữa các quái cùng ô.

Lính cận chiến (Đấu Sĩ) "chặn đường": chúng là chướng ngại trong flow field, đồng thời có **aggro range** — khi quái vào tầm, lính rời ô để giao chiến và "khóa" nhau (engagement), tạo điểm nghẽn tự nhiên. Đây là quyết định thiết kế cần playtest để cân: lính khóa cứng hay chỉ chặn thụ động.

### 7.2 Chọn mục tiêu (Targeting AI)

Mỗi loại có chính sách riêng (khớp GDD):

| Loại | Chính sách target |
| --- | --- |
| Đấu Sĩ | Quái **gần nhất** trong tầm; ưu tiên giữ engagement đang có |
| Xạ Thủ | Quái **tiến sát Nhà Chính nhất** (lớn nhất theo flow-field distance) |
| Pháp Sư | Ô có **mật độ quái cao nhất** trong tầm (quét cụm cho AoE) |
| Sát Thủ | Nhảy ra **sau lưng** quái máu thấp/giá trị cao nhất |

Cài như một hàm `pickTarget(entity, world): EntityId` theo `def.targetPolicy`. Dễ thêm policy mới.

### 7.3 Tính sát thương

```
dmg sau giáp = atk * (100 / (100 + armor))          // giảm trừ kiểu %
nếu chí mạng (rng.chance(critChance)): dmg *= critMult
hp_mục_tiêu -= dmg
mỗi đòn đánh: energy += energyPerHit; khi energy >= energyMax → cast skill
```

Áp dụng on-hit effects của trang bị (vd Cuồng Đao tăng tốc đánh sau mỗi đòn), buff synergy, status (frozen = bỏ qua lượt đánh).

### 7.4 Kỹ năng & Đạn

- **Projectile:** entity nhẹ có `pos, vel, dmg, sourceId, targetId`. MovementSystem đẩy đạn; khi chạm thì áp damage/effect.
- **AoE:** kỹ năng Pháp Sư tạo vùng `{center, radius, effect}`; quét entity trong bán kính.
- **Status:** danh sách `{type, durationTicks, magnitude}`; StatusSystem đếm ngược. Băng Giá = `{frozen, 60 ticks}` (2 giây ở 30 tick/s).

---

## 8. Pha Chuẩn Bị & Kinh tế

### 8.1 Shop

- Đầu mỗi wave: phát `prepGold`, roll 5 lính từ **pool theo tier** (xác suất tier phụ thuộc `level` người chơi — giống TFT).
- Pool có giới hạn số lượng mỗi lính → mua nhiều thì cạn (cơ chế "tranh lính" dù là PvE, giúp 3-sao có giá trị).
- Reroll: trừ vàng cố định (vd 2), roll lại 5 ô qua `rngShop`.
- Mua EXP: trừ vàng (vd 4) → cộng exp → lên `level` → tăng số lính tối đa trên bàn.

### 8.2 Vàng: Lãi & Chuỗi

```
lãi = min(floor(gold / 10), 5)                       // tối đa 5
thưởng chuỗi = bảng theo độ dài winStreak/lossStreak  // vd 1/1/2/3…
vàng đầu wave = base + lãi + thưởng chuỗi + (thắng wave trước? +reward)
```

Lưu ý PvE: "thua" = Nhà Chính mất máu nhưng chưa nổ → vẫn tính loss-streak để thưởng vàng comeback.

### 8.3 Đặt lính & Gộp sao

- Kéo-thả giữa bench và board; chặn khi vượt `level` (số lính tối đa).
- **Auto-merge:** sau mỗi lần mua/đặt, quét: có **3 lính cùng `defId` cùng `star`** → gỡ 3, tạo 1 lính `star+1`, gộp trang bị (nếu >3 đồ thì nhả phần dư ra bench túi đồ). 3 lính 2-sao → 1 lính 3-sao.

---

## 9. Synergy (Tộc / Hệ)

- Mỗi tick của pha Chuẩn Bị, tính lại: đếm số lính **khác nhau** (distinct `defId`) mang mỗi trait trên board.
- So với `breakpoints` để biết tier kích hoạt (2/4/6…), áp `BuffEffect` lên các lính phù hợp khi vào combat.
- Hiển thị bảng synergy trên HUD: trait nào sáng, còn thiếu mấy lính.

Bốn trait khởi đầu (theo GDD): Đấu Sĩ (HP+Giáp), Sát Thủ (crit + nhảy sau lưng), Băng Giá (xác suất đóng băng on-hit), Công Nghệ (Nhà Chính hồi máu + bắn laser yểm trợ). Toàn bộ chỉ là data trong `TraitDef` + một số `EffectRef`.

---

## 10. Trang bị (Items)

- Drop từ rương khi hạ Mini-boss/Boss → vào "túi đồ" của run.
- Mảnh cơ bản (component) + mảnh cơ bản = đồ hoàn chỉnh, tra `ItemRecipe` (vd Kiếm B.F + Cung Gỗ = Cuồng Đao).
- Gắn tối đa 3/lính, **không tháo** trừ khi bán lính (bán → nhả lại component theo recipe ngược, hoặc trả nguyên đồ — chọn 1 quy tắc và ghi rõ).
- Áp hiệu ứng qua hook `onCombatStart` / `onHit` / cộng `stats` tĩnh.

---

## 11. Kẻ địch & Boss

Hành vi đặc biệt cài như **behavior + onDeath effect**, không hardcode rải rác:

| Thực thể | Cơ chế | Cài đặt |
| --- | --- | --- |
| Xe Tải Golem | Hất văng lính cận chiến 2 ô | `onHit`: knockback theo flow-field ngược |
| Vua Slime | Chết tách 8 slime nhanh | `onDeath`: spawn 8 enemy con tại pos |
| Bóng Ma Sát Thủ | Tàng hình, xuyên địa hình, nhắm lính yếu | `behavior: phaser` + bỏ qua chướng ngại trong pathfinding |
| Rồng Máy | Thiêu trọn 1 cột dọc | skill AoE theo cột → ép dàn trải đội hình |
| Phù Thủy Không Gian | Dịch chuyển/khóa lính ngẫu nhiên | skill: chọn lính qua `rngCombat`, đổi `pos`, gán status `locked` |
| Cỗ Máy Khoan Đất | Bỏ qua lính, bắn mìn vào Nhà Chính | `behavior: walker` nhưng target = Nhà Chính, immune engagement |

### Nhà Chính
- Là entity đặc biệt: có HP, vị trí cố định, là đích flow-field.
- **Awakening <50% máu:** kích hoạt `homeBase.awaken` — tỏa hào quang hồi máu lính quanh, bật vũ khí phòng vệ; cho phép tiêu vàng nâng cấp trực tiếp trong combat.
- Synergy Công Nghệ cũng tác động lên entity này (hồi máu + laser).

---

## 12. Win / Lose & Chấm sao

- **Thắng:** sống qua wave cuối + diệt boss. Chấm 1–3 sao theo `homeHp / homeHpMax` so với `starThresholds`.
- **Thua:** `homeHp <= 0` → kết thúc run, chơi lại màn.
- WinLoseSystem kiểm tra mỗi tick: không còn enemy còn sống và không còn spawn chờ → thắng wave; hết wave → thắng màn.

---

## 13. Meta-progression (ngoài trận)

- **Mảnh Tinh Thể:** thưởng cuối mỗi run theo kết quả/sao. Tiêu vào **cây kỹ năng** (`SkillTree`): vàng khởi đầu +, chỉ số lính +, máu Nhà Chính +, mở khóa lính mới.
- Skill tree là data; effect cộng vào lúc khởi tạo `RunState`.
- **Chế độ Thử Thách:** đạt 3 sao mở khóa modifier khắc nghiệt (Nhà Chính 1 máu, cấm Xạ Thủ…) — cài như danh sách `RunModifier` áp lên cấu hình run.
- Lưu trong `SaveProfile`.

---

## 14. Tính năng nâng cao (làm sau core ổn định)

- **Địa hình/khí hậu:** `TerrainTile` mang modifier (dung nham +sát thương lửa, bụi rậm cho tàng hình). MovementSystem/CombatSystem đọc ô để áp hiệu ứng.
- **Thẻ Bài Quyết Định (roguelite):** đầu lượt roll 1 thẻ buff/debuff (vd +100 vàng nhưng wave sau gấp đôi quái) — danh sách `DecisionCard` áp lên `RunState`/`WaveDef`.
- **Lai tạo (Mutant Fusion):** ghép 2 lính khác loại tạo đột biến (Đấu Sĩ + Pháp Sư = Hiệp Sĩ Ma Thuật) — bảng `FusionRecipe` riêng, tạo `UnitDef` lai.

---

## 15. Tổ chức thư mục

```
/src
  /platform     canvas.ts  input.ts  audio.ts  storage.ts
  /core         loop.ts  rng.ts  ecs.ts  scene.ts  events.ts
  /math         vec2.ts  iso.ts  flowfield.ts
  /systems      spawn.ts  targeting.ts  movement.ts  combat.ts
                skill.ts  status.ts  death.ts  homebase.ts  winlose.ts
                shop.ts  economy.ts  merge.ts  synergy.ts  items.ts
  /render       renderer.ts  spriteatlas.ts  camera.ts  hud/  shop/
  /scenes       boot.ts  menu.ts  campaign.ts  battle.ts  result.ts
  /data         units.json  traits.json  items.json  recipes.json
                enemies.json  levels/*.json  skilltree.json
  /sim          runstate.ts  combatworld.ts   // mô phỏng thuần, test được
  main.ts
/assets         atlas.png  atlas.json  sfx/  bgm/
/tests          combat.test.ts  economy.test.ts  determinism.test.ts
```

---

## 16. Lộ trình phát triển (Milestones)

| Mốc | Nội dung | Tiêu chí "xong" |
| --- | --- | --- |
| **M0 – Khung** | Loop fixed-step, Canvas, iso grid, click→ô, RNG seed | Vẽ được lưới iso, click ra đúng `(gx,gy)` |
| **M1 – Render & Data** | Spritesheet, depth sort, load JSON, đặt 1 lính tĩnh | Lính hiện đúng ô, sort đúng |
| **M2 – Combat lõi** | Spawn quái, flow-field, target gần nhất, đánh, chết | 1 lính diệt được 1 wave quái cơ bản |
| **M3 – Pha kép** | Setup ↔ Combat state machine, shop, mua/đặt/bán | Chơi trọn 1 wave: mua → đánh → kết quả |
| **M4 – Kinh tế & Sao** | Lãi, chuỗi, exp/level, auto-merge 3→1 | Gộp 3-sao hoạt động, vàng đúng công thức |
| **M5 – Synergy & Item** | 4 trait, drop + ghép đồ, 4 chính sách target | Bật synergy đổi kết quả combat rõ rệt |
| **M6 – Boss & Màn** | Mini-boss/boss hành vi đặc biệt, 1 chapter, win/lose, sao | Hoàn thành 1 màn có boss, chấm sao |
| **M7 – Meta** | Mảnh tinh thể, cây kỹ năng, save, thử thách | Tiến trình giữ qua các lần chơi |
| **M8 – Nâng cao** | Địa hình, thẻ bài, lai tạo, polish, audio | Các tính năng GDD mục 8 |

Khuyến nghị: **vertical slice** ở M3–M4 (1 màn, 6–8 lính, vài loại quái) chơi được trước khi mở rộng nội dung.

---

## 17. Rủi ro kỹ thuật & lưu ý

- **Determinism khó giữ:** mọi `Math.random`, `Array.sort` không ổn định, hay duyệt object theo thứ tự key đều phá determinism. Quy ước: chỉ dùng `rngCombat`, sort kèm tie-break theo id, duyệt entity theo mảng id sắp xếp.
- **Pathfinding khi đông quái:** flow-field giải tốt; nhưng recompute mỗi lần lính chết có thể giật → throttle (gộp recompute trong 1 tick) và cache.
- **Cân bằng:** vì data-driven, dựng sẵn công cụ tua nhanh sim không render (chạy N trận tự động, in winrate) để cân số liệu nhanh.
- **Voxel/3D:** nếu sau này thật sự cần 3D, đó là dự án renderer riêng — nên hoãn và pre-render thành sprite trước.
- **Phạm vi:** GDD rất rộng (synergy + item + roguelite + meta + boss). Bám milestone, đừng làm song song mọi hệ thống.

---

*Spec này đủ để bắt đầu code M0–M2 ngay. Bước tự nhiên tiếp theo là dựng skeleton dự án (Vite + TS) với loop, iso grid và RNG — nếu bạn muốn, tôi tạo luôn bộ khung code khởi đầu đó.*
