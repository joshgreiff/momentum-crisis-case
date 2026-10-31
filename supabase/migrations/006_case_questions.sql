-- General case questions are not tied to one update, and record which team member asked.
alter table questions alter column event_id drop not null;
alter table questions add column if not exists asker text;
create index if not exists questions_created_idx on questions(created_at desc);
