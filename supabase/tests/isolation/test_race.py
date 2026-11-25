"""Racing the global ceiling (D24): twenty simultaneous questions against a ceiling of five.

Check-and-count must happen in one statement, or simultaneous requests can both take the last
unit, and no test that calls one at a time can tell. The race itself is SQL
(sql/race_global_ceiling.psql) because it needs twenty real database connections at once.

It commits to the database it runs in, so it runs only behind three guards:
  1. no service-role key in the environment (pytest_configure, shared with the whole suite);
  2. the suite is pointed at a local Supabase (the `settings` fixture);
  3. it reaches the database only through `docker exec` into the local container named from
     project_id in supabase/config.toml, and the SQL itself refuses to run unless the database
     holds the seeded test users, which only local and CI databases have.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from supa import Settings, local_db_container

SUPABASE_DIR = Path(__file__).resolve().parents[2]
RACE_SQL = Path(__file__).parent / "sql" / "race_global_ceiling.psql"


def _run_race(container: str) -> dict[str, Any]:
    run = subprocess.run(
        [
            "docker",
            "exec",
            "-i",
            container,
            "psql",
            "-U",
            "postgres",
            "-X",
            "-q",
            "-At",
            "-v",
            f"db_host={container}",
            "-f",
            "-",
        ],
        input=RACE_SQL.read_text(),
        capture_output=True,
        text=True,
        check=False,
        timeout=120,
    )
    assert run.returncode == 0, f"race script failed:\n{run.stderr}"
    last_line = [line for line in run.stdout.splitlines() if line.strip()][-1]
    return json.loads(last_line)


def test_twenty_simultaneous_questions_respect_a_ceiling_of_five(settings: Settings) -> None:
    container = local_db_container(SUPABASE_DIR / "config.toml")
    assert _run_race(container) == {
        "succeeded": 5,  # exactly five get through
        "ceiling_reached": 15,  # the rest are refused cleanly, with the right code
        "other_errors": [],  # and nothing fails any other way (e.g. a constraint error)
        "global_weighted": 5,  # the global counter is exact
        "personal_questions": 5,  # only those who got through were charged
        "leftover_racers": 0,  # and the committed setup was undone
    }
