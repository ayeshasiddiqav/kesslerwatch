"use client";

import Image from "next/image";
import { useState } from "react";

// logo.jpg is 1408x768 with a wide black margin; the lettering occupies roughly this box.
const SRC_W = 1408;
const SRC_H = 768;
const CONTENT = { left: 0.149, right: 0.838, top: 0.143, bottom: 0.833 };
const CONTENT_ASPECT = ((CONTENT.right - CONTENT.left) * SRC_W) / ((CONTENT.bottom - CONTENT.top) * SRC_H);

export const LOGO_X = 24;
export const LOGO_Y = 16;

/** Visible height (px) of the lettering when it is `visibleWidth` px wide. */
export function logoHeight(visibleWidth: number): number {
  return visibleWidth / CONTENT_ASPECT;
}

/** Thin gold orbit: a spinning circle inside a tilted, flattened wrapper reads as an orbiting ellipse. */
function OrbitRing({ size }: { size: number }) {
  return (
    <div className="absolute left-1/2 top-1/2" style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, transform: "rotate(-12deg) scaleY(0.42)" }}>
      <svg
        viewBox="0 0 100 100"
        className="orbit-spin h-full w-full overflow-visible"
        style={{ filter: "drop-shadow(0 0 2px rgb(217 183 126 / 0.6))" }}
        aria-hidden
      >
        <circle cx="50" cy="50" r="49" fill="none" stroke="#D9B77E" strokeOpacity="0.35" strokeWidth="0.35" />
        {/* brighter travelling arc + glint so the rotation reads */}
        <circle
          cx="50"
          cy="50"
          r="49"
          fill="none"
          stroke="#D9B77E"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeDasharray="70 238"
          strokeOpacity="0.9"
        />
        <circle cx="99" cy="50" r="1.3" fill="#E8D3A8" />
      </svg>
    </div>
  );
}

/**
 * KesslerWatch wordmark from public/logo.jpg plus its hover ornament.
 * The <Image> must stay a direct, un-nested fixed child of <main> so `mix-blend-mode: screen`
 * blends with the globe canvas and its black background vanishes; this component returns a
 * fragment so that holds. Hover is caught by a hit area *under* the (pointer-events-none) image.
 */
export function BrandLogo({ visibleWidth }: { visibleWidth: number }) {
  const [hover, setHover] = useState(false);
  const imgW = visibleWidth / (CONTENT.right - CONTENT.left);
  const imgH = (imgW * SRC_H) / SRC_W;
  const visibleH = logoHeight(visibleWidth);

  return (
    <>
      <div
        aria-hidden
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className="fixed z-10 transition-all duration-1000 ease-soft motion-reduce:transition-none"
        style={{ left: LOGO_X, top: LOGO_Y, width: visibleWidth, height: visibleH }}
      >
        {/* very subtle warm glow behind the lettering */}
        <div
          className={`hover-fade pointer-events-none absolute -inset-6 rounded-full ${hover ? "opacity-100" : "opacity-0"}`}
          style={{ background: "radial-gradient(closest-side, rgb(217 183 126 / 0.13), rgb(217 160 102 / 0.05) 55%, transparent)" }}
        />
        <div className={`hover-fade pointer-events-none absolute inset-0 ${hover ? "opacity-100" : "opacity-0"}`}>
          <OrbitRing size={visibleWidth * 1.16} />
        </div>
      </div>
      <Image
        src="/logo.jpg"
        alt="KesslerWatch"
        width={SRC_W}
        height={SRC_H}
        priority
        sizes={`${Math.ceil(imgW)}px`}
        className="pointer-events-none fixed z-20 select-none mix-blend-screen transition-all duration-1000 ease-soft motion-reduce:transition-none"
        style={{
          width: imgW,
          height: imgH,
          maxWidth: "none",
          left: LOGO_X - CONTENT.left * imgW,
          top: LOGO_Y - CONTENT.top * imgH,
          filter: hover ? "brightness(1.08) sepia(0.08)" : "none",
        }}
      />
    </>
  );
}
