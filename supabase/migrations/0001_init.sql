-- E19 · Schema inicial do Fiscaliza (Supabase free, Postgres).
-- Mesmas linhas de data/*.json (snake_case, lib/types.ts via lib/linhas.ts) e as mesmas chaves de
-- scripts/sonda/validar.ts. Nenhuma coluna de CPF ou hash de CPF (CLAUDE.md).
-- Leitura pública (anon) em tudo, exceto a contagem da fake door; escrita só pela chave secreta
-- (cron e seed), que ignora RLS. Rodar uma vez no SQL Editor do projeto.

-- ------------------------------------------------------------------ dados
create table listas (
  id            text primary key,
  uf            text not null,
  ano           smallint not null,
  cargo         text not null check (cargo in ('deputado_federal', 'senador')),
  nome          text not null,
  composicao    text,
  votos_validos integer not null,
  eleitos       smallint not null
);

create table politicos (
  id               text primary key,          -- = slug: nome de urna + UF
  slug             text not null unique,
  cargo            text not null check (cargo in ('deputado_federal', 'senador')),
  nome             text not null,
  nome_urna        text not null,
  genero           text check (genero in ('feminino', 'masculino')),
  uf               text not null,
  partido          text not null,
  lista_id         text references listas (id),
  federacao        text,
  numero_urna      text,
  foto_url         text,
  email            text,
  telefone         text,
  redes_sociais    jsonb not null default '[]',
  url_perfil       text,
  tse_sq_candidato text,
  camara_id        integer,
  senado_codigo    text,
  status           text not null check (status in ('eleito', 'reeleito', 'nao_eleito', 'suplente', 'em_exercicio')),
  votos_2026       integer,
  updated_at       timestamptz not null
);

create table mandatos (
  politico_id text not null references politicos (id),
  cargo       text not null check (cargo in ('deputado_federal', 'senador')),
  inicio      date not null,
  fim         date,                           -- null = em curso
  titular     boolean not null,
  primary key (politico_id, cargo, inicio)
);

create table afastamentos (
  politico_id text not null references politicos (id),
  inicio      date not null,
  fim         date,
  motivo      text not null,
  primary key (politico_id, inicio, motivo)
);

create table municipios (
  ibge integer primary key,
  tse  text not null,
  nome text not null,
  uf   text not null
);

create table eleitos_mun (
  municipio_ibge integer not null references municipios (ibge),
  cargo          text not null check (cargo in ('deputado_federal', 'senador')),
  politico_id    text not null references politicos (id),
  votos          integer not null,
  posicao        smallint not null,
  primary key (municipio_ibge, cargo, politico_id)
);

create table despesas_mes (
  politico_id   text not null references politicos (id),
  ano           smallint not null,
  mes           smallint not null check (mes between 1 and 12),
  total         numeric(12, 2) not null,
  por_categoria jsonb not null,
  primary key (politico_id, ano, mes)
);

create table despesas_media_uf (
  uf        text not null,
  ano       smallint not null,
  mes       smallint not null check (mes between 1 and 12),
  media     numeric(12, 2) not null,
  deputados smallint not null,
  total     numeric(14, 2) not null,
  fechado   boolean not null,
  primary key (uf, ano, mes)
);

create table votacoes (
  id          text primary key,               -- casa:id_externo
  id_externo  text not null,
  casa        text not null check (casa in ('camara', 'senado')),
  data        date not null,
  proposicao  text,
  ementa      text,
  objeto      text,
  descricao   text not null,
  resultado   text check (resultado in ('aprovada', 'rejeitada')),
  placar      jsonb,
  secreta     boolean not null,
  url_oficial text not null
);
create index votacoes_casa_data on votacoes (casa, data);

create table votos (
  votacao_id  text not null references votacoes (id),
  politico_id text not null references politicos (id),
  voto        text not null check (voto in ('sim', 'nao', 'abstencao', 'obstrucao', 'art17', 'nao_informado', 'secreto', 'ausente')),
  detalhe     text,
  primary key (votacao_id, politico_id)
);
create index votos_politico on votos (politico_id);

create table orientacoes (
  votacao_id text not null references votacoes (id),
  bancada    text not null,
  orientacao text check (orientacao in ('Sim', 'Não', 'Obstrução', 'Liberado', '')),
  primary key (votacao_id, bancada)
);
create index orientacoes_bancada on orientacoes (bancada);

-- ------------------------------------------------------------------ leitura pública
-- Permissões explícitas: projetos novos podem não expor tabelas novas à API automaticamente.
grant usage on schema public to anon, authenticated, service_role;
do $$
declare t text;
begin
  foreach t in array array['listas', 'politicos', 'mandatos', 'afastamentos', 'municipios', 'eleitos_mun',
                           'despesas_mes', 'despesas_media_uf', 'votacoes', 'votos', 'orientacoes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy leitura_publica on %I for select to anon, authenticated using (true)', t);
    execute format('grant select on %I to anon, authenticated', t);
    execute format('grant select, insert, update, delete on %I to service_role', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ fake door de avisos
-- Só a contagem por dia, página e tipo. Nada que identifique quem tocou (CLAUDE.md, princípio 3).
create table avisos_interesse (
  dia    date not null default current_date,
  pagina text not null check (length(pagina) <= 160),
  tipo   text not null check (tipo in ('politico', 'colinha', 'votacao', 'cidade')),
  toques integer not null default 1,
  primary key (dia, pagina, tipo)
);
alter table avisos_interesse enable row level security;  -- sem policy: anon não lê nem escreve direto
grant select, insert, update, delete on avisos_interesse to service_role;

create function registrar_aviso(p_pagina text, p_tipo text) returns void
language sql security definer set search_path = public as $$
  insert into avisos_interesse (pagina, tipo) values (p_pagina, p_tipo)
  on conflict (dia, pagina, tipo) do update set toques = avisos_interesse.toques + 1;
$$;
revoke all on function registrar_aviso(text, text) from public;
grant execute on function registrar_aviso(text, text) to anon;

-- ------------------------------------------------------------------ medição (E19)
-- Linhas exatas e tamanho em disco (tabela + índices + TOAST) de cada tabela do schema public.
create function tamanhos() returns table (tabela text, linhas bigint, bytes bigint)
language plpgsql security definer set search_path = public as $$
declare r record; n bigint;
begin
  for r in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname = 'public' and c.relkind = 'r' order by c.relname loop
    execute format('select count(*) from %I', r.relname) into n;
    tabela := r.relname; linhas := n; bytes := pg_total_relation_size(format('public.%I', r.relname)::regclass);
    return next;
  end loop;
end $$;
revoke all on function tamanhos() from public, anon, authenticated;
grant execute on function tamanhos() to service_role;
