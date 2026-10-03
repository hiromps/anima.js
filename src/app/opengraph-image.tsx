import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "anima.js — Interactive UI components for React";

/**
 * Text here is Latin-only on purpose: ImageResponse (satori) only renders
 * glyphs from fonts it is explicitly given and has no Japanese fallback, so
 * Japanese copy would come out as tofu boxes without embedding a JP subset.
 */
export default function Image() {
  return new ImageResponse(
    (
      // SocialSmart-style card-on-canvas: a white card on the light grey
      // canvas, two-ring mark and the purple → pink → orange gradient.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          padding: 48,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 26,
            padding: "0 80px",
            background: "#ffffff",
            borderRadius: 40,
            border: "2px solid #e5e7eb",
            boxShadow: "0 18px 50px rgba(40,40,60,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", position: "relative", width: 96, height: 60 }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 60,
                  height: 60,
                  borderRadius: 9999,
                  border: "8px solid #242433",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 36,
                  top: 0,
                  width: 60,
                  height: 60,
                  borderRadius: 9999,
                  border: "8px solid #ff6b9d",
                }}
              />
            </div>
            <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -3, color: "#242433" }}>
              anima.js
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#9ca3af" }}>
            Interactive UI components for React,{" "}
            <span
              style={{
                marginLeft: 12,
                backgroundImage: "linear-gradient(135deg, #b366ff 0%, #ff6b9d 48%, #ff8a65 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              ready to paste.
            </span>
          </div>
          <div style={{ display: "flex" }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: "#ffffff",
                padding: "14px 30px",
                borderRadius: 9999,
                backgroundImage: "linear-gradient(135deg, #b366ff 0%, #ff6b9d 48%, #ff8a65 100%)",
              }}
            >
              npx shadcn@latest add …
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
