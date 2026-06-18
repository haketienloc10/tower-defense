import type { EnemyDef, LevelDef, UnitDef } from "../data/types";
import type { GridCoord } from "../math/iso";
import {
  createFlowField,
  nextFlowStep,
  type FlowField,
} from "../math/flowfield";

export interface CombatSetupAlly {
  id: string;
  unitId: string;
  star?: 1 | 2 | 3;
  tile: GridCoord;
}

export interface CombatEntity {
  id: string;
  team: "ally" | "enemy";
  defId: string;
  name: string;
  tile: GridCoord;
  hp: number;
  maxHp: number;
  atk: number;
  atkSpeed: number;
  range: number;
  armor: number;
  moveSpeed: number;
  attackTimerMs: number;
  moveProgress: number;
}

export interface CombatWorld {
  level: LevelDef;
  wave: LevelDef["waves"][number];
  elapsedMs: number;
  allies: CombatEntity[];
  enemies: CombatEntity[];
  pendingSpawns: PendingSpawn[];
  defeatedEnemyCount: number;
  leakedEnemyCount: number;
  waveEnded: boolean;
  combatLog: string[];
  flowField: FlowField;
  enemyDefs: ReadonlyMap<string, EnemyDef>;
}

interface PendingSpawn {
  enemyId: string;
  gateId: string;
  spawnAtMs: number;
  sequence: number;
}

export interface CombatWorldInput {
  level: LevelDef;
  waveIndex: number;
  unitDefs: readonly UnitDef[];
  enemyDefs: readonly EnemyDef[];
  allies: readonly CombatSetupAlly[];
  enemySpawnLimit?: number;
}

const ATTACK_READY_EPSILON = 0.0001;

export function createCombatWorld(input: CombatWorldInput): CombatWorld {
  const wave = input.level.waves.find((item) => item.index === input.waveIndex);
  if (!wave) {
    throw new Error(`Missing wave: ${input.waveIndex}`);
  }

  const unitDefs = new Map(input.unitDefs.map((unit) => [unit.id, unit]));
  const enemyDefs = new Map(input.enemyDefs.map((enemy) => [enemy.id, enemy]));
  const allies = input.allies.map((setup): CombatEntity => {
    const def = unitDefs.get(setup.unitId);
    if (!def) throw new Error(`Missing unit definition: ${setup.unitId}`);
    const star = setup.star ?? 1;
    const statMultiplier = def.starScaling ** (star - 1);
    return {
      id: setup.id,
      team: "ally",
      defId: def.id,
      name: def.name,
      tile: setup.tile,
      hp: def.baseStats.hp * statMultiplier,
      maxHp: def.baseStats.hp * statMultiplier,
      atk: def.baseStats.atk * statMultiplier,
      atkSpeed: def.baseStats.atkSpeed,
      range: def.baseStats.range,
      armor: def.baseStats.armor,
      moveSpeed: 0,
      attackTimerMs: 0,
      moveProgress: 0,
    };
  });
  const flowField = createFlowField({
    width: input.level.gridSize.w,
    height: input.level.gridSize.h,
    home: input.level.homePos,
    blockers: allies.map((ally) => ally.tile),
  });

  return {
    level: input.level,
    wave,
    elapsedMs: 0,
    allies,
    enemies: [],
    pendingSpawns: createPendingSpawns(wave, input.enemySpawnLimit),
    defeatedEnemyCount: 0,
    leakedEnemyCount: 0,
    waveEnded: false,
    combatLog: [],
    flowField,
    enemyDefs,
  };
}

export function stepCombatWorld(world: CombatWorld, dtMs: number): CombatWorld {
  if (world.waveEnded) return world;
  world.elapsedMs += dtMs;
  spawnReadyEnemies(world);
  moveEnemies(world, dtMs);
  attackWithAllies(world, dtMs);
  removeDeadEnemies(world);
  world.waveEnded =
    world.pendingSpawns.length === 0 && world.enemies.length === 0;
  return world;
}

export function runCombatTicks(
  world: CombatWorld,
  ticks: number,
  dtMs: number,
): CombatWorld {
  for (let tick = 0; tick < ticks && !world.waveEnded; tick += 1) {
    stepCombatWorld(world, dtMs);
  }
  return world;
}

export function pickNearestEnemyTarget(
  ally: CombatEntity,
  world: CombatWorld,
): CombatEntity | null {
  const liveEnemies = world.enemies.filter((enemy) => enemy.hp > 0);
  const inRange = liveEnemies
    .map((enemy) => ({ enemy, distance: gridDistance(ally.tile, enemy.tile) }))
    .filter((item) => item.distance <= ally.range)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.enemy.id.localeCompare(b.enemy.id);
    });
  return inRange[0]?.enemy ?? null;
}

export function applyArmorMitigation(atk: number, armor: number): number {
  return atk * (100 / (100 + Math.max(0, armor)));
}

function createPendingSpawns(
  wave: LevelDef["waves"][number],
  limit?: number,
): PendingSpawn[] {
  const pending: PendingSpawn[] = [];
  let sequence = 0;
  for (const group of wave.spawns) {
    for (let index = 0; index < group.count; index += 1) {
      if (limit !== undefined && pending.length >= limit) break;
      pending.push({
        enemyId: group.enemyId,
        gateId: group.gateId,
        spawnAtMs: index * group.intervalMs,
        sequence,
      });
      sequence += 1;
    }
  }
  return pending.sort((a, b) => {
    if (a.spawnAtMs !== b.spawnAtMs) return a.spawnAtMs - b.spawnAtMs;
    return a.sequence - b.sequence;
  });
}

function spawnReadyEnemies(world: CombatWorld): void {
  const ready = world.pendingSpawns.filter(
    (spawn) => spawn.spawnAtMs <= world.elapsedMs,
  );
  world.pendingSpawns = world.pendingSpawns.filter(
    (spawn) => spawn.spawnAtMs > world.elapsedMs,
  );

  for (const spawn of ready) {
    const def = world.enemyDefs.get(spawn.enemyId);
    const gate = world.level.gates.find((item) => item.id === spawn.gateId);
    if (!def) throw new Error(`Missing enemy definition: ${spawn.enemyId}`);
    if (!gate) throw new Error(`Missing gate definition: ${spawn.gateId}`);
    const id = `enemy-${spawn.sequence.toString().padStart(3, "0")}-${def.id}`;
    world.enemies.push({
      id,
      team: "enemy",
      defId: def.id,
      name: def.name,
      tile: { gx: gate.gx, gy: gate.gy },
      hp: def.stats.hp,
      maxHp: def.stats.hp,
      atk: def.stats.atk,
      atkSpeed: 0,
      range: def.stats.range,
      armor: def.stats.armor,
      moveSpeed: def.stats.moveSpeed,
      attackTimerMs: 0,
      moveProgress: 0,
    });
    world.combatLog.push(
      `${world.elapsedMs}:spawn:${id}:${gate.gx},${gate.gy}`,
    );
  }
}

function moveEnemies(world: CombatWorld, dtMs: number): void {
  for (const enemy of [...world.enemies].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (enemy.hp <= 0) continue;
    enemy.moveProgress += enemy.moveSpeed * (dtMs / 1000);
    while (enemy.moveProgress >= 1) {
      const next = nextFlowStep(world.flowField, enemy.tile);
      if (!next) break;
      enemy.tile = next;
      enemy.moveProgress -= 1;
      world.combatLog.push(
        `${world.elapsedMs}:move:${enemy.id}:${next.gx},${next.gy}`,
      );
      if (
        enemy.tile.gx === world.level.homePos.gx &&
        enemy.tile.gy === world.level.homePos.gy
      ) {
        enemy.hp = 0;
        world.leakedEnemyCount += 1;
        world.combatLog.push(`${world.elapsedMs}:leak:${enemy.id}`);
        break;
      }
    }
  }
}

function attackWithAllies(world: CombatWorld, dtMs: number): void {
  for (const ally of [...world.allies].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    ally.attackTimerMs += dtMs;
    const intervalMs = 1000 / ally.atkSpeed;
    if (ally.attackTimerMs + ATTACK_READY_EPSILON < intervalMs) continue;
    const target = pickNearestEnemyTarget(ally, world);
    if (!target) continue;
    ally.attackTimerMs -= intervalMs;
    const damage = applyArmorMitigation(ally.atk, target.armor);
    target.hp = Math.max(0, target.hp - damage);
    world.combatLog.push(
      `${world.elapsedMs}:hit:${ally.id}:${target.id}:${damage.toFixed(3)}:${target.hp.toFixed(3)}`,
    );
  }
}

function removeDeadEnemies(world: CombatWorld): void {
  const survivors: CombatEntity[] = [];
  for (const enemy of world.enemies) {
    if (enemy.hp > 0) {
      survivors.push(enemy);
    } else if (
      enemy.tile.gx !== world.level.homePos.gx ||
      enemy.tile.gy !== world.level.homePos.gy
    ) {
      world.defeatedEnemyCount += 1;
      world.combatLog.push(`${world.elapsedMs}:dead:${enemy.id}`);
    }
  }
  world.enemies = survivors;
}

function gridDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy);
}
