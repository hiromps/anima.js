import { defineEntry } from "../schema";
import { GlassFabMenuPreview } from "./glass-fab-menu.demo";
import { demoActions } from "./glass-fab-menu.demo-data";
import { setup, spec } from "./glass-fab-menu.prompt";

const schema = {
  actionCount: {
    type: "select",
    label: "アクション数",
    group: "内容",
    options: ["3", "4", "5"],
    default: "4",
    description: "生成コードの actions に、この数のアクションが出力されます。",
  },
  layout: {
    type: "select",
    label: "レイアウト",
    group: "外観",
    options: ["stack", "radial"],
    optionLabels: { stack: "縦積み（ピル）", radial: "扇形（ラジアル）" },
    default: "stack",
  },
  accent: {
    type: "select",
    label: "メインボタン",
    group: "外観",
    options: ["glass", "red"],
    optionLabels: { glass: "ガラス", red: "赤（プライマリ）" },
    default: "glass",
    description: "red はタブバーの CTA と同じ #e5322d。",
  },
  position: {
    type: "select",
    label: "位置",
    group: "外観",
    options: ["bottom-right", "bottom-left", "bottom-center"],
    optionLabels: {
      "bottom-right": "右下",
      "bottom-left": "左下",
      "bottom-center": "下中央",
    },
    default: "bottom-right",
  },
  glowColorA: {
    type: "color",
    label: "発光色 A（ピンク）",
    group: "外観",
    default: "#ffaac8",
    description: "ボタン背後の光とガラスの外光に使われます。",
  },
  glowColorB: {
    type: "color",
    label: "発光色 B（ラベンダー）",
    group: "外観",
    default: "#beafff",
  },
  blur: {
    type: "number",
    label: "ぼかし",
    group: "外観",
    default: 30,
    min: 0,
    max: 40,
    step: 1,
    unit: "px",
    description: "ボタンとアクション越しに見える背後のコンテンツのぼかし量。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 380,
    min: 100,
    max: 800,
    step: 10,
    description: "アクションが飛び出す / ＋ が回るスプリング。大きいほど速い。",
  },
  springDamping: {
    type: "number",
    label: "減衰",
    group: "モーション",
    default: 30,
    min: 5,
    max: 60,
    step: 1,
    description: "小さいほど行き過ぎて揺れ戻ります。",
  },
} as const;

export const glassFabMenuEntry = defineEntry({
  slug: "glass-fab-menu",
  name: "GlassFabMenu",
  description:
    "GlassBottomTabBar と同じトンマナの浮遊ガラス FAB メニュー — ＋ が × に回転し、背景を暗くぼかしてアクションを縦積みのピルか扇形にスプリングで展開。矢印キー・Escape 対応の menu ボタン。",
  category: "overlay",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: GlassFabMenuPreview,
  codegen: {
    componentName: "GlassFabMenu",
    importPath: "@/components/glass-fab-menu",
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["actionCount"],
    // The actions on screen are emitted as a literal so the snippet
    // describes the preview; the icon identifiers it uses are imported too.
    extraImports: (values) => {
      const icons = demoActions(values.actionCount).map(({ iconName }) => iconName);
      return [`import { ${icons.join(", ")} } from "lucide-react";`];
    },
    extraProps: (values) => {
      const lines = demoActions(values.actionCount).map(
        ({ action, iconName }) =>
          `  { id: ${JSON.stringify(action.id)}, label: ${JSON.stringify(action.label)}, icon: ${iconName} },`,
      );
      return [`actions={[\n${lines.join("\n")}\n]}`];
    },
    extraTodos: () => [
      "actions の各項目に onSelect: () => { … } を渡して処理をつなぎ、label / icon をアプリに合わせて差し替えてください（アイコンは lucide-react から選べます）",
      "GlassBottomTabBar と併用する場合、右下の FAB がバーに重なります。className（または [data-glass-fab-menu]）で --gfm-inset-bottom: 104px のように指定してバーの上に逃がしてください",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px phone frame fills it exactly.
    scale: 0.4,
  },
});
