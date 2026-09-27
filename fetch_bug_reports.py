"""
Regression Radar - Step 1: Fetch real GitHub issues.

Scope is locked: Next.js + Prisma only.

Setup:
    set GITHUB_TOKEN=ghp_xxx        (Windows cmd)
    $env:GITHUB_TOKEN="ghp_xxx"    (PowerShell)
    export GITHUB_TOKEN=ghp_xxx    (bash)

Run:
    python fetch_bug_reports.py
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# FIX 5: Windows consoles default to cp1252 and crash on emoji / non-ASCII
# issue titles. Force UTF-8 with replacement so printing can never kill a run.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def load_dotenv(path=".env"):
    """Read .env into the environment. Without this, putting the token in .env
    does nothing and the run crawls along at the 60 requests/hour
    unauthenticated limit instead of 5,000."""
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if v and not os.environ.get(k.strip()):
                    os.environ[k.strip()] = v
    except FileNotFoundError:
        pass


load_dotenv()
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# FIX 3: every query carries `is:issue` so pull requests stay out of the
# dataset. GitHub's search/issues endpoint returns BOTH by default.
SEARCHES = [
    ("vercel/next.js", '"app router" 14.2', "next-14.1-to-14.2"),
    ("vercel/next.js", "hydration 14.2", "next-14.1-to-14.2"),
    ("vercel/next.js", "caching 14.2", "next-14.1-to-14.2"),
    ("vercel/next.js", "fetch 14.2", "next-14.1-to-14.2"),
    ("vercel/next.js", "revalidate 14.2", "next-14.1-to-14.2"),
    ("vercel/next.js", "middleware 14.2", "next-14.1-to-14.2"),
    ("vercel/next.js", "server action 14.2", "next-14.1-to-14.2"),
    ("vercel/next.js", "build error 14.2", "next-14.1-to-14.2"),
    # NOTE: the repo is prisma/orm, NOT prisma/prisma. Prisma renamed it, and
    # GitHub's search `repo:` qualifier does not follow the redirect - every
    # prisma/prisma query fails with HTTP 422 "repositories cannot be searched".
    ("prisma/orm", '"app router"', "prisma-nextjs-app-router"),
    ("prisma/orm", "edge runtime", "prisma-nextjs-app-router"),
    ("prisma/orm", "next.js", "prisma-nextjs-app-router"),
    ("prisma/orm", "connection pool serverless", "prisma-nextjs-app-router"),
]

MAX_ISSUES_PER_SEARCH = 25
OUT_PATH = "raw_issues.jsonl"


def gh_get(url, retries=2):
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "regression-radar",
            **({"Authorization": f"Bearer {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            remaining = resp.headers.get("X-RateLimit-Remaining")
            if remaining is not None and int(remaining) < 3:
                reset = int(resp.headers.get("X-RateLimit-Reset", 0))
                wait = min(max(0, reset - time.time()) + 1, 120)
                print(f"  (near rate limit, sleeping {wait:.0f}s)")
                time.sleep(wait)
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (403, 429) and retries > 0:
            reset = e.headers.get("X-RateLimit-Reset")
            wait = min((max(0, int(reset) - time.time()) + 1) if reset else 60, 120)
            print(f"  rate limited, sleeping {wait:.0f}s then retrying")
            time.sleep(wait)
            return gh_get(url, retries - 1)
        raise


def clean_body(text):
    if not text:
        return ""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)   # issue-template boilerplate
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)               # images add no signal
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main():
    if not GITHUB_TOKEN:
        print("WARNING: no GITHUB_TOKEN found in the environment or in .env.")
        print("         You get 60 requests/hour and this will crawl.")
        print("         Put GITHUB_TOKEN=... in .env, then re-run.\n")
    else:
        print(f"Using GitHub token (length {len(GITHUB_TOKEN)}). 5,000 req/hour.\n")

    records, seen = [], set()
    # Written as we go, not at the end, so an interrupted run keeps its work.
    out = open(OUT_PATH, "w", encoding="utf-8")

    for repo, query, tag in SEARCHES:
        # created:>2024-01-01 because Next.js 14.2 shipped in April 2024. The
        # first run pulled Prisma issues from 2021 that had nothing to do with
        # an app-router upgrade - this cuts that noise out.
        q = urllib.parse.quote(
            f"repo:{repo} is:issue {query} in:title,body created:>2024-01-01"
        )
        # No &sort= on purpose: GitHub's default is relevance ranking. Sorting
        # by "updated" surfaced whatever was touched most recently, which is why
        # the first run came back full of Next.js 15 and 16 issues instead of
        # the 14.2 ones we actually asked for.
        url = (
            f"https://api.github.com/search/issues?q={q}"
            f"&per_page={MAX_ISSUES_PER_SEARCH}"
        )
        print(f"Searching {repo} for {query}")
        try:
            result = gh_get(url)
        except Exception as e:
            print(f"  ! search failed: {e}")
            continue

        items = result.get("items", [])
        print(f"  {len(items)} candidates (of {result.get('total_count', '?')} total)")

        for item in items:
            # FIX 3b: belt and braces - skip anything that is actually a PR.
            if item.get("pull_request"):
                continue

            key = (repo, item["number"])
            if key in seen:
                continue
            seen.add(key)

            # FIX 4: the search result already carries title, body, state,
            # labels, urls and dates. Only comments need a second call, so
            # this halves the API usage versus re-fetching each issue.
            comments = []
            try:
                time.sleep(0.2)
                comments = gh_get(
                    f"https://api.github.com/repos/{repo}/issues/{item['number']}/comments?per_page=3"
                )
            except Exception as e:
                print(f"  ! comments for #{item['number']}: {e}")

            rec = {
                "repo": repo,
                "number": item["number"],
                "title": item["title"],
                "state": item["state"],
                "labels": [l["name"] for l in item.get("labels", [])],
                "created_at": item["created_at"],
                "closed_at": item.get("closed_at"),
                "html_url": item["html_url"],
                "body": clean_body(item.get("body", "")),
                "top_comments": [clean_body(c.get("body", "")) for c in comments[:3]],
                "tag": tag,
            }
            records.append(rec)
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            out.flush()
            print(f"    + #{item['number']}: {item['title'][:70]}")

    out.close()

    closed = sum(1 for r in records if r["state"] == "closed")
    print(f"\nWrote {len(records)} real issues to {OUT_PATH}")
    print(f"  {closed} closed / {len(records) - closed} open")
    print(f"\nTHIS NUMBER IS WHAT WE QUOTE: {len(records)} real issues.")
    print("Never say 'thousands' anywhere - only the real count.")


if __name__ == "__main__":
    main()
