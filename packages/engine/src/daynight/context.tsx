"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { civilDawnDusk } from "./suncalc";

type DayNightState = {
  hour: number; // 0..24
  setHour: (h: number) => void;
  bindLocalTime: boolean;
  setBindLocalTime: (b: boolean) => void;
  dawn: number;
  dusk: number;
  dayFraction: number; // 0..1 between dawn and dusk
  afterDusk: boolean;
};

const Ctx = createContext<DayNightState | null>(null);

const LS_KEY = "homegraph.daynight";

export function DayNightProvider({ children, lat, lon }: { children: React.ReactNode; lat?: number; lon?: number }) {
  const now = new Date();
  const initPrefs = (() => {
    if (typeof window === "undefined") return { hour: now.getHours() + now.getMinutes() / 60, bindLocalTime: true };
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) throw 0;
      const p = JSON.parse(raw);
      return { hour: typeof p.hour === "number" ? p.hour : 18, bindLocalTime: !!p.bindLocalTime };
    } catch {
      return { hour: now.getHours() + now.getMinutes() / 60, bindLocalTime: true };
    }
  })();

  const [hour, setHour] = useState(initPrefs.hour);
  const [bindLocalTime, setBindLocalTime] = useState<boolean>(initPrefs.bindLocalTime);
  const { dawn, dusk } = useMemo(() => civilDawnDusk(new Date(), lat, lon), [lat, lon]);

  const dayFraction = useMemo(() => {
    // Map hour into [0,1] clamped between dawn and dusk; outside returns 0
    const span = (dusk - dawn + 24) % 24 || 24; // handle midnight wrap
    let h = hour;
    let t: number;
    if (dawn < dusk) {
      t = (h - dawn) / (dusk - dawn);
    } else {
      // dawn in the evening, dusk after midnight (rare), approximate
      t = (h >= dawn ? h - dawn : h + (24 - dawn)) / ((24 - dawn) + dusk);
    }
    return Math.max(0, Math.min(1, t));
  }, [hour, dawn, dusk]);

  const afterDusk = useMemo(() => {
    if (dawn < dusk) return hour >= dusk || hour < dawn;
    return hour >= dusk && hour < dawn; // wrap case
  }, [hour, dawn, dusk]);

  // Persist prefs
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, JSON.stringify({ hour, bindLocalTime }));
  }, [hour, bindLocalTime]);

  // Local time binding tick
  useEffect(() => {
    if (!bindLocalTime) return;
    const id = setInterval(() => {
      const n = new Date();
      setHour(n.getHours() + n.getMinutes() / 60);
    }, 30_000);
    const n = new Date();
    setHour(n.getHours() + n.getMinutes() / 60); // update immediately
    return () => clearInterval(id);
  }, [bindLocalTime]);

  // Emit auto-on event when crossing dusk
  const lastAfter = useRef<boolean>(afterDusk);
  useEffect(() => {
    if (afterDusk && !lastAfter.current && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("evening:autoOn", { detail: { hour } }));
    }
    lastAfter.current = afterDusk;
  }, [afterDusk, hour]);

  const value = useMemo<DayNightState>(() => ({
    hour,
    setHour: (h) => setHour(((h % 24) + 24) % 24),
    bindLocalTime,
    setBindLocalTime,
    dawn,
    dusk,
    dayFraction,
    afterDusk
  }), [hour, bindLocalTime, dawn, dusk, dayFraction, afterDusk]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDayNight() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDayNight must be used within DayNightProvider");
  return ctx;
}

export function useEveningAutoOn(handler: (detail: { hour: number }) => void) {
  useEffect(() => {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener("evening:autoOn", listener);
    return () => window.removeEventListener("evening:autoOn", listener);
  }, [handler]);
}

