"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Braces, FolderGit2, LayoutGrid, Menu, X } from "lucide-react";
import { registry } from "@/registry";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { GITHUB_URL } from "@/lib/site";

/** Two interlocking rings in the brand gradient, after SocialSmart's mark. */
function LogoMark({ className }: { className?: string }) {
  // Unique per instance: the mobile header's copy is display:none on
  // desktop, and a gradient defined inside a hidden subtree never paints
  // for other <svg>s that reference the same id.
  const gradientId = `anima-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 40 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b366ff" />
          <stop offset="55%" stopColor="#ff6b9d" />
          <stop offset="100%" stopColor="#ff8a65" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#242433" strokeWidth="3.2" />
      <circle cx="26" cy="12" r="8.5" fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.2" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="anima.js ホーム">
      <LogoMark className="h-6 w-10" />
      <span className="text-[17px] font-bold tracking-tight text-[var(--ink)]">
        anima.js
      </span>
    </Link>
  );
}

/** Component links grouped by category, in CATEGORY_ORDER. */
function useGroups() {
  return CATEGORY_ORDER.map((category) => ({
    category,
    entries: registry.filter((entry) => entry.category === category),
  })).filter((group) => group.entries.length > 0);
}

/** Shared nav body for the desktop sidebar and the mobile panel. */
function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = useGroups();

  return (
    <>
      <nav className="flex flex-col gap-1" aria-label="メイン">
        <Link
          href="/"
          className="nav-link"
          data-active={pathname === "/" || undefined}
          aria-current={pathname === "/" ? "page" : undefined}
          onClick={onNavigate}
        >
          <LayoutGrid className="size-4" />
          ギャラリー
          <span className="ml-auto rounded-full bg-[var(--pink-tint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--pilot-pink)]">
            {registry.length}
          </span>
        </Link>
      </nav>

      <nav className="mt-6 flex flex-col gap-5" aria-label="コンポーネント">
        {groups.map(({ category, entries }) => (
          <div key={category}>
            <div className="eyebrow mb-1.5 px-4">{CATEGORY_LABELS[category]}</div>
            <div className="flex flex-col gap-0.5">
              {entries.map((entry) => {
                const href = `/playground/${entry.slug}`;
                const active = pathname === href;
                return (
                  <Link
                    key={entry.slug}
                    href={href}
                    className="nav-link !py-2 text-[13.5px]"
                    data-active={active || undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <span className="truncate">{entry.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="eyebrow mt-8 mb-1.5 px-4">Links</div>
      <div className="flex flex-col gap-0.5">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="nav-link font-semibold !text-[var(--ink)]">
          <FolderGit2 className="size-4" />
          GitHub を見る
        </a>
        <a href="/r/index.json" target="_blank" rel="noreferrer" className="nav-link font-semibold !text-[var(--ink)]">
          <Braces className="size-4" />
          レジストリ JSON
        </a>
      </div>
    </>
  );
}

/** Desktop sidebar (lg and up), sitting directly on the canvas. */
export function SiteSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col overflow-y-auto px-5 py-8 lg:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mb-8 px-2">
        <Logo />
      </div>
      <NavBody />
      <div className="mt-auto px-4 pt-8 text-[11px] font-semibold tracking-wider text-[var(--muted-ink)]">
        RUNNING <span className="text-[var(--ink-2)]">{registry.length} COMPONENTS</span>
      </div>
    </aside>
  );
}

/** Mobile top bar + slide-in menu (below lg, where the sidebar is hidden). */
export function SiteMobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-[var(--border)] bg-white/90 pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="メニューを開く"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </button>
      </div>

      <div className={`fixed inset-0 z-[80] lg:hidden ${open ? "visible" : "invisible"}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={close}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="メニュー"
          className={`absolute top-0 right-0 flex h-full w-[82%] max-w-[320px] flex-col overflow-y-auto overscroll-contain bg-white p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-200 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="mb-6 flex items-center justify-between px-2">
            <Logo />
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="メニューを閉じる"
              onClick={close}
            >
              <X className="size-5" />
            </button>
          </div>
          {open ? <NavBody onNavigate={close} /> : null}
        </div>
      </div>
    </>
  );
}
