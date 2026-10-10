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

export const PLAYBOOK_ID = process.env.HINDSIGHT_PLAYBOOK_ID ?? "upgrade-playbook";

export type Playbook = {
  name: string;
  refreshed_at: string | null;
  stale: boolean;
  content: string;
};

/**
 * The fourth memory type. Hindsight writes this mental model by running a
 * standing question over the whole bank, and rewrites it after each round of
 * consolidation, so developer reports change it without anyone editing it.
 * reflect() consults it by default; we also fetch it so the inspector can
 * show what the standing summary currently says.
 */
export async function getPlaybook(): Promise<Playbook | null> {
  try {
    const res = await fetch(
      `${BASE}/v1/default/banks/${BANK_ID}/mental-models/${PLAYBOOK_ID}?detail=full`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const content = typeof d.content === "string" ? d.content.trim() : "";
    if (!content || /^generating/i.test(content)) return null;
    return {
      name: d.name ?? "Upgrade playbook",
      refreshed_at: d.last_refreshed_at ?? null,
      stale: Boolean(d.is_stale),
      content,
    };
  } catch {
    return null;
  }
}

/** One developer's verdict on one warning: did it actually happen to them? */
export type Feedback = { number: number; happened: boolean };

/** Per issue number: separate reports saying it hit them, and saying it did not. */
export type Tally = Record<number, { hit: number; fine: number }>;

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
      maxItems: 8,
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

type RecallResult = {
  type?: string;
  text?: string;
  tags?: string[] | null;
  document_id?: string | null;
};

/**
 * Everything developers have reported after doing this kind of upgrade.
 *
 * Each report is written with structured tags - issue:NNN and happened:yes|no
 * - and the tally is read from those tags, never from prose. It is the same
 * rule as fixed/open: the model was given the outcomes as context and asked
 * to act on them, and it didn't reliably, so the part that has to be right
 * is done in code. The outcomes still go to reflect() as context, where they
 * can help the model reason about related issues.
 *
 * Hindsight turns one report into several facts, and consolidates reports
 * into observations. So reports are counted once per document_id, and
 * observations (which have none) are shown but never counted.
 */
async function recallOutcomes(stack: string): Promise<{
  tally: Tally;
  reports: number;
  observations: string[];
  statements: { type: string; text: string }[];
}> {
  const tally: Tally = {};
  const counted = new Set<string>();
  const docs = new Set<string>();
  const observations: string[] = [];
  // Kept with Hindsight's own classification. It files a developer's report
  // as a world fact, not an experience - experience is the bank's own actions
  // - and the inspector should show what Hindsight actually did.
  const statements: { type: string; text: string }[] = [];

  try {
    const rec = await call("/memories/recall", {
      query: stack,
      tags: ["outcome"],
      tags_match: "any_strict",
      budget: "mid",
      max_tokens: 4000,
    });

    for (const r of (rec.results ?? []) as RecallResult[]) {
      const text = (r.text ?? "").split(" | ")[0].trim();
      const doc = r.document_id ?? "";

      if (!doc) {
        if (text) observations.push(text);
        continue;
      }
      docs.add(doc);
      if (text) statements.push({ type: r.type ?? "world", text });

      const tags = r.tags ?? [];
      const issueTag = tags.find((t) => t.startsWith("issue:"));
      const happenedTag = tags.find((t) => t.startsWith("happened:"));
      if (!issueTag || !happenedTag) continue;

      const key = `${doc}|${issueTag}`;
      if (counted.has(key)) continue;
      counted.add(key);

      const n = Number(issueTag.slice("issue:".length));
      if (!Number.isFinite(n)) continue;
      tally[n] ??= { hit: 0, fine: 0 };
      if (happenedTag === "happened:yes") tally[n].hit += 1;
      else tally[n].fine += 1;
    }
  } catch {
    // Non-fatal: the briefing still works without past outcomes.
  }

  return {
    tally,
    reports: docs.size,
    observations: Array.from(new Set(observations)).slice(0, 4),
    statements: Array.from(new Map(statements.map((s) => [s.text, s])).values()).slice(0, 8),
  };
}

export async function reflectRisks(stack: string): Promise<{
  summary: string;
  risks: RawRisk[];
  events: MemoryEvent[];
  tally: Tally;
}> {
  const now = () => new Date().toISOString();
  const events: MemoryEvent[] = [];

  const query =
    `A developer is about to perform this upgrade: ${stack}. ` +
    `Using only the real bug reports you remember, list the specific things ` +
    `likely to break for this stack - aim for the 5 to 8 most relevant, most ` +
    `relevant first, and fewer only if memory genuinely holds fewer. ` +
    `For each one give a short title, a one ` +
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
    recalled = (rec.results ?? []).map((r: RecallResult) => ({
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

  const { tally, reports, observations, statements } = await recallOutcomes(stack);
  if (reports > 0) {
    const samples = [
      ...observations.slice(0, 1).map((text) => ({ type: "observation", text })),
      ...statements.slice(0, 2),
    ];
    events.push({
      type: "recall",
      hits: reports,
      samples,
      note: `found ${reports} report${reports === 1 ? "" : "s"} from developers who already did this upgrade`,
      at: now(),
    });
  }

  const context =
    statements.length === 0
      ? undefined
      : "Developers who already did a similar upgrade reported:\n" +
        statements.map((s, i) => `${i + 1}. ${s.text}`).join("\n") +
        "\nTake these into account when judging what is likely to break.";

  const data = await call("/reflect", {
    query,
    budget: "high",
    response_schema: RISK_SCHEMA,
    ...(context ? { context } : {}),
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
    tally,
  };
}

/**
 * What actually happened after the upgrade - the half that makes the next
 * answer better than this one. Each verdict is stored as its own memory with
 * structured tags, so it can be counted exactly when it is recalled.
 */
export async function retainOutcome(
  stack: string,
  feedback: Feedback[],
  note: string
): Promise<MemoryEvent> {
  const stamp = Date.now();
  const at = new Date().toISOString();

  const items: Record<string, unknown>[] = feedback.map((f) => ({
    content:
      `[upgrade-outcome] Upgrade: ${stack}. A developer who did this upgrade ` +
      `reported that GitHub issue #${f.number} ` +
      (f.happened ? "DID happen to them." : "did NOT affect them."),
    timestamp: at,
    document_id: `outcome-${stamp}-${f.number}`,
    tags: ["outcome", `issue:${f.number}`, `happened:${f.happened ? "yes" : "no"}`],
  }));

  if (note) {
    items.push({
      content:
        `[upgrade-outcome] Upgrade: ${stack}. What actually happened, reported ` +
        `by the developer who did it: ${note}`,
      timestamp: at,
      document_id: `outcome-${stamp}-note`,
      tags: ["outcome", "note"],
    });
  }

  if (items.length === 0) throw new Error("Nothing to record.");

  const r = await fetch(`${BASE}/v1/default/banks/${BANK_ID}/memories`, {
    method: "POST",
    headers: headers(),
    // Synchronous on purpose: the demo asks the same question straight after
    // recording an outcome, and the answer has to reflect it.
    body: JSON.stringify({ items, async: false }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Hindsight retain failed: ${r.status} ${detail.slice(0, 200)}`);
  }

  const hit = feedback.filter((f) => f.happened).length;
  const fine = feedback.length - hit;
  const parts = [
    hit ? `${hit} confirmed` : "",
    fine ? `${fine} did not happen` : "",
    note ? "a note" : "",
  ].filter(Boolean);

  return {
    type: "retain",
    hits: items.length,
    note: `recorded ${parts.join(", ")}`,
    at,
  };
}

/**
 * Retain one library's fetched issues under its own stack tag. Asynchronous,
 * so the request returns at once while Hindsight extracts facts in the
 * background; a library that was already learned is simply refreshed, because
 * the document ids are stable.
 */
export async function retainStackIssues(
  tag: string,
  label: string,
  issues: { repo: string; number: number; title: string; state: string; url: string; body: string }[]
): Promise<MemoryEvent> {
  const at = new Date().toISOString();
  const items = issues.map((i) => ({
    content:
      `[${label}] GitHub issue #${i.number} in ${i.repo} (${i.state === "open" ? "still open" : "closed"}): ` +
      `${i.title}. ${i.body}`,
    timestamp: at,
    document_id: `${i.repo}#${i.number}`,
    tags: [tag, `issue:${i.number}`],
    metadata: { repo: i.repo, number: String(i.number), state: i.state, url: i.url },
  }));
  const r = await fetch(`${BASE}/v1/default/banks/${BANK_ID}/memories`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ items, async: true }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Hindsight retain failed: ${r.status} ${detail.slice(0, 200)}`);
  }
  return { type: "retain", hits: items.length, note: `saved ${items.length} real ${label} issues into memory`, at };
}

/** The same briefing as reflectRisks, scoped to one library's memories. */
export async function reflectStackRisks(
  tag: string,
  label: string,
  stack: string
): Promise<{ summary: string; risks: RawRisk[]; events: MemoryEvent[]; tally: Tally }> {
  const now = () => new Date().toISOString();
  const events: MemoryEvent[] = [];

  let recalled: { type: string; text: string }[] = [];
  try {
    const rec = await call("/memories/recall", {
      query: stack,
      tags: [tag],
      tags_match: "any_strict",
      budget: "mid",
      max_tokens: 3000,
    });
    recalled = (rec.results ?? []).map((r: RecallResult) => ({
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
    note: `searched the ${label} memory, found ${recalled.length} relevant memories`,
    at: now(),
  });

  const { tally, reports } = await recallOutcomes(stack);
  if (reports > 0) {
    events.push({
      type: "recall",
      hits: reports,
      note: `found ${reports} report${reports === 1 ? "" : "s"} from developers who already did this upgrade`,
      at: now(),
    });
  }

  const query =
    `A developer is about to perform this upgrade: ${stack} (${label}). ` +
    `Using only the real ${label} GitHub issues you remember, list the specific things ` +
    `likely to break - aim for the 5 to 8 most relevant, most relevant first, and fewer ` +
    `only if memory genuinely holds fewer. For each one give a short title, a one sentence ` +
    `explanation, how confident you are, and the GitHub issue numbers it comes from. ` +
    `Never invent an issue number. Do not say whether something is fixed.`;
  const data = await call("/reflect", { query, budget: "high", response_schema: RISK_SCHEMA });
  const structured = data.structured_output ?? {};
  const risks: RawRisk[] = Array.isArray(structured.risks) ? structured.risks : [];
  events.push({
    type: "reflect",
    hits: recalled.length,
    note: `reasoned over the ${label} memories, produced ${risks.length} candidate risks`,
    at: now(),
  });
  return { summary: typeof structured.summary === "string" ? structured.summary : "", risks, events, tally };
}
