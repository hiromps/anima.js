"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import styles from "./GlassBottomSheet.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/** A footer button. The sheet closes after `onClick` unless `keepOpen`. */
export type GlassSheetAction = {
  label: string;
  onClick?: () => void;
  keepOpen?: boolean;
};

export type GlassBottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Red pill button (same red as the tab bar's CTA band). */
  primaryAction?: GlassSheetAction;
  /** Glass pill button under the primary one. */
  secondaryAction?: GlassSheetAction;
  /** Grabber at the top of the sheet. Dragging works with or without it. */
  showHandle?: boolean;
  /** Round glass × button in the header. */
  showCloseButton?: boolean;
  /**
   * Allow closing by tapping the scrim, pressing Escape or swiping down.
   * Off: only the close button and actions close the sheet.
   */
  dismissible?: boolean;
  /** Glow color A — pink light behind the sheet and its outer light. */
  glowColorA?: string;
  /** Glow color B — lavender light behind the sheet. */
  glowColorB?: string;
  /** Backdrop blur of the sheet's glass in px. */
  blur?: number;
  /** Spring stiffness of the slide in / snap back. */
  springStiffness?: number;
  /** Spring damping of the slide in / snap back. */
  springDamping?: number;
  /**
   * "fixed" (default) covers the viewport, is portaled to <body> and locks
   * page scroll. "absolute" fills the nearest positioned ancestor, renders
   * in place and leaves scroll alone — for phone mockups and previews.
   */
  placement?: "fixed" | "absolute";
  className?: string;
};

const DEFAULT_GLOW_A = "#ffaac8";
const DEFAULT_GLOW_B = "#beafff";
const DEFAULT_BLUR = 30;
const DEFAULT_SPRING_STIFFNESS = 380;
const DEFAULT_SPRING_DAMPING = 34;
/** Swipe-down distance (px) or speed (px/s) that closes the sheet. */
const DISMISS_OFFSET = 110;
const DISMISS_VELOCITY = 600;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

/**
 * Floating frosted-glass bottom sheet — the modal counterpart of
 * GlassBottomTabBar. Slides up with a spring over a blurred scrim, closes
 * on swipe-down / scrim tap / Escape, traps focus while open and hands it
 * back to the opener on close.
 */
export function GlassBottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  showHandle = true,
  showCloseButton = true,
  dismissible = true,
  glowColorA,
  glowColorB,
  blur,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  placement = "fixed",
  className,
}: GlassBottomSheetProps) {
  const isClient = useIsClient();
  const titleId = useId();
  const descriptionId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const fixed = placement === "fixed";

  // Focus moves into the sheet on a closed → open change and back to the
  // opener on close. A sheet mounted already open (e.g. a preview) leaves
  // page focus alone. No effect cleanup: StrictMode's re-run would hand
  // focus back to the opener right after moving it in.
  const wasOpenRef = useRef(open);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (open && !wasOpen) {
      const active = document.activeElement as HTMLElement | null;
      openerRef.current =
        active && !sheetRef.current?.contains(active) ? active : null;
      sheetRef.current?.focus({ preventScroll: true });
    } else if (!open && wasOpen) {
      openerRef.current?.focus?.({ preventScroll: true });
      openerRef.current = null;
    }
  }, [open]);

  // Page scroll lock — only when the sheet actually covers the page.
  useEffect(() => {
    if (!open || !fixed) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open, fixed]);

  const close = () => onOpenChange(false);
  const requestDismiss = () => {
    if (dismissible) close();
  };

  const runAction = (action: GlassSheetAction) => {
    action.onClick?.();
    if (!action.keepOpen) close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      requestDismiss();
      return;
    }
    if (event.key !== "Tab" || !sheetRef.current) return;
    // Keep Tab inside the dialog.
    const items = Array.from(
      sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === sheetRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
      close();
    }
  };

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
    vars["--gbs-glow-a"] = glowColorA;
    vars["--gbs-glow-a-rim"] = glowColorA;
    vars["--gbs-glow-a-soft"] = tint(glowColorA, 60);
    vars["--gbs-glow-a-bottom"] = tint(glowColorA, 75);
  }
  if (glowColorB && glowColorB.toLowerCase() !== DEFAULT_GLOW_B) {
    vars["--gbs-glow-b"] = glowColorB;
  }
  if (blur !== undefined && blur !== DEFAULT_BLUR) {
    vars["--gbs-blur"] = `${blur}px`;
  }

  const content = (
    // Follows the OS "reduce motion" setting: the sheet then fades in place.
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open ? (
          <div
            key="sheet"
            className={className ? `${styles.root} ${className}` : styles.root}
            data-glass-bottom-sheet
            data-placement={placement}
            style={vars}
          >
            <motion.div
              className={styles.scrim}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={requestDismiss}
            />
            <motion.div
              ref={sheetRef}
              className={styles.frame}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              onKeyDown={onKeyDown}
              initial={{ y: "115%" }}
              animate={{ y: 0 }}
              exit={{ y: "115%" }}
              transition={spring}
              drag={dismissible ? "y" : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 0.7 }}
              onDragEnd={onDragEnd}
            >
              <div className={styles.sheet}>
                {/* Drag starts from the header only, so the body can scroll. */}
                <div
                  className={styles.header}
                  data-draggable={dismissible || undefined}
                  onPointerDown={(e) => dismissible && dragControls.start(e)}
                >
                  {showHandle ? <span className={styles.handle} aria-hidden /> : null}
                  <div className={styles.heading}>
                    <h2 id={titleId} className={styles.title}>
                      {title}
                    </h2>
                    {description ? (
                      <p id={descriptionId} className={styles.description}>
                        {description}
                      </p>
                    ) : null}
                  </div>
                  {showCloseButton ? (
                    <button
                      type="button"
                      className={styles.close}
                      aria-label="閉じる"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={close}
                    >
                      <X size={18} strokeWidth={1.8} aria-hidden />
                    </button>
                  ) : null}
                </div>

                {children ? <div className={styles.body}>{children}</div> : null}

                {primaryAction || secondaryAction ? (
                  <div className={styles.actions}>
                    {primaryAction ? (
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() => runAction(primaryAction)}
                      >
                        {primaryAction.label}
                      </button>
                    ) : null}
                    {secondaryAction ? (
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => runAction(secondaryAction)}
                      >
                        {secondaryAction.label}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );

  if (!fixed) return content;
  // Portaled so a transformed / overflow:hidden ancestor can't trap the
  // fixed overlay. Nothing renders until hydration is done.
  return isClient ? createPortal(content, document.body) : null;
}

export default GlassBottomSheet;
