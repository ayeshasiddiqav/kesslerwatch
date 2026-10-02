"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCatalog, objectType, type CatalogEntry, type ObjectType } from "@/lib/api";
import { medianTleAgeHours } from "@/lib/orbit";
import { BrandLogo, LOGO_Y, logoHeight } from "./hud/BrandLogo";
import { LeftPanel } from "./hud/LeftPanel";
import { RightPanel } from "./hud/RightPanel";
import { TimeDock } from "./hud/TimeDock";
import { TopNav, type CatalogStatus, type Tab } from "./hud/TopNav";
import type { Insets } from "./scene/CameraRig";
import type { LayerVisibility } from "./scene/ObjectField";
import { AboutTab } from "./tabs/AboutTab";
import { ModelTab } from "./tabs/ModelTab";

const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

const EMPTY: CatalogEntry[] = [];
// High-risk NORAD IDs; filled by /screen in build step 3.
const NO_ALERTS: ReadonlySet<number> = new Set();

// Layout (px)
const EDGE = 24;
const NAV_H = 84;
const DOCK_H = 80;
const RIGHT_TOP = 112; // below the catalog count / freshness block
const LOGO_FULL = 272; // ~20% smaller than the earlier 340
const LOGO_COMPACT = 160;
const LOGO_MOBILE = 120;
const NARROW_QUERY = "(max-width: 859px)";

function formatAge(hours: number | null): string | null {
  if (hours === null) return null;
  return hours < 24 ? `${hours.toFixed(0)} h` : `${(hours / 24).toFixed(1)} d`;
}

/** Current UTC time, ticking once per second (null until mounted to avoid hydration mismatch). */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    const first = setTimeout(update, 0);
    mq.addEventListener("change", update);
    return () => {
      clearTimeout(first);
      mq.removeEventListener("change", update);
    };
  }, [query]);
  return matches;
}

export function Dashboard() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>(EMPTY);
  const [status, setStatus] = useState<CatalogStatus>("loading");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("live");
  const [layers, setLayers] = useState<LayerVisibility>({ payload: true, debris: true, rocket: true });
  const [selection, setSelection] = useState<{ norad: number; at: number } | null>(null);
  // Edge panels start collapsed so the globe is unobstructed.
  const [open, setOpen] = useState({ left: false, right: false });
  const now = useNow();
  const narrow = useMediaQuery(NARROW_QUERY);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCatalog(ctrl.signal)
      .then((data) => {
        setCatalog(data);
        setFetchedAt(new Date());
        setStatus("ok");
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        console.error(err);
        setStatus("error");
      });
    return () => ctrl.abort();
  }, []);

  const byNorad = useMemo(() => new Map(catalog.map((c) => [c.norad, c])), [catalog]);
  const selected = selection ? (byNorad.get(selection.norad) ?? null) : null;

  const stats = useMemo(() => {
    const counts: Record<ObjectType, number> = { payload: 0, debris: 0, rocket: 0 };
    for (const c of catalog) counts[objectType(c)]++;
    const ageH = fetchedAt ? medianTleAgeHours(catalog.map((c) => c.epoch), fetchedAt) : null;
    return { counts, medianAge: formatAge(ageH) };
  }, [catalog, fetchedAt]);

  const select = useCallback((norad: number) => {
    setSelection({ norad, at: Date.now() });
    setTab("live");
    setOpen((o) => ({ ...o, left: true })); // details live in the catalog panel
  }, []);
  const clearSelection = useCallback(() => setSelection(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const live = tab === "live";
  const logoWidth = narrow ? LOGO_MOBILE : live ? LOGO_FULL : LOGO_COMPACT;
  const belowLogo = Math.round(LOGO_Y + logoHeight(logoWidth) + 18);

  // The globe is the focus: only the nav, the time dock and the screen edges are reserved.
  // Edge panels float over the scene when opened, so the globe keeps its full size.
  const insets: Insets = useMemo(
    () => ({ left: EDGE, right: EDGE, top: NAV_H, bottom: live ? DOCK_H : EDGE }),
    [live],
  );

  return (
    <main className="intro-fade relative h-dvh w-full overflow-hidden bg-space">
      <Scene
        catalog={catalog}
        layers={layers}
        selected={selected}
        selectedAt={selection?.at ?? 0}
        alerts={NO_ALERTS}
        onSelect={select}
        insets={insets}
      />

      {/* Dims the globe behind the reading tabs */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 bg-space/75 transition-opacity duration-1000 ease-soft ${
          live ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Must remain a direct child of <main> for mix-blend-mode to reach the canvas. */}
      <BrandLogo visibleWidth={logoWidth} />

      <TopNav
        tab={tab}
        onTab={setTab}
        status={status}
        total={catalog.length}
        medianAge={stats.medianAge}
        fetchedAt={fetchedAt}
      />

      {live && (
        <div key="live" className="fade-in">
          <LeftPanel
            catalog={catalog}
            counts={stats.counts}
            medianAge={stats.medianAge}
            layers={layers}
            onToggleLayer={(t) => setLayers((l) => ({ ...l, [t]: !l[t] }))}
            selected={selected}
            now={now}
            onSelect={select}
            onClear={clearSelection}
            open={open.left}
            onToggle={() => setOpen((o) => ({ ...o, left: !o.left }))}
            top={belowLogo}
          />
          <RightPanel
            selected={selected}
            open={open.right}
            onToggle={() => setOpen((o) => ({ ...o, right: !o.right }))}
            top={narrow ? belowLogo : RIGHT_TOP}
          />
          <TimeDock now={now} style={{ left: insets.left, right: insets.right }} />
        </div>
      )}

      {!live && (
        <div
          key={tab}
          className="fade-in fixed inset-x-0 bottom-0 z-10 overflow-y-auto overscroll-contain"
          style={{ top: Math.max(NAV_H, belowLogo) }}
        >
          <div className="mx-auto max-w-4xl px-6 pb-20 pt-2">
            {tab === "model" ? <ModelTab total={catalog.length} medianAge={stats.medianAge} /> : <AboutTab />}
          </div>
        </div>
      )}
    </main>
  );
}
