-- 2026-11-20 · E23r · Matérias da Agência Câmara e da Agência Senado que citam políticos do site (RSS público,
-- coletado pelo cron uma vez por dia). Só título, link, data, agência e os ids dos políticos citados como
-- "Nome (PARTIDO-UF)"; o texto da matéria não é guardado. O job `noticias` preenche. Rodar depois da 0011.

create table noticias (
  id        text primary key,                               -- o link da matéria
  fonte     text not null check (fonte in ('camara', 'senado')),
  titulo    text not null,
  url       text not null,
  data      timestamptz not null,
  politicos text[] not null                                 -- ids de politicos citados
);

-- O site busca as matérias de um político: índice no array.
create index noticias_politicos on noticias using gin (politicos);
create index noticias_data on noticias (data desc);

alter table noticias enable row level security;
create policy leitura_publica on noticias for select to anon, authenticated using (true);
grant select on noticias to anon, authenticated;
grant select, insert, update, delete on noticias to service_role;
