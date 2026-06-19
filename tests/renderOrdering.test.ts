import { describe, expect, it } from "vitest";
import { sortBoardActorsByDepth } from "../src/render/boardRenderer";
import type { BoardActor } from "../src/sim/staticBoard";

describe("board actor depth sorting", () => {
  it("sorts by isometric depth with a stable id tie-break", () => {
    const actors: BoardActor[] = [
      actor("unit-c", 1, 3),
      actor("unit-a", 2, 1),
      actor("unit-b", 0, 3),
      actor("unit-d", 0, 0),
    ];

    expect(sortBoardActorsByDepth(actors).map((item) => item.id)).toEqual([
      "unit-d",
      "unit-a",
      "unit-b",
      "unit-c",
    ]);
    expect(actors.map((item) => item.id)).toEqual([
      "unit-c",
      "unit-a",
      "unit-b",
      "unit-d",
    ]);
  });
});

function actor(id: string, gx: number, gy: number): BoardActor {
  return {
    id,
    team: "ally",
    unitId: id,
    name: id,
    cost: 1,
    role: "Tanker",
    traits: [],
    tile: { gx, gy },
    color: "#ffffff",
    sprite: {
      id,
      color: "#ffffff",
      accentColor: "#d8e2ff",
      glowColor: "#9fc4ff",
      shape: "guard",
      projectileColor: "#9fc4ff",
      anchor: "bottom-center",
    },
    star: 1,
  };
}
