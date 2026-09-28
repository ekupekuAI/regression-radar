/**
 * PLACEHOLDER - this file belongs to the UI owner.
 *
 * Replace this whole file. It exists only so `next build` passes and the
 * backend can be deployed and tested before the real interface lands.
 *
 * The API is live and ready:
 *
 *   POST /api/brief   { "stack": "Next.js 14.1 to 14.2, app router + Prisma" }
 *     -> { query, summary, corpus_size, risks[], memory_events[] }
 *
 *   POST /api/learn   { "stack": "...", "outcome": "middleware did not break" }
 *     -> { ok, memory_events[] }
 *
 * Every risk in `risks` has: id, title, status ("fixed" | "open"), fixed_in,
 * confidence, why, and sources[] with a real clickable GitHub URL.
 *
 * `memory_events` is what the Memory Inspector panel renders.
 */
export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Regression Radar</h1>
      <p className="mt-3 text-neutral-600">
        Backend is live. The interface goes here.
      </p>
      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <p className="font-medium text-neutral-900">Try the API directly:</p>
        <pre className="mt-2 overflow-x-auto rounded bg-neutral-100 p-3 text-xs">
{`curl -X POST http://localhost:3000/api/brief \\
  -H "Content-Type: application/json" \\
  -d '{"stack":"Next.js 14.1 to 14.2, app router + Prisma"}'`}
        </pre>
      </div>
    </main>
  );
}
