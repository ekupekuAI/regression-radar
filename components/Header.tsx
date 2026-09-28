import React from "react";
import { ShieldCheck, Radar } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs">
            <Radar className="h-5 w-5 text-neutral-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-neutral-900">
                Regression Radar
              </span>
              <span className="hidden sm:inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 border border-neutral-200">
                Hindsight Memory
              </span>
            </div>
            <p className="text-xs text-neutral-500 hidden sm:block">
              Know what breaks before you upgrade.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">
            <ShieldCheck className="h-3.5 w-3.5 text-neutral-600" />
            <span className="font-mono font-semibold text-neutral-900">98</span>
            <span className="hidden sm:inline text-neutral-600">verified bug reports</span>
          </div>
        </div>
      </div>
    </header>
  );
}
