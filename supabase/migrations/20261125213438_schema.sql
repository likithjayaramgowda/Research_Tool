-- Slice 0.3: the eleven LitLens tables.
--
-- Shape of the data:
--
--   auth.users ─1:1─ profiles ─1:n─ collections ─1:n─ papers ─1:n─ chunks
--        │                               │                 ├─1:1─ paper_cards
--        │                               │                 └─1:1─ relevance
--        │                               ├─1:n─ messages
--        │                               └─1:n─ gap_checks
--        └─1:n─ usage_daily   (keyed on auth.users so anonymous demo sessions are metered, D21)
--
--   demo_answers, eval_runs: stand alone (not owned by any user).
--
-- Every owned row reaches its owner through collections.owner_id. Deleting a user deletes their
-- profile and usage, which cascades through everything they own (the 30-day clean-up, D9, and
-- delete-account, R14, rely on this).
--
-- RLS is switched on for every table as it is created, so no table is ever exposed without it.
-- With RLS on and no policy, a table is deny-all for the API roles. The policies themselves
-- arrive in the next migration (slice 0.3, Task 3). The service role bypasses RLS.
--
-- Generated results (chunks, paper_cards, relevance, gap_checks, plus assistant messages and
-- demo_answers) record which model and prompt version produced them (R15), so an upgrade means
-- re-running the jobs whose rows are out of date, not rebuilding the database.


-- ── profiles ────────────────────────────────────────────────────────────────────────────────
-- One row per signed-in (non-anonymous) user. Created by a trigger on auth.users below.
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text,
  citation_style  text not null default 'apa'
                  check (citation_style in ('apa', 'mla', 'chicago', 'harvard', 'ieee', 'vancouver')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- D9: users inactive for 30 days are cleaned up. The API bumps this on use.
  last_active_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
create index profiles_last_active_at_idx on public.profiles (last_active_at);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

comment on column public.profiles.last_active_at is
  'D9: the inactivity clean-up deletes users whose last_active_at is over 30 days old.';


-- ── collections ─────────────────────────────────────────────────────────────────────────────
-- A workspace of papers. A user's collections have owner_id set. The single demo collection
-- (D8) has no owner: it belongs to the app, is written only by the service role, and is the
-- one thing an anonymous session may read.
create table public.collections (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references public.profiles (id) on delete cascade,
  is_demo         boolean not null default false,
  name            text not null check (length(name) between 1 and 200),
  -- The student's research topic; relevance checks compare each paper against it.
  research_topic  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint collections_demo_has_no_owner
    check ((is_demo and owner_id is null) or (not is_demo and owner_id is not null))
);
alter table public.collections enable row level security;
create index collections_owner_id_idx on public.collections (owner_id);
-- At most one demo collection: a unique index over a constant, limited to demo rows.
create unique index collections_one_demo_idx on public.collections ((true)) where is_demo;
create trigger collections_set_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

-- ...and at least one: the demo collection exists from the first migration, with a fixed id so
-- the app and the tests can refer to it. Its papers are loaded later by the worker.
insert into public.collections (id, owner_id, is_demo, name)
values ('00000000-0000-0000-0000-0000000000de', null, true, 'Demo library');


-- ── papers ──────────────────────────────────────────────────────────────────────────────────
-- An uploaded PDF and what the parser learned about it. Reference metadata (D20) is all
-- nullable: nothing has yet shown what Docling reliably returns, and the References block
-- shows a visible gap rather than a guess.
create table public.papers (
  id                 uuid primary key default gen_random_uuid(),
  collection_id      uuid not null references public.collections (id) on delete cascade,
  -- Path of the PDF inside the private storage bucket (slice 0.3, Task 4).
  storage_path       text not null unique,
  original_filename  text not null,
  file_size_bytes    bigint not null check (file_size_bytes > 0),
  status             text not null default 'uploading'
                     check (status in ('uploading', 'reading', 'ready', 'failed')),
  error              text,
  -- 0–100 while uploading or reading ("Reading 62%"); pushed over Realtime in slice 1.4.
  -- A percentage rather than pages_done/page_count because not every stage is counted in pages
  -- (chunking, embedding), and page_count is unknown until the parser has opened the file.
  progress           smallint not null default 0 check (progress between 0 and 100),
  page_count         integer check (page_count > 0),
  -- Reference metadata, all optional.
  title              text,
  -- [{"family": "...", "given": "..."}, ...] in author order; empty when none were found.
  authors            jsonb not null default '[]'::jsonb check (jsonb_typeof(authors) = 'array'),
  year               smallint check (year between 1000 and 9999),
  journal            text,
  volume             text,
  issue              text,
  page_range         text,
  doi                text,
  publisher          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.papers enable row level security;
create index papers_collection_id_idx on public.papers (collection_id);
create trigger papers_set_updated_at before update on public.papers
  for each row execute function public.set_updated_at();

comment on column public.papers.page_range is
  'Pages in the journal, e.g. 412–429 (D20). Not the page count of the PDF.';


-- ── chunks ──────────────────────────────────────────────────────────────────────────────────
-- Passages of a paper that answers cite. Written by the worker; embedded by the `embed` edge
-- function, so `embedding` stays null until that has run.
create table public.chunks (
  id               uuid primary key default gen_random_uuid(),
  paper_id         uuid not null references public.papers (id) on delete cascade,
  ordinal          integer not null check (ordinal >= 0),
  section          text,
  page_start       integer not null check (page_start >= 1),
  page_end         integer not null,
  text             text not null,
  -- [{"page": 4, "x0": ..., "y0": ..., "x1": ..., "y1": ...}, ...] for the lens highlight.
  bboxes           jsonb not null default '[]'::jsonb check (jsonb_typeof(bboxes) = 'array'),
  -- gte-small produces 384 dimensions.
  embedding        extensions.vector(384),
  -- Keyword search. Postgres keeps this up to date itself whenever `text` changes.
  fts              tsvector generated always as (to_tsvector('english'::regconfig, text)) stored,
  -- R15. For chunks, the "model" is the embedding model and the "prompt version" is the
  -- version of the chunking code; there is no LLM prompt involved.
  embedding_model  text,
  chunker_version  text not null,
  created_at       timestamptz not null default now(),
  constraint chunks_page_order check (page_end >= page_start),
  constraint chunks_paper_ordinal_key unique (paper_id, ordinal),
  constraint chunks_embedding_has_model check ((embedding is null) = (embedding_model is null))
);
alter table public.chunks enable row level security;
create index chunks_embedding_hnsw_idx on public.chunks
  using hnsw (embedding extensions.vector_cosine_ops);
create index chunks_fts_idx on public.chunks using gin (fts);


-- ── paper_cards ─────────────────────────────────────────────────────────────────────────────
-- The five-field summary card of a paper. One current card per paper; re-running replaces it.
-- Every field is nullable: a paper that doesn't state its method gets a null method, never an
-- invented one (D20 applies to cards as well as references).
create table public.paper_cards (
  id              uuid primary key default gen_random_uuid(),
  paper_id        uuid not null unique references public.papers (id) on delete cascade,
  question        text,
  method          text,
  data            text,
  findings        text,
  limitations     text,
  -- Chunk ids supporting each field: {"question": ["<chunk id>", ...], ...}.
  citations       jsonb not null default '{}'::jsonb check (jsonb_typeof(citations) = 'object'),
  model           text not null,
  prompt_version  text not null,
  created_at      timestamptz not null default now()
);
alter table public.paper_cards enable row level security;


-- ── relevance ───────────────────────────────────────────────────────────────────────────────
-- How relevant a paper is to its collection's research topic. One current verdict per paper.
create table public.relevance (
  id              uuid primary key default gen_random_uuid(),
  paper_id        uuid not null unique references public.papers (id) on delete cascade,
  -- The topic as it was when checked, so a changed topic shows the verdict is stale.
  topic           text not null,
  verdict         text not null check (verdict in ('relevant', 'partly', 'not-relevant')),
  reason          text not null,
  citations       jsonb not null default '[]'::jsonb check (jsonb_typeof(citations) = 'array'),
  model           text not null,
  prompt_version  text not null,
  created_at      timestamptz not null default now()
);
alter table public.relevance enable row level security;


-- ── gap_checks ──────────────────────────────────────────────────────────────────────────────
-- A Gap Check (R6c) of the student's own idea against the papers in a collection. It runs as a
-- background job: the row is created when the check is queued and the UI watches status and
-- progress until the worker fills in `result`.
create table public.gap_checks (
  id              uuid primary key default gen_random_uuid(),
  collection_id   uuid not null references public.collections (id) on delete cascade,
  idea            text not null check (length(idea) between 1 and 4000),
  status          text not null default 'queued'
                  check (status in ('queued', 'running', 'done', 'failed')),
  progress        smallint not null default 0 check (progress between 0 and 100),
  error           text,
  -- The papers the check covered, in column order. Not foreign keys: a later paper deletion
  -- should not rewrite a past result.
  paper_ids       uuid[] not null default '{}',
  -- Null until done. {"grid": ..., "verdict": ..., "closest": [...], "keyword_hits": {...}}:
  -- coverage grid (papers × parts), verdict, closest papers and what each lacks, keyword counts.
  result          jsonb check (result is null or jsonb_typeof(result) = 'object'),
  model           text not null,
  prompt_version  text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint gap_checks_result_when_done check ((status = 'done') = (result is not null))
);
alter table public.gap_checks enable row level security;
create index gap_checks_collection_id_idx on public.gap_checks (collection_id, created_at);
create trigger gap_checks_set_updated_at before update on public.gap_checks
  for each row execute function public.set_updated_at();


-- ── messages ────────────────────────────────────────────────────────────────────────────────
-- The question-and-answer history of a collection. An assistant message stores its answer as
-- sentences with citations in `answer`, and records the model that wrote it.
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  collection_id   uuid not null references public.collections (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  -- [{"id": "...", "text": "...", "citations": ["<chunk id>", ...]}, ...]
  answer          jsonb check (answer is null or jsonb_typeof(answer) = 'array'),
  model           text,
  prompt_version  text,
  created_at      timestamptz not null default now(),
  constraint messages_assistant_has_model
    check (role = 'user' or (model is not null and prompt_version is not null))
);
alter table public.messages enable row level security;
create index messages_collection_id_idx on public.messages (collection_id, created_at);


-- ── usage_daily ─────────────────────────────────────────────────────────────────────────────
-- Per-user daily counters for the free-tier limits. Written only by the service role.
-- Keyed on auth.users, not profiles, so an anonymous demo session's live-question allowance
-- (D8) is metered here too; the API is stateless, so the count can only live in the database.
create table public.usage_daily (
  user_id        uuid not null references auth.users (id) on delete cascade,
  day            date not null default current_date,
  questions      integer not null default 0 check (questions >= 0),
  uploads        integer not null default 0 check (uploads >= 0),
  gap_checks     integer not null default 0 check (gap_checks >= 0),
  input_tokens   integer not null default 0 check (input_tokens >= 0),
  output_tokens  integer not null default 0 check (output_tokens >= 0),
  primary key (user_id, day)
);
alter table public.usage_daily enable row level security;


-- ── demo_answers ────────────────────────────────────────────────────────────────────────────
-- Answers prepared in advance for the demo collection, so an anonymous visitor never triggers
-- an LLM call.
create table public.demo_answers (
  id              uuid primary key default gen_random_uuid(),
  position        smallint not null unique,
  question        text not null unique,
  answer          jsonb not null check (jsonb_typeof(answer) = 'array'),
  model           text not null,
  prompt_version  text not null,
  created_at      timestamptz not null default now()
);
alter table public.demo_answers enable row level security;


-- ── eval_runs ───────────────────────────────────────────────────────────────────────────────
-- Results of the answer-quality evaluation harness, shown on the public eval page (R14).
create table public.eval_runs (
  id              uuid primary key default gen_random_uuid(),
  git_sha         text not null,
  dataset         text not null,
  model           text not null,
  prompt_version  text not null,
  -- {"faithfulness": 0.93, "citation_precision": 0.88, ...}
  metrics         jsonb not null check (jsonb_typeof(metrics) = 'object'),
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.eval_runs enable row level security;
create index eval_runs_created_at_idx on public.eval_runs (created_at desc);


-- ── profile creation ────────────────────────────────────────────────────────────────────────
-- Give every real user a profile. Anonymous demo users get none: they own nothing. If an
-- anonymous user later links a real identity, the update trigger creates the profile then.
-- SECURITY DEFINER because the trigger runs as the auth service, which cannot write public.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(new.is_anonymous, false) then
    insert into public.profiles (id, display_name)
    values (new.id, new.raw_user_meta_data ->> 'full_name')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_upgraded
  after update of is_anonymous on auth.users
  for each row when (old.is_anonymous and not new.is_anonymous)
  execute function public.handle_new_user();
