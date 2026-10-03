"use client";

import { useId, useState, type CSSProperties } from "react";
import { MotionConfig, motion } from "framer-motion";
import styles from "./GlassSwitch.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type GlassSwitchProps = {
  /** Controlled state. Leave undefined to let the switch own its state. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /**
   * Text to the left of the switch. When given, the whole row (label +
   * description + switch) becomes one full-width tap target.
   */
  label?: string;
  /** Secondary line under the label (ignored without `label`). */
  description?: string;
  disabled?: boolean;
  /** "md" = iOS size (51×31), "sm" = compact (40×24). */
  size?: "sm" | "md";
  /** Glow color A — pink end of the ON fill and its outer light. */
  glowColorA?: string;
  /** Glow color B — lavender end of the ON fill. */
  glowColorB?: string;
  /** Spring stiffness of the thumb travel / stretch. */
  springStiffness?: number;
  /** Spring damping of the thumb travel / stretch. */
  springDamping?: number;
  /** Form field name. Submits `value` while ON, nothing while OFF. */
  name?: string;
  /** Submitted value while ON (default "on", like a native checkbox). */
  value?: string;
  /** id of the switch button (auto-generated otherwise). */
  id?: string;
  /** Accessible name when there is no visible `label`. */
  "aria-label"?: string;
  className?: string;
};

const DEFAULT_GLOW_A = "#ffaac8";
const DEFAULT_GLOW_B = "#beafff";
const DEFAULT_SPRING_STIFFNESS = 380;
const DEFAULT_SPRING_DAMPING = 30;

/**
 * Geometry per size, in px. Kept in JS (not measured from the DOM) so the
 * thumb's x / width animate between known numbers. Must match the CSS.
 */
const SIZES = {
  md: { width: 51, height: 31, pad: 2, thumb: 27, stretch: 7 },
  sm: { width: 40, height: 24, pad: 2, thumb: 20, stretch: 5 },
} as const;

/** Softer tint of a color for the derived glows: `amount` of color, rest white. */
const tint = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, white)`;

/**
 * iOS-sized frosted-glass toggle. The track is white glass; ON fills it
 * with a pink → lavender glow, and the white glass bead springs across,
 * stretching while pressed like the iOS switch. With `label` it renders
 * as a full-width settings row.
 */
export function GlassSwitch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  disabled = false,
  size = "md",
  glowColorA,
  glowColorB,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  name,
  value = "on",
  id,
  "aria-label": ariaLabel,
  className,
}: GlassSwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const labelId = `${switchId}-label`;
  const descriptionId = `${switchId}-description`;

  const [innerChecked, setInnerChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : innerChecked;

  // Drives the iOS-style stretch. Tracked on the outer wrapper so pressing
  // the label text stretches the bead too, not only pressing the track.
  const [pressed, setPressed] = useState(false);

  const toggle = () => {
    if (disabled) return;
    const next = !on;
    if (!isControlled) setInnerChecked(next);
    onCheckedChange?.(next);
  };

  const geometry = SIZES[size];
  const travel = geometry.width - geometry.pad * 2 - geometry.thumb;
  const stretch = pressed ? geometry.stretch : 0;
  // While pressed the bead widens toward the center: from the left edge
  // when OFF, and leftward (x pulled back by the same amount) when ON, so
  // it never pokes out of the track.
  const thumbX = on ? travel - stretch : 0;
  const thumbWidth = geometry.thumb + stretch;

  const spring = {
    type: "spring",
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.9,
  } as const;

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (glowColorA && glowColorA.toLowerCase() !== DEFAULT_GLOW_A) {
    vars["--gsw-glow-a"] = glowColorA;
    vars["--gsw-glow-a-rim"] = glowColorA;
    vars["--gsw-glow-a-soft"] = tint(glowColorA, 60);
  }
  if (glowColorB && glowColorB.toLowerCase() !== DEFAULT_GLOW_B) {
    vars["--gsw-glow-b"] = glowColorB;
  }

  const pressHandlers = disabled
    ? {}
    : {
        onPointerDown: () => setPressed(true),
        onPointerUp: () => setPressed(false),
        onPointerLeave: () => setPressed(false),
        onPointerCancel: () => setPressed(false),
      };

  const hasLabel = Boolean(label);

  const control = (
    <span className={styles.control} data-state={on ? "on" : "off"}>
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={on}
        aria-label={hasLabel ? undefined : ariaLabel}
        aria-labelledby={hasLabel ? labelId : undefined}
        aria-describedby={hasLabel && description ? descriptionId : undefined}
        disabled={disabled}
        className={styles.track}
        data-state={on ? "on" : "off"}
        // Enter / Space reach onClick through the native <button>.
        onClick={toggle}
      >
        <span className={styles.fill} aria-hidden />
        <motion.span
          className={styles.thumb}
          aria-hidden
          // No mount animation: an ON switch paints already on the right.
          initial={false}
          animate={{ x: thumbX, width: thumbWidth }}
          transition={spring}
        />
      </button>
      {name && on && !disabled ? (
        <input type="hidden" name={name} value={value} />
      ) : null}
    </span>
  );

  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  return (
    // Follows the OS "reduce motion" setting: the bead then jumps.
    <MotionConfig reducedMotion="user">
      {hasLabel ? (
        <div
          className={`${rootClass} ${styles.row}`}
          data-glass-switch
          data-size={size}
          data-disabled={disabled || undefined}
          style={vars}
          {...pressHandlers}
        >
          {/* A label for a <button> forwards clicks to it, so the whole
              text area toggles the switch. */}
          <label htmlFor={switchId} className={styles.text}>
            <span id={labelId} className={styles.label}>
              {label}
            </span>
            {description ? (
              <span id={descriptionId} className={styles.description}>
                {description}
              </span>
            ) : null}
          </label>
          {control}
        </div>
      ) : (
        <span
          className={rootClass}
          data-glass-switch
          data-size={size}
          data-disabled={disabled || undefined}
          style={vars}
          {...pressHandlers}
        >
          {control}
        </span>
      )}
    </MotionConfig>
  );
}

export default GlassSwitch;
