"use client";

import { SnapCarousel, type SnapCarouselProps } from "../components/snap-carousel";
import { DEMO_LABEL, DEMO_PRODUCTS } from "./snap-carousel.demo-data";

/**
 * Playground-facing props: every knob is a real SnapCarousel prop
 * (`slidesPerView` arrives as the number knob, i.e. the lg value). The
 * demo supplies the product items.
 */
export type SnapCarouselPreviewProps = Pick<
  SnapCarouselProps,
  | "gap"
  | "peek"
  | "showArrows"
  | "indicator"
  | "fade"
  | "loop"
  | "autoplay"
  | "interval"
  | "align"
> & { slidesPerView?: number };

/**
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 *
 * Height is left to the content, with vertical padding that brings the
 * playground stage to ~460px. In the gallery card the box is fixed and
 * shorter, and flex centering crops that padding evenly instead.
 */
export function SnapCarouselPreview(props: SnapCarouselPreviewProps) {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-[84px] text-white">
      <div className="w-full max-w-[880px]">
        <SnapCarousel {...props} items={DEMO_PRODUCTS} aria-label={DEMO_LABEL} />
      </div>
    </div>
  );
}
