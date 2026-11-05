-- E23d · UF da cadeira em cada mandato. `politicos.uf` é a da candidatura de 2026, que pode ser outra
-- (deputada por SP candidata no PR em 2026): a lista "quem me representa" e o filtro por estado
-- precisam da UF pela qual a pessoa ocupa a cadeira. O cron preenche (histórico da Câmara, mandatos
-- do Senado). Rodar uma vez no SQL Editor, depois da 0006.

alter table mandatos add column uf text check (uf ~ '^[A-Z]{2}$');
