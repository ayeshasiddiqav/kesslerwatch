"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { CatalogEntry } from "@/lib/api";
import { PALETTE } from "@/lib/theme";
import { CameraRig, HOME_DISTANCE, type Insets } from "./CameraRig";
import { Earth } from "./Earth";
import { MilkyWay } from "./MilkyWay";
import { ObjectField, type LayerVisibility } from "./ObjectField";
import { SelectedOrbit } from "./SelectedOrbit";
import { ShellRings } from "./ShellRings";
import { Starfield } from "./Starfield";

export interface SceneProps {
  catalog: CatalogEntry[];
  layers: LayerVisibility;
  selected: CatalogEntry | null;
  selectedAt: number;
  alerts: ReadonlySet<number>;
  onSelect: (norad: number) => void;
  insets: Insets;
}

export default function Scene({ catalog, layers, selected, selectedAt, alerts, onSelect, insets }: SceneProps) {
  return (
    <div className="fixed inset-0 cursor-grab touch-none active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, HOME_DISTANCE * 0.28, HOME_DISTANCE * 0.96], fov: 42, near: 0.005, far: 1200 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        aria-label="3D view of Earth and every tracked object in orbit"
      >
        <color attach="background" args={[PALETTE.space]} />
        <MilkyWay />
        <Starfield />
        <Suspense fallback={null}>
          <Earth />
        </Suspense>
        <ShellRings />
        <ObjectField
          catalog={catalog}
          layers={layers}
          selected={selected?.norad ?? null}
          alerts={alerts}
          onSelect={onSelect}
        />
        <SelectedOrbit entry={selected} at={selectedAt} />
        <CameraRig target={selected} targetAt={selectedAt} insets={insets} />
      </Canvas>
    </div>
  );
}
