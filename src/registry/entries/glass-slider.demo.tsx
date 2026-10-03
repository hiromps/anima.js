"use client";

import { useId } from "react";
import {
  Bluetooth,
  Flashlight,
  Moon,
  Sun,
  SunDim,
  Volume1,
  Volume2,
  Wifi,
} from "lucide-react";
import { GlassSlider, type GlassSliderProps } from "../components/glass-slider";

/**
 * Playground-facing props: the schema's range/appearance/motion knobs pass
 * straight through; `defaultValue` seeds the volume slider and `showIcons`
 * toggles its Volume icons (both demo-only in codegen terms).
 */
export type GlassSliderPreviewProps = Pick<
  GlassSliderProps,
  | "min"
  | "max"
  | "step"
  | "thumb"
  | "showValue"
  | "glowColorA"
  | "glowColorB"
  | "blur"
  | "springStiffness"
  | "springDamping"
> & {
  defaultValue?: number;
  showIcons?: boolean;
};

const TOGGLES = [
  { icon: Wifi, on: true },
  { icon: Bluetooth, on: true },
  { icon: Moon, on: false },
  { icon: Flashlight, on: false },
];

/** Glass panel recipe in Tailwind, so the mock doesn't need its own CSS. */
const PANEL =
  "rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.06))] shadow-[inset_0_1px_0_rgba(255,255,255,.4),inset_0_0_0_1px_rgba(255,255,255,.16)]";

/**
 * Playground glue: a Control Center mock inside a phone frame. Bright
 * gradient blobs sit behind the glass — over a flat dark background the
 * blur and saturation would be invisible. The volume slider follows the
 * schema; brightness keeps its Sun icons and sits at 70% of the range.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function GlassSliderPreview({
  defaultValue = 60,
  showIcons = true,
  min = 0,
  max = 100,
  step = 1,
  ...rest
}: GlassSliderPreviewProps) {
  const id = useId();
  const range = { min, max, step };
  const brightness = min + Math.round(((max - min) * 0.7) / step) * step;

  return (
    <div className="flex h-[560px] items-center justify-center p-3">
      <div className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[2.25rem] bg-[#171320] text-white shadow-2xl ring-8 ring-black/70">
        {/* Wallpaper: bright blobs for the glass to pick up. */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute -top-10 -left-16 h-64 w-64 rounded-full bg-[linear-gradient(135deg,#ff8fb1,#ff5c8a)] opacity-80" />
          <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-[linear-gradient(135deg,#8f7cff,#5b8cff)] opacity-80" />
          <div className="absolute -bottom-16 left-6 h-56 w-56 rounded-full bg-[linear-gradient(135deg,#4de3ff,#3b82f6)] opacity-70" />
          <div className="absolute right-10 bottom-24 h-28 w-28 rounded-3xl bg-[linear-gradient(135deg,#ffd166,#ff8a5c)] opacity-85" />
        </div>

        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-5 pt-14 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-[11px] font-medium tracking-wider text-white/55 uppercase">
            anima.js demo
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">
            コントロールセンター
          </h1>

          {/* Decorative toggles — part of the mock, not interactive. */}
          <div aria-hidden className={`mt-5 grid grid-cols-4 gap-3 p-4 ${PANEL}`}>
            {TOGGLES.map(({ icon: Icon, on }, i) => (
              <span
                key={i}
                className={`grid aspect-square place-items-center rounded-full ${
                  on
                    ? "bg-[linear-gradient(135deg,#ffaac8,#beafff)] text-[#2a1838]"
                    : "bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,.4),inset_0_0_0_1px_rgba(255,255,255,.2)]"
                }`}
              >
                <Icon size={20} strokeWidth={2} />
              </span>
            ))}
          </div>

          <div className={`mt-4 flex flex-col gap-5 px-4 pt-4 pb-5 ${PANEL}`}>
            <div>
              <p id={`${id}-volume`} className="mb-2.5 text-[13px] font-medium text-white/66">
                音量
              </p>
              <GlassSlider
                {...rest}
                {...range}
                // Remount when the seed or range changes so the knob resets it.
                key={`${defaultValue}-${min}-${max}-${step}`}
                defaultValue={defaultValue}
                iconStart={showIcons ? Volume1 : undefined}
                iconEnd={showIcons ? Volume2 : undefined}
                aria-labelledby={`${id}-volume`}
              />
            </div>
            <div>
              <p id={`${id}-brightness`} className="mb-2.5 text-[13px] font-medium text-white/66">
                明るさ
              </p>
              <GlassSlider
                {...rest}
                {...range}
                key={`${brightness}-${min}-${max}-${step}`}
                defaultValue={brightness}
                iconStart={SunDim}
                iconEnd={Sun}
                aria-labelledby={`${id}-brightness`}
              />
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-between px-7 text-[13px] font-semibold"
        >
          <span>9:41</span>
          <span className="h-1.5 w-12 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}
