export type Tab = "live" | "model" | "about";
export type CatalogStatus = "loading" | "ok" | "error";

const TABS: { id: Tab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "model", label: "Model" },
  { id: "about", label: "About" },
];

/** Very faint gold orbit behind a tab label; fades in (~18%) and slowly turns on hover/focus. */
function TabOrbit() {
  return (
    <span
      aria-hidden
      className="hover-fade pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-[0.18] group-focus-visible:opacity-[0.18]"
    >
      <span className="block h-[54px] w-[54px]" style={{ transform: "rotate(-14deg) scaleY(0.38) scaleX(1.5)" }}>
        <svg
          viewBox="0 0 100 100"
          className="orbit-spin-slow h-full w-full overflow-visible"
          style={{ filter: "drop-shadow(0 0 3px rgb(217 183 126 / 0.9))" }}
        >
          <circle cx="50" cy="50" r="48" fill="none" stroke="#D9B77E" strokeWidth="1.6" />
          <circle cx="98" cy="50" r="4" fill="#E8D3A8" />
        </svg>
      </span>
    </span>
  );
}

/** Tabs centre, catalog count + data freshness right. The logo sits above the left column (BrandLogo). */
export function TopNav({
  tab,
  onTab,
  status,
  total,
  medianAge,
  fetchedAt,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  status: CatalogStatus;
  total: number;
  medianAge: string | null;
  fetchedAt: Date | null;
}) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-start gap-6 px-6 pt-6 max-[859px]:grid-cols-[1fr_auto] max-[859px]:px-4 max-[859px]:pt-4">
      <div className="max-[859px]:hidden" />

      <nav
        role="tablist"
        aria-label="Sections"
        className="glass pointer-events-auto flex gap-1 justify-self-center rounded-full px-2 py-1.5 max-[859px]:col-start-2"
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onTab(t.id)}
              className={`tab group relative rounded-full px-5 py-1.5 text-[15px] transition-colors duration-700 ease-soft ${
                active ? "bg-white/[0.07] font-semibold text-gold" : "text-ivory hover:text-gold"
              }`}
            >
              <TabOrbit />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pointer-events-auto justify-self-end text-right max-[859px]:hidden">
        {status === "loading" && <span className="text-[15px]">Loading catalog</span>}
        {status === "error" && <span className="text-[15px] text-rose">Catalog unavailable</span>}
        {status === "ok" && (
          <div className="leading-tight">
            <div>
              <span className="font-mono text-[28px] text-ivory">{total.toLocaleString()}</span>
              <span className="ml-2 text-[14px] text-muted">objects</span>
            </div>
            <div className="mt-1 text-[14px] text-muted">
              TLE median age <span className="font-mono text-ivory">{medianAge ?? "—"}</span>
              {fetchedAt && (
                <>
                  <span className="mx-1.5">·</span>
                  loaded <span className="font-mono text-ivory">{fetchedAt.toISOString().slice(11, 16)} UTC</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
