"use client";

import { Sparkles } from "lucide-react";
import {
  OrbitingIcons,
  type OrbitingIconsProps,
} from "../components/orbiting-icons";
import { demoRings } from "./orbiting-icons.demo-data";

/**
 * Playground-facing props: the appearance knobs pass straight through;
 * `ringCount` / `speed` are demo-only and become the `rings` data.
 */
export type OrbitingIconsPreviewProps = Pick<
  OrbitingIconsProps,
  | "size"
  | "centerSize"
  | "chipSize"
  | "showRings"
  | "ringStyle"
  | "showBeams"
  | "pauseOnHover"
  | "glowColor"
> & {
  ringCount?: string;
  speed?: number;
};

/** SVG fractal noise, tiled at low opacity for a premium matte backdrop. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Playground glue: a dark hero stage — faint dot grid fading out from the
 * center, grain — with the orbits centered. The center slot gets an
 * "anima" badge whose gradient starts at the live glow color, so the knob
 * visibly ties the logo and its light together.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function OrbitingIconsPreview({
  ringCount = "2",
  speed = 28,
  glowColor = "#8b7bff",
  ...rest
}: OrbitingIconsPreviewProps) {
  const rings = demoRings(ringCount, speed, rest).map(({ items, ...ring }) => ({
    ...ring,
    items: items.map(({ icon, label }) => ({ icon, label })),
  }));

  return (
    <div className="relative flex h-[560px] w-full items-center justify-center overflow-hidden bg-[#0a0a0a] px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(closest-side,#000_30%,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      <OrbitingIcons
        {...rest}
        rings={rings}
        glowColor={glowColor}
        aria-label="連携サービス"
      >
        <span
          role="img"
          aria-label="anima"
          className="grid size-[78%] place-items-center rounded-full text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-8px_16px_rgba(0,0,0,0.25)]"
          style={{
            background: `radial-gradient(120% 120% at 30% 15%, rgba(255,255,255,0.35), transparent 45%), linear-gradient(140deg, ${glowColor}, #ff7ac6 60%, #ffb86b)`,
          }}
        >
          <Sparkles aria-hidden className="size-[46%]" strokeWidth={1.75} />
        </span>
      </OrbitingIcons>
    </div>
  );
}
