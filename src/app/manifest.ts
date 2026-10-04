import type { MetadataRoute } from "next";

/** Web app manifest — makes the site installable as a standalone app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "anima.js — インタラクティブ コンポーネントライブラリ",
    short_name: "anima.js",
    description:
      "動く UI コンポーネントを、調整して、AI に貼って、すぐ使える React コンポーネント集。",
    lang: "ja",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    // Matches the light canvas so the splash screen and title bar blend in.
    background_color: "#f5f5f5",
    theme_color: "#f5f5f5",
    categories: ["developer", "design", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "ギャラリー",
        short_name: "ギャラリー",
        url: "/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "カルーセル",
        short_name: "カルーセル",
        url: "/playground/inside-pov-carousel",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
