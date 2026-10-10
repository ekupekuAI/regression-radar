import { NextResponse } from "next/server";
import { retainOutcome, type Feedback } from "@/lib/hindsight";
import { lookup } from "@/lib/groundTruth";
import { detectStack, fetchIssues } from "@/lib/stacks";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * POST /api/learn
 * {
 *   "stack": "Next.js 14.1 to 14.2, app router + Prisma",
 *   "feedback": [
 *     { "number": 66248, "happened": true },
 *     { "number": 64603, "happened": false }
 *   ],
 *   "outcome": "optional free-text note about what happened"
 * }
 *
 * At least one of `feedback` or `outcome` is required. Feedback is only
 * accepted for issues in the snapshot, so the public endpoint cannot be used
 * to write invented issue numbers into shared memory.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  const library = typeof body.library === "string" ? body.library.trim().slice(0, 100) : "";
  const fromVersion = typeof body.fromVersion === "string" ? body.fromVersion.trim().slice(0, 50) : "";
  const toVersion = typeof body.toVersion === "string" ? body.toVersion.trim().slice(0, 50) : "";

  let stack = typeof body.stack === "string" ? body.stack.trim().slice(0, 300) : "";
  if (!stack && library) {
    stack = fromVersion && toVersion
      ? `${library} ${fromVersion} to ${toVersion}`
      : toVersion
        ? `${library} ${toVersion}`
        : library;
  }
  const note = typeof body.outcome === "string" ? body.outcome.trim().slice(0, 1000) : "";

  const feedback: Feedback[] = [];
  const rejected: number[] = [];
  // A library learned on demand is checked against its own fetched issues.
  const ext = detectStack(stack);
  const extKnown = ext
    ? new Set((await fetchIssues(ext).catch(() => [])).map((i) => i.number))
    : null;
  if (Array.isArray(body.feedback)) {
    for (const f of body.feedback.slice(0, 20)) {
      const n = Number((f as Feedback)?.number);
      const happened = (f as Feedback)?.happened;
      if (!Number.isInteger(n) || typeof happened !== "boolean") continue;
      if (extKnown ? !extKnown.has(n) : !lookup(n)) {
        rejected.push(n);
        continue;
      }
      feedback.push({ number: n, happened });
    }
  }

  if (feedback.length === 0 && !note) {
    return NextResponse.json(
      {
        error:
          "Mark at least one warning as 'hit us' or 'didn't affect us', or describe what happened.",
        rejected,
      },
      { status: 400 }
    );
  }

  try {
    const event = await retainOutcome(stack || "an unspecified upgrade", feedback, note);
    return NextResponse.json({
      ok: true,
      recorded: feedback,
      rejected,
      memory_events: [event],
      note: "Recorded. Ask the same question again and the answer will account for it.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
