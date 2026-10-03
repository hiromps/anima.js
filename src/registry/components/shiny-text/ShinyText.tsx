"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./ShinyText.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type ShinyTextVariant = "shimmer" | "gradient" | "aurora" | "metallic";

export type ShinyTextProps = {
  /** The text. Takes precedence over `children`. */
  text?: string;
  /** Plain text content; used when `text` is not given. */
  children?: string;
  /**
   * "shimmer" a bright band sweeps across muted text every cycle,
   * "gradient" a multi-stop gradient slowly flows through the text,
   * "aurora" a soft drifting gradient with a blurred glow behind it,
   * "metallic" a chrome gradient with a moving specular streak.
   */
  variant?: ShinyTextVariant;
  /**
   * 2–4 colors. gradient / aurora: the gradient stops. shimmer: tints
   * the edges of the highlight band (first two). metallic: tints the
   * dark band of the chrome (first one).
   */
  colors?: string[];
  /** shimmer only: the muted color of the text outside the band. */
  baseColor?: string;
  /**
   * Seconds per cycle. Defaults per variant: shimmer 3, gradient 6,
   * aurora 8, metallic 4.
   */
  speed?: number;
  /** Gradient / band direction in degrees. */
  angle?: number;
  /** Element to render. Use a heading tag when the text is a heading. */
  as?: "span" | "h1" | "h2" | "p";
  /**
   * Blurred, colored copy of the text behind it. Defaults to on for
   * "aurora" and off for the other variants.
   */
  glow?: boolean;
  className?: string;
};

const DEFAULT_COLORS = ["#a78bfa", "#f472b6", "#60a5fa"] as const;
const DEFAULT_BASE = "#8e8a9f";
const DEFAULT_ANGLE = 110;
const MIN_SPEED = 0.5;

/** 0 → the defaults, 1 → doubled (a gradient needs two stops), max 4. */
function normalizeColors(colors: string[] | undefined): string[] {
  const list = (colors ?? []).filter(Boolean).slice(0, 4);
  if (list.length === 0) return [...DEFAULT_COLORS];
  if (list.length === 1) return [list[0], list[0]];
  return list;
}

/**
 * Animated gradient text — shimmer, flowing gradient, aurora and metallic
 * in one component. Pure CSS: the gradient is painted as the background
 * of an inline span and clipped to the glyphs with `background-clip:
 * text`, so the real text stays real (selectable, translatable, read by
 * screen readers). Browsers without text clipping get a solid, readable
 * color instead. The optional glow is a blurred, aria-hidden duplicate.
 */
export function ShinyText({
  text,
  children,
  variant = "shimmer",
  colors,
  baseColor,
  speed,
  angle,
  as: Tag = "span",
  glow,
  className,
}: ShinyTextProps) {
  const rootRef = useRef<HTMLElement>(null);
  const content = text ?? children ?? "";
  const showGlow = glow ?? variant === "aurora";

  // Pause offscreen: background-position animations repaint the text box
  // every frame (the glow even re-blurs it), which is wasted work for a
  // headline scrolled out of view. Written straight to the DOM — toggling
  // animation-play-state never needs a React render.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible) el.removeAttribute("data-paused");
      else el.setAttribute("data-paused", "");
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The CSS module carries every default; only differences go inline, so
  // the default render is exactly the stylesheet.
  const vars: CSSVars = {};
  const palette = normalizeColors(colors);
  palette.slice(0, 3).forEach((color, i) => {
    if (color.toLowerCase() !== DEFAULT_COLORS[i]) vars[`--st-c${i + 1}`] = color;
  });
  // The stylesheet's stop list assumes three colors; anything else spells
  // the list out. The first color closes it so the flow loops smoothly.
  if (palette.length !== 3) {
    vars["--st-stops"] = [...palette, palette[0]].join(", ");
  }
  if (baseColor && baseColor.toLowerCase() !== DEFAULT_BASE) {
    vars["--st-base"] = baseColor;
  }
  if (typeof speed === "number" && Number.isFinite(speed)) {
    vars["--st-speed"] = `${Math.max(MIN_SPEED, speed)}s`;
  }
  if (typeof angle === "number" && Number.isFinite(angle) && angle !== DEFAULT_ANGLE) {
    vars["--st-angle"] = `${angle}deg`;
  }

  const classes = [styles.root, className].filter(Boolean).join(" ");

  return (
    <Tag
      // A union of intrinsic tags has no single ref type TS can check;
      // every option is an HTMLElement, which is all the effect needs.
      ref={rootRef as never}
      className={classes}
      data-shiny-text
      data-variant={variant}
      data-glow={showGlow || undefined}
      data-inline={Tag === "span" || undefined}
      style={vars}
    >
      {showGlow && (
        // Same text, same width → wraps exactly like the real layer it
        // sits under (both share one grid cell).
        <span className={styles.glowLayer} aria-hidden>
          <span className={styles.text}>{content}</span>
        </span>
      )}
      <span className={styles.layer}>
        <span className={styles.text}>{content}</span>
      </span>
    </Tag>
  );
}

export default ShinyText;
