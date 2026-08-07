import {
  InsidePovCarousel,
  type MediaItem,
} from "../components/inside-pov-carousel";
import { defineEntry, type PropValues } from "../schema";
import { parseUploads } from "@/lib/uploads";

/**
 * Preview-only demo reels, self-hosted under public/media/demo/ so the site
 * doesn't push its traffic onto a third-party CDN. These are never emitted
 * into generated code — see the `extraTodos` below.
 */
const DEMO_VIDEO_URLS = Array.from(
  { length: 10 },
  (_, i) => `/media/demo/${String(i + 1).padStart(2, "0")}.mp4`,
);

function demoItems(count: number): MediaItem[] {
  return Array.from({ length: count }, (_, i) => ({
    src: DEMO_VIDEO_URLS[i % DEMO_VIDEO_URLS.length],
    alt: `デモ映像 ${i + 1}`,
  }));
}

const schema = {
  media: {
    type: "select",
    label: "メディア",
    group: "メディア",
    options: ["placeholder", "demo-videos"],
    optionLabels: {
      placeholder: "プレースホルダー",
      "demo-videos": "デモ動画",
    },
    default: "placeholder",
    description: "プレイグラウンド専用：カードに表示する内容。",
  },
  uploads: {
    type: "files",
    label: "メディアをアップロード",
    group: "メディア",
    accept: "image/*,video/*",
    default: "",
    description:
      "アップロードした写真・動画がカードになり（「メディア」より優先）、生成コードの items にも出力されます。",
  },
  cardCount: {
    type: "number",
    label: "カード枚数",
    group: "メディア",
    default: 14,
    min: 4,
    max: 20,
    step: 1,
  },
  autoRotate: {
    type: "boolean",
    label: "自動回転",
    group: "モーション",
    default: true,
  },
  interactive: {
    type: "boolean",
    label: "操作を有効化",
    group: "モーション",
    default: true,
    description: "ドラッグ・慣性・キーボード操作を有効にします。",
  },
  speed: {
    type: "number",
    label: "回転速度",
    group: "モーション",
    default: 0.04,
    min: 0,
    max: 0.3,
    step: 0.005,
    unit: "deg/f",
  },
  dragSensitivity: {
    type: "number",
    label: "ドラッグ感度",
    group: "モーション",
    default: 0.28,
    min: 0.05,
    max: 1,
    step: 0.01,
  },
  friction: {
    type: "number",
    label: "摩擦",
    group: "モーション",
    default: 0.94,
    min: 0.8,
    max: 0.99,
    step: 0.005,
    description: "慣性の減衰。1 に近いほど長く滑り続けます。",
  },
  perspective: {
    type: "number",
    label: "遠近感",
    group: "ジオメトリ",
    default: 900,
    min: 400,
    max: 2000,
    step: 10,
    unit: "px",
    description: "値が小さいほど奥行きが強調されます。",
  },
  radius: {
    type: "number",
    label: "リング半径",
    group: "ジオメトリ",
    default: 850,
    min: 300,
    max: 1600,
    step: 10,
    unit: "px",
  },
  cardWidth: {
    type: "number",
    label: "カード幅",
    group: "ジオメトリ",
    default: 340,
    min: 160,
    max: 520,
    step: 5,
    unit: "px",
  },
  cardAspect: {
    type: "number",
    label: "カード縦横比",
    group: "ジオメトリ",
    default: 1.7,
    min: 1,
    max: 2.2,
    step: 0.05,
    description: "カードの高さ = 幅 × 縦横比。",
  },
  tiltX: {
    type: "number",
    label: "X 軸の傾き",
    group: "ジオメトリ",
    default: 0,
    min: -30,
    max: 30,
    step: 1,
    unit: "deg",
  },
  cardRadius: {
    type: "number",
    label: "角の丸み",
    group: "外観",
    default: 18,
    min: 0,
    max: 48,
    step: 1,
    unit: "px",
  },
  depthShading: {
    type: "number",
    label: "奥行きの陰影",
    group: "外観",
    default: 0.28,
    min: 0,
    max: 0.6,
    step: 0.02,
    description: "奥（中央寄り）のカードを暗くして奥行きを強調します。",
  },
  showHint: {
    type: "boolean",
    label: "ドラッグヒント",
    group: "外観",
    default: true,
  },
} as const;

type Values = Partial<PropValues<typeof schema>>;

/**
 * Playground glue: translates the playground-only `media` and `uploads`
 * knobs into the component's `items` prop. Uploaded media wins over the
 * media select while present.
 */
function InsidePovCarouselPreview({ media, uploads, ...rest }: Values) {
  const count = rest.cardCount ?? 14;
  const uploaded = parseUploads(uploads);
  const items: MediaItem[] | undefined = uploaded.length
    ? uploaded.map(({ src, kind, name }) => ({ src, kind, alt: name }))
    : media === "demo-videos"
      ? demoItems(count)
      : undefined;
  return <InsidePovCarousel {...rest} items={items} />;
}

/** Escapes a file name for use inside a double-quoted JS string. */
function quoteName(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export const insidePovCarouselEntry = defineEntry({
  slug: "inside-pov-carousel",
  name: "InsidePovCarousel",
  description:
    "内側視点のリングカルーセル — 中心に立って、周囲を回るカードを見渡します。純粋な CSS 3D、ドラッグ慣性、奥行きの陰影。",
  category: "carousel",
  tech: ["css-3d"],
  host: "dom",
  schema,
  component: InsidePovCarouselPreview,
  codegen: {
    componentName: "InsidePovCarousel",
    importPath: "@/components/inside-pov-carousel",
    dependencies: [],
    skipProps: ["media", "uploads"],
    // Uploaded media is emitted as a real items array. Object URLs die
    // with the session, so file names become public/media/ paths.
    extraProps: (values) => {
      const uploaded = parseUploads(values.uploads);
      if (!uploaded.length) return [];
      const lines = uploaded.map(
        ({ name, kind }) =>
          `  { src: "/media/${quoteName(name)}"${
            kind === "image" ? `, kind: "image"` : ""
          } },`,
      );
      return [`items={[\n${lines.join("\n")}\n]}`];
    },
    // Demo reels stay preview-only: emitting their paths would make the
    // consumer's project hotlink this site's assets.
    extraTodos: (values) => {
      if (parseUploads(values.uploads).length) {
        return [
          "src のパスを解決できるよう、アップロードしたファイルを public/media/ に配置してください（プレイグラウンドの ZIP ダウンロードが使えます）",
        ];
      }
      if (values.media === "demo-videos") {
        return [
          "プレビューのデモ動画は anima.js のサイト専用です。items に自分のメディアを渡してください（省略するとプレースホルダー表示になります）",
        ];
      }
      return [];
    },
  },
  preview: {
    scale: 0.42,
  },
});
