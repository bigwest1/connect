// Experimental WebGPU support helpers
// Note: WebGPURenderer is provided by three/examples and may not have full TS types.
// Import it lazily on the client to avoid SSR issues.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WebGPURendererCtor: any | null = null;

function getWebGPURendererCtor() {
  if (WebGPURendererCtor) return WebGPURendererCtor;
  if (typeof window === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('three/examples/jsm/renderers/webgpu/WebGPURenderer.js');
    WebGPURendererCtor = mod?.WebGPURenderer ?? null;
  } catch {
    WebGPURendererCtor = null;
  }
  return WebGPURendererCtor;
}

export function isWebGPUSupported(): boolean {
  try {
    return typeof navigator !== 'undefined' && !!(navigator as any).gpu;
  } catch { return false; }
}

// Accept broader canvas input to align with R3F's GL callback, which may pass
// either an HTMLCanvasElement or an OffscreenCanvas depending on environment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createWebGPURenderer(opts: { canvas: any; antialias?: boolean }) {
  const Ctor = getWebGPURendererCtor();
  if (!Ctor) throw new Error('WebGPURenderer not available');
  const renderer = new Ctor({ canvas: opts.canvas, antialias: opts.antialias ?? true });
  return renderer;
}
