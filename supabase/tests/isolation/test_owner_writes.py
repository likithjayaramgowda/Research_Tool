"""What a signed-in user may and may not write in their own workspace.

Isolation tests alone pass against a deny-all table, so these prove the policies actually let
owners do their job, and mark where the owner's rights stop (worker-only tables, the demo).
"""

from __future__ import annotations

import uuid
from typing import Any

import ids
import pytest
from supa import Session


def _new_id() -> str:
    return str(uuid.uuid4())


# ── collections ────────────────────────────────────────────────────────────────────────────
def test_owner_creates_renames_and_deletes_a_collection(user_a: Session) -> None:
    key = {"id": _new_id()}
    created = user_a.insert("collections", {**key, "owner_id": ids.A_USER, "name": "New"})
    assert created.status == 201
    assert user_a.update("collections", key, {"name": "Renamed"}).affected == 1
    assert user_a.select("collections", key).rows[0]["name"] == "Renamed"
    assert user_a.delete("collections", key).affected == 1


@pytest.mark.parametrize(
    "row",
    [
        {"owner_id": ids.B_USER, "name": "for B"},
        {"owner_id": ids.A_USER, "name": "second demo", "is_demo": True},
    ],
    ids=["for-another-user", "as-demo"],
)
def test_owner_cannot_create_a_collection_for_someone_else_or_as_demo(
    row: dict[str, Any], user_a: Session
) -> None:
    result = user_a.insert("collections", row)
    assert (result.status, result.code) == (403, "42501")


@pytest.mark.parametrize(
    "change",
    [{"owner_id": ids.B_USER}, {"is_demo": True}],
    ids=["hand-to-B", "make-demo"],
)
def test_owner_cannot_give_away_or_demo_their_collection(
    change: dict[str, Any], user_a: Session
) -> None:
    result = user_a.update("collections", {"id": ids.A.collection}, change)
    assert (result.status, result.code) == (403, "42501")
    (row,) = user_a.select("collections", {"id": ids.A.collection}).rows
    assert (row["owner_id"], row["is_demo"]) == (ids.A_USER, False)


# ── messages ───────────────────────────────────────────────────────────────────────────────
def test_owner_adds_and_deletes_a_message(user_a: Session) -> None:
    key = {"id": _new_id()}
    row = {**key, "collection_id": ids.A.collection, "role": "user", "content": "Hi"}
    assert user_a.insert("messages", row).status == 201
    assert len(user_a.select("messages", key).rows) == 1
    assert user_a.delete("messages", key).affected == 1


def test_owner_cannot_edit_a_message(user_a: Session) -> None:
    assert user_a.update("messages", {"id": ids.A.message}, {"content": "edited"}).affected == 0


@pytest.mark.parametrize("collection", [ids.B.collection, ids.DEMO_COLLECTION], ids=["B", "demo"])
def test_owner_cannot_post_into_another_collection(collection: str, user_a: Session) -> None:
    row = {"collection_id": collection, "role": "user", "content": "planted"}
    result = user_a.insert("messages", row)
    assert (result.status, result.code) == (403, "42501")


# ── gap checks ─────────────────────────────────────────────────────────────────────────────
def _gap_check(collection: str, **extra: Any) -> dict[str, Any]:
    return {
        "id": _new_id(),
        "collection_id": collection,
        "idea": "my idea",
        "model": "m",
        "prompt_version": "p",
        **extra,
    }


def test_owner_queues_and_deletes_a_gap_check(user_a: Session) -> None:
    row = _gap_check(ids.A.collection)
    assert user_a.insert("gap_checks", row).status == 201
    (stored,) = user_a.select("gap_checks", {"id": row["id"]}).rows
    assert (stored["status"], stored["progress"], stored["result"]) == ("queued", 0, None)
    assert user_a.delete("gap_checks", {"id": row["id"]}).affected == 1


def test_owner_cannot_insert_a_finished_gap_check(user_a: Session) -> None:
    row = _gap_check(ids.A.collection, status="done", progress=100, result={"verdict": "fake"})
    result = user_a.insert("gap_checks", row)
    assert (result.status, result.code) == (403, "42501")


def test_owner_cannot_update_a_gap_check(user_a: Session) -> None:
    """Status, progress and result belong to the worker."""
    key = {"id": ids.A.gap_check}
    assert user_a.update("gap_checks", key, {"status": "failed"}).affected == 0


@pytest.mark.parametrize("collection", [ids.B.collection, ids.DEMO_COLLECTION], ids=["B", "demo"])
def test_owner_cannot_queue_a_gap_check_elsewhere(collection: str, user_a: Session) -> None:
    result = user_a.insert("gap_checks", _gap_check(collection))
    assert (result.status, result.code) == (403, "42501")


# ── profiles ───────────────────────────────────────────────────────────────────────────────
def test_owner_updates_own_profile_settings(user_a: Session) -> None:
    key = {"id": ids.A_USER}
    assert user_a.update("profiles", key, {"citation_style": "ieee"}).affected == 1
    assert user_a.select("profiles", key).rows[0]["citation_style"] == "ieee"
    assert user_a.update("profiles", key, {"citation_style": "apa"}).affected == 1


@pytest.mark.parametrize("column", ["created_at", "last_active_at"])
def test_owner_cannot_rewrite_profile_bookkeeping(column: str, user_a: Session) -> None:
    """Only display_name and citation_style are the user's to set. last_active_at is set by
    record_usage (D22), so a user cannot push it into the future to dodge the D9 clean-up."""
    result = user_a.update("profiles", {"id": ids.A_USER}, {column: "2099-01-01T00:00:00Z"})
    assert (result.status, result.code) == (403, "42501")


def test_users_cannot_create_profiles(user_a: Session) -> None:
    result = user_a.insert("profiles", {"id": ids.A_USER})
    assert (result.status, result.code) == (403, "42501")


# ── worker-only tables ─────────────────────────────────────────────────────────────────────
WORKER_ONLY_ROWS: dict[str, tuple[dict[str, str], dict[str, Any], dict[str, Any]]] = {
    # table: (key of A's own row, an update to try, a new row to try inserting)
    "chunks": (
        {"id": ids.A.chunk},
        {"text": "edited"},
        {
            "paper_id": ids.A.paper,
            "ordinal": 50,
            "page_start": 1,
            "page_end": 1,
            "text": "x",
            "chunker_version": "x",
        },
    ),
    "paper_cards": (
        {"id": ids.A.paper_card},
        {"question": "edited"},
        {"paper_id": ids.A.paper, "model": "x", "prompt_version": "x"},
    ),
    "relevance": (
        {"id": ids.A.relevance},
        {"verdict": "not-relevant"},
        {
            "paper_id": ids.A.paper,
            "topic": "x",
            "verdict": "relevant",
            "reason": "x",
            "model": "x",
            "prompt_version": "x",
        },
    ),
    "usage_daily": (
        {"user_id": ids.A_USER, "day": ids.USAGE_DAY},
        {"questions": 0},
        {"user_id": ids.A_USER, "day": "2026-03-03"},
    ),
}


@pytest.mark.parametrize("table", list(WORKER_ONLY_ROWS))
def test_owner_cannot_write_worker_only_tables(table: str, user_a: Session) -> None:
    """Generated results and usage counters are written only by the service role."""
    key, change, new_row = WORKER_ONLY_ROWS[table]
    inserted = user_a.insert(table, new_row)
    assert (inserted.status, inserted.code) == (403, "42501")
    assert user_a.update(table, key, change).affected == 0
    assert user_a.delete(table, key).affected == 0
    assert len(user_a.select(table, key).rows) == 1
