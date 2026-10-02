"use client";

import { Gauge, X } from "lucide-react";
import { useMemo, useState } from "react";
import { OBJECT_TYPES, objectType, type CatalogEntry, type ObjectType } from "@/lib/api";
import { R_EARTH_KM, assumedSigmaKm, inclinationDeg, periodMinutes, positionAt, toSatrec } from "@/lib/orbit";
import { TYPE_COLORS, TYPE_LABELS } from "@/lib/theme";
import type { LayerVisibility } from "../scene/ObjectField";
import { DASH, Row, SectionTitle, Stat } from "./Glass";
import { EdgePanel } from "./EdgePanel";

const GROUP_LABELS: Record<string, string> = {
  stations: "Space stations",
  "cosmos-1408-debris": "Cosmos 1408 ASAT test, 2021",
  "fengyun-1c-debris": "Fengyun-1C ASAT test, 2007",
  "iridium-33-debris": "Iridium 33 collision, 2009",
  "cosmos-2251-debris": "Cosmos 2251 collision, 2009",
};

const MAX_RESULTS = 5;

function Stats({ total, medianAge, now }: { total: number; medianAge: string | null; now: Date | null }) {
  return (
    <section>
      <div className="font-mono text-[15px] text-ivory">
        {now ? now.toISOString().slice(0, 19).replace("T", " ") : DASH}
        <span className="ml-1.5 text-[14px] text-muted">UTC</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
        <Stat value={total > 0 ? total.toLocaleString() : DASH} label="Objects tracked" />
        <Stat value={medianAge ?? DASH} label="Median TLE age" />
        <div>
          <div className="font-mono text-[28px] leading-none text-ivory/40">{DASH}</div>
          <div className="mt-1.5 text-[14px] leading-tight text-muted">Pairs screened / s</div>
        </div>
        <div>
          <div className="font-mono text-[28px] leading-none text-ivory/40">{DASH}</div>
          <div className="mt-1.5 text-[14px] leading-tight text-muted">High-risk alerts</div>
        </div>
      </div>
    </section>
  );
}

function Search({ catalog, onSelect }: { catalog: CatalogEntry[]; onSelect: (norad: number) => void }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (s.length < 2) return [];
    return catalog.filter((c) => c.name.toUpperCase().includes(s) || String(c.norad) === s).slice(0, MAX_RESULTS);
  }, [q, catalog]);

  return (
    <div>
      <label htmlFor="object-search" className="sr-only">
        Find an object by name or NORAD ID
      </label>
      <input
        id="object-search"
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) onSelect(results[0].norad);
        }}
        placeholder="Find by name or NORAD ID"
        autoComplete="off"
        disabled={catalog.length === 0}
        className="field"
      />
      {q.trim().length >= 2 && (
        <ul className="mt-1.5">
          {results.length === 0 && <li className="px-1 py-1 text-[14px] text-muted">No match in the loaded catalog.</li>}
          {results.map((c) => (
            <li key={c.norad}>
              <button
                type="button"
                onClick={() => onSelect(c.norad)}
                className="flex w-full items-baseline justify-between gap-3 rounded-lg px-2 py-1 text-left text-[15px] transition-colors duration-500 hover:bg-white/[0.05] hover:text-gold"
              >
                <span className="truncate">{c.name}</span>
                <span className="font-mono text-[14px] text-muted">{c.norad}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Layers({
  counts,
  layers,
  onToggle,
}: {
  counts: Record<ObjectType, number>;
  layers: LayerVisibility;
  onToggle: (t: ObjectType) => void;
}) {
  return (
    <div className="mt-3">
      {OBJECT_TYPES.map((t) => (
        <label key={t} className="flex cursor-pointer items-center gap-3 py-[3px] text-[15px]">
          <input type="checkbox" checked={layers[t]} onChange={() => onToggle(t)} className="sr-only" />
          <span
            className="h-2.5 w-2.5 rounded-full transition-opacity duration-700"
            style={{ background: TYPE_COLORS[t], boxShadow: `0 0 8px ${TYPE_COLORS[t]}`, opacity: layers[t] ? 1 : 0.2 }}
          />
          <span className={`transition-opacity duration-700 ${layers[t] ? "opacity-100" : "opacity-50"}`}>
            {TYPE_LABELS[t]}
          </span>
          <span className="ml-auto font-mono text-[15px]">{counts[t].toLocaleString()}</span>
        </label>
      ))}
    </div>
  );
}

function Selected({ entry, now, onClear }: { entry: CatalogEntry; now: Date | null; onClear: () => void }) {
  const satrec = useMemo(() => toSatrec(entry), [entry]);
  const altKm = useMemo(() => {
    if (!satrec || !now) return null;
    const p = positionAt(satrec, now);
    return p ? Math.hypot(...p) * R_EARTH_KM - R_EARTH_KM : null;
  }, [satrec, now]);
  const ageDays = now ? (now.getTime() - Date.parse(entry.epoch)) / 86_400_000 : null;
  const type = objectType(entry);

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-serif text-[22px] font-semibold leading-tight text-gold">{entry.name}</h3>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection and return to Earth view"
          className="icon-btn -mr-2 h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <Row label="NORAD ID" value={entry.norad} />
      <Row label="Type" value={<span className="font-sans">{TYPE_LABELS[type].replace(/s$/, "")}</span>} />
      <Row label="Origin" value={<span className="font-sans">{GROUP_LABELS[entry.group] ?? entry.group}</span>} />
      <Row label="Altitude now" value={altKm !== null ? altKm.toFixed(0) : DASH} unit="km" />
      <Row label="Perigee / apogee" value={`${entry.perigee_km.toFixed(0)} / ${entry.apogee_km.toFixed(0)}`} unit="km" />
      {satrec && <Row label="Inclination" value={inclinationDeg(satrec).toFixed(2)} unit="°" />}
      {satrec && <Row label="Period" value={periodMinutes(satrec).toFixed(1)} unit="min" />}
      <Row
        label="Element set age"
        value={ageDays === null ? DASH : ageDays < 1 ? (ageDays * 24).toFixed(1) : ageDays.toFixed(1)}
        unit={ageDays !== null && ageDays < 1 ? "h" : "d"}
      />
      <Row
        label="Position σ (assumed)"
        value={ageDays === null ? DASH : assumedSigmaKm(ageDays).toFixed(2)}
        unit="km"
      />
      <p className="mt-1.5 text-[14px] leading-snug text-muted">
        Assumed: 0.5 km + 1 km per day of element age (TLEs carry no covariance).
      </p>
    </div>
  );
}

/** Left column: catalog stats, search, layers and the selected object. */
export function LeftPanel({
  catalog,
  counts,
  medianAge,
  layers,
  onToggleLayer,
  selected,
  now,
  onSelect,
  onClear,
  open,
  onToggle,
  top,
}: {
  catalog: CatalogEntry[];
  counts: Record<ObjectType, number>;
  medianAge: string | null;
  layers: LayerVisibility;
  onToggleLayer: (t: ObjectType) => void;
  selected: CatalogEntry | null;
  now: Date | null;
  onSelect: (norad: number) => void;
  onClear: () => void;
  open: boolean;
  onToggle: () => void;
  top: number;
}) {
  return (
    <EdgePanel side="left" label="Catalog" icon={Gauge} open={open} onToggle={onToggle} top={top}>
      <Stats total={catalog.length} medianAge={medianAge} now={now} />
      <div className="divider my-4" />
      <SectionTitle>Objects</SectionTitle>
      <Search catalog={catalog} onSelect={onSelect} />
      <Layers counts={counts} layers={layers} onToggle={onToggleLayer} />
      <div className="divider my-4" />
      {selected ? (
        <Selected entry={selected} now={now} onClear={onClear} />
      ) : (
        <p className="text-[17px] text-ivory">Click any point on the globe to inspect it.</p>
      )}
    </EdgePanel>
  );
}

