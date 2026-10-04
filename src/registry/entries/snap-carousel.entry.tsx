import { defineEntry } from "../schema";
import { SnapCarouselPreview } from "./snap-carousel.demo";
import { DEMO_LABEL, DEMO_PRODUCTS } from "./snap-carousel.demo-data";
import { setup, spec } from "./snap-carousel.prompt";

const schema = {
  slidesPerView: {
    type: "number",
    label: "表示枚数（広い幅）",
    group: "レイアウト",
    default: 3,
    min: 1,
    max: 5,
    step: 1,
    description:
      "コンテナ幅 640px 以上での枚数。狭い幅では自動で 2 枚 / 1 枚に減ります。",
  },
  gap: {
    type: "number",
    label: "スライド間隔",
    group: "レイアウト",
    default: 16,
    min: 0,
    max: 40,
    step: 1,
    unit: "px",
  },
  peek: {
    type: "boolean",
    label: "次のスライドをのぞかせる",
    group: "レイアウト",
    default: true,
    description: "1.15 / 2.2 / 3.2 枚のように端から次がのぞき、続きがあると伝わります。",
  },
  align: {
    type: "select",
    label: "スナップ位置",
    group: "レイアウト",
    options: ["start", "center"],
    optionLabels: { start: "左揃え", center: "中央" },
    default: "start",
  },
  showArrows: {
    type: "boolean",
    label: "前へ / 次へボタン",
    group: "外観",
    default: true,
    description: "ホバーまたはキーボードフォーカスで表示。端では消えます。",
  },
  indicator: {
    type: "select",
    label: "インジケーター",
    group: "外観",
    options: ["progress", "dots", "none"],
    optionLabels: { progress: "プログレスバー", dots: "ドット", none: "なし" },
    default: "progress",
  },
  fade: {
    type: "boolean",
    label: "端のフェード",
    group: "外観",
    default: true,
    description: "続きがある側の端だけをフェードさせます。",
  },
  loop: {
    type: "boolean",
    label: "ループ",
    group: "挙動",
    default: false,
    description: "最後で「次へ」を押すと先頭へ戻ります（クローンを使わない巻き戻し）。",
  },
  autoplay: {
    type: "boolean",
    label: "自動再生",
    group: "挙動",
    default: false,
    description:
      "ホバー・フォーカス・画面外・視差効果を減らす設定では停止します。停止ボタン付き。",
  },
  interval: {
    type: "number",
    label: "自動再生の間隔",
    group: "挙動",
    default: 4500,
    min: 1500,
    max: 10000,
    step: 500,
    unit: "ms",
  },
} as const;

export const snapCarouselEntry = defineEntry({
  slug: "snap-carousel",
  name: "SnapCarousel",
  description:
    "ネイティブ CSS scroll-snap の商品・コンテンツカルーセル — コンテナ幅で 1.15 / 2.2 / 3.2 枚、マウスドラッグ、ホバーで出る矢印、プログレスバー / ドット、端のフェード。慣性スクロールとアクセシビリティはブラウザのまま。",
  category: "carousel",
  tech: ["css"],
  host: "dom",
  schema,
  component: SnapCarouselPreview,
  codegen: {
    componentName: "SnapCarousel",
    importPath: "@/components/snap-carousel",
    dependencies: ["lucide-react"],
    // The demo products are self-contained CSS gradients, so they are
    // emitted as-is and the snippet renders exactly the previewed cards.
    extraProps: () => {
      const lines = DEMO_PRODUCTS.map(
        (item) =>
          `  { ${Object.entries(item)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(", ")} },`,
      );
      return [`aria-label="${DEMO_LABEL}"`, `items={[\n${lines.join("\n")}\n]}`];
    },
    extraTodos: () => [
      "items を自分のデータに置き換えてください。image には画像 URL か CSS の background 値（グラデーション可）を渡せます",
      "カードの中身を自由に描くなら renderItem={(item, state) => …} を渡してください（state.active / state.visible 付き）",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The card lays the demo out at (card width / scale): a desktop card is
    // ~466px, so 0.62 gives ~750px — the playground stage's width and above
    // the 640px container breakpoint — framing the same 3.2-up composition.
    scale: 0.62,
  },
});
