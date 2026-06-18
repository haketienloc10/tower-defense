import { describe, expect, it } from "vitest";
import {
  gridToScreen,
  screenToGrid,
  isInsideGrid,
  type IsoProjection,
} from "../src/math/iso";

const projection: IsoProjection = {
  tileWidth: 64,
  tileHeight: 32,
  originX: 300,
  originY: 80,
};

describe("isometric projection", () => {
  it("round-trips grid centers", () => {
    for (let gx = 0; gx < 8; gx += 1) {
      for (let gy = 0; gy < 8; gy += 1) {
        const grid = { gx, gy };
        expect(
          screenToGrid(gridToScreen(grid, projection), projection),
        ).toEqual(grid);
      }
    }
  });

  it("checks grid bounds", () => {
    expect(isInsideGrid({ gx: 0, gy: 0 }, 4, 4)).toBe(true);
    expect(isInsideGrid({ gx: 3, gy: 3 }, 4, 4)).toBe(true);
    expect(isInsideGrid({ gx: 4, gy: 3 }, 4, 4)).toBe(false);
    expect(isInsideGrid({ gx: -1, gy: 0 }, 4, 4)).toBe(false);
  });
});
