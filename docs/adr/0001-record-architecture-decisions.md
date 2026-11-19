# 1. Record architecture decisions

Date: 2026-11-19
Status: Accepted

## Context
LitLens is a portfolio project built step by step. Decisions made early (hosting, database, how
the pieces talk) are hard to reverse and easy to forget. Future readers, including recruiters and
the author months later, need to know not just what was chosen but why.

## Decision
We record each significant architecture decision as a short Architecture Decision Record (ADR) in
`docs/adr/`, numbered in order (`0001-...`, `0002-...`). Each has a title, date, status, context,
decision and consequences. We never rewrite history: to change a decision we add a new ADR that
supersedes the old one and mark the old one "Superseded by NNNN".

## Consequences
- Decisions are searchable and reviewable in git.
- A little extra writing per decision, which is cheap compared with re-deriving it later.
- Pairs with `docs/prompts/`, the log of how each slice was built.
