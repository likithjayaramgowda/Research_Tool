"""Fixtures for the isolation tests: three real sessions (A, B, anonymous) plus no session.

Needs a running local Supabase with the seed loaded (`supabase start`, or `supabase db reset`).
Run with: uv run pytest supabase/tests/isolation
"""

from __future__ import annotations

import os
import uuid
from collections.abc import Callable, Iterator

import ids
import pytest
from supa import (
    ServiceRoleKeyPresentError,
    Session,
    Settings,
    assert_no_service_role,
    load_settings,
    sign_in_anonymously,
    sign_in_with_password,
    sign_up_with_password,
)


def pytest_configure(config: pytest.Config) -> None:
    """The guard: abort the whole run, before any test, if a service-role key is present."""
    try:
        assert_no_service_role(os.environ)
    except ServiceRoleKeyPresentError as error:
        raise pytest.UsageError(str(error)) from error


@pytest.fixture(scope="session")
def settings() -> Settings:
    return load_settings(os.environ)


def _signed_in(settings: Settings, owned: ids.Owned) -> Iterator[Session]:
    assert owned.email is not None
    session = Session(settings, sign_in_with_password(settings, owned.email, ids.PASSWORD))
    claims = session.claims
    # Prove the session is what the tests assume: a real, non-anonymous user, not a superuser.
    assert claims["role"] == "authenticated"
    assert claims["is_anonymous"] is False
    assert claims["sub"] == owned.user
    yield session
    session.close()


@pytest.fixture(scope="session")
def user_a(settings: Settings) -> Iterator[Session]:
    yield from _signed_in(settings, ids.A)


@pytest.fixture(scope="session")
def user_b(settings: Settings) -> Iterator[Session]:
    yield from _signed_in(settings, ids.B)


@pytest.fixture(scope="session")
def anon(settings: Settings) -> Iterator[Session]:
    """An anonymous demo session (D8): role `authenticated`, but `is_anonymous` is true."""
    session = Session(settings, sign_in_anonymously(settings))
    claims = session.claims
    assert claims["role"] == "authenticated"
    assert claims["is_anonymous"] is True
    yield session
    session.close()


@pytest.fixture(scope="session")
def nobody(settings: Settings) -> Iterator[Session]:
    """No session at all: just the public anon key, as on the public eval page."""
    session = Session(settings)
    yield session
    session.close()


@pytest.fixture(scope="session")
def make_user(settings: Settings) -> Iterator[Callable[[], Session]]:
    """Sign up brand-new real users through Supabase Auth (fresh, untouched usage counters).

    Local Auth allows 30 sign-ins and sign-ups per 5 minutes per IP, so use sparingly.
    """
    sessions: list[Session] = []

    def make() -> Session:
        email = f"fresh-{uuid.uuid4().hex[:12]}@litlens.test"
        session = Session(settings, sign_up_with_password(settings, email, ids.PASSWORD))
        assert session.claims["role"] == "authenticated"
        assert session.claims["is_anonymous"] is False
        sessions.append(session)
        return session

    yield make
    for session in sessions:
        session.close()


@pytest.fixture(scope="session")
def make_anon(settings: Settings) -> Iterator[Callable[[], Session]]:
    """Start brand-new anonymous sessions. Local Auth allows 30 per hour per IP."""
    sessions: list[Session] = []

    def make() -> Session:
        session = Session(settings, sign_in_anonymously(settings))
        assert session.claims["is_anonymous"] is True
        sessions.append(session)
        return session

    yield make
    for session in sessions:
        session.close()
