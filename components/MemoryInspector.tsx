"use client";

import React, { useState } from "react";
import {
  Brain,
  Search,
  CheckCircle2,
  Bookmark,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Quote,
} from "lucide-react";

export interface MemorySample {
  type: string;
  text: string;
}

export interface MemoryEventItem {
  type: "recall" | "retain" | "reflect";
  query?: string;
  hits?: number;
  note: string;
  at: string;
  samples?: MemorySample[];
  breakdown?: Record<string, number>;
}

export interface PlaybookData {
  name: string;
  refreshed_at: string | null;
  stale: boolean;
  content: string;
}

interface MemoryInspectorProps {
  events?: MemoryEventItem[];
  breakdown?: Record<string, number>;
  samples?: MemorySample[];
  playbook?: PlaybookData | null;
}

export function MemoryInspector({
  events = [
    {
      type: "retain",
      hits: 1,
      note: "Saved outcome: user reported middleware did not break on 14.2",
      at: "18:04:12",
    },
    {
      type: "reflect",
      hits: 4,
      note: "Checked issue evidence: 4 citations verified against GitHub snapshot",
      at: "18:02:45",
    },
    {
      type: "recall",
      hits: 14,
      note: "Matched 14 bug reports on app router + cookie + Prisma 5.x",
      at: "18:02:40",
      query: "app router cookie 14.2",
    },
    {
      type: "recall",
      hits: 48,
      note: "Searched vector memory bank for Next.js 14.1 to 14.2 migration patterns",
      at: "18:02:38",
    },
  ],
  breakdown = {
    WORLD: 48,
    OBSERVATION: 32,
    MENTAL_MODEL: 1,
  },
  samples = [
    {
      type: "world",
      text: "Next.js 14.2.0 introduced strict cookie parsing in Server Actions (#64394).",
    },
    {
      type: "observation",
      text: "Prisma client generate in Docker requires explicit binaryTargets on Alpine with 14.2.",
    },
    {
      type: "world",
      text: "Link prefetch true on iOS Safari causes double-tap delay in 14.2 (#64603).",
    },
  ],
  playbook = {
    name: "Next.js 14.2 Upgrade Playbook",
    refreshed_at: "18:00 UTC",
    stale: false,
    content:
      "When upgrading from Next.js 14.1 to 14.2 with App Router and Prisma: 1) Verify cookie handling in middleware/actions (#64394). 2) Check iOS Safari link prefetching (#64603). 3) Ensure Prisma schema generates with proper target output paths. 4) Watch for CSS resolution order changes with layout nesting.",
  },
}: MemoryInspectorProps) {
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);

  const getEventIcon = (type: MemoryEventItem["type"]) => {
    switch (type) {
      case "recall":
        return <Search className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />;
      case "reflect":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />;
      case "retain":
        return <Bookmark className="h-3.5 w-3.5 text-purple-600" aria-hidden="true" />;
      default:
        return <Brain className="h-3.5 w-3.5 text-neutral-600" aria-hidden="true" />;
    }
  };

  const getBadgeStyle = (type: MemoryEventItem["type"]) => {
    switch (type) {
      case "recall":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "reflect":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "retain":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-neutral-50 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <aside
      aria-labelledby="memory-inspector-heading"
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs flex flex-col gap-5"
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white shadow-xs">
              <Brain className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="memory-inspector-heading"
                className="text-sm font-bold tracking-tight text-neutral-900"
              >
                Memory Inspector
              </h2>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-mono text-neutral-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Live view of what the agent remembered.
        </p>
      </div>

      {/* Memory Breakdown Chips */}
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          <Layers className="h-3 w-3" aria-hidden="true" />
          <span>Active Bank Breakdown</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(breakdown).map(([key, count]) => (
            <div
              key={key}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700"
            >
              <span className="font-semibold text-neutral-900">{key.replace("_", " ")}</span>
              <span className="font-mono text-xs font-bold text-neutral-600 bg-neutral-200/70 rounded px-1 py-0.2">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Memory Events Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>Memory Execution Log</span>
          </div>
          <span className="text-[11px] text-neutral-400">Newest first</span>
        </div>

        <div className="relative border-l-2 border-neutral-200 ml-2.5 space-y-4 pl-4 text-xs">
          {events.map((event, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline marker icon */}
              <div className="absolute -left-[23px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-neutral-300">
                {getEventIcon(event.type)}
              </div>

              <div className="flex flex-col gap-1 rounded-lg border border-neutral-150 bg-neutral-50/70 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${getBadgeStyle(
                      event.type
                    )}`}
                  >
                    {event.type}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-400">{event.at}</span>
                </div>

                <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                  {event.note}
                </p>

                {event.query && (
                  <p className="font-mono text-[11px] text-neutral-500 bg-white p-1 rounded border border-neutral-200">
                    &ldquo;{event.query}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Samples from memory */}
      {samples && samples.length > 0 && (
        <div className="border-t border-neutral-200 pt-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">
            <Quote className="h-3 w-3" aria-hidden="true" />
            <span>Samples from Memory</span>
          </div>
          <div className="space-y-2">
            {samples.map((sample, idx) => (
              <blockquote
                key={idx}
                className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-2.5 text-xs text-neutral-700"
              >
                <p className="italic leading-snug">
                  &ldquo;{sample.text}&rdquo;
                </p>
                <div className="mt-1 flex items-center justify-end">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">
                    type: {sample.type}
                  </span>
                </div>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Playbook section (Section 8) */}
      {playbook && (
        <div className="border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={() => setIsPlaybookOpen(!isPlaybookOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors focus:outline-hidden focus:ring-1 focus:ring-neutral-900 cursor-pointer"
            aria-expanded={isPlaybookOpen}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-neutral-600" aria-hidden="true" />
              <span>Hindsight&apos;s Playbook</span>
            </div>
            <div className="flex items-center gap-2">
              {playbook.refreshed_at && (
                <span className="font-mono text-[10px] font-normal text-neutral-500">
                  Refreshed: {playbook.refreshed_at}
                </span>
              )}
              {isPlaybookOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-neutral-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
              )}
            </div>
          </button>

          {isPlaybookOpen && (
            <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-900">{playbook.name}</span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                  Mental Model
                </span>
              </div>
              <p className="leading-relaxed text-neutral-600">{playbook.content}</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
