import { defineEntry } from "../schema";
import { GlassBottomTabBarPreview } from "./glass-bottom-tab-bar.demo";
import { DEMO_CTA_HREF, demoTabs } from "./glass-bottom-tab-bar.demo-data";
import { setup, spec } from "./glass-bottom-tab-bar.prompt";

const schema = {
  tabCount: {
    type: "select",
    label: "タブ数",
    group: "タブ",
    options: ["3", "4", "5"],
    default: "4",
    description: "生成コードの tabs に、この数のタブが出力されます。",
  },
  ctaLabel: {
    type: "string",
    label: "CTA ラベル",
    group: "タブ",
    default: "",
    description: "空欄で非表示。入力するとバー直下に赤い帯がスライドインします。",
  },
  showLabels: {
    type: "boolean",
    label: "ラベルを表示",
    group: "外観",
    default: true,
  },
  glowColorA: {
    type: "color",
    label: "発光色 A（ピンク）",
    group: "外観",
    default: "#ffaac8",
    description: "背後の光、バーの外光、アクティブアイコンの発光に使われます。",
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
    description: "バー越しに見える背後のコンテンツのぼかし量。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 380,
    min: 100,
    max: 800,
    step: 10,
    description: "アクティブピルがタブ間を移動するスプリング。大きいほど速い。",
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

export const glassBottomTabBarEntry = defineEntry({
  slug: "glass-bottom-tab-bar",
  name: "GlassBottomTabBar",
  description:
    "iOS アプリ風の浮遊ガラスボトムタブバー — すりガラスとパステルの発光、スプリングで移動するアクティブピル、SVG マスクでくり抜いたアイコン。モバイル幅専用。",
  category: "navigation",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: GlassBottomTabBarPreview,
  codegen: {
    componentName: "GlassBottomTabBar",
    importPath: "@/components/glass-bottom-tab-bar",
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["tabCount", "ctaLabel"],
    // The tabs on screen are emitted as a literal so the snippet describes
    // the preview; the icon identifiers it uses are imported alongside.
    extraImports: (values) => {
      const icons = demoTabs(values.tabCount).map(({ iconName }) => iconName);
      return [`import { ${icons.join(", ")} } from "lucide-react";`];
    },
    extraProps: (values) => {
      const props: string[] = [];
      const lines = demoTabs(values.tabCount).map(
        ({ tab, iconName }) =>
          `  { href: ${JSON.stringify(tab.href)}, label: ${JSON.stringify(tab.label)}, icon: ${iconName} },`,
      );
      props.push(`tabs={[\n${lines.join("\n")}\n]}`);
      const ctaLabel = String(values.ctaLabel ?? "");
      if (ctaLabel) {
        props.push(
          `cta={{ label: ${JSON.stringify(ctaLabel)}, href: ${JSON.stringify(DEMO_CTA_HREF)} }}`,
        );
      }
      return props;
    },
    extraTodos: () => [
      "tabs の href / label / icon をプロジェクトのルートに合わせて差し替えてください（href は実在するルートに向けること。アイコンは lucide-react から選べます）",
      'hiddenPaths（既定 ["/"]）を確認してください。トップページにも出す場合は hiddenPaths={[]} を渡します',
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px phone frame fills it exactly.
    scale: 0.4,
  },
});
