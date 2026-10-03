"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  HoverNav,
  type HoverNavCta,
  type HoverNavItem,
  type HoverNavProps,
} from "../components/hover-nav";
import { DEMO_ACTIVE_HREF, DEMO_CTA, demoItems } from "./hover-nav.demo-data";

/**
 * Playground-facing props: appearance/motion knobs pass straight through;
 * `itemCount` and `showCta` are demo-only (the real props take an items
 * array and a cta object).
 */
export type HoverNavPreviewProps = Omit<
  HoverNavProps,
  "items" | "cta" | "activeHref" | "onNavigate"
> & {
  itemCount?: string;
  showCta?: boolean;
};

/**
 * Playground glue: a dark landing-page stage with a mock site header —
 * wordmark left, the nav centered, a login link right — over a hero, the
 * way the bar sits on a real marketing site. Clicks are intercepted so the
 * preview never navigates; picking an item makes it the current page.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function HoverNavPreview({
  itemCount = "5",
  showCta = true,
  ...rest
}: HoverNavPreviewProps) {
  const items = useMemo(() => demoItems(itemCount), [itemCount]);
  const [activeHref, setActiveHref] = useState(DEMO_ACTIVE_HREF);

  const onNavigate = (
    item: HoverNavItem | HoverNavCta,
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();
    if (item.href !== DEMO_CTA.href) setActiveHref(item.href);
  };

  return (
    <div className="relative h-[560px] w-full overflow-hidden bg-[#07070a] text-white">
      {/* Backdrop: a faint grid fading out from the top and a violet glow
          behind the header, all decorative. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_30%,transparent_75%)] bg-[size:56px_56px]" />
        <div className="absolute -top-56 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,92,255,.55),transparent)] blur-2xl" />
        <div className="absolute top-40 -right-40 h-[360px] w-[460px] rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,.22),transparent)] blur-2xl" />
      </div>

      <header className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-8 pt-8">
        <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <span
            aria-hidden
            className="h-5 w-5 rounded-[6px] bg-[conic-gradient(from_200deg,#a78bfa,#38bdf8,#f0abfc,#a78bfa)] shadow-[0_0_16px_rgba(167,139,250,.6)]"
          />
          Nimbus
        </div>
        <HoverNav
          {...rest}
          items={items}
          activeHref={activeHref}
          cta={showCta ? DEMO_CTA : undefined}
          onNavigate={onNavigate}
        />
        <span
          aria-hidden
          className="justify-self-end text-[13px] font-medium text-white/55"
        >
          ログイン
        </span>
      </header>

      <div aria-hidden className="relative mt-20 flex flex-col items-center px-8 text-center">
        <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[12px] text-white/65">
          v2.0 — リアルタイム共同編集に対応
        </span>
        <p className="mt-5 bg-[linear-gradient(180deg,#fff_30%,rgba(255,255,255,.55))] bg-clip-text text-[52px] leading-[1.1] font-semibold tracking-[-0.03em] text-transparent">
          アイデアを、
          <br />
          数分でプロダクトに。
        </p>
        <p className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-white/50">
          設計からデプロイまで、チームのワークフローをひとつに。
        </p>
        <div className="mt-7 flex gap-3">
          <span className="h-10 w-36 rounded-full bg-white/90" />
          <span className="h-10 w-32 rounded-full border border-white/15 bg-white/[.03]" />
        </div>
      </div>
    </div>
  );
}
