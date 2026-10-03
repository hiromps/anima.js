"use client";

import { useState } from "react";
import { registry } from "@/registry";
import type { ComponentCategory } from "@/registry/schema";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { GalleryCard } from "./GalleryCard";

type Filter = "all" | ComponentCategory;

/**
 * Client boundary for the gallery: registry entries hold component
 * references, so they must be imported here rather than passed down
 * from a server component. Category pills filter the grid in place.
 */
export function GalleryGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const categories = CATEGORY_ORDER.filter((category) =>
    registry.some((entry) => entry.category === category),
  );
  const entries =
    filter === "all"
      ? registry
      : registry.filter((entry) => entry.category === filter);

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "すべて", count: registry.length },
    ...categories.map((category) => ({
      value: category,
      label: CATEGORY_LABELS[category],
      count: registry.filter((entry) => entry.category === category).length,
    })),
  ];

  return (
    <>
      <div
        // One swipeable row on phones (wrapping took five rows), wrapping
        // pills from sm up.
        className="-mx-5 mb-8 flex gap-1.5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="カテゴリで絞り込む"
      >
        {tabs.map((tab) => {
          const active = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(tab.value)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-white text-[var(--ink)] shadow-[var(--float-shadow)]"
                  : "text-[var(--ink-2)] hover:bg-[var(--muted)]"
              }`}
            >
              {tab.label}
              <span
                className={`text-[11px] ${active ? "text-[var(--pilot-pink)]" : "text-[var(--muted-ink)]"}`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {entries.map((entry) => (
          <GalleryCard key={entry.slug} entry={entry} />
        ))}
      </div>
    </>
  );
}
