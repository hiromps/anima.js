import type { ParallaxSliderItem } from "../components/parallax-slider";

/**
 * The five demo slides, shared by the preview and the generated snippet.
 * `image` is a sky-only gradient: the snippet renders it as-is, while the
 * preview layers its SVG landscape art on top via renderItem (see
 * parallax-slider.demo.tsx), so both read as the same scene. CTA hrefs
 * are fragments with no matching id, so clicking one in the playground
 * doesn't jump the page to the top.
 */
export const DEMO_SLIDES: ParallaxSliderItem[] = [
  {
    id: "alpine-dawn",
    eyebrow: "01 — Alpine Dawn",
    title: "夜明けの稜線へ",
    subtitle:
      "標高 2,900m、雲海の上で迎える最初の光。静けさごと持ち帰る、山岳フォトツアー。",
    image:
      "radial-gradient(40% 30% at 62% 64%, rgba(255,196,140,.9), transparent 70%), linear-gradient(180deg, #1c1b4a 0%, #6b3a73 42%, #f08a6b 72%, #ffd6a0 100%)",
    cta: { label: "ツアーを見る", href: "#alpine-dawn" },
  },
  {
    id: "midnight-sea",
    eyebrow: "02 — Midnight Sea",
    title: "月が描く、海の道",
    subtitle:
      "満月の夜だけ現れる光の帯。波音だけが聞こえるオーシャンフロントの一室で。",
    image:
      "radial-gradient(18% 22% at 72% 26%, rgba(230,236,255,.55), transparent 70%), linear-gradient(180deg, #030616 0%, #0b1a3d 52%, #0f2c52 58%, #040a1c 100%)",
    cta: { label: "客室を予約", href: "#midnight-sea" },
  },
  {
    id: "neon-city",
    eyebrow: "03 — Neon Nights",
    title: "Tokyo After Dark",
    subtitle:
      "眠らない街の灯りを、最上階から。ルーフトップで過ごす特別な一夜。",
    image:
      "radial-gradient(60% 40% at 50% 100%, rgba(255,80,180,.45), transparent 70%), linear-gradient(180deg, #07051a 0%, #1d0f3d 55%, #3b1452 100%)",
    cta: { label: "詳しく見る", href: "#neon-city" },
  },
  {
    id: "desert-dusk",
    eyebrow: "04 — Desert Dusk",
    title: "砂の海に、沈む陽",
    subtitle:
      "風がつくる曲線と、刻々と変わる空の色。ラクダで向かう砂丘のサンセット。",
    image:
      "radial-gradient(30% 26% at 36% 58%, rgba(255,214,150,.95), transparent 70%), linear-gradient(180deg, #2a1846 0%, #a8466a 40%, #f2945a 66%, #c8643c 100%)",
    cta: { label: "プランを見る", href: "#desert-dusk" },
  },
  {
    id: "aurora-fjord",
    eyebrow: "05 — Aurora Fjord",
    title: "空がほどける夜",
    subtitle:
      "北緯 69 度、フィヨルドの湖面に映るオーロラ。ガラスイグルーで朝まで。",
    image:
      "radial-gradient(70% 40% at 40% 30%, rgba(80,255,190,.35), transparent 70%), linear-gradient(180deg, #020a14 0%, #06233a 50%, #0b3a4a 70%, #021018 100%)",
    cta: { label: "旅を計画する", href: "#aurora-fjord" },
  },
];
