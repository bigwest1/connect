"use client";
import { House } from "../parametric/house";
import { useDevices } from "@homegraph/devices";
import { useEffect, useMemo } from "react";
import { EffectComposer, Bloom, SMAA, FXAA } from "@react-three/postprocessing";
import { useDayNight } from "../daynight";
import { useHouse } from "../state/house";
import { useQuality } from "../quality/context";
import { KernelSize } from "postprocessing";

type Tier = "Ultra" | "High" | "Balanced" | "Battery";

export function EngineScene({ dayState, perf }: { dayState: [number, (v: number) => void]; perf: { tier: Tier } }) {
  const devices = useDevices((s) => s.devices);
  const ctx = (() => { try { return useDayNight(); } catch { return null; } })();
  const [day] = dayState ?? [ctx?.dayFraction ?? 0.5, () => {}];
  const quality = (() => { try { return useQuality(); } catch { return null; } })();
  let metrics = { stories: 2, footprint: { perimeter_ft: 232.4167, area_ft2: 2261 } };
  try {
    const h = useHouse();
    metrics = h.metrics as any;
  } catch {}

  const [ambient, sun] = useMemo(() => {
    // simple day-night: lerp intensities
    const amb = 0.2 + (1 - day) * 0.05;
    const dir = 0.8 * day + 0.1;
    return [amb, dir];
  }, [day]);

  const bloomCfg = quality?.settings.bloom;
  const bloomIntensity = (bloomCfg?.intensity ?? (perf.tier === "Ultra" ? 1.2 : perf.tier === "High" ? 0.9 : perf.tier === "Balanced" ? 0.6 : 0.3));
  const bloomThreshold = bloomCfg?.threshold ?? 0.22;
  const bloomKernel = (() => {
    const k = bloomCfg?.kernel ?? 'MEDIUM';
    return KernelSize[k as keyof typeof KernelSize] ?? KernelSize.MEDIUM;
  })();

  useEffect(() => {
    if (!quality) return;
    try {
      const ratio = Math.max(0.5, Math.min(1.0, quality.settings.pixelRatio));
      const dpr = (window.devicePixelRatio || 1) * ratio;
      const gl = (document.querySelector('canvas') as any)?.__r3f?.root?.getState?.().gl as any;
      if (gl && typeof gl.setPixelRatio === 'function') gl.setPixelRatio(dpr);
    } catch {}
  }, [quality?.settings.pixelRatio]);

  return (
    <group>
      <ambientLight intensity={ambient} />
      <directionalLight position={[5, 8, 2]} intensity={sun} castShadow shadow-mapSize={quality?.settings.shadowMapSize ?? (perf.tier === "Ultra" ? 4096 : perf.tier === "High" ? 2048 : 1024)} />

      <House metrics={metrics} position={[0, 1.2, 0]} tier={perf.tier} />

      {/* emissive lights driven by devices */}
      {devices.map((d, i) => (
        <mesh key={d.id} position={[-1 + i * 0.3, 0.1, 1]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            emissive={d.state.on ? (d.state.colorRGB ?? "#ffd7a8") : "#111"}
            emissiveIntensity={d.state.on ? ((d.state.brightness ?? 0.6) + 0.2) * (1.1 + (1 - day)) : 0.05}
            color="#333"
          />
        </mesh>
      ))}

      <EffectComposer multisampling={perf.tier === "Battery" ? 0 : 2} enabled>
        <FXAA enabled={perf.tier === 'Balanced'} />
        <SMAA enabled={perf.tier === 'Ultra' || perf.tier === 'High'} />
        <Bloom intensity={bloomIntensity * (1 + (1 - day) * 0.5)} luminanceThreshold={bloomThreshold} kernelSize={bloomKernel} mipmapBlur />
      </EffectComposer>
    </group>
  );
}
