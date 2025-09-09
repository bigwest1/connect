import type { Device } from "./schema";

export type EasingFn = (t: number) => number;

export type TimelineStep = {
  delayMs?: number;
  durationMs?: number;
  easing?: "linear" | "easeOutCubic";
  brightness?: number;
  colorTempK?: number; // Kelvin
  on?: boolean;
};

export type DeviceSelector =
  | { type: "device"; id: string }
  | { type: "type"; deviceType: string }
  | { type: "group"; groupId: string };

export type SceneDef = {
  name: string;
  steps: Array<{ selector: DeviceSelector; step: TimelineStep }>;
};

// Helper for common light scenes operating on all lights
function sceneForAllLights(name: string, step: TimelineStep): SceneDef {
  return { name, steps: [{ selector: { type: "type", deviceType: "light" }, step }] };
}

export const defaultScenes: SceneDef[] = [
  sceneForAllLights("Evening", { brightness: 0.5, colorTempK: 2700, durationMs: 900, easing: "easeOutCubic", on: true }),
  // Away: porch on dim warm, others off
  {
    name: "Away",
    steps: [
      { selector: { type: "type", deviceType: "light" }, step: { on: false, brightness: 0, durationMs: 600, easing: "easeOutCubic" } },
      { selector: { type: "device", id: "light-1" }, step: { on: true, brightness: 0.25, colorTempK: 2600, durationMs: 700, easing: "easeOutCubic" } },
    ],
  },
  sceneForAllLights("Movie", { brightness: 0.2, colorTempK: 2400, durationMs: 900, easing: "easeOutCubic", on: true }),
  sceneForAllLights("Clean Up", { brightness: 0.9, colorTempK: 4000, durationMs: 700, easing: "easeOutCubic", on: true }),
  sceneForAllLights("All Off", { on: false, brightness: 0, durationMs: 600, easing: "easeOutCubic" }),
];

export function resolveTargets(selector: DeviceSelector, devices: Device[]): Device[] {
  if (selector.type === "device") return devices.filter((d) => d.id === selector.id);
  if (selector.type === "type") return devices.filter((d) => d.type === selector.deviceType);
  if (selector.type === "group") return devices.filter((d) => (d.groupIds ?? []).includes(selector.groupId));
  return [];
}

export function kelvinToRGB(kelvin: number): string {
  // Approximation, returns hex string like #ffd7a8
  let temp = kelvin / 100;
  let red: number, green: number, blue: number;
  if (temp <= 66) {
    red = 255;
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
    blue = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    blue = 255;
  }
  red = Math.min(255, Math.max(0, red));
  green = Math.min(255, Math.max(0, green));
  blue = Math.min(255, Math.max(0, blue));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(Math.round(red))}${toHex(Math.round(green))}${toHex(Math.round(blue))}`;
}
