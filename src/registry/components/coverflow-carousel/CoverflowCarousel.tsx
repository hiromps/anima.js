"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import styles from "./CoverflowCarousel.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type CoverflowItem = {
  id?: string;
  title?: string;
  subtitle?: string;
  /** An image URL, or any CSS background value (gradients allowed). */
  image?: string;
  alt?: string;
};

export type CoverflowSlideState = {
  index: number;
  /** True for the slide facing the viewer. */
  active: boolean;
  total: number;
};

export type CoverflowCarouselProps = {
  items: CoverflowItem[];
  /** Controlled active index. Pair with `onIndexChange`. */
  index?: number;
  /** Uncontrolled initial index. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Y rotation of the side slides in deg. */
  rotate?: number;
  /** How far the side slides recede in px. */
  depth?: number;
  /** Gap between stacked side slides, as a fraction of the slide width. */
  spacing?: number;
  /** Slide width in px. Capped to ~38% of the container width. */
  slideWidth?: number;
  /** Slide height = width × aspect. */
  aspect?: number;
  /** Glossy floor reflection under each slide. */
  reflection?: boolean;
  /** Advance on a timer. Pauses on hover / focus / offscreen; off under reduced motion. */
  autoplay?: boolean;
  /** Autoplay interval in ms. */
  interval?: number;
  /** Wrap around past the last slide. */
  loop?: boolean;
  /** Dots + prev/next bar below the slides. */
  showDots?: boolean;
  className?: string;
  "aria-label"?: string;
  /** Custom slide content. The default renders gradient art + title. */
  renderItem?: (item: CoverflowItem, state: CoverflowSlideState) => ReactNode;
};

const DEFAULT_ROTATE = 55;
const DEFAULT_DEPTH = 220;
const DEFAULT_SPACING = 0.3;
const DEFAULT_SLIDE_WIDTH = 260;
const DEFAULT_INTERVAL = 3500;

/**
 * Extra offset (in slide widths) of the first neighbour on top of
 * `spacing`. A 55deg-rotated neighbour still projects ~0.6 of its width,
 * so it needs this much room to tuck behind the front slide instead of
 * cutting through it.
 */
const NEIGHBOUR_GAP = 0.55;
/** Each slide past the first neighbour recedes this fraction of `depth` more. */
const FAR_DEPTH = 0.15;
/** Slides visible on each side before they fade out. */
const MAX_RANGE = 3;
/** Width (in slides) of the fade at the edge of the visible range. */
const FADE = 0.75;
/** Spring: mass 1, ζ ≈ 0.9 — settles with a barely-there overshoot. */
const SPRING_STIFFNESS = 210;
const SPRING_DAMPING = 26;
/** Clamp per-frame dt so a backgrounded tab doesn't explode the spring. */
const MAX_DT = 1 / 30;
const SETTLE_EPSILON = 0.0005;
/** Pointer travel (px) before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 6;
/** Release velocity (slides/s) is projected this many seconds ahead. */
const FLICK_PROJECTION = 0.16;
/** Resistance past the ends when not looping. */
const RUBBER_BAND = 0.3;
/** Wheel idle time (ms) before snapping to the nearest slide. */
const WHEEL_SNAP_DELAY = 140;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mod = (v: number, n: number) => ((v % n) + n) % n;
/** Trims float noise so SSR and client style strings match. */
const round = (v: number) => Math.round(v * 1000) / 1000;

/** Signed distance of slide `i` from the scroll position, wrapped when looping. */
function offsetOf(i: number, pos: number, n: number, loop: boolean): number {
  const d = i - pos;
  return loop && n > 1 ? mod(d + n / 2, n) - n / 2 : d;
}

/**
 * When looping, slides wrap from one side to the other at ±n/2, so the
 * visible range must end (fully faded) before that point.
 */
function visibleRange(n: number, loop: boolean): number {
  return loop ? clamp((n - 1) / 2 - 0.5, 0.5, MAX_RANGE) : MAX_RANGE;
}

type Geometry = { rotate: number; depth: number; spacing: number; range: number };

type SlideFrame = {
  transform: string;
  opacity: number;
  zIndex: number;
  shade: number;
};

/**
 * The Cover Flow curve: the front slide is flat; within one step a slide
 * swings to `rotate`, jumps out to the neighbour gap and sinks to `depth`;
 * beyond that slides only stack sideways and recede a little more. The X
 * offset is unitless and multiplied by --cf-w in CSS, so the layout scales
 * with the container without JS measuring it.
 */
function slideFrame(d: number, g: Geometry): SlideFrame {
  const a = Math.abs(d);
  const s = Math.sign(d);
  const near = Math.min(a, 1);
  const far = Math.max(a - 1, 0);
  const x = s * (near * (NEIGHBOUR_GAP + g.spacing) + far * g.spacing);
  const z = -(near * g.depth + far * g.depth * FAR_DEPTH);
  // Right-hand slides turn their face toward the centre (outer edge forward).
  const ry = -s * near * g.rotate;
  return {
    transform: `translate3d(calc(${round(x)} * var(--cf-w)), 0, ${round(z)}px) rotateY(${round(ry)}deg)`,
    opacity: round(clamp((g.range + FADE - a) / FADE, 0, 1)),
    zIndex: 100 - Math.round(a * 10),
    shade: round(Math.min(near * 0.42 + far * 0.1, 0.75)),
  };
}

type EngineParams = Geometry & { n: number; loop: boolean; reduced: boolean };

/**
 * Animation state lives outside React: the position is a float of
 * "slides", a spring pulls it to an integer target, and every frame
 * writes transforms straight onto the slide elements. React only
 * re-renders when the committed index changes. The loop stops itself
 * once settled, so an idle carousel costs nothing.
 */
function createEngine() {
  let pos = 0;
  let target = 0;
  let vel = 0;
  let raf = 0;
  let last = 0;
  /** Drag / wheel in progress: the pointer owns `pos`, the spring is off. */
  let held = false;
  let params: EngineParams = {
    rotate: DEFAULT_ROTATE,
    depth: DEFAULT_DEPTH,
    spacing: DEFAULT_SPACING,
    range: MAX_RANGE,
    n: 0,
    loop: false,
    reduced: false,
  };
  const slides: (HTMLElement | null)[] = [];

  const apply = () => {
    for (let i = 0; i < params.n; i += 1) {
      const el = slides[i];
      if (!el) continue;
      const f = slideFrame(offsetOf(i, pos, params.n, params.loop), params);
      el.style.transform = f.transform;
      el.style.opacity = String(f.opacity);
      el.style.zIndex = String(f.zIndex);
      el.style.visibility = f.opacity === 0 ? "hidden" : "";
      el.style.setProperty("--cf-shade", String(f.shade));
    }
  };

  const tick = (t: number) => {
    const dt = Math.min((t - last) / 1000, MAX_DT);
    last = t;
    if (!held) {
      if (params.reduced) {
        pos = target;
        vel = 0;
      } else {
        // Two semi-implicit Euler substeps keep the stiff spring stable at 30fps.
        const h = dt / 2;
        for (let k = 0; k < 2; k += 1) {
          vel += (SPRING_STIFFNESS * (target - pos) - SPRING_DAMPING * vel) * h;
          pos += vel * h;
        }
        if (Math.abs(target - pos) < SETTLE_EPSILON && Math.abs(vel) < SETTLE_EPSILON * 10) {
          pos = target;
          vel = 0;
        }
      }
    }
    apply();
    raf = !held && (pos !== target || vel !== 0) ? requestAnimationFrame(tick) : 0;
  };

  const kick = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  return {
    slides,
    apply,
    kick,
    get pos() {
      return pos;
    },
    get target() {
      return target;
    },
    setParams(next: EngineParams) {
      params = next;
    },
    /** Spring toward `t`, optionally carrying a release velocity (slides/s). */
    setTarget(t: number, velocity?: number) {
      target = t;
      if (velocity !== undefined) vel = velocity;
      held = false;
      kick();
    },
    /** Pointer-driven position; the spring stays off until `setTarget`. */
    hold(p: number) {
      held = true;
      pos = p;
      vel = 0;
      kick();
    },
    /** Jump without animating (knob changes, loop toggles). */
    reset(p: number) {
      pos = p;
      target = p;
      vel = 0;
      apply();
    },
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

type Engine = ReturnType<typeof createEngine>;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/** Gradients and colors are used as-is; anything else is treated as a URL. */
const CSS_BACKGROUND = /gradient\(|^url\(|^#|^rgba?\(|^hsla?\(|^oklch\(|^var\(/i;

function DefaultSlide({ item }: { item: CoverflowItem }) {
  const image = item.image?.trim();
  const isUrl = !!image && !CSS_BACKGROUND.test(image);
  return (
    <>
      {isUrl ? (
        // Plain <img>: registry components stay framework-agnostic,
        // so next/image isn't available here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.art}
          src={image}
          alt={item.alt ?? item.title ?? ""}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div
          className={styles.art}
          style={image ? { background: image } : undefined}
          role={item.alt ? "img" : undefined}
          aria-label={item.alt}
        />
      )}
      <div className={styles.gloss} aria-hidden />
      {item.title || item.subtitle ? (
        <div className={styles.caption}>
          {item.title ? <p className={styles.title}>{item.title}</p> : null}
          {item.subtitle ? <p className={styles.subtitle}>{item.subtitle}</p> : null}
        </div>
      ) : null}
    </>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden focusable="false">
      <path
        d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Apple Cover Flow, modernised: the active slide faces the viewer while
 * its neighbours turn on Y and recede in Z, overlapping like a fanned
 * record crate over a glossy floor. Spring-driven between indices, with
 * drag-to-snap, horizontal wheel / trackpad scrolling, click-to-front,
 * keyboard and optional autoplay. Pure CSS 3D — no animation library.
 */
export function CoverflowCarousel({
  items,
  index,
  defaultIndex = 0,
  onIndexChange,
  rotate = DEFAULT_ROTATE,
  depth = DEFAULT_DEPTH,
  spacing = DEFAULT_SPACING,
  slideWidth,
  aspect,
  reflection = true,
  autoplay = false,
  interval = DEFAULT_INTERVAL,
  loop = false,
  showDots = true,
  className,
  "aria-label": ariaLabel = "カバーフロー",
  renderItem,
}: CoverflowCarouselProps) {
  const n = items.length;
  const isControlled = index !== undefined;
  const [innerIndex, setInnerIndex] = useState(defaultIndex);
  const current = n ? clamp(Math.round(isControlled ? index : innerIndex), 0, n - 1) : 0;
  // First-paint position, so the server already renders the fanned-out
  // layout. After mount the engine owns the transforms; these render-time
  // styles only change when geometry props change, and the layout effect
  // below immediately re-applies the live position over them.
  const [mountIndex] = useState(current);

  const reduced = usePrefersReducedMotion();
  const [announcement, setAnnouncement] = useState("");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  if (engineRef.current === null) engineRef.current = createEngine();

  // Latest values for the event handlers, which are bound once.
  const stateRef = useRef({ current, n, loop, items, isControlled, onIndexChange, spacing });
  useLayoutEffect(() => {
    stateRef.current = { current, n, loop, items, isControlled, onIndexChange, spacing };
  });

  const range = visibleRange(n, loop);

  // Geometry → engine, then repaint at the live position.
  useLayoutEffect(() => {
    const engine = engineRef.current!;
    engine.setParams({ rotate, depth, spacing, range, n, loop, reduced });
    engine.apply();
  }, [rotate, depth, spacing, range, n, loop, reduced]);

  // A different slide count or loop mode invalidates virtual positions
  // (looping lets the target run past n), so snap back onto the index.
  useLayoutEffect(() => {
    engineRef.current!.reset(stateRef.current.current);
  }, [n, loop]);

  // Index → spring target. When looping, pick the copy of the index
  // nearest the current target so 8 → 0 steps forward instead of
  // spinning back through every slide.
  useLayoutEffect(() => {
    const engine = engineRef.current!;
    const t = engine.target;
    const vt = loop && n > 0 ? t + (mod(current - t + n / 2, n) - n / 2) : current;
    if (vt !== t) engine.setTarget(vt);
  }, [current, n, loop]);

  useEffect(() => {
    const engine = engineRef.current!;
    return () => engine.destroy();
  }, []);

  /**
   * Moves the spring to virtual index `vt` and publishes the wrapped index.
   * `announce` is false for autoplay so screen readers aren't spammed.
   */
  const commit = useCallback((vt: number, announce: boolean, velocity?: number) => {
    const s = stateRef.current;
    if (!s.n) return;
    const t = s.loop ? vt : clamp(vt, 0, s.n - 1);
    engineRef.current!.setTarget(t, velocity);
    const next = mod(t, s.n);
    if (announce) {
      const title = s.items[next]?.title;
      setAnnouncement(`${next + 1} / ${s.n}${title ? `：${title}` : ""}`);
    }
    if (next !== s.current) {
      if (!s.isControlled) setInnerIndex(next);
      s.onIndexChange?.(next);
    }
  }, []);

  const step = useCallback(
    (delta: number, announce = true) => {
      commit(Math.round(engineRef.current!.target) + delta, announce);
    },
    [commit],
  );

  const goTo = useCallback(
    (i: number) => {
      const s = stateRef.current;
      const t = engineRef.current!.target;
      commit(s.loop ? t + (mod(i - t + s.n / 2, s.n) - s.n / 2) : i, true);
    },
    [commit],
  );

  /** Pixels of drag / wheel travel that move the carousel one slide. */
  const pxPerSlide = useCallback(() => {
    const slide = engineRef.current!.slides.find(Boolean);
    const w = slide?.offsetWidth || DEFAULT_SLIDE_WIDTH;
    return w * (NEIGHBOUR_GAP + stateRef.current.spacing) * 0.8;
  }, []);

  /** Soft resistance past the ends when not looping. */
  const rubberBand = useCallback((p: number) => {
    const s = stateRef.current;
    if (s.loop) return p;
    const max = s.n - 1;
    if (p < 0) return p * RUBBER_BAND;
    if (p > max) return max + (p - max) * RUBBER_BAND;
    return p;
  }, []);

  // ------------------------------------------------------------------
  // Pointer drag. Capture starts only once the press turns into a drag,
  // so a plain click still lands on the slide underneath.
  // ------------------------------------------------------------------
  const dragRef = useRef({
    id: -1,
    startX: 0,
    startY: 0,
    startPos: 0,
    lastX: 0,
    lastT: 0,
    vel: 0,
    active: false,
    unit: 1,
  });
  const suppressClickRef = useRef(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      suppressClickRef.current = false;
      dragRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPos: engineRef.current!.pos,
        lastX: e.clientX,
        lastT: e.timeStamp,
        vel: 0,
        active: false,
        unit: pxPerSlide(),
      };
    },
    [pxPerSlide],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (d.id !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      if (!d.active) {
        const dy = e.clientY - d.startY;
        if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
        d.active = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }
      const dt = Math.max(e.timeStamp - d.lastT, 1) / 1000;
      // Exponential smoothing: one jittery event shouldn't decide the flick.
      const instant = -(e.clientX - d.lastX) / d.unit / dt;
      d.vel = d.vel * 0.7 + instant * 0.3;
      d.lastX = e.clientX;
      d.lastT = e.timeStamp;
      engineRef.current!.hold(rubberBand(d.startPos - dx / d.unit));
    },
    [rubberBand],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (d.id !== e.pointerId) return;
      d.id = -1;
      if (!d.active) return;
      d.active = false;
      suppressClickRef.current = true;
      setDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be gone */
      }
      // A stale velocity (pointer held still before release) shouldn't flick.
      const vel = e.timeStamp - d.lastT > 80 ? 0 : d.vel;
      const projected = Math.round(engineRef.current!.pos + vel * FLICK_PROJECTION);
      commit(projected, true, vel);
    },
    [commit],
  );

  // ------------------------------------------------------------------
  // Horizontal wheel / trackpad: scrubs like a drag, snaps when idle.
  // Native listener because React's onWheel is passive (no preventDefault,
  // which we need to stop the browser's back/forward swipe).
  // ------------------------------------------------------------------
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let timer = 0;
    let unit = 1;
    let scrubbing = false;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical: page scroll
      e.preventDefault();
      const engine = engineRef.current!;
      if (!scrubbing) {
        scrubbing = true;
        unit = pxPerSlide();
      }
      const px = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
      engine.hold(rubberBand(engine.pos + px / unit));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        scrubbing = false;
        commit(Math.round(engine.pos), true);
      }, WHEEL_SNAP_DELAY);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
      window.clearTimeout(timer);
    };
  }, [commit, pxPerSlide, rubberBand]);

  const onSlideClick = useCallback(
    (i: number) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (i !== stateRef.current.current) goTo(i);
    },
    [goTo],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      const s = stateRef.current;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          step(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          step(1);
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(s.n - 1);
          break;
        default:
          break;
      }
    },
    [goTo, step],
  );

  // ------------------------------------------------------------------
  // Autoplay: one timeout per index, cleared whenever anything pauses it.
  // ------------------------------------------------------------------
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const playing =
    autoplay && !reduced && n > 1 && !hovered && !focused && !offscreen && !hidden && !dragging;
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      const s = stateRef.current;
      // Without loop, rewind to the start instead of stalling on the last slide.
      if (!s.loop && s.current >= s.n - 1) goTo(0);
      else step(1, false);
    }, Math.max(interval, 500));
    return () => window.clearTimeout(id);
  }, [playing, interval, current, goTo, step]);

  // Hover pause is mouse-only: a touch "enter" would never get its leave.
  const onPointerEnter = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") setHovered(true);
  }, []);
  const onPointerLeave = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") setHovered(false);
  }, []);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback((e: ReactFocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  }, []);

  const geometry: Geometry = { rotate, depth, spacing, range };

  const rootStyle: CSSVars = {};
  if (slideWidth !== undefined) rootStyle["--cf-slide-w"] = `${slideWidth}px`;
  if (aspect !== undefined) rootStyle["--cf-aspect"] = aspect;

  const rootClassName = [styles.root, className].filter(Boolean).join(" ");
  const atStart = !loop && current === 0;
  const atEnd = !loop && current === n - 1;

  return (
    <section
      ref={rootRef}
      className={rootClassName}
      style={rootStyle}
      aria-roledescription="カルーセル"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      data-reflection={reflection ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
    >
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className={styles.floor} aria-hidden />
        {items.map((item, i) => {
          const active = i === current;
          const f = slideFrame(offsetOf(i, mountIndex, n, loop), geometry);
          const slideStyle: CSSVars = {
            transform: f.transform,
            opacity: f.opacity,
            zIndex: f.zIndex,
            visibility: f.opacity === 0 ? "hidden" : undefined,
            "--cf-shade": f.shade,
          };
          const state: CoverflowSlideState = { index: i, active, total: n };
          const content = renderItem ? renderItem(item, state) : <DefaultSlide item={item} />;
          return (
            <div
              key={item.id ?? i}
              ref={(el) => {
                engineRef.current!.slides[i] = el;
              }}
              className={styles.slide}
              style={slideStyle}
              role="group"
              aria-roledescription="スライド"
              aria-label={`${i + 1} / ${n}`}
              // Side slides stay visible and clickable, but their content is
              // inert so Tab never lands inside a slide that isn't in front.
              aria-hidden={active ? undefined : true}
              data-active={active ? "" : undefined}
              onClick={() => onSlideClick(i)}
            >
              <div className={styles.face} inert={!active}>
                {content}
              </div>
              {reflection ? (
                <div className={styles.reflection} aria-hidden inert>
                  <div className={styles.reflectionInner}>{content}</div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {showDots && n > 1 ? (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label="前のスライド"
          >
            <Chevron dir="left" />
          </button>
          <div className={styles.dots}>
            {items.map((item, i) => (
              <button
                key={item.id ?? i}
                type="button"
                className={styles.dot}
                onClick={() => goTo(i)}
                aria-label={`${i + 1} 枚目へ${item.title ? `：${item.title}` : ""}`}
                aria-current={i === current ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label="次のスライド"
          >
            <Chevron dir="right" />
          </button>
        </div>
      ) : null}

      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </section>
  );
}

export default CoverflowCarousel;
