-- Oikos — pessoas da família com avatar personalizável.
create table if not exists public.pessoas (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  chave text not null,
  nome text not null,
  avatar jsonb not null default '{}'::jsonb,
  ordem int not null default 0,
  unique (household_id, chave)
);
alter table public.pessoas enable row level security;
drop policy if exists "pessoas: ler" on public.pessoas;
create policy "pessoas: ler" on public.pessoas for select using (household_id in (select public.minhas_familias()));
drop policy if exists "pessoas: criar" on public.pessoas;
create policy "pessoas: criar" on public.pessoas for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "pessoas: alterar" on public.pessoas;
create policy "pessoas: alterar" on public.pessoas for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "pessoas: apagar" on public.pessoas;
create policy "pessoas: apagar" on public.pessoas for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.pessoas to authenticated;
insert into public.pessoas (household_id, chave, nome, avatar, ordem)
select h.id, v.chave, v.nome, v.avatar::jsonb, v.ordem from public.households h,
 (values ('george','George','{"pele":1,"cabelo":"careca","cor":"castanho","barba":"cheia","crianca":false,"fundo":"#cfe3d4"}',1),
         ('jheniffer','Jheniffer','{"pele":3,"cabelo":"longo","cor":"preto","barba":"nao","crianca":false,"fundo":"#f3d9cf"}',2),
         ('abner','Abner','{"pele":3,"cabelo":"curto","cor":"preto","barba":"nao","crianca":true,"fundo":"#d6e4f2"}',3)) as v(chave,nome,avatar,ordem)
on conflict (household_id, chave) do nothing;
select count(*) as pessoas from public.pessoas;
