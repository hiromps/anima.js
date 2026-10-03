import { defineEntry } from "../schema";
import { GlassToastPreview } from "./glass-toast.demo";
import { setup, spec } from "./glass-toast.prompt";

const schema = {
  title: {
    type: "string",
    label: "タイトル",
    group: "内容",
    default: "保存しました",
  },
  description: {
    type: "string",
    label: "説明文",
    group: "内容",
    default: "変更内容はすべてのデバイスに同期されます。",
    description: "空欄で非表示。",
  },
  variant: {
    type: "select",
    label: "種類",
    group: "内容",
    options: ["success", "info", "warning", "error"],
    optionLabels: {
      success: "成功",
      info: "お知らせ",
      warning: "注意",
      error: "エラー",
    },
    default: "success",
    description: "アイコンとその光の色が変わります。エラーは即時に読み上げられます。",
  },
  actionLabel: {
    type: "string",
    label: "アクションボタン",
    group: "内容",
    default: "元に戻す",
    description: "空欄で非表示。押すと処理のあと通知が閉じます。",
  },
  glowColorA: {
    type: "color",
    label: "発光色 A（ピンク）",
    group: "外観",
    default: "#ffaac8",
    description: "通知の背後の光と外光に使われます。",
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
    description: "通知越しに見える背後のコンテンツのぼかし量。",
  },
  duration: {
    type: "number",
    label: "表示時間",
    group: "挙動",
    default: 4000,
    min: 0,
    max: 10000,
    step: 500,
    unit: "ms",
    description:
      "経過すると自動で閉じます。0 で閉じるまで表示。ホバー・押下・フォーカス中は一時停止。プレビューでは閉じた 1.5 秒後に再表示します。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 380,
    min: 100,
    max: 800,
    step: 10,
    description: "通知が降りてくる / 戻るスプリング。大きいほど速い。",
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

export const glassToastEntry = defineEntry({
  slug: "glass-toast",
  name: "GlassToast",
  description:
    "GlassBottomTabBar と同じトンマナの Dynamic Island 風トースト通知 — すりガラスのカプセルが上からスプリングで降り、時間経過・上スワイプ・× で閉じる。ホバー中は自動クローズを一時停止。",
  category: "feedback",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: GlassToastPreview,
  codegen: {
    componentName: "GlassToast",
    importPath: "@/components/glass-toast",
    dependencies: ["framer-motion", "lucide-react"],
    skipProps: ["actionLabel"],
    // open / setOpen come from the caller's useState (see the TODO).
    extraImports: () => ['import { useState } from "react";'],
    extraProps: (values) => {
      const label = String(values.actionLabel ?? "");
      return [
        "open={open}",
        "onOpenChange={setOpen}",
        ...(label ? [`action={{ label: ${JSON.stringify(label)} }}`] : []),
      ];
    },
    extraTodos: (values) => [
      '"use client" のコンポーネント内で const [open, setOpen] = useState(false); を用意し、通知したいタイミングで setOpen(true) してください',
      ...(values.actionLabel
        ? ["action に onClick を渡して処理（元に戻す など）をつないでください"]
        : []),
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px phone frame fills it exactly.
    scale: 0.4,
  },
});
