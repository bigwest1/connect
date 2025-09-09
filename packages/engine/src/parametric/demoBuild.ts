import * as THREE from 'three';

const FT_TO_M = 0.3048;

export function solveRectangleFromPerimeterArea(perimeter_ft: number, area_ft2: number) {
  const s = perimeter_ft / 2;
  const disc = s * s - 4 * area_ft2;
  const w = (s + Math.sqrt(Math.max(0, disc))) / 2;
  const d = s - w;
  return w >= d ? { w, d } : { w: d, d: w };
}

export function makePanel(width_ft: number, height_ft: number, thickness_ft = 0.1, bevel_ft = 0.05, color = 0x777777) {
  const shape = new THREE.Shape();
  const w = width_ft * FT_TO_M;
  const h = height_ft * FT_TO_M;
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: Math.max(0.001, thickness_ft * FT_TO_M),
    bevelEnabled: true,
    bevelThickness: Math.min(0.01, bevel_ft * FT_TO_M),
    bevelSize: 0,
    bevelSegments: 2
  });
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.z -= (thickness_ft * FT_TO_M) / 2;
  return mesh;
}

export function buildDemoHouse(metrics: { stories: number; footprint: { perimeter_ft: number; area_ft2: number } }, spec: any) {
  const group = new THREE.Group();
  const dims = solveRectangleFromPerimeterArea(metrics.footprint.perimeter_ft, metrics.footprint.area_ft2);

  // Footprint slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(dims.w * FT_TO_M, 0.05, dims.d * FT_TO_M), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
  slab.name = 'footprintSlab';
  slab.receiveShadow = true;
  group.add(slab);

  // Roof facets ring (slightly inward so soffits sit just under the eave)
  const roofGroup = new THREE.Group();
  roofGroup.name = 'roofFacets';
  const pitch = Math.atan(6/12);
  const facets = Object.entries(spec?.roof?.facets || {}).map(([id, area]) => ({ id, area: Number(area) }));
  const r = Math.max(dims.w, dims.d) * FT_TO_M * 0.5;
  facets.forEach((f, i) => {
    const size = Math.sqrt(f.area); // ft
    const m = makePanel(size, size, 0.05, 0.02, 0x555555);
    m.userData = { kind: 'roofFacet', id: f.id, area_ft2: f.area };
    const ang = (i / Math.max(1, facets.length)) * Math.PI * 2;
    m.rotation.x = -pitch;
    m.position.set(Math.cos(ang) * r, 2.8 * metrics.stories, Math.sin(ang) * r);
    roofGroup.add(m);
  });
  group.add(roofGroup);

  // Roof edges (total lengths)
  const edges = spec?.roof?.lengths_ft || {};
  const edgeKinds = ['eaves','ridges','hips','valleys'] as const;
  edgeKinds.forEach((k, idx) => {
    const len = Number(edges[k] || 0);
    if (!len) return;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 3.0 * metrics.stories + idx*0.05, 0),
      new THREE.Vector3(len * FT_TO_M, 3.0 * metrics.stories + idx*0.05, 0)
    ]);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x00ffff }));
    line.userData = { kind: 'roofEdge', edgeKind: k };
    group.add(line);
  });

  // Siding facets placed per elevation totals greedily
  const sidingGroup = new THREE.Group();
  sidingGroup.name = 'siding';
  const sides = [
    { key: 'front', normal: new THREE.Vector3(0,0,1), offset: new THREE.Vector3(0, 1.5 * metrics.stories, (dims.d/2 + 0.05) * FT_TO_M) },
    { key: 'right', normal: new THREE.Vector3(1,0,0), offset: new THREE.Vector3((dims.w/2 + 0.05) * FT_TO_M, 1.5 * metrics.stories, 0) },
    { key: 'back', normal: new THREE.Vector3(0,0,-1), offset: new THREE.Vector3(0, 1.5 * metrics.stories, -(dims.d/2 + 0.05) * FT_TO_M) },
    { key: 'left', normal: new THREE.Vector3(-1,0,0), offset: new THREE.Vector3(-(dims.w/2 + 0.05) * FT_TO_M, 1.5 * metrics.stories, 0) },
  ];
  const targets = spec?.siding_by_elevation_ft2 || {};
  const remaining: Record<string, number> = { front: Number(targets.front||0), right: Number(targets.right||0), back: Number(targets.back||0), left: Number(targets.left||0) };
  (spec?.siding_facets || []).forEach((f: any) => {
    const area = Number(f.area_ft2||0);
    // choose side with largest remaining
    const side = sides.sort((a,b)=> (remaining[b.key]||0) - (remaining[a.key]||0))[0];
    const size = Math.sqrt(Math.max(1e-6, area));
    const panel = makePanel(size, size, 0.02, 0.01, 0x778899);
    panel.userData = { kind: 'siding', id: f.id, side: side.key };
    panel.rotation.y = Math.atan2(side.normal.z, side.normal.x);
    panel.position.copy(side.offset);
    // Distribute openings for this facet
    const count = Number(f.openings || 0);
    if (count > 0) {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const margin = 0.15 * size; // ft
      const cellW = (size - margin * 2) / cols;
      const cellH = (size - margin * 2) / rows;
      for (let i = 0; i < count; i++) {
        const cx = i % cols;
        const cy = Math.floor(i / cols);
        const w_ft = Math.max(2.0, Math.min(4.0, cellW * 0.8));
        const h_ft = Math.max(3.0, Math.min(5.0, cellH * 0.7));
        const cut = makePanel(w_ft, h_ft, 0.01, 0.003, 0x222222);
        cut.userData = { kind: 'openingOnSiding', facetId: f.id, index: i };
        // Place within grid cell at plausible sill height
        const localX = -size/2 + margin + cx * cellW + cellW/2;
        const localY = -size/2 + margin + cy * cellH + Math.min(cellH*0.7, h_ft*0.5) + 1.0; // lift a bit
        cut.position.set(localX * FT_TO_M, localY * FT_TO_M, 0.011 * FT_TO_M);
        panel.add(cut);
      }
    }
    sidingGroup.add(panel);
    remaining[side.key] = Math.max(0, remaining[side.key] - area);
  });
  group.add(sidingGroup);

  // Brick facets ring
  const brick = spec?.brick_facets_ft2 || {};
  const brickEntries = Object.entries(brick).filter(([k]) => !['total','small_facets'].includes(k));
  const rad = Math.max(dims.w, dims.d) * FT_TO_M * 0.55;
  brickEntries.forEach(([k, val], i) => {
    const size = Math.sqrt(Number(val||1));
    const panel = makePanel(size, size, 0.02, 0.008, 0x8b4513);
    panel.userData = { kind: 'brick', id: k };
    const ang = (i / Math.max(1, brickEntries.length)) * Math.PI * 2;
    panel.position.set(Math.cos(ang) * rad, 0.5 * metrics.stories, Math.sin(ang) * rad);
    panel.rotation.y = ang + Math.PI/2;
    group.add(panel);
  });

  // Soffit panels ring
  const soff = spec?.soffit?.breakdown || [];
  const soffRad = Math.max(dims.w, dims.d) * FT_TO_M * 0.48; // tuck just under roof ring
  soff.forEach((row: any, i: number) => {
    const length_ft = Number(row.length_ft || 0);
    const depth_ft = Number(row.depth_in || 0) / 12;
    const panel = makePanel(length_ft, depth_ft, 0.01, 0.003, 0xd3d3d3);
    panel.userData = { kind: 'soffit', index: i };
    const ang = (i / Math.max(1, soff.length)) * Math.PI * 2;
    panel.position.set(Math.cos(ang) * soffRad, 2.6 * metrics.stories, Math.sin(ang) * soffRad);
    panel.rotation.y = ang + Math.PI/2;
    group.add(panel);
  });

  // Openings panels (doors + windows) for area check
  const openings = new THREE.Group();
  openings.name = 'openings';
  const allDoors = (spec?.openings?.doors || []) as any[];
  const allWindows = (spec?.openings?.windows || []) as any[];
  const items = [
    ...allDoors.map(d => ({ id: d.id, w_in: d.w_in, h_in: d.h_in })),
    ...allWindows.map(w => ({ id: w.id, w_in: w.w_in, h_in: w.h_in }))
  ];
  items.forEach((it, i) => {
    const w_ft = Number(it.w_in||0)/12;
    const h_ft = Number(it.h_in||0)/12;
    const panel = makePanel(w_ft, h_ft, 0.005, 0.002, 0x444444);
    panel.userData = { kind: 'opening', id: it.id };
    const ang = (i / Math.max(1, items.length)) * Math.PI * 2;
    panel.position.set(Math.cos(ang) * (rad*0.8), 1.2, Math.sin(ang) * (rad*0.8));
    panel.rotation.y = ang + Math.PI/2;
    openings.add(panel);
  });
  group.add(openings);

  return { group, dims };
}
