-- Oikos — contas/bancos da família (com titular)
create table if not exists public.bancos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  nome text not null,
  dono text,                -- chave da pessoa titular (tabela pessoas)
  cor text default '#61665e',
  ordem int not null default 99,
  criado_em timestamptz not null default now()
);
alter table public.bancos enable row level security;
create policy bancos_ler on public.bancos for select using (household_id in (select public.minhas_familias()));
create policy bancos_criar on public.bancos for insert with check (household_id in (select public.minhas_familias()));
create policy bancos_alterar on public.bancos for update using (household_id in (select public.minhas_familias()));
create policy bancos_apagar on public.bancos for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.bancos to authenticated;
alter table public.notas add column if not exists conta text;
alter table public.gastos_app add column if not exists conta text;
