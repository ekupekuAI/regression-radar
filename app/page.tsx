"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { StackForm } from "@/components/StackForm";
import { RiskList } from "@/components/RiskList";
import { Risk } from "@/components/RiskCard";
import { MemoryInspector, MemoryEventItem, PlaybookData } from "@/components/MemoryInspector";
import { BaselineComparison } from "@/components/BaselineComparison";
import { LearnForm } from "@/components/LearnForm";

// Realistic mock data based on the repository's real verified issue dataset
const MOCK_RISKS: Risk[] = [
  {
    id: "next-64394",
    title: "Cookie not being set after upgrade from 14.0.4 to 14.2 in App Router",
    status: "fixed",
    fixed_in: "14.2.3",
    confidence: "high",
    why: "Server Actions and Route Handlers strict cookie parsing changed in 14.2.0, causing session drops.",
    sources: [
      {
        repo: "vercel/next.js",
        number: 64394,
        url: "https://github.com/vercel/next.js/issues/64394",
        title: "nextjs 14.2 app-router Cookie not being set after version upgrade from v14.0.4 to 14.2",
      },
    ],
    feedback: { hit: 3, fine: 0 },
    from_feedback: true,
  },
  {
    id: "next-64603",
    title: "iOS Safari requires 2 clicks for Links to open when Prefetch is true",
    status: "fixed",
    fixed_in: "14.2.2",
    confidence: "high",
    why: "Touch event listeners interfered with viewport prefetching logic on mobile WebKit.",
    sources: [
      {
        repo: "vercel/next.js",
        number: 64603,
        url: "https://github.com/vercel/next.js/issues/64603",
        title: "iOS Safari requires 2 clicks for Links to open when Prefetch is true. Using Next 14.2",
      },
    ],
    feedback: { hit: 2, fine: 1 },
    from_feedback: false,
  },
  {
    id: "next-64921",
    title: "Inconsistent CSS resolution order with App Router and nested layouts",
    status: "open",
    fixed_in: null,
    confidence: "medium",
    why: "CSS module chunk injection priority fluctuates when transitioning between dynamic parallel routes.",
    sources: [
      {
        repo: "vercel/next.js",
        number: 64921,
        url: "https://github.com/vercel/next.js/issues/64921",
        title: "Inconsistent CSS resolution order with App Router",
      },
    ],
    feedback: { hit: 1, fine: 0 },
    from_feedback: false,
  },
  {
    id: "next-64434",
    title: "ERR_REQUIRE_ESM when bundling syntax highlighter libraries (e.g. shiki)",
    status: "fixed",
    fixed_in: "14.2.1",
    confidence: "high",
    why: "Server component externals bundle resolution treated pure ESM packages as CJS require calls.",
    sources: [
      {
        repo: "vercel/next.js",
        number: 64434,
        url: "https://github.com/vercel/next.js/issues/64434",
        title: "[ERR_REQUIRE_ESM]: require() of ES Module `shiki` when using `14.2.x`",
      },
    ],
    feedback: { hit: 0, fine: 2 },
    from_feedback: false,
  },
  {
    id: "next-71131",
    title: "i18n configuration causes 500 runtime crash when malformed URLs are visited",
    status: "open",
    fixed_in: null,
    confidence: "medium",
    why: "Malformed locale prefixes bypass normal 404 routing handlers in custom middleware setups.",
    sources: [
      {
        repo: "vercel/next.js",
        number: 71131,
        url: "https://github.com/vercel/next.js/issues/71131",
        title: "i18n configuration causes 500 error when certain malformed URLs are visited",
      },
    ],
    feedback: { hit: 0, fine: 0 },
    from_feedback: false,
  },
  {
    id: "next-64609",
    title: "Slow page transitions and infinite loading indicator during internal navigation",
    status: "fixed",
    fixed_in: "14.2.4",
    confidence: "high",
    why: "Prisma client connection pools stalled during Next.js background revalidation passes.",
    sources: [
      {
        repo: "vercel/next.js",
        number: 64609,
        url: "https://github.com/vercel/next.js/issues/64609",
        title: "Slow Page Transitions and Infinite Loading with Internal Navigation Using Link Component in Next.js 14.2",
      },
    ],
    feedback: { hit: 1, fine: 0 },
    from_feedback: false,
  },
];

const MOCK_MEMORY_EVENTS: MemoryEventItem[] = [
  {
    type: "retain",
    hits: 1,
    note: "Saved outcome: user reported middleware did not break on 14.2",
    at: "18:04:12",
  },
  {
    type: "reflect",
    hits: 6,
    note: "Checked issue evidence: 6 citations verified against GitHub snapshot (4 fixed, 2 open)",
    at: "18:02:45",
  },
  {
    type: "recall",
    hits: 14,
    note: "Matched 14 bug reports on app router + cookie + Prisma 5.x",
    at: "18:02:40",
    query: "Next.js 14.1 to 14.2, app router + Prisma",
  },
  {
    type: "recall",
    hits: 48,
    note: "Searched vector memory bank for Next.js 14.1 to 14.2 migration patterns",
    at: "18:02:38",
  },
];

const MOCK_PLAYBOOK: PlaybookData = {
  name: "Next.js 14.2 Upgrade Playbook",
  refreshed_at: "18:00 UTC",
  stale: false,
  content:
    "When upgrading from Next.js 14.1 to 14.2 with App Router and Prisma: 1) Verify cookie handling in Server Actions and Middleware (#64394 · fixed in 14.2.3). 2) Check iOS Safari link prefetching (#64603 · fixed in 14.2.2). 3) Ensure Prisma schema generates with proper target output paths. 4) Watch for CSS resolution order changes with layout nesting (#64921 · still open).",
};

export default function Home() {
  const [currentStack, setCurrentStack] = useState("Next.js 14.1 to 14.2, app router + Prisma");
  const [risks, setRisks] = useState<Risk[]>(MOCK_RISKS);

  const handleStackSubmit = (stack: string) => {
    setCurrentStack(stack);
    // Visual only for static frontend phase
  };

  const handleRiskFeedback = (riskId: string, happened: boolean) => {
    // Visual only state update for static frontend phase
    setRisks((prev) =>
      prev.map((r) => {
        if (r.id === riskId) {
          const fb = r.feedback || { hit: 0, fine: 0 };
          return {
            ...r,
            feedback: {
              hit: happened ? fb.hit + 1 : fb.hit,
              fine: !happened ? fb.fine + 1 : fb.fine,
            },
          };
        }
        return r;
      })
    );
  };

  const handleSaveOutcome = (note: string) => {
    // Visual only for static frontend phase
    console.log("Outcome recorded:", note);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Top Hero / Query Section */}
        <StackForm
          initialStack={currentStack}
          onSubmit={handleStackSubmit}
        />

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Main Content: Results, Comparison, Learning (68% width on desktop) */}
          <div className="space-y-8 lg:col-span-8">
            {/* Risk Results */}
            <RiskList
              risks={risks}
              summaryText="6 known breakages for this combination · 4 fixed · 2 still open"
              onFeedback={handleRiskFeedback}
            />

            {/* Baseline Memory On/Off Comparison */}
            <BaselineComparison />

            {/* Learning Feedback Form */}
            <LearnForm
              stack={currentStack}
              onSave={handleSaveOutcome}
            />
          </div>

          {/* Right Column: Sticky Memory Inspector (32% width on desktop) */}
          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <MemoryInspector
              events={MOCK_MEMORY_EVENTS}
              breakdown={{
                WORLD: 48,
                OBSERVATION: 32,
                MENTAL_MODEL: 1,
              }}
              samples={[
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
              ]}
              playbook={MOCK_PLAYBOOK}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
