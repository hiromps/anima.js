import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "anima.js — Interactive 3D animation components for React";

/**
 * Text here is Latin-only on purpose: ImageResponse (satori) only renders
 * glyphs from fonts it is explicitly given and has no Japanese fallback, so
 * Japanese copy would come out as tofu boxes without embedding a JP subset.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 50% 42%, #2a1f4d 0%, #0a0a0a 62%)",
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: -3,
            color: "#fafafa",
          }}
        >
          anima.js
        </div>
        <div style={{ fontSize: 36, color: "#a1a1aa" }}>
          Interactive 3D animation components for React
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 26,
            color: "#8b5cf6",
            padding: "12px 28px",
            border: "2px solid #8b5cf6",
            borderRadius: 12,
          }}
        >
          npx shadcn@latest add …
        </div>
      </div>
    ),
    size,
  );
}
