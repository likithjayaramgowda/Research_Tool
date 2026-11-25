-- The global daily ceiling (D24), run with `supabase test db` (pgTAP).
--
-- Proving the ceiling over HTTP would need eleven real sign-ups per run, past local Auth's rate
-- limit, and would leave the day's counter used up. Here, inside one transaction that is rolled
-- back at the end, we create the users ourselves and act as each in turn by setting the JWT
-- claims that auth.uid() and auth.jwt() read. record_usage is SECURITY DEFINER, so it behaves the
-- same whichever role calls it; who may call it is proven over HTTP in test_usage.py.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- The real ceiling (test databases raise it in seed.sql) and an untouched day.
update private.quota_settings set daily_ceiling = 100, gap_check_weight = 6;
delete from private.usage_global;

-- Eleven signed-in users and one anonymous one. The ids end in their number.
insert into auth.users (id, is_anonymous)
select ('00000000-0000-0000-0000-1000000000' || lpad(n::text, 2, '0'))::uuid, n = 99
  from (select generate_series(1, 11) as n union all select 99) users;

create function pg_temp.uid(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-1000000000' || lpad(n::text, 2, '0'))::uuid
$$;
create function pg_temp.global() returns integer language sql as $$
  select coalesce((select weighted from private.usage_global), 0)
$$;
create function pg_temp.used(n integer, kind text) returns integer language sql as $$
  select coalesce((select case when kind = 'question' then questions else gap_checks end
                     from public.usage_daily where user_id = pg_temp.uid(n)), 0)
$$;
-- Act as user n for the rest of the transaction (99 is the anonymous one).
create function pg_temp.act_as(n integer) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', pg_temp.uid(n), 'role', 'authenticated', 'is_anonymous', n = 99)::text, true)
$$;
create function pg_temp.ask(n integer, kind text default 'question') returns jsonb
language sql as $$
  select pg_temp.act_as(n);
  select public.record_usage(kind);
$$;


-- ── ten users spend their whole allowance: 100 weighted questions ──────────────────────────
-- Each user's ten calls return 9, 8, … 0 remaining: 45 per user, 450 for ten users.
select is(
  (select sum(pg_temp.ask(n)::integer)::integer from generate_series(1, 10) n, generate_series(1, 10) q),
  450,
  'ten users ask ten questions each, and are told what is left each time'
);
select is(pg_temp.global(), 100, 'the global counter reached the ceiling of 100');

-- ── the eleventh user has allowance left, but the ceiling is reached ───────────────────────
select is(pg_temp.used(11, 'question'), 0, 'user 11 has used none of their own allowance');
select throws_like(
  'select pg_temp.ask(11)', '%"ceiling_reached"%',
  'user 11 is refused with ceiling_reached'
);
select is(pg_temp.used(11, 'question'), 0, 'the refused call charged nothing personally');
select is(pg_temp.global(), 100, 'the refused call charged nothing globally');

-- ── the two refusals are distinguishable ───────────────────────────────────────────────────
select throws_like(
  'select pg_temp.ask(1)', '%"allowance_spent"%',
  'user 1, whose own allowance is spent, is refused with allowance_spent instead'
);

-- ── the demo keeps working when the ceiling is reached (D24c) ──────────────────────────────
select pg_temp.act_as(99);
set local role authenticated;
select ok(
  (select count(*) from public.demo_answers) > 0,
  'an anonymous session still reads the precomputed demo answers'
);
reset role;
select lives_ok('select pg_temp.ask(11, ''activity'')', 'the activity ping still works');
select is(pg_temp.global(), 100, 'and charges nothing globally');

-- ── a Gap Check weighs six ─────────────────────────────────────────────────────────────────
delete from private.usage_global;   -- a fresh day for the counter
select is(pg_temp.ask(11, 'gap_check')::integer, 0, 'user 11 runs their one Gap Check of the day');
select is(pg_temp.global(), 6, 'a Gap Check moves the global counter by 6');
select is(pg_temp.ask(11)::integer, 9, 'a question afterwards moves it by 1');
select is(pg_temp.global(), 7, 'so the counter reads 7');

-- ── refused for the personal allowance: nothing moves ──────────────────────────────────────
select throws_like(
  'select pg_temp.ask(11, ''gap_check'')', '%"allowance_spent"%',
  'a second Gap Check is refused with allowance_spent'
);
select is(
  array[pg_temp.global(), pg_temp.used(11, 'gap_check')], array[7, 1],
  'the refused Gap Check charged nothing, globally or personally'
);

select * from finish();
rollback;
