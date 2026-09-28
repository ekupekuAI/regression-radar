import { NextResponse } from "next/server";
import { retainOutcome } from "@/lib/hindsight";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stack = typeof body?.stack === "string" ? body.stack.trim() : "";
    const outcome = typeof body?.outcome === "string" ? body.outcome.trim() : "";

    if (!outcome) {
      return NextResponse.json(
        { error: "Tell us what actually broke, or that nothing did." },
        { status: 400 }
      );
    }

    const event = await retainOutcome(stack || "an unspecified upgrade", outcome);

    return NextResponse.json({
      ok: true,
      memory_events: [event],
      note: "Recorded. Ask the same question again and the answer should account for this.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
