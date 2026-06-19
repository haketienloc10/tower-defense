import { describe, expect, it } from "vitest";
import {
  CHAPTER_1_LEVEL,
  ENEMY_DEFS,
  ITEM_DEFS,
  ITEM_RECIPES,
  UNIT_DEFS,
} from "../src/data/gameData";
import {
  benchBoardUnit,
  boardUnitCap,
  buyShopUnit,
  buyExperience,
  calculateStars,
  calculateInterest,
  calculateStreakBonus,
  calculateWaveIncome,
  createRunState,
  expToNextLevel,
  placeBenchUnit,
  rerollShop,
  refundForUnit,
  sellUnit,
  startCombat,
  stepRunCombat,
} from "../src/sim/run";

const CONTENT = {
  units: UNIT_DEFS,
  enemies: ENEMY_DEFS,
  items: ITEM_DEFS,
  recipes: ITEM_RECIPES,
};

describe("M3 run state", () => {
  it("starts in setup with prep gold and deterministic shop slots", () => {
    const first = createRunState(1001, CHAPTER_1_LEVEL, CONTENT);
    const second = createRunState(1001, CHAPTER_1_LEVEL, CONTENT);

    expect(first.phase).toBe("setup");
    expect(first.gold).toBe(5);
    expect(first.shop).toEqual(second.shop);
    expect(first.shop).toHaveLength(5);
    expect(first.shop.every((slot) => slot?.cost === 1)).toBe(true);
    expect(boardUnitCap(first)).toBe(3);
  });

  it("buys a shop unit into bench and rejects invalid purchases", () => {
    const state = createRunState(42, CHAPTER_1_LEVEL, CONTENT);
    const firstSlot = state.shop[0];

    expect(buyShopUnit(state, 0)).toEqual({ ok: true });
    expect(state.gold).toBe(5 - (firstSlot?.cost ?? 0));
    expect(state.shop[0]).toBeNull();
    expect(state.bench).toEqual([
      expect.objectContaining({ id: "unit-001", unitId: firstSlot?.unitId }),
    ]);
    expect(buyShopUnit(state, 0)).toEqual({
      ok: false,
      error: "shop slot is empty",
    });

    state.gold = 0;
    expect(buyShopUnit(state, 1)).toEqual({
      ok: false,
      error: "not enough gold",
    });
  });

  it("places, benches, and sells units with setup constraints", () => {
    const state = createRunState(7, CHAPTER_1_LEVEL, CONTENT);
    buyShopUnit(state, 0);
    buyShopUnit(state, 1);
    const first = state.bench[0].id;
    const second = state.bench[1].id;

    expect(placeBenchUnit(state, first, { gx: 4, gy: 4 })).toEqual({
      ok: true,
    });
    expect(placeBenchUnit(state, second, { gx: 4, gy: 4 })).toEqual({
      ok: false,
      error: "tile is occupied",
    });
    expect(benchBoardUnit(state, first)).toEqual({ ok: true });
    expect(state.board).toHaveLength(0);
    const goldBeforeSell = state.gold;
    expect(sellUnit(state, first, UNIT_DEFS)).toEqual({ ok: true });
    expect(state.gold).toBeGreaterThan(goldBeforeSell);
  });

  it("locks setup actions during combat and returns to setup after a wave", () => {
    const state = createRunState(99, CHAPTER_1_LEVEL, CONTENT);
    buyShopUnit(state, 0);
    const unitId = state.bench[0].id;
    placeBenchUnit(state, unitId, { gx: 5, gy: 4 });

    expect(startCombat(state, CONTENT)).toEqual({ ok: true });
    expect(state.phase).toBe("combat");
    expect(sellUnit(state, unitId, UNIT_DEFS)).toEqual({
      ok: false,
      error: "selling is locked during combat",
    });

    for (let i = 0; i < 500 && state.phase === "combat"; i += 1) {
      stepRunCombat(state, 100, CONTENT);
    }

    expect(state.phase).toBe("setup");
    expect(state.waveIndex).toBe(2);
    expect(state.gold).toBeGreaterThanOrEqual(5);
    expect(state.shop.filter(Boolean)).toHaveLength(5);
  });
});

describe("M4 economy and star progression", () => {
  it("calculates interest, streak bonus, and clean-wave income", () => {
    const state = createRunState(501, CHAPTER_1_LEVEL, CONTENT);
    state.gold = 37;
    state.winStreak = 4;

    expect(calculateInterest(0)).toBe(0);
    expect(calculateInterest(57)).toBe(5);
    expect(calculateStreakBonus(0, 0)).toBe(0);
    expect(calculateStreakBonus(2, 0)).toBe(1);
    expect(calculateStreakBonus(0, 4)).toBe(2);
    expect(calculateStreakBonus(5, 0)).toBe(3);
    expect(calculateWaveIncome(state, true)).toEqual({
      base: 5,
      interest: 3,
      streak: 2,
      cleanWave: 1,
      total: 11,
    });
  });

  it("buys EXP and advances through the product level table", () => {
    const state = createRunState(502, CHAPTER_1_LEVEL, CONTENT);
    state.gold = 20;

    expect(expToNextLevel(state)).toBe(2);
    expect(buyExperience(state)).toEqual({ ok: true });
    expect(state.gold).toBe(16);
    expect(state.playerLevel).toBe(3);
    expect(state.exp).toBe(0);
    expect(boardUnitCap(state)).toBe(5);
  });

  it("charges reroll cost and keeps seeded shop slots full", () => {
    const state = createRunState(503, CHAPTER_1_LEVEL, CONTENT);
    state.gold = 2;

    expect(rerollShop(state, UNIT_DEFS)).toEqual({ ok: true });
    expect(state.gold).toBe(0);
    expect(state.shop.filter(Boolean)).toHaveLength(5);
    expect(rerollShop(state, UNIT_DEFS)).toEqual({
      ok: false,
      error: "not enough gold",
    });
  });

  it("auto-merges three matching units and applies star-rank refunds", () => {
    const state = createRunState(504, CHAPTER_1_LEVEL, CONTENT);
    state.gold = 10;
    state.shop[0] = { unitId: "iron-guard", cost: 1 };
    state.shop[1] = { unitId: "iron-guard", cost: 1 };
    state.shop[2] = { unitId: "iron-guard", cost: 1 };

    expect(buyShopUnit(state, 0)).toEqual({ ok: true });
    expect(buyShopUnit(state, 1)).toEqual({ ok: true });
    expect(buyShopUnit(state, 2)).toEqual({ ok: true });
    expect(state.bench).toHaveLength(1);
    expect(state.bench[0]).toEqual(
      expect.objectContaining({ unitId: "iron-guard", star: 2 }),
    );
    expect(refundForUnit(1, 1)).toBe(1);
    expect(refundForUnit(1, 2)).toBe(2);
    expect(refundForUnit(2, 3)).toBe(17);
  });

  it("uses the current player level cap for board placement", () => {
    const state = createRunState(505, CHAPTER_1_LEVEL, CONTENT);
    state.playerLevel = 1;
    state.bench = [
      { id: "unit-a", unitId: "iron-guard", star: 1, tile: null, items: [] },
      {
        id: "unit-b",
        unitId: "trainee-archer",
        star: 1,
        tile: null,
        items: [],
      },
      { id: "unit-c", unitId: "dagger", star: 1, tile: null, items: [] },
      { id: "unit-d", unitId: "frost-knight", star: 1, tile: null, items: [] },
    ];

    expect(placeBenchUnit(state, "unit-a", { gx: 2, gy: 2 })).toEqual({
      ok: true,
    });
    expect(placeBenchUnit(state, "unit-b", { gx: 3, gy: 2 })).toEqual({
      ok: true,
    });
    expect(placeBenchUnit(state, "unit-c", { gx: 4, gy: 2 })).toEqual({
      ok: true,
    });
    expect(placeBenchUnit(state, "unit-d", { gx: 5, gy: 2 })).toEqual({
      ok: false,
      error: "board is full",
    });
  });

  it("updates streaks, automatic EXP, and income when combat resolves", () => {
    const state = createRunState(506, CHAPTER_1_LEVEL, CONTENT);
    state.gold = 20;
    state.board = [
      {
        id: "unit-carry",
        unitId: "mecha-general",
        star: 3,
        tile: { gx: 5, gy: 4 },
        items: [],
      },
    ];

    expect(startCombat(state, CONTENT)).toEqual({ ok: true });
    if (!state.combatWorld) throw new Error("expected combat world");
    state.combatWorld.waveEnded = true;
    state.combatWorld.leakedEnemyCount = 0;
    stepRunCombat(state, 100, CONTENT);

    expect(state.phase).toBe("setup");
    expect(state.waveIndex).toBe(2);
    expect(state.winStreak).toBe(1);
    expect(state.lossStreak).toBe(0);
    expect(state.playerLevel).toBe(2);
    expect(state.exp).toBe(0);
    expect(state.lastIncome).toEqual({
      base: 5,
      interest: 2,
      streak: 0,
      cleanWave: 1,
      total: 8,
    });
    expect(state.gold).toBe(28);
  });

  it("computes M6 final victory stars after the final Chapter 1 wave", () => {
    const state = createRunState(507, CHAPTER_1_LEVEL, CONTENT);
    state.waveIndex = 10;
    state.homeHp = 24;
    state.board = [
      {
        id: "unit-carry",
        unitId: "mecha-general",
        star: 3,
        tile: { gx: 5, gy: 4 },
        items: [],
      },
    ];

    expect(startCombat(state, CONTENT)).toEqual({ ok: true });
    if (!state.combatWorld) throw new Error("expected combat world");
    state.combatWorld.waveEnded = true;
    state.combatWorld.leakedEnemyCount = 0;
    stepRunCombat(state, 100, CONTENT);

    expect(state.phase).toBe("result");
    expect(state.result).toBe("victory");
    expect(state.finalResult).toEqual({
      outcome: "victory",
      stars: 3,
      homeHpRemaining: 24,
      homeHpMax: 30,
      wavesCompleted: 10,
    });
  });

  it("calculates star thresholds from home HP percentage", () => {
    expect(calculateStars(24, 30, CHAPTER_1_LEVEL.starThresholds)).toBe(3);
    expect(calculateStars(12, 30, CHAPTER_1_LEVEL.starThresholds)).toBe(2);
    expect(calculateStars(1, 30, CHAPTER_1_LEVEL.starThresholds)).toBe(1);
    expect(calculateStars(0, 30, CHAPTER_1_LEVEL.starThresholds)).toBe(0);
  });
});
