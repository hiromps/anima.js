"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentType,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import styles from "./SpotlightCard.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

type PassThrough = Omit<HTMLAttributes<HTMLElement>, "children" | "className"> & {
  /** Forwarded as-is so `as="a"` can be a real link. */
  href?: string;
};

export type SpotlightCardProps = PassThrough & {
  /** Light of the spotlight on the border and (softer) on the surface. */
  spotlightColor?: string;
  /** Resting 1px border color, visible where the spotlight isn't. */
  borderColor?: string;
  /** Diameter of the surface glow in px. The border glow is ~60% of it. */
  spotlightSize?: number;
  /** 0–1. Peak opacity under the pointer; the idle glow is ~45% of it. */
  intensity?: number;
  /** Corner radius in px. */
  radius?: number;
  children?: ReactNode;
  className?: string;
  /** Element to render, e.g. "article", "li" or "a". Default "div". */
  as?: ElementType;
};

export type SpotlightGridProps = Omit<HTMLAttributes<HTMLElement>, "className"> & {
  children?: ReactNode;
  className?: string;
  /** Element to render, e.g. "ul" with `as="li"` cards. Default "div". */
  as?: ElementType;
};

const DEFAULT_SPOTLIGHT_COLOR = "#c4b5fd";
const DEFAULT_BORDER_COLOR = "#26262b";
const DEFAULT_SPOTLIGHT_SIZE = 420;
const DEFAULT_INTENSITY = 1;
const DEFAULT_RADIUS = 18;

/**
 * Idle spot of a grid, as a fraction of its size: the centre seam, so the
 * inner corners of every card catch some light at rest (Linear-style).
 */
const GRID_IDLE_X = 0.5;
const GRID_IDLE_Y = 0.5;

/**
 * `as` accepts any element, so TypeScript can't know its props; render it
 * through this loose alias (the public props are still typed above).
 */
type LooseElement = ComponentType<Record<string, unknown>>;

/** True for cards inside a SpotlightGrid: the grid tracks the pointer. */
const GroupContext = createContext(false);

/**
 * Pointer-follow plumbing shared by the card and the grid. Pointer events
 * only record the latest position; the CSS variables are written at most
 * once per frame, and nothing goes through React state.
 */
function usePointerSpot(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  write: (el: HTMLElement, x: number, y: number) => void,
) {
  // Kept in a ref so a new `write` closure doesn't re-bind the listeners.
  const writeRef = useRef(write);
  useEffect(() => {
    writeRef.current = write;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let frame = 0;
    let x = 0;
    let y = 0;

    const flush = () => {
      frame = 0;
      writeRef.current(el, x, y);
    };
    const onMove = (event: PointerEvent) => {
      // Touch has no hover: a tap would just jump the light. Keep idle.
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      el.dataset.active = "";
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const onLeave = () => {
      // The light stays where it was and dims back to the idle level.
      delete el.dataset.active;
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
      delete el.dataset.active;
    };
  }, [ref, enabled]);
}

/**
 * Linear / Vercel-style feature card: a dark surface with a 1px border, and
 * a radial spotlight that follows the pointer — sharp on the border, soft
 * and wide on the surface. At rest the light is parked top-left at reduced
 * strength, so the card never renders flat (first paint, touch, no JS).
 */
export function SpotlightCard({
  spotlightColor,
  borderColor,
  spotlightSize,
  intensity,
  radius,
  children,
  className,
  as = "div",
  style,
  ...rest
}: SpotlightCardProps) {
  const Tag = as as unknown as LooseElement;
  const ref = useRef<HTMLElement>(null);
  const grouped = useContext(GroupContext);

  // Percentages of the card's own rect: independent of any CSS transform
  // scaling the card (e.g. a scaled-down preview), and in the same unit
  // as the 30% / 20% idle position in the stylesheet.
  usePointerSpot(ref, !grouped, (el, x, y) => {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    el.style.setProperty("--sc-x", `${((x - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--sc-y", `${((y - rect.top) / rect.height) * 100}%`);
  });

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = { ...style };
  if (spotlightColor && spotlightColor.toLowerCase() !== DEFAULT_SPOTLIGHT_COLOR) {
    vars["--sc-color"] = spotlightColor;
  }
  if (borderColor && borderColor.toLowerCase() !== DEFAULT_BORDER_COLOR) {
    vars["--sc-border"] = borderColor;
  }
  if (spotlightSize !== undefined && spotlightSize !== DEFAULT_SPOTLIGHT_SIZE) {
    vars["--sc-size"] = `${spotlightSize}px`;
  }
  if (intensity !== undefined && intensity !== DEFAULT_INTENSITY) {
    vars["--sc-intensity"] = Math.min(1, Math.max(0, intensity));
  }
  if (radius !== undefined && radius !== DEFAULT_RADIUS) {
    vars["--sc-radius"] = `${radius}px`;
  }

  return (
    <Tag
      {...rest}
      ref={ref}
      className={className ? `${styles.card} ${className}` : styles.card}
      data-spotlight-card=""
      style={vars}
    >
      <div className={styles.surface}>
        <div className={styles.content}>{children}</div>
      </div>
    </Tag>
  );
}

/**
 * Optional wrapper for a group of SpotlightCards (Linear's features grid):
 * tracks the pointer across the whole grid, so the borders of neighbouring
 * cards light up as the pointer approaches them, not only the hovered one.
 * Lays its children out as a responsive grid; `className` can override it.
 */
export function SpotlightGrid({
  children,
  className,
  as = "div",
  ...rest
}: SpotlightGridProps) {
  const Tag = as as unknown as LooseElement;
  const ref = useRef<HTMLElement>(null);

  // Each card's offset inside the grid, in the grid's untransformed px, is
  // measured on resize only. Pointer moves then write just two variables
  // on the grid and every card derives its own spot in CSS.
  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    let moved = false;

    const measure = () => {
      const box = grid.getBoundingClientRect();
      // Rects are in screen px; divide out any transform scale.
      const scale = grid.offsetWidth ? box.width / grid.offsetWidth : 1;
      if (!scale) return;
      grid.querySelectorAll<HTMLElement>("[data-spotlight-card]").forEach((card) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--sc-ox", `${(rect.left - box.left) / scale}px`);
        card.style.setProperty("--sc-oy", `${(rect.top - box.top) / scale}px`);
      });
      if (!moved) {
        grid.style.setProperty("--sc-gx", `${grid.offsetWidth * GRID_IDLE_X}px`);
        grid.style.setProperty("--sc-gy", `${grid.offsetHeight * GRID_IDLE_Y}px`);
      }
      grid.dataset.ready = "";
    };

    const markMoved = (event: PointerEvent) => {
      if (event.pointerType !== "touch") moved = true;
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    // A card can change size (e.g. its text wraps) without the grid
    // resizing, which would shift its neighbours' offsets.
    grid
      .querySelectorAll<HTMLElement>("[data-spotlight-card]")
      .forEach((card) => observer.observe(card));
    grid.addEventListener("pointermove", markMoved, { passive: true });
    return () => {
      observer.disconnect();
      grid.removeEventListener("pointermove", markMoved);
    };
  }, []);

  usePointerSpot(ref, true, (el, x, y) => {
    const box = el.getBoundingClientRect();
    const scale = el.offsetWidth ? box.width / el.offsetWidth : 1;
    if (!scale) return;
    el.style.setProperty("--sc-gx", `${(x - box.left) / scale}px`);
    el.style.setProperty("--sc-gy", `${(y - box.top) / scale}px`);
  });

  return (
    <Tag
      {...rest}
      ref={ref}
      className={className ? `${styles.grid} ${className}` : styles.grid}
    >
      <GroupContext.Provider value={true}>{children}</GroupContext.Provider>
    </Tag>
  );
}

export default SpotlightCard;
