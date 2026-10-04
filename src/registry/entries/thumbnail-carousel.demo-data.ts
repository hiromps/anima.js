import type { ThumbnailCarouselItem } from "../components/thumbnail-carousel";

/**
 * Six product shots of a fictional headphone ("Halo One"), shared by the
 * preview and the codegen `items` literal. The `image` backdrops are what
 * the snippet ships; the headphone art itself is drawn by the preview's
 * renderItem / renderThumb from `view` + `colorway` and stays playground-only.
 */

export type ShotView = "front" | "angle" | "side" | "detail";

export type Colorway = {
  shellLight: string;
  shell: string;
  shellDark: string;
  cushion: string;
  accent: string;
};

export const COLORWAYS = {
  midnight: {
    shellLight: "#5a5476",
    shell: "#2c2939",
    shellDark: "#14121b",
    cushion: "#0c0b11",
    accent: "#a78bfa",
  },
  sand: {
    shellLight: "#fff8ec",
    shell: "#e4d2b4",
    shellDark: "#ab916c",
    cushion: "#7a6449",
    accent: "#f59e0b",
  },
  glacier: {
    shellLight: "#ffffff",
    shell: "#d6e6f3",
    shellDark: "#93afc7",
    cushion: "#4f6b84",
    accent: "#38bdf8",
  },
} satisfies Record<string, Colorway>;

export type ColorwayName = keyof typeof COLORWAYS;

export type DemoShot = ThumbnailCarouselItem & {
  id: string;
  view: ShotView;
  colorway: ColorwayName;
};

const MIDNIGHT_STUDIO =
  "radial-gradient(60% 55% at 50% 40%, rgba(139, 92, 246, 0.32), transparent 70%), linear-gradient(160deg, #1d1a2b 0%, #0b0a10 100%)";

export const DEMO_SHOTS: DemoShot[] = [
  {
    id: "front",
    title: "Halo One — ミッドナイト",
    subtitle: "正面",
    alt: "ミッドナイトカラーのヘッドホンを正面から",
    image: MIDNIGHT_STUDIO,
    view: "front",
    colorway: "midnight",
  },
  {
    id: "angle",
    title: "Halo One — ミッドナイト",
    subtitle: "斜め 45°",
    alt: "ミッドナイトカラーのヘッドホンを斜めから",
    image:
      "radial-gradient(55% 50% at 38% 45%, rgba(99, 102, 241, 0.34), transparent 70%), linear-gradient(200deg, #191a2c 0%, #09090f 100%)",
    view: "angle",
    colorway: "midnight",
  },
  {
    id: "side",
    title: "Halo One — ミッドナイト",
    subtitle: "サイド",
    alt: "ミッドナイトカラーのヘッドホンを真横から",
    image:
      "radial-gradient(50% 55% at 50% 55%, rgba(236, 72, 153, 0.22), transparent 70%), linear-gradient(170deg, #1f1726 0%, #0a080d 100%)",
    view: "side",
    colorway: "midnight",
  },
  {
    id: "detail",
    title: "イヤーカップ",
    subtitle: "メッシュとステッチのディテール",
    alt: "イヤーカップのメッシュとステッチの接写",
    image:
      "radial-gradient(70% 70% at 30% 25%, rgba(167, 139, 250, 0.4), transparent 65%), linear-gradient(150deg, #241d3a 0%, #0c0a14 100%)",
    view: "detail",
    colorway: "midnight",
  },
  {
    id: "sand",
    title: "Halo One — サンド",
    subtitle: "カラーバリエーション",
    alt: "サンドカラーのヘッドホンを正面から",
    image:
      "radial-gradient(60% 55% at 50% 40%, rgba(255, 236, 200, 0.55), transparent 70%), linear-gradient(160deg, #a38a68 0%, #3a3024 100%)",
    view: "front",
    colorway: "sand",
  },
  {
    id: "glacier",
    title: "Halo One — グレイシャー",
    subtitle: "カラーバリエーション",
    alt: "グレイシャーカラーのヘッドホンを斜めから",
    image:
      "radial-gradient(60% 55% at 45% 40%, rgba(186, 230, 253, 0.5), transparent 70%), linear-gradient(160deg, #5f86a8 0%, #172636 100%)",
    view: "angle",
    colorway: "glacier",
  },
];
