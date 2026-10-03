"use client";

import type { CSSProperties } from "react";
import { Nfc } from "lucide-react";
import {
  TiltCard,
  TiltLayer,
  type TiltCardProps,
} from "../components/tilt-card";

/** Playground-facing props: every schema knob passes straight through. */
export type TiltCardPreviewProps = Pick<
  TiltCardProps,
  | "maxTilt"
  | "perspective"
  | "scaleOnHover"
  | "glare"
  | "glareOpacity"
  | "holo"
  | "idleAnimation"
  | "springStiffness"
  | "springDamping"
  | "radius"
>;

/** Film grain as an inline SVG, so the art doesn't look like a flat CSS gradient. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Base art: a dark mesh gradient with fine guilloché rings, like a metal card. */
const ART_STYLE: CSSProperties = {
  backgroundImage: [
    "repeating-radial-gradient(circle at 112% -12%, rgba(255,255,255,.07) 0 1px, transparent 1px 13px)",
    "radial-gradient(110% 90% at 0% 0%, rgba(124,104,255,.95) 0%, transparent 55%)",
    "radial-gradient(80% 75% at 100% 100%, rgba(20,214,196,.85) 0%, transparent 58%)",
    "radial-gradient(60% 55% at 88% 8%, rgba(255,111,181,.75) 0%, transparent 62%)",
    "linear-gradient(135deg, #15112b, #0b0b14)",
  ].join(", "),
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,.14), inset 0 1px 0 rgba(255,255,255,.28)",
};

/** EMV chip: brushed-gold gradient with the contact pads drawn as hairlines. */
const CHIP_STYLE: CSSProperties = {
  backgroundImage: [
    "linear-gradient(90deg, transparent 32%, rgba(90,62,10,.55) 32% 34%, transparent 34% 66%, rgba(90,62,10,.55) 66% 68%, transparent 68%)",
    "linear-gradient(0deg, transparent 47%, rgba(90,62,10,.55) 47% 53%, transparent 53%)",
    "linear-gradient(135deg, #fff1c1, #e3b65a 40%, #f6dc93 60%, #b98a2f)",
  ].join(", "),
  boxShadow:
    "inset 0 0 0 1px rgba(120,84,20,.5), 0 4px 10px rgba(0,0,0,.35)",
};

/**
 * Playground glue: a premium membership card on a dark stage. The art is
 * the in-flow base (it gives the card its height); every TiltLayer is a
 * direct child of TiltCard so each floats at its own depth.
 */
export function TiltCardPreview(props: TiltCardPreviewProps) {
  return (
    <div className="relative flex h-[560px] flex-col items-center justify-center gap-7 overflow-hidden bg-[#0a0a0a] px-4 text-white">
      {/* Stage light: a violet pool behind and a soft floor glow under the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_50%_45%,rgba(124,104,255,.22),transparent_70%),radial-gradient(35%_14%_at_50%_74%,rgba(20,214,196,.16),transparent_70%)]"
      />

      <TiltCard {...props} className="w-[380px] max-w-full">
        <div
          className="relative isolate aspect-[1.586] overflow-hidden rounded-[inherit]"
          style={ART_STYLE}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-[.22] mix-blend-overlay"
            style={{ backgroundImage: GRAIN }}
          />
        </div>

        <TiltLayer
          depth={26}
          className="absolute inset-x-6 top-5 flex items-center justify-between"
        >
          <span className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
            <span
              aria-hidden
              className="size-5 rounded-full bg-[conic-gradient(from_200deg,#7c68ff,#14d6c4,#ff6fb5,#7c68ff)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.4)]"
            />
            anima
          </span>
          <span className="text-[10px] font-medium tracking-[0.32em] text-white/70">
            PLATINUM
          </span>
        </TiltLayer>

        <TiltLayer depth={44} className="absolute top-[36%] left-6 flex items-center gap-3">
          <span aria-hidden className="block h-[34px] w-[46px] rounded-[7px]" style={CHIP_STYLE} />
          <Nfc aria-hidden size={22} strokeWidth={1.6} className="text-white/75" />
        </TiltLayer>

        <TiltLayer
          depth={58}
          className="absolute top-[58%] left-6 font-mono text-[19px] tracking-[0.14em] text-white [text-shadow:0_1px_0_rgba(255,255,255,.25),0_6px_18px_rgba(0,0,0,.45)]"
        >
          5300 0324 1986 2026
        </TiltLayer>

        <TiltLayer
          depth={34}
          className="absolute inset-x-6 bottom-5 flex items-end justify-between text-[13px] font-medium tracking-[0.08em]"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[8.5px] tracking-[0.24em] text-white/50">MEMBER</span>
            AKANE SATO
          </span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-[8.5px] tracking-[0.24em] text-white/50">VALID THRU</span>
            10/30
          </span>
        </TiltLayer>
      </TiltCard>

      <p className="relative m-0 text-[12px] tracking-wide text-white/40">
        カーソルを乗せて傾ける
      </p>
    </div>
  );
}
