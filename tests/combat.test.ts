import { describe, expect, it } from "vitest";
import { CHAPTER_1_LEVEL, ENEMY_DEFS, UNIT_DEFS } from "../src/data/gameData";
import {
  applyArmorMitigation,
  createCombatWorld,
  pickNearestEnemyTarget,
  runCombatTicks,
  stepCombatWorld,
} from "../src/sim/combat";

describe("M2 combat simulation", () => {
  it("applies the armor mitigation formula from the technical spec", () => {
    expect(applyArmorMitigation(100, 0)).toBe(100);
    expect(applyArmorMitigation(100, 100)).toBe(50);
    expect(applyArmorMitigation(80, 20)).toBeCloseTo(66.6667, 3);
  });

  it("picks the nearest live enemy in range with stable id tie-breaks", () => {
    const world = createCombatWorld({
      level: CHAPTER_1_LEVEL,
      waveIndex: 1,
      unitDefs: UNIT_DEFS,
      enemyDefs: ENEMY_DEFS,
      allies: [
        { id: "ally-a", unitId: "trainee-archer", tile: { gx: 3, gy: 2 } },
      ],
      enemySpawnLimit: 0,
    });
    world.enemies.push(
      enemy("enemy-b", 5, 2),
      enemy("enemy-a", 5, 2),
      enemy("enemy-c", 6, 2),
    );

    expect(pickNearestEnemyTarget(world.allies[0], world)?.id).toBe("enemy-a");
  });

  it("spawns enemies, attacks, and removes dead enemies deterministically", () => {
    const first = runDemoWave();
    const second = runDemoWave();

    expect(first.combatLog).toEqual(second.combatLog);
    expect(first.defeatedEnemyCount).toBe(2);
    expect(first.enemies).toHaveLength(0);
    expect(first.waveEnded).toBe(true);
  });

  it("moves enemies along the flow field before they enter range", () => {
    const world = createCombatWorld({
      level: CHAPTER_1_LEVEL,
      waveIndex: 1,
      unitDefs: UNIT_DEFS,
      enemyDefs: ENEMY_DEFS,
      allies: [{ id: "ally-a", unitId: "iron-guard", tile: { gx: 8, gy: 5 } }],
      enemySpawnLimit: 1,
    });

    stepCombatWorld(world, 2000);

    expect(world.enemies[0]?.tile.gx).toBeGreaterThan(1);
  });

  it("splits Vua Slime into 8 fast slimes on death", () => {
    const world = createCombatWorld({
      level: CHAPTER_1_LEVEL,
      waveIndex: 5,
      unitDefs: UNIT_DEFS,
      enemyDefs: ENEMY_DEFS,
      allies: [
        {
          id: "ally-a",
          unitId: "mecha-general",
          tile: { gx: 1, gy: 1 },
          star: 3,
        },
      ],
      enemySpawnLimit: 0,
    });
    world.enemies.push({
      ...enemy("enemy-boss", 4, 4),
      defId: "slime-king",
      name: "Vua Slime",
      hp: 0,
      maxHp: 3000,
      isMiniBoss: true,
    });

    stepCombatWorld(world, 100);

    expect(world.enemies).toHaveLength(8);
    expect(world.enemies.every((spawned) => spawned.defId === "slime")).toBe(
      true,
    );
    expect(world.enemies.every((spawned) => spawned.moveSpeed > 0.85)).toBe(
      true,
    );
    expect(
      world.combatLog.filter((line) => line.includes(":split:")),
    ).toHaveLength(8);
  });

  it("telegraphs and applies Rồng Máy column damage deterministically", () => {
    const world = createCombatWorld({
      level: CHAPTER_1_LEVEL,
      waveIndex: 10,
      unitDefs: UNIT_DEFS,
      enemyDefs: ENEMY_DEFS,
      allies: [
        { id: "ally-a", unitId: "iron-guard", tile: { gx: 3, gy: 2 } },
        { id: "ally-b", unitId: "trainee-archer", tile: { gx: 3, gy: 4 } },
        { id: "ally-c", unitId: "fire-mage", tile: { gx: 5, gy: 4 } },
      ],
      enemySpawnLimit: 1,
    });

    stepCombatWorld(world, 6000);
    expect(world.bossTelegraphs).toEqual([
      expect.objectContaining({ columnGx: 3, remainingMs: 1500, damage: 180 }),
    ]);

    stepCombatWorld(world, 1500);

    expect(world.bossTelegraphs).toHaveLength(0);
    expect(world.allies.find((ally) => ally.id === "ally-a")?.hp).toBeLessThan(
      world.allies.find((ally) => ally.id === "ally-a")?.maxHp ?? 0,
    );
    expect(world.allies.find((ally) => ally.id === "ally-b")?.hp).toBeLessThan(
      world.allies.find((ally) => ally.id === "ally-b")?.maxHp ?? 0,
    );
    expect(world.allies.find((ally) => ally.id === "ally-c")?.hp).toBe(
      world.allies.find((ally) => ally.id === "ally-c")?.maxHp,
    );
  });
});

function runDemoWave() {
  const world = createCombatWorld({
    level: CHAPTER_1_LEVEL,
    waveIndex: 1,
    unitDefs: UNIT_DEFS,
    enemyDefs: ENEMY_DEFS,
    allies: [
      { id: "ally-archer", unitId: "trainee-archer", tile: { gx: 5, gy: 4 } },
      { id: "ally-mage", unitId: "fire-mage", tile: { gx: 6, gy: 4 } },
    ],
    enemySpawnLimit: 2,
  });

  return runCombatTicks(world, 240, 100);
}

function enemy(id: string, gx: number, gy: number) {
  return {
    id,
    team: "enemy" as const,
    defId: "slime",
    name: "Slime Con",
    role: "enemy" as const,
    tile: { gx, gy },
    hp: 250,
    maxHp: 250,
    atk: 20,
    atkSpeed: 0,
    range: 1,
    armor: 0,
    moveSpeed: 0,
    attackTimerMs: 0,
    moveProgress: 0,
    critChance: 0,
    critDmgBonus: 0,
    ragebladeStacks: 0,
    statuses: [],
    freezeChancePct: 0,
    freezeDurationS: 0,
    frozenDmgBonusPct: 0,
    dmgReductionPct: 0,
    isMiniBoss: false,
    isBoss: false,
    specialTimerMs: 0,
  };
}
