"use client";

import { useId, type ReactNode } from "react";
import {
  ParallaxSlider,
  type ParallaxSliderProps,
} from "../components/parallax-slider";
import { DEMO_SLIDES } from "./parallax-slider.demo-data";

/** Playground-facing props: every knob passes straight through. */
export type ParallaxSliderPreviewProps = Omit<
  ParallaxSliderProps,
  "items" | "renderItem"
>;

// ---------------------------------------------------------------------------
// Scene art — layered gradients + simple SVG shapes, generated
// deterministically (seeded PRNG) so server and client markup match and
// the gallery card paints instantly with no image requests.
// ---------------------------------------------------------------------------

const W = 1600;
const H = 900;

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A jagged mountain ridge closed down to the bottom edge. */
function ridge(seed: number, baseY: number, amp: number, segments: number) {
  const rand = prng(seed);
  const pts: string[] = [`M0 ${H}`, `L0 ${baseY}`];
  for (let i = 1; i <= segments; i += 1) {
    const x = (W / segments) * i;
    const y = baseY - rand() * amp + (i % 2 === 0 ? amp * 0.25 : 0);
    pts.push(`L${x.toFixed(0)} ${y.toFixed(0)}`);
  }
  pts.push(`L${W} ${H}`, "Z");
  return pts.join(" ");
}

type Star = { x: number; y: number; r: number; o: number };
function stars(seed: number, n: number, maxY: number): Star[] {
  const rand = prng(seed);
  return Array.from({ length: n }, () => ({
    x: Math.round(rand() * W),
    y: Math.round(rand() * maxY),
    r: +(rand() * 1.6 + 0.4).toFixed(2),
    o: +(rand() * 0.6 + 0.25).toFixed(2),
  }));
}

const SEA_STARS = stars(7, 120, 480);
const CITY_STARS = stars(19, 50, 380);
const AURORA_STARS = stars(31, 140, 560);

type Building = { x: number; w: number; h: number; windows: [number, number, string][] };
function skyline(seed: number, baseY: number, minH: number, maxH: number, lit: number) {
  const rand = prng(seed);
  const out: Building[] = [];
  let x = -20;
  while (x < W) {
    const w = 50 + Math.round(rand() * 90);
    const h = minH + Math.round(rand() * (maxH - minH));
    const windows: Building["windows"] = [];
    if (lit > 0) {
      for (let wy = baseY - h + 18; wy < baseY - 14; wy += 16) {
        for (let wx = x + 10; wx < x + w - 12; wx += 14) {
          if (rand() < lit) {
            windows.push([wx, wy, rand() < 0.18 ? "#ff7ad9" : "#ffd59a"]);
          }
        }
      }
    }
    out.push({ x, w, h, windows });
    x += w + Math.round(rand() * 8);
  }
  return out;
}

const CITY_BACK = skyline(5, 760, 140, 360, 0);
const CITY_FRONT = skyline(11, 820, 120, 330, 0.16);

/** SVG ids must be unique per instance; useId output is sanitised for url(#…). */
function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {children}
    </svg>
  );
}

function AlpineDawn() {
  const id = useSvgId();
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1b4a" />
          <stop offset="0.42" stopColor="#6b3a73" />
          <stop offset="0.72" stopColor="#f08a6b" />
          <stop offset="1" stopColor="#ffd6a0" />
        </linearGradient>
        <radialGradient id={`${id}sun`}>
          <stop offset="0" stopColor="#fff4dc" />
          <stop offset="0.25" stopColor="#ffd39a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff9a6b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b0668a" />
          <stop offset="1" stopColor="#6d3a68" />
        </linearGradient>
        <linearGradient id={`${id}mid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a3563" />
          <stop offset="1" stopColor="#3a1f4a" />
        </linearGradient>
        <linearGradient id={`${id}near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c1838" />
          <stop offset="1" stopColor="#110a1a" />
        </linearGradient>
        <linearGradient id={`${id}mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc8a8" stopOpacity="0" />
          <stop offset="0.6" stopColor="#ffc8a8" stopOpacity="0.38" />
          <stop offset="1" stopColor="#ffc8a8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}sky)`} />
      <circle cx="1000" cy="560" r="380" fill={`url(#${id}sun)`} />
      <circle cx="1000" cy="560" r="54" fill="#fff1d6" />
      <path d={ridge(3, 560, 190, 9)} fill={`url(#${id}far)`} opacity="0.85" />
      <rect y="520" width={W} height="160" fill={`url(#${id}mist)`} />
      <path d={ridge(8, 660, 220, 7)} fill={`url(#${id}mid)`} />
      <rect y="640" width={W} height="140" fill={`url(#${id}mist)`} opacity="0.6" />
      <path d={ridge(14, 780, 200, 6)} fill={`url(#${id}near)`} />
    </Svg>
  );
}

function MidnightSea() {
  const id = useSvgId();
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#030616" />
          <stop offset="1" stopColor="#13285a" />
        </linearGradient>
        <linearGradient id={`${id}sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f2c52" />
          <stop offset="1" stopColor="#020612" />
        </linearGradient>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#dfe8ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#dfe8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}path`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef3ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#eef3ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}sky)`} />
      {SEA_STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      <circle cx="1150" cy="230" r="240" fill={`url(#${id}glow)`} />
      <circle cx="1150" cy="230" r="62" fill="#f2f5ff" />
      <circle cx="1132" cy="214" r="12" fill="#d9deef" opacity="0.6" />
      <circle cx="1170" cy="250" r="8" fill="#d9deef" opacity="0.5" />
      {/* Distant headland on the horizon. */}
      <path d="M0 520 L0 488 C120 470 220 440 330 452 C420 462 470 500 560 520 Z" fill="#050b1e" />
      <rect y="520" width={W} height={H - 520} fill={`url(#${id}sea)`} />
      {/* Moonlight path: broken strokes that widen toward the viewer. */}
      <g fill={`url(#${id}path)`}>
        {Array.from({ length: 16 }, (_, i) => {
          const y = 530 + i * i * 1.5 + i * 6;
          const w = 40 + i * 26;
          return (
            <rect
              key={i}
              x={1150 - w / 2 + ((i * 37) % 40) - 20}
              y={y}
              width={w}
              height={2 + i * 0.5}
              rx="2"
              opacity={0.9 - i * 0.045}
            />
          );
        })}
      </g>
    </Svg>
  );
}

function NeonCity() {
  const id = useSvgId();
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07051a" />
          <stop offset="0.6" stopColor="#24104a" />
          <stop offset="1" stopColor="#5a1a62" />
        </linearGradient>
        <radialGradient id={`${id}haze`} cx="0.5" cy="1" r="0.7">
          <stop offset="0" stopColor="#ff4fb4" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#7a3cff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#7a3cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}sky)`} />
      {CITY_STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.8} fill="#fff" opacity={s.o * 0.7} />
      ))}
      <rect width={W} height={H} fill={`url(#${id}haze)`} />
      <g fill="#2a1452" opacity="0.9">
        {CITY_BACK.map((b, i) => (
          <rect key={i} x={b.x} y={760 - b.h} width={b.w} height={b.h + 200} />
        ))}
      </g>
      {/* Lattice tower with a lit tip. */}
      <path d="M1180 820 L1236 300 L1244 300 L1300 820 Z" fill="#1a0b30" />
      <rect x="1238" y="230" width="4" height="74" fill="#1a0b30" />
      <circle cx="1240" cy="232" r="5" fill="#ff5a7a" />
      <circle cx="1240" cy="232" r="22" fill="#ff5a7a" opacity="0.25" />
      <g fill="#0c0620">
        {CITY_FRONT.map((b, i) => (
          <rect key={i} x={b.x} y={820 - b.h} width={b.w} height={b.h + 100} />
        ))}
      </g>
      <g>
        {CITY_FRONT.flatMap((b, i) =>
          b.windows.map(([x, y, c], j) => (
            <rect key={`${i}-${j}`} x={x} y={y} width="6" height="8" fill={c} opacity="0.85" />
          )),
        )}
      </g>
      <rect y="820" width={W} height="80" fill="#05030e" />
      <rect y="818" width={W} height="2" fill="#ff7ad9" opacity="0.35" />
    </Svg>
  );
}

function DesertDusk() {
  const id = useSvgId();
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1846" />
          <stop offset="0.45" stopColor="#a8466a" />
          <stop offset="0.75" stopColor="#f2945a" />
          <stop offset="1" stopColor="#ffc982" />
        </linearGradient>
        <radialGradient id={`${id}sun`}>
          <stop offset="0" stopColor="#fff0c8" />
          <stop offset="0.3" stopColor="#ffcf8a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff8a5a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}d1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9774a" />
          <stop offset="1" stopColor="#a4483a" />
        </linearGradient>
        <linearGradient id={`${id}d2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8473a" />
          <stop offset="1" stopColor="#6e2a2e" />
        </linearGradient>
        <linearGradient id={`${id}d3`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e2430" />
          <stop offset="1" stopColor="#240c18" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}sky)`} />
      <circle cx="580" cy="540" r="360" fill={`url(#${id}sun)`} />
      <circle cx="580" cy="560" r="96" fill="#ffe4b0" />
      <path d="M0 600 C260 540 480 560 720 600 C960 640 1200 560 1600 590 L1600 900 L0 900 Z" fill={`url(#${id}d1)`} />
      <path d="M0 690 C300 620 560 640 820 700 C1060 754 1300 650 1600 680 L1600 900 L0 900 Z" fill={`url(#${id}d2)`} />
      <path d="M820 700 C1060 754 1300 650 1600 680 L1600 688 C1300 664 1080 760 820 708 Z" fill="#ffb27a" opacity="0.35" />
      <path d="M0 800 C340 720 640 740 940 800 C1180 846 1400 770 1600 790 L1600 900 L0 900 Z" fill={`url(#${id}d3)`} />
      {/* A small caravan on the middle ridge, for scale. */}
      <g fill="#3a1424">
        <ellipse cx="1110" cy="694" rx="16" ry="7" />
        <rect x="1100" y="694" width="3" height="14" />
        <rect x="1117" y="694" width="3" height="14" />
        <rect x="1122" y="680" width="4" height="14" transform="rotate(20 1124 687)" />
        <ellipse cx="1170" cy="700" rx="14" ry="6" />
        <rect x="1162" y="700" width="3" height="12" />
        <rect x="1176" y="700" width="3" height="12" />
      </g>
    </Svg>
  );
}

function AuroraFjord() {
  const id = useSvgId();
  const ribbons = (
    <>
      <path d="M-100 330 C200 180 480 380 760 250 C1040 120 1300 300 1700 170" stroke={`url(#${id}ab)`} strokeWidth="120" />
      <path d="M-100 420 C260 320 520 460 860 340 C1140 240 1360 360 1700 290" stroke={`url(#${id}ag)`} strokeWidth="70" />
    </>
  );
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020a14" />
          <stop offset="1" stopColor="#0a3446" />
        </linearGradient>
        <linearGradient id={`${id}ag`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3dffb0" stopOpacity="0" />
          <stop offset="0.35" stopColor="#3dffb0" stopOpacity="0.9" />
          <stop offset="0.7" stopColor="#5ce1ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#b47aff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}ab`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9a6bff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#3dffb0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3dffb0" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}blur`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
        <clipPath id={`${id}water`}>
          <rect y="660" width={W} height={H - 660} />
        </clipPath>
        <linearGradient id={`${id}lake`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a3446" />
          <stop offset="1" stopColor="#01070c" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}sky)`} />
      {AURORA_STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.8} fill="#fff" opacity={s.o} />
      ))}
      <g fill="none" filter={`url(#${id}blur)`}>{ribbons}</g>
      <path d={ridge(21, 640, 260, 8)} fill="#03121c" />
      <rect y="660" width={W} height={H - 660} fill={`url(#${id}lake)`} />
      {/* Reflection: sky and ridge mirrored about the shoreline, squashed
          and dimmed, clipped to the water. */}
      <g clipPath={`url(#${id}water)`}>
        <g transform="translate(0 660) scale(1 -0.6) translate(0 -660)">
          <g fill="none" filter={`url(#${id}blur)`} opacity="0.35">
            {ribbons}
          </g>
          <path d={ridge(21, 640, 260, 8)} fill="#03121c" opacity="0.6" />
        </g>
      </g>
      <rect y="660" width={W} height="1.5" fill="#7fffd4" opacity="0.25" />
    </Svg>
  );
}

/** Picks the scene for a demo slide by its id. */
function DemoScene({ id }: { id?: string }) {
  switch (id) {
    case "alpine-dawn":
      return <AlpineDawn />;
    case "midnight-sea":
      return <MidnightSea />;
    case "neon-city":
      return <NeonCity />;
    case "desert-dusk":
      return <DesertDusk />;
    case "aurora-fjord":
      return <AuroraFjord />;
    default:
      return null;
  }
}

/**
 * Playground glue: five cinematic slides filling a dark 560px stage. Lives
 * in its own "use client" module: the entry is also evaluated by server
 * code (generateStaticParams, sitemap), which may not import hooks.
 */
export function ParallaxSliderPreview(props: ParallaxSliderPreviewProps) {
  return (
    <div className="relative h-[560px] w-full overflow-hidden bg-[#0a0a0a]">
      <ParallaxSlider
        {...props}
        items={DEMO_SLIDES}
        aria-label="旅のハイライト"
        className="h-full"
        renderItem={(item) => <DemoScene id={item.id} />}
      />
    </div>
  );
}
