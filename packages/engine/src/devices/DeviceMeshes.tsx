"use client";
import * as THREE from 'three';
import { useMemo, useRef, useEffect } from 'react';
import { useDevices } from '@homegraph/devices';

const FT_TO_M = 0.3048;

function solveRectangleFromPerimeterArea(perimeter_ft: number, area_ft2: number) {
  const s = perimeter_ft / 2;
  const disc = s * s - 4 * area_ft2;
  const w = (s + Math.sqrt(Math.max(0, disc))) / 2;
  const d = s - w;
  return w >= d ? { w, d } : { w: d, d: w };
}

function LightMesh({ id, x, y, z, color, on, brightness }: { id: string; x: number; y: number; z: number; color?: string; on: boolean; brightness: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const selectedId = useDevices((s) => s.selectedId);
  useEffect(() => {
    if (!ref.current) return;
    if (selectedId === id) {
      ref.current.scale.set(1.2, 1.2, 1.2);
      const t = setTimeout(() => ref.current?.scale.set(1,1,1), 500);
      return () => clearTimeout(t);
    }
  }, [selectedId, id]);
  return (
    <group position={[x, y, z]}>
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#333" emissive={on ? (color ?? '#ffd7a8') : '#111'} emissiveIntensity={on ? 1.3 * (0.2 + brightness) : 0.02} />
      </mesh>
      <mesh position={[0, -0.06, -0.05]} rotation={[Math.PI/2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </group>
  );
}

function LockMesh({ id, x, y, z, locked }: { id: string; x: number; y: number; z: number; locked: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  const selectedId = useDevices((s) => s.selectedId);
  useEffect(() => {
    if (!ref.current) return;
    if (selectedId === id) {
      ref.current.rotation.z += Math.PI/6;
      const t = setTimeout(() => { if (ref.current) ref.current.rotation.z -= Math.PI/6; }, 400);
      return () => clearTimeout(t);
    }
  }, [selectedId, id]);
  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.14, 0.02]} />
        <meshStandardMaterial color="#666" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={ref} position={[0.02, 0, 0.02]} castShadow>
        <torusGeometry args={[0.02, 0.004, 8, 24, Math.PI]} />
        <meshStandardMaterial color={locked ? '#aaa' : '#00ff88'} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function GarageDoorMesh({ id, x, y, z, open }: { id: string; x: number; y: number; z: number; open: number }) {
  const panelRef = useRef<THREE.Mesh>(null!);
  const h = 2.1; const w = 2.4; // meters
  useEffect(() => {
    if (!panelRef.current) return;
    panelRef.current.position.y = (open ?? 0) * h;
  }, [open]);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, h/2, -0.05]} castShadow>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh ref={panelRef} position={[0, 0, 0]} castShadow>
        <boxGeometry args={[w*0.98, h*0.98, 0.03]} />
        <meshStandardMaterial color="#ddd" metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  );
}

function CameraMesh({ id, x, y, z, pan=0, tilt=0, on=true }: { id: string; x: number; y: number; z: number; pan?: number; tilt?: number; on?: boolean }) {
  const yawRef = useRef<THREE.Group>(null!);
  const pitchRef = useRef<THREE.Group>(null!);
  useEffect(() => {
    if (yawRef.current) yawRef.current.rotation.y = (pan ?? 0) * (Math.PI/4);
    if (pitchRef.current) pitchRef.current.rotation.x = (tilt ?? 0) * (Math.PI/6);
  }, [pan, tilt]);
  return (
    <group position={[x, y, z]}>
      <group ref={yawRef}>
        <group ref={pitchRef}>
          <mesh castShadow>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#222" emissive={on? '#225577': '#000'} emissiveIntensity={on? 0.6: 0} />
          </mesh>
          <mesh position={[0.08, 0, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.06, 12]} />
            <meshStandardMaterial color="#444" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function OutletMesh({ id, x, y, z, on }: { id: string; x: number; y: number; z: number; on: boolean }) {
  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.12, 0.02]} />
        <meshStandardMaterial color="#999" />
      </mesh>
      <mesh position={[0, 0, 0.02]} castShadow>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshStandardMaterial color={on? '#00ff88':'#223'} emissive={on? '#00ff88':'#000'} emissiveIntensity={on? 0.8: 0} />
      </mesh>
    </group>
  );
}

export function DeviceMeshes({ perimeter_ft, area_ft2 }: { perimeter_ft: number; area_ft2: number }) {
  const devices = useDevices((s) => s.devices);
  const selId = useDevices((s) => s.selectedId);
  const dims = useMemo(() => solveRectangleFromPerimeterArea(perimeter_ft, area_ft2), [perimeter_ft, area_ft2]);
  const w = dims.w * FT_TO_M; const d = dims.d * FT_TO_M;

  function place(id: string) {
    // Heuristic positions around the footprint for demo
    if (id === 'light-1') return { x: -0.6, y: 2.2, z: d/2 + 0.03 };
    if (id === 'light-2') return { x: w/2 - 0.6, y: 2.4, z: d/2 + 0.03 };
    if (id === 'lock-1') return { x: -0.2, y: 1.0, z: d/2 + 0.02 };
    if (id === 'garage-door-1') return { x: w/2 - 1.2, y: 0.0, z: d/2 + 0.025 };
    if (id === 'camera-1') return { x: 0.0, y: 3.0, z: d/2 + 0.05 };
    if (id === 'outlet-1') return { x: -w/2 + 0.5, y: 0.5, z: -d/2 - 0.02 };
    return { x: 0, y: 0.1, z: 0 };
  }

  return (
    <group>
      {devices.map((d) => {
        const p = place(d.id);
        const s = d.state as any;
        if (d.type === 'light') return <LightMesh key={d.id} id={d.id} x={p.x} y={p.y} z={p.z} color={s.colorRGB} on={!!s.on} brightness={s.brightness ?? 0} />;
        if (d.type === 'lock') return <LockMesh key={d.id} id={d.id} x={p.x} y={p.y} z={p.z} locked={!!(s.locked ?? s.on)} />;
        if (d.type === 'garageDoor') return <GarageDoorMesh key={d.id} id={d.id} x={p.x} y={p.y} z={p.z} open={s.open ?? 0} />;
        if (d.type === 'camera') return <CameraMesh key={d.id} id={d.id} x={p.x} y={p.y} z={p.z} pan={s.pan ?? 0} tilt={s.tilt ?? 0} on={s.on ?? true} />;
        if (d.type === 'outlet') return <OutletMesh key={d.id} id={d.id} x={p.x} y={p.y} z={p.z} on={!!s.on} />;
        return null;
      })}
    </group>
  );
}
