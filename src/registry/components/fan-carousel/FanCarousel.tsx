"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./FanCarousel.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type FanCarouselItem = {
  /** Stable key; falls back to the array position. */
  id?: string;
  /** Default card: the large caption. Also part of the slide's label. */
  title?: string;
  /** Default card: the small line above the title. */
  subtitle?: string;
  /**
   * Card art. A CSS background value (gradients, layered `url(…)`s with
   * positions/sizes) is used as-is; anything else is treated as an image
   * URL and covers the card.
   */
  image?: string;
  /** Accessible description of the art, when it carries meaning. */
  alt?: string;
};

export type FanCarouselItemState = {
  /** 0-based position of this item in `items`. */
  index: number;
  total: number;
  /** The lifted, front-most card. */
  active: boolean;
  /** Signed distance from the active card in whole cards (render-time). */
  offset: number;
};

export type FanCarouselProps = {
  items: readonly FanCarouselItem[];
  /** Controlled active card. Pair with `onIndexChange`. */
  index?: number;
  /** Uncontrolled starting card. */
  defaultIndex?: number;
  /** Fires when the user settles on a new card (drag, wheel, click, keys). */
  onIndexChange?: (index: number) => void;
  /** Total fan angle in deg across the cards visible on both sides. */
  spread?: number;
  /** Distance in px from each card's centre to the pivot below the hand. */
  radius?: number;
  /** Card width in px (the fan scales down to fit narrower containers). */
  cardWidth?: number;
  /** Card height = width × aspect. */
  aspect?: number;
  /** Px the active card rises out of the hand. */
  lift?: number;
  /** Cards rendered on each side of the active one. */
  maxVisible?: number;
  /** Deal the cards from a stacked deck into the fan when scrolled into view. */
  dealIn?: boolean;
  /** Spring of the fan following drag / settling on a card. */
  springStiffness?: number;
  springDamping?: number;
  /** Prev / next buttons and the counter under the fan. */
  showControls?: boolean;
  /** Replaces the default card face; the frame, motion and shading stay. */
  renderItem?: (item: FanCarouselItem, state: FanCarouselItemState) => ReactNode;
  className?: string;
  "aria-label"?: string;
};

// Mirror the stylesheet defaults: geometry vars are only set inline when a
// prop differs, so the default render is exactly the stylesheet.
const DEFAULT_SPREAD = 56;
const DEFAULT_RADIUS = 600;
const DEFAULT_CARD_WIDTH = 160;
const DEFAULT_ASPECT = 1.55;
const DEFAULT_LIFT = 32;
const DEFAULT_MAX_VISIBLE = 4;

/** Extra angle (fraction of one step) opened between the active card and
 *  its neighbours, so the lifted card reads as pulled out of the hand. */
const ACTIVE_GAP = 0.45;
/** Px a hovered (non-active) card rises — the "peek". */
const PEEK_PX = 14;
/** Pre-deal deck sits this far below the fan's resting line. */
const DEAL_DROP_PX = 64;
const DEAL_STAGGER_S = 0.07;
/** Movement before a press becomes a drag; below it, it's a click. */
const DRAG_SLOP_PX = 6;
/** Release velocity (px/ms) is projected this many ms ahead for the snap. */
const FLING_PROJECTION_MS = 160;
/** Wheel gestures settle on the nearest card after this idle time. */
const WHEEL_SETTLE_MS = 140;
/** Past the first / last card the fan follows the finger at this ratio. */
const RUBBER_BAND = 0.35;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Fan angle for a card `o` cards away from the (fractional) active one.
 *  Continuous in `o`, so dragging never jumps. */
function angleFor(o: number, step: number) {
  return o * step + Math.sign(o) * Math.min(Math.abs(o), 1) * step * ACTIVE_GAP;
}

/** Only the card at (or sliding into) the centre rises. */
function liftFor(o: number, lift: number) {
  return lift * Math.max(0, 1 - Math.abs(o));
}

/** Deterministic tilt per card for the stacked pre-deal deck (no
 *  Math.random — it must match between server and client). */
function deckJitter(i: number) {
  return (((i * 47) % 9) - 4) * 0.8;
}

function artBackground(image: string) {
  return /gradient\(|url\(/i.test(image)
    ? image
    : `url("${image.replace(/"/g, '\\"')}") center / cover no-repeat`;
}

/** Deterministic placeholder art per card (golden-angle hues). */
function placeholderArt(index: number) {
  const hue = Math.round((index * 137.5) % 360);
  return `radial-gradient(120% 80% at 30% 15%, hsl(${hue} 70% 62% / .85), transparent 60%), linear-gradient(160deg, hsl(${hue} 55% 34%), hsl(${(hue + 50) % 360} 60% 14%))`;
}

/**
 * Bounding box of the resting fan around the active card's centre (y down),
 * computed from props alone so the server and the first client render agree.
 * Every visible card's four corners are rotated about the pivot; the top
 * also reserves room for the lift and a hover peek.
 */
function fanBounds(
  w: number,
  h: number,
  radius: number,
  step: number,
  lift: number,
  span: number,
) {
  let minX = -w / 2;
  let maxX = w / 2;
  let minY = -h / 2 - lift - PEEK_PX;
  let maxY = h / 2 + DEAL_DROP_PX;
  for (let o = -span; o <= span; o += 1) {
    const a = (angleFor(o, step) * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const l = liftFor(o, lift);
    for (const cx of [-w / 2, w / 2]) {
      for (const cy of [-h / 2, h / 2]) {
        // Corner relative to the pivot, which sits `radius` below the centre.
        const px = cx;
        const py = cy - l - radius;
        const x = px * cos - py * sin;
        const y = px * sin + py * cos + radius;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { width: maxX - minX, height: maxY - minY, anchorY: -minY };
}

type DealPhase = "waiting" | "dealing" | "done";

function DefaultFace({
  item,
  state,
}: {
  item: FanCarouselItem;
  state: FanCarouselItemState;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <>
      <span
        className={styles.art}
        style={{
          background: item.image
            ? artBackground(item.image)
            : placeholderArt(state.index),
        }}
        role={item.alt ? "img" : undefined}
        aria-label={item.alt}
        aria-hidden={item.alt ? undefined : true}
      />
      <span className={styles.grain} aria-hidden />
      <span className={styles.frame} aria-hidden />
      <span className={styles.numeral} aria-hidden>
        {pad(state.index + 1)}
      </span>
      {(item.title || item.subtitle) && (
        <span className={styles.caption}>
          {item.subtitle && <span className={styles.subtitle}>{item.subtitle}</span>}
          {item.title && <span className={styles.title}>{item.title}</span>}
        </span>
      )}
    </>
  );
}

type FanCardProps = {
  item: FanCarouselItem;
  index: number;
  total: number;
  active: boolean;
  offset: number;
  hidden: boolean;
  position: MotionValue<number>;
  step: number;
  lift: number;
  maxVisible: number;
  phase: DealPhase;
  dealOrder: number;
  reduced: boolean;
  dragging: boolean;
  renderItem?: FanCarouselProps["renderItem"];
  onActivate: (index: number) => void;
  registerRef: (index: number, el: HTMLDivElement | null) => void;
};

/**
 * One card. Split out so each card owns its motion values (hooks can't run
 * inside `items.map`). The whole pose is ONE transform string,
 * `rotate(θ) translateY(−lift)`, with the origin at the shared pivot far
 * below the hand: rotating first and translating second makes the lift and
 * the hover peek travel along the card's own radius, so a peeking card
 * slides out of the hand instead of straight up.
 */
function FanCard({
  item,
  index,
  total,
  active,
  offset,
  hidden,
  position,
  step,
  lift,
  maxVisible,
  phase,
  dealOrder,
  reduced,
  dragging,
  renderItem,
  onActivate,
  registerRef,
}: FanCardProps) {
  const peek = useSpring(0, { stiffness: 420, damping: 30 });
  // Cards that mount after the deal (the window slid) start dealt.
  const deal = useMotionValue(phase === "done" ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      deal.jump(1);
      return;
    }
    if (phase === "waiting") {
      deal.jump(0);
      return;
    }
    if (deal.get() >= 1) return;
    // Centre card first, then outward in pairs; when the phase flips to
    // "done" mid-flight the card finishes without the stagger delay.
    const controls = animate(deal, 1, {
      type: "spring",
      stiffness: 150,
      damping: 20,
      delay: phase === "dealing" ? dealOrder * DEAL_STAGGER_S : 0,
    });
    return () => controls.stop();
  }, [phase, reduced, dealOrder, deal]);

  const transform = useTransform([position, deal, peek], ([p, d, k]: number[]) => {
    const o = index - p;
    const fanned = angleFor(o, step);
    const jitter = deckJitter(index);
    const angle = jitter + (fanned - jitter) * d;
    const rise = (liftFor(o, lift) + k) * d - DEAL_DROP_PX * (1 - d);
    return `rotate(${angle.toFixed(3)}deg) translateY(${(-rise).toFixed(2)}px)`;
  });
  // Front-most = closest to the active card; finer than whole cards so the
  // order stays right mid-drag.
  const zIndex = useTransform(position, (p) => 1000 - Math.round(Math.abs(index - p) * 10));
  // The outermost rendered ring fades instead of popping in / out.
  const opacity = useTransform(position, (p) =>
    clamp(maxVisible + 1 - Math.abs(index - p), 0, 1),
  );
  const shade = useTransform(position, (p) => Math.min(Math.abs(index - p) * 0.12, 0.6));

  const setPeek = (v: number) => {
    if (reduced) peek.jump(v);
    else peek.set(v);
  };

  // Drop a stale peek when the card becomes active or a drag starts.
  useEffect(() => {
    if (active || dragging) peek.set(0);
  }, [active, dragging, peek]);

  const state: FanCarouselItemState = { index, total, active, offset };
  const title = item.title ? `：${item.title}` : "";

  return (
    <motion.div
      ref={(el) => registerRef(index, el)}
      className={styles.card}
      style={{ transform, zIndex, opacity }}
      role="group"
      aria-roledescription="スライド"
      aria-label={`${index + 1} / ${total}${title}`}
      aria-hidden={hidden || undefined}
      inert={hidden}
      tabIndex={active ? 0 : -1}
      data-active={active || undefined}
      onClick={() => onActivate(index)}
      // Peek only for real hover pointers; touch has no hover state.
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && !active && !dragging) setPeek(PEEK_PX);
      }}
      onPointerLeave={() => setPeek(0)}
    >
      <span className={styles.glow} aria-hidden />
      <span className={styles.face}>
        {renderItem ? renderItem(item, state) : <DefaultFace item={item} state={state} />}
        <motion.span className={styles.shade} style={{ opacity: shade }} aria-hidden />
        <span className={styles.sheen} aria-hidden />
      </span>
    </motion.div>
  );
}

type DragState = {
  pointerId: number;
  startX: number;
  startPos: number;
  moved: boolean;
  samples: { x: number; t: number }[];
};

export function FanCarousel({
  items,
  index,
  defaultIndex = 0,
  onIndexChange,
  spread = DEFAULT_SPREAD,
  radius = DEFAULT_RADIUS,
  cardWidth = DEFAULT_CARD_WIDTH,
  aspect = DEFAULT_ASPECT,
  lift = DEFAULT_LIFT,
  maxVisible = DEFAULT_MAX_VISIBLE,
  dealIn = true,
  springStiffness = 260,
  springDamping = 28,
  showControls = true,
  renderItem,
  className,
  "aria-label": ariaLabel = "カードの扇",
}: FanCarouselProps) {
  const total = items.length;
  const maxIndex = Math.max(total - 1, 0);
  const clampIndex = useCallback(
    (n: number) => clamp(Math.round(n), 0, maxIndex),
    [maxIndex],
  );
  const visible = Math.max(1, Math.round(maxVisible));

  const [internalIndex, setInternalIndex] = useState(() =>
    clamp(Math.round(defaultIndex), 0, maxIndex),
  );
  const isControlled = index !== undefined;
  const current = clampIndex(isControlled ? index : internalIndex);

  const reduced = useReducedMotion() ?? false;

  // `target` is where the fan should be (written directly while dragging);
  // `position` springs after it and drives every card.
  const target = useMotionValue(current);
  const position = useSpring(target, {
    stiffness: springStiffness,
    damping: springDamping,
  });

  // Window of rendered cards follows the rounded position — React state
  // only changes when the centre card changes, never per frame.
  const [liveIndex, setLiveIndex] = useState(current);
  const liveIndexRef = useRef(current);
  useMotionValueEvent(position, "change", (p) => {
    const r = clampIndex(p);
    if (r !== liveIndexRef.current) {
      liveIndexRef.current = r;
      setLiveIndex(r);
    }
  });

  // Bumped on every commit so the resync below also runs when a controlled
  // parent rejects the change (index unchanged → the deck snaps back).
  const [settleTick, setSettleTick] = useState(0);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  /** Writes the fan target; under reduced motion the spring is skipped
   *  (useSpring ignores MotionConfig, so it's done by hand). */
  const moveTo = useCallback(
    (v: number) => {
      target.set(v);
      if (reduced) position.jump(v);
    },
    [target, position, reduced],
  );

  useEffect(() => {
    if (draggingRef.current) return;
    moveTo(current);
  }, [current, settleTick, moveTo]);

  const currentRef = useRef(current);
  const onIndexChangeRef = useRef(onIndexChange);
  useEffect(() => {
    currentRef.current = current;
    onIndexChangeRef.current = onIndexChange;
  });

  const [liveText, setLiveText] = useState("");

  const commit = useCallback(
    (n: number, announce = false) => {
      const next = clampIndex(n);
      if (!isControlled) setInternalIndex(next);
      setSettleTick((t) => t + 1);
      if (announce) {
        const title = items[next]?.title;
        setLiveText(`${next + 1} / ${total}${title ? `：${title}` : ""}`);
      }
      if (next !== currentRef.current) onIndexChangeRef.current?.(next);
    },
    [clampIndex, isControlled, items, total],
  );

  // ------------------------------------------------------------------
  // Geometry: fan bounds from props, fit-to-container from a ResizeObserver
  // ------------------------------------------------------------------
  const cardHeight = cardWidth * aspect;
  const span = Math.min(visible, maxIndex);
  const step = spread / Math.max(1, Math.min(maxIndex, visible * 2));
  const bounds = fanBounds(cardWidth, cardHeight, radius, step, lift, span);

  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      // Hidden tabs report 0 — keep the last good fit instead of collapsing.
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = containerWidth > 0 ? Math.min(1, containerWidth / bounds.width) : 1;

  /** Screen px of drag that moves the fan by one card (≈ the arc between
   *  two neighbouring card centres, kept within a comfortable range). */
  const pxPerCard =
    clamp(((radius + cardHeight / 2) * step * Math.PI) / 180, 48, cardWidth) * fit;
  const pxPerCardRef = useRef(pxPerCard);
  const commitRef = useRef(commit);
  useEffect(() => {
    pxPerCardRef.current = pxPerCard;
    commitRef.current = commit;
  });

  // ------------------------------------------------------------------
  // Deal-in: stacked deck → fan, once, when the carousel scrolls into view
  // ------------------------------------------------------------------
  const [dealState, setDealState] = useState<DealPhase>(dealIn ? "waiting" : "done");
  // Re-arm when `dealIn` is switched on later (adjust-state-during-render,
  // so the deck doesn't flash fanned for a frame).
  const [prevDealIn, setPrevDealIn] = useState(dealIn);
  if (prevDealIn !== dealIn) {
    setPrevDealIn(dealIn);
    setDealState(dealIn ? "waiting" : "done");
  }
  // Reduced motion is NOT folded in here: useReducedMotion can differ
  // between the server and the first client render, and the cards' initial
  // pose must hydrate identically. Each card jumps to dealt in an effect.
  const phase: DealPhase = dealIn ? dealState : "done";

  useEffect(() => {
    if (phase !== "waiting" || reduced) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDealState("dealing");
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase, reduced]);

  useEffect(() => {
    if (phase !== "dealing") return;
    const ms = ((visible + 1) * DEAL_STAGGER_S + 1.2) * 1000;
    const t = window.setTimeout(() => setDealState("done"), ms);
    return () => window.clearTimeout(t);
  }, [phase, visible]);

  // ------------------------------------------------------------------
  // Focus: follow the active card only when focus is already on a card
  // ------------------------------------------------------------------
  const cardEls = useRef(new Map<number, HTMLDivElement>());
  const registerRef = useCallback((i: number, el: HTMLDivElement | null) => {
    if (el) cardEls.current.set(i, el);
    else cardEls.current.delete(i);
  }, []);
  const pendingFocusRef = useRef(false);
  useEffect(() => {
    if (!pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    cardEls.current.get(current)?.focus({ preventScroll: true });
  }, [current]);

  const focusIsOnCard = () => {
    const active = document.activeElement;
    for (const el of cardEls.current.values()) if (el === active) return true;
    return false;
  };

  // ------------------------------------------------------------------
  // Pointer drag (springy follow, rubber band, velocity-projected snap)
  // ------------------------------------------------------------------
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (total < 2) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      // Grab the fan where it visually is, even mid-spring.
      startPos: position.get(),
      moved: false,
      samples: [{ x: e.clientX, t: e.timeStamp }],
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_SLOP_PX) return;
      // Capture only once it's a drag: capturing on press would retarget
      // the click to the stage and break click-to-activate.
      d.moved = true;
      draggingRef.current = true;
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
    }
    let raw = d.startPos - dx / pxPerCardRef.current;
    if (raw < 0) raw *= RUBBER_BAND;
    else if (raw > maxIndex) raw = maxIndex + (raw - maxIndex) * RUBBER_BAND;
    moveTo(raw);
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    // Keep ~100ms of history for the release velocity.
    while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > 100) d.samples.shift();
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (!d.moved) return;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const dt = last.t - first.t;
    const velocity = dt > 0 ? (last.x - first.x) / dt : 0; // px/ms
    const projected =
      target.get() - (velocity * FLING_PROJECTION_MS) / pxPerCardRef.current;
    draggingRef.current = false;
    setDragging(false);
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    commit(projected);
  };

  const onActivate = useCallback(
    (i: number) => {
      if (suppressClickRef.current) return;
      commit(i);
    },
    [commit],
  );

  // ------------------------------------------------------------------
  // Wheel: horizontal (trackpad / shift+wheel) only, so vertical page
  // scroll is never hijacked. Non-passive to stop the browser's
  // history-swipe on horizontal trackpad gestures.
  // ------------------------------------------------------------------
  useEffect(() => {
    const el = stageRef.current;
    if (!el || total < 2) return;
    let timer = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1;
      const next = clamp(
        target.get() + (e.deltaX * unit) / pxPerCardRef.current,
        -RUBBER_BAND,
        maxIndex + RUBBER_BAND,
      );
      target.set(next);
      if (reduced) position.jump(next);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => commitRef.current(target.get()), WHEEL_SETTLE_MS);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(timer);
    };
  }, [total, maxIndex, reduced, target, position]);

  // ------------------------------------------------------------------
  // Keyboard on the region: ← → step, Home / End jump
  // ------------------------------------------------------------------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = current - 1;
    else if (e.key === "ArrowRight") next = current + 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = maxIndex;
    if (next === null) return;
    e.preventDefault();
    if (focusIsOnCard()) pendingFocusRef.current = true;
    commit(next, true);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const rootStyle: CSSVars = {
    "--fc-stage-h": `${(bounds.height * fit).toFixed(2)}px`,
    "--fc-anchor-y": `${bounds.anchorY.toFixed(2)}px`,
    "--fc-fit": fit.toFixed(4),
  };
  if (cardWidth !== DEFAULT_CARD_WIDTH) rootStyle["--fc-card-w"] = `${cardWidth}px`;
  if (aspect !== DEFAULT_ASPECT) rootStyle["--fc-aspect"] = aspect;
  if (radius !== DEFAULT_RADIUS) rootStyle["--fc-radius"] = `${radius}px`;

  const pad = (n: number) => String(n).padStart(2, "0");
  const rendered: number[] = [];
  for (let i = 0; i < total; i += 1) {
    // Union of where the fan is and where it's going, so the destination
    // card exists (and can take focus) before the spring gets there.
    if (Math.abs(i - liveIndex) <= visible + 1 || Math.abs(i - current) <= visible + 1) {
      rendered.push(i);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={rootRef}
        className={[styles.root, className].filter(Boolean).join(" ")}
        style={rootStyle}
        aria-roledescription="カルーセル"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
      >
        <div
          ref={stageRef}
          className={styles.stage}
          data-dragging={dragging || undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className={styles.fan}>
            {rendered.map((i) => {
              const item = items[i];
              return (
                <FanCard
                  key={item.id ?? i}
                  item={item}
                  index={i}
                  total={total}
                  active={i === current}
                  offset={i - current}
                  hidden={Math.abs(i - current) > visible}
                  position={position}
                  step={step}
                  lift={lift}
                  maxVisible={visible}
                  phase={phase}
                  dealOrder={Math.abs(i - current)}
                  reduced={reduced}
                  dragging={dragging}
                  renderItem={renderItem}
                  onActivate={onActivate}
                  registerRef={registerRef}
                />
              );
            })}
          </div>
        </div>

        {showControls && total > 1 && (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => commit(current - 1, true)}
              disabled={current === 0}
              aria-label="前のカード"
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden />
            </button>
            <span className={styles.counter} aria-hidden>
              <span className={styles.counterCurrent}>{pad(current + 1)}</span>
              <span className={styles.counterSep}>/</span>
              {pad(total)}
            </span>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => commit(current + 1, true)}
              disabled={current === maxIndex}
              aria-label="次のカード"
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}

        <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {liveText}
        </p>
      </section>
    </MotionConfig>
  );
}

export default FanCarousel;
