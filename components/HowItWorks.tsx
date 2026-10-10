import React from "react";
import { Keyboard, Bug, ShieldCheck, RefreshCw, ChevronRight } from "lucide-react";

const STEPS = [
  { icon: Keyboard, text: "Type any upgrade" },
  { icon: Bug, text: "It learns from real GitHub bug reports" },
  { icon: ShieldCheck, text: "Every warning is checked against GitHub" },
  { icon: RefreshCw, text: "Tell it what happened, and it learns" },
];

/** One quiet line under the header so a first-time visitor gets the idea in seconds. */
export function HowItWorks() {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50 px-4 sm:px-6 py-2">
      <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600" aria-label="How it works">
        <li className="mr-1 font-semibold uppercase tracking-wider text-[10px] text-neutral-500">How it works</li>
        {STEPS.map(({ icon: Icon, text }, i) => (
          <li key={text} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <span>{text}</span>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-neutral-400" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
