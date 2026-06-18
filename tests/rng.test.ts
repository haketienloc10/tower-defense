import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng";

describe("Rng", () => {
  it("returns the same sequence for the same seed", () => {
    const a = new Rng(42);
    const b = new Rng(42);

    expect([a.next(), a.next(), a.int(100), a.chance(0.5)]).toEqual([
      b.next(),
      b.next(),
      b.int(100),
      b.chance(0.5),
    ]);
  });

  it("rejects invalid ranges", () => {
    const rng = new Rng(1);

    expect(() => rng.int(0)).toThrow(RangeError);
    expect(() => rng.pick([])).toThrow(RangeError);
    expect(() => rng.chance(1.1)).toThrow(RangeError);
  });
});
