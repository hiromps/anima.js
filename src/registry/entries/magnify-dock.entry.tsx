import { defineEntry } from "../schema";
import { MagnifyDockPreview } from "./magnify-dock.demo";
import { demoEntries } from "./magnify-dock.demo-data";
import { setup, spec } from "./magnify-dock.prompt";

const schema = {
  itemCount: {
    type: "select",
    label: "アイテム数",
    group: "内容",
    options: ["5", "6", "7", "8"],
    default: "7",
    description:
      "ゴミ箱を含むタイル数。生成コードの items に、この数のアイテム（区切り線 + ゴミ箱を末尾に固定）が出力されます。",
  },
  baseSize: {
    type: "number",
    label: "基本サイズ",
    group: "外観",
    default: 52,
    min: 32,
    max: 72,
    step: 1,
    unit: "px",
    description: "ポインタが離れているときのタイルの大きさ。",
  },
  magnification: {
    type: "number",
    label: "最大サイズ",
    group: "外観",
    default: 84,
    min: 40,
    max: 128,
    step: 1,
    unit: "px",
    description: "ポインタ直下のタイルの大きさ。基本サイズ以下なら拡大しません。",
  },
  gap: {
    type: "number",
    label: "間隔",
    group: "外観",
    default: 10,
    min: 0,
    max: 24,
    step: 1,
    unit: "px",
  },
  tileStyle: {
    type: "select",
    label: "タイルのスタイル",
    group: "外観",
    options: ["glass-dark", "colorful"],
    optionLabels: {
      "glass-dark": "スモークガラス",
      colorful: "カラフル（アプリアイコン風）",
    },
    default: "glass-dark",
  },
  showLabels: {
    type: "select",
    label: "ラベル",
    group: "外観",
    options: ["hover", "always", "never"],
    optionLabels: {
      hover: "ホバー / フォーカス時",
      always: "常に表示",
      never: "表示しない",
    },
    default: "hover",
  },
  showIndicators: {
    type: "boolean",
    label: "起動中インジケーター",
    group: "外観",
    default: true,
    description: "active のアイテムの下に小さなドットを表示します。",
  },
  distance: {
    type: "number",
    label: "影響範囲",
    group: "挙動",
    default: 150,
    min: 60,
    max: 320,
    step: 5,
    unit: "px",
    description: "ポインタからこの距離までのタイルが拡大します。大きいほど波が広がります。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 260,
    min: 50,
    max: 800,
    step: 10,
    description: "タイルが目標サイズへ追従するスプリング。大きいほど速い。",
  },
  springDamping: {
    type: "number",
    label: "減衰",
    group: "モーション",
    default: 20,
    min: 2,
    max: 60,
    step: 1,
    description: "小さいほど行き過ぎて揺れ戻ります。",
  },
  springMass: {
    type: "number",
    label: "質量",
    group: "モーション",
    default: 0.3,
    min: 0.05,
    max: 2,
    step: 0.05,
    description: "大きいほど重く、ゆったり追従します。",
  },
} as const;

export const magnifyDockEntry = defineEntry({
  slug: "magnify-dock",
  name: "MagnifyDock",
  description:
    "macOS 風の拡大ドック — ポインタに近いタイルほどスプリングで大きくなり、ラベルが上にポップ。キーボードフォーカスでも拡大し、タッチではタップ縮小に切り替わります。",
  category: "navigation",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: MagnifyDockPreview,
  codegen: {
    componentName: "MagnifyDock",
    importPath: "@/components/magnify-dock",
    // The component only type-imports LucideIcon, but the emitted items
    // literal imports its icons from lucide-react.
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["itemCount"],
    // The items on screen are emitted as a literal so the snippet
    // describes the preview; the icon identifiers are imported alongside.
    extraImports: (values) => {
      const icons = demoEntries(values.itemCount).flatMap((entry) =>
        "separator" in entry ? [] : [entry.iconName],
      );
      return [`import { ${icons.join(", ")} } from "lucide-react";`];
    },
    extraProps: (values) => {
      const lines = demoEntries(values.itemCount).map((entry) => {
        if ("separator" in entry) return `  { type: "separator", id: "sep" },`;
        const { item, iconName } = entry;
        const active = item.active ? ", active: true" : "";
        return `  { id: ${JSON.stringify(item.id)}, label: ${JSON.stringify(item.label)}, icon: ${iconName}${active} },`;
      });
      return [`items={[\n${lines.join("\n")}\n]}`];
    },
    extraTodos: () => [
      "items の各アイテムに href（リンク）か onClick（ボタン）を渡して遷移・処理をつなぎ、label / icon を差し替えてください（アイコンは lucide-react から選べます）",
      "active は「起動中 / 現在地」のドットと aria-current に使われます。現在のページやアプリの状態に合わせて付け替えてください",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px desktop stage fills it exactly.
    scale: 0.4,
  },
});
