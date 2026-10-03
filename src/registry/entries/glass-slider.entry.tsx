import { defineEntry } from "../schema";
import { GlassSliderPreview } from "./glass-slider.demo";
import { setup, spec } from "./glass-slider.prompt";

const schema = {
  min: {
    type: "number",
    label: "最小値",
    group: "内容",
    default: 0,
    min: 0,
    max: 50,
    step: 1,
  },
  max: {
    type: "number",
    label: "最大値",
    group: "内容",
    default: 100,
    min: 10,
    max: 200,
    step: 1,
  },
  step: {
    type: "number",
    label: "刻み",
    group: "内容",
    default: 1,
    min: 1,
    max: 25,
    step: 1,
    description: "ドラッグとキー操作でこの単位に丸められます。",
  },
  defaultValue: {
    type: "number",
    label: "初期値（デモ）",
    group: "内容",
    default: 60,
    min: 0,
    max: 200,
    step: 1,
    description: "プレビューの音量スライダーの初期値。生成コードでは useState の初期値になります。",
  },
  thumb: {
    type: "select",
    label: "つまみ",
    group: "外観",
    options: ["lens", "none"],
    optionLabels: { lens: "レンズ", none: "なし（コントロールセンター風）" },
    default: "lens",
    description: "なしの場合は塗りの端そのものがつまみになります。",
  },
  showValue: {
    type: "boolean",
    label: "値を表示",
    group: "外観",
    default: false,
  },
  showIcons: {
    type: "boolean",
    label: "アイコンを表示（デモ）",
    group: "外観",
    default: true,
    description: "音量スライダーの Volume1 / Volume2。生成コードでは iconStart / iconEnd になります。",
  },
  glowColorA: {
    type: "color",
    label: "発光色 A（ピンク）",
    group: "外観",
    default: "#ffaac8",
    description: "塗りの始点と、トラック背後の光に使われます。",
  },
  glowColorB: {
    type: "color",
    label: "発光色 B（ラベンダー）",
    group: "外観",
    default: "#beafff",
    description: "塗りの終点と、トラック背後の光に使われます。",
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
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 380,
    min: 100,
    max: 800,
    step: 10,
    description: "クリック / キー操作で塗りが動くスプリングと、押下時のつぶれ。",
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

export const glassSliderEntry = defineEntry({
  slug: "glass-slider",
  name: "GlassSlider",
  description:
    "iOS コントロールセンター風のガラススライダー — 太いすりガラスのカプセルにピンク → ラベンダーに光る塗り、レンズのつまみ、トラック内アイコン。どこからでもドラッグでき、押下中はふにっとつぶれる。キーボード操作対応。",
  category: "input",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: GlassSliderPreview,
  codegen: {
    componentName: "GlassSlider",
    importPath: "@/components/glass-slider",
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["defaultValue", "showIcons"],
    // value / setValue come from the caller's useState (see the TODO).
    extraImports: (values) => [
      'import { useState } from "react";',
      ...(values.showIcons ? ['import { Volume1, Volume2 } from "lucide-react";'] : []),
    ],
    extraProps: (values) => [
      "value={value}",
      "onValueChange={setValue}",
      ...(values.showIcons ? ["iconStart={Volume1}", "iconEnd={Volume2}"] : []),
      'aria-label="音量"',
    ],
    extraTodos: (values) => [
      `"use client" のコンポーネント内で const [value, setValue] = useState(${Number(values.defaultValue ?? 60)}); を用意してください`,
      "保存や API 送信は onValueCommit（ドラッグを離した時・キー操作時に 1 回）につなぐと、ドラッグ中に連打されません。aria-label は用途に合わせて変えてください",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px phone frame fills it exactly.
    scale: 0.4,
  },
});
