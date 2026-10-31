-- Case questions are private to the browser that asked them (anonymous per-browser ID).
alter table questions add column if not exists client_id text;
create index if not exists questions_client_idx on questions(client_id, created_at desc);
