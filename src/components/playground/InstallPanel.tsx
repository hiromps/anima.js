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
    <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-2.5">
        <span className="eyebrow">
          インストール
        </span>
        <CopyButton
          getText={() => command}
          label="コマンドをコピー"
          successMessage="インストールコマンドをコピーしました"
        />
      </div>
      <pre className="code-surface overflow-x-auto p-5 font-mono text-xs leading-relaxed">
        <code>{command}</code>
      </pre>
    </div>
  );
}
