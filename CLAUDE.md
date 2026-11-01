# Fiscaliza — CLAUDE.md

Plataforma cívica, sem fins lucrativos, feita por duas pessoas. Responde cinco perguntas para o eleitor:
em quem eu votei? → o que estão fazendo? → me representam? → como cobro? → com quem compartilho?

Escopo: deputados federais e senadores eleitos em 2026 (e os em exercício). Presidente aparece só como card estático.

## Princípios inegociáveis

1. **Custo zero.** Vercel Hobby, Supabase free, GitHub Actions. Nenhuma assinatura, nenhum serviço pago. Se uma solução exige plano pago, ela está errada.
2. **Nenhuma requisição de usuário chama LLM ou API externa.** Toda página lê do Supabase (ou de JSON estático na fase de protótipo). APIs da Câmara/Senado/TSE são tocadas apenas pelo cron.
3. **Sem conta, sem e-mail, sem dado pessoal.** A colinha vive na URL (`/c/[ids]`) e no localStorage. Não existe tabela de usuários. Analytics só cookieless.
4. **Dado oficial, zero adjetivo.** O site mostra número e fonte; nunca qualifica um político. Toda métrica tem link para a metodologia em `/como-funciona` e para a página oficial de origem.
5. **Nenhum dado inventado, nem em protótipo.** Se o campo não veio da fonte, não entra na interface. Placeholders são proibidos.
6. **Simplicidade sobre completude.** O concorrente é a enciclopédia; nós somos um card com três números e um botão. Antes de adicionar algo, perguntar: cabe no card?

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase Postgres (só a partir do passo 3; antes disso, JSON em `data/`)
- Cron: GitHub Actions, scripts em `scripts/` (Node/TypeScript). DuckDB para processar CSVs do TSE.
- Deploy: Vercel via push na `main`. Páginas de político com ISR (`revalidate` 24h).
- Fotos: servidas direto das URLs oficiais (Câmara/Senado/TSE). Nunca proxiar pela Vercel. Exceção: `next/og` busca fotos na hora de gerar a imagem de compartilhamento.
- Licença: AGPL-3.0 (código), CC-BY 4.0 (dados derivados).

## Fases

**Passo 1 — Sonda (sem infra).** `scripts/sonda/` gera JSON estático com ~20 políticos reais (10 deputados reeleitos SP, 5 novos, 5 senadores): perfil, votos nominais 2023–26, orientações, CEAP mensal, resultado TSE por município em SP. Objetivo: ver o dado real antes de desenhar.

**Passo 2 — Protótipo (JSON estático).** Site completo lendo `data/*.json`. Testar com 5 pessoas que não acompanham política. Critério: montar a colinha a partir da cidade em menos de 1 minuto.

**Passo 3 — Infra.** Trocar a origem dos dados de JSON para Supabase. Mesmo shape, mesmos componentes. Cron diário.

**v1.1 (março/2027):** emendas parlamentares por município (Portal da Transparência), alerta pré-votação (web push), "votação da semana".
**v1.2:** fidelidade partidária, efetividade, comparador, quem vota como eu, suplentes, patrimônio 2022→2026, RSS/ICS, seguir tema, dados abertos.

## Fora de escopo (não implementar, não sugerir)

Presidente como entidade com feed · presença literal em sessões · feed por janela fixa de dias · e-mail transacional, newsletter, tabela de assinantes · votações de comissões · discursos · deputados estaduais e governadores · qualquer scraping de HTML · resumo de ementa por LLM em tempo de requisição.

## Rotas (MVP)

```
/                   entrada: cidade ou nome → monta a colinha
/c/[ids]            colinha: cards + "seu voto contou para" + concordância + OG image
/p/[slug]           página do político (ISR): card, histórico 2023–26, CEAP, contatos, cobrar
/votacoes           as votações do quiz de concordância, explicadas em 3 parágrafos
/como-funciona      metodologia, fontes, licença, código
```

## O card do político (objeto central)

Foto · nome de urna · partido-UF · status (eleito / reeleito / não eleito / suplente / em exercício) · três números:
1. **Participação em votações** — % de votações nominais do plenário em que registrou voto (Sim/Não/Abstenção/Obstrução). Rótulo: "participação em votações", nunca "presença".
2. **Governismo** — % de votos alinhados à orientação "Governo". Calculado por período de governo (corte em 01/01/2027), não por legislatura.
3. **Concordância com você** — % das votações do quiz em que o voto do político coincide com a resposta do usuário. Sem resposta do usuário: oculto. Político sem voto: "primeiro voto em fevereiro".

Metodologia detalhada (o que conta como voto, licença, secretas, mês da CEAP, nome da federação): `docs/METODOLOGIA.md`, texto-fonte de `/como-funciona`. Ao lado da participação, "afastado N dias no período" (licença não é descontada).

Abaixo: CEAP do mês vs média da bancada **da mesma UF** (cotas variam por estado; nunca comparar com média nacional). Abaixo: botão **Cobrar** (`mailto:` para o e-mail oficial do gabinete, assunto e corpo pré-preenchidos com a votação discordante, se houver).

## Fontes de dados e armadilhas conhecidas

### TSE — `dadosabertos.tse.jus.br` (CSV, download único) e `resultados.tse.jus.br` (JSON de divulgação)
- `consulta_cand`: candidatos, nome de urna, partido, federação, situação de totalização, nascimento, CPF. **CPF nunca é persistido, nem em hash**: o join por SHA-256 do CPF acontece em memória no cron, a cada execução, e só o par de ids (`tse_sq_candidato` ↔ `camara_id`) é gravado. Não tem coluna de foto nem indica quem concorre à reeleição (em 2026 não há `ST_REELEICAO`): "reeleito" sai do join com a Câmara/Senado.
- **Foto**: URL pública por candidato em `https://resultados.tse.jus.br/oficial/ele2026/6259/fotos/{uf}/{sq_candidato}.jpeg` (JPEG ~6 KB; 17/17 da amostra de 2026). `lib/tse.ts#fotoUrlTse`. O zip `foto_cand{ano}_{UF}_div.zip` só serve para conferência. O DivulgaCand bloqueia acesso automatizado; não usar.
- Zips só por ano (um CSV por UF dentro). Catálogo via API CKAN: `dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026` e `?id=resultados-2026`.
- CSV latin-1, `;`. Nulos: `#NULO`, `#NE` (2026) e `#NULO#`, `#NE#` (2018). `DS_CARGO` é MAIÚSCULO em `consulta_cand` e Capitalizado em `votacao_*_munzona`. `SG_FEDERACAO` em 2026 é a composição, não uma sigla.
- **O TSE regenera os arquivos sem aviso** (novo `DT_GERACAO`, linhas reordenadas, zip de outro tamanho) sem mudar o conteúdo: em 01/11/2026 os 1.058 candidatos a deputado federal e senador de SP tinham votos e situação idênticos aos de 29/10. O cron compara conteúdo agregado, nunca bytes ou data.
- `votacao_candidato_munzona`: votos por município e zona (SP: 884 MB, 1,9 M linhas). Usar `QT_VOTOS_NOMINAIS_VALIDOS` (exclui "anulado sub judice"). Top-20 por município e cargo: `scripts/sonda/eleitos-mun.ts`.
- `votacao_partido_munzona`: votos de legenda por lista. Legenda válida = `QT_TOTAL_VOTOS_LEG_VALIDOS` (legenda + nominais convertidos em legenda). `detalhe_votacao_munzona`: totais de válidos, brancos, nulos por município.
- JSON de resultado por município e cargo: `resultados.tse.jus.br/oficial/ele2026/6259/dados/{uf}/{uf}{cd_municipio}-c{cargo:4}-e{eleicao:6}-u.json` (cargo 5 = senador, 6 = deputado federal; paths em `/oficial/comum/config/ele-c.json`). Bateu com o CSV em 1.290/1.290 listas de SP. `lib/tse.ts#getResultadoMunicipio`.
- Relatório de Resultado da Totalização (`relatorio_resultado_totalizacao`, PDF por UF): Anexos VI (QE/QP), VII (sobras, média a média) e VIII (resumo) são o gabarito do quociente.
- `CD_MUNICIPIO` é código do TSE, não do IBGE. Código IBGE pela API de localidades do IBGE por nome normalizado; SP tem 1 grafia divergente (TSE "São Luís do Paraitinga", IBGE "São Luiz"), resolvida em de-para explícito.
- `bem_candidato`: bens declarados (para v1.2).
- Quociente eleitoral (`lib/quociente.ts`): QE com fração ≤ 0,5 desprezada; QP desprezando a fração; vaga de QP só para quem tem ≥ 10% do QE (a sobra vai para as médias); sobras primeiro entre listas com ≥ 80% do QE e candidato com ≥ 20%, depois entre todas (STF, ADIs 7228/7263/7325); divisor da média = vagas **obtidas** por QP + médias + 1. Tratar **federação** como lista única. Frase na interface: "seu voto contou para [partido/federação], que elegeu N em [UF]". Nunca "ajudou a eleger Z". Senador é eleição majoritária: sem frase de lista.

### Câmara — `https://dadosabertos.camara.leg.br/api/v2` (JSON, sem chave)
- `/deputados`, `/deputados/{id}` (tem CPF para o join com o TSE, confirmado em 70/70 de SP). E-mail oficial em `ultimoStatus.gabinete.email` (o `email` do topo vem nulo); foto em `ultimoStatus.urlFoto`; `redeSocial` é array de URLs.
- `/deputados?nome=` sem `idLegislatura` só busca em exercício; com `idLegislatura=N` busca quem passou pela legislatura N. Ids são estáveis entre legislaturas. Eleitos pela 1ª vez em 2026 não existem até 01/02/2027; ex-deputados existem com registro antigo.
- `/deputados/{id}/orgaos`, `/frentes`, `/historico`, `/despesas`.
- `/despesas?ano=` **sozinho devolve vazio**; usar `?idLegislatura=57&ano=` (+`mes` opcional). ~10 páginas de 100 por deputado-ano; 70 deputados × 2 anos = 538 chamadas, 0 falhas. Somar `valorLiquido` (estornos vêm negativos). `codDocumento` repetido não é duplicata (passagens SIGEPA têm várias linhas por código): nunca deduplicar.
- O CSV anual `camara.leg.br/cotas/Ano-{ano}.csv.zip` **não serve** para a média: omite "PASSAGEM AÉREA - SIGEPA" (até 75% do gasto de alguns deputados). Média da bancada vem da API, mesma fonte do número do político.
- Lançamento da cota atrasa ~3 meses: a média de SP cai de R$ 48k (mai/26) para R$ 10k (out/26). O card mostra o último mês fechado, não o corrente.
- `/votacoes?idOrgao=180&dataInicio&dataFim` — plenário. **Máximo 3 meses por chamada** e 100 itens por página (`lib/camara.ts#janelas` divide). ~1.700 votações/ano listadas, ~280 nominais/ano. Depois `/votacoes/{id}` (`proposicoesAfetadas` = matéria principal), `/votos` e `/orientacoes`.
- Nominal tem placar na `descricao` (`Sim: N; Não: M`): precisão 100%, recall 99% (medido). O cron confirma por `/votos` mesmo assim.
- `orientacaoVoto` ∈ {`Sim`, `Não`, `Obstrução`, `Liberado`, `""`}. Vazio e `Liberado` ficam fora do denominador do governismo. `aprovacao` vem `null` em ~17% das nominais.
- `/proposicoes?idDeputadoAutor` retorna **coautorias**. Filtrar por `/proposicoes/{id}/autores` com `proponente = true`.
- `tipoVoto` tem 5 valores: `Sim`, `Não`, `Abstenção`, `Obstrução`, `Artigo 17`, e vem **`null`** em votações de pessoa (→ `nao_informado`: conta na participação, não no governismo). Quem não aparece no array = `ausente`. Tratar todos explicitamente.
- `/votacoes/{id}/votos` responde **404** em ~1% das votações listadas: tratar como "sem votos". Com 6 chamadas em voo apareceram 429 (3 em 6,5k): o retry resolve.
- Votação simbólica = array de votos vazio. Ignorar. Medido 2023→out/2026: 6.537 votações do plenário, 1.107 nominais.
- API instável, sem rate limit documentado (observado: ~3% das chamadas falham e passam no retry). Em 01/11/2026, `/deputados/{id}` devolveu 504 após 15 s em rajadas, e de forma persistente para um id (220651) cujo `/historico` respondia: scripts de coleta são incrementais (só buscam o que falta). Retry com backoff, timeout de 30s, log por endpoint. Falha num endpoint não aborta o job.
- Eleitos em 2026 só existem aqui a partir de 01/02/2027. Até lá, dado vem do TSE.

### Senado — `https://legis.senado.leg.br/dadosabertos` (JSON via header `Accept: application/json`; o sufixo `.json` só redireciona)
- Doc: Swagger UI em `/dadosabertos/docs/`; o OpenAPI está em `/dadosabertos/v3/api-docs` (v4.1.3 em 2026-10-29, 157 paths).
- `/senador/lista/atual?uf=`, `/senador/{codigo}` (v6), `/senador/{codigo}/mandatos`, `/senador/{codigo}/licencas?dataInicio=AAAAMMDD`, `/comissoes`, `/autorias`.
- **Votos nominais do plenário: `GET /votacao?dataInicio&dataFim` (ISO, janela ≤ 1 ano; 400 acima).** `/senador/{codigo}/votacoes`, `/plenario/lista/votacao/...` e `/plenario/votacao/nominal/{ano}` estão DEPRECATED e apontam para este. Cada votação lista **os 81 senadores** com `siglaVotoParlamentar`: Sim/Não/Abstenção; "Votou" (votação secreta — 56% das nominais 2023–26, sabatinas MSF/OFS); "Presidente (art. 51 RISF)"; NA (dispositivo não citado); e siglas de comparecimento (P-NRV, AP, MIS, LS, LP, NCom..., lista em `/plenario/lista/tiposComparecimento`) que viram `ausente`. `idExterno` = `codigoSessaoVotacao`. Só sessões do SF: vetos (sessão conjunta do CN) não aparecem.
- Orientação de bancada: `GET /plenario/votacao/orientacaoBancada/{AAAAMMDD}/{AAAAMMDD}` (aceitou o período inteiro numa chamada). Junta com `/votacao` por `sequencialVotacao` (nulo em ~2% das votações → sem orientação). Bancadas: partidos na grafia da API ("Republica", "Podemos", "UNIÃO"), "Governo", "Oposição", "Maioria", "Minoria", "Banc Fem". Valores SIM/NÃO/LIVRE/OBSTRUÇÃO/null, normalizados no adapter para Sim/Não/Liberado/Obstrução/"" (vocabulário da Câmara).
- XML→JSON: objeto em vez de array quando há um só item (`Partidos.Partido`), chave ausente quando vazio. Normalizar em `lib/senado.ts`; nunca usar o shape cru fora dele.
- **Nenhum endpoint expõe CPF** (0 ocorrências no OpenAPI). Join com o TSE por nome completo + UF (`NomeCompletoParlamentar` × `NM_CANDIDATO`, sem acento, maiúsculas), gravando o método em `join`; revisão manual se houver ambiguidade. `codigo` do Senado não tem relação com `id` da Câmara.
- Foto: `UrlFotoParlamentar` vem em `http://` e redireciona até `https://legis.senado.leg.br/senadores/fotos-oficiais/{codigo}` (JPEG). O adapter troca o esquema para https.
- 2026 renovou 2/3 do Senado: a maioria dos senadores eleitos não tem dado até 01/02/2027.

### Portal da Transparência (v1.1) — chave gratuita, uma só, usada apenas no cron.

## Modelo de dados (Supabase)

Definido em `lib/types.ts` (camelCase); `data/*.json` e as tabelas guardam as mesmas linhas em snake_case (`Linha<T>`, `lib/linhas.ts`). Validado por `scripts/sonda/validar.ts`.

```
politicos         id (= slug), cargo, nome, nome_urna, slug, uf, partido, lista_id, federacao,
                  numero_urna, foto_url, email, url_perfil, tse_sq_candidato, camara_id,
                  senado_codigo, status, votos_2026, updated_at
mandatos          politico_id, cargo, inicio, fim (null = em curso), titular bool
afastamentos      politico_id, inicio, fim, motivo                  (licenças dentro do mandato)
listas            id, uf, ano, cargo, nome, composicao, votos_validos, eleitos   (quociente)
municipios        ibge, tse, nome, uf
eleitos_mun       municipio_ibge, cargo, politico_id, votos, posicao   (top-20 + empatados no 20º)
despesas_mes      politico_id, ano, mes, total, por_categoria jsonb
despesas_media_uf uf, ano, mes, media, deputados, total
proposicoes       id_externo, casa, politico_id, tipo, numero, ano, ementa, data,
                  proponente bool, status, url_oficial
votacoes          id (= casa:id_externo), id_externo, casa, data, proposicao, ementa, objeto,
                  descricao, resultado, placar jsonb, secreta bool, url_oficial, quiz bool
votos             votacao_id, politico_id, voto enum(sim,nao,abstencao,obstrucao,art17,
                  nao_informado,secreto,ausente), detalhe (sigla do Senado)
orientacoes       votacao_id, bancada, orientacao
quiz              id, ordem, materia, ementa, votacao_camara_id, votacao_senado_id
```
Tudo com `upsert` por chave externa. Nenhuma coluna de CPF ou hash de CPF. Tamanho na sonda (SP, 438 políticos, 2023–26): 9,6 MB de JSON; esperado < 50 MB por legislatura.

## Cron (`.github/workflows/`)

Diário, em ordem, cada job idempotente e isolado: `politicos` → `despesas` (só dia 1–5 do mês) → `proposicoes` → `votacoes` (votos + orientações). Um job falhando não impede o seguinte. Log em `logs/` commitado? Não — log no output do Actions apenas. O cron também é o keep-alive do Supabase free.

## Convenções de código

- Um adapter por fonte em `lib/{tse,camara,senado}.ts`, retornando tipos internos (`Politico`, `Votacao`, `Voto`). Nenhum componente conhece o shape das APIs.
- Componentes em `components/`. `PoliticoCard` é o único card; reutilizado em busca, colinha, página e OG.
- Textos de interface em português do Brasil, sem jargão legislativo sem tooltip (PEC, PL, MP, obstrução, quociente).
- Links externos com `rel="noreferrer noopener"`. Header `Referrer-Policy: same-origin`.
- Mobile-first. A colinha e a página do político têm que carregar em < 1s em 4G.
- Testes só onde há aritmética: cálculo de participação, governismo, concordância, quociente. Fixtures com dado real da sonda.
- Commits pequenos, mensagens em português.

## Como trabalhar comigo neste repositório

- Antes de implementar algo novo, verificar se está em "Fora de escopo". Se estiver, não fazer e dizer por quê.
- Antes de adicionar dependência, perguntar se é necessária. Preferir a plataforma (Next, Postgres) a biblioteca.
- Na sonda e no protótipo, nunca gerar dado sintético para preencher lacuna. Mostrar a lacuna.
- Ao tocar em cálculo de indicador, atualizar `/como-funciona` no mesmo commit (até a E14, o texto-fonte `docs/METODOLOGIA.md`).
- Se uma API retornar algo diferente do documentado aqui, atualizar esta seção do CLAUDE.md no mesmo PR.

## Definição de pronto do MVP

Uma pessoa que não lembra em quem votou digita a cidade, reconhece os rostos, monta a colinha em < 1 min, vê os três números de cada político, responde o quiz e vê a concordância, clica em Cobrar e sai um e-mail pronto, compartilha e a preview no WhatsApp mostra a colinha com os números. Tudo sem conta e sem custo.

## Retomada de sessão

Este projeto é construído uma etapa por dia. Ao iniciar qualquer sessão:

1. Ler a linha **Etapa atual** e a etapa correspondente em `PLANO.md`.
2. Ler a última entrada de `DIARIO.md` (só a última).
3. Fazer a etapa inteira até o critério "Pronto quando". Não começar a próxima.
4. Ao terminar: marcar os itens no `PLANO.md`, avançar a linha **Etapa atual**, escrever a
   entrada do dia no `DIARIO.md` e registrar lacunas em `docs/LACUNAS.md`.

Se o dado real contradisser este arquivo, corrigir aqui na mesma sessão.
