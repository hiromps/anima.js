"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type RefObject,
} from "react";
import {
  MotionConfig,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import styles from "./GlassTopBar.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/** A round lens button in the bar (leading back button or trailing action). */
export type GlassTopBarAction = {
  icon: LucideIcon;
  /** Accessible name — the button shows the icon only. */
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type GlassTopBarProps = {
  title: string;
  /** Small second line under the title. An empty string renders nothing. */
  subtitle?: string;
  /** Left lens button, typically a ChevronLeft "back". */
  leading?: GlassTopBarAction;
  /** Right lens buttons. Only the first two are rendered. */
  trailing?: GlassTopBarAction[];
  /**
   * The element that scrolls (overflow: auto). Defaults to the window.
   * Pass it when the page scrolls inside a container, e.g. a phone mockup.
   */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /** Scroll distance in px over which the glass and glow fade in. */
  revealDistance?: number;
  /** Slide the bar away while scrolling down; bring it back on scroll up. */
  hideOnScroll?: boolean;
  /**
   * "fixed" (default) pins the bar to the viewport. "absolute" sits it at
   * the top of the nearest positioned ancestor — for phone mockups.
   */
  placement?: "fixed" | "absolute";
  /** Glow color A — the pink light behind the bar and its outer light. */
  glowColorA?: string;
  /** Glow color B — the lavender light behind the bar. */
  glowColorB?: string;
  /** Backdrop blur of the bar in px (at full reveal). */
  blur?: number;
  /** Spring stiffness of the hide / show slide. */
  springStiffness?: number;
  /** Spring damping of the hide / show slide. */
  springDamping?: number;
  className?: string;
};

const DEFAULT_GLOW_A = "#ffaac8";
const DEFAULT_GLOW_B = "#beafff";
const DEFAULT_BLUR = 30;
const DEFAULT_REVEAL_DISTANCE = 60;
const DEFAULT_SPRING_STIFFNESS = 380;
const DEFAULT_SPRING_DAMPING = 32;
/** Scroll deltas below this are ignored so trackpad jitter can't flicker the bar. */
const HIDE_DELTA = 4;

/** Softer tint of a color for the derived glows: `amount` of color, rest white. */
const tint = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, white)`;

/**
 * iOS-style floating glass top bar — the counterpart of GlassBottomTabBar.
 * Transparent at the top of the page; the frosted glass and the pastel glow
 * fade in as the content scrolls under it. Body padding for the fixed bar is
 * the consumer's job.
 */
export function GlassTopBar({
  title,
  subtitle,
  leading,
  trailing = [],
  scrollContainerRef,
  revealDistance = DEFAULT_REVEAL_DISTANCE,
  hideOnScroll = false,
  placement = "fixed",
  glowColorA,
  glowColorB,
  blur,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  className,
}: GlassTopBarProps) {
  const { scrollY } = useScroll(
    scrollContainerRef ? { container: scrollContainerRef } : undefined,
  );
  // 0 at the top of the page, 1 once `revealDistance` px have scrolled
  // under the bar. useTransform re-reads the range every render, so the
  // distance can change live.
  const distance = Math.max(1, revealDistance);
  const reveal = useTransform(scrollY, [0, distance], [0, 1]);
  // "Large title feel": the title sits a touch larger while the bar is
  // still transparent and settles to its compact size with the glass.
  const titleScale = useTransform(reveal, [0, 1], [1.08, 1]);

  const [hidden, setHidden] = useState(false);
  const lastY = useRef<number | null>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = lastY.current;
    lastY.current = y;
    // The first event only sets the baseline: a programmatic jump on mount
    // (restored scroll position, a preview starting mid-page) is not the
    // user scrolling down.
    if (!hideOnScroll || prev === null) return;
    const delta = y - prev;
    if (Math.abs(delta) < HIDE_DELTA) return;
    // Never hide while the page top is still under the bar.
    setHidden(delta > 0 && y > distance);
  });

  const isHidden = hideOnScroll && hidden;
  const actions = trailing.slice(0, 2);

  const spring = {
    type: "spring",
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.9,
  } as const;

  // The CSS module carries the spec's defaults; custom properties are only
  // set for non-default values so the default render matches the stylesheet.
  // Both side slots get the width of the wider one, so the title column is
  // centered on the bar and is the one that shrinks (ellipsis) when space
  // runs out — never the buttons.
  const sideCount = Math.max(leading ? 1 : 0, actions.length);
  const vars: CSSVars = {
    "--gtb-side": `${sideCount === 0 ? 0 : sideCount * 40 + (sideCount - 1) * 6}px`,
  };
  if (glowColorA && glowColorA.toLowerCase() !== DEFAULT_GLOW_A) {
    vars["--gtb-glow-a"] = glowColorA;
    vars["--gtb-glow-a-rim"] = glowColorA;
    vars["--gtb-glow-a-soft"] = tint(glowColorA, 60);
    vars["--gtb-glow-a-bottom"] = tint(glowColorA, 75);
  }
  if (glowColorB && glowColorB.toLowerCase() !== DEFAULT_GLOW_B) {
    vars["--gtb-glow-b"] = glowColorB;
  }
  if (blur !== undefined && blur !== DEFAULT_BLUR) {
    vars["--gtb-blur"] = `${blur}px`;
  }

  const renderButton = (action: GlassTopBarAction, key?: string) => {
    const Icon = action.icon;
    return (
      <button
        key={key}
        type="button"
        className={styles.lens}
        aria-label={action.label}
        onClick={action.onClick}
      >
        <Icon size={20} strokeWidth={1.8} aria-hidden />
      </button>
    );
  };

  return (
    // Follows the OS "reduce motion" setting: hide / show then switches
    // instantly instead of sliding.
    <MotionConfig reducedMotion="user">
      <motion.header
        className={className ? `${styles.root} ${className}` : styles.root}
        data-placement={placement}
        data-hidden={isHidden || undefined}
        style={vars}
        initial={false}
        animate={isHidden ? { y: "-150%", opacity: 0 } : { y: "0%", opacity: 1 }}
        transition={spring}
        // A keyboard user tabbing into a hidden bar must not land on an
        // invisible control: focus brings it back.
        onFocusCapture={() => setHidden(false)}
      >
        {/* Layer 0: pastel glow. An element rather than ::before because
            its opacity follows the scroll position. */}
        <motion.div
          className={styles.glow}
          style={{ opacity: reveal }}
          aria-hidden
        />
        {/* Layer 1: the glass. Fading its opacity fades the backdrop blur
            with it, so the blur strength itself stays in the stylesheet. */}
        <motion.div
          className={styles.glass}
          style={{ opacity: reveal }}
          aria-hidden
        />

        <div className={styles.slot} data-side="leading">
          {leading ? renderButton(leading) : null}
        </div>

        <motion.div className={styles.titleBlock} style={{ scale: titleScale }}>
          <span className={styles.title}>{title}</span>
          {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
        </motion.div>

        <div className={styles.slot} data-side="trailing">
          {actions.map((action, i) => renderButton(action, `${action.label}-${i}`))}
        </div>
      </motion.header>
    </MotionConfig>
  );
}

export default GlassTopBar;
