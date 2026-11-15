-- Denário — módulo Veículos: carros da família, abastecimentos, serviços, despesas e lista de compras do carro.
create table if not exists public.veiculos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  nome text not null, modelo text, ano text, placa text,
  combustivel text not null default 'Flex',
  emoji text not null default '🚗',
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
-- tipo: 'abast' | 'servico' | 'despesa' | 'compra'. Os detalhes de cada tipo ficam em "dados".
create table if not exists public.veiculo_reg (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  tipo text not null check (tipo in ('abast', 'servico', 'despesa', 'compra')),
  data date not null default current_date,
  km int,
  valor numeric(12,2),
  dados jsonb not null default '{}'::jsonb,
  gasto_id uuid references public.gastos_app(id) on delete set null,
  criado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists veiculo_reg_v on public.veiculo_reg (veiculo_id, tipo, data);

alter table public.veiculos enable row level security;
alter table public.veiculo_reg enable row level security;
drop policy if exists "veiculos: ler" on public.veiculos;     create policy "veiculos: ler" on public.veiculos for select using (household_id in (select public.minhas_familias()));
drop policy if exists "veiculos: criar" on public.veiculos;   create policy "veiculos: criar" on public.veiculos for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "veiculos: alterar" on public.veiculos; create policy "veiculos: alterar" on public.veiculos for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "veiculos: apagar" on public.veiculos;  create policy "veiculos: apagar" on public.veiculos for delete using (household_id in (select public.minhas_familias()));
drop policy if exists "veiculo_reg: ler" on public.veiculo_reg;     create policy "veiculo_reg: ler" on public.veiculo_reg for select using (household_id in (select public.minhas_familias()));
drop policy if exists "veiculo_reg: criar" on public.veiculo_reg;   create policy "veiculo_reg: criar" on public.veiculo_reg for insert with check (household_id in (select public.minhas_familias()));
drop policy if exists "veiculo_reg: alterar" on public.veiculo_reg; create policy "veiculo_reg: alterar" on public.veiculo_reg for update using (household_id in (select public.minhas_familias())) with check (household_id in (select public.minhas_familias()));
drop policy if exists "veiculo_reg: apagar" on public.veiculo_reg;  create policy "veiculo_reg: apagar" on public.veiculo_reg for delete using (household_id in (select public.minhas_familias()));
grant select, insert, update, delete on public.veiculos, public.veiculo_reg to authenticated;

-- Dados que já estavam na página "Garagem" (Uno Mille 2008), só na família que ainda não tem veículos.
with h as (select hh.id from public.households hh where exists (select 1 from public.datasets d where d.household_id = hh.id and d.id = 'mensal')
  and not exists (select 1 from public.veiculos v where v.household_id = hh.id) order by hh.criado_em limit 1),
v as (insert into public.veiculos (household_id, nome, modelo, ano, combustivel) select id, 'Uno', 'Fiat Uno Mille Fire', '2008', 'Flex' from h returning id, household_id)
insert into public.veiculo_reg (household_id, veiculo_id, tipo, data, km, valor, dados)
select v.household_id, v.id, x.tipo, x.data::date, null, null, x.dados::jsonb from v, (values
  ('servico', '2026-11-14', '{"servico":"Sistema de arrefecimento","desc":"Lavagem do sistema, sangria e troca do aditivo"}'),
  ('servico', '2026-11-15', '{"servico":"Calibragem","desc":"Calibragem dos pneus"}'),
  ('compra',  '2026-11-15', '{"nome":"Tampa do reservatório de expansão","nota":"Uno Mille Fire 2008 — levar a velha para comparar","lista":"comprar","prio":"alta","ok":false}'),
  ('compra',  '2026-11-15', '{"nome":"Aditivo de radiador (1 L)","nota":"Mesmo tipo do que foi colocado","lista":"comprar","ok":true}'),
  ('compra',  '2026-11-15', '{"nome":"Abraçadeiras de mangueira (reserva)","nota":"Medida da mangueira de cima: 32–44","lista":"comprar","ok":false}'),
  ('compra',  '2026-11-15', '{"nome":"Porta-copos","lista":"comprar","ok":false}'),
  ('compra',  '2026-11-15', '{"nome":"Encosto de braço","lista":"comprar","ok":false}'),
  ('compra',  '2026-11-15', '{"nome":"Defletor da ventoinha","nota":"O atual está trincado — sem pressa","lista":"orcar","ok":false}'),
  ('compra',  '2026-11-15', '{"nome":"Radiador","nota":"Aletas corroídas na lateral — só se vazar ou esquentar","lista":"orcar","ok":false}')
) as x(tipo, data, dados);

select 'ok' as veiculos, (select count(*) from public.veiculos) as carros, (select count(*) from public.veiculo_reg) as registros;
