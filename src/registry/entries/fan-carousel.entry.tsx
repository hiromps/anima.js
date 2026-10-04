import { defineEntry } from "../schema";
import { FanCarouselPreview } from "./fan-carousel.demo";
import { FAN_DEMO_CARDS } from "./fan-carousel.demo-data";
import { setup, spec } from "./fan-carousel.prompt";

const schema = {
  itemCount: {
    type: "number",
    label: "カード枚数",
    group: "内容",
    default: 9,
    min: 3,
    max: 9,
    step: 1,
    unit: "枚",
    description: "プレイグラウンド専用：デモのタロットカードの枚数。中央のカードから始まります。",
  },
  cardWidth: {
    type: "number",
    label: "カード幅",
    group: "外観",
    default: 160,
    min: 100,
    max: 260,
    step: 2,
    unit: "px",
    description: "高さは幅 × 1.55（aspect）。枠より広い扇は自動で縮小されます。",
  },
  spread: {
    type: "number",
    label: "扇の開き",
    group: "外観",
    default: 56,
    min: 10,
    max: 140,
    step: 1,
    unit: "deg",
    description: "左右に見えるカード全体で開く角度の合計。",
  },
  radius: {
    type: "number",
    label: "弧の半径",
    group: "外観",
    default: 600,
    min: 200,
    max: 1400,
    step: 10,
    unit: "px",
    description: "カードの中心から、手元の回転軸までの距離。小さいほど強くカーブします。",
  },
  lift: {
    type: "number",
    label: "持ち上げ",
    group: "外観",
    default: 32,
    min: 0,
    max: 80,
    step: 1,
    unit: "px",
    description: "アクティブなカードが手札から浮き上がる高さ。",
  },
  maxVisible: {
    type: "number",
    label: "片側の表示枚数",
    group: "外観",
    default: 4,
    min: 1,
    max: 6,
    step: 1,
    unit: "枚",
    description: "アクティブなカードの左右それぞれに描画する枚数。外側はフェードします。",
  },
  dealIn: {
    type: "boolean",
    label: "配るイントロ",
    group: "挙動",
    default: true,
    description: "画面に入ったとき、重ねた山札から扇へカードを配ります（一度だけ。動きを減らす設定では省略）。",
  },
  springStiffness: {
    type: "number",
    label: "バネの硬さ",
    group: "モーション",
    default: 260,
    min: 60,
    max: 600,
    step: 10,
    description: "ドラッグへの追従と、カードに落ち着くときの動き。",
  },
  springDamping: {
    type: "number",
    label: "バネの減衰",
    group: "モーション",
    default: 28,
    min: 8,
    max: 60,
    step: 1,
  },
} as const;

/** The deck the preview shows, sliced by `itemCount`. */
function deckSize(values: Record<string, unknown>): number {
  const n = typeof values.itemCount === "number" ? values.itemCount : 9;
  return Math.max(1, Math.min(FAN_DEMO_CARDS.length, Math.round(n)));
}

/** Formats the demo cards as a JS literal for the snippet (gradient art only). */
function itemsLiteral(count: number): string {
  const lines = FAN_DEMO_CARDS.slice(0, count).map(
    ({ id, title, subtitle, gradient }) =>
      `  {\n    id: ${JSON.stringify(id)},\n    title: ${JSON.stringify(title)},\n    subtitle: ${JSON.stringify(subtitle)},\n    image: ${JSON.stringify(gradient)},\n  },`,
  );
  return `items={[\n${lines.join("\n")}\n]}`;
}

export const fanCarouselEntry = defineEntry({
  slug: "fan-carousel",
  name: "FanCarousel",
  description:
    "手札のように弧を描いて広がるカードの扇 — 中央のカードが浮き上がってまっすぐに立ち、隣のカードは距離に応じて傾きます。ドラッグ・横スクロールでバネのように追従、クリックで選択、ホバーでちらっと覗く。画面に入ると山札から配られるイントロ付き。framer-motion。",
  category: "carousel",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: FanCarouselPreview,
  codegen: {
    componentName: "FanCarousel",
    importPath: "@/components/fan-carousel",
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["itemCount"],
    extraProps: (values) => {
      const count = deckSize(values);
      return [
        itemsLiteral(count),
        `defaultIndex={${Math.floor(count / 2)}}`,
        'aria-label="タロットカード"',
      ];
    },
    extraTodos: () => [
      "items はプレビューと同じ仮のタロットカードです。image は CSS の background 値（グラデーション、位置・サイズ付きの url(…) の重ね）か画像 URL を渡せます。プレビューではグラデーションの上に SVG の紋章と格子模様を url(\"data:image/svg+xml,…\") で重ねています",
      "選択中のカードを受け取るには onIndexChange={(index) => …} を渡します。外から制御するなら index と組み合わせます",
      "カードの絵柄を自作するなら renderItem={(item, { index, total, active, offset }) => …} を渡します。扇の動き・陰影・枠の光はそのまま使われます",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px velvet stage fills it exactly
    // and the stage is ~720–780px wide — the same framing as the playground.
    scale: 0.4,
  },
});
