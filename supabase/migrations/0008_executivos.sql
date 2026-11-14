-- 2026-11-13 · Presidente e governadores eleitos em 2026 (TSE, `consulta_cand`), mostrados na Visão
-- geral com "posse em 1º/1/2027": não há fonte aberta de quem está no cargo hoje. Sem crachá ainda,
-- por isso tabela própria (politicos só tem deputado federal e senador). O cron (job `executivos`)
-- preenche. Rodar uma vez no SQL Editor, depois da 0007.

create table executivos (
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
  posse            date not null,
  check ((cargo = 'presidente') = (uf is null))
);

alter table executivos enable row level security;
create policy leitura_publica on executivos for select to anon, authenticated using (true);
grant select on executivos to anon, authenticated;
grant select, insert, update, delete on executivos to service_role;
