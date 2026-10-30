-- The team's own written decision, kept separate from the AI proposal (title/proposal/rationale/details).
alter table decisions add column if not exists team_response text;
