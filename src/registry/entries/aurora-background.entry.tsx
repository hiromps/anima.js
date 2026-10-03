import { defineEntry } from "../schema";
import { AuroraBackgroundPreview } from "./aurora-background.demo";
import { setup, spec } from "./aurora-background.prompt";

const schema = {
  headline: {
    type: "string",
    label: "見出し（デモ）",
    group: "内容",
    default: "Build at the speed of thought",
    description: "プレビュー用。実際のヒーローの中身は children に渡します。",
  },
  color1: {
    type: "color",
    label: "色 1（左上）",
    group: "外観",
    default: "#6d4aff",
  },
  color2: {
    type: "color",
    label: "色 2（右）",
    group: "外観",
    default: "#1fb6ff",
  },
  color3: {
    type: "color",
    label: "色 3（下）",
    group: "外観",
    default: "#ff4d9d",
  },
  color4: {
    type: "color",
    label: "色 4（上中央）",
    group: "外観",
    default: "#2ee6a8",
    description: "生成コードでは 4 色が colors 配列にまとめて出力されます。",
  },
  blur: {
    type: "number",
    label: "ぼかし",
    group: "外観",
    default: 80,
    min: 0,
    max: 160,
    step: 1,
    unit: "px",
  },
  intensity: {
    type: "number",
    label: "強さ",
    group: "外観",
    default: 0.8,
    min: 0,
    max: 1,
    step: 0.05,
    description: "オーロラ層の不透明度。下げるほど背景色に沈みます。",
  },
  vignette: {
    type: "boolean",
    label: "周辺をフェード",
    group: "外観",
    default: true,
    description: "端と下側をマスクして、ページの背景に溶け込ませます。",
  },
  grain: {
    type: "boolean",
    label: "フィルムグレイン",
    group: "質感",
    default: true,
    description: "グラデーションの縞（バンディング）を消すノイズ。",
  },
  grainOpacity: {
    type: "number",
    label: "グレインの濃さ",
    group: "質感",
    default: 0.12,
    min: 0,
    max: 0.4,
    step: 0.01,
  },
  speed: {
    type: "number",
    label: "速度",
    group: "モーション",
    default: 1,
    min: 0,
    max: 3,
    step: 0.1,
    unit: "×",
    description: "0 で静止。視差効果を減らす設定では常に静止します。",
  },
} as const;

const COLOR_KEYS = ["color1", "color2", "color3", "color4"] as const;

export const auroraBackgroundEntry = defineEntry({
  slug: "aurora-background",
  name: "AuroraBackground",
  description:
    "ゆっくり漂うオーロラ / メッシュグラデーションの背景 — ぼかした光のブロブをスクリーン合成、フィルムグレインと周辺フェード付き。ヒーローセクションの中身を上に重ねられる純粋な CSS。",
  category: "background",
  tech: ["css"],
  host: "dom",
  schema,
  component: AuroraBackgroundPreview,
  codegen: {
    componentName: "AuroraBackground",
    importPath: "@/components/aurora-background",
    dependencies: [],
    skipProps: ["headline", ...COLOR_KEYS],
    extraProps: (values) => [
      `colors={${JSON.stringify(
        COLOR_KEYS.map((key) => String(values[key] ?? schema[key].default)),
      ).replace(/,/g, ", ")}}`,
    ],
    // The snippet generator always emits a self-closing tag, so the
    // children slot is described here instead.
    extraTodos: () => [
      "ヒーローの中身（見出し・ボタンなど）を children として渡してください: <AuroraBackground …>…</AuroraBackground>。親要素に高さ（例: min-height: 100svh）を与えると、その全面を埋めます",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The demo is a 560px-tall hero; at 0.4 it fills the 224px card.
    scale: 0.4,
  },
});
