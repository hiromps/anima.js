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
          向けのインタラクティブな3Dアニメーションコンポーネント集。使いたいコンポーネントの「AI
          プロンプトをコピー」を押して、Claude Code や Cursor
          などの AI コーディングツールに貼るだけで、自分のプロジェクトに導入できます。
        </p>
        <p className="text-sm text-muted-foreground">
          プレイグラウンドで値を調整すると、その設定がプロンプトに反映されます。手動で入れる場合は
          shadcn CLI の1コマンドでも —{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">
            npx shadcn@latest add {siteUrl}/r/&lt;slug&gt;.json
          </code>
        </p>
      </header>
      <GalleryGrid />
    </div>
  );
}
