-- 2026-11-20 · E23t · O que o Poder Executivo federal enviou ao Congresso desde 2023 (medida provisória, PL, PLP,
-- PEC e PLN), dos arquivos anuais da Câmara (autor "Órgão do Poder Executivo"). Mostrado no crachá do presidente.
-- O job `proposicoes` preenche. Rodar no SQL Editor ANTES do próximo cron que publica.

create table proposicoes_executivo (
  id           text primary key,                -- camara:id_externo
  id_externo   text not null,
  autor        text not null,                   -- "Poder Executivo" ou "Presidência da República"
  tipo         text not null,                   -- MPV, PL, PLP, PEC, PLN
  numero       integer not null,
  ano          integer not null,
  ementa       text,
  apresentacao date not null,
  situacao     text,
  virou_norma  boolean not null,
  url_oficial  text not null,
  temas        text[]
);
create index proposicoes_executivo_apresentacao on proposicoes_executivo (apresentacao desc);

alter table proposicoes_executivo enable row level security;
create policy leitura_publica on proposicoes_executivo for select to anon, authenticated using (true);

-- E23u (mesmo dia): matérias citadas em cada notícia das agências ("PLP 186/2026"), para o título da votação.
alter table noticias add column materias text[];
create index noticias_materias on noticias using gin (materias);
