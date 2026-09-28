"use client";

import React, { useState } from "react";
import { BookmarkPlus, Send, Check } from "lucide-react";

interface LearnFormProps {
  stack?: string;
  /** Resolves true once the note is actually stored in memory. */
  onSave?: (note: string) => Promise<boolean>;
}

export function LearnForm({ stack = "Next.js 14.1 to 14.2, app router + Prisma", onSave }: LearnFormProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [failed, setFailed] = useState(false);
  const isLoading = saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !onSave || saving) return;

    setSaving(true);
    setFailed(false);
    const ok = await onSave(note.trim());
    setSaving(false);

    if (!ok) {
      setFailed(true);
      return;
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setNote("");
    }, 2500);
  };

  return (
    <section aria-labelledby="learn-heading" className="w-full">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-900 text-white shadow-xs">
            <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 id="learn-heading" className="text-base font-bold tracking-tight text-neutral-900">
            Help Regression Radar learn
          </h2>
        </div>

        <p className="text-xs text-neutral-600">
          Tell us what actually happened after your upgrade. Future queries on{" "}
          <span className="font-mono font-medium text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">
            {stack}
          </span>{" "}
          will incorporate your outcome into shared memory.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="outcome-note" className="sr-only">
              What actually broke for you?
            </label>
            <textarea
              id="outcome-note"
              name="outcome"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What actually broke for you? (e.g. Middleware redirects broke on iOS Safari until we adjusted matcher rules)"
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50/50 p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-[11px] ${failed ? "text-red-700" : "text-neutral-400"}`} aria-live="polite">
              {failed
                ? "Couldn't save that to memory. Please try again."
                : "Your note is stored in Hindsight memory. Use the buttons on each warning for a quick yes or no."}
            </span>
            <button
              type="submit"
              disabled={isLoading || !note.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {saving ? (
                <span>Saving…</span>
              ) : savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Saved to memory</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Save to memory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
