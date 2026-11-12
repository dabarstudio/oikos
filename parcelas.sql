-- Denário — compras parceladas no cartão
alter table public.gastos_app add column if not exists parcelas int not null default 1;
alter table public.gastos_app add column if not exists parcela1 date;
