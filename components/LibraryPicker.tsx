"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Sparkles, Loader2, Layers } from "lucide-react";

export interface UpgradeSelection {
  library: string;
  fromVersion: string;
  toVersion: string;
  stack: string;
}

export interface Preset {
  id: string;
  label: string;
  library: string;
  fromVersion: string;
  toVersion: string;
}

export const PRESETS: Preset[] = [
  {
    id: "nextjs",
    label: "Next.js 14.1 → 14.2",
    library: "Next.js",
    fromVersion: "14.1",
    toVersion: "14.2",
  },
  {
    id: "pydantic",
    label: "Pydantic v1 → v2",
    library: "Pydantic",
    fromVersion: "v1",
    toVersion: "v2",
  },
  {
    id: "numpy",
    label: "NumPy 2.0",
    library: "NumPy",
    fromVersion: "",
    toVersion: "2.0",
  },
  {
    id: "pandas",
    label: "pandas 1.x → 2.0",
    library: "pandas",
    fromVersion: "1.x",
    toVersion: "2.0",
  },
];

export function formatUpgradeQuery(
  library: string,
  fromVersion?: string,
  toVersion?: string
): string {
  const lib = library.trim();
  const from = fromVersion?.trim();
  const to = toVersion?.trim();

  if (lib && from && to) {
    return `${lib} ${from} to ${to}`;
  }
  if (lib && to) {
    return `${lib} ${to}`;
  }
  if (lib && from) {
    return `${lib} from ${from}`;
  }
  return lib || to || "";
}

export interface LibraryPickerProps {
  initialLibrary?: string;
  initialFromVersion?: string;
  initialToVersion?: string;
  initialStack?: string;
  onSubmit?: (
    stack: string,
    details?: { library: string; fromVersion: string; toVersion: string }
  ) => void;
  isLoading?: boolean;
  loadingStepText?: string;
}

export function LibraryPicker({
  initialLibrary = "Next.js",
  initialFromVersion = "14.1",
  initialToVersion = "14.2",
  initialStack,
  onSubmit,
  isLoading = false,
  loadingStepText = "Searching memory of 98 bug reports",
}: LibraryPickerProps) {
  const [library, setLibrary] = useState(() => {
    if (initialStack && !initialLibrary) {
      return initialStack;
    }
    return initialLibrary;
  });
  const [fromVersion, setFromVersion] = useState(initialFromVersion);
  const [toVersion, setToVersion] = useState(initialToVersion);

  const [touched, setTouched] = useState({
    library: false,
    toVersion: false,
  });

  // Track if fields match any preset
  const activePreset = PRESETS.find(
    (p) =>
      p.library.toLowerCase() === library.trim().toLowerCase() &&
      p.fromVersion === fromVersion.trim() &&
      p.toVersion === toVersion.trim()
  );

  const libraryError = touched.library && !library.trim() ? "Library name is required" : "";
  const toVersionError =
    touched.toVersion && !toVersion.trim() ? "Target version is required" : "";

  const isFormValid = library.trim().length > 0 && toVersion.trim().length > 0;

  const handlePresetSelect = (preset: Preset) => {
    setLibrary(preset.library);
    setFromVersion(preset.fromVersion);
    setToVersion(preset.toVersion);
    setTouched({ library: false, toVersion: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ library: true, toVersion: true });

    if (!isFormValid || isLoading) return;

    const query = formatUpgradeQuery(library, fromVersion, toVersion);
    if (onSubmit) {
      onSubmit(query, {
        library: library.trim(),
        fromVersion: fromVersion.trim(),
        toVersion: toVersion.trim(),
      });
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
            Search verified regression history across Next.js, Pydantic, NumPy, pandas, and any GitHub repo.
          </p>
        </div>

        {/* Quick-select presets */}
        <div className="mt-6 border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Layers className="h-3.5 w-3.5 text-neutral-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Quick Presets
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Upgrade presets">
            {PRESETS.map((preset) => {
              const isSelected = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handlePresetSelect(preset)}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 disabled:opacity-50 ${
                    isSelected
                      ? "border border-neutral-900 bg-neutral-900 text-white shadow-xs"
                      : "border border-neutral-200 bg-neutral-50/70 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300"
                  }`}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Free-text input fields */}
        <form onSubmit={handleSubmit} className="mt-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4">
            {/* Library name */}
            <div className="sm:col-span-6">
              <label
                htmlFor="library-name-input"
                className="block text-xs font-semibold text-neutral-700 mb-1.5"
              >
                Library name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="library-name-input"
                name="library"
                type="text"
                value={library}
                disabled={isLoading}
                onBlur={() => setTouched((prev) => ({ ...prev, library: true }))}
                onChange={(e) => setLibrary(e.target.value)}
                placeholder="e.g. Pydantic"
                aria-required="true"
                aria-invalid={Boolean(libraryError)}
                aria-describedby={libraryError ? "library-error" : undefined}
                className={`w-full rounded-lg border py-2.5 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 transition-colors disabled:opacity-60 ${
                  libraryError
                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border-neutral-300 bg-neutral-50/50 focus:border-neutral-900"
                }`}
              />
              {libraryError && (
                <p id="library-error" role="alert" className="mt-1 text-xs text-red-600">
                  {libraryError}
                </p>
              )}
            </div>

            {/* From version */}
            <div className="sm:col-span-3">
              <label
                htmlFor="from-version-input"
                className="block text-xs font-semibold text-neutral-700 mb-1.5"
              >
                From version <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="from-version-input"
                name="fromVersion"
                type="text"
                value={fromVersion}
                disabled={isLoading}
                onChange={(e) => setFromVersion(e.target.value)}
                placeholder="e.g. 1.x"
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50/50 py-2.5 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 transition-colors disabled:opacity-60"
              />
            </div>

            {/* To version */}
            <div className="sm:col-span-3">
              <label
                htmlFor="to-version-input"
                className="block text-xs font-semibold text-neutral-700 mb-1.5"
              >
                To version <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="to-version-input"
                name="toVersion"
                type="text"
                value={toVersion}
                disabled={isLoading}
                onBlur={() => setTouched((prev) => ({ ...prev, toVersion: true }))}
                onChange={(e) => setToVersion(e.target.value)}
                placeholder="e.g. 2.0"
                aria-required="true"
                aria-invalid={Boolean(toVersionError)}
                aria-describedby={toVersionError ? "to-version-error" : undefined}
                className={`w-full rounded-lg border py-2.5 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 transition-colors disabled:opacity-60 ${
                  toVersionError
                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border-neutral-300 bg-neutral-50/50 focus:border-neutral-900"
                }`}
              />
              {toVersionError && (
                <p id="to-version-error" role="alert" className="mt-1 text-xs text-red-600">
                  {toVersionError}
                </p>
              )}
            </div>
          </div>

          {/* Upgrade preview and submission */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-600 min-w-0">
              <span className="font-medium text-neutral-700 shrink-0">Selected upgrade:</span>
              {library.trim() && toVersion.trim() ? (
                <span className="truncate inline-flex items-center gap-1 font-mono font-semibold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
                  <span>{library.trim()}</span>
                  <span className="text-neutral-500">
                    {fromVersion.trim() ? `${fromVersion.trim()} →` : "→"}
                  </span>
                  <span>{toVersion.trim()}</span>
                </span>
              ) : (
                <span className="text-neutral-400 italic">Enter library name and target version</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-300" aria-hidden="true" />
                  <span>Checking risks…</span>
                </>
              ) : (
                <>
                  <span>Check Upgrade Risks</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-500 flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isLoading ? "bg-amber-500 animate-ping" : "bg-emerald-500"
              }`}
            ></span>
            <span>
              {isLoading
                ? loadingStepText
                : "Answers from 98 real bug reports in Next.js and Prisma, verified against GitHub."}
            </span>
          </p>
        </form>
      </div>
    </section>
  );
}
