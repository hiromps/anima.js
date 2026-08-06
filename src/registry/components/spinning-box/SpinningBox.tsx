"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

export type SpinningBoxProps = {
  color?: string;
  /** Rotation speed multiplier. */
  speed?: number;
  wireframe?: boolean;
  scale?: number;
};

/**
 * Scene content only — render inside a react-three-fiber <Canvas>.
 */
export function SpinningBox({
  color = "#8b5cf6",
  speed = 1,
  wireframe = false,
  scale = 1,
}: SpinningBoxProps) {
  const mesh = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += delta * speed * 0.6;
    mesh.current.rotation.y += delta * speed;
  });

  return (
    <mesh ref={mesh} scale={scale}>
      <boxGeometry args={[1.6, 1.6, 1.6]} />
      <meshStandardMaterial color={color} wireframe={wireframe} />
    </mesh>
  );
}

export default SpinningBox;
