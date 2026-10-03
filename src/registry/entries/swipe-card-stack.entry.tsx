import { defineEntry } from "../schema";
import { SwipeCardStackPreview } from "./swipe-card-stack.demo";
import { DEMO_TESTIMONIALS } from "./swipe-card-stack.demo-data";
import { setup, spec } from "./swipe-card-stack.prompt";

const schema = {
  visibleCount: {
    type: "number",
    label: "重なって見える枚数",
    group: "外観",
    default: 3,
    min: 2,
    max: 4,
    step: 1,
    unit: "枚",
    description: "一番上のカードを含む枚数。後ろのカードは下にずれ、小さく、少し傾いて覗きます。",
  },
  showStamps: {
    type: "boolean",
    label: "LIKE / NOPE スタンプ",
    group: "外観",
    default: true,
    description: "ドラッグした方向に合わせてスタンプがフェードインします。",
  },
  showControls: {
    type: "boolean",
    label: "操作ボタン",
    group: "外観",
    default: true,
    description: "戻る・スキップ・いいね のボタン。← / → キーでも同じ動きになります。",
  },
  loop: {
    type: "boolean",
    label: "ループ",
    group: "挙動",
    default: true,
    description: "オンでめくったカードが山の一番下に戻ります。オフでは最後に終了表示が出ます。",
  },
  threshold: {
    type: "number",
    label: "飛ばす距離",
    group: "挙動",
    default: 120,
    min: 40,
    max: 240,
    step: 5,
    unit: "px",
    description: "これ以上ドラッグして離すと飛んでいきます。素早く振った場合は距離が足りなくても飛びます。",
  },
  rotateFactor: {
    type: "number",
    label: "傾き",
    group: "モーション",
    default: 6,
    min: 0,
    max: 15,
    step: 0.5,
    unit: "deg/100px",
    description: "横に 100px ドラッグしたときの傾き。",
  },
  springStiffness: {
    type: "number",
    label: "バネの硬さ",
    group: "モーション",
    default: 320,
    min: 80,
    max: 700,
    step: 10,
    description: "後ろのカードがせり上がる動きと、戻るときの動き。",
  },
  springDamping: {
    type: "number",
    label: "バネの減衰",
    group: "モーション",
    default: 30,
    min: 8,
    max: 60,
    step: 1,
  },
} as const;

/** Formats the demo testimonials as a JS literal for the snippet. */
function itemsLiteral(): string {
  const lines = DEMO_TESTIMONIALS.map((item) => {
    const fields = Object.entries(item)
      .map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`)
      .join("\n");
    return `  {\n${fields}\n  },`;
  });
  return `items={[\n${lines.join("\n")}\n]}`;
}

export const swipeCardStackEntry = defineEntry({
  slug: "swipe-card-stack",
  name: "SwipeCardStack",
  description:
    "重なったカードを左右にスワイプして送るカードスタック — お客様の声・オンボーディング・マッチングアプリ風。ドラッグの方向に傾き、LIKE / NOPE スタンプが浮かび、後ろのカードがバネでせり上がります。ボタンと ← / → キーでも同じ動き。framer-motion。",
  category: "card",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: SwipeCardStackPreview,
  codegen: {
    componentName: "SwipeCardStack",
    importPath: "@/components/swipe-card-stack",
    dependencies: ["framer-motion", "lucide-react"],
    extraProps: () => [itemsLiteral(), 'aria-label="お客様の声"'],
    extraTodos: () => [
      "items はプレビューと同じ仮のお客様の声です。実データ（id / title / subtitle / body / image / accent）に差し替えてください。image は CSS グラデーションか画像 URL",
      "スワイプ結果を受け取るには onSwipe={(item, direction) => …} を渡します（direction は \"left\" | \"right\"）",
      "カードの中身を自作するなら renderCard={(item, { index, total, isTop }) => …} を渡します。枠・スタンプ・ドラッグはそのまま使われます",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px stage fills it exactly.
    scale: 0.4,
  },
});
