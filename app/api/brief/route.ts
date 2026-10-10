import { NextResponse } from "next/server";
import { reflectRisks, reflectStackRisks, retainStackIssues, getPlaybook, type MemoryEvent } from "@/lib/hindsight";
import { EXAMPLES, detectStack, fetchIssues, stackTag, type Stack } from "@/lib/stacks";
import {
  verifyCitations,
  verifyPlaybookText,
  lookup,
  checkScope,
  COVERAGE,
  TOTAL_ISSUES,
} from "@/lib/groundTruth";

export const runtime = "nodejs";
export const maxDuration = 120;

type Source = { repo: string; number: number; url: string; title: string };

type Risk = {
  id: string;
  title: string;
  status: "fixed" | "open";
  fixed_in: string | null;
  confidence: "high" | "medium" | "low";
  why: string;
  sources: Source[];
  /** Reports from developers who did this upgrade: it hit them / it did not. */
  feedback: { hit: number; fine: number };
  /** True when this warning is shown because developers confirmed it. */
  from_feedback?: boolean;
};

const RANK = { high: 0, medium: 1, low: 2 } as const;

function developers(n: number) {
  return `${n} developer${n === 1 ? "" : "s"}`;
}

function idFor(s: Source) {
  return `${s.repo.split("/")[1]}-${s.number}`;
}

export async function POST(req: Request) {
  let stack = "";
  let library = "";
  let fromVersion = "";
  let toVersion = "";

  try {
    const body = await req.json();
    library = typeof body?.library === "string" ? body.library.trim().slice(0, 100) : "";
    fromVersion = typeof body?.fromVersion === "string" ? body.fromVersion.trim().slice(0, 50) : "";
    toVersion = typeof body?.toVersion === "string" ? body.toVersion.trim().slice(0, 50) : "";

    if (typeof body?.stack === "string" && body.stack.trim()) {
      stack = body.stack.trim().slice(0, 300);
    } else if (library) {
      stack = fromVersion && toVersion
        ? `${library} ${fromVersion} to ${toVersion}`
        : toVersion
          ? `${library} ${toVersion}`
          : library;
    }
  } catch {
    return NextResponse.json({ error: "Send JSON with upgrade details." }, { status: 400 });
  }
  if (!stack) {
    return NextResponse.json({ error: "Describe the upgrade you are about to do." }, { status: 400 });
  }

  // Libraries learned on demand get their own memory and their own check.
  const external = detectStack(stack);
  if (external) return briefForStack(external, stack);

  // Out-of-scope stacks are answered honestly without consulting memory.
  // Without this gate the model answered "React 17 to 18 with Vite" with
  // five Prisma issues, all "verified".
  const scope = checkScope(stack);
  if (!scope.inScope) {
    return NextResponse.json({
      query: stack,
      memory: true,
      citations: { total: 0, verified: 0 },
      summary: `I don't recognise a library in "${stack}" yet. Type a library name such as ${EXAMPLES}, or any GitHub repo as owner/repo (for example psf/requests). The first question learns it from real GitHub issues; ask again a minute later for the briefing. Memory also covers ${COVERAGE}.`,
      model_summary: null,
      corpus_size: TOTAL_ISSUES,
      risks: [],
      playbook: null,
      memory_events: [
        {
          type: "recall",
          hits: 0,
          note: `scope check: the stack names none of the technologies in the ${TOTAL_ISSUES}-issue snapshot, so memory was not searched`,
          at: new Date().toISOString(),
        } satisfies MemoryEvent,
      ],
    });
  }

  try {
    const [{ summary, risks, events, tally }, rawPlaybook] = await Promise.all([
      reflectRisks(stack),
      getPlaybook(),
    ]);
    const memory_events: MemoryEvent[] = [...events];

    let playbook = null;
    if (rawPlaybook) {
      const checked = verifyPlaybookText(rawPlaybook.content);
      playbook = {
        name: rawPlaybook.name,
        refreshed_at: rawPlaybook.refreshed_at,
        stale: rawPlaybook.stale,
        content: checked.text,
        verified_issues: checked.verified,
        removed_citations: checked.removed,
      };
      const firstLine =
        checked.text
          .split("\n")
          .map((l) => l.replace(/^[#>*\-\d.\s]+/, "").trim())
          .find((l) => l.length > 40) ?? "";
      memory_events.push({
        type: "recall",
        hits: checked.verified.length,
        samples: firstLine ? [{ type: "mental_model", text: firstLine.slice(0, 180) }] : [],
        note:
          `loaded the mental model "${rawPlaybook.name}"` +
          (rawPlaybook.refreshed_at ? `, rewritten by Hindsight at ${rawPlaybook.refreshed_at.slice(11, 16)} UTC` : "") +
          (rawPlaybook.stale ? " (refresh pending)" : ""),
        at: new Date().toISOString(),
      });
    }

    const out: Risk[] = [];
    const shown = new Set<number>();
    let droppedTotal = 0;
    let modelCitations = 0;

    for (const r of risks) {
      const { sources, status, fixedIn, dropped } = verifyCitations(r.issue_numbers ?? []);
      droppedTotal += dropped.length;

      // A risk with no verifiable source is not shown at all. We would rather
      // return four results a reader can click through to than six where two
      // lead nowhere.
      if (sources.length === 0) continue;
      if (sources.every((s) => shown.has(s.number))) continue;

      sources.forEach((s) => shown.add(s.number));
      modelCitations += sources.length;
      out.push({
        id: idFor(sources[0]),
        title: r.title,
        status,
        fixed_in: fixedIn,
        confidence: r.confidence ?? "medium",
        why: r.why,
        sources,
        feedback: { hit: 0, fine: 0 },
      });
    }

    // Apply what developers reported. This is done here rather than left to
    // the model: given the same outcomes as context, it did not act on them
    // consistently, and this is the part of the product that has to be right.
    for (const risk of out) {
      const fb = { hit: 0, fine: 0 };
      for (const s of risk.sources) {
        const t = tally[s.number];
        if (t) {
          fb.hit += t.hit;
          fb.fine += t.fine;
        }
      }
      risk.feedback = fb;
      if (fb.hit > fb.fine) {
        risk.confidence = "high";
        risk.why = `${risk.why} Confirmed by ${developers(fb.hit)} who did this upgrade.`;
      } else if (fb.fine > fb.hit) {
        risk.confidence = "low";
        risk.why = `${risk.why} ${developers(fb.fine)} who did this upgrade reported it did not affect them.`;
      }
    }

    // A warning developers confirmed must not disappear just because the
    // model left it out of this particular answer.
    for (const [key, t] of Object.entries(tally)) {
      const n = Number(key);
      if (shown.has(n) || t.hit <= t.fine) continue;
      const issue = lookup(n);
      if (!issue) continue;
      shown.add(n);
      const source: Source = { repo: issue.repo, number: issue.number, url: issue.url, title: issue.title };
      out.push({
        id: idFor(source),
        title: issue.title,
        status: issue.state === "open" ? "open" : "fixed",
        fixed_in: null,
        confidence: "high",
        why: `Confirmed by ${developers(t.hit)} who did this upgrade.`,
        sources: [source],
        feedback: { ...t },
        from_feedback: true,
      });
    }

    // Confirmed first, then by confidence, and anything developers said did
    // not happen to them last.
    const group = (r: Risk) =>
      r.feedback.hit > r.feedback.fine ? 0 : r.feedback.fine > r.feedback.hit ? 2 : 1;
    out.sort((a, b) => group(a) - group(b) || RANK[a.confidence] - RANK[b.confidence]);

    const confirmed = out.filter((r) => r.feedback.hit > r.feedback.fine).length;
    const cleared = out.filter((r) => r.feedback.fine > r.feedback.hit).length;
    if (confirmed + cleared > 0) {
      memory_events.push({
        type: "reflect",
        note: `applied developer reports: ${confirmed} warning${confirmed === 1 ? "" : "s"} confirmed, ${cleared} marked as did not happen`,
        at: new Date().toISOString(),
      });
    }

    if (droppedTotal > 0) {
      memory_events.push({
        type: "reflect",
        note: `dropped ${droppedTotal} citation${droppedTotal === 1 ? "" : "s"} not present in the ${TOTAL_ISSUES}-issue snapshot`,
        at: new Date().toISOString(),
      });
    }

    if (scope.coverageNote) {
      memory_events.push({
        type: "reflect",
        note: `coverage check: the stack names Next.js versions outside the snapshot, so the answer says so instead of pretending`,
        at: new Date().toISOString(),
      });
    }

    const open = out.filter((v) => v.status === "open").length;
    const fixed = out.length - open;

    return NextResponse.json({
      query: stack,
      library: library || undefined,
      from_version: fromVersion || undefined,
      to_version: toVersion || undefined,
      memory: true,
      // Same shape as /api/baseline, so the two can be compared directly.
      // Counts only what the model cited, not warnings added from reports.
      citations: {
        total: modelCitations + droppedTotal,
        verified: modelCitations,
      },
      summary:
        (out.length === 0
          ? "Nothing in memory matches that stack yet."
          : `${out.length} known breakage${out.length === 1 ? "" : "s"} for this combination. ${fixed} fixed, ${open} still open.` +
            (confirmed ? ` ${confirmed} confirmed by developers who did this upgrade.` : "")) +
        (scope.coverageNote ? ` ${scope.coverageNote}` : ""),
      model_summary: summary,
      corpus_size: TOTAL_ISSUES,
      risks: out,
      playbook,
      memory_events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * A library learned on demand. Citations are checked against the issues
 * actually fetched for that library, so a number from another repository is
 * dropped instead of being linked to the wrong issue.
 */
async function briefForStack(s: Stack, stack: string) {
  try {
    const [fetched, { summary, risks, events, tally }] = await Promise.all([
      fetchIssues(s),
      reflectStackRisks(stackTag(s), s.label, stack),
    ]);
    const known = new Map(fetched.map((i) => [i.number, i]));
    const memory_events: MemoryEvent[] = [...events];

    // First time anyone asks about this library: learn it now, and say so.
    const recalledCount = events.find((e) => e.type === "recall")?.hits ?? 0;
    if (recalledCount === 0 && risks.length === 0) {
      if (fetched.length === 0) {
        return NextResponse.json({ error: `GitHub returned no issues for ${s.repo}. Check the owner/repo name.` }, { status: 404 });
      }
      const learned = await retainStackIssues(stackTag(s), s.label, fetched);
      return NextResponse.json({
        query: stack,
        memory: true,
        stack: { slug: s.slug, label: s.label, repo: s.repo },
        citations: { total: 0, verified: 0 },
        summary:
          `New library: learned ${fetched.length} real issues from github.com/${s.repo} just now. ` +
          `Hindsight is processing them. Press the button again in about a minute for the briefing.`,
        model_summary: null,
        corpus_size: fetched.length,
        risks: [],
        playbook: null,
        memory_events: [
          ...memory_events,
          { type: "recall", hits: fetched.length, note: `fetched ${fetched.length} real issues from github.com/${s.repo}`, at: new Date().toISOString() },
          learned,
        ],
      });
    }

    const out: Risk[] = [];
    const shown = new Set<number>();
    let dropped = 0;
    let cited = 0;
    for (const r of risks) {
      const sources: Source[] = [];
      for (const n of r.issue_numbers ?? []) {
        const i = known.get(Number(n));
        if (!i) { dropped++; continue; }
        if (!sources.some((x) => x.number === i.number)) sources.push({ repo: i.repo, number: i.number, url: i.url, title: i.title });
      }
      if (sources.length === 0 || sources.every((x) => shown.has(x.number))) continue;
      sources.forEach((x) => shown.add(x.number));
      cited += sources.length;
      const open = sources.some((x) => known.get(x.number)?.state === "open");
      const fb = { hit: 0, fine: 0 };
      for (const x of sources) {
        const t = tally[x.number];
        if (t) { fb.hit += t.hit; fb.fine += t.fine; }
      }
      let why = r.why;
      let confidence = r.confidence ?? "medium";
      if (fb.hit > fb.fine) { confidence = "high"; why = `${why} Confirmed by ${developers(fb.hit)} who did this upgrade.`; }
      else if (fb.fine > fb.hit) { confidence = "low"; why = `${why} ${developers(fb.fine)} who did this upgrade reported it did not affect them.`; }
      out.push({ id: idFor(sources[0]), title: r.title, status: open ? "open" : "fixed", fixed_in: null, confidence, why, sources, feedback: fb });
    }
    const group = (r: Risk) => (r.feedback.hit > r.feedback.fine ? 0 : r.feedback.fine > r.feedback.hit ? 2 : 1);
    out.sort((a, b) => group(a) - group(b) || RANK[a.confidence] - RANK[b.confidence]);

    if (dropped > 0) {
      memory_events.push({
        type: "reflect",
        note: `dropped ${dropped} citation${dropped === 1 ? "" : "s"} not among the ${fetched.length} real ${s.label} issues`,
        at: new Date().toISOString(),
      });
    }
    const open = out.filter((v) => v.status === "open").length;
    const confirmed = out.filter((r) => r.feedback.hit > r.feedback.fine).length;
    return NextResponse.json({
      query: stack,
      memory: true,
      stack: { slug: s.slug, label: s.label, repo: s.repo },
      citations: { total: cited + dropped, verified: cited },
      summary:
        out.length === 0
          ? `Memory doesn't hold enough about ${s.label} yet. Learn it first, then ask again in a minute.`
          : `${out.length} known breakage${out.length === 1 ? "" : "s"} for ${s.label}. ${out.length - open} fixed, ${open} still open.` +
            (confirmed ? ` ${confirmed} confirmed by developers who did this upgrade.` : ""),
      model_summary: summary,
      corpus_size: fetched.length,
      risks: out,
      playbook: null,
      memory_events,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 502 });
  }
}
