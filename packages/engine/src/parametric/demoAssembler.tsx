"use client";
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useHouse } from '../state/house';
import { buildDemoHouse } from './demoBuild';
import { usePBRMaterials } from '../materials/pbr';
import { useQuality } from '../quality/context';
import { validateScene } from './validator';

export function DemoAssembler() {
  const { metrics, spec, openingsLayout, setSpecAccurate, setAccuracyDeltas, setMeasuredEdges, inspectOverlay } = useHouse() as any;
  const built = useMemo(() => (spec ? buildDemoHouse(metrics as any, spec) : null), [metrics, spec]);
  const quality = (() => { try { return useQuality(); } catch { return null; } })();
  const tier = quality?.tier ?? 'High';
  const mats = usePBRMaterials(tier as any);

  useEffect(() => {
    if (!spec || !built) return;
    const res = validateScene(built.group, spec);
    setSpecAccurate?.(res.pass);
    setAccuracyDeltas?.(res.deltas);
    setMeasuredEdges?.(res.edges ?? null);
    try { (window as any).__specValidation = res; (window as any).__spec = spec; } catch {}
  }, [spec, built, setSpecAccurate, setAccuracyDeltas]);

  useEffect(() => {
    if (!built) return;
    // Assign curated PBR materials
    const sidingBySide: Record<string, THREE.Material> = {
      front: mats.siding.clone(),
      right: mats.siding.clone(),
      back: mats.siding.clone(),
      left: mats.siding.clone(),
    } as any;
    // Subtle per-elevation tuning
    (sidingBySide.front as any).roughness = 0.6;
    (sidingBySide.right as any).roughness = 0.65;
    (sidingBySide.back as any).roughness = 0.7;
    (sidingBySide.left as any).roughness = 0.62;

    built.group.traverse((obj: any) => {
      if (!obj.isMesh) return;
      const kind = obj.userData?.kind as string | undefined;
      if (obj.name === 'footprintSlab') obj.material = mats.concrete;
      else if (kind === 'roofFacet') obj.material = mats.asphalt;
      else if (kind === 'siding') {
        const side = obj.userData?.side as string | undefined;
        if (side && sidingBySide[side]) obj.material = sidingBySide[side]; else obj.material = mats.siding;
      } else if (kind === 'brick') obj.material = mats.brick;
      else if (kind === 'soffit') obj.material = mats.metal;
      else if (kind === 'opening') obj.material = mats.glass;
    });
  }, [built, mats]);

  // Apply openings layout overrides
  useEffect(() => {
    if (!built || !openingsLayout) return;
    built.group.traverse((obj: any) => {
      if (!obj.isMesh) return;
      if (obj.userData?.kind === 'openingOnSiding') {
        const facetId = String(obj.userData?.facetId || '');
        const index = Number(obj.userData?.index || 0);
        const list = openingsLayout[facetId];
        if (!list || !list[index]) return;
        // Reposition relative to parent panel using normalized coords (-1..1)
        const parent = obj.parent as THREE.Mesh;
        const bbox = new THREE.Box3().setFromObject(parent);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const halfW = size.x/2; const halfH = size.y/2;
        const nx = Math.max(-0.98, Math.min(0.98, list[index].x));
        const ny = Math.max(-0.98, Math.min(0.98, list[index].y));
        obj.position.x = nx * halfW;
        obj.position.y = ny * halfH;
      }
    });
  }, [built, openingsLayout]);

  // Toggle roof edge linework overlay
  useEffect(() => {
    if (!built) return;
    const edgeColors: Record<string, number> = { eaves: 0xfbbf24, ridges: 0xef4444, hips: 0x60a5fa, valleys: 0x10b981 };
    built.group.traverse((obj: any) => {
      if ((obj as any).isLine && obj.userData?.kind === 'roofEdge') {
        const kind = String(obj.userData?.edgeKind || '');
        const color = edgeColors[kind] ?? 0xffffff;
        (obj as any).material = new THREE.LineBasicMaterial({ color, depthTest: !inspectOverlay, transparent: true, opacity: 0.95 });
      }
    });
  }, [built, inspectOverlay]);

  if (!spec || !built) return null;
  return <primitive object={built.group} />;
}
