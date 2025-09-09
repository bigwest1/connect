import type { Plugin } from "@capacitor/core";
import { saveBase64 } from "../share/files";

export type DepthScan = {
  meshUrl: string; // glTF URL
};

export interface ARCoreDepthPlugin extends Plugin {
  scan(options?: { quality?: "fast" | "balanced" | "best" }): Promise<{ result: DepthScan }>;
}

export const ARCoreDepth: ARCoreDepthPlugin = {
  scan: async () => {
    const b64 = "aGVsbG8=";
    const saved = await saveBase64('mock-scan.glb', b64, 'model/gltf-binary');
    let meshUrl = saved.uri;
    try {
      if (!meshUrl && typeof URL !== 'undefined' && typeof atob !== 'undefined') {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const blob = new Blob([bin], { type: 'model/gltf-binary' });
        meshUrl = URL.createObjectURL(blob);
      }
    } catch {}
    return { result: { meshUrl: meshUrl || "/assets/mock-scan.glb" } };
  }
} as any;
