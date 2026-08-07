import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "anima.js — インタラクティブ コンポーネントライブラリ";
const description =
  "React 向けのインタラクティブな3Dアニメーションコンポーネントを、閲覧・調整・コピーできます。shadcn CLI の1コマンドで導入できます。";

export const metadata: Metadata = {
  // Required for OG/twitter image URLs to resolve to absolute URLs.
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s — anima.js" },
  description,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "anima.js",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Without viewport-fit=cover every env(safe-area-inset-*) resolves to 0.
  viewportFit: "cover",
  // Keeps the dvh-sized shell correct when the on-screen keyboard opens.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
