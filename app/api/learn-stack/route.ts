import { NextResponse } from "next/server";
import { retainStackIssues } from "@/lib/hindsight";
import { EXAMPLES, PRESETS, detectStack, fetchIssues, stackTag } from "@/lib/stacks";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The libraries offered as one-click choices. */
export async function GET() {
  return NextResponse.json({
    stacks: PRESETS.map((p) => ({ slug: p.slug, label: p.label, repo: p.repo })),
    github_token: Boolean(process.env.GITHUB_TOKEN),
  });
}

/**
 * Learn a library on demand: fetch its real GitHub issues and save them into
 * memory under its own tag. Body: { stack } - free text such as
 * "Pydantic v1 to v2", or any "owner/repo".
 */
export async function POST(req: Request) {
  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.stack === "string" ? body.stack.trim().slice(0, 200) : "";
  } catch {
    return NextResponse.json({ error: "Send JSON with a 'stack' field." }, { status: 400 });
  }
  const stack = detectStack(text);
  if (!stack) {
    return NextResponse.json(
      { error: `Name a library we can learn, such as ${EXAMPLES}, or any GitHub repo as owner/repo.` },
      { status: 400 }
    );
  }
  try {
    const issues = await fetchIssues(stack);
    if (issues.length === 0) {
      return NextResponse.json({ error: `GitHub returned no issues for ${stack.repo}.` }, { status: 404 });
    }
    const event = await retainStackIssues(stackTag(stack), stack.label, issues);
    const open = issues.filter((i) => i.state === "open").length;
    return NextResponse.json({
      stack: { slug: stack.slug, label: stack.label, repo: stack.repo },
      learned: issues.length,
      open,
      closed: issues.length - open,
      memory_events: [
        { type: "recall", hits: issues.length, note: `fetched ${issues.length} real issues from github.com/${stack.repo}`, at: new Date().toISOString() },
        event,
      ],
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 502 });
  }
}
