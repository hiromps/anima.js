import {
  InsidePovCarousel,
  type MediaItem,
} from "../components/inside-pov-carousel";
import { defineEntry, type PropValues } from "../schema";
import { parseUploads } from "@/lib/uploads";

/** Royalty-free demo reels (from the instagramer reference project). */
const DEMO_VIDEO_URLS = [
  "https://framerusercontent.com/assets/Ka4uvsySyV6xRfbADFjOfY05oI.mp4",
  "https://framerusercontent.com/assets/q78mA0acOsIJNj3DlCAkTki1Q.mp4",
  "https://framerusercontent.com/assets/Y34ioXJM4NAksBwI5LTrXKLDQo.mp4",
  "https://framerusercontent.com/assets/I79BMu612Ql6U6ZEnxtGiJb2quA.mp4",
  "https://framerusercontent.com/assets/Vw9JARyCwKwQJrN4yfKL0ERYOwQ.mp4",
  "https://framerusercontent.com/assets/dA5EbUbTb93Di1jHGQgvFX80b8.mp4",
  "https://framerusercontent.com/assets/qVZpsvNejRc1NHMIbM19uhHiks.mp4",
  "https://framerusercontent.com/assets/jRjv2iSDeWi3cvyLlAOqoT0jk.mp4",
  "https://framerusercontent.com/assets/RJU8e0NgjqGcEZV5Z4PuTQjkS8.mp4",
  "https://framerusercontent.com/assets/QxSN4iUsvu5UJqmkep9KzGN3Xw.mp4",
];

function demoItems(count: number): MediaItem[] {
  return Array.from({ length: count }, (_, i) => ({
    src: DEMO_VIDEO_URLS[i % DEMO_VIDEO_URLS.length],
    alt: `demo reel ${i + 1}`,
  }));
}

const schema = {
  media: {
    type: "select",
    label: "Media",
    group: "Media",
    options: ["placeholder", "demo-videos"],
    default: "placeholder",
    description: "Playground-only: what to show on the cards.",
  },
  uploads: {
    type: "files",
    label: "Upload media",
    group: "Media",
    accept: "image/*,video/*",
    default: "",
    description:
      "Your photos/videos become the cards (overrides Media) and are listed as items in the generated code.",
  },
  cardCount: {
    type: "number",
    label: "Card count",
    group: "Media",
    default: 14,
    min: 4,
    max: 20,
    step: 1,
  },
  autoRotate: {
    type: "boolean",
    label: "Auto rotate",
    group: "Motion",
    default: true,
  },
  interactive: {
    type: "boolean",
    label: "Interactive",
    group: "Motion",
    default: true,
    description: "Enable drag, inertia and keyboard control.",
  },
  speed: {
    type: "number",
    label: "Speed",
    group: "Motion",
    default: 0.04,
    min: 0,
    max: 0.3,
    step: 0.005,
    unit: "deg/f",
  },
  dragSensitivity: {
    type: "number",
    label: "Drag sensitivity",
    group: "Motion",
    default: 0.28,
    min: 0.05,
    max: 1,
    step: 0.01,
  },
  friction: {
    type: "number",
    label: "Friction",
    group: "Motion",
    default: 0.94,
    min: 0.8,
    max: 0.99,
    step: 0.005,
    description: "Inertia decay — closer to 1 glides longer.",
  },
  perspective: {
    type: "number",
    label: "Perspective",
    group: "Geometry",
    default: 900,
    min: 400,
    max: 2000,
    step: 10,
    unit: "px",
    description: "Smaller values exaggerate depth.",
  },
  radius: {
    type: "number",
    label: "Radius",
    group: "Geometry",
    default: 850,
    min: 300,
    max: 1600,
    step: 10,
    unit: "px",
  },
  cardWidth: {
    type: "number",
    label: "Card width",
    group: "Geometry",
    default: 340,
    min: 160,
    max: 520,
    step: 5,
    unit: "px",
  },
  cardAspect: {
    type: "number",
    label: "Card aspect",
    group: "Geometry",
    default: 1.7,
    min: 1,
    max: 2.2,
    step: 0.05,
    description: "Card height = width × aspect.",
  },
  tiltX: {
    type: "number",
    label: "Tilt X",
    group: "Geometry",
    default: 0,
    min: -30,
    max: 30,
    step: 1,
    unit: "deg",
  },
  cardRadius: {
    type: "number",
    label: "Corner radius",
    group: "Appearance",
    default: 18,
    min: 0,
    max: 48,
    step: 1,
    unit: "px",
  },
  depthShading: {
    type: "number",
    label: "Depth shading",
    group: "Appearance",
    default: 0.28,
    min: 0,
    max: 0.6,
    step: 0.02,
    description: "Darkens far (center) cards to emphasize depth.",
  },
  showHint: {
    type: "boolean",
    label: "Drag hint",
    group: "Appearance",
    default: true,
  },
} as const;

type Values = Partial<PropValues<typeof schema>>;

/**
 * Playground glue: translates the playground-only `media` and `uploads`
 * knobs into the component's `items` prop. Uploaded media wins over the
 * media select while present.
 */
function InsidePovCarouselPreview({ media, uploads, ...rest }: Values) {
  const count = rest.cardCount ?? 14;
  const uploaded = parseUploads(uploads);
  const items: MediaItem[] | undefined = uploaded.length
    ? uploaded.map(({ src, kind, name }) => ({ src, kind, alt: name }))
    : media === "demo-videos"
      ? demoItems(count)
      : undefined;
  return <InsidePovCarousel {...rest} items={items} />;
}

/** Escapes a file name for use inside a double-quoted JS string. */
function quoteName(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export const insidePovCarouselEntry = defineEntry({
  slug: "inside-pov-carousel",
  name: "InsidePovCarousel",
  description:
    "Inside-POV ring carousel — stand at the center and look outward at cards orbiting you. Pure CSS 3D, drag inertia, depth shading.",
  category: "carousel",
  tech: ["css-3d"],
  host: "dom",
  schema,
  component: InsidePovCarouselPreview,
  codegen: {
    componentName: "InsidePovCarousel",
    importPath: "@/components/inside-pov-carousel",
    dependencies: [],
    skipProps: ["media", "uploads"],
    // Uploaded media is emitted as a real items array. Object URLs die
    // with the session, so file names become public/media/ paths.
    extraProps: (values) => {
      const uploaded = parseUploads(values.uploads);
      if (!uploaded.length) return [];
      const lines = uploaded.map(
        ({ name, kind }) =>
          `  { src: "/media/${quoteName(name)}"${
            kind === "image" ? `, kind: "image"` : ""
          } },`,
      );
      return [`items={[\n${lines.join("\n")}\n]}`];
    },
    extraTodos: (values) =>
      parseUploads(values.uploads).length
        ? ["copy the uploaded files into public/media/ so the src paths resolve"]
        : [],
  },
  preview: {
    scale: 0.42,
  },
});
