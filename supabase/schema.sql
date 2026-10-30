create extension if not exists pgcrypto;
create table if not exists events (id uuid primary key default gen_random_uuid(), provider_email_id text unique not null, subject text not null, sender text, received_at timestamptz default now(), body text not null, facts jsonb default '[]', assumptions jsonb default '[]', urgency text default 'unknown', status text default 'received', error text);
create table if not exists agent_analyses (id uuid primary key default gen_random_uuid(), event_id uuid references events(id) on delete cascade, role text not null, analysis jsonb not null, created_at timestamptz default now(), unique(event_id,role));
create table if not exists decisions (id uuid primary key default gen_random_uuid(), event_id uuid references events(id) on delete cascade, title text not null, proposal text not null, rationale text, status text default 'pending' check (status in ('pending','approved','rejected')), decided_at timestamptz, created_at timestamptz default now());
-- Keep RLS enabled; service-role key stays server-side only.
alter table events enable row level security;
alter table agent_analyses enable row level security;
alter table decisions enable row level security;
-- After creating the base tables, also run supabase/migrations/002_crisis_workflow.sql.
