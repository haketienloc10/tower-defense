import { describe, expect, it } from "vitest";
import {
  CHAPTER_1_LEVEL,
  ENEMY_DEFS,
  TRAIT_DEFS,
  UNIT_DEFS,
} from "../src/data/gameData";
import { createStaticBoardActors } from "../src/sim/staticBoard";

describe("M1 game data", () => {
  it("defines the MVP unit roster with stable ids and combat stats", () => {
    expect(UNIT_DEFS).toHaveLength(12);
    expect(UNIT_DEFS.map((unit) => unit.id)).toEqual([
      "iron-guard",
      "trainee-archer",
      "dagger",
      "frost-knight",
      "fire-mage",
      "shadow-assassin",
      "laser-gunner",
      "frost-warden",
      "frost-mage",
      "archmage",
      "executor",
      "mecha-general",
    ]);
    expect(UNIT_DEFS.every((unit) => unit.starScaling === 1.8)).toBe(true);
    expect(UNIT_DEFS.every((unit) => unit.baseStats.hp > 0)).toBe(true);
    expect(
      UNIT_DEFS.every((unit) => unit.sprite.anchor === "bottom-center"),
    ).toBe(true);
  });

  it("defines the four MVP traits and first level contract", () => {
    expect(TRAIT_DEFS.map((trait) => trait.id).sort()).toEqual([
      "assassin",
      "fighter",
      "frost",
      "tech",
    ]);
    expect(CHAPTER_1_LEVEL.gridSize).toEqual({ w: 10, h: 8 });
    expect(CHAPTER_1_LEVEL.waves.at(0)?.spawns).toEqual([
      {
        enemyId: "slime",
        count: 6,
        gateId: "north-gate",
        intervalMs: 700,
      },
    ]);
    expect(CHAPTER_1_LEVEL.bossWaves).toEqual([5, 10]);
  });

  it("defines M6 Chapter 1 boss waves with special enemy metadata", () => {
    expect(CHAPTER_1_LEVEL.waves).toHaveLength(10);
    expect(
      CHAPTER_1_LEVEL.waves.find((wave) => wave.index === 5)?.spawns[0],
    ).toEqual(expect.objectContaining({ enemyId: "slime-king", count: 1 }));
    expect(
      CHAPTER_1_LEVEL.waves.find((wave) => wave.index === 10)?.spawns[0],
    ).toEqual(expect.objectContaining({ enemyId: "mecha-dragon", count: 1 }));
    expect(ENEMY_DEFS.find((enemy) => enemy.id === "slime-king")).toEqual(
      expect.objectContaining({
        isMiniBoss: true,
        onDeath: expect.objectContaining({
          type: "split",
          enemyId: "slime",
          count: 8,
        }),
      }),
    );
    expect(ENEMY_DEFS.find((enemy) => enemy.id === "mecha-dragon")).toEqual(
      expect.objectContaining({
        isBoss: true,
        special: expect.objectContaining({
          type: "column-breath",
          telegraphMs: 1500,
        }),
      }),
    );
  });

  it("creates static board actors from unit definitions", () => {
    const actors = createStaticBoardActors(UNIT_DEFS);

    expect(actors).toEqual([
      expect.objectContaining({
        id: "preview-iron-guard",
        unitId: "iron-guard",
        name: "Vệ Binh Sắt",
        tile: { gx: 3, gy: 3 },
      }),
      expect.objectContaining({
        id: "preview-trainee-archer",
        unitId: "trainee-archer",
        name: "Cung Thủ Tập Sự",
        tile: { gx: 5, gy: 4 },
      }),
      expect.objectContaining({
        id: "preview-fire-mage",
        unitId: "fire-mage",
        name: "Pháp Sư Lửa",
        tile: { gx: 4, gy: 5 },
      }),
    ]);
  });
});
