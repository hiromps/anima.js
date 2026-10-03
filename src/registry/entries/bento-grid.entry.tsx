import { defineEntry } from "../schema";
import { BentoGridPreview } from "./bento-grid.demo";
import { DEMO_ITEMS } from "./bento-grid.demo-data";
import { setup, spec } from "./bento-grid.prompt";

const schema = {
  columns: {
    type: "number",
    label: "最大列数",
    group: "レイアウト",
    default: 4,
    min: 1,
    max: 6,
    step: 1,
    description:
      "コンテナが広いときの列数。幅 640px 未満で最大 2 列、440px 未満で 1 列に自動で減ります（コンテナクエリ）。",
  },
  gap: {
    type: "number",
    label: "タイルの間隔",
    group: "レイアウト",
    default: 12,
    min: 0,
    max: 32,
    step: 1,
    unit: "px",
  },
  radius: {
    type: "number",
    label: "角の丸み",
    group: "外観",
    default: 20,
    min: 0,
    max: 36,
    step: 1,
    unit: "px",
  },
  accent: {
    type: "color",
    label: "アクセント色",
    group: "外観",
    default: "#a78bfa",
    description:
      "accent を個別に指定していないタイルの色（プレビューでは「高速ビルド」）。内側のグラデーション、アイコン、ホバーの光に使われます。",
  },
  revealOnScroll: {
    type: "boolean",
    label: "スクロールで出現",
    group: "モーション",
    default: true,
    description:
      "初めて画面に入ったとき、タイルが順番にフェードインします。視差効果を減らす設定の環境では常に表示されます。",
  },
} as const;

export const bentoGridEntry = defineEntry({
  slug: "bento-grid",
  name: "BentoGrid",
  description:
    "Apple / Linear 風のベントーグリッド — サイズの異なる角丸タイルを敷き詰めた機能紹介。タイルごとのアクセント色、ホバーで浮き上がる光、スクロールで順に出現。コンテナクエリで 4 → 2 → 1 列。純粋な CSS。",
  category: "layout",
  tech: ["css"],
  host: "dom",
  schema,
  component: BentoGridPreview,
  codegen: {
    componentName: "BentoGrid",
    importPath: "@/components/bento-grid",
    // lucide-react: the item type references LucideIcon, and the emitted
    // items literal imports its icons.
    dependencies: ["lucide-react"],
    // The tiles on screen are emitted as a literal so the snippet describes
    // the preview. The first tile omits `accent` so the `accent` prop (the
    // color knob) applies to it, exactly as in the preview.
    extraImports: () => [
      `import { ${DEMO_ITEMS.map(({ iconName }) => iconName).join(", ")} } from "lucide-react";`,
    ],
    extraProps: () => {
      const lines = DEMO_ITEMS.map(({ title, description, span, iconName, accent }) => {
        const fields = [
          `title: ${JSON.stringify(title)}`,
          `description: ${JSON.stringify(description)}`,
          `icon: ${iconName}`,
          `span: ${JSON.stringify(span)}`,
          ...(accent ? [`accent: ${JSON.stringify(accent)}`] : []),
        ];
        return `  { ${fields.join(", ")} },`;
      });
      return [`items={[\n${lines.join("\n")}\n]}`, `aria-label="機能一覧"`];
    },
    extraTodos: () => [
      "items の title / description / icon / span をプロダクトの内容に差し替えてください（icon は lucide-react から選べます）",
      "プレビューのグラフ・地図・チャット・折れ線のイラストはデモ専用で、コードには含まれません。必要なら各 item の visual に任意の ReactNode を渡してください（var(--bento-accent) でタイルの色を参照できます）",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // Card is 224px tall; at 0.4 the 560px stage (three 160px rows) fills it.
    scale: 0.4,
  },
});
