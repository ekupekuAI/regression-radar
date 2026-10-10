"use client";

import React, { useEffect, useRef, useState } from "react";
import { Database, Loader2, Sparkles } from "lucide-react";

export interface LearnedLibraryEvent {
  slug: string;
  label: string;
  repo: string;
  learned: number;
  open?: number;
  closed?: number;
  timestamp: number;
}

export interface MemoryLibraryItem {
  slug: string;
  label: string;
  repo?: string;
  reportsCount?: number;
  openCount?: number;
  closedCount?: number;
  learnedAtText?: string;
  isSnapshot?: boolean;
}

const DEFAULT_SNAPSHOT_LIBRARY: MemoryLibraryItem = {
  slug: "nextjs-prisma",
  label: "Next.js 14.1 to 14.2 + Prisma",
  repo: "vercel/next.js & prisma/prisma",
  reportsCount: 98,
  isSnapshot: true,
};

interface LibrariesInMemoryProps {
  lastLearnedLibrary?: LearnedLibraryEvent | null;
}

export function LibrariesInMemory({ lastLearnedLibrary = null }: LibrariesInMemoryProps) {
  const [libraries, setLibraries] = useState<MemoryLibraryItem[]>([DEFAULT_SNAPSHOT_LIBRARY]);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Clean up timers on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, []);

  // Initial fetch of available stacks from GET /api/learn-stack
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchStacks() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/learn-stack", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isMounted) return;

        if (Array.isArray(data?.stacks)) {
          setLibraries((prev) => {
            const first = prev[0] ?? DEFAULT_SNAPSHOT_LIBRARY;
            const existingMap = new Map<string, MemoryLibraryItem>();
            for (const item of prev.slice(1)) {
              existingMap.set(item.slug || item.repo || item.label, item);
            }

            const merged: MemoryLibraryItem[] = data.stacks.map((s: { slug?: string; label?: string; repo?: string }) => {
              const key = s.slug || s.repo || s.label || "";
              const existing = existingMap.get(key);
              existingMap.delete(key);
              return {
                slug: s.slug || key,
                label: s.label || s.slug || key,
                repo: s.repo,
                reportsCount: existing?.reportsCount,
                openCount: existing?.openCount,
                closedCount: existing?.closedCount,
                learnedAtText: existing?.learnedAtText,
              };
            });

            const custom = Array.from(existingMap.values());
            return [first, ...merged, ...custom];
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        // Gracefully keep the committed snapshot entry if the API request fails
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchStacks();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Update or insert when a library is newly learned via POST /api/learn-stack
  useEffect(() => {
    if (!lastLearnedLibrary) return;

    setLibraries((prev) => {
      const first = prev[0] ?? DEFAULT_SNAPSHOT_LIBRARY;
      const rest = prev.slice(1);
      const matchIndex = rest.findIndex(
        (item) =>
          item.slug === lastLearnedLibrary.slug ||
          (item.repo && lastLearnedLibrary.repo && item.repo.toLowerCase() === lastLearnedLibrary.repo.toLowerCase())
      );

      const updatedItem: MemoryLibraryItem = {
        slug: lastLearnedLibrary.slug,
        label: lastLearnedLibrary.label,
        repo: lastLearnedLibrary.repo,
        reportsCount: lastLearnedLibrary.learned,
        openCount: lastLearnedLibrary.open,
        closedCount: lastLearnedLibrary.closed,
        learnedAtText: "learned just now",
      };

      if (matchIndex >= 0) {
        const nextRest = [...rest];
        nextRest[matchIndex] = updatedItem;
        return [first, ...nextRest];
      } else {
        return [first, ...rest, updatedItem];
      }
    });

    // Highlight newly learned entry for exactly 3 seconds
    setHighlightedSlug(lastLearnedLibrary.slug);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setHighlightedSlug(null);
      }
    }, 3000);
  }, [lastLearnedLibrary]);

  return (
    <section aria-labelledby="libraries-memory-heading" className="w-full">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-white shadow-xs">
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <h2 id="libraries-memory-heading" className="text-sm font-bold tracking-tight text-neutral-900">
              Libraries in memory
            </h2>
          </div>
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" aria-label="Loading libraries" />
          )}
        </div>

        <p className="text-xs text-neutral-500 mb-3.5">
          Each library has its own memory. New ones are learned from GitHub on demand.
        </p>

        <ul className="space-y-2" role="list">
          {libraries.map((lib) => {
            const isHighlighted = highlightedSlug === lib.slug;
            const isFixedEntry = lib.slug === "nextjs-prisma";

            return (
              <li
                key={lib.slug || lib.repo || lib.label}
                className={`rounded-lg border p-2.5 text-xs transition-all duration-300 ${
                  isHighlighted
                    ? "border-emerald-400 bg-emerald-50/90 ring-2 ring-emerald-500/30 shadow-xs"
                    : "border-neutral-200/80 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-neutral-900 truncate">
                        {isFixedEntry ? "Next.js 14.1 to 14.2 + Prisma" : lib.label}
                      </span>
                      {isFixedEntry ? (
                        <span className="inline-flex items-center gap-1 rounded bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-medium text-neutral-800">
                          98 reports
                        </span>
                      ) : lib.reportsCount !== undefined ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          {lib.reportsCount} reports
                        </span>
                      ) : null}
                      {isHighlighted && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white animate-pulse">
                          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                          <span>Learned</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
                      {lib.repo && (
                        <span className="font-mono text-neutral-600 truncate">
                          {lib.repo}
                        </span>
                      )}

                      {isFixedEntry ? (
                        <span className="text-neutral-400">· committed snapshot</span>
                      ) : lib.learnedAtText ? (
                        <span className="text-emerald-700 font-medium">
                          · {lib.learnedAtText}
                        </span>
                      ) : (
                        <span className="text-neutral-400">· on-demand memory</span>
                      )}

                      {lib.openCount !== undefined && lib.closedCount !== undefined && (
                        <span className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-emerald-700 font-medium">{lib.closedCount} fixed</span>
                          <span className="text-neutral-300">·</span>
                          <span className="text-amber-700 font-medium">{lib.openCount} open</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 mt-0.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        isFixedEntry || lib.reportsCount !== undefined
                          ? "bg-emerald-500"
                          : "bg-neutral-300"
                      }`}
                      title={
                        isFixedEntry || lib.reportsCount !== undefined
                          ? "In memory"
                          : "Ready to learn on demand"
                      }
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
