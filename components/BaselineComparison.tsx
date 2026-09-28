"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, Brain, Cpu, ToggleLeft, ToggleRight, Sparkles, AlertCircle } from "lucide-react";

interface BaselineComparisonProps {
  memoryOnStats?: {
    verified: number;
    total: number;
    summary: string;
    details: string;
  };
  memoryOffStats?: {
    verified: number;
    total: number;
    summary: string;
    details: string;
  };
}

export function BaselineComparison({
  memoryOnStats = {
    verified: 9,
    total: 9,
    summary: "9 of 9 citations verified",
    details:
      "All cited GitHub issues exist in the verified snapshot with exact bug descriptions and confirmed resolutions (#64394, #64603, #64434).",
  },
  memoryOffStats = {
    verified: 0,
    total: 1,
    summary: "0 of 1 citations verified",
    details:
      "Model hedged with generic upgrade advice, hallucinated issue #94821 which does not exist, and missed 4 known regressions in the 14.2 App Router.",
  },
}: BaselineComparisonProps) {
  const [activeTab, setActiveTab] = useState<"side-by-side" | "memory-on" | "memory-off">("side-by-side");

  return (
    <section aria-labelledby="comparison-heading" className="w-full">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
        {/* Header & Mode Switcher */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-150 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              <Sparkles className="h-3.5 w-3.5 text-neutral-600" />
              <span>Ground Truth Validation</span>
            </div>
            <h2 id="comparison-heading" className="text-lg font-bold tracking-tight text-neutral-900">
              Compare with no memory
            </h2>
            <p className="text-xs text-neutral-500">
              See the concrete difference when Hindsight memory is active versus raw baseline LLM completions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() =>
                setActiveTab((prev) => (prev === "side-by-side" ? "memory-on" : prev === "memory-on" ? "memory-off" : "side-by-side"))
              }
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
            >
              {activeTab === "memory-off" ? (
                <ToggleLeft className="h-4 w-4 text-neutral-400" />
              ) : (
                <ToggleRight className="h-4 w-4 text-emerald-600" />
              )}
              <span>Mode: <strong className="capitalize">{activeTab.replace("-", " ")}</strong></span>
            </button>
          </div>
        </div>

        {/* Comparison Cards (Side-by-side on desktop, stacked on mobile) */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Memory ON */}
          {(activeTab === "side-by-side" || activeTab === "memory-on") && (
            <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-700 text-white shadow-xs">
                    <Brain className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Memory ON</h3>
                    <p className="text-[11px] text-neutral-500">Hindsight Augmented</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>100% Accuracy</span>
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200/80 bg-white p-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-900">
                    {memoryOnStats.verified} of {memoryOnStats.total}
                  </span>
                  <span className="text-xs font-medium text-emerald-700">citations verified</span>
                </div>
                <p className="mt-2 text-xs text-neutral-700 leading-relaxed">
                  {memoryOnStats.details}
                </p>
              </div>

              <ul className="mt-3 space-y-1.5 text-xs text-neutral-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Cites real GitHub issues from verified snapshot</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Considers developer feedback from previous runs</span>
                </li>
              </ul>
            </div>
          )}

          {/* Memory OFF */}
          {(activeTab === "side-by-side" || activeTab === "memory-off") && (
            <div className="relative rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-700 text-white shadow-xs">
                    <Cpu className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Memory OFF</h3>
                    <p className="text-[11px] text-neutral-500">Standard LLM (No Memory)</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-200/70 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                  <AlertCircle className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Baseline</span>
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-neutral-600">
                    {memoryOffStats.verified} of {memoryOffStats.total}
                  </span>
                  <span className="text-xs font-medium text-neutral-500">citations verified</span>
                </div>
                <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                  {memoryOffStats.details}
                </p>
              </div>

              <ul className="mt-3 space-y-1.5 text-xs text-neutral-500">
                <li className="flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span>Prone to hallucinating fake issue numbers</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span>No persistent recall of real developer outcomes</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
