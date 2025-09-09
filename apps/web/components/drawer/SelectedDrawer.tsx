"use client";
import { useEffect, useMemo, useState } from "react";
import { useDevices, scheduleRule, type ScheduleRule, computeNextRun } from "@homegraph/devices";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { getClientRole, type Role } from "../../lib/auth";

export function SelectedDrawer({ geo }: { geo?: { lat: number; lon: number } }) {
  const selectedId = useDevices((s) => s.selectedId);
  const device = useDevices((s) => s.devices.find((d) => d.id === s.selectedId));
  const setSelected = useDevices((s) => s.setSelected);
  const updateState = useDevices((s) => s.updateState);
  const setSchedules = useDevices((s) => s.setSchedules);
  const applyAction = useDevices((s) => s.applyAction);
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('GUEST');
  const canEditSchedules = role === 'OWNER' || role === 'FAMILY' || role === 'INSTALLER';

  useEffect(() => { setRole(getClientRole()); }, []);

  useEffect(() => {
    if (!device) return;
    setLoading(true);
    fetch(`/api/schedules/${device.id}`)
      .then((r) => r.json())
      .then((j) => setRules(j as ScheduleRule[]))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, [device?.id]);

  useEffect(() => {
    if (!device) return;
    setSchedules(device.id, rules);
  }, [device?.id, rules, setSchedules]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelected]);

  if (!device || !selectedId) return null;
  const s = device.state as any;

  async function save() {
    setError(null);
    if (!device) return;
    try {
      const parsed = rules.map((r) => scheduleRule.parse(r));
      await fetch(`/api/schedules/${device.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed) });
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  return (
    <div className="absolute right-0 top-0 h-full w-[360px] glass p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby={`drawer-title-${device.id}`} tabIndex={-1}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" id={`drawer-title-${device.id}`}>{device.name}</div>
        <button className="text-xs underline opacity-70" onClick={() => setSelected(null)} autoFocus>Close</button>
      </div>

      {/* Controls based on capabilities */}
      {device.capabilities.includes('onOff') && (
        <div className="flex items-center justify-between py-2">
          <div>Power</div>
          <Switch checked={!!s.on} onCheckedChange={(v) => updateState(device.id, { on: v })} />
        </div>
      )}
      {device.capabilities.includes('brightness') && (
        <div className="py-2">
          <div className="text-sm">Brightness</div>
          <Slider min={0} max={1} step={0.01} value={s.brightness ?? 0} onValueChange={(v) => updateState(device.id, { brightness: v })} ariaLabel="Brightness" />
        </div>
      )}
      {device.capabilities.includes('color') && (
        <div className="py-2">
          <div className="text-sm">Color</div>
          <input type="color" value={(s.colorRGB ?? '#ffd7a8').replace(/^#?/, '#')} onChange={(e)=> updateState(device.id, { colorRGB: e.target.value })} />
        </div>
      )}
      {device.capabilities.includes('tempSetpoint') && (
        <div className="py-2">
          <div className="text-sm">Temperature {s.tempSetpoint ?? 72}°F</div>
          <input type="range" min={50} max={85} value={s.tempSetpoint ?? 72} onChange={(e)=> updateState(device.id, { tempSetpoint: Number(e.target.value) })} />
        </div>
      )}
      {device.capabilities.includes('openClose') && (
        <div className="py-2">
          <div className="text-sm">Open {Math.round((s.open ?? 0) * 100)}%</div>
          <input type="range" min={0} max={1} step={0.01} value={s.open ?? 0} onChange={(e)=> updateState(device.id, { open: Number(e.target.value) })} />
        </div>
      )}
      {device.capabilities.includes('sprinkle') && (
        <div className="py-2">
          <div className="text-sm">Sprinkler {Math.round((s.sprinkle ?? 0) * 100)}%</div>
          <input type="range" min={0} max={1} step={0.01} value={s.sprinkle ?? 0} onChange={(e)=> updateState(device.id, { sprinkle: Number(e.target.value) })} />
        </div>
      )}
      {device.capabilities.includes('panTilt') && (
        <div className="py-2">
          <div className="text-sm">Pan / Tilt</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">Pan
              <input type="range" min={-1} max={1} step={0.01} value={s.pan ?? 0} onChange={(e)=> updateState(device.id, { pan: Number(e.target.value) })} />
            </label>
            <label className="text-xs">Tilt
              <input type="range" min={-1} max={1} step={0.01} value={s.tilt ?? 0} onChange={(e)=> updateState(device.id, { tilt: Number(e.target.value) })} />
            </label>
          </div>
        </div>
      )}

      <div className="h-px bg-white/10 my-3" />

      {/* Schedule builder */}
      <div className="space-y-2">
        <div className="font-semibold">Schedules</div>
        {loading ? <div className="text-xs opacity-70">Loading…</div> : null}
        {rules.map((r, i) => (
          <div key={r.id ?? i} className="glass rounded p-2">
            <div className="flex items-center justify-between">
              <input className="glass rounded px-2 py-1 text-sm" placeholder="Name" value={r.name ?? ''} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, name: e.target.value }: x))} />
              <label className="text-xs flex items-center gap-2">
                Enabled <input type="checkbox" checked={r.enabled ?? true} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, enabled: e.target.checked }: x))} />
              </label>
            </div>
            <div className="text-[11px] opacity-70 mt-1">
              Next run: {(() => { const dt = computeNextRun(r, { lat: geo?.lat, lon: geo?.lon }); return dt ? dt.toLocaleString() : '—'; })()}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <select value={r.when.type} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? (e.target.value==='cron'? { ...x, when: { type:'cron', cron: '0 18 * * *' } as any } : { ...x, when: { type:'sun', event:'sunset', offsetMin:0 } as any }): x))}>
                <option value="cron">Cron</option>
                <option value="sun">Sunrise/Sunset</option>
              </select>
              {r.when.type === 'cron' ? (
                <input className="glass rounded px-2 py-1" value={r.when.cron} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, when: { type:'cron', cron: e.target.value } as any }: x))} placeholder="m h dom mon dow" />
              ) : (
                <div className="flex items-center gap-2">
                  <select value={r.when.event} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, when: { type:'sun', event: e.target.value as any, offsetMin: r.when.type==='sun'? r.when.offsetMin: 0 } as any }: x))}>
                    <option value="sunrise">Sunrise</option>
                    <option value="sunset">Sunset</option>
                  </select>
                  <input type="number" className="glass rounded px-2 py-1 w-24" value={(r.when.type==='sun'? r.when.offsetMin: 0)} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, when: { type:'sun', event:(x.when as any).event, offsetMin: Number(e.target.value) } as any }: x))} placeholder="offset min" />
                </div>
              )}
            </div>
            <div className="mt-2 text-xs grid grid-cols-2 gap-2">
              <label>On<input type="checkbox" checked={!!r.action.on} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, action: { ...x.action, on: e.target.checked } }: x))} /></label>
              <label>Brightness<input type="number" step={0.01} min={0} max={1} className="glass rounded px-2 py-1" value={r.action.brightness ?? '' as any} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, action: { ...x.action, brightness: e.target.value===''? undefined: Number(e.target.value) } }: x))} /></label>
              <label>Color<input type="color" value={(r.action.colorRGB ?? '#ffffff').replace(/^#?/, '#')} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, action: { ...x.action, colorRGB: e.target.value } }: x))} /></label>
              <label>Temp<input type="number" min={50} max={85} className="glass rounded px-2 py-1" value={r.action.tempSetpoint ?? '' as any} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, action: { ...x.action, tempSetpoint: e.target.value===''? undefined: Number(e.target.value) } }: x))} /></label>
              <label>Open%<input type="number" step={0.01} min={0} max={1} className="glass rounded px-2 py-1" value={r.action.open ?? '' as any} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, action: { ...x.action, open: e.target.value===''? undefined: Number(e.target.value) } }: x))} /></label>
              <label>Sprinkle%<input type="number" step={0.01} min={0} max={1} className="glass rounded px-2 py-1" value={r.action.sprinkle ?? '' as any} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, action: { ...x.action, sprinkle: e.target.value===''? undefined: Number(e.target.value) } }: x))} /></label>
              <label className="col-span-2">Scene
                <input className="glass rounded px-2 py-1 w-full" placeholder="Evening / Away / Movie / Clean Up / All Off" value={r.action.scene ?? ''} onChange={(e)=> setRules(rules.map((x,idx)=> idx===i? { ...x, action: { ...x.action, scene: e.target.value || undefined } }: x))} />
              </label>
            </div>
            <div className="pt-2 text-right">
              <button className="glass rounded px-2 py-1 text-xs mr-2" onClick={() => applyAction(device.id, r.action as any)}>Run Now</button>
              <button className="text-xs underline opacity-70" onClick={() => setRules(rules.filter((_,idx)=> idx!==i))}>Remove</button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button className="glass rounded px-3 py-2 focus-ring disabled:opacity-50" disabled={!canEditSchedules} onClick={() => setRules([...rules, { enabled: true, when: { type:'sun', event:'sunset', offsetMin:0 }, action: { on: true } } as ScheduleRule])}>Add Rule</button>
          <button className="glass rounded px-3 py-2 focus-ring disabled:opacity-50" disabled={!canEditSchedules} onClick={save}>Save</button>
        </div>
        {error ? <div className="text-red-400 text-xs">{error}</div> : null}
      </div>
    </div>
  );
}
