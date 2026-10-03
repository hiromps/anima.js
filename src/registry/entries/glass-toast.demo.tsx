"use client";

import { useEffect, useState } from "react";
import { GlassToast, type GlassToastProps } from "../components/glass-toast";

/**
 * Playground-facing props: the schema's knobs pass straight through;
 * `actionLabel` is demo-only (the real prop takes `{ label, onClick }`).
 */
export type GlassToastPreviewProps = Pick<
  GlassToastProps,
  | "description"
  | "variant"
  | "duration"
  | "glowColorA"
  | "glowColorB"
  | "blur"
  | "springStiffness"
  | "springDamping"
> & {
  title?: string;
  actionLabel?: string;
};

/** Delay before the preview shows the toast again after it closed. */
const RESHOW_DELAY = 1500;

const TILE_GRADIENTS = [
  "bg-[linear-gradient(135deg,#ff8fb1,#ff5c8a)]",
  "bg-[linear-gradient(135deg,#8f7cff,#5b8cff)]",
  "bg-[linear-gradient(135deg,#4de3ff,#3b82f6)]",
  "bg-[linear-gradient(135deg,#ffd166,#ff8a5c)]",
];

/**
 * Bright tiles on a dark page — over a flat dark background the toast's
 * blur and saturation would be invisible. The hero sits right under the
 * status bar so the toast drops in over color.
 */
function MockPage({ onShow }: { onShow: () => void }) {
  return (
    <>
      <div className="h-32 rounded-3xl bg-[linear-gradient(135deg,#ff8fb1,#8f7cff_55%,#4de3ff)]" />
      <p className="mt-4 text-[11px] font-medium tracking-wider text-white/45 uppercase">
        anima.js demo
      </p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-tight">設定</h1>
      <button
        type="button"
        onClick={onShow}
        className="mt-4 h-11 w-full rounded-full bg-white/15 text-[15px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,.4),inset_0_0_0_1px_rgba(255,255,255,.2)]"
      >
        通知を表示
      </button>
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
    </>
  );
}

/**
 * Playground glue: the real toast is `position: fixed` and portaled to
 * <body>, which can't be previewed inside a desktop page. So the preview
 * renders it with `placement="absolute"` inside a phone frame, starts
 * open, and shows it again shortly after it closes (auto-dismiss, swipe
 * or ×) so the gallery card is never an empty phone.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function GlassToastPreview({
  actionLabel,
  title = "",
  ...rest
}: GlassToastPreviewProps) {
  const [open, setOpen] = useState(true);
  // Bumped to replay the drop-in when the button is pressed while shown.
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    if (open) return;
    const id = window.setTimeout(() => setOpen(true), RESHOW_DELAY);
    return () => window.clearTimeout(id);
  }, [open]);

  const show = () => {
    if (open) setReplay((n) => n + 1);
    else setOpen(true);
  };

  return (
    <div className="flex h-[560px] items-center justify-center p-3">
      <div className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[2.25rem] bg-[#171320] text-white shadow-2xl ring-8 ring-black/70">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-5 pt-14 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MockPage onShow={show} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-between px-7 text-[13px] font-semibold"
        >
          <span>9:41</span>
          <span className="h-1.5 w-12 rounded-full bg-white/30" />
        </div>
        <GlassToast
          key={replay}
          {...rest}
          title={title}
          open={open}
          onOpenChange={setOpen}
          placement="absolute"
          action={actionLabel ? { label: actionLabel } : undefined}
        />
      </div>
    </div>
  );
}
