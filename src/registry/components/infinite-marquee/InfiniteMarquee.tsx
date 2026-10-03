"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./InfiniteMarquee.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type InfiniteMarqueeDirection = "left" | "right";
export type InfiniteMarqueeVariant = "plain" | "band";

export type InfiniteMarqueeProps = {
  /** The items of one pass (logos, cards, words). Rendered as flex items. */
  children: ReactNode;
  /** Scroll speed in px per second — constant regardless of item count. */
  speed?: number;
  /**
   * "left" moves content toward the start (up when `vertical`), "right"
   * toward the end (down when `vertical`).
   */
  direction?: InfiniteMarqueeDirection;
  /** Pause while the pointer is over the marquee (and while it holds focus). */
  pauseOnHover?: boolean;
  /** Fade both edges out with a mask. */
  fade?: boolean;
  /** Width (height when vertical) of each edge fade in px. */
  fadeWidth?: number;
  /** Space between items, and between passes, in px. */
  gap?: number;
  /** Scroll on the block axis. Give the marquee a height (e.g. via className). */
  vertical?: boolean;
  /**
   * "plain" leaves styling to the children. "band" is the kinetic-type look:
   * a tilted full-bleed colored band with big uppercase text.
   */
  variant?: InfiniteMarqueeVariant;
  /** Band fill (variant="band"). The text color follows its lightness. */
  bandColor?: string;
  /** Band tilt in degrees (variant="band"). */
  bandRotate?: number;
  className?: string;
  /** Names the marquee for assistive tech (rendered as a labelled group). */
  "aria-label"?: string;
};

const DEFAULT_SPEED = 60;
const DEFAULT_FADE_WIDTH = 96;
const DEFAULT_GAP = 48;
const DEFAULT_BAND_COLOR = "#d4ff3f";
const DEFAULT_BAND_ROTATE = -3;
/** Upper bound on rendered passes, so a 1px-wide child can't explode the DOM. */
const MAX_COPIES = 24;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** OS "reduce motion" setting; false during SSR and hydration. */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Dark or light ink for text on the band, from the fill's relative
 * luminance. Only #rgb / #rrggbb are parsed; anything else keeps dark ink,
 * which suits the bright fills the band is designed around.
 */
function inkFor(color: string): string {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return "#0a0a0a";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.36 ? "#0a0a0a" : "#fafafa";
}

/**
 * Seamless infinite marquee. The children are rendered as one pass, the
 * pass is repeated until it covers the container, and that whole set is
 * rendered twice — so a CSS translate of exactly -50% lands on a frame
 * identical to the first and the loop never jumps. Duration is derived
 * from the measured set length, so `speed` stays in px/s whatever the
 * content. Every copy but the first is aria-hidden + inert: assistive tech
 * and the Tab key see the content once.
 */
export function InfiniteMarquee({
  children,
  speed = DEFAULT_SPEED,
  direction = "left",
  pauseOnHover = true,
  fade = true,
  fadeWidth = DEFAULT_FADE_WIDTH,
  gap = DEFAULT_GAP,
  vertical = false,
  variant = "plain",
  bandColor = DEFAULT_BAND_COLOR,
  bandRotate = DEFAULT_BAND_ROTATE,
  className,
  "aria-label": ariaLabel,
}: InfiniteMarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // `size` = one pass's length on the scroll axis (incl. its trailing gap),
  // `copies` = passes per half. Updated only when the measurement changes,
  // never per frame — the motion itself is a compositor-only CSS animation.
  const [layout, setLayout] = useState({ size: 0, copies: 1 });
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return;
    const measure = () => {
      // offset*/client* are layout sizes, unaffected by the band's rotate.
      const size = vertical ? group.offsetHeight : group.offsetWidth;
      const box = vertical ? viewport.clientHeight : viewport.clientWidth;
      if (!size) return;
      // One half must be at least as long as the viewport, so the track
      // (two halves) always spans 2× the container: no gap ever shows.
      const copies = Math.min(MAX_COPIES, Math.max(1, Math.ceil(box / size)));
      setLayout((prev) =>
        prev.size === size && prev.copies === copies ? prev : { size, copies },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    return () => observer.disconnect();
  }, [vertical]);

  // Pause while scrolled out of view — the animation is cheap, but not free.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setOffscreen(!entry.isIntersecting),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const ready = layout.size > 0 && speed > 0;
  const copies = reduced ? 1 : layout.copies;
  // Reduced motion renders a single pass (no duplicates); otherwise two
  // halves of `copies` passes each.
  const passCount = reduced ? 1 : copies * 2;

  const vars: CSSVars = {};
  if (ready) {
    vars["--im-duration"] = `${((layout.size * copies) / speed).toFixed(3)}s`;
  }
  if (gap !== DEFAULT_GAP) vars["--im-gap"] = `${gap}px`;
  if (fadeWidth !== DEFAULT_FADE_WIDTH) vars["--im-fade"] = `${fadeWidth}px`;
  if (variant === "band") {
    if (bandColor.toLowerCase() !== DEFAULT_BAND_COLOR) {
      vars["--im-band-color"] = bandColor;
      vars["--im-band-ink"] = inkFor(bandColor);
    }
    if (bandRotate !== DEFAULT_BAND_ROTATE) {
      vars["--im-band-rotate"] = `${bandRotate}deg`;
    }
  }

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      data-variant={variant}
      data-axis={vertical ? "y" : "x"}
      data-direction={direction}
      data-fade={fade || undefined}
      data-pause-on-hover={pauseOnHover || undefined}
      data-ready={ready || undefined}
      data-offscreen={offscreen || undefined}
      style={vars}
    >
      <div
        ref={viewportRef}
        className={styles.viewport}
        // Reduced motion turns the row into a scroller; make it reachable
        // by keyboard so overflowing items can still be read.
        tabIndex={reduced ? 0 : undefined}
      >
        <div className={styles.track}>
          {Array.from({ length: passCount }, (_, i) => (
            <div
              key={i}
              ref={i === 0 ? groupRef : undefined}
              className={styles.group}
              aria-hidden={i > 0 || undefined}
              inert={i > 0 || undefined}
            >
              {children}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InfiniteMarquee;
