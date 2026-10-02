"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { earthRotation, sunDirection } from "@/lib/orbit";

const earthVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

// Quiet, editorial Earth: slightly desaturated day side, warm gold city lights,
// a soft terminator and a faint ice-blue limb.
const earthFragment = /* glsl */ `
  uniform vec3 uSun;
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  varying vec3 vN;
  varying vec3 vW;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vN);
    float day = dot(n, uSun);
    float lit = smoothstep(-0.1, 0.3, day);

    vec3 dayCol = texture2D(uDay, vUv).rgb;
    float lum = dot(dayCol, vec3(0.299, 0.587, 0.114));
    dayCol = mix(vec3(lum), dayCol, 0.75) * (0.12 + 0.95 * max(day, 0.0));
    vec3 lights = texture2D(uNight, vUv).rgb * vec3(0.85, 0.72, 0.5) * 1.1;
    vec3 col = mix(vec3(0.006, 0.008, 0.014) + lights, dayCol, lit);

    // Soft warm band along the terminator
    col += vec3(0.85, 0.62, 0.42) * exp(-pow(day * 10.0, 2.0)) * 0.06;

    float fr = pow(1.0 - max(dot(n, normalize(cameraPosition - vW)), 0.0), 3.0);
    col += vec3(0.42, 0.68, 0.95) * fr * 0.55 * (0.45 + 0.55 * lit);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const atmosVertex = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosFragment = /* glsl */ `
  varying vec3 vN;
  void main() {
    float i = pow(max(0.0, 0.7 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.0);
    gl_FragColor = vec4(vec3(0.3, 0.62, 1.0) * i * 1.6, 1.0);
  }
`;

// Moving aura ported from design/designreference.html (its "thermo" shell). The reference
// scaled speed/intensity with Kp; there is no space-weather feed yet, so this is purely
// decorative and fixed at the reference's default (Kp 3 -> k = 0.33).
const AURA_K = 0.33;
const AURA_STRENGTH = 0.2; // barely visible hint; the atmosphere rim does the real separation
const AURA_RADIUS = 1 + 500 / 6378.137;

const auraVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vL;
  void main() {
    vL = position;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = cameraPosition - w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const auraFragment = /* glsl */ `
  uniform float uK;
  uniform float uTime;
  uniform float uStrength;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vL;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
    float lat = asin(normalize(vL).y);
    float band = 0.5 + 0.5 * sin(lat * 24.0 - uTime * (0.5 + 3.0 * uK));
    float a = f * (0.05 + 0.4 * uK * uK) * (0.55 + 0.45 * band);
    gl_FragColor = vec4(vec3(0.35, 0.72, 1.0) * a * uStrength, 1.0);
  }
`;

const SUN_UPDATE_EVERY_S = 1;

export function Earth() {
  const [day, night] = useTexture(
    ["/textures/earth_atmos_2048.jpg", "/textures/earth_lights_2048.png"],
    ([d, n]) => {
      d.colorSpace = THREE.SRGBColorSpace;
      n.colorSpace = THREE.SRGBColorSpace;
      d.anisotropy = 8;
    },
  );

  const earthRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const auraRef = useRef<THREE.ShaderMaterial>(null);
  const auraUniforms = useMemo(() => ({ uK: { value: AURA_K }, uTime: { value: 0 }, uStrength: { value: AURA_STRENGTH } }), []);
  const uniforms = useMemo(
    () => ({
      uDay: { value: day },
      uNight: { value: night },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
    }),
    [day, night],
  );

  const lastUpdate = useRef(-Infinity);
  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    const t = clock.getElapsedTime();
    if (auraRef.current) auraRef.current.uniforms.uTime.value = t;
    if (t - lastUpdate.current < SUN_UPDATE_EVERY_S) return;
    lastUpdate.current = t;
    const now = new Date();
    if (earthRef.current) earthRef.current.rotation.y = earthRotation(now);
    (mat.uniforms.uSun.value as THREE.Vector3).set(...sunDirection(now));
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 128, 96]} />
        <shaderMaterial ref={matRef} vertexShader={earthVertex} fragmentShader={earthFragment} uniforms={uniforms} />
      </mesh>
      <mesh scale={AURA_RADIUS}>
        <sphereGeometry args={[1, 96, 64]} />
        <shaderMaterial
          ref={auraRef}
          vertexShader={auraVertex}
          fragmentShader={auraFragment}
          uniforms={auraUniforms}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[1, 64, 48]} />
        <shaderMaterial
          vertexShader={atmosVertex}
          fragmentShader={atmosFragment}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
