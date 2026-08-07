"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

/**
 * Shared <Canvas> wrapper for r3f-hosted registry components.
 * Scene components stay content-only; camera and lights live here.
 */
export function R3fHost({ children }: { children: ReactNode }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      {children}
    </Canvas>
  );
}

export default R3fHost;
