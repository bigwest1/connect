import * as THREE from 'three';

const FT_TO_M = 0.3048;

function areaOfTopFace(obj: THREE.Mesh) {
  const geom = obj.geometry as THREE.BufferGeometry;
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const index = geom.index;
  const m = new THREE.Matrix4();
  obj.updateWorldMatrix(true, false);
  m.copy(obj.matrixWorld);
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const n = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0,0,1).applyMatrix4(new THREE.Matrix4().extractRotation(obj.matrixWorld)).normalize();
  let area = 0;
  const triCount = index ? index.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const a = index ? index.getX(i*3+0) : i*3+0;
    const b = index ? index.getX(i*3+1) : i*3+1;
    const c = index ? index.getX(i*3+2) : i*3+2;
    vA.fromBufferAttribute(pos, a).applyMatrix4(m);
    vB.fromBufferAttribute(pos, b).applyMatrix4(m);
    vC.fromBufferAttribute(pos, c).applyMatrix4(m);
    // Compute face normal
    const ab = new THREE.Vector3().subVectors(vB, vA);
    const ac = new THREE.Vector3().subVectors(vC, vA);
    n.copy(ab).cross(ac).normalize();
    // Only count faces aligned with +localZ (top face), not bottom or sides
    const align = n.dot(zAxis);
    if (align > 0.8) {
      // triangle area = 0.5 * |ab x ac|
      const triArea = ab.cross(ac).length() * 0.5;
      area += triArea;
    }
  }
  // Convert m^2 to ft^2
  return area / (FT_TO_M*FT_TO_M);
}

function lengthOfLine(line: THREE.Line) {
  const geom = line.geometry as THREE.BufferGeometry;
  const pos = geom.attributes.position as THREE.BufferAttribute;
  let len = 0;
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  for (let i = 0; i < pos.count - 1; i++) {
    v1.fromBufferAttribute(pos, i).applyMatrix4(line.matrixWorld);
    v2.fromBufferAttribute(pos, i+1).applyMatrix4(line.matrixWorld);
    len += v1.distanceTo(v2);
  }
  return len / FT_TO_M; // meters to feet
}

export function validateScene(root: THREE.Object3D, spec: any, tolerance = 0.005) {
  const deltas: Record<string, number> = {};
  const target = {
    footprint: Number(spec?.footprint?.area_ft2 || 0),
    siding_front: Number(spec?.siding_by_elevation_ft2?.front || 0),
    siding_right: Number(spec?.siding_by_elevation_ft2?.right || 0),
    siding_back: Number(spec?.siding_by_elevation_ft2?.back || 0),
    siding_left: Number(spec?.siding_by_elevation_ft2?.left || 0),
    siding_total: 0,
    brick_total: typeof spec?.brick_facets_ft2?.total === 'number' ? Number(spec?.brick_facets_ft2?.total) : 0,
    openings_total: Number(spec?.openings?.doors_ft2 || 0) + Number(spec?.openings?.windows_total_ft2 || 0),
    soffit_total: Number(spec?.soffit?.summary?.area_ft2 || 0),
    eaves: Number(spec?.roof?.lengths_ft?.eaves || 0),
    ridges: Number(spec?.roof?.lengths_ft?.ridges || 0),
    hips: Number(spec?.roof?.lengths_ft?.hips || 0),
    valleys: Number(spec?.roof?.lengths_ft?.valleys || 0),
  };
  target.siding_total = target.siding_front + target.siding_right + target.siding_back + target.siding_left;

  let footprint_ft2 = 0;
  const roofFacetAreas: Record<string, number> = {};
  const roofFacetSpec: Record<string, number> = spec?.roof?.facets || {};
  let sidingBySide: Record<string, number> = { front: 0, right: 0, back: 0, left: 0 };
  let brick_ft2 = 0;
  let openings_ft2 = 0;
  let soffit_ft2 = 0;
  const edgeTotals: Record<string, number> = { eaves: 0, ridges: 0, hips: 0, valleys: 0 };

  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if ((obj as any).isMesh) {
      const mesh = obj as THREE.Mesh;
      const kind = (mesh.userData?.kind) as string | undefined;
      if (obj.name === 'footprintSlab') {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const w = size.x / FT_TO_M;
        const d = size.z / FT_TO_M;
        footprint_ft2 = w * d;
      } else if (kind === 'roofFacet') {
        const id = String(mesh.userData?.id || '');
        const area = areaOfTopFace(mesh);
        roofFacetAreas[id] = area;
      } else if (kind === 'siding') {
        const side = String(mesh.userData?.side || '');
        const area = areaOfTopFace(mesh);
        if (side) sidingBySide[side] = (sidingBySide[side] || 0) + area;
      } else if (kind === 'brick') {
        brick_ft2 += areaOfTopFace(mesh);
      } else if (kind === 'opening') {
        openings_ft2 += areaOfTopFace(mesh);
      } else if (kind === 'soffit') {
        soffit_ft2 += areaOfTopFace(mesh);
      }
    } else if ((obj as any).isLine) {
      const line = obj as THREE.Line;
      if (line.userData?.kind === 'roofEdge') {
        const ek = String(line.userData?.edgeKind || '');
        edgeTotals[ek] = (edgeTotals[ek] || 0) + lengthOfLine(line);
      }
    }
  });

  // Compute deltas
  function delta(key: string, actual: number, targetVal: number) {
    if (!targetVal) { deltas[key] = 0; return; }
    deltas[key] = Math.abs((actual - targetVal) / targetVal);
  }

  delta('footprint', footprint_ft2, target.footprint);
  // Roof facets per id
  Object.entries(roofFacetSpec).forEach(([id, t]) => {
    const a = roofFacetAreas[id] || 0;
    delta(`roof_${id}`, a, Number(t));
  });
  // Siding per side
  delta('siding_front', sidingBySide.front || 0, target.siding_front);
  delta('siding_right', sidingBySide.right || 0, target.siding_right);
  delta('siding_back', sidingBySide.back || 0, target.siding_back);
  delta('siding_left', sidingBySide.left || 0, target.siding_left);
  // Brick and openings and soffit
  delta('brick_total', brick_ft2, target.brick_total);
  delta('openings_total', openings_ft2, target.openings_total);
  delta('soffit_total', soffit_ft2, target.soffit_total);
  // Edges
  delta('eaves', edgeTotals.eaves || 0, target.eaves);
  delta('ridges', edgeTotals.ridges || 0, target.ridges);
  delta('hips', edgeTotals.hips || 0, target.hips);
  delta('valleys', edgeTotals.valleys || 0, target.valleys);

  const pass = Object.values(deltas).every((v) => v <= tolerance);
  return { pass, deltas, edges: edgeTotals };
}
