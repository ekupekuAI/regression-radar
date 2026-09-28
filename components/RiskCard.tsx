"use client";

import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ThumbsDown,
  ThumbsUp,
  ShieldCheck,
  Loader2,
  Users,
} from "lucide-react";

export interface Source {
  repo: string;
  number: number;
  url: string;
  title?: string;
}

export interface Risk {
  id: string;
  title: string;
  status: "fixed" | "open";
  fixed_in?: string | null;
  confidence: "high" | "medium" | "low";
  why: string;
  sources: Source[];
  feedback?: {
    hit: number;
    fine: number;
  };
  from_feedback?: boolean;
}

interface RiskCardProps {
  risk: Risk;
  onFeedback?: (riskId: string, happened: boolean) => void;
  /** What this viewer already reported for this warning, so it can't be sent twice. */
  sent?: "hit" | "fine";
  pending?: boolean;
  disabled?: boolean;
}

function developers(n: number) {
  return `${n} developer${n === 1 ? "" : "s"}`;
}

export function RiskCard({ risk, onFeedback, sent, pending = false, disabled = false }: RiskCardProps) {
  const handleFeedback = (happened: boolean) => {
    if (sent || pending || disabled) return;
    onFeedback?.(risk.id, happened);
  };

  const isFixed = risk.status === "fixed";
  const primarySource = risk.sources[0];
  const hit = risk.feedback?.hit ?? 0;
  const fine = risk.feedback?.fine ?? 0;
  const confirmed = hit > fine;
  const cleared = fine > hit;
  const locked = Boolean(sent) || pending || disabled;

  const confidenceBadge = {
    high: "border-neutral-200 bg-neutral-100 text-neutral-800",
    medium: "border-neutral-200 bg-neutral-50 text-neutral-600",
    low: "border-neutral-200 bg-neutral-50 text-neutral-500",
  }[risk.confidence] || "border-neutral-200 bg-neutral-50 text-neutral-600";

  return (
    <article
      aria-labelledby={`risk-title-${risk.id}`}
      className={`group relative rounded-xl border bg-white p-5 shadow-xs transition-all hover:border-neutral-300 ${
        confirmed ? "border-blue-300 ring-1 ring-blue-100" : "border-neutral-200"
      } ${cleared ? "opacity-60" : ""}`}
    >
      <div className="flex flex-col gap-3">
        {/* Header row: Badges and Issue ID */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Badge */}
            {isFixed ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>{risk.fixed_in ? `Fixed in ${risk.fixed_in}` : "Fixed"}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                <span>Still open</span>
              </span>
            )}

            {/* Confidence Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${confidenceBadge}`}
            >
              <ShieldCheck className="h-3 w-3 text-neutral-500" aria-hidden="true" />
              <span className="capitalize">{risk.confidence} confidence</span>
            </span>

            {confirmed && (
              <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                <Users className="h-3 w-3" aria-hidden="true" />
                Confirmed by {developers(hit)}
              </span>
            )}
            {cleared && (
              <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-600">
                <Users className="h-3 w-3" aria-hidden="true" />
                Didn&apos;t affect {developers(fine)}
              </span>
            )}
          </div>

          {/* GitHub Source Link */}
          {primarySource && (
            <a
              href={primarySource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors focus:outline-hidden focus:underline"
              title={`View ${primarySource.repo} issue #${primarySource.number} on GitHub`}
            >
              <span>#{primarySource.number} on GitHub</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Risk Title */}
        <h3
          id={`risk-title-${risk.id}`}
          className="text-base font-semibold tracking-tight text-neutral-900"
        >
          {risk.title}
        </h3>

        {/* Why statement */}
        <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700 border border-neutral-150">
          <p className="leading-relaxed">
            <span className="font-semibold text-neutral-900">Why: </span>
            {risk.why}
          </p>
        </div>

        {/* Feedback Section */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          <div className="flex items-center gap-2" aria-live="polite">
            {pending ? (
              <span className="inline-flex items-center gap-1.5 text-neutral-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Saving to memory…
              </span>
            ) : sent ? (
              <span className="font-medium text-purple-800">Saved to memory. Ask again to see the change.</span>
            ) : (
              <span>Did you do this upgrade?</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFeedback(true)}
              aria-pressed={sent === "hit"}
              disabled={locked}
              className={`inline-flex min-h-10 sm:min-h-0 items-center gap-1.5 rounded-md border px-3 sm:px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer disabled:cursor-default focus:outline-hidden focus:ring-1 focus:ring-neutral-900 ${
                sent === "hit"
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:hover:bg-white"
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span>This hit us</span>
              {risk.feedback && risk.feedback.hit > 0 && (
                <span className="ml-0.5 rounded px-1 py-0.2 font-mono text-[10px] bg-neutral-100 text-neutral-700">
                  {risk.feedback.hit}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleFeedback(false)}
              aria-pressed={sent === "fine"}
              disabled={locked}
              className={`inline-flex min-h-10 sm:min-h-0 items-center gap-1.5 rounded-md border px-3 sm:px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer disabled:cursor-default focus:outline-hidden focus:ring-1 focus:ring-neutral-900 ${
                sent === "fine"
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:hover:bg-white"
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Didn&apos;t affect us</span>
              {risk.feedback && risk.feedback.fine > 0 && (
                <span className="ml-0.5 rounded px-1 py-0.2 font-mono text-[10px] bg-neutral-100 text-neutral-700">
                  {risk.feedback.fine}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
