import type { ReactNode } from "react";
import { Glass } from "../hud/Glass";

function Status({ kind }: { kind: "in-use" | "soon" | "assumption" }) {
  const map = {
    "in-use": { label: "In use", cls: "border-ice/30 text-ice" },
    soon: { label: "Coming soon", cls: "border-gold/30 text-gold/90" },
    assumption: { label: "Assumption", cls: "border-silver/30 text-silver" },
  }[kind];
  return <span className={`shrink-0 rounded-full border px-2.5 py-px text-[14px] ${map.cls}`}>{map.label}</span>;
}

function Item({ title, status, children }: { title: string; status: "in-use" | "soon" | "assumption"; children: ReactNode }) {
  return (
    <li className="divider flex items-start justify-between gap-6 py-4 first:border-t-0 first:pt-0">
      <div>
        <div className="text-[17px] font-semibold text-ivory">{title}</div>
        <div className="mt-1 text-[17px] text-ivory">{children}</div>
      </div>
      <Status kind={status} />
    </li>
  );
}

const STEPS = [
  {
    n: "I",
    title: "Gather",
    body: "Public two-line element sets for the space stations and four major breakup clouds are pulled from CelesTrak, cached for two hours.",
  },
  {
    n: "II",
    title: "Propagate",
    body: "Each object is flown forward with the SGP4 model, the same propagator the element sets were fitted with, and drawn on the globe in real time.",
  },
  {
    n: "III",
    title: "Assess",
    body: "A chosen asset is screened against the catalog for close approaches; probability of collision and a small avoidance burn are estimated.",
  },
];

export function AboutTab() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[44px] font-semibold leading-tight">About</h1>
        <p className="font-serif text-[20px] italic text-ivory">Why the crowded orbits matter, and how this watch is kept.</p>
      </header>

      <Glass className="p-8">
        <h2 className="heading mb-3">The problem</h2>
        <p className="max-w-[62ch] text-[17px] text-ivory">
          Low Earth orbit holds tens of thousands of tracked objects, most of them debris. At orbital speeds even a
          fragment the size of a coin can disable a spacecraft, and each collision creates more fragments. Two
          anti-satellite tests and one accidental collision, all shown here, produced some of the largest debris
          clouds on record. Operators need early, honest warning of close approaches and of objects about to fall.
        </p>
      </Glass>

      <Glass className="p-8">
        <h2 className="heading mb-5">How it works</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <div className="font-serif text-[22px] font-semibold text-gold">{s.n}</div>
              <div className="mt-1 font-serif text-[22px] font-semibold">{s.title}</div>
              <p className="mt-1 text-[17px] text-ivory">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-[14px] text-muted">Step III is in progress; screening and burn estimates arrive in the next build steps.</p>
      </Glass>

      <Glass className="p-8">
        <h2 className="heading mb-4">Data sources</h2>
        <ul>
          <Item title="CelesTrak GP element sets" status="in-use">
            Groups: stations, cosmos-1408-debris, fengyun-1c-debris, iridium-33-debris, cosmos-2251-debris. Cached for
            two hours; a bundled snapshot is used if CelesTrak cannot be reached.
          </Item>
          <Item title="NOAA SWPC space weather" status="soon">
            Solar flux F10.7 and geomagnetic Kp / Ap, which drive upper-atmosphere density and drag.
          </Item>
          <Item title="Space-Track conjunction messages" status="soon">
            Optional; requires an account. Not needed for this demo.
          </Item>
        </ul>
      </Glass>

      <Glass className="p-8">
        <h2 className="heading mb-4">Assumptions</h2>
        <ul>
          <Item title="Position uncertainty" status="assumption">
            TLEs carry no covariance, so each object is given an isotropic 1σ of 0.5 km + 1 km per day of element-set
            age at closest approach; two objects combine as √(σ₁² + σ₂²).
          </Item>
          <Item title="Collision probability" status="assumption">
            Pc is the chance the miss vector falls inside the combined hard-body radius under that isotropic
            uncertainty (non-central χ² with two degrees of freedom).
          </Item>
          <Item title="Avoidance burns" status="assumption">
            Along-track drift is approximated as Δs ≈ 3·Δv·Δt; burn sizes are estimates (est.).
          </Item>
          <Item title="Re-entry dates" status="assumption">
            Lifetimes come from perigee height and the mean-motion derivative: a heuristic, labelled est., not a
            certified prediction.
          </Item>
          <Item title="Object type" status="assumption">
            Read from catalog naming: names containing DEB are debris, R/B are rocket bodies, everything else is a
            payload.
          </Item>
        </ul>
      </Glass>
    </div>
  );
}
