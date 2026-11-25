# 8. One narrow privileged write path for usage and activity (D22)

Date: 2026-11-25
Status: Accepted

## Context
[ADR 0007](0007-rls-tenancy-boundary.md) made RLS the tenancy boundary: the API queries with the
user's JWT, and only the worker holds the service-role key. Two writes did not fit:

- **Usage counters.** The API must count questions and Gap Checks against daily allowances,
  including for anonymous demo sessions (D8, D21). If users could write `usage_daily`, they could
  reset their own allowance; if only the service role could, the API would need that key.
- **`last_active_at`.** The 30-day clean-up (D9) deletes inactive accounts. In slice 0.3 a user
  could update their own `last_active_at`, so they could set it to 2099 and never be cleaned up.

Giving the API the service-role key would solve both, but the API is internet-facing and the worker
is not. A leak or a bug in the API would then bypass every policy in the database.

## Decision
Both writes go through **one `SECURITY DEFINER` function, `public.record_usage(kind text)`**,
called by the API with the user's own JWT.

- **It acts on `auth.uid()` and nothing else.** Its only argument is the kind of event
  (`question` or `gap_check`). No argument names a user, so it cannot be pointed at anyone
  else's counters. Passing any extra argument makes PostgREST find no function at all (HTTP 404).
- **It only ever adds one, and stops at the allowance.** A single `insert … on conflict … do
  update … where count < allowance` both checks and counts, so two simultaneous requests cannot
  both take the last unit. When the allowance is used up it changes nothing and fails with
  SQLSTATE `PT429`, which PostgREST returns as HTTP 429.
- **It returns what is left today** (UTC), so the UI can show it.
- **It sets `last_active_at = now()` itself** for signed-in users, from the database clock, never
  from a value the caller supplies. Anonymous sessions have no profile, so nothing is touched.
- **Users can no longer set `last_active_at`** directly; that column privilege is revoked.
- Hardening: `search_path = ''` with schema-qualified names; `EXECUTE` is revoked from `PUBLIC`
  and `anon` and granted only to `authenticated` (signed-in and anonymous sessions). Allowances
  live in `private.daily_allowance`, which no API role can call.
- **The API never holds the service-role key.** The worker remains the only service-role
  component, and this function is the single, narrow exception to "only the worker is
  privileged".

Because the function only lets a caller spend their own allowance, it is harmless for a user to
call it directly from the browser, which they can: anything the API can do with a user's JWT, the
user can do too.

## Consequences
- Starting allowances are placeholders, to tune against real usage: 20 questions and 2 Gap
  Checks a day for signed-in users; 3 questions and no Gap Checks for anonymous sessions.
- A structural test lists every `SECURITY DEFINER` function in `public`. Adding another one fails
  CI until someone reviews the new privileged surface and updates the test.
- Only metered events count as activity. A user who only reads their library without asking
  anything is not marked active; revisit before the D9 clean-up goes live in slice 2.7.
- Token counts and uploads are not metered by this function yet. Token accounting (slice 2.2)
  will need either a widened signature or a second function, reviewed the same way.
- There is no read-only "what's left?" call: the remaining allowance arrives with each counted
  event. Signed-in users can read their own `usage_daily` row; anonymous sessions cannot.
