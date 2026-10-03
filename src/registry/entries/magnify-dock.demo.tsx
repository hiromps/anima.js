"use client";

import { useMemo } from "react";
import {
  MagnifyDock,
  type MagnifyDockProps,
} from "../components/magnify-dock";
import { demoItems } from "./magnify-dock.demo-data";

/**
 * Playground-facing props: every appearance/motion knob passes straight
 * through; `itemCount` is demo-only and picks how many demo tiles render.
 */
export type MagnifyDockPreviewProps = Omit<MagnifyDockProps, "items"> & {
  itemCount?: string;
};

/**
 * Playground glue: a desktop-wallpaper stage with the dock pinned bottom
 * center, the way it sits on a real screen. Over a flat dark fill the
 * bar's blur and saturation would be invisible, hence the colorful blobs.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function MagnifyDockPreview({
  itemCount = "7",
  ...rest
}: MagnifyDockPreviewProps) {
  const items = useMemo(() => demoItems(itemCount), [itemCount]);

  return (
    <div className="relative flex h-[560px] w-full flex-col justify-end overflow-hidden bg-[#07070c] text-white">
      {/* Wallpaper: soft aurora blobs, all decorative. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,#5b3df5_0%,transparent_100%)] opacity-70 blur-2xl" />
        <div className="absolute top-10 -right-32 h-[460px] w-[560px] rounded-full bg-[radial-gradient(closest-side,#ff5fa2_0%,transparent_100%)] opacity-50 blur-2xl" />
        <div className="absolute -bottom-40 left-1/4 h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,#1fb6ff_0%,transparent_100%)] opacity-45 blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(0,0,0,.45))]" />
      </div>

      {/* Faux menu bar so the stage reads as a desktop. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 flex h-8 items-center justify-between bg-black/20 px-5 text-[12px] font-medium text-white/80 backdrop-blur-md"
      >
        <span className="font-semibold">anima.js</span>
        <span>9:41</span>
      </div>

      <div className="relative px-4 pb-6">
        <MagnifyDock {...rest} items={items} />
      </div>
    </div>
  );
}
