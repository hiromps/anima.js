"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import styles from "./GlassSlider.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type GlassSliderProps = {
  /** Controlled value. Pair with `onValueChange`. */
  value?: number;
  /** Initial value when uncontrolled. Defaults to `min`. */
  defaultValue?: number;
  /** Fires on every change (each drag move, each key press). */
  onValueChange?: (value: number) => void;
  /** Fires once when a change is finished: pointer released, or a key press. */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /**
   * "lens" (default): a glass lens bead rides the fill edge.
   * "none": Control Center style — the fill edge itself is the handle.
   */
  thumb?: "lens" | "none";
  /** Value label inside the track, on the trailing side. */
  showValue?: boolean;
  /** Formats the label and aria-valuetext. Defaults to the plain number. */
  formatValue?: (value: number) => string;
  /** Icon inside the track at the leading end (e.g. Volume1, SunDim). */
  iconStart?: LucideIcon;
  /** Icon inside the track at the trailing end (e.g. Volume2, Sun). */
  iconEnd?: LucideIcon;
  disabled?: boolean;
  /** Glow color A — pink: start of the fill and the light behind the track. */
  glowColorA?: string;
  /** Glow color B — lavender: end of the fill and the light behind the track. */
  glowColorB?: string;
  /** Backdrop blur of the track's glass in px. */
  blur?: number;
  /** Spring stiffness of the fill (click / keys) and the squish. */
  springStiffness?: number;
  /** Spring damping of the fill (click / keys) and the squish. */
  springDamping?: number;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
};

const DEFAULT_GLOW_A = "#ffaac8";
const DEFAULT_GLOW_B = "#beafff";
const DEFAULT_BLUR = 30;
const DEFAULT_SPRING_STIFFNESS = 380;
const DEFAULT_SPRING_DAMPING = 32;
/** Track height = lens size + 2 × inset. Mirrors the CSS. */
const TRACK_HEIGHT = 44;
const LENS_INSET = 4;

/** Softer tint of a color for the derived glows: `amount` of color, rest white. */
const tint = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, white)`;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Decimal places of the step, so 0.1 steps don't render as 0.30000000000000004. */
const decimalsOf = (step: number) => (String(step).split(".")[1] ?? "").length;

/**
 * Frosted-glass slider in the iOS Control Center mold: a thick glass
 * capsule whose filled part glows pink → lavender. Drag anywhere on the
 * track (pointer capture keeps the drag alive off the track); the capsule
 * squishes a little while held and springs back on release.
 */
export function GlassSlider({
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  thumb = "lens",
  showValue = false,
  formatValue,
  iconStart: IconStart,
  iconEnd: IconEnd,
  disabled = false,
  glowColorA,
  glowColorB,
  blur,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className,
}: GlassSliderProps) {
  // Guard against a collapsed / inverted range or a non-positive step.
  const hi = max > min ? max : min + 1;
  const safeStep = step > 0 ? step : 1;
  const decimals = decimalsOf(safeStep);
  const snap = (raw: number) =>
    clamp(
      Number(
        (min + Math.round((raw - min) / safeStep) * safeStep).toFixed(decimals),
      ),
      min,
      hi,
    );

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(() => defaultValue ?? min);
  const current = snap(isControlled ? value : internal);
  const fraction = (current - min) / (hi - min);

  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  // "press" animates the fill to the pointer; "drag" makes it follow 1:1.
  const pointerModeRef = useRef<"idle" | "press" | "drag">("idle");
  const lastValueRef = useRef(current);
  const reduceMotion = useReducedMotion();

  const spring = {
    type: "spring",
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.9,
  } as const;

  // The fill is driven by a motion value so clicks and keys glide with the
  // spring while an active drag tracks the finger without lag.
  const progress = useMotionValue(fraction);
  useEffect(() => {
    if (pointerModeRef.current === "drag" || reduceMotion) {
      progress.jump(fraction);
      return;
    }
    const controls = animate(progress, fraction, {
      type: "spring",
      stiffness: springStiffness,
      damping: springDamping,
      mass: 0.9,
    });
    return () => controls.stop();
  }, [fraction, progress, reduceMotion, springStiffness, springDamping]);

  // With a lens the fill always reaches the lens' far edge, so the bead
  // sits on the fill even at the minimum; without one the fill is the
  // handle and empties completely.
  // Both are built unconditionally (hook order); `thumb` picks one below.
  const lensFillWidth = useTransform(
    progress,
    (p) => `calc(${p * 100}% + ${TRACK_HEIGHT * (1 - p)}px)`,
  );
  const plainFillWidth = useTransform(progress, (p) => `${p * 100}%`);
  const fillWidth = thumb === "lens" ? lensFillWidth : plainFillWidth;
  const lensLeft = useTransform(
    progress,
    (p) => `calc(${p * 100}% + ${LENS_INSET - TRACK_HEIGHT * p}px)`,
  );

  const setValue = (next: number) => {
    lastValueRef.current = next;
    if (next === current) return;
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  const valueFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return current;
    // With a lens, the lens center follows the pointer, so the usable span
    // is the track minus one lens width.
    const p =
      thumb === "lens"
        ? (clientX - rect.left - TRACK_HEIGHT / 2) / (rect.width - TRACK_HEIGHT)
        : (clientX - rect.left) / rect.width;
    return snap(min + clamp(p, 0, 1) * (hi - min));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerModeRef.current = "press";
    setDragging(true);
    setValue(valueFromPointer(event.clientX));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerModeRef.current === "idle") return;
    pointerModeRef.current = "drag";
    setValue(valueFromPointer(event.clientX));
  };

  const endDrag = () => {
    if (pointerModeRef.current === "idle") return;
    pointerModeRef.current = "idle";
    setDragging(false);
    onValueCommit?.(lastValueRef.current);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const bigStep = Math.max(safeStep, (hi - min) / 10);
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = current + safeStep;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = current - safeStep;
        break;
      case "PageUp":
        next = current + bigStep;
        break;
      case "PageDown":
        next = current - bigStep;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = hi;
        break;
      default:
        return;
    }
    event.preventDefault();
    const snapped = snap(next);
    setValue(snapped);
    onValueCommit?.(snapped);
  };

  const text = formatValue ? formatValue(current) : current.toFixed(decimals);

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (glowColorA && glowColorA.toLowerCase() !== DEFAULT_GLOW_A) {
    vars["--gsl-glow-a"] = glowColorA;
    vars["--gsl-glow-a-rim"] = glowColorA;
    vars["--gsl-glow-a-soft"] = tint(glowColorA, 60);
    vars["--gsl-glow-a-bottom"] = tint(glowColorA, 75);
  }
  if (glowColorB && glowColorB.toLowerCase() !== DEFAULT_GLOW_B) {
    vars["--gsl-glow-b"] = glowColorB;
  }
  if (blur !== undefined && blur !== DEFAULT_BLUR) {
    vars["--gsl-blur"] = `${blur}px`;
  }

  return (
    // Follows the OS "reduce motion" setting: no squish, the fill jumps.
    <MotionConfig reducedMotion="user">
      <div
        className={className ? `${styles.root} ${className}` : styles.root}
        data-glass-slider
        data-dragging={dragging || undefined}
        data-disabled={disabled || undefined}
        style={vars}
      >
        <motion.div
          ref={trackRef}
          className={styles.track}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-valuemin={min}
          aria-valuemax={hi}
          aria-valuenow={current}
          aria-valuetext={text}
          aria-orientation="horizontal"
          aria-disabled={disabled || undefined}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          animate={
            dragging ? { scaleX: 1.015, scaleY: 0.92 } : { scaleX: 1, scaleY: 1 }
          }
          transition={spring}
        >
          <motion.div className={styles.fill} style={{ width: fillWidth }} aria-hidden />
          {thumb === "lens" ? (
            <motion.div className={styles.lens} style={{ left: lensLeft }} aria-hidden />
          ) : null}
          {IconStart || IconEnd || showValue ? (
            <div className={styles.content} aria-hidden>
              {IconStart ? (
                <IconStart className={styles.icon} size={18} strokeWidth={2} />
              ) : null}
              <span className={styles.spacer} />
              {showValue ? <span className={styles.value}>{text}</span> : null}
              {IconEnd ? (
                <IconEnd className={styles.icon} size={18} strokeWidth={2} />
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </div>
    </MotionConfig>
  );
}

export default GlassSlider;
