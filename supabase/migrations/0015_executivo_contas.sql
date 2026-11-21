-- 2026-11-21 · E23x · Dados da página do executivo: contas do governo (SICONFI), indicadores do IBGE e IDH, atos do
-- presidente (legislação federal pelo Senado) e vetos (Congresso). Os jobs `contas`, `indicadores`, `atos` e `vetos` do
-- cron preenchem. Rodar no SQL Editor ANTES do próximo cron que publica. Menos de 5 mil linhas no total.

-- Um número por ente, ano e indicador, como o relatório fiscal traz (lib/siconfi.ts). Ente: "BR" (União) ou a UF.
create table contas_governo (
  ente            text not null,
  ano             integer not null,
  indicador       text not null,              -- saude, educacao, folha, divida, investimentos, primario
  percentual      numeric,                    -- % aplicado, de gasto com pessoal ou de dívida sobre a receita
  percentual_ref  numeric,                    -- mínimo (saúde e educação nos estados) ou limite (folha e dívida)
  reais           numeric,                    -- valor em reais (aplicado na União, pessoal, dívida, investimentos, primário)
  reais_ref       numeric,                    -- piso em reais da União (saúde e educação) ou meta de primário da LDO
  url             text not null,              -- consulta à API do SICONFI com o anexo
  primary key (ente, ano, indicador)
);

-- Indicadores do Brasil e das UFs (lib/ibge.ts) e IDH (Ipeadata, lib/ipea.ts). Período: "2025", "2026-T3" ou "2026-10".
create table indicadores (
  local      text not null,                   -- "BR" ou a UF
  indicador  text not null,                   -- desemprego, renda, informalidade, pobreza, inflacao, pib, idh
  periodo    text not null,
  valor      numeric not null,
  area       text,                            -- inflação: a área que o IPCA mede ("região metropolitana de São Paulo")
  primary key (local, indicador, periodo)
);

-- Leis, leis complementares, decretos e medidas provisórias desde 2023, com o grupo de rotina (lib/atos.ts).
create table atos_executivo (
  id      text primary key,                   -- "DEC-13167"
  codigo  text not null,                      -- código da norma no Senado
  tipo    text not null,                      -- LEI, LCP, DEC, MPV
  numero  integer not null,
  data    date not null,
  ementa  text,
  rotina  text,                               -- credito, acordo, desapropriacao, radiodifusao ou null
  url     text not null
);
create index atos_executivo_data on atos_executivo (data desc);

-- Vetos do presidente em exercício desde 2023, com a contagem dos dispositivos pela situação no Congresso.
create table vetos (
  id              text primary key,           -- código do veto no Congresso
  codigo_materia  text not null,              -- código da matéria VET
  numero          integer not null,
  ano             integer not null,
  ementa          text,
  total           boolean not null,
  publicacao      date not null,
  materia_vetada  text,                       -- "PL 2/2025"
  dispositivos    integer not null,
  mantidos        integer not null,
  derrubados      integer not null,           -- "Rejeitado" na fonte: o Congresso derrubou o veto
  prejudicados    integer not null,
  pendentes       integer not null,           -- "Não Apreciado"
  url             text not null
);

alter table contas_governo enable row level security;
alter table indicadores enable row level security;
alter table atos_executivo enable row level security;
alter table vetos enable row level security;
create policy leitura_publica on contas_governo for select to anon, authenticated using (true);
create policy leitura_publica on indicadores for select to anon, authenticated using (true);
create policy leitura_publica on atos_executivo for select to anon, authenticated using (true);
create policy leitura_publica on vetos for select to anon, authenticated using (true);
