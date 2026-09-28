"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Risk, RiskCard } from "./RiskCard";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface RiskListProps {
  risks: Risk[];
  summaryText?: string;
  onFeedback?: (riskId: string, happened: boolean) => void;
  sent?: Record<string, "hit" | "fine">;
  pending?: string | null;
}

export function RiskList({ risks, summaryText, onFeedback, sent = {}, pending = null }: RiskListProps) {
  const reduceMotion = useReducedMotion();
  const fixedCount = risks.filter((r) => r.status === "fixed").length;
  const openCount = risks.filter((r) => r.status === "open").length;

  return (
    <section aria-labelledby="results-heading" className="space-y-4">
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
              Fixed or open comes from GitHub itself. Issues we can&apos;t verify are left out.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-md bg-neutral-50 border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700">
          <ShieldCheck className="h-3.5 w-3.5 text-neutral-600" aria-hidden="true" />
          <span>Verified against GitHub</span>
        </div>
      </div>

      {risks.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Nothing in memory matches that upgrade yet. Try “Next.js 14.1 to 14.2, app router + Prisma”.
        </p>
      ) : (
        <div className="space-y-3.5">
          {risks.map((risk) => (
            <motion.div
              key={risk.id}
              layout={!reduceMotion}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <RiskCard
                risk={risk}
                onFeedback={onFeedback}
                sent={sent[risk.id]}
                pending={pending === risk.id}
                disabled={pending !== null && pending !== risk.id}
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
