"use client";
import { House } from "../parametric/house";
import { DeviceMeshes } from "../devices/DeviceMeshes";
import { useDevices } from "@homegraph/devices";
import { useEffect, useMemo } from "react";
import { EffectComposer, Bloom, SMAA, FXAA, SSAO } from "@react-three/postprocessing";
import { Environment, Sky } from "@react-three/drei";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
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
      if (gl) {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.physicallyCorrectLights = true;
      }
    } catch {}
  }, [quality?.settings.pixelRatio]);

  return (
    <group>
      <ambientLight intensity={ambient} />
      <directionalLight position={[5, 8, 2]} intensity={sun} castShadow shadow-mapSize={quality?.settings.shadowMapSize ?? (perf.tier === "Ultra" ? 4096 : perf.tier === "High" ? 2048 : 1024)} />

      {/* Environment lighting */}
      <Environment preset="sunset" background={false} />
      <Sky sunPosition={[10, 15, 10]} turbidity={3} rayleigh={1} mieCoefficient={0.005} mieDirectionalG={0.8} />

      <House metrics={metrics} position={[0, 1.2, 0]} tier={perf.tier} />
      <DeviceMeshes perimeter_ft={metrics.footprint.perimeter_ft} area_ft2={metrics.footprint.area_ft2} />

      {/* devices are rendered by DeviceMeshes */}

      <EffectComposer multisampling={perf.tier === "Battery" ? 0 : 2} enabled>
        {quality?.settings.ssao.enabled ? (
          <SSAO
            samples={quality.settings.ssao.samples}
            radius={quality.settings.ssao.radius}
            intensity={quality.settings.ssao.intensity}
            resolutionScale={quality.settings.ssao.resolutionScale}
            depthAwareUpsampling
            worldDistanceThreshold={0.6}
            worldDistanceFalloff={0.1}
            worldProximityThreshold={0.2}
            worldProximityFalloff={0.1}
          />
        ) : <></>}
        {perf.tier === 'Balanced' ? <FXAA /> : <></>}
        {(perf.tier === 'Ultra' || perf.tier === 'High') ? <SMAA /> : <></>}
        <Bloom intensity={bloomIntensity * (1 + (1 - day) * 0.5)} luminanceThreshold={bloomThreshold} kernelSize={bloomKernel} mipmapBlur />
      </EffectComposer>
    </group>
  );
}
