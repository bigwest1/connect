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
  },
  {
    id: "lock-1",
    name: "Front Door Lock",
    type: "lock",
    capabilities: ["onOff"],
    state: { on: true, locked: true },
    actions: { toggle: () => {}, select: () => {} },
    icon: "🔒",
    position: [0.25, 0.32]
  },
  {
    id: "garage-door-1",
    name: "Garage Door",
    type: "garageDoor",
    capabilities: ["openClose"],
    state: { open: 0 },
    actions: { toggle: () => {}, select: () => {} },
    icon: "🚪",
    position: [0.78, 0.28]
  },
  {
    id: "camera-1",
    name: "Front Camera",
    type: "camera",
    capabilities: ["panTilt", "onOff"],
    state: { on: true, pan: 0, tilt: 0 },
    actions: { toggle: () => {}, select: () => {} },
    icon: "📷",
    position: [0.52, 0.12]
  },
  {
    id: "outlet-1",
    name: "Back Outlet",
    type: "outlet",
    capabilities: ["onOff"],
    state: { on: false },
    actions: { toggle: () => {}, select: () => {} },
    icon: "🔌",
    position: [0.18, 0.65]
  }
];
