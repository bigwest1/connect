import type { Device } from "./schema";

export const defaultDevices: Device[] = [
  {
    id: "light-1",
    name: "Porch Light",
    type: "light",
    capabilities: ["onOff", "brightness"],
    state: { on: true, brightness: 0.8 },
    actions: { toggle: () => {}, select: () => {} },
    icon: "💡",
    position: [0.1, 0.2]
  },
  {
    id: "light-2",
    name: "Garage Soffit",
    type: "light",
    capabilities: ["onOff", "brightness"],
    state: { on: false, brightness: 0.6 },
    actions: { toggle: () => {}, select: () => {} },
    icon: "💡",
    position: [0.7, 0.15]
  }
];

