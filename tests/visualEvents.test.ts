import { describe, expect, it } from "vitest";
import {
  deriveCombatVisualEvents,
  type ActorVisualSnapshot,
} from "../src/render/visualEvents";

describe("combat visual event derivation", () => {
  it("emits deterministic attack and damage events when hp drops", () => {
    const previous: ActorVisualSnapshot[] = [
      actor("ally-1", "ally", 2, 2, 1),
      actor("enemy-1", "enemy", 3, 2, 1),
    ];
    const current: ActorVisualSnapshot[] = [
      actor("ally-1", "ally", 2, 2, 1),
      actor("enemy-1", "enemy", 3, 2, 0.75),
    ];

    const events = deriveCombatVisualEvents(previous, current, 12);

    expect(events.map((event) => event.kind)).toEqual(["attack", "damage"]);
    expect(events[0]).toMatchObject({
      id: "attack-12-enemy-1",
      fromTile: { gx: 2, gy: 2 },
      tile: { gx: 3, gy: 2 },
    });
    expect(events[1]).toMatchObject({
      id: "damage-12-enemy-1",
      amount: 25,
    });
  });

  it("emits death events when an actor disappears", () => {
    const events = deriveCombatVisualEvents(
      [actor("enemy-1", "enemy", 3, 2, 0.05)],
      [],
      20,
    );

    expect(events).toEqual([
      {
        id: "death-20-enemy-1",
        kind: "death",
        tile: { gx: 3, gy: 2 },
        team: "enemy",
        createdTick: 20,
        durationTicks: 34,
        color: "#ffdd66",
      },
    ]);
  });
});

function actor(
  id: string,
  team: "ally" | "enemy",
  gx: number,
  gy: number,
  hpRatio: number,
): ActorVisualSnapshot {
  return { id, team, tile: { gx, gy }, hpRatio };
}
