"""No session at all (the public anon key only), and the public eval page (R14)."""

from __future__ import annotations

from typing import Any

import ids
import pytest
from supa import Session
from tables import ALL_TABLE_NAMES


def test_everyone_reads_eval_runs(nobody: Session, anon: Session, user_a: Session) -> None:
    for session in (nobody, anon, user_a):
        result = session.select("eval_runs", {"id": ids.EVAL_RUN})
        assert result.status == 200
        assert len(result.rows) == 1


@pytest.mark.parametrize("table", [name for name in ALL_TABLE_NAMES if name != "eval_runs"])
def test_no_session_reads_nothing_else(table: str, nobody: Session) -> None:
    """The `anon` role has no privilege on these tables at all, so it gets an error, not rows."""
    result = nobody.select(table)
    assert (result.status, result.code) == (401, "42501")


def test_no_session_cannot_write_eval_runs(nobody: Session) -> None:
    row: dict[str, Any] = {
        "git_sha": "x",
        "dataset": "x",
        "model": "x",
        "prompt_version": "x",
        "metrics": {},
    }
    result = nobody.insert("eval_runs", row)
    assert (result.status, result.code) == (401, "42501")


def test_signed_in_user_cannot_write_eval_runs(user_a: Session) -> None:
    row: dict[str, Any] = {
        "git_sha": "x",
        "dataset": "x",
        "model": "x",
        "prompt_version": "x",
        "metrics": {},
    }
    result = user_a.insert("eval_runs", row)
    assert (result.status, result.code) == (403, "42501")
