import { defineEntry } from "../schema";
import { TextScramblePreview } from "./text-scramble.demo";
import { setup, spec } from "./text-scramble.prompt";

const schema = {
  phrase1: {
    type: "string",
    label: "フレーズ 1",
    group: "内容",
    default: "Design faster.",
    description: "ループ以外のトリガーでは、このフレーズだけを表示します。",
  },
  phrase2: {
    type: "string",
    label: "フレーズ 2",
    group: "内容",
    default: "Ship sooner.",
    description: "空欄でスキップ。",
  },
  phrase3: {
    type: "string",
    label: "フレーズ 3",
    group: "内容",
    default: "デザインを、もっと速く。",
    description: "空欄でスキップ。日本語もそのまま使えます。",
  },
  trigger: {
    type: "select",
    label: "トリガー",
    group: "挙動",
    options: ["loop", "mount", "hover"],
    optionLabels: {
      loop: "ループ（フレーズを順に切り替え）",
      mount: "表示時に 1 回",
      hover: "ホバー / フォーカス",
    },
    default: "loop",
  },
  duration: {
    type: "number",
    label: "デコード時間",
    group: "モーション",
    default: 1400,
    min: 300,
    max: 4000,
    step: 50,
    unit: "ms",
    description: "最初の文字が崩れてから、最後の文字が確定するまで。",
  },
  glyphs: {
    type: "select",
    label: "グリフ",
    group: "外観",
    options: ["auto", "latin", "katakana", "symbols"],
    optionLabels: {
      auto: "自動（全角はカタカナ・半角は英数）",
      latin: "英数字",
      katakana: "カタカナ",
      symbols: "記号",
    },
    default: "auto",
    description: "崩れている間に表示する文字。コードでは任意の文字列も渡せます。",
  },
  accentColor: {
    type: "color",
    label: "アクセント色",
    group: "外観",
    default: "#9aa8ff",
    description: "未確定のグリフと、確定時の光に使われます。",
  },
  monospace: {
    type: "boolean",
    label: "等幅フォント",
    group: "外観",
    default: false,
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
} as const;

/** The non-empty phrase knobs, in order. */
function phraseList(values: Record<string, unknown>): string[] {
  return [values.phrase1, values.phrase2, values.phrase3]
    .map((v) => String(v ?? ""))
    .filter(Boolean);
}

export const textScrambleEntry = defineEntry({
  slug: "text-scramble",
  name: "TextScramble",
  description:
    "文字がランダムなグリフを経て左から順に確定する「デコード」テキスト。表示時・ホバー・フレーズのループに対応し、日本語もガタつかずに組めます。",
  category: "text",
  tech: ["css"],
  host: "dom",
  schema,
  component: TextScramblePreview,
  codegen: {
    componentName: "TextScramble",
    importPath: "@/components/text-scramble",
    dependencies: [],
    skipProps: ["phrase1", "phrase2", "phrase3", "fontSize"],
    // The phrase knobs become `phrases` for a loop and `text` otherwise,
    // and the preview's headline is an h2.
    extraProps: (values) => {
      const phrases = phraseList(values);
      const content =
        values.trigger === "loop"
          ? `phrases={${JSON.stringify(phrases)}}`
          : `text={${JSON.stringify(phrases[0] ?? "")}}`;
      return [content, 'as="h2"'];
    },
    extraTodos: () => [
      "文字サイズ・太さ・色は親要素か className で指定してください（コンポーネントはフォントを継承します）",
    ],
  },
  prompt: { setup, spec },
  preview: {
    scale: 0.4,
  },
});
