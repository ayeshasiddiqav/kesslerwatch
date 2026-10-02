"use client";

import { TrackballControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ComponentRef } from "react";
import type { CatalogEntry } from "@/lib/api";
import { positionAt, toSatrec } from "@/lib/orbit";

export const HOME_DISTANCE = 3.9;
const FLY_ALTITUDE = 0.75; // Earth radii above the selected object
const FLY_MS = 1800;
const AUTO_ROTATE_RAD_S = 0.035;
const AUTO_ROTATE_RESUME_S = 2.5;
const AUTO_ROTATE_RAMP_S = 2.5;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const GLOBE_MARGIN = 1.09; // just enough room for the atmosphere rim around the unit sphere
const MOBILE_BREAKPOINT = 860; // below this, side panels overlay instead of reserving space

/** Screen-space room (px) reserved by HUD around the globe. */
export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

interface Fly {
  t0: number;
  dur: number;
  fromDir: THREE.Vector3;
  fromDist: number;
  toDir: THREE.Vector3;
  toDist: number;
}

/**
 * Trackball camera (free rotation in any direction + zoom), slow auto-rotate that pauses
 * while the user interacts, eased fly-to on selection and gentle follow of the selected object.
 */
export function CameraRig({
  target,
  targetAt,
  insets,
}: {
  target: CatalogEntry | null;
  targetAt: number;
  insets: Insets;
}) {
  const controls = useRef<ComponentRef<typeof TrackballControls>>(null);
  const { camera } = useThree();
  const interacting = useRef(false);
  const lastInteraction = useRef(-Infinity);
  const fly = useRef<Fly | null>(null);
  const followDir = useRef<THREE.Vector3 | null>(null);
  const reducedMotion = useRef(false);
  const satrec = useMemo(() => (target ? toSatrec(target) : null), [target]);
  const tmp = useMemo(() => ({ q: new THREE.Quaternion(), v: new THREE.Vector3() }), []);
  const size = useThree((s) => s.size);
  const home = useRef(HOME_DISTANCE);
  const initialized = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => (reducedMotion.current = e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Start a fly-to whenever the selection changes; fly home when it clears.
  useEffect(() => {
    const fromDir = camera.position.clone().normalize();
    const fromDist = camera.position.length();
    let toDir: THREE.Vector3;
    let toDist: number;
    if (satrec) {
      const p = positionAt(satrec, new Date());
      if (!p) return;
      const v = new THREE.Vector3(...p);
      toDir = v.clone().normalize();
      toDist = v.length() + FLY_ALTITUDE;
      followDir.current = toDir.clone();
    } else {
      followDir.current = null;
      if (Math.abs(fromDist - home.current) < 0.05) return;
      toDir = fromDir.clone();
      toDist = home.current;
    }
    fly.current = {
      t0: performance.now(),
      dur: reducedMotion.current ? 1 : FLY_MS,
      fromDir,
      fromDist,
      toDir,
      toDist,
    };
  }, [satrec, targetAt, camera]);

  // Fit the globe (plus aura) into the free area between the HUD panels and centre it there.
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const narrow = size.width < MOBILE_BREAKPOINT;
    const left = narrow ? 16 : insets.left;
    const right = narrow ? 16 : insets.right;
    const freeW = size.width - left - right;
    const freeH = size.height - insets.top - insets.bottom;
    // Shift the projection so the globe sits in the middle of the free area.
    persp.setViewOffset(size.width, size.height, -(left - right) / 2, -(insets.top - insets.bottom) / 2, size.width, size.height);
    persp.updateProjectionMatrix();

    const rpx = Math.max(60, Math.min(freeW, freeH) / 2 / GLOBE_MARGIN);
    const focal = size.height / 2 / Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2);
    const dist = THREE.MathUtils.clamp(1 / Math.sin(Math.atan(rpx / focal)), 1.5, 12);
    home.current = dist;

    if (!initialized.current) {
      camera.position.setLength(dist);
      initialized.current = true;
      return;
    }
    // Ease to the new framing unless an object is selected or we are already there.
    if (followDir.current || Math.abs(camera.position.length() - dist) / dist < 0.02) return;
    const dir = camera.position.clone().normalize();
    fly.current = {
      t0: performance.now(),
      dur: reducedMotion.current ? 1 : FLY_MS,
      fromDir: dir,
      fromDist: camera.position.length(),
      toDir: dir.clone(),
      toDist: dist,
    };
  }, [size.width, size.height, insets.left, insets.right, insets.top, insets.bottom, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const now = performance.now();

    const f = fly.current;
    if (f) {
      c.enabled = false;
      const k = Math.min(1, (now - f.t0) / f.dur);
      const e = easeInOutCubic(k);
      const dir = tmp.v.copy(f.fromDir).lerp(f.toDir, e);
      if (dir.lengthSq() < 1e-6) dir.copy(f.toDir);
      dir.normalize();
      const dist = f.fromDist * Math.pow(f.toDist / f.fromDist, e);
      camera.position.copy(dir.multiplyScalar(dist));
      camera.lookAt(0, 0, 0);
      if (k >= 1) {
        fly.current = null;
        c.enabled = true;
        lastInteraction.current = now / 1000;
      }
      return;
    }

    // Follow: rotate the camera with the selected object so it stays framed.
    if (satrec && followDir.current) {
      const p = positionAt(satrec, new Date());
      if (p) {
        const dir = new THREE.Vector3(...p).normalize();
        tmp.q.setFromUnitVectors(followDir.current, dir);
        camera.position.applyQuaternion(tmp.q);
        camera.up.applyQuaternion(tmp.q);
        followDir.current.copy(dir);
      }
      return;
    }

    // Auto-rotate about the polar axis, easing back in after interaction.
    if (reducedMotion.current || interacting.current) return;
    const idle = now / 1000 - lastInteraction.current - AUTO_ROTATE_RESUME_S;
    if (idle <= 0) return;
    const ramp = Math.min(1, idle / AUTO_ROTATE_RAMP_S);
    const angle = AUTO_ROTATE_RAD_S * dt * ramp * ramp;
    camera.position.applyAxisAngle(Y_AXIS, angle);
    camera.up.applyAxisAngle(Y_AXIS, angle);
  });

  return (
    <TrackballControls
      ref={controls}
      noPan
      rotateSpeed={2.2}
      zoomSpeed={0.6}
      dynamicDampingFactor={0.06}
      minDistance={1.15}
      maxDistance={24}
      onStart={() => {
        interacting.current = true;
        fly.current = null;
      }}
      onEnd={() => {
        interacting.current = false;
        lastInteraction.current = performance.now() / 1000;
      }}
    />
  );
}
