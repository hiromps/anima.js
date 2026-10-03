"use client";

import { BorderBeam, type BorderBeamProps } from "../components/border-beam";

/**
 * Playground-facing props: the schema's knobs pass straight through to the
 * main CTA; `label` is demo-only (the real component takes children).
 */
export type BorderBeamPreviewProps = Pick<
  BorderBeamProps,
  | "variant"
  | "colorFrom"
  | "colorTo"
  | "duration"
  | "borderWidth"
  | "radius"
  | "glow"
  | "glowIntensity"
  | "shimmer"
> & {
  label?: string;
};

/**
 * Playground glue: a dark landing-page hero showing the three typical
 * uses — an announcement chip, the main CTA (driven by every knob) and an
 * email field framed by the beam. The chip and the field share the live
 * colors and speed but keep their own variant/shape, so color tweaks read
 * as one coherent palette.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function BorderBeamPreview({
  label = "",
  colorFrom,
  colorTo,
  duration = 4,
  ...rest
}: BorderBeamPreviewProps) {
  return (
    <div className="relative flex h-[560px] w-full items-center justify-center overflow-hidden bg-[#08080b] px-6 text-white">
      {/* Backdrop: faint grid fading out from the center + a top light. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_45%,#000_30%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,.22),transparent)]"
      />

      <div className="relative flex w-full max-w-[460px] flex-col items-center text-center">
        <BorderBeam
          as="a"
          href="#border-beam-release"
          onClick={(e) => e.preventDefault()}
          variant="beam"
          colorFrom={colorFrom}
          colorTo={colorTo}
          duration={duration * 1.5}
          borderWidth={1}
          glow={false}
          className="[--bb-font-size:12px] [--bb-padding:0.45em_0.95em]"
        >
          <span className="rounded-full bg-white/10 px-1.5 py-px text-[10px] font-semibold tracking-wide">
            NEW
          </span>
          <span className="text-white/80">v2.0 リリース</span>
          <span aria-hidden className="text-white/50">
            →
          </span>
        </BorderBeam>

        <h2 className="mt-6 text-[34px] leading-[1.15] font-semibold tracking-[-0.03em] text-balance">
          動きで伝わる UI を、
          <br />
          <span className="bg-[linear-gradient(180deg,#fff,rgba(255,255,255,.55))] bg-clip-text text-transparent">
            コピペひとつで。
          </span>
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-white/55">
          ボーダーを光が一周する、いま流行りのフレーム。
        </p>

        <div className="mt-8">
          <BorderBeam
            {...rest}
            colorFrom={colorFrom}
            colorTo={colorTo}
            duration={duration}
            className="[--bb-font-size:16px] [--bb-padding:0.85em_1.9em]"
          >
            {label}
          </BorderBeam>
        </div>

        <BorderBeam
          as="div"
          variant="pulse"
          colorFrom={colorFrom}
          colorTo={colorTo}
          duration={duration}
          radius={14}
          borderWidth={1}
          glowIntensity={0.35}
          className="mt-8 w-full max-w-[340px]"
        >
          <div className="flex items-center gap-2 p-1.5 pl-4">
            <label htmlFor="border-beam-demo-email" className="sr-only">
              メールアドレス
            </label>
            <input
              id="border-beam-demo-email"
              type="email"
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white placeholder:text-white/35 focus:outline-none"
            />
            <button
              type="button"
              className="h-9 shrink-0 rounded-[10px] bg-white px-3.5 text-[13px] font-medium text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              登録
            </button>
          </div>
        </BorderBeam>
      </div>
    </div>
  );
}
