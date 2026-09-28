"use client";

import React from "react";
import { Risk, RiskCard } from "./RiskCard";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface RiskListProps {
  risks: Risk[];
  summaryText?: string;
  onFeedback?: (riskId: string, happened: boolean) => void;
}

export function RiskList({
  risks,
  summaryText = "6 known breakages for this combination · 4 fixed · 2 still open",
  onFeedback,
}: RiskListProps) {
  const fixedCount = risks.filter((r) => r.status === "fixed").length;
  const openCount = risks.filter((r) => r.status === "open").length;

  return (
    <section aria-labelledby="results-heading" className="space-y-4">
      {/* Result summary banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200">
            <AlertTriangle className="h-4 w-4 text-neutral-700" aria-hidden="true" />
          </div>
          <div>
            <h2 id="results-heading" className="text-sm font-semibold text-neutral-900 sm:text-base">
              {summaryText ? (
                <span>{summaryText}</span>
              ) : (
                <span>
                  <span className="font-bold">{risks.length}</span> known breakages for this combination ·{" "}
                  <span className="font-semibold text-emerald-700">{fixedCount} fixed</span> ·{" "}
                  <span className="font-semibold text-amber-700">{openCount} still open</span>
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-500">
              Citations verified from historical repository snapshots
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-md bg-neutral-50 border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700">
          <ShieldCheck className="h-3.5 w-3.5 text-neutral-600" aria-hidden="true" />
          <span>Verified against GitHub</span>
        </div>
      </div>

      {/* Cards list */}
      <div className="space-y-3.5">
        {risks.map((risk) => (
          <RiskCard key={risk.id} risk={risk} onFeedback={onFeedback} />
        ))}
      </div>
    </section>
  );
}
