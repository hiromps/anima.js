"use client";

import { useLayoutEffect, useRef } from "react";
import {
  GlassTopBar,
  type GlassTopBarProps,
} from "../components/glass-top-bar";
import { DEMO_LEADING, demoTrailing } from "./glass-top-bar.demo-data";

/**
 * Playground-facing props: the schema's content/appearance/motion knobs pass
 * straight through; `showBack` and `trailingCount` are demo-only (the real
 * props take action objects).
 */
export type GlassTopBarPreviewProps = Pick<
  GlassTopBarProps,
  | "subtitle"
  | "revealDistance"
  | "hideOnScroll"
  | "glowColorA"
  | "glowColorB"
  | "blur"
  | "springStiffness"
  | "springDamping"
> & {
  title?: string;
  showBack?: boolean;
  trailingCount?: string;
};

/** Where the preview starts scrolled to, so the glass is visible at first paint. */
const INITIAL_SCROLL = 80;

const TILE_GRADIENTS = [
  "bg-[linear-gradient(135deg,#ff8fb1,#ff5c8a)]",
  "bg-[linear-gradient(135deg,#8f7cff,#5b8cff)]",
  "bg-[linear-gradient(135deg,#4de3ff,#3b82f6)]",
  "bg-[linear-gradient(135deg,#ffd166,#ff8a5c)]",
  "bg-[linear-gradient(135deg,#7cffc4,#28c7a0)]",
  "bg-[linear-gradient(135deg,#f5a9ff,#b06cff)]",
];

/**
 * Mock page that scrolls under the bar, opening with an iOS-style large
 * title. Bright tiles on a dark page are what make the frosted glass
 * readable — over a flat dark background the blur would be invisible.
 */
function MockPage({ title }: { title: string }) {
  return (
    <>
      <p className="text-[11px] font-medium tracking-wider text-white/45 uppercase">
        anima.js demo
      </p>
      <h1 className="mt-1 text-[32px] leading-tight font-bold tracking-tight">
        {title}
      </h1>
      <div className="mt-4 h-40 rounded-3xl bg-[linear-gradient(135deg,#ff8fb1,#8f7cff_55%,#4de3ff)]" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {TILE_GRADIENTS.map((gradient) => (
          <div key={gradient} className={`aspect-square rounded-2xl ${gradient}`} />
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <div className="h-3 w-4/5 rounded-full bg-white/15" />
        <div className="h-3 w-full rounded-full bg-white/10" />
        <div className="h-3 w-2/3 rounded-full bg-white/10" />
      </div>
      <div className="mt-5 h-32 rounded-3xl bg-[linear-gradient(135deg,#ffb86c,#ff5c8a_60%,#8f7cff)]" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {TILE_GRADIENTS.slice(0, 4).map((gradient) => (
          <div key={gradient} className={`aspect-square rounded-2xl ${gradient}`} />
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <div className="h-3 w-3/4 rounded-full bg-white/15" />
        <div className="h-3 w-full rounded-full bg-white/10" />
      </div>
    </>
  );
}

/**
 * Playground glue: the real bar is `position: fixed` and tracks the window
 * scroll, neither of which can be previewed inside a desktop page. So the
 * preview places it at the top of a phone frame (below the status bar via
 * the `--gtb-top` hook), points it at the frame's own scroller, and starts
 * that scroller a little way down so the glass state shows without any
 * interaction. The demo buttons do nothing.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function GlassTopBarPreview({
  title = "",
  showBack = true,
  trailingCount,
  ...rest
}: GlassTopBarPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Before paint, so the first frame already shows the scrolled state.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = INITIAL_SCROLL;
  }, []);

  const noop = () => {};
  const trailing = demoTrailing(trailingCount).map(({ icon, label }) => ({
    icon,
    label,
    onClick: noop,
  }));

  return (
    <div className="flex h-[560px] items-center justify-center p-3">
      <div className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[2.25rem] bg-[#171320] text-white shadow-2xl ring-8 ring-black/70">
        {/* Scrollbar hidden: a desktop scrollbar inside a phone frame reads as a bug. */}
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto overscroll-contain px-5 pt-[112px] pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <MockPage title={title} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-between px-7 text-[13px] font-semibold"
        >
          <span>9:41</span>
          <span className="h-1.5 w-12 rounded-full bg-white/30" />
        </div>
        <GlassTopBar
          {...rest}
          title={title}
          leading={showBack ? { ...DEMO_LEADING, onClick: noop } : undefined}
          trailing={trailing}
          scrollContainerRef={scrollRef}
          placement="absolute"
          className="[--gtb-top:48px]"
        />
      </div>
    </div>
  );
}
