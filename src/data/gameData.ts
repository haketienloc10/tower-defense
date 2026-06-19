import type {
  EnemyDef,
  ItemDef,
  ItemRecipe,
  LevelDef,
  SpriteDef,
  TraitDef,
  UnitDef,
  VisualShape,
} from "./types";

export const UNIT_DEFS = [
  unit(
    "iron-guard",
    "Vệ Binh Sắt",
    1,
    "Tanker",
    ["fighter", "tech"],
    {
      hp: 650,
      atk: 40,
      atkSpeed: 0.6,
      range: 1,
      armor: 30,
      energyStart: 0,
      energyMax: 60,
    },
    "Khiên Chắn",
    "#7aa2ff",
  ),
  unit(
    "trainee-archer",
    "Cung Thủ Tập Sự",
    1,
    "Marksman",
    ["frost"],
    {
      hp: 450,
      atk: 45,
      atkSpeed: 0.75,
      range: 4,
      armor: 10,
      energyStart: 0,
      energyMax: 50,
    },
    "Mũi Tên Buốt",
    "#8ee6d2",
  ),
  unit(
    "dagger",
    "Dao Găm",
    1,
    "Assassin",
    ["assassin"],
    {
      hp: 500,
      atk: 55,
      atkSpeed: 0.7,
      range: 1,
      armor: 15,
      energyStart: 0,
      energyMax: 40,
    },
    "Đâm Lén",
    "#d993ff",
  ),
  unit(
    "frost-knight",
    "Hiệp Sĩ Băng",
    2,
    "Tanker",
    ["fighter", "frost"],
    {
      hp: 800,
      atk: 50,
      atkSpeed: 0.6,
      range: 1,
      armor: 35,
      energyStart: 30,
      energyMax: 100,
    },
    "Va Băng",
    "#9ccfff",
  ),
  unit(
    "fire-mage",
    "Pháp Sư Lửa",
    2,
    "Mage",
    ["tech"],
    {
      hp: 500,
      atk: 40,
      atkSpeed: 0.65,
      range: 3,
      armor: 12,
      energyStart: 0,
      energyMax: 80,
    },
    "Cầu Lửa",
    "#ff9c66",
  ),
  unit(
    "shadow-assassin",
    "Sát Thủ Bóng",
    2,
    "Assassin",
    ["assassin", "frost"],
    {
      hp: 550,
      atk: 60,
      atkSpeed: 0.75,
      range: 1,
      armor: 18,
      energyStart: 0,
      energyMax: 50,
    },
    "Lướt Bóng",
    "#b17aff",
  ),
  unit(
    "laser-gunner",
    "Xạ Thủ Laser",
    3,
    "Marksman",
    ["tech"],
    {
      hp: 600,
      atk: 60,
      atkSpeed: 0.8,
      range: 4,
      armor: 15,
      energyStart: 0,
      energyMax: 60,
    },
    "Tia Xuyên",
    "#62d0ff",
  ),
  unit(
    "frost-warden",
    "Vệ Thần Băng Giá",
    3,
    "Tanker",
    ["fighter", "frost"],
    {
      hp: 950,
      atk: 55,
      atkSpeed: 0.6,
      range: 1,
      armor: 45,
      energyStart: 40,
      energyMax: 120,
    },
    "Hào Băng",
    "#c5ecff",
  ),
  unit(
    "frost-mage",
    "Pháp Sư Băng",
    3,
    "Mage",
    ["frost"],
    {
      hp: 600,
      atk: 50,
      atkSpeed: 0.65,
      range: 3,
      armor: 15,
      energyStart: 30,
      energyMax: 90,
    },
    "Bão Tuyết",
    "#a7f0ff",
  ),
  unit(
    "archmage",
    "Đại Pháp Sư",
    4,
    "Mage",
    ["tech"],
    {
      hp: 700,
      atk: 65,
      atkSpeed: 0.7,
      range: 3,
      armor: 18,
      energyStart: 0,
      energyMax: 100,
    },
    "Thiên Thạch",
    "#ffbf69",
  ),
  unit(
    "executor",
    "Hành Quyết Giả",
    4,
    "Assassin",
    ["assassin"],
    {
      hp: 750,
      atk: 85,
      atkSpeed: 0.85,
      range: 1,
      armor: 25,
      energyStart: 0,
      energyMax: 60,
    },
    "Trảm",
    "#ff7a93",
  ),
  unit(
    "mecha-general",
    "Đại Tướng Cơ Khí",
    5,
    "Tanker",
    ["fighter", "tech"],
    {
      hp: 1100,
      atk: 90,
      atkSpeed: 0.75,
      range: 1,
      armor: 50,
      energyStart: 50,
      energyMax: 130,
    },
    "Khai Hỏa",
    "#ffd166",
  ),
] as const satisfies readonly UnitDef[];

export const TRAIT_DEFS = [
  {
    id: "fighter",
    name: "Đấu Sĩ",
    breakpoints: [
      {
        count: 2,
        summary: "Toàn đội +15% HP tối đa, +10 Giáp",
        effect: { hpPct: 0.15, armorFlat: 10 },
      },
      {
        count: 4,
        summary: "Toàn đội +30% HP tối đa, +25 Giáp",
        effect: { hpPct: 0.3, armorFlat: 25 },
      },
      {
        count: 6,
        summary: "Toàn đội +50% HP, +45 Giáp, giảm 15% sát thương nhận",
        effect: { hpPct: 0.5, armorFlat: 45, dmgReductionPct: 0.15 },
      },
    ],
  },
  {
    id: "assassin",
    name: "Sát Thủ",
    breakpoints: [
      {
        count: 3,
        summary: "Sát Thủ +25% tỉ lệ chí mạng; nhảy sau lưng quái",
        effect: { critChancePct: 0.25 },
      },
      {
        count: 6,
        summary: "+50% chí mạng, +40% sát thương chí mạng",
        effect: { critChancePct: 0.5, critDmgBonusPct: 0.4 },
      },
    ],
  },
  {
    id: "frost",
    name: "Băng Giá",
    breakpoints: [
      {
        count: 3,
        summary: "Đòn đánh toàn đội có 20% đóng băng 1.5s",
        effect: { freezeChancePct: 0.2, freezeDurationS: 1.5 },
      },
      {
        count: 5,
        summary: "35% đóng băng 2s; quái bị đóng băng nhận +15% sát thương",
        effect: {
          freezeChancePct: 0.35,
          freezeDurationS: 2.0,
          frozenDmgBonusPct: 0.15,
        },
      },
    ],
  },
  {
    id: "tech",
    name: "Công Nghệ",
    breakpoints: [
      {
        count: 2,
        summary: "Nhà Chính hồi 1% HP/giây và bắn laser mỗi 3s",
        effect: {
          homeHealRatePct: 0.01,
          homeLaserIntervalS: 3,
          homeLaserDmg: 150,
          homeLaserTargets: 1,
        },
      },
      {
        count: 4,
        summary: "Nhà Chính hồi 2% HP/giây; laser mỗi 2s, 2 mục tiêu",
        effect: {
          homeHealRatePct: 0.02,
          homeLaserIntervalS: 2,
          homeLaserDmg: 300,
          homeLaserTargets: 2,
        },
      },
    ],
  },
] as const satisfies readonly TraitDef[];

// ---------------------------------------------------------------------------
// Item components (6 mảnh cơ bản) + completed items (3 MVP)
// ---------------------------------------------------------------------------
export const ITEM_DEFS: readonly ItemDef[] = [
  // Components
  { id: "bf-sword", name: "Kiếm B.F", tier: "component", stats: { atk: 15 } },
  {
    id: "recurve-bow",
    name: "Cung Gỗ",
    tier: "component",
    stats: { atkSpeedPct: 0.12 },
  },
  {
    id: "chain-vest",
    name: "Giáp Lưới",
    tier: "component",
    stats: { armor: 20 },
  },
  { id: "giant-belt", name: "Đai Máu", tier: "component", stats: { hp: 150 } },
  {
    id: "tear",
    name: "Nước Mắt",
    tier: "component",
    stats: { energyStart: 15 },
  },
  {
    id: "needlessly",
    name: "Gậy Phép",
    tier: "component",
    stats: { apPct: 0.2 },
  },
  // Completed items (3 MVP)
  {
    id: "rageblade",
    name: "Cuồng Đao",
    tier: "completed",
    stats: { atk: 15, atkSpeedPct: 0.12 },
    effectDescription: "Mỗi đòn +5% tốc đánh (cộng dồn tối đa 6 lần)",
  },
  {
    id: "thornmail",
    name: "Áo Choàng Gai",
    tier: "completed",
    stats: { armor: 20, hp: 150 },
    effectDescription: "Phản 15% sát thương vật lý nhận về kẻ đánh",
  },
  {
    id: "seraphs",
    name: "Trượng Thiên Sứ",
    tier: "completed",
    stats: { apPct: 0.2, energyStart: 15 },
    effectDescription: "Hồi thêm 15 năng lượng mỗi đòn đánh ra",
  },
];

export const ITEM_RECIPES: readonly ItemRecipe[] = [
  { result: "rageblade", inputs: ["bf-sword", "recurve-bow"] },
  { result: "thornmail", inputs: ["chain-vest", "giant-belt"] },
  { result: "seraphs", inputs: ["tear", "needlessly"] },
];

export const ENEMY_DEFS = [
  enemy("slime", "Slime Con", "walker", 250, 20, 0, 0.85, 1, 1),
  enemy("runner-goblin", "Goblin Chạy", "walker", 180, 15, 0, 1.25, 1, 1),
  enemy("orc-brute", "Orc Trâu", "walker", 600, 35, 20, 0.7, 1, 2),
  enemy("bat", "Dơi Bay", "flyer", 220, 25, 5, 1.25, 1, 1),
  enemy("shield-soldier", "Lính Khiên", "walker", 400, 30, 35, 0.9, 1, 2),
  enemy("bomb-runner", "Bom Tự Sát", "walker", 200, 0, 0, 1, 0, 1),
  enemy("slime-king", "Vua Slime", "splitter", 250, 20, 0, 0.65, 1, 8, {
    isMiniBoss: true,
    hpMultiplier: 12,
    onDeath: {
      type: "split",
      enemyId: "slime",
      count: 8,
      moveSpeedMultiplier: 2,
    },
  }),
  enemy(
    "mecha-dragon",
    "Rồng Máy Khổng Lồ",
    "boss-dragon",
    600,
    35,
    30,
    0.45,
    1,
    10,
    {
      isBoss: true,
      hpMultiplier: 40,
      special: {
        type: "column-breath",
        intervalMs: 6000,
        telegraphMs: 1500,
        damage: 180,
      },
    },
  ),
] as const satisfies readonly EnemyDef[];

export const CHAPTER_1_LEVEL = {
  id: "chapter-1-forest",
  chapter: "Chapter 1",
  name: "Khu Rừng Khởi Đầu",
  gridSize: { w: 10, h: 8 },
  homePos: { gx: 8, gy: 6 },
  gates: [{ id: "north-gate", gx: 1, gy: 0 }],
  waves: [
    wave(1, "slime", 6, 5, 700),
    wave(2, "slime", 8, 5, 600, { enemyId: "runner-goblin", count: 3 }),
    wave(3, "runner-goblin", 10, 6, 550, { enemyId: "orc-brute", count: 2 }),
    wave(4, "shield-soldier", 6, 6, 650, { enemyId: "bat", count: 6 }),
    wave(5, "slime-king", 1, 8, 1000, { enemyId: "slime", count: 6 }),
    wave(6, "runner-goblin", 12, 6, 520, { enemyId: "orc-brute", count: 4 }),
    wave(7, "shield-soldier", 8, 7, 600, { enemyId: "bat", count: 8 }),
    wave(8, "orc-brute", 6, 7, 650, { enemyId: "runner-goblin", count: 10 }),
    wave(9, "runner-goblin", 12, 8, 500, {
      enemyId: "shield-soldier",
      count: 6,
    }),
    wave(10, "mecha-dragon", 1, 10, 1000),
  ],
  bossWaves: [5, 10],
  starThresholds: { three: 0.8, two: 0.4 },
} as const satisfies LevelDef;

function unit(
  id: UnitDef["id"],
  name: UnitDef["name"],
  cost: UnitDef["cost"],
  role: UnitDef["role"],
  traits: UnitDef["traits"],
  baseStats: UnitDef["baseStats"],
  skill: UnitDef["skill"],
  color: UnitDef["sprite"]["color"],
): UnitDef {
  return {
    id,
    name,
    cost,
    role,
    traits,
    baseStats,
    skill,
    starScaling: 1.8,
    sprite: unitSprite(id, color),
  };
}

function enemy(
  id: EnemyDef["id"],
  name: EnemyDef["name"],
  behavior: EnemyDef["behavior"],
  hp: number,
  atk: number,
  armor: number,
  moveSpeed: number,
  range: number,
  rewardGold: number,
  overrides: Partial<EnemyDef> = {},
): EnemyDef {
  return {
    id,
    name,
    behavior,
    stats: { hp, atk, armor, moveSpeed, range },
    rewardGold,
    sprite: enemySprite(id),
    ...overrides,
  };
}

function wave(
  index: number,
  enemyId: string,
  count: number,
  prepGold: number,
  intervalMs: number,
  extra?: { enemyId: string; count: number },
): LevelDef["waves"][number] {
  return {
    index,
    prepGold,
    spawns: [
      { enemyId, count, gateId: "north-gate", intervalMs },
      ...(extra
        ? [{ ...extra, gateId: "north-gate", intervalMs: intervalMs + 100 }]
        : []),
    ],
  };
}

function unitSprite(id: UnitDef["id"], color: string): SpriteDef {
  const visuals: Record<
    string,
    {
      shape: VisualShape;
      accentColor: string;
      glowColor: string;
      projectileColor: string;
      conceptFrame: { col: number; row: number };
    }
  > = {
    "iron-guard": {
      shape: "guard",
      accentColor: "#d8e2ff",
      glowColor: "#6ea8ff",
      projectileColor: "#9fc4ff",
      conceptFrame: { col: 0, row: 0 },
    },
    "trainee-archer": {
      shape: "archer",
      accentColor: "#eafffb",
      glowColor: "#7eead7",
      projectileColor: "#b5fff0",
      conceptFrame: { col: 1, row: 0 },
    },
    dagger: {
      shape: "assassin",
      accentColor: "#f4d5ff",
      glowColor: "#c47aff",
      projectileColor: "#f0a7ff",
      conceptFrame: { col: 2, row: 0 },
    },
    "frost-knight": {
      shape: "knight",
      accentColor: "#eff9ff",
      glowColor: "#87d6ff",
      projectileColor: "#c8f5ff",
      conceptFrame: { col: 3, row: 0 },
    },
    "fire-mage": {
      shape: "mage",
      accentColor: "#ffe0c8",
      glowColor: "#ff8a3d",
      projectileColor: "#ffcf5a",
      conceptFrame: { col: 0, row: 1 },
    },
    "shadow-assassin": {
      shape: "assassin",
      accentColor: "#ead8ff",
      glowColor: "#8a5cff",
      projectileColor: "#d194ff",
      conceptFrame: { col: 1, row: 1 },
    },
    "laser-gunner": {
      shape: "gunner",
      accentColor: "#d8fbff",
      glowColor: "#36d8ff",
      projectileColor: "#5af3ff",
      conceptFrame: { col: 2, row: 1 },
    },
    "frost-warden": {
      shape: "knight",
      accentColor: "#ffffff",
      glowColor: "#aee9ff",
      projectileColor: "#d6fbff",
      conceptFrame: { col: 3, row: 1 },
    },
    "frost-mage": {
      shape: "mage",
      accentColor: "#e8fdff",
      glowColor: "#8cefff",
      projectileColor: "#c8fbff",
      conceptFrame: { col: 0, row: 2 },
    },
    archmage: {
      shape: "mage",
      accentColor: "#fff2ce",
      glowColor: "#ffc149",
      projectileColor: "#ffde7a",
      conceptFrame: { col: 1, row: 2 },
    },
    executor: {
      shape: "assassin",
      accentColor: "#ffd5df",
      glowColor: "#ff5f88",
      projectileColor: "#ff9ab1",
      conceptFrame: { col: 2, row: 2 },
    },
    "mecha-general": {
      shape: "general",
      accentColor: "#fff1ba",
      glowColor: "#ffd166",
      projectileColor: "#ffe27a",
      conceptFrame: { col: 3, row: 2 },
    },
  };
  const visual = visuals[id] ?? {
    shape: "guard" as const,
    accentColor: "#ffffff",
    glowColor: color,
    projectileColor: color,
    conceptFrame: { col: 0, row: 0 },
  };
  return {
    id,
    color,
    anchor: "bottom-center",
    ...visual,
  };
}

function enemySprite(id: EnemyDef["id"]): SpriteDef {
  const visuals: Record<
    string,
    {
      color: string;
      accentColor: string;
      glowColor: string;
      shape: VisualShape;
      projectileColor: string;
      conceptFrame: { col: number; row: number };
    }
  > = {
    slime: {
      color: "#7cef8a",
      accentColor: "#d8ffd9",
      glowColor: "#4de06b",
      shape: "slime",
      projectileColor: "#b8ffb8",
      conceptFrame: { col: 0, row: 0 },
    },
    "runner-goblin": {
      color: "#d7ec63",
      accentColor: "#fff6a8",
      glowColor: "#f0e74d",
      shape: "runner",
      projectileColor: "#faff8f",
      conceptFrame: { col: 1, row: 0 },
    },
    "orc-brute": {
      color: "#b46a41",
      accentColor: "#ffd49e",
      glowColor: "#ff8a3d",
      shape: "brute",
      projectileColor: "#ffb46b",
      conceptFrame: { col: 2, row: 0 },
    },
    bat: {
      color: "#875cff",
      accentColor: "#dfd0ff",
      glowColor: "#b17aff",
      shape: "bat",
      projectileColor: "#c8a8ff",
      conceptFrame: { col: 3, row: 0 },
    },
    "shield-soldier": {
      color: "#89939e",
      accentColor: "#e5eef7",
      glowColor: "#9fb4c8",
      shape: "shield",
      projectileColor: "#ccd7e4",
      conceptFrame: { col: 0, row: 1 },
    },
    "bomb-runner": {
      color: "#ff6859",
      accentColor: "#ffe5a8",
      glowColor: "#ffb347",
      shape: "bomb",
      projectileColor: "#ffdf78",
      conceptFrame: { col: 1, row: 1 },
    },
    "slime-king": {
      color: "#3eea69",
      accentColor: "#fff06b",
      glowColor: "#72ff8a",
      shape: "slime-king",
      projectileColor: "#caff80",
      conceptFrame: { col: 2, row: 1 },
    },
    "mecha-dragon": {
      color: "#ff5f6d",
      accentColor: "#ffe66d",
      glowColor: "#ff9f1c",
      shape: "dragon",
      projectileColor: "#ffef6e",
      conceptFrame: { col: 3, row: 1 },
    },
  };
  const visual = visuals[id] ?? {
    color: "#ff7d6e",
    accentColor: "#ffd8d2",
    glowColor: "#ff7d6e",
    shape: "runner" as const,
    projectileColor: "#ffd0c8",
    conceptFrame: { col: 0, row: 0 },
  };
  return {
    id,
    anchor: "bottom-center",
    ...visual,
  };
}
