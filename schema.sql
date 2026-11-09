-- Oikos — estrutura do banco (rode uma vez no Supabase: SQL Editor → New query → Run)
-- Cada família ("household") só enxerga os próprios dados, garantido pelas regras RLS abaixo.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  plano text not null default 'pessoal',
  criado_em timestamptz not null default now()
);

create table if not exists public.members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono','membro','leitura')),
  primary key (household_id, user_id)
);

create table if not exists public.datasets (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

create table if not exists public.correcoes (
  id bigserial primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  lancamento_id text not null,
  data date,
  descricao text,
  valor numeric(14,2),
  de_conta text,
  para_conta text not null,
  criado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now(),
  aplicada boolean not null default false
);

-- função auxiliar: famílias do usuário logado
create or replace function public.minhas_familias() returns setof uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.members where user_id = auth.uid()
$$;

alter table public.households enable row level security;
alter table public.members    enable row level security;
alter table public.datasets   enable row level security;
alter table public.correcoes  enable row level security;

drop policy if exists "ler minha familia" on public.households;
create policy "ler minha familia" on public.households for select using (id in (select public.minhas_familias()));

drop policy if exists "ler meus vinculos" on public.members;
create policy "ler meus vinculos" on public.members for select using (user_id = auth.uid());

drop policy if exists "ler dados da familia" on public.datasets;
create policy "ler dados da familia" on public.datasets for select using (household_id in (select public.minhas_familias()));

drop policy if exists "ler correcoes da familia" on public.correcoes;
create policy "ler correcoes da familia" on public.correcoes for select using (household_id in (select public.minhas_familias()));

drop policy if exists "registrar correcoes" on public.correcoes;
create policy "registrar correcoes" on public.correcoes for insert with check (
  household_id in (select public.minhas_familias())
  and exists (select 1 from public.members m where m.household_id = correcoes.household_id and m.user_id = auth.uid() and m.papel in ('dono','membro'))
);
-- Escrita em households, members e datasets: só pelo painel do Supabase (ou pela chave de serviço), nunca pelo app.

-- Permissões da API (o acesso real a cada linha continua controlado pelas regras RLS acima).
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.households, public.members, public.datasets, public.correcoes to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on public.households, public.members, public.datasets, public.correcoes from anon;
-- Oikos — notinhas (fotos de cupom/NFC-e) enviadas pelo app.
create table if not exists public.notas (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  criado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now(),
  foto_path text,
  qr_texto text,
  chave text,
  loja text,
  data_compra date,
  total numeric(14,2),
  status text not null default 'pendente' check (status in ('pendente','lida','erro')),
  obs text
);
alter table public.notas enable row level security;
drop policy if exists "ler notas da familia" on public.notas;
create policy "ler notas da familia" on public.notas for select using (household_id in (select public.minhas_familias()));
drop policy if exists "enviar notas" on public.notas;
create policy "enviar notas" on public.notas for insert with check (household_id in (select public.minhas_familias()));
grant select, insert on public.notas to authenticated;

-- pasta privada para as fotos: notas/<id da família>/<arquivo>.jpg
insert into storage.buckets (id, name, public) values ('notas', 'notas', false) on conflict (id) do nothing;
drop policy if exists "notas: enviar foto" on storage.objects;
create policy "notas: enviar foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'notas' and (storage.foldername(name))[1] in (select public.minhas_familias()::text));
drop policy if exists "notas: ver foto" on storage.objects;
create policy "notas: ver foto" on storage.objects for select to authenticated
  using (bucket_id = 'notas' and (storage.foldername(name))[1] in (select public.minhas_familias()::text));
select 'ok' as notas;
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
