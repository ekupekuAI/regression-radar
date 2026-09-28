"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Brain,
  Search,
  CheckCircle2,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Quote,
  Loader2,
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
  loading?: boolean;
}

// Hindsight's own names for what it returned, in plain words.
const TYPE_LABEL: Record<string, string> = {
  world: "facts",
  observation: "observations",
  experience: "experiences",
  mental_model: "playbook",
};

export function MemoryInspector({
  events = [],
  breakdown = {},
  samples = [],
  playbook = null,
  loading = false,
}: MemoryInspectorProps) {
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const reduceMotion = useReducedMotion();

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

  const breakdownEntries = Object.entries(breakdown);

  return (
    <aside
      aria-labelledby="memory-inspector-heading"
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs flex flex-col gap-5"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white shadow-xs">
              <Brain className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 id="memory-inspector-heading" className="text-sm font-bold tracking-tight text-neutral-900">
              Memory Inspector
            </h2>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-mono text-neutral-500">
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                WORKING
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                LIVE
              </>
            )}
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">What Hindsight memory did for this answer.</p>
      </div>

      {events.length === 0 && !loading && (
        <p className="rounded-lg border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
          Check an upgrade and every memory search, save and step will appear here.
        </p>
      )}

      {breakdownEntries.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            <Layers className="h-3 w-3" aria-hidden="true" />
            <span>Recalled for this question</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {breakdownEntries.map(([key, count]) => (
              <div
                key={key}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700"
              >
                <span className="font-mono text-xs font-bold text-neutral-900">{count}</span>
                <span>{TYPE_LABEL[key] ?? key.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Step by step</span>
            </div>
            <span className="text-[11px] text-neutral-400">In order</span>
          </div>

          <div className="relative border-l-2 border-neutral-200 ml-2.5 space-y-4 pl-4 text-xs">
            {events.map((event, idx) => (
              <motion.div
                key={`${event.type}-${idx}-${event.note}`}
                className="relative group"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : idx * 0.15, duration: 0.25 }}
              >
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
                  <p className="text-xs text-neutral-800 leading-relaxed font-medium">{event.note}</p>
                  {event.query && (
                    <p className="font-mono text-[11px] text-neutral-500 bg-white p-1 rounded border border-neutral-200">
                      &ldquo;{event.query}&rdquo;
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {samples.length > 0 && (
        <div className="border-t border-neutral-200 pt-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">
            <Quote className="h-3 w-3" aria-hidden="true" />
            <span>Real memories it used</span>
          </div>
          <div className="space-y-2">
            {samples.map((sample, idx) => (
              <blockquote
                key={idx}
                className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-2.5 text-xs text-neutral-700"
              >
                <p className="italic leading-snug">&ldquo;{sample.text}&rdquo;</p>
                <div className="mt-1 flex items-center justify-end">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">
                    {TYPE_LABEL[sample.type] ?? sample.type}
                  </span>
                </div>
              </blockquote>
            ))}
          </div>
        </div>
      )}

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
              <span>Hindsight&apos;s playbook</span>
            </div>
            <div className="flex items-center gap-2">
              {playbook.refreshed_at && (
                <span className="font-mono text-[10px] font-normal text-neutral-500">
                  rewritten {playbook.refreshed_at}
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
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-neutral-900">{playbook.name}</span>
                <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                  Mental model
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Hindsight writes and rewrites this on its own. Every issue number in it is checked against GitHub.
              </p>
              <div className="max-h-96 overflow-y-auto space-y-2 leading-relaxed text-neutral-700">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h3 className="font-semibold text-neutral-900">{children}</h3>,
                    h2: ({ children }) => <h3 className="mt-2 font-semibold text-neutral-900">{children}</h3>,
                    h3: ({ children }) => <h4 className="mt-2 font-semibold text-neutral-900">{children}</h4>,
                    ul: ({ children }) => <ul className="list-disc space-y-1 pl-4">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal space-y-1 pl-4">{children}</ol>,
                    code: ({ children }) => (
                      <code className="rounded bg-neutral-100 px-1 font-mono text-[11px]">{children}</code>
                    ),
                  }}
                >
                  {playbook.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
