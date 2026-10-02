import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useId } from "react";
import { Glass } from "./Glass";

export const PANEL_WIDTH = 340;
export const PILL_HEIGHT = 40;
export const PILL_GAP = 10;

/**
 * Compact pill tab docked at a screen edge. Clicking it expands its panel just below; clicking
 * again collapses it. Panels float over the scene so the globe keeps its full size.
 */
export function EdgePanel({
  side,
  label,
  icon: Icon,
  open,
  onToggle,
  top,
  className = "",
  children,
}: {
  side: "left" | "right";
  label: string;
  icon: LucideIcon;
  open: boolean;
  onToggle: () => void;
  /** Top of the pill in px; the panel opens beneath it. */
  top: number;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const panelTop = top + PILL_HEIGHT + PILL_GAP;
  const edge: CSSProperties = side === "left" ? { left: 24 } : { right: 24 };

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className={`glass pointer-events-auto fixed z-20 flex items-center gap-2 rounded-full px-4 text-[15px] transition-colors duration-500 ease-soft hover:text-gold ${
          open ? "text-gold" : "text-ivory"
        }`}
        style={{ ...edge, top, height: PILL_HEIGHT }}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        {label}
      </button>

      <Glass
        as="aside"
        className={`panel-pop fixed z-10 flex flex-col overflow-hidden max-[859px]:left-4! max-[859px]:right-4! max-[859px]:w-auto! ${
          open
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none! invisible -translate-y-1.5 opacity-0"
        } ${className}`}
        style={{ ...edge, top: panelTop, width: PANEL_WIDTH, maxHeight: `calc(100dvh - ${panelTop + 24}px)` }}
      >
        <div id={id} role="region" aria-label={label} inert={!open} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
      </Glass>
    </>
  );
}
