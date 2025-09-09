"use client";
import { useMemo } from 'react';
import { useHouse } from '@homegraph/engine';

export function SpecBadge() {
  const { spec, specAccurate, accuracyDeltas } = useHouse() as any;
  const status = useMemo(() => {
    if (!spec) return { label: 'Spec: N/A', ok: false };
    if (specAccurate === undefined) return { label: 'Spec: Checking…', ok: false };
    const worst = accuracyDeltas ? Math.max(0, ...Object.values(accuracyDeltas as Record<string, number>) as number[]) : 0;
    return { label: specAccurate ? `Spec Accurate (${(worst*100).toFixed(2)}% max Δ)` : `Spec Mismatch (${(worst*100).toFixed(2)}% max Δ)`, ok: !!specAccurate };
  }, [spec, specAccurate, accuracyDeltas]);
  const color = status.ok ? 'bg-emerald-500' : 'bg-rose-500';
  return (
    <div className={`absolute top-4 right-4 ${color} text-black/90 rounded px-3 py-1 text-xs shadow`}>{status.label}</div>
  );
}
