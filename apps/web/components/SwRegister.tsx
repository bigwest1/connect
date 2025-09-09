"use client";
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register in dev too for convenience, but guard against Next HMR restarts
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // Warm cache of common assets after first install
        const urls = [
          '/', '/docs/metrics.json', '/assets/mock-scan.glb',
          // optionally try common textures; if missing, SW will ignore errors
          '/textures/siding/basecolor_512.jpg','/textures/siding/basecolor_2k.jpg',
          '/textures/brick/basecolor_512.jpg','/textures/brick/basecolor_2k.jpg',
          '/basis/basis_transcoder.wasm'
        ];
        reg.active && reg.active.postMessage({ type: 'warmCache', urls });
        navigator.serviceWorker.controller?.postMessage({ type: 'getQueueSize' });
      }).catch(() => {});
    }
  }, []);
  return null;
}
