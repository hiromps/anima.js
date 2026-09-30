"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, type CSSProperties, type MouseEvent } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  BookOpen,
  House,
  MessageCircle,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import styles from "./GlassBottomTabBar.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type GlassTab = { href: string; label: string; icon: LucideIcon };

/** Contextual CTA band (red) shown right under the bar; slides in when passed. */
export type GlassTabBarCta = {
  label: string;
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/** Default tabs. Replace per project via the `tabs` prop. */
export const DEFAULT_TABS: GlassTab[] = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/products", label: "商品", icon: ShoppingBag },
  { href: "/guide", label: "使い方", icon: BookOpen },
  { href: "/contact", label: "お問い合わせ", icon: MessageCircle },
];

export type GlassBottomTabBarProps = {
  tabs?: GlassTab[];
  /** Paths (exact match) where the bar is not rendered. */
  hiddenPaths?: string[];
  cta?: GlassTabBarCta;
  /** Render the text label under each icon. */
  showLabels?: boolean;
  /**
   * Glow color A — the pink light behind the bar, the bar's outer light and
   * the active icon glow. Any CSS color; softer tints are derived from it.
   */
  glowColorA?: string;
  /** Glow color B — the lavender light behind the bar. */
  glowColorB?: string;
  /** Backdrop blur of the bar in px. */
  blur?: number;
  /** Spring stiffness of the active pill's move between tabs. */
  springStiffness?: number;
  /** Spring damping of the active pill's move between tabs. */
  springDamping?: number;
  /**
   * Overrides the current path (defaults to `usePathname()`). Lets the bar
   * run outside the router, e.g. in a preview or a phone mockup. Route
   * prefetching is off in this mode.
   */
  pathname?: string;
  /**
   * Runs before a tab navigates. Call `event.preventDefault()` to handle
   * the selection yourself (controlled previews, analytics, etc.).
   */
  onTabSelect?: (tab: GlassTab, event: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * "fixed" (default) pins the bar to the viewport. "absolute" sits it at
   * the bottom of the nearest positioned ancestor — for phone mockups.
   */
  placement?: "fixed" | "absolute";
  /** Hide the bar at 768px and wider (default true). */
  mobileOnly?: boolean;
  className?: string;
};

const DEFAULT_GLOW_A = "#ffaac8";
const DEFAULT_GLOW_B = "#beafff";
const DEFAULT_BLUR = 30;
/** Slight overshoot on the pill move. */
const DEFAULT_SPRING_STIFFNESS = 380;
const DEFAULT_SPRING_DAMPING = 30;

const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");

/** Softer tint of a color for the derived glows: `amount` of color, rest white. */
const tint = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, white)`;

/**
 * iOS-style floating glass bottom tab bar. Shown at mobile widths (< 768px)
 * only. Body padding for the bar is the consumer's job: a globals.css rule
 * keyed on `[data-bottom-tab-bar]` (see the registry docs).
 */
export function GlassBottomTabBar({
  tabs = DEFAULT_TABS,
  hiddenPaths = ["/"],
  cta,
  showLabels = true,
  glowColorA,
  glowColorB,
  blur,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  pathname: pathnameProp,
  onTabSelect,
  placement = "fixed",
  mobileOnly = true,
  className,
}: GlassBottomTabBarProps) {
  const routerPathname = usePathname();
  const pathname = pathnameProp ?? routerPathname;
  // SVG mask ids must be unique per page. useId's punctuation and the "/"
  // in hrefs are awkward inside url(#...), so both are stripped.
  const idBase = safeId(useId());
  const maskIdFor = (href: string) => `tab-mask-${idBase}-${safeId(href)}`;
  const controlled = pathnameProp !== undefined;

  if (hiddenPaths.includes(pathname)) return null;

  // "/" is a prefix of every path, so it only matches exactly.
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const spring = {
    type: "spring",
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.9,
  } as const;

  // The CSS module carries the spec's hand-tuned defaults. Custom properties
  // are only set for non-default values so the default render stays
  // identical to the stylesheet.
  const vars: CSSVars = { "--tab-count": tabs.length };
  if (glowColorA && glowColorA.toLowerCase() !== DEFAULT_GLOW_A) {
    vars["--gbt-glow-a"] = glowColorA;
    vars["--gbt-glow-a-rim"] = glowColorA;
    vars["--gbt-glow-a-soft"] = tint(glowColorA, 60);
    vars["--gbt-glow-a-icon"] = tint(glowColorA, 55);
    vars["--gbt-glow-a-bottom"] = tint(glowColorA, 75);
  }
  if (glowColorB && glowColorB.toLowerCase() !== DEFAULT_GLOW_B) {
    vars["--gbt-glow-b"] = glowColorB;
  }
  if (blur !== undefined && blur !== DEFAULT_BLUR) {
    vars["--gbt-blur"] = `${blur}px`;
  }

  return (
    // Follows the OS "reduce motion" setting: the pill then switches
    // instantly instead of springing across.
    <MotionConfig reducedMotion="user">
      <div
        className={className ? `${styles.root} ${className}` : styles.root}
        data-bottom-tab-bar
        data-placement={placement}
        data-mobile-only={mobileOnly || undefined}
        style={vars}
      >
        <nav className={styles.bar} aria-label="メインナビゲーション">
          {tabs.map((tab) => {
            const { href, label, icon: Icon } = tab;
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={styles.tab}
                data-active={active || undefined}
                aria-current={active ? "page" : undefined}
                prefetch={controlled ? false : undefined}
                onClick={onTabSelect ? (e) => onTabSelect(tab, e) : undefined}
              >
                {active ? (
                  <motion.span
                    layoutId={`${idBase}-active-pill`}
                    className={styles.pill}
                    transition={spring}
                  />
                ) : null}
                {/* Inactive: the line icon (iconLine).
                    Active: a white silhouette with the inner lines cut out
                    (iconFill). lucide draws detail paths first and the
                    outline last, so filling the outline alone would bury the
                    details. An SVG mask layers "silhouette = show (white)"
                    over "details = hide (black)", and the bar's glass shows
                    through the cut-outs instead of black. */}
                <span className={styles.iconStack} aria-hidden>
                  <Icon className={styles.iconLine} size={24} strokeWidth={1.6} />
                  <svg
                    className={styles.iconFill}
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                  >
                    <mask
                      id={maskIdFor(href)}
                      maskUnits="userSpaceOnUse"
                      x={0}
                      y={0}
                      width={24}
                      height={24}
                    >
                      <Icon
                        x={0}
                        y={0}
                        width={24}
                        height={24}
                        fill="#fff"
                        stroke="#fff"
                        strokeWidth={1.6}
                      />
                      <Icon
                        className={styles.maskDetail}
                        x={0}
                        y={0}
                        width={24}
                        height={24}
                        fill="none"
                        strokeWidth={1.6}
                      />
                    </mask>
                    <rect
                      width={24}
                      height={24}
                      fill="currentColor"
                      mask={`url(#${maskIdFor(href)})`}
                    />
                  </svg>
                </span>
                {showLabels ? <span className={styles.label}>{label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <AnimatePresence initial={false}>
          {cta ? (
            <motion.div
              key="cta"
              className={styles.ctaSlot}
              initial={{ height: 0 }}
              animate={{ height: 44 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Link
                href={cta.href}
                className={styles.cta}
                prefetch={controlled ? false : undefined}
                onClick={cta.onClick}
              >
                {cta.label}
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

export default GlassBottomTabBar;
