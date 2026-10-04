import { defineEntry } from "../schema";
import { ParallaxSliderPreview } from "./parallax-slider.demo";
import { DEMO_SLIDES } from "./parallax-slider.demo-data";
import { setup, spec } from "./parallax-slider.prompt";

const schema = {
  transition: {
    type: "select",
    label: "切り替え方",
    group: "外観",
    options: ["parallax", "fade-zoom", "curtain"],
    optionLabels: {
      parallax: "パララックス（横スライド）",
      "fade-zoom": "フェード＋ズーム",
      curtain: "カーテン（ワイプ）",
    },
    default: "parallax",
    description:
      "パララックス: スライドが横に流れ、背景がゆっくり遅れて動く。フェード＋ズーム: クロスフェードと Ken Burns 風のゆっくりしたズーム。カーテン: 境界線が横切って次のスライドを切り出す。",
  },
  parallax: {
    type: "number",
    label: "パララックス量",
    group: "モーション",
    default: 0.6,
    min: 0,
    max: 1,
    step: 0.05,
    description:
      "背景がスライドからどれだけ遅れるか。0 でスライドと一緒、1 で背景は止まったままフレームだけが動きます。「パララックス」切り替え時に効きます。",
  },
  autoplay: {
    type: "boolean",
    label: "自動再生",
    group: "挙動",
    default: true,
    description:
      "ホバー中・キーボードでフォーカス中・画面外・タブ非表示の間は一時停止。視差効果を減らす設定ではオフになります。",
  },
  interval: {
    type: "number",
    label: "切り替え間隔",
    group: "挙動",
    default: 6000,
    min: 2500,
    max: 12000,
    step: 500,
    unit: "ms",
    description: "左下のプログレスラインがこの時間で満ちて、次のスライドへ進みます。",
  },
  loop: {
    type: "boolean",
    label: "ループ",
    group: "挙動",
    default: true,
    description: "オフでは両端で前へ / 次へが無効になり、自動再生は最後のスライドで止まります。",
  },
  showProgress: {
    type: "boolean",
    label: "プログレスライン",
    group: "外観",
    default: true,
    description: "自動再生オフのときは現在位置のインジケーターになります。",
  },
  showCounter: {
    type: "boolean",
    label: "カウンター（02 / 05）",
    group: "外観",
    default: true,
  },
} as const;

/** Formats the demo slides as a JS literal for the snippet. */
function itemsLiteral(): string {
  const lines = DEMO_SLIDES.map((item) => {
    const fields = Object.entries(item)
      .map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`)
      .join("\n");
    return `  {\n${fields}\n  },`;
  });
  return `items={[\n${lines.join("\n")}\n]}`;
}

export const parallaxSliderEntry = defineEntry({
  slug: "parallax-slider",
  name: "ParallaxSlider",
  description:
    "フルブリードのヒーロースライダー — ドラッグや切り替えの間、背景アートがスライドより遅れて動くパララックス。止まると見出しが eyebrow → タイトル → 本文 → CTA の順に立ち上がります。フェード＋ズーム / カーテンのワイプにも切り替え可能。プログレスライン付き自動再生、慣性スワイプ、キーボード操作。framer-motion。",
  category: "carousel",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: ParallaxSliderPreview,
  codegen: {
    componentName: "ParallaxSlider",
    importPath: "@/components/parallax-slider",
    dependencies: ["framer-motion", "lucide-react"],
    extraProps: () => [itemsLiteral(), 'aria-label="旅のハイライト"'],
    extraTodos: () => [
      "items はプレビューと同じ仮のスライドです。実データ（eyebrow / title / subtitle / image / alt / cta）に差し替えてください。image は画像 URL か CSS グラデーション",
      "プレビューの山・海・夜景の SVG アートは renderItem={(item, { isActive }) => …} で描いています。生成コードでは image の空グラデーションだけが表示されます。写真や動画を使うなら image に URL を渡すか、renderItem で <img> / <video> を返してください",
      "高さは親で決めます（例: className=\"h-[80svh]\"）。未指定なら 16:9 になります",
      "現在のスライドを受け取るには onIndexChange={(i) => …}、外から動かすなら index と組み合わせます",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The stage is 560px tall; at 0.4 it fills the 224px card exactly and
    // lays the slider out ~750px wide — the playground's framing.
    scale: 0.4,
  },
});
