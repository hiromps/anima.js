import type { SnapCarouselItem } from "../components/snap-carousel";

/**
 * Demo products shared by the preview and the code generator, so the
 * copied snippet renders the same cards as the playground.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */

type Shape = "orb" | "capsule" | "ring";

/**
 * Self-contained "product shot" as a CSS background: a lit object, its
 * floor shadow and a studio backdrop. No image requests, so the gallery
 * card paints instantly.
 */
function productArt(shape: Shape, object: string, deep: string, backdrop: string) {
  const objectLayer =
    shape === "orb"
      ? `radial-gradient(circle at 44% 40%, #fff 0, ${object} 9%, ${deep} 27%, transparent 27.6%)`
      : shape === "capsule"
        ? `radial-gradient(34% 22% at 50% 52%, ${object}, ${deep} 92%, transparent 95%)`
        : `radial-gradient(circle at 50% 50%, transparent 15%, ${object} 16%, ${deep} 26%, transparent 26.6%)`;
  return [
    objectLayer,
    "radial-gradient(30% 5% at 50% 80%, rgba(0,0,0,.55), transparent)",
    `radial-gradient(120% 90% at 50% 0%, ${backdrop}, #0b0b0e 75%)`,
  ].join(", ");
}

export const DEMO_PRODUCTS: SnapCarouselItem[] = [
  { title: "Aero ワイヤレスイヤホン", subtitle: "¥24,800", meta: "★ 4.8", image: productArt("capsule", "#f5f5f7", "#9a9aa3", "#3b3f58") },
  { title: "Halo スマートリング", subtitle: "¥39,600", meta: "★ 4.6", image: productArt("ring", "#ffd9a8", "#a8672f", "#4a2c1c") },
  { title: "Orbit スピーカー", subtitle: "¥18,700", meta: "★ 4.7", image: productArt("orb", "#ff8a5c", "#7a2414", "#5a2418") },
  { title: "Pebble モバイルバッテリー", subtitle: "¥6,980", meta: "★ 4.5", image: productArt("capsule", "#b8f3d8", "#2f8a64", "#173d33") },
  { title: "Lumen デスクライト", subtitle: "¥12,100", meta: "★ 4.9", image: productArt("orb", "#ffe27a", "#a8740c", "#4a3a10") },
  { title: "Loop ヘッドバンド", subtitle: "¥8,800", meta: "★ 4.4", image: productArt("ring", "#c7b8ff", "#5b47c9", "#2a2160") },
  { title: "Drift アロマディフューザー", subtitle: "¥9,900", meta: "★ 4.6", image: productArt("orb", "#9fd8ff", "#1f5f9a", "#163050") },
  { title: "Nook ワイヤレス充電器", subtitle: "¥5,480", meta: "★ 4.3", image: productArt("capsule", "#ffb3cf", "#b03a6c", "#4a1a30") },
  { title: "Crest スマートウォッチ", subtitle: "¥52,800", meta: "★ 4.8", image: productArt("ring", "#e9e9ee", "#6b6b78", "#2e3038") },
  { title: "Glow ナイトランプ", subtitle: "¥4,620", meta: "★ 4.7", image: productArt("orb", "#ffc2a1", "#b25a2c", "#3d2216") },
];

/** Accessible name of the demo carousel; also emitted by codegen. */
export const DEMO_LABEL = "おすすめ商品";
