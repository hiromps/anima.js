"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./DotGridBackground.module.css";

/** Lets CSS custom properties pass the CSSProperties type check. */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type DotGridBackgroundProps = {
  /** Dot diameter at rest, in px. */
  dotSize?: number;
  /** Distance between dot centers, in px. */
  gap?: number;
  /** Resting dot color. Drawn at low alpha, so a light gray reads as dim. */
  color?: string;
  /** Color dots brighten toward near the pointer, in ripples and wave crests. */
  accentColor?: string;
  /** Pointer influence radius, in px. */
  radius?: number;
  /** How far dots under the pointer are pushed away, in px. 0 = no push. */
  push?: number;
  /** Slow traveling band of brightness, so the grid is alive without a pointer. */
  wave?: boolean;
  /** Wave speed multiplier. */
  waveSpeed?: number;
  /** A ring that propagates outward from every click / tap. */
  ripple?: boolean;
  /** Fade the grid out toward the edges so it melts into the page. */
  fade?: boolean;
  className?: string;
  /** Hero content rendered above the grid. */
  children?: ReactNode;
};

const DEFAULT_DOT_SIZE = 2;
const DEFAULT_GAP = 22;
const DEFAULT_COLOR = "#a1a1b5";
const DEFAULT_ACCENT = "#a78bfa";
const DEFAULT_RADIUS = 160;
const DEFAULT_PUSH = 12;
const DEFAULT_WAVE_SPEED = 1;

/** Higher DPRs cost fill-rate without a visible gain on 2px dots. */
const MAX_DPR = 2;
const TAU = Math.PI * 2;

/** Resting alpha of a dot before any pointer / wave / glow lifts it. */
const BASE_ALPHA = 0.3;

/*
 * Dots are drawn in buckets of identical fill (color level × alpha level):
 * one path + one fill() per bucket instead of a fill per dot, which is what
 * keeps a full-screen grid of several thousand dots cheap. 12 × 20 levels
 * is below what's distinguishable on 2px dots.
 */
const COLOR_LEVELS = 12;
const ALPHA_LEVELS = 20;
const BUCKETS = COLOR_LEVELS * ALPHA_LEVELS;
/** Bucket index for dots that end up invisible — never drawn. */
const SKIP = BUCKETS;

/* Ripple ring: expansion speed (px/ms), ring thickness (px), lifetime (ms). */
const RIPPLE_SPEED = 0.55;
const RIPPLE_WIDTH = 46;
const RIPPLE_LIFE = 1700;
const MAX_RIPPLES = 6;

/* Spring that returns pushed dots to rest (per 60fps frame). */
const STIFFNESS = 0.12;
const DAMPING = 0.78;

type Config = {
  dotSize: number;
  gap: number;
  color: string;
  accentColor: string;
  radius: number;
  push: number;
  wave: boolean;
  waveSpeed: number;
  ripple: boolean;
  fade: boolean;
};

type Ripple = { x: number; y: number; age: number };

type Engine = {
  setConfig: (config: Config) => void;
  destroy: () => void;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Resolves any CSS color to [r, g, b] by letting the 2D context normalize
 * it — avoids shipping a color parser. Unparseable input keeps `fallback`.
 */
function parseColor(
  ctx: CanvasRenderingContext2D,
  input: string,
  fallback: string,
): [number, number, number] {
  ctx.fillStyle = fallback;
  ctx.fillStyle = input;
  const v = String(ctx.fillStyle);
  if (v.startsWith("#")) {
    return [
      parseInt(v.slice(1, 3), 16),
      parseInt(v.slice(3, 5), 16),
      parseInt(v.slice(5, 7), 16),
    ];
  }
  const m = v.match(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2]] : [255, 255, 255];
}

/**
 * The imperative canvas loop. Lives outside React: per-frame state stays in
 * typed arrays and closures, so pointer movement never re-renders anything.
 */
function createEngine(
  root: HTMLDivElement,
  canvas: HTMLCanvasElement,
  initial: Config,
): Engine | null {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return null;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let cfg = initial;
  let width = 0;
  let height = 0;
  let dpr = 1;

  // Grid state — rest position, spring offset/velocity, static edge fade.
  let count = 0;
  let x0 = new Float32Array(0);
  let y0 = new Float32Array(0);
  let ox = new Float32Array(0);
  let oy = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let edge = new Float32Array(0);
  let glow = new Float32Array(0);
  let size = new Float32Array(0);
  let bucket = new Uint16Array(0);
  let order = new Uint32Array(0);
  const starts = new Uint32Array(BUCKETS + 2);

  let palette: string[] = [];

  // Pointer in the root's own (unscaled) CSS px.
  let px = 0;
  let py = 0;
  let pointerActive = false;
  let strength = 0;
  let ripples: Ripple[] = [];
  // Largest spring error / velocity of the last step — 0 once settled.
  let motion = 0;

  // Wave clock in ms, advanced only while frames run so it never jumps
  // after the grid was offscreen. Seeded mid-cycle for a lively first paint.
  let clock = 4000;
  let raf = 0;
  let last = 0;
  let visible = true;
  const mq =
    typeof matchMedia !== "undefined"
      ? matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  let reduced = !!mq?.matches;

  function buildPalette() {
    const [br, bg, bb] = parseColor(ctx, cfg.color, DEFAULT_COLOR);
    const [ar, ag, ab] = parseColor(ctx, cfg.accentColor, DEFAULT_ACCENT);
    palette = new Array(BUCKETS);
    for (let c = 0; c < COLOR_LEVELS; c++) {
      const t = c / (COLOR_LEVELS - 1);
      const r = Math.round(br + (ar - br) * t);
      const g = Math.round(bg + (ag - bg) * t);
      const b = Math.round(bb + (ab - bb) * t);
      for (let a = 0; a < ALPHA_LEVELS; a++) {
        palette[c * ALPHA_LEVELS + a] =
          `rgba(${r},${g},${b},${((a + 1) / ALPHA_LEVELS).toFixed(3)})`;
      }
    }
  }

  function buildGrid() {
    const gap = Math.max(4, cfg.gap);
    // One extra row/column so the grid bleeds past every edge instead of
    // leaving a margin on the sides that don't divide evenly.
    const cols = Math.floor(width / gap) + 2;
    const rows = Math.floor(height / gap) + 2;
    const startX = (width - (cols - 1) * gap) / 2;
    const startY = (height - (rows - 1) * gap) / 2;
    count = cols * rows;
    x0 = new Float32Array(count);
    y0 = new Float32Array(count);
    ox = new Float32Array(count);
    oy = new Float32Array(count);
    vx = new Float32Array(count);
    vy = new Float32Array(count);
    edge = new Float32Array(count);
    glow = new Float32Array(count);
    size = new Float32Array(count);
    bucket = new Uint16Array(count);
    order = new Uint32Array(count);

    const cx = width / 2;
    const cy = height / 2;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * gap;
        const y = startY + r * gap;
        x0[i] = x;
        y0[i] = y;
        // Elliptical distance from the center, 1 at the edge midpoints.
        const ex = (x - cx) / (cx || 1);
        const ey = (y - cy) / (cy || 1);
        const e = Math.sqrt(ex * ex + ey * ey);
        // Edge fade: full until ~half way out, gone just past the corners'
        // inscribed ellipse — the headline area stays crisp.
        const s = clamp01((e - 0.45) / 0.65);
        edge[i] = cfg.fade ? 1 - s * s * (3 - 2 * s) : 1;
        // Static center glow, used only for the reduced-motion still: it
        // replaces the wave's brightness variation with a gentle vignette.
        const g = clamp01(1 - e / 0.9);
        glow[i] = g * g;
        i++;
      }
    }
  }

  function resize() {
    width = root.clientWidth;
    height = root.clientHeight;
    dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    buildGrid();
    // Resizing clears the bitmap; repaint synchronously so there's no
    // blank frame while the loop spins back up.
    step(0);
    paint();
    kick();
  }

  /** Advances physics by `f` 60fps-frames and writes size + bucket per dot. */
  function step(f: number) {
    const interactive = !reduced;
    strength += ((interactive && pointerActive ? 1 : 0) - strength) *
      Math.min(1, 0.14 * f);
    if (strength < 0.001) strength = 0;

    const R = Math.max(1, cfg.radius);
    const R2 = R * R;
    const push = cfg.push;
    const P = strength;
    const useWave = cfg.wave && interactive;
    const useGlow = reduced;
    const baseR = Math.max(0.25, cfg.dotSize / 2);

    // Ripple ring radius / amplitude for this frame.
    const rings: { x: number; y: number; r: number; amp: number }[] = [];
    if (interactive) {
      for (const rp of ripples) {
        const life = rp.age / RIPPLE_LIFE;
        rings.push({
          x: rp.x,
          y: rp.y,
          r: rp.age * RIPPLE_SPEED,
          amp: Math.pow(1 - life, 1.6),
        });
      }
    }

    // Diagonal wave: a sharp traveling crest plus a slow cross-swell so the
    // pattern never reads as a single repeating stripe.
    const k1 = TAU / 560;
    const k2 = TAU / 900;
    const ca = Math.cos(0.55);
    const sa = Math.sin(0.55);
    const t1 = clock * 0.0011;
    const t2 = clock * 0.0006;

    const springK = Math.min(1, STIFFNESS * f);
    const damp = Math.pow(DAMPING, f);
    let maxMotion = 0;

    for (let i = 0; i < count; i++) {
      const x = x0[i];
      const y = y0[i];
      let hot = 0;
      let tx = 0;
      let ty = 0;

      if (P > 0) {
        const dx = x - px;
        const dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2);
          let s = 1 - d / R;
          s = s * s * (3 - 2 * s) * P;
          hot = s;
          if (d > 0.001) {
            tx += (dx / d) * s * push;
            ty += (dy / d) * s * push;
          }
        }
      }

      for (let j = 0; j < rings.length; j++) {
        const rg = rings[j];
        const dx = x - rg.x;
        const dy = y - rg.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const k = (d - rg.r) / RIPPLE_WIDTH;
        if (k > -3 && k < 3) {
          const c = Math.exp(-k * k) * rg.amp;
          if (c * 0.9 > hot) hot = c * 0.9;
          if (d > 0.001) {
            tx += (dx / d) * c * push * 0.5;
            ty += (dy / d) * c * push * 0.5;
          }
        }
      }

      let wv = 0;
      if (useWave) {
        const s1 = 0.5 + 0.5 * Math.sin((x * ca + y * sa) * k1 - t1);
        const s2 = 0.5 + 0.5 * Math.sin((y - x * 0.5) * k2 + t2);
        wv = s1 * s1 * s1 * s1 * 0.6 + s2 * 0.15;
      }
      const gl = useGlow ? glow[i] : 0;

      // Damped spring toward the target offset. With no force the target
      // is 0, so pushed dots settle back to the grid.
      if (interactive) {
        vx[i] = (vx[i] + (tx - ox[i]) * springK) * damp;
        vy[i] = (vy[i] + (ty - oy[i]) * springK) * damp;
        ox[i] += vx[i] * f;
        oy[i] += vy[i] * f;
        const m = Math.max(
          Math.abs(vx[i]),
          Math.abs(vy[i]),
          Math.abs(tx - ox[i]),
          Math.abs(ty - oy[i]),
        );
        if (m > maxMotion) maxMotion = m;
      } else {
        ox[i] = oy[i] = vx[i] = vy[i] = 0;
      }

      const mix = clamp01(hot * 1.1 + wv * 0.45 + gl * 0.4);
      const alpha =
        edge[i] * clamp01(BASE_ALPHA + hot * 0.75 + wv * 0.45 + gl * 0.3);
      size[i] = baseR * (1 + hot * 1.5 + wv * 0.3 + gl * 0.2);
      const al = Math.round(alpha * ALPHA_LEVELS) - 1;
      bucket[i] =
        al < 0
          ? SKIP
          : Math.round(mix * (COLOR_LEVELS - 1)) * ALPHA_LEVELS + al;
    }
    motion = maxMotion;
  }

  function paint() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Counting sort of dot indices by bucket — O(n), no allocation.
    starts.fill(0);
    for (let i = 0; i < count; i++) starts[bucket[i] + 1]++;
    for (let b = 1; b < starts.length; b++) starts[b] += starts[b - 1];
    for (let i = 0; i < count; i++) order[starts[bucket[i]]++] = i;
    // starts[b] now holds the end of bucket b; bucket b begins at end(b-1).
    let begin = 0;
    for (let b = 0; b < BUCKETS; b++) {
      const end = starts[b];
      if (end > begin) {
        ctx.fillStyle = palette[b];
        ctx.beginPath();
        for (let k = begin; k < end; k++) {
          const i = order[k];
          const x = x0[i] + ox[i];
          const y = y0[i] + oy[i];
          const r = size[i];
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
        ctx.fill();
      }
      begin = end;
    }
  }

  /** True while the next frame would look different from this one. */
  function isAnimating(): boolean {
    if (reduced) return false;
    // waveSpeed 0 holds the wave still, so it alone needs no frames.
    if ((cfg.wave && cfg.waveSpeed > 0) || ripples.length > 0) return true;
    if (Math.abs(strength - (pointerActive ? 1 : 0)) > 0.002) return true;
    return motion > 0.02;
  }

  function frame(now: number) {
    raf = 0;
    // Clamp so a long gap (tab switch, offscreen) doesn't explode springs.
    const dt = last ? Math.min(50, now - last) : 16.67;
    last = now;
    const f = dt / 16.67;
    if (!reduced) {
      clock += dt * Math.max(0, cfg.waveSpeed);
      for (const rp of ripples) rp.age += dt;
      ripples = ripples.filter((rp) => rp.age < RIPPLE_LIFE);
    }
    step(f);
    paint();
    if (visible && isAnimating()) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function kick() {
    if (!raf && visible && width > 0 && height > 0) {
      raf = requestAnimationFrame(frame);
    }
  }

  // The root may sit inside a transform: scale() (e.g. a thumbnail), so
  // client px are mapped back into the root's own layout px.
  function toLocal(e: PointerEvent) {
    const rect = root.getBoundingClientRect();
    const sx = rect.width ? width / rect.width : 1;
    const sy = rect.height ? height / rect.height : 1;
    px = (e.clientX - rect.left) * sx;
    py = (e.clientY - rect.top) * sy;
  }

  function onPointerMove(e: PointerEvent) {
    if (reduced) return;
    toLocal(e);
    pointerActive = true;
    kick();
  }

  function onPointerDown(e: PointerEvent) {
    if (reduced) return;
    toLocal(e);
    pointerActive = true;
    if (cfg.ripple) {
      ripples.push({ x: px, y: py, age: 0 });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    }
    kick();
  }

  function onPointerEnd(e: PointerEvent) {
    // A finger lifting is the end of hover; a mouse button release is not.
    if (e.type === "pointerleave" || e.pointerType !== "mouse") {
      pointerActive = false;
      kick();
    }
  }

  root.addEventListener("pointermove", onPointerMove, { passive: true });
  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointerup", onPointerEnd, { passive: true });
  root.addEventListener("pointercancel", onPointerEnd, { passive: true });
  root.addEventListener("pointerleave", onPointerEnd, { passive: true });

  const ro = new ResizeObserver(() => resize());
  ro.observe(root);

  // Stop the loop entirely while the hero is scrolled away.
  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    });
    io.observe(root);
  }

  const onMotionPref = () => {
    reduced = !!mq?.matches;
    ripples = [];
    step(0);
    paint();
    kick();
  };
  mq?.addEventListener("change", onMotionPref);

  buildPalette();
  resize();

  return {
    setConfig(next) {
      const gridChanged = next.gap !== cfg.gap || next.fade !== cfg.fade;
      const colorsChanged =
        next.color !== cfg.color || next.accentColor !== cfg.accentColor;
      cfg = next;
      if (colorsChanged) buildPalette();
      if (gridChanged) buildGrid();
      if (!cfg.ripple) ripples = [];
      step(0);
      paint();
      kick();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io?.disconnect();
      mq?.removeEventListener("change", onMotionPref);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerEnd);
      root.removeEventListener("pointercancel", onPointerEnd);
      root.removeEventListener("pointerleave", onPointerEnd);
    },
  };
}

/**
 * Interactive dot-matrix backdrop on a 2D canvas. Dots near the pointer
 * grow, brighten toward the accent color and are pushed aside on a spring;
 * an optional slow wave keeps the grid alive without a pointer (first
 * paint, touch), and clicks send out a ripple ring. The loop only runs
 * while the grid is on screen and something is actually moving. Fills its
 * parent; children render on top.
 */
export function DotGridBackground({
  dotSize = DEFAULT_DOT_SIZE,
  gap = DEFAULT_GAP,
  color = DEFAULT_COLOR,
  accentColor = DEFAULT_ACCENT,
  radius = DEFAULT_RADIUS,
  push = DEFAULT_PUSH,
  wave = true,
  waveSpeed = DEFAULT_WAVE_SPEED,
  ripple = true,
  fade = true,
  className,
  children,
}: DotGridBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  const config: Config = {
    dotSize,
    gap,
    color,
    accentColor,
    radius,
    push,
    wave,
    waveSpeed,
    ripple,
    fade,
  };
  // Read by the mount effect so the first paint already uses the props,
  // without making the engine's lifetime depend on them.
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  });

  // The engine is created once per mount; prop changes go through
  // setConfig below instead of tearing the canvas loop down.
  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || typeof ResizeObserver === "undefined") return;
    const engine = createEngine(root, canvas, configRef.current);
    engineRef.current = engine;
    return () => {
      engine?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setConfig({
      dotSize,
      gap,
      color,
      accentColor,
      radius,
      push,
      wave,
      waveSpeed,
      ripple,
      fade,
    });
  }, [
    dotSize,
    gap,
    color,
    accentColor,
    radius,
    push,
    wave,
    waveSpeed,
    ripple,
    fade,
  ]);

  // Only the accent feeds CSS (the soft top glow); the rest lives in the
  // canvas. Inline only when non-default, so the default render is exactly
  // the stylesheet.
  const vars: CSSVars = {};
  if (accentColor !== DEFAULT_ACCENT) vars["--dg-accent"] = accentColor;

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      style={vars}
    >
      <div className={styles.glow} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}

export default DotGridBackground;
