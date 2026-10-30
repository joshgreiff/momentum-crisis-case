-- Distinguish practice/demo updates from real instructor crisis updates. Safe to run more than once.
alter table events add column if not exists is_demo boolean not null default false;
-- Mark the existing test and demo-check events created during development as practice.
update events set is_demo = true where subject like '[TEST]%' or subject like 'Demo check%';
create index if not exists events_received_at_idx on events(received_at desc);
