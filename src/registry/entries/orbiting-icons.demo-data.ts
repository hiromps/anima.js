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
 * Preferred innermost / outermost radius (fraction of `size`) per ring
 * count. Middle rings sit evenly between them.
 */
const RADIUS_RANGE: Record<number, [number, number]> = {
  1: [0.34, 0.34],
  2: [0.25, 0.42],
  3: [0.2, 0.45],
};

/** Outer rings turn slower — reads as depth, like a planetary system. */
const SPEED_FACTORS = [1, 1.6, 2.3];

/** Breathing room (px) between the center disc and the inner chips, and at the outer edge. */
const INNER_GAP = 10;
const OUTER_GAP = 4;

export type DemoRing = Omit<OrbitRing, "items"> & { items: DemoItem[] };

/** The geometry knobs the radii have to respect. */
export type DemoGeometry = {
  size?: unknown;
  centerSize?: unknown;
  chipSize?: unknown;
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * `centerSize` / `chipSize` are px at the full `size`, so a smaller `size`
 * makes them relatively larger. The preferred radii are therefore clamped:
 * the inner ring keeps its chips clear of the center disc, the outer ring
 * keeps them inside the box.
 */
export function demoRings(
  ringCount: unknown,
  baseSpeed: unknown,
  geometry: DemoGeometry = {},
): DemoRing[] {
  const count = Math.min(3, Math.max(1, Number(ringCount) || 2));
  const base = Number(baseSpeed) || 28;
  const size = Number(geometry.size) || 420;
  const center = Number(geometry.centerSize) || 104;
  const chip = Number(geometry.chipSize) || 44;

  const innerMin = (center / 2 + chip / 2 + INNER_GAP) / size;
  const outerMax = 0.5 - (chip / 2 + OUTER_GAP) / size;
  const [preferredInner, preferredOuter] = RADIUS_RANGE[count];
  const inner = Math.max(preferredInner, innerMin);
  // Never let the outer ring cross inside the inner one; if the knobs leave
  // no room at all the rings simply share a radius band (crowded, not broken).
  const outer = Math.max(inner, Math.min(preferredOuter, outerMax));

  return RING_ITEMS.slice(0, count).map((items, i) => ({
    radius: round3(count === 1 ? inner : inner + ((outer - inner) * i) / (count - 1)),
    speed: Math.round(base * SPEED_FACTORS[i] * 10) / 10,
    // Neighbouring rings counter-rotate.
    reverse: i % 2 === 1,
    items,
  }));
}
