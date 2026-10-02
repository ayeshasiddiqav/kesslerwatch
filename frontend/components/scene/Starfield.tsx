"use client";

import { useMemo } from "react";
import { PALETTE } from "@/lib/theme";

const COUNT = 6000;
const RADIUS = 150;

/** Deterministic PRNG so the starfield is stable across renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform points on a distant sphere, styled like the design reference. */
export function Starfield() {
  const positions = useMemo(() => {
    const rand = mulberry32(1408);
    const p = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const u = rand() * 2 - 1;
      const t = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      p[i * 3] = RADIUS * s * Math.cos(t);
      p[i * 3 + 1] = RADIUS * u;
      p[i * 3 + 2] = RADIUS * s * Math.sin(t);
    }
    return p;
  }, []);

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={PALETTE.ivory} size={1.1} sizeAttenuation={false} transparent opacity={0.5} />
    </points>
  );
}
