import { describe, expect, it } from "vitest";
import { createFlowField, nextFlowStep } from "../src/math/flowfield";

describe("M2 flow field", () => {
  it("routes a gate tile toward the home base", () => {
    const field = createFlowField({
      width: 5,
      height: 5,
      home: { gx: 4, gy: 2 },
      blockers: [],
    });

    expect(nextFlowStep(field, { gx: 0, gy: 2 })).toEqual({ gx: 1, gy: 2 });
    expect(nextFlowStep(field, { gx: 3, gy: 2 })).toEqual({ gx: 4, gy: 2 });
    expect(nextFlowStep(field, { gx: 4, gy: 2 })).toBeNull();
  });

  it("routes around blocker tiles deterministically", () => {
    const field = createFlowField({
      width: 5,
      height: 5,
      home: { gx: 4, gy: 2 },
      blockers: [{ gx: 1, gy: 2 }],
    });

    expect(nextFlowStep(field, { gx: 0, gy: 2 })).toEqual({ gx: 0, gy: 1 });
    expect(field.distanceAt({ gx: 1, gy: 2 })).toBeNull();
  });
});
