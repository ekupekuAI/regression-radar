"""
Regression Radar - Step 2: Load into Hindsight.

We do NOT hand-assign memory types. We hand retain() clean, well-structured
content and let Hindsight's own extraction decide world vs experience facts,
and let it consolidate observations on its own. We curate only the mission.

Setup:
    pip install hindsight-client
    set HINDSIGHT_API_URL=https://...      your Cloud endpoint
    set HINDSIGHT_API_KEY=...              your Cloud key

Run:
    python load_to_hindsight.py init                  create the bank
    python load_to_hindsight.py load                  push raw_issues.jsonl
    python load_to_hindsight.py brief "Next.js 14.1 -> 14.2, app router + Prisma"
    python load_to_hindsight.py learn "middleware did not break, hydration did"
    python load_to_hindsight.py reset-feedback        dry run: list recorded outcomes
    python load_to_hindsight.py reset-feedback --yes  delete them - run before recording the demo
"""

import json
import os
import sys

from hindsight_client import Hindsight

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def load_dotenv(path=".env"):
    """Read .env into the environment so the Hindsight URL and key are picked
    up without having to export them in every new shell."""
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

BANK_ID = "regression-radar-next-prisma"
RAW_PATH = "raw_issues.jsonl"

# Intell girl owns this text. It decides whether brief() cites real issue
# numbers or waffles. Set at create_bank time, so get it right first.
MISSION = (
    "You are a strict software regression tracker for Next.js and Prisma "
    "upgrades. You only report breakages that real bug reports support. "
    "Always answer as a numbered list. Tag every item FIXED or OPEN, and "
    "cite the source issue number for each one. If you are unsure whether "
    "something applies to the user's stack, say so explicitly rather than "
    "guessing. Never invent an issue number."
)

DISPOSITION = {"skepticism": 5, "literalism": 5, "empathy": 2}

# FIX 2: api_key was never passed. Cloud rejects unauthenticated calls.
client = Hindsight(
    base_url=os.environ.get("HINDSIGHT_API_URL", "http://localhost:8888"),
    api_key=os.environ.get("HINDSIGHT_API_KEY") or None,
    timeout=60.0,
)


def init():
    """FIX 1: the bank must exist before retain(). This was missing entirely."""
    try:
        client.create_bank(
            bank_id=BANK_ID,
            name="Regression Radar",
            mission=MISSION,
            disposition=DISPOSITION,
        )
        print(f"Created bank '{BANK_ID}'.")
    except Exception as e:
        print(f"create_bank said: {e}")
        print("If it already exists, that is fine - carry on to load.")


def issue_to_content(record):
    status = (
        f"Status: CLOSED (resolved) on {record['closed_at']}"
        if record["state"] == "closed"
        else "Status: OPEN (unresolved as of last check)"
    )
    resolution = ""
    if record["top_comments"]:
        joined = "\n---\n".join(c[:800] for c in record["top_comments"] if c.strip())
        if joined:
            resolution = f"\n\nDiscussion and possible resolution:\n{joined}"
    return (
        f"[{record['tag']}] GitHub issue #{record['number']} in {record['repo']}: "
        f"\"{record['title']}\"\n"
        f"{status}\n"
        f"Labels: {', '.join(record['labels']) or 'none'}\n"
        f"Source: {record['html_url']}\n\n"
        f"Report body:\n{record['body'][:2000]}"
        f"{resolution}"
    )


def load():
    if not os.path.exists(RAW_PATH):
        print(f"{RAW_PATH} not found - run fetch_bug_reports.py first.")
        sys.exit(1)

    ok = fail = 0
    with open(RAW_PATH, encoding="utf-8") as f:
        for line in f:
            record = json.loads(line)
            try:
                # retain_async keeps the bulk load fast; extraction runs
                # server-side afterwards.
                client.retain(
                    bank_id=BANK_ID,
                    content=issue_to_content(record),
                    document_id=f"{record['repo']}#{record['number']}",
                    metadata={"tag": record["tag"], "state": record["state"]},
                    retain_async=True,
                )
                ok += 1
                print(f"retained #{record['number']} ({record['tag']})")
            except Exception as e:
                fail += 1
                print(f"! failed #{record['number']}: {e}")

    print(f"\nRetained {ok} issues, {fail} failed, into bank '{BANK_ID}'.")
    print("Wait a minute for consolidation (facts -> observations) before querying.")


def brief(stack):
    """The demo moment. Test this BEFORE building any UI."""
    query = (
        f"A developer is about to do this upgrade: {stack}. "
        f"Based only on real bug reports you remember, what specifically is "
        f"likely to break for this stack? For each item say FIXED or OPEN and "
        f"cite the source issue number."
    )
    answer = client.reflect(bank_id=BANK_ID, query=query, budget="high")
    print(getattr(answer, "text", answer))


def reset_feedback(confirm):
    """Remove every document that is not part of the committed snapshot - all
    recorded upgrade outcomes and any test data - leaving the 98 real issues.

    Run it right before recording the demo, so the before/after starts from a
    memory nobody has given feedback to yet. Dry run unless --yes is passed.
    """
    import asyncio

    with open(RAW_PATH, encoding="utf-8") as f:
        snapshot = {
            f"{r['repo']}#{r['number']}"
            for r in (json.loads(line) for line in f if line.strip())
        }

    async def run():
        ids, offset = [], 0
        while True:
            resp = await client.documents.list_documents(
                bank_id=BANK_ID, q=None, limit=200, offset=offset
            )
            d = resp.to_dict() if hasattr(resp, "to_dict") else dict(resp)
            items = d.get("items") or []
            ids += [it.get("id") or it.get("document_id") for it in items]
            if len(items) < 200:
                break
            offset += 200

        extra = [i for i in ids if i and i not in snapshot]
        print(f"{len(ids)} documents: {len(ids) - len(extra)} from the snapshot, "
              f"{len(extra)} recorded outcomes or test data.")
        for i in extra:
            print("  ", i)
        if not extra:
            return
        if not confirm:
            print("\nDry run - nothing deleted. Re-run with --yes to delete these.")
            return
        for i in extra:
            await client.documents.delete_document(bank_id=BANK_ID, document_id=i)
            print("deleted", i)

    asyncio.run(run())


def learn(outcome):
    """Feeds the real outcome back in. This is the 'gets better over time' part."""
    client.retain(
        bank_id=BANK_ID,
        content=(
            f"[user-reported-outcome] A developer who followed our upgrade brief "
            f"reported this actual result: {outcome}"
        ),
    )
    print("Recorded. The next brief() should reflect this.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    cmd, rest = sys.argv[1], " ".join(sys.argv[2:])
    if cmd == "init":
        init()
    elif cmd == "load":
        load()
    elif cmd == "brief":
        brief(rest)
    elif cmd == "learn":
        learn(rest)
    elif cmd == "reset-feedback":
        reset_feedback("--yes" in sys.argv[2:])
    else:
        print(f"Unknown command: {cmd}")
