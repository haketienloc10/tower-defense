import { Rng } from "../core/rng";
import type { EnemyDef, LevelDef, UnitCost, UnitDef } from "../data/types";
import type { GridCoord } from "../math/iso";
import { isInsideGrid } from "../math/iso";
import {
  createCombatWorld,
  stepCombatWorld,
  type CombatWorld,
} from "./combat";
import type { BoardActor } from "./staticBoard";

export type RunPhase = "setup" | "combat" | "result";
export type RunResult = "victory" | "defeat" | null;

export interface UnitInstance {
  id: string;
  unitId: string;
  star: 1 | 2 | 3;
  tile: GridCoord | null;
}

export interface ShopSlot {
  unitId: string;
  cost: UnitCost;
}

export interface RunState {
  seed: number;
  phase: RunPhase;
  level: LevelDef;
  waveIndex: number;
  playerLevel: number;
  exp: number;
  gold: number;
  homeHp: number;
  homeHpMax: number;
  winStreak: number;
  lossStreak: number;
  lastIncome: IncomeBreakdown;
  bench: UnitInstance[];
  board: UnitInstance[];
  shop: (ShopSlot | null)[];
  combatWorld: CombatWorld | null;
  result: RunResult;
  privateState: {
    nextUnitId: number;
    shopRng: Rng;
  };
}

export interface RunContent {
  units: readonly UnitDef[];
  enemies: readonly EnemyDef[];
}

export interface RunActionResult {
  ok: boolean;
  error?: string;
}

export interface IncomeBreakdown {
  base: number;
  interest: number;
  streak: number;
  cleanWave: number;
  total: number;
}

const SHOP_SIZE = 5;
const BENCH_CAPACITY = 8;
const WAVE_BASE_GOLD = 5;
const CLEAN_WAVE_BONUS = 1;
const REROLL_COST = 2;
const BUY_EXP_COST = 4;
const BUY_EXP_AMOUNT = 4;
const AUTO_EXP_PER_WAVE = 2;
const HOME_HP_BASE = 30;
const PLAYER_LEVEL_UNIT_CAP: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
  4: 6,
  5: 7,
  6: 8,
  7: 9,
  8: 10,
  9: 11,
};
const EXP_TO_NEXT_LEVEL: Record<number, number> = {
  1: 2,
  2: 2,
  3: 6,
  4: 10,
  5: 20,
  6: 36,
  7: 56,
  8: 80,
  9: Number.POSITIVE_INFINITY,
};

const SHOP_ODDS: Record<number, readonly { cost: UnitCost; weight: number }[]> = {
  1: [{ cost: 1, weight: 100 }],
  2: [{ cost: 1, weight: 100 }],
  3: [
    { cost: 1, weight: 75 },
    { cost: 2, weight: 25 },
  ],
  4: [
    { cost: 1, weight: 55 },
    { cost: 2, weight: 30 },
    { cost: 3, weight: 15 },
  ],
  5: [
    { cost: 1, weight: 45 },
    { cost: 2, weight: 33 },
    { cost: 3, weight: 20 },
    { cost: 4, weight: 2 },
  ],
  6: [
    { cost: 1, weight: 30 },
    { cost: 2, weight: 40 },
    { cost: 3, weight: 25 },
    { cost: 4, weight: 5 },
  ],
  7: [
    { cost: 1, weight: 19 },
    { cost: 2, weight: 35 },
    { cost: 3, weight: 30 },
    { cost: 4, weight: 14 },
    { cost: 5, weight: 2 },
  ],
  8: [
    { cost: 1, weight: 18 },
    { cost: 2, weight: 25 },
    { cost: 3, weight: 32 },
    { cost: 4, weight: 20 },
    { cost: 5, weight: 5 },
  ],
  9: [
    { cost: 1, weight: 10 },
    { cost: 2, weight: 20 },
    { cost: 3, weight: 25 },
    { cost: 4, weight: 35 },
    { cost: 5, weight: 10 },
  ],
};

export function createRunState(
  seed: number,
  level: LevelDef,
  content: RunContent,
): RunState {
  const state: RunState = {
    seed,
    phase: "setup",
    level,
    waveIndex: level.waves[0]?.index ?? 1,
    playerLevel: 1,
    exp: 0,
    gold: level.waves[0]?.prepGold ?? 0,
    homeHp: HOME_HP_BASE,
    homeHpMax: HOME_HP_BASE,
    winStreak: 0,
    lossStreak: 0,
    lastIncome: {
      base: level.waves[0]?.prepGold ?? WAVE_BASE_GOLD,
      interest: 0,
      streak: 0,
      cleanWave: 0,
      total: level.waves[0]?.prepGold ?? WAVE_BASE_GOLD,
    },
    bench: [],
    board: [],
    shop: Array.from({ length: SHOP_SIZE }, () => null),
    combatWorld: null,
    result: null,
    privateState: {
      nextUnitId: 1,
      shopRng: new Rng(seed ^ 0x51f15e),
    },
  };
  rollShop(state, content.units);
  return state;
}

export function rollShop(
  state: RunState,
  unitDefs: readonly UnitDef[],
): void {
  assertSetup(state);
  state.shop = Array.from({ length: SHOP_SIZE }, () =>
    rollShopSlot(state, unitDefs),
  );
}

export function rerollShop(
  state: RunState,
  unitDefs: readonly UnitDef[],
): RunActionResult {
  if (state.phase !== "setup") return fail("shop is locked during combat");
  if (state.gold < REROLL_COST) return fail("not enough gold");
  state.gold -= REROLL_COST;
  rollShop(state, unitDefs);
  return { ok: true };
}

export function buyShopUnit(
  state: RunState,
  slotIndex: number,
): RunActionResult {
  if (state.phase !== "setup") return fail("shop is locked during combat");
  const slot = state.shop[slotIndex];
  if (!slot) return fail("shop slot is empty");
  if (state.gold < slot.cost) return fail("not enough gold");
  if (state.bench.length >= BENCH_CAPACITY) return fail("bench is full");

  state.gold -= slot.cost;
  state.shop[slotIndex] = null;
  state.bench.push({
    id: nextUnitInstanceId(state),
    unitId: slot.unitId,
    star: 1,
    tile: null,
  });
  autoMergeUnits(state);
  return { ok: true };
}

export function buyExperience(state: RunState): RunActionResult {
  if (state.phase !== "setup") return fail("experience is locked during combat");
  if (state.playerLevel >= 9) return fail("player level is maxed");
  if (state.gold < BUY_EXP_COST) return fail("not enough gold");
  state.gold -= BUY_EXP_COST;
  grantExperience(state, BUY_EXP_AMOUNT);
  return { ok: true };
}

export function placeBenchUnit(
  state: RunState,
  unitId: string,
  tile: GridCoord,
): RunActionResult {
  if (state.phase !== "setup") return fail("board is locked during combat");
  if (!isInsideGrid(tile, state.level.gridSize.w, state.level.gridSize.h)) {
    return fail("tile is outside the board");
  }
  if (state.board.length >= boardUnitCap(state)) return fail("board is full");
  if (state.board.some((unit) => sameTile(unit.tile, tile))) {
    return fail("tile is occupied");
  }
  const index = state.bench.findIndex((unit) => unit.id === unitId);
  if (index < 0) return fail("unit is not on bench");

  const [unit] = state.bench.splice(index, 1);
  unit.tile = tile;
  state.board.push(unit);
  autoMergeUnits(state);
  return { ok: true };
}

export function benchBoardUnit(
  state: RunState,
  unitId: string,
): RunActionResult {
  if (state.phase !== "setup") return fail("board is locked during combat");
  if (state.bench.length >= BENCH_CAPACITY) return fail("bench is full");
  const index = state.board.findIndex((unit) => unit.id === unitId);
  if (index < 0) return fail("unit is not on board");

  const [unit] = state.board.splice(index, 1);
  unit.tile = null;
  state.bench.push(unit);
  autoMergeUnits(state);
  return { ok: true };
}

export function sellUnit(
  state: RunState,
  unitId: string,
  unitDefs: readonly UnitDef[],
): RunActionResult {
  if (state.phase !== "setup") return fail("selling is locked during combat");
  const fromBench = removeUnitById(state.bench, unitId);
  const unit = fromBench ?? removeUnitById(state.board, unitId);
  if (!unit) return fail("unit not found");
  const def = getUnitDef(unitDefs, unit.unitId);
  state.gold += refundForUnit(def.cost, unit.star);
  return { ok: true };
}

export function startCombat(
  state: RunState,
  content: RunContent,
): RunActionResult {
  if (state.phase !== "setup") return fail("combat already started");
  if (state.board.length === 0) return fail("place at least one unit");
  state.combatWorld = createCombatWorld({
    level: state.level,
    waveIndex: state.waveIndex,
    unitDefs: content.units,
    enemyDefs: content.enemies,
    allies: state.board.map((unit) => {
      if (!unit.tile) throw new Error(`Board unit missing tile: ${unit.id}`);
      return {
        id: unit.id,
        unitId: unit.unitId,
        star: unit.star,
        tile: unit.tile,
      };
    }),
  });
  state.phase = "combat";
  return { ok: true };
}

export function stepRunCombat(
  state: RunState,
  dtMs: number,
  content: RunContent,
): void {
  if (state.phase !== "combat" || !state.combatWorld) return;
  stepCombatWorld(state.combatWorld, dtMs);
  if (!state.combatWorld.waveEnded) return;

  const leakedEnemies = state.combatWorld.leakedEnemyCount;
  state.homeHp = Math.max(0, state.homeHp - leakedEnemies);
  const cleanWave = leakedEnemies === 0;
  updateStreaks(state, cleanWave);
  grantExperience(state, AUTO_EXP_PER_WAVE);
  const nextWave = state.level.waves.find((wave) => wave.index > state.waveIndex);
  state.combatWorld = null;
  if (!nextWave || state.homeHp <= 0) {
    state.phase = "result";
    state.result = state.homeHp > 0 ? "victory" : "defeat";
    return;
  }

  state.waveIndex = nextWave.index;
  state.phase = "setup";
  state.lastIncome = calculateWaveIncome(state, cleanWave);
  state.gold += state.lastIncome.total;
  rollShop(state, content.units);
}

export function boardUnitCap(state: RunState): number {
  return PLAYER_LEVEL_UNIT_CAP[state.playerLevel] ?? PLAYER_LEVEL_UNIT_CAP[9];
}

export function createRunBoardActors(
  state: RunState,
  unitDefs: readonly UnitDef[],
): BoardActor[] {
  return state.board.map((unit) => {
    if (!unit.tile) throw new Error(`Board unit missing tile: ${unit.id}`);
    const def = getUnitDef(unitDefs, unit.unitId);
    return {
      id: unit.id,
      team: "ally",
      unitId: def.id,
      name: `${def.name} ${unit.star}*`,
      cost: def.cost,
      traits: def.traits,
      tile: unit.tile,
      color: def.sprite.color,
    };
  });
}

export function getUnitDef(
  unitDefs: readonly UnitDef[],
  unitId: string,
): UnitDef {
  const def = unitDefs.find((unit) => unit.id === unitId);
  if (!def) throw new Error(`Missing unit definition: ${unitId}`);
  return def;
}

export function refundForUnit(cost: UnitCost, star: 1 | 2 | 3): number {
  if (star === 1) return cost;
  return cost * 3 ** (star - 1) - 1;
}

export function expToNextLevel(state: RunState): number {
  return EXP_TO_NEXT_LEVEL[state.playerLevel] ?? EXP_TO_NEXT_LEVEL[9];
}

export function calculateInterest(gold: number): number {
  return Math.min(Math.floor(gold / 10), 5);
}

export function calculateStreakBonus(winStreak: number, lossStreak: number): number {
  const streak = Math.max(Math.abs(winStreak), Math.abs(lossStreak));
  if (streak >= 5) return 3;
  if (streak >= 4) return 2;
  if (streak >= 2) return 1;
  return 0;
}

export function calculateWaveIncome(
  state: RunState,
  cleanWave: boolean,
): IncomeBreakdown {
  const interest = calculateInterest(state.gold);
  const streak = calculateStreakBonus(state.winStreak, state.lossStreak);
  const cleanWaveGold = cleanWave ? CLEAN_WAVE_BONUS : 0;
  return {
    base: WAVE_BASE_GOLD,
    interest,
    streak,
    cleanWave: cleanWaveGold,
    total: WAVE_BASE_GOLD + interest + streak + cleanWaveGold,
  };
}

function rollShopSlot(
  state: RunState,
  unitDefs: readonly UnitDef[],
): ShopSlot {
  const cost = rollUnitCost(state);
  const candidates = unitDefs.filter((unit) => unit.cost === cost);
  const unit = state.privateState.shopRng.pick(candidates);
  return { unitId: unit.id, cost: unit.cost };
}

function rollUnitCost(state: RunState): UnitCost {
  const odds = SHOP_ODDS[state.playerLevel] ?? SHOP_ODDS[9];
  const total = odds.reduce((sum, item) => sum + item.weight, 0);
  let roll = state.privateState.shopRng.next() * total;
  for (const item of odds) {
    roll -= item.weight;
    if (roll < 0) return item.cost;
  }
  return odds[odds.length - 1].cost;
}

function grantExperience(state: RunState, amount: number): void {
  if (state.playerLevel >= 9) return;
  state.exp += amount;
  while (state.playerLevel < 9 && state.exp >= expToNextLevel(state)) {
    state.exp -= expToNextLevel(state);
    state.playerLevel += 1;
  }
}

function updateStreaks(state: RunState, cleanWave: boolean): void {
  if (cleanWave) {
    state.winStreak += 1;
    state.lossStreak = 0;
  } else {
    state.lossStreak += 1;
    state.winStreak = 0;
  }
}

function autoMergeUnits(state: RunState): void {
  let merged = true;
  while (merged) {
    merged = false;
    const units = [...state.board, ...state.bench].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const match = units.find((unit) => {
      if (unit.star >= 3) return false;
      return (
        units.filter(
          (candidate) =>
            candidate.unitId === unit.unitId && candidate.star === unit.star,
        ).length >= 3
      );
    });
    if (!match) continue;

    const consumed = units
      .filter(
        (unit) => unit.unitId === match.unitId && unit.star === match.star,
      )
      .slice(0, 3);
    const boardHost = consumed.find((unit) => unit.tile);
    const mergedUnit: UnitInstance = {
      id: nextUnitInstanceId(state),
      unitId: match.unitId,
      star: (match.star + 1) as 2 | 3,
      tile: boardHost?.tile ?? null,
    };
    const consumedIds = new Set(consumed.map((unit) => unit.id));
    state.board = state.board.filter((unit) => !consumedIds.has(unit.id));
    state.bench = state.bench.filter((unit) => !consumedIds.has(unit.id));
    if (mergedUnit.tile) {
      state.board.push(mergedUnit);
      state.board.sort((a, b) => a.id.localeCompare(b.id));
    } else {
      state.bench.push(mergedUnit);
      state.bench.sort((a, b) => a.id.localeCompare(b.id));
    }
    merged = true;
  }
}

function nextUnitInstanceId(state: RunState): string {
  const id = `unit-${state.privateState.nextUnitId.toString().padStart(3, "0")}`;
  state.privateState.nextUnitId += 1;
  return id;
}

function removeUnitById(
  units: UnitInstance[],
  unitId: string,
): UnitInstance | null {
  const index = units.findIndex((unit) => unit.id === unitId);
  if (index < 0) return null;
  const [unit] = units.splice(index, 1);
  return unit;
}

function sameTile(tile: GridCoord | null, other: GridCoord): boolean {
  return tile?.gx === other.gx && tile.gy === other.gy;
}

function assertSetup(state: RunState): void {
  if (state.phase !== "setup") {
    throw new Error("run must be in setup phase");
  }
}

function fail(error: string): RunActionResult {
  return { ok: false, error };
}
