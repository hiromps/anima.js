import { defineEntry } from "../schema";
import { MagneticButtonPreview } from "./magnetic-button.demo";
import { setup, spec } from "./magnetic-button.prompt";

const schema = {
  label: {
    type: "string",
    label: "ラベル",
    group: "内容",
    default: "はじめる",
    description: "ボタンの文言（children として出力されます）。",
  },
  showArrow: {
    type: "boolean",
    label: "矢印を表示",
    group: "内容",
    default: true,
    description: "末尾の → 。ホバーで右へ少し動きます。",
  },
  variant: {
    type: "select",
    label: "バリアント",
    group: "外観",
    options: ["solid", "outline", "ghost"],
    optionLabels: {
      solid: "ソリッド",
      outline: "アウトライン",
      ghost: "ゴースト",
    },
    default: "solid",
  },
  size: {
    type: "select",
    label: "サイズ",
    group: "外観",
    options: ["sm", "md", "lg"],
    optionLabels: { sm: "S", md: "M", lg: "L" },
    default: "lg",
  },
  color: {
    type: "color",
    label: "ベース色",
    group: "外観",
    default: "#f5f5f7",
    description: "ソリッドの背景色。アウトライン / ゴーストでは枠と文字の色。",
  },
  textColor: {
    type: "color",
    label: "文字色",
    group: "外観",
    default: "#0a0a0a",
    description: "ソリッドの文字色。",
  },
  fillColor: {
    type: "color",
    label: "ホバーの塗り",
    group: "外観",
    default: "#7c5cff",
    description: "ポインターが入った点から広がる色。ソリッドの発光にも使われます。",
  },
  fillTextColor: {
    type: "color",
    label: "ホバー時の文字色",
    group: "外観",
    default: "#ffffff",
  },
  strength: {
    type: "number",
    label: "吸着の強さ",
    group: "挙動",
    default: 0.45,
    min: 0,
    max: 1,
    step: 0.05,
    description: "0 で吸着なし。大きいほどポインターに付いていきます。",
  },
  radius: {
    type: "number",
    label: "吸着の範囲",
    group: "挙動",
    default: 90,
    min: 0,
    max: 240,
    step: 5,
    unit: "px",
    description: "ボタンの縁からこの距離に入ると引き寄せが始まります。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 220,
    min: 50,
    max: 600,
    step: 10,
    description: "大きいほどポインターに素早く追従します。",
  },
  springDamping: {
    type: "number",
    label: "減衰",
    group: "モーション",
    default: 18,
    min: 5,
    max: 50,
    step: 1,
    description: "小さいほど行き過ぎて揺れ戻ります。",
  },
} as const;

/** Emits a string prop the way lib/codegen does, or nothing when blank. */
function textProp(name: string, value: unknown): string[] {
  const text = String(value ?? "");
  if (!text) return [];
  return [/["\\]/.test(text) ? `${name}={${JSON.stringify(text)}}` : `${name}="${text}"`];
}

export const magneticButtonEntry = defineEntry({
  slug: "magnetic-button",
  name: "MagneticButton",
  description:
    "アワードサイト風のマグネティック CTA — ポインターが近づくとスプリングで引き寄せられ、ラベルは枠より大きく動く視差つき。ホバーで入った点から色が円形に広がり文字色が反転する。",
  category: "button",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: MagneticButtonPreview,
  codegen: {
    componentName: "MagneticButton",
    importPath: "@/components/magnetic-button",
    dependencies: ["framer-motion", "lucide-react"],
    // The label becomes children (the snippet is self-closing, so it is
    // emitted as a children prop).
    skipProps: ["label"],
    extraProps: (values) => textProp("children", values.label || "はじめる"),
    extraTodos: () => [
      "onClick で処理をつなぐか、href を渡してリンクにしてください（href があると <a> で描画されます）",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The stage is 560px tall; at 0.4 it fills the 224px card.
    scale: 0.4,
  },
});
