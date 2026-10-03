"use client";

import {
  DotGridBackground,
  type DotGridBackgroundProps,
} from "../components/dot-grid-background";

/**
 * Playground-facing props: every knob maps 1:1 to the component except
 * `headline`, which is demo-only hero copy (the real component takes any
 * children).
 */
export type DotGridBackgroundPreviewProps = Omit<
  DotGridBackgroundProps,
  "children" | "className"
> & {
  headline?: string;
};

/**
 * A landing-page hero over the dot grid, so the card shows the component
 * in the job it's built for. Lives in its own "use client" module: the
 * entry is also evaluated by server code, which may not import client
 * modules with hooks.
 */
export function DotGridBackgroundPreview({
  headline = "ポインタに、反応する背景。",
  ...rest
}: DotGridBackgroundPreviewProps) {
  // The badge dot follows the accent knob so the hero stays one palette.
  const accent = rest.accentColor ?? "#a78bfa";
  return (
    <div className="h-[560px] w-full">
      <DotGridBackground {...rest}>
        <section
          aria-label="ヒーロー"
          className="flex h-full flex-col items-center justify-center px-6 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-white/75 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)] backdrop-blur-md">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            Interactive Canvas
          </span>
          <h1 className="mt-6 max-w-[16ch] bg-[linear-gradient(180deg,#fff_35%,rgba(255,255,255,.6))] bg-clip-text text-[52px] leading-[1.12] font-semibold tracking-[-0.03em] text-balance text-transparent">
            {headline}
          </h1>
          <p className="mt-5 max-w-[30rem] text-[15px] leading-relaxed text-white/60">
            カーソルを動かすと、ドットがふくらみ、光り、そっと道をあける。クリックで波紋が広がります。
          </p>
          <button
            type="button"
            className="mt-8 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-5 text-[13px] font-semibold text-[#0a0a0a] shadow-[0_8px_30px_rgba(167,139,250,.28)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97]"
          >
            はじめる
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </DotGridBackground>
    </div>
  );
}
