"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Plus, type LucideIcon } from "lucide-react";
import styles from "./GlassFabMenu.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/** One menu entry. The menu closes after `onSelect`. */
export type GlassFabAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect?: () => void;
};

export type GlassFabMenuProps = {
  actions: GlassFabAction[];
  /** Controlled open state. Leave undefined to let the menu own it. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * "stack": glass pills (icon + label) stacked above the button.
   * "radial": round glass buttons fanned out around it, labels underneath.
   */
  layout?: "stack" | "radial";
  /** "glass" frosted button, or "red" (#e5322d) for a primary create action. */
  accent?: "glass" | "red";
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  /**
   * "fixed" (default) pins to the viewport corner (safe-area aware) and is
   * portaled to <body>. "absolute" pins to the nearest positioned
   * ancestor and renders in place — for phone mockups and previews.
   */
  placement?: "fixed" | "absolute";
  /** Glow color A — pink light behind the button and the outer light of the glass. */
  glowColorA?: string;
  /** Glow color B — lavender light behind the button. */
  glowColorB?: string;
  /** Backdrop blur of the glass in px. */
  blur?: number;
  /** Spring stiffness of the expand / icon rotation. */
  springStiffness?: number;
  /** Spring damping of the expand / icon rotation. */
  springDamping?: number;
  /** Accessible name of the main button. */
  "aria-label"?: string;
  className?: string;
};

const DEFAULT_GLOW_A = "#ffaac8";
const DEFAULT_GLOW_B = "#beafff";
const DEFAULT_BLUR = 30;
const DEFAULT_SPRING_STIFFNESS = 380;
const DEFAULT_SPRING_DAMPING = 30;
/** Seconds between neighbouring items as they spring out. */
const STAGGER = 0.04;

/* Radial geometry. Corners fan over a quarter circle; the centered button
   has room on both sides, so it fans over a wider arc above itself. The
   radius grows with the item count so neighbours (and their labels) keep
   at least RADIAL_GAP px between centers. */
const RADIAL_MIN_RADIUS = 100;
const RADIAL_GAP = 66;
const RADIAL_ARCS: Record<
  NonNullable<GlassFabMenuProps["position"]>,
  [from: number, to: number]
> = {
  "bottom-right": [90, 180], // straight up → left
  "bottom-left": [90, 0], // straight up → right
  "bottom-center": [160, 20], // upper-left → upper-right
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** x / y offsets (px, screen space) of each radial item from the button center. */
function radialOffsets(
  count: number,
  position: NonNullable<GlassFabMenuProps["position"]>,
) {
  const [from, to] = RADIAL_ARCS[position];
  const span = Math.abs(toRad(to - from));
  const radius =
    count > 1
      ? Math.max(RADIAL_MIN_RADIUS, (RADIAL_GAP * (count - 1)) / span)
      : RADIAL_MIN_RADIUS;
  return Array.from({ length: count }, (_, i) => {
    const angle = toRad(count > 1 ? from + ((to - from) * i) / (count - 1) : from);
    return {
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(-Math.sin(angle) * radius),
    };
  });
}

/** Softer tint of a color for the derived glows: `amount` of color, rest white. */
const tint = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, white)`;

/** The menu's items in DOM order. */
const itemsIn = (menu: HTMLElement | null) =>
  Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

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
 * Floating frosted-glass action button — same grammar as GlassBottomTabBar
 * and GlassBottomSheet. Opening dims the page and springs the actions out
 * as a stack of pills or a radial fan; the plus turns into an ×. Scrim tap,
 * Escape or picking an action closes it. Follows the WAI-ARIA menu-button
 * pattern (aria-haspopup="menu", arrow keys between items).
 */
export function GlassFabMenu({
  actions,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  layout = "stack",
  accent = "glass",
  position = "bottom-right",
  placement = "fixed",
  glowColorA,
  glowColorB,
  blur,
  springStiffness = DEFAULT_SPRING_STIFFNESS,
  springDamping = DEFAULT_SPRING_DAMPING,
  "aria-label": ariaLabel = "アクションメニュー",
  className,
}: GlassFabMenuProps) {
  const isClient = useIsClient();
  const fabId = useId();
  const menuId = useId();
  const fabRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fixed = placement === "fixed";

  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : innerOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setInnerOpen(next);
    onOpenChange?.(next);
  };

  // Which item to focus once the menu has rendered. Only set by keyboard
  // opens, so a menu that mounts open (a preview) or opens on tap leaves
  // page focus alone.
  const pendingFocusRef = useRef<"first" | "last" | null>(null);

  const menuItems = () => itemsIn(menuRef.current);

  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!open || !target) return;
    pendingFocusRef.current = null;
    const items = itemsIn(menuRef.current);
    items[target === "first" ? 0 : items.length - 1]?.focus({
      preventScroll: true,
    });
  }, [open]);

  const closeAndReturnFocus = () => {
    setOpen(false);
    fabRef.current?.focus({ preventScroll: true });
  };

  // Escape is listened for on the document: Safari doesn't focus a button
  // on click, so after a tap focus may be outside the component.
  const onDocumentKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeAndReturnFocus();
  });
  useEffect(() => {
    if (!open) return;
    const listener = (event: globalThis.KeyboardEvent) =>
      onDocumentKeyDown(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [open]);

  const onFabClick = (event: MouseEvent<HTMLButtonElement>) => {
    // detail === 0: a keyboard "click" (Enter / Space) → focus the first item.
    if (!open && event.detail === 0) pendingFocusRef.current = "first";
    setOpen(!open);
  };

  const onFabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const target = event.key === "ArrowDown" ? "first" : "last";
    if (open) {
      const items = menuItems();
      items[target === "first" ? 0 : items.length - 1]?.focus();
    } else {
      pendingFocusRef.current = target;
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      // Menus aren't tab stops: close and let focus move on.
      setOpen(false);
      return;
    }
    const items = menuItems();
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === "ArrowUp")
      next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next === null) return;
    event.preventDefault();
    items[next]?.focus();
  };

  const select = (action: GlassFabAction) => {
    action.onSelect?.();
    closeAndReturnFocus();
  };

  const spring = {
    type: "spring",
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.9,
  } as const;
  const exitTransition = { duration: 0.14, ease: "easeIn" } as const;

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (glowColorA && glowColorA.toLowerCase() !== DEFAULT_GLOW_A) {
    vars["--gfm-glow-a"] = glowColorA;
    vars["--gfm-glow-a-rim"] = glowColorA;
    vars["--gfm-glow-a-soft"] = tint(glowColorA, 60);
    vars["--gfm-glow-a-bottom"] = tint(glowColorA, 75);
  }
  if (glowColorB && glowColorB.toLowerCase() !== DEFAULT_GLOW_B) {
    vars["--gfm-glow-b"] = glowColorB;
  }
  if (blur !== undefined && blur !== DEFAULT_BLUR) {
    vars["--gfm-blur"] = `${blur}px`;
  }

  const count = actions.length;
  const offsets = layout === "radial" ? radialOffsets(count, position) : [];

  const content = (
    // Follows the OS "reduce motion" setting: items then fade in place.
    <MotionConfig reducedMotion="user">
      <div
        className={className ? `${styles.root} ${className}` : styles.root}
        data-glass-fab-menu
        data-placement={placement}
        data-position={position}
        data-layout={layout}
        style={vars}
      >
        <AnimatePresence>
          {open ? (
            <motion.div
              key="scrim"
              className={styles.scrim}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={() => setOpen(false)}
            />
          ) : null}
        </AnimatePresence>

        <div className={styles.anchor}>
          <AnimatePresence>
            {open && count > 0 ? (
              // Keyed by layout so switching it re-runs the entrance. The
              // container itself never animates opacity: that would drop
              // the items' backdrop blur while it runs.
              <div
                key={layout}
                ref={menuRef}
                id={menuId}
                role="menu"
                aria-labelledby={fabId}
                aria-orientation="vertical"
                className={layout === "radial" ? styles.radial : styles.stack}
                onKeyDown={onMenuKeyDown}
              >
                {actions.map((action, i) => {
                  const Icon = action.icon;
                  if (layout === "radial") {
                    const { x, y } = offsets[i];
                    return (
                      <motion.button
                        key={action.id}
                        type="button"
                        role="menuitem"
                        tabIndex={-1}
                        className={styles.radialItem}
                        onClick={() => select(action)}
                        initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                        animate={{
                          x,
                          y,
                          scale: 1,
                          opacity: 1,
                          transition: { ...spring, delay: i * STAGGER },
                        }}
                        exit={{
                          x: 0,
                          y: 0,
                          scale: 0.4,
                          opacity: 0,
                          transition: exitTransition,
                        }}
                      >
                        <span className={styles.radialLens}>
                          <Icon size={22} strokeWidth={1.8} aria-hidden />
                        </span>
                        <span className={styles.radialLabel}>{action.label}</span>
                      </motion.button>
                    );
                  }
                  // Stack: the pill nearest the button springs out first.
                  const fromFab = count - 1 - i;
                  return (
                    <motion.button
                      key={action.id}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      className={styles.stackItem}
                      onClick={() => select(action)}
                      initial={{ y: 18, scale: 0.85, opacity: 0 }}
                      animate={{
                        y: 0,
                        scale: 1,
                        opacity: 1,
                        transition: { ...spring, delay: fromFab * STAGGER },
                      }}
                      exit={{
                        y: 12,
                        scale: 0.9,
                        opacity: 0,
                        transition: exitTransition,
                      }}
                    >
                      <span className={styles.stackLens}>
                        <Icon size={18} strokeWidth={1.8} aria-hidden />
                      </span>
                      <span className={styles.stackLabel}>{action.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            ) : null}
          </AnimatePresence>

          <div className={styles.fabWrap} data-accent={accent}>
            <button
              ref={fabRef}
              id={fabId}
              type="button"
              className={styles.fab}
              aria-label={ariaLabel}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              onClick={onFabClick}
              onKeyDown={onFabKeyDown}
            >
              <motion.span
                className={styles.fabIcon}
                initial={false}
                animate={{ rotate: open ? 45 : 0 }}
                transition={spring}
              >
                <Plus size={26} strokeWidth={2} aria-hidden />
              </motion.span>
            </button>
          </div>
        </div>
      </div>
    </MotionConfig>
  );

  if (!fixed) return content;
  // Portaled so a transformed / overflow:hidden ancestor can't trap the
  // fixed button. Nothing renders until hydration is done.
  return isClient ? createPortal(content, document.body) : null;
}

export default GlassFabMenu;
