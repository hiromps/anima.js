import type { SwipeCardItem } from "../components/swipe-card-stack";

/**
 * Testimonials shared by the preview stack and the codegen `items` literal,
 * so the copied snippet renders exactly what's on screen.
 */
export const DEMO_TESTIMONIALS: readonly SwipeCardItem[] = [
  {
    id: "sato",
    title: "佐藤 美咲",
    subtitle: "プロダクトデザイナー / Nordlight",
    body: "デザインから実装までの往復がほぼゼロに。チーム全員が同じ画面を見て話せるようになりました。",
    image: "linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #f59e0b 100%)",
    accent: "#c084fc",
  },
  {
    id: "takahashi",
    title: "高橋 健太",
    subtitle: "CTO / Lumen Labs",
    body: "導入初週でビルド時間が半分になりました。もう以前の構成には戻れません。",
    image: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 60%, #1e1b4b 100%)",
    accent: "#60a5fa",
  },
  {
    id: "kobayashi",
    title: "小林 葵",
    subtitle: "フロントエンドエンジニア / Kite",
    body: "アニメーションの細部まで気が利いていて、そのまま本番に出せる品質。レビューが楽しくなりました。",
    image: "linear-gradient(135deg, #10b981 0%, #0d9488 50%, #164e63 100%)",
    accent: "#34d399",
  },
  {
    id: "yamamoto",
    title: "山本 拓海",
    subtitle: "創業者 / Mosaic",
    body: "LP の転換率が 1.4 倍に。小さなチームでも大きな会社と同じ体験を届けられます。",
    image: "linear-gradient(135deg, #f97316 0%, #e11d48 60%, #4c0519 100%)",
    accent: "#fb923c",
  },
  {
    id: "nakamura",
    title: "中村 さくら",
    subtitle: "マーケティングリード / Hanabi",
    body: "お客様の声をこの形で見せてから、問い合わせ前の離脱が目に見えて減りました。",
    image: "linear-gradient(135deg, #f472b6 0%, #a855f7 55%, #312e81 100%)",
    accent: "#f472b6",
  },
];
