"""The papers table: deny-all in this slice, until Likith writes its policy by hand.

The isolation tests pass today because deny-all satisfies them. The access tests below them
are xfail(strict=True): they fail today, and once the policy is right they pass, at which point
strict mode fails the run until the markers are removed. That is the signal to delete them.
"""

from __future__ import annotations

import uuid

import ids
import pytest
from supa import Session

PAPERS_POLICY_PENDING = pytest.mark.xfail(
    strict=True,
    reason=(
        "Slice 0.3: the papers RLS policy is written by hand by Likith and is deny-all until "
        "then. Remove this marker once the policy is in place and the test passes."
    ),
)


def _paper_row(collection: str) -> dict[str, str | int]:
    return {
        "collection_id": collection,
        "storage_path": f"test/{uuid.uuid4()}.pdf",
        "original_filename": "new.pdf",
        "file_size_bytes": 1000,
    }


# ── isolation: must pass now ───────────────────────────────────────────────────────────────
@pytest.mark.parametrize(("attacker", "victim"), [("B", "A"), ("A", "B")])
def test_user_cannot_reach_another_users_papers(
    attacker: str, victim: str, user_a: Session, user_b: Session
) -> None:
    session = {"A": user_a, "B": user_b}[attacker]
    key = {"id": {"A": ids.A, "B": ids.B}[victim].paper}
    assert session.select("papers", key).rows == []
    assert session.update("papers", key, {"title": "changed"}).affected == 0
    assert session.delete("papers", key).affected == 0


@pytest.mark.parametrize("owner", [ids.A, ids.B], ids=["A", "B"])
def test_anonymous_cannot_reach_users_papers(owner: ids.Owned, anon: Session) -> None:
    key = {"id": owner.paper}
    assert anon.select("papers", key).rows == []
    assert anon.update("papers", key, {"title": "changed"}).affected == 0
    assert anon.delete("papers", key).affected == 0
    result = anon.insert("papers", _paper_row(owner.collection))
    assert (result.status, result.code) == (403, "42501")


@pytest.mark.parametrize("collection", [ids.B.collection, ids.DEMO_COLLECTION], ids=["B", "demo"])
def test_user_cannot_add_papers_to_another_collection(collection: str, user_a: Session) -> None:
    result = user_a.insert("papers", _paper_row(collection))
    assert (result.status, result.code) == (403, "42501")


def test_no_session_cannot_reach_papers(nobody: Session) -> None:
    assert nobody.select("papers").status == 401


# ── access: xfail until the policy exists ──────────────────────────────────────────────────
@PAPERS_POLICY_PENDING
def test_owner_selects_own_paper(user_a: Session) -> None:
    assert len(user_a.select("papers", {"id": ids.A.paper}).rows) == 1


@PAPERS_POLICY_PENDING
def test_owner_inserts_a_paper_into_own_collection(user_a: Session) -> None:
    result = user_a.insert("papers", _paper_row(ids.A.collection))
    assert result.status == 201


@PAPERS_POLICY_PENDING
def test_owner_updates_own_paper(user_a: Session) -> None:
    assert user_a.update("papers", {"id": ids.A.paper}, {"title": "Paper A"}).affected == 1


@PAPERS_POLICY_PENDING
def test_signed_in_user_reads_demo_papers(user_a: Session) -> None:
    """D21: the demo is readable by every session."""
    assert len(user_a.select("papers", {"id": ids.DEMO.paper}).rows) == 1


@PAPERS_POLICY_PENDING
def test_anonymous_reads_demo_papers(anon: Session) -> None:
    """D8: the anonymous demo session reads the demo collection, papers included."""
    assert len(anon.select("papers", {"id": ids.DEMO.paper}).rows) == 1
