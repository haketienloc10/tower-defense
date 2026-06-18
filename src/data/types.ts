export type TraitId = "fighter" | "tech" | "frost" | "assassin";
export type UnitCost = 1 | 2 | 3 | 4 | 5;
export type UnitRole = "Tanker" | "Marksman" | "Mage" | "Assassin";

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
  anchor: "bottom-center";
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
  }[];
}

export interface EnemyDef {
  id: string;
  name: string;
  behavior: "walker" | "flyer" | "splitter";
  stats: {
    hp: number;
    atk: number;
    armor: number;
    moveSpeed: number;
    range: number;
  };
  rewardGold: number;
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
