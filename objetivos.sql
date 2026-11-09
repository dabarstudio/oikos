update public.households set nome = 'Família Sanches Vital' where nome = 'Família Vital';
-- Oikos — objetivos (sonhos) da família e de cada pessoa.
create table if not exists public.objetivos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pessoa text not null default 'familia',
  categoria text not null default 'outro',
  titulo text not null,
  valor_alvo numeric(14,2) not null default 0,
  valor_guardado numeric(14,2) not null default 0,
  prazo date,
  criado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.objetivos enable row level security;
drop policy if exists "objetivos: ler" on public.objetivos;
create policy "objetivos: ler" on public.objetivos for select using (household_id in (select public.minhas_familias()));
drop policy if exists "objetivos: criar" on public.objetivos;
create policy "objetivos: criar" on public.objetivos for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "objetivos: alterar" on public.objetivos;
create policy "objetivos: alterar" on public.objetivos for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "objetivos: apagar" on public.objetivos;
create policy "objetivos: apagar" on public.objetivos for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.objetivos to authenticated;
-- primeiro objetivo: a reserva de emergência do plano de aportes (meta R$ 15.000; já guardado na XP)
insert into public.objetivos (household_id, pessoa, categoria, titulo, valor_alvo, valor_guardado, prazo)
select h.id, 'familia', 'reserva', 'Reserva de emergência (3 meses)', 15000, 1303.67, date '2027-12-01'
from public.households h where true
and not exists (select 1 from public.objetivos o where o.household_id = h.id and o.categoria = 'reserva');
select count(*) as objetivos from public.objetivos;
