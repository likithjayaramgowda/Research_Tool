-- Racing the global ceiling (D24), run with `supabase test db` (pgTAP).
--
-- Check-and-count must be one statement, or two simultaneous requests can both take the last
-- unit. A test that calls the function one call at a time cannot tell the difference, so this
-- one opens twenty real connections with dblink (a standard Postgres extension, created only
-- inside this rolled-back transaction) and fires twenty questions at once at a ceiling of five.
--
-- The racers must see committed data, so their setup is committed through a separate connection.
-- Everything that touches committed state runs in one block whose cleanup also runs on error:
-- the racers are deleted (cascading to their usage) and today's global counter is put back
-- exactly as it was. The results are captured first and asserted afterwards.
begin;
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
select plan(4);

create function pg_temp.dsn() returns text language sql immutable as $$
  -- The container's own Docker name, not 127.0.0.1: loopback connections are trusted without a
  -- password, and dblink refuses a non-superuser connection that didn't use one. The name comes
  -- from project_id in supabase/config.toml, so it is the same locally and in CI.
  select 'host=supabase_db_litlens port=5432 dbname=postgres user=postgres password=postgres'
$$;
create function pg_temp.racer(n integer) returns uuid language sql immutable as $$
  select ('f0000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid
$$;
create function pg_temp.today() returns date language sql stable as $$
  select (now() at time zone 'utc')::date
$$;

-- Undo the committed setup. Safe to run more than once.
create function pg_temp.clean_up(saved_weighted integer, saved_ceiling integer)
returns void language plpgsql as $$
begin
  perform extensions.dblink_exec('admin',
    'delete from auth.users where id::text like ''f0000000-0000-0000-0000-0000000000%''');
  if saved_ceiling is null then
    perform extensions.dblink_exec('admin',
      format('delete from private.usage_global where day = %L', pg_temp.today()));
  else
    perform extensions.dblink_exec('admin', format(
      'update private.usage_global set weighted = %s, ceiling = %s where day = %L',
      saved_weighted, saved_ceiling, pg_temp.today()));
  end if;
end;
$$;

create temp table outcomes (n integer, ok boolean, message text);
create temp table final_counts (global_weighted integer, personal_questions integer);

do $$
declare
  saved_weighted integer;
  saved_ceiling  integer;
begin
  select weighted, ceiling into saved_weighted, saved_ceiling
    from private.usage_global where day = pg_temp.today();
  perform extensions.dblink_connect('admin', pg_temp.dsn());

  begin
    -- Committed setup: twenty racers, and today's counter at 0 of 5.
    perform extensions.dblink_exec('admin', format($sql$
      insert into auth.users (id, is_anonymous)
        select ('f0000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, false
          from generate_series(1, 20) n;
      insert into private.usage_global (day, weighted, ceiling) values (%L, 0, 5)
        on conflict (day) do update set weighted = 0, ceiling = 5;
    $sql$, pg_temp.today()));

    -- Twenty connections, each signed in as its own racer. Every question is sent before any
    -- result is read, so the twenty calls run at the same time.
    for n in 1..20 loop
      perform extensions.dblink_connect('racer' || n, pg_temp.dsn());
      perform extensions.dblink_exec('racer' || n, format('set %I = %L', 'request.jwt.claims',
        json_build_object('sub', pg_temp.racer(n), 'role', 'authenticated',
                          'is_anonymous', false)::text));
    end loop;
    for n in 1..20 loop
      perform extensions.dblink_send_query('racer' || n,
        'select public.record_usage(''question'')');
    end loop;

    -- Collect what each racer got: a remaining count, or the error it was refused with.
    for n in 1..20 loop
      begin
        perform * from extensions.dblink_get_result('racer' || n) as t(r jsonb);
        insert into outcomes values (n, true, null);
      exception when others then
        insert into outcomes values (n, false, sqlerrm);
      end;
      perform * from extensions.dblink_get_result('racer' || n, false) as t(r jsonb);
      perform extensions.dblink_disconnect('racer' || n);
    end loop;

    insert into final_counts
      select (select weighted from private.usage_global where day = pg_temp.today()),
             (select coalesce(sum(questions), 0)::integer from public.usage_daily
               where user_id in (select pg_temp.racer(n) from generate_series(1, 20) n));
  exception when others then
    perform pg_temp.clean_up(saved_weighted, saved_ceiling);
    raise;
  end;

  perform pg_temp.clean_up(saved_weighted, saved_ceiling);
  perform extensions.dblink_disconnect('admin');
end $$;

select is(
  (select count(*)::integer from outcomes where ok), 5,
  'of twenty simultaneous questions, exactly five get through a ceiling of five'
);
select is(
  (select count(*)::integer from outcomes where not ok and message like '%"ceiling_reached"%'),
  15,
  'the other fifteen are all refused cleanly with ceiling_reached'
);
select is(
  (select global_weighted from final_counts), 5,
  'the global counter read exactly five'
);
select is(
  (select personal_questions from final_counts), 5,
  'and only the five who got through were charged personally'
);

select * from finish();
rollback;
