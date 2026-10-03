import { defineEntry } from "../schema";
import { GlassTopBarPreview } from "./glass-top-bar.demo";
import { DEMO_LEADING, demoTrailing } from "./glass-top-bar.demo-data";
import { setup, spec } from "./glass-top-bar.prompt";

const schema = {
  title: {
    type: "string",
    label: "タイトル",
    group: "内容",
    default: "ライブラリ",
  },
  subtitle: {
    type: "string",
    label: "サブタイトル",
    group: "内容",
    default: "",
    description: "空欄で非表示。タイトルの下に小さく表示されます。",
  },
  showBack: {
    type: "boolean",
    label: "戻るボタン",
    group: "内容",
    default: true,
    description: "生成コードの leading に ChevronLeft の戻るボタンが出力されます。",
  },
  trailingCount: {
    type: "select",
    label: "右のボタン数",
    group: "内容",
    options: ["0", "1", "2"],
    default: "2",
    description: "生成コードの trailing に、この数のボタン（検索 / その他）が出力されます。",
  },
  glowColorA: {
    type: "color",
    label: "発光色 A（ピンク）",
    group: "外観",
    default: "#ffaac8",
    description: "バー背後の光と外光に使われます。",
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
  revealDistance: {
    type: "number",
    label: "ガラスが現れる距離",
    group: "挙動",
    default: 60,
    min: 1,
    max: 200,
    step: 1,
    unit: "px",
    description: "ページ最上部ではバーは透明。この距離スクロールするとガラスと発光が出そろいます。",
  },
  hideOnScroll: {
    type: "boolean",
    label: "下スクロールで隠す",
    group: "挙動",
    default: false,
    description: "下へスクロールすると上に退避し、上へスクロールすると戻ります。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 380,
    min: 100,
    max: 800,
    step: 10,
    description: "隠れる / 戻るときのスプリング。大きいほど速い。",
  },
  springDamping: {
    type: "number",
    label: "減衰",
    group: "モーション",
    default: 32,
    min: 5,
    max: 60,
    step: 1,
    description: "小さいほど行き過ぎて揺れ戻ります。",
  },
} as const;

export const glassTopBarEntry = defineEntry({
  slug: "glass-top-bar",
  name: "GlassTopBar",
  description:
    "GlassBottomTabBar と対になる iOS 風の浮遊ガラストップバー — 戻るボタン・中央タイトル・右のアクション。最上部では透明で、スクロールに合わせてすりガラスとパステルの発光が現れる。下スクロールで隠すことも可能。",
  category: "navigation",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: GlassTopBarPreview,
  codegen: {
    componentName: "GlassTopBar",
    importPath: "@/components/glass-top-bar",
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["showBack", "trailingCount"],
    // The buttons on screen are emitted as literals so the snippet
    // describes the preview; the icon identifiers are imported alongside.
    extraImports: (values) => {
      const icons = [
        ...(values.showBack ? [DEMO_LEADING.iconName] : []),
        ...demoTrailing(values.trailingCount).map(({ iconName }) => iconName),
      ];
      return icons.length
        ? [`import { ${icons.join(", ")} } from "lucide-react";`]
        : [];
    },
    extraProps: (values) => {
      const props: string[] = [];
      if (values.showBack) {
        props.push(
          `leading={{ icon: ${DEMO_LEADING.iconName}, label: ${JSON.stringify(DEMO_LEADING.label)}, onClick: () => history.back() }}`,
        );
      }
      const trailing = demoTrailing(values.trailingCount);
      if (trailing.length) {
        const lines = trailing.map(
          ({ iconName, label }) =>
            `  { icon: ${iconName}, label: ${JSON.stringify(label)}, onClick: () => {} },`,
        );
        props.push(`trailing={[\n${lines.join("\n")}\n]}`);
      }
      return props;
    },
    extraTodos: (values) => [
      ...(demoTrailing(values.trailingCount).length
        ? ["trailing の onClick に処理をつないでください（label はボタンの読み上げ名になります）"]
        : []),
      "既定（fixed）ではバーが本文に重なるので、ページ側で padding-top を確保してください。コンテナ内でスクロールするページなら scrollContainerRef にそのスクロール要素の ref を渡します",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px phone frame fills it exactly.
    scale: 0.4,
  },
});
