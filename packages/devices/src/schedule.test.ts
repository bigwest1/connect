import { describe, it, expect } from "vitest";
import { parseSchedules } from "./schedule";

describe("schedule validation", () => {
  it("accepts a valid sun rule", () => {
    const s = [{ enabled: true, when: { type: 'sun', event: 'sunset', offsetMin: 0 }, action: { on: true } }];
    const out = parseSchedules(s);
    expect(out[0].when.type).toBe('sun');
  });

  it("rejects invalid cron", () => {
    const s = [{ enabled: true, when: { type: 'cron', cron: 'invalid' }, action: { on: true } }];
    expect(() => parseSchedules(s)).toThrow();
  });
});

