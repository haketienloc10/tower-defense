export type TraitId = "fighter" | "tech" | "frost" | "assassin";
export type UnitCost = 1 | 2 | 3 | 4 | 5;
export type UnitRole = "Tanker" | "Marksman" | "Mage" | "Assassin";
export type ItemTier = "component" | "completed";
export type VisualShape =
  | "guard"
  | "archer"
  | "assassin"
  | "knight"
  | "mage"
  | "gunner"
  | "general"
  | "slime"
  | "runner"
  | "brute"
  | "shield"
  | "bat"
  | "bomb"
  | "slime-king"
  | "dragon";

export interface Stats {
  hp: number;
  atk: number;
  atkSpeed: number;
  range: number;
  armor: number;
  energyStart: number;
  energyMax: number;
}

export interface SpriteDef {
  id: string;
  color: string;
  accentColor: string;
  glowColor: string;
  shape: VisualShape;
  projectileColor: string;
  conceptFrame?: { col: number; row: number };
  anchor: "bottom-center";
}

/**
 * Buff effects applied by a synergy breakpoint.
 * All values are additive bonuses on top of base stats.
 */
export interface BuffEffect {
  /** Percentage HP multiplier added (e.g. 0.15 = +15% max HP) */
  hpPct?: number;
  /** Flat armor bonus */
  armorFlat?: number;
  /** Flat crit chance bonus (e.g. 0.25 = +25%) */
  critChancePct?: number;
  /** Per-hit freeze chance (e.g. 0.20 = 20%) */
  freezeChancePct?: number;
  /** Freeze duration in seconds when triggered */
  freezeDurationS?: number;
  /** Bonus damage multiplier when hitting a frozen target (e.g. 0.15 = +15%) */
  frozenDmgBonusPct?: number;
  /** Home base heal rate in % per second (tech synergy) */
  homeHealRatePct?: number;
  /** Home base laser fire interval in seconds (0 = disabled) */
  homeLaserIntervalS?: number;
  /** Home base laser damage per shot */
  homeLaserDmg?: number;
  /** Home base laser target count */
  homeLaserTargets?: number;
  /** Damage reduction multiplier (e.g. 0.15 = take 15% less damage) — Fighter 6 */
  dmgReductionPct?: number;
  /** Extra crit damage multiplier — Assassin 6 */
  critDmgBonusPct?: number;
}

/** Item component or completed item definition */
export interface ItemDef {
  id: string;
  name: string;
  tier: ItemTier;
  /** Flat stat bonuses */
  stats?: {
    atk?: number;
    atkSpeedPct?: number;
    armor?: number;
    hp?: number;
    energyStart?: number;
    apPct?: number;
  };
  /** Description of on-hit or passive effect */
  effectDescription?: string;
}

/** Recipe: two component ids combine to produce a completed item */
export interface ItemRecipe {
  result: string;
  inputs: readonly [string, string];
}

export interface UnitDef {
  id: string;
  name: string;
  cost: UnitCost;
  role: UnitRole;
  traits: readonly TraitId[];
  baseStats: Stats;
  starScaling: 1.8;
  skill: string;
  sprite: SpriteDef;
}

export interface TraitDef {
  id: TraitId;
  name: string;
  breakpoints: readonly {
    count: number;
    summary: string;
    /** Actual numeric effects for this breakpoint */
    effect: BuffEffect;
  }[];
}

export interface EnemyDef {
  id: string;
  name: string;
  behavior: "walker" | "flyer" | "splitter" | "boss-dragon";
  stats: {
    hp: number;
    atk: number;
    armor: number;
    moveSpeed: number;
    range: number;
  };
  rewardGold: number;
  sprite: SpriteDef;
  isMiniBoss?: boolean;
  isBoss?: boolean;
  hpMultiplier?: number;
  onDeath?: {
    type: "split";
    enemyId: string;
    count: number;
    moveSpeedMultiplier: number;
  };
  special?: {
    type: "column-breath";
    intervalMs: number;
    telegraphMs: number;
    damage: number;
  };
}

export interface WaveDef {
  index: number;
  spawns: readonly {
    enemyId: string;
    count: number;
    gateId: string;
    intervalMs: number;
  }[];
  prepGold: number;
}

export interface LevelDef {
  id: string;
  chapter: string;
  name: string;
  gridSize: { w: number; h: number };
  homePos: { gx: number; gy: number };
  gates: readonly { id: string; gx: number; gy: number }[];
  waves: readonly WaveDef[];
  bossWaves: readonly number[];
  starThresholds: { three: number; two: number };
}
