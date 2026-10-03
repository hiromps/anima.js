"use client";

import {
  MotionConfig,
  motion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import styles from "./TextReveal.module.css";

export type TextRevealMode = "enter" | "scroll" | "loop";
export type TextRevealVariant = "blur-up" | "fade" | "slide" | "mask";
export type TextRevealSplit = "auto" | "word" | "char";

export type TextRevealProps = {
  /** The text to reveal. `\n` forces a line break. */
  text: string;
  /** Element to render. Use a heading tag when the text is a heading. */
  as?: "h1" | "h2" | "h3" | "p";
  /**
   * "enter" plays once when scrolled into view, "scroll" ties each piece's
   * opacity (20% → 100%) to the element's progress through the viewport
   * (or `scrollContainerRef`), "loop" replays every `interval` ms while
   * on screen.
   */
  mode?: TextRevealMode;
  /**
   * How each piece arrives ("enter" / "loop"): "blur-up" (blur 8px → 0 +
   * rise + fade), "fade", "slide" (a longer rise), "mask" (rises from
   * behind a clipped line). "scroll" always uses the opacity highlight.
   */
  variant?: TextRevealVariant;
  /** Delay (ms) between consecutive pieces. */
  stagger?: number;
  /** Duration (ms) of one piece's animation. */
  duration?: number;
  /** "loop" only: time (ms) from one replay start to the next. */
  interval?: number;
  /**
   * "auto" (default) animates latin text word by word and Japanese / CJK
   * character by character. "word" keeps Japanese phrases (up to the next
   * 、。) together; "char" splits latin words into letters too.
   */
  split?: TextRevealSplit;
  /** "scroll" only: the scrolling ancestor, when it isn't the window. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /** Paints one gradient across the whole block (override `--tr-gradient`). */
  gradient?: boolean;
  className?: string;
};

const DEFAULT_STAGGER = 60;
const DEFAULT_DURATION = 900;
const DEFAULT_INTERVAL = 4500;
/** Loop: how long the completed first paint holds before the first replay. */
const FIRST_HOLD = 1400;
/** Loop: the quick dissolve before each replay. */
const OUT_MS = 380;
/** Scroll: opacity of a piece that hasn't been reached yet. */
const SCROLL_DIM = 0.2;

/* ---------------------------------------------------------------------------
   Splitting
   ------------------------------------------------------------------------- */

/**
 * Full-width code points: CJK, kana, hangul, full-width forms. These are
 * animated per character in "auto" and may wrap between any two of them.
 */
const WIDE =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꥠ-꥿가-힣豈-﫿︰-﹏＀-｠￠-￦]|[\u{20000}-\u{3FFFD}]/u;
/** Japanese closing punctuation sticks to the previous piece (kinsoku). */
const CLOSING = /[、。，．！？）」』】〉》〕・ー〜…]/;
/** Opening brackets stick to the next piece. */
const OPENING = /[（「『【〈《〔［｛]/;
/** "word" split: a Japanese phrase ends after one of these. */
const PHRASE_END = /[、。，．！？）」』】〉》〕…]/;
const SPACE = /\s/;

type Token =
  | { kind: "space" }
  | { kind: "break" }
  /** A nowrap group; each unit is one animated piece. */
  | { kind: "group"; units: string[] };

type GraphemeSegmenter = {
  segment: (input: string) => Iterable<{ segment: string }>;
};

/**
 * Grapheme clusters, so an emoji sequence or a base + combining mark never
 * splits into two animated pieces. `Array.from` (code points) is the
 * fallback where Intl.Segmenter is missing.
 */
function graphemes(text: string): string[] {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: "grapheme" },
      ) => GraphemeSegmenter;
    }
  ).Segmenter;
  if (!Segmenter) return Array.from(text);
  return Array.from(
    new Segmenter(undefined, { granularity: "grapheme" }).segment(text),
    (s) => s.segment,
  );
}

/**
 * Splits text into nowrap groups of animated units. Latin words are never
 * broken (one inline-block per letter would let a word wrap anywhere);
 * Japanese can wrap between characters, except before closing punctuation
 * or after an opening bracket. Word segmentation of Japanese is done by
 * punctuation rather than Intl.Segmenter's dictionary, so the server and
 * the browser always produce the same pieces (no hydration mismatch).
 */
function tokenize(text: string, split: TextRevealSplit): Token[] {
  const tokens: Token[] = [];
  let latin: string[] = [];
  let phrase: string[] = [];
  let prefix = "";

  const lastGroup = () => {
    const last = tokens[tokens.length - 1];
    return last?.kind === "group" ? last : null;
  };
  const appendToLast = (char: string) => {
    const group = lastGroup();
    if (!group) return false;
    group.units[group.units.length - 1] += char;
    return true;
  };
  const flushLatin = () => {
    if (!latin.length) return;
    tokens.push({
      kind: "group",
      units: split === "char" ? latin : [latin.join("")],
    });
    latin = [];
  };
  const flushPhrase = () => {
    if (!phrase.length) return;
    tokens.push({ kind: "group", units: [phrase.join("")] });
    phrase = [];
  };
  const flushAll = () => {
    flushLatin();
    flushPhrase();
    if (prefix) tokens.push({ kind: "group", units: [prefix] });
    prefix = "";
  };

  for (const char of graphemes(text)) {
    if (char === "\n" || char === "\r\n") {
      flushAll();
      tokens.push({ kind: "break" });
    } else if (SPACE.test(char)) {
      flushAll();
      if (lastGroup()) tokens.push({ kind: "space" });
    } else if (WIDE.test(char)) {
      flushLatin();
      if (split === "word") {
        if (OPENING.test(char)) flushPhrase();
        // "Hello。": closing punctuation right after a latin word.
        if (!phrase.length && CLOSING.test(char) && appendToLast(char)) continue;
        phrase.push(char);
        if (PHRASE_END.test(char)) flushPhrase();
      } else if (CLOSING.test(char) && !prefix && appendToLast(char)) {
        // Attached to the previous piece.
      } else if (OPENING.test(char)) {
        prefix += char;
      } else {
        tokens.push({ kind: "group", units: [prefix + char] });
        prefix = "";
      }
    } else {
      flushPhrase();
      latin.push(prefix + char);
      prefix = "";
    }
  }
  flushAll();
  while (tokens.length && tokens[tokens.length - 1].kind === "space") tokens.pop();
  return tokens;
}

/** Renders tokens, numbering the units in reading order for the stagger. */
function renderTokens(
  tokens: Token[],
  renderUnit: (text: string, index: number) => ReactNode,
): ReactNode[] {
  let index = 0;
  return tokens.map((token, i) => {
    if (token.kind === "space") return " ";
    if (token.kind === "break") return <br key={i} />;
    return (
      <span key={i} className={styles.group}>
        {token.units.map((unit) => renderUnit(unit, index++))}
      </span>
    );
  });
}

function countUnits(tokens: Token[]): number {
  return tokens.reduce((n, t) => n + (t.kind === "group" ? t.units.length : 0), 0);
}

/* ---------------------------------------------------------------------------
   Reduced motion
   ------------------------------------------------------------------------- */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * false on the server and during hydration (so the markup matches), then
 * follows the OS setting. framer's useReducedMotion may differ between the
 * server and the first client render.
 */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/* ---------------------------------------------------------------------------
   Motion
   ------------------------------------------------------------------------- */

/** Start (hidden) and end (visible) state per variant. Transforms in em so
    the motion scales with the font size. */
const FROM: Record<TextRevealVariant, Record<string, string | number>> = {
  "blur-up": { opacity: 0, y: "0.35em", filter: "blur(8px)" },
  fade: { opacity: 0 },
  slide: { opacity: 0, y: "0.9em" },
  // Far enough that descenders clear the mask's extended bottom edge.
  mask: { y: "135%" },
};

const TO: Record<TextRevealVariant, Record<string, string | number>> = {
  "blur-up": { opacity: 1, y: "0em", filter: "blur(0px)" },
  fade: { opacity: 1 },
  slide: { opacity: 1, y: "0em" },
  mask: { y: "0%" },
};

/** Soft deceleration for blur / fade; a sharper expo-out for the rises. */
const EASE: Record<TextRevealVariant, [number, number, number, number]> = {
  "blur-up": [0.22, 1, 0.36, 1],
  fade: [0.33, 1, 0.68, 1],
  slide: [0.16, 1, 0.3, 1],
  mask: [0.16, 1, 0.3, 1],
};

function buildVariants(
  variant: TextRevealVariant,
  stagger: number,
  duration: number,
): Variants {
  return {
    // Also the loop's dissolve: quick, nearly simultaneous, ease-in.
    hidden: (i: number) => ({
      ...FROM[variant],
      transition: {
        duration: OUT_MS / 1000,
        delay: Math.min(i * 0.012, 0.15),
        ease: [0.4, 0, 1, 1],
      },
    }),
    visible: (i: number) => ({
      ...TO[variant],
      transition: {
        duration: duration / 1000,
        delay: (i * stagger) / 1000,
        ease: EASE[variant],
      },
    }),
  };
}

type VisualProps = {
  tokens: Token[];
  rootRef: RefObject<HTMLElement | null>;
  variant: TextRevealVariant;
  mode: "enter" | "loop";
  stagger: number;
  duration: number;
  interval: number;
};

/** "enter" / "loop": every unit runs the variant, driven by one phase. */
function MotionVisual({
  tokens,
  rootRef,
  variant,
  mode,
  stagger,
  duration,
  interval,
}: VisualProps) {
  const variants = useMemo(
    () => buildVariants(variant, stagger, duration),
    [variant, stagger, duration],
  );
  // "enter": once, when properly on screen. "loop": pauses offscreen.
  const inView = useInView(rootRef, {
    once: mode === "enter",
    margin: mode === "enter" ? "0px 0px -12% 0px" : "0px",
    amount: mode === "enter" ? "some" : 0.2,
  });
  // A loop paints the finished text first (never an empty hero / gallery
  // card), holds, then dissolves and replays.
  const [phase, setPhase] = useState<"hidden" | "visible">(
    mode === "loop" ? "visible" : "hidden",
  );
  const replayed = useRef(false);
  const units = countUnits(tokens);

  useEffect(() => {
    if (mode !== "loop" || !inView) return;
    const reveal = duration + stagger * Math.max(0, units - 1);
    const hold = Math.max(600, interval - reveal - OUT_MS);
    const delay =
      phase === "hidden" ? OUT_MS : replayed.current ? reveal + hold : FIRST_HOLD;
    // One state change per phase (not per frame); leaving the viewport
    // clears the timer, so offscreen loops cost nothing.
    const timer = window.setTimeout(() => {
      replayed.current = true;
      setPhase((p) => (p === "visible" ? "hidden" : "visible"));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [mode, inView, phase, duration, stagger, interval, units]);

  const animate = mode === "enter" ? (inView ? "visible" : "hidden") : phase;
  const initial = mode === "loop" ? "visible" : "hidden";

  return renderTokens(tokens, (unit, i) => {
    const piece = (
      <motion.span
        key={variant === "mask" ? undefined : i}
        className={styles.piece}
        data-tr-piece
        custom={i}
        variants={variants}
        initial={initial}
        animate={animate}
      >
        {unit}
      </motion.span>
    );
    return variant === "mask" ? (
      <span key={i} className={styles.mask}>
        {piece}
      </span>
    ) : (
      piece
    );
  });
}

function ScrollPiece({
  text,
  progress,
  range,
}: {
  text: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [SCROLL_DIM, 1]);
  return (
    <motion.span className={styles.piece} data-tr-piece style={{ opacity }}>
      {text}
    </motion.span>
  );
}

/**
 * "scroll": progress runs from the block's top entering the lower edge of
 * the viewport (90%) to its bottom passing 45%, so the last word lights up
 * while the paragraph is still comfortably on screen. Each piece owns an
 * overlapping slice of that progress — a soft wave, not a hard cursor.
 */
function ScrollVisual({
  tokens,
  rootRef,
  containerRef,
}: {
  tokens: Token[];
  rootRef: RefObject<HTMLElement | null>;
  containerRef?: RefObject<HTMLElement | null>;
}) {
  const { scrollYProgress } = useScroll({
    target: rootRef,
    container: containerRef,
    offset: ["start 0.9", "end 0.45"],
  });
  const n = countUnits(tokens);
  const span = Math.min(0.5, Math.max(0.08, 3 / Math.max(1, n)));
  return renderTokens(tokens, (unit, i) => {
    const start = n > 1 ? (i / (n - 1)) * (1 - span) : 0;
    return (
      <ScrollPiece
        key={i}
        text={unit}
        progress={scrollYProgress}
        range={[start, start + span]}
      />
    );
  });
}

/* ---------------------------------------------------------------------------
   Component
   ------------------------------------------------------------------------- */

/**
 * Headline / paragraph reveal: the text is split into words (latin) or
 * characters (Japanese) that arrive staggered — blur-up, fade, slide or a
 * line mask — on enter, on a loop, or tied to scroll position (the
 * Apple-style paragraph highlight). The real text stays in a visually
 * hidden span; the animated pieces are aria-hidden. Under reduced motion
 * the final text renders statically.
 */
export function TextReveal({
  text,
  as: Tag = "h2",
  mode = "enter",
  variant = "blur-up",
  stagger = DEFAULT_STAGGER,
  duration = DEFAULT_DURATION,
  interval = DEFAULT_INTERVAL,
  split = "auto",
  scrollContainerRef,
  gradient = false,
  className,
}: TextRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const tokens = useMemo(() => tokenize(text, split), [text, split]);
  // Remount the pieces when the structure or the motion model changes:
  // `initial` only applies on mount, and a loop must restart cleanly.
  const structureKey = `${mode}|${variant}|${split}|${reduced}|${text}`;

  // Gradient: background-clip:text on each piece would restart the
  // gradient per word. Instead every piece gets the root-sized gradient,
  // shifted by its own offset, so together they read as one fill. Offsets
  // (offsetLeft/Top) ignore transforms, so animation never needs a
  // re-measure — only layout changes do.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!gradient || !root) return;
    const measure = () => {
      root.style.setProperty("--tr-w", `${root.offsetWidth}px`);
      root.style.setProperty("--tr-h", `${root.offsetHeight}px`);
      root.querySelectorAll<HTMLElement>("[data-tr-piece]").forEach((el) => {
        el.style.setProperty("--tr-x", `${-el.offsetLeft}px`);
        el.style.setProperty("--tr-y", `${-el.offsetTop}px`);
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    let alive = true;
    // Web fonts can re-wrap the text without resizing the block.
    document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [gradient, structureKey]);

  let visual: ReactNode;
  if (reduced) {
    visual = renderTokens(tokens, (unit, i) => (
      <span key={i} className={styles.piece} data-tr-piece>
        {unit}
      </span>
    ));
  } else if (mode === "scroll") {
    visual = (
      <ScrollVisual
        tokens={tokens}
        rootRef={rootRef}
        containerRef={scrollContainerRef}
      />
    );
  } else {
    visual = (
      <MotionVisual
        tokens={tokens}
        rootRef={rootRef}
        variant={variant}
        mode={mode}
        stagger={stagger}
        duration={duration}
        interval={interval}
      />
    );
  }

  const classes = [styles.root, className].filter(Boolean).join(" ");

  return (
    <MotionConfig reducedMotion="user">
      <Tag
        // A union of intrinsic tags has no single ref type TS can check;
        // every option is an HTMLElement, which is all the effects need.
        ref={rootRef as never}
        className={classes}
        data-text-reveal
        data-gradient={gradient || undefined}
      >
        <span className={styles.srOnly}>{text}</span>
        <span key={structureKey} className={styles.visual} aria-hidden>
          {visual}
        </span>
      </Tag>
    </MotionConfig>
  );
}

export default TextReveal;
