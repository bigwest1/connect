"use client";
import { useEffect, useMemo, useState } from "react";
import { useHouse } from "@homegraph/engine";

function pctDiff(a: number, b: number) {
  if (!b) return 0;
  return ((a - b) / b) * 100;
}

export function MetricsOverlay() {
  const { report, spec } = useHouse();
  const target = useMemo(() => {
    if (!spec) return null as null | Record<string, number>;
    const byElev = (spec as any).siding_by_elevation_ft2;
    const siding = byElev ? Number(byElev.front||0)+Number(byElev.right||0)+Number(byElev.left||0)+Number(byElev.back||0) : ((spec as any).siding_facets||[]).reduce((s: number, f: any)=> s+Number(f.area_ft2||0), 0);
    const brickObj = (spec as any).brick_facets_ft2 || {};
    const brick = typeof brickObj.total === 'number' ? Number(brickObj.total) : Object.entries(brickObj).reduce((s,[k,v])=> s + (k==='small_facets'?0:Number(v||0)),0);
    const openings = Number((spec as any).openings?.doors_ft2||0) + Number((spec as any).openings?.windows_total_ft2||0);
    const soffit = Number((spec as any).soffit?.summary?.area_ft2||0);
    const footprint = Number((spec as any).footprint?.area_ft2||0);
    return { footprint, siding, brick, openings, soffit };
  }, [spec]);
  if (!report || !target) return null;
  const items = [
    { key: 'footprint', label: 'Footprint ft²', val: report.footprint_ft2, tgt: target.footprint },
    { key: 'siding', label: 'Siding ft²', val: report.siding_ft2, tgt: target.siding },
    { key: 'brick', label: 'Brick ft²', val: report.brick_ft2, tgt: target.brick },
    { key: 'openings', label: 'Openings ft²', val: report.openings_ft2, tgt: target.openings },
    { key: 'soffit', label: 'Soffit ft²', val: report.soffit_ft2, tgt: target.soffit },
  ];
  return (
    <div className="absolute top-4 left-4 glass rounded p-3 text-xs space-y-1">
      <div className="font-semibold">Demo Metrics Overlay</div>
      {items.map((it)=> {
        const diff = pctDiff(it.val, it.tgt);
        const ok = Math.abs(diff) <= 0.5;
        return (
          <div key={it.key} className="flex items-center gap-2">
            <span className="w-28 opacity-70">{it.label}</span>
            <span>{it.val.toFixed(1)}</span>
            <span className="opacity-70">/ {it.tgt.toFixed(1)}</span>
            <span className={ok? 'text-emerald-400' : 'text-amber-400'}>{diff.toFixed(2)}%</span>
          </div>
        );
      })}
    </div>
  );
}

