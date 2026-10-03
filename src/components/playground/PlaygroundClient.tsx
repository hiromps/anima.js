"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntry } from "@/registry";
import { schemaDefaults } from "@/registry/schema";
import { usePlaygroundStore } from "@/store/playground-store";
import { generateJsx } from "@/lib/codegen";
import { revokeUploads } from "@/lib/uploads";
import { decodeValues, encodeValues } from "@/lib/url-state";
import { PreviewHost } from "./PreviewHost";
import { ControlPanel } from "./ControlPanel";
import { CodePanel } from "./CodePanel";
import { InstallPanel } from "./InstallPanel";
import { PromptPanel } from "./PromptPanel";
import { CopyButton } from "./CopyButton";
import { TechBadge } from "@/components/gallery/TechBadge";
import { CATEGORY_LABELS } from "@/lib/categories";
import { ArrowLeft } from "lucide-react";

export function PlaygroundClient({ slug }: { slug: string }) {
  const entry = getEntry(slug);
  const values = usePlaygroundStore((s) => s.values[slug]);
  const init = usePlaygroundStore((s) => s.init);
  const setValue = usePlaygroundStore((s) => s.setValue);
  const reset = usePlaygroundStore((s) => s.reset);
  // Guards the URL writer until seeding is done, so an incoming shared link
  // is never overwritten by the defaults rendered before it is applied.
  const urlSyncArmed = useRef(false);

  // Seeding order is precedence order: persisted values beat defaults, and
  // a shared URL beats both. Kept in one effect so it can't drift.
  useEffect(() => {
    if (!entry) return;
    void usePlaygroundStore.persist.rehydrate();
    init(slug, schemaDefaults(entry.schema));

    const shared = decodeValues(entry.schema, window.location.search);
    for (const [key, value] of Object.entries(shared)) {
      setValue(slug, key, value);
    }
    // Params have been folded into the store; the writer effect below keeps
    // the URL in sync from here on.
    urlSyncArmed.current = true;
  }, [entry, slug, init, setValue]);

  // Mirrors the live values back into the query string. Debounced so a
  // slider drag doesn't hammer history, and `replaceState` so it doesn't
  // stack up back-button entries.
  useEffect(() => {
    if (!entry || !urlSyncArmed.current || !values) return;
    const timer = setTimeout(() => {
      const query = encodeValues(entry.schema, values);
      const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
      if (next !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(null, "", next);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [entry, values]);

  if (!entry) notFound();

  const liveValues = values ?? schemaDefaults(entry.schema);
  const code = generateJsx(entry, liveValues);

  return (
    <div className="site-card w-full max-w-[1280px] p-3 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2 pt-1 pb-4">
        <Link href="/" className="pill-btn pill-light !px-3.5 !py-2 text-[13px]">
          <ArrowLeft className="size-4" />
          ギャラリー
        </Link>
        <div className="flex min-w-0 flex-col">
          <span className="eyebrow">{CATEGORY_LABELS[entry.category]}</span>
          <h1 className="truncate text-[22px] leading-tight font-bold tracking-tight text-[var(--ink)]">
            {entry.name}
          </h1>
        </div>
        <div className="flex gap-1.5">
          {entry.tech.map((tag) => (
            <TechBadge key={tag} tag={tag} />
          ))}
        </div>
        <div className="ml-auto">
          <CopyButton
            // Built from the live values rather than read off location, so a
            // copy landing inside the writer effect's debounce still gets the
            // settings currently on screen.
            getText={() => {
              const query = encodeValues(entry.schema, liveValues);
              const { origin, pathname } = window.location;
              return `${origin}${pathname}${query ? `?${query}` : ""}`;
            }}
            label="リンクをコピー"
            successMessage="現在の設定を含むリンクをコピーしました"
            variant="outline"
          />
        </div>
        <p className="w-full px-0.5 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
          {entry.description}
        </p>
      </header>

      {/* The page itself scrolls; from md up the control panel is a sticky
          card with its own scroller so it stays beside the preview. */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Previews are designed for a dark page: dark stage inside the
              light card, as SocialSmart does with its video block. */}
          <div
            className="stage min-h-[260px] shrink-0 overflow-hidden rounded-[22px] sm:min-h-[460px]"
            style={entry.preview?.background ? { background: entry.preview.background } : undefined}
          >
            <PreviewHost entry={entry} values={liveValues} />
          </div>
          {/* The AI prompt is the one-step path; install + code are the
              manual two-step path for people driving the CLI themselves. */}
          <PromptPanel entry={entry} code={code} />
          <InstallPanel slug={slug} />
          <CodePanel code={code} />
        </div>

        <aside className="w-full shrink-0 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#fafafa] md:sticky md:top-6 md:h-[calc(100dvh-5rem)] md:w-80">
          <ControlPanel
            schema={entry.schema}
            values={liveValues}
            onChange={(key, value) => setValue(slug, key, value)}
            onReset={() => {
              // Reset drops the uploads value, so its object URLs have to be
              // released here — nothing else references them afterwards.
              for (const [key, def] of Object.entries(entry.schema)) {
                if (def.type === "files") revokeUploads(liveValues[key]);
              }
              reset(slug, schemaDefaults(entry.schema));
            }}
          />
        </aside>
      </div>
    </div>
  );
}
