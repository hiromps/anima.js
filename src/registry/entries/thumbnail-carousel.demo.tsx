"use client";

import { useId } from "react";
import {
  ThumbnailCarousel,
  type ThumbnailCarouselItem,
  type ThumbnailCarouselProps,
} from "../components/thumbnail-carousel";
import {
  COLORWAYS,
  DEMO_SHOTS,
  type Colorway,
  type DemoShot,
  type ShotView,
} from "./thumbnail-carousel.demo-data";

/** Playground-facing props: every knob passes straight through. */
export type ThumbnailCarouselPreviewProps = Omit<
  ThumbnailCarouselProps,
  "items" | "renderItem" | "renderThumb"
>;

const SHOT_BY_ID = new Map<string, DemoShot>(DEMO_SHOTS.map((shot) => [shot.id, shot]));

/**
 * Stylised studio render of the headphone from one of four angles. Each
 * instance namespaces its gradient / pattern ids with useId — six shots plus
 * six thumbs share one document, and a duplicated id would paint every copy
 * with the first colorway.
 */
function HeadphoneArt({ view, c }: { view: ShotView; c: Colorway }) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={id("shell")} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={c.shellLight} />
          <stop offset="0.45" stopColor={c.shell} />
          <stop offset="1" stopColor={c.shellDark} />
        </linearGradient>
        <linearGradient id={id("band")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.shellLight} />
          <stop offset="1" stopColor={c.shellDark} />
        </linearGradient>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a8a94" />
          <stop offset="0.5" stopColor="#ececf1" />
          <stop offset="1" stopColor="#6b6b75" />
        </linearGradient>
        <radialGradient id={id("plate")} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor={c.shell} />
          <stop offset="1" stopColor={c.shellDark} />
        </radialGradient>
        <radialGradient id={id("sheen")} cx="0.3" cy="0.2" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <pattern id={id("mesh")} width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill={c.cushion} />
          <circle cx="4.5" cy="4.5" r="1.6" fill="#fff" fillOpacity="0.16" />
        </pattern>
        <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={id("glow")} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {view === "front" && (
        <g>
          <ellipse cx="200" cy="276" rx="118" ry="9" fill="#000" opacity="0.5" filter={url("soft")} />
          {/* Headband with its inner cushion */}
          <path d="M116 186 C116 62 284 62 284 186" fill="none" stroke={url("band")} strokeWidth="18" strokeLinecap="round" />
          <path d="M128 160 C134 90 266 90 272 160" fill="none" stroke={c.cushion} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
          <path d="M124 120 C140 84 170 74 196 72" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />
          {/* Sliders */}
          <rect x="110" y="168" width="12" height="38" rx="6" fill={url("metal")} />
          <rect x="278" y="168" width="12" height="38" rx="6" fill={url("metal")} />
          {/* Cups, seen edge-on */}
          <rect x="84" y="192" width="64" height="82" rx="28" fill={url("shell")} />
          <rect x="252" y="192" width="64" height="82" rx="28" fill={url("shell")} />
          <rect x="138" y="200" width="12" height="66" rx="6" fill={c.cushion} />
          <rect x="250" y="200" width="12" height="66" rx="6" fill={c.cushion} />
          <rect x="94" y="200" width="9" height="56" rx="4.5" fill="#fff" opacity="0.2" />
          <rect x="262" y="200" width="9" height="56" rx="4.5" fill="#fff" opacity="0.2" />
          {/* Status LED */}
          <circle cx="300" cy="250" r="5" fill={c.accent} filter={url("glow")} />
          <circle cx="300" cy="250" r="2.2" fill={c.accent} />
        </g>
      )}

      {view === "angle" && (
        <g transform="rotate(-9 200 170)">
          <ellipse cx="205" cy="280" rx="120" ry="9" fill="#000" opacity="0.5" filter={url("soft")} />
          <path d="M132 190 C118 70 268 52 296 170" fill="none" stroke={url("band")} strokeWidth="17" strokeLinecap="round" />
          <path d="M142 168 C138 94 254 80 282 158" fill="none" stroke={c.cushion} strokeWidth="7" strokeLinecap="round" opacity="0.9" />
          <rect x="289" y="160" width="11" height="32" rx="5.5" fill={url("metal")} />
          {/* Far cup, smaller and darker */}
          <rect x="268" y="184" width="50" height="72" rx="24" fill={c.shellDark} />
          <rect x="266" y="192" width="10" height="56" rx="5" fill={c.cushion} />
          <rect x="126" y="172" width="12" height="36" rx="6" fill={url("metal")} />
          {/* Near cup, turned toward the camera */}
          <ellipse cx="146" cy="232" rx="44" ry="58" fill={c.cushion} />
          <ellipse cx="132" cy="230" rx="50" ry="62" fill={url("shell")} />
          <ellipse cx="132" cy="230" rx="37" ry="47" fill={url("plate")} />
          <circle cx="132" cy="230" r="15" fill="none" stroke={c.accent} strokeWidth="2.5" opacity="0.9" />
          <circle cx="132" cy="230" r="3" fill={c.accent} />
          <ellipse cx="132" cy="230" rx="50" ry="62" fill={url("sheen")} />
        </g>
      )}

      {view === "side" && (
        <g>
          <ellipse cx="200" cy="282" rx="96" ry="9" fill="#000" opacity="0.5" filter={url("soft")} />
          <path d="M166 128 C166 36 234 36 234 128" fill="none" stroke={url("band")} strokeWidth="24" strokeLinecap="round" />
          <path d="M176 70 C190 50 210 48 222 56" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
          <rect x="192" y="104" width="16" height="44" rx="8" fill={url("metal")} />
          {/* Cushion peeking out behind the cup */}
          <ellipse cx="188" cy="196" rx="74" ry="84" fill={c.cushion} />
          <ellipse cx="200" cy="196" rx="74" ry="84" fill={url("shell")} />
          <ellipse cx="200" cy="196" rx="57" ry="66" fill={url("plate")} />
          <ellipse cx="200" cy="196" rx="57" ry="66" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="1.5" />
          <circle cx="200" cy="196" r="22" fill="none" stroke={c.accent} strokeWidth="3" opacity="0.9" />
          <circle cx="200" cy="196" r="22" fill="none" stroke={c.accent} strokeWidth="6" opacity="0.35" filter={url("glow")} />
          <circle cx="200" cy="196" r="4" fill={c.accent} />
          <ellipse cx="200" cy="196" rx="74" ry="84" fill={url("sheen")} />
        </g>
      )}

      {view === "detail" && (
        <g>
          {/* Macro: cushion ring, stitching and the speaker mesh */}
          <circle cx="238" cy="168" r="196" fill={url("shell")} />
          <circle cx="238" cy="168" r="160" fill={c.cushion} />
          <circle cx="238" cy="168" r="148" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="5 6" />
          <circle cx="238" cy="168" r="122" fill={url("mesh")} />
          <circle cx="238" cy="168" r="122" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="6" />
          <circle cx="238" cy="168" r="34" fill="none" stroke={c.accent} strokeWidth="4" opacity="0.9" />
          <circle cx="238" cy="168" r="34" fill="none" stroke={c.accent} strokeWidth="9" opacity="0.3" filter={url("glow")} />
          <circle cx="238" cy="168" r="196" fill={url("sheen")} />
        </g>
      )}
    </svg>
  );
}

/** Backdrop + art; used for both the stage and the thumbnails. */
function ProductShot({ item }: { item: ThumbnailCarouselItem }) {
  const shot = item.id ? SHOT_BY_ID.get(item.id) : undefined;
  return (
    <div className="absolute inset-0" style={{ background: item.image }}>
      {shot && <HeadphoneArt view={shot.view} c={COLORWAYS[shot.colorway]} />}
    </div>
  );
}

const renderShot = (item: ThumbnailCarouselItem) => <ProductShot item={item} />;

/**
 * Playground glue: the six Halo One shots on a dark stage. Lives in its own
 * "use client" module: the entry is also evaluated by server code
 * (generateStaticParams, sitemap), which may not import hooks.
 */
export function ThumbnailCarouselPreview(props: ThumbnailCarouselPreviewProps) {
  const left = props.thumbPosition === "left";
  return (
    <div className="relative flex h-[560px] items-center justify-center overflow-hidden bg-[#0a0a0a] px-6 py-4">
      {/* Faint stage light and a violet bloom behind the viewer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,.06),transparent_70%),radial-gradient(45%_40%_at_50%_45%,rgba(139,92,246,.14),transparent_70%)]"
      />
      <ThumbnailCarousel
        {...props}
        items={DEMO_SHOTS}
        renderItem={renderShot}
        renderThumb={renderShot}
        aria-label="Halo One の商品画像"
        className={`relative ${left ? "max-w-[660px]" : "max-w-[520px]"}`}
      />
    </div>
  );
}
