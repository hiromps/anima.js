"use client";

import { useState, type MouseEvent } from "react";
import {
  GlassBottomTabBar,
  type GlassBottomTabBarProps,
} from "../components/glass-bottom-tab-bar";
import { DEMO_CTA_HREF, demoTabs } from "./glass-bottom-tab-bar.demo-data";

/**
 * Playground-facing props: the schema's appearance/motion knobs pass
 * straight through; `tabCount` and `ctaLabel` are demo-only.
 */
export type GlassBottomTabBarPreviewProps = Pick<
  GlassBottomTabBarProps,
  "showLabels" | "glowColorA" | "glowColorB" | "blur" | "springStiffness" | "springDamping"
> & {
  tabCount?: string;
  ctaLabel?: string;
};

const TILE_GRADIENTS = [
  "bg-[linear-gradient(135deg,#ff8fb1,#ff5c8a)]",
  "bg-[linear-gradient(135deg,#8f7cff,#5b8cff)]",
  "bg-[linear-gradient(135deg,#4de3ff,#3b82f6)]",
  "bg-[linear-gradient(135deg,#ffd166,#ff8a5c)]",
  "bg-[linear-gradient(135deg,#7cffc4,#28c7a0)]",
  "bg-[linear-gradient(135deg,#f5a9ff,#b06cff)]",
];

/**
 * Mock page that scrolls under the bar. Bright tiles on a dark page are
 * what make the frosted glass readable — over a flat dark background the
 * blur and saturation would be invisible.
 */
function MockPage({ title }: { title: string }) {
  return (
    <>
      <p className="text-[11px] font-medium tracking-wider text-white/45 uppercase">
        anima.js demo
      </p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{title}</h1>
      <div className="mt-4 h-40 rounded-3xl bg-[linear-gradient(135deg,#ff8fb1,#8f7cff_55%,#4de3ff)]" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {TILE_GRADIENTS.map((gradient) => (
          <div
            key={gradient}
            className={`aspect-square rounded-2xl ${gradient}`}
          />
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <div className="h-3 w-4/5 rounded-full bg-white/15" />
        <div className="h-3 w-full rounded-full bg-white/10" />
        <div className="h-3 w-2/3 rounded-full bg-white/10" />
      </div>
      <div className="mt-5 h-32 rounded-3xl bg-[linear-gradient(135deg,#ffb86c,#ff5c8a_60%,#8f7cff)]" />
      <div className="mt-5 flex flex-col gap-2.5">
        <div className="h-3 w-3/4 rounded-full bg-white/15" />
        <div className="h-3 w-full rounded-full bg-white/10" />
      </div>
    </>
  );
}

/**
 * Playground glue: the real bar is `position: fixed`, mobile-only and
 * router-driven, none of which can be previewed inside a desktop page. So
 * the preview places it at the bottom of a phone frame, keeps the active
 * tab in local state, and intercepts every navigation — the demo hrefs are
 * not routes on this site.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function GlassBottomTabBarPreview({
  tabCount,
  ctaLabel,
  ...rest
}: GlassBottomTabBarPreviewProps) {
  const tabs = demoTabs(tabCount).map(({ tab }) => tab);
  const [selected, setSelected] = useState(tabs[0].href);
  // Lowering the tab count can drop the selected tab; fall back to the first.
  const current = tabs.some((tab) => tab.href === selected)
    ? selected
    : tabs[0].href;
  const title = tabs.find((tab) => tab.href === current)?.label ?? "";
  const swallow = (event: MouseEvent<HTMLAnchorElement>) =>
    event.preventDefault();

  return (
    <div className="flex h-[560px] items-center justify-center p-3">
      <div className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[2.25rem] bg-[#171320] text-white shadow-2xl ring-8 ring-black/70">
        {/* Scrollbar hidden: a desktop scrollbar inside a phone frame reads as a bug. */}
        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-5 pt-14 pb-[120px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MockPage title={title} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-between px-7 text-[13px] font-semibold"
        >
          <span>9:41</span>
          <span className="h-1.5 w-12 rounded-full bg-white/30" />
        </div>
        <GlassBottomTabBar
          {...rest}
          tabs={tabs}
          hiddenPaths={[]}
          pathname={current}
          onTabSelect={(tab, event) => {
            event.preventDefault();
            setSelected(tab.href);
          }}
          placement="absolute"
          mobileOnly={false}
          cta={
            ctaLabel
              ? { label: ctaLabel, href: DEMO_CTA_HREF, onClick: swallow }
              : undefined
          }
        />
      </div>
    </div>
  );
}
