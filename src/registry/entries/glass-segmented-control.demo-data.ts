import { Clock, LayoutGrid, PackageCheck, Truck, Undo2 } from "lucide-react";
import type { GlassSegmentOption } from "../components/glass-segmented-control";

/**
 * Demo segments shared by the preview and the code generator. `iconName`
 * is what the generated code spells the icon as — the component reference
 * itself can't be serialized.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
export const DEMO_SEGMENTS: { option: Required<GlassSegmentOption>; iconName: string }[] = [
  { option: { value: "all", label: "すべて", icon: LayoutGrid }, iconName: "LayoutGrid" },
  { option: { value: "shipping", label: "配送中", icon: Truck }, iconName: "Truck" },
  { option: { value: "done", label: "完了", icon: PackageCheck }, iconName: "PackageCheck" },
  { option: { value: "preparing", label: "準備中", icon: Clock }, iconName: "Clock" },
  { option: { value: "returned", label: "返品", icon: Undo2 }, iconName: "Undo2" },
];

export function demoSegments(segmentCount: unknown) {
  return DEMO_SEGMENTS.slice(0, Number(segmentCount) || 3);
}

/** Options as the component takes them, with or without icons. */
export function demoOptions(
  segmentCount: unknown,
  showIcons: unknown,
): GlassSegmentOption[] {
  return demoSegments(segmentCount).map(({ option }) =>
    showIcons ? option : { value: option.value, label: option.label },
  );
}
