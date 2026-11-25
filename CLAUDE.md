# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo.

## Project summary
LitLens is a RAG web app for research students. They sign in with Google, upload up to 30 papers
(50 MB) to a private workspace, and ask questions answered **only** from those papers, with a
citation on every sentence. It also builds "paper cards", finds research gaps (including a "Gap
Check" of the student's own idea), and checks each paper's relevance to their topic. Recruiters can
try a demo without signing in. It is a portfolio prototype, not a product.

The project owner, author and copyright holder is **Likith Jayaram Gowda**, a data engineer
(strong Python and SQL, newer to web apps) who is learning from the code. Explain what you do and
why, in plain language.

The GitHub repo is named `Research_Tool` (`likithjayaramgowda/Research_Tool`) while the product is
LitLens, on purpose: an older archived repo already holds the LitLens name. Do not "correct" either.

## Fixed decisions (ask the owner before changing any of these)
- Free tiers only, and no payment card on any service.
- Web: Next.js (App Router, TypeScript strict), Tailwind, shadcn/ui, Motion. Hosted on Vercel Hobby.
- API: Python FastAPI on Vercel's Python runtime, under `/api/v1`.
- Data: Supabase: Auth, Postgres with pgvector and full-text search, RLS, Storage, Realtime,
  Queues (pgmq), pg_cron, and an Edge Function `embed` using the built-in gte-small model.
- Worker: Python on Modal, for uploads and long jobs only. Docling is used only here.
- Shared Python package `core`, used by both the API and the worker. Light dependencies only.
- LLM: Groq, through a small provider-agnostic client we write ourselves.
- Public GitHub repo, MIT licence, no AGPL dependencies (so no PyMuPDF). Never commit secrets.
- Python 3.12 (Vercel's default Python runtime; checked in slice 0.1).

**Read `docs/requirements-and-decisions.md` at the start of every slice.** It is the owner's
decision log (D1, D2, …), requirements register (R1, R2, …) and data model; prompts refer to
those IDs. It is a copy of a document the owner maintains outside the repo, so do not edit it;
ask the owner to update it instead.

See `docs/adr/` for the reasoning behind these. The visual rules (colour meanings, type, radii, the
"lens" interaction) are in `docs/design.md`; read it before changing any UI. Yellow means evidence
only and red means errors only.

## Repo map
```
apps/web/         Next.js app (own pnpm project; Vercel root directory)
api/              FastAPI app (app/main.py), tests in api/tests
worker/           Modal app (litlens_worker/app.py), tests in worker/tests
packages/core/    Shared pure-Python package litlens_core, tests in packages/core/tests
supabase/         Migrations, seed.sql (local test data), tests/ (pgTAP + isolation), config
evals/            Evaluation harness for answer quality (placeholder)
docs/             requirements-and-decisions.md, PLAN.md, adr/, prompts/ (log of how it was built)
```
Python is one uv workspace (root `pyproject.toml`, one `uv.lock`). Web is a separate pnpm project.

## Commands
Run from the repo root unless noted.

| Task | Command |
|---|---|
| Setup Python | `uv sync --all-packages` |
| Setup web | `pnpm --dir apps/web install` |
| Install git hooks | `uv run pre-commit install` |
| Python tests | `uv run pytest` |
| Python lint / format | `uv run ruff check .` / `uv run ruff format .` |
| Python types | `uv run pyright` |
| Web lint / typecheck | `pnpm --dir apps/web lint` / `pnpm --dir apps/web typecheck` |
| Web format | `pnpm --dir apps/web format` |
| Everything (hooks) | `uv run pre-commit run --all-files` |
| Run API (port 8000) | `uv run uvicorn app.main:app --app-dir api --reload` |
| Run web (port 3000) | `pnpm --dir apps/web dev` |
| Web unit tests (citation formats) | `pnpm --dir apps/web test:unit` |
| Web e2e: lens, theme, axe, screenshots | `pnpm --dir apps/web test:e2e` (builds first; screenshots go to `docs/screenshots/`) |
| Start local Supabase (Docker) | `supabase start` (applies migrations and `supabase/seed.sql`) |
| Rebuild the local database | `supabase db reset` |
| Database structure tests (pgTAP) | `supabase test db` |
| RLS and storage isolation tests | `uv run pytest supabase/tests/isolation` (needs Supabase running; refuses to run if a service-role key is in the environment) |

Health check: `curl localhost:8000/api/v1/health` returns `{"status":"ok"}`.

## Coding standards
- Types everywhere: Python passes `pyright` strict; TypeScript is `strict`.
- Every function gets a test.
- Small, focused commits with clear messages (Conventional Commits style: `feat:`, `fix:`, `chore:`, `docs:`).
- Explain changes for a learner: say what changed and why, not only what.
- Python: ruff for lint and format (line length 100). Web: ESLint and Prettier.

## Rules
- Never commit secrets. `.env` is git-ignored; `.env.example` lists variable **names only**.
- Ask before adding any dependency, and check its licence first.
- No AGPL dependencies (so no PyMuPDF).
- Keep heavy libraries (Docling, ML models, large parsers) out of `api/` and `packages/core/`.
  They belong in `worker/` only.
- Free tiers only; never add a service that needs a payment card.
- Change the fixed decisions only after asking the owner.
