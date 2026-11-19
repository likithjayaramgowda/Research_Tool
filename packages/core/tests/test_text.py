from litlens_core import normalize_title


def test_lowercases_and_trims() -> None:
    assert normalize_title("  Hello World  ") == "hello world"


def test_collapses_internal_whitespace_and_newlines() -> None:
    assert normalize_title("Attention   Is All\nYou\tNeed") == "attention is all you need"


def test_empty_string_stays_empty() -> None:
    assert normalize_title("   ") == ""
