-- Oikos — leitura instantânea da notinha
alter table public.notas add column if not exists itens jsonb;
alter table public.notas add column if not exists forma_lida text;
alter table public.notas add column if not exists obs_leitura text;
alter table public.notas add column if not exists lida_em timestamptz;
alter table public.gastos_app add column if not exists nota_id uuid unique references public.notas(id) on delete set null;
