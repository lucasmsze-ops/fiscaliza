# Cron do Fiscaliza

Como os dados oficiais chegam ao Supabase todo dia, sem custo e sem regravar o que não mudou.
Código em `scripts/cron/`; rodar com `npm run cron` (lê `SUPABASE_URL` e `SUPABASE_SECRET_KEY`
de `.env.local`). No GitHub Actions a partir da E22.

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
| cota | E21d | Câmara `/despesas`, Senado CEAPS | dias 1 a 5 do mês |
| proposições | E21e | arquivos anuais da Câmara, autorias do Senado | diária |

Respostas brutas ficam em `estado/fontes/` (ex.: `camara-votos/{id}.json`): votação passada não
muda, então nunca é baixada de novo. Resposta vazia não é guardada (os votos podem chegar depois).

## Medido (E21a, 2026-11-02, máquina local)

| Execução | Tempo | Resultado |
|---|---|---|
| Estado limpo, nada novo nas fontes | 8 s | 3 + 3 votações da janela remontadas, idênticas às existentes; 0 enviadas |
| 19 votações retiradas do estado | 40 s | 340 votações listadas na Câmara, 17 + 13 nominais na janela; 19 votações, 559 votos e 197 orientações publicados; contagens do Supabase iguais às do estado |
| Segunda execução seguida | 5 s | 0 linhas e 0 resumos enviados |

## Cuidados

- Rodar o cron localmente e no Actions ao mesmo tempo deixa os dois "publicados" diferentes do banco.
  Os dois partem das mesmas fontes, então convergem, mas um pode reenviar linhas iguais. Rodar
  local só para testar.
- Quando a tabela `politicos` crescer (E21c), os votos dos novos políticos nas votações antigas vêm
  dos arquivos anuais da Câmara e do `/votacao` do Senado, não da janela do job diário.
