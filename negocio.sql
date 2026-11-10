-- Oikos — "Meu negócio": tela própria para vendas/revenda com meta do mês.
alter table public.households add column if not exists negocio_meta numeric(12,2);
alter table public.households add column if not exists negocio_logo text;
alter table public.households add column if not exists negocio_cor text;
alter table public.gastos_app add column if not exists venda_em date;
update public.gastos_app set venda_em = data where envelope = 'revenda' and venda_valor is not null and venda_em is null;

create or replace function public.definir_negocio(p_nome text, p_meta numeric) returns void
language sql security definer set search_path = public as $$
  update public.households set negocio = nullif(trim(p_nome), ''), negocio_meta = p_meta
  where id in (select household_id from public.members where user_id = auth.uid());
$$;
revoke all on function public.definir_negocio(text, numeric) from public, anon;
grant execute on function public.definir_negocio(text, numeric) to authenticated;
