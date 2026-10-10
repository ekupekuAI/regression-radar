"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { Header } from "@/components/Header";
import { StackForm } from "@/components/StackForm";
import { RiskList } from "@/components/RiskList";
import { Risk } from "@/components/RiskCard";
import {
  MemoryInspector,
  MemoryEventItem,
  MemorySample,
  PlaybookData,
} from "@/components/MemoryInspector";
import { BaselineComparison, BaselineData, BriefCitations } from "@/components/BaselineComparison";
import { LearnForm } from "@/components/LearnForm";

type BriefResponse = {
  query: string;
  library?: string;
  from_version?: string;
  to_version?: string;
  summary: string;
  citations: BriefCitations;
  corpus_size: number;
  risks: Risk[];
  memory_events: MemoryEventItem[];
  playbook: PlaybookData | null;
};

const DEFAULT_STACK = "Next.js 14.1 to 14.2";

// The real steps /api/brief goes through, shown in order while it works.
const STEPS = [
  "Searching memory of 98 bug reports",
  "Reading what memory found",
  "Checking every issue number against GitHub",
];

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Request failed (${res.status}). Please try again.`);
  }
  return data as T;
}

function clockTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Home() {
  const [stack, setStack] = useState(DEFAULT_STACK);
  const [currentDetails, setCurrentDetails] = useState<{
    library: string;
    fromVersion: string;
    toVersion: string;
  }>({
    library: "Next.js",
    fromVersion: "14.1",
    toVersion: "14.2",
  });
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [laterEvents, setLaterEvents] = useState<MemoryEventItem[]>([]);
  const [sent, setSent] = useState<Record<string, "hit" | "fine">>({});
  const [pending, setPending] = useState<string | null>(null);
  const [askAgain, setAskAgain] = useState(false);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
    return () => clearInterval(timer);
  }, [loading]);

  const runBrief = async (
    s: string,
    details?: { library?: string; fromVersion?: string; toVersion?: string }
  ) => {
    setLoading(true);
    setError(null);
    setAskAgain(false);
    try {
      const data = await postJSON<BriefResponse>("/api/brief", {
        stack: s,
        library: details?.library ?? currentDetails.library,
        fromVersion: details?.fromVersion ?? currentDetails.fromVersion,
        toVersion: details?.toVersion ?? currentDetails.toVersion,
      });
      setBrief(data);
      setLaterEvents([]);
      setSent({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const runBaseline = async (
    s: string,
    details?: { library?: string; fromVersion?: string; toVersion?: string }
  ) => {
    setBaselineLoading(true);
    setBaselineError(null);
    try {
      setBaseline(
        await postJSON<BaselineData>("/api/baseline", {
          stack: s,
          library: details?.library ?? currentDetails.library,
          fromVersion: details?.fromVersion ?? currentDetails.fromVersion,
          toVersion: details?.toVersion ?? currentDetails.toVersion,
        })
      );
    } catch (e) {
      setBaselineError(e instanceof Error ? e.message : "The comparison failed. Please try again.");
    } finally {
      setBaselineLoading(false);
    }
  };

  const handleSubmit = (
    s: string,
    details?: { library: string; fromVersion: string; toVersion: string }
  ) => {
    setStack(s);
    if (details) {
      setCurrentDetails(details);
    }
    runBrief(s, details);
    runBaseline(s, details);
  };

  const handleFeedback = async (riskId: string, happened: boolean) => {
    const risk = brief?.risks.find((r) => r.id === riskId);
    if (!risk || sent[riskId] || pending) return;
    setPending(riskId);
    setError(null);
    try {
      const data = await postJSON<{ memory_events: MemoryEventItem[] }>("/api/learn", {
        stack,
        library: currentDetails.library,
        fromVersion: currentDetails.fromVersion,
        toVersion: currentDetails.toVersion,
        feedback: [{ number: risk.sources[0].number, happened }],
      });
      setSent((prev) => ({ ...prev, [riskId]: happened ? "hit" : "fine" }));
      setLaterEvents((prev) => [...prev, ...(data.memory_events ?? [])]);
      setAskAgain(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that to memory. Please try again.");
    } finally {
      setPending(null);
    }
  };

  const handleSaveOutcome = async (note: string): Promise<boolean> => {
    try {
      const data = await postJSON<{ memory_events: MemoryEventItem[] }>("/api/learn", {
        stack,
        library: currentDetails.library,
        fromVersion: currentDetails.fromVersion,
        toVersion: currentDetails.toVersion,
        outcome: note,
      });
      setLaterEvents((prev) => [...prev, ...(data.memory_events ?? [])]);
      setAskAgain(true);
      return true;
    } catch {
      return false;
    }
  };

  const allEvents = [...(brief?.memory_events ?? []), ...laterEvents].map((e) => ({
    ...e,
    at: clockTime(e.at),
  }));
  const breakdown =
    brief?.memory_events.find((e) => e.type === "recall" && e.breakdown)?.breakdown ?? {};
  // Hindsight consolidates each developer report into a generic line like
  // "The developer upgraded Next.js from 14.1 to 14.2...". Real, but it tells
  // a viewer nothing, so prefer memories that actually say something.
  const allSamples: MemorySample[] = (brief?.memory_events ?? []).flatMap((e) => e.samples ?? []);
  const informative = allSamples.filter(
    (s) => !/^(the )?(developer|team|user)s? (upgraded|performed|did)/i.test(s.text)
  );
  const samples = (informative.length > 0 ? informative : allSamples).slice(0, 5);
  const playbook = brief?.playbook
    ? { ...brief.playbook, refreshed_at: clockTime(brief.playbook.refreshed_at) }
    : null;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <StackForm initialStack={stack} onSubmit={handleSubmit} isLoading={loading} />

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </span>
            <button
              type="button"
              onClick={() => handleSubmit(stack)}
              className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          <div className="space-y-8 lg:col-span-8">
            {loading && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-xs"
              >
                <Loader2 className="h-4 w-4 animate-spin text-neutral-500" aria-hidden="true" />
                <span>
                  {STEPS[step]}… <span className="text-neutral-400">({step + 1}/{STEPS.length})</span>
                </span>
              </div>
            )}

            {askAgain && !loading && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
                <span>Saved to memory. Ask again to see the answer change.</span>
                <button
                  type="button"
                  onClick={() => runBrief(stack)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-purple-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-800 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Ask again
                </button>
              </div>
            )}

            {brief ? (
              <div className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
                <RiskList
                  risks={brief.risks}
                  summaryText={brief.summary}
                  onFeedback={handleFeedback}
                  sent={sent}
                  pending={pending}
                />
              </div>
            ) : loading ? (
              <div className="space-y-3.5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-36 animate-pulse rounded-xl border border-neutral-200 bg-white" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-600">
                <p className="font-medium text-neutral-900">Press “Check Upgrade Risks” to see what broke for other developers.</p>
                <p className="mt-1 text-xs text-neutral-500">
                  The first answer takes a little while: memory is searched, then every issue is checked against GitHub.
                </p>
              </div>
            )}

            <BaselineComparison
              memoryOn={brief?.citations ?? null}
              memoryOff={baseline}
              loadingOn={loading}
              loadingOff={baselineLoading}
              errorOff={baselineError}
            />

            {brief && <LearnForm stack={stack} onSave={handleSaveOutcome} />}
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <MemoryInspector
              events={allEvents}
              breakdown={breakdown}
              samples={samples}
              playbook={playbook}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
