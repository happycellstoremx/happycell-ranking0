-- Happycell · concurso 9 al 15 noviembre 2026, horario de Tijuana (UTC-8).
-- Sólo apodos, puntuación, nivel y tiempos de envío se muestran en el ranking público.
create extension if not exists pgcrypto;

create table if not exists public.hc_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  alias text,
  level integer,
  points integer,
  status text not null default 'started' check(status in ('started','pending','verified','rejected')),
  constraint hc_runs_level_range check (level is null or level between 0 and 100),
  constraint hc_runs_points_range check (points is null or points between 0 and 500000),
  constraint hc_runs_alias_valid check (alias is null or char_length(alias) between 2 and 22)
);
create index if not exists hc_runs_player_time on public.hc_runs(player_id,started_at desc);

create table if not exists public.hc_leaderboard (
  player_id uuid primary key,
  alias text not null check (char_length(alias) between 2 and 22),
  level integer not null check (level between 0 and 100),
  points integer not null check (points between 0 and 500000),
  updated_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','verified'))
);
create index if not exists hc_leaderboard_best on public.hc_leaderboard(level desc,points desc,updated_at asc);

-- Toda escritura pasa por funciones de Netlify usando la clave secreta.
alter table public.hc_runs enable row level security;
alter table public.hc_leaderboard enable row level security;
revoke all on public.hc_runs from public,anon,authenticated;
revoke all on public.hc_leaderboard from public,anon,authenticated;
grant all on public.hc_runs to service_role;
grant all on public.hc_leaderboard to service_role;
grant select on public.hc_leaderboard to anon,authenticated;

-- Los clientes solo pueden leer la tabla de apodos, niveles y puntos.
drop policy if exists hc_leaderboard_public_read on public.hc_leaderboard;
create policy hc_leaderboard_public_read on public.hc_leaderboard
for select to anon,authenticated using (true);

-- Esta función SECURITY INVOKER sólo es ejecutable con service_role.
-- Valida y guarda en una transacción la sesión y el mejor récord por jugador.
create or replace function public.hc_finish_run(p_run_id uuid,p_alias text,p_level integer,p_points integer)
returns jsonb
language plpgsql
security invoker
set search_path = public,pg_temp
as $$
declare
  r public.hc_runs%rowtype;
  elapsed_seconds numeric;
begin
  if p_alias is null or p_alias !~ '^[[:alnum:]À-ÿ _.-]{2,22}$'
     or p_level is null or p_level not between 0 and 100
     or p_points is null or p_points not between 0 and 500000 then
    raise exception 'Datos de récord inválidos';
  end if;
  select * into r from public.hc_runs where id = p_run_id for update;
  if not found or r.ended_at is not null then raise exception 'Partida no válida o ya registrada'; end if;
  if r.started_at < '2026-11-09 08:00:00+00'::timestamptz
     or r.started_at >= '2026-11-16 08:00:00+00'::timestamptz
     or now() >= '2026-11-16 08:00:00+00'::timestamptz then
    raise exception 'Fuera del periodo del concurso';
  end if;
  elapsed_seconds:=extract(epoch from now()-r.started_at);
  if elapsed_seconds < 4 or elapsed_seconds>7200
     or (p_level>1 and elapsed_seconds < (p_level - 1)*1.1) then
    raise exception 'Tiempo de partida no plausible';
  end if;
  update public.hc_runs set alias=trim(p_alias),level=p_level,points=p_points,
    ended_at=now(),status='pending' where id=p_run_id;
  insert into public.hc_leaderboard(player_id,alias,level,points,updated_at,status)
  values(r.player_id,trim(p_alias),p_level,p_points,now(),'pending')
  on conflict(player_id) do update
  set alias=excluded.alias,level=excluded.level,points=excluded.points,
      updated_at=excluded.updated_at,status='pending'
  where excluded.level>public.hc_leaderboard.level
    or (excluded.level=public.hc_leaderboard.level and excluded.points>public.hc_leaderboard.points);
  return jsonb_build_object('recorded',true,'status','pending');
end;
$$;
revoke execute on function public.hc_finish_run(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.hc_finish_run(uuid,text,integer,integer) to service_role;

-- Activa eventos en vivo sin destruir la publicación existente.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='hc_leaderboard'
  ) then
    alter publication supabase_realtime add table public.hc_leaderboard;
  end if;
end $$;

-- Consulta manual de mejores marcas (sólo apodos).
-- select alias,level,points,status from public.hc_leaderboard
-- order by level desc,points desc,updated_at asc limit 10;
