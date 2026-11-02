-- E20 · Card e página de cada político já calculados (lib/card.ts e lib/pagina.ts, o mesmo código
-- do site). As páginas leem só esta linha (~20 KB) em vez de todas as votações da Casa (~1 MB):
-- é o que mantém o tráfego dentro dos 5 GB/mês do Supabase free (docs/VOLUME.md).
-- `hash` deixa o pré-cálculo regravar só o que mudou (regravar tudo dobra o espaço, medido na E19).
-- Rodar uma vez no SQL Editor do projeto, depois da 0001.

create table resumos (
  politico_id  text primary key references politicos (id),
  card         jsonb not null,
  pagina       jsonb not null,
  hash         text not null,
  calculado_em timestamptz not null default now()
);

alter table resumos enable row level security;
create policy leitura_publica on resumos for select to anon, authenticated using (true);
grant select on resumos to anon, authenticated;
grant select, insert, update, delete on resumos to service_role;
