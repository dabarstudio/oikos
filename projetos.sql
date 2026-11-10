-- Oikos — "Meus projetos": negócios/rendas extras criados pelo próprio usuário (nome, logo, cor, tipo, meta).
create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  nome text not null,
  tipo text not null default 'revenda' check (tipo in ('revenda','servico')),
  logo_url text, icone text default '🏷️', cor text default '#1a2753',
  meta numeric(12,2), donos text[] default '{}',
  ativo boolean not null default true, ordem int not null default 99,
  criado_em timestamptz not null default now()
);
alter table public.projetos enable row level security;
drop policy if exists "projetos: ler" on public.projetos;     create policy "projetos: ler" on public.projetos for select using (household_id in (select public.minhas_familias()));
drop policy if exists "projetos: criar" on public.projetos;   create policy "projetos: criar" on public.projetos for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "projetos: alterar" on public.projetos; create policy "projetos: alterar" on public.projetos for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "projetos: apagar" on public.projetos;  create policy "projetos: apagar" on public.projetos for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.projetos to authenticated;

alter table public.gastos_app add column if not exists projeto_id uuid references public.projetos(id) on delete set null;

-- logos dos projetos: pasta logos/<id da família>/arquivo (leitura pública, envio só pela própria família)
insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict (id) do nothing;
drop policy if exists "logos: enviar" on storage.objects;
create policy "logos: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in (select public.minhas_familias()::text));
drop policy if exists "logos: trocar" on storage.objects;
create policy "logos: trocar" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (select public.minhas_familias()::text));

-- famílias que já tinham negócio cadastrado viram um projeto
insert into public.projetos (household_id, nome, tipo, logo_url, cor, meta, ordem)
select h.id, h.negocio, 'revenda', h.negocio_logo, coalesce(h.negocio_cor, '#1a2753'), h.negocio_meta, 1
from public.households h where h.negocio is not null and not exists (select 1 from public.projetos p where p.household_id = h.id);
update public.gastos_app g set projeto_id = p.id from public.projetos p
where g.envelope = 'revenda' and g.projeto_id is null and p.household_id = g.household_id and p.ordem = 1;
