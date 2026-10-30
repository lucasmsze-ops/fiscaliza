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

Abaixo: CEAP do mês vs média da bancada **da mesma UF** (cotas variam por estado; nunca comparar com média nacional). Abaixo: botão **Cobrar** (`mailto:` para o e-mail oficial do gabinete, assunto e corpo pré-preenchidos com a votação discordante, se houver).

## Fontes de dados e armadilhas conhecidas

### TSE — `dadosabertos.tse.jus.br` (CSV, download único)
- `consulta_cand`: candidatos, nome de urna, partido, federação, situação de totalização, CPF (guardar **apenas hash SHA-256**, nunca o CPF). **Não tem foto**: fotos vêm em `foto_cand{ano}_{UF}_div.zip` (arquivos `F{UE}{SQ_CANDIDATO}_div.jpg`), sem URL por candidato. O DivulgaCand bloqueia acesso automatizado; não usar.
- Zips só por ano (um CSV por UF dentro). Catálogo via API CKAN: `dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026`.
- CSV latin-1, `;`. Nulos: `#NULO`, `#NE` (2026) e `#NULO#`, `#NE#` (2018). `DS_CARGO` é MAIÚSCULO em `consulta_cand` e Capitalizado em `votacao_candidato_munzona`. `SG_FEDERACAO` em 2026 é a composição, não uma sigla.
- `votacao_candidato_munzona`: votos por município e zona (SP: 884 MB, 1,9 M linhas). Agregar por município e guardar só o top-20 por cargo/município. Usar `QT_VOTOS_NOMINAIS_VALIDOS` (exclui "anulado sub judice").
- `bem_candidato`: bens declarados (para v1.2).
- Quociente eleitoral: tratar **federação** como lista única. Frase na interface: "seu voto contou para [partido/federação], que elegeu N em [UF]". Nunca "ajudou a eleger Z".

### Câmara — `https://dadosabertos.camara.leg.br/api/v2` (JSON, sem chave)
- `/deputados`, `/deputados/{id}` (tem CPF para o join com o TSE, confirmado em 70/70 de SP). E-mail oficial em `ultimoStatus.gabinete.email` (o `email` do topo vem nulo); foto em `ultimoStatus.urlFoto`; `redeSocial` é array de URLs.
- `/deputados?nome=` sem `idLegislatura` só busca em exercício; com `idLegislatura=N` busca quem passou pela legislatura N. Ids são estáveis entre legislaturas. Eleitos pela 1ª vez em 2026 não existem até 01/02/2027; ex-deputados existem com registro antigo.
- `/deputados/{id}/orgaos`, `/frentes`, `/historico`, `/despesas?ano&mes`.
- `/votacoes?idOrgao=180&dataInicio&dataFim` — plenário. **Máximo 3 meses por chamada** e 100 itens por página (`lib/camara.ts#janelas` divide). ~1.700 votações/ano listadas, ~280 nominais/ano. Depois `/votacoes/{id}` (`proposicoesAfetadas` = matéria principal), `/votos` e `/orientacoes`.
- Nominal tem placar na `descricao` (`Sim: N; Não: M`): precisão 100%, recall 99% (medido). O cron confirma por `/votos` mesmo assim.
- `orientacaoVoto` ∈ {`Sim`, `Não`, `Obstrução`, `Liberado`, `""`}. Vazio e `Liberado` ficam fora do denominador do governismo. `aprovacao` vem `null` em ~17% das nominais.
- `/proposicoes?idDeputadoAutor` retorna **coautorias**. Filtrar por `/proposicoes/{id}/autores` com `proponente = true`.
- `tipoVoto` tem 5 valores: `Sim`, `Não`, `Abstenção`, `Obstrução`, `Artigo 17`, e vem **`null`** em votações de pessoa (→ `nao_informado`: conta na participação, não no governismo). Quem não aparece no array = `ausente`. Tratar todos explicitamente.
- `/votacoes/{id}/votos` responde **404** em ~1% das votações listadas: tratar como "sem votos". Com 6 chamadas em voo apareceram 429 (3 em 6,5k): o retry resolve.
- Votação simbólica = array de votos vazio. Ignorar. Medido 2023→out/2026: 6.537 votações do plenário, 1.107 nominais.
- API instável, sem rate limit documentado (observado: ~3% das chamadas falham e passam no retry). Retry com backoff, timeout de 30s, log por endpoint. Falha num endpoint não aborta o job.
- Eleitos em 2026 só existem aqui a partir de 01/02/2027. Até lá, dado vem do TSE.

### Senado — `https://legis.senado.leg.br/dadosabertos` (XML por padrão; pedir JSON via header `Accept` ou sufixo `.json`)
- `/senador/lista/atual`, `/senador/{codigo}`, `/senador/{codigo}/mandatos`, `/comissoes`, `/autorias`, `/votacoes`.
- Votações do plenário: confirmar path atual na doc (`/dadosabertos/docs/`) antes de codar — a nomenclatura mudou entre versões.
- Campos inconsistentes entre endpoints. Normalizar num adapter em `lib/senado.ts`; nunca usar o shape cru no restante do código.
- `codigo` do Senado não tem relação com `id` da Câmara. Join com TSE por hash de CPF; fallback manual por nome+UF+partido, revisado à mão.
- 2026 renovou 2/3 do Senado: a maioria dos senadores eleitos não tem dado até fevereiro.

### Portal da Transparência (v1.1) — chave gratuita, uma só, usada apenas no cron.

## Modelo de dados (Supabase)

```
politicos      id, cargo, nome, nome_urna, slug, uf, partido, federacao, foto_url,
               cpf_hash, tse_sq_candidato, camara_id, senado_codigo,
               status, votos_2026, updated_at
mandatos       politico_id, cargo, inicio, fim, titular bool
eleitos_mun    municipio_ibge, cargo, politico_id, votos, posicao   (top-20 por município)
despesas_mes   politico_id, ano, mes, total, por_categoria jsonb
proposicoes    id_externo, casa, politico_id, tipo, numero, ano, ementa, data,
               proponente bool, status, url_oficial
votacoes       id_externo, casa, data, objeto, resultado, url_oficial, quiz bool
votos          votacao_id, politico_id, voto enum(sim,nao,abstencao,obstrucao,art17,ausente)
orientacoes    votacao_id, bancada, orientacao
```
Tudo com `upsert` por chave externa. Tamanho esperado de uma legislatura inteira: < 50 MB.

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
- Ao tocar em cálculo de indicador, atualizar `/como-funciona` no mesmo commit.
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
