"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, RotateCcw, Sparkles } from "lucide-react";
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
import { LibrariesInMemory, LearnedLibraryEvent } from "@/components/LibrariesInMemory";

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
  stack?: { slug: string; label: string; repo: string };
};

const DEFAULT_STACK = "Next.js 14.1 to 14.2";

// Steps shown while querying the committed 98-issue snapshot.
const STEPS_SNAPSHOT = [
  "Searching memory of real GitHub bug reports",
  "Reading what memory found",
  "Checking every issue number against GitHub",
];

// Steps shown when learning on-demand libraries from GitHub.
const STEPS_LEARN = [
  "Learning real issues from GitHub into memory",
  "Searching memory of bug reports",
  "Reading what memory found",
  "Checking citations against GitHub repository",
];

function isExternalStack(s: string): boolean {
  if (/next(\.js|js)?\b|prisma/i.test(s)) return false;
  return (
    /pydantic|numpy|pandas/i.test(s) ||
    /\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\b/.test(s)
  );
}

async function postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (networkErr) {
    if (networkErr instanceof Error && networkErr.name === "AbortError") {
      throw networkErr;
    }
    throw new Error("Network error. Please check your connection and try again.");
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data || data?.error) {
    const errorMsg = data?.error || `Request failed (${res.status}). Please try again.`;
    throw new Error(errorMsg);
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
  const [activeSteps, setActiveSteps] = useState(STEPS_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [laterEvents, setLaterEvents] = useState<MemoryEventItem[]>([]);
  const [sent, setSent] = useState<Record<string, "hit" | "fine">>({});
  const [pending, setPending] = useState<string | null>(null);
  const [askAgain, setAskAgain] = useState(false);
  const [lastLearnedLibrary, setLastLearnedLibrary] = useState<LearnedLibraryEvent | null>(null);

  // Lifecyle and concurrency refs to prevent duplicate requests and timer leaks
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (totalSteps: number) => {
    clearTimer();
    setStep(0);
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setStep((s) => Math.min(s + 1, totalSteps - 1));
    }, 6000);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimer();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const runBrief = async (
    s: string,
    details?: { library?: string; fromVersion?: string; toVersion?: string },
    signal?: AbortSignal
  ) => {
    const isExternal = isExternalStack(s);
    const steps = isExternal ? STEPS_LEARN : STEPS_SNAPSHOT;
    setActiveSteps(steps);
    setLoading(true);
    setError(null);
    setAskAgain(false);
    startTimer(steps.length);

    try {
      // For on-demand external stacks (Pydantic, NumPy, pandas, or custom owner/repo),
      // learn their real issues from GitHub first so memory can reflect real breakages.
      if (isExternal) {
        try {
          const learnData = await postJSON<{
            memory_events?: MemoryEventItem[];
            learned?: number;
            open?: number;
            closed?: number;
            stack?: { slug: string; label: string; repo: string };
          }>("/api/learn-stack", { stack: s }, signal);

          if (isMountedRef.current && learnData?.memory_events) {
            setLaterEvents((prev) => [...prev, ...(learnData.memory_events ?? [])]);
            setStep((prev) => Math.max(prev, 1));
          }

          if (isMountedRef.current && learnData?.stack) {
            setLastLearnedLibrary({
              slug: learnData.stack.slug,
              label: learnData.stack.label,
              repo: learnData.stack.repo,
              learned: learnData.learned ?? 0,
              open: learnData.open,
              closed: learnData.closed,
              timestamp: Date.now(),
            });
          }
        } catch (learnErr) {
          if (learnErr instanceof Error && learnErr.name === "AbortError") {
            throw learnErr;
          }
          console.warn("Learning step note:", learnErr);
        }
      }

      const data = await postJSON<BriefResponse>(
        "/api/brief",
        {
          stack: s,
          library: details?.library ?? currentDetails.library,
          fromVersion: details?.fromVersion ?? currentDetails.fromVersion,
          toVersion: details?.toVersion ?? currentDetails.toVersion,
        },
        signal
      );

      if (!isMountedRef.current) return;
      setBrief(data);
      setLaterEvents([]);
      setSent({});

      if (data?.stack && isMountedRef.current) {
        setLastLearnedLibrary((prev) => {
          if (prev?.slug === data.stack?.slug && prev?.learned) return prev;
          return {
            slug: data.stack!.slug,
            label: data.stack!.label,
            repo: data.stack!.repo,
            learned: data.corpus_size ?? 0,
            timestamp: Date.now(),
          };
        });
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      if (isMountedRef.current) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        clearTimer();
      }
      isSubmittingRef.current = false;
    }
  };

  const runBaseline = async (
    s: string,
    details?: { library?: string; fromVersion?: string; toVersion?: string },
    signal?: AbortSignal
  ) => {
    setBaselineLoading(true);
    setBaselineError(null);
    try {
      const data = await postJSON<BaselineData>(
        "/api/baseline",
        {
          stack: s,
          library: details?.library ?? currentDetails.library,
          fromVersion: details?.fromVersion ?? currentDetails.fromVersion,
          toVersion: details?.toVersion ?? currentDetails.toVersion,
        },
        signal
      );
      if (!isMountedRef.current) return;
      setBaseline(data);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      if (isMountedRef.current) {
        setBaselineError(e instanceof Error ? e.message : "The comparison failed. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setBaselineLoading(false);
      }
    }
  };

  const handleSubmit = (
    s: string,
    details?: { library: string; fromVersion: string; toVersion: string }
  ) => {
    if (loading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Cancel prior requests and timer before initiating new check
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    clearTimer();

    setStack(s);
    if (details) {
      setCurrentDetails(details);
    }
    runBrief(s, details, controller.signal);
    runBaseline(s, details, controller.signal);
  };

  const handleLearnStack = async (s: string) => {
    if (loading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    clearTimer();

    setActiveSteps(STEPS_LEARN);
    setLoading(true);
    setError(null);
    startTimer(STEPS_LEARN.length);

    try {
      const learnData = await postJSON<{
        memory_events?: MemoryEventItem[];
        learned?: number;
        open?: number;
        closed?: number;
        stack?: { slug: string; label: string; repo: string };
      }>("/api/learn-stack", { stack: s }, controller.signal);

      if (isMountedRef.current && learnData?.memory_events) {
        setLaterEvents((prev) => [...prev, ...(learnData.memory_events ?? [])]);
      }

      if (isMountedRef.current && learnData?.stack) {
        setLastLearnedLibrary({
          slug: learnData.stack.slug,
          label: learnData.stack.label,
          repo: learnData.stack.repo,
          learned: learnData.learned ?? 0,
          open: learnData.open,
          closed: learnData.closed,
          timestamp: Date.now(),
        });
      }

      if (isMountedRef.current) {
        setStep(1);
      }
      await runBrief(s, currentDetails, controller.signal);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      if (isMountedRef.current) {
        setError(e instanceof Error ? e.message : "Learning failed. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        clearTimer();
      }
      isSubmittingRef.current = false;
    }
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
      if (!isMountedRef.current) return;
      setSent((prev) => ({ ...prev, [riskId]: happened ? "hit" : "fine" }));
      setLaterEvents((prev) => [...prev, ...(data.memory_events ?? [])]);
      setAskAgain(true);
    } catch (e) {
      if (isMountedRef.current) {
        setError(e instanceof Error ? e.message : "Couldn't save that to memory. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setPending(null);
      }
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
      if (isMountedRef.current) {
        setLaterEvents((prev) => [...prev, ...(data.memory_events ?? [])]);
        setAskAgain(true);
      }
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

  const needsLearningPrompt =
    Boolean(brief && !loading && (
      brief.summary.includes("Learn it first") ||
      brief.summary.includes("Memory doesn't hold enough")
    ));

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <StackForm
          initialStack={stack}
          initialLibrary={currentDetails.library}
          initialFromVersion={currentDetails.fromVersion}
          initialToVersion={currentDetails.toVersion}
          onSubmit={handleSubmit}
          isLoading={loading}
          loadingStepText={activeSteps[step] ?? "Analyzing upgrade risks..."}
        />

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
              disabled={loading}
              onClick={() => {
                if (loading || isSubmittingRef.current) return;
                handleSubmit(stack, currentDetails);
              }}
              className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
                  {activeSteps[step]}… <span className="text-neutral-400">({step + 1}/{activeSteps.length})</span>
                </span>
              </div>
            )}

            {needsLearningPrompt && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
                  <span>
                    Regression Radar needs to learn real GitHub issues for this library before it can detect breakages.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (loading || isSubmittingRef.current) return;
                    handleLearnStack(stack);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Learn into memory now
                </button>
              </div>
            )}

            {askAgain && !loading && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
                <span>Saved to memory. Ask again to see the answer change.</span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (loading || isSubmittingRef.current) return;
                    runBrief(stack, currentDetails);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-purple-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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

          <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-6">
            <LibrariesInMemory lastLearnedLibrary={lastLearnedLibrary} />
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
