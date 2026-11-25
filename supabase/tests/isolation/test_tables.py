"""Cross-user isolation on every owned table: A and B each try to reach the other's rows.

RLS filters rows rather than raising errors, so an attempt on someone else's row is expected to
come back as success with zero rows: 200 with an empty list for SELECT, 204 with zero rows
affected for UPDATE and DELETE. After each write attempt the victim reads their own row back to
show nothing changed.
"""

from __future__ import annotations

import ids
import pytest
from supa import Session
from tables import OWNED, Table

DIRECTIONS = [("A", "B"), ("B", "A")]
OWNERS = {"A": ids.A, "B": ids.B}


@pytest.fixture
def sessions(user_a: Session, user_b: Session) -> dict[str, Session]:
    return {"A": user_a, "B": user_b}


@pytest.mark.parametrize("owner", ["A", "B"])
@pytest.mark.parametrize("table", OWNED, ids=str)
def test_owner_reads_own_row(table: Table, owner: str, sessions: dict[str, Session]) -> None:
    result = sessions[owner].select(table.name, table.key(OWNERS[owner]))
    assert result.status == 200
    assert len(result.rows) == 1


@pytest.mark.parametrize(("attacker", "victim"), DIRECTIONS)
@pytest.mark.parametrize("table", OWNED, ids=str)
def test_cannot_read_other_users_row(
    table: Table, attacker: str, victim: str, sessions: dict[str, Session]
) -> None:
    result = sessions[attacker].select(table.name, table.key(OWNERS[victim]))
    assert result.status == 200
    assert result.rows == []


@pytest.mark.parametrize(("attacker", "victim"), DIRECTIONS)
@pytest.mark.parametrize("table", OWNED, ids=str)
def test_cannot_update_other_users_row(
    table: Table, attacker: str, victim: str, sessions: dict[str, Session]
) -> None:
    key = table.key(OWNERS[victim])
    result = sessions[attacker].update(table.name, key, table.change)
    assert (result.status, result.affected) == (204, 0)

    (row,) = sessions[victim].select(table.name, key).rows
    for column, attempted in table.change.items():
        assert row[column] != attempted


@pytest.mark.parametrize(("attacker", "victim"), DIRECTIONS)
@pytest.mark.parametrize("table", OWNED, ids=str)
def test_cannot_delete_other_users_row(
    table: Table, attacker: str, victim: str, sessions: dict[str, Session]
) -> None:
    key = table.key(OWNERS[victim])
    result = sessions[attacker].delete(table.name, key)
    assert (result.status, result.affected) == (204, 0)
    assert len(sessions[victim].select(table.name, key).rows) == 1
