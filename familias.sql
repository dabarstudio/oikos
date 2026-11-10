-- Oikos — várias famílias: código de convite, criar/entrar na família, pessoa de cada login, vales e revendas.
alter table public.households add column if not exists codigo text unique;
alter table public.households add column if not exists negocio text;
update public.households set codigo = upper(substr(md5(random()::text || id::text), 1, 6)) where codigo is null;
alter table public.members add column if not exists pessoa text;

create or replace function public.criar_familia(p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'precisa estar logado'; end if;
  select household_id into v from public.members where user_id = auth.uid() limit 1;
  if v is not null then return v; end if;
  insert into public.households (nome, codigo) values (coalesce(nullif(trim(p_nome), ''), 'Minha família'), upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))) returning id into v;
  insert into public.members (household_id, user_id, papel) values (v, auth.uid(), 'dono');
  return v;
end $$;

create or replace function public.entrar_familia(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'precisa estar logado'; end if;
  select id into v from public.households where codigo = upper(trim(p_codigo));
  if v is null then raise exception 'codigo nao encontrado'; end if;
  insert into public.members (household_id, user_id, papel) values (v, auth.uid(), 'membro') on conflict do nothing;
  return v;
end $$;

create or replace function public.definir_minha_pessoa(p_chave text) returns void
language sql security definer set search_path = public as $$
  update public.members set pessoa = p_chave where user_id = auth.uid();
$$;

revoke all on function public.criar_familia(text), public.entrar_familia(text), public.definir_minha_pessoa(text) from public, anon;
grant execute on function public.criar_familia(text), public.entrar_familia(text), public.definir_minha_pessoa(text) to authenticated;

-- vales e cashback
create table if not exists public.vales (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  loja text not null, tipo text not null default 'cashback',
  valor numeric(12,2) not null, saldo numeric(12,2) not null,
  libera_em date, vence_em date, limite_pct int, regra text, para text,
  encerrado boolean not null default false,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
alter table public.vales enable row level security;
drop policy if exists "vales: ler" on public.vales;    create policy "vales: ler" on public.vales for select using (household_id in (select public.minhas_familias()));
drop policy if exists "vales: criar" on public.vales;  create policy "vales: criar" on public.vales for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "vales: alterar" on public.vales; create policy "vales: alterar" on public.vales for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "vales: apagar" on public.vales; create policy "vales: apagar" on public.vales for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.vales to authenticated;

-- revendas (compra para revender: fora dos envelopes)
alter table public.gastos_app add column if not exists venda_para text;
alter table public.gastos_app add column if not exists venda_valor numeric(12,2);
alter table public.gastos_app add column if not exists venda_recebido boolean not null default false;
