-- E21e · Proposições de autoria, Câmara e Senado, desde 2023 (decisão de 2026-11-02, docs/VOLUME.md).
-- Íntegra (ementa, situação, se virou norma) só dos tipos que podem virar lei: PL, PLP, PEC, PDL e
-- PRC (Câmara) ou PRS (Senado), e só os que têm algum autor no site. Os demais tipos (requerimentos,
-- indicações, emendas, pareceres) ficam como contagem por político, ano e tipo.
-- Rodar uma vez no SQL Editor, depois da 0003.

begin;

create table proposicoes (
  id           text primary key,               -- casa:id_externo
  id_externo   text not null,
  casa         text not null check (casa in ('camara', 'senado')),
  tipo         text not null,
  numero       integer not null,
  ano          smallint not null,
  ementa       text,                           -- null quando a fonte não traz
  apresentacao date not null,
  situacao     text,
  virou_norma  boolean not null,
  url_oficial  text not null
);

create table proposicoes_autores (
  proposicao_id text not null references proposicoes (id),
  politico_id   text not null references politicos (id),
  ordem         smallint not null,               -- 1 = primeiro autor
  primary key (proposicao_id, politico_id)
);
create index proposicoes_autores_politico on proposicoes_autores (politico_id);

create table proposicoes_contagem (
  politico_id text not null references politicos (id),
  casa        text not null check (casa in ('camara', 'senado')),
  ano         smallint not null,
  tipo        text not null,
  autorias    integer not null,
  primary key (politico_id, casa, ano, tipo)
);

do $$
declare t text;
begin
  foreach t in array array['proposicoes', 'proposicoes_autores', 'proposicoes_contagem'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy leitura_publica on %I for select to anon, authenticated using (true)', t);
    execute format('grant select on %I to anon, authenticated', t);
    execute format('grant select, insert, update, delete on %I to service_role', t);
  end loop;
end $$;

commit;
