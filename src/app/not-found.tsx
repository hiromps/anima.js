import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        ページが見つかりませんでした
      </h1>
      <p className="max-w-md text-muted-foreground">
        URL が変更されたか、コンポーネントが削除された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        ギャラリーへ戻る
      </Link>
    </div>
  );
}
