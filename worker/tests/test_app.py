from litlens_worker.app import ping


def test_ping_runs_locally() -> None:
    # .local() runs the function body in-process, with no Modal account needed.
    assert ping.local() == "pong"
