-- ---------------------------------------------------------------------------
-- 0005 — RLS backfill for content tables
--
-- portfolio_posts, portfolio_projects, and portfolio_tutorials already have
-- RLS enabled and the policies below applied directly on the live database —
-- none of that was ever captured in a migration file (their CREATE TABLE
-- predates this repo's migrations directory). This backfills that state so a
-- database rebuilt from migrations alone doesn't silently end up without
-- row-level security on these tables. Mirrors the exact policies already
-- live (confirmed via pg_policies), matching the portfolio_now pattern from
-- 0004: public can read published rows, authenticated users can manage all.
--
-- Idempotent: safe to re-run.
-- ---------------------------------------------------------------------------

alter table portfolio_posts enable row level security;

drop policy if exists "Public can read published posts" on portfolio_posts;
create policy "Public can read published posts" on portfolio_posts
  for select to public using (published = true);

drop policy if exists "Authenticated users can manage posts" on portfolio_posts;
create policy "Authenticated users can manage posts" on portfolio_posts
  for all to authenticated using (true) with check (true);

alter table portfolio_projects enable row level security;

drop policy if exists "Public can read published projects" on portfolio_projects;
create policy "Public can read published projects" on portfolio_projects
  for select to public using (published = true);

drop policy if exists "Authenticated users can manage projects" on portfolio_projects;
create policy "Authenticated users can manage projects" on portfolio_projects
  for all to authenticated using (true) with check (true);

alter table portfolio_tutorials enable row level security;

drop policy if exists "Public can read published tutorials" on portfolio_tutorials;
create policy "Public can read published tutorials" on portfolio_tutorials
  for select to public using (published = true);

drop policy if exists "Authenticated users can manage tutorials" on portfolio_tutorials;
create policy "Authenticated users can manage tutorials" on portfolio_tutorials
  for all to authenticated using (true) with check (true);
