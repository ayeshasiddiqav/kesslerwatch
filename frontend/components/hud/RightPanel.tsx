import { Crosshair } from "lucide-react";
import type { CatalogEntry } from "@/lib/api";
import { ComingSoon, DASH, Row, SectionTitle } from "./Glass";
import { EdgePanel } from "./EdgePanel";

/**
 * Right column: screening controls and alerts. Controls stay disabled until /screen,
 * /spaceweather and /reentry exist (build steps 3-4); nothing here is mock data.
 */
export function RightPanel({
  selected,
  open,
  onToggle,
  top,
}: {
  selected: CatalogEntry | null;
  open: boolean;
  onToggle: () => void;
  top: number;
}) {
  return (
    <EdgePanel side="right" label="Screening" icon={Crosshair} open={open} onToggle={onToggle} top={top}>
      <SectionTitle aside={<ComingSoon />}>Screening</SectionTitle>
      <Row label="Protected asset" value={<span className="font-sans">{selected?.name ?? DASH}</span>} />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <label className="text-[14px] text-muted">
          Window
          <select disabled defaultValue="24" className="field mt-1 px-2">
            <option value="6">6 h</option>
            <option value="24">24 h</option>
            <option value="72">72 h</option>
          </select>
        </label>
        <label className="text-[14px] text-muted">
          Distance
          <input disabled type="number" defaultValue={10} aria-label="Screening distance in km" className="field mt-1 px-2" />
        </label>
        <label className="text-[14px] text-muted">
          HBR m
          <input disabled type="number" defaultValue={20} aria-label="Combined hard-body radius in metres" className="field mt-1 px-2" />
        </label>
      </div>
      <button type="button" disabled className="quiet-btn primary mt-3">
        Screen for conjunctions
      </button>

      <div className="divider my-4" />
      <SectionTitle>Alerts</SectionTitle>
      <p className="text-[17px] text-ivory">No screen has been run yet.</p>
      <Row label="Collision probability" value={DASH} />
      <Row label="Miss distance" value={DASH} unit="km" />
      <Row label="Closest approach in" value={DASH} />
      <Row label="Combined σ (assumed)" value={DASH} unit="km" />

      <div className="divider my-4" />
      <SectionTitle aside={<ComingSoon />}>Space weather</SectionTitle>
      <Row label="Solar flux F10.7" value={DASH} unit="sfu" />
      <Row label="Kp / Ap" value={`${DASH} / ${DASH}`} />

      <div className="divider my-4" />
      <SectionTitle aside={<ComingSoon />}>Re-entry</SectionTitle>
      <p className="text-[14px] leading-snug text-muted">
        Lifetimes will be est. from perigee height and mean-motion decay: a heuristic, not a certified prediction.
      </p>
    </EdgePanel>
  );
}
