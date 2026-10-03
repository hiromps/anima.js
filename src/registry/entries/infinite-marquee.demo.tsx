"use client";

import {
  Atom,
  Compass,
  Hexagon,
  Orbit,
  Sparkles,
  Triangle,
  Waves,
  type LucideIcon,
} from "lucide-react";
import {
  InfiniteMarquee,
  type InfiniteMarqueeProps,
} from "../components/infinite-marquee";
import { KINETIC_SEPARATOR, KINETIC_WORDS } from "./infinite-marquee.demo-data";

/** Playground-facing props: every schema knob maps straight to a prop. */
export type InfiniteMarqueePreviewProps = Pick<
  InfiniteMarqueeProps,
  | "speed"
  | "direction"
  | "pauseOnHover"
  | "fade"
  | "fadeWidth"
  | "gap"
  | "variant"
  | "bandColor"
  | "bandRotate"
>;

/**
 * Invented wordmarks — no real brands. Each gets its own type treatment so
 * the row reads like a logo wall rather than a list of words.
 */
const FAKE_BRANDS: { name: string; icon: LucideIcon; className: string }[] = [
  { name: "Lumina", icon: Sparkles, className: "font-semibold tracking-tight" },
  { name: "OBELISK", icon: Triangle, className: "font-bold tracking-[0.18em] text-[15px]" },
  { name: "quanta", icon: Atom, className: "font-mono font-medium lowercase" },
  { name: "Meridian", icon: Compass, className: "font-serif italic text-[22px]" },
  { name: "Arcwave", icon: Waves, className: "font-extrabold tracking-[-0.04em]" },
  { name: "Hexa Labs", icon: Hexagon, className: "font-medium" },
  { name: "Novaform", icon: Orbit, className: "font-light tracking-wide" },
];

function LogoRowItems() {
  return FAKE_BRANDS.map(({ name, icon: Icon, className }) => (
    <span
      key={name}
      className={`inline-flex items-center gap-2 text-[19px] text-white/55 ${className}`}
    >
      <Icon aria-hidden className="size-[22px] shrink-0" strokeWidth={1.75} />
      {name}
    </span>
  ));
}

function KineticItems() {
  return KINETIC_WORDS.flatMap((word) => [
    <span key={word}>{word}</span>,
    <span key={`${word}-sep`} aria-hidden className="text-[0.62em] opacity-80">
      {KINETIC_SEPARATOR}
    </span>,
  ]);
}

/** SVG fractal noise, tiled at low opacity for a premium matte backdrop. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Playground glue: a dark landing-page stage with the two classic uses —
 * a logo wall and, below it, a kinetic-type band running the other way.
 * The knobs drive both rows (band row = the live `direction`, logo row =
 * the opposite); `variant` / `band*` apply to the band row, which is also
 * what the generated snippet describes.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function InfiniteMarqueePreview({
  direction = "left",
  variant = "band",
  bandColor,
  bandRotate,
  ...shared
}: InfiniteMarqueePreviewProps) {
  const opposite = direction === "left" ? "right" : "left";

  return (
    <div className="relative flex h-[560px] w-full flex-col justify-center overflow-hidden bg-[#0a0a0a] text-white">
      {/* Backdrop: two soft light pools + grain. Decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(120,110,255,0.20),transparent_70%),radial-gradient(50%_40%_at_50%_100%,rgba(212,255,63,0.08),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative">
        <p className="mb-6 text-center text-[12px] font-medium tracking-[0.2em] text-white/40 uppercase">
          世界中のプロダクトチームが採用
        </p>
        <InfiniteMarquee
          {...shared}
          direction={opposite}
          variant="plain"
          aria-label="導入企業"
        >
          <LogoRowItems />
        </InfiniteMarquee>
      </div>

      <div className="relative mt-24">
        <InfiniteMarquee
          {...shared}
          direction={direction}
          variant={variant}
          bandColor={bandColor}
          bandRotate={bandRotate}
          // "plain" leaves type to the children; give the words the same
          // display scale so the row still reads as kinetic type.
          className={
            variant === "plain"
              ? "text-[72px] leading-none font-extrabold tracking-[-0.035em] text-white/90 uppercase"
              : undefined
          }
          aria-label="スローガン"
        >
          <KineticItems />
        </InfiniteMarquee>
      </div>
    </div>
  );
}
