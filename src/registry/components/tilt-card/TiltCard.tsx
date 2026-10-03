"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import styles from "./TiltCard.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type TiltCardProps = {
  /** Card content. Wrap parts in <TiltLayer depth={…}> to lift them off the surface. */
  children?: ReactNode;
  /** Maximum rotation on each axis, in degrees. */
  maxTilt?: number;
  /** Distance of the viewer from the card in px. Smaller = stronger depth. */
  perspective?: number;
  /** Scale while hovered / focused (1 = no lift). */
  scaleOnHover?: number;
  /** Specular highlight that slides across the surface. */
  glare?: boolean;
  /** Peak opacity of the glare while hovered (0–1). */
  glareOpacity?: number;
  /** Rainbow foil (color-dodge), visible only around the highlight. */
  holo?: boolean;
  /** Spring stiffness of the tilt. */
  springStiffness?: number;
  /** Spring damping of the tilt. */
  springDamping?: number;
  /** Corner radius of the card in px. */
  radius?: number;
  /**
   * Slow auto-sway while the pointer is away (and always on touch), so the
   * card shows its depth without hover. Off: the card rests flat.
   */
  idleAnimation?: boolean;
  className?: string;
};

export type TiltLayerProps = HTMLAttributes<HTMLDivElement> & {
  /** How far the layer floats above the card surface, in px. */
  depth?: number;
};

const DEFAULT_PERSPECTIVE = 1000;
const DEFAULT_RADIUS = 20;
/** Where a reduced-motion card rests: a fixed slight tilt still reads as 3D. */
const STATIC_POINT = { x: 0.64, y: 0.36 };
const CENTER = { x: 0.5, y: 0.5 };

/**
 * Idle path in pointer space (0–1). Two incommensurate sines draw a slow
 * Lissajous loop, so the sway never visibly repeats; t = 0 already sits
 * off-center so the first paint is tilted, not flat.
 */
function swayPoint(seconds: number) {
  return {
    x: 0.5 + 0.3 * Math.sin(seconds * 0.55 + 1.1),
    y: 0.5 + 0.22 * Math.sin(seconds * 0.37 + 2.4),
  };
}

/**
 * 3D parallax tilt card — rotates toward the pointer on springs, with a
 * glare that slides the opposite way, optional holographic foil, and
 * <TiltLayer> children that float at their own depth. Without a hovering
 * pointer it sways slowly; with reduced motion it rests at a fixed tilt.
 */
export function TiltCard({
  children,
  maxTilt = 14,
  perspective,
  scaleOnHover = 1.04,
  glare = true,
  glareOpacity = 0.35,
  holo = false,
  springStiffness = 160,
  springDamping = 20,
  radius,
  idleAnimation = true,
  className,
}: TiltCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const swaying = idleAnimation && !reduced;

  // Raw pointer position (0–1 across the card); springs smooth it. Starts
  // on the sway path so SSR and first paint already show the tilt.
  const start = idleAnimation ? swayPoint(0) : CENTER;
  const px = useMotionValue(start.x);
  const py = useMotionValue(start.y);
  const spring = { stiffness: springStiffness, damping: springDamping, mass: 0.7 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  // 0 → 1 while hovered or focused: drives the lift and the glare boost.
  const active = useMotionValue(0);
  const activeSpring = useSpring(active, { stiffness: 260, damping: 26 });

  // Props mirrored into motion values: a multi-input useTransform then
  // re-derives on change without stale closures over old props.
  const maxTiltMV = useMotionValue(maxTilt);
  const liftMV = useMotionValue(scaleOnHover);
  const glareMV = useMotionValue(glareOpacity);
  useEffect(() => maxTiltMV.set(maxTilt), [maxTilt, maxTiltMV]);
  useEffect(() => liftMV.set(scaleOnHover), [scaleOnHover, liftMV]);
  useEffect(() => glareMV.set(glareOpacity), [glareOpacity, glareMV]);

  // The card faces the pointer: the side under it recedes.
  const rotateX = useTransform([sy, maxTiltMV], ([y, m]: number[]) => (0.5 - y) * 2 * m);
  const rotateY = useTransform([sx, maxTiltMV], ([x, m]: number[]) => (x - 0.5) * 2 * m);
  const scale = useTransform([activeSpring, liftMV], ([a, s]: number[]) => 1 + (s - 1) * a);

  // Highlight sits opposite the pointer, like a fixed light on a turning card.
  const gx = useTransform(sx, (v) => (1 - v) * 100);
  const gy = useTransform(sy, (v) => (1 - v) * 100);
  const glareBg = useMotionTemplate`radial-gradient(farthest-corner circle at ${gx}% ${gy}%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.32) 22%, rgba(255,255,255,0) 58%)`;
  // Idle glare is a softer version of the hover one, so the gallery card
  // still shows the sheen.
  const glareAlpha = useTransform([activeSpring, glareMV], ([a, o]: number[]) => o * (0.55 + 0.45 * a));

  // Foil bands drift with the pointer (parallax against the art) and are
  // masked to the highlight, so the rainbow only flashes where light hits.
  const hx = useTransform(sx, (v) => v * 100);
  const hy = useTransform(sy, (v) => v * 100);
  const holoPos = useMotionTemplate`${hx}% ${hy}%`;
  const holoMask = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, #000 0%, rgba(0,0,0,0.45) 38%, transparent 72%)`;
  const holoAlpha = useTransform(activeSpring, (a) => 0.5 + 0.3 * a);

  // Shadow falls away from the raised side and deepens with the lift.
  const shadowX = useTransform(sx, (v) => (0.5 - v) * 36);
  const shadowY = useTransform([sy, activeSpring], ([y, a]: number[]) => 22 + (0.5 - y) * 24 + a * 14);
  const shadow = useMotionTemplate`${shadowX}px ${shadowY}px 60px -18px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.3)`;

  const hoverRef = useRef(false);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const frameRef = useRef(0);

  // Idle sway / resting pose. One rAF loop, paused while offscreen; the
  // hovering pointer simply takes precedence inside the loop.
  useEffect(() => {
    const root = rootRef.current;
    if (!swaying || !root) {
      if (!hoverRef.current) {
        const rest = reduced ? STATIC_POINT : CENTER;
        px.set(rest.x);
        py.set(rest.y);
      }
      return;
    }
    let raf = 0;
    let visible = true;
    const origin = performance.now();
    const tick = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (!hoverRef.current) {
        const p = swayPoint((now - origin) / 1000);
        px.set(p.x);
        py.set(p.y);
      }
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(root);
    raf = requestAnimationFrame(tick);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [swaying, reduced, px, py]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Touch has no hover: leave the card on its idle sway rather than
    // having it jump under a scrolling finger. Reduced motion: no tracking.
    if (event.pointerType === "touch" || reduced) return;
    const root = rootRef.current;
    if (!root) return;
    // Read the untransformed root, not the tilted card, so the mapping
    // doesn't feed back into itself.
    const rect = root.getBoundingClientRect();
    pointerRef.current = {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
    if (!hoverRef.current) {
      hoverRef.current = true;
      active.set(1);
    }
    // Coalesce to one write per frame regardless of the event rate.
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      if (!hoverRef.current) return;
      px.set(pointerRef.current.x);
      py.set(pointerRef.current.y);
    });
  };

  const onPointerLeave = () => {
    if (!hoverRef.current) return;
    hoverRef.current = false;
    active.set(0);
    // With sway on, the loop picks the card up on its next frame; the
    // springs blend the hand-off. Otherwise glide back to rest.
    if (!swaying) {
      const rest = reduced ? STATIC_POINT : CENTER;
      px.set(rest.x);
      py.set(rest.y);
    }
  };

  // The CSS module carries the defaults; custom properties are only set
  // for non-default values so the default render matches the stylesheet.
  const vars: CSSVars = {};
  if (perspective !== undefined && perspective !== DEFAULT_PERSPECTIVE) {
    vars["--tc-perspective"] = `${perspective}px`;
  }
  if (radius !== undefined && radius !== DEFAULT_RADIUS) {
    vars["--tc-radius"] = `${radius}px`;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={rootRef}
        className={className ? `${styles.root} ${className}` : styles.root}
        data-tilt-card
        style={vars}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        // Keyboard users get the lift (not the tilt) when focus lands inside.
        onFocus={() => active.set(1)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            active.set(hoverRef.current ? 1 : 0);
          }
        }}
      >
        <motion.div
          className={styles.card}
          style={{ rotateX, rotateY, scale, boxShadow: shadow }}
        >
          <div className={styles.content}>{children}</div>
          {holo ? (
            <motion.div
              className={styles.holo}
              aria-hidden
              style={{
                opacity: holoAlpha,
                backgroundPosition: holoPos,
                maskImage: holoMask,
                WebkitMaskImage: holoMask,
              }}
            />
          ) : null}
          {glare ? (
            <motion.div
              className={styles.glare}
              aria-hidden
              style={{ background: glareBg, opacity: glareAlpha }}
            />
          ) : null}
        </motion.div>
      </div>
    </MotionConfig>
  );
}

/**
 * A part of the card that floats `depth` px above the surface. Must be a
 * child of TiltCard (or of another TiltLayer) — any plain wrapper element
 * in between flattens the 3D and the layer stops popping out.
 */
export function TiltLayer({ depth = 30, className, style, ...rest }: TiltLayerProps) {
  const layerStyle: CSSVars = { ...style, "--tc-depth": `${depth}px` };
  return (
    <div
      {...rest}
      className={className ? `${styles.layer} ${className}` : styles.layer}
      data-tilt-layer
      style={layerStyle}
    />
  );
}

export default TiltCard;
