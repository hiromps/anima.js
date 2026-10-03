"use client";

import {
  useRef,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
} from "react";
import {
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import styles from "./MagnifyDock.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/** One app tile. Renders an <a> when `href` is set, otherwise a <button>. */
export type MagnifyDockAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  /** Shows the indicator dot (a "running app") and sets aria-current. */
  active?: boolean;
  /** Tile background for tileStyle="colorful"; defaults to the palette. */
  gradient?: string;
};

/** A thin vertical divider between groups (Finder | apps | Trash). */
export type MagnifyDockSeparator = { type: "separator"; id: string };

export type MagnifyDockItem = MagnifyDockAction | MagnifyDockSeparator;

export type MagnifyDockProps = {
  items: MagnifyDockItem[];
  /** Tile size at rest, in px. */
  baseSize?: number;
  /** Tile size right under the pointer, in px. */
  magnification?: number;
  /** How far (px) from the pointer tiles still grow. */
  distance?: number;
  /** Space between tiles, in px. */
  gap?: number;
  /** "hover": on hover / keyboard focus. "always": every tile. "never": none. */
  showLabels?: "hover" | "always" | "never";
  /** Dots under items marked `active`. */
  showIndicators?: boolean;
  springStiffness?: number;
  springDamping?: number;
  springMass?: number;
  /** "glass-dark": smoked glass tiles. "colorful": app-icon gradients. */
  tileStyle?: "glass-dark" | "colorful";
  className?: string;
  "aria-label"?: string;
};

const DEFAULT_BASE_SIZE = 52;
const DEFAULT_GAP = 10;

/** App-icon gradients for tileStyle="colorful", cycled by item index. */
const PALETTE = [
  "linear-gradient(160deg, #6ee7ff 0%, #2f7bff 100%)",
  "linear-gradient(160deg, #c4b5fd 0%, #7c3aed 100%)",
  "linear-gradient(160deg, #7dd3fc 0%, #0ea5e9 100%)",
  "linear-gradient(160deg, #fde68a 0%, #f97316 100%)",
  "linear-gradient(160deg, #fda4af 0%, #e11d48 100%)",
  "linear-gradient(160deg, #d1d5db 0%, #6b7280 100%)",
  "linear-gradient(160deg, #86efac 0%, #16a34a 100%)",
  "linear-gradient(160deg, #f9a8d4 0%, #db2777 100%)",
];

const isSeparator = (item: MagnifyDockItem): item is MagnifyDockSeparator =>
  "type" in item && item.type === "separator";

/** Horizontal center of an element in viewport px (same space as clientX). */
function centerX(el: Element) {
  const rect = el.getBoundingClientRect();
  return rect.left + rect.width / 2;
}

type TileProps = {
  item: MagnifyDockAction;
  index: number;
  mouseX: MotionValue<number>;
  baseSize: number;
  magnification: number;
  distance: number;
  spring: { stiffness: number; damping: number; mass: number };
  colorful: boolean;
  showIndicator: boolean;
};

/**
 * One tile. Its own component because every tile needs its own
 * useTransform / useSpring chain — hooks can't run inside items.map.
 */
function DockTile({
  item,
  index,
  mouseX,
  baseSize,
  magnification,
  distance,
  spring,
  colorful,
  showIndicator,
}: TileProps) {
  const ref = useRef<HTMLLIElement>(null);

  // Recomputed in framer's preRender step only when mouseX changes, so
  // the rect read never interleaves with the size writes of the same
  // frame and there is no feedback loop while springs settle.
  const size = useTransform(mouseX, (x) => {
    const el = ref.current;
    if (!el || !Number.isFinite(x)) return baseSize;
    const d = Math.abs(x - centerX(el));
    if (d >= distance) return baseSize;
    // Cosine falloff: flat at the peak and at the edge, like the real
    // dock, instead of a linear tent with a sharp tip.
    const t = (1 + Math.cos((Math.PI * d) / distance)) / 2;
    return baseSize + (magnification - baseSize) * t;
  });
  const animatedSize = useSpring(size, spring);

  const Icon = item.icon;
  const tileStyle: CSSVars | undefined = colorful
    ? { "--mdk-tile-bg": item.gradient ?? PALETTE[index % PALETTE.length] }
    : undefined;

  const content = (
    <>
      <span className={styles.tile} style={tileStyle} aria-hidden>
        <Icon className={styles.icon} strokeWidth={1.75} />
      </span>
      <span className={styles.tip} aria-hidden>
        {item.label}
      </span>
    </>
  );

  return (
    // The <li> is the flex slot: animating its width pushes the
    // neighbors aside, which is what makes it read as a dock and not a
    // row of zooming icons.
    <motion.li
      ref={ref}
      className={styles.slot}
      style={{ width: animatedSize, height: animatedSize }}
    >
      {item.href ? (
        <a
          href={item.href}
          className={styles.item}
          aria-label={item.label}
          aria-current={item.active ? "true" : undefined}
          onClick={item.onClick}
        >
          {content}
        </a>
      ) : (
        <button
          type="button"
          className={styles.item}
          aria-label={item.label}
          aria-current={item.active ? "true" : undefined}
          onClick={item.onClick}
        >
          {content}
        </button>
      )}
      {showIndicator && item.active ? (
        <span className={styles.dot} aria-hidden />
      ) : null}
    </motion.li>
  );
}

/**
 * macOS-style magnifying dock. Tiles grow with pointer proximity (a
 * shared mouseX motion value, no React state per frame), labels pop above
 * the hovered or keyboard-focused tile, and keyboard focus magnifies too
 * so the effect isn't mouse-only. Touch gets a tap scale instead of
 * magnification; reduced motion keeps every tile at rest size.
 */
export function MagnifyDock({
  items,
  baseSize = DEFAULT_BASE_SIZE,
  magnification = 84,
  distance = 150,
  gap = DEFAULT_GAP,
  showLabels = "hover",
  showIndicators = true,
  springStiffness = 260,
  springDamping = 20,
  springMass = 0.3,
  tileStyle = "glass-dark",
  className,
  "aria-label": ariaLabel = "ドック",
}: MagnifyDockProps) {
  // Infinity = "no pointer": every tile resolves to baseSize.
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const pointerInside = useRef(false);
  const reduceMotion = useReducedMotion();
  // Never below the rest size, or tiles would shrink under the pointer.
  const peak = Math.max(magnification, baseSize);

  const onPointerMove = (e: PointerEvent<HTMLUListElement>) => {
    // Touch has no hover: magnifying under a finger only hides the tile
    // being tapped. Touch gets the CSS :active scale instead.
    if (e.pointerType === "touch" || reduceMotion) return;
    pointerInside.current = true;
    mouseX.set(e.clientX);
  };

  const onPointerLeave = () => {
    pointerInside.current = false;
    mouseX.set(Number.POSITIVE_INFINITY);
  };

  // Keyboard focus magnifies the focused tile as if the pointer were on
  // it. :focus-visible filters out focus from mouse clicks.
  const onFocus = (e: FocusEvent<HTMLUListElement>) => {
    if (reduceMotion || pointerInside.current) return;
    const target = e.target as HTMLElement;
    if (!target.matches(":focus-visible")) return;
    mouseX.set(centerX(target));
  };

  const onBlur = (e: FocusEvent<HTMLUListElement>) => {
    if (pointerInside.current) return;
    // Focus moving to another tile is handled by its own focus event.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    mouseX.set(Number.POSITIVE_INFINITY);
  };

  const spring = {
    stiffness: springStiffness,
    damping: springDamping,
    mass: springMass,
  };

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (baseSize !== DEFAULT_BASE_SIZE) vars["--mdk-base"] = `${baseSize}px`;
  if (gap !== DEFAULT_GAP) vars["--mdk-gap"] = `${gap}px`;

  return (
    <MotionConfig reducedMotion="user">
      <nav
        className={className ? `${styles.root} ${className}` : styles.root}
        aria-label={ariaLabel}
        data-labels={showLabels}
        data-tiles={tileStyle}
        style={vars}
      >
        <ul
          className={styles.bar}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          {items.map((item, index) =>
            isSeparator(item) ? (
              // Purely visual grouping; hidden so the list reads as N links.
              <li key={item.id} className={styles.separator} aria-hidden />
            ) : (
              <DockTile
                key={item.id}
                item={item}
                index={index}
                mouseX={mouseX}
                baseSize={baseSize}
                magnification={peak}
                distance={Math.max(distance, 1)}
                spring={spring}
                colorful={tileStyle === "colorful"}
                showIndicator={showIndicators}
              />
            ),
          )}
        </ul>
      </nav>
    </MotionConfig>
  );
}

export default MagnifyDock;
