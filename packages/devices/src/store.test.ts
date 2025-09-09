import { describe, it, expect } from "vitest";
import { useDevices } from "./store";

describe("scenes", () => {
  it("All Off turns devices off", async () => {
    const run = useDevices.getState().runScene;
    run("All Off");
    await new Promise((r) => setTimeout(r, 300));
    expect(useDevices.getState().devices.every((d) => d.state.on === false)).toBe(true);
  });
});

