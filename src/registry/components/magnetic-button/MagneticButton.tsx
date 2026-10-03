"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEventHandler,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import styles from "./MagneticButton.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type MagneticButtonVariant = "solid" | "outline" | "ghost";
export type MagneticButtonSize = "sm" | "md" | "lg";

export type MagneticButtonProps = {
  children: ReactNode;
  /** Renders an <a href> instead of a <button>. */
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  variant?: MagneticButtonVariant;
  size?: MagneticButtonSize;
  /** 0–1. How far the button follows the pointer; 0 turns the magnet off. */
  strength?: number;
  /** Distance in px from the button's edge at which the pull starts. */
  radius?: number;
  /**
   * Base color — the background of "solid", the border and label of
   * "outline" / "ghost".
   */
  color?: string;
  /** Label color on the "solid" base (outline / ghost use `color`). */
  textColor?: string;
  /** Color of the hover blob that spreads from the pointer entry point. */
  fillColor?: string;
  /** Label color once the blob has filled the button. */
  fillTextColor?: string;
  /** Trailing arrow that nudges right on hover. */
  showArrow?: boolean;
  /** Spring stiffness of the magnetic follow. */
  springStiffness?: number;
  /** Spring damping of the magnetic follow. */
  springDamping?: number;
  disabled?: boolean;
  /** <button> type. Ignored when `href` is set. */
  type?: "button" | "submit" | "reset";
  /** Applied to the outer wrapper (the static box that is measured). */
  className?: string;
  "aria-label"?: string;
};

const DEFAULT_COLOR = "#f5f5f7";
const DEFAULT_TEXT_COLOR = "#0a0a0a";
const DEFAULT_FILL_COLOR = "#7c5cff";
const DEFAULT_FILL_TEXT_COLOR = "#ffffff";
const DEFAULT_STRENGTH = 0.45;
const DEFAULT_RADIUS = 90;
const DEFAULT_SPRING_STIFFNESS = 220;
const DEFAULT_SPRING_DAMPING = 18;

/**
 * Share of the pointer offset the shell follows; the label follows an
 * extra share on top, so it travels further than its container — the
 * parallax that makes the button feel like it has depth.
 */
const SHELL_PULL = 0.4;
const LABEL_PULL = 0.22;

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

const differs = (value: string | undefined, fallback: string) =>
  value !== undefined && value.toLowerCase() !== fallback;

/**
 * Award-site style magnetic CTA. Within `radius` px the button springs
 * toward the pointer (the label further than the shell), and on hover a
 * fill blob grows from the exact point the pointer came in, flipping the
 * label color. Touch gets only the press scale; reduced motion gets a
 * plain color change.
 */
export function MagneticButton({
  children,
  href,
  onClick,
  variant = "solid",
  size = "md",
  strength = DEFAULT_STRENGTH,
  radius = DEFAULT_RADIUS,
  color,
  textColor,
  fillColor,
  fillTextColor,
  showArrow = false,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  disabled = false,
  type = "button",
  className,
  "aria-label": ariaLabel,
}: MagneticButtonProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const magnetic = !disabled && !reduceMotion && strength > 0;

  // Raw targets are written from the pointer loop; the springs smooth
  // them. Nothing here goes through React state, so a pointer move never
  // re-renders the component.
  const spring = { stiffness: springStiffness, damping: springDamping, mass: 0.6 };
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawLabelX = useMotionValue(0);
  const rawLabelY = useMotionValue(0);
  const x = useSpring(rawX, spring);
  const y = useSpring(rawY, spring);
  const labelX = useSpring(rawLabelX, spring);
  const labelY = useSpring(rawLabelY, spring);

  // Why a window listener and not an enlarged invisible hit area: a hit
  // area `radius` px wide would sit on top of neighbouring links and eat
  // their clicks and hovers. Instead one passive window listener runs —
  // only while the button is on screen, with a fine pointer, and motion
  // allowed — and the math is batched to one read per animation frame.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !magnetic) return;
    if (!window.matchMedia(FINE_POINTER).matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let listening = false;

    const reset = () => {
      rawX.set(0);
      rawY.set(0);
      rawLabelX.set(0);
      rawLabelY.set(0);
    };

    const update = () => {
      frame = 0;
      // The wrapper never moves (the transform lives on the shell inside
      // it), so its rect is the button's rest position and the pull can't
      // feed back into its own measurement.
      const rect = root.getBoundingClientRect();
      const dx = pointerX - (rect.left + rect.width / 2);
      const dy = pointerY - (rect.top + rect.height / 2);
      // Distance from the edge rather than the centre: wide and narrow
      // buttons then get the same reach.
      const edgeX = Math.max(Math.abs(dx) - rect.width / 2, 0);
      const edgeY = Math.max(Math.abs(dy) - rect.height / 2, 0);
      const edge = Math.hypot(edgeX, edgeY);
      if (edge >= radius) {
        reset();
        return;
      }
      // Fades to zero at the range boundary, so entering and leaving the
      // field never snaps.
      const falloff = 1 - edge / radius;
      const pull = strength * falloff;
      rawX.set(dx * pull * SHELL_PULL);
      rawY.set(dy * pull * SHELL_PULL);
      rawLabelX.set(dx * pull * LABEL_PULL);
      rawLabelY.set(dy * pull * LABEL_PULL);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Pointer left the window: let go instead of freezing mid-pull.
    const onOut = (event: PointerEvent) => {
      if (!event.relatedTarget) reset();
    };

    const start = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onOut);
    };
    const stop = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      reset();
    };

    // Off-screen buttons don't listen at all. The margin keeps the field
    // alive for a button just past the viewport edge.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: `${radius}px` },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      stop();
    };
  }, [magnetic, radius, strength, rawX, rawY, rawLabelX, rawLabelY]);

  // The blob: grows from where the pointer entered and shrinks toward
  // where it left. Written straight to the DOM (custom properties + a data
  // attribute) — CSS runs the transition, React stays out of it.
  const setOrigin = (event: ReactPointerEvent<HTMLElement>) => {
    const shell = event.currentTarget;
    const rect = shell.getBoundingClientRect();
    // Percentages, not px: they stay right inside a CSS-scaled container
    // (e.g. a zoomed preview), where rect px and layout px differ.
    const px = ((event.clientX - rect.left) / rect.width) * 100;
    const py = ((event.clientY - rect.top) / rect.height) * 100;
    shell.style.setProperty("--mb-x", `${px}%`);
    shell.style.setProperty("--mb-y", `${py}%`);
  };
  const onPointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || event.pointerType === "touch") return;
    setOrigin(event);
    rootRef.current?.setAttribute("data-hovered", "");
  };
  const onPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    setOrigin(event);
    rootRef.current?.removeAttribute("data-hovered");
  };

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (differs(color, DEFAULT_COLOR)) vars["--mb-color"] = color!;
  if (differs(textColor, DEFAULT_TEXT_COLOR)) vars["--mb-text"] = textColor!;
  if (differs(fillColor, DEFAULT_FILL_COLOR)) vars["--mb-fill"] = fillColor!;
  if (differs(fillTextColor, DEFAULT_FILL_TEXT_COLOR)) {
    vars["--mb-fill-text"] = fillTextColor!;
  }

  const inner = (
    <>
      <span className={styles.fill} aria-hidden />
      <motion.span className={styles.label} style={{ x: labelX, y: labelY }}>
        <span className={styles.text}>{children}</span>
        {showArrow ? (
          <ArrowRight className={styles.arrow} strokeWidth={2.2} aria-hidden />
        ) : null}
      </motion.span>
    </>
  );

  const shared = {
    className: styles.shell,
    style: { x, y },
    whileTap: disabled ? undefined : { scale: 0.96 },
    transition: { type: "spring", stiffness: 500, damping: 30 },
    onPointerEnter,
    onPointerLeave,
    onClick: disabled ? undefined : onClick,
    "aria-label": ariaLabel,
  } as const;

  return (
    // Follows the OS "reduce motion" setting for the press scale too.
    <MotionConfig reducedMotion="user">
      <span
        ref={rootRef}
        className={className ? `${styles.root} ${className}` : styles.root}
        data-variant={variant}
        data-size={size}
        data-disabled={disabled || undefined}
        style={vars}
      >
        {href !== undefined ? (
          // A disabled link drops its href so it can't be followed or
          // focused; aria-disabled keeps it announced as unavailable.
          <motion.a
            {...shared}
            href={disabled ? undefined : href}
            role={disabled ? "link" : undefined}
            aria-disabled={disabled || undefined}
          >
            {inner}
          </motion.a>
        ) : (
          <motion.button {...shared} type={type} disabled={disabled}>
            {inner}
          </motion.button>
        )}
      </span>
    </MotionConfig>
  );
}

export default MagneticButton;
