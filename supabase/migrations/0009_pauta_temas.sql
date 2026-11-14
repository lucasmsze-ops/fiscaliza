-- 2026-11-13 · Pauta do Plenário (Câmara: /eventos e /eventos/{id}/pauta; Senado: /plenario/agenda/mes),
-- para "Próximas votações" em /votacoes. O cron (job `pauta`) coleta uma vez por dia, de hoje em diante;
-- `coletado_em` é o dia da coleta: o site mostra só a mais recente, porque o cron nunca apaga (item que
-- saiu da pauta fica com a coleta antiga). E os temas oficiais (classificação da Câmara e do Senado) nas
-- votações e na pauta, do passo `temas` do cron. Rodar uma vez no SQL Editor, depois da 0008.

alter table votacoes add column temas text[];

create table pauta (
  id                 text primary key,               -- casa:sessão:...
  casa               text not null check (casa in ('camara', 'senado')),
  data               date not null,
  hora               text,
  sessao             text not null,
  ordem              integer not null,
  materia            text not null,                  -- "PL 479/2025"
  tipo               text not null,
  ementa             text,
  relacionada        text,
  ementa_relacionada text,
  apreciacao         text,
  url_oficial        text not null,
  coletado_em        date not null,
  temas              text[]
);
create index pauta_data on pauta (data);

alter table pauta enable row level security;
create policy leitura_publica on pauta for select to anon, authenticated using (true);
grant select on pauta to anon, authenticated;
grant select, insert, update, delete on pauta to service_role;
