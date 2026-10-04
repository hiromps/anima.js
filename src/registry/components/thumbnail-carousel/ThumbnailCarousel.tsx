"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useIsPresent,
  useReducedMotion,
  type PanInfo,
  type Variants,
} from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ThumbnailCarousel.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type ThumbnailCarouselItem = {
  id?: string;
  /** Caption title on the main stage; also the thumbnail's accessible name. */
  title?: string;
  subtitle?: string;
  /**
   * A URL (rendered as an <img>) or any CSS background value — gradients,
   * `url(...)`, several comma-separated layers. Omitted → generated art.
   */
  image?: string;
  /** Alt text for the image. Falls back to `title`. */
  alt?: string;
};

export type ThumbnailCarouselTransition = "slide" | "fade" | "zoom";

export type ThumbnailCarouselItemState = {
  index: number;
  total: number;
  /** Main stage: false while the slide is animating out. Thumb: selected. */
  active: boolean;
};

export type ThumbnailCarouselProps = {
  items: readonly ThumbnailCarouselItem[];
  /** Controlled active index. Pair with `onIndexChange`. */
  index?: number;
  /** Initial index when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** How the main image changes. */
  transition?: ThumbnailCarouselTransition;
  /** Thumbnail strip under the stage, or a vertical column to its left. */
  thumbPosition?: "bottom" | "left";
  /** Thumbnail edge length in px (thumbs are square). */
  thumbSize?: number;
  /** "03 / 06" badge in the stage corner. */
  showCounter?: boolean;
  /** Desktop (mouse) only: magnify the image under the pointer. */
  zoomOnHover?: boolean;
  /** Magnification of the hover zoom. */
  zoomScale?: number;
  /** Prev / next / swipe wrap around at the ends. */
  loop?: boolean;
  /**
   * Advance every `autoPlayInterval` ms. Pauses on hover, focus, offscreen
   * and hidden tabs; never runs under prefers-reduced-motion.
   */
  autoPlay?: boolean;
  autoPlayInterval?: number;
  /**
   * Replaces the main image. It sits inside the zoom layer, so the hover
   * zoom magnifies it; the title / subtitle caption still renders on top.
   */
  renderItem?: (item: ThumbnailCarouselItem, state: ThumbnailCarouselItemState) => ReactNode;
  /** Replaces a thumbnail's content; the frame and active ring stay. */
  renderThumb?: (item: ThumbnailCarouselItem, state: ThumbnailCarouselItemState) => ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** Mirror the stylesheet defaults; vars are only set inline when they differ. */
const DEFAULT_THUMB_SIZE = 64;
const DEFAULT_ZOOM_SCALE = 2;
const DEFAULT_INTERVAL = 5000;
/**
 * A release navigates when offset + velocity × this projects past
 * SWIPE_RATIO of the stage width — a short flick counts like a long drag.
 */
const SWIPE_PROJECTION = 0.2;
const SWIPE_RATIO = 0.22;
/** Rubber band on a side that can't navigate (loop off, at an end). */
const EDGE_ELASTIC = 0.12;
const FREE_ELASTIC = 0.9;

const SLIDE_SPRING = { type: "spring", stiffness: 300, damping: 34, mass: 0.9 } as const;
const RING_SPRING = { type: "spring", stiffness: 520, damping: 40 } as const;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const pad = (n: number) => String(n).padStart(2, "0");

/** Deterministic fallback art per index (golden-angle hues). */
function fallbackArt(index: number): string {
  const hue = Math.round((index * 137.5 + 220) % 360);
  const hue2 = (hue + 48) % 360;
  return `radial-gradient(90% 70% at 50% 35%, hsl(${hue} 70% 62% / 0.85), transparent 65%), linear-gradient(160deg, hsl(${hue} 55% 34%), hsl(${hue2} 60% 12%))`;
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

/**
 * +1 = forward. Plain index order, except a wrap between the two ends
 * (last → first via "next") still reads as forward when looping.
 */
function stepDirection(from: number, to: number, total: number, loop: boolean): 1 | -1 {
  const delta = to - from;
  if (loop && total > 2 && Math.abs(delta) === total - 1) return delta > 0 ? -1 : 1;
  return delta >= 0 ? 1 : -1;
}

function slideVariants(transition: ThumbnailCarouselTransition): Variants {
  switch (transition) {
    case "fade":
      return {
        enter: { opacity: 0, x: 0, scale: 1 },
        center: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: EASE_OUT } },
        exit: { opacity: 0, transition: { duration: 0.4, ease: EASE_OUT } },
      };
    case "zoom":
      return {
        enter: { opacity: 0, x: 0, scale: 1.14 },
        center: {
          opacity: 1,
          x: 0,
          scale: 1,
          transition: { opacity: { duration: 0.3 }, scale: { duration: 0.6, ease: EASE_OUT } },
        },
        exit: { opacity: 0, scale: 0.94, transition: { duration: 0.32, ease: EASE_OUT } },
      };
    default:
      return {
        enter: (dir: number) => ({ x: `${dir * 100}%`, opacity: 1, scale: 1 }),
        center: { x: 0, opacity: 1, scale: 1, transition: { x: SLIDE_SPRING } },
        // The outgoing slide dims a little so the incoming one leads.
        exit: (dir: number) => ({
          x: `${dir * -100}%`,
          opacity: 0.4,
          transition: { x: SLIDE_SPRING, opacity: { duration: 0.35 } },
        }),
      };
  }
}

/** The default main image / thumbnail art: <img> for URLs, a div otherwise. */
function DefaultMedia({
  item,
  index,
  label,
}: {
  item: ThumbnailCarouselItem;
  index: number;
  /** Accessible name; omitted for decorative copies (thumbnails). */
  label?: string;
}) {
  const image = item.image?.trim();
  if (image && !isCssBackground(image)) {
    return (
      // Plain <img>: registry components stay framework-agnostic,
      // so next/image is not an option here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.media}
        src={image}
        alt={label ?? ""}
        draggable={false}
        decoding="async"
      />
    );
  }
  return (
    <div
      className={styles.media}
      style={{ background: image || fallbackArt(index) }}
      role={label ? "img" : undefined}
      aria-label={label}
    />
  );
}

type SlideProps = {
  item: ThumbnailCarouselItem;
  index: number;
  total: number;
  direction: number;
  variants: Variants;
  canPrev: boolean;
  canNext: boolean;
  onSwipe: (info: PanInfo) => void;
  renderItem?: ThumbnailCarouselProps["renderItem"];
};

/**
 * One main-stage slide. Split out so it can ask `useIsPresent`: while
 * AnimatePresence plays its exit, the old slide is hidden from assistive
 * tech, made inert and can no longer be dragged.
 */
function Slide({
  item,
  index,
  total,
  direction,
  variants,
  canPrev,
  canNext,
  onSwipe,
  renderItem,
}: SlideProps) {
  const isPresent = useIsPresent();
  const label = item.alt ?? item.title;
  return (
    <motion.div
      className={styles.slide}
      role="group"
      aria-roledescription="スライド"
      aria-label={`${index + 1} / ${total}`}
      aria-hidden={isPresent ? undefined : true}
      inert={!isPresent}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      drag={isPresent && total > 1 ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      // Full rubber band toward a neighbour, a stiff one at a dead end.
      dragElastic={{
        left: canNext ? FREE_ELASTIC : EDGE_ELASTIC,
        right: canPrev ? FREE_ELASTIC : EDGE_ELASTIC,
      }}
      dragMomentum={false}
      onDragEnd={(_, info) => onSwipe(info)}
    >
      <div className={styles.zoomLayer}>
        {renderItem ? (
          renderItem(item, { index, total, active: isPresent })
        ) : (
          <DefaultMedia item={item} index={index} label={label} />
        )}
      </div>
      {(item.title || item.subtitle) && (
        <div className={styles.caption}>
          {item.title && <span className={styles.title}>{item.title}</span>}
          {item.subtitle && <span className={styles.subtitle}>{item.subtitle}</span>}
        </div>
      )}
    </motion.div>
  );
}

/**
 * E-commerce / gallery viewer: a large main stage (slide, fade or zoom
 * transitions, swipe to navigate, optional hover-zoom lens) driven by a
 * thumbnail strip whose active ring glides between thumbs. The strip is
 * a tablist controlling the stage tabpanel, with roving focus.
 */
export function ThumbnailCarousel({
  items,
  index,
  defaultIndex = 0,
  onIndexChange,
  transition = "slide",
  thumbPosition = "bottom",
  thumbSize = DEFAULT_THUMB_SIZE,
  showCounter = true,
  zoomOnHover = true,
  zoomScale = DEFAULT_ZOOM_SCALE,
  loop = true,
  autoPlay = false,
  autoPlayInterval = DEFAULT_INTERVAL,
  renderItem,
  renderThumb,
  className,
  "aria-label": ariaLabel = "画像ギャラリー",
}: ThumbnailCarouselProps) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const total = items.length;
  const vertical = thumbPosition === "left";
  const reduceMotion = useReducedMotion() ?? false;

  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [innerIndex, setInnerIndex] = useState(defaultIndex);
  const isControlled = index !== undefined;
  const current = total ? clamp(Math.round(isControlled ? index : innerIndex), 0, total - 1) : 0;

  // Slide direction is derived from the previous index kept in state and
  // adjusted during render (React's "store info from previous renders"
  // pattern) — a ref written in goTo() can't be read while rendering.
  const [prevIndex, setPrevIndex] = useState(current);
  const [direction, setDirection] = useState<1 | -1>(1);
  if (prevIndex !== current) {
    setPrevIndex(current);
    setDirection(stepDirection(prevIndex, current, total, loop));
  }

  // Only user-driven changes (buttons, swipe, stage keys) are announced;
  // thumbs announce themselves through focus, autoplay stays silent.
  const [announce, setAnnounce] = useState(false);

  const goTo = useCallback(
    (target: number, announceChange: boolean) => {
      if (!total) return;
      const next = loop ? mod(target, total) : clamp(target, 0, total - 1);
      if (next === current) return;
      if (!isControlled) setInnerIndex(next);
      setAnnounce(announceChange);
      onIndexChange?.(next);
    },
    [total, loop, current, isControlled, onIndexChange],
  );

  const canPrev = loop ? total > 1 : current > 0;
  const canNext = loop ? total > 1 : current < total - 1;

  const handleSwipe = useCallback(
    (info: PanInfo) => {
      const width = stageRef.current?.offsetWidth || 1;
      const projected = info.offset.x + info.velocity.x * SWIPE_PROJECTION;
      if (projected < -width * SWIPE_RATIO) goTo(current + 1, true);
      else if (projected > width * SWIPE_RATIO) goTo(current - 1, true);
    },
    [current, goTo],
  );

  // ------------------------------------------------------------------
  // Keep the active thumb centred in the strip. scrollTo on the strip
  // only — scrollIntoView would also scroll the page around it. The first
  // run jumps so a non-zero defaultIndex starts in view.
  // ------------------------------------------------------------------
  const didScrollRef = useRef(false);
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = thumbRefs.current[current];
    if (!strip || !thumb) return;
    const behavior: ScrollBehavior =
      didScrollRef.current && !reduceMotion ? "smooth" : "auto";
    didScrollRef.current = true;
    if (vertical) {
      strip.scrollTo({
        top: thumb.offsetTop - (strip.clientHeight - thumb.offsetHeight) / 2,
        behavior,
      });
    } else {
      strip.scrollTo({
        left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2,
        behavior,
      });
    }
  }, [current, vertical, reduceMotion, total]);

  // ------------------------------------------------------------------
  // Hover zoom. Pointer coords go to a ref; one rAF per frame turns them
  // into a transform-origin on CSS variables. React state only flips the
  // zoomed flag on enter / leave, never per frame.
  // ------------------------------------------------------------------
  const [zoomed, setZoomed] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const zoomFrameRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(zoomFrameRef.current), []);

  const applyZoomOrigin = useCallback(() => {
    zoomFrameRef.current = 0;
    const stage = stageRef.current;
    if (!stage) return;
    // Ratios, not px: stays correct inside a transformed (scaled) ancestor.
    const rect = stage.getBoundingClientRect();
    const x = clamp(((pointerRef.current.x - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((pointerRef.current.y - rect.top) / rect.height) * 100, 0, 100);
    stage.style.setProperty("--tc-zoom-x", `${x}%`);
    stage.style.setProperty("--tc-zoom-y", `${y}%`);
  }, []);

  const onStagePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Touch and pen never zoom; a pressed button means a drag is underway.
    if (!zoomOnHover || e.pointerType !== "mouse" || e.buttons !== 0) return;
    // The nav buttons sit over the image — no lens under them.
    if ((e.target as Element).closest("button")) {
      if (zoomed) setZoomed(false);
      return;
    }
    pointerRef.current = { x: e.clientX, y: e.clientY };
    if (!zoomFrameRef.current) {
      zoomFrameRef.current = requestAnimationFrame(applyZoomOrigin);
    }
    if (!zoomed) setZoomed(true);
  };

  // A press starts a swipe; the lens and the drag would fight.
  const onStagePointerDown = () => {
    if (zoomed) setZoomed(false);
  };
  const onStagePointerLeave = () => {
    if (zoomed) setZoomed(false);
  };

  // ------------------------------------------------------------------
  // Keyboard
  // ------------------------------------------------------------------
  const onStageKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // let the nav buttons be
    let target: number | null = null;
    if (e.key === "ArrowLeft") target = current - 1;
    else if (e.key === "ArrowRight") target = current + 1;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = total - 1;
    if (target === null) return;
    e.preventDefault();
    goTo(target, true);
  };

  // Tabs follow the APG pattern: arrows always wrap (regardless of `loop`,
  // which governs prev / next / swipe), and selection follows focus.
  const onThumbKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    let target: number | null = null;
    if (e.key === prevKey) target = i - 1;
    else if (e.key === nextKey) target = i + 1;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = total - 1;
    if (target === null) return;
    e.preventDefault();
    const next = mod(target, total);
    goTo(next, false);
    thumbRefs.current[next]?.focus({ preventScroll: true });
  };

  // ------------------------------------------------------------------
  // Autoplay: pauses on hover, focus within, offscreen and hidden tabs.
  // ------------------------------------------------------------------
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!autoPlay || !root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(root);
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoPlay]);

  const playing =
    autoPlay &&
    !reduceMotion &&
    total > 1 &&
    (loop || current < total - 1) &&
    !hovered &&
    !focusWithin &&
    inView &&
    pageVisible;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => goTo(current + 1, false),
      Math.max(1000, autoPlayInterval),
    );
    return () => window.clearTimeout(timer);
  }, [playing, current, autoPlayInterval, goTo]);

  const onRootBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const vars: CSSVars = {};
  if (thumbSize !== DEFAULT_THUMB_SIZE) vars["--tc-thumb"] = `${thumbSize}px`;
  if (zoomScale !== DEFAULT_ZOOM_SCALE) vars["--tc-zoom-scale"] = zoomScale;

  const variants = slideVariants(transition);
  const activeItem = items[current];
  const ringId = `${baseId}-ring`;

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={rootRef}
        role="region"
        aria-roledescription="カルーセル"
        aria-label={ariaLabel}
        className={[styles.root, className].filter(Boolean).join(" ")}
        style={vars}
        data-thumbs={vertical ? "left" : "bottom"}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocusWithin(true)}
        onBlur={onRootBlur}
      >
        {/* Tablist first in the DOM (APG order); CSS places it visually. */}
        <motion.div
          ref={stripRef}
          layoutScroll
          role="tablist"
          aria-label="サムネイル"
          aria-orientation={vertical ? "vertical" : "horizontal"}
          className={styles.strip}
        >
          {items.map((item, i) => {
            const selected = i === current;
            const name = item.alt ?? item.title ?? "画像";
            return (
              <button
                key={item.id ?? i}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={tabId(i)}
                aria-selected={selected}
                aria-controls={panelId}
                aria-label={`${name}（${i + 1} / ${total}）`}
                tabIndex={selected ? 0 : -1}
                className={styles.thumb}
                onClick={() => goTo(i, false)}
                onKeyDown={(e) => onThumbKeyDown(e, i)}
              >
                <span className={styles.thumbMedia} aria-hidden>
                  {renderThumb ? (
                    renderThumb(item, { index: i, total, active: selected })
                  ) : (
                    <DefaultMedia item={item} index={i} />
                  )}
                </span>
                {selected && (
                  <motion.span
                    layoutId={ringId}
                    className={styles.ring}
                    transition={RING_SPRING}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </motion.div>

        <div
          ref={stageRef}
          role="tabpanel"
          id={panelId}
          aria-labelledby={total ? tabId(current) : undefined}
          tabIndex={0}
          className={styles.stage}
          data-zoomable={zoomOnHover || undefined}
          data-zoomed={zoomed || undefined}
          onKeyDown={onStageKeyDown}
          onPointerMove={onStagePointerMove}
          onPointerDown={onStagePointerDown}
          onPointerLeave={onStagePointerLeave}
        >
          <AnimatePresence initial={false} custom={direction}>
            {activeItem && (
              <Slide
                key={current}
                item={activeItem}
                index={current}
                total={total}
                direction={direction}
                variants={variants}
                canPrev={canPrev}
                canNext={canNext}
                onSwipe={handleSwipe}
                renderItem={renderItem}
              />
            )}
          </AnimatePresence>

          {showCounter && total > 0 && (
            <span className={styles.counter} aria-hidden>
              {pad(current + 1)}
              <span className={styles.counterTotal}> / {pad(total)}</span>
            </span>
          )}

          {total > 1 && (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.prev}`}
                aria-label="前の画像"
                disabled={!canPrev}
                onClick={() => goTo(current - 1, true)}
              >
                <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.next}`}
                aria-label="次の画像"
                disabled={!canNext}
                onClick={() => goTo(current + 1, true)}
              >
                <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
              </button>
            </>
          )}
        </div>

        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {announce && activeItem
            ? `${current + 1} / ${total}${activeItem.title ? `：${activeItem.title}` : ""}`
            : ""}
        </div>
      </section>
    </MotionConfig>
  );
}

export default ThumbnailCarousel;
