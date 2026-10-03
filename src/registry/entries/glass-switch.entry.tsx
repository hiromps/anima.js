import { defineEntry } from "../schema";
import { GlassSwitchPreview } from "./glass-switch.demo";
import { setup, spec } from "./glass-switch.prompt";

const schema = {
  label: {
    type: "string",
    label: "ラベル",
    group: "内容",
    default: "通知",
    description: "空欄でスイッチ単体（行レイアウトなし）。プレビューは 1 行目に反映されます。",
  },
  description: {
    type: "string",
    label: "説明文",
    group: "内容",
    default: "新着メッセージをお知らせします",
    description: "空欄で非表示。ラベルがあるときだけ表示されます。",
  },
  size: {
    type: "select",
    label: "サイズ",
    group: "外観",
    options: ["md", "sm"],
    optionLabels: { md: "標準（51×31）", sm: "小（40×24）" },
    default: "md",
  },
  glowColorA: {
    type: "color",
    label: "発光色 A（ピンク）",
    group: "外観",
    default: "#ffaac8",
    description: "オン時の塗りの始点と、トラックの外光に使われます。",
  },
  glowColorB: {
    type: "color",
    label: "発光色 B（ラベンダー）",
    group: "外観",
    default: "#beafff",
    description: "オン時の塗りの終点。",
  },
  defaultChecked: {
    type: "boolean",
    label: "初期状態オン",
    group: "挙動",
    default: true,
    description: "プレビュー 1 行目の初期値。生成コードでは useState の初期値になります。",
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
    description: "つまみが左右に移動するスプリング。大きいほど速い。",
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

/** Emits a string prop the way lib/codegen does, or nothing when blank. */
function textProp(name: string, value: unknown): string[] {
  const text = String(value ?? "");
  if (!text) return [];
  return [/["\\]/.test(text) ? `${name}={${JSON.stringify(text)}}` : `${name}="${text}"`];
}

export const glassSwitchEntry = defineEntry({
  slug: "glass-switch",
  name: "GlassSwitch",
  description:
    "iOS サイズのガラストグル — すりガラスのトラックがオンでピンク→ラベンダーに発光し、白いガラスの玉がスプリングで移動、押している間は iOS のように伸びる。ラベル付きで設定行レイアウトにも。",
  category: "input",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: GlassSwitchPreview,
  codegen: {
    componentName: "GlassSwitch",
    importPath: "@/components/glass-switch",
    dependencies: ["framer-motion"],
    // defaultChecked becomes the useState initial value (see the TODO);
    // label / description are emitted only when filled in.
    skipProps: ["defaultChecked", "label", "description"],
    extraImports: () => ['import { useState } from "react";'],
    extraProps: (values) => [
      ...textProp("label", values.label),
      ...(values.label ? textProp("description", values.description) : []),
      "checked={checked}",
      "onCheckedChange={setChecked}",
    ],
    extraTodos: (values) => [
      `"use client" のコンポーネント内で const [checked, setChecked] = useState(${
        values.defaultChecked === false ? "false" : "true"
      }); を用意してください`,
      "フォーム送信に使う場合は name（と必要なら value）を渡すと、オンのときだけ hidden input で送信されます",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px phone frame fills it exactly.
    scale: 0.4,
  },
});
