import { defineEntry } from "../schema";
import { InfiniteMarqueePreview } from "./infinite-marquee.demo";
import { KINETIC_SEPARATOR, KINETIC_WORDS } from "./infinite-marquee.demo-data";
import { setup, spec } from "./infinite-marquee.prompt";

const schema = {
  speed: {
    type: "number",
    label: "速度",
    group: "モーション",
    default: 60,
    min: 10,
    max: 300,
    step: 5,
    unit: "px/s",
    description: "アイテム数に関係なく一定。中身の長さを測って周期を決めます。",
  },
  direction: {
    type: "select",
    label: "方向",
    group: "モーション",
    options: ["left", "right"],
    optionLabels: { left: "左へ", right: "右へ" },
    default: "left",
    description: "プレビューの上段（ロゴ）は逆方向に流れます。",
  },
  pauseOnHover: {
    type: "boolean",
    label: "ホバーで一時停止",
    group: "挙動",
    default: true,
    description: "キーボードフォーカスが中にある間も止まります。",
  },
  fade: {
    type: "boolean",
    label: "端をフェード",
    group: "外観",
    default: true,
  },
  fadeWidth: {
    type: "number",
    label: "フェード幅",
    group: "外観",
    default: 96,
    min: 0,
    max: 240,
    step: 4,
    unit: "px",
  },
  gap: {
    type: "number",
    label: "間隔",
    group: "外観",
    default: 48,
    min: 0,
    max: 160,
    step: 4,
    unit: "px",
  },
  variant: {
    type: "select",
    label: "スタイル",
    group: "外観",
    options: ["plain", "band"],
    optionLabels: { plain: "プレーン", band: "帯（キネティック）" },
    default: "band",
    description: "band は傾いた全幅の色帯に大きな大文字テキスト。プレビューの下段に反映されます。",
  },
  bandColor: {
    type: "color",
    label: "帯の色",
    group: "外観",
    default: "#d4ff3f",
    description: "文字色は帯の明るさに合わせて黒 / 白が自動で選ばれます。",
  },
  bandRotate: {
    type: "number",
    label: "帯の傾き",
    group: "外観",
    default: -3,
    min: -12,
    max: 12,
    step: 0.5,
    unit: "deg",
  },
} as const;

export const infiniteMarqueeEntry = defineEntry({
  slug: "infinite-marquee",
  name: "InfiniteMarquee",
  description:
    "継ぎ目なく流れ続けるマーキー — ロゴウォール、レビューの帯、傾いた色帯のキネティックテキスト。中身を測って px/s 一定で流し、端は mask でフェード。純粋な CSS アニメーション。",
  category: "layout",
  tech: ["css"],
  host: "dom",
  schema,
  component: InfiniteMarqueePreview,
  codegen: {
    componentName: "InfiniteMarquee",
    importPath: "@/components/infinite-marquee",
    dependencies: [],
    // The snippet describes the preview's band row: its words become the
    // children. The codegen emits a self-closing tag, so they go in an
    // explicit children prop.
    extraProps: (values) => {
      const label = values.variant === "band" ? "スローガン" : "流れるテキスト";
      const items = KINETIC_WORDS.flatMap((word) => [
        `  <span key="${word}">${word}</span>,`,
        `  <span key="${word}-sep" aria-hidden="true">${KINETIC_SEPARATOR}</span>,`,
      ]);
      return [`aria-label="${label}"`, `children={[\n${items.join("\n")}\n]}`];
    },
    extraTodos: () => [
      "children を表示したい要素（ロゴ・テキスト・カード）に差し替えてください。<InfiniteMarquee …>…</InfiniteMarquee> の形で書いても同じです。各要素は横並びの 1 アイテムとして扱われます",
      "親要素に幅（縦の場合は vertical と高さ）を与えてください。band の場合は傾いた帯がはみ出すので、親に overflow: hidden（または clip）を指定します",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The demo stage is 560px tall; at 0.4 it fills the 224px card.
    scale: 0.4,
  },
});
