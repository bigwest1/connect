import * as THREE from "three";
import { useMemo } from "react";
// R3F v9: prefer JSX.IntrinsicElements typing for groups
import { Tier, usePBRMaterials } from "../materials/pbr";
import { computeSeed, type SeedMetrics } from "./house.util";

export type { SeedMetrics };

export function useSeedGeometry(metrics: SeedMetrics) {
  return useMemo(() => {
    const { size, height } = computeSeed(metrics);
    const shape = new THREE.BoxGeometry(size, height, size * 0.7);
    return { geometry: shape, size, height };
  }, [metrics]);
}

export function House({ metrics, wire = false, color, tier = "High", ...props }: { metrics: SeedMetrics; wire?: boolean; color?: string; tier?: Tier } & any) {
  const { geometry, height } = useSeedGeometry(metrics);
  const mats = usePBRMaterials(tier);
  return (
    <group {...props}>
      <mesh geometry={geometry} castShadow receiveShadow>
        {wire ? (
          <meshBasicMaterial wireframe color={color ?? "#00ffff"} />
        ) : (
          // Walls: prefer siding; fallback to basic color
          <primitive object={mats.siding} attach="material" />
        )}
      </mesh>
      {/* simple roof */}
      <mesh position={[0, height / 2 + 0.3, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[geometry.parameters.width / 1.2, 0.6, 4]} />
        {wire ? (
          <meshBasicMaterial wireframe color={color ?? "#00ffff"} />
        ) : (
          <primitive object={mats.asphalt} attach="material" />
        )}
      </mesh>

      {/* a simple door (wood) */}
      {!wire && (
        <mesh position={[0, -0.1, geometry.parameters.depth / 2 + 0.001]} castShadow>
          <planeGeometry args={[0.5, 1]} />
          <primitive object={mats.wood} attach="material" />
        </mesh>
      )}

      {/* two simple windows (glass) */}
      {!wire && (
        <>
          <mesh position={[geometry.parameters.width / 2 + 0.001, 0.4, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.6, 0.4]} />
            <primitive object={mats.glass} attach="material" />
          </mesh>
          <mesh position={[-geometry.parameters.width / 2 - 0.001, 0.8, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.6, 0.4]} />
            <primitive object={mats.glass} attach="material" />
          </mesh>
        </>
      )}
    </group>
  );
}
