# Diário de sessões

Uma entrada por sessão, a mais recente no topo. É o fio da meada: a próxima sessão lê
só a última entrada e o `PLANO.md`.

Modelo:

```
## AAAA-MM-DD · Ex
**Feito:** o que ficou pronto (arquivos, rotas, testes).
**Decidido:** escolhas que não estão óbvias no código e por quê.
**Lacunas:** o que a fonte não tinha (também vai para docs/LACUNAS.md).
**Próximo passo:** a primeira coisa a fazer na próxima sessão.
```

---

## 2026-11-01 · E7
**Feito:** `lib/quociente.ts` (QE, QP com exigência de 10%, sobras 80/20 e fase aberta, frase
"seu voto contou para") com 12 testes de borda e 5 em dado real (30 no total). `scripts/sonda/
quociente.ts` → `data/sonda/quociente.json`: as 70 vagas de deputado federal de SP batem com o
Relatório de Resultado da Totalização (QE 338.203, 20 listas, 70 eleitos um a um, ordem das
sobras). `lib/tse.ts` (JSON oficial de resultado por município e URL da foto).
`scripts/sonda/eleitos-mun.ts` → `data/sonda/eleitos-mun.json` (645 municípios, 2 cargos, código
IBGE): 1.290/1.290 listas iguais ao JSON oficial, incluindo São Paulo, Santos e Borá.
`_comparar-munzona.ts` para comparar gerações do CSV. `CLAUDE.md` (seção TSE), `SONDA.md`,
`LACUNAS.md`, `README.md`.
**Decidido:** federação como lista única; divisor da média com vagas obtidas por QP. Top-20
inclui quem empata com o 20º. Frase com N = 0: "que não elegeu ninguém em SP"; senador sem
frase. Foto de candidato pela URL pública do TSE (resolve a pendência da E1, sem hospedar nada).
Gabarito lido do PDF oficial com PDFKit do macOS, sem dependência nova.
**Lacunas:** empates na borda do top-20 (81 listas); 1 grafia TSE≠IBGE; o TSE regenera os CSVs
sem mudar conteúdo (cron compara conteúdo). Questão aberta: nome da federação no card (E10).
**Próximo passo:** E8 — reescrever `lib/types.ts` e gerar `data/*.json` no shape final
(`politicos`, `mandatos`, `eleitos_mun`, `despesas_mes`, `votacoes`, `votos`, `orientacoes`);
escolher 8–12 votações do quiz em `docs/QUIZ.md`; `scripts/sonda/validar.ts`.

## 2026-10-29 · E6
**Feito:** `lib/senado.ts` (lista atual, perfil, mandatos, licenças, `/votacao`, orientação de
bancada; normaliza o XML→JSON e as siglas do painel). `scripts/sonda/senadores.ts` gerou
`senadores.json` (3 de SP em exercício, join ao TSE), `votacoes-senado.json` (426 nominais
2023-02→hoje, 240 secretas), `orientacoes-senado.json` (2.043) e `votos-senado.json` (1.278; no
Senado a ausência é explícita e tem sigla). 15 chamadas, 0 falhas, 6 s. Tipo `secreto` em
`TipoVoto`; `participacao()` e `governismo()` rodaram sem mudança para senador (fixture real
do Marcos Pontes; 18 testes). `CLAUDE.md` (seção Senado reescrita), `SONDA.md`, `LACUNAS.md`, `README.md`.
**Decidido:** o path é `/votacao` (os do `CLAUDE.md` estavam deprecated). Secreta conta na
participação, não no governismo. Sigla de comparecimento → `ausente`; "Presidente (art. 51)" →
`art17`; NA → `nao_informado`. Join por nome completo + UF porque a API não expõe CPF. Vetos
(sessão conjunta do CN) ficam fora nas duas Casas. Foto com esquema trocado para https.
**Lacunas:** sem CPF; 56% das nominais secretas; 10 votações sem `sequencialVotacao` (sem
orientação); vetos; André do Prado e Derrite sem registro até 01/02/2027. Três questões novas de
metodologia no `SONDA.md` (secretas no denominador, P-NRV, licença).
**Próximo passo:** E7 — cadeiras por partido/federação em SP a partir do TSE 2026 (federação
como lista única), conferir contra o resultado oficial; top-20 por município e cargo →
`data/sonda/eleitos-mun.json`; `lib/quociente.ts` com testes.

## 2026-10-29 · E5
**Feito:** `listarDespesas()` em `lib/camara.ts`; `scripts/sonda/despesas.ts` busca a CEAP dos 70
deputados de SP (2025→hoje, 538 chamadas, 0 falhas) e grava `data/sonda/despesas.json` com os
meses da amostra (`total`, `porCategoria`, `documentos`) e `mediaUf` (SP, por mês). CSVs anuais
oficiais baixados em `data/raw/ceap/` só para comparação. `docs/SONDA.md`, `CLAUDE.md`, `LACUNAS.md`.
**Decidido:** média da bancada vem da API, não do CSV (o CSV omite passagens SIGEPA). Não deduplicar
`codDocumento` (linhas SIGEPA). Somar `valorLiquido` com estornos negativos. Média do mês conta só
quem tem lançamento. Mês a exibir: último fechado (regra provisória ≥90% da bancada; definitiva
no cron por estabilidade entre execuções).
**Lacunas:** últimos ~3 meses incompletos; `ano=` sozinho vazio na API (documentado).
**Próximo passo:** E6 — ler `legis.senado.leg.br/dadosabertos/docs/` e confirmar o path das
votações do plenário antes de codar; `lib/senado.ts`; join dos 5 senadores pelo hash de CPF.

## 2026-10-29 · E4
**Feito:** `scripts/sonda/votos.ts` chamou `/votos` das 6.537 votações (cache em `data/raw/apoio/votos-cache/`),
fixou a lista exata de **1.107 nominais** em `votacoes.json` (+`totalVotos`), completou `orientacoes.json`
(11.669) e gravou `votos.json` (8.476 votos dos 12 com `camaraId`). `lib/indicadores.ts` com
`participacao()`, `governismo()` e `concordancia()`; 13 testes vitest (8 de lógica + 5 em fixture
real do Kim Kataguiri). Tabela dos dois números dos reeleitos em `docs/SONDA.md`.
**Decidido:** 404 em `/votos` = sem votos (não é falha); `tipoVoto: null` → `nao_informado`
(conta na participação, não no governismo); art. 17 conta na participação. Governismo exclui
orientação vazia/"Liberado". Heurística do placar fica só como diagnóstico; a lista é por `/votos`.
**Lacunas:** 17 votações com placar mas sem votos na API; João Paulo Cunha sem mandato → "sem
mandato no período", não 0%. Duas questões de metodologia abertas no `SONDA.md` (licença como
ausência; denominador por mandato) para decidir antes do protótipo.
**Próximo passo:** E5 — `/deputados/{id}/despesas?ano&mes` dos 10 reeleitos (2025-01→hoje) e
média da bancada SP; medir custo em chamadas e decidir a janela.

## 2026-10-29 · E3
**Feito:** `lib/camara.ts` ganhou votações (lista por janelas de 90 dias, detalhe, orientações,
votos) e `lib/async.ts` (`mapLimite`). `scripts/sonda/votacoes.ts` gerou `data/sonda/votacoes.json`
(1.117 nominais de 2023→hoje, com proposição afetada e URL oficial) e `orientacoes.json` (11.594).
6.537 votações listadas; 2.611 chamadas em 7m40s, zero falhas. `docs/SONDA.md` e `CLAUDE.md`
atualizados (janela de 3 meses, 100 itens/página, valores de orientação).
**Decidido:** nominal = placar na descrição (validado: FP 0, FN 1 em 303); a E4 fecha a lista
exata chamando `/votos` de todas. Orientação "Governo" vazia ou "Liberado" não conta no
governismo. `aprovacao` null em 190 casos: resultado vai usar a descrição como fallback.
**Lacunas:** 18 nominais sem nenhuma orientação; 1 sem proposição afetada (votação de pessoa).
**Próximo passo:** E4 — `/votos` das 6.537 (≈15 min com 6 em voo), gravar só os votos dos 12 com
`camaraId` (10 reeleitos + Derrite + João Paulo Cunha), `lib/indicadores.ts` com
`participacao()` e `governismo()` + testes vitest em fixtures reais.

## 2026-10-29 · E2
**Feito:** `lib/camara.ts` (adapter: listar, perfil, órgãos, histórico; paginação por `links.next`).
`scripts/sonda/camara.ts` busca os 70 perfis de SP, casa por hash de CPF com a amostra e gera
`data/sonda/politicos-camara.json` (12 registros: 10 reeleitos, João Paulo Cunha com registro
antigo, Derrite). 40 dos 70 eleitos de 2026 por SP já estão em exercício; os 4 ambíguos da E1
eram reeleitos. `CLAUDE.md` corrigido (e-mail em `gabinete.email`, busca por nome por legislatura).
**Decidido:** para quem não está em exercício, varrer legislaturas 56→50 por nome e confirmar
pelo hash; nunca aceitar só o nome. Derrite entra no modelo com dois mandatos (Câmara até
01/2027, Senado depois). Retry de 1 s resolveu os 504 da Câmara; manter.
**Lacunas:** 4 novos sem registro na Câmara até 01/02/2027; João Paulo Cunha sem e-mail de
gabinete. Ver `docs/LACUNAS.md`.
**Próximo passo:** E3 — `/votacoes?idOrgao=180` por janela de datas (descobrir o intervalo máximo
que a API aceita), depois `/orientacoes` de cada uma; medir volume e tempo.

## 2026-10-29 · E1
**Feito:** `scripts/sonda/tse.ts` gera `data/sonda/politicos-tse.json` com os 20 da amostra
(10 reeleitos, 5 novos, 2 senadores eleitos, 3 em exercício), votos válidos de 2026, hash de CPF
e nome do arquivo de foto no zip do TSE. Apoio: `_listas-atuais.ts` (Câmara/Senado SP em
exercício → `data/raw/apoio/`) e `_inspecionar.ts` (consultas DuckDB ad hoc num CSV).
`docs/SONDA.md` registra formato, armadilhas e critério da amostra; `CLAUDE.md` corrigido
(TSE não tem foto no CSV, sentinelas, caixa do `DS_CARGO`, votos válidos).
**Decidido:** reeleito/novo por nome de urna exato só para escolher a amostra; o join real é
por CPF na E2 (4 ambíguos listados). Votos = `QT_VOTOS_NOMINAIS_VALIDOS`. Senadores em
exercício entram com o registro TSE da eleição deles (2018/2022). Não contornei o bloqueio
do DivulgaCand.
**Lacunas:** foto dos novos (TSE só dá arquivo em zip; decidir na E10 se o site hospeda os jpgs);
partido atual dos senadores em exercício vem do Senado na E6. Ver `docs/LACUNAS.md`.
**Próximo passo:** E2 — `lib/camara.ts`; `/deputados/{id}` dos 70 de SP para pegar CPF e
casar por hash com o JSON da E1; resolver os 4 ambíguos; marcar os 5 novos como "sem registro
na Câmara até 01/02/2027".

## 2026-10-29 · E0
**Feito:** `package.json` (só `tsx`, `typescript`, `@types/node`), `tsconfig.json`, `lib/types.ts`
(tipos internos do modelo de dados), `lib/http.ts` (fetch com timeout 30 s, retry com backoff
1/2/4 s em rede/429/5xx, log por endpoint), `LICENSE` AGPL-3.0, `README.md` com nota CC-BY.
`npm run ping` responde OK: Câmara (8 situações de deputado) e Senado (81 senadores em exercício).
**Decidido:** Senado responde JSON só com `Accept: application/json`, sem sufixo `.json`;
`fetchJson` já manda esse header por padrão. O shape de topo do Senado é
`ListaParlamentarEmExercicio.Parlamentares.Parlamentar[]`. TypeScript 7 removeu `baseUrl`;
o alias `@/*` fica só em `paths`. `HttpError` é lançado por endpoint; quem chama decide se
aborta o job (princípio do cron).
**Lacunas:** nenhuma.
**Próximo passo:** E1 — verificar se os CSVs de 2026 (`consulta_cand`, `votacao_candidato_munzona`)
já estão em `dadosabertos.tse.jus.br`; instalar `@duckdb/node-api`; baixar SP para `data/raw/`.

## 2026-10-29 · planejamento
**Feito:** repositório criado em `~/Projetos/fiscaliza` com `CLAUDE.md` (spec), `PLANO.md`
(21 etapas em 3 passos + backlog), `DIARIO.md`, `.gitignore`. Nada commitado ainda.
**Decidido:** Next.js só entra na E9; a sonda (E0–E8) roda com `tsx` puro para ver o dado
real antes de desenhar. DuckDB via pacote npm (CLI não instalado). Supabase só na E17.
**Lacunas:** nenhuma ainda.
**Próximo passo:** E0 — `package.json`, `lib/http.ts`, `lib/types.ts`, `scripts/ping.ts`.
