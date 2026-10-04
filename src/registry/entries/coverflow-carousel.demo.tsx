"use client";

import {
  CoverflowCarousel,
  type CoverflowCarouselProps,
} from "../components/coverflow-carousel";
import { demoAlbums } from "./coverflow-carousel.demo-data";

export type CoverflowCarouselPreviewProps = Pick<
  CoverflowCarouselProps,
  | "rotate"
  | "depth"
  | "spacing"
  | "slideWidth"
  | "reflection"
  | "autoplay"
  | "interval"
  | "loop"
  | "showDots"
> & {
  /** Demo-only: how many of the nine album covers to show. */
  itemCount?: number;
};

/**
 * Playground glue: slices the demo covers and starts on the middle one so
 * both sides of the fan are populated at first paint (the gallery card
 * never shows a lopsided carousel). Keyed on the count so changing it
 * re-centres instead of keeping a stale index.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function CoverflowCarouselPreview({
  itemCount = 9,
  ...rest
}: CoverflowCarouselPreviewProps) {
  const items = demoAlbums(itemCount);
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Soft violet stage light so the glossy floor has something to catch. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_42%,rgba(140,110,255,0.16),transparent_70%)]"
      />
      <CoverflowCarousel
        key={items.length}
        {...rest}
        items={items}
        defaultIndex={Math.floor(items.length / 2)}
        aria-label="アルバム"
        className="max-w-[860px]"
      />
    </div>
  );
}
