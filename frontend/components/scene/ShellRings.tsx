"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { R_EARTH_KM, type Vec3 } from "@/lib/orbit";
import { PALETTE } from "@/lib/theme";

/** Reference altitudes (km): LEO upper bound, GNSS-like MEO, geostationary. */
const SHELLS = [
  { label: "LEO", altKm: 2000 },
  { label: "MEO", altKm: 20200 },
  { label: "GEO", altKm: 35786 },
] as const;

function circle(r: number, n = 192): Vec3[] {
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return [r * Math.cos(a), 0, r * Math.sin(a)];
  });
}

const scratch = new THREE.Vector3();

/** Label pinned to the ring's right-hand edge as seen from the camera, so it never hides behind Earth. */
function RingLabel({ r, label, altKm }: { r: number; label: string; altKm: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const right = scratch.setFromMatrixColumn(camera.matrixWorld, 0);
    right.y = 0;
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize().multiplyScalar(r);
    ref.current.position.copy(right);
  });
  return (
    <group ref={ref}>
      <Html center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap pl-10 font-sans text-[14px] text-muted">
          {label} <span className="font-mono text-[14px] text-muted/80">{altKm.toLocaleString()} km</span>
        </div>
      </Html>
    </group>
  );
}

/** Thin, faint equatorial reference rings for the LEO / MEO / GEO regimes. */
export function ShellRings() {
  const rings = useMemo(
    () => SHELLS.map((s) => ({ ...s, r: 1 + s.altKm / R_EARTH_KM, pts: circle(1 + s.altKm / R_EARTH_KM) })),
    [],
  );
  return (
    <group>
      {rings.map((s) => (
        <group key={s.label}>
          <Line points={s.pts} color={PALETTE.ivory} lineWidth={0.6} transparent opacity={0.12} depthWrite={false} />
          <RingLabel r={s.r} label={s.label} altKm={s.altKm} />
        </group>
      ))}
    </group>
  );
}
