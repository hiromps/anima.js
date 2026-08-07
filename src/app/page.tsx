import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { siteUrl } from "@/lib/site";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <header className="mb-12 flex flex-col gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          anima.js
        </h1>
        <p className="max-w-xl text-muted-foreground">
          React
          向けのインタラクティブな3Dアニメーションコンポーネント集。コンポーネントを選び、その場で調整して、コードをコピーできます。
        </p>
        <p className="text-sm text-muted-foreground">
          shadcn CLI の1コマンドで導入できます —{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">
            npx shadcn@latest add {siteUrl}/r/&lt;slug&gt;.json
          </code>
        </p>
      </header>
      <GalleryGrid />
    </div>
  );
}
