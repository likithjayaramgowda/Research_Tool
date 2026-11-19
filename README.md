# LitLens

Ask questions of your research papers and get answers with a citation on every sentence.

LitLens is a RAG (retrieval-augmented generation) web app for research students. Upload up to 30
papers to a private workspace, then ask questions answered only from those papers. It also builds
paper cards, finds research gaps, and checks how relevant each paper is to your topic.

> **Status:** early prototype (slice 0.1, repo skeleton). No product features yet.
> This is a portfolio project, not a product.

## Repo layout
| Folder | What it is |
|---|---|
| `apps/web` | Next.js web app |
| `api` | FastAPI service (`/api/v1`) |
| `worker` | Modal worker for uploads and long jobs |
| `packages/core` | Shared Python package |
| `supabase` | Database and edge functions (coming) |
| `evals` | Answer-quality evaluations (coming) |
| `docs` | Plan, architecture decision records, prompt log |

## Quick start
Needs git, Python tooling via [uv](https://docs.astral.sh/uv/), Node 22 and pnpm.

```bash
uv sync --all-packages              # Python deps (installs Python 3.12 if needed)
pnpm --dir apps/web install         # web deps
uv run pre-commit install           # git hooks

uv run pytest                       # Python tests
uv run uvicorn app.main:app --app-dir api --reload   # API on :8000
pnpm --dir apps/web dev             # web on :3000
```
See [CLAUDE.md](CLAUDE.md) for all commands and coding standards, and [docs/adr](docs/adr) for why
things are built this way.

## Configuration
Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

## Licence
[MIT](LICENSE)
