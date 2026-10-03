"use client";

import type { CSSProperties } from "react";
import {
  TextScramble,
  type TextScrambleProps,
} from "../components/text-scramble";

/**
 * Playground-facing props: `trigger` / `duration` / `glyphs` /
 * `accentColor` / `monospace` pass straight through; `phrase1–3` become
 * `phrases` (or `text` outside "loop") and `fontSize` sizes the headline.
 */
export type TextScramblePreviewProps = Pick<
  TextScrambleProps,
  "trigger" | "duration" | "accentColor" | "monospace"
> & {
  glyphs?: string;
  phrase1?: string;
  phrase2?: string;
  phrase3?: string;
  fontSize?: number;
};

/**
 * Film grain as an inline SVG turbulence tile — a flat dark stage looks
 * cheap next to the glowing glyphs.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

/** Faint grid that fades out toward the edges (Linear / Vercel hero look). */
const GRID_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage: "radial-gradient(70% 60% at 50% 45%, #000 30%, transparent 80%)",
};

/**
 * Playground glue: a dark hero stage with the headline looping through
 * the three phrases and a caption that re-decodes on hover.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function TextScramblePreview({
  phrase1 = "",
  phrase2 = "",
  phrase3 = "",
  fontSize = 64,
  trigger = "loop",
  glyphs,
  accentColor = "#9aa8ff",
  ...rest
}: TextScramblePreviewProps) {
  const phrases = [phrase1, phrase2, phrase3].filter(Boolean);

  return (
    <div className="relative flex h-[560px] w-full items-center justify-center overflow-hidden bg-[#08080a] px-8 text-white">
      {/* Accent-tinted light behind the headline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(55% 45% at 50% 42%, color-mix(in srgb, ${accentColor} 22%, transparent), transparent 70%), radial-gradient(40% 35% at 70% 75%, rgba(255,255,255,.05), transparent 70%)`,
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={GRID_STYLE} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.07] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative flex max-w-[960px] flex-col items-center text-center">
        <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3.5 py-1.5 text-[12px] font-medium tracking-[.14em] text-white/60 uppercase">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
          />
          anima.js / text
        </span>

        {/* Tailwind's preflight makes the h2 inherit this size. */}
        <div style={{ fontSize, lineHeight: 1.08 }}>
          <TextScramble
            {...rest}
            as="h2"
            trigger={trigger}
            glyphs={glyphs}
            accentColor={accentColor}
            phrases={trigger === "loop" ? phrases : undefined}
            text={trigger === "loop" ? undefined : (phrases[0] ?? "")}
            className="m-0 font-semibold tracking-[-.035em] text-white [text-shadow:0_0_40px_rgba(255,255,255,.12)]"
          />
        </div>

        <p className="mt-7 max-w-[34em] text-[16px] leading-relaxed text-white/50">
          <TextScramble
            text="カーソルを重ねると、もう一度デコードされます。"
            trigger="hover"
            duration={900}
            glyphs={glyphs}
            accentColor={accentColor}
            monospace={rest.monospace}
          />
        </p>
      </div>
    </div>
  );
}
