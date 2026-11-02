-- E21d · Cota parlamentar do Brasil inteiro, Câmara (CEAP) e Senado (CEAPS).
-- `casa` separa as duas cotas; `uf` em despesas_mes é a UF da bancada na Casa, que pode não ser a da
-- candidatura de 2026 (3 deputados disputaram 2026 por outro estado) e define a média comparada.
-- `deputados` vira `parlamentares` (a média do Senado conta senadores).
-- As linhas existentes são todas da Câmara, bancada de SP (sonda). Rodar uma vez no SQL Editor,
-- depois da 0002.

begin;

alter table despesas_mes add column casa text not null default 'camara' check (casa in ('camara', 'senado'));
alter table despesas_mes add column uf text not null default 'SP';
alter table despesas_mes alter column casa drop default;
alter table despesas_mes alter column uf drop default;
alter table despesas_mes drop constraint despesas_mes_pkey;
alter table despesas_mes add primary key (politico_id, casa, ano, mes);

alter table despesas_media_uf add column casa text not null default 'camara' check (casa in ('camara', 'senado'));
alter table despesas_media_uf alter column casa drop default;
alter table despesas_media_uf rename column deputados to parlamentares;
alter table despesas_media_uf drop constraint despesas_media_uf_pkey;
alter table despesas_media_uf add primary key (casa, uf, ano, mes);

commit;
