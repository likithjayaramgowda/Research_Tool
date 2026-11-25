# 10. Quota governance: smaller allowances, a global ceiling, evals on Groq (D24)

Date: 2026-11-25
Status: Accepted; part (d), evals, amended in slice 0.3d

## Context
Every live question costs Groq tokens, and Groq's free tier is an **organisation-wide** quota:
three models at ~200K tokens a day each, so ~600K tokens a day across every user combined. A
grounded question costs ~4–5K tokens, so the whole app can answer roughly 120–150 questions a
day. A Gap Check costs ~30K, about six questions.

[ADR 0008](0008-one-narrow-privileged-write-path.md) gave each user a daily allowance through
`record_usage`, starting at 20 questions and 2 Gap Checks. That was half of one model's daily
budget for a single person, and per-user caps cannot protect a shared quota anyway: fifty users
each under a modest allowance still empty it. When the quota runs out, the recruiter link (D1) is
what breaks.

A second consumer competes for the same quota: evaluation. As first planned, the nightly
60-question run was ~300K tokens, half the day's budget, and each PR's 15-question subset ~75K. On
a busy day, evals alone could starve the live demo.

## Decision
**(a) Smaller starting allowances.** Signed-in users get 10 questions and 1 Gap Check a day;
anonymous sessions get 3 questions and no Gap Checks. They live in `private.daily_allowance`.

**(b) A global daily ceiling.** A counter per UTC day (`private.usage_global`) across all users,
starting at **100 weighted questions**, with a Gap Check weighing **6**. The ceiling and the
weight live in a one-row table, `private.quota_settings`, so they can be tuned with a plain
`UPDATE` and no migration.

- `record_usage` charges the personal and the global counter **in the same single statement**: two
  chained upserts, the global one running only if the personal one charged. Each upsert locks its
  row and re-checks its limit on the current value, so simultaneous requests cannot both take the
  last unit of either counter.
- If either counter refuses, the call raises, which undoes everything it did: **a refused call
  charges nothing**, personally or globally.
- A `CHECK (weighted <= ceiling)` on the counter row is a backstop: whatever code writes it, the
  database refuses a row over its ceiling.
- Each day's ceiling is copied onto that day's counter row when the row is created, which is what
  lets the CHECK work. So a tuning change applies from the next UTC day, unless today's row is
  updated too.

**(c) The demo degrades, it doesn't break.** Precomputed demo answers are plain reads of
`demo_answers` and never pass through `record_usage`, so they keep working when the ceiling is
reached. Only live questions are refused. The two refusals are distinguishable, so the UI can say
different things:

| `code` | HTTP | Meaning |
|---|---|---|
| `allowance_spent` | 429 | this session has used its own allowance for today |
| `ceiling_reached` | 429 | everyone together has used today's global ceiling |

Both carry `message: "TODO(copy)"`; the user-facing wording is Likith's to write. The codes come
from raising SQLSTATE `PGRST`, which lets PostgREST send the function's own JSON body and status.

**(d) Published evals run on Groq, the production path, and run less often.** *(Amended in
slice 0.3d; this supersedes the earlier line, recorded below.)*

- Published eval numbers (faithfulness, citation accuracy and the rest, on the public eval page,
  R14) are measured on **Groq**, the models users actually get. Numbers measured on a model no
  user ever touches would make the eval page misleading, and it is a portfolio artefact.
- The full 60-question run moves from nightly to **weekly**: ~300K tokens once a week instead of
  half the daily budget every day.
- The per-PR subset **shrinks and is path-filtered**: it runs only when a change touches prompts,
  retrieval or `packages/core`.
- **Gemini is for local iteration only**, where the question is whether a prompt change moved the
  number, not what the number is. Gemini results are never published.
- Every published run records **provider, model and prompt version**. `eval_runs` has `model` and
  `prompt_version`; the harness (slice 2.5) must fill them, and record the provider too.

~~Superseded: "Evals run on Gemini, not Groq … the eval harness and the CI eval jobs must target
the Gemini adapter explicitly."~~ That kept evals off the shared quota, but at the price of
publishing numbers for the wrong model. Weekly runs and path-filtered PR subsets keep the Groq
cost of evals small instead.

## Consequences
- The ceiling is proven in pgTAP rather than over HTTP: eleven users there cost no sign-ups
  against local Auth's rate limit. A separate pgTAP test fires twenty simultaneous questions over
  real connections (dblink) at a ceiling of five, and requires exactly five to succeed and the
  other fifteen to be refused cleanly.
- Test databases run with a ceiling the HTTP suite never reaches (set in `supabase/seed.sql`),
  because the suite spends about twenty weighted questions per run. The pgTAP tests set the real
  value back inside their own transaction.
- Question counts are a proxy for tokens. Token accounting (slice 2.2) should move the caps to
  tokens, or cap both (open item 5).
- Evals still draw on the shared Groq quota, and **the global ceiling does not see them**: the
  harness calls Groq directly, not through `record_usage`. On the weekly-run day the full run uses
  ~300K tokens, half the day's budget, while the ceiling still allows 100 user questions. Run it
  at a quiet hour, and if that day ever runs dry, lower that day's ceiling or move the run. The
  path filter keeps PR subsets off the quota for most changes (UI, docs, infrastructure).
- Regressions in a change that skips the PR subset are caught by the next weekly run, not
  immediately. That lag is the price of not spending the quota on every PR.
