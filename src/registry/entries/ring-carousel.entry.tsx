import { defineEntry, type ControlValue } from "../schema";
import { RingCarouselPreview } from "./ring-carousel.demo";
import { DEMO_RING_ITEMS } from "./ring-carousel.demo-data";
import { setup, spec } from "./ring-carousel.prompt";

const schema = {
  cardCount: {
    type: "number",
    label: "カード枚数",
    group: "内容",
    default: 10,
    min: 6,
    max: 14,
    step: 1,
    unit: "枚",
    description: "プレビュー用。生成コードの items はこの枚数分になります。半径は枚数とカード幅から自動で決まります。",
  },
  cardWidth: {
    type: "number",
    label: "カード幅",
    group: "外観",
    default: 210,
    min: 140,
    max: 320,
    step: 5,
    unit: "px",
    description: "高さは幅 × aspect（既定 1.32）。リング全体は枠に収まるよう自動で縮小されます。",
  },
  tilt: {
    type: "number",
    label: "見下ろす角度",
    group: "外観",
    default: 10,
    min: 0,
    max: 30,
    step: 1,
    unit: "deg",
    description: "テーブルに置いたカルーセルを少し上から見る角度。奥の列が持ち上がって見えます。",
  },
  backfaceVisible: {
    type: "boolean",
    label: "裏面を表示",
    group: "外観",
    default: true,
    description: "オンで奥のカードの裏側が隙間から透けて見えます。オフでは手前半分だけ。",
  },
  depthShading: {
    type: "number",
    label: "奥行きの陰影",
    group: "外観",
    default: 0.65,
    min: 0,
    max: 1,
    step: 0.05,
    description: "正面から外れるほどカードを暗くします（0 = なし）。",
  },
  autoRotate: {
    type: "boolean",
    label: "自動回転",
    group: "挙動",
    default: true,
    description: "ホバー・キーボードフォーカス中はゆっくり止まります。視差効果を減らす設定では常にオフ。",
  },
  snap: {
    type: "boolean",
    label: "カード面にスナップ",
    group: "挙動",
    default: true,
    description: "ドラッグを離したとき・ホバーで止まったときに、一番近いカードが正面に来るよう収まります。",
  },
  speed: {
    type: "number",
    label: "回転速度",
    group: "モーション",
    default: 10,
    min: 2,
    max: 40,
    step: 1,
    unit: "deg/s",
  },
  dragSensitivity: {
    type: "number",
    label: "ドラッグ感度",
    group: "モーション",
    default: 0.25,
    min: 0.05,
    max: 1,
    step: 0.01,
    unit: "deg/px",
  },
  friction: {
    type: "number",
    label: "摩擦",
    group: "モーション",
    default: 0.95,
    min: 0.85,
    max: 0.99,
    step: 0.005,
    description: "慣性の減衰（60fps の 1 フレームあたり）。1 に近いほど長く滑ります。",
  },
} as const;

/** Formats the first `cardCount` demo items as a JS literal for the snippet. */
function itemsLiteral(values: Record<string, ControlValue>): string {
  const count = Math.max(
    1,
    Math.min(Number(values.cardCount ?? 10), DEMO_RING_ITEMS.length),
  );
  const lines = DEMO_RING_ITEMS.slice(0, count).map((item) => {
    const fields = Object.entries(item)
      .map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`)
      .join("\n");
    return `  {\n${fields}\n  },`;
  });
  return `items={[\n${lines.join("\n")}\n]}`;
}

export const ringCarouselEntry = defineEntry({
  slug: "ring-carousel",
  name: "RingCarousel",
  description:
    "外から眺めるリングカルーセル — テーブルに置いた回転台のように、円筒に並んだカードを少し上から見ます。手前は大きく明るく、奥は小さく暗く裏側が透ける。自動回転はホバーでゆっくり停止、ドラッグ慣性とカード面へのスナップ、← / → で 1 枚ずつ。純粋な CSS 3D。",
  category: "carousel",
  tech: ["css-3d"],
  host: "dom",
  schema,
  component: RingCarouselPreview,
  codegen: {
    componentName: "RingCarousel",
    importPath: "@/components/ring-carousel",
    dependencies: [],
    skipProps: ["cardCount"],
    extraProps: (values) => [itemsLiteral(values), 'aria-label="フォトギャラリー"'],
    extraTodos: () => [
      "items はプレビューと同じ仮のグラデーション作品です。実データ（id / title / subtitle / image / alt）に差し替えてください。image は画像 URL か CSS の background 値",
      "高さは height（既定 460px）で決まり、リングはその枠に収まるよう自動で縮小されます",
      "正面のカードを受け取るには onIndexChange={(i) => …}、外から動かすには index={i} を渡します",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px stage fills it exactly and the
    // ~900px-wide box frames the ring like the playground preview does.
    scale: 0.4,
  },
});
