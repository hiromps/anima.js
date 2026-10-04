import { defineEntry } from "../schema";
import { WheelCarouselPreview } from "./wheel-carousel.demo";
import { DEMO_MONTHS } from "./wheel-carousel.demo-data";
import { setup, spec } from "./wheel-carousel.prompt";

const schema = {
  variant: {
    type: "select",
    label: "行の種類",
    group: "外観",
    options: ["text", "card"],
    optionLabels: { text: "テキスト（ピッカー）", card: "カード（サムネイル付き）" },
    default: "text",
    description: "プレビューでは左端の「月」ホイールに適用されます。",
  },
  rowHeight: {
    type: "number",
    label: "行の高さ",
    group: "外観",
    default: 40,
    min: 28,
    max: 80,
    step: 1,
    unit: "px",
    description: "中央の帯での 1 行の高さ。文字サイズはこの半分。",
  },
  visibleRows: {
    type: "select",
    label: "見える行数",
    group: "外観",
    options: ["3", "5", "7"],
    optionLabels: { "3": "3 行", "5": "5 行", "7": "7 行" },
    default: "5",
    description: "ドラムの上下に見える行数（奇数）。多いほどカーブが緩やかになります。",
  },
  perspective: {
    type: "number",
    label: "遠近感",
    group: "外観",
    default: 500,
    min: 150,
    max: 2000,
    step: 10,
    unit: "px",
    description: "値が小さいほど上下の行が強く奥へ倒れます。",
  },
  highlight: {
    type: "boolean",
    label: "選択帯",
    group: "外観",
    default: true,
    description: "選択中の行の背後にヘアライン付きのガラス帯を敷きます。",
  },
  loop: {
    type: "boolean",
    label: "ループ",
    group: "挙動",
    default: true,
    description: "端で止まらず無限に回ります（行数が「見える行数 + 2」未満のときは無効）。",
  },
  friction: {
    type: "number",
    label: "摩擦",
    group: "モーション",
    default: 0.94,
    min: 0.8,
    max: 0.98,
    step: 0.005,
    description: "はじいた後の慣性の減衰。1 に近いほど遠くまで回ります。",
  },
} as const;

export const wheelCarouselEntry = defineEntry({
  slug: "wheel-carousel",
  name: "WheelCarousel",
  description:
    "iOS のピッカーホイールのような縦向き 3D ドラム — 円筒の外周に並んだ行が回り、中央のガラス帯で止まります。ドラッグ・ホイール・トラックパッドの慣性とスナップ、キーボード操作。テキスト行とサムネイル付きカード行、横に並べて日時ピッカーにも。純粋な CSS 3D。",
  category: "carousel",
  tech: ["css-3d"],
  host: "dom",
  schema,
  component: WheelCarouselPreview,
  codegen: {
    componentName: "WheelCarousel",
    importPath: "@/components/wheel-carousel",
    dependencies: [],
    // A select always yields a string; the prop is a number.
    skipProps: ["visibleRows"],
    extraProps: (values) => [
      `visibleRows={${Number(values.visibleRows ?? 5) || 5}}`,
      `items={${JSON.stringify(DEMO_MONTHS)}}`,
      'aria-label="月"',
    ],
    extraTodos: (values) => [
      "選択値を受け取るには onIndexChange={(i) => …} を渡します。外から値を決めるなら index={…} も渡して制御モードにします（変更するとホイールがその行まで回ります）",
      values.variant === "card"
        ? 'variant="card" の items は { id, title, subtitle, image } のオブジェクトにすると、サムネイル（画像 URL か CSS グラデーション）と 2 行目が出ます'
        : "日時ピッカーにするなら、月 / 日 / 時刻 などのホイールを横に並べ、それぞれ別の aria-label を付けます（インスタンスは互いに独立）",
      "行の中身を自作するなら renderItem={(item, { index, selected }) => …} を渡します。3D の配置と減光はそのまま使われます",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px stage fills it exactly, and the
    // ~650px-wide composition sits inside the (card width / 0.4) layout.
    scale: 0.4,
  },
});
