import { defineEntry } from "../schema";
import { ShinyTextPreview } from "./shiny-text.demo";
import { setup, spec } from "./shiny-text.prompt";

const schema = {
  text: {
    type: "string",
    label: "テキスト",
    group: "内容",
    default: "光るテキストを、CSS だけで。",
  },
  variant: {
    type: "select",
    label: "バリエーション",
    group: "外観",
    options: ["aurora", "gradient", "shimmer", "metallic"],
    optionLabels: {
      aurora: "オーロラ（柔らかく漂う + 発光）",
      gradient: "グラデーション（色が流れる）",
      shimmer: "シマー（光の帯が走る）",
      metallic: "メタリック（クロム + 反射）",
    },
    default: "aurora",
  },
  color1: {
    type: "color",
    label: "色 1",
    group: "外観",
    default: "#a78bfa",
    description: "メタリックでは暗部の色味、シマーでは光の帯の縁に使われます。",
  },
  color2: {
    type: "color",
    label: "色 2",
    group: "外観",
    default: "#f472b6",
  },
  color3: {
    type: "color",
    label: "色 3",
    group: "外観",
    default: "#60a5fa",
  },
  baseColor: {
    type: "color",
    label: "ベース色（シマー）",
    group: "外観",
    default: "#8e8a9f",
    description: "シマーで光の帯以外の部分の文字色。暗い背景でも読める明るさに。",
  },
  glow: {
    type: "boolean",
    label: "発光",
    group: "外観",
    default: true,
    description: "ぼかした同じ文字を背後に重ねます。オーロラ以外は既定でオフ。",
  },
  fontSize: {
    type: "number",
    label: "文字サイズ（デモ）",
    group: "外観",
    default: 64,
    min: 28,
    max: 120,
    step: 1,
    unit: "px",
    description: "プレビュー用。実際のサイズは親要素や className で指定します。",
  },
  speed: {
    type: "number",
    label: "1 周期の長さ",
    group: "モーション",
    default: 8,
    min: 1,
    max: 20,
    step: 0.5,
    unit: "s",
    description: "未指定時の既定: シマー 3 / グラデーション 6 / オーロラ 8 / メタリック 4 秒。",
  },
  angle: {
    type: "number",
    label: "角度",
    group: "モーション",
    default: 110,
    min: 0,
    max: 360,
    step: 1,
    unit: "deg",
    description: "グラデーションと光の帯の向き。",
  },
} as const;

export const shinyTextEntry = defineEntry({
  slug: "shiny-text",
  name: "ShinyText",
  description:
    "光の帯が走るシマー、色が流れるグラデーション、発光するオーロラ、クロムのメタリック。background-clip: text だけで動く、流行りのグラデーションテキスト。",
  category: "text",
  tech: ["css"],
  host: "dom",
  schema,
  component: ShinyTextPreview,
  codegen: {
    componentName: "ShinyText",
    importPath: "@/components/shiny-text",
    dependencies: [],
    skipProps: ["color1", "color2", "color3", "fontSize"],
    // The color knobs become `colors`, and the preview's headline is an h2.
    extraProps: (values) => [
      `colors={${JSON.stringify([values.color1, values.color2, values.color3])}}`,
      'as="h2"',
    ],
    extraTodos: () => [
      "文字サイズ・太さ・字間は親要素か className で指定してください（コンポーネントはフォントを継承します）",
    ],
  },
  prompt: { setup, spec },
  preview: {
    scale: 0.4,
  },
});
