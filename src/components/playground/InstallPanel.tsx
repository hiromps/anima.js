"use client";

import { installCommand } from "@/lib/site";
import { CopyButton } from "./CopyButton";

/**
 * The one command a visitor needs to pull this component into their own
 * project. Deliberately sits above the generated JSX: install first, then
 * paste the usage snippet.
 */
export function InstallPanel({ slug }: { slug: string }) {
  const command = installCommand(slug);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          インストール
        </span>
        <CopyButton
          getText={() => command}
          label="コマンドをコピー"
          successMessage="インストールコマンドをコピーしました"
        />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground/90">
        <code>{command}</code>
      </pre>
    </div>
  );
}
