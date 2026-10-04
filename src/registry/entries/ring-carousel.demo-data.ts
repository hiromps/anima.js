import type { RingCarouselItem } from "../components/ring-carousel";

/**
 * Photo-like gradient "shots" shared by the preview ring and the codegen
 * `items` literal, so the copied snippet renders exactly what's on screen.
 * Pure CSS: the gallery paints instantly with no image requests. 14 entries
 * so the cardCount knob's maximum never repeats a card.
 */
export const DEMO_RING_ITEMS: readonly RingCarouselItem[] = [
  {
    id: "dusk",
    title: "夕凪の海",
    subtitle: "Shonan · 18:42",
    image:
      "radial-gradient(60% 38% at 50% 62%, #ffd27a 0%, rgba(255,150,90,.6) 40%, transparent 72%), linear-gradient(180deg, #2b1b4d 0%, #b0446b 46%, #ff9a6b 60%, #3a2a5e 61%, #120f2a 100%)",
  },
  {
    id: "aurora",
    title: "北の空のオーロラ",
    subtitle: "Tromsø · 01:15",
    image:
      "radial-gradient(80% 40% at 30% 30%, rgba(72,255,190,.75), transparent 65%), radial-gradient(60% 35% at 75% 22%, rgba(140,110,255,.7), transparent 70%), linear-gradient(180deg, #050b1f 0%, #0b2a3a 55%, #071018 72%, #02040a 100%)",
  },
  {
    id: "dunes",
    title: "砂丘の稜線",
    subtitle: "Sahara · 06:30",
    image:
      "radial-gradient(40% 25% at 70% 20%, #fff2c4, transparent 70%), linear-gradient(165deg, transparent 52%, rgba(90,30,10,.55) 52.5%, transparent 75%), linear-gradient(180deg, #f7c98b 0%, #ee9a5a 40%, #c8582f 62%, #7a2d18 100%)",
  },
  {
    id: "neon",
    title: "雨上がりのネオン",
    subtitle: "Shinjuku · 23:08",
    image:
      "radial-gradient(30% 40% at 25% 40%, rgba(255,60,170,.8), transparent 70%), radial-gradient(28% 45% at 78% 35%, rgba(40,200,255,.75), transparent 70%), linear-gradient(180deg, #0a0618 0%, #1a0b2e 60%, #2a0f3a 78%, #08040f 100%)",
  },
  {
    id: "forest",
    title: "朝霧の森",
    subtitle: "Yakushima · 05:50",
    image:
      "radial-gradient(70% 45% at 50% 35%, rgba(230,255,235,.55), transparent 70%), linear-gradient(90deg, rgba(5,30,20,.6) 0 8%, transparent 8% 22%, rgba(5,30,20,.5) 22% 27%, transparent 27% 70%, rgba(5,30,20,.55) 70% 78%, transparent 78%), linear-gradient(180deg, #a9cdb8 0%, #4f8a6c 45%, #1d4a36 75%, #0b2219 100%)",
  },
  {
    id: "glacier",
    title: "氷河の青",
    subtitle: "Patagonia · 14:20",
    image:
      "linear-gradient(160deg, transparent 45%, rgba(255,255,255,.35) 46%, transparent 60%), radial-gradient(70% 50% at 50% 70%, #7fe0ff, transparent 70%), linear-gradient(180deg, #dff6ff 0%, #8fd3f0 35%, #2b7fb8 65%, #0b2c52 100%)",
  },
  {
    id: "lavender",
    title: "ラベンダー畑",
    subtitle: "Furano · 16:05",
    image:
      "radial-gradient(50% 30% at 50% 28%, #ffe1f0, transparent 70%), repeating-linear-gradient(100deg, rgba(60,20,90,.35) 0 6px, transparent 6px 18px), linear-gradient(180deg, #f6c6e0 0%, #c69cf0 38%, #7b4fc9 58%, #3a1f6b 100%)",
  },
  {
    id: "canyon",
    title: "赤い峡谷",
    subtitle: "Arizona · 17:40",
    image:
      "radial-gradient(45% 30% at 30% 15%, #ffe0b0, transparent 70%), linear-gradient(170deg, transparent 40%, rgba(60,10,5,.45) 40.5%, transparent 58%), linear-gradient(195deg, transparent 55%, rgba(60,10,5,.5) 55.5%, transparent 80%), linear-gradient(180deg, #ffb27a 0%, #d9573a 40%, #8e2a1c 70%, #3a0f0b 100%)",
  },
  {
    id: "tide",
    title: "深海のグラデーション",
    subtitle: "Okinawa · 11:00",
    image:
      "radial-gradient(60% 30% at 50% 0%, rgba(200,255,250,.8), transparent 70%), repeating-linear-gradient(170deg, rgba(255,255,255,.07) 0 2px, transparent 2px 22px), linear-gradient(180deg, #4fe0d8 0%, #148fb0 35%, #0a4a7a 65%, #031a33 100%)",
  },
  {
    id: "sakura",
    title: "夜桜",
    subtitle: "Kyoto · 20:30",
    image:
      "radial-gradient(35% 30% at 30% 35%, rgba(255,190,215,.85), transparent 70%), radial-gradient(30% 28% at 72% 28%, rgba(255,215,230,.7), transparent 70%), radial-gradient(25% 25% at 55% 55%, rgba(255,160,200,.6), transparent 70%), linear-gradient(180deg, #160c22 0%, #2e1538 60%, #0d0814 100%)",
  },
  {
    id: "storm",
    title: "雷雲",
    subtitle: "Nebraska · 19:12",
    image:
      "radial-gradient(20% 35% at 62% 55%, rgba(210,200,255,.75), transparent 70%), radial-gradient(90% 50% at 50% 20%, #5b5878, transparent 70%), linear-gradient(180deg, #2a2840 0%, #3b3554 45%, #1a1726 75%, #08070d 100%)",
  },
  {
    id: "citrus",
    title: "柑橘の午後",
    subtitle: "Studio · 15:00",
    image:
      "radial-gradient(38% 30% at 35% 40%, #fff3a6, transparent 70%), radial-gradient(45% 40% at 70% 65%, rgba(255,120,60,.85), transparent 72%), linear-gradient(140deg, #ffd25e 0%, #ff8a3d 55%, #c2410c 100%)",
  },
  {
    id: "milkyway",
    title: "天の川",
    subtitle: "Atacama · 02:40",
    image:
      "linear-gradient(120deg, transparent 35%, rgba(255,230,255,.35) 48%, rgba(170,140,255,.3) 52%, transparent 65%), radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(1.5px 1.5px at 45% 20%, #fff, transparent), linear-gradient(180deg, #050414 0%, #161038 55%, #2a1446 80%, #0a0612 100%)",
  },
  {
    id: "matcha",
    title: "苔と石",
    subtitle: "Kanazawa · 10:10",
    image:
      "radial-gradient(40% 30% at 65% 30%, rgba(240,255,210,.6), transparent 70%), radial-gradient(35% 22% at 35% 75%, rgba(40,60,40,.7), transparent 70%), linear-gradient(180deg, #c9dca0 0%, #7fa25a 45%, #3e5e2c 75%, #1a2a14 100%)",
  },
];
