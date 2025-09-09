import { describe, it, expect } from "vitest";
import { computeSeed } from "./house.util";

describe("useSeedGeometry", () => {
  it("computes size and height from metrics", () => {
    const metrics = { stories: 2, footprint: { perimeter_ft: 100, area_ft2: 1600 } };
    const { size, height } = computeSeed(metrics);
    expect(size).toBeGreaterThan(0);
    expect(height).toBe(2.8 * 2);
  });
});
