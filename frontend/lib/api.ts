export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface CatalogEntry {
  norad: number;
  name: string;
  group: string;
  tle1: string;
  tle2: string;
  epoch: string;
  perigee_km: number;
  apogee_km: number;
}

export async function fetchCatalog(signal?: AbortSignal): Promise<CatalogEntry[]> {
  const res = await fetch(`${API_URL}/catalog`, { signal });
  if (!res.ok) throw new Error(`/catalog ${res.status}`);
  return (await res.json()) as CatalogEntry[];
}

export type ObjectType = "payload" | "debris" | "rocket";
export const OBJECT_TYPES: ObjectType[] = ["payload", "debris", "rocket"];

/** Classify from catalog naming: CelesTrak names fragments "... DEB" and rocket bodies "... R/B". */
export function objectType(entry: CatalogEntry): ObjectType {
  if (/\bDEB\b/.test(entry.name)) return "debris";
  if (/R\/B/.test(entry.name)) return "rocket";
  return "payload";
}
