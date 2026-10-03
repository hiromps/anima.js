import { CalendarPlus, Camera, Mic, PenLine, Radio } from "lucide-react";
import type { GlassFabAction } from "../components/glass-fab-menu";

/**
 * Demo actions shared by the preview and the code generator, so the
 * action-count knob and the emitted `actions` literal always agree.
 * `iconName` is what the generated code spells the icon as — the
 * component reference itself can't be serialized.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
export const DEMO_ACTIONS: { action: GlassFabAction; iconName: string }[] = [
  { action: { id: "photo", label: "写真", icon: Camera }, iconName: "Camera" },
  { action: { id: "post", label: "投稿", icon: PenLine }, iconName: "PenLine" },
  { action: { id: "live", label: "ライブ", icon: Radio }, iconName: "Radio" },
  {
    action: { id: "event", label: "予定", icon: CalendarPlus },
    iconName: "CalendarPlus",
  },
  { action: { id: "voice", label: "音声", icon: Mic }, iconName: "Mic" },
];

export function demoActions(actionCount: unknown) {
  return DEMO_ACTIONS.slice(0, Number(actionCount) || 4);
}
