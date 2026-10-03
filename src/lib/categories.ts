import type { ComponentCategory } from "@/registry/schema";

/** Display labels and order for registry categories (sidebar, gallery tabs). */
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  navigation: "ナビゲーション",
  overlay: "オーバーレイ",
  feedback: "フィードバック",
  input: "入力",
  button: "ボタン",
  card: "カード",
  text: "テキスト",
  background: "背景",
  layout: "レイアウト",
  carousel: "カルーセル",
  "3d-scene": "3D シーン",
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as ComponentCategory[];
