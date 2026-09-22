-- ---------------------------------------------------------------------------
-- 0006 — Security hardening (Sept 2026 audit)
--
-- 1. date_responses is a table on this Supabase project that is not
--    referenced anywhere in this app's code — leftover from an unrelated
--    project/feature sharing the same instance. It had a public "anon can
--    INSERT" policy with no read policy: an open, unrated-limited write
--    endpoint reachable directly via the public anon key, bypassing this
--    app's server entirely. Locks it down by dropping that policy.
--
-- 2. rls_auto_enable() is an event-trigger handler (auto-enables RLS on
--    newly created tables) that the Supabase security advisor flagged as
--    callable by anon/authenticated via /rest/v1/rpc/rls_auto_enable. It
--    only needs to run as an event trigger, never via RPC.
--
-- 3. Pin search_path on the plain updated_at trigger functions per the
--    Postgres linter's function_search_path_mutable advisory.
--
-- Guarded with existence checks since none of these objects are created by
-- this repo's own migrations (all three predate/sit outside them).
--
-- Idempotent: safe to re-run.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'date_responses' and policyname = 'Allow anon insert'
  ) then
    execute 'drop policy "Allow anon insert" on public.date_responses';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    -- Revoke from PUBLIC, not just anon/authenticated — Postgres grants
    -- EXECUTE to PUBLIC by default, and anon/authenticated inherit through
    -- it, so revoking only from the named roles is a no-op.
    execute 'revoke execute on function public.rls_auto_enable() from public';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
  ) then
    execute 'alter function public.set_updated_at() set search_path = pg_catalog, public';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'update_updated_at_column'
  ) then
    execute 'alter function public.update_updated_at_column() set search_path = pg_catalog, public';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'update_portfolio_tutorials_updated_at'
  ) then
    execute 'alter function public.update_portfolio_tutorials_updated_at() set search_path = pg_catalog, public';
  end if;
end $$;
