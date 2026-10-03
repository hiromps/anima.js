import { defineEntry } from "../schema";
import { SpotlightCardPreview } from "./spotlight-card.demo";
import { DEMO_FEATURES } from "./spotlight-card.demo-data";
import { setup, spec } from "./spotlight-card.prompt";

const schema = {
  spotlightColor: {
    type: "color",
    label: "スポットライト色",
    group: "外観",
    default: "#c4b5fd",
    description: "枠線にはこの色がそのまま、面には薄く広がって乗ります。",
  },
  borderColor: {
    type: "color",
    label: "枠線の色",
    group: "外観",
    default: "#26262b",
    description: "光が当たっていない部分の 1px の枠線。",
  },
  spotlightSize: {
    type: "number",
    label: "光の大きさ",
    group: "外観",
    default: 420,
    min: 160,
    max: 900,
    step: 10,
    unit: "px",
    description: "面に広がる光の直径。枠線の光はその約 60%。",
  },
  intensity: {
    type: "number",
    label: "光の強さ",
    group: "外観",
    default: 1,
    min: 0,
    max: 1,
    step: 0.05,
    description: "ポインター直下での強さ。待機中はこの約 45% で左上に灯ります。",
  },
  radius: {
    type: "number",
    label: "角の丸み",
    group: "外観",
    default: 18,
    min: 0,
    max: 40,
    step: 1,
    unit: "px",
  },
  grouped: {
    type: "boolean",
    label: "グリッド全体で追従",
    group: "挙動",
    default: true,
    description:
      "プレビュー用。オンで SpotlightGrid に包み、ポインターが近づいた隣のカードの枠線も光ります。",
  },
} as const;

const placeholder = DEMO_FEATURES[0];

export const spotlightCardEntry = defineEntry({
  slug: "spotlight-card",
  name: "SpotlightCard",
  description:
    "Linear / Vercel 風のスポットライトカード — ポインターを追う放射状の光が 1px の枠線と面を照らします。SpotlightGrid で包むと、近づいた隣のカードの枠線まで光ります。純粋な CSS + rAF。",
  category: "card",
  tech: ["css"],
  host: "dom",
  schema,
  component: SpotlightCardPreview,
  codegen: {
    componentName: "SpotlightCard",
    importPath: "@/components/spotlight-card",
    dependencies: [],
    skipProps: ["grouped"],
    // The snippet is a single card; its children mirror the first card in
    // the preview so the copied code renders something meaningful.
    extraProps: () => [
      `children={\n  <>\n    <h3>${placeholder.title}</h3>\n    <p>${placeholder.description}</p>\n  </>\n}`,
    ],
    extraTodos: (values) => [
      "children は仮の中身です。JSX の子要素としてカードの中身（アイコン・見出し・説明など）に差し替えてください",
      ...(values.grouped
        ? [
            'カードを並べる場合は import { SpotlightGrid } from "@/components/spotlight-card"; で囲むと、ポインターが近づいた隣のカードの枠線も光ります（プレビューはこの状態）',
          ]
        : []),
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px stage fills it exactly.
    scale: 0.4,
  },
});
