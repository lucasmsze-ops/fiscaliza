-- E23k · Página de cada votação nominal do Plenário já calculada (lib/votacao.ts, o mesmo código do
-- site): placar, como votou cada partido (com o partido de cada parlamentar no dia) e as outras
-- votações da mesma matéria. A página lê só esta linha (~4 KB), nunca os ~500 votos da votação.
-- `hash` deixa o cron regravar só o que mudou. Rodar uma vez no SQL Editor, depois da 0005.

create table resumos_votacao (
  votacao_id   text primary key references votacoes (id),
  pagina       jsonb not null,
  hash         text not null,
  calculado_em timestamptz not null default now()
);

alter table resumos_votacao enable row level security;
create policy leitura_publica on resumos_votacao for select to anon, authenticated using (true);
grant select on resumos_votacao to anon, authenticated;
grant select, insert, update, delete on resumos_votacao to service_role;
