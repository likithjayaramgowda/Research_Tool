# 9. Answers to anonymous demo sessions are not persisted (D23)

Date: 2026-11-25
Status: Accepted

## Context
Recruiters try LitLens through an anonymous demo session (D8), with a small allowance of live
questions on the demo library. Those answers have to live somewhere for the session. The obvious
place, the `messages` table, would mean giving anonymous sessions a write path to the database.

## Decision
Live answers given to anonymous sessions are **held in the client for the session only** and
never written to the database. Refreshing the page loses them, which is acceptable for a demo.
Evaluation traces still go to Langfuse, so nothing needed for quality work is lost.

## Consequences
- Anonymous sessions have **no write path to the database at all**: they can read the demo
  collection and `demo_answers`, and nothing else. The only server-side trace of them is their
  usage counter, written by `record_usage` ([ADR 0008](0008-one-narrow-privileged-write-path.md)).
  The isolation suite enforces this: an anonymous session is refused an insert into every table.
- The free-tier database (500 MB) is kept for real users, and the D9 clean-up has nothing
  anonymous to sweep beyond auth users and their usage rows.
- The API's question flow skips the message save for anonymous sessions.
- Shareable demo transcripts are not possible. If the demo ever needs them, that is a backlog
  item that would reopen this decision.
