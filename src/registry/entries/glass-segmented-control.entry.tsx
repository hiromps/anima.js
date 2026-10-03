import { defineEntry } from "../schema";
import { GlassSegmentedControlPreview } from "./glass-segmented-control.demo";
import { demoSegments } from "./glass-segmented-control.demo-data";
import { setup, spec } from "./glass-segmented-control.prompt";

const schema = {
  segmentCount: {
    type: "select",
    label: "セグメント数",
    group: "内容",
    options: ["2", "3", "4", "5"],
    default: "3",
    description: "生成コードの options に、この数のセグメントが出力されます。",
  },
  showIcons: {
    type: "boolean",
    label: "アイコンを表示",
    group: "内容",
    default: true,
    description: "オンにすると options の各項目に lucide-react のアイコンが付きます。",
  },
  size: {
    type: "select",
    label: "サイズ",
    group: "外観",
    options: ["sm", "md", "lg"],
    optionLabels: { sm: "小（36px）", md: "中（44px）", lg: "大（52px）" },
    default: "md",
  },
  fullWidth: {
    type: "boolean",
    label: "横幅いっぱい",
    group: "外観",
    default: true,
    description: "オフにすると中身の幅に縮みます。",
  },
  glowColorA: {
    type: "color",
    label: "発光色 A（ピンク）",
    group: "外観",
    default: "#ffaac8",
    description: "トラック背後の光、外光、選択中ラベルの発光に使われます。",
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
    description: "トラック越しに見える背後のコンテンツのぼかし量。",
  },
  disabled: {
    type: "boolean",
    label: "無効化",
    group: "挙動",
    default: false,
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 380,
    min: 100,
    max: 800,
    step: 10,
    description: "選択ピルがセグメント間を移動するスプリング。大きいほど速い。",
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

export const glassSegmentedControlEntry = defineEntry({
  slug: "glass-segmented-control",
  name: "GlassSegmentedControl",
  description:
    "GlassBottomTabBar と同じトンマナのセグメントコントロール — すりガラスのカプセルに、スプリングで移動するレンズのピル。radiogroup として矢印キーで選択でき、アイコンも付けられます。",
  category: "input",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: GlassSegmentedControlPreview,
  codegen: {
    componentName: "GlassSegmentedControl",
    importPath: "@/components/glass-segmented-control",
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["segmentCount", "showIcons"],
    // value / setValue come from the caller's useState (see the TODO); the
    // icon identifiers the emitted options use are imported alongside.
    extraImports: (values) => {
      const lines = ['import { useState } from "react";'];
      if (values.showIcons) {
        const icons = demoSegments(values.segmentCount).map(({ iconName }) => iconName);
        lines.push(`import { ${icons.join(", ")} } from "lucide-react";`);
      }
      return lines;
    },
    extraProps: (values) => {
      const lines = demoSegments(values.segmentCount).map(({ option, iconName }) => {
        const icon = values.showIcons ? `, icon: ${iconName}` : "";
        return `  { value: ${JSON.stringify(option.value)}, label: ${JSON.stringify(option.label)}${icon} },`;
      });
      return [
        `options={[\n${lines.join("\n")}\n]}`,
        "value={value}",
        "onValueChange={setValue}",
        'aria-label="注文の状態"',
      ];
    },
    extraTodos: (values) => {
      const first = demoSegments(values.segmentCount)[0].option.value;
      return [
        `"use client" のコンポーネント内で const [value, setValue] = useState(${JSON.stringify(first)}); を用意してください（状態を持たないなら value / onValueChange を外して defaultValue を渡します）`,
        "options の value / label / icon と aria-label を用途に合わせて差し替えてください（アイコンは lucide-react から選べます）",
      ];
    },
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px phone frame fills it exactly.
    scale: 0.4,
  },
});
