"use client";

import { useId, useState } from "react";
import {
  GlassSegmentedControl,
  type GlassSegmentedControlProps,
} from "../components/glass-segmented-control";
import { demoOptions } from "./glass-segmented-control.demo-data";

/**
 * Playground-facing props: the schema's appearance/motion knobs pass
 * straight through; `segmentCount` and `showIcons` are demo-only (they
 * shape the `options` literal).
 */
export type GlassSegmentedControlPreviewProps = Pick<
  GlassSegmentedControlProps,
  | "size"
  | "fullWidth"
  | "glowColorA"
  | "glowColorB"
  | "blur"
  | "springStiffness"
  | "springDamping"
  | "disabled"
> & {
  segmentCount?: string;
  showIcons?: boolean;
};

type OrderStatus = "shipping" | "done" | "preparing" | "returned";

const STATUS_LABEL: Record<OrderStatus, string> = {
  shipping: "配送中",
  done: "配達完了",
  preparing: "発送準備中",
  returned: "返品済み",
};

const ORDERS: { id: string; name: string; date: string; status: OrderStatus; gradient: string }[] = [
  { id: "1042", name: "リネンシャツ", date: "10月3日", status: "shipping", gradient: "bg-[linear-gradient(135deg,#ff8fb1,#ff5c8a)]" },
  { id: "1039", name: "ワイヤレスイヤホン", date: "10月1日", status: "preparing", gradient: "bg-[linear-gradient(135deg,#8f7cff,#5b8cff)]" },
  { id: "1035", name: "セラミックマグ", date: "9月28日", status: "done", gradient: "bg-[linear-gradient(135deg,#4de3ff,#3b82f6)]" },
  { id: "1031", name: "キャンバストート", date: "9月25日", status: "shipping", gradient: "bg-[linear-gradient(135deg,#ffd166,#ff8a5c)]" },
  { id: "1027", name: "アロマキャンドル", date: "9月20日", status: "done", gradient: "bg-[linear-gradient(135deg,#7cffc4,#28c7a0)]" },
  { id: "1022", name: "ランニングキャップ", date: "9月14日", status: "returned", gradient: "bg-[linear-gradient(135deg,#f5a9ff,#b06cff)]" },
  { id: "1018", name: "ノート 3冊セット", date: "9月9日", status: "done", gradient: "bg-[linear-gradient(135deg,#ffb86c,#ff5c8a)]" },
];

/**
 * Playground glue: a mock "order history" screen in a phone frame. The
 * selection lives here (controlled), and the list below filters by it so
 * the control visibly does something. Bright thumbnails sit right behind
 * the control's glow so the glass reads at first paint.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function GlassSegmentedControlPreview({
  segmentCount,
  showIcons,
  ...rest
}: GlassSegmentedControlPreviewProps) {
  const options = demoOptions(segmentCount, showIcons);
  const titleId = useId();
  const [selected, setSelected] = useState(options[0].value);
  // Lowering the segment count can drop the selected one; fall back to the first.
  const current = options.some((option) => option.value === selected)
    ? selected
    : options[0].value;
  const orders =
    current === "all" ? ORDERS : ORDERS.filter((order) => order.status === current);

  return (
    <div className="flex h-[560px] items-center justify-center p-3">
      <div className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[2.25rem] bg-[#171320] text-white shadow-2xl ring-8 ring-black/70">
        {/* Scrollbar hidden: a desktop scrollbar inside a phone frame reads as a bug. */}
        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-4 pt-14 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="px-1 text-[11px] font-medium tracking-wider text-white/45 uppercase">
            anima.js demo
          </p>
          <h1 id={titleId} className="mt-1 px-1 text-[26px] font-semibold tracking-tight">
            注文履歴
          </h1>
          {/* Color behind the track: without it the frosted glass would read as flat grey. */}
          <div className="relative mt-4">
            <div
              aria-hidden
              className="absolute inset-x-6 -top-2 h-16 rounded-full bg-[linear-gradient(90deg,#ff8fb1,#8f7cff_55%,#4de3ff)] opacity-70 blur-xl"
            />
            <div className="flex justify-center">
              <GlassSegmentedControl
                {...rest}
                options={options}
                value={current}
                onValueChange={setSelected}
                aria-labelledby={titleId}
              />
            </div>
          </div>
          <ul className="mt-6 flex flex-col gap-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"
              >
                <div className={`size-14 shrink-0 rounded-xl ${order.gradient}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{order.name}</p>
                  <p className="mt-1 text-[12px] text-white/55">
                    {order.date} ・ 注文番号 #{order.id}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                  {STATUS_LABEL[order.status]}
                </span>
              </li>
            ))}
            {orders.length === 0 ? (
              <li className="py-10 text-center text-[13px] text-white/55">
                該当する注文はありません
              </li>
            ) : null}
          </ul>
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
