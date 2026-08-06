"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import styles from "./InsidePovCarousel.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type MediaItem = {
  src: string;
  poster?: string;
  alt?: string;
  /** "video" (default) renders a <video>, "image" renders an <img>. */
  kind?: "video" | "image";
};

export type InsidePovCarouselProps = {
  /**
   * Video cards to display. When omitted, deterministic gradient
   * placeholder cards are rendered instead (see `cardCount`).
   */
  items?: MediaItem[];
  /** Number of placeholder cards when `items` is omitted. */
  cardCount?: number;
  autoRotate?: boolean;
  interactive?: boolean;
  /** Auto-rotation speed in deg/frame. 0.04 ≈ 2.4 deg/s. */
  speed?: number;
  /** Drag sensitivity in deg/px. */
  dragSensitivity?: number;
  /** Inertia decay per frame; closer to 1 glides longer. */
  friction?: number;
  /** CSS perspective in px. Smaller = stronger foreshortening. */
  perspective?: number;
  /** Ring radius in px. Larger = wider Z-depth spread. */
  radius?: number;
  /** Card width in px. */
  cardWidth?: number;
  /** Card height = width × aspect. */
  cardAspect?: number;
  /** Whole-ring X tilt in deg. */
  tiltX?: number;
  /** Card corner radius in px. */
  cardRadius?: number;
  /** Depth shading strength 0–1: front-facing (far) cards darken. */
  depthShading?: number;
  /** Show the drag-hint toggle below the ring. */
  showHint?: boolean;
  className?: string;
};

const DEFAULT_SPEED = 0.04;
const DEFAULT_DRAG_SENSITIVITY = 0.28;
const DEFAULT_FRICTION = 0.94;
const DEFAULT_DEPTH_SHADING = 0.28;
const DEFAULT_CARD_COUNT = 14;
/** Inertia cutoff threshold. */
const VELOCITY_EPSILON = 0.01;

/** Deterministic placeholder gradient per card index (golden-angle hues). */
function placeholderGradient(index: number): string {
  const hue = Math.round((index * 137.5) % 360);
  const hue2 = (hue + 42) % 360;
  return `linear-gradient(160deg, hsl(${hue} 62% 52%), hsl(${hue2} 68% 30%))`;
}

export function InsidePovCarousel({
  items,
  cardCount = DEFAULT_CARD_COUNT,
  autoRotate = true,
  interactive = true,
  speed = DEFAULT_SPEED,
  dragSensitivity = DEFAULT_DRAG_SENSITIVITY,
  friction = DEFAULT_FRICTION,
  perspective,
  radius,
  cardWidth,
  cardAspect,
  tiltX,
  cardRadius,
  depthShading = DEFAULT_DEPTH_SHADING,
  showHint = true,
  className,
}: InsidePovCarouselProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const brightnessCacheRef = useRef<number[]>([]);
  const frameRef = useRef(0);

  // All values read by the rAF loop live in refs so the loop never restarts.
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isHoveredRef = useRef(false);
  const autoRotatingRef = useRef(autoRotate);
  const speedRef = useRef(speed);
  const dragSensitivityRef = useRef(dragSensitivity);
  const frictionRef = useRef(friction);
  // Effective depth shading: prop value on desktop, 0 on mobile (≤760px).
  const depthRef = useRef(depthShading);
  const isMobileRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  // Cards stay hidden until their video can play through.
  const [loadedCards, setLoadedCards] = useState<Set<number>>(() => new Set());

  const markLoaded = useCallback((index: number) => {
    setLoadedCards((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const count = items ? Math.max(items.length, 1) : Math.max(cardCount, 1);
  // Per-card angle, deterministic on the server to avoid hydration mismatch.
  const step = useMemo(() => 360 / count, [count]);
  const stepRef = useRef(step);

  // Sync prop changes into the refs the rAF loop reads. Auto-rotation
  // lives only in a ref — nothing in the JSX depends on it; the Space
  // toggle flips the ref and a prop change overrides it here.
  useEffect(() => {
    autoRotatingRef.current = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    dragSensitivityRef.current = dragSensitivity;
  }, [dragSensitivity]);
  useEffect(() => {
    frictionRef.current = friction;
  }, [friction]);

  // Depth shading is flattened to 0 on mobile (≤760px) to match the
  // reference look; brightness cache is cleared so stale filters reset.
  useEffect(() => {
    const applyDepth = () => {
      depthRef.current = isMobileRef.current ? 0 : depthShading;
      brightnessCacheRef.current = [];
    };
    const mq = window.matchMedia("(max-width: 760px)");
    const onChange = () => {
      isMobileRef.current = mq.matches;
      applyDepth();
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [depthShading]);

  // ------------------------------------------------------------------
  // Main animation loop: auto-rotation + drag inertia + depth shading
  // ------------------------------------------------------------------
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let rafId = 0;

    const tick = () => {
      if (
        !reduceMotion &&
        autoRotatingRef.current &&
        !isDraggingRef.current &&
        !isHoveredRef.current
      ) {
        rotationRef.current += speedRef.current;
      }

      if (
        !isDraggingRef.current &&
        Math.abs(velocityRef.current) > VELOCITY_EPSILON
      ) {
        rotationRef.current += velocityRef.current;
        velocityRef.current *= frictionRef.current;
      } else if (!isDraggingRef.current) {
        velocityRef.current = 0;
      }

      root.style.setProperty("--pov-rotation", `${rotationRef.current}deg`);

      // Depth via brightness: camera-facing (far) cards darken, edge (near)
      // cards brighten. Writing `filter` to every card each frame makes
      // dragging stutter, so updates run every 3rd frame, never while
      // dragging, quantized so styles are only written on change.
      frameRef.current = (frameRef.current + 1) % 3;
      if (frameRef.current === 0 && !isDraggingRef.current) {
        const stepDeg = stepRef.current;
        const cards = cardRefs.current;
        const cache = brightnessCacheRef.current;
        const rot = rotationRef.current;
        const depth = depthRef.current;
        for (let i = 0; i < cards.length; i += 1) {
          const card = cards[i];
          if (!card) continue;
          const angleRad = ((i * stepDeg + rot) * Math.PI) / 180;
          const facing = Math.max(0, Math.cos(angleRad)); // 1=front(far), 0=edge(near)
          const brightness = Math.round((1 - depth * facing) * 50) / 50;
          if (cache[i] !== brightness) {
            cache[i] = brightness;
            card.style.filter = `brightness(${brightness})`;
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ------------------------------------------------------------------
  // Video autoplay + tab visibility handling
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!items) return;
    const vids = videoRefs.current.filter(
      (v): v is HTMLVideoElement => v != null,
    );

    const safePlay = (v: HTMLVideoElement) => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    vids.forEach(safePlay);

    const onVisibility = () => {
      if (document.hidden) {
        vids.forEach((v) => v.pause());
      } else {
        vids.forEach(safePlay);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [items]);

  // ------------------------------------------------------------------
  // Pointer drag / swipe (interactive only)
  // ------------------------------------------------------------------
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!interactive) return;
      isDraggingRef.current = true;
      velocityRef.current = 0;
      lastXRef.current = e.clientX;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [interactive],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!interactive || !isDraggingRef.current) return;
      const dx = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      const delta = dx * dragSensitivityRef.current;
      rotationRef.current += delta;
      velocityRef.current = delta; // initial inertia velocity on release
    },
    [interactive],
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may not be set */
    }
  }, []);

  const onMouseEnter = useCallback(() => {
    isHoveredRef.current = true;
  }, []);
  const onMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
  }, []);

  // ------------------------------------------------------------------
  // Keyboard (interactive only): arrows nudge, Space toggles rotation
  // ------------------------------------------------------------------
  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (!interactive) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          velocityRef.current = -step * 0.06;
          break;
        case "ArrowRight":
          e.preventDefault();
          velocityRef.current = step * 0.06;
          break;
        case " ":
        case "Spacebar":
          e.preventDefault();
          autoRotatingRef.current = !autoRotatingRef.current;
          break;
        default:
          break;
      }
    },
    [interactive, step],
  );

  // Root CSS variables. --pov-step is deterministic from SSR; the tuning
  // vars are only set when the prop is provided so the stylesheet's
  // responsive clamp() defaults survive for unspecified props.
  const rootStyle: CSSVars = {
    "--pov-step": `${step}deg`,
  };
  if (perspective !== undefined) rootStyle["--pov-perspective"] = `${perspective}px`;
  if (radius !== undefined) rootStyle["--pov-radius"] = `${radius}px`;
  if (cardWidth !== undefined) rootStyle["--pov-card-w"] = `${cardWidth}px`;
  if (cardAspect !== undefined)
    rootStyle["--pov-card-h"] = `calc(var(--pov-card-w) * ${cardAspect})`;
  if (tiltX !== undefined) rootStyle["--pov-tilt-x"] = `${tiltX}deg`;
  if (cardRadius !== undefined) rootStyle["--pov-card-radius"] = `${cardRadius}px`;

  const rootClassName = [
    styles.carousel,
    isDragging ? styles.dragging : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const indices = Array.from({ length: count }, (_, i) => i);

  return (
    <section
      ref={rootRef}
      className={rootClassName}
      style={rootStyle}
      tabIndex={interactive ? 0 : -1}
      aria-label="3D carousel"
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? endDrag : undefined}
      onPointerCancel={interactive ? endDrag : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.stage}>
        <div className={styles.world}>
          {indices.map((index) => {
            const item = items?.[index];
            const loaded = !items || loadedCards.has(index);
            return (
              <figure
                key={item ? `${item.src}-${index}` : index}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                className={`${styles.card}${loaded ? ` ${styles.isLoaded}` : ""}`}
                style={{ "--i": index } as CSSVars}
              >
                {item?.kind === "image" ? (
                  // Plain <img>: registry components stay framework-agnostic,
                  // and object/blob URLs bypass image optimizers anyway.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={(node) => {
                      // Show immediately if already decoded (cache hits).
                      if (node?.complete) markLoaded(index);
                    }}
                    className={styles.image}
                    src={item.src}
                    alt={item.alt ?? ""}
                    draggable={false}
                    onLoad={() => markLoaded(index)}
                  />
                ) : item ? (
                  <video
                    ref={(node) => {
                      videoRefs.current[index] = node;
                      // Show immediately if already buffered (cache hits).
                      if (node && node.readyState >= 4) markLoaded(index);
                    }}
                    className={styles.video}
                    src={item.src}
                    poster={item.poster}
                    aria-label={item.alt}
                    muted
                    loop
                    playsInline
                    preload="auto"
                    onCanPlayThrough={() => markLoaded(index)}
                  />
                ) : (
                  <div
                    className={styles.placeholder}
                    style={{ background: placeholderGradient(index) }}
                  >
                    <span className={styles.placeholderIndex}>{index + 1}</span>
                  </div>
                )}
              </figure>
            );
          })}
        </div>
      </div>

      {showHint && (
        <div className={styles.scrollHint} aria-hidden="true">
          <span className={styles.toggle}>
            <span className={styles.knob} />
          </span>
          <svg
            className={styles.chevron}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </section>
  );
}

export default InsidePovCarousel;
