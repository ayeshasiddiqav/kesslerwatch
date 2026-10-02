import { Pause } from "lucide-react";
import type { CSSProperties } from "react";
import { Glass } from "./Glass";

const SPEEDS = [1, 10, 100, 1000] as const;

/** Minimal time dock centred under the globe. Live UTC only; controls arrive in build step 2. */
export function TimeDock({
  now,
  style,
}: {
  now: Date | null;
  style?: CSSProperties;
}) {
  return (
    <div className="pointer-events-none fixed bottom-6 z-10 flex justify-center max-[859px]:left-4! max-[859px]:right-4! max-[859px]:bottom-4" style={style}>
      <Glass as="footer" className="flex items-center gap-4 rounded-full px-5 py-2.5 max-[859px]:gap-2 max-[859px]:px-3">
        <span className="whitespace-nowrap font-mono text-[15px] text-ivory">
          {now ? now.toISOString().slice(11, 19) : "—"}
          <span className="ml-1.5 text-[14px] text-muted">UTC</span>
        </span>
        <span className="h-4 w-px bg-white/15 max-[859px]:hidden" />
        <button
          type="button"
          disabled
          aria-label="Pause"
          title="Time controls arrive in the next build step"
          className="icon-btn h-8 w-8 disabled:opacity-40 max-[859px]:hidden"
        >
          <Pause className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex gap-0.5 max-[859px]:hidden" title="Time controls arrive in the next build step">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              disabled
              className={`rounded-full px-2 py-0.5 font-mono text-[14px] disabled:cursor-not-allowed ${
                s === 1 ? "text-gold" : "text-ivory/40"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
        <button type="button" disabled className="quiet-btn max-[859px]:hidden">
          Now
        </button>
      </Glass>
    </div>
  );
}
