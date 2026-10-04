import type { WheelCarouselItem } from "../components/wheel-carousel";

/**
 * Rows shared by the preview and the codegen `items` literal, so the copied
 * snippet renders exactly the first wheel on screen.
 */
export const DEMO_MONTHS: readonly string[] = Array.from(
  { length: 12 },
  (_, i) => `${i + 1}月`,
);

/** The reservation mock is pinned to one year so day counts are stable. */
export const DEMO_YEAR = 2026;

export function demoDays(monthIndex: number): string[] {
  const count = new Date(DEMO_YEAR, monthIndex + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${i + 1}日`);
}

/** 10:00 – 21:30 every 30 minutes. */
export const DEMO_TIMES: readonly string[] = Array.from({ length: 24 }, (_, i) => {
  const h = 10 + Math.floor(i / 2);
  return `${h}:${i % 2 ? "30" : "00"}`;
});

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function demoWeekday(monthIndex: number, dayIndex: number): string {
  return WEEKDAYS[new Date(DEMO_YEAR, monthIndex, dayIndex + 1).getDay()];
}

export const DEMO_PLAYLIST: readonly WheelCarouselItem[] = [
  {
    id: "afterglow",
    title: "Afterglow",
    subtitle: "Mina Aoki · 3:42",
    image: "linear-gradient(140deg, #f472b6 0%, #a855f7 55%, #312e81 100%)",
  },
  {
    id: "night-drive",
    title: "Night Drive",
    subtitle: "Kite Club · 4:05",
    image: "linear-gradient(140deg, #38bdf8 0%, #6366f1 60%, #1e1b4b 100%)",
  },
  {
    id: "paper-moon",
    title: "Paper Moon",
    subtitle: "Haru · 2:58",
    image: "linear-gradient(140deg, #fde68a 0%, #f97316 55%, #7c2d12 100%)",
  },
  {
    id: "low-tide",
    title: "Low Tide",
    subtitle: "Nordlight · 3:21",
    image: "linear-gradient(140deg, #5eead4 0%, #0d9488 50%, #164e63 100%)",
  },
  {
    id: "glass-city",
    title: "Glass City",
    subtitle: "Lumen · 3:57",
    image: "linear-gradient(140deg, #c4b5fd 0%, #7c3aed 50%, #2e1065 100%)",
  },
  {
    id: "first-light",
    title: "First Light",
    subtitle: "Sora Ito · 4:30",
    image: "linear-gradient(140deg, #fecdd3 0%, #fb7185 50%, #881337 100%)",
  },
  {
    id: "static",
    title: "Static Bloom",
    subtitle: "Mosaic · 3:12",
    image: "linear-gradient(140deg, #bef264 0%, #22c55e 50%, #14532d 100%)",
  },
  {
    id: "orbit",
    title: "Orbit",
    subtitle: "Hanabi · 3:48",
    image: "linear-gradient(140deg, #93c5fd 0%, #3b82f6 45%, #0f172a 100%)",
  },
];
