-- Slice 0.3c: quota governance (D24) and activity (D25).
--
-- Per-user allowances cannot protect a quota that every user shares: the three Groq models give
-- ~600K tokens a day across everyone, about 120–150 questions in total. So record_usage now also
-- charges a global daily counter, in the same statement as the personal one, and refuses live
-- questions once the day's ceiling is reached. Precomputed demo answers are plain reads of
-- demo_answers and never pass through here, so the demo keeps working when live questions stop.
--
-- It also gains a third kind, 'activity', which counts nothing and only stamps last_active_at,
-- so reading a library without asking anything still counts as being active (D9, D25).


-- ── settings (D24b) ─────────────────────────────────────────────────────────────────────────
-- One row. Tune it with a plain UPDATE, no migration needed:
--   update private.quota_settings set daily_ceiling = 120;
-- A day's ceiling is copied onto that day's counter row when the row is created, so a change
-- applies from the next UTC day. To change today's as well:
--   update private.usage_global set ceiling = 120 where day = (now() at time zone 'utc')::date;
create table private.quota_settings (
  id                boolean primary key default true check (id),  -- at most one row
  daily_ceiling     integer not null check (daily_ceiling >= 0),
  gap_check_weight  integer not null check (gap_check_weight >= 1)
);
insert into private.quota_settings (daily_ceiling, gap_check_weight) values (100, 6);

comment on table private.quota_settings is
  'D24b: global daily ceiling in weighted questions (a question weighs 1, a Gap Check '
  'gap_check_weight, ≈30K tokens against ≈5K). Tunable with UPDATE.';


-- ── the global counter ──────────────────────────────────────────────────────────────────────
-- Weighted questions used today across every user. The CHECK is a backstop under the atomic
-- statement in record_usage: whatever code runs, the database refuses a row over its ceiling.
create table private.usage_global (
  day       date primary key,
  weighted  integer not null check (weighted >= 0),
  ceiling   integer not null check (ceiling >= 0),
  constraint usage_global_within_ceiling check (weighted <= ceiling)
);

-- Both tables sit in the private schema, which the API does not expose, and no API role has any
-- privilege on them. RLS is on as well, so even a future grant would expose nothing.
alter table private.quota_settings enable row level security;
alter table private.usage_global enable row level security;
revoke all on private.quota_settings, private.usage_global from public, anon, authenticated;


-- ── allowances (D24a) ───────────────────────────────────────────────────────────────────────
create or replace function private.daily_allowance(kind text, anonymous boolean)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when kind = 'question'  and anonymous     then 3   -- D8: a small live-question allowance
    when kind = 'question'  and not anonymous then 10  -- D24a
    when kind = 'gap_check' and anonymous     then 0   -- demo visitors cannot run Gap Checks
    when kind = 'gap_check' and not anonymous then 1   -- D24a; ~30K tokens each
  end;
$$;
revoke execute on function private.daily_allowance(text, boolean) from public, anon, authenticated;


-- ── refusals ────────────────────────────────────────────────────────────────────────────────
-- Raising SQLSTATE 'PGRST' lets PostgREST send our own JSON body and status code, so the API and
-- the UI can tell the two refusals apart by `code`:
--   allowance_spent   this session has used its own allowance for today
--   ceiling_reached   everyone together has used today's global ceiling
-- Both are HTTP 429. The human wording is Likith's to write.
create or replace function private.refuse(code text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise sqlstate 'PGRST' using
    message = json_build_object(
      'code', code,
      'message', 'TODO(copy)',
      'details', null,
      'hint', null
    )::text,
    detail = json_build_object('status', 429, 'headers', json_build_object())::text;
end;
$$;
revoke execute on function private.refuse(text) from public, anon, authenticated;


-- ── record_usage ────────────────────────────────────────────────────────────────────────────
-- kind = 'question' | 'gap_check' | 'activity'.
--   question, gap_check: charge one against the caller's allowance and the global ceiling (a
--     Gap Check weighs gap_check_weight there), stamp last_active_at for a signed-in caller,
--     and return how many of that kind the caller has left today.
--   activity: count nothing, spend nothing, stamp last_active_at for a signed-in caller, and
--     return NULL. The web app calls it once per session on load (D25).
create or replace function public.record_usage(kind text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller    uuid    := auth.uid();
  anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  today     date    := (now() at time zone 'utc')::date;
  allowance integer;
  weight    integer;
  used      integer;
  charged   integer;
begin
  if caller is null then
    raise exception 'record_usage needs a session' using errcode = '42501';
  end if;

  if kind = 'activity' then
    if not anonymous then
      update public.profiles set last_active_at = now() where id = caller;
    end if;
    return null;
  end if;

  allowance := private.daily_allowance(kind, anonymous);
  if allowance is null then
    raise exception 'unknown usage kind: %', kind using errcode = '22023';
  end if;
  if allowance <= 0 then
    perform private.refuse('allowance_spent');
  end if;

  select case when kind = 'gap_check' then s.gap_check_weight else 1 end
    into weight
    from private.quota_settings s;

  -- ONE statement charges both counters, so two simultaneous requests cannot both take the last
  -- unit of either. Each upsert locks its row, and its WHERE re-checks the limit on the locked,
  -- current value. `overall` only runs if `personal` charged something; when either WHERE fails
  -- its CTE returns no row, and the matching variable stays NULL.
  if kind = 'question' then
    with personal as (
      insert into public.usage_daily as u (user_id, day, questions)
      values (caller, today, 1)
      on conflict (user_id, day) do update
        set questions = u.questions + 1
        where u.questions < allowance
      returning u.questions
    ), overall as (
      insert into private.usage_global as g (day, weighted, ceiling)
      select today, weight, s.daily_ceiling
        from private.quota_settings s
       where exists (select 1 from personal) and weight <= s.daily_ceiling
      on conflict (day) do update
        set weighted = g.weighted + excluded.weighted
        where g.weighted + excluded.weighted <= g.ceiling
      returning g.weighted
    )
    select (select questions from personal), (select weighted from overall)
      into used, charged;
  else  -- 'gap_check': daily_allowance has already rejected every other kind
    with personal as (
      insert into public.usage_daily as u (user_id, day, gap_checks)
      values (caller, today, 1)
      on conflict (user_id, day) do update
        set gap_checks = u.gap_checks + 1
        where u.gap_checks < allowance
      returning u.gap_checks
    ), overall as (
      insert into private.usage_global as g (day, weighted, ceiling)
      select today, weight, s.daily_ceiling
        from private.quota_settings s
       where exists (select 1 from personal) and weight <= s.daily_ceiling
      on conflict (day) do update
        set weighted = g.weighted + excluded.weighted
        where g.weighted + excluded.weighted <= g.ceiling
      returning g.weighted
    )
    select (select gap_checks from personal), (select weighted from overall)
      into used, charged;
  end if;

  if used is null then
    perform private.refuse('allowance_spent');
  end if;
  if charged is null then
    -- Raising aborts the whole call, which also undoes the personal charge made above, so a
    -- refused call leaves both counters exactly as they were.
    perform private.refuse('ceiling_reached');
  end if;

  -- Anonymous sessions have no profile (D21), so this only ever touches a real user's row.
  if not anonymous then
    update public.profiles set last_active_at = now() where id = caller;
  end if;

  return allowance - used;
end;
$$;

comment on function public.record_usage(text) is
  'D22/D24/D25: question or gap_check charges auth.uid() and the global ceiling and returns the '
  'remaining allowance (429 allowance_spent or ceiling_reached when refused); activity only '
  'stamps last_active_at.';

revoke execute on function public.record_usage(text) from public, anon;
grant execute on function public.record_usage(text) to authenticated;


-- ── reading what's left (D25) ───────────────────────────────────────────────────────────────
-- Any session, anonymous included, may read its own counters, so the UI can show what is left.
-- Writes stay function-only: there is still no insert, update or delete policy.
drop policy "usage_daily: owner reads" on public.usage_daily;
create policy "usage_daily: own row readable by its session" on public.usage_daily
  for select to authenticated
  using (user_id = (select auth.uid()));
