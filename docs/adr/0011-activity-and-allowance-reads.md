# 11. Activity is any session; users read their own allowance (D25)

Date: 2026-11-25
Status: Accepted; amended in slice 0.3d (activity returns the allowance)

## Context
[ADR 0008](0008-one-narrow-privileged-write-path.md) left two gaps.

- **Activity.** `last_active_at`, which the 30-day clean-up (D9) relies on, was only stamped by a
  metered event. A student who opens LitLens to read their library, without asking anything,
  would look inactive and have their papers deleted after 30 days. That would be a bug, not a
  policy.
- **What's left.** The remaining allowance arrived only with each counted event, and anonymous
  sessions could not read their own usage row, so the UI could not show "2 questions left" before
  the first question.

A second `SECURITY DEFINER` function would have solved either, but D22 keeps exactly one, and a
pgTAP check fails CI if another appears.

## Decision
- **A third kind on `record_usage`: `'activity'`.** It counts nothing, spends no allowance, is not
  limited by the global ceiling, and only stamps `last_active_at = now()` for a signed-in caller
  (an anonymous session has no profile, so nothing is written). The web app calls it once per
  session on load.
- **`activity` returns the caller's allowance** *(slice 0.3d)*: for questions and Gap Checks, the
  day's `allowance` (read from `private.daily_allowance`, the same source the metered kinds are
  checked against), what has been `used`, and what is `remaining`. The web app shows what's left
  from this and never keeps its own copy of the numbers, which would drift. The metered kinds
  still return a bare number, so their response is unchanged.
- **The `usage_daily` select policy widens to `user_id = auth.uid()`**, so every session,
  anonymous included, can read its own row. Writes stay function-only: there is still no insert,
  update or delete policy.

No new privileged surface is added; the single `SECURITY DEFINER` function in D22 just gains a
kind.

## Consequences
- Reading a library keeps it alive under D9.
- The allowances exist in one place, `private.daily_allowance`. A pgTAP test swaps it for
  different numbers and requires `activity` to report them, so a hardcoded copy in the function
  cannot creep back in unnoticed.
- `record_usage` now returns `jsonb` (a number for the metered kinds, an object for `activity`).
  Changing a return type means dropping and recreating the function, which its migration does.
- An anonymous session can now see one row of its own; it still cannot see anyone else's, and
  still has no write path to the database (D23).
- The activity ping is free to call, so a user can stamp themselves active as often as they like.
  That is harmless: it only proves they are using LitLens, which is what "active" means.
