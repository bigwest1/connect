import fs from 'node:fs';
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three-stdlib';

// Simple UV2 generator: copies uv to uv2 if present; otherwise projects faces to the largest axis
function ensureUV2(geom) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  if (g.getAttribute('uv2')) return g;
  if (uv) {
    g.setAttribute('uv2', uv.clone());
    return g;
  }
  const uv2 = new THREE.BufferAttribute(new Float32Array((pos.count) * 2), 2);
  const bbox = new THREE.Box3().setFromBufferAttribute(pos);
  const size = new THREE.Vector3(); bbox.getSize(size);
  // project to dominant axis plane
  const axis = size.x > size.y && size.x > size.z ? 'x' : size.y > size.z ? 'y' : 'z';
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (axis === 'x') uv2.setXY(i, (z - bbox.min.z) / size.z, (y - bbox.min.y) / size.y);
    else if (axis === 'y') uv2.setXY(i, (x - bbox.min.x) / size.x, (z - bbox.min.z) / size.z);
    else uv2.setXY(i, (x - bbox.min.x) / size.x, (y - bbox.min.y) / size.y);
  }
  g.setAttribute('uv2', uv2);
  return g;
}

function buildHouseGeometry({ stories = 2, area_ft2 = 2261 } = {}) {
  const size = Math.sqrt(area_ft2) / 10;
  const height = 2.8 * stories;
  const box = new THREE.BoxGeometry(size, height, size * 0.7);
  return box;
}

async function main() {
  const geom = buildHouseGeometry({ stories: 2, area_ft2: 2261 });
  const withUv2 = ensureUV2(geom);
  // Save as simple JSON attributes
  const out = {
    attributes: Object.fromEntries(Object.entries(withUv2.attributes).map(([k, a]) => [k, Array.from(a.array)])),
    index: withUv2.index ? Array.from(withUv2.index.array) : null,
  };
  const outPath = new URL('../assets/lightmaps/house-uv2.json', import.meta.url);
  fs.mkdirSync(new URL('../assets/lightmaps/', import.meta.url), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log('Wrote lightmap UV2 data to', outPath.pathname);
}

main().catch((e) => { console.error(e); process.exit(1); });

