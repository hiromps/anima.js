import { defineEntry } from "../schema";
import { ThumbnailCarouselPreview } from "./thumbnail-carousel.demo";
import { DEMO_SHOTS } from "./thumbnail-carousel.demo-data";
import { setup, spec } from "./thumbnail-carousel.prompt";

const schema = {
  transition: {
    type: "select",
    label: "切り替え",
    group: "モーション",
    options: ["slide", "fade", "zoom"],
    optionLabels: { slide: "スライド", fade: "フェード", zoom: "ズーム" },
    default: "slide",
    description: "メイン画像が切り替わるときの動き。",
  },
  thumbPosition: {
    type: "select",
    label: "サムネイルの位置",
    group: "外観",
    options: ["bottom", "left"],
    optionLabels: { bottom: "下", left: "左（縦並び）" },
    default: "bottom",
  },
  thumbSize: {
    type: "number",
    label: "サムネイルの大きさ",
    group: "外観",
    default: 64,
    min: 44,
    max: 96,
    step: 2,
    unit: "px",
    description: "正方形の一辺。入りきらない分は横（縦）スクロールし、選択中のサムネイルが常に見える位置へ自動で移動します。",
  },
  showCounter: {
    type: "boolean",
    label: "枚数バッジ",
    group: "外観",
    default: true,
    description: "メイン画像の右上に「03 / 06」を表示します。",
  },
  zoomOnHover: {
    type: "boolean",
    label: "ホバーで拡大",
    group: "挙動",
    default: true,
    description: "マウスを乗せた位置を中心にメイン画像を拡大します（タッチ端末では無効）。",
  },
  zoomScale: {
    type: "number",
    label: "拡大率",
    group: "挙動",
    default: 2,
    min: 1.25,
    max: 4,
    step: 0.25,
    unit: "×",
  },
  loop: {
    type: "boolean",
    label: "ループ",
    group: "挙動",
    default: true,
    description: "前へ / 次へ・スワイプが端で反対側に回り込みます。サムネイルの矢印キー操作は常に回り込みます。",
  },
} as const;

/** Formats the demo shots as a JS literal (backdrops + captions only). */
function itemsLiteral(): string {
  const lines = DEMO_SHOTS.map(({ id, title, subtitle, image, alt }) => {
    const fields = Object.entries({ id, title, subtitle, image, alt })
      .map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`)
      .join("\n");
    return `  {\n${fields}\n  },`;
  });
  return `items={[\n${lines.join("\n")}\n]}`;
}

export const thumbnailCarouselEntry = defineEntry({
  slug: "thumbnail-carousel",
  name: "ThumbnailCarousel",
  description:
    "EC の商品ページ / ギャラリー向けのサムネイル付きビューア — 大きなメイン画像（スライド / フェード / ズーム切り替え、スワイプ操作、マウス位置を中心にしたホバー拡大）と、選択中のリングが滑るように移動するサムネイル列。サムネイルはタブとしてキーボード操作できます。framer-motion。",
  category: "carousel",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: ThumbnailCarouselPreview,
  codegen: {
    componentName: "ThumbnailCarousel",
    importPath: "@/components/thumbnail-carousel",
    dependencies: ["framer-motion", "lucide-react"],
    extraProps: () => [itemsLiteral(), 'aria-label="商品画像"'],
    extraTodos: () => [
      "items はプレビューと同じ仮データです。image に商品写真の URL（または CSS グラデーション）を、alt に画像の説明を入れてください",
      "プレビューのヘッドホンの絵は renderItem / renderThumb で描いたデモ専用のものです。生成コードでは背景グラデーションとキャプションだけが表示されます",
      "選択中の番号を外で使うなら index={index} onIndexChange={setIndex} で制御します（初期位置だけなら defaultIndex）",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px stage fills it exactly, and the
    // card's width / 0.4 (~720px) frames the same composition as the
    // playground's preview box.
    scale: 0.4,
  },
});
