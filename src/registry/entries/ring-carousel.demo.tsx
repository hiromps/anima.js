"use client";

import { RingCarousel, type RingCarouselProps } from "../components/ring-carousel";
import { DEMO_RING_ITEMS } from "./ring-carousel.demo-data";

/**
 * Playground-facing props: `cardCount` is demo-only (it slices the demo
 * items); every other knob passes straight through.
 */
export type RingCarouselPreviewProps = Omit<RingCarouselProps, "items"> & {
  cardCount?: number;
};

/**
 * Playground glue: the ring on a dark stage with a faint top light and a
 * coloured bloom where the floor glow pools. Lives in its own "use client"
 * module: the entry is also evaluated by server code (generateStaticParams,
 * sitemap), which may not import hooks.
 */
export function RingCarouselPreview({ cardCount = 10, ...rest }: RingCarouselPreviewProps) {
  const items = DEMO_RING_ITEMS.slice(0, Math.max(1, Math.min(cardCount, DEMO_RING_ITEMS.length)));
  return (
    <div className="relative flex h-[560px] w-full items-center justify-center overflow-hidden bg-[#0a0a0a] px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(255,255,255,.07),transparent_70%),radial-gradient(45%_30%_at_50%_72%,rgba(139,92,246,.16),transparent_70%)]"
      />
      <RingCarousel
        {...rest}
        items={items}
        height={540}
        aria-label="フォトギャラリー"
        className="relative"
      />
    </div>
  );
}
