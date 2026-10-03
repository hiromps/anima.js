"use client";

import {
  GlassFabMenu,
  type GlassFabMenuProps,
} from "../components/glass-fab-menu";
import { demoActions } from "./glass-fab-menu.demo-data";

/**
 * Playground-facing props: the schema's appearance/motion knobs pass
 * straight through; `actionCount` is demo-only (the real prop takes an
 * `actions` array, built here from the shared demo data).
 */
export type GlassFabMenuPreviewProps = Pick<
  GlassFabMenuProps,
  | "layout"
  | "accent"
  | "position"
  | "glowColorA"
  | "glowColorB"
  | "blur"
  | "springStiffness"
  | "springDamping"
> & {
  actionCount?: string;
};

const POSTS = [
  {
    name: "mio",
    time: "2分前",
    gradient: "bg-[linear-gradient(135deg,#ff8fb1,#ff5c8a_45%,#8f7cff)]",
  },
  {
    name: "kaito",
    time: "18分前",
    gradient: "bg-[linear-gradient(135deg,#4de3ff,#3b82f6_55%,#8f7cff)]",
  },
  {
    name: "sora",
    time: "1時間前",
    gradient: "bg-[linear-gradient(135deg,#ffd166,#ff8a5c_50%,#ff5c8a)]",
  },
];

/**
 * A social feed with bright photo tiles on a dark page — over a flat dark
 * background the glass blur and saturation would be invisible.
 */
function MockFeed() {
  return (
    <>
      <p className="text-[11px] font-medium tracking-wider text-white/45 uppercase">
        anima.js demo
      </p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-tight">フィード</h1>
      <div className="mt-4 flex flex-col gap-5">
        {POSTS.map((post) => (
          <article key={post.name}>
            <div className="flex items-center gap-2.5">
              <span className={`h-8 w-8 rounded-full ${post.gradient}`} />
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold">{post.name}</span>
                <span className="text-[11px] text-white/50">{post.time}</span>
              </div>
            </div>
            <div className={`mt-2.5 h-44 rounded-3xl ${post.gradient}`} />
            <div className="mt-2.5 flex flex-col gap-2">
              <div className="h-2.5 w-4/5 rounded-full bg-white/15" />
              <div className="h-2.5 w-1/2 rounded-full bg-white/10" />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/**
 * Playground glue: the real menu is `position: fixed` and portaled to
 * <body>, which can't be previewed inside a desktop page. So the preview
 * renders it with `placement="absolute"` inside a phone frame, and starts
 * open (`defaultOpen`) so the gallery card shows the expanded actions
 * rather than a lone button. Opening at mount moves no focus.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap).
 */
export function GlassFabMenuPreview({
  actionCount,
  ...rest
}: GlassFabMenuPreviewProps) {
  const actions = demoActions(actionCount).map(({ action }) => action);

  return (
    <div className="flex h-[560px] items-center justify-center p-3">
      <div className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[2.25rem] bg-[#171320] text-white shadow-2xl ring-8 ring-black/70">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-5 pt-14 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MockFeed />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-between px-7 text-[13px] font-semibold"
        >
          <span>9:41</span>
          <span className="h-1.5 w-12 rounded-full bg-white/30" />
        </div>
        <GlassFabMenu
          {...rest}
          actions={actions}
          defaultOpen
          placement="absolute"
        />
      </div>
    </div>
  );
}
