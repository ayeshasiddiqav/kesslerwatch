# KesslerWatch: Space Debris Risk Prediction

Hackathon prototype (24h). Goal: a working, impressive demo, not production. Prefer simple + working over complete.

## What it does
1. Loads live TLEs (CelesTrak, no auth) for debris + active sats.
2. Propagates orbits with SGP4 and renders them on a 3D Earth.
3. Screens a selected asset vs. catalog for conjunctions; computes miss distance, TCA, Pc.
4. Recommends along-track delta-v to bring Pc below threshold.
5. Flags re-entry risk (low perigee + decay rate); ML model refines drag/decay.

## Stack
- frontend/: Next.js (App Router, TS), React Three Fiber + drei, Tailwind, Framer Motion, lucide-react, satellite.js (client-side SGP4 for animation)
- backend/: FastAPI, sgp4, numpy, scipy, scikit-learn (PyTorch only if time allows)

## Commands
- Backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`
- Frontend: `cd frontend && npm install && npm run dev` (http://localhost:3000)
- Frontend reads `NEXT_PUBLIC_API_URL` (default http://localhost:8000)

## Data sources
- TLEs: `https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle`
  Groups: stations, active, cosmos-1408-debris, fengyun-1c-debris, iridium-33-debris, cosmos-2251-debris
- Cache TLEs to `backend/cache/` for 2h. CelesTrak blocks repeated downloads; never fetch per request.
- Space weather: NOAA SWPC JSON (F10.7, Kp). Cache too.
- Space-Track / CDMs: optional, needs login; not required for demo.
- Ship a fallback snapshot `backend/cache/sample_tles.txt` so the demo works offline.

## API contract
- GET  /catalog → [{norad, name, group, tle1, tle2, epoch, perigee_km, apogee_km}]
- POST /screen {norad, horizon_h=24, screen_km=10, hbr_m=20} → [{norad, name, tca_utc, miss_km, vrel_kms, sigma_km, pc, alert}]
- POST /maneuver {norad, secondary, tca_utc} → [{lead_h, dv_ms, new_miss_km, new_pc}]
- GET  /reentry → [{norad, name, perigee_km, est_days, risk}]
- GET  /spaceweather → {f107, kp, ap, updated}
- GET  /metrics → {objects_tracked, pairs_per_sec, median_tle_age_h, brier_score}

## Physics rules (do not deviate)
- Units: km, km/s, seconds, UTC. Convert to m/s only for display of delta-v.
- Screening: coarse vectorized pass (SatrecArray, 60s step, chunks of 2000) → refine candidates at 1s around coarse minimum.
- TLEs have no covariance. Assume isotropic sigma_km = 0.5 + 1.0 * |TLE age at TCA in days|; combined sigma = hypot(s1, s2). Label this as an assumption in UI.
- Pc = ncx2.cdf((R/sigma)^2, df=2, nc=(d/sigma)^2), R = hard-body radius in km.
- Maneuver: along-track drift approx. Δs ≈ 3·Δv·Δt; solve Δv for miss distance where Pc < threshold.
- Re-entry estimate is a heuristic (mean-motion derivative); label it as such.
- Never invent data. If something is estimated, the UI says "est."

## UI rules
- Full-bleed R3F canvas behind everything: Earth, atmosphere glow shader, debris as ONE InstancedMesh (never one mesh per object). Colors: debris vs. active vs. selected vs. alert.
- HUD panels: `backdrop-blur-xl bg-black/40 border border-white/10 text-white`, absolute positioned.
- Motion: subtle Y drift (≤4px, ~6s) only on idle panels; stop drift on hover/focus. Tilt on hover ≤6°. Respect prefers-reduced-motion.
- Top bar: object search (name/NORAD), catalog count, data freshness.
- Bottom dock: time scrubber with 1x / 10x / 100x / 1000x, play/pause, "now" button.
- Side deck: selected conjunction (Pc, miss km, TCA countdown, rel. velocity, sigma), maneuver options, space weather (F10.7, Kp/Ap).
- Model panel (separate): Brier score, pairs/sec, objects tracked, TLE age.
- Click an object → camera flies to it, shows orbit trail and stats.
- Monospace (JetBrains Mono / Geist Mono) for numbers, coordinates, timestamps. Sans for labels.
- Must not drop below 30 fps with 10k objects. Propagate positions in a Web Worker if needed.

## Build order (stop and demo-check after each)
1. Backend /catalog + Earth + debris points rendering.
2. Time scrubber animating positions (satellite.js).
3. /screen + alert card.
4. /maneuver + /reentry + space weather.
5. ML drag/decay model + Brier score on historical data.
6. Polish: camera fly-to, shaders, motion.

## Conventions
- TypeScript strict, functional components, no class components.
- Keep backend in few files: main.py, orbit.py, risk.py, ml.py.
- No auth, no database. In-memory + file cache only.
- When unsure, ask before adding a dependency.
## Design reference
- design/designreference.html is the visual target. Match its look, colors, fonts, layout and feel when building React components. Port it into React; don't paste it in as-is.

## Design specifics (always follow, these override the reference and the UI rules above where they conflict)
Vibe: minimal, posh, editorial. Like a luxury observatory brand, not a gaming HUD. Lots of empty space, few elements, nothing cramped or cluttered.

Logo:
- Use frontend/public/logo.jpg as the KesslerWatch logo. No text-based logo.
- Its background is black: render it with mix-blend-mode: screen so it blends into the page. It must be a direct fixed child of <main> (not inside a glass panel or other stacking context), or the black box shows.
- Top-left, about 272px wide (20% smaller than the original hero size), crisp and balanced; smaller (~160px) on Model/About.
- Hover: a thin gold (#D9B77E) SVG orbit ring around the logo, slowly rotating (~12s per turn), plus a very subtle warm glow. Smooth ease in/out. Never put a CSS drop-shadow on the image itself (it glows the whole black rectangle); draw ring/glow on a hit area beneath the blended image.

Fonts (Google Fonts via next/font):
- Headings (every heading, including panel titles like "Screening"): Newsreader, weight 500–600. Italic allowed for subtitles.
- Body and labels: Hanken Grotesk, weight 500 (600 for emphasis). Sentence case.
- Numbers, coordinates, timestamps: Geist Mono, weight 500.
- Never use font weights below 400, and no other decorative or thin fonts.

Readability:
- Body text min 17px, labels min 14px, key numbers 28px+.
- Main text ivory #F2EBDD at full opacity. Muted text #B8B2A7 only for small secondary labels.

Palette (only these):
- Space black #05060A, ivory text #F2EBDD, muted text #B8B2A7
- Champagne gold #D9B77E (accents, active states)
- Payloads soft ice blue #A8C8E8, debris warm silver #CFC6B8, rocket bodies muted amber #C9A36A
- Alert rose #E0707A (only for high risk). No neon, no acid colors. Exception: the globe's blue atmosphere rim (and its barely visible aura).

Background: existing starfield stays. Faint procedural Milky Way band far behind, about 6% opacity, slow parallax. If using an image instead, store it locally and confirm its license allows reuse.

Globe:
- The main focus: as large as possible, centered, with only the top nav, time dock and screen edges reserved. Edge panels float over the scene when opened; the globe does not shrink for them.
- Strong blue atmosphere rim so it separates clearly from the background.
- The moving blue aura (ported from design/designreference.html) is only a very, very faint hint (~20% of the reference strength). Decorative until space-weather data drives it.
- Auto-rotates slowly; user can drag to rotate fully in any direction and zoom. Pause auto-rotate while the user interacts.
- Thin, faint orbital shell rings labeled LEO / MEO / GEO.
- Objects as small soft glowing points, colored by type; high-risk objects pulse in rose.
- Click an object: smooth camera fly-to, its orbit drawn as a thin gold line, details in side panel.
- During a conjunction: draw a thin line between the two objects at TCA.

Layout:
- Structure like the first version: logo + catalog/stats on the left, screening/alerts on the right, globe in the middle.
- Top nav: tabs center (Live, Model, About); catalog count and data freshness right.
- Nav hover: a very faint thin gold orbit ring behind the tab label (opacity ~15–20%), slowly rotating with a soft glow. Noticeable but never competing with the text.
- Side panels: compact pill tabs docked at the screen edges ("Catalog" left under the logo, "Screening" right). Clicking a pill expands its panel (max 340px, compact, no wasted space); clicking again collapses it. Collapsed by default so the globe is unobstructed. Selecting an object opens Catalog to show its details. Max 2 side panels visible.
- Panels: glass (backdrop-blur, bg-black/50, 1px border white/8%), soft radius, thin dividers.
- Model tab: Brier score, calibration chart, model metrics, training data source.
- About tab: problem, how it works (3 steps), data sources, assumptions labeled clearly.
- Motion: slow, soft, eased. One elegant intro fade on load. No bouncy or flashy effects. All motion (spins, drifts, fades, camera auto-rotate/fly) respects prefers-reduced-motion.

## Accuracy
- Never invent APIs, package names, versions, or data fields. If unsure, check docs or ask.
- After writing code, run it and confirm it works before saying it's done.
- Label every estimated or assumed value in code comments and UI ("est.").
- If something can't be done, say so instead of faking it with mock data.