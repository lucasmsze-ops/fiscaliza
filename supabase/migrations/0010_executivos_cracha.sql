-- 2026-11-14 · Crachá do executivo (presidente e governadores eleitos em 2026), tudo do TSE: vice,
-- coligação, ocupação e grau de instrução declarados, idade na posse (a data de nascimento não é
-- gravada), votos e % de válidos por turno (JSON de divulgação), total dos bens declarados (sem os
-- bens) e as candidaturas anteriores. O job `executivos` preenche. Rodar depois da 0009.

alter table executivos
  add column vice_nome_urna text,
  add column vice_partido   text,
  add column coligacao      text,
  add column composicao     text,
  add column ocupacao       text,
  add column instrucao      text,
  add column idade_na_posse integer,
  add column votos          jsonb,      -- {t1: {votos, pct} | null, t2: {votos, pct} | null}
  add column bens_total     numeric,
  add column bens_n         integer,
  add column historico      jsonb;      -- [{ano, cargo, lugar, partido, resultado, situacao}]
