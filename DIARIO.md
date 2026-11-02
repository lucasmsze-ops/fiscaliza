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

## 2026-11-01 · E13
**Feito:** quiz ampliado de 10 para 14 perguntas (decisão do usuário, depois de medir que
senadores tinham só 4 votos comparáveis): PEC 8/2021, PLP 233/2023, PEC 9/2023 e PLP 177/2023.
`scripts/sonda/quiz-fontes.ts` (ementa, palavras-chave, situação e norma gerada, Câmara e Senado) →
textos em `data/sonda/quiz-textos.json` (o que faz e o que aconteceu depois, só com as fontes) +
parágrafo da votação gerado dos dados. `lib/quiz.ts` (respostas validadas, concordância, mínimo de
3, votação discordante; 4 testes). Card: votos do quiz em `CardDados.quiz`, terceiro número e
Cobrar no navegador (`components/QuizNoCard.tsx`, `useRespostas`). `/votacoes` com as 14 perguntas,
fontes oficiais e contador. 58 testes. Conferido a 375 px: o card e o e-mail mudam com as respostas.
**Decidido:** 14 perguntas (13 Câmara, 10 Senado); percentual só com ≥ 3 votos comparáveis e sempre
"N de M"; ausência na Câmara só dentro do mandato; e-mail cita a primeira discordância na ordem do
quiz. Frases do meu rascunho que não estavam nas fontes foram cortadas (ex.: "substitui o teto de
gastos").
**Lacunas:** ementas pouco descritivas; registros conflitantes do PL 2162/2023 (`LACUNAS.md`).
Bugs achados no teste: respostas rápidas se sobrescreviam (corrigido com atualização funcional);
dois testes meus partiam de suposição em vez do dado (corrigidos para comparar com o dado gravado).
**Próximo passo:** E14 — `/p/[slug]` (card, histórico 2023–26, CEAP, contatos, cobrar) e
`/como-funciona` renderizando `docs/METODOLOGIA.md`.

## 2026-11-01 · E12
**Feito:** `/c/[ids]` completa: frase "seu voto contou para" nos deputados (`CardDados.lista`,
nome oficial no "?"), botão Compartilhar (menu nativo; sem ele, copia o link), `generateMetadata`
com título e descrição contendo os números, `opengraph-image.tsx` (1200×630, 130–170 KB, layout
para 1, 2 ou 3 políticos, rodapé com a fonte). `resumoNumeros()` em `lib/card.ts` (mesmo texto na
descrição e na imagem). `metadataBase` pela URL de produção da Vercel. 54 testes.
**Decidido:** a linha de números sempre diz a Casa e o período ("Câmara 2023–2026: …"), porque o
Derrite é senador eleito com números da Câmara. Sem negrito na imagem (fonte padrão do `next/og` só
tem regular; fonte externa na hora seria chamada externa).
O usuário colou uma colinha no WhatsApp e o preview apareceu (critério de pronto). O exemplo dele
(Marina Silva, 4,9%) mostrou que a imagem e a descrição omitiam os dias afastado que o card mostra:
corrigido (`resumoNumeros` com "afastada 1.154 dias"; versão curta na imagem para caber numa linha).
**Lacunas:** fotos do Senado pesadas: colinha com os 3 senadores em exercício leva ~2 s até a 1ª
foto no 4G lento (típica: ~1 s). Registrado com alternativas em `LACUNAS.md`. O WhatsApp guarda o
preview de links já enviados: a correção só aparece em links novos.
**Próximo passo:** E13 — `/votacoes` com as 10 perguntas do quiz (pergunta e explicação em 3
parágrafos a partir do texto oficial), respostas no localStorage, concordância no card e votação
discordante no corpo do Cobrar.

## 2026-11-01 · E11
**Feito:** `/` com uma caixa de busca (cidade ou nome, sem acento) → top-20 da cidade com o card
compacto (mesmo `PoliticoCard`, variante `PoliticoCardCompacto`), posição e votos na cidade →
marcar 1 deputado e até 2 senadores → barra "Ver colinha". `lib/colinha.ts` (regras, URL com `+`,
leitura segura do localStorage; 5 testes). JSONs estáticos `/dados/politicos` (20 KB gzip) e
`/dados/cidade/[ibge]` (645 arquivos de ~0,6 KB gzip). `/c/[ids]` mínima com os cards completos e
ISR sob demanda. 52 testes. Conferido a 375 px: Campinas → Erika Hilton → Derrite e André do Prado →
colinha em 22 s (com latência da automação); colinha e cidade voltam ao reabrir; busca por nome
troca o deputado; sem erro no console. **O usuário testou no próprio celular, em produção:
colinha montada em menos de 1 minuto** (critério de pronto).
**Decidido:** cidade carregada no navegador a partir de JSON estático (nada de servidor por
requisição). Colinha segue a urna de 2026 (1 + 2); o terceiro senador substitui o mais antigo.
Índice de busca com rótulos prontos (`itemBusca`).
**Lacunas:** nenhuma nova. Bug achado e corrigido no teste: a lista da cidade era recriada a cada
toque (componente definido dentro de outro).
**Próximo passo:** E12 — em `/c/[ids]`: frase "seu voto contou para" por deputado, botão
compartilhar (Web Share API, fallback copiar link) e imagem OG com `next/og`; medir o peso das
fotos do Senado na meta de < 1 s.

## 2026-11-01 · E10
**Feito:** `lib/card.ts` (`montarCard`: rótulos de cargo e status flexionados, três números com
denominador por mandato, "afastado N dias", CEAP do mês de referência vs média SP com link oficial,
`mailto:` do Cobrar). `components/PoliticoCard.tsx` (só exibe; `<img>` direto da fonte),
`components/Termo.tsx` + `lib/glossario.ts` (popover nativo, 13 termos). Coluna `genero` em
`politicos` (TSE `DS_GENERO`, Senado `SexoParlamentar`). `/amostra` com os 20 cards (noindex).
`tests/card.test.ts`: os 20 sem campo vazio/NaN/undefined, 14 com mandato e 6 com "primeiro voto",
valores iguais ao SONDA. 47 testes. Conferido no navegador a 375 px, claro e escuro: sem rolagem
lateral, 20 fotos ok, popover abre e fecha (toque fora, Esc, "Fechar").
**Decidido:** popover nativo em vez do shadcn/ui (sem dependência; usuário sem preferência).
Gênero oficial para flexionar ("Deputada", "Reeleita", "afastada"); sem gênero, cai para o nome
da Casa. Nome de urna exibido como o TSE escreve (maiúsculas). Senador sem bloco de cota.
**Lacunas:** CEAPS do Senado não coletada; fotos do Senado pesadas (107–307 KB).
**Próximo passo:** E11 — página `/`: busca por cidade (autocomplete dos 645 municípios) ou por
nome, mostrando o top-20 com `PoliticoCard` compacto e seleção para a colinha.

## 2026-11-01 · E9
**Feito:** next 16.4.3 + react 19.3.1 + tailwindcss 4.3.3 no projeto existente (versões fixas,
0 vulnerabilidades). `lib/repo.ts` (interface `Repo` + `JsonRepo` com `deLinha`, cache por
tabela). `app/` com layout pt-BR e página `/` lendo dado real. `next.config.ts`:
`Referrer-Policy: same-origin` e `data/*.json` no pacote do servidor (sem `data/raw` e
`data/sonda`). `next build` ok com TypeScript 7. Repositório privado
`github.com/lucasmsze-ops/fiscaliza`; o usuário importou na Vercel. **Produção:
https://fiscaliza-rho.vercel.app** — 200, servida de gru1, header presente, mostra Lucas
Pavanato (785.870 votos na capital), 404 em rota inexistente.
**Decidido:** shadcn/ui só na E10 (Tooltip); repositório privado até limpar os hashes de CPF do
histórico de `data/sonda/` (abrir o código é decisão do lançamento). Sem `create-next-app`.
Preview local na porta 3107 (entrada `fiscaliza` no `~/.claude/launch.json`).
**Lacunas:** nenhuma.
**Próximo passo:** E10 — confirmar o shadcn/ui só com o Tooltip; `components/PoliticoCard.tsx`
com foto, nome de urna, partido-UF, status, os três números (participação + "afastado N dias",
governismo, concordância oculta), CEAP do mês de referência vs média SP e botão Cobrar; renderizar
os 20 da amostra sem campo vazio ou inventado.

## 2026-11-01 · Decisões de metodologia (pré-E9)
**Feito:** as 6 questões abertas da E8 decididas com o usuário e aplicadas no código e nos dados:
`diasAfastado()` em `lib/indicadores.ts`, `nomeCurtoLista()` e frase com nome curto em
`lib/quociente.ts`, `lib/ceap.ts#mesesFechados` e coluna `despesas_media_uf.fechado`
(coleta anterior guardada em `data/sonda/despesas-coleta-anterior.json`). `docs/METODOLOGIA.md`
como texto-fonte de `/como-funciona`. 38 testes; `validar.ts` ok.
**Decidido:** licença não descontada + "afastado N dias"; secretas do Senado no denominador;
P-NRV é ausência; CEAP no último mês fechado (hoje jul/2026); federação como "Federação" +
composição do TSE, nome oficial no tooltip; quiz de 10 aprovado (6 nas duas Casas, 4 só Câmara).
**Lacunas:** nenhuma nova. Corrigido no `SONDA.md`: só ago–out/2026 mudaram entre as coletas
(não jun–out), por isso o mês de referência é jul/2026 e não mai/2026.
**Próximo passo:** E9 — confirmar a instalação do Next.js e do shadcn/ui; `create-next-app`,
`lib/repo.ts` (`JsonRepo` com `deLinha`) e deploy inicial na Vercel.

## 2026-11-01 · E8
**Feito:** `lib/types.ts` reescrito (12 tabelas, `Linha<T>` snake_case) e `lib/linhas.ts`.
`participacao()` aceita mandatos ("sem mandato no período", nunca 0%); indicadores casam por
`Votacao.id`. `scripts/sonda/bancada.ts` (70 deputados de SP, join por CPF em memória, 69 ok);
`votos.ts` e `despesas.ts` cobrem a bancada inteira e gravam placar exato; `senadores.ts` grava
placar das abertas. `scripts/sonda/consolidar.ts` → `data/*.json` (438 políticos, 1.533 votações,
49.949 votos, 20.365 linhas de top-20, 9,6 MB). `scripts/sonda/validar.ts` passa (e pega 3 defeitos
plantados). `docs/QUIZ.md` com critério e 10 votações propostas. 33 testes.
**Decidido:** nenhum CPF nem hash gravado (join só no cron). Um registro por pessoa, id = slug.
Participação restrita ao mandato; licença não descontada. Quiz: mérito, aberta, minoria ≥ 20%,
duas Casas quando o texto é o mesmo (PL 5582/2025 ficou só Câmara). Ampliação: dados completos
para toda a bancada de SP em exercício que aparece nos top-20.
**Lacunas:** 1 perfil da Câmara com 504 persistente (não afeta o site); 373 políticos só com dado
do TSE; 187 votações sem resultado explícito.
**Próximo passo:** E9 — primeiro o usuário decide as 6 questões abertas do fim da E8 em
`docs/SONDA.md`; depois `create-next-app`, `lib/repo.ts` (`JsonRepo` lendo `data/*.json` com
`deLinha`) e deploy inicial na Vercel.

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
