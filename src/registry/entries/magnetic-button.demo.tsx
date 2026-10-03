"use client";

import {
  MagneticButton,
  type MagneticButtonProps,
} from "../components/magnetic-button";

/**
 * Playground-facing props: the schema's knobs pass straight through to the
 * primary button; `label` is demo-only and becomes its children.
 */
export type MagneticButtonPreviewProps = Partial<
  Pick<
    MagneticButtonProps,
    | "variant"
    | "size"
    | "strength"
    | "radius"
    | "color"
    | "textColor"
    | "fillColor"
    | "fillTextColor"
    | "showArrow"
    | "springStiffness"
    | "springDamping"
  >
> & {
  label?: string;
};

/**
 * Playground glue: a dark hero stage with the schema-driven primary CTA
 * and a fixed outline / ghost pair beside it, so the magnet can be felt
 * across neighbours. The resting state carries the look (sheen + glow),
 * since the gallery card never sees a hover.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function MagneticButtonPreview({
  label = "",
  size = "lg",
  ...rest
}: MagneticButtonPreviewProps) {
  return (
    <div className="relative isolate flex h-[560px] w-full items-center justify-center overflow-hidden bg-[#08080a] px-6 text-white">
      {/* Backdrop: a faint grid fading out from the centre plus one
          colored bloom behind the buttons. Decorative only. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(60%_55%_at_50%_50%,#000,transparent)]"
      />
      <div
        aria-hidden
        className="absolute top-[58%] left-1/2 -z-10 h-[260px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,92,255,.32),transparent)] blur-2xl"
      />

      <div className="flex max-w-[720px] flex-col items-center text-center">
        <span className="rounded-full px-3 py-1 text-[12px] font-medium tracking-wide text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]">
          anima.js · Magnetic CTA
        </span>
        <h2 className="mt-5 bg-[linear-gradient(180deg,#fff,rgba(255,255,255,.62))] bg-clip-text text-[44px] leading-[1.15] font-semibold tracking-[-0.03em] text-balance text-transparent sm:text-[52px]">
          指先に、吸い寄せられる。
        </h2>
        <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-white/55">
          ポインターが近づくとボタンが引き寄せられ、触れた点から色が広がる。
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <MagneticButton {...rest} size={size}>
            {label || "はじめる"}
          </MagneticButton>
          <MagneticButton variant="outline" size={size} fillColor="#ffffff" fillTextColor="#0a0a0a">
            デモを見る
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
