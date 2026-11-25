-- Slice 0.3: extensions and small shared helpers used by the schema.
--
-- pgvector gives us the `vector` column type and the HNSW index for semantic search.
-- Supabase keeps extensions in the `extensions` schema so they stay out of the API's `public`
-- schema.
create extension if not exists vector with schema extensions;

-- Keeps an `updated_at` column current. Attached as a BEFORE UPDATE trigger on tables that
-- users edit. `set search_path = ''` stops a caller from hijacking names inside the function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger: sets updated_at to now() on every update.';
