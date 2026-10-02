"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  XCircle,
  Brain,
  Cpu,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/** /api/brief's citation counts. */
export interface BriefCitations {
  total: number;
  verified: number;
}

/** /api/baseline's response: the same question, answered with no memory. */
export interface BaselineData {
  answer: string;
  citations: { total: number; verified: number; numbers: number[] };
  /** Present when the answer is a recorded run rather than a live call. */
  recorded?: { at: string; model: string; query: string };
}

interface BaselineComparisonProps {
  memoryOn?: BriefCitations | null;
  memoryOff?: BaselineData | null;
  loadingOn?: boolean;
  loadingOff?: boolean;
  errorOff?: string | null;
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      {text}
    </div>
  );
}

export function BaselineComparison({
  memoryOn = null,
  memoryOff = null,
  loadingOn = false,
  loadingOff = false,
  errorOff = null,
}: BaselineComparisonProps) {
  const [activeTab, setActiveTab] = useState<"side-by-side" | "memory-on" | "memory-off">("side-by-side");
  const [showAnswer, setShowAnswer] = useState(false);

  const dropped = memoryOn ? memoryOn.total - memoryOn.verified : 0;
  const offCited = memoryOff?.citations.total ?? 0;
  const offVerified = memoryOff?.citations.verified ?? 0;

  return (
    <section aria-labelledby="comparison-heading" className="w-full">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-150 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              <Sparkles className="h-3.5 w-3.5 text-neutral-600" />
              <span>Same question, with and without memory</span>
            </div>
            <h2 id="comparison-heading" className="text-lg font-bold tracking-tight text-neutral-900">
              Compare with no memory
            </h2>
            <p className="text-xs text-neutral-500">
              Every issue number either answer cites is checked against our 98-issue snapshot.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveTab((prev) =>
                prev === "side-by-side" ? "memory-on" : prev === "memory-on" ? "memory-off" : "side-by-side"
              )
            }
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
          >
            {activeTab === "memory-off" ? (
              <ToggleLeft className="h-4 w-4 text-neutral-400" />
            ) : (
              <ToggleRight className="h-4 w-4 text-emerald-600" />
            )}
            <span>
              Showing: <strong className="capitalize">{activeTab.replace(/-/g, " ")}</strong>
            </span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(activeTab === "side-by-side" || activeTab === "memory-on") && (
            <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-700 text-white shadow-xs">
                    <Brain className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Memory ON</h3>
                    <p className="text-[11px] text-neutral-500">Hindsight memory + verification</p>
                  </div>
                </div>
                {memoryOn && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Every warning shown is verified</span>
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200/80 bg-white p-3.5">
                {loadingOn ? (
                  <Waiting text="Checking memory…" />
                ) : memoryOn ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-emerald-900">
                        {memoryOn.verified} of {memoryOn.total}
                      </span>
                      <span className="text-xs font-medium text-emerald-700">cited issues verified</span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-700 leading-relaxed">
                      {dropped === 0
                        ? "Every issue it cited exists in the snapshot, with its real fixed or open status."
                        : `${dropped} cited issue${dropped === 1 ? "" : "s"} couldn't be verified, so ${
                            dropped === 1 ? "it was" : "they were"
                          } left out before showing you anything.`}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-neutral-500">Check an upgrade to see this side.</p>
                )}
              </div>

              <ul className="mt-3 space-y-1.5 text-xs text-neutral-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Answers from 98 real GitHub issues in memory</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Uses what developers reported after upgrading</span>
                </li>
              </ul>
            </div>
          )}

          {(activeTab === "side-by-side" || activeTab === "memory-off") && (
            <div className="relative rounded-xl border border-neutral-200 bg-neutral-50/50 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-700 text-white shadow-xs">
                    <Cpu className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Memory OFF</h3>
                    <p className="text-[11px] text-neutral-500">General model, no memory</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-200/70 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                  <AlertCircle className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Baseline</span>
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3.5">
                {loadingOff ? (
                  <Waiting text="Asking a model with no memory…" />
                ) : errorOff ? (
                  <p className="text-xs text-red-700">{errorOff}</p>
                ) : memoryOff ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-neutral-600">
                        {offCited === 0 ? "0" : `${offVerified} of ${offCited}`}
                      </span>
                      <span className="text-xs font-medium text-neutral-500">
                        {offCited === 0 ? "issues cited" : "cited issues verified"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                      {offCited === 0
                        ? "It gave general advice without citing a single issue."
                        : offVerified === 0
                        ? `None of the issue numbers it cited (${memoryOff.citations.numbers
                            .map((n) => `#${n}`)
                            .join(", ")}) could be verified against our snapshot.`
                        : `${offVerified} of its ${offCited} cited issues could be verified against our snapshot.`}
                    </p>
                    {memoryOff.recorded && (
                      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
                        Recorded answer from {memoryOff.recorded.model},{" "}
                        {new Date(memoryOff.recorded.at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                        , to “{memoryOff.recorded.query}”. The public site doesn&apos;t call the model live.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAnswer((v) => !v)}
                      aria-expanded={showAnswer}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 cursor-pointer"
                    >
                      {showAnswer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {showAnswer ? "Hide its answer" : "Read its full answer"}
                    </button>
                    {showAnswer && (
                      <div className="mt-2 max-h-72 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700 space-y-2">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children }) => (
                              <table className="w-full border-collapse text-[11px]">{children}</table>
                            ),
                            th: ({ children }) => (
                              <th className="border border-neutral-200 bg-neutral-100 p-1 text-left">{children}</th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-neutral-200 p-1 align-top">{children}</td>
                            ),
                            ul: ({ children }) => <ul className="list-disc space-y-1 pl-4">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal space-y-1 pl-4">{children}</ol>,
                          }}
                        >
                          {memoryOff.answer}
                        </ReactMarkdown>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-neutral-500">Check an upgrade to see this side.</p>
                )}
              </div>

              <ul className="mt-3 space-y-1.5 text-xs text-neutral-500">
                <li className="flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span>Cites issue numbers we can&apos;t verify</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span>No memory of what developers reported</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
