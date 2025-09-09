"use client";
import { useEffect, useState } from "react";
import { Switch } from "../ui/switch";
import { useDevices } from "@homegraph/devices";
import { SceneButtons } from "../ui/scene-buttons";
import Link from "next/link";
import { useDayNight } from "@homegraph/engine";
import { useQuality } from "@homegraph/engine/src/client";
import { openSimulator } from "../drawer/SimulatorDrawer";
import { openSceneEditor } from "../drawer/SceneEditorDrawer";
import { openGroupManager } from "../drawer/GroupManagerDrawer";
import { Slider } from "../ui/slider";
import { getClientRole, type Role } from "../../lib/auth";
import { emitToast } from "../ui/Toaster";

type Props = {
  dayState: [number, (v: number) => void];
  onPerfChange: (tier: "Ultra" | "High" | "Balanced" | "Battery") => void;
  perf: "Ultra" | "High" | "Balanced" | "Battery";
  geo: { lat: number; lon: number };
  onGeoChange: (g: { lat: number; lon: number }) => void;
  useWebGPU?: boolean;
  onWebGPUChange?: (v: boolean) => void;
};

export function DeviceRail({ dayState, onPerfChange, perf, geo, onGeoChange, useWebGPU, onWebGPUChange }: Props) {
  const devices = useDevices((s) => s.devices);
  const quality = (() => { try { return useQuality(); } catch { return null; } })();
  const [day, setDay] = dayState; // retained for EngineScene prop compat
  const { hour, setHour, bindLocalTime, setBindLocalTime, dawn, dusk, dayFraction } = useDayNight();
  const [role, setRole] = useState<Role>('GUEST');
  // Keep legacy dayState in sync with provider for EngineScene prop
  useEffect(() => setDay(dayFraction), [dayFraction, setDay]);
  useEffect(() => { setRole(getClientRole()); }, []);

  const label = new Date(0, 0, 0, Math.floor(hour), Math.floor((hour % 1) * 60)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="text-sm">
      <div className="text-3xl font-semibold tracking-tight">19:16</div>
      <div className="opacity-70">Wednesday</div>
      <div className="h-px bg-white/10 my-4" />
      <nav className="space-y-1 mb-3">
        <Link href="/" className="block glass rounded px-2 py-1 hover:bg-white/10 focus-ring">Home</Link>
        <Link href="/scan" className="block glass rounded px-2 py-1 hover:bg-white/10 focus-ring">Scan</Link>
      </nav>

      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider opacity-60">Location</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="glass rounded px-2 py-1 text-xs" type="number" step="0.0001" value={geo.lat} onChange={(e) => onGeoChange({ ...geo, lat: parseFloat(e.target.value) })} aria-label="Latitude" placeholder="Lat" />
          <input className="glass rounded px-2 py-1 text-xs" type="number" step="0.0001" value={geo.lon} onChange={(e) => onGeoChange({ ...geo, lon: parseFloat(e.target.value) })} aria-label="Longitude" placeholder="Lon" />
        </div>
        <button
          className="glass rounded px-2 py-1 text-xs hover:bg-white/10 focus-ring"
          onClick={() => {
            if (!navigator.geolocation) return alert('Geolocation unavailable');
            navigator.geolocation.getCurrentPosition(
              (pos) => onGeoChange({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
              () => alert('Permission denied to access location')
            );
          }}
        >Use my position</button>
        <div className="text-[11px] opacity-60">Used for civil dusk/dawn calculations.</div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider opacity-60">Day / Night</h3>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs opacity-70">Local time</div>
          <Switch checked={bindLocalTime} onCheckedChange={setBindLocalTime} />
        </div>
        <div>
          <Slider min={0} max={24} step={0.25} value={hour} onValueChange={setHour} ariaLabel="Local time" />
          <div className="text-xs opacity-60 mt-1">{label} • dawn {dawn.toFixed(1)}h • dusk {dusk.toFixed(1)}h</div>
        </div>
      </div>

      <div className="h-px bg-white/10 my-4" />

      <div className="space-y-3" id="scenes-section" tabIndex={-1}>
        <h3 className="text-xs uppercase tracking-wider opacity-60">Scenes</h3>
        <SceneButtons perf={perf} onPerfChange={onPerfChange} />
      </div>

      <div className="h-px bg-white/10 my-4" />

      <div id="lights-section" tabIndex={-1}>
        <h3 className="text-xs uppercase tracking-wider opacity-60 mb-2">Lights</h3>
        <div role="list" aria-label="Lights">
        {devices.slice(0, 4).map((d) => (
          <div key={d.id} className="flex items-center justify-between py-2" role="listitem" aria-label={d.name}>
            <div className="opacity-80">{d.name}</div>
            <Switch checked={d.state.on} onCheckedChange={d.actions.toggle} />
          </div>
        ))}
        </div>
      </div>

      <div className="h-px bg-white/10 my-4" />

      <div className="space-y-1">
        <h3 className="text-xs uppercase tracking-wider opacity-60">Performance Mode</h3>
        <div className="grid grid-cols-2 gap-2">
          {["Ultra", "High", "Balanced", "Battery"].map((p) => (
            <button
              key={p}
              className={`rounded px-2 py-1 text-left focus-ring ${perf === p ? "bg-sky-500" : "glass hover:bg-white/10"}`}
              onClick={() => onPerfChange(p as any)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="text-[11px] opacity-70 mt-2">FPS (median): {quality?.fpsMedian.toFixed(0) ?? '—'}</div>
        <label className="flex items-center justify-between text-[11px] mt-1">
          <span>Force KTX2 textures</span>
          <Switch checked={!!quality?.forceKTX2} onCheckedChange={(v)=> quality?.setForceKTX2(v)} />
        </label>
        <label className="flex items-center justify-between text-[11px] mt-1">
          <span>WebGPU (experimental)</span>
          <Switch checked={!!useWebGPU} onCheckedChange={(v)=> onWebGPUChange?.(v)} />
        </label>
      </div>

      <div className="h-px bg-white/10 my-4" />

      <div className="space-y-1">
        <h3 className="text-xs uppercase tracking-wider opacity-60">Tools</h3>
        <button className="glass rounded px-2 py-1 text-left hover:bg-white/10 focus-ring" onClick={() => openSimulator()}>Open 24h Simulator</button>
        <button className="glass rounded px-2 py-1 text-left hover:bg-white/10 focus-ring" onClick={() => openSceneEditor()}>Open Scene Editor</button>
        <button className="glass rounded px-2 py-1 text-left hover:bg-white/10 focus-ring" onClick={() => openGroupManager()}>Open Group Manager</button>
        <div className="h-px bg-white/10 my-2" />
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider opacity-60">Role (demo)</div>
          <select
            className="glass rounded px-2 py-1 text-xs"
            aria-label="Role"
            value={role}
            onChange={(e)=> {
              const val = e.target.value as Role;
              setRole(val);
              try { document.cookie = `role=${val}; path=/; max-age=31536000`; } catch {}
              emitToast(`Role set to ${val}`);
            }}
          >
            {['OWNER','FAMILY','INSTALLER','GUEST'].map((r)=> <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
