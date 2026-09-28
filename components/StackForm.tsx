"use client";

import React, { useState } from "react";
import { Search, ArrowRight, Sparkles } from "lucide-react";

interface StackFormProps {
  initialStack?: string;
  onSubmit?: (stack: string) => void;
  isLoading?: boolean;
}

export function StackForm({
  initialStack = "Next.js 14.1 to 14.2, app router + Prisma",
  onSubmit,
  isLoading = false,
}: StackFormProps) {
  const [stack, setStack] = useState(initialStack);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && stack.trim()) {
      onSubmit(stack.trim());
    }
  };

  return (
    <section aria-labelledby="query-heading" className="w-full">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 mb-3 border border-neutral-200/80">
            <Sparkles className="h-3.5 w-3.5 text-neutral-600" />
            <span>Pre-upgrade Risk Analysis</span>
          </div>
          <h2
            id="query-heading"
            className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl"
          >
            Check an upgrade before it breaks.
          </h2>
          <p className="mt-2 text-sm text-neutral-600 sm:text-base">
            Search verified regression history across Next.js and Prisma.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <label htmlFor="stack-input" className="sr-only">
            Describe the upgrade stack
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                <Search className="h-4 w-4" aria-hidden="true" />
              </div>
              <input
                id="stack-input"
                name="stack"
                type="text"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                placeholder="e.g. Next.js 14.1 to 14.2, app router + Prisma"
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50/50 py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-xs hover:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <span>{isLoading ? "Checking…" : "Check this upgrade"}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-3 text-xs text-neutral-500 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Answers from 98 real bug reports in Next.js and Prisma.</span>
          </p>
        </form>
      </div>
    </section>
  );
}
