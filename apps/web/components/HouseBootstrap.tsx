"use client";
import { useEffect } from "react";
import { useHouse } from "@homegraph/engine";
import type { HouseSpec } from "@homegraph/shared";
import { HouseSpecSchema } from "../lib/specSchema";
import { idbGet } from "../lib/idb";

function getOrigin() {
  try { return window.location.origin; } catch { return ""; }
}

export function HouseBootstrap() {
  const { setMetrics, setSpec, setOpeningsLayout } = useHouse() as any;

  useEffect(() => {
    (async () => {
      try {
        // 1) Try server-stored metrics
        const res = await fetch(`/api/house`, { credentials: 'same-origin' });
        let data: any = {};
        try { data = await res.json(); } catch {}

        // If server already has a non-empty footprint, apply it and stop
        if (data && data.footprint && typeof data.footprint.area_ft2 === 'number' && data.footprint.area_ft2 > 0) {
          setMetrics({ stories: Number(data.stories || 2), footprint: { area_ft2: Number(data.footprint.area_ft2), perimeter_ft: Number(data.footprint.perimeter_ft || 0) } });
          setSpec?.(data as any);
          return;
        }

        // 2) Otherwise, load canonical spec from public docs (prefer full, then fallback)
        const base = getOrigin();
        const urls = [`${base}/docs/metrics.full.json`, `${base}/docs/metrics.json`];
        let spec: HouseSpec | null = null;
        for (const u of urls) {
          try {
            const r = await fetch(u, { cache: 'force-cache', credentials: 'omit' });
            if (r.ok) {
              const json = await r.json();
              const parsed = HouseSpecSchema.safeParse(json);
              if (parsed.success) { spec = parsed.data; break; }
            }
          } catch {}
        }
        if (!spec) return;

        // Set exact values (no smoothing/inference). Engine expects feet/in² units; converts at runtime where needed.
        setMetrics({ stories: spec.stories, footprint: { area_ft2: spec.footprint.area_ft2, perimeter_ft: spec.footprint.perimeter_ft } });
        setSpec?.(spec);
        try { const savedLayout = await idbGet<Record<string, {x:number,y:number}[]>>('openings:layout'); if (savedLayout) setOpeningsLayout?.(savedLayout); } catch {}

        // Best-effort: persist to server for subsequent loads
        try { await fetch(`/api/house`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(spec) }); } catch {}
      } catch {}
    })();
  }, [setMetrics]);

  return null;
}
