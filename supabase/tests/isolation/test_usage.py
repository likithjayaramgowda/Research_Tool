"""D22: record_usage, the one privileged write path the API may use with a user's JWT.

It counts an event against the caller (and only the caller), marks a signed-in caller active,
and returns what is left of today's allowance.

The seeded users A and B keep their counters between runs on the same day, so these tests sign
up two fresh users (alice, bob) and one fresh anonymous visitor per run. They are shared across
the module to stay well inside Supabase Auth's rate limits (sign-ups: 30 per 5 minutes per IP;
anonymous sign-ins: 30 per hour), so each assertion is made relative to the counter just before
the call rather than assuming it starts at zero.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import ids
import pytest
from supa import Session

# Must match private.daily_allowance in the record_usage migration.
QUESTIONS = 20
ANON_QUESTIONS = 3
GAP_CHECKS = 2


@pytest.fixture(scope="module")
def alice(make_user: Callable[[], Session]) -> Session:
    return make_user()


@pytest.fixture(scope="module")
def bob(make_user: Callable[[], Session]) -> Session:
    return make_user()


@pytest.fixture(scope="module")
def visitor(make_anon: Callable[[], Session]) -> Session:
    return make_anon()


def _today() -> str:
    return datetime.now(UTC).date().isoformat()


def _record(session: Session, kind: str = "question", **extra: Any) -> tuple[int, Any]:
    result = session.rpc("record_usage", {"kind": kind, **extra})
    return result.status, result.value if result.status == 200 else result.code


def _used(session: Session, column: str = "questions") -> int:
    """How many of `column` the session has used today (0 if no row yet)."""
    rows = session.select("usage_daily", {"user_id": session.user_id, "day": _today()}).rows
    return int(rows[0][column]) if rows else 0


def _last_active(session: Session) -> datetime:
    (profile,) = session.select("profiles", {"id": session.user_id}).rows
    return datetime.fromisoformat(profile["last_active_at"])


# ── metering ───────────────────────────────────────────────────────────────────────────────
def test_signed_in_user_is_metered_and_told_what_is_left(alice: Session) -> None:
    for _ in range(2):
        before = _used(alice)
        assert _record(alice) == (200, QUESTIONS - (before + 1))
        assert _used(alice) == before + 1


def test_allowance_runs_out_and_stops_counting(alice: Session) -> None:
    # Only this test spends alice's gap checks, so they start at zero.
    assert [_record(alice, "gap_check") for _ in range(GAP_CHECKS)] == [(200, 1), (200, 0)]
    assert _record(alice, "gap_check") == (429, "PT429")
    assert _used(alice, "gap_checks") == GAP_CHECKS  # the refused call counted nothing


def test_anonymous_session_is_metered_and_gets_its_allowance_back(visitor: Session) -> None:
    remaining = [_record(visitor) for _ in range(ANON_QUESTIONS)]
    assert remaining == [(200, n) for n in range(ANON_QUESTIONS - 1, -1, -1)]
    assert _record(visitor) == (429, "PT429")
    # Metered in the database, yet still unable to read (or write) the row itself (D21, D23).
    assert visitor.select("usage_daily").rows == []


def test_each_anonymous_session_has_its_own_meter(visitor: Session, anon: Session) -> None:
    """`anon` is a different fresh anonymous session; only this test spends its questions."""
    # Use the visitor up, whatever ran first. Bounded, so a missing cap fails instead of hanging.
    for _ in range(ANON_QUESTIONS):
        _record(visitor)
    assert _record(visitor) == (429, "PT429")
    assert _record(anon) == (200, ANON_QUESTIONS - 1)


def test_anonymous_session_has_no_gap_check_allowance(anon: Session) -> None:
    assert _record(anon, "gap_check") == (429, "PT429")


def test_unknown_kinds_are_refused(alice: Session) -> None:
    before = (_used(alice), _used(alice, "gap_checks"))
    for kind in ["upload", "questions", "", "question; drop table x", "QUESTION"]:
        assert _record(alice, kind) == (400, "22023"), kind
    assert (_used(alice), _used(alice, "gap_checks")) == before


# ── only ever the caller ───────────────────────────────────────────────────────────────────
def test_a_cannot_inflate_b_usage(alice: Session, bob: Session) -> None:
    bob_before = _used(bob)
    for _ in range(3):
        _record(alice)
    assert _used(bob) == bob_before


@pytest.mark.parametrize("argument", ["user_id", "uid", "caller", "profile_id", "id"])
def test_no_argument_can_name_another_user(argument: str, alice: Session, bob: Session) -> None:
    """The function takes `kind` and nothing else, so PostgREST finds no function to call."""
    before = (_used(alice), _used(bob))
    status, _ = _record(alice, **{argument: bob.user_id})
    assert status == 404
    assert (_used(alice), _used(bob)) == before


def test_seeded_users_cannot_reach_each_other_through_the_function(
    user_a: Session, user_b: Session
) -> None:
    before = _used(user_b)
    _record(user_a)  # may already be at its allowance from earlier runs today; either way:
    assert _used(user_b) == before


# ── last_active_at ─────────────────────────────────────────────────────────────────────────
def test_call_marks_a_signed_in_user_active(bob: Session) -> None:
    before = _last_active(bob)
    assert _record(bob)[0] == 200
    after = _last_active(bob)
    assert after > before
    assert after < datetime.now(UTC) + timedelta(minutes=1)  # the database's now, not later


def test_user_cannot_set_last_active_at_directly(bob: Session) -> None:
    before = _last_active(bob)
    result = bob.update("profiles", {"id": bob.user_id}, {"last_active_at": "2099-01-01T00:00Z"})
    assert (result.status, result.code) == (403, "42501")
    assert _last_active(bob) == before


def test_user_cannot_set_last_active_at_through_the_function(bob: Session) -> None:
    status, _ = _record(bob, last_active_at="2099-01-01T00:00:00Z")
    assert status == 404  # no such parameter exists
    assert _last_active(bob) < datetime.now(UTC) + timedelta(minutes=1)


# ── who may call it ────────────────────────────────────────────────────────────────────────
def test_callable_with_a_user_jwt(bob: Session) -> None:
    before = _used(bob)
    assert _record(bob) == (200, QUESTIONS - (before + 1))


def test_not_callable_without_a_session(nobody: Session) -> None:
    assert _record(nobody) == (401, "42501")


def test_fresh_users_are_not_the_seeded_ones(alice: Session, bob: Session) -> None:
    """Guards the tests above: alice and bob are genuinely new and distinct."""
    assert len({alice.user_id, bob.user_id, ids.A_USER, ids.B_USER}) == 4
