import { NextResponse } from "next/server";
import { reflectRisks, type MemoryEvent } from "@/lib/hindsight";
import { verifyCitations, TOTAL_ISSUES } from "@/lib/groundTruth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let stack = "";
  try {
    const body = await req.json();
    stack = typeof body?.stack === "string" ? body.stack.trim() : "";
  } catch {
    return NextResponse.json({ error: "Send JSON with a 'stack' field." }, { status: 400 });
  }
  if (!stack) {
    return NextResponse.json({ error: "Describe the upgrade you are about to do." }, { status: 400 });
  }

  try {
    const { summary, risks, events } = await reflectRisks(stack);
    const memory_events: MemoryEvent[] = [...events];

    const verified = [];
    let droppedTotal = 0;

    for (const r of risks) {
      const { sources, status, fixedIn, dropped } = verifyCitations(r.issue_numbers ?? []);
      droppedTotal += dropped.length;

      // A risk with no verifiable source is not shown at all. We would rather
      // return four results a reader can click through to than six where two
      // lead nowhere.
      if (sources.length === 0) continue;

      verified.push({
        id: `${sources[0].repo.split("/")[1]}-${sources[0].number}`,
        title: r.title,
        status,
        fixed_in: fixedIn,
        confidence: r.confidence ?? "medium",
        why: r.why,
        sources,
      });
    }

    if (droppedTotal > 0) {
      memory_events.push({
        type: "reflect",
        note: `dropped ${droppedTotal} citation${droppedTotal === 1 ? "" : "s"} not present in the ${TOTAL_ISSUES}-issue snapshot`,
        at: new Date().toISOString(),
      });
    }

    const open = verified.filter((v) => v.status === "open").length;
    const fixed = verified.length - open;

    return NextResponse.json({
      query: stack,
      summary:
        verified.length === 0
          ? "Nothing in memory matches that stack yet."
          : `${verified.length} known breakage${verified.length === 1 ? "" : "s"} for this combination. ${fixed} fixed, ${open} still open.`,
      model_summary: summary,
      corpus_size: TOTAL_ISSUES,
      risks: verified,
      memory_events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
