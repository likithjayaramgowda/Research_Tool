"""Anonymous demo sessions (D8) and the demo collection (D21).

An anonymous session has the same database role as a real user (`authenticated`); only the
`is_anonymous` claim in its JWT tells them apart. It may read the demo collection's rows and
demo_answers, and nothing else, and it may write nothing anywhere.
"""

from __future__ import annotations

import uuid
from typing import Any

import ids
import pytest
from supa import Session
from tables import DEMO, OWNED, Table

DEMO_ANSWERS = Table("demo_answers", lambda _: {"id": ids.DEMO_ANSWER}, {"question": "changed"})
EVAL_RUNS = Table("eval_runs", lambda _: {"id": ids.EVAL_RUN}, {"notes": "changed"})
DEMO_READABLE = [*DEMO, DEMO_ANSWERS]


# ── reading the demo ───────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("table", DEMO_READABLE, ids=str)
def test_anonymous_reads_the_demo(table: Table, anon: Session) -> None:
    result = anon.select(table.name, table.key(ids.DEMO))
    assert result.status == 200
    assert len(result.rows) == 1


@pytest.mark.parametrize("table", DEMO_READABLE, ids=str)
def test_signed_in_user_reads_the_demo_too(table: Table, user_a: Session) -> None:
    """D21: a new user with an empty library can still see what the app does."""
    result = user_a.select(table.name, table.key(ids.DEMO))
    assert result.status == 200
    assert len(result.rows) == 1


def test_anonymous_sees_only_the_demo_collection(anon: Session) -> None:
    rows = anon.select("collections").rows
    assert [row["id"] for row in rows] == [ids.DEMO_COLLECTION]


# ── reading users' data ────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("owner", [ids.A, ids.B], ids=["A", "B"])
@pytest.mark.parametrize("table", OWNED, ids=str)
def test_anonymous_cannot_read_users_rows(table: Table, owner: ids.Owned, anon: Session) -> None:
    result = anon.select(table.name, table.key(owner))
    assert result.status == 200
    assert result.rows == []


def test_anonymous_has_no_profile(anon: Session) -> None:
    assert anon.select("profiles", {"id": anon.user_id}).rows == []


# ── writing anything ───────────────────────────────────────────────────────────────────────
def _insert_attempts(anon: Session) -> dict[str, dict[str, Any]]:
    """For every table, a row that would be valid apart from RLS, aimed at A's or demo data."""
    return {
        "profiles": {"id": anon.user_id},
        "collections": {"owner_id": ids.A_USER, "name": "planted"},
        "papers": {
            "collection_id": ids.DEMO_COLLECTION,
            "storage_path": f"demo/{uuid.uuid4()}.pdf",
            "original_filename": "x.pdf",
            "file_size_bytes": 1,
        },
        "chunks": {
            "paper_id": ids.DEMO.paper,
            "ordinal": 99,
            "page_start": 1,
            "page_end": 1,
            "text": "planted",
            "chunker_version": "x",
        },
        "paper_cards": {"paper_id": ids.A.paper, "model": "x", "prompt_version": "x"},
        "relevance": {
            "paper_id": ids.A.paper,
            "topic": "x",
            "verdict": "relevant",
            "reason": "x",
            "model": "x",
            "prompt_version": "x",
        },
        "gap_checks": {
            "collection_id": ids.DEMO_COLLECTION,
            "idea": "planted",
            "model": "x",
            "prompt_version": "x",
        },
        "messages": {"collection_id": ids.DEMO_COLLECTION, "role": "user", "content": "planted"},
        # Its own usage row: anonymous sessions are metered, but only the service role counts.
        "usage_daily": {"user_id": anon.user_id, "day": "2026-02-02", "questions": 0},
        "demo_answers": {
            "position": 99,
            "question": "planted",
            "answer": [],
            "model": "x",
            "prompt_version": "x",
        },
        "eval_runs": {
            "git_sha": "x",
            "dataset": "x",
            "model": "x",
            "prompt_version": "x",
            "metrics": {},
        },
    }


@pytest.mark.parametrize(
    "table",
    [
        "profiles",
        "collections",
        "papers",
        "chunks",
        "paper_cards",
        "relevance",
        "gap_checks",
        "messages",
        "usage_daily",
        "demo_answers",
        "eval_runs",
    ],
)
def test_anonymous_cannot_insert(table: str, anon: Session) -> None:
    result = anon.insert(table, _insert_attempts(anon)[table])
    assert (result.status, result.code) == (403, "42501")


@pytest.mark.parametrize("table", [*DEMO_READABLE, EVAL_RUNS], ids=str)
def test_anonymous_cannot_update_or_delete_demo_rows(table: Table, anon: Session) -> None:
    key = table.key(ids.DEMO)
    assert anon.update(table.name, key, table.change).affected == 0
    assert anon.delete(table.name, key).affected == 0
    (row,) = anon.select(table.name, key).rows
    for column, attempted in table.change.items():
        assert row[column] != attempted


@pytest.mark.parametrize("owner", [ids.A, ids.B], ids=["A", "B"])
@pytest.mark.parametrize("table", OWNED, ids=str)
def test_anonymous_cannot_update_or_delete_users_rows(
    table: Table, owner: ids.Owned, anon: Session
) -> None:
    key = table.key(owner)
    assert (anon.update(table.name, key, table.change).affected) == 0
    assert (anon.delete(table.name, key).affected) == 0


# ── signed-in users and the demo ───────────────────────────────────────────────────────────
@pytest.mark.parametrize("table", [*DEMO_READABLE, EVAL_RUNS], ids=str)
def test_signed_in_user_cannot_change_demo_rows(table: Table, user_a: Session) -> None:
    """Only the service role writes the demo (D21)."""
    key = table.key(ids.DEMO)
    assert user_a.update(table.name, key, table.change).affected == 0
    assert user_a.delete(table.name, key).affected == 0
