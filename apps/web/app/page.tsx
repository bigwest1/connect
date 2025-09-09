"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DayNightProvider, useEveningAutoOn } from "@homegraph/engine";
import { EngineScene, QualityTierProvider } from "@homegraph/engine/src/client";
import { isWebGPUSupported, createWebGPURenderer } from "@homegraph/engine/src/webgpu";
import { DeviceRail } from "../components/shell/DeviceRail";
import { TourRig } from "../components/TourRig";
import { OfflineBadge } from "../components/ui/OfflineBadge";
import { PinsOverlay } from "../components/shell/PinsOverlay";
import { PerformanceToggle } from "../components/ui/performance-toggle";
import { useScenes } from "@homegraph/devices";
import { useLocalStorage } from "../lib/useLocalStorage";
import { emitToast } from "../components/ui/Toaster";
import { SelectedDrawer } from "../components/drawer/SelectedDrawer";
import { SimulatorDrawer } from "../components/drawer/SimulatorDrawer";
import { SceneEditorDrawer, openSceneEditor } from "../components/drawer/SceneEditorDrawer";
import { GroupManagerDrawer, openGroupManager } from "../components/drawer/GroupManagerDrawer";
import { openSimulator } from "../components/drawer/SimulatorDrawer";
import { MetricsOverlay } from "../components/ui/MetricsOverlay";
import { SpecBadge } from "../components/ui/SpecBadge";
import { RoofLineworkPanel } from "../components/ui/RoofLineworkPanel";

export default function Home() {
  const [perf, setPerf] = useLocalStorage<"Ultra" | "High" | "Balanced" | "Battery">("homegraph.perf", "High");
  const dayState = useState(0.5); // kept for EngineScene backward-compat
  const perfOpts = useMemo(() => ({ tier: perf }), [perf]);
  const [useWebGPU, setUseWebGPU] = useLocalStorage<boolean>("homegraph.webgpu", false);
  const run = useScenes((s) => s.run);

  // Demo Home (Burnsville, MN) default location
  const [geo, setGeo] = useLocalStorage<{ lat: number; lon: number }>("homegraph.geo", { lat: 44.7677, lon: -93.2776 });

  // Auto-run Evening scene when provider emits event
  useEveningAutoOn(() => {
    emitToast("Evening scene auto-on");
    run("Evening");
  });

  // Toast on quality tier change (auto downgrade)
  useEffect(() => {
    const onTier = (e: any) => {
      const { from, to } = e.detail || {};
      emitToast(`Performance: ${from} → ${to}`);
      setPerf(to);
    };
    window.addEventListener('quality:tierChanged', onTier);
    return () => window.removeEventListener('quality:tierChanged', onTier);
  }, [setPerf]);

  // Keyboard map: g=groups, s=scenes, b=build, o=operate, i=inspect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e as any).isComposing) return;
      if (e.key === 'g') { openGroupManager(); e.preventDefault(); }
      else if (e.key === 'b') { openSceneEditor(); e.preventDefault(); }
      else if (e.key === 'i') { openSimulator(); e.preventDefault(); }
      else if (e.key === 's') {
        const el = document.getElementById('scenes-section');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as any).focus?.(); }
        e.preventDefault();
      } else if (e.key === 'o') {
        const el = document.getElementById('lights-section');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as any).focus?.(); }
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <DayNightProvider lat={geo.lat} lon={geo.lon}>
      <QualityTierProvider initialTier={perf}>
      <div className="h-screen w-screen grid grid-cols-[320px_1fr]">
        <aside className="glass p-4 flex flex-col gap-4">
          <DeviceRail dayState={dayState} onPerfChange={setPerf} perf={perf} geo={geo} onGeoChange={setGeo} useWebGPU={useWebGPU} onWebGPUChange={setUseWebGPU} />
        </aside>
        <main className="relative">
          {useWebGPU && isWebGPUSupported() ? (
            <Canvas shadows dpr={[1, 2]} gl={(canvas) => createWebGPURenderer({ canvas } as any) as any}>
              <TourRig />
              <color attach="background" args={[0.06, 0.08, 0.11]} />
              <Suspense fallback={null}>
                <Stage
                  intensity={0.65}
                  environment="city"
                  adjustCamera
                  preset="soft"
                  shadows="contact"
                >
                  <EngineScene dayState={dayState} perf={perfOpts} />
                </Stage>
              </Suspense>
              <OrbitControls makeDefault enablePan={false} />
            </Canvas>
          ) : (
            <Canvas shadows dpr={[1, 2]}>
              <TourRig />
              <color attach="background" args={[0.06, 0.08, 0.11]} />
              <Suspense fallback={null}>
                <Stage
                  intensity={0.65}
                  environment="city"
                  adjustCamera
                  preset="soft"
                  shadows="contact"
                >
                  <EngineScene dayState={dayState} perf={perfOpts} />
                </Stage>
              </Suspense>
              <OrbitControls makeDefault enablePan={false} />
            </Canvas>
          )}
          <PinsOverlay />
          <OfflineBadge />
          <MetricsOverlay />
          <SpecBadge />
          <RoofLineworkPanel />
          <SelectedDrawer geo={geo} />
          <SimulatorDrawer geo={geo} />
          <SceneEditorDrawer />
          <GroupManagerDrawer />
          <div className="absolute bottom-4 right-4 glass p-2 rounded-lg">
            <PerformanceToggle value={perf} onChange={setPerf} />
          </div>
        </main>
      </div>
      </QualityTierProvider>
    </DayNightProvider>
  );
}
