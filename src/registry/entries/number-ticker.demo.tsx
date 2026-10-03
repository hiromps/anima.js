"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Shuffle } from "lucide-react";
import {
  NumberTicker,
  type NumberTickerProps,
} from "../components/number-ticker";

/**
 * Playground-facing props: the schema knobs pass straight through to the
 * first (schema-driven) stat; `fontSize` sizes all three numbers.
 */
export type NumberTickerPreviewProps = Partial<
  Pick<
    NumberTickerProps,
    | "value"
    | "from"
    | "variant"
    | "decimals"
    | "prefix"
    | "suffix"
    | "compact"
    | "duration"
    | "springStiffness"
    | "springDamping"
  >
> & {
  fontSize?: number;
};

/** Film grain as an inline SVG turbulence tile — flat black reads cheap. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

/** Faint grid fading toward the edges (Linear / Vercel hero look). */
const GRID_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
  maskImage: "radial-gradient(70% 60% at 50% 50%, #000 30%, transparent 80%)",
};

type Override = {
  /** The schema `value` these random numbers were rolled against. */
  forValue: number;
  a: number;
  b: number;
  c: number;
};

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

type StatCardProps = {
  label: string;
  caption: string;
  accent: string;
  fontSize: number;
  /**
   * Rough width of the number in em. The number shrinks with the card
   * (container units) so a long value never overflows a narrow column.
   */
  widthEm: number;
  children: ReactNode;
};

function StatCard({ label, caption, accent, fontSize, widthEm, children }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/[.08] bg-[linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_20px_50px_-20px_rgba(0,0,0,.6)] backdrop-blur-xl [container-type:inline-size]">
      {/* Accent light bleeding in from the top edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-center gap-2 text-[12px] font-medium tracking-[.08em] text-white/55">
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
        {label}
      </div>
      <div
        className="relative mt-3 leading-none font-semibold tracking-[-.03em] text-white [text-shadow:0_0_32px_rgba(255,255,255,.14)]"
        style={{ fontSize: `min(${fontSize}px, ${(100 / widthEm).toFixed(2)}cqi)` }}
      >
        {children}
      </div>
      <p className="relative mt-3 text-[12px] text-white/40">{caption}</p>
    </div>
  );
}

/**
 * Playground glue: a dark stats band with three glass cards. The first
 * stat follows the schema; the other two show the count and compact
 * styles. Everything starts on mount (`startOnView={false}`) so the
 * gallery card shows numbers running, not zeros waiting for a scroll.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function NumberTickerPreview({
  value = 12480000,
  fontSize = 44,
  ...rest
}: NumberTickerPreviewProps) {
  const [override, setOverride] = useState<Override | null>(null);
  // A random roll only counts while the schema value it was made against
  // is still current — moving the slider takes the first card back.
  const live = override && override.forValue === value ? override : null;

  const shuffle = () =>
    setOverride({
      forValue: value,
      a: Math.round(randomBetween(6_000_000, 18_000_000) / 10_000) * 10_000,
      b: Math.round(randomBetween(91, 99.9) * 10) / 10,
      c: Math.round(randomBetween(12_000, 48_000) / 100) * 100,
    });

  return (
    <div className="@container relative flex min-h-[560px] w-full flex-col items-center justify-center overflow-hidden bg-[#09080d] px-8 py-10 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 40% at 30% 30%, rgba(124,108,255,.18), transparent 70%), radial-gradient(45% 40% at 78% 70%, rgba(56,189,248,.12), transparent 70%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={GRID_STYLE} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.07] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative w-full max-w-[920px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium tracking-[.14em] text-white/45 uppercase">
              anima.js / text
            </p>
            <h2 className="mt-1.5 text-[24px] font-semibold tracking-[-.02em]">
              数字で見る、これまでの歩み
            </h2>
          </div>
          <button
            type="button"
            onClick={shuffle}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-4 text-[13px] font-medium text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,.12)] transition hover:bg-white/[.1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[.97]"
          >
            <Shuffle size={14} strokeWidth={2} aria-hidden />
            値をランダムに変更
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 @[640px]:grid-cols-[1.55fr_1fr_1fr]">
          <StatCard
            label="流通総額"
            caption="サービス開始からの累計"
            accent="#8b7cff"
            fontSize={fontSize}
            widthEm={6.2}
          >
            <NumberTicker
              {...rest}
              value={live ? live.a : value}
              startOnView={false}
            />
          </StatCard>
          <StatCard
            label="満足度"
            caption="導入企業アンケート"
            accent="#38bdf8"
            fontSize={fontSize}
            widthEm={3.4}
          >
            <NumberTicker
              value={live ? live.b : 98.7}
              decimals={1}
              suffix="%"
              delay={150}
              startOnView={false}
            />
          </StatCard>
          <StatCard
            label="導入社数"
            caption="2026年10月時点"
            accent="#f472b6"
            fontSize={fontSize}
            widthEm={3.6}
          >
            <NumberTicker
              value={live ? live.c : 24000}
              // From 1万: below it ja-JP compact prints the full number,
              // which would flash "9,999.0" mid-count.
              from={10000}
              decimals={1}
              compact
              suffix="+"
              delay={300}
              startOnView={false}
            />
          </StatCard>
        </div>
      </div>
    </div>
  );
}
