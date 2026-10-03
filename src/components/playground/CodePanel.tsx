"use client";

import { CopyButton } from "./CopyButton";

type CodePanelProps = {
  code: string;
};

export function CodePanel({ code }: CodePanelProps) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-2.5">
        <span className="eyebrow">
          生成コード
        </span>
        <CopyButton getText={() => code} />
      </div>
      <pre className="code-surface overflow-x-auto p-5 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
