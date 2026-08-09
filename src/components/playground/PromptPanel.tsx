"use client";

import type { ComponentEntry } from "@/registry/schema";
import { generateAiPrompt } from "@/lib/prompt";
import { CopyButton } from "./CopyButton";

type PromptPanelProps = {
  entry: ComponentEntry;
  code: string;
};

export function PromptPanel({ entry, code }: PromptPanelProps) {
  const prompt = generateAiPrompt(entry, code);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          AI プロンプト
        </span>
        <CopyButton
          getText={() => prompt}
          label="プロンプトをコピー"
          successMessage="AI 用プロンプトをコピーしました"
        />
      </div>
      {/* Prose, not a single code block — wrap instead of horizontal-scrolling
          like CodePanel/InstallPanel, since a long unwrapped Japanese
          paragraph would be unreadable on a phone-width panel. */}
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
        <code>{prompt}</code>
      </pre>
    </div>
  );
}
