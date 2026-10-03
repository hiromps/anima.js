"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Bell, MapPin, Moon, PlayCircle } from "lucide-react";
import { GlassSwitch, type GlassSwitchProps } from "../components/glass-switch";

/**
 * Playground-facing props: the schema's knobs. `defaultChecked` is the
 * first row's initial state; the other knobs pass straight through.
 */
export type GlassSwitchPreviewProps = Pick<
  GlassSwitchProps,
  | "label"
  | "description"
  | "defaultChecked"
  | "size"
  | "disabled"
  | "glowColorA"
  | "glowColorB"
  | "springStiffness"
  | "springDamping"
>;

/**
 * Glass for the grouped list, set inline: Tailwind's backdrop utilities
 * emit the -webkit- twin, which makes Lightning CSS drop the unprefixed
 * property (no blur in Chrome). Inline styles skip that pipeline.
 */
const PANEL_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,.17), rgba(255,255,255,.09))",
  backdropFilter: "blur(30px) saturate(170%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,.45), inset 0 0 0 1px rgba(255,255,255,.2), 0 8px 32px rgba(255,170,205,.16), 0 18px 48px rgba(0,0,0,.32)",
};

/** Pastel light behind the panel, as in the components' ::before glow. */
const GLOW_STYLE: CSSProperties = {
  background:
    "radial-gradient(60% 55% at 15% 80%, rgba(255,170,200,.45), transparent 70%), radial-gradient(55% 50% at 85% 20%, rgba(190,175,255,.4), transparent 70%), radial-gradient(70% 40% at 50% 100%, rgba(255,200,220,.25), transparent 70%)",
  filter: "blur(24px)",
};

function RowIcon({ gradient, children }: { gradient: string; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={`grid size-8 flex-none place-items-center rounded-[10px] text-white ${gradient}`}
    >
      {children}
    </span>
  );
}

/** Hairline between rows — white light, never a dark border. */
function Divider() {
  return <div aria-hidden className="ml-[58px] h-px bg-white/12" />;
}

type Shared = Pick<
  GlassSwitchProps,
  "size" | "glowColorA" | "glowColorB" | "springStiffness" | "springDamping"
>;

/**
 * Row 1 is controlled by the playground. Mounted with `key` on the
 * defaultChecked knob so flipping the knob resets its state.
 */
function KnobRow({
  initial,
  ...props
}: Omit<GlassSwitchProps, "checked" | "onCheckedChange" | "defaultChecked"> & {
  initial: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  return (
    <GlassSwitch
      {...props}
      checked={checked}
      onCheckedChange={setChecked}
    />
  );
}

/**
 * Playground glue: a phone frame with a "設定" screen whose glass grouped
 * list holds four switch rows. Bright tiles sit behind the panel so the
 * frosted glass has something to blur.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function GlassSwitchPreview({
  label = "",
  description = "",
  defaultChecked = true,
  disabled = false,
  size,
  glowColorA,
  glowColorB,
  springStiffness,
  springDamping,
}: GlassSwitchPreviewProps) {
  const shared: Shared = { size, glowColorA, glowColorB, springStiffness, springDamping };

  return (
    <div className="flex h-[560px] items-center justify-center p-3">
      <div className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[2.25rem] bg-[#171320] text-white shadow-2xl ring-8 ring-black/70">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-5 pt-14 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-[11px] font-medium tracking-wider text-white/45 uppercase">
            anima.js demo
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">設定</h1>

          <div className="relative mt-5">
            {/* Bright shapes behind the glass */}
            <div
              aria-hidden
              className="absolute -top-3 -left-4 size-28 rounded-full bg-[linear-gradient(135deg,#ff8fb1,#ff5c8a)]"
            />
            <div
              aria-hidden
              className="absolute top-24 -right-6 size-32 rounded-[2rem] bg-[linear-gradient(135deg,#8f7cff,#5b8cff)]"
            />
            <div
              aria-hidden
              className="absolute -bottom-4 left-16 h-16 w-40 rounded-full bg-[linear-gradient(135deg,#4de3ff,#3b82f6)]"
            />
            <div aria-hidden className="absolute -inset-3 rounded-[40px]" style={GLOW_STYLE} />

            <div className="relative rounded-[28px] px-4 py-1.5" style={PANEL_STYLE}>
              <div className="flex items-center gap-3">
                <RowIcon gradient="bg-[linear-gradient(135deg,#ff8fb1,#ff5c8a)]">
                  <Bell size={17} strokeWidth={2} />
                </RowIcon>
                <div className="flex min-w-0 flex-1 justify-end">
                  <KnobRow
                    key={String(defaultChecked)}
                    initial={defaultChecked}
                    {...shared}
                    label={label}
                    description={description}
                    disabled={disabled}
                    aria-label="通知"
                  />
                </div>
              </div>
              <Divider />
              <div className="flex items-center gap-3">
                <RowIcon gradient="bg-[linear-gradient(135deg,#8f7cff,#5b8cff)]">
                  <Moon size={17} strokeWidth={2} />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <GlassSwitch {...shared} label="ダークモード" defaultChecked />
                </div>
              </div>
              <Divider />
              <div className="flex items-center gap-3">
                <RowIcon gradient="bg-[linear-gradient(135deg,#4de3ff,#3b82f6)]">
                  <MapPin size={17} strokeWidth={2} />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <GlassSwitch
                    {...shared}
                    label="位置情報"
                    description="アプリの使用中のみ"
                    defaultChecked={false}
                  />
                </div>
              </div>
              <Divider />
              <div className="flex items-center gap-3">
                <RowIcon gradient="bg-[linear-gradient(135deg,#ffd166,#ff8a5c)]">
                  <PlayCircle size={17} strokeWidth={2} />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <GlassSwitch {...shared} label="自動再生" defaultChecked />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 px-2 text-[12px] leading-relaxed text-white/50">
            通知をオフにしても、重要なお知らせはアプリ内に表示されます。
          </p>
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
