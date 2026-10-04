/**
 * generate-icons.mjs — renders every favicon / PWA icon from one master
 * mark, so the browser tab, home-screen icon and install prompt can never
 * drift apart.
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs (committed; re-run after changing the mark):
 *   src/app/apple-icon.png          180×180, full-bleed (iOS adds its own mask)
 *   src/app/favicon.ico             16/32/48 multi-size, for legacy browsers
 *   public/icons/icon-192.png       manifest "any"
 *   public/icons/icon-512.png       manifest "any"
 *   public/icons/maskable-192.png   manifest "maskable" (mark inside the safe zone)
 *   public/icons/maskable-512.png
 *
 * src/app/icon.svg is the master itself and doubles as the modern SVG
 * favicon. PNGs are rendered with sharp (bundled with Next); the .ico is
 * packed by Pillow because sharp cannot write ICO.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ICONS_DIR = path.join(ROOT, "public", "icons");
const APP_DIR = path.join(ROOT, "src", "app");

const GRADIENT = `
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#b366ff"/>
    <stop offset="0.55" stop-color="#ff6b9d"/>
    <stop offset="1" stop-color="#ff8a65"/>
  </linearGradient>`;

/**
 * The two-ring mark on a square tile. `scale` shrinks the rings around the
 * centre: maskable icons must keep their content inside the central 80%
 * circle, and iOS / Android crop the corners themselves, so those variants
 * are full-bleed (no rounded corners) with smaller rings.
 */
function tile({ rounded, scale }) {
  const s = scale;
  const r = 12.5 * s;
  const w = 5.5 * s;
  const dx = 9 * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>${GRADIENT}</defs>
  <rect width="64" height="64" rx="${rounded ? 15 : 0}" fill="#ffffff"/>
  <circle cx="${32 - dx}" cy="32" r="${r}" fill="none" stroke="#242433" stroke-width="${w}"/>
  <circle cx="${32 + dx}" cy="32" r="${r}" fill="none" stroke="url(#ring)" stroke-width="${w}"/>
</svg>`;
}

async function render(svg, size, out) {
  await sharp(Buffer.from(svg), { density: 72 * (size / 64) * 2 })
    .resize(size, size)
    .png()
    .toFile(out);
  console.log(`icons: wrote ${path.relative(ROOT, out)}`);
}

fs.mkdirSync(ICONS_DIR, { recursive: true });

const any = tile({ rounded: true, scale: 1 });
const fullBleed = tile({ rounded: false, scale: 1 });
const maskable = tile({ rounded: false, scale: 0.78 });

await render(any, 192, path.join(ICONS_DIR, "icon-192.png"));
await render(any, 512, path.join(ICONS_DIR, "icon-512.png"));
await render(maskable, 192, path.join(ICONS_DIR, "maskable-192.png"));
await render(maskable, 512, path.join(ICONS_DIR, "maskable-512.png"));
await render(fullBleed, 180, path.join(APP_DIR, "apple-icon.png"));

// favicon.ico: render a large PNG once and let Pillow downsample into the
// standard 16/32/48 frames.
const tmp = path.join(ICONS_DIR, ".favicon-src.png");
await render(any, 256, tmp);
const ico = path.join(APP_DIR, "favicon.ico");
execFileSync("python", [
  "-c",
  "import sys; from PIL import Image; Image.open(sys.argv[1]).save(sys.argv[2], sizes=[(16,16),(32,32),(48,48)])",
  tmp,
  ico,
]);
fs.rmSync(tmp);
console.log(`icons: wrote ${path.relative(ROOT, ico)}`);
