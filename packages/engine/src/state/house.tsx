"use client";
import { createContext, useContext, useMemo, useState } from "react";
import type { HouseSpec } from "@homegraph/shared";

export type HouseMetrics = {
  stories: number;
  footprint: { perimeter_ft: number; area_ft2: number };
};

const DEFAULT_METRICS: HouseMetrics = {
  stories: 2,
  footprint: { perimeter_ft: 232.4167, area_ft2: 2261 }
};

export type HouseReport = {
  footprint_ft2: number;
  siding_ft2: number;
  brick_ft2: number;
  openings_ft2: number;
  soffit_ft2: number;
};
export type OpeningPos = { x: number; y: number };
export type OpeningsLayout = Record<string, OpeningPos[]>; // facetId => list of positions (normalized -1..1 local)

type Ctx = {
  metrics: HouseMetrics;
  setMetrics: (m: HouseMetrics) => void;
  spec?: HouseSpec | null;
  setSpec?: (s: HouseSpec | null) => void;
  report?: HouseReport | null;
  setReport?: (r: HouseReport | null) => void;
  specAccurate?: boolean;
  setSpecAccurate?: (v: boolean) => void;
  accuracyDeltas?: Record<string, number> | null;
  setAccuracyDeltas?: (d: Record<string, number> | null) => void;
  openingsLayout?: OpeningsLayout | null;
  setOpeningsLayout?: (l: OpeningsLayout | null) => void;
  measuredEdges?: { eaves: number; ridges: number; hips: number; valleys: number } | null;
  setMeasuredEdges?: (e: { eaves: number; ridges: number; hips: number; valleys: number } | null) => void;
  inspectOverlay?: boolean;
  setInspectOverlay?: (v: boolean) => void;
};

const HouseCtx = createContext<Ctx | null>(null);

export function HouseProvider({ children, initial }: { children: React.ReactNode; initial?: HouseMetrics }) {
  const [metrics, setMetrics] = useState<HouseMetrics>(initial ?? DEFAULT_METRICS);
  const [spec, setSpec] = useState<HouseSpec | null>(null);
  const [report, setReport] = useState<HouseReport | null>(null);
  const [specAccurate, setSpecAccurate] = useState<boolean | undefined>(undefined);
  const [accuracyDeltas, setAccuracyDeltas] = useState<Record<string, number> | null>(null);
  const [openingsLayout, setOpeningsLayout] = useState<OpeningsLayout | null>(null);
  const [measuredEdges, setMeasuredEdges] = useState<{ eaves: number; ridges: number; hips: number; valleys: number } | null>(null);
  const [inspectOverlay, setInspectOverlay] = useState<boolean>(false);
  const value = useMemo(() => ({ metrics, setMetrics, spec, setSpec, report, setReport, specAccurate, setSpecAccurate, accuracyDeltas, setAccuracyDeltas, openingsLayout, setOpeningsLayout, measuredEdges, setMeasuredEdges, inspectOverlay, setInspectOverlay }), [metrics, spec, report, specAccurate, accuracyDeltas, openingsLayout, measuredEdges, inspectOverlay]);
  return <HouseCtx.Provider value={value}>{children}</HouseCtx.Provider>;
}

export function useHouse() {
  const ctx = useContext(HouseCtx);
  if (!ctx) throw new Error("useHouse must be used within HouseProvider");
  return ctx;
}
