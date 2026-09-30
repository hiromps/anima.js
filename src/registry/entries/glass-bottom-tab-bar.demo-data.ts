import { Settings } from "lucide-react";
import {
  DEFAULT_TABS,
  type GlassTab,
} from "../components/glass-bottom-tab-bar";

/**
 * Demo tabs shared by the preview and the code generator: the component's
 * defaults plus one more, so the tab-count knob can go up to 5. `iconName`
 * is what the generated code spells the icon as — the component reference
 * itself can't be serialized.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
export const DEMO_TABS: { tab: GlassTab; iconName: string }[] = [
  { tab: DEFAULT_TABS[0], iconName: "House" },
  { tab: DEFAULT_TABS[1], iconName: "ShoppingBag" },
  { tab: DEFAULT_TABS[2], iconName: "BookOpen" },
  { tab: DEFAULT_TABS[3], iconName: "MessageCircle" },
  { tab: { href: "/settings", label: "設定", icon: Settings }, iconName: "Settings" },
];

/** Where the demo CTA points. Preview clicks are intercepted; codegen emits it as-is. */
export const DEMO_CTA_HREF = "/cart";

export function demoTabs(tabCount: unknown) {
  return DEMO_TABS.slice(0, Number(tabCount) || 4);
}
