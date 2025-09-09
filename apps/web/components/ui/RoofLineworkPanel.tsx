"use client";
import { useMemo } from 'react';
import { useHouse } from '@homegraph/engine';
import { Switch } from './switch';

function fmtFeetInches(ft: number) {
  const sign = ft < 0 ? '-' : '';
  const abs = Math.abs(ft);
  const feet = Math.floor(abs);
  const inches = Math.round((abs - feet) * 12);
  return `${sign}${feet}'${inches}\"`;
}

export function RoofLineworkPanel() {
  const { spec, measuredEdges, inspectOverlay, setInspectOverlay } = useHouse() as any;
  const target = useMemo(() => spec?.roof?.lengths_ft || {}, [spec]);
  if (!spec) return null;
  return (
    <div className="absolute top-16 right-4 glass rounded p-3 text-xs space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Inspect: Roof Linework</div>
        <label className="flex items-center gap-2">
          <span>Overlay</span>
          <Switch checked={!!inspectOverlay} onCheckedChange={(v)=> setInspectOverlay?.(v)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="opacity-70">Ridges</div>
        <div>{fmtFeetInches(measuredEdges?.ridges ?? 0)} / {fmtFeetInches(target.ridges || 0)}</div>
        <div className="opacity-70">Hips</div>
        <div>{fmtFeetInches(measuredEdges?.hips ?? 0)} / {fmtFeetInches(target.hips || 0)}</div>
        <div className="opacity-70">Valleys</div>
        <div>{fmtFeetInches(measuredEdges?.valleys ?? 0)} / {fmtFeetInches(target.valleys || 0)}</div>
        <div className="opacity-70">Eaves</div>
        <div>{fmtFeetInches(measuredEdges?.eaves ?? 0)} / {fmtFeetInches(target.eaves || 0)}</div>
      </div>
      <div className="opacity-60">Colors: ridges red, hips blue, valleys green, eaves amber.</div>
    </div>
  );
}

