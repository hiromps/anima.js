"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import styles from "./WheelCarousel.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type WheelCarouselItem = {
  /** Stable id; falls back to the row position. */
  id?: string;
  /** Row label. Also the option's accessible name. */
  title?: string;
  /** Card variant: second line under the title. */
  subtitle?: string;
  /**
   * Card variant thumbnail. A CSS gradient (`linear-gradient(…)`) or
   * `url(…)` is used as-is; anything else is treated as an image URL.
   */
  image?: string;
  /** Accessible name override (e.g. when `title` is abbreviated). */
  alt?: string;
};

export type WheelCarouselRenderState = {
  /** 0-based position of this item in `items`. */
  index: number;
  total: number;
  /** The committed (centre-band) row. Updates once per settle decision. */
  selected: boolean;
  variant: WheelCarouselVariant;
};

export type WheelCarouselVariant = "text" | "card";

export type WheelCarouselProps = {
  /** Rows. Plain strings are shorthand for `{ title }`. */
  items: readonly (WheelCarouselItem | string)[];
  /** Controlled selected index. Changing it glides the wheel there. */
  index?: number;
  /** Uncontrolled initial index. */
  defaultIndex?: number;
  /** Fires once per decision (release, key, click, wheel settle) — never per frame. */
  onIndexChange?: (index: number) => void;
  /** "text" = picker row, "card" = thumbnail + title + subtitle. */
  variant?: WheelCarouselVariant;
  /** Row pitch in px at the centre band. Default 40 (text) / 64 (card). */
  rowHeight?: number;
  /** Rows visible across the drum (odd; even values round up). Default 5. */
  visibleRows?: number;
  /** Infinite wrap. Needs at least `visibleRows + 2` items, else it stays bounded. */
  loop?: boolean;
  /** CSS perspective in px. Smaller = stronger curvature. */
  perspective?: number;
  /** Glass band with hairlines behind the selected row. */
  highlight?: boolean;
  /** Inertia decay per frame (0.8–0.98). Closer to 1 = longer flicks. */
  friction?: number;
  /** Replaces the default row content; the 3D pose and dimming stay. */
  renderItem?: (item: WheelCarouselItem, state: WheelCarouselRenderState) => ReactNode;
  className?: string;
  "aria-label"?: string;
};

const DEFAULT_VISIBLE_ROWS = 5;
const DEFAULT_ROW_HEIGHT: Record<WheelCarouselVariant, number> = {
  text: 40,
  card: 64,
};
const DEFAULT_PERSPECTIVE = 500;
const DEFAULT_FRICTION = 0.94;
/** Px of pointer travel before a press becomes a drag instead of a tap. */
const TAP_SLOP = 5;
/** Past either end (no loop) the drag only moves this fraction of the finger. */
const RUBBER_BAND = 0.35;
/** A drag that paused this long before release carries no fling velocity. */
const FLING_STALE_MS = 90;
/** Trackpad scrolling settles to a row once it has been quiet this long. */
const WHEEL_IDLE_MS = 140;
/** A single wheel event at least this large is a mouse notch → one row. */
const WHEEL_NOTCH_PX = 50;
/** Floor for the settle spring (1/ms) so taps and keys never feel sluggish. */
const MIN_SETTLE_OMEGA = 0.011;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function normalize(item: WheelCarouselItem | string): WheelCarouselItem {
  return typeof item === "string" ? { title: item } : item;
}

function thumbBackground(image: string) {
  return /gradient\(|^url\(/i.test(image.trim()) ? image : `url("${image}")`;
}

/** Deterministic placeholder art per row (golden-angle hues). */
function placeholderArt(index: number) {
  const hue = Math.round((index * 137.5 + 260) % 360);
  return `linear-gradient(140deg, hsl(${hue} 80% 62%), hsl(${(hue + 48) % 360} 70% 34%))`;
}

/**
 * Signed row distance from the wheel position. In loop mode it wraps into
 * [-n/2, n/2) so the drum shows the nearest copy of each row.
 */
function rowOffset(i: number, pos: number, n: number, loop: boolean) {
  const d = i - pos;
  return loop ? mod(d + n / 2, n) - n / 2 : d;
}

type Glide = {
  /** Spring start time, position error and velocity (rows/ms). */
  t0: number;
  e0: number;
  v0: number;
  target: number;
  omega: number;
};

/** Velocity (rows/ms) of a running glide, so retargeting stays smooth. */
function glideVelocity(g: Glide | null, now: number) {
  if (!g) return 0;
  const t = now - g.t0;
  return (g.v0 - g.omega * (g.v0 + g.omega * g.e0) * t) * Math.exp(-g.omega * t);
}

export function WheelCarousel({
  items,
  index,
  defaultIndex = 0,
  onIndexChange,
  variant = "text",
  rowHeight,
  visibleRows = DEFAULT_VISIBLE_ROWS,
  loop = false,
  perspective,
  highlight = true,
  friction = DEFAULT_FRICTION,
  renderItem,
  className,
  "aria-label": ariaLabel,
}: WheelCarouselProps) {
  const baseId = useId();
  const n = items.length;
  const visible = Math.max(1, Math.round(visibleRows) | 1);
  // Loop needs enough rows to fill the window without the same row having
  // to appear twice; below that the wheel stays bounded instead of gapping.
  const looping = loop && n >= visible + 2;
  const rowH = rowHeight ?? DEFAULT_ROW_HEIGHT[variant];
  // Rows beyond this offset are edge-on (90°) or behind the drum.
  const range = (visible + 2) / 2;

  const controlled = index !== undefined;
  const [innerIndex, setInnerIndex] = useState(() =>
    clamp(Math.round(defaultIndex), 0, Math.max(n - 1, 0)),
  );
  const current = n ? clamp(Math.round(controlled ? index : innerIndex), 0, n - 1) : 0;
  const [announce, setAnnounce] = useState("");

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  // The pose the rows were first rendered with. It never changes, so React
  // never rewrites the per-row vars and JS owns them after mount.
  const [initialPos] = useState(current);

  // Physics state lives in refs: nothing per-frame goes through React.
  const posRef = useRef(current);
  const targetRef = useRef(current);
  const glideRef = useRef<Glide | null>(null);
  const rafRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
    dragging: boolean;
    tapIndex: number | null;
  } | null>(null);
  const wheelTimerRef = useRef(0);
  const reduceMotionRef = useRef(false);

  // Latest props for callbacks that outlive a render (rAF, native listeners).
  // Synced in a layout effect declared before every other effect, so they
  // all read this render's values.
  const live = useRef({ n, looping, rowH, friction, range, controlled, onIndexChange, items });
  useLayoutEffect(() => {
    live.current = { n, looping, rowH, friction, range, controlled, onIndexChange, items };
  });

  /** Writes every row's pose for the current position. One var pair per row. */
  const paint = useCallback(() => {
    const { n: count, looping: wrap, range: r } = live.current;
    const pos = posRef.current;
    const rows = rowRefs.current;
    for (let i = 0; i < count; i += 1) {
      const row = rows[i];
      if (!row) continue;
      const d = rowOffset(i, pos, count, wrap);
      const off = Math.abs(d) >= r;
      // Off rows park at the edge so they never overlap the front face.
      const shown = off ? Math.sign(d) * r : d;
      row.style.setProperty("--d", shown.toFixed(4));
      row.style.setProperty("--a", Math.min(Math.abs(d), 1).toFixed(3));
      if (off) row.dataset.off = "";
      else delete row.dataset.off;
    }
  }, []);

  const stopGlide = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    glideRef.current = null;
  }, []);

  /** Springs from the current position/velocity to an absolute row target. */
  const glideTo = useCallback(
    (target: number, velocity: number) => {
      targetRef.current = target;
      cancelAnimationFrame(rafRef.current);
      if (reduceMotionRef.current) {
        glideRef.current = null;
        rafRef.current = 0;
        posRef.current = target;
        paint();
        return;
      }
      // The friction knob maps to the decay rate a flick would have; the
      // spring never runs slower than MIN_SETTLE_OMEGA.
      const omegaFriction = -Math.log(clamp(live.current.friction, 0.5, 0.995)) / 16.667;
      const g: Glide = {
        t0: performance.now(),
        e0: posRef.current - target,
        v0: velocity,
        target,
        omega: Math.max(omegaFriction, MIN_SETTLE_OMEGA),
      };
      glideRef.current = g;
      const step = (now: number) => {
        if (glideRef.current !== g) return;
        // Critically damped spring, solved analytically: no overshoot and
        // frame-rate independent.
        const t = Math.max(now - g.t0, 0);
        const decay = Math.exp(-g.omega * t);
        const e = (g.e0 + (g.v0 + g.omega * g.e0) * t) * decay;
        const v = (g.v0 - g.omega * (g.v0 + g.omega * g.e0) * t) * decay;
        if (Math.abs(e) < 0.0015 && Math.abs(v) < 0.00005) {
          posRef.current = g.target;
          glideRef.current = null;
          rafRef.current = 0;
          paint();
          return;
        }
        posRef.current = g.target + e;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [paint],
  );

  /** Turns an absolute row target into an item index and reports it. */
  const commit = useCallback((target: number, source: "keyboard" | "pointer") => {
    const { n: count, controlled: isControlled, onIndexChange: cb, items: list } = live.current;
    if (!count) return;
    const next = mod(Math.round(target), count);
    if (!isControlled) setInnerIndex(next);
    // The listbox's aria-activedescendant already speaks keyboard moves;
    // pointer and wheel changes would otherwise be silent.
    if (source === "pointer") {
      const item = normalize(list[next]);
      setAnnounce(item.alt ?? item.title ?? `${next + 1}`);
    }
    cb?.(next);
  }, []);

  /** Nearest absolute target for an item index (shortest way round when looping). */
  const targetFor = useCallback((i: number) => {
    const { n: count, looping: wrap } = live.current;
    if (!wrap) return clamp(i, 0, count - 1);
    const base = targetRef.current;
    return base + (mod(i - base + count / 2, count) - count / 2);
  }, []);

  const clampTarget = useCallback((t: number) => {
    const { n: count, looping: wrap } = live.current;
    return wrap ? t : clamp(t, 0, count - 1);
  }, []);

  // Reduced motion: glides jump; direct drag still follows the finger.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduceMotionRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Repaint before the browser paints whenever the row set or wrap mode
  // changes (new rows were rendered with the initial pose). Also pulls the
  // position back in range when items shrink — e.g. 31 → 28 days.
  useLayoutEffect(() => {
    if (!n) return;
    if (!looping) {
      const max = n - 1;
      if (targetRef.current > max || targetRef.current < 0) {
        const t = clamp(Math.round(targetRef.current), 0, max);
        targetRef.current = t;
        if (glideRef.current) glideTo(t, 0);
        else posRef.current = clamp(posRef.current, 0, max);
      }
    }
    paint();
  }, [n, looping, range, paint, glideTo]);

  // A controlled index (or an uncontrolled reset after items shrank) that
  // disagrees with where the wheel is heading glides there.
  useEffect(() => {
    if (!n || dragRef.current?.dragging) return;
    if (mod(Math.round(targetRef.current), n) === current) return;
    glideTo(targetFor(current), glideVelocity(glideRef.current, performance.now()));
  }, [current, n, glideTo, targetFor]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    window.clearTimeout(wheelTimerRef.current);
  }, []);

  // ------------------------------------------------------------------
  // Wheel / trackpad. Native and non-passive: React's onWheel is passive
  // and can't stop the page from scrolling under the wheel.
  // ------------------------------------------------------------------
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { n: count, looping: wrap, rowH: h } = live.current;
      if (!count || dragRef.current?.dragging) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * h * 5 : e.deltaY;
      if (dy === 0) return;
      // At an end of a bounded wheel, hand the gesture back to the page.
      const heading = glideRef.current ? targetRef.current : posRef.current;
      if (!wrap && ((dy < 0 && heading <= 0) || (dy > 0 && heading >= count - 1))) return;
      e.preventDefault();

      if (Math.abs(dy) >= WHEEL_NOTCH_PX) {
        // Mouse notch: exactly one row per click, queued onto the target.
        const t = clampTarget(Math.round(targetRef.current) + Math.sign(dy));
        glideTo(t, glideVelocity(glideRef.current, performance.now()));
        commit(t, "pointer");
        return;
      }
      // Trackpad: follow the fingers 1:1, settle once the stream goes quiet.
      stopGlide();
      let p = posRef.current + dy / h;
      if (!wrap) p = clamp(p, -0.3, count - 0.7);
      posRef.current = p;
      targetRef.current = p;
      paint();
      window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => {
        const t = clampTarget(Math.round(posRef.current));
        glideTo(t, 0);
        commit(t, "pointer");
      }, WHEEL_IDLE_MS);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampTarget, commit, glideTo, paint, stopGlide]);

  // ------------------------------------------------------------------
  // Pointer drag with inertia; a press that doesn't travel is a tap
  // ------------------------------------------------------------------
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!n || (e.pointerType === "mouse" && e.button !== 0)) return;
    const rowEl = (e.target as HTMLElement).closest<HTMLElement>("[data-wc-index]");
    const now = performance.now();
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastT: now,
      // Catching a spinning wheel inherits its speed until the finger moves.
      velocity: 0,
      dragging: false,
      tapIndex: rowEl ? Number(rowEl.dataset.wcIndex) : null,
    };
    // Grabbing a gliding wheel stops it under the finger (and isn't a tap).
    if (glideRef.current) {
      stopGlide();
      dragRef.current.tapIndex = null;
      targetRef.current = posRef.current;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (!drag.dragging) {
      if (Math.abs(e.clientY - drag.startY) < TAP_SLOP) return;
      drag.dragging = true;
      drag.lastY = e.clientY;
      drag.lastT = performance.now();
      window.clearTimeout(wheelTimerRef.current);
      return;
    }
    const now = performance.now();
    const dt = Math.max(now - drag.lastT, 1);
    let delta = -(e.clientY - drag.lastY) / rowH;
    drag.lastY = e.clientY;
    drag.lastT = now;
    if (!looping && (posRef.current < 0 || posRef.current > n - 1)) delta *= RUBBER_BAND;
    posRef.current += delta;
    targetRef.current = posRef.current;
    // Smoothed so one jittery sample doesn't decide the fling.
    drag.velocity = drag.velocity * 0.6 + (delta / dt) * 0.4;
    paint();
  };

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone */
    }
    if (!drag.dragging) {
      if (!cancelled && drag.tapIndex !== null) {
        const t = targetFor(drag.tapIndex);
        glideTo(t, 0);
        commit(t, "pointer");
      } else if (Math.abs(posRef.current - Math.round(posRef.current)) > 0.001) {
        // Grabbed mid-glide and let go: settle where it stopped.
        const t = clampTarget(Math.round(posRef.current));
        glideTo(t, 0);
        commit(t, "pointer");
      }
      return;
    }
    const v = performance.now() - drag.lastT > FLING_STALE_MS ? 0 : drag.velocity;
    // Project where friction alone would stop the wheel, then snap that to
    // a row: the spring below starts with the fling velocity, so the hand-off
    // from finger to inertia is seamless.
    const omega = -Math.log(clamp(friction, 0.5, 0.995)) / 16.667;
    const t = clampTarget(Math.round(posRef.current + v / omega));
    glideTo(t, v);
    commit(t, "pointer");
  };

  // ------------------------------------------------------------------
  // Keyboard — listbox conventions
  // ------------------------------------------------------------------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!n) return;
    const base = Math.round(targetRef.current);
    let t: number;
    switch (e.key) {
      case "ArrowUp":
        t = base - 1;
        break;
      case "ArrowDown":
        t = base + 1;
        break;
      case "PageUp":
        t = base - visible;
        break;
      case "PageDown":
        t = base + visible;
        break;
      case "Home":
        t = targetFor(0);
        break;
      case "End":
        t = targetFor(n - 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    t = clampTarget(t);
    if (t === targetRef.current && !glideRef.current) return;
    glideTo(t, glideVelocity(glideRef.current, performance.now()));
    commit(t, "keyboard");
  };

  const vars: CSSVars = {};
  if (rowHeight !== undefined) vars["--wc-row-h"] = `${rowHeight}px`;
  if (visible !== DEFAULT_VISIBLE_ROWS) vars["--wc-visible"] = visible;
  if (perspective !== undefined && perspective !== DEFAULT_PERSPECTIVE)
    vars["--wc-perspective"] = `${perspective}px`;

  const rootClassName = [
    styles.root,
    variant === "card" ? styles.card : styles.text,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const optionId = (i: number) => `${baseId}-opt-${i}`;

  return (
    <div className={rootClassName} style={vars}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        role="listbox"
        tabIndex={n ? 0 : -1}
        aria-label={ariaLabel}
        aria-activedescendant={n ? optionId(current) : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPointer(e, false)}
        onPointerCancel={(e) => endPointer(e, true)}
        onKeyDown={onKeyDown}
      >
        {highlight && <div className={styles.band} aria-hidden="true" />}
        {items.map((raw, i) => {
          const item = normalize(raw);
          const selected = i === current;
          const state: WheelCarouselRenderState = { index: i, total: n, selected, variant };
          // Constant first-paint pose (see initialPos): the drum is already
          // curved in server HTML and in the scaled-down gallery card.
          const d0 = rowOffset(i, initialPos, n, looping);
          const off0 = Math.abs(d0) >= range;
          const rowStyle: CSSVars = {
            "--d": (off0 ? Math.sign(d0) * range : d0).toFixed(4),
            "--a": Math.min(Math.abs(d0), 1).toFixed(3),
          };
          const label = item.alt ?? item.title ?? `${i + 1}`;
          return (
            <div
              key={item.id ?? i}
              ref={(node) => {
                rowRefs.current[i] = node;
              }}
              id={optionId(i)}
              role="option"
              aria-selected={selected}
              aria-label={renderItem ? label : item.alt}
              data-wc-index={i}
              data-off={off0 ? "" : undefined}
              className={`${styles.row}${selected ? ` ${styles.selected}` : ""}`}
              style={rowStyle}
            >
              {renderItem ? (
                renderItem(item, state)
              ) : variant === "card" ? (
                <div className={styles.cardRow}>
                  <span
                    className={styles.thumb}
                    aria-hidden="true"
                    style={{
                      backgroundImage: item.image
                        ? thumbBackground(item.image)
                        : placeholderArt(i),
                    }}
                  />
                  <span className={styles.cardText}>
                    <span className={styles.title}>{item.title}</span>
                    {item.subtitle ? (
                      <span className={styles.subtitle}>{item.subtitle}</span>
                    ) : null}
                  </span>
                </div>
              ) : (
                <span className={styles.label}>{item.title ?? i + 1}</span>
              )}
            </div>
          );
        })}
      </div>
      <span className={styles.srOnly} aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

export default WheelCarousel;
