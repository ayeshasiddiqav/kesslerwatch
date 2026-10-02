import { ComingSoon, DASH, Glass, Row } from "../hud/Glass";

/** Empty reliability diagram: axes and the perfect-calibration diagonal only. No data is drawn until the model exists. */
function CalibrationChart() {
  const S = 220;
  const P = 28;
  const inner = S - P * 1.5;
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full max-w-[260px]" role="img" aria-label="Calibration chart, no data yet">
        {[0.25, 0.5, 0.75].map((g) => (
          <g key={g} stroke="rgb(255 255 255 / 0.05)">
            <line x1={P} x2={P + inner} y1={P / 2 + inner * (1 - g)} y2={P / 2 + inner * (1 - g)} />
            <line y1={P / 2} y2={P / 2 + inner} x1={P + inner * g} x2={P + inner * g} />
          </g>
        ))}
        <line x1={P} y1={P / 2 + inner} x2={P + inner} y2={P / 2 + inner} stroke="rgb(255 255 255 / 0.18)" />
        <line x1={P} y1={P / 2} x2={P} y2={P / 2 + inner} stroke="rgb(255 255 255 / 0.18)" />
        <line
          x1={P}
          y1={P / 2 + inner}
          x2={P + inner}
          y2={P / 2}
          stroke="#D9B77E"
          strokeOpacity={0.45}
          strokeDasharray="3 5"
        />
        <text x={P} y={S - 4} fill="#B8B2A7" fontSize="12" fontFamily="var(--font-geist-mono)">0</text>
        <text x={P + inner - 6} y={S - 4} fill="#B8B2A7" fontSize="12" fontFamily="var(--font-geist-mono)">1</text>
        <text x={P - 14} y={P / 2 + 6} fill="#B8B2A7" fontSize="12" fontFamily="var(--font-geist-mono)">1</text>
      </svg>
      <figcaption className="mt-2 text-[14px] text-muted">
        Predicted probability (x) vs. observed frequency (y). Dashed line: perfect calibration.
      </figcaption>
      <div className="pointer-events-none absolute left-0 top-0 grid aspect-square w-full max-w-[260px] place-items-center">
        <ComingSoon />
      </div>
    </figure>
  );
}

export function ModelTab({ total, medianAge }: { total: number; medianAge: string | null }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[44px] font-semibold leading-tight">Model</h1>
        <p className="font-serif text-[20px] italic text-ivory">
          A learned refinement of atmospheric drag and orbital decay, scored against what actually happened.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Glass className="p-8">
          <div className="eyebrow">Brier score</div>
          <div className="mt-3 flex items-baseline gap-4">
            <span className="font-mono text-[44px] leading-none text-ivory/40">{DASH}</span>
            <ComingSoon />
          </div>
          <p className="mt-4 text-[17px] text-ivory">
            Mean squared error of predicted re-entry probabilities against observed outcomes. Lower is better; 0 is
            perfect.
          </p>
        </Glass>

        <Glass className="p-8">
          <div className="eyebrow mb-3">Model metrics</div>
          <Row label="Objects tracked" value={total > 0 ? total.toLocaleString() : DASH} />
          <Row label="Median TLE age" value={medianAge ?? DASH} />
          <Row label="Pairs screened per second" value={<ComingSoon />} />
          <Row label="Brier score" value={<ComingSoon />} />
        </Glass>

        <Glass className="p-8">
          <div className="eyebrow mb-4">Calibration</div>
          <CalibrationChart />
        </Glass>

        <Glass className="p-8">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="eyebrow">Training data source</div>
            <ComingSoon />
          </div>
          <p className="text-[17px] text-ivory">
            Not chosen yet. The plan is historical element sets for objects that have already re-entered, so
            predicted decay can be checked against known re-entry dates. Nothing on this page is trained or scored
            yet.
          </p>
        </Glass>
      </div>
    </div>
  );
}
