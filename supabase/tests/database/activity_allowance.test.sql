-- The 'activity' kind reports the caller's allowance (D25), run with `supabase test db` (pgTAP).
--
-- The point of returning the allowance from the database is that nothing else holds a copy of
-- the numbers. So these tests check the reported allowance against private.daily_allowance
-- itself, and then swap daily_allowance for different numbers (inside this rolled-back
-- transaction) to show that activity follows it, which no hardcoded copy could do, even one
-- that happens to match today's values.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000001', false),
  ('a0000000-0000-0000-0000-000000000002', true);

create function pg_temp.activity(anonymous boolean) returns jsonb language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', case when anonymous then 'a0000000-0000-0000-0000-000000000002'
                else 'a0000000-0000-0000-0000-000000000001' end,
    'role', 'authenticated', 'is_anonymous', anonymous)::text, true);
  select public.record_usage('activity');
$$;
create function pg_temp.allowances(report jsonb) returns integer[] language sql as $$
  select array[(report -> 'questions' ->> 'allowance')::integer,
               (report -> 'gap_checks' ->> 'allowance')::integer]
$$;


-- ── against the source of truth ────────────────────────────────────────────────────────────
select is(
  pg_temp.allowances(pg_temp.activity(false)),
  array[private.daily_allowance('question', false), private.daily_allowance('gap_check', false)],
  'a signed-in user is told the allowances in private.daily_allowance'
);
select is(
  pg_temp.allowances(pg_temp.activity(true)),
  array[private.daily_allowance('question', true), private.daily_allowance('gap_check', true)],
  'an anonymous session is told the anonymous allowances in private.daily_allowance'
);
select is(
  pg_temp.activity(false) -> 'questions',
  jsonb_build_object('allowance', private.daily_allowance('question', false),
                     'used', 0,
                     'remaining', private.daily_allowance('question', false)),
  'with nothing used yet, remaining equals the allowance'
);


-- ── follows daily_allowance when it changes ────────────────────────────────────────────────
create or replace function private.daily_allowance(kind text, anonymous boolean)
returns integer language sql immutable set search_path = '' as $$
  select case
    when kind = 'question'  and anonymous     then 2
    when kind = 'question'  and not anonymous then 7
    when kind = 'gap_check' and anonymous     then 5
    when kind = 'gap_check' and not anonymous then 4
  end;
$$;

select is(
  pg_temp.allowances(pg_temp.activity(false)), array[7, 4],
  'after daily_allowance changes, a signed-in user is told the new numbers'
);
select is(
  pg_temp.allowances(pg_temp.activity(true)), array[2, 5],
  'and so is an anonymous session'
);

-- And the metered kinds are checked against the same numbers: 7 questions, then refused.
select pg_temp.activity(false);  -- act as the signed-in user
select is(
  (select array_agg(public.record_usage('question')::integer) from generate_series(1, 7)),
  array[6, 5, 4, 3, 2, 1, 0],
  'the questions themselves are metered against the same changed allowance'
);

select * from finish();
rollback;
