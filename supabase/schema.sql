-- Use of AI: written with Claude by Anthropic, guided and tested by the Zero Hour Protocol team.
-- Zero Hour Protocol database schema.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Row level security is on with no public policies, so only the server
-- (with the service role key, through the /api endpoints) can read or write.

create table if not exists crew (
  id text primary key,
  name text not null,
  role text not null,
  baseline jsonb not null default '{}'::jsonb
);

create table if not exists telemetry (
  id bigserial primary key,
  ts timestamptz not null default now(),
  crew_id text not null references crew(id),
  source text not null default 'sensor',
  activity text,
  hr real, spo2 real, temp real, rr real, sbp real, dbp real, hrv real, rad real,
  level smallint not null default 0,
  score smallint not null default 0,
  findings jsonb not null default '[]'::jsonb
);
create index if not exists telemetry_crew_ts on telemetry (crew_id, ts desc);

create table if not exists checkins (
  id bigserial primary key,
  ts timestamptz not null default now(),
  crew_id text not null references crew(id),
  source text not null default 'form',
  feel smallint,
  sleep real,
  glucose smallint,
  symptoms text[] not null default '{}',
  pain_score smallint,
  pain_location text,
  transcript text
);
create index if not exists checkins_crew_ts on checkins (crew_id, ts desc);

create table if not exists events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  crew_id text references crew(id),
  level text not null default 'i',
  met integer,
  message text not null
);
create index if not exists events_ts on events (ts desc);

alter table crew enable row level security;
alter table telemetry enable row level security;
alter table checkins enable row level security;
alter table events enable row level security;

insert into crew (id, name, role, baseline) values
  ('CDR', 'Ana Reyes',    'Commander',       '{"hr":62,"spo2":98,"temp":36.7,"rr":14,"sbp":118,"dbp":76,"hrv":58}'),
  ('PLT', 'Kenji Tanaka', 'Pilot',           '{"hr":57,"spo2":98,"temp":36.6,"rr":13,"sbp":116,"dbp":72,"hrv":66}'),
  ('FE',  'Layla Haddad', 'Flight engineer', '{"hr":66,"spo2":98,"temp":36.8,"rr":15,"sbp":122,"dbp":79,"hrv":51}'),
  ('MO',  'Sam Okafor',   'Medical officer', '{"hr":69,"spo2":98,"temp":36.6,"rr":14,"sbp":120,"dbp":78,"hrv":47}')
on conflict (id) do nothing;
