"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import styles from "./SnapCarousel.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * One slide. `image` is an image URL or any CSS background value
 * (gradients included); without it the default slide paints gradient art.
 */
export type SnapCarouselItem = {
  id?: string;
  title?: string;
  subtitle?: string;
  /** Small tag on the title row — a rating, date, badge… */
  meta?: string;
  image?: string;
  alt?: string;
};

/** What `renderItem` gets besides the item. */
export type SnapCarouselSlideState = {
  /** Slide index in `items`. */
  index: number;
  total: number;
  /** The slide the current snap stop belongs to. */
  active: boolean;
  /** At least partly inside the viewport. */
  visible: boolean;
};

/**
 * Slides per view by container width: sm < 480px ≤ md < 640px ≤ lg.
 * A plain number is the lg value; sm / md are capped at 1 / 2 from it.
 */
export type SnapCarouselSlidesPerView =
  | number
  | { sm?: number; md?: number; lg?: number };

export type SnapCarouselProps<T extends SnapCarouselItem = SnapCarouselItem> = {
  items: T[];
  slidesPerView?: SnapCarouselSlidesPerView;
  /** Space between slides in px. */
  gap?: number;
  /** Add a sliver of the next slide (1.15 / 2.2 / 3.2) to hint at more. */
  peek?: boolean;
  /** Round prev / next buttons, shown on hover or keyboard focus. */
  showArrows?: boolean;
  indicator?: "progress" | "dots" | "none";
  /** Fade the edges that have more content beyond them. */
  fade?: boolean;
  /** Buttons and arrow keys wrap around: next at the end goes to the start. */
  loop?: boolean;
  /**
   * Advance every `interval` ms, rewinding at the end. Pauses on hover,
   * focus, offscreen or in a hidden tab; off under reduced motion.
   */
  autoplay?: boolean;
  interval?: number;
  /** Where slides snap inside the viewport. */
  align?: "start" | "center";
  /** Controlled snap stop. With align "start" it is the first visible slide. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Custom slide content; the default is a gradient-art card. */
  renderItem?: (item: T, state: SnapCarouselSlideState) => ReactNode;
  className?: string;
  "aria-label"?: string;
};

const DEFAULT_SPV = { sm: 1, md: 2, lg: 3 } as const;
const DEFAULT_GAP = 16;
const DEFAULT_INTERVAL = 4500;
/** Mouse travel (px) before a press becomes a drag and clicks are eaten. */
const DRAG_THRESHOLD = 6;
/** How far (ms of current velocity) a released drag is projected ahead. */
const FLING_MS = 220;

/** Used when an item has no image, so the carousel never paints empty. */
const FALLBACK_ART = [
  "radial-gradient(120% 90% at 20% 0%, #6d5bff, #1b1640 70%)",
  "radial-gradient(120% 90% at 80% 0%, #ff7a59, #3a1410 70%)",
  "radial-gradient(120% 90% at 30% 0%, #2dd4bf, #0b2a2a 70%)",
  "radial-gradient(120% 90% at 70% 0%, #f472b6, #33102a 70%)",
  "radial-gradient(120% 90% at 50% 0%, #facc15, #2e2408 70%)",
];

/** A CSS background value rather than a URL to load in an <img>. */
const CSS_BACKGROUND = /gradient\(|^url\(|^(#|rgb|hsl|oklch|oklab|lab|lch|color-mix)/i;

function resolveSlidesPerView(spv: SnapCarouselSlidesPerView | undefined) {
  if (spv === undefined) return DEFAULT_SPV;
  if (typeof spv === "number") {
    const lg = Math.max(1, spv);
    return { sm: Math.min(lg, 1), md: Math.min(lg, 2), lg };
  }
  return {
    sm: Math.max(1, spv.sm ?? DEFAULT_SPV.sm),
    md: Math.max(1, spv.md ?? DEFAULT_SPV.md),
    lg: Math.max(1, spv.lg ?? DEFAULT_SPV.lg),
  };
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** false on the server; follows the OS setting on the client. */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function nearestIndex(positions: number[], left: number) {
  let best = 0;
  for (let i = 1; i < positions.length; i++) {
    if (Math.abs(positions[i] - left) < Math.abs(positions[best] - left)) best = i;
  }
  return best;
}

/** Default slide: gradient (or photo) art with a title row underneath. */
function DefaultSlide({ item, index }: { item: SnapCarouselItem; index: number }) {
  const image = item.image?.trim();
  const isPhoto = !!image && !CSS_BACKGROUND.test(image);
  return (
    <article className={styles.card}>
      <div className={styles.art}>
        {isPhoto ? (
          // Plain <img>: registry components stay framework-agnostic.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.artFill}
            src={image}
            alt={item.alt ?? ""}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <div
            className={styles.artFill}
            style={{ background: image || FALLBACK_ART[index % FALLBACK_ART.length] }}
            role={item.alt ? "img" : undefined}
            aria-label={item.alt || undefined}
            aria-hidden={item.alt ? undefined : true}
          />
        )}
        <span className={styles.sheen} aria-hidden />
      </div>
      {item.title || item.subtitle || item.meta ? (
        <div className={styles.meta}>
          {item.title ? <p className={styles.title}>{item.title}</p> : null}
          {item.meta ? <span className={styles.tag}>{item.meta}</span> : null}
          {item.subtitle ? <p className={styles.subtitle}>{item.subtitle}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

type DragState = {
  id: number;
  startX: number;
  startScroll: number;
  lastX: number;
  lastT: number;
  /** Pointer velocity in px/ms, smoothed. */
  velocity: number;
  active: boolean;
};

/**
 * Product / content carousel on native CSS scroll-snap (Embla / Airbnb
 * style). The browser does the scrolling — touch momentum, trackpads and
 * assistive tech keep working — and JS only adds mouse drag, buttons,
 * keyboard steps and an indicator synced from the scroll position.
 */
export function SnapCarousel<T extends SnapCarouselItem = SnapCarouselItem>({
  items,
  slidesPerView,
  gap = DEFAULT_GAP,
  peek = true,
  showArrows = true,
  indicator = "progress",
  fade = true,
  loop = false,
  autoplay = false,
  interval = DEFAULT_INTERVAL,
  align = "start",
  index,
  defaultIndex,
  onIndexChange,
  renderItem,
  className,
  "aria-label": ariaLabel = "カルーセル",
}: SnapCarouselProps<T>) {
  const trackId = useId();
  const hintId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Snap stops in scroll px, one per reachable position. Slides that all
  // clamp to the scroll end share one stop, so there can be fewer stops
  // than slides; `stopSlides` maps a stop back to its slide.
  const positionsRef = useRef<number[]>([]);
  const initialIndex = index ?? defaultIndex ?? 0;
  const currentRef = useRef(initialIndex);
  /** Stop a button / key press is heading to, so rapid presses chain. */
  const targetRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  /** Where a released drag is gliding to; snap stays off until it lands. */
  const glideRef = useRef<{ target: number; timer: number } | null>(null);
  const alignRef = useRef(align);
  const onIndexChangeRef = useRef(onIndexChange);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  // Latest props for the scroll / pointer callbacks, which are created
  // once. Declared first so it runs before the measuring effects below.
  useLayoutEffect(() => {
    alignRef.current = align;
    onIndexChangeRef.current = onIndexChange;
    reducedRef.current = reduced;
  });

  const [current, setCurrent] = useState(initialIndex);
  /** First slide of each stop; its length is the number of stops. */
  const [stopSlides, setStopSlides] = useState<number[]>(() => items.map((_, i) => i));
  const total = stopSlides.length;
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(items.length <= 1);
  const [visible, setVisible] = useState<boolean[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [onscreen, setOnscreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [userPaused, setUserPaused] = useState(false);

  /** Ends a drag glide: snap comes back on (cancel = a new drag took over). */
  const settleGlide = useCallback(() => {
    const glide = glideRef.current;
    if (!glide) return;
    window.clearTimeout(glide.timer);
    glideRef.current = null;
    if (!dragRef.current?.active) delete trackRef.current?.dataset.dragging;
  }, []);

  /** Reads scroll state once; called at most once per frame. */
  const sync = useCallback(() => {
    const track = trackRef.current;
    const root = rootRef.current;
    const positions = positionsRef.current;
    if (!track || !root) return;
    const left = track.scrollLeft;
    const max = track.scrollWidth - track.clientWidth;
    // Settled from the position itself rather than `scrollend`, which
    // isn't everywhere and may fire for the drag's own scroll.
    if (glideRef.current && !dragRef.current && Math.abs(left - glideRef.current.target) < 1) {
      settleGlide();
    }
    // Written straight to CSS variables: the bar moves every frame without
    // a React render.
    root.style.setProperty("--sc-progress", (max > 0 ? left / max : 0).toFixed(4));
    root.style.setProperty(
      "--sc-thumb",
      Math.min(1, track.clientWidth / Math.max(1, track.scrollWidth)).toFixed(4),
    );
    setAtStart(left <= 1);
    setAtEnd(left >= max - 1);
    if (!positions.length) return;
    const next = left >= max - 1 ? positions.length - 1 : nearestIndex(positions, left);
    if (targetRef.current === next) targetRef.current = null;
    if (next !== currentRef.current) {
      currentRef.current = next;
      setCurrent(next);
      onIndexChangeRef.current?.(next);
    }
  }, [settleGlide]);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const inset = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const width = track.clientWidth;
    const positions: number[] = [];
    const stopSlide: number[] = [];
    Array.from(track.children).forEach((child, i) => {
      const slide = child as HTMLElement;
      const raw =
        alignRef.current === "center"
          ? slide.offsetLeft + slide.offsetWidth / 2 - width / 2
          : slide.offsetLeft - inset;
      const pos = Math.min(max, Math.max(0, raw));
      if (positions.length && pos - positions[positions.length - 1] < 2) return;
      positions.push(pos);
      stopSlide.push(i);
    });
    positionsRef.current = positions;
    setStopSlides((prev) =>
      prev.length === stopSlide.length && prev.every((v, i) => v === stopSlide[i])
        ? prev
        : stopSlide,
    );
  }, []);

  const goTo = useCallback((target: number, announce = false) => {
    const track = trackRef.current;
    const positions = positionsRef.current;
    if (!track || !positions.length) return;
    const i = Math.min(positions.length - 1, Math.max(0, target));
    targetRef.current = i;
    track.scrollTo({ left: positions[i], behavior: reducedRef.current ? "auto" : "smooth" });
    if (announce) setAnnouncement(`${i + 1} / ${positions.length}`);
  }, []);

  /** One stop back / forward, wrapping when `loop` is on. */
  const step = useCallback(
    (dir: -1 | 1) => {
      const count = positionsRef.current.length;
      if (count < 2) return;
      let next = (targetRef.current ?? currentRef.current) + dir;
      if (next < 0 || next >= count) {
        if (!loop) return;
        next = next < 0 ? count - 1 : 0;
      }
      goTo(next, true);
    },
    [goTo, loop],
  );

  // First measure and the initial stop, before paint, so a non-zero
  // defaultIndex never flashes slide 1.
  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    const positions = positionsRef.current;
    if (track && positions.length && currentRef.current > 0) {
      track.scrollLeft = positions[Math.min(positions.length - 1, currentRef.current)];
    }
    sync();
    // Mount only: later index changes go through the controlled effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-measure when the layout inputs change; the container width itself
  // is covered by the ResizeObserver below. Keyed by the resolved counts
  // so an inline `{ sm, md, lg }` literal doesn't re-measure every render.
  const spv = resolveSlidesPerView(slidesPerView);
  const spvKey = `${spv.sm}/${spv.md}/${spv.lg}`;
  useLayoutEffect(() => {
    measure();
    sync();
  }, [items.length, align, gap, peek, spvKey, measure, sync]);

  // Scroll → rAF-throttled sync. Native listener so it can be passive.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      measure();
      sync();
    });
    ro.observe(track);
    return () => {
      track.removeEventListener("scroll", onScroll);
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [measure, sync]);

  // Slides wholly outside the viewport go inert, so Tab and screen readers
  // skip them; partly visible (peeking) slides stay usable.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === "undefined") return;
    const slides = Array.from(track.children);
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = slides.map((_, i) => prev[i] ?? true);
          let changed = next.length !== prev.length;
          for (const entry of entries) {
            const i = slides.indexOf(entry.target);
            if (i >= 0 && next[i] !== entry.isIntersecting) {
              next[i] = entry.isIntersecting;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { root: track, threshold: 0 },
    );
    slides.forEach((slide) => io.observe(slide));
    return () => io.disconnect();
  }, [items]);

  // Controlled index: scroll when the prop moves to a stop we aren't at.
  // Values we reported ourselves via onIndexChange already match.
  const prevIndexRef = useRef(index);
  useEffect(() => {
    if (index === undefined || index === prevIndexRef.current) {
      prevIndexRef.current = index;
      return;
    }
    prevIndexRef.current = index;
    if (index !== currentRef.current) goTo(index);
  }, [index, goTo]);

  // Autoplay pauses offscreen and in background tabs.
  useEffect(() => {
    if (!autoplay) return;
    const root = rootRef.current;
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    let io: IntersectionObserver | undefined;
    if (root && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => setOnscreen(entry.isIntersecting));
      io.observe(root);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
    };
  }, [autoplay]);

  const playing = autoplay && !reduced && !userPaused;
  const running = playing && !hovered && !focused && onscreen && pageVisible;

  // One timeout per stop: `current` restarts it, so a manual move gives
  // the new slide a full interval. Autoplay always rewinds at the end —
  // with loop off it would otherwise stall on the last stop.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      const count = positionsRef.current.length;
      if (count < 2) return;
      goTo(currentRef.current + 1 >= count ? 0 : currentRef.current + 1);
    }, Math.max(1000, interval));
    return () => window.clearTimeout(id);
  }, [running, interval, current, goTo]);

  /* --- Mouse drag-to-scroll. Touch and pen keep native scrolling. --- */

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    targetRef.current = null;
    dragRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startScroll: event.currentTarget.scrollLeft,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      active: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;
    const track = event.currentTarget;
    const dx = event.clientX - drag.startX;
    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      drag.active = true;
      // A fast second flick: the previous glide must not turn snap back on
      // under this drag.
      settleGlide();
      track.setPointerCapture(event.pointerId);
      // Snap off while dragging, or every scrollLeft write would snap.
      track.dataset.dragging = "";
    }
    track.scrollLeft = drag.startScroll - dx;
    const dt = event.timeStamp - drag.lastT;
    if (dt > 0) {
      drag.velocity = 0.8 * ((event.clientX - drag.lastX) / dt) + 0.2 * drag.velocity;
    }
    drag.lastX = event.clientX;
    drag.lastT = event.timeStamp;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;
    dragRef.current = null;
    if (!drag.active) return;
    const track = event.currentTarget;
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }

    // The click that follows a drag must not open the slide under the
    // pointer. It fires in the same task as pointerup, so a 0ms timeout
    // removes the guard if no click comes.
    const swallow = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    track.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => track.removeEventListener("click", swallow, { capture: true }), 0);

    // Fling: project the release velocity (ignored if the pointer rested
    // before letting go), then glide to the nearest stop. Snap returns
    // only once the glide has landed, so it never yanks mid-animation.
    const velocity = event.timeStamp - drag.lastT > 80 ? 0 : drag.velocity;
    const positions = positionsRef.current;
    if (!positions.length) {
      delete track.dataset.dragging;
      return;
    }
    const target = positions[nearestIndex(positions, track.scrollLeft - velocity * FLING_MS)];
    // sync() settles on arrival; the timeout covers an interrupted glide.
    glideRef.current = { target, timer: window.setTimeout(settleGlide, 900) };
    if (Math.abs(track.scrollLeft - target) < 1) settleGlide();
    else track.scrollTo({ left: target, behavior: reducedRef.current ? "auto" : "smooth" });
  };

  useEffect(() => () => window.clearTimeout(glideRef.current?.timer), []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Only the track itself: keys inside slide content (inputs, links with
    // their own handlers) are left alone.
    if (event.target !== event.currentTarget) return;
    const last = positionsRef.current.length - 1;
    if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "Home") goTo(0, true);
    else if (event.key === "End") goTo(last, true);
    else return;
    event.preventDefault();
  };

  const onFocus = () => setFocused(true);
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (spv.sm !== DEFAULT_SPV.sm) vars["--sc-spv-sm"] = spv.sm;
  if (spv.md !== DEFAULT_SPV.md) vars["--sc-spv-md"] = spv.md;
  if (spv.lg !== DEFAULT_SPV.lg) vars["--sc-spv-lg"] = spv.lg;
  if (gap !== DEFAULT_GAP) vars["--sc-gap"] = `${Math.max(0, gap)}px`;

  const canPrev = loop ? total > 1 : !atStart;
  const canNext = loop ? total > 1 : !atEnd;
  const activeSlide = stopSlides[current] ?? current;
  const showPause = autoplay && !reduced;

  return (
    <section
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      aria-roledescription="カルーセル"
      aria-label={ariaLabel}
      data-snap-carousel
      data-align={align}
      data-peek={peek ? undefined : "off"}
      data-fade={fade ? "on" : undefined}
      style={vars}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div
        className={styles.viewport}
        data-at-start={atStart || undefined}
        data-at-end={atEnd || undefined}
      >
        <div
          ref={trackRef}
          id={trackId}
          className={styles.track}
          role="group"
          aria-label="スライド一覧"
          aria-describedby={hintId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          // Stops the browser's native image / link drag ghost on mouse drag.
          onDragStart={(e) => e.preventDefault()}
        >
          {items.map((item, i) => {
            const isVisible = visible[i] ?? true;
            const state: SnapCarouselSlideState = {
              index: i,
              total: items.length,
              active: i === activeSlide,
              visible: isVisible,
            };
            return (
              <div
                key={item.id ?? i}
                className={styles.slide}
                role="group"
                aria-roledescription="スライド"
                aria-label={`${i + 1} / ${items.length}`}
                data-active={state.active || undefined}
                inert={!isVisible}
              >
                {renderItem ? renderItem(item, state) : <DefaultSlide item={item} index={i} />}
              </div>
            );
          })}
        </div>

        {showArrows ? (
          <>
            {/* aria-disabled (not disabled) keeps focus on the button when
                it hits an end, instead of dropping it to <body>. */}
            <button
              type="button"
              className={`${styles.arrow} ${styles.prev}`}
              aria-label="前へ"
              aria-controls={trackId}
              aria-disabled={!canPrev || undefined}
              onClick={() => canPrev && step(-1)}
            >
              <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.next}`}
              aria-label="次へ"
              aria-controls={trackId}
              aria-disabled={!canNext || undefined}
              onClick={() => canNext && step(1)}
            >
              <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {indicator !== "none" || showPause ? (
        <div className={styles.footer}>
          {indicator === "progress" ? (
            // Decorative: each slide already announces "n / total".
            <div className={styles.progress} aria-hidden>
              <span className={styles.thumb} />
            </div>
          ) : null}
          {indicator === "dots" && total > 1 ? (
            <div className={styles.dots} role="group" aria-label="表示位置">
              {Array.from({ length: total }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.dot}
                  aria-label={`${i + 1} 番目へ`}
                  aria-current={i === current ? "true" : undefined}
                  aria-controls={trackId}
                  onClick={() => goTo(i, true)}
                />
              ))}
            </div>
          ) : null}
          {showPause ? (
            <button
              type="button"
              className={styles.pause}
              aria-label={userPaused ? "自動再生を開始" : "自動再生を停止"}
              onClick={() => setUserPaused((p) => !p)}
            >
              {userPaused ? (
                <Play size={12} strokeWidth={2.4} aria-hidden />
              ) : (
                <Pause size={12} strokeWidth={2.4} aria-hidden />
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      <span id={hintId} className={styles.srOnly}>
        左右の矢印キーで移動できます
      </span>
      {/* Silent while autoplay runs, so it doesn't talk over the user. */}
      <span className={styles.srOnly} aria-live={running ? "off" : "polite"} aria-atomic="true">
        {announcement}
      </span>
    </section>
  );
}

export default SnapCarousel;
