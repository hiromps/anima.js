"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./OrbitingIcons.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Any icon component that takes a className — lucide-react icons fit, as do
 * most icon libraries. Typed structurally so the component itself has no
 * runtime dependency on an icon package.
 */
export type OrbitIconComponent = ComponentType<{
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export type OrbitItem = {
  /** Name of the integration — read by assistive tech and shown as a tooltip. */
  label: string;
  /** Icon drawn inside the chip. */
  icon?: OrbitIconComponent;
  /** Custom chip content (a logo image, initials…). Wins over `icon`. */
  node?: ReactNode;
};

export type OrbitRing = {
  /**
   * Orbit radius. ≤ 1 is a fraction of `size` (0.5 = touches the edge);
   * above 1 it is px at the full `size`, scaled with the rest.
   */
  radius: number;
  /** Seconds per revolution. */
  speed: number;
  /** Orbit counter-clockwise. */
  reverse?: boolean;
  items: OrbitItem[];
};

export type OrbitRingStyle = "dashed" | "solid" | "gradient";

export type OrbitingIconsProps = {
  /** 1–3 concentric orbits, innermost first. */
  rings: OrbitRing[];
  /**
   * Width (= height) in px at which the layout is designed. The component
   * shrinks to its container below that, keeping every proportion.
   */
  size?: number;
  /** Diameter of the center disc in px at the full `size`. */
  centerSize?: number;
  /** Diameter of each icon chip in px at the full `size`. */
  chipSize?: number;
  /** Draw the orbit lines. */
  showRings?: boolean;
  /** "gradient" = a lit comet arc that travels with the ring. */
  ringStyle?: OrbitRingStyle;
  /** Occasional light pulses running from a chip toward the center. */
  showBeams?: boolean;
  /** Freeze everything while the pointer is over the component. */
  pauseOnHover?: boolean;
  /** Center glow, beam and gradient-arc color. */
  glowColor?: string;
  /** Center content — typically your logo. Sized to ~42% of the disc if it is an icon. */
  children?: ReactNode;
  className?: string;
  /** Names the whole visual (rendered as a labelled group). */
  "aria-label"?: string;
};

const DEFAULT_SIZE = 420;
const DEFAULT_CENTER_SIZE = 104;
const DEFAULT_CHIP_SIZE = 44;
const DEFAULT_GLOW = "#8b7bff";
/** The default size ratios, mirrored in the stylesheet's root defaults. */
const DEFAULT_CENTER_RATIO = DEFAULT_CENTER_SIZE / DEFAULT_SIZE;
const DEFAULT_CHIP_RATIO = DEFAULT_CHIP_SIZE / DEFAULT_SIZE;
/** Beam cycle in seconds; each pulse occupies the first ~22% of it. */
const BEAM_CYCLE = 7;
/** Floor for a revolution, so a 0 / negative speed can't produce a frozen or invalid animation. */
const MIN_SPEED = 2;

const ratio = (n: number) => Number(n.toFixed(5));

/**
 * "Integrations" hero visual: a center disc with concentric orbits along
 * which icon chips travel. Pure CSS — each ring wrapper rotates, and each
 * chip runs the same animation backwards, so the two cancel out and the
 * icons stay upright. The angular spread lives on static "spokes", which
 * means reduced motion (animations off) still leaves an evenly
 * distributed, upright layout.
 *
 * Every length is a fraction of the root's width in `cqi`, so the whole
 * thing scales to fit its container like an image without measuring.
 */
export function OrbitingIcons({
  rings,
  size = DEFAULT_SIZE,
  centerSize = DEFAULT_CENTER_SIZE,
  chipSize = DEFAULT_CHIP_SIZE,
  showRings = true,
  ringStyle = "gradient",
  showBeams = true,
  pauseOnHover = true,
  glowColor = DEFAULT_GLOW,
  children,
  className,
  "aria-label": ariaLabel,
}: OrbitingIconsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);

  // Stop the orbits while scrolled out of view — compositor-only, but not free.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setOffscreen(!entry.isIntersecting),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const safeSize = size > 0 ? size : DEFAULT_SIZE;
  const centerRatio = ratio(centerSize / safeSize);
  const chipRatio = ratio(chipSize / safeSize);

  const vars: CSSVars = {};
  if (safeSize !== DEFAULT_SIZE) vars["--oi-size"] = `${safeSize}px`;
  if (centerRatio !== ratio(DEFAULT_CENTER_RATIO)) vars["--oi-center"] = centerRatio;
  if (chipRatio !== ratio(DEFAULT_CHIP_RATIO)) vars["--oi-chip"] = chipRatio;
  if (glowColor.toLowerCase() !== DEFAULT_GLOW) vars["--oi-glow"] = glowColor;

  // Read once, in ring order; duplicates (the same service on two rings)
  // are announced once.
  const labels = [
    ...new Set(rings.flatMap((ring) => ring.items.map((item) => item.label))),
  ];

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      data-ring-style={ringStyle}
      data-pause-on-hover={pauseOnHover || undefined}
      data-offscreen={offscreen || undefined}
      style={vars}
    >
      {/* The orbit layer carries no information beyond the labels listed
          below, so assistive tech skips it entirely. */}
      <div className={styles.orbits} aria-hidden>
        <div className={styles.ambient} />
        <div className={styles.glow} />
        {rings.map((ring, ringIndex) => {
          const radius = ring.radius > 1 ? ring.radius / safeSize : ring.radius;
          const count = ring.items.length;
          // Stagger the rings' starting angles so chips never line up radially.
          const offset = count ? (360 / count) * (ringIndex * 0.5) + ringIndex * 17 : 0;
          const ringVars: CSSVars = {
            "--oi-r": ratio(Math.max(0, radius)),
            "--oi-duration": `${Math.max(MIN_SPEED, ring.speed)}s`,
          };
          return (
            <div
              key={ringIndex}
              className={styles.ring}
              data-reverse={ring.reverse || undefined}
              style={ringVars}
            >
              {showRings && <div className={styles.line} />}
              {ring.items.map((item, i) => {
                const angle = offset + (360 / count) * i;
                // Golden-ratio spread gives each beam a pseudo-random slot
                // in the cycle, so pulses feel occasional rather than marching.
                const phase = (ringIndex * 0.31 + i * 0.618) % 1;
                const spokeVars: CSSVars = {
                  "--oi-angle": `${angle.toFixed(2)}deg`,
                  "--oi-beam-delay": `${(-phase * BEAM_CYCLE).toFixed(2)}s`,
                };
                const Icon = item.icon;
                return (
                  <div key={`${item.label}-${i}`} className={styles.spoke} style={spokeVars}>
                    {showBeams && <span className={styles.beam} />}
                    <span className={styles.chipAnchor}>
                      <span className={styles.chip} title={item.label}>
                        {item.node ?? (Icon ? <Icon aria-hidden strokeWidth={1.75} /> : null)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Outside the hidden layer: a logo's alt text / name stays reachable. */}
      <div className={styles.center}>{children}</div>

      {labels.length > 0 && (
        <ul className={styles.srOnly}>
          {labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrbitingIcons;
