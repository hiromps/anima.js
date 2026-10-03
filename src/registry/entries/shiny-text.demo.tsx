"use client";

import type { CSSProperties } from "react";
import {
  ShinyText,
  type ShinyTextProps,
  type ShinyTextVariant,
} from "../components/shiny-text";

/**
 * Playground-facing props: `text` / `variant` / `baseColor` / `speed` /
 * `angle` / `glow` pass straight through; `color1–3` become `colors` and
 * `fontSize` sizes the headline.
 */
export type ShinyTextPreviewProps = Pick<
  ShinyTextProps,
  "text" | "variant" | "baseColor" | "speed" | "angle" | "glow"
> & {
  color1?: string;
  color2?: string;
  color3?: string;
  fontSize?: number;
};

const VARIANT_LABELS: Record<ShinyTextVariant, string> = {
  shimmer: "シマー",
  gradient: "グラデーション",
  aurora: "オーロラ",
  metallic: "メタリック",
};

const SAMPLE_WORDS: Record<ShinyTextVariant, string> = {
  shimmer: "Shimmer",
  gradient: "Gradient",
  aurora: "Aurora",
  metallic: "Metallic",
};

/**
 * Film grain as an inline SVG turbulence tile — a flat dark stage looks
 * cheap next to the gradients.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

/** Faint grid that fades out toward the edges (Linear / Vercel hero look). */
const GRID_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage: "radial-gradient(70% 60% at 50% 45%, #000 30%, transparent 80%)",
};

/**
 * Playground glue: a dark hero stage — a shimmering "new" badge, the
 * headline in the selected variant, and the other three variants in a row
 * below for comparison (each at its own default speed).
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function ShinyTextPreview({
  text = "",
  variant = "aurora",
  color1 = "#a78bfa",
  color2 = "#f472b6",
  color3 = "#60a5fa",
  baseColor,
  speed,
  angle,
  glow,
  fontSize = 64,
}: ShinyTextPreviewProps) {
  const colors = [color1, color2, color3];
  const others = (Object.keys(VARIANT_LABELS) as ShinyTextVariant[]).filter(
    (v) => v !== variant,
  );

  return (
    <div className="relative flex h-[560px] w-full items-center justify-center overflow-hidden bg-[#08080a] px-8 text-white">
      {/* Palette-tinted light behind the headline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(50% 40% at 50% 46%, color-mix(in srgb, ${color1} 16%, transparent), transparent 70%), radial-gradient(35% 30% at 72% 70%, color-mix(in srgb, ${color3} 10%, transparent), transparent 70%)`,
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={GRID_STYLE} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.07] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative flex max-w-[980px] flex-col items-center text-center">
        <span className="mb-7 inline-flex items-center rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-[13px] font-medium tracking-[.02em] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
          <ShinyText
            text="✦ 新しくなった anima.js"
            variant="shimmer"
            colors={colors}
            baseColor={baseColor}
            angle={angle}
          />
        </span>

        {/* Tailwind's preflight makes the h2 inherit this size. No
            text-shadow here: it would show through the transparent glyphs. */}
        <div
          className="font-semibold tracking-[-.035em] [text-wrap:balance]"
          style={{ fontSize, lineHeight: 1.1 }}
        >
          <ShinyText
            as="h2"
            text={text}
            variant={variant}
            colors={colors}
            baseColor={baseColor}
            speed={speed}
            angle={angle}
            glow={glow}
            className="m-0"
          />
        </div>

        <ul className="mt-12 flex flex-wrap items-end justify-center gap-x-12 gap-y-6">
          {others.map((v) => (
            <li key={v} className="flex flex-col items-center gap-2">
              <span className="text-[30px] font-semibold tracking-[-.02em]">
                <ShinyText
                  text={SAMPLE_WORDS[v]}
                  variant={v}
                  colors={colors}
                  baseColor={baseColor}
                  angle={angle}
                />
              </span>
              <span className="text-[11px] font-medium tracking-[.14em] text-white/40 uppercase">
                {VARIANT_LABELS[v]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
