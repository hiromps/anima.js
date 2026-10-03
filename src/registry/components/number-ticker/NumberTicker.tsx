"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MotionConfig, animate, motion, type Transition } from "framer-motion";
import styles from "./NumberTicker.module.css";

export type NumberTickerVariant = "count" | "odometer";

export type NumberTickerProps = {
  /** Target number. Changing it re-animates from the number on screen. */
  value: number;
  /** Number the first animation starts from. */
  from?: number;
  /**
   * "count" (default) tweens the whole number up with an ease-out.
   * "odometer" rolls every digit on its own vertical 0–9 strip with
   * staggered springs; separators and units stay still.
   */
  variant?: NumberTickerVariant;
  /** Fraction digits, fixed (always shown, so the width never jitters). */
  decimals?: number;
  /** BCP 47 locale for digits, grouping and compact units. */
  locale?: string;
  /** Static text before the number, e.g. "¥" or "$". */
  prefix?: string;
  /** Static text after the number, e.g. "%" or "+". */
  suffix?: string;
  /** Compact notation: 24000 → "2.4万" (ja-JP) / "24K" (en-US). */
  compact?: boolean;
  /** "count" only: tween length in ms. */
  duration?: number;
  /** "odometer" only: spring stiffness of each digit's roll. */
  springStiffness?: number;
  /** "odometer" only: spring damping — lower overshoots past the digit. */
  springDamping?: number;
  /** Wait (ms) before the first animation. Later re-animations start at once. */
  delay?: number;
  /**
   * true (default): the first animation waits until the number is
   * scrolled into view. false: it starts on mount — for above-the-fold
   * heroes and previews.
   */
  startOnView?: boolean;
  /**
   * Announce value changes to screen readers (aria-live="polite"). Off by
   * default: a stat block that talks on every update is noise.
   */
  announce?: boolean;
  className?: string;
};

const DEFAULT_DURATION = 1800;
const DEFAULT_STIFFNESS = 110;
const DEFAULT_DAMPING = 19;
const DEFAULT_LOCALE = "ja-JP";
/** Left-to-right delay (s) between odometer digits. */
const STAGGER = 0.07;
/** Expo-out: most of the climb happens early, the last digits settle slowly. */
const COUNT_EASE = [0.16, 1, 0.3, 1] as const;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** false on the server; follows the OS "reduce motion" setting afterwards. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

type Formatter = {
  format: (n: number) => string;
  parts: (n: number) => Intl.NumberFormatPart[];
  /** Localized glyph → digit value (handles non-latin numeral systems). */
  digitOf: Map<string, number>;
  /** Digit value → localized glyph, for the odometer strips. */
  glyphs: string[];
};

function createFormatter(
  locale: string,
  decimals: number,
  compact: boolean,
): Formatter {
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? "compact" : "standard",
  };
  let nf: Intl.NumberFormat;
  let digitNf: Intl.NumberFormat;
  try {
    nf = new Intl.NumberFormat(locale, options);
    digitNf = new Intl.NumberFormat(locale, { useGrouping: false });
  } catch {
    // A malformed locale throws RangeError — fall back instead of crashing.
    nf = new Intl.NumberFormat(DEFAULT_LOCALE, options);
    digitNf = new Intl.NumberFormat(DEFAULT_LOCALE, { useGrouping: false });
  }
  const glyphs = Array.from({ length: 10 }, (_, d) => digitNf.format(d));
  return {
    format: (n) => nf.format(n),
    parts: (n) => nf.formatToParts(n),
    digitOf: new Map(glyphs.map((glyph, d) => [glyph, d])),
    glyphs,
  };
}

type Slot =
  | { kind: "digit"; key: string; digit: number; order: number }
  | { kind: "static"; key: string; text: string };

/** Digits of a formatted number, rightmost first. */
function digitsFromRight(fmt: Formatter, n: number): number[] {
  const out: number[] = [];
  for (const char of Array.from(fmt.format(n))) {
    const d = fmt.digitOf.get(char);
    if (d !== undefined) out.push(d);
  }
  return out.reverse();
}

/**
 * Splits the target into digit columns and static text. Columns are keyed
 * by their position from the right, so when the digit count changes the
 * ones digit stays the ones digit and keeps rolling instead of remounting.
 */
function toSlots(fmt: Formatter, n: number): Slot[] {
  const chars: string[] = [];
  for (const part of fmt.parts(n)) chars.push(...Array.from(part.value));
  const digitCount = chars.filter((c) => fmt.digitOf.has(c)).length;
  const slots: Slot[] = [];
  let order = 0;
  let staticRun = "";
  const flush = () => {
    if (!staticRun) return;
    slots.push({ kind: "static", key: `s${slots.length}`, text: staticRun });
    staticRun = "";
  };
  for (const char of chars) {
    const d = fmt.digitOf.get(char);
    if (d === undefined) {
      staticRun += char;
      continue;
    }
    flush();
    slots.push({
      kind: "digit",
      key: `d${digitCount - order - 1}`,
      digit: d,
      order,
    });
    order += 1;
  }
  flush();
  return slots;
}

/**
 * Each strip holds the digits twice (0–9, 0–9). The first run sits at the
 * start digit in the first set and lands in the second set, so every digit
 * spins at least partway round — trailing zeros roll too, airport-board
 * style. Later changes move within the second set: only digits that
 * actually changed roll.
 */
const STRIP_CELLS = 20;
const cellY = (index: number) => `${(-index * 100) / STRIP_CELLS}%`;

type DigitColumnProps = {
  glyphs: string[];
  startIndex: number;
  index: number;
  transition: Transition;
};

function DigitColumn({ glyphs, startIndex, index, transition }: DigitColumnProps) {
  return (
    <span className={styles.column}>
      {/* Sizes the column to the widest digit and gives it a baseline. */}
      <span className={styles.sizer}>{glyphs[8]}</span>
      <motion.span
        className={styles.strip}
        initial={{ y: cellY(startIndex) }}
        animate={{ y: cellY(index) }}
        transition={transition}
      >
        {Array.from({ length: STRIP_CELLS }, (_, i) => (
          <span key={i} className={styles.cell}>
            {glyphs[i % 10]}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Writes into React's own text node, so React's later updates still land. */
function writeText(el: HTMLElement, text: string) {
  const node = el.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE) node.nodeValue = text;
  else el.textContent = text;
}

/**
 * Animated stat number for landing pages. "count" tweens the value up,
 * "odometer" rolls each digit on its own strip. The first run starts when
 * the number scrolls into view; a new `value` re-animates from the number
 * currently on screen. Screen readers get the final formatted value in a
 * visually hidden span; the animated layer is aria-hidden.
 */
export function NumberTicker({
  value,
  from = 0,
  variant = "count",
  decimals = 0,
  locale = DEFAULT_LOCALE,
  prefix = "",
  suffix = "",
  compact = false,
  duration = DEFAULT_DURATION,
  springStiffness = DEFAULT_STIFFNESS,
  springDamping = DEFAULT_DAMPING,
  delay = 0,
  startOnView = true,
  announce = false,
  className,
}: NumberTickerProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const [inView, setInView] = useState(!startOnView);
  // State, not a ref: the odometer reads it during render to apply
  // `delay` to the first run only.
  const [initialValue] = useState(value);
  // "count": the number currently on screen, and the last settled one
  // React renders (per-frame updates bypass React entirely).
  const liveRef = useRef(from);
  const [settled, setSettled] = useState(from);
  const firstRunRef = useRef(true);

  const safeDecimals = Math.max(0, Math.min(20, Math.round(decimals)));
  const fmt = useMemo(
    () => createFormatter(locale, safeDecimals, compact),
    [locale, safeDecimals, compact],
  );

  const active = inView || reduced;

  // First run waits for the viewport. Once seen, it stays "seen".
  useEffect(() => {
    if (inView || reduced) return;
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setInView(true);
      },
      // Start once the number is properly on screen, not at the very edge.
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, reduced]);

  // "count": tween from whatever is on screen to `value`.
  useEffect(() => {
    if (variant !== "count" || !active) return;
    const el = countRef.current;
    if (!el) return;
    const render = (n: number) => writeText(el, prefix + fmt.format(n) + suffix);
    if (reduced) {
      liveRef.current = value;
      render(value);
      return;
    }
    const wait = firstRunRef.current ? delay / 1000 : 0;
    const controls = animate(liveRef.current, value, {
      duration: Math.max(0, duration) / 1000,
      delay: wait,
      ease: COUNT_EASE,
      onUpdate: (n) => {
        // Cleared on the first real frame (after the delay), so a StrictMode
        // re-run or an early cancel doesn't swallow the delay.
        firstRunRef.current = false;
        liveRef.current = n;
        render(n);
      },
      onComplete: () => setSettled(value),
    });
    return () => controls.stop();
  }, [variant, active, reduced, value, duration, delay, fmt, prefix, suffix]);

  const finalText = prefix + fmt.format(value) + suffix;

  const classes = [styles.root, className].filter(Boolean).join(" ");

  let visual;
  if (variant === "odometer") {
    const startDigits = digitsFromRight(fmt, from);
    const first = value === initialValue;
    const slots = toSlots(fmt, value);
    const digitTotal = slots.filter((s) => s.kind === "digit").length;
    visual = (
      <span className={styles.odometer}>
        {prefix ? <span className={styles.affix}>{prefix}</span> : null}
        {slots.map((slot) => {
          if (slot.kind === "static") {
            return (
              <span key={slot.key} className={styles.affix}>
                {slot.text}
              </span>
            );
          }
          const fromRight = digitTotal - slot.order - 1;
          const startIndex = reduced ? 10 + slot.digit : (startDigits[fromRight] ?? 0);
          return (
            <DigitColumn
              key={slot.key}
              glyphs={fmt.glyphs}
              startIndex={startIndex}
              index={active ? 10 + slot.digit : startIndex}
              transition={{
                type: "spring",
                stiffness: springStiffness,
                damping: springDamping,
                mass: 1,
                delay: (first ? delay / 1000 : 0) + slot.order * STAGGER,
              }}
            />
          );
        })}
        {suffix ? <span className={styles.affix}>{suffix}</span> : null}
      </span>
    );
  } else {
    const shown = reduced ? value : settled;
    visual = (
      // The hidden ghost reserves the final width from the first frame, so
      // the box doesn't grow as "0" climbs to "12,480,000".
      <span className={styles.stack}>
        <span className={styles.ghost}>{finalText}</span>
        <span ref={countRef} className={styles.count}>
          {prefix + fmt.format(shown) + suffix}
        </span>
      </span>
    );
  }

  return (
    // Follows the OS "reduce motion" setting: digits land without rolling.
    <MotionConfig reducedMotion="user">
      <span
        ref={rootRef}
        className={classes}
        data-number-ticker
        data-variant={variant}
      >
        <span className={styles.srOnly} aria-live={announce ? "polite" : undefined}>
          {finalText}
        </span>
        <span className={styles.visual} aria-hidden>
          {visual}
        </span>
      </span>
    </MotionConfig>
  );
}

export default NumberTicker;
