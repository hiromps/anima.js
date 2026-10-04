"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import styles from "./RingCarousel.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type RingCarouselItem = {
  id?: string;
  title?: string;
  subtitle?: string;
  /**
   * Card art. A CSS background value (`linear-gradient(…)`, `url(…)`) is
   * used as-is; anything else is treated as an image URL.
   */
  image?: string;
  /** Accessible description of the art (the art is a background image). */
  alt?: string;
};

export type RingCarouselItemState = {
  /** 0-based position of this item in `items`. */
  index: number;
  total: number;
  /** True for the card currently facing the viewer. */
  active: boolean;
};

export type RingCarouselProps = {
  items: readonly RingCarouselItem[];
  /** Ring radius in px. Omit to derive it from the card count and width. */
  radius?: number;
  /** Card width in px (before the fit-to-container scale). */
  cardWidth?: number;
  /** Card height = width × aspect. */
  aspect?: number;
  /** Downward viewing angle in deg — the "carousel on a table" tilt. */
  tilt?: number;
  autoRotate?: boolean;
  /** Auto-rotation speed in deg/s. */
  speed?: number;
  /** Settle on the nearest card face after a drag or hover stop. */
  snap?: boolean;
  /** Show the far half of the ring (cards' backs) through the gaps. */
  backfaceVisible?: boolean;
  /** 0–1: how much cards darken as they turn away from the viewer. */
  depthShading?: number;
  /** Drag sensitivity in deg of rotation per px. */
  dragSensitivity?: number;
  /** Inertia decay per 60 fps frame; closer to 1 glides longer. */
  friction?: number;
  /** Soft glow pooled on the floor under the ring. */
  floorShadow?: boolean;
  /** Floor glow colour. */
  glowColor?: string;
  /** Previous / next buttons and the counter under the ring. */
  showControls?: boolean;
  /** Component height (number = px). The ring scales to fit inside it. */
  height?: number | string;
  /** Controlled front card. */
  index?: number;
  /** Uncontrolled initial front card. */
  defaultIndex?: number;
  /** Fires whenever a different card reaches the front. */
  onIndexChange?: (index: number) => void;
  /** Replaces the default card content; the card frame and shading stay. */
  renderItem?: (item: RingCarouselItem, state: RingCarouselItemState) => ReactNode;
  className?: string;
  "aria-label"?: string;
};

const DEFAULT_CARD_WIDTH = 210;
const DEFAULT_ASPECT = 1.32;
const DEFAULT_TILT = 10;
const DEFAULT_SPEED = 10;
const DEFAULT_DEPTH_SHADING = 0.65;
const DEFAULT_DRAG_SENSITIVITY = 0.25;
const DEFAULT_FRICTION = 0.95;
const DEFAULT_HEIGHT = 460;
const DEFAULT_GLOW = "#8b5cf6";

/** Gap between neighbouring cards, as a fraction of the card width. */
const CARD_GAP = 0.14;
/** Inner padding of the viewport the ring is fitted into. */
const FIT_PADDING = 16;
/** Pointer travel before a press becomes a drag (keeps clicks clicks). */
const DRAG_THRESHOLD = 5;
/** Critically damped spring used for snapping and stepping. */
const SPRING_K = 90;
const SPRING_C = 2 * Math.sqrt(SPRING_K);
/** Time constant (s) of the auto-rotation easing in and out. */
const AUTO_EASE = 0.45;
/** Autoplay waits this long after a drag / step before easing back in. */
const RESUME_DELAY = 1800;
const MAX_RELEASE_VELOCITY = 720;

const mod = (n: number, m: number) => ((n % m) + m) % m;

function artBackground(image: string) {
  return /gradient\(|^url\(/i.test(image.trim()) ? image : `url("${image}")`;
}

/** Deterministic fallback art (golden-angle hues) for items without an image. */
function fallbackArt(index: number) {
  const hue = Math.round((index * 137.5) % 360);
  return `radial-gradient(120% 80% at 20% 10%, hsl(${(hue + 40) % 360} 85% 70% / .9), transparent 60%), linear-gradient(160deg, hsl(${hue} 70% 45%), hsl(${(hue + 60) % 360} 70% 18%))`;
}

type Geometry = {
  radius: number;
  cardW: number;
  cardH: number;
  perspective: number;
  /** Projected extent of the ring (incl. floor glow) at scale 1. */
  extentW: number;
  extentH: number;
  /** Projected vertical centre of that extent, relative to the ring centre. */
  centerY: number;
};

/**
 * Projects the ring's extreme points through the tilt and perspective so the
 * component can fit the whole composition into its box — the front card is
 * magnified by perspective and the back row rises with the tilt, so the
 * un-projected card size would misjudge both.
 */
function computeGeometry(
  count: number,
  cardW: number,
  aspect: number,
  tiltDeg: number,
  radiusProp: number | undefined,
): Geometry {
  const cardH = cardW * aspect;
  const autoRadius =
    count > 2 ? (cardW * (1 + CARD_GAP)) / (2 * Math.tan(Math.PI / count)) : cardW;
  const radius = Math.max(radiusProp ?? autoRadius, cardW * 0.6);
  // Scales with the ring so front/back size contrast stays the same at any
  // count: front ≈ 1.35×, back ≈ 0.8×.
  const perspective = radius * 3 + 400;
  const t = (tiltDeg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);

  // rotateX(-tilt): y' = y·cos + z·sin, z' = z·cos − y·sin.
  const projectY = (y: number, z: number) => {
    const yp = y * cos + z * sin;
    const zp = z * cos - y * sin;
    return (yp * perspective) / (perspective - zp);
  };
  const floorY = cardH / 2 + 18;
  const ys = [
    projectY(-cardH / 2, radius),
    projectY(cardH / 2, radius),
    projectY(-cardH / 2, -radius),
    projectY(cardH / 2, -radius),
    // Front edge of the floor glow.
    projectY(floorY, radius * 1.05),
  ];
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Widest points: the side cards (edge-on at x = ±r, near edge at z = w/2)
  // and the magnified front card.
  const sideX = (radius * perspective) / (perspective - (cardW / 2) * cos);
  const frontX = (cardW / 2) * (perspective / (perspective - radius * cos));
  const extentW = 2 * Math.max(sideX + 8, frontX);

  return {
    radius,
    cardW,
    cardH,
    perspective,
    extentW,
    extentH: maxY - minY,
    centerY: (minY + maxY) / 2,
  };
}

// useLayoutEffect warns during SSR in older React; the fit has to land
// before paint on the client to avoid a one-frame oversized ring.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function RingCarousel({
  items,
  radius: radiusProp,
  cardWidth = DEFAULT_CARD_WIDTH,
  aspect = DEFAULT_ASPECT,
  tilt = DEFAULT_TILT,
  autoRotate = true,
  speed = DEFAULT_SPEED,
  snap = true,
  backfaceVisible = true,
  depthShading = DEFAULT_DEPTH_SHADING,
  dragSensitivity = DEFAULT_DRAG_SENSITIVITY,
  friction = DEFAULT_FRICTION,
  floorShadow = true,
  glowColor = DEFAULT_GLOW,
  showControls = true,
  height = DEFAULT_HEIGHT,
  index,
  defaultIndex = 0,
  onIndexChange,
  renderItem,
  className,
  "aria-label": ariaLabel = "リングカルーセル",
}: RingCarouselProps) {
  const count = Math.max(items.length, 1);
  const step = 360 / count;
  const geo = useMemo(
    () => computeGeometry(count, cardWidth, aspect, tilt, radiusProp),
    [count, cardWidth, aspect, tilt, radiusProp],
  );

  const rootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const spinRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeCacheRef = useRef<number[]>([]);

  // The initial rotation is fixed for the component's lifetime so the
  // inline transform React renders never changes between renders — React
  // then never overwrites the transform the rAF loop writes.
  const [initialIndex] = useState(() => mod(Math.round(index ?? defaultIndex), count));
  const [initialRot] = useState(() => -initialIndex * step);
  /** Step the current rotation was computed with (detects count changes). */
  const stepSeenRef = useRef(step);

  // Everything the loop reads lives in refs so the loop never restarts.
  const rotationRef = useRef(initialRot);
  const velocityRef = useRef(0); // deg/s, inertia + spring
  const autoVelRef = useRef(0); // deg/s, eased auto-rotation
  const targetRef = useRef<number | null>(null);
  const resumeAtRef = useRef(0);
  const draggingRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const visibleRef = useRef(true);
  const reducedRef = useRef(false);
  const announceRef = useRef(false);
  const activeRef = useRef(initialIndex);
  const lastReportedRef = useRef(initialIndex);
  const rafRef = useRef(0);
  const resumeTimerRef = useRef(0);
  const unmountedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    lastX: number;
    lastT: number;
    dragging: boolean;
  } | null>(null);

  const propsRef = useRef({
    step,
    count,
    autoRotate,
    speed,
    snap,
    depthShading,
    dragSensitivity,
    friction,
    onIndexChange,
  });
  useEffect(() => {
    propsRef.current = {
      step,
      count,
      autoRotate,
      speed,
      snap,
      depthShading,
      dragSensitivity,
      friction,
      onIndexChange,
    };
  });

  const [active, setActive] = useState(initialIndex);
  const [announcement, setAnnouncement] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // ------------------------------------------------------------------
  // Frame writer: ring transform, per-card shading, active index
  // ------------------------------------------------------------------
  const paint = useCallback(() => {
    const { step: stepDeg, count: n, depthShading: depth } = propsRef.current;
    const rot = rotationRef.current;
    const spin = spinRef.current;
    if (spin) spin.style.transform = `rotateY(${rot}deg)`;

    // Shading is a CSS var the face overlays read: one write per card, and
    // only when the quantized value changes, so a slow spin costs a handful
    // of style writes per second rather than one per card per frame.
    const cards = cardRefs.current;
    const cache = shadeCacheRef.current;
    for (let i = 0; i < n; i += 1) {
      const card = cards[i];
      if (!card) continue;
      const facing = Math.cos(((i * stepDeg + rot) * Math.PI) / 180); // 1 front, −1 back
      const shade = Math.round(((depth * (1 - facing)) / 2) * 40) / 40;
      if (cache[i] !== shade) {
        cache[i] = shade;
        card.style.setProperty("--rc-shade", String(shade));
      }
    }

    const next = mod(Math.round(-rot / stepDeg), n);
    if (next !== activeRef.current) {
      activeRef.current = next;
      lastReportedRef.current = next;
      setActive(next);
      if (announceRef.current) {
        const item = itemsRef.current[next];
        setAnnouncement(`${item?.title ? `${item.title} — ` : ""}${next + 1} / ${n}`);
      }
      propsRef.current.onIndexChange?.(next);
    }
  }, []);

  const nearestFace = useCallback((rot: number) => {
    const { step: stepDeg } = propsRef.current;
    return Math.round(rot / stepDeg) * stepDeg;
  }, []);

  // ------------------------------------------------------------------
  // Main loop — runs only while something moves and the ring is on screen
  // ------------------------------------------------------------------
  const tick = useCallback(
    // Named so the frame can re-schedule itself without reading `tick`.
    function frame(now: number) {
      const p = propsRef.current;
      const dt = Math.min((now - (lastTimeRef.current || now)) / 1000, 1 / 20);
      lastTimeRef.current = now;

      const autoAllowed =
        p.autoRotate &&
        !reducedRef.current &&
        !draggingRef.current &&
        !hoveredRef.current &&
        !focusedRef.current &&
        targetRef.current === null &&
        now >= resumeAtRef.current;
      // Eases in and out instead of starting/stopping dead — hovering
      // reads as the carousel coasting to a halt under the cursor.
      const autoGoal = autoAllowed ? p.speed : 0;
      const prevAuto = autoVelRef.current;
      autoVelRef.current += (autoGoal - prevAuto) * (1 - Math.exp(-dt / AUTO_EASE));
      if (Math.abs(autoVelRef.current) < 0.05 && autoGoal === 0) {
        autoVelRef.current = 0;
        // Coasted to a stop on hover/focus: settle onto a face.
        if (prevAuto !== 0 && p.snap && !draggingRef.current && targetRef.current === null) {
          targetRef.current = nearestFace(rotationRef.current);
        }
      }

      if (!draggingRef.current) {
        rotationRef.current -= autoVelRef.current * dt;
        const target = targetRef.current;
        if (target !== null) {
          const diff = target - rotationRef.current;
          velocityRef.current += (diff * SPRING_K - velocityRef.current * SPRING_C) * dt;
          rotationRef.current += velocityRef.current * dt;
          if (Math.abs(diff) < 0.02 && Math.abs(velocityRef.current) < 0.5) {
            rotationRef.current = target;
            velocityRef.current = 0;
            targetRef.current = null;
            // Announcements belong to button/keyboard steps only; once the
            // step lands, later auto-rotation passes stay silent.
            announceRef.current = false;
          }
        } else if (Math.abs(velocityRef.current) > 0.5) {
          rotationRef.current += velocityRef.current * dt;
          velocityRef.current *= Math.pow(p.friction, dt * 60);
        } else {
          velocityRef.current = 0;
        }
      }

      paint();

      const moving =
        draggingRef.current ||
        targetRef.current !== null ||
        velocityRef.current !== 0 ||
        autoVelRef.current !== 0 ||
        (autoAllowed && p.speed !== 0);
      if (moving && visibleRef.current) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = 0;
      }
    },
    [nearestFace, paint],
  );

  const kick = useCallback(() => {
    if (rafRef.current || !visibleRef.current || unmountedRef.current) return;
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  /** Holds autoplay for a moment after user input, then wakes the loop. */
  const holdAutoplay = useCallback(() => {
    resumeAtRef.current = performance.now() + RESUME_DELAY;
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(kick, RESUME_DELAY + 20);
  }, [kick]);

  const goTo = useCallback(
    (to: number, announce: boolean) => {
      const { step: stepDeg, count: n } = propsRef.current;
      const desired = -mod(to, n) * stepDeg;
      // Shortest way round from wherever the ring is now.
      const cur = targetRef.current ?? rotationRef.current;
      const target = desired + Math.round((cur - desired) / 360) * 360;
      announceRef.current = announce;
      holdAutoplay();
      if (reducedRef.current) {
        rotationRef.current = target;
        velocityRef.current = 0;
        targetRef.current = null;
        paint();
        announceRef.current = false;
        return;
      }
      targetRef.current = target;
      kick();
    },
    [holdAutoplay, kick, paint],
  );

  // Reduced motion, visibility, start/stop. Count or geometry changes
  // re-run this so the new ring is painted immediately.
  useEffect(() => {
    unmountedRef.current = false;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      reducedRef.current = mq.matches;
      kick();
    };
    onMotion();
    mq.addEventListener("change", onMotion);

    const root = rootRef.current;
    const io =
      root && "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visibleRef.current = entry.isIntersecting;
            if (entry.isIntersecting) kick();
          })
        : null;
    if (root && io) io.observe(root);

    return () => {
      mq.removeEventListener("change", onMotion);
      io?.disconnect();
      // A pending autoplay-resume timer must not restart the loop later.
      unmountedRef.current = true;
      window.clearTimeout(resumeTimerRef.current);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [kick]);

  // Prop changes that affect motion or the ring: repaint and wake the loop.
  useEffect(() => {
    shadeCacheRef.current = [];
    // A count change remaps degrees to cards: keep the same card in front.
    if (stepSeenRef.current !== step) {
      const prevStep = stepSeenRef.current;
      stepSeenRef.current = step;
      const idx = Math.round(-rotationRef.current / prevStep);
      rotationRef.current = -idx * step;
      targetRef.current = null;
    }
    paint();
    kick();
  }, [step, depthShading, autoRotate, speed, snap, paint, kick]);

  // Controlled index: only react when the parent asks for a card we did not
  // just report — otherwise echoing onIndexChange back would fight the spin.
  useEffect(() => {
    if (index === undefined) return;
    const want = mod(Math.round(index), count);
    if (want === lastReportedRef.current) return;
    lastReportedRef.current = want;
    goTo(want, false);
  }, [index, count, goTo]);

  // Fit the projected ring into the viewport box (both axes).
  useIsoLayoutEffect(() => {
    const vp = viewportRef.current;
    const root = rootRef.current;
    if (!vp || !root) return;
    const fit = () => {
      const w = vp.clientWidth - FIT_PADDING * 2;
      const h = vp.clientHeight - FIT_PADDING * 2;
      if (w <= 0 || h <= 0) return;
      const s = Math.min(1, w / geo.extentW, h / geo.extentH);
      root.style.setProperty("--rc-fit", s.toFixed(4));
      root.style.setProperty("--rc-center-y", `${(-geo.centerY * s).toFixed(2)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [geo]);

  // ------------------------------------------------------------------
  // Pointer: drag with inertia, snap on release
  // ------------------------------------------------------------------
  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || pointerRef.current) return;
    // Don't hijack presses on the controls.
    if ((e.target as HTMLElement).closest("button")) return;
    pointerRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      lastX: e.clientX,
      lastT: e.timeStamp,
      dragging: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const ptr = pointerRef.current;
    if (!ptr || ptr.id !== e.pointerId) return;
    if (!ptr.dragging) {
      if (Math.abs(e.clientX - ptr.startX) < DRAG_THRESHOLD) return;
      // Capture only once it's really a drag, so clicks inside custom
      // renderItem content keep working.
      ptr.dragging = true;
      draggingRef.current = true;
      targetRef.current = null;
      velocityRef.current = 0;
      autoVelRef.current = 0;
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer may already be gone */
      }
      kick();
    }
    const dx = e.clientX - ptr.lastX;
    const dtMs = Math.max(e.timeStamp - ptr.lastT, 1);
    ptr.lastX = e.clientX;
    ptr.lastT = e.timeStamp;
    const delta = dx * propsRef.current.dragSensitivity;
    rotationRef.current += delta;
    // Smoothed release velocity (deg/s): one jittery last event shouldn't
    // decide the throw.
    const instant = (delta / dtMs) * 1000;
    velocityRef.current = velocityRef.current * 0.6 + instant * 0.4;
  };

  const endPointer = (e: ReactPointerEvent<HTMLElement>) => {
    const ptr = pointerRef.current;
    if (!ptr || ptr.id !== e.pointerId) return;
    pointerRef.current = null;
    if (!ptr.dragging) return;
    draggingRef.current = false;
    setIsDragging(false);
    // A finger that stopped before lifting shouldn't fling.
    if (e.timeStamp - ptr.lastT > 90) velocityRef.current = 0;
    const p = propsRef.current;
    const v = Math.max(-MAX_RELEASE_VELOCITY, Math.min(MAX_RELEASE_VELOCITY, velocityRef.current));
    if (reducedRef.current) {
      velocityRef.current = 0;
      if (p.snap) rotationRef.current = nearestFace(rotationRef.current);
    } else if (p.snap) {
      // Snap where the inertia would have carried it, keeping the release
      // velocity as the spring's start so the throw flows into the settle.
      const f = Math.min(p.friction, 0.995);
      const projected = rotationRef.current + (v / 60) * (f / (1 - f));
      targetRef.current = nearestFace(projected);
      velocityRef.current = v;
    } else {
      velocityRef.current = v;
    }
    announceRef.current = false;
    holdAutoplay();
    kick();
  };

  const onPointerEnter = (e: ReactPointerEvent<HTMLElement>) => {
    // Touch has no hover: a tap must not freeze the autoplay.
    if (e.pointerType !== "mouse") return;
    hoveredRef.current = true;
    kick();
  };
  const onPointerLeave = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    hoveredRef.current = false;
    kick();
  };

  // Only keyboard focus pauses: clicking/dragging focuses the region too,
  // and that must not stop the autoplay until the user clicks elsewhere.
  const onFocus = (e: ReactFocusEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).matches(":focus-visible")) {
      focusedRef.current = true;
      kick();
    }
  };
  const onBlur = (e: ReactFocusEvent<HTMLElement>) => {
    if (rootRef.current?.contains(e.relatedTarget as Node | null)) return;
    focusedRef.current = false;
    kick();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const cur = activeRef.current;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        goTo(cur - 1, true);
        break;
      case "ArrowRight":
        e.preventDefault();
        goTo(cur + 1, true);
        break;
      case "Home":
        e.preventDefault();
        goTo(0, true);
        break;
      case "End":
        e.preventDefault();
        goTo(count - 1, true);
        break;
      default:
        break;
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const rootStyle: CSSVars = {
    // Derived from the count, so always inline.
    "--rc-step": `${step}deg`,
    "--rc-radius": `${geo.radius}px`,
    "--rc-perspective": `${geo.perspective}px`,
    "--rc-floor-y": `${geo.cardH / 2 + 18}px`,
  };
  if (cardWidth !== DEFAULT_CARD_WIDTH) rootStyle["--rc-card-w"] = `${cardWidth}px`;
  if (cardWidth !== DEFAULT_CARD_WIDTH || aspect !== DEFAULT_ASPECT)
    rootStyle["--rc-card-h"] = `${geo.cardH}px`;
  if (tilt !== DEFAULT_TILT) rootStyle["--rc-tilt"] = `${tilt}deg`;
  if (glowColor !== DEFAULT_GLOW) rootStyle["--rc-glow"] = glowColor;
  if (height !== DEFAULT_HEIGHT)
    rootStyle["--rc-height"] = typeof height === "number" ? `${height}px` : height;

  const rootClassName = [
    styles.root,
    isDragging ? styles.dragging : "",
    showControls ? "" : styles.noControls,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      ref={rootRef}
      className={rootClassName}
      style={rootStyle}
      tabIndex={0}
      aria-roledescription="カルーセル"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <div ref={viewportRef} className={styles.viewport}>
        <div className={styles.scene}>
          <div className={styles.tilt}>
            {floorShadow && <div className={styles.floor} aria-hidden="true" />}
            <div
              ref={spinRef}
              className={styles.spin}
              style={{ transform: `rotateY(${initialRot}deg)` }}
            >
              {items.map((item, i) => {
                const isActive = i === active;
                const facing = Math.cos(((i * step + initialRot) * Math.PI) / 180);
                const initialShade =
                  Math.round(((depthShading * (1 - facing)) / 2) * 40) / 40;
                const state: RingCarouselItemState = {
                  index: i,
                  total: items.length,
                  active: isActive,
                };
                const art = item.image ? artBackground(item.image) : fallbackArt(i);
                return (
                  <div
                    key={item.id ?? i}
                    ref={(node) => {
                      cardRefs.current[i] = node;
                    }}
                    className={styles.card}
                    style={{ "--i": i, "--rc-shade": initialShade } as CSSVars}
                    role="group"
                    aria-roledescription="スライド"
                    aria-label={`${i + 1} / ${items.length}`}
                    aria-hidden={!isActive}
                    inert={!isActive}
                    data-active={isActive || undefined}
                  >
                    <div className={`${styles.face} ${styles.front}`}>
                      {renderItem ? (
                        renderItem(item, state)
                      ) : (
                        <div
                          className={styles.art}
                          style={{ backgroundImage: art }}
                          role={item.alt ? "img" : undefined}
                          aria-label={item.alt}
                        >
                          <span className={styles.chip} aria-hidden="true">
                            {pad(i + 1)}
                          </span>
                          {(item.title || item.subtitle) && (
                            <div className={styles.caption}>
                              {item.subtitle && (
                                <span className={styles.subtitle}>{item.subtitle}</span>
                              )}
                              {item.title && <span className={styles.title}>{item.title}</span>}
                            </div>
                          )}
                        </div>
                      )}
                      <span className={styles.shade} aria-hidden="true" />
                    </div>
                    {backfaceVisible && (
                      <div className={`${styles.face} ${styles.back}`} aria-hidden="true">
                        <div className={styles.backArt} style={{ backgroundImage: art }} />
                        <span className={styles.shade} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showControls && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navButton}
            aria-label="前のスライド"
            onClick={() => goTo(activeRef.current - 1, true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.5 6l-6 6 6 6" />
            </svg>
          </button>
          <span className={styles.counter} aria-hidden="true">
            <span className={styles.counterCurrent}>{pad(active + 1)}</span>
            <span className={styles.counterSep} />
            {pad(items.length)}
          </span>
          <button
            type="button"
            className={styles.navButton}
            aria-label="次のスライド"
            onClick={() => goTo(activeRef.current + 1, true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.5 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      )}

      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </section>
  );
}

export default RingCarousel;
