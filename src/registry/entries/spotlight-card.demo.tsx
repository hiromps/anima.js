"use client";

import { Gauge, Globe, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import {
  SpotlightCard,
  SpotlightGrid,
  type SpotlightCardProps,
} from "../components/spotlight-card";
import { DEMO_FEATURES } from "./spotlight-card.demo-data";

/**
 * Playground-facing props: the appearance knobs pass straight through to
 * every card; `grouped` is demo-only and picks SpotlightGrid (one light
 * across the whole grid) over independent cards.
 */
export type SpotlightCardPreviewProps = Pick<
  SpotlightCardProps,
  "spotlightColor" | "borderColor" | "spotlightSize" | "intensity" | "radius"
> & {
  grouped?: boolean;
};

const ICONS: LucideIcon[] = [Zap, Globe, ShieldCheck, Gauge];

/**
 * Playground glue: a Linear-style 2×2 features grid on a dark stage.
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function SpotlightCardPreview({
  grouped = true,
  ...cardProps
}: SpotlightCardPreviewProps) {
  const cards = DEMO_FEATURES.map(({ title, description }, i) => {
    const Icon = ICONS[i % ICONS.length];
    return (
      <SpotlightCard key={title} as="li" {...cardProps}>
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08),inset_0_1px_0_rgba(255,255,255,.08)]"
        >
          <Icon size={19} strokeWidth={1.7} />
        </span>
        <h3 className="mt-6 text-[17px] font-semibold tracking-tight text-white">
          {title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-white/55">
          {description}
        </p>
      </SpotlightCard>
    );
  });

  const listClass = "grid w-full max-w-[720px] gap-3";
  // Inline, not a Tailwind class: the grid's module CSS is unlayered and
  // would beat a layered utility like grid-cols-2.
  const columns = { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };

  return (
    <div className="relative flex h-[560px] items-center justify-center overflow-hidden bg-[#0a0a0a] px-8">
      {/* Faint stage light so the dark cards separate from the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,.06),transparent_70%)]"
      />
      {grouped ? (
        <SpotlightGrid as="ul" className={`relative ${listClass}`} style={columns}>
          {cards}
        </SpotlightGrid>
      ) : (
        <ul className={`relative m-0 list-none p-0 ${listClass}`} style={columns}>{cards}</ul>
      )}
    </div>
  );
}
