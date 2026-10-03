"use client";

import {
  SwipeCardStack,
  type SwipeCardStackProps,
} from "../components/swipe-card-stack";
import { DEMO_TESTIMONIALS } from "./swipe-card-stack.demo-data";

/** Playground-facing props: every knob passes straight through. */
export type SwipeCardStackPreviewProps = Omit<SwipeCardStackProps, "items">;

/**
 * Playground glue: five testimonial cards on a dark stage. Lives in its own
 * "use client" module: the entry is also evaluated by server code
 * (generateStaticParams, sitemap), which may not import hooks.
 */
export function SwipeCardStackPreview(props: SwipeCardStackPreviewProps) {
  return (
    <div className="relative flex h-[560px] items-center justify-center overflow-hidden bg-[#0a0a0a] px-6">
      {/* Faint stage light + a colored bloom behind the deck, so the dark
          cards separate from the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,.07),transparent_70%),radial-gradient(40%_35%_at_50%_45%,rgba(167,139,250,.14),transparent_70%)]"
      />
      <SwipeCardStack
        {...props}
        items={DEMO_TESTIMONIALS}
        aria-label="お客様の声"
        className="relative"
      />
    </div>
  );
}
