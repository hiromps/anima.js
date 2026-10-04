"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import styles from "./ParallaxSlider.module.css";

export type ParallaxSliderTransition = "parallax" | "fade-zoom" | "curtain";

export type ParallaxSliderItem = {
  id?: string;
  /** Big caption line. Also used in the live-region announcement. */
  title?: string;
  /** Supporting copy under the title. */
  subtitle?: string;
  /** Small label above the title (e.g. "01 — ALPINE DAWN"). */
  eyebrow?: string;
  /**
   * Slide art. A CSS background value (`linear-gradient(…)`, `url(…)`, a
   * layered list) is used as-is; anything else is treated as an image URL.
   */
  image?: string;
  /** Accessible description of `image`. Omit for decorative art. */
  alt?: string;
  /** Optional call-to-action link, staggered in last. */
  cta?: { label: string; href: string };
};

export type ParallaxSliderRenderState = {
  /** 0-based position of this item in `items`. */
  index: number;
  total: number;
  /** True for the slide the slider is on (or heading to). */
  isActive: boolean;
};

export type ParallaxSliderProps = {
  items: readonly ParallaxSliderItem[];
  /**
   * "parallax": slides move horizontally, the art trails behind.
   * "fade-zoom": crossfade with a slow Ken Burns push on the active art.
   * "curtain": a clip-path wipe that reveals the next slide.
   */
  transition?: ParallaxSliderTransition;
  /**
   * How much the art lags behind its slide, 0–1. 0 = art moves with the
   * slide, 1 = art stays put while the slide frame slides over it.
   */
  parallax?: number;
  /** Advance automatically. Pauses on hover, keyboard focus, offscreen. */
  autoplay?: boolean;
  /** Autoplay interval in ms (also the progress line's fill time). */
  interval?: number;
  /** Wrap around at both ends. Off: prev/next disable at the ends. */
  loop?: boolean;
  showProgress?: boolean;
  showCounter?: boolean;
  /** Controlled slide index. Pair with `onIndexChange`. */
  index?: number;
  /** Initial slide when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /**
   * Custom art for a slide (an <img>, <video>, SVG scene…). It replaces
   * the `image` background but keeps the parallax / Ken Burns / curtain
   * treatment and the default caption.
   */
  renderItem?: (
    item: ParallaxSliderItem,
    state: ParallaxSliderRenderState,
  ) => ReactNode;
  className?: string;
  "aria-label"?: string;
};

const DEFAULT_PARALLAX = 0.6;
const DEFAULT_INTERVAL = 6000;
/** Pointer travel before a press becomes a drag (keeps link taps working). */
const DRAG_SLOP_PX = 6;
/** Release speed (px/ms) that counts as a flick regardless of distance. */
const FLICK_VELOCITY = 0.35;
/** Release distance (fraction of a slide) that changes slide without a flick. */
const DISTANCE_THRESHOLD = 0.22;
/** Rubber-band factor when dragging past either end with loop off. */
const EDGE_RESISTANCE = 0.32;

/** Programmatic (button / key / autoplay) transitions, tuned per style. */
const TWEENS: Record<
  ParallaxSliderTransition,
  { duration: number; ease: [number, number, number, number] }
> = {
  parallax: { duration: 0.95, ease: [0.65, 0.05, 0.25, 1] },
  "fade-zoom": { duration: 1.1, ease: [0.4, 0, 0.2, 1] },
  curtain: { duration: 1.05, ease: [0.76, 0, 0.24, 1] },
};

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Signed distance (in slides) from the current position to slide `i`.
 * With loop on, it wraps to the nearest copy so the last slide sits just
 * left of the first one.
 */
function slideOffset(i: number, pos: number, count: number, loop: boolean) {
  const d = i - pos;
  return loop && count > 1 ? d - count * Math.round(d / count) : d;
}

/** Gradients / url() pass through; a bare string is an image URL. */
function toBackground(image: string): string {
  return /gradient\(|url\(/.test(image) ? image : `url("${image}")`;
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Reduced-motion preference that hydrates as `false` and corrects right
 * after. framer's useReducedMotion reads the real value on the first client
 * render, which mismatches the server markup (pause button, progress mode)
 * for users with the setting on.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Caption: hidden on the way out (fast, reversed), staggered in once the
// slide has settled. Only transform/opacity animate.
const captionVariants: Variants = {
  hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const lineVariants: Variants = {
  hidden: { opacity: 0, y: 18, transition: { duration: 0.22 } },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};
// The title rises out of its own mask (the h2 clips it).
const titleVariants: Variants = {
  hidden: { opacity: 0, y: "108%", transition: { duration: 0.22 } },
  shown: {
    opacity: 1,
    y: "0%",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

type SlideProps = {
  item: ParallaxSliderItem;
  index: number;
  count: number;
  loop: boolean;
  transition: ParallaxSliderTransition;
  pos: MotionValue<number>;
  parallax: MotionValue<number>;
  isActive: boolean;
  captionShown: boolean;
  kenBurnsSeconds: number;
  reduced: boolean;
  renderItem?: ParallaxSliderProps["renderItem"];
};

/**
 * One full-bleed slide. Every visual is derived from the shared `pos`
 * motion value, so dragging and transitions never re-render React — the
 * per-style transforms are just different read-outs of the same offset.
 * `count`, `loop` and `transition` are baked into the transformers; the
 * parent remounts slides (via key) when they change.
 */
function Slide({
  item,
  index,
  count,
  loop,
  transition,
  pos,
  parallax,
  isActive,
  captionShown,
  kenBurnsSeconds,
  reduced,
  renderItem,
}: SlideProps) {
  const offset = useTransform(pos, (p) => slideOffset(index, p, count, loop));
  // Fully out of frame → skip painting it entirely.
  const visibility = useTransform(offset, (o) =>
    Math.abs(o) >= 0.999 ? "hidden" : "visible",
  );
  // The slide to the right of the boundary is the one being revealed /
  // faded in, so it stacks on top in the overlay styles.
  const zIndex = useTransform(offset, (o) => (o > 0 ? 2 : 1));

  // parallax: frame slides a full width; art counter-shifts by `parallax`
  // of that, so it travels at (1 − parallax) of the slide's speed. The
  // frame clips the art, and the visible part is always covered, so the
  // art needs no oversizing.
  const slideX = useTransform(offset, (o) => `${o * 100}%`);
  const artX = useTransform(
    [offset, parallax],
    ([o, p]: number[]) => `${-o * p * 100}%`,
  );
  const shade = useTransform(offset, (o) => Math.min(1, Math.abs(o)) * 0.55);

  // fade-zoom: the incoming slide fades in over a solid outgoing one, so
  // the crossfade never dips to the backdrop halfway through.
  const opacity = useTransform(offset, (o) => (o > 0 ? 1 - o : 1));

  // curtain: the two slides tile the frame and the seam wipes across;
  // the revealed art settles from a slight zoom.
  const clipPath = useTransform(offset, (o) =>
    o >= 0
      ? `inset(0% 0% 0% ${o * 100}%)`
      : `inset(0% ${-o * 100}% 0% 0%)`,
  );
  const curtainScale = useTransform(
    offset,
    (o) => 1 + 0.14 * Math.min(1, Math.abs(o)),
  );
  const seamX = useTransform(offset, (o) => `${o * 100}%`);
  const seamOpacity = useTransform(offset, (o) => (o > 0.002 && o < 0.998 ? 1 : 0));

  const slideStyle =
    transition === "parallax"
      ? { x: slideX, visibility }
      : transition === "fade-zoom"
        ? { opacity, zIndex, visibility }
        : { clipPath, zIndex, visibility };

  const artStyle =
    transition === "parallax"
      ? { x: artX }
      : transition === "curtain"
        ? { scale: curtainScale }
        : undefined;

  // Ken Burns: the active art pushes in slowly for a little longer than
  // the interval; the outgoing art resets only after it has faded out.
  const kenBurns =
    transition === "fade-zoom" && !reduced
      ? isActive
        ? { scale: 1.1, transition: { duration: kenBurnsSeconds, ease: "linear" as const } }
        : { scale: 1, transition: { duration: 0, delay: 1.2 } }
      : { scale: 1, transition: { duration: 0 } };

  const state: ParallaxSliderRenderState = { index, total: count, isActive };

  return (
    <motion.div
      className={styles.slide}
      style={slideStyle}
      role="group"
      aria-roledescription="スライド"
      aria-label={`${index + 1} / ${count}`}
      aria-hidden={!isActive}
      inert={!isActive}
    >
      <motion.div className={styles.art} style={artStyle}>
        <motion.div
          className={styles.artInner}
          initial={{ scale: 1 }}
          animate={kenBurns}
        >
          {renderItem ? (
            renderItem(item, state)
          ) : item.image ? (
            <div
              className={styles.artImage}
              style={{ background: toBackground(item.image) }}
              {...(item.alt
                ? { role: "img", "aria-label": item.alt }
                : { "aria-hidden": true })}
            />
          ) : (
            <div className={styles.artFallback} aria-hidden />
          )}
        </motion.div>
      </motion.div>

      {transition === "parallax" && (
        <motion.div className={styles.shade} style={{ opacity: shade }} aria-hidden />
      )}
      <div className={styles.scrim} aria-hidden />

      {(item.eyebrow || item.title || item.subtitle || item.cta) && (
        <motion.div
          className={styles.caption}
          variants={captionVariants}
          initial={false}
          animate={captionShown ? "shown" : "hidden"}
        >
          {item.eyebrow && (
            <motion.p className={styles.eyebrow} variants={lineVariants}>
              {item.eyebrow}
            </motion.p>
          )}
          {item.title && (
            <h2 className={styles.title}>
              <motion.span className={styles.titleInner} variants={titleVariants}>
                {item.title}
              </motion.span>
            </h2>
          )}
          {item.subtitle && (
            <motion.p className={styles.subtitle} variants={lineVariants}>
              {item.subtitle}
            </motion.p>
          )}
          {item.cta && (
            <motion.a
              className={styles.cta}
              href={item.cta.href}
              variants={lineVariants}
              draggable={false}
            >
              {item.cta.label}
              <ArrowUpRight size={16} strokeWidth={2.2} aria-hidden />
            </motion.a>
          )}
        </motion.div>
      )}

      {transition === "curtain" && (
        <motion.div
          className={styles.seam}
          style={{ x: seamX, opacity: seamOpacity }}
          aria-hidden
        />
      )}
    </motion.div>
  );
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startPos: number;
  width: number;
  /** null until the gesture is classified as horizontal or vertical. */
  axis: "x" | "y" | null;
  lastX: number;
  lastT: number;
  velocity: number;
};

export function ParallaxSlider({
  items,
  transition = "parallax",
  parallax = DEFAULT_PARALLAX,
  autoplay = true,
  interval = DEFAULT_INTERVAL,
  loop = true,
  showProgress = true,
  showCounter = true,
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
  renderItem,
  className,
  "aria-label": ariaLabel = "ヒーロースライダー",
}: ParallaxSliderProps) {
  const count = items.length;
  const reduced = usePrefersReducedMotion();
  const viewportId = useId();

  const rootRef = useRef<HTMLElement | null>(null);
  const [internalIndex, setInternalIndex] = useState(() =>
    clamp(defaultIndex, 0, Math.max(0, count - 1)),
  );
  const isControlled = controlledIndex !== undefined;
  const current = clamp(
    isControlled ? controlledIndex : internalIndex,
    0,
    Math.max(0, count - 1),
  );

  // Continuous slide position (unbounded with loop on). Everything visual
  // reads from it; React state only tracks which slide is "current".
  const pos = useMotionValue(current);
  // The integer position the slider is resting at / heading to.
  const targetRef = useRef(current);
  const posAnimRef = useRef<AnimationPlaybackControls | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const draggedRef = useRef(false);

  const parallaxMV = useMotionValue(clamp(parallax, 0, 1));
  useEffect(() => {
    parallaxMV.set(clamp(parallax, 0, 1));
  }, [parallax, parallaxMV]);

  // Slide whose caption is staggered in. -1 while a transition runs.
  const [shownIndex, setShownIndex] = useState(current);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);
  const [docHidden, setDocHidden] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  // Latest callbacks/props for the imperative helpers below, so they keep a
  // stable identity and never capture a stale render.
  const latest = useRef({ count, loop, transition, reduced, isControlled, onIndexChange, items });
  useEffect(() => {
    latest.current = { count, loop, transition, reduced, isControlled, onIndexChange, items };
  });

  /**
   * Moves `pos` to an integer target. `commit` reports the new index
   * (state + onIndexChange) — false when the index came in as a prop.
   */
  const animateTo = useCallback(
    (
      target: number,
      opts: {
        commit: boolean;
        announce: boolean;
        velocity?: number;
      },
    ) => {
      const { count: n, transition: tr, reduced: rm, isControlled: ctl } =
        latest.current;
      if (n === 0) return;
      const nextIndex = mod(target, n);
      const prevIndex = mod(targetRef.current, n);
      targetRef.current = target;

      if (nextIndex !== prevIndex) {
        setShownIndex(-1);
        if (opts.commit) {
          if (!ctl) setInternalIndex(nextIndex);
          latest.current.onIndexChange?.(nextIndex);
        }
        if (opts.announce) {
          const title = latest.current.items[nextIndex]?.title;
          setAnnouncement(`${nextIndex + 1} / ${n}${title ? `：${title}` : ""}`);
        }
      }

      posAnimRef.current?.stop();
      if (rm) {
        pos.set(target);
        setShownIndex(nextIndex);
        return;
      }
      // onComplete (unlike the finished promise) never fires for an
      // animation that a newer gesture stopped, so a stale caption can't
      // be revealed.
      const onComplete = () => setShownIndex(nextIndex);
      posAnimRef.current = animate(
        pos,
        target,
        opts.velocity !== undefined
          ? {
              type: "spring",
              stiffness: 210,
              damping: 30,
              mass: 1,
              velocity: opts.velocity,
              onComplete,
            }
          : { type: "tween", ...TWEENS[tr], onComplete },
      );
    },
    [pos],
  );

  /** Steps one slide. Returns false when blocked by an end (loop off). */
  const step = useCallback(
    (dir: 1 | -1, announce: boolean) => {
      const { count: n, loop: lp } = latest.current;
      const target = targetRef.current + dir;
      if (!lp && (target < 0 || target > n - 1)) return false;
      animateTo(target, { commit: true, announce });
      return true;
    },
    [animateTo],
  );

  /** Nearest integer position that shows slide `i` (shortest way round). */
  const nearestTarget = useCallback((i: number) => {
    const { count: n, loop: lp } = latest.current;
    const t = targetRef.current;
    if (!lp) return i;
    return t + slideOffset(i, t, n, true);
  }, []);

  // Controlled index (or a clamp after `items` shrank): follow it without
  // echoing it back through onIndexChange.
  useEffect(() => {
    if (count === 0 || mod(targetRef.current, count) === current) return;
    animateTo(nearestTarget(current), { commit: false, announce: false });
  }, [current, count, animateTo, nearestTarget]);

  // Loop toggled off while resting on a wrapped position: renormalize so
  // the non-looping offsets line up with the visible slide.
  useEffect(() => {
    if (loop || count === 0) return;
    const t = targetRef.current;
    if (t >= 0 && t <= count - 1) return;
    posAnimRef.current?.stop();
    const normalized = mod(t, count);
    targetRef.current = normalized;
    pos.set(normalized);
  }, [loop, count, pos]);

  useEffect(() => () => posAnimRef.current?.stop(), []);

  // ------------------------------------------------------------------
  // Autoplay: a linear 0→1 progress value that pauses where it stands
  // ------------------------------------------------------------------
  const progress = useMotionValue(0);
  const autoplayOn = autoplay && !reduced && count > 1;
  const atEnd = !loop && current === count - 1;
  const paused =
    hovered || focused || !inView || docHidden || dragging || userPaused || atEnd;

  // Declared before the runner so a slide change resets first.
  useEffect(() => {
    progress.set(0);
  }, [current, progress]);

  useEffect(() => {
    if (!autoplayOn || paused) return;
    const remaining = Math.max(0, 1 - progress.get()) * (interval / 1000);
    const controls = animate(progress, 1, {
      duration: remaining,
      ease: "linear",
      onComplete: () => {
        step(1, false);
      },
    });
    return () => controls.stop();
  }, [autoplayOn, paused, interval, current, progress, step]);

  // Offscreen and background-tab pause.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const onVisibility = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ------------------------------------------------------------------
  // Pointer drag with velocity
  // ------------------------------------------------------------------
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (count < 2 || e.button !== 0) return;
      // The HUD buttons are plain clicks, never a drag.
      if ((e.target as Element).closest("button")) return;
      draggedRef.current = false;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPos: pos.get(),
        // Rendered width, not layout width: inside a scaled preview the
        // pointer deltas are in screen pixels.
        width: e.currentTarget.getBoundingClientRect().width || 1,
        axis: null,
        lastX: e.clientX,
        lastT: e.timeStamp,
        velocity: 0,
      };
    },
    [count, pos],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (d.axis === null) {
        if (Math.hypot(dx, dy) < DRAG_SLOP_PX) return;
        d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (d.axis === "y") {
          // Vertical intent: let the page scroll (touch-action: pan-y).
          dragRef.current = null;
          return;
        }
        // Capture only now, so a tap on a CTA link still clicks it.
        posAnimRef.current?.stop();
        d.startPos = pos.get();
        d.startX = e.clientX;
        draggedRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }

      const { count: n, loop: lp } = latest.current;
      let next = d.startPos - (e.clientX - d.startX) / d.width;
      if (!lp) {
        if (next < 0) next *= EDGE_RESISTANCE;
        else if (next > n - 1) next = n - 1 + (next - (n - 1)) * EDGE_RESISTANCE;
      }
      pos.set(next);

      const dt = e.timeStamp - d.lastT;
      if (dt > 0) {
        const v = (e.clientX - d.lastX) / dt;
        d.velocity = d.velocity * 0.2 + v * 0.8;
      }
      d.lastX = e.clientX;
      d.lastT = e.timeStamp;
    },
    [pos],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      dragRef.current = null;
      if (d.axis !== "x") return;
      setDragging(false);
      // Touch drags produce no trailing click; clear the flag after this
      // task so it can't swallow a later keyboard-activated click.
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 0);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be gone */
      }

      const { count: n, loop: lp } = latest.current;
      // A pause before letting go means no flick.
      const velocity = e.timeStamp - d.lastT > 90 ? 0 : d.velocity;
      const base = targetRef.current;
      const delta = pos.get() - base;
      let dir = 0;
      if (velocity < -FLICK_VELOCITY) dir = 1;
      else if (velocity > FLICK_VELOCITY) dir = -1;
      else if (Math.abs(delta) > DISTANCE_THRESHOLD) dir = Math.sign(delta);

      let target = base + dir;
      if (!lp) target = clamp(target, 0, n - 1);
      animateTo(target, {
        commit: true,
        announce: false,
        // px/ms → slides/s, in pos units (dragging right lowers pos).
        velocity: (-velocity * 1000) / d.width,
      });
    },
    [animateTo, pos],
  );

  // Swallow the click that ends a drag, so a swipe over a CTA doesn't
  // follow the link.
  const onClickCapture = useCallback((e: ReactMouseEvent) => {
    if (!draggedRef.current) return;
    draggedRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (count < 2) return;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          step(1, true);
          break;
        case "ArrowLeft":
          e.preventDefault();
          step(-1, true);
          break;
        case "Home":
          e.preventDefault();
          animateTo(nearestTarget(0), { commit: true, announce: true });
          break;
        case "End":
          e.preventDefault();
          animateTo(nearestTarget(count - 1), { commit: true, announce: true });
          break;
        default:
          break;
      }
    },
    [count, step, animateTo, nearestTarget],
  );

  // Pause for keyboard focus only — a mouse click on prev/next shouldn't
  // freeze autoplay until the user clicks elsewhere.
  const onFocus = useCallback((e: ReactFocusEvent<HTMLElement>) => {
    if ((e.target as Element).matches(":focus-visible")) setFocused(true);
  }, []);
  const onBlur = useCallback((e: ReactFocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  }, []);

  const rootClassName = [styles.root, className].filter(Boolean).join(" ");
  const kenBurnsSeconds = interval / 1000 + 2;
  const canPrev = loop || current > 0;
  const canNext = loop || current < count - 1;
  // Without autoplay the line doubles as a position indicator.
  const progressScale: MotionValue<number> | number = autoplayOn
    ? progress
    : count > 0
      ? (current + 1) / count
      : 0;

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={rootRef}
        className={rootClassName}
        aria-roledescription="カルーセル"
        aria-label={ariaLabel}
        tabIndex={0}
        data-transition={transition}
        data-dragging={dragging || undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHovered(false);
        }}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <div className={styles.viewport} id={viewportId}>
          {items.map((item, i) => (
            <Slide
              key={`${item.id ?? i}-${transition}-${count}-${loop}`}
              item={item}
              index={i}
              count={count}
              loop={loop}
              transition={transition}
              pos={pos}
              parallax={parallaxMV}
              isActive={i === current}
              captionShown={i === shownIndex}
              kenBurnsSeconds={kenBurnsSeconds}
              reduced={reduced}
              renderItem={renderItem}
            />
          ))}
        </div>

        <div className={styles.grain} aria-hidden />

        {count > 0 && (
          <div className={styles.hud}>
            <div className={styles.meta}>
              {showCounter && (
                <div className={styles.counter} aria-hidden>
                  <span className={styles.counterCurrent}>
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={current}
                        className={styles.counterDigit}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: "0%", opacity: 1 }}
                        exit={{ y: "-100%", opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {pad2(current + 1)}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className={styles.counterTotal}>/ {pad2(count)}</span>
                </div>
              )}
              {showProgress && (
                <div className={styles.progress} aria-hidden>
                  <motion.span
                    className={styles.progressFill}
                    data-static={!autoplayOn || undefined}
                    style={{ scaleX: progressScale }}
                  />
                </div>
              )}
            </div>

            {count > 1 && (
              <div className={styles.controls}>
                {autoplayOn && (
                  <button
                    type="button"
                    className={styles.control}
                    onClick={() => setUserPaused((p) => !p)}
                    aria-label={userPaused ? "自動再生を再開" : "自動再生を停止"}
                    aria-pressed={userPaused}
                  >
                    {userPaused ? (
                      <Play size={16} strokeWidth={2.2} aria-hidden />
                    ) : (
                      <Pause size={16} strokeWidth={2.2} aria-hidden />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.control}
                  onClick={() => step(-1, true)}
                  disabled={!canPrev}
                  aria-label="前のスライド"
                  aria-controls={viewportId}
                >
                  <ArrowLeft size={18} strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  className={styles.control}
                  onClick={() => step(1, true)}
                  disabled={!canNext}
                  aria-label="次のスライド"
                  aria-controls={viewportId}
                >
                  <ArrowRight size={18} strokeWidth={2} aria-hidden />
                </button>
              </div>
            )}
          </div>
        )}

        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
      </section>
    </MotionConfig>
  );
}

export default ParallaxSlider;
