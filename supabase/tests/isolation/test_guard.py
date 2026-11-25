"""Tests for the helpers in supa.py, including the service-role guard. No network needed."""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
from pathlib import Path

import httpx2
import pytest
from supa import (
    Result,
    ServiceRoleKeyPresentError,
    Settings,
    assert_no_service_role,
    eq_filters,
    find_service_role_keys,
    is_privileged_key,
    jwt_claims,
    load_settings,
    parse_response,
)


def make_jwt(claims: dict[str, object]) -> str:
    def part(data: dict[str, object]) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()

    return f"{part({'alg': 'HS256', 'typ': 'JWT'})}.{part(claims)}.signature"


ANON_JWT = make_jwt({"role": "anon", "iss": "supabase-demo"})
SERVICE_JWT = make_jwt({"role": "service_role", "iss": "supabase-demo"})


def test_jwt_claims_reads_the_payload() -> None:
    assert jwt_claims(ANON_JWT)["role"] == "anon"


@pytest.mark.parametrize("token", ["", "a.b", "not-a-jwt", "a.!!!.c"])
def test_jwt_claims_rejects_non_jwts(token: str) -> None:
    with pytest.raises(ValueError):
        jwt_claims(token)


@pytest.mark.parametrize(
    ("value", "privileged"),
    [
        (SERVICE_JWT, True),
        ("sb_secret_abc123", True),
        (ANON_JWT, False),
        ("sb_publishable_abc123", False),
        ("plain text", False),
    ],
)
def test_is_privileged_key(value: str, privileged: bool) -> None:
    assert is_privileged_key(value) is privileged


def test_find_service_role_keys_by_name_and_by_value() -> None:
    environ = {
        "SUPABASE_SERVICE_ROLE_KEY": "anything",
        "SOME_OTHER_NAME": SERVICE_JWT,
        "SUPABASE_ANON_KEY": ANON_JWT,
        "PATH": "/usr/bin",
    }
    assert find_service_role_keys(environ) == ["SOME_OTHER_NAME", "SUPABASE_SERVICE_ROLE_KEY"]


def test_guard_raises_when_a_service_key_is_present() -> None:
    with pytest.raises(ServiceRoleKeyPresentError, match="SUPABASE_SECRET_KEY"):
        assert_no_service_role({"SUPABASE_SECRET_KEY": "sb_secret_x"})


def test_guard_passes_with_only_the_anon_key() -> None:
    assert_no_service_role({"SUPABASE_ANON_KEY": ANON_JWT})


def test_guard_aborts_a_real_pytest_run() -> None:
    """End to end: with a service-role key in the environment, pytest refuses to start."""
    env = {**os.environ, "SUPABASE_SERVICE_ROLE_KEY": SERVICE_JWT}
    run = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            str(Path(__file__).parent),
            "-q",
            "-p",
            "no:cacheprovider",
        ],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == pytest.ExitCode.USAGE_ERROR
    assert "Refusing to run the isolation tests" in run.stderr + run.stdout


def test_load_settings_from_environment() -> None:
    settings = load_settings({"SUPABASE_URL": "http://x/", "SUPABASE_ANON_KEY": ANON_JWT})
    assert settings == Settings(url="http://x", anon_key=ANON_JWT)


def test_load_settings_from_cli_keeps_only_url_and_anon_key() -> None:
    status = json.dumps(
        {"API_URL": "http://cli", "ANON_KEY": ANON_JWT, "SERVICE_ROLE_KEY": SERVICE_JWT}
    )
    settings = load_settings({}, status_json=lambda: status)
    assert settings == Settings(url="http://cli", anon_key=ANON_JWT)


def test_load_settings_rejects_a_service_key_posing_as_anon() -> None:
    with pytest.raises(ServiceRoleKeyPresentError):
        load_settings({"SUPABASE_URL": "http://x", "SUPABASE_ANON_KEY": SERVICE_JWT})


def test_eq_filters() -> None:
    assert eq_filters({"id": "1", "day": "2026-01-01"}) == {"id": "eq.1", "day": "eq.2026-01-01"}


def test_parse_reads_rows_count_and_error_code() -> None:
    rows = httpx2.Response(200, json=[{"id": 1}])
    assert parse_response(rows) == Result(status=200, rows=[{"id": 1}], affected=None, code=None)

    updated = httpx2.Response(204, headers={"content-range": "*/0"})
    assert parse_response(updated) == Result(status=204, rows=[], affected=0, code=None)

    denied = httpx2.Response(403, json={"code": "42501", "message": "denied"})
    assert parse_response(denied) == Result(status=403, rows=[], affected=None, code="42501")

    returned = httpx2.Response(200, json=7)
    assert parse_response(returned) == Result(
        status=200, rows=[], affected=None, code=None, value=7
    )

    returned_object = httpx2.Response(200, json={"code": "not-an-error"})
    assert parse_response(returned_object) == Result(
        status=200, rows=[], affected=None, code=None, value={"code": "not-an-error"}
    )
