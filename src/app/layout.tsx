import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SiteMobileNav, SiteSidebar } from "@/components/site/SiteNav";
import { ServiceWorkerRegister } from "@/components/site/ServiceWorkerRegister";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Satoshi (Fontshare stylesheet in <head> below) has no Japanese glyphs;
// Noto Sans JP is chained after it in globals.css so Latin keeps Satoshi's
// metrics while Japanese falls back consistently across browsers.
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  preload: false,
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
  applicationName: "anima.js",
  // iOS "Add to Home Screen": launch full screen with the light status bar.
  appleWebApp: {
    capable: true,
    title: "anima.js",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Without viewport-fit=cover every env(safe-area-inset-*) resolves to 0.
  viewportFit: "cover",
  // Keeps the dvh-sized shell correct when the on-screen keyboard opens.
  interactiveWidget: "resizes-content",
  // Browser chrome / PWA title bar blends into the light canvas.
  themeColor: "#f5f5f5",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap"
        />
      </head>
      <body className="min-h-full">
        <SiteMobileNav />
        {/* Card-on-canvas: the sidebar sits directly on the grey canvas and
            each page renders its own white card in <main>. */}
        <div className="flex w-full">
          <SiteSidebar />
          <main className="flex min-h-dvh min-w-0 flex-1 justify-center px-[max(0.75rem,env(safe-area-inset-left))] pt-[calc(4.25rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-6">
            {children}
          </main>
        </div>
        <Toaster position="bottom-right" theme="light" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
