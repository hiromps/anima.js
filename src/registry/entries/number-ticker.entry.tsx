import { defineEntry } from "../schema";
import { NumberTickerPreview } from "./number-ticker.demo";
import { setup, spec } from "./number-ticker.prompt";

const schema = {
  value: {
    type: "number",
    label: "値",
    group: "内容",
    default: 12480000,
    min: 0,
    max: 100000000,
    step: 10000,
    description: "変更すると、表示中の数値から新しい値へアニメーションし直します。",
  },
  from: {
    type: "number",
    label: "開始値",
    group: "内容",
    default: 0,
    min: 0,
    max: 100000000,
    step: 10000,
    description: "最初のアニメーションの出発点。",
  },
  prefix: {
    type: "string",
    label: "前に付ける文字",
    group: "内容",
    default: "¥",
    description: "例: ¥ / $。アニメーションせず固定表示されます。",
  },
  suffix: {
    type: "string",
    label: "後ろに付ける文字",
    group: "内容",
    default: "",
    description: "例: % / + / 件。",
  },
  decimals: {
    type: "number",
    label: "小数桁数",
    group: "内容",
    default: 0,
    min: 0,
    max: 3,
    step: 1,
    description: "常にこの桁数で表示するので、途中で幅が揺れません。",
  },
  compact: {
    type: "boolean",
    label: "短縮表記",
    group: "内容",
    default: false,
    description: "24000 → 2.4万 のように単位付きで短く表示します（ロケール準拠）。",
  },
  variant: {
    type: "select",
    label: "スタイル",
    group: "外観",
    options: ["odometer", "count"],
    optionLabels: {
      odometer: "オドメーター（桁ごとに回転）",
      count: "カウントアップ",
    },
    default: "odometer",
  },
  fontSize: {
    type: "number",
    label: "文字サイズ（デモ）",
    group: "外観",
    default: 44,
    min: 24,
    max: 72,
    step: 1,
    unit: "px",
    description: "プレビュー用。実際のサイズは親要素や className で指定します（幅の狭いカードでは自動で縮みます）。",
  },
  duration: {
    type: "number",
    label: "カウント時間",
    group: "モーション",
    default: 1800,
    min: 300,
    max: 5000,
    step: 50,
    unit: "ms",
    description: "カウントアップのみ。",
  },
  springStiffness: {
    type: "number",
    label: "ばねの硬さ",
    group: "モーション",
    default: 110,
    min: 20,
    max: 400,
    step: 5,
    description: "オドメーターのみ。大きいほど桁が速く回ります。",
  },
  springDamping: {
    type: "number",
    label: "減衰",
    group: "モーション",
    default: 19,
    min: 5,
    max: 60,
    step: 1,
    description: "オドメーターのみ。小さいほど目的の数字を行き過ぎて揺れ戻ります。",
  },
} as const;

export const numberTickerEntry = defineEntry({
  slug: "number-ticker",
  name: "NumberTicker",
  description:
    "LP の実績数値をアニメーションで見せる数字コンポーネント。滑らかなカウントアップと、桁ごとに数字が回る空港の発着案内板風オドメーターの 2 スタイル。スクロールで表示されたときに開始し、値の変更にも追従します。",
  category: "text",
  tech: ["framer-motion"],
  host: "dom",
  schema,
  component: NumberTickerPreview,
  codegen: {
    componentName: "NumberTicker",
    importPath: "@/components/number-ticker",
    dependencies: ["framer-motion"],
    skipProps: ["fontSize"],
    // The preview reads in Japanese; spelling the locale out makes the
    // snippet's formatting explicit for consumers in other locales.
    extraProps: () => ['locale="ja-JP"'],
    extraTodos: () => [
      "文字サイズ・太さ・色は親要素か className で指定してください（コンポーネントはフォントを継承します）",
      "ファーストビューに置く場合は startOnView={false} を渡すと、スクロールを待たずにマウント直後から動きます",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px stats band fills it exactly.
    scale: 0.4,
  },
});
