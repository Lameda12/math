-- The Proposition: anonymous shared verdict counts.
-- Applied to the Supabase project wsgnjawrmokkvrfgpmpl as migration "proposition_shared_verdicts".
-- Tables are not reachable through the API; the browser only calls the two functions below.

create table public.proposition_secret (
  id boolean primary key default true check (id),
  salt bytea not null default extensions.gen_random_bytes(32)
);
insert into public.proposition_secret default values;

create table public.proposition_voters (
  token_hash bytea primary key,
  ip_hash bytea,
  created_at timestamptz not null default now()
);
create index proposition_voters_ip_idx on public.proposition_voters (ip_hash, created_at);

create table public.proposition_verdicts (
  result_id text not null check (result_id ~ '^[0-9]{3}$'),
  voter bytea not null references public.proposition_voters (token_hash) on delete cascade,
  verdict smallint not null check (verdict between 1 and 4),
  updated_at timestamptz not null default now(),
  primary key (result_id, voter)
);
create index proposition_verdicts_voter_idx on public.proposition_verdicts (voter);

alter table public.proposition_secret enable row level security;
alter table public.proposition_voters enable row level security;
alter table public.proposition_verdicts enable row level security;
revoke all on public.proposition_secret, public.proposition_voters, public.proposition_verdicts from anon, authenticated;

-- Cast or clear verdicts. p_token is a random UUID kept in the voter's browser; only its hash is stored.
-- p_votes maps result ids to 1-4, or to null/0 to clear. New voters are capped at 50 per network per day.
create function public.proposition_cast(p_token uuid, p_votes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash bytea;
  v_ip text;
  v_ip_hash bytea;
  v_key text;
  v_val jsonb;
  v_raw text;
  v_applied int := 0;
begin
  if p_token is null then
    raise exception 'token required';
  end if;
  if p_votes is null or jsonb_typeof(p_votes) <> 'object' then
    raise exception 'votes must be a JSON object';
  end if;
  if (select count(*) from jsonb_object_keys(p_votes)) > 400 then
    raise exception 'too many votes in one call';
  end if;

  v_hash := extensions.digest(p_token::text, 'sha256');

  if not exists (select 1 from public.proposition_voters where token_hash = v_hash) then
    v_ip := btrim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1));
    if v_ip <> '' then
      v_ip_hash := extensions.hmac(v_ip, (select salt from public.proposition_secret), 'sha256');
      if (select count(*) from public.proposition_voters
          where ip_hash = v_ip_hash and created_at > now() - interval '1 day') >= 50 then
        raise exception 'too many new voters from this network today';
      end if;
    end if;
    insert into public.proposition_voters (token_hash, ip_hash) values (v_hash, v_ip_hash);
  end if;

  for v_key, v_val in select key, value from jsonb_each(p_votes) loop
    continue when v_key !~ '^[0-9]{3}$';
    v_raw := v_val #>> '{}';
    if v_raw is null or v_raw = '0' then
      delete from public.proposition_verdicts where result_id = v_key and voter = v_hash;
      v_applied := v_applied + 1;
    elsif jsonb_typeof(v_val) = 'number' and v_raw ~ '^[1-4]$' then
      insert into public.proposition_verdicts (result_id, voter, verdict)
      values (v_key, v_hash, v_raw::smallint)
      on conflict (result_id, voter) do update
        set verdict = excluded.verdict, updated_at = now();
      v_applied := v_applied + 1;
    end if;
  end loop;

  return jsonb_build_object('applied', v_applied);
end;
$$;

-- Aggregate counts per result. Nothing about individual voters leaves the database.
create function public.proposition_counts()
returns table (result_id text, v1 int, v2 int, v3 int, v4 int)
language sql
stable
security definer
set search_path = ''
as $$
  select result_id,
         count(*) filter (where verdict = 1)::int,
         count(*) filter (where verdict = 2)::int,
         count(*) filter (where verdict = 3)::int,
         count(*) filter (where verdict = 4)::int
  from public.proposition_verdicts
  group by result_id
$$;

revoke all on function public.proposition_cast(uuid, jsonb) from public;
revoke all on function public.proposition_counts() from public;
grant execute on function public.proposition_cast(uuid, jsonb) to anon, authenticated;
grant execute on function public.proposition_counts() to anon, authenticated;
