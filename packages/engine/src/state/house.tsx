"use client";
import { createContext, useContext, useMemo, useState } from "react";

export type HouseMetrics = {
  stories: number;
  footprint: { perimeter_ft: number; area_ft2: number };
};

const DEFAULT_METRICS: HouseMetrics = {
  stories: 2,
  footprint: { perimeter_ft: 232.4167, area_ft2: 2261 }
};

type Ctx = {
  metrics: HouseMetrics;
  setMetrics: (m: HouseMetrics) => void;
};

const HouseCtx = createContext<Ctx | null>(null);

export function HouseProvider({ children, initial }: { children: React.ReactNode; initial?: HouseMetrics }) {
  const [metrics, setMetrics] = useState<HouseMetrics>(initial ?? DEFAULT_METRICS);
  const value = useMemo(() => ({ metrics, setMetrics }), [metrics]);
  return <HouseCtx.Provider value={value}>{children}</HouseCtx.Provider>;
}

export function useHouse() {
  const ctx = useContext(HouseCtx);
  if (!ctx) throw new Error("useHouse must be used within HouseProvider");
  return ctx;
}

