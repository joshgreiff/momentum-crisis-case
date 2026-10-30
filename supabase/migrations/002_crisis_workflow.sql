-- Crisis-analysis workflow: processing lock, update source, structured decision details.
-- Safe to run more than once.
alter table events add column if not exists source text not null default 'email';
alter table events add column if not exists processing_started_at timestamptz;
alter table events add column if not exists attempts int not null default 0;
alter table decisions add column if not exists details jsonb not null default '{}';
create unique index if not exists decisions_event_id_key on decisions(event_id);

-- Atomically claims an event for processing so the same update is never analyzed twice concurrently.
-- Claimable: new, failed, or a processing run that has been stuck longer than p_stale_after.
create or replace function claim_event(p_event_id uuid, p_stale_after interval default interval '10 minutes')
returns setof events
language sql
security invoker
set search_path = public
as $$
  update events
     set status = 'processing', processing_started_at = now(), attempts = attempts + 1, error = null
   where id = p_event_id
     and (status in ('received', 'failed')
          or (status = 'processing' and (processing_started_at is null or processing_started_at < now() - p_stale_after)))
  returning *;
$$;
revoke execute on function claim_event(uuid, interval) from public, anon, authenticated;
grant execute on function claim_event(uuid, interval) to service_role;
