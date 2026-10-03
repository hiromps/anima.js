import { ChevronLeft, Ellipsis, Search, type LucideIcon } from "lucide-react";

/**
 * Demo buttons shared by the preview and the code generator. `iconName` is
 * what the generated code spells the icon as — the component reference
 * itself can't be serialized.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
export type DemoAction = { icon: LucideIcon; iconName: string; label: string };

export const DEMO_LEADING: DemoAction = {
  icon: ChevronLeft,
  iconName: "ChevronLeft",
  label: "戻る",
};

export const DEMO_TRAILING: DemoAction[] = [
  { icon: Search, iconName: "Search", label: "検索" },
  { icon: Ellipsis, iconName: "Ellipsis", label: "その他の操作" },
];

export function demoTrailing(trailingCount: unknown): DemoAction[] {
  const count = Number(trailingCount);
  return DEMO_TRAILING.slice(0, Number.isFinite(count) ? count : 2);
}
