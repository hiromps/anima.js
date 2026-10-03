"use client";

import { useRef, type CSSProperties } from "react";
import {
  TextReveal,
  type TextRevealProps,
} from "../components/text-reveal";
import { DEMO_PARAGRAPH, demoText } from "./text-reveal.demo-data";

/**
 * Playground-facing props: everything but `text` / `fontSize` passes
 * straight through; `text` uses " / " as a typeable line break (the
 * control is a single-line input) and `fontSize` sizes the headline.
 */
export type TextRevealPreviewProps = Pick<
  TextRevealProps,
  "mode" | "variant" | "stagger" | "duration" | "interval" | "split" | "gradient"
> & {
  text?: string;
  fontSize?: number;
};

/** Film grain as an inline SVG turbulence tile — keeps the dark stage from
    looking flat behind the glowing headline. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

/** Fades the scroll box's content out at both edges. */
const EDGE_FADE =
  "linear-gradient(to bottom, transparent, #000 22%, #000 70%, transparent)";
const SCROLL_MASK: CSSProperties = {
  maskImage: EDGE_FADE,
  WebkitMaskImage: EDGE_FADE,
};

/**
 * Playground glue: a dark hero stage — a two-line headline playing in
 * the selected mode (a loop by default, which paints the finished text
 * first so the gallery card is never empty), and below it a paragraph in
 * "scroll" mode inside its own small scroll container, already about a
 * third highlighted at first paint.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function TextRevealPreview({
  text = "",
  fontSize = 68,
  mode = "loop",
  gradient = true,
  split,
  ...rest
}: TextRevealPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex h-[560px] w-full flex-col items-center justify-center overflow-hidden bg-[#08070c] px-8 text-white">
      {/* Violet / sky light behind the headline, echoing the gradient fill. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 38% at 50% 32%, rgba(150,130,255,.20), transparent 70%), radial-gradient(40% 30% at 72% 70%, rgba(110,190,255,.10), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.07] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative flex w-full max-w-[920px] flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3.5 py-1.5 text-[12px] font-medium tracking-[.14em] text-white/60 uppercase">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-[#b9abff] shadow-[0_0_10px_#b9abff]"
          />
          anima.js / text reveal
        </span>

        {/* Tailwind's preflight makes the h2 inherit this size. */}
        <div style={{ fontSize, lineHeight: 1.08 }}>
          <TextReveal
            {...rest}
            text={demoText(text)}
            mode={mode}
            gradient={gradient}
            split={split}
            as="h2"
            className="m-0 font-semibold tracking-[-.035em] text-white"
          />
        </div>

        <div className="relative mt-9 w-full max-w-[560px]">
          <div
            ref={scrollRef}
            // relative: framer measures the target through the offsetParent
            // chain up to this element; a static container is skipped.
            className="relative h-[150px] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={SCROLL_MASK}
          >
            {/* Top spacer places the paragraph mid-way through its scroll
                range at scrollTop 0; the bottom one lets it finish. */}
            <div className="pt-[84px] pb-[150px]">
              <TextReveal
                as="p"
                mode="scroll"
                split={split}
                text={DEMO_PARAGRAPH}
                scrollContainerRef={scrollRef}
                className="m-0 text-[19px] leading-[1.6] font-medium tracking-[-.01em] text-white"
              />
            </div>
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 -bottom-5 text-[11px] tracking-[.14em] text-white/35 uppercase"
          >
            scroll ↓
          </span>
        </div>
      </div>
    </div>
  );
}
