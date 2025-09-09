"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

type Pose = "front" | "front-right" | "back" | "left";

function getPose(pose: Pose) {
  // Camera distances chosen to frame the demo house consistently.
  // Focus point is slightly above ground to center the house.
  const target: [number, number, number] = [0, 1.2, 0];
  const radius = 10; // distance from center
  const height = 4;  // camera height
  switch (pose) {
    case "front": return { pos: [0, height, radius] as [number, number, number], target };
    case "front-right": return { pos: [radius * 0.75, height * 0.9, radius * 0.75] as [number, number, number], target };
    case "back": return { pos: [0, height, -radius] as [number, number, number], target };
    case "left": return { pos: [-radius, height * 0.9, 0] as [number, number, number], target };
  }
}

export function TourRig() {
  const { camera, controls } = useThree((s: any) => ({ camera: s.camera, controls: s.controls }));

  useEffect(() => {
    function applyPose(p: Pose) {
      const { pos, target } = getPose(p);
      camera.position.set(pos[0], pos[1], pos[2]);
      if ((controls as any)?.target) {
        (controls as any).target.set(target[0], target[1], target[2]);
        (controls as any).update?.();
      } else {
        camera.lookAt(target[0], target[1], target[2]);
      }
      camera.updateProjectionMatrix();
    }

    // Expose a tiny test/debug API for E2E to drive the camera deterministically.
    (window as any).__tourSetPose = (pose: Pose) => {
      // Run after current frame to avoid conflicts with Drei's Stage adjustCamera.
      requestAnimationFrame(() => requestAnimationFrame(() => applyPose(pose)));
    };

    return () => { try { delete (window as any).__tourSetPose; } catch {} };
  }, [camera, controls]);

  return null;
}

