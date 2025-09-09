"use client";
import { useEffect, useMemo, useState } from 'react';
import { useDevices } from '@homegraph/devices';
import { useHouse } from '@homegraph/engine';

type Disc = { id: string; name: string; type: string };
type Assignment = { type: string; facade: 'front'|'right'|'back'|'left'; u: number; h: number };

export function DiscoverDrawer({ onClose }: { onClose?: () => void }) {
  const [list, setList] = useState<Disc[]>([]);
  const [assign, setAssign] = useState<Record<string, Assignment>>({});
  const addDevice = useDevices((s) => s.addDevice);
  const { metrics } = useHouse();

  useEffect(() => {
    fetch('/api/discover').then(r => r.json()).then(j => setList(j.devices || [])).catch(() => setList([]));
  }, []);

  const dims = useMemo(() => {
    const s = metrics.footprint.perimeter_ft/2;
    const disc = s*s - 4*metrics.footprint.area_ft2;
    const w = (s + Math.sqrt(Math.max(0, disc))) / 2;
    const d = s - w; return { w, d };
  }, [metrics]);

  function assignAll() {
    list.forEach((dev) => {
      const a = assign[dev.id];
      if (!a) return;
      const caps: Record<string, string[]> = {
        light: ['onOff','brightness','color'], lock: ['onOff'], garageDoor: ['openClose'], camera: ['panTilt','onOff'], outlet: ['onOff']
      };
      const state: Record<string, any> = { on: false };
      if (a.type === 'light') state.brightness = 0.6;
      if (a.type === 'camera') { state.on = true; state.pan = 0; state.tilt = 0; }
      const margin = 0.5; // ft from edges
      const xft = (a.u * (dims.w/2 - margin));
      const y = 0.4 + a.h * (2.6 * metrics.stories);
      const zft = (a.facade==='front'? dims.d/2 + 0.05 : a.facade==='back'? -dims.d/2 - 0.05 : 0);
      const xfac = a.facade==='right'? dims.w/2 + 0.05 : a.facade==='left'? -dims.w/2 - 0.05 : xft;
      const zfac = (a.facade==='front'||a.facade==='back')? zft : (a.facade==='right'? (a.u * (dims.d/2 - margin)) : -(a.u * (dims.d/2 - margin)));
      addDevice({
        id: dev.id,
        name: dev.name,
        type: a.type as any,
        capabilities: (caps[a.type] || ['onOff']) as any,
        state,
        position: [0.5 + a.u*0.4, a.facade==='back'? 0.75 : 0.25 + 0.1*a.h],
        position3D: [xfac*0.3048, y, zfac*0.3048]
      } as any);
    });
    onClose?.();
  }

  return (
    <div className="absolute right-0 top-0 h-full w-[420px] glass p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Discover & Assign Devices</div>
        <button className="text-xs underline opacity-70" onClick={onClose}>Close</button>
      </div>
      <div className="space-y-2">
        {list.map((d) => (
          <div key={d.id} className="glass rounded p-2">
            <div className="font-medium text-sm">{d.name}</div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-1">
              <label>Type
                <select className="glass rounded px-2 py-1 w-full" value={assign[d.id]?.type ?? d.type} onChange={(e)=> setAssign({ ...assign, [d.id]: { ...(assign[d.id]||{ facade:'front', u:0, h:0.5 }), type: e.target.value as any } })}>
                  {['light','lock','garageDoor','camera','outlet'].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label>Facade
                <select className="glass rounded px-2 py-1 w-full" value={assign[d.id]?.facade ?? 'front'} onChange={(e)=> setAssign({ ...assign, [d.id]: { ...(assign[d.id]||{ type:d.type, u:0,h:0.5 }), facade: e.target.value as any } })}>
                  {['front','right','back','left'].map(f=> <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label>X
                <input type="range" min={-1} max={1} step={0.01} value={assign[d.id]?.u ?? 0} onChange={(e)=> setAssign({ ...assign, [d.id]: { ...(assign[d.id]||{ type:d.type, facade:'front', h:0.5 }), u: Number(e.target.value) } })} />
              </label>
              <label>Height
                <input type="range" min={0} max={1} step={0.01} value={assign[d.id]?.h ?? 0.5} onChange={(e)=> setAssign({ ...assign, [d.id]: { ...(assign[d.id]||{ type:d.type, facade:'front', u:0 }), h: Number(e.target.value) } })} />
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-3 flex items-center justify-between">
        <div className="text-xs opacity-70">Devices appear immediately and are controlled by scenes.</div>
        <button className="glass rounded px-3 py-2 text-sm" onClick={assignAll}>Assign Selected</button>
      </div>
    </div>
  );
}

