/**
 * Upgrades beyond the committed Next.js + Prisma snapshot. Each library's real
 * GitHub issues are fetched on demand, kept in Hindsight under their own tag,
 * and every citation is checked against the issues actually fetched for that
 * library, so an issue number from another repository can never be shown.
 */

export type Stack = {
  slug: string;
  repo: string;
  label: string;
  query: string;
};

export type FetchedIssue = {
  repo: string;
  number: number;
  title: string;
  state: "open" | "closed";
  url: string;
  body: string;
};

export const PRESETS: Stack[] = [
  {
    slug: "pydantic-v2",
    repo: "pydantic/pydantic",
    label: "Pydantic v1 to v2",
    query: "repo:pydantic/pydantic is:issue v2 migration",
  },
  {
    slug: "numpy-2",
    repo: "numpy/numpy",
    label: "NumPy 1.x to 2.0",
    query: "repo:numpy/numpy is:issue 2.0 regression",
  },
  {
    slug: "pandas-2",
    repo: "pandas-dev/pandas",
    label: "pandas 1.x to 2.0",
    query: "repo:pandas-dev/pandas is:issue 2.0 regression",
  },
];

const KEYWORDS: [RegExp, string][] = [
  [/pydantic/i, "pydantic-v2"],
  [/numpy/i, "numpy-2"],
  [/pandas/i, "pandas-2"],
];

/** The library a free-text stack names, or null when it names none we cover. */
export function detectStack(text: string): Stack | null {
  // Next.js questions keep going to the committed snapshot.
  if (/next(\.js|js)?\b|prisma/i.test(text)) return null;
  for (const [re, slug] of KEYWORDS) {
    if (re.test(text)) return PRESETS.find((p) => p.slug === slug) ?? null;
  }
  const m = text.match(/\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\b/);
  if (m) {
    const repo = `${m[1]}/${m[2]}`;
    return {
      slug: repo.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      repo,
      label: text.slice(0, 80),
      query: `repo:${repo} is:issue upgrade breaking`,
    };
  }
  return null;
}

export function stackTag(s: Stack) {
  return `stack:${s.slug}`;
}

// Warm-instance cache: a repeat question within the hour skips GitHub.
const cache = new Map<string, { at: number; issues: FetchedIssue[] }>();
const TTL = 60 * 60 * 1000;

export async function fetchIssues(s: Stack, limit = 30): Promise<FetchedIssue[]> {
  const hit = cache.get(s.slug);
  if (hit && Date.now() - hit.at < TTL) return hit.issues;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "regression-radar",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const url =
    "https://api.github.com/search/issues?" +
    new URLSearchParams({ q: s.query, per_page: String(limit), sort: "comments", order: "desc" });
  const res = await fetch(url, { headers, cache: "no-store" });
  if (res.status === 403 || res.status === 429) {
    throw new Error("GitHub is rate-limiting searches right now. Wait a minute and try again.");
  }
  if (!res.ok) throw new Error(`GitHub search failed (${res.status}).`);
  const data = await res.json();

  const issues: FetchedIssue[] = (data.items ?? [])
    .filter((it: { pull_request?: unknown }) => !it.pull_request)
    .map((it: { number: number; title: string; state: string; html_url: string; body?: string }) => ({
      repo: s.repo,
      number: it.number,
      title: it.title,
      state: it.state === "open" ? "open" : "closed",
      url: it.html_url,
      body: (it.body ?? "").replace(/\s+/g, " ").slice(0, 1500),
    }));

  cache.set(s.slug, { at: Date.now(), issues });
  return issues;
}
