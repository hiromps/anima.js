"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./AuroraBackground.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type AuroraBackgroundProps = {
  /**
   * 3–5 color stops, one per drifting blob. Fewer than 3 are padded with
   * the defaults (two blobs leave visible holes); extras beyond 5 are
   * ignored. Bright, saturated colors work best — they're screen-blended
   * over a near-black base.
   */
  colors?: string[];
  /** Drift speed multiplier. 1 = default pace, 0 = frozen composition. */
  speed?: number;
  /** Blur applied over the whole blob layer, in px. */
  blur?: number;
  /** Opacity of the aurora layer over the base color (0–1). */
  intensity?: number;
  /** Static film-grain overlay — hides gradient banding on 8-bit displays. */
  grain?: boolean;
  /** Opacity of the grain overlay (0–1). */
  grainOpacity?: number;
  /** Radial mask so the aurora fades into the page at the edges. */
  vignette?: boolean;
  className?: string;
  /** Hero content rendered above the aurora. */
  children?: ReactNode;
  /** Root element. "section" when the aurora wraps a landmark hero. */
  as?: "div" | "section";
};

export const DEFAULT_AURORA_COLORS = ["#6d4aff", "#1fb6ff", "#ff4d9d", "#2ee6a8"];
const FALLBACK_FIFTH = "#8b5cf6";
const DEFAULT_SPEED = 1;
const DEFAULT_BLUR = 80;
const DEFAULT_INTENSITY = 0.8;
const DEFAULT_GRAIN_OPACITY = 0.12;
const MIN_BLOBS = 3;
const MAX_BLOBS = 5;

/** The stylesheet's own defaults, per blob slot (see --ab-c0…c4). */
const CSS_DEFAULT_COLORS = [...DEFAULT_AURORA_COLORS, FALLBACK_FIFTH];

/**
 * Slowly drifting aurora / mesh-gradient backdrop. Pure CSS: a few large
 * radial blobs drift on transform-only keyframes at co-prime durations so
 * the composition never visibly repeats, screen-blended and blurred into
 * one field. Optional static grain and an edge mask let it melt into the
 * page. Fills its parent; children render on top.
 */
export function AuroraBackground({
  colors = DEFAULT_AURORA_COLORS,
  speed = DEFAULT_SPEED,
  blur = DEFAULT_BLUR,
  intensity = DEFAULT_INTENSITY,
  grain = true,
  grainOpacity = DEFAULT_GRAIN_OPACITY,
  vignette = true,
  className,
  children,
  as = "div",
}: AuroraBackgroundProps) {
  // Typed as "div" for the ref: the only thing read through it is
  // `dataset`, which <section> shares, so the narrower type is harmless.
  const Tag = as as "div";
  const rootRef = useRef<HTMLDivElement>(null);

  // Blurred, full-bleed layers are the most expensive thing on a landing
  // page; stop compositing their animation while the hero is scrolled away.
  // Written straight to a data attribute — no re-render per visibility flip.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.offscreen = entry.isIntersecting ? "false" : "true";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stops = colors.slice(0, MAX_BLOBS);
  for (let i = stops.length; i < MIN_BLOBS; i++) stops.push(CSS_DEFAULT_COLORS[i]);

  // Only non-default values go inline, so the default render is exactly
  // the stylesheet and generated markup stays clean.
  const vars: CSSVars = {};
  stops.forEach((color, i) => {
    if (color !== CSS_DEFAULT_COLORS[i]) vars[`--ab-c${i}`] = color;
  });
  const frozen = !(speed > 0);
  if (!frozen && speed !== DEFAULT_SPEED) vars["--ab-speed"] = speed;
  if (blur !== DEFAULT_BLUR) vars["--ab-blur"] = `${Math.max(0, blur)}px`;
  if (intensity !== DEFAULT_INTENSITY) {
    vars["--ab-intensity"] = Math.min(1, Math.max(0, intensity));
  }
  if (grainOpacity !== DEFAULT_GRAIN_OPACITY) {
    vars["--ab-grain-opacity"] = Math.min(1, Math.max(0, grainOpacity));
  }

  return (
    <Tag
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      style={vars}
      data-frozen={frozen ? "true" : undefined}
      data-vignette={vignette ? "true" : undefined}
    >
      <div className={styles.aurora} aria-hidden="true">
        {stops.map((_, i) => (
          <span key={i} className={styles.blob} />
        ))}
      </div>
      {grain ? <div className={styles.grain} aria-hidden="true" /> : null}
      <div className={styles.content}>{children}</div>
    </Tag>
  );
}

export default AuroraBackground;
