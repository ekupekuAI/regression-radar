import issuesIndex from "@/data/issues-index.json";

export type Issue = {
  repo: string;
  number: number;
  title: string;
  state: "open" | "closed";
  url: string;
  closed_at: string | null;
  tag: string;
  labels: string[];
};

const ISSUES = issuesIndex as Issue[];

// Issue numbers are unique per repo, but across our two repos they do not
// collide in practice (Next.js is 59k-98k, Prisma is 7k-30k). We key on the
// number and keep the repo on the record so a citation still resolves.
const BY_NUMBER = new Map<number, Issue>(ISSUES.map((i) => [i.number, i]));

export const TOTAL_ISSUES = ISSUES.length;
export const OPEN_COUNT = ISSUES.filter((i) => i.state === "open").length;
export const CLOSED_COUNT = ISSUES.filter((i) => i.state === "closed").length;

export function lookup(number: number): Issue | undefined {
  return BY_NUMBER.get(number);
}

/**
 * The model is good at spotting which bug reports are relevant to an upgrade.
 * It is measurably bad at saying whether one is still open: it reads a user
 * writing "this is still broken" in a 2024 comment and reports OPEN even when
 * the issue was closed months later.
 *
 * We already hold that fact, so we never ask for it. The model returns issue
 * numbers; every status below is stamped from the snapshot, and any number we
 * cannot find is dropped rather than shown. A citation a reader cannot click
 * through to is worse than one fewer result.
 */
export function verifyCitations(numbers: number[]): {
  sources: { repo: string; number: number; url: string; title: string }[];
  status: "fixed" | "open";
  fixedIn: string | null;
  dropped: number[];
} {
  const found: Issue[] = [];
  const dropped: number[] = [];

  for (const n of numbers) {
    const hit = lookup(n);
    if (hit) found.push(hit);
    else dropped.push(n);
  }

  // A risk counts as still open if ANY bug report behind it is still open.
  const anyOpen = found.some((i) => i.state === "open");

  return {
    sources: found.map((i) => ({
      repo: i.repo,
      number: i.number,
      url: i.url,
      title: i.title,
    })),
    status: anyOpen ? "open" : "fixed",
    fixedIn: null,
    dropped,
  };
}
