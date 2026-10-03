import { ArrowDown, FolderGit2, Sparkles } from "lucide-react";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GITHUB_URL, siteUrl } from "@/lib/site";

export default function Home() {
  return (
    <div className="site-card w-full max-w-[1120px] p-5 sm:p-10 lg:p-14">
      <header className="flex flex-col items-start gap-6">
        <span className="rounded-full border border-[var(--pink-border)] bg-[var(--pink-tint)] px-3.5 py-1.5 text-xs font-semibold text-[var(--pilot-pink)]">
          AI プロンプト 1 枚で導入できる React コンポーネント集
        </span>
        {/* Two-tone headline: strong clauses in ink, connective ones muted,
            one phrase in the brand gradient. */}
        <h1 className="max-w-3xl text-[32px] leading-[1.18] font-bold tracking-tight text-[var(--ink)] sm:text-[48px]">
          動く UI を、コピペで。
          <span className="text-[var(--muted-ink)]">
            調整して、AI に貼って、
          </span>
          <span className="gradient-text">すぐ使える</span>
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--ink-2)]">
          使いたいコンポーネントの
          <span className="highlight">「AI プロンプトをコピー」</span>
          を押して、Claude Code や Cursor などの AI
          コーディングツールに貼るだけ。プレイグラウンドで調整した値も、そのままプロンプトに反映されます。
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="#gallery" className="pill-btn pill-gradient">
            <Sparkles className="size-4" />
            コンポーネントを見る
            <ArrowDown className="size-4" />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="pill-btn pill-light"
          >
            <FolderGit2 className="size-4" />
            GitHub を見る
          </a>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)]">
          手動で入れる場合は shadcn CLI の 1 コマンドでも —{" "}
          <code className="code-surface rounded-full px-2.5 py-1 font-mono text-[12px] break-all">
            npx shadcn@latest add {siteUrl}/r/&lt;slug&gt;.json
          </code>
        </p>
      </header>

      <section id="gallery" className="mt-14 scroll-mt-24">
        <GalleryGrid />
      </section>
    </div>
  );
}
