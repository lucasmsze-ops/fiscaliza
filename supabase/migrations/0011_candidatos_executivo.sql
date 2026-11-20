-- 2026-11-19 · E23q · Todos os candidatos a presidente e governador de 2026 (TSE, `consulta_cand`), para o
-- santinho do "Quem votei" achar também quem não foi eleito. Linha leve: o crachá completo dos eleitos
-- continua em `executivos`. O job `executivos` preenche. Rodar uma vez no SQL Editor, depois da 0010.

create table candidatos_executivo (
  id               text primary key,                    -- ano:sq_candidato
  ano              integer not null,
  cargo            text not null check (cargo in ('presidente', 'governador')),
  uf               text check (uf ~ '^[A-Z]{2}$'),      -- null = presidente
  nome             text not null,
  nome_urna        text not null,
  genero           text check (genero in ('feminino', 'masculino')),
  partido          text not null,
  numero_urna      integer,
  tse_sq_candidato text not null,
  foto_url         text,
  situacao         text check (situacao in ('eleito', 'nao_eleito')),   -- null = #NULO no TSE
  check ((cargo = 'presidente') = (uf is null))
);

alter table candidatos_executivo enable row level security;
create policy leitura_publica on candidatos_executivo for select to anon, authenticated using (true);
grant select on candidatos_executivo to anon, authenticated;
grant select, insert, update, delete on candidatos_executivo to service_role;
