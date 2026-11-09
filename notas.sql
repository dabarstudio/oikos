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
