"""Small text helpers."""


def normalize_title(title: str) -> str:
    """Return a paper title in a canonical form for comparing and de-duplicating.

    Lowercases, trims, and collapses any run of whitespace into one space.
    >>> normalize_title("  Attention   Is All\\nYou Need ")
    'attention is all you need'
    """
    return " ".join(title.lower().split())
