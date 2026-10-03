"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./BentoGrid.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/** Columns × rows a tile spans on the full-width grid. */
export type BentoSpan = "1x1" | "2x1" | "1x2" | "2x2";

export type BentoItem = {
  title: string;
  description?: string;
  /** Shown in the tinted chip at the top-left of the tile. */
  icon?: LucideIcon;
  /** Default "1x1". Collapses on narrow containers (see the stylesheet). */
  span?: BentoSpan;
  /**
   * Optional illustration area. It sits between the icon and the text (or
   * to the right of the text on a 2x1 tile) and can read the tile's color
   * as `var(--bento-accent)`.
   */
  visual?: ReactNode;
  /** Tile color for the inner gradient, icon chip and hover glow. */
  accent?: string;
};

export type BentoGridProps = {
  items: BentoItem[];
  /** Maximum number of columns (1–6) when the container is wide. Default 4. */
  columns?: number;
  /** Space between tiles in px. Default 12. */
  gap?: number;
  /** Tile corner radius in px. Default 20. */
  radius?: number;
  /** Stagger-fade the tiles in the first time the grid scrolls into view. */
  revealOnScroll?: boolean;
  /** Accent for tiles that don't set their own. Default #a78bfa. */
  accent?: string;
  className?: string;
  "aria-label"?: string;
};

const DEFAULT_COLUMNS = 4;
const DEFAULT_GAP = 12;
const DEFAULT_RADIUS = 20;
const DEFAULT_ACCENT = "#a78bfa";
/** Medium containers (see the container query) show at most this many columns. */
const MEDIUM_COLUMNS = 2;

/**
 * Apple / Linear-style bento feature grid: dark tiles with mixed spans,
 * each tinted by its own accent. Layout is pure CSS — container queries
 * collapse the columns (full → 2 → 1) based on the grid's own width, so it
 * behaves the same in a sidebar, a scaled preview or a full page.
 */
export function BentoGrid({
  items,
  columns = DEFAULT_COLUMNS,
  gap,
  radius,
  revealOnScroll = true,
  accent,
  className,
  "aria-label": ariaLabel,
}: BentoGridProps) {
  const ref = useRef<HTMLElement>(null);
  const cols = Math.min(6, Math.max(1, Math.round(columns) || DEFAULT_COLUMNS));

  // The server markup already carries data-reveal="pending", and the
  // stylesheet only hides pending tiles when scripting is on and motion is
  // allowed — so there's no flash of visible-then-hidden tiles on hydrate,
  // and no-JS / reduced-motion visitors simply see the grid.
  useEffect(() => {
    const el = ref.current;
    if (!el || !revealOnScroll) return;
    const show = () => {
      el.dataset.reveal = "shown";
    };
    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          show();
          // One-shot: tiles shouldn't fade out and back in on every scroll.
          observer.disconnect();
        }
      },
      // Trigger a little after the top edge enters, so the stagger is seen.
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [revealOnScroll]);

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (cols !== DEFAULT_COLUMNS) {
    vars["--bento-cols"] = cols;
    if (cols < MEDIUM_COLUMNS) vars["--bento-cols-md"] = cols;
  }
  if (gap !== undefined && gap !== DEFAULT_GAP) vars["--bento-gap"] = `${gap}px`;
  if (radius !== undefined && radius !== DEFAULT_RADIUS) {
    vars["--bento-radius"] = `${radius}px`;
  }
  if (accent && accent.toLowerCase() !== DEFAULT_ACCENT) {
    vars["--bento-default-accent"] = accent;
  }

  return (
    <section
      ref={ref}
      aria-label={ariaLabel}
      className={className ? `${styles.root} ${className}` : styles.root}
      // A one-column grid can't honour any column span, at any width.
      data-single={cols === 1 ? "" : undefined}
      data-reveal={revealOnScroll ? "pending" : undefined}
      style={vars}
    >
      <ul className={styles.grid}>
        {items.map((item, i) => {
          const Icon = item.icon;
          const cell: CSSVars = { "--bento-i": i };
          if (item.accent) cell["--bento-accent"] = item.accent;
          return (
            <li
              key={`${item.title}-${i}`}
              className={styles.cell}
              data-span={item.span ?? "1x1"}
              data-visual={item.visual ? "" : undefined}
              style={cell}
            >
              <div className={styles.tile}>
                <span aria-hidden className={styles.grain} />
                <div className={styles.body}>
                  {Icon && (
                    <span aria-hidden className={styles.chip}>
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                  )}
                  {item.visual && <div className={styles.visual}>{item.visual}</div>}
                  <div className={styles.text}>
                    <h3 className={styles.title}>{item.title}</h3>
                    {item.description && (
                      <p className={styles.description}>{item.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default BentoGrid;
