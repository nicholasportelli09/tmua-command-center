-- TMUA Command Center — cloud sync schema
--
-- Storage model: each workspace's full data snapshot (AppData JSON) is stored in
-- one row, keyed by the SHA-256 hash of the private workspace sync key.
--
-- Security: Row Level Security is enabled with NO policies, so the anon and
-- authenticated roles are denied all access. The application only ever reaches
-- this table through server-side route handlers using the service-role key,
-- which bypasses RLS. The public anon key can never read or modify any snapshot.

create table if not exists public.workspace_snapshots (
  key_hash    text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.workspace_snapshots is
  'Per-workspace AppData snapshot, keyed by SHA-256(sync key). Server/service-role access only.';

alter table public.workspace_snapshots enable row level security;

-- Explicitly remove any inherited grants for the public API roles.
revoke all on public.workspace_snapshots from anon, authenticated;

-- The server reaches this table only via the service-role key (which bypasses
-- RLS); make sure that role has full table access.
grant all on table public.workspace_snapshots to service_role;
