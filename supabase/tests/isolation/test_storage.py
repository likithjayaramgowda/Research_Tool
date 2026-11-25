"""The private `papers` bucket: per-user folders, plus a demo folder every session can read."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from dataclasses import dataclass

import pytest
from supa import Session

BUCKET = "papers"


@dataclass(frozen=True)
class Upload:
    path: str
    data: bytes


def _upload(session: Session) -> Upload:
    upload = Upload(
        path=f"{session.user_id}/{uuid.uuid4()}.pdf",
        data=f"%PDF-1.4 test file {uuid.uuid4()}".encode(),
    )
    assert session.upload(BUCKET, upload.path, upload.data) == 200
    return upload


@pytest.fixture(scope="module")
def file_a(user_a: Session) -> Iterator[Upload]:
    """A uploads into their own folder (this exercises the upload policy as well)."""
    upload = _upload(user_a)
    yield upload
    user_a.remove(BUCKET, [upload.path])


@pytest.fixture(scope="module")
def file_b(user_b: Session) -> Iterator[Upload]:
    upload = _upload(user_b)
    yield upload
    user_b.remove(BUCKET, [upload.path])


def _folder(upload: Upload) -> str:
    return upload.path.split("/", 1)[0]


def _name(upload: Upload) -> str:
    return upload.path.split("/", 1)[1]


# ── own folder ─────────────────────────────────────────────────────────────────────────────
def test_owner_reads_and_lists_own_file(user_a: Session, file_a: Upload) -> None:
    assert user_a.download(BUCKET, file_a.path) == (200, file_a.data)
    assert _name(file_a) in user_a.list_folder(BUCKET, _folder(file_a))[1]


def test_owner_deletes_own_file(user_a: Session) -> None:
    upload = _upload(user_a)
    assert user_a.remove(BUCKET, [upload.path]) == [upload.path]
    assert user_a.download(BUCKET, upload.path)[0] != 200


def test_bucket_accepts_only_pdfs(user_a: Session) -> None:
    path = f"{user_a.user_id}/{uuid.uuid4()}.txt"
    assert user_a.upload(BUCKET, path, b"hello", content_type="text/plain") != 200


def test_bucket_is_private(nobody: Session, file_a: Upload) -> None:
    assert nobody.download_public(BUCKET, file_a.path) != 200


# ── another user's folder ──────────────────────────────────────────────────────────────────
def test_cannot_read_another_users_file(user_a: Session, file_b: Upload) -> None:
    status, body = user_a.download(BUCKET, file_b.path)
    assert status != 200
    assert file_b.data not in body


def test_cannot_list_another_users_folder(user_a: Session, file_b: Upload) -> None:
    assert user_a.list_folder(BUCKET, _folder(file_b))[1] == []


def test_cannot_upload_into_another_users_folder(
    user_a: Session, user_b: Session, file_b: Upload
) -> None:
    planted = f"{_folder(file_b)}/{uuid.uuid4()}.pdf"
    assert user_a.upload(BUCKET, planted, b"%PDF-1.4 planted") != 200
    assert planted.split("/", 1)[1] not in user_b.list_folder(BUCKET, _folder(file_b))[1]


def test_cannot_overwrite_another_users_file(
    user_a: Session, user_b: Session, file_b: Upload
) -> None:
    assert user_a.upload(BUCKET, file_b.path, b"%PDF-1.4 overwritten", upsert=True) != 200
    assert user_b.download(BUCKET, file_b.path) == (200, file_b.data)


def test_cannot_delete_another_users_file(user_a: Session, user_b: Session, file_b: Upload) -> None:
    assert user_a.remove(BUCKET, [file_b.path]) == []
    assert user_b.download(BUCKET, file_b.path) == (200, file_b.data)


# ── the demo folder ────────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("who", ["anon", "user_a"])
def test_every_session_lists_the_demo_folder(who: str, request: pytest.FixtureRequest) -> None:
    session: Session = request.getfixturevalue(who)
    assert session.list_folder(BUCKET, "demo") == (200, ["demo.pdf"])


def test_no_session_cannot_list_the_demo_folder(nobody: Session) -> None:
    assert nobody.list_folder(BUCKET, "demo")[1] == []


@pytest.mark.parametrize("who", ["anon", "user_a"])
def test_nobody_but_the_service_role_writes_the_demo_folder(
    who: str, request: pytest.FixtureRequest
) -> None:
    session: Session = request.getfixturevalue(who)
    assert session.upload(BUCKET, f"demo/{uuid.uuid4()}.pdf", b"%PDF-1.4 planted") != 200
    assert session.remove(BUCKET, ["demo/demo.pdf"]) == []


# ── anonymous sessions ─────────────────────────────────────────────────────────────────────
def test_anonymous_cannot_read_users_files(anon: Session, file_a: Upload) -> None:
    assert anon.download(BUCKET, file_a.path)[0] != 200
    assert anon.list_folder(BUCKET, _folder(file_a))[1] == []


def test_anonymous_cannot_upload_even_to_its_own_folder(anon: Session) -> None:
    assert anon.upload(BUCKET, f"{anon.user_id}/{uuid.uuid4()}.pdf", b"%PDF-1.4 x") != 200
