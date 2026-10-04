import { defineEntry } from "../schema";
import { OrbitingIconsPreview } from "./orbiting-icons.demo";
import { demoRings } from "./orbiting-icons.demo-data";
import { setup, spec } from "./orbiting-icons.prompt";

const schema = {
  ringCount: {
    type: "select",
    label: "リング数",
    group: "内容",
    options: ["1", "2", "3"],
    default: "2",
    description: "生成コードの rings に、この数の軌道（内側 4 個・外側 6 個・最外周 7 個のアイコン）が出力されます。",
  },
  size: {
    type: "number",
    label: "サイズ",
    group: "外観",
    default: 420,
    min: 320,
    max: 560,
    step: 10,
    unit: "px",
    description: "設計上の一辺。コンテナが狭いときは比率を保ったまま縮みます。",
  },
  centerSize: {
    type: "number",
    label: "中央の直径",
    group: "外観",
    default: 104,
    min: 64,
    max: 160,
    step: 2,
    unit: "px",
  },
  chipSize: {
    type: "number",
    label: "アイコンの直径",
    group: "外観",
    default: 44,
    min: 28,
    max: 64,
    step: 2,
    unit: "px",
  },
  showRings: {
    type: "boolean",
    label: "軌道線を表示",
    group: "外観",
    default: true,
  },
  ringStyle: {
    type: "select",
    label: "軌道線のスタイル",
    group: "外観",
    options: ["gradient", "dashed", "solid"],
    optionLabels: {
      gradient: "グラデーション",
      dashed: "破線",
      solid: "実線",
    },
    default: "gradient",
    description: "グラデーションは、リングと一緒に回る光の弧になります。",
  },
  glowColor: {
    type: "color",
    label: "発光色",
    group: "外観",
    default: "#8b7bff",
    description: "中央の光、ビーム、グラデーションの弧に使われます。",
  },
  pauseOnHover: {
    type: "boolean",
    label: "ホバーで一時停止",
    group: "挙動",
    default: true,
    description: "止まっている間、アイコンにカーソルを載せるとラベルが表示されます。",
  },
  speed: {
    type: "number",
    label: "周期",
    group: "モーション",
    default: 28,
    min: 8,
    max: 80,
    step: 1,
    unit: "s",
    description: "内側のリングが 1 周する秒数。外側は 1.6 倍・2.3 倍ゆっくり、隣り合うリングは逆回転します。",
  },
  showBeams: {
    type: "boolean",
    label: "ビーム",
    group: "モーション",
    default: true,
    description: "ときどきアイコンから中央へ光のパルスが走ります。",
  },
} as const;

export const orbitingIconsEntry = defineEntry({
  slug: "orbiting-icons",
  name: "OrbitingIcons",
  description:
    "「連携サービス」ヒーロー用の軌道ビジュアル — 中央のロゴの周りを、ガラスのアイコンチップが同心円の軌道に沿って回ります。アイコンは常に正立、ときどき中央へ光のビームが走る。純粋な CSS アニメーション。",
  category: "layout",
  tech: ["css"],
  host: "dom",
  schema,
  component: OrbitingIconsPreview,
  codegen: {
    componentName: "OrbitingIcons",
    importPath: "@/components/orbiting-icons",
    // The component itself has no runtime imports (icons are typed
    // structurally), but the emitted snippet imports lucide icons.
    dependencies: ["lucide-react"],
    skipProps: ["ringCount", "speed"],
    extraImports: (values) => {
      const icons = demoRings(values.ringCount, values.speed, values).flatMap(
        (ring) => ring.items.map(({ iconName }) => iconName),
      );
      return [`import { ${[...icons, "Sparkles"].join(", ")} } from "lucide-react";`];
    },
    // The rings on screen are emitted as a literal so the snippet describes
    // the preview. The codegen emits a self-closing tag, so the center
    // content goes in an explicit children prop.
    extraProps: (values) => {
      const rings = demoRings(values.ringCount, values.speed, values).map((ring) => {
        const items = ring.items.map(
          ({ iconName, label }) =>
            `      { icon: ${iconName}, label: ${JSON.stringify(label)} },`,
        );
        return [
          "  {",
          `    radius: ${ring.radius},`,
          `    speed: ${ring.speed},`,
          ...(ring.reverse ? ["    reverse: true,"] : []),
          "    items: [",
          ...items,
          "    ],",
          "  },",
        ].join("\n");
      });
      return [
        'aria-label="連携サービス"',
        `rings={[\n${rings.join("\n")}\n]}`,
        'children={<Sparkles aria-hidden="true" />}',
      ];
    },
    extraTodos: () => [
      "children を自分のロゴ（<img alt=\"…\"> や SVG）に差し替えてください。中央の円の中に配置されます。<OrbitingIcons …>…</OrbitingIcons> の形で書いても同じです",
      "rings の icon / label を実際の連携先に差し替えてください。radius は 1 以下ならサイズに対する割合、1 より大きければ px、speed は 1 周の秒数です",
    ],
  },
  prompt: { setup, spec },
  preview: {
    // The demo stage is 560px tall; at 0.4 it fills the 224px card.
    scale: 0.4,
  },
});
