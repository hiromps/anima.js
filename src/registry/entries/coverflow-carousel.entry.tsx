import { defineEntry } from "../schema";
import { CoverflowCarouselPreview } from "./coverflow-carousel.demo";
import { demoAlbums } from "./coverflow-carousel.demo-data";
import { setup, spec } from "./coverflow-carousel.prompt";

const schema = {
  itemCount: {
    type: "number",
    label: "スライド枚数",
    group: "内容",
    default: 9,
    min: 3,
    max: 9,
    step: 1,
    unit: "枚",
    description: "プレビュー用。生成コードの items にも同じ枚数のジャケットが出力されます。",
  },
  rotate: {
    type: "number",
    label: "側面の回転",
    group: "外観",
    default: 55,
    min: 0,
    max: 80,
    step: 1,
    unit: "deg",
    description: "左右のスライドが Y 軸で内側を向く角度。",
  },
  depth: {
    type: "number",
    label: "奥行き",
    group: "外観",
    default: 220,
    min: 0,
    max: 600,
    step: 10,
    unit: "px",
    description: "左右のスライドが奥へ下がる距離。",
  },
  spacing: {
    type: "number",
    label: "重なりの間隔",
    group: "外観",
    default: 0.3,
    min: 0.1,
    max: 0.8,
    step: 0.01,
    description: "側面に積み重なるスライドの間隔（スライド幅に対する比率）。小さいほど密に重なります。",
  },
  slideWidth: {
    type: "number",
    label: "スライド幅",
    group: "外観",
    default: 260,
    min: 140,
    max: 420,
    step: 5,
    unit: "px",
    description: "コンテナ幅の約 38% が上限。狭い画面では自動で縮みます。",
  },
  reflection: {
    type: "boolean",
    label: "床の映り込み",
    group: "外観",
    default: true,
  },
  showDots: {
    type: "boolean",
    label: "ドットと矢印",
    group: "外観",
    default: true,
  },
  loop: {
    type: "boolean",
    label: "ループ",
    group: "挙動",
    default: false,
    description: "最後のスライドの次に最初へつながります。",
  },
  autoplay: {
    type: "boolean",
    label: "自動再生",
    group: "挙動",
    default: false,
    description: "ホバー・フォーカス中・画面外では停止。視差効果を減らす設定ではオフになります。",
  },
  interval: {
    type: "number",
    label: "自動再生の間隔",
    group: "挙動",
    default: 3500,
    min: 1500,
    max: 8000,
    step: 250,
    unit: "ms",
  },
} as const;

/** Formats one demo cover as an items-array line. */
function itemLine(item: ReturnType<typeof demoAlbums>[number]): string {
  return `  { title: ${JSON.stringify(item.title)}, subtitle: ${JSON.stringify(
    item.subtitle,
  )}, image: ${JSON.stringify(item.image)} },`;
}

export const coverflowCarouselEntry = defineEntry({
  slug: "coverflow-carousel",
  name: "CoverflowCarousel",
  description:
    "Apple の Cover Flow を現代風に — 正面のスライドの左右で Y 回転したスライドが奥へ重なり、床に映り込む。スプリング遷移、ドラッグでスナップ、横スクロール、クリックで手前へ。純粋な CSS 3D。",
  category: "carousel",
  tech: ["css-3d"],
  host: "dom",
  schema,
  component: CoverflowCarouselPreview,
  codegen: {
    componentName: "CoverflowCarousel",
    importPath: "@/components/coverflow-carousel",
    dependencies: [],
    skipProps: ["itemCount"],
    // The preview's gradient covers are plain data, so they're emitted as
    // a real items array and the snippet renders exactly what's on screen.
    extraProps: (values) => {
      const items = demoAlbums(Number(values.itemCount ?? 9));
      return [
        `items={[\n${items.map(itemLine).join("\n")}\n]}`,
        `defaultIndex={${Math.floor(items.length / 2)}}`,
        `aria-label="アルバム"`,
      ];
    },
    extraTodos: () => [
      "items の image には画像 URL か CSS の background 値（グラデーション可）を渡せます。カスタム表示は renderItem で",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The card lays the demo out at (card width / scale) wide. Slides are
    // 260px in both places, so the width alone decides how many side slides
    // show: at 0.62 a desktop card is ~750px wide, the same window as the
    // playground stage (two-a-side). The demo is centred, so the shorter
    // card crops the reflection and control bar evenly.
    scale: 0.62,
  },
});
