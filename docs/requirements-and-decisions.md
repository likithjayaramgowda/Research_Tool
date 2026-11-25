# LitLens: Requirements & Decisions Log
_Living document. Read this first in any new LitLens chat. Last updated: 2026-11-25 (D24 quota governance, D25 activity and allowance reads)._

- **Author and copyright holder:** Likith Jayaram Gowda (D16).
- **Repo:** github.com/likithjayaramgowda/Research_Tool (D18). The product is still called LitLens everywhere else.
- **Master plan:** [LitLens — Final Project Plan](https://claude.ai/artifact/HVLRF17DMCtBgGovvfc831). It covers phases, to-dos, done-when checks, evaluation targets, risks and the timeline.
- **Progress and current status:** `claude/litlens-progress.md`, updated after every slice. It holds the slice log, learning-check results and next steps.
- This log holds decisions and verified facts. **A copy lives in the repo** at `docs/requirements-and-decisions.md`, and `CLAUDE.md` tells Claude Code to read it at the start of each slice. **Re-copy it whenever this file changes**, or the two drift apart. End the exported file with a trailing newline so it doesn't need a pre-commit carve-out.

## Vision
LitLens is a RAG web app for research students. Each student signs in with Google, uploads papers to a private workspace, and asks questions that are answered only from those papers, with citations. LitLens also extracts structured information and finds research gaps, including checking a student's own gap idea against their papers. It also checks each paper's relevance to the student's topic.

**Goal (D1):** a portfolio-grade prototype with a public link on Likith's resume and portfolio, so recruiters can try it. Not a product launch.

## Working agreement
- **Process:** discuss, decide, log the decision here, write the final plan, then build in thin slices.
- **Code:** Claude Code writes all of it from prompts prepared in this project. It runs as the VS Code extension on the dev laptop, and its end-of-task reports are pasted back here.
- **Prompt log:** every prompt is saved in the repo under `docs/prompts/` (D15).
- **Repo docs:** `CLAUDE.md`, a `docs/` copy of the plan and of this log, and an ADR for each decision.
- **Learning track:** done by Likith, as the author who presents the project in interviews (D16). Each phase has a concept explainer, an explain-it-back quiz, and one piece he writes or rewrites himself: UI microcopy, the RLS policy, chunking, the hybrid-search SQL, the golden questions, Gap Check screening, the threat model.
- **Hard constraints:** free-tier tools only, and no payment card on any service (D2).
- **Dev machine:** HP EliteBook x360 1040 G8, Intel Core i7-1165G7 (4 cores / 8 threads), 32 GB RAM, 1 TB, integrated graphics only, Ubuntu 26.04.1 LTS.
  - The whole stack runs locally: Supabase CLI in Docker, the worker, the parser and the embeddings.
  - Ollama is only for small offline prompt tests; real testing and evals run on Groq.
  - Pin the Python version per project with uv.

## Decision log
| ID | Decision | Reason |
|---|---|---|
| D1 | v1 is a portfolio prototype with a public link for recruiters. Any Google account can sign in. No public launch. | Portfolio goal |
| D2 | No payment card on any service, so the worst case is a service pausing until its quota resets. Cloudflare R2 is dropped; PDFs stay in Supabase Storage (1 GB) behind guardrails. | A card on file makes overage billing possible |
| D3 | LLM quota: shared keys with per-student daily caps in v1. Optional bring-your-own key in v1.1, kept in the browser and sent per request, never stored or logged. | Confirmed in chat |
| D4 | Public GitHub repo. Secrets are never committed (.env plus GitHub secret scanning). No AGPL dependencies, so PyMuPDF is out. MIT licence. | Portfolio visibility; clean licensing |
| D5 | Every user-facing LLM call goes through Groq. Gemini's free tier is used only for the author's own dev/eval work on public papers. | EU/UK recruiters (Gemini's free tier isn't allowed for apps there); privacy |
| D6 | Google sign-in uses only basic scopes (openid, email, profile). The OAuth app is published so any Google account works, with free brand verification so the sign-in screen shows "LitLens". | Clarifies R2 |
| D7 | Verdicts for R1, R3, R4, R5, R7 and R8 accepted; no objections were raised. | n/a |
| D8 | Recruiters can try the demo without signing in: an anonymous Supabase session behind a Turnstile bot check, read access to the demo workspace, and a small live-question allowance. Uploading needs Google sign-in. | Confirmed in chat |
| D9 | Uploads from accounts inactive for 30 days are deleted. The upload screen says so clearly. | Confirmed in chat |
| D10 | Gap Check design confirmed. The wider-literature search ships right after the core works. | Confirmed in chat |
| D11 | Extensibility is a requirement: features can be added after the core without rewrites (R15). | Confirmed in chat |
| D12 | Architecture v1 approved, including Python FastAPI on Vercel for the API. | Confirmed in chat |
| D13 | Pace is as fast as possible. Targets at ~15–20 h/week: Milestone A (resume-ready link) on 13 Dec 2026, Milestone B (full v1) on 10 Jan 2027, Milestone C (extras) on 24 Jan 2027. The demo workspace and basic guardrails moved into Phase 2, and the first deploy into Phase 0, so a live link comes early. | Confirmed in chat: ASAP |
| D14 | Demo papers cover RAG and LLM evaluation and must be CC BY licensed. Likith writes the 60-question golden set: 40 answerable, 20 unanswerable. | Best for hiring |
| D15 | Prompt log in `docs/prompts/`, plus a README section "How I built it with AI". | Honest AI use; interview value |
| D16 | The project author and copyright holder is Likith Jayaram Gowda. His name goes in the LICENSE, README, package metadata, CLAUDE.md and the plan doc byline, and the GitHub repo lives under his account (likithjayaramgowda). The learning checks and hand-written pieces are his. | Stated in chat on 2026-11-19 |
| D17 | Design direction: a light table for reading papers. White sheets on a cool desk, ink text, and one highlighter yellow that only ever means evidence. Palette: Desk #E9EDF0, Sheet #FFFFFF, Ink #18233A, Graphite #5B6675, Highlighter #FFE14D (citations and highlighted passages only), Alert #B42318 (errors only); the dark mode keeps the same meanings on a deep ink-navy desk. Type: Literata for reading, headings, answers and passages; Atkinson Hyperlegible Next for UI. Signature interaction: the lens, where choosing a citation focuses its source passage. Avoided: gradients, shadow-card grids, all-caps labels, eyebrows, arrows on buttons, monospace labels. | Grounded in reading and checking papers; avoids generic templates |
| D18 | The GitHub repo is named `Research_Tool`, under likithjayaramgowda. An earlier broken LitLens repo keeps the `LitLens` name and stays archived, so the name can't be reused. The app, the docs and the UI still say LitLens; only the repo name differs, and the README and portfolio links point at Research_Tool. | Stated in chat on 2026-11-23 |
| D19 | Motion: LitLens gets a live animated background, but only on screens with nothing to read — home, sign-in and empty states. The library, answer column and source panel stay still. The animation is a **live demo loop**: the real interaction replaying itself. It is built from the real design-system components on sample data, not a video, GIF or canvas particle library. It must honour `prefers-reduced-motion` by rendering the end state statically, pause when off-screen or when the tab is hidden, cause no layout shift, and keep home's mobile Lighthouse performance at 90 or above. D17's avoid list still applies. Sign-in gets a quieter variant that plays once rather than looping. | Asked for a live, interactive-looking background; motion behind long-form reading text would fight the core task, and a demo loop sells the product in the first seconds |
| D20 | The citation style switcher (APA 7, MLA 9, Chicago author-date, Harvard, IEEE, Vancouver) and the References block stay in the app shell, expanding R5. Condition: references must degrade gracefully. When reference metadata is missing, render what is known and mark the gaps visibly; never invent a volume, issue, page range or journal. Revisit once slice 1.2 shows what Docling actually extracts. The same principle applies to paper cards: a field the papers don't state is left empty rather than filled in. | Stated in chat on 2026-11-23; a fabricated reference would undercut "every claim is checkable" |
| D21 | Usage is recorded against `auth.users(id)`, not `profiles(id)`, so anonymous demo sessions are metered. Anonymous sessions get no profile row. The demo collection has no owner, is seeded by a migration with a fixed id, and is readable by every authenticated session, anonymous or signed in; only the service role writes to it. | The anonymous live-question allowance (D8) has to be enforced somewhere, and the API on Vercel is stateless, so the database is the only place it can live |
| D22 | Metering and activity go through **one `security definer` function**, `public.record_usage(kind)`, called with the user's own JWT. Its only argument says what to count, never whose. Check and count happen in a single statement. Users have no direct write on `usage_daily`, and `last_active_at` is not user-writable. **The API never holds the service-role key**; the Modal worker stays the only service-role component. A pgTAP check lists every `security definer` function in `public` and fails CI when a new one appears, so the "one narrow surface" claim is enforced rather than asserted. | The API is internet-facing and the worker is not, so giving the API a service-role key widens the blast radius for no gain |
| D23 | Live answers given to anonymous demo sessions are **not persisted**. They are held in the client for the session. Evaluation traces still go to Langfuse. As a result anonymous sessions never write to the database at all. | Keeps the 500 MB database for real users, keeps the D9 clean-up simple, and leaves a clean RLS story |
| D24 | **Quota governance.** Per-user allowances alone cannot protect an org-wide quota, so there are three parts. (a) Starting allowances: signed-in users get 10 questions and 1 Gap Check a day; anonymous sessions get 3 questions and no Gap Checks. (b) A **global daily ceiling** across all users, starting at 100 questions a day with Gap Checks counting as six questions each, since one is ~30K tokens against ~5K for a question. (c) When the global ceiling is hit, precomputed demo answers keep working, because they cost nothing, and live questions are refused with an honest message. (d) **Evals run on Gemini, not Groq**, as D5 already permits for the author's own work on public papers, and the demo set is CC BY by D14. | Three Groq models give ~600K tokens a day across every user combined, so 20 questions is half of one model's budget for one person and six active users would empty the shared quota. Separately, the nightly 60-question eval is ~300K tokens and each PR's 15-question subset ~75K, so on a busy day evals alone could starve the live demo. Quota exhaustion must degrade the recruiter link, never break it |
| D25 | **Activity is any session, not just a metered event.** A third kind on `record_usage` counts nothing and only stamps `last_active_at`, called once per session on app load, so reading your library keeps your data alive under D9 and no new privileged surface is added. Separately, the remaining allowance is read by widening the existing `usage_daily` select policy to `auth.uid()`, so anonymous sessions can read their own row too; writes stay function-only. | Deleting a user's papers because they read without asking would be a bug, not a policy. A read policy is cheaper than a second `security definer` function and keeps D22's single-surface claim intact |

## Requirements register
Status key: PROPOSED · AGREED · LATER · DROPPED

| ID | Requirement | Verdict / notes | Status |
|---|---|---|---|
| R1 | Beautiful, interactive UI | Next.js, Tailwind, shadcn/ui and Motion, with the design direction in D17. Motion is scoped by D19. | AGREED |
| R2 | Login | Google sign-in for any Google account (D6), plus anonymous demo sessions (D8). Email/password comes later and needs custom SMTP. | AGREED (email/password: LATER) |
| R3 | Private workspace per student | Postgres RLS. The API queries with the user's JWT so RLS always applies. Anonymous demo sessions arrive as the `authenticated` role, so policies separate them by the `is_anonymous` JWT claim, not the database role. | AGREED |
| R4 | 50 MB / 30 papers per student, ~20 MB per file | Enforced server-side at upload, not as database constraints, so an oversized paper fails with a readable status rather than a constraint error. Scanned PDFs are rejected in v1. Supabase Storage only (D2). Proposed page limit: 60. | AGREED |
| R5 | Answers only from papers | "Every claim is checkable": sentence-level citations, the passage highlighted in the PDF, abstain when evidence is weak, verification checks, faithfulness evals. Citations render in six styles with a References block (D20). | AGREED |
| R6 | Research gaps | (a) Author-stated gaps. (b) AI-suggested gaps across papers. (c) Gap Check. The wider-literature check comes right after the core (D10). | AGREED (wider check: LATER) |
| R7 | Information extraction | Paper cards plus a comparison table across papers. Text and tables in v1; figures and equations later. One current card per paper, replaced on re-run. | AGREED |
| R8 | Relevance to topic | A research profile and a relevance label with quoted reasons. Each verdict stores the topic it was checked against, so a changed topic shows the verdict is stale. | AGREED |
| R9 | Free tier only | Portfolio scale, no card anywhere | AGREED |
| R10 | More features later | Backlog, made possible by R15 | AGREED |
| R11 | Recruiter demo | A demo workspace of ~10 CC BY open-access papers on RAG and LLM evaluation (D14). Suggested questions have precomputed answers, which also keep the demo alive when the global ceiling is hit (D24). Anonymous allowance per D8, metered per D21/D22, answers not stored per D23. | AGREED |
| R12 | Always awake | A daily Vercel cron as keep-alive; pg_cron can't do it because it stops when the project pauses. Recruiter-facing paths only use services that never sleep. | AGREED |
| R13 | Open sign-up guardrails | Per-student caps and a global daily ceiling (D24), a global cap on active workspaces (demo-only when full), 30-day inactivity clean-up (D9/D25), rate limits, Turnstile. | AGREED |
| R14 | Portfolio polish | Landing page, a "How it works" page with the diagram, a public eval page, a README with a GIF, ADRs. The home demo loop (D19) is pulled forward into 0.2b. | AGREED |
| R15 | Extensibility | See the extensibility design below. | AGREED |

## Gap Check design (R6c), AGREED
- **Input:** the student's own gap idea or research question.
- **Split** it into parts: method, task, data, region/setting, metric.
- **Check every paper, not just the top-k results:**
  - Screen cheaply first: exact keyword search plus vector search for each part.
  - Then the LLM rates each paper on each part (covers / partly / doesn't), working from paper cards and reading passages only for borderline papers.
  - Every rating quotes its supporting sentence.
- **Output:** an object, not a list, holding a coverage grid (papers × parts), a verdict, the closest papers and what each lacks, and keyword hit counts as deterministic evidence.
- **Runs as a background job** with a status and live progress, so the row exists from the moment the check is queued. The user may queue one and delete their own, but never update one; results are written by the worker.
- **Boundary:** "not covered" means not in the uploaded papers. The wider check (after the core) uses Semantic Scholar / OpenAlex, never the model's memory.
- **Cost:** ~30K tokens per check, so it counts as six questions against the global ceiling (D24) and has its own daily cap.
- **Interview angle:** top-k retrieval proves presence, never absence. Proving absence needs an exhaustive pass, kept affordable by screening cheaply first.

## Architecture v1 (APPROVED, D12)

### Components
- **Web app:** Next.js (App Router, TypeScript) on Vercel Hobby, with Tailwind, shadcn/ui and Motion.
  - The PDF viewer uses PDF.js (react-pdf), with highlight overlays drawn from the parser's bounding boxes.
  - Supabase JS handles sessions and Realtime progress.
- **API:** Python FastAPI on Vercel's Python runtime. It handles chat (retrieve → generate → verify → stream), upload intents, job enqueueing, usage caps and demo answers, the pre-upload DOI/arXiv check, and the daily maintenance endpoint called by the Vercel cron.
  - It queries with the user's JWT only, and never holds the service-role key (D22).
  - The deployment shape (one Vercel project with a same-domain rewrite, or two projects) is decided in slice 0.5.
- **Supabase:**
  - Auth: Google, plus anonymous demo sessions behind Turnstile.
  - Postgres: tables, pgvector HNSW, full-text tsvector, RLS, helper functions in a `private` schema, `public.record_usage`, and SQL functions such as `hybrid_search` (RRF fusion).
  - Storage: a private `papers` bucket, PDF only, with per-user folders and a `demo/` folder readable by every session.
  - Realtime: live progress.
  - Queues (pgmq) for jobs, and pg_cron for in-database housekeeping.
  - Edge Function `embed`: the built-in gte-small (384-dim). It is the only embedder, for both chunks and queries.
- **Worker:** Python on Modal (no card), for uploads and long jobs only.
  - Pipeline: Docling parsing (MIT; layout, sections, tables, bounding boxes) → section-aware chunks → embeddings via `embed` in small batches → paper card → relevance → author-stated gaps.
  - It also runs the Gap Check and AI-suggested gap jobs.
  - It uses the service-role key. It is the only privileged component, and the threat model documents it.
  - Fallback parser if Docling is too heavy: pypdfium2 plus layout rules.
- **LLM layer:** a thin provider-agnostic client in the shared core, built on the OpenAI-compatible API.
  - A fallback chain across Groq models that reads rate-limit headers.
  - JSON-schema outputs validated with Pydantic, plus per-user token accounting.
  - The Gemini adapter serves dev work and the eval harness (D24), never user traffic.
- **Shared Python core (`packages/core`):** models, chunking, versioned prompts, citation parsing and verification, the LLM client and quotas. Light dependencies only; Docling lives only in the worker.
- **Ops:**
  - GitHub Actions: lint, types and tests; a database job that starts Supabase and runs the RLS suite; a 15-question eval subset on each PR; the full 60-question eval nightly. Eval jobs target Gemini (D24).
  - Langfuse Cloud Hobby for traces, storing question and chunk IDs rather than whole paper text.
  - A daily Vercel cron for keep-alive, the 30-day clean-up and usage resets.

### Request flows
- **Question:**
  1. Browser → API, using the user's JWT.
  2. `embed`, then the `hybrid_search` RPC.
  3. If the evidence is weak, abstain without calling the LLM.
  4. Otherwise, stream from Groq with numbered sources.
  5. Map citations and run deterministic checks: every sentence is cited, the cited IDs exist, and quoted spans match.
  6. Optional LLM-judge pass, kept only if evals show it helps.
  7. Save the message and trace, and record usage through `record_usage` (D22). Anonymous sessions skip the message save (D23).
- **Upload:**
  1. The browser asks the API for an upload intent.
  2. The API checks caps and returns a signed URL.
  3. The browser uploads straight to Storage, because Vercel caps function request bodies (~4.5 MB; verify in Phase 1).
  4. The API enqueues a job and the worker processes it.
  5. Progress reaches the UI via Realtime, from a 0–100 field on `papers` rather than a page count, since chunking and embedding aren't measured in pages and the page count is unknown until the parser opens the file.

### Data model (built in slice 0.3)
profiles · collections · papers · chunks · paper_cards · relevance · gap_checks · messages · usage_daily · demo_answers · eval_runs.

Shape decisions made at the 0.3 checkpoint:
- Ownership flows `auth.users` → `profiles` → `collections.owner_id` → everything else, all cascading on delete, which also gives R14's delete-account for free.
- The demo collection has a null owner and a fixed id, with at most one enforced by a partial unique index (D21).
- Every table holding generated output stores what produced it. LLM tables carry `model` and `prompt_version`; chunks carry `embedding_model` and `chunker_version` instead, because a chunk has no prompt. This is what makes R15's "re-run jobs, don't rebuild" work.
- `papers` carries nullable reference metadata from day one for D20, and may legitimately stay empty. Paper-card fields are nullable for the same reason.
- `chunks.fts` is a stored generated tsvector; the vector column is nullable until `embed` has run, with a check tying it to `embedding_model`.
- `gap_checks.paper_ids` is a snapshot array rather than foreign keys, so a historical check still reads correctly after a paper is deleted. `result` is an object and stays null until the job finishes.
- Foreign keys are not indexed automatically, so `papers(collection_id)` and `collections(owner_id)` carry explicit indexes.
- Limits (30 papers, 50 MB, 60 pages) are enforced at upload, not as constraints (R4).

### Key decisions (ADR candidates)
1. Split by latency: the interactive path is always awake; the background path can sleep.
2. Postgres is the backbone: relational data, vectors, keyword search, queue, schedules and RLS in one database.
3. One embedder (Supabase gte-small) for chunks and queries. No third party sees the text, and the vectors are identical.
4. Python for all AI logic (shared core); TypeScript only for the UI.
5. The demo runs on anonymous sessions, Turnstile and a question allowance; suggested questions are precomputed.
6. A thin custom LLM client instead of a heavy framework: a smaller bundle, a fallback chain, and learning value.
7. The reranker waits until evals justify it (candidate: a small cross-encoder in the API).
8. RLS is the tenancy boundary. The API queries with the user's JWT; the worker's service-role key is the single privileged path, with one narrow `security definer` function as the only exception (D22), guarded by a pgTAP check that fails CI if a second appears.
9. User traffic and evaluation run on different providers, so a day of heavy evals cannot starve the live demo (D24).

### Extensibility design (R15)
- **Feature modules:** each feature owns its migration, API routes, job type, prompts and UI page, and sits behind a feature flag.
- **Job chain:** the upload pipeline is a chain of jobs, so a new per-paper feature becomes a new job type.
- **Swappable interfaces:** Parser, Embedder, LLMClient, Retriever. Stored results carry version stamps, so upgrades mean re-running jobs, not rebuilding.
- **Data-model headroom:** a `collections` table from day one, one per student for now.
- **Versioning:** DB migrations live in git (Supabase CLI), and the API sits under `/api/v1`.
- **Regression gate:** tests and the eval suite run on every change.
- **Repo docs:** the backlog and ADRs live in the repo.

### Build order (matches the master plan)
0. **Foundations:**
   - 0.1 repo skeleton and CI
   - 0.1b author metadata and push
   - 0.2 design system and app shell
   - 0.2b checkpoint fixes, demo loop (D19) and citation styles (D20)
   - 0.3 Supabase schema and RLS with tests
   - 0.3b the privileged write path (D22)
   - 0.3c quota governance (D24) and the activity ping (D25)
   - 0.4 Google and anonymous demo sign-in
   - 0.5 first deploy
1. **Uploads:** 1.1 limits and signed direct upload · 1.2 Modal and Docling parsing · 1.3 section-aware chunking and embeddings · 1.4 live progress
2. **Cited answers, demo, first live link (Milestone A):** 2.1 hybrid search SQL · 2.2 LLM client · 2.3 chat with citations · 2.4 PDF highlight · 2.5 eval harness v1 · 2.6 demo workspace · 2.7 basic guardrails, keep-alive and clean-up
3. **Research features:** 3.1 paper cards and comparison table · 3.2 relevance · 3.3 author-stated and AI-suggested gaps · 3.4 Gap Check
4. **Portfolio polish (Milestone B):** 4.1 security pass · 4.2 tracing and public eval page · 4.3 "How it works" · 4.4 privacy and delete-account · 4.5 README, ADRs and "How I built it with AI"
5. **Extras (Milestone C):** 5.1 wider-literature and DOI/arXiv check · 5.2 BYOK · 5.3 reranker experiment · 5.4 email/password

## Evaluation targets (first guesses; adjust after the first full run)
Retrieval recall@10 ≥ 0.85 · faithfulness ≥ 0.90 · citation accuracy ≥ 0.90 · correct abstention ≥ 0.90 · median time to first token < 4 s (warm).

## Free-tier facts (checked 2026-11-19 unless noted; re-check before relying on them)
- **Supabase Free:** no card. 500 MB DB, 1 GB storage, 50k MAU, 5 GB egress, 2 projects. Pauses after 7 idle days, and pg_cron only runs while active. Default SMTP sends only to team members, 2/hour. pg_cron on all plans; Queues uses pgmq. Anonymous sign-ins supported, ~30/hour per IP, CAPTCHA via hCaptcha or Turnstile. **Local Auth also limits sign-ups to 30 per 5 minutes, which test suites hit easily.**
- **Supabase Edge Functions:** built-in gte-small is the only embedding model. 256 MB memory, 150 s wall clock, 2 s CPU per request (one doc page says 200 ms), so design for small batches.
- **Groq Free** (org-wide): gpt-oss-120b, gpt-oss-20b and qwen3.8-27b, each 30 RPM, 1K RPD, 8K TPM, 200K TPD. No card. Reported not to train on data. Free Llama Prompt Guard 2 models.
- **Gemini API Free** (dev and eval only): quotas cut Dec 2025; Flash-class only since Apr 2026. Limits shown only in AI Studio. Unpaid data is used to improve Google products, and paid services are required for EEA/CH/UK users.
- **Google OAuth:** in Testing, only 100 listed test users, except basic-scope apps which anyone can use after a warning. "Publish app" opens it to any Google account. The app name shows only after verification.
- **Vercel Hobby:** free, non-commercial, never bills overage and may pause instead. Functions up to 300 s. Python runtime supports zero-config FastAPI and streaming, 500 MB bundle limit. Cron at most once per day (±59 min).
- **Modal:** $0.0000131 per core-second and $0.00000222 per GiB-second. ~$0.004 per paper parse, so ~1,200 papers/month on $5. No-card credit $5 or $30 (confirm at signup). Workloads stop rather than bill.
- **Langfuse Cloud Hobby:** 50k units/month, 30 days of data, 2 users, no card.
- **Semantic Scholar API:** free key gives 1 RPS; attribution required.
- **OpenAlex:** free key gives $1/day; ID/DOI lookups are free.
- **httpx2** (checked 2026-11-25): Pydantic Services took over stewardship of httpx under this name in May 2026. BSD-3, drop-in, same API. Current 2.16.2; a high-severity vulnerability is reported against 2.0.0, so keep the pin current.
- **Not used:** Hugging Face Spaces (Docker paid since Jul 2026) · Oracle Always Free (needs a card; halved to 2 OCPU / 12 GB) · Render Free (512 MB, 0.1 CPU, ~1 min wake) · Cloudflare R2 (needs a card).
- **Competitor:** NotebookLM (now Gemini Notebook) is free with 50 sources per notebook.
- **India DPDP Rules:** notified 13 Nov 2025; the compliance window ends 13 May 2027.

## Capacity estimates (to refine)
- One grounded question ≈ 4–5K tokens. No single request can exceed ~8K tokens.
- Three Groq models at 200K TPD each ≈ **600K tokens a day across all users combined**, so roughly 120–150 questions a day in total. This is the number the global ceiling in D24 protects.
- One Gap Check ≈ 30K tokens, about six questions.
- Evals are the other big consumer: the nightly 60-question run ≈ 300K tokens and each PR's 15-question subset ≈ 75K. This is why they run on Gemini (D24).
- Paper cards for a full 30-paper library use most of one model's daily budget, so extraction is queued, works from key sections, and spreads across models.
- DB: ~1,500 chunks per full library at ~5 KB per chunk, so ~40–60 full libraries fit in 500 MB.

## Gotchas to remember
- GitHub Actions schedules in public repos are disabled after 60 days without repo activity. Use the Vercel cron for keep-alive.
- Never mix embeddings from different gte-small runtimes.
- The demo papers need CC BY (or similar) licences; check the licence on each arXiv page.
- Push to `likithjayaramgowda/Research_Tool` (D18) with `gh` logged in as likithjayaramgowda, and run `gh` and `git` from the repo folder, never from /tmp.
- Next generates some types only during a build, so a type that exists locally can be missing on a fresh CI checkout.
- Supabase anonymous sign-ins arrive as the `authenticated` role, not `anon`. Use the `is_anonymous` JWT claim, not the database role.
- Postgres does not index foreign keys automatically, and RLS policies filter on them on every query.
- A table with RLS enabled and no policy is deny-all. Isolation tests pass against it while the feature is completely broken, so isolation tests alone never prove a policy is right. Mutation-test instead: the 0.3 and 0.3b suites were proven by deliberately breaking the thing they guard.
- Check-and-count must happen in one statement, or two simultaneous requests both spend the last remaining question.
- TRUNCATE ignores RLS, so API roles must not have it.
- Test suites that sign up users hit local Auth's 30-per-5-minutes limit fast. Keep sign-ups per run in the low single digits.
- **httpx2 silences httpx-based instrumentation.** OpenTelemetry's HTTPXClientInstrumentor, the Sentry integration, respx, pytest-httpx and vcrpy go quiet unless `httpx2.alias_httpx()` runs before anything imports httpx. This will bite when Langfuse tracing is wired up in 2.2 and 4.2.

## Backlog
MCP server for querying a library from assistants · Zotero/BibTeX import/export · related-paper suggestions · literature-review outlines · multiple collections per student · figure/equation understanding · history of paper cards and relevance verdicts across prompt versions · persisting anonymous demo answers if the demo ever needs shareable transcripts (D23).

## Open items
1. Modal's no-card credit amount ($5 or $30): confirm when the account is created in slice 1.2.
2. The Python version pinned in 0.1 (`.python-version`): confirm it matches what Vercel's Python runtime supports.
3. What reference metadata Docling actually returns per paper. The References block (D20) depends on it. Confirm in slice 1.2 and revisit D20 then.
4. Nothing stops the service role deleting the demo collection, and the seed lives in a migration that will not re-run. Optional guard: a trigger blocking deletes where `is_demo`.
5. Token accounting (2.2) should move the cap from question counts to tokens, or cap both. Question counts are a proxy; tokens are the real cost unit.
