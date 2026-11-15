-- Denário — lista de compras da família (checklist), com o que foi comprado de fato.
create table if not exists public.compras_app (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item text not null,
  qtd numeric(10,2) not null default 1,
  unidade text,
  preco_ref numeric(12,2),
  onde text,
  origem text not null default 'minha',
  sugerida_id text,
  comprado boolean not null default false,
  valor_pago numeric(12,2),
  nota_id uuid,
  ordem int not null default 0,
  fechada_em timestamptz,
  comprado_em timestamptz,
  criado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists compras_app_hh on public.compras_app (household_id, fechada_em);
alter table public.compras_app enable row level security;
drop policy if exists "compras: ler" on public.compras_app;
create policy "compras: ler" on public.compras_app for select using (household_id in (select public.minhas_familias()));
drop policy if exists "compras: criar" on public.compras_app;
create policy "compras: criar" on public.compras_app for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "compras: alterar" on public.compras_app;
create policy "compras: alterar" on public.compras_app for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "compras: apagar" on public.compras_app;
create policy "compras: apagar" on public.compras_app for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.compras_app to authenticated;
select 'ok' as compras;
