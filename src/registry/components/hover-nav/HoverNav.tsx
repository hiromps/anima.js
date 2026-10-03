"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import styles from "./HoverNav.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type HoverNavItem = {
  label: string;
  href: string;
  /** Marks the current page. Ignored when `activeHref` is passed. */
  active?: boolean;
};

export type HoverNavCta = {
  label: string;
  href: string;
};

export type HoverNavProps = {
  items: HoverNavItem[];
  /** The current page's href. Takes precedence over `item.active`. */
  activeHref?: string;
  /**
   * "floating" (default): a rounded pill with a hairline border, backdrop
   * blur and a soft shadow. "flat": no container — links sit straight on
   * the page header.
   */
  variant?: "floating" | "flat";
  /** Tint of the hover blob, the active indicator and the focus ring. */
  highlightColor?: string;
  /** Persistent marker on the active item. */
  indicator?: "dot" | "underline" | "none";
  /** Item height: sm 28px / md 34px. */
  size?: "sm" | "md";
  /** Small solid button at the right end of the bar. */
  cta?: HoverNavCta;
  /**
   * When nothing is hovered or focused, park the blob on the active item
   * (default true) instead of fading it out.
   */
  restOnActive?: boolean;
  /** Spring stiffness of the blob's glide between items. */
  springStiffness?: number;
  /** Spring damping of the blob's glide between items. */
  springDamping?: number;
  /**
   * Runs before an item — or the CTA — navigates. Call
   * `event.preventDefault()` to handle routing yourself (client routers,
   * controlled previews, analytics).
   */
  onNavigate?: (
    item: HoverNavItem | HoverNavCta,
    event: MouseEvent<HTMLAnchorElement>,
  ) => void;
  className?: string;
  /** Accessible name of the navigation landmark. */
  "aria-label"?: string;
};

const DEFAULT_HIGHLIGHT = "#ffffff";
/** Fast with a hint of overshoot — the blob should feel attached to the pointer. */
const DEFAULT_SPRING_STIFFNESS = 420;
const DEFAULT_SPRING_DAMPING = 34;
const FADE_IN = { duration: 0.16, ease: "easeOut" } as const;
const FADE_OUT = { duration: 0.22, ease: "easeOut" } as const;

type Blob = {
  x: MotionValue<number>;
  width: MotionValue<number>;
  opacity: MotionValue<number>;
};

type Spring = { type: "spring"; stiffness: number; damping: number; mass: number };

/**
 * Moves the blob over `link`. Measured from bounding-rect deltas (plus the
 * track's scroll offset) rather than offsetLeft, so it doesn't depend on
 * which ancestor happens to be the offsetParent. `spring === null` jumps.
 */
function placeBlob(
  track: HTMLElement,
  link: HTMLElement,
  blob: Blob,
  spring: Spring | null,
) {
  const t = track.getBoundingClientRect();
  const l = link.getBoundingClientRect();
  const x = l.left - t.left + track.scrollLeft;
  if (spring) {
    animate(blob.x, x, spring);
    animate(blob.width, l.width, spring);
  } else {
    blob.x.jump(x);
    blob.width.jump(l.width);
  }
}

/**
 * Vercel / Linear-style top navigation: a soft highlight blob glides to
 * whichever link is hovered or keyboard-focused, while the current page
 * keeps its own dot / underline. Plain <a> links — every one stays in the
 * tab order, and ArrowLeft / ArrowRight / Home / End move focus along the
 * bar. Touch input never shows the blob; taps get a press-scale instead.
 */
export function HoverNav({
  items,
  activeHref,
  variant = "floating",
  highlightColor,
  indicator = "dot",
  size = "md",
  cta,
  restOnActive = true,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  onNavigate,
  className,
  "aria-label": ariaLabel = "メイン",
}: HoverNavProps) {
  // layoutId is page-global in framer-motion; two navs on one page would
  // otherwise trade indicators.
  const indicatorId = `${useId()}-hover-nav-indicator`;
  const trackRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  // Hover / focus targets live in refs: the blob is driven through motion
  // values, so moving it never re-renders the nav.
  const pointerIndexRef = useRef<number | null>(null);
  const focusIndexRef = useRef<number | null>(null);
  const restIndexRef = useRef<number | null>(null);

  const x = useMotionValue(0);
  const width = useMotionValue(0);
  // Hidden until the first measurement, so it never flashes at x = 0.
  const opacity = useMotionValue(0);

  // `animate()` is imperative and doesn't read MotionConfig, so reduced
  // motion has to be honored by hand: the blob then jumps between items.
  const reduceMotion = useReducedMotion() ?? false;

  const activeIndex = items.findIndex((item) =>
    activeHref !== undefined ? item.href === activeHref : Boolean(item.active),
  );
  const restIndex = restOnActive && activeIndex >= 0 ? activeIndex : null;

  const spring: Spring = {
    type: "spring",
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.8,
  };

  const blob: Blob = { x, width, opacity };

  /** Glides to `index` — or appears there, if the blob is currently hidden. */
  const showAt = (index: number) => {
    const track = trackRef.current;
    const link = linkRefs.current[index];
    if (!track || !link) return;
    const visible = opacity.get() > 0.02;
    placeBlob(track, link, blob, visible && !reduceMotion ? spring : null);
    animate(opacity, 1, FADE_IN);
  };

  /** Pointer beats keyboard focus beats the resting (active) item. */
  const settle = () => {
    const index =
      pointerIndexRef.current ?? focusIndexRef.current ?? restIndexRef.current;
    if (index === null) animate(opacity, 0, FADE_OUT);
    else showAt(index);
  };

  // Resting position: on mount the blob appears on the active item before
  // the first paint (so a static screenshot already shows the effect);
  // when the active item changes while nothing is hovered, it glides over.
  useLayoutEffect(() => {
    restIndexRef.current = restIndex;
    if (pointerIndexRef.current !== null || focusIndexRef.current !== null) {
      return;
    }
    const track = trackRef.current;
    const link = restIndex === null ? null : linkRefs.current[restIndex];
    if (!track || !link) {
      animate(opacity, 0, FADE_OUT);
      return;
    }
    const visible = opacity.get() > 0.02;
    placeBlob(
      track,
      link,
      { x, width, opacity },
      visible && !reduceMotion
        ? { type: "spring", stiffness: springStiffness, damping: springDamping, mass: 0.8 }
        : null,
    );
    if (!visible) opacity.jump(1);
  }, [restIndex, reduceMotion, springStiffness, springDamping, x, width, opacity]);

  // Label widths shift when web fonts finish loading and when the bar is
  // resized; re-snap the blob to whatever it is sitting on.
  useEffect(() => {
    const track = trackRef.current;
    const list = listRef.current;
    if (!track || !list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const index =
        pointerIndexRef.current ?? focusIndexRef.current ?? restIndexRef.current;
      const link = index === null ? null : linkRefs.current[index];
      if (link) placeBlob(track, link, { x, width, opacity }, null);
    });
    observer.observe(track);
    observer.observe(list);
    return () => observer.disconnect();
  }, [x, width, opacity]);

  const onPointerEnterItem = (index: number) => (event: PointerEvent) => {
    // Touch has no hover; a tap would otherwise leave the blob stranded.
    if (event.pointerType === "touch") return;
    pointerIndexRef.current = index;
    showAt(index);
  };

  const onPointerLeaveTrack = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    pointerIndexRef.current = null;
    settle();
  };

  const onFocusItem = (index: number) => (event: FocusEvent<HTMLAnchorElement>) => {
    // Mouse clicks focus links too (in Chromium); only keyboard focus,
    // which matches :focus-visible, should pull the blob.
    if (!event.currentTarget.matches(":focus-visible")) return;
    focusIndexRef.current = index;
    if (pointerIndexRef.current === null) showAt(index);
  };

  const onBlurTrack = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    focusIndexRef.current = null;
    settle();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const links = linkRefs.current.slice(0, items.length);
    const current = links.findIndex((link) => link === document.activeElement);
    if (current === -1) return;
    const last = items.length - 1;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = current === last ? 0 : current + 1;
        break;
      case "ArrowLeft":
        next = current === 0 ? last : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
    }
    if (next === null) return;
    event.preventDefault();
    links[next]?.focus();
  };

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (highlightColor && highlightColor.toLowerCase() !== DEFAULT_HIGHLIGHT) {
    vars["--hn-highlight"] = highlightColor;
  }

  return (
    // Follows the OS "reduce motion" setting: the active indicator's
    // layout animation becomes an instant swap.
    <MotionConfig reducedMotion="user">
      <nav
        className={className ? `${styles.root} ${className}` : styles.root}
        data-hover-nav
        data-variant={variant}
        data-size={size}
        aria-label={ariaLabel}
        style={vars}
      >
        <div className={styles.bar}>
          <div
            ref={trackRef}
            className={styles.track}
            onPointerLeave={onPointerLeaveTrack}
            onBlur={onBlurTrack}
          >
            <motion.span
              className={styles.blob}
              aria-hidden
              style={{ x, width, opacity }}
            />
            <ul ref={listRef} className={styles.list} onKeyDown={onKeyDown}>
              {items.map((item, index) => {
                const active = index === activeIndex;
                return (
                  <li key={item.href} className={styles.item}>
                    <a
                      ref={(el) => {
                        linkRefs.current[index] = el;
                      }}
                      href={item.href}
                      className={styles.link}
                      data-active={active || undefined}
                      aria-current={active ? "page" : undefined}
                      onPointerEnter={onPointerEnterItem(index)}
                      onFocus={onFocusItem(index)}
                      onClick={onNavigate ? (e) => onNavigate(item, e) : undefined}
                    >
                      <span className={styles.label}>{item.label}</span>
                      {active && indicator !== "none" ? (
                        <motion.span
                          layoutId={indicatorId}
                          className={styles.indicator}
                          data-kind={indicator}
                          aria-hidden
                          // Framer corrects only the radius it owns during
                          // the scale-based layout animation.
                          style={{ borderRadius: 999 }}
                          transition={spring}
                        />
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
          {cta ? (
            <a
              href={cta.href}
              className={styles.cta}
              onClick={onNavigate ? (e) => onNavigate(cta, e) : undefined}
            >
              <span>{cta.label}</span>
              <svg
                className={styles.ctaArrow}
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden
              >
                <path
                  d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ) : null}
        </div>
      </nav>
    </MotionConfig>
  );
}

export default HoverNav;
