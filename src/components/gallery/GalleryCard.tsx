"use client";

import Link from "next/link";
import type { ComponentEntry } from "@/registry/schema";
import { schemaDefaults } from "@/registry/schema";
import { generateJsx } from "@/lib/codegen";
import { generateAiPrompt } from "@/lib/prompt";
import { PreviewHost } from "@/components/playground/PreviewHost";
import { CopyButton } from "@/components/playground/CopyButton";
import { TechBadge } from "./TechBadge";

export function GalleryCard({ entry }: { entry: ComponentEntry }) {
  const scale = entry.preview?.scale ?? 1;
  const defaults = schemaDefaults(entry.schema);

  return (
    // The card is not itself a link: previews may contain links of their own
    // (the tab bar does), and an <a> inside an <a> is invalid HTML that
    // fails hydration. An overlay link covers the whole card instead.
    <div className="group relative isolate flex flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--soft-shadow)] focus-within:shadow-[var(--soft-shadow)]">
      <Link
        href={`/playground/${entry.slug}`}
        aria-label={`${entry.name} のプレイグラウンドを開く`}
        className="absolute inset-0 z-10 rounded-[24px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {/* Live preview, scaled down and inert — clicks go to the overlay link.
          Previews are designed for a dark page, so they sit on the dark
          stage even though the site itself is light. */}
      <div
        aria-hidden
        className="stage pointer-events-none relative h-56 shrink-0 select-none overflow-hidden rounded-[18px]"
        style={entry.preview?.background ? { background: entry.preview.background } : undefined}
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <PreviewHost entry={entry} values={defaults} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[17px] font-bold tracking-tight text-[var(--ink)]">
            {entry.name}
          </h2>
          <div className="flex gap-1.5">
            {entry.tech.map((tag) => (
              <TechBadge key={tag} tag={tag} />
            ))}
          </div>
        </div>
        <p className="line-clamp-2 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
          {entry.description}
        </p>
        {/* Sits above the overlay link so it is clickable on its own: the
            default-settings prompt is enough to install the component as
            shown, without opening the playground. */}
        <div className="relative z-20 mt-auto flex items-center justify-between gap-2 pt-2 max-[480px]:justify-end">
          {/* Dropped on phone-width cards, where it wrapped to three lines
              beside the button; the button label says enough on its own. */}
          <span className="text-xs text-[var(--muted-ink)] max-[480px]:hidden">
            既定の設定のまま導入する
          </span>
          <CopyButton
            getText={() => generateAiPrompt(entry, generateJsx(entry, defaults))}
            label="AI プロンプトをコピー"
            successMessage={`${entry.name} の AI 用プロンプトをコピーしました`}
          />
        </div>
      </div>
    </div>
  );
}
