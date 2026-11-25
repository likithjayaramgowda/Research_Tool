# 7. Row-level security is the tenancy boundary

Date: 2026-11-25
Status: Accepted

## Context
Every student's papers, chunks, answers and Gap Checks must be private to them (R3), while a
recruiter with no account can try a shared demo library (D8), and anyone can see the eval results
(R14). The data has three kinds of caller:

- the web app and API acting for a signed-in student,
- the same API acting for an anonymous demo visitor,
- the worker on Modal, which parses uploads and writes every generated result.

The usual way to keep tenants apart is a `WHERE owner_id = ?` in every query the API writes. That
puts the guarantee in application code, where one forgotten filter leaks a student's library.

## Decision
**Postgres row-level security (RLS) is the tenancy boundary.**

- RLS is enabled on every table, in the same migration that creates it, so no table is ever
  exposed without it. A structural test (`supabase/tests/database`) fails if any table in `public`
  lacks it.
- Ownership flows from `collections.owner_id = auth.uid()`. Tables below a collection reach it
  through small `SECURITY DEFINER` helpers in a `private` schema the REST API does not expose.
- **The API queries with the user's JWT**, never with a privileged key, so every query it makes
  passes through the policies. A bug in the API can return the wrong rows of the *caller's own*
  data, but not someone else's.
- **The worker's service-role key is the single privileged path.** It bypasses RLS and is used
  only by the worker, which writes chunks, paper cards, relevance verdicts, Gap Check results,
  usage counters and the demo collection. The threat model (slice 4.1) documents it.
- **Anonymous demo sessions are separated by the `is_anonymous` JWT claim, not by database role.**
  Supabase anonymous sign-ins arrive as the `authenticated` role, exactly like real users, so a
  policy written against the role cannot tell them apart. Every ownership check goes through
  `private.signed_in_uid()`, which returns NULL for an anonymous session; `owner_id = NULL` is
  never true, so an anonymous session can own and write nothing. It reads only the demo collection
  (which has no owner) and `demo_answers`.
- Table privileges back RLS up: the `anon` role (no session) can only read `eval_runs`, and no
  API role can `TRUNCATE`, which ignores RLS.
- Storage follows the same rule: a private bucket with one folder per user id plus a `demo/`
  folder, with policies on `storage.objects`.

The policies are proven by tests, not described by them: two real users and an anonymous session
sign in through Supabase Auth with the public anon key, and try to read, change and delete each
other's rows and files. The suite refuses to run if a service-role key is in the environment,
because a suite that silently runs as the service role would pass while proving nothing.

## Consequences
- Tenant isolation does not depend on every API query being written correctly.
- Policies run on every query, so the columns they filter on (`collections.owner_id`,
  `papers.collection_id`) are indexed, and helpers are wrapped in `(select …)` where Postgres can
  evaluate them once per query.
- Anything the worker writes is trusted, so the worker's inputs (uploaded PDFs, LLM output) must
  be validated there; RLS cannot help with the service role.
- A table with RLS on and no policy is deny-all, and isolation tests pass against it while the
  feature is broken. So every table also has tests that its owner *can* reach their rows. `papers`
  is deliberately left deny-all in this slice for the owner to write by hand; its owner-access
  tests are marked `xfail(strict=True)` until then.
