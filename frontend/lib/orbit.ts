import { gstime, propagate, sunPos, jday, twoline2satrec, type SatRec } from "satellite.js";

/** Earth equatorial radius in km. Scene units are Earth radii. */
export const R_EARTH_KM = 6378.137;

export type Vec3 = [number, number, number];

export function toSatrec(tle: { tle1: string; tle2: string }): SatRec | null {
  try {
    return twoline2satrec(tle.tle1, tle.tle2);
  } catch {
    return null;
  }
}

export function toSatrecs(tles: { tle1: string; tle2: string }[]): (SatRec | null)[] {
  return tles.map(toSatrec);
}

/** ECI km (z = north) -> scene Earth radii with +Y up: (x, z, -y). */
function eciToScene(p: { x: number; y: number; z: number }): Vec3 {
  return [p.x / R_EARTH_KM, p.z / R_EARTH_KM, -p.y / R_EARTH_KM];
}

/** Scene-space position at `date`, or null if SGP4 fails (e.g. decayed). */
export function positionAt(satrec: SatRec, date: Date): Vec3 | null {
  const p = propagate(satrec, date)?.position;
  if (!p || typeof p === "boolean" || !Number.isFinite(p.x)) return null;
  return eciToScene(p);
}

/**
 * Propagate all satrecs to `date` and write scene-space positions into `out`
 * (length 3*N). `ok[i]` is 1 where propagation succeeded.
 */
export function propagateAll(satrecs: (SatRec | null)[], date: Date, out: Float32Array, ok: Uint8Array): void {
  for (let i = 0; i < satrecs.length; i++) {
    const s = satrecs[i];
    const v = s ? positionAt(s, date) : null;
    if (!v) {
      ok[i] = 0;
      continue;
    }
    ok[i] = 1;
    out[i * 3] = v[0];
    out[i * 3 + 1] = v[1];
    out[i * 3 + 2] = v[2];
  }
}

/** Orbital period in minutes from SGP4 mean motion (rad/min). */
export function periodMinutes(satrec: SatRec): number {
  return (2 * Math.PI) / satrec.no;
}

export function inclinationDeg(satrec: SatRec): number {
  return (satrec.inclo * 180) / Math.PI;
}

/** One full revolution starting at `date`, sampled `n` times, in scene space. */
export function orbitPath(satrec: SatRec, date: Date, n = 256): Vec3[] {
  const periodMs = periodMinutes(satrec) * 60_000;
  const pts: Vec3[] = [];
  for (let k = 0; k <= n; k++) {
    const p = positionAt(satrec, new Date(date.getTime() + (k / n) * periodMs));
    if (p) pts.push(p);
  }
  return pts;
}

/** Greenwich sidereal angle (rad); rotating the Earth mesh by this about +Y aligns ECEF with ECI. */
export function earthRotation(date: Date): number {
  return gstime(date);
}

/** Unit vector toward the Sun in scene space. */
export function sunDirection(date: Date): Vec3 {
  const { rsun } = sunPos(jday(date));
  const [x, y, z] = rsun; // ECI, AU
  const v: Vec3 = [x, z, -y];
  const n = Math.hypot(...v);
  return [v[0] / n, v[1] / n, v[2] / n];
}

export function medianTleAgeHours(epochs: string[], now: Date): number | null {
  if (epochs.length === 0) return null;
  const ages = epochs.map((e) => (now.getTime() - Date.parse(e)) / 3.6e6).sort((a, b) => a - b);
  return ages[Math.floor(ages.length / 2)];
}

/** Assumed isotropic 1-sigma position error (CLAUDE.md physics rules): 0.5 km + 1 km per day of TLE age. */
export function assumedSigmaKm(tleAgeDays: number): number {
  return 0.5 + 1.0 * Math.abs(tleAgeDays);
}
