import { defineEntry } from "../schema";
import { TextRevealPreview } from "./text-reveal.demo";
import { demoText } from "./text-reveal.demo-data";
import { setup, spec } from "./text-reveal.prompt";

const schema = {
  text: {
    type: "string",
    label: "テキスト",
    group: "内容",
    default: "動きで、伝わる。 / Motion that speaks.",
    description: "「 / 」で改行（コードでは \\n）。日本語は 1 文字ずつ、英語は 1 単語ずつ現れます。",
  },
  mode: {
    type: "select",
    label: "モード",
    group: "挙動",
    options: ["loop", "enter", "scroll"],
    optionLabels: {
      loop: "ループ（一定間隔で再生）",
      enter: "表示時に 1 回",
      scroll: "スクロール連動",
    },
    default: "loop",
    description: "スクロール連動では、要素がビューポートを通過する位置に合わせて 20% → 100% の不透明度で灯ります。",
  },
  variant: {
    type: "select",
    label: "モーション",
    group: "モーション",
    options: ["blur-up", "fade", "slide", "mask"],
    optionLabels: {
      "blur-up": "ブラー + 浮き上がり",
      fade: "フェード",
      slide: "スライドアップ",
      mask: "マスクからせり上がり",
    },
    default: "blur-up",
    description: "ループ / 表示時に 1 回 で使われます。",
  },
  stagger: {
    type: "number",
    label: "時間差",
    group: "モーション",
    default: 60,
    min: 0,
    max: 200,
    step: 5,
    unit: "ms",
    description: "隣り合う単語・文字が動き始めるまでの間隔。",
  },
  duration: {
    type: "number",
    label: "1 つあたりの時間",
    group: "モーション",
    default: 900,
    min: 200,
    max: 2000,
    step: 50,
    unit: "ms",
  },
  interval: {
    type: "number",
    label: "ループ間隔",
    group: "モーション",
    default: 4500,
    min: 2000,
    max: 10000,
    step: 250,
    unit: "ms",
    description: "ループ時、再生開始から次の再生開始まで。",
  },
  split: {
    type: "select",
    label: "分割",
    group: "外観",
    options: ["auto", "word", "char"],
    optionLabels: {
      auto: "自動（英語は単語・日本語は文字）",
      word: "単語（日本語は句読点まで）",
      char: "文字",
    },
    default: "auto",
  },
  gradient: {
    type: "boolean",
    label: "グラデーション",
    group: "外観",
    default: true,
    description: "テキスト全体に 1 本のグラデーションを流します（CSS 変数 --tr-gradient で変更可）。",
  },
  fontSize: {
    type: "number",
    label: "文字サイズ（デモ）",
    group: "外観",
    default: 68,
    min: 28,
    max: 120,
    step: 1,
    unit: "px",
    description: "プレビュー用。実際のサイズは親要素や className で指定します。",
  },
} as const;

export const textRevealEntry = defineEntry({
  slug: "text-reveal",
  name: "TextReveal",
  description:
    "見出しを単語（英語）・文字（日本語）に分けて、ブラー・フェード・スライド・マスクで時間差に浮かび上がらせるテキスト。表示時・ループ・スクロール連動（Apple 風の段落ハイライト）に対応。",
  category: "text",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: TextRevealPreview,
  codegen: {
    componentName: "TextReveal",
    importPath: "@/components/text-reveal",
    dependencies: ["framer-motion"],
    skipProps: ["text", "fontSize"],
    // " / " in the control becomes a real line break, and the preview's
    // headline is an h2.
    extraProps: (values) => [
      `text={${JSON.stringify(demoText(String(values.text ?? "")))}}`,
      'as="h2"',
    ],
    extraTodos: (values) => [
      "文字サイズ・太さ・色は親要素か className で指定してください（コンポーネントはフォントを継承します）",
      ...(values.mode === "scroll"
        ? [
            "ページ全体ではなく内側の要素でスクロールさせる場合は、その要素の ref を scrollContainerRef に渡してください",
          ]
        : []),
    ],
  },
  prompt: { setup, spec },
  preview: {
    scale: 0.4,
  },
});
