import { create } from "zustand";
import { defaultDevices } from "./registry";
import type { Device } from "./schema";
import type { ScheduleRule } from "./schedule";
import { defaultScenes, kelvinToRGB, resolveTargets, type SceneDef, type TimelineStep } from "./scenes";

const SCENES_KEY = "homegraph.scenes";
const GROUPS_KEY = "homegraph.groups";

function loadPersisted<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch { return undefined; }
}
function savePersisted<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

type ActiveAnim = { id: string; prop: "brightness" | "colorTempK"; token: number; cancel?: () => void };

function animateProperty(opts: { id: string; prop: "brightness" | "colorTempK"; to: number; duration?: number; easing?: "linear" | "easeOutCubic"; token?: number }) {
  const { id, prop, to } = opts;
  const prefersReduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = prefersReduced ? 100 : (opts.duration ?? 700);
  const easing = opts.easing ?? "easeOutCubic";
  const start = performance.now();
  const state = useDevices.getState();
  const from = (state.devices.find((d) => d.id === id)?.state as any)?.[prop] ?? (prop === "brightness" ? 0 : 2700);
  let raf = 0 as any;
  const ease = (t: number) => (easing === "linear" ? t : easeOutCubic(t));
  const step = (now: number) => {
    const token = opts.token;
    // Cancel if a new token supersedes this one for this device+prop
    const animKey = `${id}:${prop}`;
    if (token && useDevices.getState()._animTokens[animKey] !== token) return;
    const t = Math.min(1, (now - start) / duration);
    const v = from + (to - from) * ease(t);
    useDevices.setState(({ devices }) => ({
      devices: devices.map((x) => {
        if (x.id !== id) return x;
        const patch: any = { ...x.state };
        (patch as any)[prop] = v;
        if (prop === "brightness") patch.on = to > 0.01;
        if (prop === "colorTempK") patch.colorRGB = kelvinToRGB(v);
        return { ...x, state: patch };
      })
    }));
    if (t < 1) raf = (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb: any) => setTimeout(() => cb(performance.now()), 16))(step);
  };
  const rafImpl = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb: any) => setTimeout(() => cb(performance.now()), 16);
  const cafImpl = typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : (id: any) => clearTimeout(id);
  raf = rafImpl(step);
  return () => cafImpl(raf);
}

type Group = { id: string; name: string; kind: "room" | "tag" };

type DeviceState = {
  devices: Device[];
  selectedId: string | null;
  setSelected: (id: string | null) => void;
  addDevice: (d: Omit<Device, 'actions'>) => void;
  removeDevice: (id: string) => void;
  updateState: (id: string, partial: Record<string, any>) => void;
  setSchedules: (id: string, schedules: ScheduleRule[]) => void;
  applyAction: (id: string, action: Partial<Record<string, any>> & { scene?: string }) => void;
  runScene: (name: string) => void;
  // scenes & preview
  scenes: SceneDef[];
  setScenes: (scenes: SceneDef[]) => void;
  previewScene: (name: string, filter?: (d: Device) => boolean) => void;
  cancelPreview: () => void;
  applyScene: (name: string, filter?: (d: Device) => boolean) => void;
  _preview?: { name: string; snapshot: Record<string, any>; token: number } | null;
  _animTokens: Record<string, number>; // key deviceId:prop -> token
  // groups
  groups: Group[];
  addGroup: (g: Group) => void;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  assignToGroup: (deviceId: string, groupId: string, present: boolean) => void;
};

function withActions(d: Omit<Device, 'actions'>): Device {
  return {
    ...d,
    actions: {
      toggle: () => {
        const current = useDevices.getState().devices.find((x) => x.id === d.id);
        const targetOn = !(current?.state.on ?? false);
        const to = targetOn ? (current?.state.brightness ?? 0.6) || 0.6 : 0;
        animateProperty({ id: d.id, prop: 'brightness', to, duration: 700, easing: 'easeOutCubic' });
      },
      select: () => useDevices.getState().setSelected(d.id)
    }
  } as Device;
}

export const useDevices = create<DeviceState>((set, get) => ({
  devices: defaultDevices.map((d) => withActions(d)),
  selectedId: null,
  setSelected: (id) => set({ selectedId: id }),
  addDevice: (d) => set(({ devices }) => {
    const exists = devices.some((x) => x.id === d.id);
    const next = exists ? devices.map((x) => (x.id === d.id ? withActions(d) : x)) : [...devices, withActions(d)];
    return { devices: next } as any;
  }),
  removeDevice: (id) => set(({ devices }) => ({ devices: devices.filter((x) => x.id !== id) })),
  updateState: (id, partial) => set(({ devices }) => ({ devices: devices.map((x) => (x.id === id ? { ...x, state: { ...x.state, ...partial } } : x)) })),
  setSchedules: (id, schedules) => set(({ devices }) => ({ devices: devices.map((x) => (x.id === id ? { ...x, state: { ...x.state, schedules } } : x)) })),
  applyAction: (id, action) => {
    if (action.scene) {
      get().runScene(action.scene);
    }
    const patch: Record<string, any> = { ...action };
    delete patch.scene;
    get().updateState(id, patch);
  },
  runScene: (name) => get().applyScene(name),
  // scenes & preview
  scenes: loadPersisted<SceneDef[]>(SCENES_KEY) ?? defaultScenes,
  setScenes: (scenes) => set({ scenes }),
  _preview: null,
  _animTokens: {},
  previewScene: (name, filter) => {
    const scene = get().scenes.find((s) => s.name === name);
    if (!scene) return;
    const token = Math.floor(Math.random() * 1e9);
    const devices = get().devices;
    const targeted = new Set<string>();
    const snapshot: Record<string, any> = {};
    for (const step of scene.steps) {
      const targets = resolveTargets(step.selector, devices).filter((d) => (filter ? filter(d) : true));
      for (const d of targets) {
        targeted.add(d.id);
        if (!snapshot[d.id]) snapshot[d.id] = { ...d.state };
      }
    }
    // mark token for targeted anims
    set((state) => {
      const next = { ...state._animTokens };
      for (const id of targeted) { next[`${id}:brightness`] = token; next[`${id}:colorTempK`] = token; }
      return { _animTokens: next } as any;
    });
    // perform animations with delays
    const runStep = (devId: string, st: TimelineStep, idx: number) => {
      const delay = (st.delayMs ?? 0) + idx * 110; // stagger
      setTimeout(() => {
        if (typeof st.on === 'boolean') get().updateState(devId, { on: st.on });
        if (typeof st.brightness === 'number') animateProperty({ id: devId, prop: 'brightness', to: st.brightness, duration: st.durationMs, easing: st.easing, token });
        if (typeof st.colorTempK === 'number') animateProperty({ id: devId, prop: 'colorTempK', to: st.colorTempK, duration: st.durationMs, easing: st.easing, token });
      }, delay);
    };
    let i = 0;
    for (const s of scene.steps) {
      const targets = resolveTargets(s.selector, devices).filter((d) => (filter ? filter(d) : true));
      targets.forEach((d) => runStep(d.id, s.step, i++));
    }
    set({ _preview: { name, snapshot, token } });
  },
  cancelPreview: () => {
    const p = get()._preview;
    if (!p) return;
    // invalidate tokens and restore snapshot
    set((state) => {
      const nextTokens = { ...state._animTokens } as Record<string, number>;
      Object.keys(p.snapshot).forEach((id) => {
        nextTokens[`${id}:brightness`] = (nextTokens[`${id}:brightness`] ?? 0) + 1;
        nextTokens[`${id}:colorTempK`] = (nextTokens[`${id}:colorTempK`] ?? 0) + 1;
      });
      const restored = state.devices.map((x) => (p.snapshot[x.id] ? { ...x, state: { ...p.snapshot[x.id] } } : x));
      return { devices: restored, _preview: null, _animTokens: nextTokens } as any;
    });
  },
  applyScene: (name, filter) => {
    const p = get()._preview;
    if (p?.name === name) {
      // commit by discarding snapshot
      set({ _preview: null });
      return;
    }
    const scene = get().scenes.find((s) => s.name === name);
    if (!scene) return;
    const token = Math.floor(Math.random() * 1e9);
    const devices = get().devices;
    const targeted = new Set<string>();
    for (const step of scene.steps) {
      const targets = resolveTargets(step.selector, devices).filter((d) => (filter ? filter(d) : true));
      targets.forEach((d) => targeted.add(d.id));
    }
    set((state) => {
      const next = { ...state._animTokens };
      for (const id of targeted) { next[`${id}:brightness`] = token; next[`${id}:colorTempK`] = token; }
      return { _animTokens: next } as any;
    });
    const runStep = (devId: string, st: TimelineStep, idx: number) => {
      const delay = (st.delayMs ?? 0) + idx * 110;
      setTimeout(() => {
        if (typeof st.on === 'boolean') get().updateState(devId, { on: st.on });
        if (typeof st.brightness === 'number') animateProperty({ id: devId, prop: 'brightness', to: st.brightness, duration: st.durationMs, easing: st.easing, token });
        if (typeof st.colorTempK === 'number') animateProperty({ id: devId, prop: 'colorTempK', to: st.colorTempK, duration: st.durationMs, easing: st.easing, token });
      }, delay);
    };
    let i = 0;
    for (const s of scene.steps) {
      const targets = resolveTargets(s.selector, devices).filter((d) => (filter ? filter(d) : true));
      targets.forEach((d) => runStep(d.id, s.step, i++));
    }
  },
  // groups
  groups: loadPersisted<Group[]>(GROUPS_KEY) ?? [],
  addGroup: (g) => set(({ groups }) => ({ groups: [...groups, g] })),
  removeGroup: (id) => set(({ groups }) => ({ groups: groups.filter((g) => g.id !== id) })),
  renameGroup: (id, name) => set(({ groups }) => ({ groups: groups.map((g) => g.id === id ? { ...g, name } : g) })),
  assignToGroup: (deviceId, groupId, present) => set(({ devices }) => ({
    devices: devices.map((x) => x.id === deviceId ? { ...x, groupIds: (() => {
      const cur = new Set(x.groupIds ?? []);
      if (present) cur.add(groupId); else cur.delete(groupId);
      return Array.from(cur);
    })() } : x)
  }))
}));

// Persist scenes and groups whenever they change (client-only)
if (typeof window !== 'undefined') {
  try {
    useDevices.subscribe((s) => savePersisted(SCENES_KEY, s.scenes));
    useDevices.subscribe((s) => savePersisted(GROUPS_KEY, s.groups));
  } catch {}
}

export const useScenes = create<{
  run: (name: string) => void;
  preview: (name: string) => void;
  cancel: () => void;
  apply: (name: string) => void;
  list: () => string[];
}>(() => ({
  run: (name) => useDevices.getState().runScene(name),
  preview: (name) => useDevices.getState().previewScene(name),
  cancel: () => useDevices.getState().cancelPreview(),
  apply: (name) => useDevices.getState().applyScene(name),
  list: () => useDevices.getState().scenes.map((s) => s.name)
}));
