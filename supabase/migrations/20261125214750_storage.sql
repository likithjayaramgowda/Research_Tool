-- Slice 0.3, Task 4: the private bucket for uploaded PDFs.
--
-- Layout inside the bucket:
--   <user id>/<file>   a signed-in user's uploads; the first folder is their auth.uid()
--   demo/<file>        the demo collection's PDFs, written only by the service role
--
-- A user id is a UUID, so no user's folder can ever be called "demo".
--
-- file_size_limit is a backstop at the 50 MB total cap: no single file can legitimately be larger.
-- The real per-file and per-student limits (R4) are checked by the API before it hands out an
-- upload URL, so an oversized paper fails with a readable message rather than a storage error.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('papers', 'papers', false, 50 * 1024 * 1024, array['application/pdf']);

-- storage.objects already has RLS enabled by Supabase; these policies are the only way in.
-- private.signed_in_uid() is NULL for anonymous sessions, so they match only the demo folder.

create policy "papers bucket: read own folder or demo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'papers'
    and (
      (storage.foldername(name))[1] = (select private.signed_in_uid())::text
      or (storage.foldername(name))[1] = 'demo'
    )
  );

create policy "papers bucket: upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'papers'
    and (storage.foldername(name))[1] = (select private.signed_in_uid())::text
  );

create policy "papers bucket: replace in own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'papers'
    and (storage.foldername(name))[1] = (select private.signed_in_uid())::text
  )
  with check (
    bucket_id = 'papers'
    and (storage.foldername(name))[1] = (select private.signed_in_uid())::text
  );

create policy "papers bucket: delete from own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'papers'
    and (storage.foldername(name))[1] = (select private.signed_in_uid())::text
  );
