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
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          ギャラリー
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <h1 className="font-mono text-sm font-medium">{entry.name}</h1>
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
            variant="ghost"
          />
        </div>
      </header>

      {/* Below md everything stacks into one scroller — nesting a second
          scroller inside a phone viewport makes both feel broken. From md up
          the preview and the control panel scroll independently. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:overflow-y-auto">
          <div
            className="min-h-[260px] shrink-0 overflow-hidden rounded-lg border bg-[radial-gradient(ellipse_at_center,--theme(--color-muted/40%),transparent_70%)] sm:min-h-[420px]"
            style={{ background: entry.preview?.background }}
          >
            <PreviewHost entry={entry} values={liveValues} />
          </div>
          <InstallPanel slug={slug} />
          <CodePanel code={code} />
          <PromptPanel entry={entry} code={code} />
        </main>

        <aside className="w-full shrink-0 border-t pb-[env(safe-area-inset-bottom)] md:w-80 md:border-t-0 md:border-l md:pb-0">
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
