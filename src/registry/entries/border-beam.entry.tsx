import { defineEntry } from "../schema";
import { BorderBeamPreview } from "./border-beam.demo";
import { setup, spec } from "./border-beam.prompt";

const schema = {
  label: {
    type: "string",
    label: "ラベル（デモ）",
    group: "内容",
    default: "新機能を試す ✦",
    description: "プレビュー用。実際のラベルは children に渡します。",
  },
  variant: {
    type: "select",
    label: "バリアント",
    group: "外観",
    options: ["beam", "rainbow", "pulse"],
    optionLabels: {
      beam: "ビーム（尾を引く光）",
      rainbow: "レインボー（全周スペクトル）",
      pulse: "パルス（グローが呼吸）",
    },
    default: "beam",
  },
  colorFrom: {
    type: "color",
    label: "開始色（尾）",
    group: "外観",
    default: "#8b5cf6",
    description: "レインボーでは使われません。",
  },
  colorTo: {
    type: "color",
    label: "終了色（先端）",
    group: "外観",
    default: "#22d3ee",
    description: "先端はこの色を白に寄せて光らせます。フォーカスリングの色にも使われます。",
  },
  borderWidth: {
    type: "number",
    label: "ボーダー幅",
    group: "外観",
    default: 1.5,
    min: 1,
    max: 4,
    step: 0.5,
    unit: "px",
  },
  radius: {
    type: "number",
    label: "角の丸み",
    group: "外観",
    default: 999,
    min: 0,
    max: 999,
    step: 1,
    unit: "px",
    description: "999 でピル型（高さの半分以上でピルになります）。",
  },
  glow: {
    type: "boolean",
    label: "グロー",
    group: "外観",
    default: true,
    description: "ビームをぼかしたコピーを背後に敷いて発光させます。",
  },
  glowIntensity: {
    type: "number",
    label: "グローの強さ",
    group: "外観",
    default: 0.6,
    min: 0,
    max: 1,
    step: 0.05,
  },
  shimmer: {
    type: "boolean",
    label: "シマー",
    group: "外観",
    default: false,
    description: "内側の面を斜めの光が一定間隔で横切ります。",
  },
  duration: {
    type: "number",
    label: "1 周の時間",
    group: "モーション",
    default: 4,
    min: 1,
    max: 12,
    step: 0.5,
    unit: "s",
  },
} as const;

export const borderBeamEntry = defineEntry({
  slug: "border-beam",
  name: "BorderBeam",
  description:
    "ボーダーを光のビームが一周する、流行りのフレーム。ボタン・リンク・告知チップ・カードや入力欄を包むラッパーで、ビーム / レインボー / パルスの 3 種とグロー・シマーを備えた純 CSS 実装。",
  category: "button",
  tech: ["css"],
  host: "dom",
  schema,
  component: BorderBeamPreview,
  codegen: {
    componentName: "BorderBeam",
    importPath: "@/components/border-beam",
    dependencies: [],
    skipProps: ["label"],
    extraTodos: (values) => {
      const label = String(values.label ?? "");
      return [
        label
          ? `<BorderBeam …>${label}</BorderBeam> のようにラベルを children として渡し、onClick で処理をつないでください`
          : "ラベルやアイコンを children として渡し、onClick で処理をつないでください",
        'リンクにするなら as="a" href="…"、カードや入力欄の枠にするなら as="div" を指定してください',
      ];
    },
  },
  prompt: { setup, spec },
  preview: {
    // The 560px hero stage fills the 224px card at 0.4.
    scale: 0.4,
  },
});
