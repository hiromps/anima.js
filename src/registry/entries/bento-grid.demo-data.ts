import {
  ChartColumn,
  Globe,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { BentoSpan } from "../components/bento-grid";

/** Which demo-only illustration a tile gets (rendered in the demo module). */
export type DemoVisual = "bars" | "globe" | "chat" | "sparkline";

/**
 * Tiles shared by the preview and the code generator. `iconName` is how the
 * generated code spells the icon (a component reference can't be
 * serialized); `visual` is preview-only and never emitted. The first tile
 * has no accent of its own, so the grid-wide `accent` knob colors it.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
export const DEMO_ITEMS: {
  title: string;
  description: string;
  span: BentoSpan;
  icon: LucideIcon;
  iconName: string;
  accent?: string;
  visual?: DemoVisual;
}[] = [
  {
    title: "高速ビルド",
    description: "変更箇所だけを差分ビルド。大規模なサイトでも数秒で反映。",
    span: "2x2",
    icon: Zap,
    iconName: "Zap",
    visual: "bars",
  },
  {
    title: "グローバル配信",
    description: "世界中のエッジから最寄りの拠点で配信。",
    span: "2x1",
    icon: Globe,
    iconName: "Globe",
    accent: "#38bdf8",
    visual: "globe",
  },
  {
    title: "AI アシスト",
    description: "コードの提案からレビューまで。",
    span: "1x2",
    icon: Sparkles,
    iconName: "Sparkles",
    accent: "#f472b6",
    visual: "chat",
  },
  {
    title: "型安全",
    description: "スキーマから型を自動生成。",
    span: "1x1",
    icon: ShieldCheck,
    iconName: "ShieldCheck",
    accent: "#818cf8",
  },
  {
    title: "分析",
    description: "表示速度と離脱率をリアルタイムに計測。",
    span: "2x1",
    icon: ChartColumn,
    iconName: "ChartColumn",
    accent: "#34d399",
    visual: "sparkline",
  },
  {
    title: "自動スケール",
    description: "急なアクセス増にも設定不要。",
    span: "1x1",
    icon: TrendingUp,
    iconName: "TrendingUp",
    accent: "#fbbf24",
  },
];
