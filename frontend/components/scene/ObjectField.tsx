"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { objectType, type CatalogEntry, type ObjectType } from "@/lib/api";
import { propagateAll, toSatrecs } from "@/lib/orbit";
import { PALETTE, TYPE_COLORS } from "@/lib/theme";

// Quad diameter in Earth radii; the soft falloff makes the visible core much smaller.
const TYPE_SIZE: Record<ObjectType, number> = { payload: 0.022, debris: 0.016, rocket: 0.024 };
const PROPAGATE_EVERY_S = 1;
const PICK_RADIUS_PX = 14;
const CLICK_SLOP_PX = 5;

export type LayerVisibility = Record<ObjectType, boolean>;

const FLAG_NONE = 0;
const FLAG_ALERT = 1;
const FLAG_SELECTED = 2;

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aFlag;
  uniform float uTime;
  uniform vec3 uGold;
  uniform vec3 uRose;
  varying vec3 vColor;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float s = instanceMatrix[0][0];
    vec4 mv = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0);
    vec3 c = aColor;
    float k = 1.0;
    if (aFlag > 1.5) { c = uGold; k = 2.4; }
    else if (aFlag > 0.5) { c = uRose; k = 1.9 + 0.5 * sin(uTime * 1.6); }
    // Keep points small when the camera is close.
    float distScale = clamp(-mv.z / 3.5, 0.2, 1.6);
    mv.xy += position.xy * s * k * distScale;
    vColor = c;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = 1.0 - d;
    float intensity = pow(a, 4.0) * 1.3 + a * a * 0.22;
    gl_FragColor = vec4(vColor * intensity, 1.0);
    #include <colorspace_fragment>
  }
`;

interface Props {
  catalog: CatalogEntry[];
  layers: LayerVisibility;
  selected: number | null;
  alerts: ReadonlySet<number>;
  onSelect: (norad: number) => void;
}

/** All catalog objects rendered as ONE InstancedMesh of camera-facing glow sprites. */
export function ObjectField(props: Props) {
  if (props.catalog.length === 0) return null;
  // key forces a fresh InstancedMesh (new buffer sizes) when the catalog changes
  return <Instances key={props.catalog.length} {...props} />;
}

function Instances({ catalog, layers, selected, alerts, onSelect }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const count = catalog.length;
  const { camera, gl } = useThree();

  const satrecs = useMemo(() => toSatrecs(catalog), [catalog]);
  const types = useMemo(() => catalog.map(objectType), [catalog]);
  const sizes = useMemo(() => Float32Array.from(types, (t) => (layers[t] ? TYPE_SIZE[t] : 0)), [types, layers]);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const ok = useMemo(() => new Uint8Array(count), [count]);

  const colorAttr = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const cache = new Map<ObjectType, THREE.Color>();
    types.forEach((t, i) => {
      if (!cache.has(t)) cache.set(t, new THREE.Color(TYPE_COLORS[t]));
      cache.get(t)!.toArray(arr, i * 3);
    });
    return new THREE.InstancedBufferAttribute(arr, 3);
  }, [types, count]);

  const flagAttr = useMemo(() => new THREE.InstancedBufferAttribute(new Float32Array(count), 1), [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGold: { value: new THREE.Color(PALETTE.gold) },
      uRose: { value: new THREE.Color(PALETTE.rose) },
    }),
    [],
  );

  // Flags: selected (gold) beats alert (rose pulse).
  useEffect(() => {
    const attr = meshRef.current?.geometry.getAttribute("aFlag");
    if (!attr) return;
    const f = attr.array as Float32Array;
    catalog.forEach((c, i) => {
      f[i] = c.norad === selected ? FLAG_SELECTED : alerts.has(c.norad) ? FLAG_ALERT : FLAG_NONE;
    });
    attr.needsUpdate = true;
  }, [catalog, selected, alerts, flagAttr]);

  const lastUpdate = useRef(-Infinity);
  // Re-write matrices on the next frame whenever sizes (layer visibility) change.
  useEffect(() => {
    lastUpdate.current = -Infinity;
  }, [sizes]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;
    if (t - lastUpdate.current < PROPAGATE_EVERY_S) return;
    lastUpdate.current = t;

    propagateAll(satrecs, new Date(), positions, ok);

    // Translation + uniform scale (column-major); the shader reads scale from [0][0].
    const m = mesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const s = ok[i] ? sizes[i] : 0;
      const o = i * 16;
      m.fill(0, o, o + 16);
      m[o] = s;
      m[o + 5] = s;
      m[o + 10] = s;
      m[o + 12] = positions[i * 3];
      m[o + 13] = positions[i * 3 + 1];
      m[o + 14] = positions[i * 3 + 2];
      m[o + 15] = 1;
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  // Screen-space picking: nearest visible point within PICK_RADIUS_PX, skipping ones behind Earth.
  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number } | null = null;
    const v = new THREE.Vector3();
    const dir = new THREE.Vector3();

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP_PX) return;
      down = null;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cam = camera.position;
      let best = -1;
      let bestD = PICK_RADIUS_PX;
      for (let i = 0; i < count; i++) {
        if (!ok[i] || sizes[i] === 0) continue;
        v.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        // Occlusion by the unit Earth sphere along the camera ray.
        dir.copy(v).sub(cam);
        const len = dir.length();
        dir.divideScalar(len);
        const b = cam.dot(dir);
        const disc = b * b - (cam.lengthSq() - 1);
        if (disc > 0) {
          const tHit = -b - Math.sqrt(disc);
          if (tHit > 0 && tHit < len) continue;
        }
        v.project(camera);
        if (v.z > 1) continue;
        const sx = (v.x * 0.5 + 0.5) * rect.width;
        const sy = (-v.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(sx - px, sy - py);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0) onSelect(catalog[best].norad);
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [gl, camera, count, ok, sizes, positions, catalog, onSelect]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]}>
        <primitive attach="attributes-aColor" object={colorAttr} />
        <primitive attach="attributes-aFlag" object={flagAttr} />
      </planeGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
      />
    </instancedMesh>
  );
}
