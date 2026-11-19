# 2. Architecture v1

Date: 2026-11-19
Status: Accepted

## Context
LitLens answers questions about a student's own uploaded papers, with a citation on every
sentence. It is a portfolio prototype: it must be cheap (free), easy to demo, and show sound
engineering. The author is a data engineer, so the data layer should lean on Postgres and Python.

## Decisions and reasons

| Decision | Why |
|---|---|
| **Free tiers only, no payment card** | Removes any risk of surprise bills on a public demo. Forces simple, efficient design. |
| **Next.js (App Router, TS strict), Tailwind, shadcn/ui, Motion on Vercel Hobby** | The most common stack for modern web apps (good for a portfolio), with free hosting and previews. Strict TypeScript catches errors early. |
| **FastAPI on Vercel's Python runtime, under `/api/v1`** | Python is the author's strongest language and the natural home for RAG logic. Hosting the API next to the web app keeps deployment to one platform. The `/v1` prefix lets the API change without breaking clients. |
| **Supabase: Auth, Postgres + pgvector + full-text search, RLS, Storage, Realtime, pgmq, pg_cron, Edge Function `embed` (gte-small)** | One free service covers login (Google), files, vectors, keyword search, a job queue, scheduling and live updates. Row Level Security makes each student's workspace private at the database itself. Hybrid search (vectors plus full text) lives in one SQL database. The built-in gte-small model avoids paying for an embeddings API. |
| **Worker on Modal for uploads and long jobs only; Docling only here** | PDF parsing with Docling is heavy and slow, which does not fit short serverless functions. Isolating it keeps the API small and fast to start. |
| **Shared `core` Python package with light dependencies** | One place for logic the API and the worker both need (no copy and paste), kept light so it can ship inside the Vercel function. |
| **Groq via our own small provider-agnostic client** | Groq has a free tier and fast inference. A thin client we own means we can swap providers without touching the rest of the code, and shows we understand what an LLM SDK does. |
| **Public repo, MIT licence, no AGPL dependencies (so no PyMuPDF)** | MIT is permissive and portfolio-friendly. AGPL would force network-service source disclosure obligations, so those libraries are avoided. |
| **Never commit secrets** | Public repo. Secrets live in `.env` (ignored) and platform secret stores. |

## Added in slice 0.1
- **Python 3.12.** Vercel's Python runtime supports 3.12 (its default), 3.13 and 3.14.
- **uv workspace** (one lockfile for `api`, `worker`, `packages/core`), ruff, pyright (strict), pytest.
- **`apps/web` is its own pnpm project**, and Vercel's root directory will point at it.

## Consequences and known risks
- Vercel must be able to see `packages/core` when it builds `api/`, although `core` sits outside
  `api/`. We will solve this in the deployment slice (options: build step that vendors core, or
  moving the Vercel project root to the repo root).
- Free tiers have limits (cold starts, row and storage caps, rate limits). The design assumes small
  usage and a demo audience.
- Several services (Vercel, Supabase, Modal, Groq) means more moving parts than one server; the
  trade is zero cost.
