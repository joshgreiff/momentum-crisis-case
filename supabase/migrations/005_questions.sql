-- Questions a team member asks one AI executive about a specific update, with the saved answer.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  role text not null,
  question text not null,
  answer jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists questions_event_idx on questions(event_id, created_at);
alter table questions enable row level security;
