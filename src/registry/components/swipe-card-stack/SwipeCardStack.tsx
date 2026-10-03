"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Heart, Undo2, X } from "lucide-react";
import styles from "./SwipeCardStack.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type SwipeDirection = "left" | "right";

export type SwipeCardItem = {
  /** Stable id (used for the accessible label lookups and your own state). */
  id: string;
  /** Default card: the person's name. Also the top card's accessible name. */
  title: string;
  /** Default card: role / company under the name. */
  subtitle?: string;
  /** Default card: the quote. */
  body?: string;
  /**
   * Art area background. A CSS gradient (`linear-gradient(…)`) or
   * `url(…)` is used as-is; anything else is treated as an image URL.
   */
  image?: string;
  /** Per-card accent: quote mark, avatar and the glow in the art area. */
  accent?: string;
};

export type SwipeCardRenderContext = {
  /** 0-based position of this item in `items`. */
  index: number;
  total: number;
  /** Only the top card is interactive; the rest are decorative depth. */
  isTop: boolean;
};

export type SwipeCardStackProps = {
  items: readonly SwipeCardItem[];
  /** Swiped cards go back to the bottom of the deck. Off: `endSlot` shows. */
  loop?: boolean;
  /** Cards visible in the stack including the top one (2–4). */
  visibleCount?: number;
  /** Drag distance in px past which a release throws the card. */
  threshold?: number;
  /** Degrees of tilt per 100px of horizontal drag. */
  rotateFactor?: number;
  /** LIKE / NOPE stamps that fade in with the drag direction. */
  showStamps?: boolean;
  /** Undo / skip / like buttons under the stack. */
  showControls?: boolean;
  likeLabel?: string;
  nopeLabel?: string;
  /** Called once per throw (drag, button or arrow key), not on undo. */
  onSwipe?: (item: SwipeCardItem, direction: SwipeDirection) => void;
  /** Replaces the default card content; the card frame and stamps stay. */
  renderCard?: (item: SwipeCardItem, ctx: SwipeCardRenderContext) => ReactNode;
  /** Shown when the deck is exhausted (`loop={false}`). */
  endSlot?: ReactNode;
  /** Spring of the stack re-settling and the snap-back. */
  springStiffness?: number;
  springDamping?: number;
  className?: string;
  "aria-label"?: string;
};

/** Px each card behind sits lower than the one in front. Mirrors --scs-step. */
const STEP_Y = 14;
const STEP_SCALE = 0.055;
/** Alternating tilt of the cards behind, so the deck reads as hand-stacked. */
const BASE_TILT = [0, -2.6, 2.2, -1.6, 1.2];
/** A release this fast (px/s) throws the card even below `threshold`. */
const FLING_VELOCITY = 600;
const HISTORY_LIMIT = 50;

type Move = {
  action: "swipe" | "undo";
  dir: SwipeDirection;
  /** Px the card travels to leave the stack container. */
  distance: number;
  /** Release velocity — a hard throw leaves faster. */
  velocity: number;
};

const mod = (n: number, m: number) => ((n % m) + m) % m;
const sign = (dir: SwipeDirection) => (dir === "right" ? 1 : -1);

function depthPose(depth: number, visible: number) {
  return {
    x: 0,
    y: depth * STEP_Y,
    scale: 1 - depth * STEP_SCALE,
    rotate: BASE_TILT[depth] ?? 0,
    // The staging card one level beyond the visible stack is invisible, so
    // the next card fades in at the back instead of popping in.
    opacity: depth < visible ? 1 : 0,
  };
}

function artBackground(image: string) {
  return /gradient\(|^url\(/i.test(image.trim()) ? image : `url("${image}")`;
}

function DefaultCard({
  item,
  ctx,
}: {
  item: SwipeCardItem;
  ctx: SwipeCardRenderContext;
}) {
  const vars: CSSVars = {};
  if (item.accent) vars["--scs-accent"] = item.accent;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className={styles.defaultCard} style={vars}>
      <div
        className={styles.art}
        style={item.image ? { backgroundImage: artBackground(item.image) } : undefined}
      >
        <span className={styles.counter} aria-hidden>
          {pad(ctx.index + 1)} / {pad(ctx.total)}
        </span>
        <span className={styles.quoteMark} aria-hidden>
          &ldquo;
        </span>
      </div>
      <div className={styles.content}>
        {item.body && <p className={styles.body}>{item.body}</p>}
        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden>
            {item.title.trim().charAt(0)}
          </span>
          <span className={styles.personText}>
            <span className={styles.name}>{item.title}</span>
            {item.subtitle && <span className={styles.role}>{item.subtitle}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

type StackCardProps = {
  item: SwipeCardItem;
  ctx: SwipeCardRenderContext;
  depth: number;
  visible: number;
  zIndex: number;
  /** Mount pose; `undefined` = mount straight into the depth pose. */
  enterFrom?: ReturnType<typeof depthPose>;
  threshold: number;
  rotateFactor: number;
  showStamps: boolean;
  likeLabel: string;
  nopeLabel: string;
  spring: { type: "spring"; stiffness: number; damping: number };
  onThrow: (dir: SwipeDirection, velocity: number) => void;
  renderCard?: SwipeCardStackProps["renderCard"];
  /** Deck position; lets the stack find the new top card to focus. */
  pos: number;
};

/**
 * One card. Split out so each card owns its motion values — hooks can't be
 * called inside `items.map`. Two layers on purpose:
 * - the outer layer holds the stack pose (y / scale / tilt) and the fly-off
 *   exit, driven by `animate` / AnimatePresence;
 * - the inner layer holds the drag offset.
 * Tilt and stamps read the SUM of both x values, so a throw continues from
 * wherever the finger let go, and a button press tilts and stamps exactly
 * like a drag.
 */
function StackCard({
  item,
  ctx,
  depth,
  visible,
  zIndex,
  enterFrom,
  threshold,
  rotateFactor,
  showStamps,
  likeLabel,
  nopeLabel,
  spring,
  onThrow,
  renderCard,
  pos,
}: StackCardProps) {
  const isTop = depth === 0;
  const flyX = useMotionValue(0);
  const dragX = useMotionValue(0);
  const totalX = useTransform(() => flyX.get() + dragX.get());
  const rotate = useTransform(totalX, (x) => (x / 100) * rotateFactor);
  const likeOpacity = useTransform(totalX, [threshold * 0.2, threshold], [0, 1]);
  const nopeOpacity = useTransform(totalX, [-threshold, -threshold * 0.2], [1, 0]);

  // Undo while this card is still flying re-adds it mid-exit (same key):
  // the outer layer animates back via `animate`, but the drag offset on the
  // inner layer has to be reset by hand.
  const isPresent = useIsPresent();
  useEffect(() => {
    if (isPresent && dragX.get() !== 0) animate(dragX, 0, spring);
    // `spring` is a fresh object each render; only presence matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent, dragX]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const x = dragX.get();
    const v = info.velocity.x;
    if (x > threshold || (v > FLING_VELOCITY && x > 0)) onThrow("right", v);
    else if (x < -threshold || (v < -FLING_VELOCITY && x < 0)) onThrow("left", v);
    else animate(dragX, 0, spring);
  };

  const pose = depthPose(depth, visible);

  return (
    <motion.div
      className={styles.slot}
      style={{ x: flyX }}
      initial={enterFrom ?? false}
      animate={{ ...pose, zIndex }}
      transition={{ ...spring, opacity: { duration: 0.25 }, zIndex: { duration: 0 } }}
      // Variant functions are the only place AnimatePresence's live `custom`
      // reaches a leaving card — its own props are frozen at removal time.
      variants={{
        exit: (move: Move) => {
          if (depth === 0 && move.action === "swipe") {
            const duration = Math.min(
              0.5,
              Math.max(0.28, 0.5 - Math.abs(move.velocity) / 6000),
            );
            return {
              x: sign(move.dir) * move.distance,
              opacity: 0,
              // Keep the leaving card above the one rising into its place.
              zIndex: 100,
              transition: {
                x: { duration, ease: [0.32, 0.72, 0, 1] },
                // Reduced motion makes the x move instant; the fade still
                // runs, so the throw reads as a dissolve instead of a pop.
                opacity: { duration: duration * 0.55, delay: duration * 0.45 },
                zIndex: { duration: 0 },
              },
            };
          }
          return { opacity: 0, transition: { duration: 0.2 } };
        },
      }}
      exit="exit"
      aria-hidden={isTop ? undefined : true}
      inert={!isTop}
    >
      <motion.div
        data-pos={pos}
        className={styles.card}
        style={{ x: dragX, rotate }}
        drag={isTop ? "x" : false}
        // No constraints + no momentum: the card stays where it's released,
        // then either flies on from there or springs back (handleDragEnd).
        dragMomentum={false}
        onDragEnd={isTop ? handleDragEnd : undefined}
        whileDrag={{ cursor: "grabbing" }}
        role={isTop ? "group" : undefined}
        aria-roledescription={isTop ? "カード" : undefined}
        aria-label={isTop ? `${item.title}（${ctx.index + 1} / ${ctx.total}）` : undefined}
        tabIndex={isTop ? 0 : -1}
      >
        {renderCard ? renderCard(item, ctx) : <DefaultCard item={item} ctx={ctx} />}
        {/* Cards behind get darker with depth: reads as distance. */}
        <motion.div
          className={styles.shade}
          aria-hidden
          initial={false}
          animate={{ opacity: Math.min(depth * 0.22, 0.6) }}
          transition={{ duration: 0.3 }}
        />
        {showStamps && isTop && (
          <>
            <motion.span
              className={`${styles.stamp} ${styles.stampLike}`}
              style={{ opacity: likeOpacity }}
              aria-hidden
            >
              {likeLabel}
            </motion.span>
            <motion.span
              className={`${styles.stamp} ${styles.stampNope}`}
              style={{ opacity: nopeOpacity }}
              aria-hidden
            >
              {nopeLabel}
            </motion.span>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function SwipeCardStack({
  items,
  loop = true,
  visibleCount = 3,
  threshold = 120,
  rotateFactor = 6,
  showStamps = true,
  showControls = true,
  likeLabel = "LIKE",
  nopeLabel = "NOPE",
  onSwipe,
  renderCard,
  endSlot,
  springStiffness = 320,
  springDamping = 30,
  className,
  "aria-label": ariaLabel = "カードスタック",
}: SwipeCardStackProps) {
  const total = items.length;
  const visible = Math.min(4, Math.max(1, Math.round(visibleCount)));
  // Absolute deck position of the top card. Grows without bound in loop
  // mode; the item is `items[pos mod total]`, and positions double as keys
  // so a looping item never collides with its own leaving copy.
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<SwipeDirection[]>([]);
  const [move, setMove] = useState<Move>({
    action: "swipe",
    dir: "right",
    distance: 0,
    velocity: 0,
  });

  const rootRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const refocusTop = useRef(false);

  const exhausted = !loop && index >= total;
  const canThrow = total > 0 && !exhausted;
  const canUndo = total > 0 && (loop || index > 0);
  const spring = {
    type: "spring" as const,
    stiffness: springStiffness,
    damping: springDamping,
  };

  // Hand focus to the new top card only if the leaving one had it (keyboard
  // users keep their place); never on mount. Looked up by deck position, not
  // a shared ref: the leaving card stays mounted during its exit and would
  // clear a shared ref when it finally unmounts.
  useEffect(() => {
    if (!refocusTop.current) return;
    refocusTop.current = false;
    const stack = stackRef.current;
    const top = stack?.querySelector<HTMLElement>(`[data-pos="${index}"]`);
    (top ?? stack)?.focus({ preventScroll: true });
  }, [index]);

  const flyDistance = () => {
    const stack = stackRef.current;
    const root = rootRef.current;
    const width = root?.offsetWidth ?? 600;
    const cardWidth = stack?.offsetWidth ?? 320;
    // Half the container + a full card clears the edge even when tilted.
    return width / 2 + cardWidth + 40;
  };

  const throwTop = (dir: SwipeDirection, velocity = 0) => {
    if (!canThrow) return;
    // Only the top card is focusable inside the stack (the rest are inert).
    refocusTop.current = !!stackRef.current?.contains(document.activeElement);
    setMove({ action: "swipe", dir, distance: flyDistance(), velocity });
    setHistory((h) => [...h, dir].slice(-HISTORY_LIMIT));
    setIndex((i) => i + 1);
    onSwipe?.(items[mod(index, total)], dir);
  };

  const undo = () => {
    if (!canUndo) return;
    const dir = history.at(-1) ?? "left";
    setMove({ action: "undo", dir, distance: flyDistance(), velocity: 0 });
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => i - 1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      throwTop("right");
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      throwTop("left");
    }
  };

  // Visible cards plus one invisible staging card, never more than the
  // deck holds (so the same item can't appear twice in the stack).
  const remaining = loop ? total : Math.max(0, total - index);
  const count = Math.min(visible + 1, remaining);
  const cards = Array.from({ length: count }, (_, depth) => {
    const pos = index + depth;
    return { pos, depth, item: items[mod(pos, total)], itemIndex: mod(pos, total) };
  }).reverse(); // deepest first → top card last in DOM order

  const vars: CSSVars = {};
  if (visible !== 3) vars["--scs-depth-room"] = `${(visible - 1) * STEP_Y}px`;

  const announcement =
    total === 0
      ? ""
      : exhausted
        ? `すべてのカードを見ました（${total} 枚）`
        : `${mod(index, total) + 1} / ${total}`;

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={rootRef}
        className={[styles.root, className].filter(Boolean).join(" ")}
        style={vars}
        aria-roledescription="カードスタック"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
      >
        <div ref={stackRef} className={styles.stack} tabIndex={-1}>
          <AnimatePresence custom={move} initial={false}>
            {cards.map(({ pos, depth, item, itemIndex }) => (
              <StackCard
                key={pos}
                item={item}
                ctx={{ index: itemIndex, total, isTop: depth === 0 }}
                depth={depth}
                visible={visible}
                zIndex={10 + count - depth}
                enterFrom={
                  depth === 0 && move.action === "undo"
                    ? {
                        ...depthPose(0, visible),
                        x: sign(move.dir) * move.distance,
                        opacity: 0,
                      }
                    : { ...depthPose(depth, visible), opacity: 0 }
                }
                threshold={threshold}
                rotateFactor={rotateFactor}
                showStamps={showStamps}
                likeLabel={likeLabel}
                nopeLabel={nopeLabel}
                spring={spring}
                onThrow={throwTop}
                renderCard={renderCard}
                pos={pos}
              />
            ))}
          </AnimatePresence>
          {exhausted && (
            <div className={styles.end}>
              {endSlot ?? (
                <>
                  <p className={styles.endTitle}>すべて見ました</p>
                  <button
                    type="button"
                    className={styles.endButton}
                    onClick={() => {
                      setHistory([]);
                      setMove((m) => ({ ...m, action: "swipe" }));
                      setIndex(0);
                    }}
                  >
                    最初から
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {showControls && (
          <div className={styles.controls}>
            <button
              type="button"
              className={`${styles.control} ${styles.controlSmall}`}
              onClick={undo}
              disabled={!canUndo}
              aria-label="前のカードに戻る"
            >
              <Undo2 size={17} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className={`${styles.control} ${styles.controlNope}`}
              onClick={() => throwTop("left")}
              disabled={!canThrow}
              aria-label="スキップ"
            >
              <X size={22} strokeWidth={2.2} aria-hidden />
            </button>
            <button
              type="button"
              className={`${styles.control} ${styles.controlLike}`}
              onClick={() => throwTop("right")}
              disabled={!canThrow}
              aria-label="いいね"
            >
              <Heart size={20} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        )}

        <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </section>
    </MotionConfig>
  );
}

export default SwipeCardStack;
