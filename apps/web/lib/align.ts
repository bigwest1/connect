import type { Alignment } from "./idb";

export type MeshStats = {
  mean: { x: number; z: number };
  width: number; // X extent (m)
  depth: number; // Z extent (m)
  angleRad: number; // principal axis angle vs world X (radians)
};

export async function computeMeshStats(url: string): Promise<MeshStats> {
  const [{ GLTFLoader }, THREE] = await Promise.all([
    import('three-stdlib'),
    import('three')
  ]);
  const loader = new (GLTFLoader as any)();
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf: any) => {
      const pts: Array<[number, number]> = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o: any) => {
        if (o.isMesh && o.geometry) {
          const g = o.geometry as any;
          const pos = g.getAttribute('position');
          if (!pos) return;
          const v = new (THREE as any).Vector3();
          for (let i = 0; i < pos.count; i += 50) { // sample ~2% of vertices
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
            pts.push([v.x, v.z]);
          }
        }
      });
      if (pts.length < 3) {
        resolve({ mean: { x: 0, z: 0 }, width: 1, depth: 1, angleRad: 0 });
        return;
      }
      const meanX = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const meanZ = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      // covariance
      let sxx = 0, sxz = 0, szz = 0;
      for (const [x, z] of pts) {
        const dx = x - meanX;
        const dz = z - meanZ;
        sxx += dx * dx;
        sxz += dx * dz;
        szz += dz * dz;
      }
      sxx /= pts.length; szz /= pts.length; sxz /= pts.length;
      // eigen decomposition for 2x2
      const T = sxx + szz;
      const D = sxx * szz - sxz * sxz;
      const tmp = Math.sqrt(Math.max(0, T * T / 4 - D));
      const l1 = T / 2 + tmp; // largest eigenvalue
      // principal eigenvector
      let vx = 1, vz = 0;
      if (Math.abs(sxz) > 1e-6) {
        vx = l1 - szz;
        vz = sxz;
        const norm = Math.hypot(vx, vz) || 1;
        vx /= norm; vz /= norm;
      }
      const angle = Math.atan2(vz, vx);
      // extents via bounding box
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, z] of pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z; }
      const width = maxX - minX;
      const depth = maxZ - minZ;
      resolve({ mean: { x: meanX, z: meanZ }, width, depth, angleRad: angle });
    }, undefined, reject);
  });
}

export async function autoAlign(url: string, targetAreaFt2: number, current: Alignment["transform"]): Promise<Alignment["transform"]> {
  const stats = await computeMeshStats(url);
  const meshAreaM2 = Math.max(1, stats.width * stats.depth);
  const targetM2 = Math.max(1, targetAreaFt2 / 10.7639);
  const scaleFactor = Math.sqrt(targetM2 / meshAreaM2);
  const rotYdeg = -(stats.angleRad * 180) / Math.PI; // align principal axis to world X
  return {
    scale: Number((current.scale * scaleFactor).toFixed(3)),
    rotYdeg: Number(rotYdeg.toFixed(1)),
    offsetX: Number((-stats.mean.x * scaleFactor).toFixed(2)),
    offsetZ: Number((-stats.mean.z * scaleFactor).toFixed(2))
  };
}

