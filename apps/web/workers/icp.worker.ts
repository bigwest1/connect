// Web worker: 2D ICP (x,z) with uniform scale and yaw rotation
export type IcpRequest = {
  src: Float32Array; // [x,z,x,z,...]
  targetRect: { width: number; depth: number }; // meters
  coarse: number; // iterations
  fine: number; // iterations
  eps?: number; // early stop threshold for residual delta
  seedTransform?: { scale: number; rotYdeg: number; offsetX: number; offsetZ: number };
  useHouseProfile?: boolean;
};

export type IcpResult = {
  transform: { R: [number, number, number, number]; t: [number, number]; scale: number };
  residuals: number[];
  appliedDims: { width: number; depth: number }; // scaled dims
};

function nearestNeighbors(src: Float32Array, dst: Float32Array): Float32Array {
  // src, dst are [x,z,...]; returns indices into dst (integer stored as float)
  const out = new Float32Array(src.length / 2);
  for (let i = 0; i < src.length; i += 2) {
    const sx = src[i], sz = src[i + 1];
    let best = 0, bestD = Infinity;
    for (let j = 0; j < dst.length; j += 2) {
      const dx = dst[j] - sx, dz = dst[j + 1] - sz;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = j / 2; }
    }
    out[i / 2] = best;
  }
  return out;
}

function buildRectPoints(width: number, depth: number, count = 800): Float32Array {
  // distribute points along perimeter
  const perim = 2 * (width + depth);
  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const s = (i / count) * perim;
    let x: number, z: number;
    if (s < width) { x = -width / 2 + s; z = -depth / 2; }
    else if (s < width + depth) { x = width / 2; z = -depth / 2 + (s - width); }
    else if (s < 2 * width + depth) { x = width / 2 - (s - (width + depth)); z = depth / 2; }
    else { x = -width / 2; z = depth / 2 - (s - (2 * width + depth)); }
    out[i * 2] = x; out[i * 2 + 1] = z;
  }
  return out;
}

function buildHouseProfilePoints(width: number, depth: number, count = 1200): Float32Array {
  // Simple notched rectangle: front porch inset and side garage bump for realism
  const indentW = width * 0.18;
  const indentD = depth * 0.12;
  const pts: Array<[number, number]> = [];
  const outline: Array<[number, number]> = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [width * 0.15, depth / 2],
    [width * 0.15, depth / 2 - indentD],
    [-width * 0.25, depth / 2 - indentD],
    [-width * 0.25, depth / 2],
    [-width / 2, depth / 2]
  ];
  // Interpolate along edges
  for (let e = 0; e < outline.length; e++) {
    const a = outline[e];
    const b = outline[(e + 1) % outline.length];
    const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.round((segLen / (width + depth)) * count));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  const out = new Float32Array(pts.length * 2);
  pts.forEach((p, i) => { out[i * 2] = p[0]; out[i * 2 + 1] = p[1]; });
  return out;
}

function icp2d(srcIn: Float32Array, dst: Float32Array, iterations: number, eps = 1e-4) {
  // returns {R, t, s, residual}
  let src = new Float32Array(srcIn); // working copy
  let R: [number, number, number, number] = [1, 0, 0, 1];
  let t: [number, number] = [0, 0];
  let s = 1;
  const residuals: number[] = [];

  for (let it = 0; it < iterations; it++) {
    const idx = nearestNeighbors(src, dst);
    // Build matched sets
    const n = idx.length;
    let cx = 0, cz = 0, dx = 0, dz = 0;
    for (let i = 0; i < n; i++) { cx += src[i * 2]; cz += src[i * 2 + 1]; const j = idx[i] * 2; dx += dst[j]; dz += dst[j + 1]; }
    cx /= n; cz /= n; dx /= n; dz /= n;

    // Centered coordinates and cross-covariance
    let Sxx = 0, Sxz = 0, Szx = 0, Szz = 0;
    let ss = 0; // sum of squared src (centered)
    for (let i = 0; i < n; i++) {
      const sx = src[i * 2] - cx; const sz = src[i * 2 + 1] - cz;
      const j = idx[i] * 2; const tx = dst[j] - dx; const tz = dst[j + 1] - dz;
      Sxx += sx * tx; Sxz += sx * tz; Szx += sz * tx; Szz += sz * tz;
      ss += sx * sx + sz * sz;
    }
    // 2D optimal rotation angle
    const theta = Math.atan2(Sxz - Szx, Sxx + Szz);
    const c = Math.cos(theta), sn = Math.sin(theta);
    const Rstep: [number, number, number, number] = [c, -sn, sn, c];
    // scale (orthogonal Procrustes with uniform scale)
    const num = c * (Sxx + Szz) + sn * (Sxz - Szx);
    const sstep = ss > 1e-9 ? num / ss : 1;
    // translation
    const tx = dx - (sstep * (Rstep[0] * cx + Rstep[1] * cz));
    const tz = dz - (sstep * (Rstep[2] * cx + Rstep[3] * cz));

    // Apply to src
    for (let i = 0; i < src.length; i += 2) {
      const x = src[i], z = src[i + 1];
      src[i] = sstep * (Rstep[0] * x + Rstep[1] * z) + tx;
      src[i + 1] = sstep * (Rstep[2] * x + Rstep[3] * z) + tz;
    }
    // Compose transforms
    const Rnew: [number, number, number, number] = [
      Rstep[0] * R[0] + Rstep[1] * R[2],
      Rstep[0] * R[1] + Rstep[1] * R[3],
      Rstep[2] * R[0] + Rstep[3] * R[2],
      Rstep[2] * R[1] + Rstep[3] * R[3]
    ];
    R = Rnew; s *= sstep; t = [t[0] * sstep + tx, t[1] * sstep + tz];

    // residual
    let res = 0;
    for (let i = 0; i < n; i++) {
      const j = idx[i] * 2;
      const ex = src[i * 2] - dst[j];
      const ez = src[i * 2 + 1] - dst[j + 1];
      res += ex * ex + ez * ez;
    }
    const prev = residuals[residuals.length - 1] ?? Infinity;
    const current = res / n;
    residuals.push(current);
    if (Math.abs(prev - current) < eps) break;
  }

  return { R, t, s, residuals };
}

self.onmessage = (e: MessageEvent<IcpRequest>) => {
  const { src, targetRect, coarse, fine, eps, seedTransform, useHouseProfile } = e.data;
  const dstCoarse = useHouseProfile ? buildHouseProfilePoints(targetRect.width, targetRect.depth, 700) : buildRectPoints(targetRect.width, targetRect.depth, 400);
  const dstFine = useHouseProfile ? buildHouseProfilePoints(targetRect.width, targetRect.depth, 2000) : buildRectPoints(targetRect.width, targetRect.depth, 1600);

  // Apply seed transform to src if provided
  let seeded = src;
  let Rseed: [number, number, number, number] = [1, 0, 0, 1];
  let sseed = 1;
  let tseed: [number, number] = [0, 0];
  if (seedTransform) {
    const th = (seedTransform.rotYdeg * Math.PI) / 180;
    const c = Math.cos(th), sn = Math.sin(th);
    Rseed = [c, -sn, sn, c];
    sseed = seedTransform.scale;
    tseed = [seedTransform.offsetX, seedTransform.offsetZ];
    seeded = new Float32Array(src.length);
    for (let i = 0; i < src.length; i += 2) {
      const x = src[i], z = src[i + 1];
      seeded[i] = sseed * (Rseed[0] * x + Rseed[1] * z) + tseed[0];
      seeded[i + 1] = sseed * (Rseed[2] * x + Rseed[3] * z) + tseed[1];
    }
  }

  const coarseResult = icp2d(seeded, dstCoarse, coarse, eps);

  // Apply coarse transform to seeded then refine
  const transformed = new Float32Array(seeded.length);
  for (let i = 0; i < seeded.length; i += 2) {
    const x = seeded[i], z = seeded[i + 1];
    const xr = coarseResult.s * (coarseResult.R[0] * x + coarseResult.R[1] * z) + coarseResult.t[0];
    const zr = coarseResult.s * (coarseResult.R[2] * x + coarseResult.R[3] * z) + coarseResult.t[1];
    transformed[i] = xr; transformed[i + 1] = zr;
  }

  const fineResult = icp2d(transformed, dstFine, fine, eps);

  // Compose seed + coarse + fine
  const Rc = [
    coarseResult.R[0] * Rseed[0] + coarseResult.R[1] * Rseed[2],
    coarseResult.R[0] * Rseed[1] + coarseResult.R[1] * Rseed[3],
    coarseResult.R[2] * Rseed[0] + coarseResult.R[3] * Rseed[2],
    coarseResult.R[2] * Rseed[1] + coarseResult.R[3] * Rseed[3]
  ] as [number, number, number, number];
  const R = [
    fineResult.R[0] * Rc[0] + fineResult.R[1] * Rc[2],
    fineResult.R[0] * Rc[1] + fineResult.R[1] * Rc[3],
    fineResult.R[2] * Rc[0] + fineResult.R[3] * Rc[2],
    fineResult.R[2] * Rc[1] + fineResult.R[3] * Rc[3]
  ] as [number, number, number, number];
  const scale = sseed * coarseResult.s * fineResult.s;
  const t: [number, number] = [tseed[0] + coarseResult.t[0] + fineResult.t[0], tseed[1] + coarseResult.t[1] + fineResult.t[1]];
  const residuals = [...coarseResult.residuals, ...fineResult.residuals];
  const appliedDims = { width: targetRect.width * scale, depth: targetRect.depth * scale };

  const result: IcpResult = { transform: { R, t, scale }, residuals, appliedDims };
  (self as any).postMessage(result);
};

export {}; // make this a module
