"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import styles from "./BorderBeam.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type BorderBeamVariant = "beam" | "rainbow" | "pulse";

type BorderBeamOwnProps = {
  /** Rendered element. "div" is a pure frame (no padding, no button styles). */
  as?: "button" | "a" | "div";
  children?: ReactNode;
  /** Tail color of the beam (start of the gradient). Ignored by "rainbow". */
  colorFrom?: string;
  /** Head color of the beam (end of the gradient). Ignored by "rainbow". */
  colorTo?: string;
  /** Seconds per lap around the border. */
  duration?: number;
  /** Ring thickness in px. */
  borderWidth?: number;
  /** Corner radius in px. The default 999 makes a pill. */
  radius?: number;
  /**
   * "beam": one comet with a tail. "rainbow": a continuous full-spectrum
   * ring. "pulse": a two-tone ring whose glow breathes.
   */
  variant?: BorderBeamVariant;
  /** Blurred copy of the beam behind the element. */
  glow?: boolean;
  /** Glow strength, 0–1 (opacity, and the blur grows with it). */
  glowIntensity?: number;
  /** Diagonal light sweep across the inner surface. */
  shimmer?: boolean;
  className?: string;
  style?: CSSProperties;
  /** button only. Defaults to "button" so it never submits a form by accident. */
  type?: "button" | "submit" | "reset";
  /** button: native disabled. a: drops href and sets aria-disabled. */
  disabled?: boolean;
  /** a only. */
  href?: string;
  /** a only. */
  target?: string;
  /** a only. */
  rel?: string;
};

export type BorderBeamProps = BorderBeamOwnProps &
  Omit<HTMLAttributes<HTMLElement>, keyof BorderBeamOwnProps | "color">;

const DEFAULT_FROM = "#8b5cf6";
const DEFAULT_TO = "#22d3ee";
const DEFAULT_DURATION = 4;
const DEFAULT_WIDTH = 1.5;
const DEFAULT_RADIUS = 999;
const DEFAULT_GLOW_INTENSITY = 0.6;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Same browsers ship `@property` and `CSS.registerProperty`, and there is
 * no `@supports` test for the at-rule — so this is the feature check.
 * Evaluated lazily: `CSS` doesn't exist during SSR.
 */
let propertySupport: boolean | undefined;
function supportsRegisteredProperties() {
  if (propertySupport === undefined) {
    propertySupport =
      typeof CSS !== "undefined" && "registerProperty" in CSS;
  }
  return propertySupport;
}

/**
 * A light beam that travels around the border of whatever it wraps — a
 * CTA, a link, an announcement chip or a card / input frame. Pure CSS:
 * a conic gradient whose angle is animated through a registered custom
 * property, a blurred copy behind it for the glow, and an opaque inner
 * surface. Pauses offscreen and honors prefers-reduced-motion.
 */
export function BorderBeam({
  as = "button",
  children,
  colorFrom,
  colorTo,
  duration,
  borderWidth,
  radius,
  variant = "beam",
  glow = true,
  glowIntensity,
  shimmer = false,
  className,
  style,
  type = "button",
  disabled = false,
  href,
  target,
  rel,
  ...rest
}: BorderBeamProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  // Callback ref: one function fits <button>, <a> and <div> alike.
  const setRoot = useCallback((node: HTMLElement | null) => {
    rootRef.current = node;
  }, []);

  // Fallback flag and offscreen pause are written straight to data-*
  // attributes: no re-render, and the SSR markup stays identical.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (!supportsRegisteredProperties()) node.dataset.bbFallback = "";
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) delete node.dataset.paused;
      else node.dataset.paused = "";
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (colorFrom && colorFrom.toLowerCase() !== DEFAULT_FROM) {
    vars["--bb-from"] = colorFrom;
  }
  if (colorTo && colorTo.toLowerCase() !== DEFAULT_TO) {
    vars["--bb-to"] = colorTo;
  }
  if (duration !== undefined && duration !== DEFAULT_DURATION) {
    vars["--bb-duration"] = `${Math.max(0.2, duration)}s`;
  }
  if (borderWidth !== undefined && borderWidth !== DEFAULT_WIDTH) {
    vars["--bb-width"] = `${Math.max(0, borderWidth)}px`;
  }
  if (radius !== undefined && radius !== DEFAULT_RADIUS) {
    vars["--bb-radius"] = `${Math.max(0, radius)}px`;
  }
  if (glowIntensity !== undefined && glowIntensity !== DEFAULT_GLOW_INTENSITY) {
    const k = clamp01(glowIntensity);
    vars["--bb-glow-opacity"] = k;
    // A stronger glow also spreads further, not just brighter.
    vars["--bb-glow-blur"] = `${Math.round(6 + k * 14)}px`;
  }

  const shared = {
    ...rest,
    ref: setRoot,
    className: className ? `${styles.root} ${className}` : styles.root,
    style: { ...vars, ...style },
    "data-border-beam": "",
    "data-as": as,
    "data-variant": variant,
    "data-disabled": disabled ? "" : undefined,
  };

  const inner = (
    <>
      {glow ? <span className={styles.glow} aria-hidden /> : null}
      <span className={styles.beam} aria-hidden />
      <span className={styles.surface}>
        {shimmer ? <span className={styles.shimmer} aria-hidden /> : null}
        <span className={styles.content}>{children}</span>
      </span>
    </>
  );

  // Branch per tag rather than a dynamic `Tag`: href / type / disabled
  // only type-check on their own element.
  if (as === "a") {
    return (
      <a
        {...shared}
        href={disabled ? undefined : href}
        target={target}
        rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : shared.tabIndex}
      >
        {inner}
      </a>
    );
  }
  if (as === "div") {
    return <div {...shared}>{inner}</div>;
  }
  return (
    <button {...shared} type={type} disabled={disabled}>
      {inner}
    </button>
  );
}

export default BorderBeam;
