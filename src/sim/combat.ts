import type { EnemyDef, LevelDef, UnitDef, UnitRole } from "../data/types";
import type { GridCoord } from "../math/iso";
import {
  createFlowField,
  nextFlowStep,
  type FlowField,
} from "../math/flowfield";
import type { BuffEffect } from "../data/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CombatSetupAlly {
  id: string;
  unitId: string;
  star?: 1 | 2 | 3;
  tile: GridCoord;
}

/** Freeze / stun status on an entity */
export interface StatusEffect {
  type: "frozen" | "stunned";
  remainingMs: number;
}

export interface CombatEntity {
  id: string;
  team: "ally" | "enemy";
  defId: string;
  name: string;
  role: UnitRole | "enemy";
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
  /** Base crit chance (0–1). Synergy Assassin adds to this. */
  critChance: number;
  /** Crit damage multiplier bonus (0 = no bonus, 0.4 = +40%). */
  critDmgBonus: number;
  /** Attack speed stacks from Rageblade on-hit effect (each stack = +5% atkSpeed) */
  ragebladeStacks: number;
  /** Active status effects */
  statuses: StatusEffect[];
  /** Synergy-level freeze chance on hit (0–1) */
  freezeChancePct: number;
  freezeDurationS: number;
  /** Frost bonus: multiplier when hitting a frozen target */
  frozenDmgBonusPct: number;
  /** Incoming damage reduction from Fighter synergy */
  dmgReductionPct: number;
  isMiniBoss: boolean;
  isBoss: boolean;
  specialTimerMs: number;
}

export interface BossTelegraph {
  bossId: string;
  columnGx: number;
  remainingMs: number;
  damage: number;
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
  bossTelegraphs: BossTelegraph[];
  flowField: FlowField;
  enemyDefs: ReadonlyMap<string, EnemyDef>;
  /** Resolved synergy buff for all allies */
  allyBuff: BuffEffect;
  /** RNG stream for deterministic combat randomness (mulberry32 step) */
  rngState: number;
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
  /** Resolved synergy ally buff (from computeActiveSynergies) */
  allyBuff?: BuffEffect;
  /** Assassin-specific crit bonuses */
  assassinBonus?: { critChancePct: number; critDmgBonusPct: number };
  /** Frost freeze params */
  frostParams?: {
    freezeChancePct: number;
    freezeDurationS: number;
    frozenDmgBonusPct: number;
  };
  /** RNG seed for deterministic randomness in combat */
  rngSeed?: number;
}

const ATTACK_READY_EPSILON = 0.0001;
const BASE_CRIT_CHANCE = 0;
const BASE_CRIT_MULT = 1.5;
const RAGEBLADE_STACK_BONUS = 0.05;
const RAGEBLADE_MAX_STACKS = 6;
const THORNMAIL_REFLECT = 0.15;
const SERAPHS_ENERGY_PER_HIT = 15;

// ---------------------------------------------------------------------------
// RNG helpers (mulberry32, deterministic)
// ---------------------------------------------------------------------------

function rngNext(state: number): { value: number; nextState: number } {
  let s = state + 0x6d2b79f5;
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  const value = ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  return { value, nextState: s >>> 0 };
}

function rngChance(world: CombatWorld, probability: number): boolean {
  const { value, nextState } = rngNext(world.rngState);
  world.rngState = nextState;
  return value < probability;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCombatWorld(input: CombatWorldInput): CombatWorld {
  const wave = input.level.waves.find((item) => item.index === input.waveIndex);
  if (!wave) {
    throw new Error(`Missing wave: ${input.waveIndex}`);
  }

  const buff = input.allyBuff ?? {};
  const assassin = input.assassinBonus ?? {
    critChancePct: 0,
    critDmgBonusPct: 0,
  };
  const frost = input.frostParams ?? {
    freezeChancePct: 0,
    freezeDurationS: 0,
    frozenDmgBonusPct: 0,
  };

  const unitDefs = new Map(input.unitDefs.map((unit) => [unit.id, unit]));
  const enemyDefs = new Map(input.enemyDefs.map((enemy) => [enemy.id, enemy]));

  const allies = input.allies.map((setup): CombatEntity => {
    const def = unitDefs.get(setup.unitId);
    if (!def) throw new Error(`Missing unit definition: ${setup.unitId}`);
    const star = setup.star ?? 1;
    const statMultiplier = def.starScaling ** (star - 1);

    // Apply fighter HP/armor buffs
    const baseHp = def.baseStats.hp * statMultiplier;
    const hp = baseHp * (1 + (buff.hpPct ?? 0));
    const armor = def.baseStats.armor + (buff.armorFlat ?? 0);

    // Assassin-only crit
    const isAssassin = def.role === "Assassin";
    const critChance =
      BASE_CRIT_CHANCE + (isAssassin ? assassin.critChancePct : 0);
    const critDmgBonus = isAssassin ? assassin.critDmgBonusPct : 0;

    return {
      id: setup.id,
      team: "ally",
      defId: def.id,
      name: def.name,
      role: def.role,
      tile: setup.tile,
      hp,
      maxHp: hp,
      atk: def.baseStats.atk * statMultiplier,
      atkSpeed: def.baseStats.atkSpeed,
      range: def.baseStats.range,
      armor,
      moveSpeed: 0,
      attackTimerMs: 0,
      moveProgress: 0,
      critChance,
      critDmgBonus,
      ragebladeStacks: 0,
      statuses: [],
      freezeChancePct: frost.freezeChancePct,
      freezeDurationS: frost.freezeDurationS,
      frozenDmgBonusPct: frost.frozenDmgBonusPct,
      dmgReductionPct: buff.dmgReductionPct ?? 0,
      isMiniBoss: false,
      isBoss: false,
      specialTimerMs: 0,
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
    bossTelegraphs: [],
    flowField,
    enemyDefs,
    allyBuff: buff,
    rngState: (input.rngSeed ?? 0x4d35_5e2c) >>> 0,
  };
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export function stepCombatWorld(world: CombatWorld, dtMs: number): CombatWorld {
  if (world.waveEnded) return world;
  world.elapsedMs += dtMs;
  spawnReadyEnemies(world);
  tickStatuses(world, dtMs);
  updateBossSpecials(world, dtMs);
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

// ---------------------------------------------------------------------------
// Targeting policies
// ---------------------------------------------------------------------------

/**
 * Route target selection by the ally's role.
 * Each policy is deterministic (tie-break by entity id).
 */
export function pickTarget(
  ally: CombatEntity,
  world: CombatWorld,
): CombatEntity | null {
  switch (ally.role) {
    case "Marksman":
      return pickClosestToHomeTarget(ally, world);
    case "Mage":
      return pickDensestClusterTarget(ally, world);
    case "Assassin":
      return pickWeakestTarget(ally, world);
    case "Tanker":
    default:
      return pickNearestEnemyTarget(ally, world);
  }
}

/** Tanker: nearest enemy in range */
export function pickNearestEnemyTarget(
  ally: CombatEntity,
  world: CombatWorld,
): CombatEntity | null {
  const inRange = liveEnemiesInRange(ally, world);
  const sorted = inRange.sort((a, b) => {
    const da = gridDistance(ally.tile, a.tile);
    const db = gridDistance(ally.tile, b.tile);
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
  return sorted[0] ?? null;
}

/** Marksman: enemy closest to home (largest flow-field distance from gate) */
function pickClosestToHomeTarget(
  ally: CombatEntity,
  world: CombatWorld,
): CombatEntity | null {
  const inRange = liveEnemiesInRange(ally, world);
  if (inRange.length === 0) return null;
  // "closest to home" = smallest Manhattan distance to homePos
  const sorted = inRange.sort((a, b) => {
    const da = gridDistance(a.tile, world.level.homePos);
    const db = gridDistance(b.tile, world.level.homePos);
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
  return sorted[0];
}

/** Mage: tile within range containing the most living enemies (densest cluster) */
function pickDensestClusterTarget(
  ally: CombatEntity,
  world: CombatWorld,
): CombatEntity | null {
  const live = world.enemies.filter((e) => e.hp > 0);
  const inRange = live.filter(
    (e) => gridDistance(ally.tile, e.tile) <= ally.range,
  );
  if (inRange.length === 0) return null;

  // Find tile with most enemies
  const densityMap = new Map<string, number>();
  for (const e of live) {
    const key = `${e.tile.gx},${e.tile.gy}`;
    densityMap.set(key, (densityMap.get(key) ?? 0) + 1);
  }

  const sorted = inRange.sort((a, b) => {
    const da = densityMap.get(`${a.tile.gx},${a.tile.gy}`) ?? 0;
    const db = densityMap.get(`${b.tile.gx},${b.tile.gy}`) ?? 0;
    if (da !== db) return db - da; // higher density first
    return a.id.localeCompare(b.id);
  });
  return sorted[0];
}

/** Assassin: enemy with lowest HP in range (weakest/highest-value) */
function pickWeakestTarget(
  ally: CombatEntity,
  world: CombatWorld,
): CombatEntity | null {
  const inRange = liveEnemiesInRange(ally, world);
  if (inRange.length === 0) return null;
  const sorted = inRange.sort((a, b) => {
    if (a.hp !== b.hp) return a.hp - b.hp;
    return a.id.localeCompare(b.id);
  });
  return sorted[0];
}

function liveEnemiesInRange(
  ally: CombatEntity,
  world: CombatWorld,
): CombatEntity[] {
  return world.enemies.filter(
    (e) => e.hp > 0 && gridDistance(ally.tile, e.tile) <= ally.range,
  );
}

// ---------------------------------------------------------------------------
// Damage calculation
// ---------------------------------------------------------------------------

export function applyArmorMitigation(atk: number, armor: number): number {
  return atk * (100 / (100 + Math.max(0, armor)));
}

function isFrozen(entity: CombatEntity): boolean {
  return entity.statuses.some((s) => s.type === "frozen" && s.remainingMs > 0);
}

// ---------------------------------------------------------------------------
// Internal systems
// ---------------------------------------------------------------------------

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
    world.enemies.push(
      createEnemyEntity(
        id,
        def,
        { gx: gate.gx, gy: gate.gy },
        world.wave.index,
      ),
    );
    world.combatLog.push(
      `${world.elapsedMs}:spawn:${id}:${gate.gx},${gate.gy}`,
    );
  }
}

function tickStatuses(world: CombatWorld, dtMs: number): void {
  for (const entity of [...world.allies, ...world.enemies]) {
    entity.statuses = entity.statuses
      .map((s) => ({ ...s, remainingMs: s.remainingMs - dtMs }))
      .filter((s) => s.remainingMs > 0);
  }
}

function moveEnemies(world: CombatWorld, dtMs: number): void {
  for (const enemy of [...world.enemies].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (enemy.hp <= 0) continue;
    if (isFrozen(enemy)) continue; // frozen enemies cannot move
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
    if (ally.hp <= 0) continue;
    if (isFrozen(ally)) continue; // frozen allies skip attack

    // Effective attack speed includes rageblade stacks
    const effectiveAtkSpeed =
      ally.atkSpeed * (1 + ally.ragebladeStacks * RAGEBLADE_STACK_BONUS);
    ally.attackTimerMs += dtMs;
    const intervalMs = 1000 / effectiveAtkSpeed;
    if (ally.attackTimerMs + ATTACK_READY_EPSILON < intervalMs) continue;

    const target = pickTarget(ally, world);
    if (!target) continue;
    ally.attackTimerMs -= intervalMs;

    // Base damage
    let damage = applyArmorMitigation(ally.atk, target.armor);

    // Frost: bonus damage vs frozen targets
    if (isFrozen(target) && ally.frozenDmgBonusPct > 0) {
      damage *= 1 + ally.frozenDmgBonusPct;
    }

    // Crit check
    let isCrit = false;
    if (ally.critChance > 0 && rngChance(world, ally.critChance)) {
      damage *= BASE_CRIT_MULT + ally.critDmgBonus;
      isCrit = true;
    }

    // Damage reduction on target (Fighter synergy)
    if (target.dmgReductionPct > 0) {
      damage *= 1 - target.dmgReductionPct;
    }

    target.hp = Math.max(0, target.hp - damage);

    world.combatLog.push(
      `${world.elapsedMs}:hit:${ally.id}:${target.id}:${damage.toFixed(3)}:${target.hp.toFixed(3)}${isCrit ? ":crit" : ""}`,
    );

    // Frost: freeze on hit
    if (ally.freezeChancePct > 0 && rngChance(world, ally.freezeChancePct)) {
      const durationMs = ally.freezeDurationS * 1000;
      const existing = target.statuses.find((s) => s.type === "frozen");
      if (existing) {
        existing.remainingMs = Math.max(existing.remainingMs, durationMs);
      } else {
        target.statuses.push({ type: "frozen", remainingMs: durationMs });
      }
      world.combatLog.push(
        `${world.elapsedMs}:freeze:${target.id}:${ally.freezeDurationS}s`,
      );
    }

    // Rageblade: +5% atkSpeed stack on hit
    if (ally.ragebladeStacks < RAGEBLADE_MAX_STACKS) {
      ally.ragebladeStacks += 1;
    }

    // Thornmail: reflect 15% physical to attacker — applied when enemy hits ally
    // (This is an on-hit-received effect — implemented in the enemy attack phase M6+)

    // Seraph's: +15 energy per hit (placeholder; energy system M6+)
    void SERAPHS_ENERGY_PER_HIT;
    void THORNMAIL_REFLECT;
  }
}

function removeDeadEnemies(world: CombatWorld): void {
  const survivors: CombatEntity[] = [];
  const spawnedFromDeaths: CombatEntity[] = [];
  for (const enemy of world.enemies) {
    if (enemy.hp > 0) {
      survivors.push(enemy);
    } else if (
      enemy.tile.gx !== world.level.homePos.gx ||
      enemy.tile.gy !== world.level.homePos.gy
    ) {
      world.defeatedEnemyCount += 1;
      world.combatLog.push(`${world.elapsedMs}:dead:${enemy.id}`);
      spawnedFromDeaths.push(...createEnemyDeathSpawns(world, enemy));
    }
  }
  world.enemies = [...survivors, ...spawnedFromDeaths].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

function updateBossSpecials(world: CombatWorld, dtMs: number): void {
  for (const telegraph of [...world.bossTelegraphs]) {
    telegraph.remainingMs -= dtMs;
    if (telegraph.remainingMs > 0) continue;
    for (const ally of world.allies) {
      if (ally.hp <= 0) continue;
      if (ally.tile.gx !== telegraph.columnGx) continue;
      ally.hp = Math.max(0, ally.hp - telegraph.damage);
      world.combatLog.push(
        `${world.elapsedMs}:boss-column-hit:${telegraph.bossId}:${ally.id}:${telegraph.columnGx}:${ally.hp.toFixed(3)}`,
      );
    }
    world.bossTelegraphs = world.bossTelegraphs.filter(
      (item) => item !== telegraph,
    );
  }

  for (const enemy of [...world.enemies].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (enemy.hp <= 0) continue;
    const def = world.enemyDefs.get(enemy.defId);
    if (def?.special?.type !== "column-breath") continue;
    if (world.bossTelegraphs.some((item) => item.bossId === enemy.id)) continue;
    enemy.specialTimerMs += dtMs;
    if (enemy.specialTimerMs < def.special.intervalMs) continue;
    enemy.specialTimerMs = 0;
    const columnGx = pickDragonColumn(world);
    world.bossTelegraphs.push({
      bossId: enemy.id,
      columnGx,
      remainingMs: def.special.telegraphMs,
      damage: def.special.damage,
    });
    world.combatLog.push(
      `${world.elapsedMs}:boss-telegraph:${enemy.id}:${columnGx}:${def.special.telegraphMs}`,
    );
  }
}

function pickDragonColumn(world: CombatWorld): number {
  const liveAllies = world.allies.filter((ally) => ally.hp > 0);
  if (liveAllies.length === 0) return world.level.homePos.gx;
  const byColumn = new Map<number, { count: number; firstId: string }>();
  for (const ally of [...liveAllies].sort((a, b) => a.id.localeCompare(b.id))) {
    const current = byColumn.get(ally.tile.gx);
    if (!current) {
      byColumn.set(ally.tile.gx, { count: 1, firstId: ally.id });
    } else {
      current.count += 1;
    }
  }
  return [...byColumn.entries()].sort((a, b) => {
    if (a[1].count !== b[1].count) return b[1].count - a[1].count;
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1].firstId.localeCompare(b[1].firstId);
  })[0][0];
}

function createEnemyDeathSpawns(
  world: CombatWorld,
  enemy: CombatEntity,
): CombatEntity[] {
  const def = world.enemyDefs.get(enemy.defId);
  if (def?.onDeath?.type !== "split") return [];
  const childDef = world.enemyDefs.get(def.onDeath.enemyId);
  if (!childDef)
    throw new Error(`Missing split enemy definition: ${def.onDeath.enemyId}`);
  const spawned: CombatEntity[] = [];
  for (let index = 0; index < def.onDeath.count; index += 1) {
    const childId = `${enemy.id}-split-${index.toString().padStart(2, "0")}`;
    spawned.push(
      createEnemyEntity(childId, childDef, enemy.tile, world.wave.index, {
        moveSpeedMultiplier: def.onDeath.moveSpeedMultiplier,
      }),
    );
    world.combatLog.push(
      `${world.elapsedMs}:split:${enemy.id}:${childId}:${enemy.tile.gx},${enemy.tile.gy}`,
    );
  }
  return spawned;
}

function createEnemyEntity(
  id: string,
  def: EnemyDef,
  tile: GridCoord,
  waveIndex: number,
  options: { moveSpeedMultiplier?: number } = {},
): CombatEntity {
  const hpScale = 1 + 0.18 * (waveIndex - 1);
  const atkScale = 1 + 0.12 * (waveIndex - 1);
  const hp = def.stats.hp * hpScale * (def.hpMultiplier ?? 1);
  return {
    id,
    team: "enemy",
    defId: def.id,
    name: def.name,
    role: "enemy",
    tile: { ...tile },
    hp,
    maxHp: hp,
    atk: def.stats.atk * atkScale,
    atkSpeed: 0,
    range: def.stats.range,
    armor: def.stats.armor,
    moveSpeed: def.stats.moveSpeed * (options.moveSpeedMultiplier ?? 1),
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
    isMiniBoss: def.isMiniBoss ?? false,
    isBoss: def.isBoss ?? false,
    specialTimerMs: 0,
  };
}

function gridDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy);
}
