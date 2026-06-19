import type { GridCoord } from "../math/iso";

export type VisualEventKind =
  | "attack"
  | "damage"
  | "death"
  | "skill"
  | "level-up";

export interface ActorVisualSnapshot {
  id: string;
  team: "ally" | "enemy";
  tile: GridCoord;
  hpRatio?: number;
}

export interface VisualEvent {
  id: string;
  kind: VisualEventKind;
  tile: GridCoord;
  fromTile?: GridCoord;
  amount?: number;
  team: "ally" | "enemy" | "neutral";
  createdTick: number;
  durationTicks: number;
  color: string;
}

export function deriveCombatVisualEvents(
  previous: readonly ActorVisualSnapshot[],
  current: readonly ActorVisualSnapshot[],
  tick: number,
): VisualEvent[] {
  const events: VisualEvent[] = [];
  const currentById = new Map(current.map((actor) => [actor.id, actor]));
  const previousById = new Map(previous.map((actor) => [actor.id, actor]));
  const allies = current.filter((actor) => actor.team === "ally");

  for (const actor of current) {
    const before = previousById.get(actor.id);
    if (
      !before ||
      actor.hpRatio === undefined ||
      before.hpRatio === undefined
    ) {
      continue;
    }
    const delta = before.hpRatio - actor.hpRatio;
    if (delta <= 0.001) continue;
    const source =
      actor.team === "enemy" ? nearestActor(actor.tile, allies) : null;
    events.push({
      id: `attack-${tick}-${actor.id}`,
      kind: "attack",
      tile: actor.tile,
      fromTile: source?.tile,
      team: actor.team,
      createdTick: tick,
      durationTicks: 16,
      color: actor.team === "enemy" ? "#ffe66d" : "#ff8a6b",
    });
    events.push({
      id: `damage-${tick}-${actor.id}`,
      kind: "damage",
      tile: actor.tile,
      amount: Math.max(1, Math.round(delta * 100)),
      team: actor.team,
      createdTick: tick,
      durationTicks: 28,
      color: actor.team === "enemy" ? "#ffe66d" : "#ff6b6b",
    });
  }

  for (const actor of previous) {
    if (currentById.has(actor.id)) continue;
    events.push({
      id: `death-${tick}-${actor.id}`,
      kind: "death",
      tile: actor.tile,
      team: actor.team,
      createdTick: tick,
      durationTicks: 34,
      color: actor.team === "enemy" ? "#ffdd66" : "#8fffc0",
    });
  }

  return events;
}

function nearestActor(
  tile: GridCoord,
  actors: readonly ActorVisualSnapshot[],
): ActorVisualSnapshot | null {
  let nearest: ActorVisualSnapshot | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const actor of actors) {
    const distance =
      Math.abs(actor.tile.gx - tile.gx) + Math.abs(actor.tile.gy - tile.gy);
    if (
      distance < nearestDistance ||
      (distance === nearestDistance && nearest && actor.id < nearest.id)
    ) {
      nearest = actor;
      nearestDistance = distance;
    }
  }
  return nearest;
}
