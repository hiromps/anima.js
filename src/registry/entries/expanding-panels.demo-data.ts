import {
  Landmark,
  MountainSnow,
  Sailboat,
  Snowflake,
  Sunset,
  TreePalm,
  type LucideIcon,
} from "lucide-react";
import type { ExpandingPanelItem } from "../components/expanding-panels";

/**
 * Travel destinations shared by the preview and the code generator.
 * `iconName` is how the generated code spells the icon — the component
 * reference itself can't be serialized.
 *
 * The art is two parts: `sky` (gradients, small enough to emit in the
 * snippet) and `ridges` (an inline SVG silhouette, preview-only — a
 * multi-KB data URI doesn't belong in copied code).
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code.
 */

type Ridge = {
  fill: string;
  /** y (0–600) at evenly spaced x across an 800-wide canvas. */
  points: number[];
  /** Smooth curves (dunes, swells) instead of faceted peaks. */
  smooth?: boolean;
};

type DemoDestination = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconName: string;
  sky: string;
  ridges: Ridge[];
};

function ridgePath({ points, smooth }: Ridge): string {
  const stepX = 800 / (points.length - 1);
  const pts = points.map((y, i) => [Math.round(i * stepX), y] as const);
  let d = `M0 600L${pts[0][0]} ${pts[0][1]}`;
  if (smooth) {
    // Quadratic curves through midpoints: a soft, continuous horizon.
    for (let i = 0; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      const [nx, ny] = pts[i + 1];
      d += `Q${x} ${y} ${Math.round((x + nx) / 2)} ${Math.round((y + ny) / 2)}`;
    }
    d += `L800 ${pts[pts.length - 1][1]}`;
  } else {
    for (const [x, y] of pts.slice(1)) d += `L${x} ${y}`;
  }
  return `${d}L800 600Z`;
}

/** Layered silhouettes as one data-URI background layer, anchored bottom. */
function ridgesLayer(ridges: Ridge[]): string {
  const paths = ridges
    .map((r) => `<path fill="${r.fill}" d="${ridgePath(r)}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice">${paths}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") center bottom / cover no-repeat`;
}

const DESTINATIONS: DemoDestination[] = [
  {
    id: "kyoto",
    title: "京都",
    subtitle: "朱の鳥居と紅葉の山並み。夕暮れの古都を、ゆっくり歩く。",
    icon: Landmark,
    iconName: "Landmark",
    sky: "radial-gradient(40% 30% at 62% 60%, #ffd9a0 0%, rgba(255,180,110,0.55) 35%, transparent 70%), linear-gradient(180deg, #24173a 0%, #6e2a4f 36%, #d75f4a 62%, #f3a866 80%)",
    ridges: [
      { fill: "#7a2f4b", points: [380, 360, 372, 340, 352, 330, 348, 365, 358] },
      { fill: "#4a1d3a", points: [420, 400, 410, 395, 380, 402, 420, 398, 410], smooth: true },
      { fill: "#22101f", points: [470, 455, 480, 462, 450, 470, 458, 476, 465], smooth: true },
    ],
  },
  {
    id: "reykjavik",
    title: "Reykjavík",
    subtitle: "北極圏の夜空に揺れるオーロラ。静寂と光の街へ。",
    icon: Snowflake,
    iconName: "Snowflake",
    sky: "radial-gradient(55% 22% at 38% 30%, rgba(90,255,190,0.55), transparent 70%), radial-gradient(45% 20% at 70% 20%, rgba(130,140,255,0.45), transparent 70%), linear-gradient(180deg, #040814 0%, #0a1f33 55%, #12384a 100%)",
    ridges: [
      { fill: "#2b4a5e", points: [410, 360, 330, 372, 390, 350, 318, 360, 400] },
      { fill: "#16293a", points: [450, 430, 445, 420, 440, 428, 446, 425, 440], smooth: true },
      { fill: "#0a131c", points: [500, 492, 505, 495, 488, 500, 494, 505, 498], smooth: true },
    ],
  },
  {
    id: "santorini",
    title: "Santorini",
    subtitle: "白い街並みとエーゲ海の青。崖の上で迎える、世界一の夕日。",
    icon: Sailboat,
    iconName: "Sailboat",
    sky: "radial-gradient(35% 25% at 30% 38%, #fff4d6 0%, rgba(255,230,180,0.5) 40%, transparent 70%), linear-gradient(180deg, #3a8bd6 0%, #7cc4f2 52%, #cfe9f7 72%, #1d5fa6 72.5%, #123f78 100%)",
    ridges: [
      { fill: "#e9edf2", points: [600, 600, 600, 600, 470, 420, 396, 380, 372] },
      { fill: "#c9d4e2", points: [600, 600, 600, 600, 600, 500, 462, 440, 430] },
    ],
  },
  {
    id: "patagonia",
    title: "Patagonia",
    subtitle: "氷河を抱く尖峰と、風の大地。地の果てのトレッキング。",
    icon: MountainSnow,
    iconName: "MountainSnow",
    sky: "radial-gradient(60% 30% at 50% 78%, rgba(255,190,150,0.6), transparent 70%), linear-gradient(180deg, #18213b 0%, #3f5683 45%, #b98aa0 72%, #f0b48e 88%)",
    ridges: [
      { fill: "#dfe6f2", points: [430, 300, 250, 330, 210, 280, 340, 360, 420] },
      { fill: "#4a5876", points: [470, 420, 400, 430, 390, 440, 410, 450, 460] },
      { fill: "#1d2436", points: [520, 500, 510, 490, 505, 495, 515, 500, 510], smooth: true },
    ],
  },
  {
    id: "okinawa",
    title: "沖縄",
    subtitle: "珊瑚礁のターコイズと、白い砂浜。南の島で過ごす休日。",
    icon: TreePalm,
    iconName: "TreePalm",
    sky: "radial-gradient(30% 22% at 72% 26%, #fffbe6 0%, rgba(255,250,220,0.5) 40%, transparent 70%), linear-gradient(180deg, #1aa7d6 0%, #68d3f0 46%, #c8f3fb 62%)",
    ridges: [
      { fill: "#1fc3c8", points: [380, 384, 378, 386, 380, 384, 378, 382, 380], smooth: true },
      { fill: "#0b8fb0", points: [440, 430, 446, 434, 442, 430, 444, 436, 440], smooth: true },
      { fill: "#f4e2b8", points: [540, 520, 528, 510, 522, 505, 515, 500, 508], smooth: true },
    ],
  },
  {
    id: "sahara",
    title: "Sahara",
    subtitle: "黄金色の砂丘に沈む夕日。星空の下、キャンプで眠る。",
    icon: Sunset,
    iconName: "Sunset",
    sky: "radial-gradient(32% 26% at 44% 56%, #ffe2a8 0%, rgba(255,170,90,0.55) 40%, transparent 72%), linear-gradient(180deg, #2c1a3a 0%, #8a3b45 40%, #e57a3c 66%, #f6c06a 82%)",
    ridges: [
      { fill: "#c8763a", points: [420, 380, 400, 360, 410, 370, 395, 380, 410], smooth: true },
      { fill: "#8f4a28", points: [470, 450, 480, 440, 470, 455, 445, 470, 460], smooth: true },
      { fill: "#3a1c16", points: [540, 520, 530, 545, 515, 530, 540, 520, 535], smooth: true },
    ],
  },
];

export const MIN_ITEMS = 3;
export const MAX_ITEMS = DESTINATIONS.length;

function clampCount(itemCount: unknown): number {
  const n = Math.round(Number(itemCount) || 5);
  return Math.min(Math.max(n, MIN_ITEMS), MAX_ITEMS);
}

export function demoDestinations(itemCount: unknown): DemoDestination[] {
  return DESTINATIONS.slice(0, clampCount(itemCount));
}

/** Preview items: sky + SVG silhouettes. */
export function demoItems(itemCount: unknown): ExpandingPanelItem[] {
  return demoDestinations(itemCount).map((d) => ({
    id: d.id,
    title: d.title,
    subtitle: d.subtitle,
    icon: d.icon,
    image: `${ridgesLayer(d.ridges)}, ${d.sky}`,
  }));
}
