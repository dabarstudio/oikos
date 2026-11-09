-- Oikos — limites dos envelopes ajustados pelo app (sobrepõem as metas da planilha).
create table if not exists public.limites (
  household_id uuid not null references public.households(id) on delete cascade,
  nivel text not null,
  chave text not null,
  valor_meta numeric(14,2) not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) default auth.uid(),
  primary key (household_id, nivel, chave)
);
alter table public.limites enable row level security;
drop policy if exists "limites: ler" on public.limites;
create policy "limites: ler" on public.limites for select using (household_id in (select public.minhas_familias()));
drop policy if exists "limites: criar" on public.limites;
create policy "limites: criar" on public.limites for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "limites: alterar" on public.limites;
create policy "limites: alterar" on public.limites for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
grant select, insert, update on public.limites to authenticated;
select 'ok' as limites;
