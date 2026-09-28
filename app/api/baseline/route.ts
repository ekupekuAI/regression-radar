import { NextResponse } from "next/server";
import { lookup } from "@/lib/groundTruth";

export const runtime = "nodejs";
export const maxDuration = 90;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

/**
 * The "memory off" half of the comparison: the same question sent to a
 * capable model with no memory attached.
 *
 * It is not a strawman. Asked this directly, the model hedges about the limits
 * of its data, gives generic advice ("search the repo for the label"), and
 * cites issue numbers - but in testing none of the numbers it cited existed in
 * the snapshot. We check every citation the same way /api/brief does, so the
 * difference shows up as a count rather than an adjective.
 */
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

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        messages: [
          {
            role: "user",
            content:
              `I am about to do this upgrade: ${stack}. What specifically is ` +
              `likely to break? Cite the GitHub issue numbers.`,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const answer: string = data?.choices?.[0]?.message?.content ?? "";

    // The model cites in several shapes: "#64603", "issues/64603" inside a
    // link, "issue 64603". Catch all of them, or the comparison undercounts.
    const cited = Array.from(
      new Set(
        Array.from(answer.matchAll(/(?:#|issues\/|issue\s+#?)(\d{4,6})\b/gi)).map((m) =>
          Number(m[1])
        )
      )
    );
    const verified = cited.filter((n) => lookup(n));

    return NextResponse.json({
      query: stack,
      memory: false,
      answer,
      citations: {
        total: cited.length,
        verified: verified.length,
        numbers: cited,
      },
      memory_events: [
        {
          type: "recall",
          hits: 0,
          note: "memory off: answering from the model's training data only",
          at: new Date().toISOString(),
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
