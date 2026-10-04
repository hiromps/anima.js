"use client";

import { FanCarousel, type FanCarouselProps } from "../components/fan-carousel";
import { demoItems } from "./fan-carousel.demo-data";

/** Playground-facing props: geometry/motion knobs pass straight through;
 *  `itemCount` is demo-only and slices the tarot deck. */
export type FanCarouselPreviewProps = Omit<FanCarouselProps, "items"> & {
  itemCount?: number;
};

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Playground glue: the tarot deck on a dark velvet stage. Lives in its own
 * "use client" module: the entry is also evaluated by server code
 * (generateStaticParams, sitemap), which may not import hooks.
 */
export function FanCarouselPreview({ itemCount = 9, ...props }: FanCarouselPreviewProps) {
  const count = Math.max(1, Math.min(9, Math.round(itemCount)));
  const items = demoItems(count);
  return (
    <div className="relative flex h-[560px] w-full flex-col items-center justify-center overflow-hidden bg-[#0c0609] px-4">
      {/* Velvet: a wine-dark spotlight from above, a warm pool under the
          hand, deep vignette and a fabric-like grain. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(150,40,80,.32),transparent_70%),radial-gradient(45%_30%_at_50%_70%,rgba(241,210,154,.10),transparent_70%),radial-gradient(120%_90%_at_50%_50%,transparent_45%,rgba(0,0,0,.75)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.16] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      <FanCarousel
        // Remount on deck size so the hand re-centres and re-deals.
        key={count}
        {...props}
        items={items}
        defaultIndex={Math.floor(count / 2)}
        aria-label="タロットカード"
        className="relative"
      />
    </div>
  );
}
