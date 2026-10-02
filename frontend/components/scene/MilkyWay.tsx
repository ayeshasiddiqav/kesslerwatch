"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Equatorial (RA, Dec in degrees) -> scene direction (ECI x, z, -y). */
function radec(raDeg: number, decDeg: number): THREE.Vector3 {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  return new THREE.Vector3(x, z, -y);
}

// J2000 north galactic pole and galactic centre.
const GAL_POLE = radec(192.86, 27.13);
const GAL_CENTER = radec(266.4, -28.94);
const MAX_OPACITY = 0.06; // Design specifics: faint, about half the earlier 12%

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uPole;
  uniform vec3 uCenter;
  uniform float uOpacity;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float lat = dot(d, uPole);                 // sin(galactic latitude)
    float band = exp(-pow(lat / 0.16, 2.0));
    float bulge = pow(max(dot(d, uCenter), 0.0), 6.0);
    float clouds = fbm(d * 5.0);
    float dust = smoothstep(0.45, 0.75, fbm(d * 11.0 + 3.7));  // dark lanes
    float i = band * (0.35 + 0.9 * clouds) * (1.0 - 0.55 * dust * band) + bulge * band * 0.8;
    vec3 col = mix(vec3(0.66, 0.72, 0.82), vec3(0.95, 0.87, 0.74), clamp(bulge * 2.0 + clouds * 0.3, 0.0, 1.0));
    gl_FragColor = vec4(col * i * uOpacity, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Faint procedural galactic band far behind the starfield, with slow camera-relative parallax. */
export function MilkyWay() {
  const groupRef = useRef<THREE.Group>(null);
  const uniforms = useMemo(
    () => ({
      uPole: { value: GAL_POLE },
      uCenter: { value: GAL_CENTER },
      uOpacity: { value: MAX_OPACITY },
    }),
    [],
  );

  const spherical = useMemo(() => new THREE.Spherical(), []);
  useFrame(({ camera, clock }) => {
    const g = groupRef.current;
    if (!g) return;
    spherical.setFromVector3(camera.position);
    // Lags the camera slightly so it drifts against the fixed starfield.
    g.rotation.y = spherical.theta * 0.04 + Math.sin(clock.getElapsedTime() * 0.01) * 0.02;
  });

  return (
    <group ref={groupRef}>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[400, 64, 32]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
