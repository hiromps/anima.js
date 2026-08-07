"use client";

import { CopyButton } from "./CopyButton";

type CodePanelProps = {
  code: string;
};

export function CodePanel({ code }: CodePanelProps) {
  return (
    <div className="relative rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          生成コード
        </span>
        <CopyButton getText={() => code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
