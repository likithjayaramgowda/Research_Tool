-- Structural checks on the database itself, run with `supabase test db` (pgTAP).
--
-- The HTTP tests in supabase/tests/isolation prove behaviour for the tables they know about.
-- These catch the thing they can't: a new table added later without RLS, or with the API roles'
-- default privileges left wide open.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is(
  (select count(*)::int from pg_tables where schemaname = 'public'),
  11,
  'public has exactly the eleven LitLens tables (a new table needs isolation tests too)'
);

select is(
  (select coalesce(array_agg(tablename::text order by tablename), '{}')
     from pg_tables where schemaname = 'public' and not rowsecurity),
  '{}'::text[],
  'every table in public has row level security enabled'
);

select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'papers'),
  0,
  'papers has no policy yet (deny-all until it is written by hand in slice 0.3)'
);

select is(
  (select coalesce(array_agg(format('%s:%s', table_name, privilege_type) order by 1), '{}')
     from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'),
  array['eval_runs:SELECT'],
  'with no session, the only thing the anon role can do is read eval_runs'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee in ('anon', 'authenticated') and table_schema = 'public'
      and privilege_type = 'TRUNCATE'),
  0,
  'no API role can TRUNCATE (TRUNCATE ignores RLS)'
);

select is(
  (select public from storage.buckets where id = 'papers'),
  false,
  'the papers bucket is private'
);

select is(
  (select count(*)::int from public.collections where is_demo),
  1,
  'exactly one demo collection exists'
);

select * from finish();
rollback;
