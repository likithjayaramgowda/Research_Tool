"""How to find each owned table's seeded row, and a harmless change to attempt on it."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import ids


@dataclass(frozen=True)
class Table:
    name: str
    #: Filters that select one owner's seeded row.
    key: Callable[[ids.Owned], dict[str, str]]
    #: An update an attacker might try. The column must be one the API roles may name.
    change: dict[str, Any]

    def __str__(self) -> str:  # readable pytest ids
        return self.name


def _user(owned: ids.Owned) -> str:
    assert owned.user is not None, "the demo collection has no user"
    return owned.user


# Every table a user owns rows in, except papers (deny-all this slice; see test_papers.py).
OWNED = [
    Table("profiles", lambda o: {"id": _user(o)}, {"display_name": "changed"}),
    Table("collections", lambda o: {"id": o.collection}, {"name": "changed"}),
    Table("chunks", lambda o: {"id": o.chunk}, {"text": "changed"}),
    Table("paper_cards", lambda o: {"id": o.paper_card}, {"question": "changed"}),
    Table("relevance", lambda o: {"id": o.relevance}, {"reason": "changed"}),
    Table("gap_checks", lambda o: {"id": o.gap_check}, {"idea": "changed"}),
    Table("messages", lambda o: {"id": o.message}, {"content": "changed"}),
    Table(
        "usage_daily",
        lambda o: {"user_id": _user(o), "day": ids.USAGE_DAY},
        {"questions": 99},
    ),
]

# Tables holding rows of the demo collection (everything that hangs off a collection).
DEMO = [table for table in OWNED if table.name not in {"profiles", "usage_daily"}]

ALL_TABLE_NAMES = [
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
]
