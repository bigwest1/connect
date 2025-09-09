"use client";
import { useDevices, computeNextRun } from "@homegraph/devices";

export function PinsOverlay() {
  const devices = useDevices((s) => s.devices);
  return (
    <div className="pointer-events-none absolute inset-0" role="list" aria-label="Device pins">
      {devices.slice(0, 8).map((d) => (
        <button
          key={d.id}
          className="pointer-events-auto absolute glass rounded-full w-8 h-8 flex items-center justify-center text-xs"
          style={{ left: `${10 + (d.position?.[0] ?? 0) * 40}%`, top: `${10 + (d.position?.[1] ?? 0) * 30}%` }}
          role="listitem"
          aria-label={`Select ${d.name}`}
          onClick={() => d.actions.select()}
        >
          {d.icon}
          {Array.isArray((d.state as any)?.schedules) && (d.state as any).schedules.length > 0 ? (
            <span className="absolute -bottom-2 -right-2 text-[9px] px-1 py-0.5 rounded glass">
              {(() => {
                try {
                  const nexts = ((d.state as any).schedules as any[])
                    .map((r) => computeNextRun(r as any))
                    .filter(Boolean) as Date[];
                  if (nexts.length === 0) return "";
                  const t = new Date(Math.min(...nexts.map((x) => +x)));
                  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch { return ""; }
              })()}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
