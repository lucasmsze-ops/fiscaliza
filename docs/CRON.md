# Cron do Fiscaliza

Como os dados oficiais chegam ao Supabase todo dia, sem custo e sem regravar o que não mudou.
Código em `scripts/cron/`; rodar com `npm run cron` (lê `SUPABASE_URL` e `SUPABASE_SECRET_KEY`
de `.env.local`). Desde a E22, roda todo dia no GitHub Actions (`.github/workflows/cron.yml`,
06:17 de Brasília, ou à mão em Actions → Cron → Run workflow); na máquina local, só
`npm run cron -- --sem-publicar` (ver Cuidados).

## No GitHub Actions (E22)

- **Estado:** `estado/` vai para o cache do Actions ao fim de toda execução (chave `estado-{run_id}`)
  e a seguinte restaura a mais recente. Comprimido, ~30 MB. Cache não usado por 7 dias é apagado
  pelo GitHub: com execução diária, não acontece.
- **Sem cache** (primeira execução, ou se o cache se perder): o estado vem do asset `estado.tar.gz`
  da release `estado-inicial`, empacotado na máquina local (`tar --exclude='*.parcial'
  --exclude='*.csv' -czf estado.tar.gz estado`). Se nem isso houver, o workflow para antes do cron:
  recomeçar de `data/*.json` reenviaria o Brasil inteiro. Para refazer a release: empacotar o
  estado local atualizado e substituir o asset (`gh release upload estado-inicial estado.tar.gz
  --clobber`); o diff contra o publicado garante que nada igual é reenviado.
- **CPF:** o join do job `parlamentares` lê os CSVs `consulta_cand` 2026, 2022 e 2018 do TSE, que
  têm CPF. O workflow os baixa a cada execução (3 zips, ~12 MB) para a pasta temporária do runner
  (`FISCALIZA_TSE`) e os apaga no fim; nunca vão para o cache nem para a release. O repositório é
  público: um PR de fork pode ler caches do branch principal. Pelo mesmo motivo, os CSVs anuais de
  proposições da Câmara (um deles com CPF num texto oficial) são apagados logo depois de virar
  extrato.
- **Segredos:** `SUPABASE_URL` e `SUPABASE_SECRET_KEY` em Settings → Secrets and variables →
  Actions. O workflow só roda por agendamento ou à mão, nunca em pull request.
- **`atualizacoes`:** a cada execução, cada fonte coletada com sucesso (`camara_votacoes`,
  `senado_cota`...) ganha a data e hora da coleta. É a base da página `/atualizacoes` e a escrita
  diária que mantém o Supabase free acordado.

## Ordem de uma execução

1. **Estado.** Restaura `estado/` (fora do git; no Actions, do cache do Actions). Sem estado,
   começa de `data/*.json`, que é o que o seed carregou no Supabase.
2. **Coleta.** Cada job busca nas fontes oficiais só a janela que pode ter mudado e mescla as
   linhas em `estado/dados/` pela chave primária. Jobs são isolados: um falhando não impede os
   outros. Nunca apagam linha (uma votação que some da fonte por falha momentânea não some do site).
3. **Validação.** `scripts/sonda/validar.ts` em `estado/dados/`. Se falhar, nada é publicado.
4. **Publicação.** Compara `estado/dados/` com `estado/publicado/` (cópia do que já está no
   Supabase), linha a linha pelo conteúdo, e envia só as novas ou alteradas, na ordem das chaves
   estrangeiras. Só depois de todas as tabelas darem certo o publicado é atualizado.
5. **Resumos.** Calcula card e página de cada político com o mesmo código do site (`JsonRepo` sobre
   `estado/dados/`) e grava em `resumos` só onde o hash mudou.
6. Sai com código 1 se algum job falhou, para o Actions avisar.

## Por que assim

- **Espaço (500 MB):** regravar uma linha igual ocupa espaço no Postgres até o autovacuum
  reaproveitar (medido na E19: carga dupla levou o banco de 14 para 26 MB). Por isso só vai o que
  mudou.
- **Egress (5 GB/mês):** o cron não lê o banco para saber o que mudou; compara com o publicado
  local. A única leitura é a lista de hashes dos resumos (~35 KB hoje).
- **Uma regra de montagem:** as linhas de votação, voto e orientação saem de
  `lib/linhas-votacao.ts`, a mesma usada pela consolidação da sonda. Se divergissem, o diff acharia
  mudanças falsas.
- **Fonte da verdade são as APIs oficiais.** O estado é só cache: se o cache do Actions se perder,
  a próxima execução reconstrói a partir de `data/*.json` e das fontes, e no máximo reenvia linhas
  iguais.

## Jobs

| Job | Etapa | Fonte | Janela |
|---|---|---|---|
| `votacoes` | E21a | Câmara `/votacoes` (plenário), `/votos`, `/orientacoes`; Senado `/votacao`, orientação de bancada | da última data conhecida − 14 dias até hoje (a Câmara publica votos e detalhes com atraso) |
| TSE nacional | E21b | arquivos do TSE | uma vez por eleição |
| parlamentares | E21c | Câmara, Senado, TSE | diária |
| cota | E21d | Câmara `/despesas` (todos da legislatura 57), Senado CEAPS (arquivo anual) | uma coleta por mês civil (`estado/fontes/cota/coletas.json`); anos com mês nos últimos 6 meses são baixados de novo, os outros vêm do cache |
| proposições | E21e | arquivos anuais da Câmara (`proposicoes`, `proposicoesAutores`, 2023→), Senado `/processo` por autor e `/processo/{id}` | diária: ano corrente baixado de novo todo dia, anos anteriores uma vez por semana (situação de proposição antiga muda); autoria do Senado em cache para sempre |

Respostas brutas ficam em `estado/fontes/` (ex.: `camara-votos/{id}.json`): votação passada não
muda, então nunca é baixada de novo. Resposta vazia não é guardada (os votos podem chegar depois).

## Medido (E21a, 2026-11-02, máquina local)

| Execução | Tempo | Resultado |
|---|---|---|
| Estado limpo, nada novo nas fontes | 8 s | 3 + 3 votações da janela remontadas, idênticas às existentes; 0 enviadas |
| 19 votações retiradas do estado | 40 s | 340 votações listadas na Câmara, 17 + 13 nominais na janela; 19 votações, 559 votos e 197 orientações publicados; contagens do Supabase iguais às do estado |
| Segunda execução seguida | 5 s | 0 linhas e 0 resumos enviados |

## Cuidados

- **Ordem quando a tabela muda de forma:** migração → push → publicação → novo deploy. O build
  gera as páginas de quem tem mandato (659) a partir dos resumos do momento: na E21d o push veio
  antes da publicação e as páginas geradas no build ficaram sem a cota até o deploy seguinte (o
  ISR as renovaria em até 24 h). A colinha e as páginas geradas na primeira visita já saem certas.

- **Desde a E22, não publicar da máquina local.** O publicado local deixa de acompanhar o banco
  assim que o Actions publica; um `npm run cron` local reenviaria linhas (iguais ou não) e, pior,
  avançaria o publicado local sem o do Actions. Na máquina local, só `--sem-publicar`.
- Quando a tabela `politicos` crescer (E21c), os votos dos novos políticos nas votações antigas vêm
  dos arquivos anuais da Câmara e do `/votacao` do Senado, não da janela do job diário.
