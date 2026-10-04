"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Pause, Play, type LucideIcon } from "lucide-react";
import styles from "./ExpandingPanels.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type ExpandingPanelItem = {
  id?: string;
  title?: string;
  subtitle?: string;
  /**
   * A URL (rendered as an <img>) or any CSS background value — gradients,
   * `url(...)`, several comma-separated layers. Omitted → generated art.
   */
  image?: string;
  /** Alt text for a URL image. Read as part of the expanded caption. */
  alt?: string;
  /** Shown in the collapsed strip and the caption chip. */
  icon?: LucideIcon;
};

export type ExpandingPanelState = {
  index: number;
  total: number;
  active: boolean;
};

export type ExpandingPanelsProps = {
  items: ExpandingPanelItem[];
  /** Controlled active panel. Pair with `onIndexChange`. */
  activeIndex?: number;
  /** Initial panel when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /**
   * "hover": a mouse hovering a strip expands it (click, tap and keyboard
   * focus always work too). "click": only click / tap / focus.
   */
  trigger?: "hover" | "click";
  /** Cycle through panels. Off under prefers-reduced-motion. */
  autoplay?: boolean;
  /** Autoplay dwell per panel in ms. */
  interval?: number;
  /** Width (or height, when stacked) of a collapsed strip in px. */
  collapsedSize?: number;
  /** Space between panels in px. */
  gap?: number;
  /** Panel corner radius in px. */
  radius?: number;
  /** Row height in px for the horizontal layout. */
  height?: number;
  /**
   * "auto" stacks the panels vertically when the container is narrower
   * than 520px (a container query, so it follows the box, not the window).
   */
  orientation?: "auto" | "horizontal" | "vertical";
  /** Replaces the default strip + caption content of every panel. */
  renderItem?: (item: ExpandingPanelItem, state: ExpandingPanelState) => ReactNode;
  className?: string;
  "aria-label"?: string;
};

// Mirror the stylesheet defaults: inline vars are only written when a prop
// differs, so the default render is exactly the stylesheet.
const DEFAULT_INTERVAL = 5000;
const DEFAULT_COLLAPSED = 64;
const DEFAULT_GAP = 10;
const DEFAULT_RADIUS = 24;
const DEFAULT_HEIGHT = 400;
/** Hover intent: sweeping the pointer across strips shouldn't open each one. */
const HOVER_DELAY_MS = 90;

type ChangeSource = "focus" | "pointer" | "keyboard" | "autoplay";

/** Deterministic fallback art per index (golden-angle hues). */
function fallbackArt(index: number): string {
  const hue = Math.round((index * 137.5 + 220) % 360);
  const hue2 = (hue + 48) % 360;
  return `radial-gradient(120% 80% at 30% 20%, hsl(${hue} 70% 62% / 0.9), transparent 60%), linear-gradient(165deg, hsl(${hue} 55% 38%), hsl(${hue2} 60% 14%))`;
}

/**
 * Anything that already reads as a CSS background value is used verbatim;
 * everything else is treated as an image URL.
 */
function isCssBackground(value: string): boolean {
  return (
    value.includes("gradient(") ||
    /^(url\(|#|rgb|hsl|oklch|oklab|lab\(|lch\(|color\(|var\()/i.test(value.trim())
  );
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// SSR renders the animated variant; the client corrects after hydration.
const getReducedMotionServer = () => false;

const pad = (n: number) => String(n).padStart(2, "0");

export function ExpandingPanels({
  items,
  activeIndex,
  defaultIndex = 0,
  onIndexChange,
  trigger = "hover",
  autoplay = false,
  interval = DEFAULT_INTERVAL,
  collapsedSize = DEFAULT_COLLAPSED,
  gap = DEFAULT_GAP,
  radius = DEFAULT_RADIUS,
  height = DEFAULT_HEIGHT,
  orientation = "auto",
  renderItem,
  className,
  "aria-label": ariaLabel = "画像ギャラリー",
}: ExpandingPanelsProps) {
  const baseId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hoverTimerRef = useRef<number | undefined>(undefined);

  const total = items.length;
  const [innerIndex, setInnerIndex] = useState(defaultIndex);
  const isControlled = activeIndex !== undefined;
  const rawIndex = isControlled ? activeIndex : innerIndex;
  const index = total ? Math.min(Math.max(rawIndex, 0), total - 1) : 0;

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionServer,
  );
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  // Only changes a sighted keyboard/AT user wouldn't otherwise hear are
  // announced: focus changes are already read via the focused button.
  const [announcement, setAnnouncement] = useState("");

  const canAutoplay = autoplay && !reducedMotion && total > 1;
  const running = canAutoplay && !userPaused;
  const paused = !running || hovered || focusWithin || !visible;

  const select = useCallback(
    (next: number, source: ChangeSource) => {
      if (next === index) return;
      if (!isControlled) setInnerIndex(next);
      onIndexChange?.(next);
      if (source !== "focus") {
        const item = items[next];
        setAnnouncement(`${next + 1} / ${total}${item?.title ? `: ${item.title}` : ""}`);
      }
    },
    [index, isControlled, onIndexChange, items, total],
  );

  // Offscreen carousels don't advance (and the paused progress bar costs
  // nothing). Updates arrive from the observer callback, not the effect body.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !canAutoplay || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [canAutoplay]);

  useEffect(() => () => window.clearTimeout(hoverTimerRef.current), []);

  const clearHoverTimer = () => window.clearTimeout(hoverTimerRef.current);

  const handlePanelEnter = (i: number, e: ReactPointerEvent) => {
    // Touch and pen fire pointerenter right before the click; let the click
    // handle those so a tap never double-fires through the timer.
    if (trigger !== "hover" || e.pointerType !== "mouse") return;
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => select(i, "pointer"), HOVER_DELAY_MS);
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (!total) return;
    let next: number | null = null;
    switch (e.key) {
      // Both axes are accepted: "auto" picks the axis in CSS, so the
      // component can't know which pair the user expects.
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % total;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + total) % total;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = total - 1;
        break;
    }
    if (next === null) return;
    e.preventDefault();
    select(next, "keyboard");
    triggerRefs.current[next]?.focus();
  };

  const handleBlur = (e: ReactFocusEvent) => {
    if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };

  const vars: CSSVars = { "--ep-count": total };
  if (interval !== DEFAULT_INTERVAL) vars["--ep-interval"] = `${interval}ms`;
  if (collapsedSize !== DEFAULT_COLLAPSED) vars["--ep-collapsed"] = `${collapsedSize}px`;
  if (gap !== DEFAULT_GAP) vars["--ep-gap"] = `${gap}px`;
  if (radius !== DEFAULT_RADIUS) vars["--ep-radius"] = `${radius}px`;
  if (height !== DEFAULT_HEIGHT) vars["--ep-height"] = `${height}px`;

  return (
    <section
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      style={vars}
      aria-roledescription="カルーセル"
      aria-label={ariaLabel}
      data-orientation={orientation}
      data-paused={paused ? "" : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        clearHoverTimer();
      }}
      onFocus={() => setFocusWithin(true)}
      onBlur={handleBlur}
    >
      <div className={styles.track} onKeyDown={handleKeyDown}>
        {items.map((item, i) => {
          const active = i === index;
          const captionId = `${baseId}-caption-${i}`;
          const Icon = item.icon;
          const image = item.image ?? fallbackArt(i);
          const cssArt = isCssBackground(image);
          const state: ExpandingPanelState = { index: i, total, active };

          return (
            <div
              key={item.id ?? i}
              className={styles.panel}
              data-active={active ? "" : undefined}
              role="group"
              aria-roledescription="スライド"
              aria-label={`${i + 1} / ${total}`}
              onPointerEnter={(e) => handlePanelEnter(i, e)}
              onPointerLeave={clearHoverTimer}
            >
              {/* Sized to the expanded panel, not the live one, so the art
                  never rescales while the flex track animates — a
                  collapsed strip is simply a centred slice of it. */}
              {cssArt ? (
                <div className={styles.art} style={{ background: image }} aria-hidden="true" />
              ) : (
                // Plain <img>: registry components stay framework-agnostic,
                // so next/image is not an option here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.art}
                  src={image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              )}
              <div className={styles.shade} aria-hidden="true" />

              {/* One full-bleed button per panel: it is both the disclosure
                  trigger and the roving tab stop. Content layers sit above
                  it with pointer-events off, so the whole panel clicks. */}
              <button
                ref={(el) => {
                  triggerRefs.current[i] = el;
                }}
                type="button"
                className={styles.trigger}
                tabIndex={active ? 0 : -1}
                aria-expanded={active}
                aria-controls={captionId}
                aria-label={item.title || `${i + 1} / ${total}`}
                onClick={() => select(i, "pointer")}
                onFocus={() => select(i, "focus")}
              />

              {renderItem ? (
                <div className={styles.custom} id={captionId} inert={!active}>
                  {renderItem(item, state)}
                </div>
              ) : (
                <>
                  <div className={styles.strip} aria-hidden="true">
                    {Icon ? <Icon className={styles.stripIcon} strokeWidth={1.75} /> : <span />}
                    <span className={styles.stripLabel}>
                      <span className={styles.stripTitle}>{item.title}</span>
                      <span className={styles.stripIndex}>{pad(i + 1)}</span>
                    </span>
                  </div>
                  <div
                    className={styles.caption}
                    id={captionId}
                    inert={!active}
                    aria-hidden={active ? undefined : true}
                  >
                    <div className={styles.meta}>
                      {Icon ? (
                        <span className={styles.chip} aria-hidden="true">
                          <Icon strokeWidth={1.75} />
                        </span>
                      ) : null}
                      <span className={styles.count}>
                        {pad(i + 1)} <span aria-hidden="true">/</span> {pad(total)}
                      </span>
                    </div>
                    {item.title ? <p className={styles.title}>{item.title}</p> : null}
                    {item.subtitle ? <p className={styles.subtitle}>{item.subtitle}</p> : null}
                    {!cssArt && item.alt ? <span className={styles.srOnly}>{item.alt}</span> : null}
                  </div>
                </>
              )}

              {active && canAutoplay ? (
                <>
                  <div className={styles.progress} aria-hidden="true">
                    {/* The fill's CSS animation is the timer: its end
                        advances the carousel, and animation-play-state
                        pauses it, so no JS clock can drift from the bar.
                        Keyed by index so each panel restarts at zero. */}
                    <span
                      key={index}
                      className={styles.progressFill}
                      onAnimationEnd={(e) => {
                        if (e.target === e.currentTarget) select((index + 1) % total, "autoplay");
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.pause}
                    aria-label={userPaused ? "自動再生を再開" : "自動再生を一時停止"}
                    onClick={() => setUserPaused((p) => !p)}
                  >
                    {userPaused ? (
                      <Play aria-hidden="true" strokeWidth={2} />
                    ) : (
                      <Pause aria-hidden="true" strokeWidth={2} />
                    )}
                  </button>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* APG carousel rule: silent while rotating on its own, polite otherwise. */}
      <div className={styles.srOnly} aria-live={running ? "off" : "polite"} aria-atomic="true">
        {announcement}
      </div>
    </section>
  );
}

export default ExpandingPanels;
