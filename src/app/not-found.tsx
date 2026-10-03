import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="site-card flex w-full max-w-[1120px] flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <span className="rounded-full border border-[var(--pink-border)] bg-[var(--pink-tint)] px-3.5 py-1 text-xs font-semibold text-[var(--pilot-pink)]">
        404
      </span>
      <h1 className="text-[28px] font-bold tracking-tight text-[var(--ink)]">
        ページが見つかりませんでした
      </h1>
      <p className="max-w-md text-muted-foreground">
        URL が変更されたか、コンポーネントが削除された可能性があります。
      </p>
      <Link
        href="/"
        className="pill-btn pill-gradient mt-2"
      >
        <ArrowLeft className="size-4" />
        ギャラリーへ戻る
      </Link>
    </div>
  );
}
