"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF, OrthographicCamera } from "@react-three/drei";
import { ARCoreDepth, RoomPlan } from "@homegraph/mobile-bridge";
import { useHouse } from "@homegraph/engine";
import { getClientRole, type Role } from "../../lib/auth";
import { emitToast } from "../../components/ui/Toaster";
import { House } from "@homegraph/engine/src/client";
import { idbGet, idbSet, Alignment } from "../../lib/idb";
import { autoAlign } from "../../lib/align";
import { samplePointCloudFromGLB } from "../../lib/pcd";

type Step = 1 | 2 | 3 | 4;

function MeshView({ url }: { url: string }) {
  const gltf = useGLTF(url);
  useEffect(() => {
    gltf.scene.traverse((o: any) => {
      if (o.isMesh && o.material) {
        o.material.transparent = true;
        o.material.opacity = 0.5;
        o.material.depthWrite = false;
      }
    });
  }, [gltf]);
  return <primitive object={gltf.scene} />;
}

function ResidualSparkline({ values }: { values: number[] }) {
  const w = 220, h = 40, pad = 4;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1e-9, max - min);
  const stepX = (w - pad * 2) / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} aria-label="Residual chart">
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth={2} />
    </svg>
  );
}

function useMeshBounds(url?: string) {
  const [bounds, setBounds] = useState<{ w: number; d: number; h: number } | null>(null);
  useEffect(() => {
    if (!url) return;
    let mounted = true;
    (async () => {
      const { GLTFLoader } = await import('three-stdlib');
      const { Box3, Vector3 } = await import('three');
      const loader = new (GLTFLoader as any)();
      loader.load(url, (gltf: any) => {
        if (!mounted) return;
        const box = new Box3().setFromObject(gltf.scene);
        const size = new Vector3();
        box.getSize(size);
        setBounds({ w: size.x, d: size.z, h: size.y });
      });
    })();
    return () => { mounted = false; };
  }, [url]);
  return bounds;
}

function Wizard() {
  const [step, setStep] = useState<Step>(1);
  const [meshUrl, setMeshUrl] = useState<string | undefined>(undefined);
  const [transform, setTransform] = useState<{ scale: number; rotYdeg: number; offsetX: number; offsetZ: number }>({ scale: 1, rotYdeg: 0, offsetX: 0, offsetZ: 0 });
  const bounds = useMeshBounds(meshUrl);
  const { metrics, setMetrics } = useHouse();
  const [splitView, setSplitView] = useState<boolean>(false);
  const [role, setRole] = useState<Role>('GUEST');
  const canEditGeometry = role === 'OWNER' || role === 'FAMILY';
  useEffect(() => { setRole(getClientRole()); }, []);
  const [residuals, setResiduals] = useState<number[] | null>(null);
  const [icpRunning, setIcpRunning] = useState(false);
  const [lastAccepted, setLastAccepted] = useState<typeof metrics | null>(null);
  const [previewDiff, setPreviewDiff] = useState<null | { perimeter_ft: { before: number; after: number }; eaves_ft: { before: number; after: number }; roof_pitch: { before: string; after: string }; area_ft2: { before: number; after: number } }>(null);

  const checkItems = [
    "Battery above 30%",
    "Good outdoor lighting",
    "Walk full perimeter"
  ];
  const [checks, setChecks] = useState<boolean[]>(checkItems.map(() => false));

  const canProceed = step === 2 ? checks.every(Boolean) : true;

  async function doScan(simulate = false) {
    setStep(3);
    if (simulate) {
      setMeshUrl('/assets/mock-scan.glb');
      return;
    }
    try {
      const res = await (navigator.userAgent.includes('Android') ? ARCoreDepth.scan({ quality: 'balanced' }) : RoomPlan.scan({ quality: 'balanced' }));
      setMeshUrl(res.result.meshUrl);
    } catch {
      setMeshUrl('/assets/mock-scan.glb');
    }
  }

  function applyAlignment() {
    // Simple alignment heuristic: update footprint area based on mesh bounds (m^2 → ft^2)
    if (!bounds) return;
    const meters2 = Math.max(1, bounds.w * transform.scale * bounds.d * transform.scale);
    const ft2 = meters2 * 10.7639;
    const perimeter_ft = 2 * (((bounds.w * transform.scale) + (bounds.d * transform.scale)) * 3.28084);
    setMetrics({ ...metrics, footprint: { area_ft2: Math.round(ft2), perimeter_ft } });
    if (meshUrl) idbSet<Alignment>('last', { meshUrl, transform, updatedAt: Date.now() });
    setLastAccepted({ ...metrics, footprint: { area_ft2: Math.round(ft2), perimeter_ft } });
  }

  // Load last alignment if present
  useEffect(() => {
    (async () => {
      const last = await idbGet<Alignment>('last');
      if (last) {
        setMeshUrl(last.meshUrl);
        setTransform(last.transform);
        setStep(4);
      }
    })();
  }, []);

  // Keyboard nudging on step 4
  useEffect(() => {
    if (step !== 4) return;
    const onKey = (e: KeyboardEvent) => {
      let handled = true;
      if (e.key === 'ArrowLeft') setTransform((t) => ({ ...t, offsetX: Number((t.offsetX - 0.1).toFixed(2)) }));
      else if (e.key === 'ArrowRight') setTransform((t) => ({ ...t, offsetX: Number((t.offsetX + 0.1).toFixed(2)) }));
      else if (e.key === 'ArrowUp') setTransform((t) => ({ ...t, offsetZ: Number((t.offsetZ - 0.1).toFixed(2)) }));
      else if (e.key === 'ArrowDown') setTransform((t) => ({ ...t, offsetZ: Number((t.offsetZ + 0.1).toFixed(2)) }));
      else if (e.key.toLowerCase() === 'q') setTransform((t) => ({ ...t, rotYdeg: t.rotYdeg - 1 }));
      else if (e.key.toLowerCase() === 'e') setTransform((t) => ({ ...t, rotYdeg: t.rotYdeg + 1 }));
      else if (e.key === '+' || e.key === '=') setTransform((t) => ({ ...t, scale: Number((t.scale + 0.01).toFixed(2)) }));
      else if (e.key === '-') setTransform((t) => ({ ...t, scale: Number((t.scale - 0.01).toFixed(2)) }));
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  return (
    <div className="h-screen w-screen grid grid-cols-[320px_1fr]">
      <aside className="glass p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Scan Wizard</h1>
          <Link className="text-xs opacity-70 hover:opacity-100 underline" href="/">Back</Link>
        </div>
        <ol className="text-sm space-y-1">
          <li className={`${step===1?"text-white":"opacity-60"}`}>1) Device & permissions</li>
          <li className={`${step===2?"text-white":"opacity-60"}`}>2) Guided capture</li>
          <li className={`${step===3?"text-white":"opacity-60"}`}>3) Preview mesh</li>
          <li className={`${step===4?"text-white":"opacity-60"}`}>4) Align & confirm</li>
        </ol>
        {step === 1 && (
          <div className="space-y-2 text-sm">
            <div>Platform: {typeof window !== 'undefined' && (window as any).Capacitor ? 'Capacitor' : 'Web'}</div>
            <div className="opacity-70">Camera permission requested on native; web uses mock.</div>
            <button className="glass rounded px-3 py-2 focus-ring" onClick={() => setStep(2)}>Continue</button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-2 text-sm">
            <div className="opacity-70">Checklist</div>
            {checkItems.map((t,i)=> (
              <label key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={checks[i]} onChange={(e)=> setChecks(checks.map((c,idx)=> idx===i? e.target.checked: c))} />
                {t}
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <button className="glass rounded px-3 py-2 focus-ring disabled:opacity-50" disabled={!canProceed} onClick={() => doScan(false)}>Start Capture</button>
              <button className="glass rounded px-3 py-2 focus-ring" onClick={() => doScan(true)}>Simulate Scan</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2 text-sm">
            <div className="opacity-70">Preview mesh then continue.</div>
            <button className="glass rounded px-3 py-2 focus-ring" onClick={() => setStep(4)} disabled={!meshUrl}>Next: Align</button>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-2 text-sm">
            <div className="opacity-70">Alignment summary (rough):</div>
            <div>Mesh bounds: {bounds ? `${bounds.w.toFixed(1)}m × ${bounds.d.toFixed(1)}m` : '—'}</div>
            <div>Current area: {metrics.footprint.area_ft2.toFixed(0)} ft²</div>
            <div className="pt-2 space-y-2">
              <label className="block">Scale
                <div className="flex items-center gap-2">
                  <input type="range" min={0.5} max={2} step={0.01} value={transform.scale} onChange={(e)=> setTransform({ ...transform, scale: Number(e.target.value) })} className="flex-1" />
                  <input type="number" step={0.01} min={0.5} max={2} className="glass rounded px-2 py-1 w-20" value={Number(transform.scale.toFixed(2))} onChange={(e)=> setTransform({ ...transform, scale: Number(e.target.value) })} />
                </div>
              </label>
              <label className="block">Rotate Y (°)
                <div className="flex items-center gap-2">
                  <input type="range" min={-180} max={180} step={1} value={transform.rotYdeg} onChange={(e)=> setTransform({ ...transform, rotYdeg: Number(e.target.value) })} className="flex-1" />
                  <input type="number" step={1} min={-180} max={180} className="glass rounded px-2 py-1 w-20" value={Math.round(transform.rotYdeg)} onChange={(e)=> setTransform({ ...transform, rotYdeg: Number(e.target.value) })} />
                </div>
              </label>
              <label className="block">Offset X (m)
                <div className="flex items-center gap-2">
                  <input type="range" min={-5} max={5} step={0.1} value={transform.offsetX} onChange={(e)=> setTransform({ ...transform, offsetX: Number(e.target.value) })} className="flex-1" />
                  <input type="number" step={0.1} min={-5} max={5} className="glass rounded px-2 py-1 w-20" value={Number(transform.offsetX.toFixed(2))} onChange={(e)=> setTransform({ ...transform, offsetX: Number(e.target.value) })} />
                </div>
              </label>
              <label className="block">Offset Z (m)
                <div className="flex items-center gap-2">
                  <input type="range" min={-5} max={5} step={0.1} value={transform.offsetZ} onChange={(e)=> setTransform({ ...transform, offsetZ: Number(e.target.value) })} className="flex-1" />
                  <input type="number" step={0.1} min={-5} max={5} className="glass rounded px-2 py-1 w-20" value={Number(transform.offsetZ.toFixed(2))} onChange={(e)=> setTransform({ ...transform, offsetZ: Number(e.target.value) })} />
                </div>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="glass rounded px-3 py-2 focus-ring disabled:opacity-50" onClick={applyAlignment} disabled={!bounds || !canEditGeometry}>Apply Alignment</button>
              <button className="glass rounded px-3 py-2 focus-ring disabled:opacity-50" onClick={() => meshUrl && idbSet('last', { meshUrl, transform, updatedAt: Date.now() })} disabled={!canEditGeometry}>Save Session</button>
              <button className="glass rounded px-3 py-2 focus-ring disabled:opacity-50" onClick={() => setTransform({ scale: 1, rotYdeg: 0, offsetX: 0, offsetZ: 0 })} disabled={!canEditGeometry}>Reset</button>
              <button className="glass rounded px-3 py-2 focus-ring disabled:opacity-50" onClick={async () => { if (meshUrl) { const t = await autoAlign(meshUrl, metrics.footprint.area_ft2, transform); setTransform(t); } }} disabled={!meshUrl || !canEditGeometry}>Auto-Align</button>
            </div>
            <div className="pt-3 space-y-2">
              <button className="glass rounded px-3 py-2 focus-ring disabled:opacity-50" disabled={!meshUrl || icpRunning} onClick={async () => {
                if (!meshUrl) return;
                setIcpRunning(true);
                try {
                  const src = await samplePointCloudFromGLB(meshUrl, 60);
                  // target rectangle from current metrics (meters)
                  const area_m2 = metrics.footprint.area_ft2 / 10.7639;
                  const width = Math.sqrt(area_m2);
                  const depth = width * 0.7;
                  // Seed with autoAlign for faster convergence
                  const seed = await autoAlign(meshUrl, metrics.footprint.area_ft2, transform);
                  setTransform(seed);
                  const worker = new Worker(new URL('../../workers/icp.worker.ts', import.meta.url), { type: 'module' });
                  worker.postMessage({ src, targetRect: { width, depth }, coarse: 3, fine: 10, eps: 1e-4, seedTransform: seed, useHouseProfile: true });
                  worker.onmessage = (ev: MessageEvent<any>) => {
                    const { transform: Tf, residuals: res, appliedDims } = ev.data as { transform: { R: [number,number,number,number]; t: [number,number]; scale: number }, residuals: number[], appliedDims: { width: number; depth: number } };
                    setResiduals(res);
                    // Map to our transform model (yaw rotation + uniform scale + translation)
                    const rotYdeg = Math.atan2(Tf.R[2], Tf.R[0]) * 180 / Math.PI;
                    setTransform({ scale: Tf.scale, rotYdeg, offsetX: Tf.t[0], offsetZ: Tf.t[1] });
                    // Prepare diffs panel (stored via state below)
                    const area_ft2 = appliedDims.width * appliedDims.depth * 10.7639;
                    const perimeter_ft = 2 * (appliedDims.width + appliedDims.depth) * 3.28084;
                    setPreviewDiff({
                      perimeter_ft: { before: metrics.footprint.perimeter_ft, after: perimeter_ft },
                      eaves_ft: { before: metrics.footprint.perimeter_ft, after: perimeter_ft },
                      roof_pitch: { before: '6/12', after: '6/12' },
                      area_ft2: { before: metrics.footprint.area_ft2, after: area_ft2 }
                    });
                    worker.terminate();
                    setIcpRunning(false);
                  };
                } catch (e) {
                  console.error(e);
                  setIcpRunning(false);
                }
              }}>Run ICP (coarse+fine)</button>
            </div>
            {residuals && (
              <div className="glass rounded p-2 mt-2">
                <div className="text-xs uppercase opacity-60 mb-1">Residuals</div>
                <ResidualSparkline values={residuals} />
                <div className="text-[11px] opacity-60">Stop when Δresidual &lt; 1e-4</div>
              </div>
            )}
            {previewDiff && (
              <div className="glass rounded p-2 mt-2">
                <div className="text-xs uppercase opacity-60 mb-1">Alignment Diff</div>
                <div className="text-xs">Perimeter: {previewDiff.perimeter_ft.before.toFixed(1)} → {previewDiff.perimeter_ft.after.toFixed(1)} ft</div>
                <div className="text-xs">Eaves: {previewDiff.eaves_ft.before.toFixed(1)} → {previewDiff.eaves_ft.after.toFixed(1)} ft</div>
                <div className="text-xs">Roof pitch: {previewDiff.roof_pitch.before} → {previewDiff.roof_pitch.after}</div>
                <div className="text-xs">Area: {previewDiff.area_ft2.before.toFixed(0)} → {previewDiff.area_ft2.after.toFixed(0)} ft²</div>
                <div className="flex gap-2 pt-2">
                  <button className="glass rounded px-3 py-1 focus-ring disabled:opacity-50" disabled={!canEditGeometry} onClick={async () => {
                    if (!previewDiff) return;
                    const updated = { ...metrics, footprint: { area_ft2: Math.round(previewDiff.area_ft2.after), perimeter_ft: previewDiff.perimeter_ft.after } } as any;
                    setMetrics(updated);
                    try {
                      await fetch('/api/house', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(updated) });
                      const res = await fetch('/api/house');
                      const persisted = await res.json();
                      setMetrics(persisted);
                      emitToast('Geometry saved');
                    } catch {}
                    setLastAccepted({ ...metrics, footprint: { area_ft2: Math.round(previewDiff.area_ft2.after), perimeter_ft: previewDiff.perimeter_ft.after } });
                  }}>Accept</button>
                  <button className="glass rounded px-3 py-1 focus-ring" onClick={() => {
                    if (lastAccepted) setMetrics(lastAccepted);
                  }}>Revert</button>
                </div>
              </div>
            )}
            <div className="text-[11px] opacity-60">Keyboard: Arrow keys move X/Z (0.1m), Q/E rotate 1°, +/- scale 0.01. Toggle split-view for top orthographic preview.</div>
            <label className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={splitView} onChange={(e)=> setSplitView(e.target.checked)} /> Split view (top/iso)
            </label>
          </div>
        )}
      </aside>
      <main className={`relative ${splitView ? "grid grid-rows-2" : ""}`}>
        {/* Top orthographic view when split */}
        {splitView && (
          <div className="relative border-b border-white/10">
            <Canvas shadows dpr={[1,2]}>
              <color attach="background" args={[0.06, 0.08, 0.11]} />
              <OrthographicCamera makeDefault position={[0, 10, 0]} up={[0,0,-1]} zoom={60} />
              <group rotation={[-Math.PI/2, 0, 0]}>
                <House metrics={metrics as any} wire color="#00ffff" />
                {meshUrl ? (
                  <group position={[transform.offsetX, 0, transform.offsetZ]} rotation={[0, transform.rotYdeg * Math.PI/180, 0]} scale={transform.scale}>
                    <MeshView url={meshUrl} />
                  </group>
                ) : null}
              </group>
            </Canvas>
          </div>
        )}
        <div className="relative">
          <Canvas shadows dpr={[1,2]}>
            <color attach="background" args={[0.06, 0.08, 0.11]} />
            <Stage intensity={0.7} environment="city" preset="soft">
              <House metrics={metrics as any} wire color="#00ffff" position={[0,0,0]} />
              {meshUrl ? (
                <group position={[transform.offsetX, 0, transform.offsetZ]} rotation={[0, transform.rotYdeg * Math.PI/180, 0]} scale={transform.scale}>
                  <MeshView url={meshUrl} />
                </group>
              ) : null}
            </Stage>
            <OrbitControls makeDefault />
          </Canvas>
        </div>
      </main>
    </div>
  );
}

export default function ScanPage() { return <Wizard />; }
