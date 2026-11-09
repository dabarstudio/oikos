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
