"use client";

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { MotionConfig, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import styles from "./GlassSegmentedControl.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type GlassSegmentOption = {
  value: string;
  label: string;
  /** Optional lucide icon drawn before the label. */
  icon?: LucideIcon;
};

export type GlassSegmentedControlSize = "sm" | "md" | "lg";

export type GlassSegmentedControlProps = {
  options: GlassSegmentOption[];
  /** Selected value (controlled). Pair with `onValueChange`. */
  value?: string;
  /** Initially selected value when uncontrolled (defaults to the first option). */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Track height: sm 36px / md 44px / lg 52px. */
  size?: GlassSegmentedControlSize;
  /** Stretch to the container width with equal segments. */
  fullWidth?: boolean;
  /**
   * Glow color A — the pink light behind the track, the track's outer light
   * and the selected label glow. Any CSS color; softer tints are derived.
   */
  glowColorA?: string;
  /** Glow color B — the lavender light behind the track. */
  glowColorB?: string;
  /** Backdrop blur of the track in px. */
  blur?: number;
  /** Spring stiffness of the selected pill's move between segments. */
  springStiffness?: number;
  /** Spring damping of the selected pill's move between segments. */
  springDamping?: number;
  disabled?: boolean;
  /** Accessible name of the group. Use this or `aria-labelledby`. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
};

const DEFAULT_GLOW_A = "#ffaac8";
const DEFAULT_GLOW_B = "#beafff";
const DEFAULT_BLUR = 30;
/** Same feel as the tab bar's pill: a slight overshoot. */
const DEFAULT_SPRING_STIFFNESS = 380;
const DEFAULT_SPRING_DAMPING = 30;

const ICON_SIZE: Record<GlassSegmentedControlSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

/** Softer tint of a color for the derived glows: `amount` of color, rest white. */
const tint = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, white)`;

/**
 * Glass segmented control in the GlassBottomTabBar's visual language: a
 * frosted capsule track with a lens pill that springs to the selected
 * segment. A radiogroup underneath — arrow keys / Home / End move the
 * selection, and only the selected segment is in the tab order.
 */
export function GlassSegmentedControl({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  size = "md",
  fullWidth = false,
  glowColorA,
  glowColorB,
  blur,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
}: GlassSegmentedControlProps) {
  // layoutId is page-global in framer-motion, so two controls on one page
  // would otherwise fling their pills at each other.
  const pillId = `${useId()}-segment-pill`;
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value,
  );
  const requested = valueProp !== undefined ? valueProp : internalValue;
  // An unknown value (e.g. options changed underneath) still needs one
  // reachable segment for the roving tabindex; the first one takes it.
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === requested),
  );
  const hasMatch = options.some((option) => option.value === requested);

  const select = (index: number) => {
    const option = options[index];
    if (!option || disabled) return;
    if (valueProp === undefined) setInternalValue(option.value);
    if (option.value !== requested) onValueChange?.(option.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = selectedIndex === last ? 0 : selectedIndex + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = selectedIndex === 0 ? last : selectedIndex - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
    }
    if (next === null) return;
    event.preventDefault();
    // Native radio behavior: moving focus also selects.
    select(next);
    buttonRefs.current[next]?.focus();
  };

  const spring = {
    type: "spring",
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.9,
  } as const;

  // The CSS module carries the hand-tuned defaults; custom properties are
  // only set for non-default values so the default render is the stylesheet.
  const vars: CSSVars = {};
  if (glowColorA && glowColorA.toLowerCase() !== DEFAULT_GLOW_A) {
    vars["--gsc-glow-a"] = glowColorA;
    vars["--gsc-glow-a-rim"] = glowColorA;
    vars["--gsc-glow-a-soft"] = tint(glowColorA, 60);
    vars["--gsc-glow-a-label"] = tint(glowColorA, 55);
    vars["--gsc-glow-a-bottom"] = tint(glowColorA, 75);
  }
  if (glowColorB && glowColorB.toLowerCase() !== DEFAULT_GLOW_B) {
    vars["--gsc-glow-b"] = glowColorB;
  }
  if (blur !== undefined && blur !== DEFAULT_BLUR) {
    vars["--gsc-blur"] = `${blur}px`;
  }

  const iconSize = ICON_SIZE[size];

  return (
    // Follows the OS "reduce motion" setting: the pill then jumps instead
    // of springing across.
    <MotionConfig reducedMotion="user">
      <div
        className={className ? `${styles.root} ${className}` : styles.root}
        data-size={size}
        data-full-width={fullWidth || undefined}
        data-disabled={disabled || undefined}
        style={vars}
      >
        <div
          className={styles.track}
          role="radiogroup"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-disabled={disabled || undefined}
        >
          {options.map((option, index) => {
            const { value, label, icon: Icon } = option;
            const selected = hasMatch && index === selectedIndex;
            return (
              <button
                key={value}
                ref={(node) => {
                  buttonRefs.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={index === selectedIndex ? 0 : -1}
                disabled={disabled}
                className={styles.segment}
                data-selected={selected || undefined}
                onClick={() => select(index)}
                onKeyDown={onKeyDown}
              >
                {selected ? (
                  <motion.span
                    layoutId={pillId}
                    className={styles.pill}
                    // Segments can differ in width, so the pill also scales
                    // on the move; framer only corrects the radius for that
                    // scale when it is given here rather than in CSS.
                    style={{ borderRadius: 9999 }}
                    transition={spring}
                  />
                ) : null}
                {Icon ? (
                  <Icon
                    className={styles.icon}
                    size={iconSize}
                    strokeWidth={1.8}
                    aria-hidden
                  />
                ) : null}
                <span className={styles.label}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </MotionConfig>
  );
}

export default GlassSegmentedControl;
