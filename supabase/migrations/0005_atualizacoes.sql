-- E22 · Quando cada fonte foi coletada com sucesso pela última vez (base da página /atualizacoes).
-- Uma linha por fonte (`{casa}_{job}`: camara_votacoes, senado_cota...), regravada pelo cron do
-- GitHub Actions a cada execução bem-sucedida: é também a escrita diária que mantém o Supabase
-- free ativo. Rodar uma vez no SQL Editor, depois da 0004.

begin;

create table atualizacoes (
  fonte       text primary key,
  coletado_em timestamptz not null
);

alter table atualizacoes enable row level security;
create policy leitura_publica on atualizacoes for select to anon, authenticated using (true);
grant select on atualizacoes to anon, authenticated;
grant select, insert, update, delete on atualizacoes to service_role;

commit;
