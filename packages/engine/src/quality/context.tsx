"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type Tier = "Ultra" | "High" | "Balanced" | "Battery";

export type QualitySettings = {
  pixelRatio: number; // 0.6 .. 1.0 (multiplied by devicePixelRatio)
  shadowMapSize: number; // 512..4096
  // SSAO config (optional)
  ssao: { enabled: boolean; resolutionScale: number; radius: number; intensity: number; samples: number };
  // Bloom config
  bloom: { kernel: "VERY_SMALL" | "SMALL" | "MEDIUM" | "LARGE" | "HUGE"; threshold: number; intensity: number };
  // Textures
  textures: { anisotropy: number; generateMipmaps: boolean; minFilter: "linear" | "trilinear"; lodBias: number };
  softShadows: boolean;
};

type Ctx = {
  tier: Tier;
  setTier: (t: Tier) => void;
  settings: QualitySettings;
  // Perf
  targetFps: number;
  setTargetFps: (fps: number) => void;
  fpsMedian: number;
  autoDowngrade: boolean;
  setAutoDowngrade: (v: boolean) => void;
  // Assets
  forceKTX2: boolean;
  setForceKTX2: (v: boolean) => void;
};

const QualityCtx = createContext<Ctx | null>(null);

function settingsForTier(tier: Tier): QualitySettings {
  switch (tier) {
    case "Ultra":
      return {
        pixelRatio: 1.0,
        shadowMapSize: 4096,
        ssao: { enabled: true, resolutionScale: 1.0, radius: 0.2, intensity: 1.0, samples: 32 },
        bloom: { kernel: "LARGE", threshold: 0.22, intensity: 1.2 },
        textures: { anisotropy: 16, generateMipmaps: true, minFilter: "trilinear", lodBias: 0 },
        softShadows: true
      };
    case "High":
      return {
        pixelRatio: 0.9,
        shadowMapSize: 2048,
        ssao: { enabled: true, resolutionScale: 0.75, radius: 0.22, intensity: 0.9, samples: 24 },
        bloom: { kernel: "MEDIUM", threshold: 0.24, intensity: 0.95 },
        textures: { anisotropy: 8, generateMipmaps: true, minFilter: "trilinear", lodBias: 0 },
        softShadows: false
      };
    case "Balanced":
      return {
        pixelRatio: 0.8,
        shadowMapSize: 1024,
        ssao: { enabled: false, resolutionScale: 0.6, radius: 0.24, intensity: 0.8, samples: 16 },
        bloom: { kernel: "SMALL", threshold: 0.28, intensity: 0.75 },
        textures: { anisotropy: 4, generateMipmaps: true, minFilter: "trilinear", lodBias: 0 },
        softShadows: false
      };
    default:
      return {
        pixelRatio: 0.6,
        shadowMapSize: 512,
        ssao: { enabled: false, resolutionScale: 0.5, radius: 0.26, intensity: 0.7, samples: 8 },
        bloom: { kernel: "VERY_SMALL", threshold: 0.32, intensity: 0.6 },
        textures: { anisotropy: 1, generateMipmaps: false, minFilter: "linear", lodBias: 0 },
        softShadows: false
      };
  }
}

function nextLowerTier(t: Tier): Tier | null {
  if (t === "Ultra") return "High";
  if (t === "High") return "Balanced";
  if (t === "Balanced") return "Battery";
  return null;
}

export function QualityTierProvider({ children, initialTier = "High", targetFps = 55, autoDowngrade = true }: { children: React.ReactNode; initialTier?: Tier; targetFps?: number; autoDowngrade?: boolean }) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const [forceKTX2, setForceKTX2] = useState(false);
  const [target, setTarget] = useState(targetFps);
  const [auto, setAuto] = useState(autoDowngrade);
  const settings = useMemo(() => settingsForTier(tier), [tier]);

  // FPS monitor (rolling median ~5s)
  const [fpsMedian, setFpsMedian] = useState(60);
  const timesRef = useRef<number[]>([]);
  const lastRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const downSinceRef = useRef<number | null>(null);
  const cooldownRef = useRef<number>(0);

  useEffect(() => {
    let raf = 0 as any;
    const step = (now: number) => {
      const dt = now - lastRef.current;
      lastRef.current = now;
      if (dt > 0) {
        const fps = 1000 / dt;
        timesRef.current.push(fps);
        // keep ~5s of samples (~300 at 60fps, but not strict)
        if (timesRef.current.length > 360) timesRef.current.shift();
        // compute median
        const sorted = [...timesRef.current].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] || fps;
        setFpsMedian(median);
        // auto downgrade logic
        if (auto) {
          const below = median < target;
          const tNow = now;
          if (cooldownRef.current > 0 && tNow - cooldownRef.current < 7000) {
            // cooldown 7s after downgrade
          } else {
            if (below) {
              if (!downSinceRef.current) downSinceRef.current = tNow;
              if (tNow - (downSinceRef.current ?? tNow) > 5000) {
                const lower = nextLowerTier(tier);
                if (lower) {
                  const from = tier; const to = lower;
                  setTier(lower);
                  cooldownRef.current = tNow;
                  downSinceRef.current = null;
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('quality:tierChanged', { detail: { from, to, reason: 'fps' } }));
                  }
                }
              }
            } else {
              downSinceRef.current = null;
            }
          }
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tier, auto, target]);

  const value = useMemo<Ctx>(() => ({
    tier,
    setTier,
    settings,
    targetFps: target,
    setTargetFps: setTarget,
    fpsMedian,
    autoDowngrade: auto,
    setAutoDowngrade: setAuto,
    forceKTX2,
    setForceKTX2
  }), [tier, settings, target, fpsMedian, auto, forceKTX2]);

  return <QualityCtx.Provider value={value}>{children}</QualityCtx.Provider>;
}

export function useQuality() {
  const ctx = useContext(QualityCtx);
  if (!ctx) throw new Error('useQuality must be used within QualityTierProvider');
  return ctx;
}

