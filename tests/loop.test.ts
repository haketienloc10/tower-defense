import { describe, expect, it } from "vitest";
import { FixedStepLoop } from "../src/core/loop";

describe("FixedStepLoop", () => {
  it("advances fixed simulation ticks and reports interpolation alpha", () => {
    const ticks: number[] = [];
    const loop = new FixedStepLoop(
      (_dt, tick) => ticks.push(tick),
      () => undefined,
      { tickMs: 10, maxStepsPerFrame: 5 },
    );

    const snapshot = loop.step(25);

    expect(ticks).toEqual([1, 2]);
    expect(snapshot).toEqual({ tick: 2, alpha: 0.5 });
  });

  it("clamps catch-up steps", () => {
    const ticks: number[] = [];
    const loop = new FixedStepLoop(
      (_dt, tick) => ticks.push(tick),
      () => undefined,
      { tickMs: 10, maxStepsPerFrame: 3 },
    );

    const snapshot = loop.step(100);

    expect(ticks).toEqual([1, 2, 3]);
    expect(snapshot.tick).toBe(3);
    expect(snapshot.alpha).toBe(0);
  });
});
