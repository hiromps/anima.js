"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./TextScramble.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/** Built-in glyph sets. Any other string is used as a custom set. */
export type TextScrambleGlyphPreset =
  | "auto"
  | "latin"
  | "katakana"
  | "symbols";

export type TextScrambleTrigger = "mount" | "hover" | "loop";

export type TextScrambleProps = {
  /** Target text for "mount" / "hover". Falls back to `phrases[0]`. */
  text?: string;
  /** Phrases cycled by `trigger="loop"`. Falls back to `[text]`. */
  phrases?: string[];
  /**
   * "mount" decodes once when scrolled into view, "hover" re-decodes on
   * pointer enter / focus (of the closest interactive ancestor if there
   * is one), "loop" cycles through `phrases` with a pause in between.
   */
  trigger?: TextScrambleTrigger;
  /** Time (ms) from the first glyph to the last character resolving. */
  duration?: number;
  /** Glyph swaps per second while a character is scrambling. */
  speed?: number;
  /** "loop" only: how long (ms) a resolved phrase stays before the next. */
  pause?: number;
  /**
   * "auto" (default) scrambles full-width characters (Japanese, CJK) with
   * katakana and the rest with latin letters, so a glyph never spills far
   * out of its character's box. "latin" / "katakana" / "symbols" force a
   * set; any other string is used as a custom glyph set.
   */
  glyphs?: TextScrambleGlyphPreset | (string & {});
  /** Element to render. Use a heading tag when the text is a heading. */
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  /** Color of the unresolved glyphs and of the resolve flash. */
  accentColor?: string;
  /** Monospace font stack — every character box is the same width. */
  monospace?: boolean;
  className?: string;
};

const DEFAULT_ACCENT = "#9aa8ff";
const DEFAULT_DURATION = 1400;
const DEFAULT_SPEED = 22;
const DEFAULT_PAUSE = 2400;
/** The exit (scramble-out) of a loop phrase is shorter than the entry. */
const OUT_RATIO = 0.45;
const OUT_MAX = 700;

const GLYPH_SETS: Record<Exclude<TextScrambleGlyphPreset, "auto">, string> = {
  latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  katakana:
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボ",
  symbols: "!<>-_\\/[]{}=+*^?#$%&@~:;|",
};
/** "auto" narrow set: letters plus a few symbols for the hacker texture. */
const AUTO_NARROW = `${GLYPH_SETS.latin}#$%&*+<>/=?`;

/**
 * Full-width code points: CJK, kana, hangul, full-width forms. These
 * break lines between characters and get the wide glyph set in "auto".
 */
const WIDE =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꥠ-꥿가-힣豈-﫿︰-﹏＀-｠￠-￦]|[\u{20000}-\u{3FFFD}]/u;
/** Japanese closing punctuation sticks to the previous character (kinsoku). */
const CLOSING = /[、。，．！？）」』】〉》〕・ー〜…]/;
const SPACE = /\s/;

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

type Token =
  | { kind: "space"; value: string }
  | { kind: "cell"; value: string }
  | { kind: "word"; chars: string[] };

/**
 * Splits text into renderable tokens. Latin words become nowrap groups
 * (one inline-block per character would otherwise let a word break
 * anywhere); full-width characters stay separate so Japanese can wrap
 * between any two characters, except before closing punctuation.
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let word: string[] = [];
  const flush = () => {
    if (word.length) tokens.push({ kind: "word", chars: word });
    word = [];
  };
  for (const char of Array.from(text)) {
    if (SPACE.test(char)) {
      flush();
      tokens.push({ kind: "space", value: char });
    } else if (WIDE.test(char)) {
      flush();
      const last = tokens[tokens.length - 1];
      if (CLOSING.test(char) && last && last.kind !== "space") {
        tokens[tokens.length - 1] = {
          kind: "word",
          chars: last.kind === "cell" ? [last.value, char] : [...last.chars, char],
        };
      } else {
        tokens.push({ kind: "cell", value: char });
      }
    } else {
      word.push(char);
    }
  }
  flush();
  return tokens;
}

/** Glyph picker per character, resolved once per phase. */
function glyphPicker(glyphs: string) {
  if (glyphs === "auto") {
    const narrow = Array.from(AUTO_NARROW);
    const wide = Array.from(GLYPH_SETS.katakana);
    return (char: string) => {
      const set = WIDE.test(char) ? wide : narrow;
      return set[(Math.random() * set.length) | 0];
    };
  }
  const source =
    glyphs in GLYPH_SETS
      ? GLYPH_SETS[glyphs as keyof typeof GLYPH_SETS]
      : glyphs || AUTO_NARROW;
  const set = Array.from(source);
  return () => set[(Math.random() * set.length) | 0];
}

/**
 * Per-character state lives in a data attribute written straight to the
 * DOM — React renders the structure once per phrase, the animation never
 * re-renders. "h" hidden (box kept), "s" scrambling, "r" just resolved
 * (plays the settle flash), absent = plain resolved text (SSR / static).
 */
type CellState = "h" | "s" | "r";

type Cell = {
  el: HTMLElement;
  glyph: HTMLElement;
  char: string;
  state: CellState | null;
};

function collectCells(root: HTMLElement): Cell[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-ts-cell]")).map(
    (el) => ({
      el,
      glyph: el.lastElementChild as HTMLElement,
      char: el.dataset.tsCell ?? "",
      // Read back from the DOM: reused nodes keep the previous phrase's
      // state, which a switch to "hover" / reduced motion must clear.
      state: (el.getAttribute("data-s") as CellState | null) ?? null,
    }),
  );
}

function setState(cell: Cell, state: CellState | null) {
  if (cell.state === state) return;
  cell.state = state;
  if (state) cell.el.setAttribute("data-s", state);
  else cell.el.removeAttribute("data-s");
}

type PhaseOptions = {
  cells: Cell[];
  /** "in" resolves left to right; "out" scrambles and fades left to right. */
  mode: "in" | "out";
  /** "in" only: characters also appear left to right instead of all at once. */
  fromHidden: boolean;
  duration: number;
  speed: number;
  pick: (char: string) => string;
  onDone: () => void;
};

/** Runs one rAF-driven phase. Returns a cancel function. */
function runPhase({
  cells,
  mode,
  fromHidden,
  duration,
  speed,
  pick,
  onDone,
}: PhaseOptions): () => void {
  const last = Math.max(1, cells.length - 1);
  // Small random offsets keep the sweep from looking like a typewriter.
  const timing = cells.map((_, i) => {
    const t = i / last;
    const jitter = (Math.random() - 0.5) * 0.08 * duration;
    if (mode === "in") {
      return {
        a: fromHidden ? duration * 0.3 * t : 0,
        b: Math.max(duration * 0.3 * t + 60, duration * (0.35 + 0.65 * t) + jitter),
      };
    }
    const a = Math.max(0, duration * 0.5 * t + jitter * 0.5);
    return { a, b: a + duration * 0.5 };
  });
  const swapEvery = 1000 / Math.max(1, speed);
  let start = -1;
  let lastSwap = -Infinity;
  let frame = 0;

  const tick = (now: number) => {
    if (start < 0) start = now;
    const elapsed = now - start;
    const swap = now - lastSwap >= swapEvery;
    if (swap) lastSwap = now;
    let pending = false;

    cells.forEach((cell, i) => {
      const { a, b } = timing[i];
      let next: CellState;
      if (mode === "in") next = elapsed < a ? "h" : elapsed < b ? "s" : "r";
      else next = elapsed < a ? "r" : elapsed < b ? "s" : "h";
      const entering = cell.state !== next;
      if (next === "s" && (entering || swap)) {
        cell.glyph.textContent = pick(cell.char);
      }
      setState(cell, next);
      if (next !== (mode === "in" ? "r" : "h")) pending = true;
    });

    if (pending) frame = requestAnimationFrame(tick);
    else onDone();
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

/**
 * "Decode" text effect: characters cycle through random glyphs and
 * resolve left to right into the target text. Every character is an
 * inline-block that reserves its final glyph's width, so the line never
 * jitters while scrambling. The real text stays in a visually hidden
 * span; the animated characters are aria-hidden.
 */
export function TextScramble({
  text,
  phrases,
  trigger = "mount",
  duration = DEFAULT_DURATION,
  speed = DEFAULT_SPEED,
  pause = DEFAULT_PAUSE,
  glyphs = "auto",
  as: Tag = "span",
  accentColor,
  monospace = false,
  className,
}: TextScrambleProps) {
  const rootRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  const list =
    trigger === "loop"
      ? (phrases ?? []).filter(Boolean).length
        ? (phrases ?? []).filter(Boolean)
        : [text ?? ""]
      : [text ?? phrases?.[0] ?? ""];
  // Reduced motion freezes a loop on its first phrase: swapping text on a
  // timer is still motion, and there would be no way to pause it.
  const current = list[reduced ? 0 : index % list.length];
  const listKey = list.join("\u0000");

  // Layout effect: the initial state (hidden characters) is applied before
  // the browser paints the freshly rendered phrase, so it never flashes.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const visual = visualRef.current;
    if (!root || !visual) return;
    const cells = collectCells(visual);
    if (reduced || cells.length === 0) {
      cells.forEach((cell) => setState(cell, null));
      return;
    }

    const pick = glyphPicker(glyphs);
    const outDuration = Math.min(OUT_MAX, duration * OUT_RATIO);
    let cancelPhase: (() => void) | null = null;
    let timer = 0;
    let running = false;
    const stop = () => {
      cancelPhase?.();
      cancelPhase = null;
      window.clearTimeout(timer);
      running = false;
    };
    const play = (
      mode: "in" | "out",
      fromHidden: boolean,
      ms: number,
      onDone: () => void,
    ) => {
      running = true;
      cancelPhase = runPhase({
        cells,
        mode,
        fromHidden,
        duration: ms,
        speed,
        pick,
        onDone: () => {
          running = false;
          cancelPhase = null;
          onDone();
        },
      });
    };

    if (trigger === "hover") {
      cells.forEach((cell) => setState(cell, null));
      // Hovering / focusing a card or link should decode its label too.
      const target =
        root.closest<HTMLElement>('a[href], button, [role="button"], [tabindex]') ??
        root;
      const onEnter = () => {
        if (!running) play("in", false, duration, () => {});
      };
      target.addEventListener("pointerenter", onEnter);
      target.addEventListener("focusin", onEnter);
      return () => {
        stop();
        target.removeEventListener("pointerenter", onEnter);
        target.removeEventListener("focusin", onEnter);
      };
    }

    cells.forEach((cell) => setState(cell, "h"));

    if (trigger === "mount") {
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          play("in", true, duration, () => {});
        },
        // Bottom margin: start once the text is properly on screen. No
        // threshold ratio — a tall block might never reach it.
        { rootMargin: "0px 0px -12% 0px" },
      );
      observer.observe(root);
      return () => {
        observer.disconnect();
        stop();
      };
    }

    // Loop: decode → hold → scramble out → next phrase (a new render, which
    // re-runs this effect). Offscreen, the cycle stops and restarts from
    // the decode of the current phrase when it comes back.
    const cycle = () => {
      play("in", true, duration, () => {
        timer = window.setTimeout(() => {
          play("out", false, outDuration, () => setIndex((i) => i + 1));
        }, pause);
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible && !running && !timer) cycle();
        else if (!visible) {
          stop();
          timer = 0;
          cells.forEach((cell) => setState(cell, "h"));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      stop();
    };
    // listKey stands in for `list`; `index` re-arms the loop per phrase.
  }, [current, index, listKey, trigger, duration, speed, pause, glyphs, reduced]);

  // The CSS module carries the default accent; set inline only if changed.
  const vars: CSSVars = {};
  if (accentColor && accentColor.toLowerCase() !== DEFAULT_ACCENT) {
    vars["--ts-accent"] = accentColor;
  }

  let key = 0;
  const cell = (char: string): ReactNode => (
    <span key={key++} className={styles.cell} data-ts-cell={char}>
      <span className={styles.final}>{char}</span>
      <span className={styles.glyph} />
    </span>
  );

  const classes = [styles.root, className].filter(Boolean).join(" ");

  return (
    <Tag
      // A union of intrinsic tags has no single ref type TS can check;
      // every option is an HTMLElement, which is all the effect needs.
      ref={rootRef as never}
      className={classes}
      data-text-scramble
      data-monospace={monospace || undefined}
      style={vars}
    >
      <span className={styles.srOnly}>{current}</span>
      <span ref={visualRef} aria-hidden>
        {tokenize(current).map((token) => {
          if (token.kind === "space") return token.value;
          if (token.kind === "cell") return cell(token.value);
          return (
            <span key={key++} className={styles.word}>
              {token.chars.map(cell)}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}

export default TextScramble;
