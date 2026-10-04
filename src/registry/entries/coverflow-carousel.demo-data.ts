import type { CoverflowItem } from "../components/coverflow-carousel";

/**
 * Album covers drawn entirely with CSS gradients, shared by the preview and
 * the codegen `items` literal so the copied snippet renders what's on
 * screen — and the gallery card paints instantly with no image requests.
 */
export const DEMO_ALBUMS: readonly CoverflowItem[] = [
  {
    id: "neon-drive",
    title: "Neon Drive",
    subtitle: "Midnight Arcade",
    image:
      "radial-gradient(90% 55% at 50% 100%, #ff3cac 0%, rgba(255,60,172,0) 70%), repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 1px, transparent 1px 16px), linear-gradient(180deg, #0e0322 0%, #3a0b5c 55%, #ff6a88 100%)",
  },
  {
    id: "yoake",
    title: "夜明けの街",
    subtitle: "灯火",
    image:
      "radial-gradient(45% 45% at 68% 38%, #ffe2b0 0%, rgba(255,226,176,0) 70%), linear-gradient(180deg, #17244a 0%, #5e4686 42%, #ee9579 78%, #ffd3a5 100%)",
  },
  {
    id: "glass-garden",
    title: "Glass Garden",
    subtitle: "Mirei",
    image:
      "radial-gradient(55% 55% at 28% 30%, #7cf5c4 0%, rgba(124,245,196,0) 65%), radial-gradient(60% 60% at 78% 72%, #3b82f6 0%, rgba(59,130,246,0) 65%), linear-gradient(135deg, #04131a, #0b3d3a)",
  },
  {
    id: "saturn-hours",
    title: "Saturn Hours",
    subtitle: "Orbitals",
    image:
      "radial-gradient(circle at 50% 50%, #0b0b14 0 24%, rgba(11,11,20,0) 24.5%), conic-gradient(from 200deg at 50% 50%, #f7c873, #e2725b, #6a3093, #2b5876, #f7c873)",
  },
  {
    id: "shijima",
    title: "静寂のプール",
    subtitle: "Kumo",
    image:
      "linear-gradient(180deg, rgba(255,255,255,0) 58%, rgba(255,255,255,.16) 58.5%, rgba(255,255,255,0) 74%), radial-gradient(40% 30% at 50% 40%, #ffffff 0%, rgba(255,255,255,0) 70%), linear-gradient(165deg, #a1c4fd 0%, #5b7fd6 48%, #1e2a5a 100%)",
  },
  {
    id: "afterglow",
    title: "Afterglow",
    subtitle: "Lumen",
    image:
      "radial-gradient(38% 38% at 50% 46%, #fff3c4 0%, #ffb347 32%, rgba(255,95,109,0) 72%), linear-gradient(180deg, #2b0f2f 0%, #7a1e48 58%, #ff5f6d 100%)",
  },
  {
    id: "static-bloom",
    title: "Static Bloom",
    subtitle: "Noise Unit",
    image:
      "radial-gradient(70% 70% at 70% 30%, rgba(8,6,20,0) 0%, rgba(8,6,20,.85) 75%), conic-gradient(from 90deg at 32% 68%, #00f5d4, #9b5de5, #f15bb5, #fee440, #00f5d4)",
  },
  {
    id: "night-flight",
    title: "東京ナイトフライト",
    subtitle: "Sora",
    image:
      "radial-gradient(2px 2px at 22% 28%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 72% 18%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 44% 52%, #fff 50%, transparent), radial-gradient(1px 1px at 86% 44%, #fff 50%, transparent), radial-gradient(85% 50% at 50% 100%, #3a7bd5 0%, rgba(58,123,213,0) 72%), linear-gradient(180deg, #050816, #0f1c3f)",
  },
  {
    id: "velvet-room",
    title: "Velvet Room",
    subtitle: "Marlowe",
    image:
      "radial-gradient(70% 70% at 30% 20%, #c471f5 0%, rgba(196,113,245,0) 62%), radial-gradient(70% 70% at 80% 82%, #fa71cd 0%, rgba(250,113,205,0) 62%), linear-gradient(135deg, #1a0526, #3d0a3f)",
  },
];

/** Clamps the playground's item-count knob to the available covers. */
export function demoAlbums(count: number): CoverflowItem[] {
  const n = Math.min(Math.max(Math.round(count), 3), DEMO_ALBUMS.length);
  return DEMO_ALBUMS.slice(0, n);
}
