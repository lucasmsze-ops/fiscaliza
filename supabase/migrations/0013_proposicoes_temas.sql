-- 2026-11-20 · E23s · Temas oficiais das proposições, para as "Áreas de atuação" do crachá (protótipo Liquid Glass).
-- Câmara: arquivo anual `proposicoesTemas`; Senado: `classificacoes` de /processo/{id}. O job `proposicoes`
-- preenche. Rodar no SQL Editor ANTES do próximo cron que publica (sem a coluna, o upsert das proposições falha).

alter table proposicoes add column temas text[];
