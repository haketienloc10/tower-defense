import { describe, expect, it } from "vitest";
import { CHAPTER_1_LEVEL, ENEMY_DEFS, UNIT_DEFS } from "../src/data/gameData";
import {
  benchBoardUnit,
  boardUnitCap,
  buyShopUnit,
  createRunState,
  placeBenchUnit,
  sellUnit,
  startCombat,
  stepRunCombat,
} from "../src/sim/run";

const CONTENT = { units: UNIT_DEFS, enemies: ENEMY_DEFS };

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

    expect(placeBenchUnit(state, first, { gx: 4, gy: 4 })).toEqual({ ok: true });
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
