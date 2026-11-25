"""Fixed ids of the rows created by supabase/seed.sql. Keep the two files in step."""

from __future__ import annotations

from dataclasses import dataclass

PASSWORD = "local-test-password"  # local and CI databases only; see supabase/seed.sql

DEMO_COLLECTION = "00000000-0000-0000-0000-0000000000de"
DEMO_ANSWER = "70000000-0000-0000-0000-000000000001"
EVAL_RUN = "80000000-0000-0000-0000-000000000001"
USAGE_DAY = "2026-01-01"
A_USER = "00000000-0000-0000-0000-00000000000a"
B_USER = "00000000-0000-0000-0000-00000000000b"


@dataclass(frozen=True)
class Owned:
    """The ids of one owner's rows: user A, user B, or the demo collection."""

    user: str | None
    email: str | None
    collection: str
    paper: str
    chunk: str
    paper_card: str
    relevance: str
    gap_check: str
    message: str


def _owned(suffix: str, user: str | None, email: str | None, collection: str) -> Owned:
    tail = f"0000-0000-0000-{suffix:0>12}"
    return Owned(
        user=user,
        email=email,
        collection=collection,
        paper=f"10000000-{tail}",
        chunk=f"20000000-{tail}",
        paper_card=f"30000000-{tail}",
        relevance=f"40000000-{tail}",
        gap_check=f"50000000-{tail}",
        message=f"60000000-{tail}",
    )


A = _owned(
    "a",
    user=A_USER,
    email="user-a@litlens.test",
    collection="c0000000-0000-0000-0000-00000000000a",
)
B = _owned(
    "b",
    user=B_USER,
    email="user-b@litlens.test",
    collection="c0000000-0000-0000-0000-00000000000b",
)
DEMO = _owned("d", user=None, email=None, collection=DEMO_COLLECTION)
