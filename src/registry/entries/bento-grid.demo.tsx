"use client";

import { useId, useRef, type ReactNode } from "react";
import { MotionConfig, motion, useInView, useReducedMotion } from "framer-motion";
import {
  BentoGrid,
  type BentoGridProps,
  type BentoItem,
} from "../components/bento-grid";
import { DEMO_ITEMS, type DemoVisual } from "./bento-grid.demo-data";

/**
 * Playground-facing props: every knob is a real BentoGrid prop. The demo
 * supplies the items (with preview-only illustrations).
 */
export type BentoGridPreviewProps = Pick<
  BentoGridProps,
  "columns" | "gap" | "radius" | "revealOnScroll" | "accent"
>;

/* --- Demo-only illustrations ---------------------------------------------
   Each reads the tile color as var(--bento-accent), so the playground's
   accent knob recolors the first tile's chart live. Loops run only while
   on screen and stop entirely under prefers-reduced-motion. */

/** Deterministic bar heights (0–1) so server and client render alike. */
const BARS = [0.34, 0.48, 0.41, 0.6, 0.52, 0.7, 0.58, 0.76, 0.66, 0.84, 0.72, 0.95];

function BarsVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const animate = inView && !reduce;
  return (
    <div ref={ref} aria-hidden className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tracking-tight text-white">1.2s</span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{
            color: "color-mix(in srgb, var(--bento-accent) 75%, white)",
            background: "color-mix(in srgb, var(--bento-accent) 16%, transparent)",
          }}
        >
          −68%
        </span>
      </div>
      {/* Faint gridlines behind the bars give the chart a scale. */}
      <div
        className="relative flex min-h-0 flex-1 items-end gap-[5px]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px)",
          backgroundSize: "100% 25%",
        }}
      >
        {BARS.map((h, i) => (
          <motion.span
            key={i}
            className="block h-full flex-1 origin-bottom rounded-t-[4px]"
            style={{
              scaleY: h,
              opacity: 0.45 + h * 0.55,
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--bento-accent) 20%, transparent), var(--bento-accent))",
            }}
            animate={
              animate
                ? { scaleY: [h, Math.max(0.18, h - 0.22), Math.min(1, h + 0.08), h] }
                : undefined
            }
            transition={{
              duration: 2.6 + (i % 4) * 0.35,
              delay: i * 0.08,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Edge locations on the dotted map, in % of the visual's box. */
const PINS = [
  { x: 24, y: 38 },
  { x: 52, y: 30 },
  { x: 76, y: 46 },
  { x: 60, y: 70 },
];

/** Blobs that carve "continents" out of the dot grid. */
const LAND_MASK = [
  "radial-gradient(ellipse 22% 26% at 24% 36%, #000 60%, transparent 100%)",
  "radial-gradient(ellipse 14% 22% at 32% 72%, #000 55%, transparent 100%)",
  "radial-gradient(ellipse 26% 22% at 58% 30%, #000 60%, transparent 100%)",
  "radial-gradient(ellipse 16% 20% at 56% 64%, #000 55%, transparent 100%)",
  "radial-gradient(ellipse 18% 18% at 80% 46%, #000 60%, transparent 100%)",
  "radial-gradient(ellipse 9% 10% at 86% 76%, #000 55%, transparent 100%)",
].join(", ");

function GlobeVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const animate = inView && !reduce;
  return (
    <div ref={ref} aria-hidden className="relative h-full min-h-[64px] w-full">
      {/* Dots and mask set inline (mask with its -webkit- twin) rather than
          in CSS, where the build's prefixer may drop one of the pair. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,.42) 1px, transparent 1.6px)",
          backgroundSize: "9px 9px",
          maskImage: LAND_MASK,
          WebkitMaskImage: LAND_MASK,
        }}
      />
      {PINS.map(({ x, y }, i) => (
        <span
          key={i}
          className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: "var(--bento-accent)", opacity: 0 }}
            animate={animate ? { scale: [1, 3.2], opacity: [0.55, 0] } : undefined}
            transition={{ duration: 2.2, delay: i * 0.55, repeat: Infinity, ease: "easeOut" }}
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: "var(--bento-accent)",
              boxShadow: "0 0 10px var(--bento-accent)",
            }}
          />
        </span>
      ))}
    </div>
  );
}

function ChatVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const animate = inView && !reduce;
  return (
    <div
      ref={ref}
      aria-hidden
      className="flex h-full min-h-0 flex-col justify-center gap-2 text-[11.5px] leading-snug"
    >
      <div className="max-w-[85%] self-end rounded-[12px] rounded-br-[4px] bg-white/[0.07] px-2.5 py-1.5 text-white/75">
        この関数を高速化して
      </div>
      <div
        className="max-w-[90%] self-start rounded-[12px] rounded-bl-[4px] px-2.5 py-1.5 text-white/85"
        style={{
          background: "color-mix(in srgb, var(--bento-accent) 16%, transparent)",
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--bento-accent) 28%, transparent)",
        }}
      >
        メモ化で再計算を 80% 削減できます
      </div>
      <div className="flex gap-1 self-start rounded-full bg-white/[0.05] px-2.5 py-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block size-[5px] rounded-full bg-white/60"
            animate={animate ? { y: [0, -3, 0], opacity: [0.4, 1, 0.4] } : undefined}
            transition={{ duration: 1, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

const SPARK = "M0 34 L12 30 L24 32 L36 22 L48 25 L60 16 L72 19 L84 9 L100 4";

function SparklineVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  // Unique per instance: the gallery and playground may render it twice.
  const gradientId = `bento-spark-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <div ref={ref} aria-hidden className="h-full min-h-[56px] w-full">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="size-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--bento-accent)", stopOpacity: 0.35 }} />
            <stop offset="1" style={{ stopColor: "var(--bento-accent)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={`${SPARK} L100 40 L0 40 Z`} fill={`url(#${gradientId})`} />
        {/* Draws itself once when scrolled in; static when motion is reduced. */}
        <motion.path
          d={SPARK}
          fill="none"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ stroke: "var(--bento-accent)" }}
          initial={reduce ? false : { pathLength: 0 }}
          animate={inView || reduce ? { pathLength: 1 } : undefined}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </div>
  );
}

const VISUALS: Record<DemoVisual, () => ReactNode> = {
  bars: () => <BarsVisual />,
  globe: () => <GlobeVisual />,
  chat: () => <ChatVisual />,
  sparkline: () => <SparklineVisual />,
};

const items: BentoItem[] = DEMO_ITEMS.map(({ title, description, span, icon, accent, visual }) => ({
  title,
  description,
  span,
  icon,
  accent,
  visual: visual ? VISUALS[visual]() : undefined,
}));

/**
 * Playground glue: the six-tile feature grid on a dark stage.
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function BentoGridPreview({ revealOnScroll = true, ...rest }: BentoGridPreviewProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full min-h-[560px] w-full items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 py-5">
        {/* px-4 keeps the grid ≥640px wide (4 columns) even in the
            narrowest gallery card: 272px / 0.4 − 32px. */}
        {/* Faint stage light so the dark tiles separate from the page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,.06),transparent_70%)]"
        />
        <div className="relative w-full max-w-[960px]">
          {/* Remount when the knob flips so turning it on replays the reveal. */}
          <BentoGrid
            key={String(revealOnScroll)}
            {...rest}
            revealOnScroll={revealOnScroll}
            items={items}
            aria-label="機能一覧"
          />
        </div>
      </div>
    </MotionConfig>
  );
}
