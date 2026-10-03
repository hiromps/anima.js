import {
  CalendarDays,
  House,
  ImageIcon,
  Mail,
  Music,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import type {
  MagnifyDockAction,
  MagnifyDockItem,
} from "../components/magnify-dock";

/**
 * Demo items shared by the preview and the code generator. `iconName` is
 * what the generated code spells the icon as — the component reference
 * itself can't be serialized.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
type DemoApp = { item: MagnifyDockAction; iconName: string };

const APPS: DemoApp[] = [
  { item: { id: "home", label: "ホーム", icon: House, active: true }, iconName: "House" },
  { item: { id: "search", label: "検索", icon: Search }, iconName: "Search" },
  { item: { id: "mail", label: "メール", icon: Mail, active: true }, iconName: "Mail" },
  { item: { id: "photos", label: "写真", icon: ImageIcon }, iconName: "ImageIcon" },
  { item: { id: "music", label: "音楽", icon: Music }, iconName: "Music" },
  { item: { id: "settings", label: "設定", icon: Settings }, iconName: "Settings" },
  { item: { id: "calendar", label: "カレンダー", icon: CalendarDays }, iconName: "CalendarDays" },
];

const TRASH: DemoApp = {
  item: { id: "trash", label: "ゴミ箱", icon: Trash2 },
  iconName: "Trash2",
};

export const DEMO_SEPARATOR_ID = "sep";

/** A demo row: an app tile or the separator. */
export type DemoEntry = DemoApp | { separator: true };

/**
 * `itemCount` counts tiles, Trash included: the first `itemCount - 1` apps,
 * then a separator and Trash pinned at the end like the real dock.
 */
export function demoEntries(itemCount: unknown): DemoEntry[] {
  const count = Math.min(Math.max(Number(itemCount) || 7, 5), APPS.length + 1);
  return [...APPS.slice(0, count - 1), { separator: true }, TRASH];
}

export function demoItems(itemCount: unknown): MagnifyDockItem[] {
  return demoEntries(itemCount).map((entry) =>
    "separator" in entry
      ? { type: "separator", id: DEMO_SEPARATOR_ID }
      : entry.item,
  );
}
