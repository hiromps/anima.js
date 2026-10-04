import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { ReloadButton } from "@/components/site/ReloadButton";

export const metadata: Metadata = {
  title: "オフライン",
  robots: { index: false },
};

/**
 * Precached by the service worker (public/sw.js) and served when a page
 * isn't reachable and hasn't been visited before.
 */
export default function OfflinePage() {
  return (
    <div className="site-card flex w-full max-w-[1120px] flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-[var(--pink-border)] bg-[var(--pink-tint)] text-[var(--pilot-pink)]">
        <WifiOff className="size-6" />
      </span>
      <h1 className="text-[28px] font-bold tracking-tight text-[var(--ink)]">
        オフラインです
      </h1>
      <p className="max-w-md text-[var(--muted-foreground)]">
        インターネットに接続されていません。一度開いたページは、オフラインでもそのまま表示できます。
      </p>
      <ReloadButton />
    </div>
  );
}
