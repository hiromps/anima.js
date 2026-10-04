import { defineEntry } from "../schema";
import { ExpandingPanelsPreview } from "./expanding-panels.demo";
import { MAX_ITEMS, MIN_ITEMS, demoDestinations } from "./expanding-panels.demo-data";
import { setup, spec } from "./expanding-panels.prompt";

const schema = {
  itemCount: {
    type: "number",
    label: "パネル数",
    group: "内容",
    default: 5,
    min: MIN_ITEMS,
    max: MAX_ITEMS,
    step: 1,
    description: "生成コードの items に、この数の旅先が出力されます。",
  },
  orientation: {
    type: "select",
    label: "向き",
    group: "外観",
    options: ["auto", "horizontal", "vertical"],
    optionLabels: { auto: "自動（狭いと縦積み）", horizontal: "横並び", vertical: "縦積み" },
    default: "auto",
    description: "自動はコンテナ幅 520px 未満で縦積みに切り替わります（コンテナクエリ）。",
  },
  collapsedSize: {
    type: "number",
    label: "閉じたパネルの幅",
    group: "外観",
    default: 64,
    min: 40,
    max: 120,
    step: 1,
    unit: "px",
    description: "縦積みのときは閉じたパネルの高さになります。",
  },
  gap: {
    type: "number",
    label: "パネルの間隔",
    group: "外観",
    default: 10,
    min: 0,
    max: 24,
    step: 1,
    unit: "px",
  },
  radius: {
    type: "number",
    label: "角の丸み",
    group: "外観",
    default: 24,
    min: 0,
    max: 40,
    step: 1,
    unit: "px",
  },
  trigger: {
    type: "select",
    label: "開くきっかけ",
    group: "挙動",
    options: ["hover", "click"],
    optionLabels: { hover: "ホバー", click: "クリック" },
    default: "hover",
    description: "クリック・タップ・キーボードのフォーカスはどちらでも有効です。",
  },
  autoplay: {
    type: "boolean",
    label: "自動再生",
    group: "挙動",
    default: true,
    description: "ホバー・フォーカス中・画面外では一時停止。視差効果を減らす設定ではオフになります。",
  },
  interval: {
    type: "number",
    label: "切り替え間隔",
    group: "挙動",
    default: 5000,
    min: 2000,
    max: 10000,
    step: 250,
    unit: "ms",
  },
} as const;

export const expandingPanelsEntry = defineEntry({
  slug: "expanding-panels",
  name: "ExpandingPanels",
  description:
    "アコーディオン型の画像カルーセル — アクティブなパネルが伸びてアートとキャプションを見せ、他は縦書きタイトルの細い帯に。ホバー / クリック / キーボード、進捗バー付き自動再生、狭いコンテナでは縦積み。",
  category: "carousel",
  tech: ["css"],
  host: "dom",
  schema,
  component: ExpandingPanelsPreview,
  codegen: {
    componentName: "ExpandingPanels",
    importPath: "@/components/expanding-panels",
    dependencies: ["lucide-react"],
    skipProps: ["itemCount"],
    extraImports: (values) => {
      const icons = demoDestinations(values.itemCount).map(({ iconName }) => iconName);
      return [`import { ${icons.join(", ")} } from "lucide-react";`];
    },
    // The destinations on screen are emitted as a literal so the snippet
    // describes the preview. Only the sky gradients go out; the SVG ridge
    // silhouettes are preview-only (see the TODO).
    extraProps: (values) => {
      const lines = demoDestinations(values.itemCount).map(
        (d) =>
          `  {\n    id: ${JSON.stringify(d.id)},\n    title: ${JSON.stringify(d.title)},\n    subtitle: ${JSON.stringify(d.subtitle)},\n    icon: ${d.iconName},\n    image: ${JSON.stringify(d.sky)},\n  },`,
      );
      return [`items={[\n${lines.join("\n")}\n]}`, 'aria-label="旅先ギャラリー"'];
    },
    extraTodos: () => [
      "image には写真の URL（/images/kyoto.jpg など）か CSS の背景値（グラデーション可）を渡してください。プレビューの山並みシルエットはデモ専用で、ここでは背景の空模様のグラデーションだけを出力しています",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The card lays the demo out at (card width / 0.5) × 448px: wide enough
    // to stay above the 520px stacking breakpoint even on a phone-width
    // card, and tall enough for the 400px row plus padding.
    scale: 0.5,
  },
});
