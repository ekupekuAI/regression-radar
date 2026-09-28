const BASE = process.env.HINDSIGHT_API_URL ?? "https://api.hindsight.vectorize.io";
const KEY = process.env.HINDSIGHT_API_KEY ?? "";
export const BANK_ID = process.env.HINDSIGHT_BANK_ID ?? "regression-radar-next-prisma";

export type MemoryEvent = {
  type: "recall" | "retain" | "reflect";
  query?: string;
  hits?: number;
  note: string;
  at: string;
  /** A few of the actual memories retrieved, so the inspector can show them. */
  samples?: { type: string; text: string }[];
  /** How the retrieved memories break down by Hindsight memory type. */
  breakdown?: Record<string, number>;
};

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${KEY}`,
  };
}

async function call(path: string, body: unknown) {
  const res = await fetch(`${BASE}/v1/default/banks/${BANK_ID}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Hindsight ${res.status} on ${path}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * We ask the model for the one thing memory is genuinely good at - which past
 * bug reports are relevant to this upgrade, and why - and deliberately do NOT
 * ask it whether each one is fixed. That fact lives in the snapshot, so asking
 * would only invite it to guess. See lib/groundTruth.ts.
 */
const RISK_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          why: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          issue_numbers: { type: "array", items: { type: "integer" } },
        },
        required: ["title", "why", "confidence", "issue_numbers"],
      },
    },
  },
  required: ["summary", "risks"],
};

export type RawRisk = {
  title: string;
  why: string;
  confidence: "high" | "medium" | "low";
  issue_numbers: number[];
};

export async function reflectRisks(stack: string): Promise<{
  summary: string;
  risks: RawRisk[];
  events: MemoryEvent[];
}> {
  const now = () => new Date().toISOString();
  const events: MemoryEvent[] = [];

  const query =
    `A developer is about to perform this upgrade: ${stack}. ` +
    `Using only the real bug reports you remember, list the specific things ` +
    `likely to break for this stack. For each one give a short title, a one ` +
    `sentence explanation of why it affects this stack, how confident you are, ` +
    `and the GitHub issue numbers it comes from. Never invent an issue number. ` +
    `Do not say whether something is fixed - only which issues it came from.`;

  // reflect() does not report which memories it used, so we run the search
  // ourselves first. It costs one extra call and it is the difference between
  // the inspector claiming memory was used and showing exactly what came back.
  let recalled: { type: string; text: string }[] = [];
  try {
    const rec = await call("/memories/recall", {
      query: stack,
      budget: "mid",
      max_tokens: 3000,
    });
    recalled = (rec.results ?? []).map((r: { type?: string; text?: string }) => ({
      type: r.type ?? "unknown",
      text: (r.text ?? "").split(" | ")[0].slice(0, 180),
    }));
  } catch {
    // Non-fatal: the briefing still works, the inspector just shows less.
  }

  const breakdown = recalled.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1;
    return acc;
  }, {});

  events.push({
    type: "recall",
    query: stack,
    hits: recalled.length,
    breakdown,
    samples: recalled.slice(0, 4),
    note: `searched memory, found ${recalled.length} relevant memories`,
    at: now(),
  });

  const data = await call("/reflect", {
    query,
    budget: "high",
    response_schema: RISK_SCHEMA,
  });

  const structured = data.structured_output ?? {};
  const risks: RawRisk[] = Array.isArray(structured.risks) ? structured.risks : [];

  events.push({
    type: "reflect",
    hits: recalled.length,
    note: `reasoned over ${recalled.length} memories, produced ${risks.length} candidate risks`,
    at: now(),
  });

  return {
    summary: typeof structured.summary === "string" ? structured.summary : "",
    risks,
    events,
  };
}

/**
 * What actually happened after the upgrade. This is the half that makes the
 * next answer better than this one: the outcome goes back in as the bank's own
 * experience, so a warning that keeps proving wrong stops being repeated.
 */
export async function retainOutcome(stack: string, outcome: string): Promise<MemoryEvent> {
  await fetch(`${BASE}/v1/default/banks/${BANK_ID}/memories`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      items: [
        {
          content:
            `[upgrade-outcome] A developer who followed our briefing for "${stack}" ` +
            `reported what actually happened: ${outcome}`,
          timestamp: new Date().toISOString(),
        },
      ],
      async: true,
    }),
  }).then((r) => {
    if (!r.ok) throw new Error(`Hindsight retain failed: ${r.status}`);
  });

  return {
    type: "retain",
    note: `outcome recorded: ${outcome.slice(0, 80)}`,
    at: new Date().toISOString(),
  };
}
