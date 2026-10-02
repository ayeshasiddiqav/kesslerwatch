import type { CSSProperties, ReactNode } from "react";

export const DASH = "—";

/** Glass panel. `drift` adds the slow idle float (paused on hover/focus, off for reduced motion). */
export function Glass({
  as: Tag = "div",
  children,
  className = "",
  drift = false,
  style,
}: {
  as?: "div" | "aside" | "section" | "footer" | "article";
  children: ReactNode;
  className?: string;
  drift?: boolean;
  style?: CSSProperties;
}) {
  return (
    <Tag className={`glass pointer-events-auto ${drift ? "drift" : ""} ${className}`} style={style}>
      {children}
    </Tag>
  );
}

/** Small muted label on the left, ivory Geist Mono value on the right. */
export function Row({ label, value, unit }: { label: ReactNode; value: ReactNode; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px]">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="text-right font-mono text-[15px] text-ivory">
        {value}
        {unit && <span className="ml-1 text-[14px] text-muted">{unit}</span>}
      </span>
    </div>
  );
}

/** Key figure: 28px+ number with a small label beneath. */
export function Stat({ value, label, unit }: { value: ReactNode; label: string; unit?: string }) {
  return (
    <div>
      <div className="font-mono text-[28px] leading-none text-ivory">
        {value}
        {unit && <span className="ml-1 text-[15px] text-muted">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[14px] leading-tight text-muted">{label}</div>
    </div>
  );
}

export function ComingSoon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border border-gold/40 px-2.5 py-px font-sans text-[14px] text-gold ${className}`}
    >
      Coming soon
    </span>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="heading">{children}</h2>
      {aside}
    </div>
  );
}
