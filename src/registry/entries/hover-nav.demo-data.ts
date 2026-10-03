import type {
  HoverNavCta,
  HoverNavItem,
} from "../components/hover-nav";

/**
 * Demo links shared by the preview and the code generator. Six so the
 * item-count knob can go from 3 to 6.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
export const DEMO_ITEMS: HoverNavItem[] = [
  { label: "プロダクト", href: "/product" },
  { label: "料金", href: "/pricing" },
  { label: "ドキュメント", href: "/docs" },
  { label: "ブログ", href: "/blog" },
  { label: "採用", href: "/careers" },
  { label: "導入事例", href: "/customers" },
];

/**
 * The page the preview starts on. The second item: it survives
 * itemCount = 3, and a blob on the first item merges with the bar's
 * rounded end and reads as nothing in the small gallery card.
 */
export const DEMO_ACTIVE_HREF = "/pricing";

/** Preview clicks are intercepted; codegen emits it as-is. */
export const DEMO_CTA: HoverNavCta = { label: "無料で始める", href: "/signup" };

export function demoItems(itemCount: unknown): HoverNavItem[] {
  return DEMO_ITEMS.slice(0, Number(itemCount) || 5);
}
