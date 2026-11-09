-- Oikos — gastos anotados pelo próprio app (antes de aparecerem no extrato).
create table if not exists public.gastos_app (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  data date not null default current_date,
  valor numeric(14,2) not null,
  envelope text not null default 'outros',
  descricao text,
  forma text not null default 'dinheiro',
  pessoa text,
  reembolsar boolean not null default false,
  reembolso_de text,
  conciliado boolean not null default false,
  criado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now()
);
alter table public.gastos_app enable row level security;
drop policy if exists "gastos_app: ler" on public.gastos_app;
create policy "gastos_app: ler" on public.gastos_app for select using (household_id in (select public.minhas_familias()));
drop policy if exists "gastos_app: criar" on public.gastos_app;
create policy "gastos_app: criar" on public.gastos_app for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "gastos_app: alterar" on public.gastos_app;
create policy "gastos_app: alterar" on public.gastos_app for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "gastos_app: apagar" on public.gastos_app;
create policy "gastos_app: apagar" on public.gastos_app for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.gastos_app to authenticated;
-- 1º lançamento: ônibus da visita à Agro TNZ (09/11), pago em dinheiro, a reembolsar pela Vital
insert into public.gastos_app (household_id, data, valor, envelope, descricao, forma, pessoa, reembolsar, reembolso_de)
select h.id, date '2026-11-09', 6.00, 'transporte', 'Passagem de ônibus urbano – visita Agro TNZ', 'dinheiro', 'george', true, 'Vital (Agro TNZ)'
from public.households h
where not exists (select 1 from public.gastos_app g where g.household_id = h.id and g.descricao like 'Passagem de ônibus urbano – visita Agro TNZ%');
