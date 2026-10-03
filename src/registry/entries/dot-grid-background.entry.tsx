import { defineEntry } from "../schema";
import { DotGridBackgroundPreview } from "./dot-grid-background.demo";
import { setup, spec } from "./dot-grid-background.prompt";

const schema = {
  headline: {
    type: "string",
    label: "見出し（デモ）",
    group: "内容",
    default: "ポインタに、反応する背景。",
    description: "プレビュー用。実際のヒーローの中身は children に渡します。",
  },
  dotSize: {
    type: "number",
    label: "ドットの大きさ",
    group: "外観",
    default: 2,
    min: 1,
    max: 6,
    step: 0.1,
    unit: "px",
    description: "静止時のドットの直径。ポインター付近では最大 2.5 倍に。",
  },
  gap: {
    type: "number",
    label: "間隔",
    group: "外観",
    default: 22,
    min: 12,
    max: 48,
    step: 1,
    unit: "px",
  },
  color: {
    type: "color",
    label: "ドットの色",
    group: "外観",
    default: "#a1a1b5",
    description: "低い不透明度で描くので、明るめのグレーでも控えめに見えます。",
  },
  accentColor: {
    type: "color",
    label: "アクセント色",
    group: "外観",
    default: "#a78bfa",
    description: "ポインター付近・波紋・ウェーブの山でドットがこの色に近づきます。",
  },
  fade: {
    type: "boolean",
    label: "周辺をフェード",
    group: "外観",
    default: true,
    description: "端に向かってドットを薄くし、ページの背景に溶け込ませます。",
  },
  radius: {
    type: "number",
    label: "影響範囲",
    group: "挙動",
    default: 160,
    min: 40,
    max: 400,
    step: 5,
    unit: "px",
  },
  push: {
    type: "number",
    label: "押しのける強さ",
    group: "挙動",
    default: 12,
    min: 0,
    max: 40,
    step: 1,
    unit: "px",
    description: "ポインター直下のドットが外側へずれる最大距離。0 で押しのけない。",
  },
  ripple: {
    type: "boolean",
    label: "クリックで波紋",
    group: "挙動",
    default: true,
  },
  wave: {
    type: "boolean",
    label: "アイドルウェーブ",
    group: "モーション",
    default: true,
    description: "明るさの帯がゆっくり流れ、ポインターが無くても動きが出ます。",
  },
  waveSpeed: {
    type: "number",
    label: "ウェーブ速度",
    group: "モーション",
    default: 1,
    min: 0,
    max: 3,
    step: 0.1,
    unit: "×",
    description: "視差効果を減らす設定では、ウェーブ・波紋・追従は止まり静止表示になります。",
  },
} as const;

export const dotGridBackgroundEntry = defineEntry({
  slug: "dot-grid-background",
  name: "DotGridBackground",
  description:
    "ポインターに反応するドットマトリクス背景 — 近くのドットがふくらみ、アクセント色に光り、ばねで押しのけられる。流れるウェーブとクリックの波紋付き。Canvas 2D で描画し、画面外や静止中は停止。",
  category: "background",
  tech: ["canvas"],
  host: "dom",
  schema,
  component: DotGridBackgroundPreview,
  codegen: {
    componentName: "DotGridBackground",
    importPath: "@/components/dot-grid-background",
    dependencies: [],
    skipProps: ["headline"],
    // The snippet generator always emits a self-closing tag, so the
    // children slot is described here instead.
    extraTodos: () => [
      "ヒーローの中身（見出し・ボタンなど）を children として渡してください: <DotGridBackground …>…</DotGridBackground>。親要素に高さ（例: min-height: 100svh）を与えると、その全面を埋めます",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The demo is a 560px-tall hero; at 0.4 it fills the 224px card.
    scale: 0.4,
  },
});
