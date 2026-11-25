-- Local and CI test data for the isolation tests (supabase/tests/isolation).
--
-- `supabase start` and `supabase db reset` run this after the migrations. It is NEVER applied
-- to the hosted project: `supabase db push` does not run seed files unless asked to.
--
-- Two real users, A and B, who sign in with email and password through Supabase Auth, so the
-- tests use genuine JWTs. Each owns one row in every table; the demo collection gets one row in
-- every table that hangs off a collection. The ids are fixed and mirrored in
-- supabase/tests/isolation/ids.py.
--
-- Id scheme: the first digit names the table, the last characters name the owner
-- (a = user A, b = user B, d = demo).
--   1… papers  2… chunks  3… paper_cards  4… relevance  5… gap_checks  6… messages
--   7… demo_answers  8… eval_runs  c… collections


-- ── users ───────────────────────────────────────────────────────────────────────────────────
-- Inserting into auth.users fires the profile trigger, so A and B get profiles. The empty-string
-- token columns are required: Supabase Auth fails to sign in a user whose tokens are NULL.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('local-test-password', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', u.name),
  now(), now(), '', '', '', ''
from (values
  ('00000000-0000-0000-0000-00000000000a'::uuid, 'user-a@litlens.test', 'Test User A'),
  ('00000000-0000-0000-0000-00000000000b'::uuid, 'user-b@litlens.test', 'Test User B')
) as u (id, email, name);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');


-- ── collections ─────────────────────────────────────────────────────────────────────────────
-- The demo collection (…0de) already exists: the schema migration creates it.
insert into public.collections (id, owner_id, name, research_topic) values
  ('c0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'A library', 'sleep and memory'),
  ('c0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'B library', 'urban heat');


-- ── papers ──────────────────────────────────────────────────────────────────────────────────
insert into public.papers (id, collection_id, storage_path, original_filename, file_size_bytes, status, page_count, title, year) values
  ('10000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a/a.pdf', 'a.pdf', 1000, 'ready', 10, 'Paper A', 2023),
  ('10000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b/b.pdf', 'b.pdf', 1000, 'ready', 10, 'Paper B', 2024),
  ('10000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000de', 'demo/demo.pdf', 'demo.pdf', 1000, 'ready', 10, 'Demo paper', 2025);


-- ── generated results ───────────────────────────────────────────────────────────────────────
insert into public.chunks (id, paper_id, ordinal, page_start, page_end, text, chunker_version) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 0, 1, 1, 'Chunk of paper A.', 'test'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 0, 1, 1, 'Chunk of paper B.', 'test'),
  ('20000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-00000000000d', 0, 1, 1, 'Chunk of the demo paper.', 'test');

insert into public.paper_cards (id, paper_id, question, model, prompt_version) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Question of A', 'test-model', 'test'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Question of B', 'test-model', 'test'),
  ('30000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-00000000000d', 'Demo question', 'test-model', 'test');

insert into public.relevance (id, paper_id, topic, verdict, reason, model, prompt_version) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'sleep and memory', 'relevant', 'Reason A', 'test-model', 'test'),
  ('40000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'urban heat', 'relevant', 'Reason B', 'test-model', 'test'),
  ('40000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-00000000000d', 'rag evaluation', 'relevant', 'Demo reason', 'test-model', 'test');

insert into public.gap_checks (id, collection_id, idea, status, progress, result, model, prompt_version) values
  ('50000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', 'Idea A', 'done', 100, '{}', 'test-model', 'test'),
  ('50000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000b', 'Idea B', 'done', 100, '{}', 'test-model', 'test'),
  ('50000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000de', 'Demo idea', 'done', 100, '{}', 'test-model', 'test');

insert into public.messages (id, collection_id, role, content) values
  ('60000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', 'user', 'Message A'),
  ('60000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000b', 'user', 'Message B'),
  ('60000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000de', 'user', 'Demo message');


-- ── usage, demo answers, eval runs ──────────────────────────────────────────────────────────
insert into public.usage_daily (user_id, day, questions) values
  ('00000000-0000-0000-0000-00000000000a', '2026-01-01', 1),
  ('00000000-0000-0000-0000-00000000000b', '2026-01-01', 2);

insert into public.demo_answers (id, position, question, answer, model, prompt_version) values
  ('70000000-0000-0000-0000-000000000001', 1, 'What is RAG?', '[]', 'test-model', 'test');

insert into public.eval_runs (id, git_sha, dataset, model, prompt_version, metrics) values
  ('80000000-0000-0000-0000-000000000001', 'test', 'golden-60', 'test-model', 'test', '{"faithfulness": 0.9}');


-- ── storage ─────────────────────────────────────────────────────────────────────────────────
-- A metadata row for one demo file, so listing the demo folder has something to find. Users'
-- own files are uploaded by the tests themselves through the API, which exercises the write
-- policies too.
insert into storage.objects (bucket_id, name, metadata)
values ('papers', 'demo/demo.pdf', '{"mimetype": "application/pdf", "size": 1000}');
