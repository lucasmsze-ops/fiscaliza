# Fiscaliza — CLAUDE.md

Plataforma cívica, sem fins lucrativos, feita por duas pessoas. Mostra, com dado oficial, quem
representa o eleitor e o que cada um fez no mandato: em quem eu votei? → quem me representa? →
o que estão fazendo? → como cobro? → com quem compartilho?

**Escopo (decisão de 2026-11-01):** todos os eleitos em exercício e os eleitos de 2026, do vereador
ao presidente, com praticamente as mesmas funcionalidades do politicometro.org (inventário em
`docs/REFERENCIA-POLITICOMETRO.md`), menos o que está em "Fora de escopo". A expansão é por fases:
primeiro Congresso (deputados federais e senadores) no Brasil inteiro, depois os demais cargos.
Desde a E21c (2026-11-02), o Congresso no Brasil inteiro: 3.724 políticos (candidatos de 2026 no top-20
de alguma cidade, todos os eleitos e os 594 parlamentares em exercício) e as 5.571 cidades. `data/*.json`
continua sendo o recorte de SP da sonda (testes e modo JSON); o estado do cron está em `estado/`.

## Princípios inegociáveis

1. **Custo zero.** Vercel Hobby, Supabase free, GitHub Actions. Nenhuma assinatura, nenhum serviço pago. Se uma solução exige plano pago, ela está errada. Cada fase de expansão mede o volume contra os limites free antes de coletar.
2. **Nenhuma requisição de usuário chama LLM ou API externa.** Toda página lê do Supabase (ou de JSON estático na fase de protótipo). APIs oficiais são tocadas apenas pelo cron.
3. **Sem conta, sem e-mail, sem dado pessoal.** Quem a pessoa monitora fica só no navegador (localStorage), sem Entrar (decisão de 2026-11-04; a colinha saiu da interface). Não existe tabela de usuários nem login. Analytics só cookieless. Avisos são só *fake door* (ver abaixo): nenhum campo de contato.
4. **Dado oficial, zero adjetivo.** O site mostra número e fonte; nunca qualifica um político nem um partido (sem nota, ranking, "melhores e piores" ou régua ideológica). Toda métrica tem link para a metodologia em `/como-funciona` e para a página oficial de origem.
5. **Nenhum dado inventado, nem em protótipo.** Se o campo não veio da fonte, não entra na interface. Placeholders são proibidos. Dado não publicado aparece como "—" com o porquê, nunca zero.
6. **Completo, mas legível.** Cada página abre com um resumo de poucos números com fonte; o detalhe vem abaixo, em seções que a pessoa abre. Antes de adicionar algo, perguntar: a pessoa entende em 10 segundos o que é?

**Fake door de avisos:** botão "Receber avisos" nos lugares onde um aviso faria sentido (página do
político, votação, cidade). Ao tocar, explica que ainda não existe e conta o toque de
forma anônima (cookieless, só página e tipo). Nunca pede e-mail, telefone ou qualquer contato.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui. Instalados (versões fixas): next 16.4.3, react 19.3.1, tailwindcss 4.3.3; `next build` funciona com o TypeScript 7 do projeto. shadcn/ui entra na E10, só o Tooltip. Páginas leem dados só por `lib/repo.ts` (`repo`).
- Supabase Postgres, pela API REST com `fetch` (`lib/supabase.ts`, sem `supabase-js`). Origem dos dados por `FISCALIZA_DADOS=supabase` (`lib/repo-supabase.ts`); sem a variável, `data/*.json`. Card e página vêm pré-calculados da tabela `resumos` (`npm run precalcular`), nunca de todas as votações por página (egress). Migrações em `supabase/migrations/`, rodadas à mão no SQL Editor; `npm run seed` e `npm run supabase:conferir`. PostgREST devolve no máximo 1.000 linhas por pedido: `selecionar()` pagina e exige `order=`. `jsonb` não preserva a ordem das chaves: nunca exibir na ordem de `Object.entries` de um objeto vindo do banco.
- Cron: GitHub Actions (`.github/workflows/cron.yml`, diário), scripts em `scripts/` (Node/TypeScript). DuckDB para processar CSVs do TSE e os arquivos anuais da Câmara.
- Deploy: Vercel via push na `main`. Páginas de político com ISR (`revalidate` 24h). Funções em São Paulo (`vercel.json`, `regions: ["gru1"]`; o Hobby permite uma região), junto do Supabase: com o padrão (`iad1`, Washington) cada consulta ao banco cruzava o continente e a colinha nova levava ~1 s.
- Fotos: servidas direto das URLs oficiais (Câmara/Senado/TSE). Nunca proxiar pela Vercel. Exceção: `next/og` busca fotos na hora de gerar a imagem de compartilhamento.
- Licença: AGPL-3.0 (código), CC-BY 4.0 (dados derivados).

## Fases

**Passo 1 — Sonda (feito).** JSON estático com dado real de SP para ver o dado antes de desenhar.

**Passo 2 — Protótipo (feito).** Site lendo `data/*.json` (SP). O teste com 5 pessoas (E16) fica
suspenso até o redesenho.

**Passo 3 — Redirecionamento e infra.** Tirar quiz, Cobrar e "seu voto contou para"; Supabase; cron.

**Passo 4 — Congresso completo, Brasil inteiro.** 513 deputados e 81 senadores com a página
completa (inventário, seção 1) e as votações do Plenário (seção 2).

**Passo 5 — Todos os eleitos.** Governadores, deputados estaduais, prefeitos, vereadores e
presidente pelo TSE; mapa, estado, cidade e "quem me representa"; eleições.

**Passo 6 — Legislativos estaduais e municipais.** Só onde há dado aberto por API (ex.: SAPL).

**Passo 7 — Contexto.** Governos e indicadores, partidos (sem régua), cargos, dicionário,
comparar, mais vistos, impostômetro, STF (só se houver fonte aberta).

## Fora de escopo (não implementar, não sugerir)

Presença literal em sessões · discursos · conta, login, "monitorar" com cadastro · e-mail, WhatsApp, newsletter ou qualquer aviso real (só a fake door) · tabela de usuários ou assinantes · régua ideológica (esquerda/direita) de partidos ou pessoas · nota, ranking ou "melhores e piores" · recomendação de voto · votações de comissões · feed por janela fixa de dias · qualquer scraping de HTML (fonte sem dado aberto fica de fora, com o porquê) · resumo de ementa por LLM em tempo de requisição · geolocalização (exige serviço externo) · quiz de concordância · botão Cobrar com e-mail pronto · "seu voto contou para" (removidos em 2026-11-01).

## Rotas

Hoje (protótipo, SP):
```
/                   Visão geral (E23c): mapa por estado, quem está no cargo hoje, lista A–Z
/congresso          quem ocupa cada cadeira hoje (Câmara e Senado) e a Câmara de fev/2027 (E23b)
/votacoes           agenda do Plenário e votações da última sessão (saíram de /congresso na E23l)
/c/[ids]            links antigos da colinha: redireciona para o crachá (a colinha saiu em 2026-11-04)
/p/[slug]           página do político (ISR) (slug = nome de urna + UF, ex.: kiko-celeguim-sp)
/me-representa      cidade ou estado → senadores e deputados federais em exercício da UF (E23d; `?uf=SP`, `?cidade=<IBGE>`)
/votacoes/[id]      uma votação do Plenário (E23k): placar, regra, ementa, caminho, como votou cada partido (id = casa-idExterno)
/como-funciona      metodologia, fontes, licença, código
```
Planejadas (detalhar no PLANO ao chegar): lista completa com filtros em `/votacoes` (E30),
`/uf/[uf]`, `/cidade/[ibge]` ("quem me representa"), `/comparar`, `/eleicoes`, `/governos`,
`/partidos`, `/cargos`, `/dicionario`, `/mais-vistos`, `/atualizacoes`.

A colinha tinha `opengraph-image.tsx` (preview com foto, cargo, status e números; saiu com a colinha na E23c); o card de compartilhamento do crachá entra na E33, com Casa e período sempre explícitos, porque um senador eleito pode ter números da Câmara. `metadataBase` vem de `VERCEL_PROJECT_PRODUCTION_URL` (ou `NEXT_PUBLIC_SITE_URL`). A fonte padrão do `next/og` só tem peso regular; buscar fonte externa na hora não é permitido.

Apoio (não são páginas): `/dados/municipios` (as 5.571 cidades, baixada quando a pessoa toca na busca), `/dados/politicos` (índice de busca por nome, mais votados primeiro, com nome de urna, nome civil e número de urna; ~190 KB comprimido) servidos pela CDN (`/dados/cidade/[ibge]`, o top-20 da cidade, saiu com a colinha). No build, só as páginas de quem tem mandato (659); as demais, na primeira visita. `/amostra` é a vitrine dos 20 da sonda (noindex). Links antigos da colinha (`/c/a+b`, ids separados por `+`) redirecionam para o crachá do primeiro.

## O card do político (objeto central)

Foto · nome de urna · partido-UF · status (eleito / reeleito / não eleito / suplente / em exercício) · mandato atual e próximo · dois números do mandato no Congresso:
1. **Participação em votações** — % de votações nominais do plenário em que registrou voto (Sim/Não/Abstenção/Obstrução). Rótulo: "participação em votações", nunca "presença".
2. **Governismo** — % de votos alinhados à orientação "Governo". Calculado por período de governo (corte em 01/01/2027), não por legislatura.

Metodologia detalhada (o que conta como voto, licença, secretas, mês da CEAP): `/como-funciona` (texto para o eleitor) e `docs/METODOLOGIA.md` (nota técnica). Ao lado da participação, "afastado N dias no período" (licença não é descontada).

Abaixo: cota do mês (CEAP na Câmara, CEAPS no Senado) vs média da bancada **da mesma UF e da mesma Casa** (cotas variam por estado; nunca comparar com média nacional). A UF é a da bancada na Casa, não a da candidatura de 2026. Abaixo: **Como cobrar**, com os canais oficiais (contato do gabinete, ouvidoria da Casa, Fala.BR, MPF/TCU), sem texto pronto; e **Receber avisos** (fake door).

**Na interface (decisão do usuário de 2026-11-04):** a página do político segue o crachá do protótipo (`docs/PROTOTIPO.md`, E23i): cabeçalho (cargo pelo estado, sigla e nome do partido, em exercício desde · mandato até), salário, participação, participação ao lado da média da Casa, "quem vota mais parecido" e as abas Propostas e Votos. Governismo, cota, mandatos, contatos, "Como cobrar" e "Receber avisos" saíram da página; seguem calculados em `CardDados` e no resumo da página e documentados em `/como-funciona`, para voltarem em outra tela se for decidido.

## Fontes de dados e armadilhas conhecidas

### TSE — `dadosabertos.tse.jus.br` (CSV, download único) e `resultados.tse.jus.br` (JSON de divulgação)
- `consulta_cand`: candidatos, nome de urna, partido, federação, situação de totalização (`#NULO` em 421 candidaturas a deputado federal e senador de 2026: status desconhecido, nunca inventado), nascimento, CPF. **CPF nunca é persistido, nem em hash**: o join por SHA-256 do CPF acontece em memória no cron, a cada execução, e só o par de ids (`tse_sq_candidato` ↔ `camara_id`) é gravado. Não tem coluna de foto nem indica quem concorre à reeleição (em 2026 não há `ST_REELEICAO`): "reeleito" sai do join com a Câmara/Senado.
- **Foto**: URL pública por candidato em `https://resultados.tse.jus.br/oficial/ele2026/6259/fotos/{uf}/{sq_candidato}.jpeg` (JPEG ~6 KB; 17/17 da amostra de 2026). `lib/tse.ts#fotoUrlTse`. O zip `foto_cand{ano}_{UF}_div.zip` só serve para conferência. O DivulgaCand bloqueia acesso automatizado; não usar.
- Zips só por ano (um CSV por UF dentro). Catálogo via API CKAN: `dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026` e `?id=resultados-2026`.
- CSV latin-1, `;`. Nulos: `#NULO`, `#NE` (2026) e `#NULO#`, `#NE#` (2018). `DS_CARGO` é MAIÚSCULO em `consulta_cand` e Capitalizado em `votacao_*_munzona`. `SG_FEDERACAO` em 2026 é a composição, não uma sigla.
- **O TSE regenera os arquivos sem aviso** (novo `DT_GERACAO`, linhas reordenadas, zip de outro tamanho) sem mudar o conteúdo: em 01/11/2026 os 1.058 candidatos a deputado federal e senador de SP tinham votos e situação idênticos aos de 29/10. O cron compara conteúdo agregado, nunca bytes ou data.
- `votacao_candidato_munzona`: votos por município e zona (SP: 884 MB, 1,9 M linhas). Usar `QT_VOTOS_NOMINAIS_VALIDOS` (exclui "anulado sub judice"). Top-20 por município e cargo: `scripts/sonda/eleitos-mun.ts`.
- `votacao_partido_munzona`: votos de legenda por lista. Legenda válida = `QT_TOTAL_VOTOS_LEG_VALIDOS` (legenda + nominais convertidos em legenda). `detalhe_votacao_munzona`: totais de válidos, brancos, nulos por município.
- JSON de resultado por município e cargo: `resultados.tse.jus.br/oficial/ele2026/6259/dados/{uf}/{uf}{cd_municipio}-c{cargo:4}-e{eleicao:6}-u.json` (cargo 5 = senador, 6 = deputado federal; paths em `/oficial/comum/config/ele-c.json`). `{cd_municipio}` no nome do arquivo tem **5 dígitos com zeros à esquerda**; o CSV traz o código sem eles (Porto Velho é "35" no CSV e `ro00035` no arquivo): SP nunca expôs isso porque todos os códigos de SP têm 5 dígitos. Bateu com o CSV em 1.290/1.290 listas de SP. `lib/tse.ts#getResultadoMunicipio`.
- Relatório de Resultado da Totalização (`relatorio_resultado_totalizacao`, PDF por UF): Anexos VI (QE/QP), VII (sobras, média a média) e VIII (resumo) são o gabarito do quociente.
- `CD_MUNICIPIO` é código do TSE, não do IBGE. Código IBGE pela API de localidades do IBGE por nome normalizado (a API do IBGE **não responde a runners do GitHub Actions**: testado 2× em 2026-11-02, timeout de conexão; a tabela é gerada localmente por `scripts/tse/municipios.ts` e versionada em `data/municipios-ibge.json`, 5.571 cidades); No país, 13 grafias divergem (ex.: TSE "Munhoz de Mello", IBGE "Munhoz de Melo"; TSE "Boa Saúde", IBGE "Januário Cicco", nome atual), todas em de-para explícito revisado à mão.
- `bem_candidato`: bens declarados (para v1.2).
- Quociente eleitoral (`lib/quociente.ts`): QE com fração ≤ 0,5 desprezada; QP desprezando a fração; vaga de QP só para quem tem ≥ 10% do QE (a sobra vai para as médias); sobras primeiro entre listas com ≥ 80% do QE e candidato com ≥ 20%, depois entre todas (STF, ADIs 7228/7263/7325); divisor da média = vagas **obtidas** por QP + médias + 1. Tratar **federação** como lista única. A frase "seu voto contou para" saiu da interface (2026-11-01); o cálculo fica para mostrar como cada um foi eleito (QP ou média) na linha do tempo de candidaturas. Senador é eleição majoritária.

**UF da cadeira ≠ UF da candidatura:** `politicos.uf` vem da candidatura de 2026 (ou do perfil, para
quem não disputou). Quem disputou por outro estado (Rosangela Moro: cadeira de SP, candidatura no PR)
fica com a UF errada para "quem representa o estado". Listas por estado usam `mandatos.uf`.

### Câmara — `https://dadosabertos.camara.leg.br/api/v2` (JSON, sem chave)
- `/deputados`, `/deputados/{id}` (tem CPF para o join com o TSE, confirmado em 70/70 de SP). E-mail oficial em `ultimoStatus.gabinete.email` (o `email` do topo vem nulo); foto em `ultimoStatus.urlFoto`; `redeSocial` é array de URLs.
- `/deputados?idLegislatura=57` (a lista da legislatura) passou o dia 2026-11-04 levando 12–15 s por página e caindo em 504 no corte de 15 s do gateway, em qualquer `itens` e com ou sem `ordenarPor`; só respondia rápido a página que já estava no cache da Câmara. `/deputados` sem legislatura (em exercício) seguia em 0,2 s. O job `parlamentares` cai para "deputados já conhecidos + em exercício" quando a da legislatura falha (relatado no log, não é falha).
- `/deputados?nome=` sem `idLegislatura` só busca em exercício; com `idLegislatura=N` busca quem passou pela legislatura N. Ids são estáveis entre legislaturas. Eleitos pela 1ª vez em 2026 não existem até 01/02/2027; ex-deputados existem com registro antigo.
- `/deputados/{id}/orgaos`, `/frentes`, `/historico`, `/despesas`. Em `/historico`, a `descricaoStatus` pode vir com uma anotação livre antes do evento, separada por " / " ("SGM Adjunta ... / Entrada - Posse de Eleito Titular"): procurar o evento em cada trecho (`lib/linhas-mandato.ts`).
- `/despesas?ano=` **sozinho devolve vazio**; usar `?idLegislatura=57&ano=` (+`mes` opcional). ~10 páginas de 100 por deputado-ano; 70 deputados × 2 anos = 538 chamadas, 0 falhas. Somar `valorLiquido` (estornos vêm negativos). `codDocumento` repetido não é duplicata (passagens SIGEPA têm várias linhas por código): nunca deduplicar.
- O CSV anual `camara.leg.br/cotas/Ano-{ano}.csv.zip` **não serve** para a média: omite "PASSAGEM AÉREA - SIGEPA" (até 75% do gasto de alguns deputados). Média da bancada vem da API, mesma fonte do número do político.
- Lançamento da cota atrasa ~3 meses: a média de SP cai de R$ 48k (mai/26) para R$ 10k (out/26). O card mostra o último mês fechado, não o corrente.
- `/votacoes?idOrgao=180&dataInicio&dataFim` — plenário. **Máximo 3 meses por chamada** e 100 itens por página (`lib/camara.ts#janelas` divide). ~1.700 votações/ano listadas, ~280 nominais/ano. Depois `/votacoes/{id}` (`proposicoesAfetadas` = matéria principal), `/votos` e `/orientacoes`.
- Nominal tem placar na `descricao` (`Sim: N; Não: M`): precisão 100%, recall 99% (medido). O cron confirma por `/votos` mesmo assim.
- `orientacaoVoto` ∈ {`Sim`, `Não`, `Obstrução`, `Liberado`, `""`}. Vazio e `Liberado` ficam fora do denominador do governismo. `aprovacao` vem `null` em ~17% das nominais.
- `/proposicoes?idDeputadoAutor` retorna **coautorias**. Filtrar por `/proposicoes/{id}/autores` com `proponente = true`. Em PEC, as ~170 assinaturas de apoio vêm com `proponente = 0` (conferido: os 2 casos a mais da API para uma deputada em 2025 eram apoio).
- **Arquivos anuais** `dadosabertos.camara.leg.br/arquivos/{nome}/csv/{nome}-{ano}.csv` (`proposicoes`, `proposicoesAutores`; CSV `;`, UTF-8 com BOM, CRLF): o servidor **corta a transferência a cada ~17 s** (43 de 90 MB) e aceita `Range` (206): `lib/http.ts#baixarArquivo` retoma até o tamanho bater. Regenerados todo dia (~04h). O arquivo do ano traz também proposições sem número (`ano` 0: pareceres, relatórios). Em `proposicoesAutores`, `ordemAssinatura = 1` marca exatamente um primeiro autor por proposição; "virou lei" = `ultimoStatus_descricaoSituacao` "Transformado em Norma Jurídica".
- `tipoVoto` tem 5 valores: `Sim`, `Não`, `Abstenção`, `Obstrução`, `Artigo 17`, e vem **`null`** em votações de pessoa (→ `nao_informado`: conta na participação, não no governismo). Quem não aparece no array = `ausente`. Tratar todos explicitamente.
- `/votacoes/{id}/votos` responde **404** em ~1% das votações listadas: tratar como "sem votos". Com 6 chamadas em voo apareceram 429 (3 em 6,5k): o retry resolve.
- Votação simbólica = array de votos vazio. Ignorar. Medido 2023→out/2026: 6.537 votações do plenário, 1.107 nominais.
- API instável, sem rate limit documentado (observado: ~3% das chamadas falham e passam no retry). Em 01/11/2026, `/deputados/{id}` devolveu 504 após 15 s em rajadas, e de forma persistente para um id (220651) cujo `/historico` respondia: scripts de coleta são incrementais (só buscam o que falta). Retry com backoff, timeout de 30s, log por endpoint. Falha num endpoint não aborta o job.
- Eleitos em 2026 só existem aqui a partir de 01/02/2027. Até lá, dado vem do TSE.

### Senado — `https://legis.senado.leg.br/dadosabertos` (JSON via header `Accept: application/json`; o sufixo `.json` só redireciona)
- Doc: Swagger UI em `/dadosabertos/docs/`; o OpenAPI está em `/dadosabertos/v3/api-docs` (v4.1.3 em 2026-10-29, 157 paths).
- `/senador/lista/atual?uf=`, `/senador/{codigo}` (v6), `/senador/{codigo}/mandatos`, `/senador/{codigo}/licencas?dataInicio=AAAAMMDD`, `/comissoes`, `/autorias`. `/licencas` repete a mesma licença (início e motivo iguais) com fins diferentes: ficar com o fim mais tardio.
- **Votos nominais do plenário: `GET /votacao?dataInicio&dataFim` (ISO, janela ≤ 1 ano; 400 acima).** `/senador/{codigo}/votacoes`, `/plenario/lista/votacao/...` e `/plenario/votacao/nominal/{ano}` estão DEPRECATED e apontam para este. Cada votação lista **os 81 senadores** com `siglaVotoParlamentar`: Sim/Não/Abstenção; "Votou" (votação secreta — 56% das nominais 2023–26, sabatinas MSF/OFS); "Presidente (art. 51 RISF)"; NA (dispositivo não citado); e siglas de comparecimento (P-NRV, AP, MIS, LS, LP, NCom..., lista em `/plenario/lista/tiposComparecimento`) que viram `ausente`. `idExterno` = `codigoSessaoVotacao`. Só sessões do SF: vetos (sessão conjunta do CN) não aparecem.
- Orientação de bancada: `GET /plenario/votacao/orientacaoBancada/{AAAAMMDD}/{AAAAMMDD}` (aceitou o período inteiro numa chamada). Junta com `/votacao` por `sequencialVotacao` (nulo em ~2% das votações → sem orientação). Bancadas: partidos na grafia da API ("Republica", "Podemos", "UNIÃO"), "Governo", "Oposição", "Maioria", "Minoria", "Banc Fem". Valores SIM/NÃO/LIVRE/OBSTRUÇÃO/null, normalizados no adapter para Sim/Não/Liberado/Obstrução/"" (vocabulário da Câmara).
- XML→JSON: objeto em vez de array quando há um só item (`Partidos.Partido`), chave ausente quando vazio. Normalizar em `lib/senado.ts`; nunca usar o shape cru fora dele.
- **Nenhum endpoint expõe CPF** (0 ocorrências no OpenAPI). Join com o TSE por nome completo + UF (`NomeCompletoParlamentar` × `NM_CANDIDATO`, sem acento, maiúsculas), gravando o método em `join`; revisão manual se houver ambiguidade. `codigo` do Senado não tem relação com `id` da Câmara.
- Foto: `UrlFotoParlamentar` vem em `http://` e redireciona até `https://legis.senado.leg.br/senadores/fotos-oficiais/{codigo}` (JPEG). O adapter troca o esquema para https.
- 2026 renovou 2/3 do Senado: a maioria dos senadores eleitos não tem dado até 01/02/2027.
- **Autoria:** `GET /processo?codigoParlamentarAutor={codigo}&dataInicioApresentacao&dataFimApresentacao` (janela ≤ 1 ano, sem paginação; `/senador/{codigo}/autorias` está DEPRECATED). `identificacao` é "PL 1234/2025", às vezes com sufixo de comissão ("REQ 4/2023 - CDH"). Ordem dos autores só em `/processo/{id}` (`autoriaIniciativa[].ordem`, `codigoParlamentar` ausente quando o autor é comissão). A listagem por autor inclui quem não está na autoria de iniciativa (membros da Comissão Diretora num PL dela; assinatura retirada): vale a autoria de iniciativa. Virou norma = situação "TRANSFORMADA EM NORMA JURÍDICA" (com ou sem veto parcial). Com 3 chamadas em voo, `/processo` responde **429** (225 em 3.466): 2 em voo e 5 tentativas. Página da matéria: `www25.senado.leg.br/web/atividade/materias/-/materia/{codigoMateria}`.
- **CEAPS (cota dos senadores):** `GET https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}` (outro serviço, JSON puro, um ano inteiro numa chamada, ~10 MB). Traz `codSenador` (= `codigo`), mês de competência, `tipoDespesa`, `valorReembolsado` (estornos negativos: 114 em 2025) e `cpfCnpj`/`fornecedor`, que nunca saem do adapter. **Não traz UF**: vem de `politicos` ou, para quem não está em exercício, dos mandatos (`/senador/{codigo}/mandatos`, mandato da legislatura atual); `/senador/{codigo}` não traz `UfParlamentar` de quem não está em exercício (12 de 12 casos). `tipoDespesa` vem `null` em ~0,3% (todos "Recibo") → "Tipo não informado pela fonte". Inclui titulares licenciados e quem saiu (89 códigos em 2026). Página oficial por senador e ano: `https://www6g.senado.leg.br/transparencia/sen/{codigo}/?ano={ano}`.

### Portal da Transparência (v1.1) — chave gratuita, uma só, usada apenas no cron.

## Modelo de dados (Supabase)

Definido em `lib/types.ts` (camelCase); `data/*.json` e as tabelas guardam as mesmas linhas em snake_case (`Linha<T>`, `lib/linhas.ts`). Validado por `scripts/sonda/validar.ts`.

```
politicos         id (= slug), cargo, nome, nome_urna, genero, slug, uf, partido, lista_id, federacao,
                  numero_urna, foto_url, email, url_perfil, tse_sq_candidato, camara_id,
                  senado_codigo, status, votos_2026, updated_at
mandatos          politico_id, cargo, inicio, fim (null = em curso), titular bool, uf (da cadeira; E23d)
afastamentos      politico_id, inicio, fim, motivo                  (licenças dentro do mandato)
listas            id, uf, ano, cargo, nome, composicao, votos_validos, eleitos   (quociente)
municipios        ibge, tse, nome, uf
eleitos_mun       municipio_ibge, cargo, politico_id, votos, posicao   (top-20 + empatados no 20º)
despesas_mes      politico_id, casa, uf (da bancada na Casa), ano, mes, total, por_categoria jsonb
despesas_media_uf casa, uf, ano, mes, media, parlamentares, total, fechado
proposicoes       id (= casa:id_externo), id_externo, casa, tipo, numero, ano, ementa, apresentacao,
                  situacao, virou_norma bool, url_oficial   (só PL/PLP/PEC/PDL/PRC|PRS com autor no site)
proposicoes_autores  proposicao_id, politico_id, ordem (1 = primeiro autor; só proponentes)
proposicoes_contagem politico_id, casa, ano, tipo, autorias   (os demais tipos: REQ, RIC, emendas...)
votacoes          id (= casa:id_externo), id_externo, casa, data, proposicao, ementa, objeto,
                  descricao, resultado, placar jsonb, secreta bool, url_oficial
votos             votacao_id, politico_id, voto enum(sim,nao,abstencao,obstrucao,art17,
                  nao_informado,secreto,ausente), detalhe (sigla do Senado)
orientacoes       votacao_id, bancada, orientacao
atualizacoes      fonte ({casa}_{job}), coletado_em   (última coleta bem-sucedida; base de /atualizacoes)
resumos           politico_id, card jsonb, pagina jsonb, hash   (crachá pronto, pelo cron)
resumos_votacao   votacao_id, pagina jsonb, hash   (página da votação pronta, com o partido de cada voto no dia; E23k)
```
A tabela `quiz` e a coluna `votacoes.quiz` saem na E17; o modelo cresce a cada passo (detalhar no PLANO).
Tudo com `upsert` por chave externa. Nenhuma coluna de CPF ou hash de CPF; CPF que apareça em texto oficial (descrição de votação, ementa) é ocultado com `lib/texto.ts#semCpf`. Volume e limites: `docs/VOLUME.md` (decisões de 2026-11-02: dados desde 2023, cota agregada por mês/categoria/fornecedor sem nota a nota, íntegra só das proposições que podem virar lei; as páginas leem números pré-calculados pelo cron, não as votações inteiras). Tamanho na sonda (SP, 438 políticos, 2023–26): 9,6 MB de JSON; esperado < 50 MB por legislatura.

## Cron (`scripts/cron/`, `npm run cron`; GitHub Actions diário desde a E22)

Desenho em `docs/CRON.md`. Desde a E22 só o Actions publica; localmente, apenas `npm run cron -- --sem-publicar`. Estado em `estado/` (fora do git; no Actions, no cache do Actions, com a release `estado-inicial` como ponto de partida): coleta incremental de cada job → validação → publicação só das linhas novas ou alteradas (diff contra `estado/publicado`, sem ler o banco) → resumos só onde mudou. Jobs isolados; um falhando não impede o seguinte e o processo sai com 1. Log só no output do Actions. O cron também é o keep-alive do Supabase free. Linhas de votação, voto e orientação só por `lib/linhas-votacao.ts` (a mesma regra da sonda).

## Convenções de código

- Um adapter por fonte em `lib/{tse,camara,senado}.ts`, retornando tipos internos (`Politico`, `Votacao`, `Voto`). Nenhum componente conhece o shape das APIs.
- Componentes em `components/`. `PoliticoCard` é o único card; reutilizado em busca, colinha e OG. Na página do político, o topo é o crachá (`components/Cracha.tsx`, layout do protótipo, E23), que exibe os mesmos `CardDados`. Os dois só exibem `CardDados` de `lib/card.ts#montarCard`. Fotos com `<img>` direto da URL oficial (nunca `next/image`, que passaria pela Vercel). Explicação de termos com `components/Termo.tsx` (popover nativo do HTML, sem biblioteca).
- Textos de interface em português do Brasil, sem jargão legislativo sem tooltip (PEC, PL, MP, obstrução, quociente).
- Links externos com `rel="noreferrer noopener"`. Header `Referrer-Policy: same-origin`.
- Mobile-first. A colinha e a página do político têm que carregar em < 1s em 4G.
- Testes só onde há aritmética: cálculo de participação, governismo, quociente, somas de cota, salário e patrimônio. Fixtures com dado real da sonda.
- Commits pequenos, mensagens em português.

## Como trabalhar comigo neste repositório

- Antes de implementar algo novo, verificar se está em "Fora de escopo". Se estiver, não fazer e dizer por quê.
- Antes de adicionar dependência, perguntar se é necessária. Preferir a plataforma (Next, Postgres) a biblioteca.
- Na sonda e no protótipo, nunca gerar dado sintético para preencher lacuna. Mostrar a lacuna.
- Ao tocar em cálculo de indicador, atualizar `/como-funciona` (`app/como-funciona/page.tsx`, texto canônico desde a E15) e a nota técnica `docs/METODOLOGIA.md` no mesmo commit. Termos do card e âncoras das seções em `lib/glossario.ts`.
- Se uma API retornar algo diferente do documentado aqui, atualizar esta seção do CLAUDE.md no mesmo PR.

## Definição de pronto (Passo 4, Congresso no Brasil inteiro)

Uma pessoa de qualquer estado acha quem a representa pelo mapa, pela cidade ou pelo nome, reconhece os rostos, abre o crachá de cada um e entende em 10 segundos o resumo do mandato, vê como votou em qualquer votação do Plenário, monitora quem quiser neste aparelho, acha os canais oficiais para cobrar e compartilha a página. Tudo sem conta e sem custo. O site segue o protótipo (`docs/PROTOTIPO.md`), tela por tela.

## Retomada de sessão

Este projeto é construído uma etapa por dia. Ao iniciar qualquer sessão:

1. Ler a linha **Etapa atual** e a etapa correspondente em `PLANO.md`.
2. Ler a última entrada de `DIARIO.md` (só a última).
3. Fazer a etapa inteira até o critério "Pronto quando". Não começar a próxima.
4. Ao terminar: marcar os itens no `PLANO.md`, avançar a linha **Etapa atual**, escrever a
   entrada do dia no `DIARIO.md` e registrar lacunas em `docs/LACUNAS.md`.

Se o dado real contradisser este arquivo, corrigir aqui na mesma sessão.
