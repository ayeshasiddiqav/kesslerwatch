"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import type { CatalogEntry } from "@/lib/api";
import { orbitPath, toSatrec } from "@/lib/orbit";
import { PALETTE } from "@/lib/theme";

/** One revolution of the selected object's orbit as a thin gold line (SGP4-propagated from now). */
export function SelectedOrbit({ entry, at }: { entry: CatalogEntry | null; at: number }) {
  const points = useMemo(() => {
    if (!entry) return null;
    const s = toSatrec(entry);
    if (!s) return null;
    const pts = orbitPath(s, new Date(at));
    return pts.length > 2 ? pts : null;
  }, [entry, at]);

  if (!points) return null;
  return <Line points={points} color={PALETTE.gold} lineWidth={1} transparent opacity={0.75} depthWrite={false} />;
}
