import type { FanCarouselItem } from "../components/fan-carousel";

/**
 * Nine tarot-style cards shared by the preview and the codegen `items`
 * literal. Each card's art is a CSS background stack: a line-art emblem and
 * a fine lattice (inline SVG data URIs) over the card's gradient. The
 * snippet emits only the gradient — see `extraTodos` in the entry.
 */
export type FanDemoCard = {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  emblem: string;
};

const INK = "#f3dcaa";

const rays = (count: number, r1: number, r2: number) =>
  Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const p = (r: number) =>
      `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`;
    return `M${p(r1)}L${p(r2)}`;
  }).join("");

const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

/** Line-art emblems on a 100×100 canvas. */
const EMBLEMS = {
  fool: `<circle cx="64" cy="30" r="8"/><path d="M18 78L42 46L54 60L66 44L84 78Z"/><path d="M18 84H84"/>`,
  magician: `<path d="M50 50C40 36 22 36 22 50S40 64 50 50S78 36 78 50S60 64 50 50Z"/><path d="M50 18V30M44 24H56"/><path d="M34 78H66"/>`,
  priestess: `<path d="M26 26V80M36 26V80M64 26V80M74 26V80"/><path d="M22 24H40M60 24H78"/><path d="M57 46A10 10 0 1 1 49 34A8 8 0 1 0 57 46Z"/>`,
  empress: `<circle cx="50" cy="40" r="16"/><path d="M50 56V82M40 70H60"/><path d="M34 22L42 28L50 18L58 28L66 22"/>`,
  lovers: `<circle cx="40" cy="48" r="17"/><circle cx="60" cy="48" r="17"/><path d="M50 22C46 14 36 18 40 24L50 32L60 24C64 18 54 14 50 22Z"/>`,
  wheel: `<circle cx="50" cy="50" r="28"/><circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="5"/><path d="${rays(8, 5, 28)}"/>`,
  star: `<path d="${sparkle(50, 46, 20)}"/><path d="${rays(8, 24, 30)}"/><path d="${sparkle(24, 76, 5)}${sparkle(76, 74, 4)}${sparkle(22, 24, 3)}"/>`,
  moon: `<path d="M60 26A24 24 0 1 0 60 74A19 19 0 1 1 60 26Z"/><path d="${sparkle(72, 34, 4)}${sparkle(78, 58, 3)}"/><path d="M20 84Q35 78 50 84T80 84"/>`,
  sun: `<circle cx="50" cy="50" r="14"/><circle cx="50" cy="50" r="19"/><path d="${rays(16, 24, 34)}"/>`,
} as const;

export const FAN_DEMO_CARDS: readonly FanDemoCard[] = [
  {
    id: "fool",
    title: "愚者",
    subtitle: "0 · The Fool",
    gradient: "linear-gradient(165deg, #3a7bd5 0%, #1f3f7a 45%, #0d1430 100%)",
    emblem: EMBLEMS.fool,
  },
  {
    id: "magician",
    title: "魔術師",
    subtitle: "I · The Magician",
    gradient: "linear-gradient(165deg, #c2410c 0%, #7c1d2c 50%, #2a0a16 100%)",
    emblem: EMBLEMS.magician,
  },
  {
    id: "priestess",
    title: "女教皇",
    subtitle: "II · High Priestess",
    gradient: "linear-gradient(165deg, #4f46e5 0%, #2e1065 50%, #0f0726 100%)",
    emblem: EMBLEMS.priestess,
  },
  {
    id: "empress",
    title: "女帝",
    subtitle: "III · The Empress",
    gradient: "linear-gradient(165deg, #0f9f6e 0%, #0b5345 50%, #04201c 100%)",
    emblem: EMBLEMS.empress,
  },
  {
    id: "lovers",
    title: "恋人",
    subtitle: "VI · The Lovers",
    gradient: "linear-gradient(165deg, #e2557b 0%, #8a1c4a 50%, #2b0718 100%)",
    emblem: EMBLEMS.lovers,
  },
  {
    id: "wheel",
    title: "運命の輪",
    subtitle: "X · Wheel of Fortune",
    gradient: "linear-gradient(165deg, #b7791f 0%, #6b3a12 50%, #1f0f06 100%)",
    emblem: EMBLEMS.wheel,
  },
  {
    id: "star",
    title: "星",
    subtitle: "XVII · The Star",
    gradient: "linear-gradient(165deg, #0ea5b7 0%, #134e6f 50%, #071827 100%)",
    emblem: EMBLEMS.star,
  },
  {
    id: "moon",
    title: "月",
    subtitle: "XVIII · The Moon",
    gradient: "linear-gradient(165deg, #6d5bd0 0%, #2c2a6b 50%, #0b0b24 100%)",
    emblem: EMBLEMS.moon,
  },
  {
    id: "sun",
    title: "太陽",
    subtitle: "XIX · The Sun",
    gradient: "linear-gradient(165deg, #f59e0b 0%, #b45309 45%, #3b1505 100%)",
    emblem: EMBLEMS.sun,
  },
];

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const LATTICE = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><path d="M9 0L18 9L9 18L0 9Z" fill="none" stroke="#fff" stroke-opacity=".07"/><circle cx="9" cy="9" r=".9" fill="#fff" fill-opacity=".14"/></svg>`,
);

/** The preview's full art: emblem + halo + lattice over the gradient. */
function artFor(card: FanDemoCard): string {
  const emblem = svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${card.emblem}</svg>`,
  );
  return [
    `${emblem} 50% 40% / 66% auto no-repeat`,
    "radial-gradient(48% 34% at 50% 40%, rgba(255, 236, 190, .22), transparent 70%)",
    `${LATTICE} 0 0 / 18px 18px repeat`,
    card.gradient,
  ].join(", ");
}

/** First `count` cards as component items (preview art). */
export function demoItems(count: number): FanCarouselItem[] {
  return FAN_DEMO_CARDS.slice(0, count).map((card) => ({
    id: card.id,
    title: card.title,
    subtitle: card.subtitle,
    image: artFor(card),
  }));
}
