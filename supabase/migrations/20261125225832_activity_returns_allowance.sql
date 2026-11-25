-- Slice 0.3d: the 'activity' kind returns the caller's allowance (D25).
--
-- The web app calls record_usage('activity') once per session on load. It now returns what the
-- caller may use today and has used, so the app shows "N questions left" without keeping its own
-- copy of the allowances, which would drift from private.daily_allowance:
--
--   {"questions":  {"allowance": 10, "used": 2, "remaining": 8},
--    "gap_checks": {"allowance": 1,  "used": 0, "remaining": 1}}
--
-- A function's return type cannot be changed in place, so record_usage is dropped and recreated
-- with `returns jsonb`. The metered kinds return the same bare number as before (now as a JSON
-- number), so their HTTP response is unchanged. Still one SECURITY DEFINER function; the helper
-- below is a plain function in the private schema that only record_usage calls.


-- {"allowance": a, "used": u, "remaining": max(a - u, 0)}
create function private.allowance_summary(allowance integer, used integer)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'allowance', allowance,
    'used', used,
    'remaining', greatest(allowance - used, 0)
  );
$$;
revoke execute on function private.allowance_summary(integer, integer)
  from public, anon, authenticated;


drop function public.record_usage(text);

create function public.record_usage(kind text)
returns jsonb
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
  asked     integer;
  checked   integer;
begin
  if caller is null then
    raise exception 'record_usage needs a session' using errcode = '42501';
  end if;

  if kind = 'activity' then
    if not anonymous then
      update public.profiles set last_active_at = now() where id = caller;
    end if;
    -- What the caller may use today and has used, so the UI never keeps its own copy of the
    -- allowances (D25). The allowances come from private.daily_allowance, the same source the
    -- metered kinds are checked against.
    select u.questions, u.gap_checks into asked, checked
      from public.usage_daily u where u.user_id = caller and u.day = today;
    return jsonb_build_object(
      'questions', private.allowance_summary(
        private.daily_allowance('question', anonymous), coalesce(asked, 0)),
      'gap_checks', private.allowance_summary(
        private.daily_allowance('gap_check', anonymous), coalesce(checked, 0))
    );
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

  return to_jsonb(allowance - used);
end;
$$;

comment on function public.record_usage(text) is
  'D22/D24/D25: question or gap_check charges auth.uid() and the global ceiling and returns the '
  'remaining allowance as a number (429 allowance_spent or ceiling_reached when refused); '
  'activity stamps last_active_at and returns {questions, gap_checks} with allowance, used and '
  'remaining.';

revoke execute on function public.record_usage(text) from public, anon;
grant execute on function public.record_usage(text) to authenticated;
