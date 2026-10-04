"use client";

import { useState } from "react";
import {
  WheelCarousel,
  type WheelCarouselProps,
  type WheelCarouselVariant,
} from "../components/wheel-carousel";
import {
  DEMO_MONTHS,
  DEMO_PLAYLIST,
  DEMO_TIMES,
  demoDays,
  demoWeekday,
} from "./wheel-carousel.demo-data";

/**
 * Playground-facing props. `visibleRows` arrives as the select's string
 * ("3" | "5" | "7"); everything else passes straight through.
 */
export type WheelCarouselPreviewProps = Pick<
  WheelCarouselProps,
  "rowHeight" | "loop" | "perspective" | "highlight" | "friction"
> & {
  variant?: WheelCarouselVariant;
  visibleRows?: string;
};

/**
 * Playground glue: a reservation mock with three side-by-side text wheels
 * (月 / 日 / 時刻) and a playlist card wheel beside it — two kinds of
 * independent instances on one stage. The schema drives the 月 wheel (and
 * the geometry of its two neighbours, so the three bands stay one row).
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function WheelCarouselPreview({
  variant = "text",
  visibleRows = "5",
  ...shared
}: WheelCarouselPreviewProps) {
  const rows = Number(visibleRows) || 5;
  const [month, setMonth] = useState(5);
  const [day, setDay] = useState(13);
  const [time, setTime] = useState(17);
  const [track, setTrack] = useState(1);

  const days = demoDays(month);
  // Switching to a shorter month pulls the day back in range; the day
  // wheel glides there because its `index` is controlled.
  const dayIndex = Math.min(day, days.length - 1);

  const geometry = { ...shared, visibleRows: rows };

  return (
    // A container (not the viewport) decides the layout: the gallery card
    // lays this out at card width / scale, unrelated to the window size.
    <div className="@container relative flex h-[560px] items-center justify-center gap-4 overflow-hidden bg-[#0a0a0a] px-4 text-white">
      {/* Stage light + two colored blooms, so the glass bands have something
          to sit on instead of a flat black. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_0%,rgba(255,255,255,.07),transparent_70%),radial-gradient(35%_40%_at_30%_55%,rgba(167,139,250,.16),transparent_70%),radial-gradient(30%_35%_at_78%_55%,rgba(56,189,248,.12),transparent_70%)]"
      />

      <section
        aria-label="予約"
        className="relative w-[384px] min-w-0 shrink rounded-[28px] bg-white/[.035] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08),inset_0_1px_0_rgba(255,255,255,.1),0_30px_60px_-20px_rgba(0,0,0,.8)]"
      >
        <p className="text-[11px] font-medium tracking-[.14em] text-white/45 uppercase">
          Reservation
        </p>
        <h2 className="mt-1 text-[20px] font-semibold tracking-tight">ご来店日時</h2>
        <div className="mt-4 grid grid-cols-[1fr_1fr_1.25fr] items-center gap-1.5">
          <WheelCarousel
            {...geometry}
            variant={variant}
            items={DEMO_MONTHS}
            index={month}
            onIndexChange={setMonth}
            aria-label="月"
          />
          <WheelCarousel
            {...geometry}
            items={days}
            index={dayIndex}
            onIndexChange={setDay}
            aria-label="日"
          />
          <WheelCarousel
            {...geometry}
            items={DEMO_TIMES}
            index={time}
            onIndexChange={setTime}
            aria-label="時刻"
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[.08] pt-4">
          <p className="text-[13px] text-white/55">
            <span className="font-semibold text-white tabular-nums">
              {month + 1}月{dayIndex + 1}日（{demoWeekday(month, dayIndex)}）
              {DEMO_TIMES[time]}
            </span>
            <span className="ml-1.5">· 2名</span>
          </p>
          <button
            type="button"
            className="h-9 shrink-0 rounded-full bg-white px-4 text-[13px] font-semibold text-black shadow-[0_8px_24px_-8px_rgba(167,139,250,.7)] transition-transform active:scale-95"
          >
            予約する
          </button>
        </div>
      </section>

      {/* Too narrow for both panels (phone playground): the reservation
          picker is the main act, the playlist steps aside. */}
      <section
        aria-label="プレイリスト"
        className="relative w-[248px] shrink-0 rounded-[28px] @max-[620px]:hidden bg-white/[.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08),inset_0_1px_0_rgba(255,255,255,.1),0_30px_60px_-20px_rgba(0,0,0,.8)]"
      >
        <p className="px-1 text-[11px] font-medium tracking-[.14em] text-white/45 uppercase">
          Playlist
        </p>
        <h2 className="mt-1 px-1 text-[17px] font-semibold tracking-tight">Late Night</h2>
        <div className="mt-2">
          <WheelCarousel
            variant="card"
            items={DEMO_PLAYLIST}
            defaultIndex={1}
            onIndexChange={setTrack}
            loop
            aria-label="プレイリスト"
          />
        </div>
        <p className="mt-2 truncate px-1 text-[12px] text-white/50">
          再生中 · <span className="text-white/85">{DEMO_PLAYLIST[track].title}</span>
        </p>
      </section>
    </div>
  );
}
