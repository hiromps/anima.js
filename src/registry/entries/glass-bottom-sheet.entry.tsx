import { defineEntry } from "../schema";
import { GlassBottomSheetPreview } from "./glass-bottom-sheet.demo";
import { setup, spec } from "./glass-bottom-sheet.prompt";

const schema = {
  title: {
    type: "string",
    label: "タイトル",
    group: "内容",
    default: "カートに追加しました",
  },
  description: {
    type: "string",
    label: "説明文",
    group: "内容",
    default: "このままお会計に進むか、買い物を続けられます。",
    description: "空欄で非表示。",
  },
  bodyText: {
    type: "string",
    label: "本文（デモ）",
    group: "内容",
    default: "",
    description: "プレビュー用。実際の本文は children に渡します。",
  },
  primaryLabel: {
    type: "string",
    label: "メインボタン",
    group: "内容",
    default: "お会計に進む",
    description: "空欄で非表示。タブバーの CTA と同じ赤のピル。",
  },
  secondaryLabel: {
    type: "string",
    label: "サブボタン",
    group: "内容",
    default: "買い物を続ける",
    description: "空欄で非表示。ガラスのピル。",
  },
  showHandle: {
    type: "boolean",
    label: "グラバーを表示",
    group: "外観",
    default: true,
  },
  showCloseButton: {
    type: "boolean",
    label: "× ボタンを表示",
    group: "外観",
    default: true,
  },
  glowColorA: {
    type: "color",
    label: "発光色 A（ピンク）",
    group: "外観",
    default: "#ffaac8",
    description: "シート背後の光と外光に使われます。",
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
    description: "シート越しに見える背後のコンテンツのぼかし量。",
  },
  dismissible: {
    type: "boolean",
    label: "スワイプ / 背景タップで閉じる",
    group: "挙動",
    default: true,
    description: "オフにすると × ボタンとアクションでのみ閉じます（Escape も無効）。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 380,
    min: 100,
    max: 800,
    step: 10,
    description: "シートがせり上がる / 戻るスプリング。大きいほど速い。",
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

/** Emits an action prop literal, or nothing when the label is blank. */
function actionProp(name: string, label: unknown): string[] {
  const text = String(label ?? "");
  return text ? [`${name}={{ label: ${JSON.stringify(text)} }}`] : [];
}

export const glassBottomSheetEntry = defineEntry({
  slug: "glass-bottom-sheet",
  name: "GlassBottomSheet",
  description:
    "GlassBottomTabBar と同じトンマナのモバイル用ボトムシートモーダル — すりガラスとパステルの発光、スプリングでせり上がり、下スワイプ・背景タップ・Escape で閉じる。フォーカストラップ付き。",
  category: "overlay",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: GlassBottomSheetPreview,
  codegen: {
    componentName: "GlassBottomSheet",
    importPath: "@/components/glass-bottom-sheet",
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["bodyText", "primaryLabel", "secondaryLabel"],
    extraProps: (values) => [
      "open={open}",
      "onOpenChange={setOpen}",
      ...actionProp("primaryAction", values.primaryLabel),
      ...actionProp("secondaryAction", values.secondaryLabel),
    ],
    extraTodos: () => [
      'const [open, setOpen] = useState(false); を用意し、開くボタンの onClick で setOpen(true) してください（"use client" のコンポーネント内で使うこと）',
      "primaryAction / secondaryAction に onClick を渡して処理をつなぎ、本文があれば children として渡してください",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px phone frame fills it exactly.
    scale: 0.4,
  },
});
