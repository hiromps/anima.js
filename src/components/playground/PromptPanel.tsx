"use client";

import { Sparkles } from "lucide-react";
import type { ComponentEntry } from "@/registry/schema";
import { generateAiPrompt } from "@/lib/prompt";
import { CopyButton } from "./CopyButton";

type PromptPanelProps = {
  entry: ComponentEntry;
  code: string;
};

/**
 * The primary way in: one copy, pasted into an AI coding assistant, adds
 * the component to the visitor's project. The prompt carries the shipped
 * source files verbatim, so it works without the shadcn CLI or network
 * access on the assistant's side. The install and code panels below are the
 * manual alternative.
 */
export function PromptPanel({ entry, code }: PromptPanelProps) {
  const prompt = generateAiPrompt(entry, code);
  const sizeKb = Math.round(new TextEncoder().encode(prompt).length / 1024);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="size-4" />
            AI に貼るだけで導入
          </span>
          <span className="text-xs text-muted-foreground">
            Claude Code / Cursor / ChatGPT などにそのまま貼り付けてください。ソースコード一式と現在の設定、組み込み手順が含まれています（約
            {sizeKb} KB）。
          </span>
        </div>
        <CopyButton
          getText={() => prompt}
          label="AI プロンプトをコピー"
          successMessage="AI 用プロンプトをコピーしました。AI コーディングツールに貼り付けてください"
          variant="default"
        />
      </div>
      {/* Prose, not a single code block — wrap instead of horizontal-scrolling
          like CodePanel/InstallPanel, since a long unwrapped Japanese
          paragraph would be unreadable on a phone-width panel. Capped in
          height: with the sources embedded the prompt runs to hundreds of
          lines, and the copy button, not scrolling, is the way to use it. */}
      <pre className="max-h-72 overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
        <code>{prompt}</code>
      </pre>
    </div>
  );
}
