-- Denário — bens cadastrados pelo app (com foto)
create table if not exists public.bens_app (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item text not null, grupo text, qtd int not null default 1,
  valor_compra numeric(12,2), data_aquisicao date, vida_util int not null default 8,
  foto_path text, obs text, dono text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
alter table public.bens_app enable row level security;
drop policy if exists "bens: ler" on public.bens_app;    create policy "bens: ler" on public.bens_app for select using (household_id in (select public.minhas_familias()));
drop policy if exists "bens: criar" on public.bens_app;  create policy "bens: criar" on public.bens_app for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "bens: alterar" on public.bens_app; create policy "bens: alterar" on public.bens_app for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "bens: apagar" on public.bens_app; create policy "bens: apagar" on public.bens_app for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.bens_app to authenticated;
insert into storage.buckets (id, name, public) values ('bens', 'bens', false) on conflict (id) do nothing;
drop policy if exists "bens: enviar foto" on storage.objects;
create policy "bens: enviar foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'bens' and (storage.foldername(name))[1] in (select public.minhas_familias()::text));
drop policy if exists "bens: ver foto" on storage.objects;
create policy "bens: ver foto" on storage.objects for select to authenticated
  using (bucket_id = 'bens' and (storage.foldername(name))[1] in (select public.minhas_familias()::text));
drop policy if exists "bens: apagar foto" on storage.objects;
create policy "bens: apagar foto" on storage.objects for delete to authenticated
  using (bucket_id = 'bens' and (storage.foldername(name))[1] in (select public.minhas_familias()::text));
