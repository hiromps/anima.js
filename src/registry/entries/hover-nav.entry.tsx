import { defineEntry } from "../schema";
import { HoverNavPreview } from "./hover-nav.demo";
import { DEMO_ACTIVE_HREF, DEMO_CTA, demoItems } from "./hover-nav.demo-data";
import { setup, spec } from "./hover-nav.prompt";

const schema = {
  itemCount: {
    type: "select",
    label: "リンク数",
    group: "内容",
    options: ["3", "4", "5", "6"],
    default: "5",
    description: "生成コードの items に、この数のリンクが出力されます。",
  },
  showCta: {
    type: "boolean",
    label: "CTA ボタン",
    group: "内容",
    default: true,
    description: "バー右端の小さなボタン。生成コードには cta として出力されます。",
  },
  variant: {
    type: "select",
    label: "スタイル",
    group: "外観",
    options: ["floating", "flat"],
    optionLabels: {
      floating: "フローティング（ピル）",
      flat: "フラット",
    },
    default: "floating",
  },
  highlightColor: {
    type: "color",
    label: "ハイライト色",
    group: "外観",
    default: "#ffffff",
    description: "ホバーのブロブ、現在地インジケーター、フォーカスリングの色。",
  },
  indicator: {
    type: "select",
    label: "現在地インジケーター",
    group: "外観",
    options: ["dot", "underline", "none"],
    optionLabels: {
      dot: "ドット",
      underline: "下線",
      none: "なし",
    },
    default: "dot",
  },
  size: {
    type: "select",
    label: "サイズ",
    group: "外観",
    options: ["sm", "md"],
    optionLabels: {
      sm: "小（28px）",
      md: "中（34px）",
    },
    default: "md",
  },
  restOnActive: {
    type: "boolean",
    label: "現在地で待機",
    group: "挙動",
    default: true,
    description:
      "ホバーしていないとき、ブロブを現在のページの項目に置いておきます。オフでフェードアウト。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 420,
    min: 100,
    max: 900,
    step: 10,
    description: "ブロブが項目間を移動するスプリング。大きいほど速い。",
  },
  springDamping: {
    type: "number",
    label: "減衰",
    group: "モーション",
    default: 34,
    min: 5,
    max: 60,
    step: 1,
    description: "小さいほど行き過ぎて揺れ戻ります。",
  },
} as const;

export const hoverNavEntry = defineEntry({
  slug: "hover-nav",
  name: "HoverNav",
  description:
    "Vercel / Linear 風のトップナビ — ホバーやキーボードフォーカスに合わせて柔らかなハイライトがスプリングで滑り、現在のページにはドット / 下線が残ります。フローティングのピルとフラットの 2 スタイル。",
  category: "navigation",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: HoverNavPreview,
  codegen: {
    componentName: "HoverNav",
    importPath: "@/components/hover-nav",
    dependencies: ["framer-motion"],
    skipProps: ["itemCount", "showCta"],
    // The links on screen are emitted as a literal so the snippet
    // describes the preview.
    extraProps: (values) => {
      const lines = demoItems(values.itemCount).map(
        (item) =>
          `  { label: ${JSON.stringify(item.label)}, href: ${JSON.stringify(item.href)} },`,
      );
      const props = [
        `items={[\n${lines.join("\n")}\n]}`,
        `activeHref=${JSON.stringify(DEMO_ACTIVE_HREF)}`,
      ];
      if (values.showCta ?? true) {
        props.push(
          `cta={{ label: ${JSON.stringify(DEMO_CTA.label)}, href: ${JSON.stringify(DEMO_CTA.href)} }}`,
        );
      }
      return props;
    },
    extraTodos: () => [
      "items の label / href をプロジェクトのルートに合わせて差し替えてください",
      'activeHref は固定値ではなく現在のパスを渡してください（例: "use client" の親で usePathname() の値）',
      "クライアント遷移にするなら onNavigate={(item, e) => { e.preventDefault(); router.push(item.href); }} を渡してください（関数なので親を \"use client\" に）",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px landing-page stage fills it exactly.
    scale: 0.4,
  },
});
