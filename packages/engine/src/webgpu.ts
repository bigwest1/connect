// Experimental WebGPU support helpers
// Note: WebGPURenderer is provided by three/examples and may not have full TS types
// We keep usage internal and cast to any to avoid impacting public APIs.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WebGPURendererCtor: any | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('three/examples/jsm/renderers/webgpu/WebGPURenderer.js');
  WebGPURendererCtor = mod?.WebGPURenderer ?? null;
} catch {}

export function isWebGPUSupported(): boolean {
  try {
    return typeof navigator !== 'undefined' && !!(navigator as any).gpu && !!WebGPURendererCtor;
  } catch { return false; }
}

export function createWebGPURenderer(opts: { canvas: HTMLCanvasElement; antialias?: boolean }) {
  if (!WebGPURendererCtor) throw new Error('WebGPURenderer not available');
  const renderer = new WebGPURendererCtor({ canvas: opts.canvas, antialias: opts.antialias ?? true });
  return renderer;
}

