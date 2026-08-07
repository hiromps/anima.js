"use client";

import Link from "next/link";
import type { ComponentEntry } from "@/registry/schema";
import { schemaDefaults } from "@/registry/schema";
import { PreviewHost } from "@/components/playground/PreviewHost";
import { TechBadge } from "./TechBadge";

export function GalleryCard({ entry }: { entry: ComponentEntry }) {
  const scale = entry.preview?.scale ?? 1;

  return (
    <Link
      href={`/playground/${entry.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/25"
    >
      {/* Live preview, scaled down and inert — clicks go to the link. */}
      <div
        aria-hidden
        className="pointer-events-none relative h-56 shrink-0 select-none overflow-hidden border-b bg-[radial-gradient(ellipse_at_center,--theme(--color-muted/40%),transparent_70%)]"
        style={{ background: entry.preview?.background }}
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <PreviewHost entry={entry} values={schemaDefaults(entry.schema)} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-mono text-sm font-medium">{entry.name}</h2>
          <div className="flex gap-1.5">
            {entry.tech.map((tag) => (
              <TechBadge key={tag} tag={tag} />
            ))}
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {entry.description}
        </p>
      </div>
    </Link>
  );
}
