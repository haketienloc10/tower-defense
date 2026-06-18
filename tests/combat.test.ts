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
  };
}
