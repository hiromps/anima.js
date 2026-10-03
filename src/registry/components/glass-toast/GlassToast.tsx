"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useIsPresent,
  type PanInfo,
} from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import styles from "./GlassToast.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type GlassToastVariant = "success" | "info" | "warning" | "error";

/** Small lens button next to the text. The toast closes after `onClick`. */
export type GlassToastAction = {
  label: string;
  onClick?: () => void;
};

export type GlassToastProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Picks the icon and its tint. "error" is announced assertively. */
  variant?: GlassToastVariant;
  /**
   * Auto-dismiss delay in ms; 0 keeps the toast until it is closed. The
   * countdown pauses while the toast is hovered, pressed or focused.
   */
  duration?: number;
  action?: GlassToastAction;
  /** Round glass × button. Swipe-up and Escape close it either way. */
  showCloseButton?: boolean;
  /** Glow color A — pink light behind the toast and its outer light. */
  glowColorA?: string;
  /** Glow color B — lavender light behind the toast. */
  glowColorB?: string;
  /** Backdrop blur of the toast's glass in px. */
  blur?: number;
  /** Spring stiffness of the drop in / snap back. */
  springStiffness?: number;
  /** Spring damping of the drop in / snap back. */
  springDamping?: number;
  /**
   * "fixed" (default) pins the toast to the top of the viewport (below
   * the safe-area inset) and portals it to <body>. "absolute" pins it to
   * the top of the nearest positioned ancestor — for phone mockups.
   */
  placement?: "fixed" | "absolute";
  className?: string;
};

const DEFAULT_GLOW_A = "#ffaac8";
const DEFAULT_GLOW_B = "#beafff";
const DEFAULT_BLUR = 30;
const DEFAULT_DURATION = 4000;
const DEFAULT_SPRING_STIFFNESS = 380;
const DEFAULT_SPRING_DAMPING = 30;
/** Swipe-up distance (px) or speed (px/s) that dismisses the toast. */
const DISMISS_OFFSET = 36;
const DISMISS_VELOCITY = 450;

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
} as const;

/** Softer tint of a color for the derived glows: `amount` of color, rest white. */
const tint = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, white)`;

const noopSubscribe = () => () => {};

/** false during SSR and hydration, true afterwards — gates the portal. */
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type ToastCardProps = Required<
  Pick<GlassToastProps, "title" | "variant" | "duration" | "showCloseButton">
> &
  Pick<GlassToastProps, "description" | "action"> & {
    spring: { type: "spring"; stiffness: number; damping: number; mass: number };
    onClose: () => void;
  };

/**
 * One shown toast. Mounted per open, so the countdown and the
 * hover / press state start fresh every time it appears.
 */
function ToastCard({
  title,
  description,
  variant,
  duration,
  action,
  showCloseButton,
  spring,
  onClose,
}: ToastCardProps) {
  // Exit animation in progress: the frozen props still say "open", so the
  // timer must not fire a second close.
  const isPresent = useIsPresent();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || pressed || focused;

  // Countdown that survives pauses: each run subtracts what it waited.
  const remainingRef = useRef(duration);
  const durationRef = useRef(duration);
  useEffect(() => {
    // A new duration while shown restarts the countdown with it.
    if (durationRef.current !== duration) {
      durationRef.current = duration;
      remainingRef.current = duration;
    }
    if (duration <= 0 || paused || !isPresent) return;
    const started = Date.now();
    const id = window.setTimeout(onClose, remainingRef.current);
    return () => {
      window.clearTimeout(id);
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - started),
      );
    };
  }, [duration, paused, isPresent, onClose]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setPressed(true);
    // The pointer may be released outside the toast (it follows the drag).
    const release = () => {
      setPressed(false);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    if (event.pointerType === "mouse") setHovered(true);
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -DISMISS_OFFSET || info.velocity.y < -DISMISS_VELOCITY) {
      onClose();
    }
  };

  const Icon = ICONS[variant];

  return (
    <motion.div
      className={styles.frame}
      data-variant={variant}
      initial={{ y: "-120%", scale: 0.9, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ y: "-120%", scale: 0.9, opacity: 0 }}
      transition={{ ...spring, opacity: { duration: 0.18, ease: "easeOut" } }}
      // Swipe up from anywhere on the toast; downward barely moves.
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.8, bottom: 0.08 }}
      onDragEnd={onDragEnd}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onPointerDown={onPointerDown}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <div className={styles.toast}>
        <span className={styles.icon} aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className={styles.text}>
          <p className={styles.title}>
            {title}
          </p>
          {description ? (
            <p className={styles.description}>{description}</p>
          ) : null}
        </div>
        {action ? (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              action.onClick?.();
              onClose();
            }}
          >
            {action.label}
          </button>
        ) : null}
        {showCloseButton ? (
          <button
            type="button"
            className={styles.close}
            aria-label="通知を閉じる"
            onClick={onClose}
          >
            <X size={15} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

/**
 * Dynamic-Island-style frosted-glass toast — GlassBottomTabBar's sibling
 * for feedback. Drops in from the top with a spring, auto-dismisses after
 * `duration` (paused on hover / press / focus), closes on swipe-up,
 * Escape or ×. Never moves focus.
 */
export function GlassToast({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  duration = DEFAULT_DURATION,
  action,
  showCloseButton = true,
  glowColorA,
  glowColorB,
  blur,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  placement = "fixed",
  className,
}: GlassToastProps) {
  const isClient = useIsClient();
  const fixed = placement === "fixed";
  const isError = variant === "error";

  // Stable across renders so an inline onOpenChange doesn't restart the
  // countdown effect more than needed (it resumes from the remainder anyway).
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);
  const [close] = useState(() => () => onOpenChangeRef.current(false));

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
    vars["--gts-glow-a"] = glowColorA;
    vars["--gts-glow-a-rim"] = glowColorA;
    vars["--gts-glow-a-soft"] = tint(glowColorA, 60);
    vars["--gts-glow-a-bottom"] = tint(glowColorA, 75);
  }
  if (glowColorB && glowColorB.toLowerCase() !== DEFAULT_GLOW_B) {
    vars["--gts-glow-b"] = glowColorB;
  }
  if (blur !== undefined && blur !== DEFAULT_BLUR) {
    vars["--gts-blur"] = `${blur}px`;
  }

  const content = (
    // The live region stays mounted so screen readers announce the toast
    // when its content is inserted. Follows the OS "reduce motion" setting:
    // the toast then fades in place.
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-glass-toast
      data-placement={placement}
      style={vars}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {open ? (
            <ToastCard
              key="toast"
              title={title}
              description={description}
              variant={variant}
              duration={duration}
              action={action}
              showCloseButton={showCloseButton}
              spring={spring}
              onClose={close}
            />
          ) : null}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );

  if (!fixed) return content;
  // Portaled so a transformed / overflow:hidden ancestor can't trap the
  // fixed toast. Nothing renders until hydration is done.
  return isClient ? createPortal(content, document.body) : null;
}

export default GlassToast;
