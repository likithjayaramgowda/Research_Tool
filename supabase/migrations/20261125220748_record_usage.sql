-- Slice 0.3b: the privileged write path (D22).
--
-- Usage counters and the activity timestamp must be written on behalf of users, but users must
-- not be able to write them directly: they could reset their own allowance, or push
-- last_active_at into the future and dodge the 30-day clean-up (D9). The API never holds the
-- service-role key (D22), so the write goes through this one SECURITY DEFINER function, called
-- with the user's own JWT. It is the single narrow exception to "only the worker is privileged".
--
-- What makes it narrow:
--   * Its only argument says WHAT to count, never WHOSE. It acts on auth.uid() and nothing else,
--     so there is no argument that could reach another user's counters.
--   * It only ever adds one, and stops at the allowance. A user calling it straight from the
--     browser can only use up their own allowance faster; nothing gets cheaper.
--   * It sets last_active_at to the database's now(), never to a value from the caller.


-- ── allowances ──────────────────────────────────────────────────────────────────────────────
-- Daily allowances per kind of event. Starting values, to be tuned once real usage is visible
-- (capacity notes: one Groq model serves ~40–45 questions a day across all users).
-- In the private schema, and executable by nobody but the owner: only record_usage calls it.
create or replace function private.daily_allowance(kind text, anonymous boolean)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when kind = 'question'  and anonymous     then 3   -- D8: a small live-question allowance
    when kind = 'question'  and not anonymous then 20  -- D3: per-student daily cap
    when kind = 'gap_check' and anonymous     then 0   -- demo visitors cannot run Gap Checks
    when kind = 'gap_check' and not anonymous then 2   -- ~30K tokens each (R6c)
  end;
$$;
revoke execute on function private.daily_allowance(text, boolean) from public, anon, authenticated;


-- ── record_usage ────────────────────────────────────────────────────────────────────────────
-- Counts one event of `kind` ('question' or 'gap_check') against the caller for today (UTC),
-- marks a signed-in caller as active, and returns how many of that kind they have left today.
-- When the allowance is used up it changes nothing and fails with HTTP 429 (SQLSTATE PT429,
-- which PostgREST turns into that status code).
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
  used      integer;
begin
  if caller is null then
    raise exception 'record_usage needs a session' using errcode = '42501';
  end if;

  allowance := private.daily_allowance(kind, anonymous);
  if allowance is null then
    raise exception 'unknown usage kind: %', kind using errcode = '22023';
  end if;
  if allowance <= 0 then
    raise exception 'no % allowance for this session', kind using errcode = 'PT429';
  end if;

  -- One statement both checks and counts, so two simultaneous requests cannot both take the
  -- last unit: the upsert locks the row, and the WHERE stops the update at the allowance.
  -- When the WHERE fails, no row comes back and `used` stays null.
  if kind = 'question' then
    insert into public.usage_daily as u (user_id, day, questions)
    values (caller, today, 1)
    on conflict (user_id, day) do update
      set questions = u.questions + 1
      where u.questions < allowance
    returning u.questions into used;
  else  -- 'gap_check': daily_allowance has already rejected every other kind
    insert into public.usage_daily as u (user_id, day, gap_checks)
    values (caller, today, 1)
    on conflict (user_id, day) do update
      set gap_checks = u.gap_checks + 1
      where u.gap_checks < allowance
    returning u.gap_checks into used;
  end if;

  if used is null then
    raise exception 'daily % allowance used up', kind using errcode = 'PT429';
  end if;

  -- Anonymous sessions have no profile (D21), so this only ever touches a real user's row.
  if not anonymous then
    update public.profiles set last_active_at = now() where id = caller;
  end if;

  return allowance - used;
end;
$$;

comment on function public.record_usage(text) is
  'D22: counts one question or gap_check against auth.uid() for today, marks a signed-in caller '
  'active, and returns the remaining allowance. HTTP 429 when used up.';

-- Postgres lets PUBLIC execute every new function, and Supabase also grants `anon`. Only a
-- session (signed in or anonymous) may call this one.
revoke execute on function public.record_usage(text) from public, anon;
grant execute on function public.record_usage(text) to authenticated;


-- ── last_active_at is no longer the user's to set ───────────────────────────────────────────
revoke update (last_active_at) on public.profiles from authenticated;
