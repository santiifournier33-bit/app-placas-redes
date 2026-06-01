-- Migration: create_funnel_tracker
-- Sales funnel tracker: per-advisor daily activity + global goals.
-- Accessed ONLY via service-role (API routes). RLS enabled, no policies =>
-- anon/authenticated roles are blocked; the service-role key bypasses RLS.
-- Applied to project yahsfzmlijrolyvhxnhw (APP FREIRE FINAL) on 2026-05-31.

create table if not exists public.funnel_activities (
  id uuid primary key default gen_random_uuid(),
  agent_email text not null,
  stage text not null check (stage in ('conversacion','pretasacion','tasacion','captacion','reserva','venta')),
  activity_date date not null,
  quantity integer not null default 1 check (quantity > 0),
  action text check (action in ('llamado','cara_a_cara','whatsapp','redes','pop_by','eventos','otros')),
  origin text check (origin in ('conocido','referido','repetido','visita','redes','referido_colega','contacto_frio','otros')),
  operation_type text check (operation_type in ('una_punta','dos_puntas')),
  address_or_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_funnel_activities_agent_date on public.funnel_activities (agent_email, activity_date);
create index if not exists idx_funnel_activities_stage on public.funnel_activities (stage);
create index if not exists idx_funnel_activities_date on public.funnel_activities (activity_date);

alter table public.funnel_activities enable row level security;

create table if not exists public.funnel_goals (
  id uuid primary key default gen_random_uuid(),
  stage text not null unique check (stage in ('conversacion','pretasacion','tasacion','captacion','reserva','venta')),
  monthly_target numeric not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.funnel_goals enable row level security;

insert into public.funnel_goals (stage, monthly_target) values
  ('conversacion', 100),
  ('pretasacion', 10),
  ('tasacion', 6),
  ('captacion', 2),
  ('reserva', 1),
  ('venta', 0.5)
on conflict (stage) do nothing;

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_funnel_activities_updated_at on public.funnel_activities;
create trigger trg_funnel_activities_updated_at before update on public.funnel_activities
  for each row execute function public.set_updated_at();

drop trigger if exists trg_funnel_goals_updated_at on public.funnel_goals;
create trigger trg_funnel_goals_updated_at before update on public.funnel_goals
  for each row execute function public.set_updated_at();
