"use client";

import { registry } from "@/registry";
import { GalleryCard } from "./GalleryCard";

/**
 * Client boundary for the gallery: registry entries hold component
 * references, so they must be imported here rather than passed down
 * from a server component.
 */
export function GalleryGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {registry.map((entry) => (
        <GalleryCard key={entry.slug} entry={entry} />
      ))}
    </div>
  );
}
