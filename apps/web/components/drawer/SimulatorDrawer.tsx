"use client";
import { useEffect, useMemo, useState } from "react";
import { useDevices, type ScheduleRule, computeNextRun } from "@homegraph/devices";

type SimEvent = { at: Date; deviceId: string; action: any; label: string };

export function openSimulator() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('simulator:open'));
}

export function SimulatorDrawer({ geo }: { geo?: { lat: number; lon: number } }) {
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState(60); // 60x realtime (1s = 1min)
  const [playing, setPlaying] = useState(false);
  const [simTime, setSimTime] = useState<Date>(new Date());
  const devices = useDevices((s) => s.devices);
  const applyAction = useDevices((s) => s.applyAction);
  const updateState = useDevices((s) => s.updateState);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('simulator:open', onOpen);
    return () => window.removeEventListener('simulator:open', onOpen);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const timeline: SimEvent[] = useMemo(() => {
    const start = simTime;
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const events: SimEvent[] = [];
    for (const d of devices) {
      const sched = (d.state as any)?.schedules as ScheduleRule[] | undefined;
      if (!Array.isArray(sched)) continue;
      for (const r of sched) {
        let cursor = start;
        for (let i = 0; i < 200; i++) {
          const next = computeNextRun(r, { now: cursor, lat: geo?.lat, lon: geo?.lon });
          if (!next || next > end) break;
          events.push({ at: next, deviceId: d.id, action: r.action, label: r.name ?? d.name });
          cursor = new Date(next.getTime() + 60000);
        }
      }
    }
    return events.sort((a, b) => +a.at - +b.at);
  }, [devices, simTime, geo?.lat, geo?.lon]);

  useEffect(() => {
    if (!open || !playing) return;
    let last = performance.now();
    let simMs = simTime.getTime();
    let index = 0;
    const tick = (now: number) => {
      const dt = now - last; last = now;
      simMs += dt * speed; const simDate = new Date(simMs);
      setSimTime(simDate);
      while (index < timeline.length && +timeline[index].at <= simMs) {
        const ev = timeline[index];
        applyAction(ev.deviceId, ev.action);
        index++;
      }
      id = requestAnimationFrame(tick);
    };
    let id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [open, playing, speed, timeline, applyAction]);

  async function rewind() {
    setSimTime(new Date());
    // restore from DB snapshot
    try {
      const res = await fetch('/api/devices/state');
      const all = await res.json();
      devices.forEach((d) => { if (all[d.id]) updateState(d.id, all[d.id]); });
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-[420px] glass p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="sim-title" tabIndex={-1}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" id="sim-title">24h Simulator</div>
        <button className="text-xs underline opacity-70" onClick={() => setOpen(false)} autoFocus>Close</button>
      </div>

      <div className="text-xs opacity-70">Simulated start: {new Date().toLocaleString()}</div>
      <div className="text-sm mt-2">Sim time: {simTime.toLocaleString()}</div>
      <div className="flex items-center gap-2 mt-2">
        <button className="glass rounded px-2 py-1" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <button className="glass rounded px-2 py-1" onClick={rewind}>Rewind</button>
        <label className="text-xs">Speed
          <input type="range" min={1} max={600} value={speed} onChange={(e)=> setSpeed(Number(e.target.value))} />
        </label>
      </div>

      <div className="h-px bg-white/10 my-3" />
      <div className="text-xs opacity-70 mb-1">Timeline ({timeline.length})</div>
      <div className="space-y-1 text-xs max-h-[60vh] overflow-y-auto">
        {timeline.map((e, idx) => (
          <div key={idx} className="glass rounded px-2 py-1 flex items-center justify-between">
            <div>{e.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {e.label}</div>
            <div className="opacity-70">{Object.keys(e.action).join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
