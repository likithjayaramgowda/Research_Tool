"""Helpers for the isolation tests: settings, the service-role guard, and a thin Supabase client.

The client calls Supabase's HTTP endpoints directly (PostgREST for tables, Storage for files,
GoTrue for sign-in) instead of going through supabase-py. That keeps every request visible:
which key and which JWT were sent, and what status code came back. Each request carries the
public anon key plus, when signed in, the session's own access token, exactly like the browser.
"""

from __future__ import annotations

import base64
import json
import subprocess
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, cast

import httpx2

# Environment variable names that hold a privileged key in Supabase tooling.
SERVICE_ROLE_ENV_NAMES = frozenset(
    {"SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"}
)

Row = dict[str, Any]


class ServiceRoleKeyPresentError(RuntimeError):
    """A privileged key is in the environment, so the test results could not be trusted."""


def jwt_claims(token: str) -> dict[str, Any]:
    """Decode a JWT's payload without verifying its signature.

    Supabase verifies the signature on every request. Here we only read the claims (role,
    is_anonymous, sub) to check that each test session is what it claims to be.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("not a JWT: expected three dot-separated parts")
    payload = parts[1] + "=" * (-len(parts[1]) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))
    if not isinstance(claims, dict):
        raise ValueError("JWT payload is not a JSON object")
    return cast(dict[str, Any], claims)


def is_privileged_key(value: str) -> bool:
    """True for a service-role JWT or a new-style secret key (sb_secret_…)."""
    if value.startswith("sb_secret_"):
        return True
    try:
        return jwt_claims(value).get("role") == "service_role"
    except ValueError:  # not a JWT at all (also covers bad base64, bad JSON, bad UTF-8)
        return False


def find_service_role_keys(environ: Mapping[str, str]) -> list[str]:
    """Names of environment variables that are named for, or contain, a privileged key."""
    return sorted(
        name
        for name, value in environ.items()
        if name in SERVICE_ROLE_ENV_NAMES or is_privileged_key(value)
    )


def assert_no_service_role(environ: Mapping[str, str]) -> None:
    """Refuse to run if a privileged key is anywhere in the environment.

    The service role bypasses RLS. If any request in this suite were sent with it, every
    isolation test would pass while proving nothing. So the suite stops before it starts.
    """
    found = find_service_role_keys(environ)
    if found:
        raise ServiceRoleKeyPresentError(
            "Refusing to run the isolation tests: a service-role key is in the environment "
            f"({', '.join(found)}). These tests must run with the public anon key only; "
            "unset those variables and run again."
        )


@dataclass(frozen=True)
class Settings:
    """Where the local Supabase is, and its public anon key."""

    url: str
    anon_key: str


def _supabase_status_json() -> str:
    return subprocess.run(
        ["supabase", "status", "-o", "json"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout


def load_settings(
    environ: Mapping[str, str],
    status_json: Callable[[], str] = _supabase_status_json,
) -> Settings:
    """Read SUPABASE_URL and SUPABASE_ANON_KEY, or ask the local Supabase CLI for them.

    From the CLI's status output only the API URL and the anon key are taken; everything else
    (including the service-role key it also prints) is discarded and never stored.
    """
    url = environ.get("SUPABASE_URL")
    anon_key = environ.get("SUPABASE_ANON_KEY")
    if not (url and anon_key):
        status = cast(dict[str, str], json.loads(status_json()))
        url, anon_key = status["API_URL"], status["ANON_KEY"]
    if is_privileged_key(anon_key) or jwt_claims(anon_key).get("role") != "anon":
        raise ServiceRoleKeyPresentError("SUPABASE_ANON_KEY is not the public anon key.")
    return Settings(url=url.rstrip("/"), anon_key=anon_key)


@dataclass(frozen=True)
class Result:
    """What came back from one request."""

    status: int
    rows: list[Row]
    #: Rows changed by an UPDATE or DELETE, from PostgREST's Content-Range header.
    affected: int | None
    #: Postgres error code (42501 = insufficient privilege / RLS violation), if any.
    code: str | None
    #: A function's return value, when an RPC returns a single value rather than rows.
    value: Any = None


def parse_response(response: httpx2.Response) -> Result:
    affected: int | None = None
    content_range = response.headers.get("content-range")
    if content_range and "/" in content_range:
        total = content_range.rsplit("/", 1)[1]
        affected = int(total) if total.isdigit() else None
    rows: list[Row] = []
    code: str | None = None
    value: Any = None
    if response.content:
        body = response.json()
        if isinstance(body, list):
            rows = cast(list[Row], body)
        elif isinstance(body, dict):
            code = cast(Row, body).get("code")
        else:
            value = body
    return Result(status=response.status_code, rows=rows, affected=affected, code=code, value=value)


def eq_filters(filters: Mapping[str, str]) -> dict[str, str]:
    return {column: f"eq.{value}" for column, value in filters.items()}


class Session:
    """One caller: a signed-in user, an anonymous demo session, or nobody (anon key only)."""

    def __init__(self, settings: Settings, access_token: str | None = None) -> None:
        self.access_token = access_token
        self.base_url = settings.url
        self.anon_key = settings.anon_key
        headers = {"apikey": settings.anon_key}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        self._http = httpx2.Client(base_url=settings.url, headers=headers, timeout=30)

    @property
    def claims(self) -> dict[str, Any]:
        if self.access_token is None:
            return {}
        return jwt_claims(self.access_token)

    @property
    def user_id(self) -> str:
        return str(self.claims["sub"])

    def close(self) -> None:
        self._http.close()

    # ── tables (PostgREST) ──────────────────────────────────────────────────────────────────
    def select(self, table: str, filters: Mapping[str, str] | None = None) -> Result:
        params = {"select": "*", **eq_filters(filters or {})}
        return parse_response(self._http.get(f"/rest/v1/{table}", params=params))

    def insert(self, table: str, row: Row) -> Result:
        response = self._http.post(
            f"/rest/v1/{table}", json=row, headers={"Prefer": "return=minimal"}
        )
        return parse_response(response)

    def update(self, table: str, filters: Mapping[str, str], values: Row) -> Result:
        response = self._http.patch(
            f"/rest/v1/{table}",
            params=eq_filters(filters),
            json=values,
            headers={"Prefer": "return=minimal, count=exact"},
        )
        return parse_response(response)

    def delete(self, table: str, filters: Mapping[str, str]) -> Result:
        response = self._http.delete(
            f"/rest/v1/{table}",
            params=eq_filters(filters),
            headers={"Prefer": "return=minimal, count=exact"},
        )
        return parse_response(response)

    def rpc(self, function: str, args: Row) -> Result:
        """Call a database function through PostgREST, as the API will."""
        return parse_response(self._http.post(f"/rest/v1/rpc/{function}", json=args))

    def raw_rpc(self, function: str, args: Row) -> httpx2.Response:
        """The same call, returning the raw response so a test can read the whole body."""
        return self._http.post(f"/rest/v1/rpc/{function}", json=args)

    # ── files (Storage) ─────────────────────────────────────────────────────────────────────
    def upload(
        self,
        bucket: str,
        path: str,
        data: bytes,
        content_type: str = "application/pdf",
        upsert: bool = False,
    ) -> int:
        response = self._http.post(
            f"/storage/v1/object/{bucket}/{path}",
            content=data,
            headers={"Content-Type": content_type, "x-upsert": "true" if upsert else "false"},
        )
        return response.status_code

    def download(self, bucket: str, path: str) -> tuple[int, bytes]:
        response = self._http.get(f"/storage/v1/object/{bucket}/{path}")
        return response.status_code, response.content

    def download_public(self, bucket: str, path: str) -> int:
        return self._http.get(f"/storage/v1/object/public/{bucket}/{path}").status_code

    def list_folder(self, bucket: str, folder: str) -> tuple[int, list[str]]:
        response = self._http.post(
            f"/storage/v1/object/list/{bucket}", json={"prefix": folder, "limit": 100}
        )
        if response.status_code != 200:
            return response.status_code, []
        entries = cast(list[Row], response.json())
        return 200, [str(entry["name"]) for entry in entries]

    def remove(self, bucket: str, paths: list[str]) -> list[str]:
        """Delete files; returns the paths actually deleted (RLS hides the rest silently)."""
        response = self._http.request(
            "DELETE", f"/storage/v1/object/{bucket}", json={"prefixes": paths}
        )
        if response.status_code != 200:
            return []
        return [str(entry["name"]) for entry in cast(list[Row], response.json())]


def sign_in_with_password(settings: Settings, email: str, password: str) -> str:
    """A real sign-in through Supabase Auth; returns the session's access token (a JWT)."""
    response = httpx2.post(
        f"{settings.url}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": settings.anon_key},
        json={"email": email, "password": password},
        timeout=30,
    )
    response.raise_for_status()
    return str(response.json()["access_token"])


def sign_up_with_password(settings: Settings, email: str, password: str) -> str:
    """Create a brand-new real user (email confirmation is off locally); returns the token."""
    response = httpx2.post(
        f"{settings.url}/auth/v1/signup",
        headers={"apikey": settings.anon_key},
        json={"email": email, "password": password},
        timeout=30,
    )
    response.raise_for_status()
    return str(response.json()["access_token"])


def sign_in_anonymously(settings: Settings) -> str:
    """An anonymous sign-in, as the demo will do (D8); returns the access token."""
    response = httpx2.post(
        f"{settings.url}/auth/v1/signup",
        headers={"apikey": settings.anon_key},
        json={},
        timeout=30,
    )
    response.raise_for_status()
    return str(response.json()["access_token"])
