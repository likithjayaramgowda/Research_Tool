-- Slice 0.3, Task 3: row-level security policies.
--
-- RLS is the tenancy boundary (ADR 0007). The API queries with the user's JWT, so every query it
-- makes passes through these policies. Only the worker uses the service-role key, which skips
-- RLS; it is the single privileged path and writes every generated result.
--
-- Who can do what:
--
--   signed-in user   reads and edits their own data, reads the demo collection (D21).
--   anonymous demo   reads the demo collection and demo_answers. Nothing else, and no writes.
--   no session       reads eval_runs (the public eval page, R14). Nothing else.
--   service role     everything (bypasses RLS).
--
-- Anonymous demo sessions (D8) arrive as the `authenticated` database role, exactly like real
-- users, so they cannot be told apart by role. They carry `"is_anonymous": true` in their JWT,
-- and every ownership check goes through private.signed_in_uid(), which returns NULL for them.
-- `owner_id = NULL` is never true, so an anonymous session can never own or write anything.


-- ── helpers ─────────────────────────────────────────────────────────────────────────────────
-- A schema the REST API does not expose (only `public` is), so these can't be called as RPCs.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- The caller's user id if they are a real signed-in user; NULL if anonymous or no session.
create or replace function private.signed_in_uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then null
    else auth.uid()
  end;
$$;

-- Can the caller read rows of this collection? Their own, or the demo collection (D8, D21).
-- SECURITY DEFINER so the lookup itself is not filtered by RLS on collections. It only answers
-- yes or no about the caller, so it leaks nothing.
create or replace function private.can_read_collection(collection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.collections c
    where c.id = collection
      and (c.is_demo or c.owner_id = private.signed_in_uid())
  );
$$;

-- Does the caller own this collection? Never true for the demo collection (no owner).
create or replace function private.owns_collection(collection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.collections c
    where c.id = collection
      and c.owner_id = private.signed_in_uid()
  );
$$;

-- The collection a paper belongs to. SECURITY DEFINER because `papers` is deny-all for API
-- roles in this slice (see below): without it, chunks, cards and relevance would be unreadable
-- even to their owner. It returns only the collection id, never paper data.
create or replace function private.paper_collection(paper uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.collection_id from public.papers p where p.id = paper;
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;


-- ── table privileges ────────────────────────────────────────────────────────────────────────
-- Supabase grants every API role every privilege on new tables and leaves the filtering to RLS.
-- Narrow that as a second line of defence:
--   * The `anon` role (no session at all) only ever needs to read eval_runs.
--   * TRUNCATE ignores RLS entirely, so no API role may have it.
revoke all on all tables in schema public from anon;
grant select on public.eval_runs to anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;


-- ── profiles ────────────────────────────────────────────────────────────────────────────────
-- Created by the auth trigger; deleted with the user. A user reads and edits only their own,
-- and only the columns that are theirs to set.
create policy "profiles: owner reads" on public.profiles
  for select to authenticated
  using (id = (select private.signed_in_uid()));

create policy "profiles: owner updates" on public.profiles
  for update to authenticated
  using (id = (select private.signed_in_uid()))
  with check (id = (select private.signed_in_uid()));

revoke update on public.profiles from authenticated;
grant update (display_name, citation_style, last_active_at) on public.profiles to authenticated;


-- ── collections ─────────────────────────────────────────────────────────────────────────────
create policy "collections: owner or demo reads" on public.collections
  for select to authenticated
  using (is_demo or owner_id = (select private.signed_in_uid()));

create policy "collections: owner creates" on public.collections
  for insert to authenticated
  with check (owner_id = (select private.signed_in_uid()) and not is_demo);

-- WITH CHECK stops a user handing a collection to someone else or turning it into the demo.
create policy "collections: owner updates" on public.collections
  for update to authenticated
  using (owner_id = (select private.signed_in_uid()))
  with check (owner_id = (select private.signed_in_uid()) and not is_demo);

create policy "collections: owner deletes" on public.collections
  for delete to authenticated
  using (owner_id = (select private.signed_in_uid()));


-- ── papers ──────────────────────────────────────────────────────────────────────────────────
-- DELIBERATELY NO POLICY. RLS is enabled (see the schema migration) and there is no policy, so
-- `papers` is deny-all for every API role: nobody but the service role can read or write it.
--
-- The papers policy is written by hand by Likith in this slice, as part of the learning track.
-- The tests that it must satisfy are already in supabase/tests/isolation/test_papers.py:
--   * the isolation tests pass today, because deny-all satisfies them;
--   * the owner-access and demo-read tests are marked xfail(strict=True). They fail today; once
--     the policy is right they pass, and strict mode then fails the run until the markers are
--     removed. Isolation tests alone never prove a policy is right.


-- ── chunks, paper_cards, relevance ──────────────────────────────────────────────────────────
-- Generated by the worker (service role). Readable wherever their paper's collection is.
create policy "chunks: readable with the collection" on public.chunks
  for select to authenticated
  using (private.can_read_collection(private.paper_collection(paper_id)));

create policy "paper_cards: readable with the collection" on public.paper_cards
  for select to authenticated
  using (private.can_read_collection(private.paper_collection(paper_id)));

create policy "relevance: readable with the collection" on public.relevance
  for select to authenticated
  using (private.can_read_collection(private.paper_collection(paper_id)));


-- ── gap_checks ──────────────────────────────────────────────────────────────────────────────
-- The API queues a check with the user's JWT; the worker runs it and writes status, progress and
-- result. So a user may insert only a fresh, queued row, and may never update one.
create policy "gap_checks: readable with the collection" on public.gap_checks
  for select to authenticated
  using (private.can_read_collection(collection_id));

create policy "gap_checks: owner queues" on public.gap_checks
  for insert to authenticated
  with check (
    private.owns_collection(collection_id)
    and status = 'queued' and progress = 0 and result is null and error is null
  );

create policy "gap_checks: owner deletes" on public.gap_checks
  for delete to authenticated
  using (private.owns_collection(collection_id));


-- ── messages ────────────────────────────────────────────────────────────────────────────────
-- The API saves both the question and the answer with the user's JWT. Messages are history, so
-- they can be deleted (clearing a chat) but never edited.
create policy "messages: readable with the collection" on public.messages
  for select to authenticated
  using (private.can_read_collection(collection_id));

create policy "messages: owner adds" on public.messages
  for insert to authenticated
  with check (private.owns_collection(collection_id));

create policy "messages: owner deletes" on public.messages
  for delete to authenticated
  using (private.owns_collection(collection_id));


-- ── usage_daily ─────────────────────────────────────────────────────────────────────────────
-- A signed-in user reads their own counters. Only the service role writes them. Anonymous
-- sessions are metered here (D21) but cannot read their row through the API.
create policy "usage_daily: owner reads" on public.usage_daily
  for select to authenticated
  using (user_id = (select private.signed_in_uid()));


-- ── demo_answers ────────────────────────────────────────────────────────────────────────────
-- Precomputed answers for the demo; every session reads them, anonymous or signed in (D21).
create policy "demo_answers: every session reads" on public.demo_answers
  for select to authenticated
  using (true);


-- ── eval_runs ───────────────────────────────────────────────────────────────────────────────
-- The public eval page (R14) reads these with no session at all.
create policy "eval_runs: everyone reads" on public.eval_runs
  for select to anon, authenticated
  using (true);
