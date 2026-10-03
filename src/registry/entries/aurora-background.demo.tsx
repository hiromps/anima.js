"use client";

import {
  AuroraBackground,
  type AuroraBackgroundProps,
} from "../components/aurora-background";

/**
 * Playground-facing props: the four color knobs are folded into the
 * component's `colors` array, and `headline` is demo-only hero copy (the
 * real component takes any children).
 */
export type AuroraBackgroundPreviewProps = Pick<
  AuroraBackgroundProps,
  "speed" | "blur" | "intensity" | "grain" | "grainOpacity" | "vignette"
> & {
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  headline?: string;
};

/**
 * A landing-page hero over the aurora, so the card shows the component in
 * the job it's built for. Lives in its own "use client" module: the entry
 * is also evaluated by server code, which may not import client modules
 * with hooks.
 */
export function AuroraBackgroundPreview({
  color1 = "#6d4aff",
  color2 = "#1fb6ff",
  color3 = "#ff4d9d",
  color4 = "#2ee6a8",
  headline = "Build at the speed of thought",
  ...rest
}: AuroraBackgroundPreviewProps) {
  return (
    <div className="h-[560px] w-full">
      <AuroraBackground
        {...rest}
        as="section"
        colors={[color1, color2, color3, color4]}
      >
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-medium text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2ee6a8] shadow-[0_0_8px_#2ee6a8]" />
            v2.0 をリリースしました
          </span>
          <h1 className="mt-6 max-w-[14ch] bg-[linear-gradient(180deg,#fff_30%,rgba(255,255,255,.62))] bg-clip-text text-[60px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-transparent">
            {headline}
          </h1>
          <p className="mt-5 max-w-[34rem] text-[15px] leading-relaxed text-white/65">
            思考のスピードで、プロダクトを形に。アイデアから本番まで、ひとつのワークフローで。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="h-11 rounded-full bg-white px-6 text-[14px] font-semibold text-[#0a0a0a] shadow-[0_8px_30px_rgba(255,255,255,.18)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97]"
            >
              無料で始める
            </button>
            <button
              type="button"
              className="h-11 rounded-full bg-white/[0.06] px-6 text-[14px] font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] backdrop-blur-md transition-colors hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              ドキュメントを見る
            </button>
          </div>
        </div>
      </AuroraBackground>
    </div>
  );
}
