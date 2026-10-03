import {
  BarChart3,
  Bell,
  Calendar,
  Cloud,
  Code2,
  Cpu,
  CreditCard,
  Database,
  Globe,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Palette,
  PenTool,
  Terminal,
  Zap,
} from "lucide-react";
import type {
  OrbitIconComponent,
  OrbitRing,
} from "../components/orbiting-icons";

/**
 * Demo orbits shared by the preview and the code generator, so the copied
 * snippet's `rings` literal is exactly what the card shows. `iconName` is
 * how the generated code spells the icon — the component reference itself
 * can't be serialized.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
type DemoItem = { icon: OrbitIconComponent; iconName: string; label: string };

const RING_ITEMS: DemoItem[][] = [
  [
    { icon: PenTool, iconName: "PenTool", label: "デザイン" },
    { icon: Palette, iconName: "Palette", label: "カラー" },
    { icon: Code2, iconName: "Code2", label: "コード" },
    { icon: Terminal, iconName: "Terminal", label: "ターミナル" },
  ],
  [
    { icon: Database, iconName: "Database", label: "データベース" },
    { icon: Cloud, iconName: "Cloud", label: "クラウド" },
    { icon: Zap, iconName: "Zap", label: "自動化" },
    { icon: Globe, iconName: "Globe", label: "Web" },
    { icon: Lock, iconName: "Lock", label: "認証" },
    { icon: BarChart3, iconName: "BarChart3", label: "分析" },
  ],
  [
    { icon: Mail, iconName: "Mail", label: "メール" },
    { icon: MessageSquare, iconName: "MessageSquare", label: "チャット" },
    { icon: Calendar, iconName: "Calendar", label: "カレンダー" },
    { icon: CreditCard, iconName: "CreditCard", label: "決済" },
    { icon: Bell, iconName: "Bell", label: "通知" },
    { icon: Layers, iconName: "Layers", label: "CMS" },
    { icon: Cpu, iconName: "Cpu", label: "AI" },
  ],
];

/**
 * Radii (fraction of `size`) per ring count — spread so the default 44px
 * chips clear the 104px center and the outermost chips stay inside the box.
 */
const RADII: Record<number, number[]> = {
  1: [0.34],
  2: [0.25, 0.42],
  3: [0.2, 0.325, 0.45],
};

/** Outer rings turn slower — reads as depth, like a planetary system. */
const SPEED_FACTORS = [1, 1.6, 2.3];

export type DemoRing = Omit<OrbitRing, "items"> & { items: DemoItem[] };

export function demoRings(ringCount: unknown, baseSpeed: unknown): DemoRing[] {
  const count = Math.min(3, Math.max(1, Number(ringCount) || 2));
  const base = Number(baseSpeed) || 28;
  return RADII[count].map((radius, i) => ({
    radius,
    speed: Math.round(base * SPEED_FACTORS[i] * 10) / 10,
    // Neighbouring rings counter-rotate.
    reverse: i % 2 === 1,
    items: RING_ITEMS[i],
  }));
}
