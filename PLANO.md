# Fiscaliza — Plano por etapas

Cada etapa cabe numa sessão de trabalho (um dia). A ordem importa: cada uma usa o que a
anterior produziu. Marcar `[x]` quando concluída e registrar a sessão no `DIARIO.md`.

**Etapa atual: E23e** (atualizar esta linha ao avançar). E22 fechada: o run agendado de 04/11 às 17h15 UTC
terminou verde. E22b, E23, E23b, E23c, E23i, E23k e E23l foram feitas adiantadas a pedido do usuário.

Regras de cada etapa:
- Tem um *entregável* verificável (arquivo, rota, teste) e um *critério de pronto*.
- Se o dado real contradizer o `CLAUDE.md`, corrigir o `CLAUDE.md` na mesma sessão.
- Nada sintético: lacuna vira anotação em `docs/LACUNAS.md`, nunca placeholder.

Calendário externo que afeta o plano:
- **01/01/2027** — corte do governismo (período de governo muda).
- **01/02/2027** — posse. Eleitos em 2026 passam a existir na API da Câmara e do Senado.
  Até lá, perfil deles vem só do TSE e o card mostra "primeiro voto em fevereiro".
- **Março/2027** — alvo da v1.1.

---

## Fase 0 — Fundação

### E0 · Repositório e convenções
- [x] `package.json` só com `tsx` e `typescript` (scripts da sonda rodam com `npx tsx`).
      Next.js entra só na E9.
- [x] `lib/types.ts` com os tipos internos iniciais (`Politico`, `Votacao`, `Voto`,
      `Orientacao`, `DespesaMes`, `EleitoMunicipio`). Serão revisados na E8 com dado real.
- [x] `lib/http.ts`: fetch com retry + backoff, timeout 30 s, log por endpoint.
      Usado por todos os adapters.
- [x] `LICENSE` (AGPL-3.0) e nota CC-BY 4.0 para `data/` no `README.md`.
- [x] `docs/LACUNAS.md` vazio, com o cabeçalho.
- Pronto quando: `npx tsx scripts/ping.ts` chama a Câmara (`/referencias/situacoesDeputado`)
  e o Senado (`/senador/lista/atual`, JSON) e imprime o status de cada um.

## Passo 1 — Sonda (JSON estático, ~20 políticos reais)

### E1 · TSE 2026: candidatos e votos de SP
- [x] Baixar `consulta_cand_2026` e `votacao_candidato_munzona_2026` (SP) de
      `dadosabertos.tse.jus.br` para `data/raw/` (ignorado no git).
      Atenção: CSV em latin1, separador `;`, cabeçalho em maiúsculas.
- [x] Processar com DuckDB via pacote npm (`@duckdb/node-api`); o CLI não está instalado.
- [x] Escolher a amostra: 10 deputados reeleitos SP, 5 deputados novos SP, 5 senadores
      (os 2 eleitos por SP em 2026 + 3 em exercício). Critério de escolha anotado em
      `docs/SONDA.md`.
- [x] `data/sonda/politicos-tse.json`: nome, nome de urna, partido, federação, UF,
      situação de totalização, foto, `sq_candidato`, `cpf_hash` (SHA-256, nunca o CPF).
- Risco: se o CSV de 2026 ainda não estiver publicado, parar e anotar. Não usar 2022
  como substituto de dado.
- Pronto quando: o JSON tem os 20 e nenhum campo vazio que a fonte preenchia.

### E2 · Câmara: perfil e join com o TSE
- [x] `lib/camara.ts` (adapter): `/deputados`, `/deputados/{id}`, `/orgaos`, `/historico`.
- [x] Join Câmara ↔ TSE por `cpf_hash` para os 15 deputados. Registrar quantos casaram;
      os que não casaram vão para `docs/LACUNAS.md` com fallback manual (nome+UF+partido).
- [x] `data/sonda/politicos-camara.json` (email, redes, situação, foto oficial).
- Pronto quando: os 10 reeleitos têm `camara_id` e os 5 novos estão marcados
  "sem registro na Câmara até 01/02/2027".

### E3 · Câmara: votações do plenário 2023–26 (lista + orientações)
- [x] `/votacoes?idOrgao=180` por janela de datas (a API limita o intervalo; paginar).
- [x] Para cada votação, `/orientacoes`. Descartar simbólicas (sem votos nominais).
- [x] `data/sonda/votacoes.json` e `data/sonda/orientacoes.json`.
- [x] Medir: quantas votações, quanto tempo levou, quantas falhas por endpoint.
      Isso dimensiona o cron da E18.
- Pronto quando: o JSON cobre 2023-01-01 até hoje e as falhas estão logadas, não escondidas.

### E4 · Câmara: votos nominais e os dois primeiros números
- [x] `/votacoes/{id}/votos` para **todas as 6.537 listadas** (a heurística do placar perde ~1%);
      a lista exata de nominais substitui `votacoes.json`. Tratar os 5 `tipoVoto`
      explicitamente e inferir `ausente` para quem não aparece.
- [x] `data/sonda/votos.json` só com os 10 reeleitos (reduz tamanho).
- [x] `lib/indicadores.ts`: `participacao()` e `governismo()` com testes
      (`vitest`, fixtures de dado real). Governismo por período de governo.
- Pronto quando: os testes passam e `docs/SONDA.md` tem a tabela com os dois números
  dos 10 reeleitos.

### E5 · Câmara: CEAP e média da bancada de SP
- [x] `/deputados/{id}/despesas?ano&mes` para os 10 reeleitos, 2025-01 até hoje.
- [x] Média da bancada SP: precisa de todos os deputados de SP em exercício. Medido: 538
      chamadas para 70 × 2 anos, 44 s. Feito para 2025→hoje inteiro.
- [x] `data/sonda/despesas.json` com `por_categoria`.
- Pronto quando: para um mês qualquer, o JSON responde "CEAP do político" e
  "média SP" sem cálculo na interface.

### E6 · Senado: adapter e votações
- [x] Ler `legis.senado.leg.br/dadosabertos/docs/` e confirmar o path atual das
      votações do plenário **antes** de codar. Anotar no `CLAUDE.md`. (É `/votacao`; os antigos
      estão deprecated.)
- [x] `lib/senado.ts`: lista atual, `/senador/{codigo}`, mandatos, licenças, votações,
      orientações. Normalizar os campos inconsistentes aqui; nada do shape cru sai deste arquivo.
- [x] Join Senado ↔ TSE (a API não tem CPF: nome completo + UF, método gravado em `join`).
- [x] `data/sonda/senadores.json`, `votacoes-senado.json`, `orientacoes-senado.json`,
      `votos-senado.json` (3 em exercício).
- Pronto quando: `participacao()` e `governismo()` rodam igual para senador e deputado.

### E7 · Quociente eleitoral e "seu voto contou para"
- [x] A partir do TSE: cadeiras por partido/federação em SP, tratando federação como
      lista única. Conferir contra o resultado oficial. (70/70 iguais ao relatório de totalização.)
- [x] Top-20 por município e cargo → `data/sonda/eleitos-mun.json`. (1.290/1.290 iguais ao JSON
      oficial de resultados; empatados com o 20º entram.)
- [x] `lib/quociente.ts` com testes.
- [x] Frase exata: "seu voto contou para [partido/federação], que elegeu N em SP".
- Pronto quando: para 3 municípios de tamanhos diferentes o top-20 bate com o TSE.

### E8 · Consolidação da sonda
- [x] Reescrever `lib/types.ts` com o que o dado real mostrou. (+ `Linha<T>` e `lib/linhas.ts`.)
- [x] `data/*.json` no shape final do modelo (`politicos`, `mandatos`, `eleitos_mun`,
      `despesas_mes`, `votacoes`, `votos`, `orientacoes`). Mesmo shape que irá ao Supabase.
      (+ `afastamentos`, `listas`, `municipios`, `despesas_media_uf`, `quiz`; 12 tabelas.)
- [x] Escolher 8–12 votações para o quiz com critério escrito em `docs/QUIZ.md`
      (votação nominal, relevância pública, resultado apertado ou tema claro). (10, proposta.)
- [x] `docs/SONDA.md`: o que o dado real ensinou, o que mudou no `CLAUDE.md`.
- [x] `fotoUrl` de quem não tem foto da Câmara/Senado pela URL pública do TSE (`lib/tse.ts#fotoUrlTse`).
- [x] Levar ao shape final o que a E7 gerou (`quociente.json` por lista, `eleitos-mun.json`).
- [x] Participação restrita aos mandatos em exercício ("sem mandato no período").
- [x] Bancada de SP inteira (perfis, votos, CEAP) para todo deputado em exercício do top-20.
- Pronto quando: um script `scripts/sonda/validar.ts` confirma que todo `politico_id`
  referenciado existe e nenhum campo obrigatório está vazio.

## Passo 2 — Protótipo (site lendo `data/*.json`)

### E9 · Next.js e camada de dados
- [x] **Antes de começar**: decidir as questões abertas listadas no fim da E8 em `docs/SONDA.md`
      (licença, secretas, P-NRV, mês da CEAP, nome da federação, quiz). Decididas em 2026-11-01;
      texto em `docs/METODOLOGIA.md`.
- [x] Next.js e shadcn/ui são dependências previstas no `CLAUDE.md`; confirmar mesmo assim
      antes de instalar. (Confirmado: Next + Tailwind agora; shadcn/ui na E10, só o Tooltip.)
- [x] Next.js 16 (App Router, TS, Tailwind 4) no projeto existente, sem `create-next-app`
      (o repositório já tinha package.json e tsconfig). shadcn/ui adiado para a E10.
- [x] `lib/repo.ts`: interface `Repo` (`getPolitico`, `buscarPorCidade`, `buscarPorNome`,
      `getVotacoesQuiz`, ...) com implementação `JsonRepo`. A E17 troca por `SupabaseRepo`
      sem tocar nos componentes.
- [x] Repositório privado `github.com/lucasmsze-ops/fiscaliza` com a `main`.
- [x] Deploy inicial na Vercel (Hobby) a partir da `main`. Headers `Referrer-Policy`.
      (Produção: https://fiscaliza-rho.vercel.app, servida de gru1.)
- Pronto quando: `/` abre em produção mostrando o nome de um político vindo do JSON.

### E10 · `PoliticoCard`
- [x] O único card: foto oficial, nome de urna, partido-UF, status, três números.
      "Concordância" oculta sem resposta; "primeiro voto em fevereiro" para quem não votou.
      (`lib/card.ts` monta, `components/PoliticoCard.tsx` só exibe; rótulos flexionados pelo
      gênero oficial do TSE/Senado; "afastado N dias" ao lado da participação.)
- [x] CEAP do mês vs média SP, com link para a página oficial da despesa (mês de referência,
      página de transparência da Câmara filtrada por deputado e mês).
- [x] Botão **Cobrar** (`mailto:` com assunto e corpo pré-preenchidos; a votação discordante
      entra na E13).
- [x] Tooltips para PEC, PL, MP, obstrução, quociente (+ os termos do card), com o popover
      nativo do HTML, sem dependência (`lib/glossario.ts`, `components/Termo.tsx`).
- Pronto quando: o card renderiza os 20 da sonda sem nenhum campo vazio ou inventado.
      (`/amostra`; `tests/card.test.ts`.)

### E11 · `/` — montar a colinha
- [x] Busca por cidade (lista de municípios SP do TSE) e por nome de urna. (Uma caixa só,
      sem acento nem caixa; índice de nomes em `/dados/politicos`, estático.)
- [x] Da cidade: mostra os eleitos do top-20; o usuário marca em quem votou. (Card compacto,
      posição e votos na cidade; 1 deputado e até 2 senadores, como na urna de 2026;
      `/dados/cidade/[ibge]`, 645 JSONs estáticos de ~0,6 KB.)
- [x] Colinha salva no `localStorage` e refletida na URL `/c/[ids]` (ids separados por `+`;
      página mínima com os cards, que a E12 completa).
- Pronto quando: você mesmo monta a colinha em menos de 1 minuto no celular.
      (Automatizado a 375 px: 22 s. Confirmado pelo usuário no próprio celular em 2026-11-01:
      menos de 1 minuto.)

### E12 · `/c/[ids]` — colinha e preview de compartilhamento
- [x] Cards + bloco "seu voto contou para" por político. (Só deputados; nome curto da lista e
      nome oficial no "?"; `CardDados.lista`.)
- [x] OG image com `next/og` (fotos buscadas na hora, única exceção ao "nunca proxiar").
      (`app/c/[ids]/opengraph-image.tsx`, 1200×630, 130–170 KB; Casa e período junto dos
      números; título e descrição com os números em `generateMetadata`.)
- [x] Botão compartilhar (Web Share API, fallback copiar link).
- Pronto quando: colar o link no WhatsApp mostra a colinha com os números.
      (Confirmado pelo usuário no WhatsApp em 2026-11-01: imagem, título e números aparecem.)

### E13 · `/votacoes` e quiz de concordância
- [x] Cada votação do quiz explicada em 3 parágrafos, com link oficial. (14 perguntas, ampliadas
      de 10 por decisão do usuário; textos só com ementa, palavras-chave e situação oficiais.)
- [x] Resposta do usuário no `localStorage`; `concordancia()` em `lib/indicadores.ts` com teste.
      (`lib/quiz.ts`: mínimo de 3 votos comparáveis, sempre "N de M".)
- [x] Terceiro número aparece no card depois do quiz.
- [x] Cobrar passa a incluir a votação discordante.
- Pronto quando: responder o quiz muda o card e o e-mail de cobrança. (Conferido a 375 px: Kim
      Kataguiri 54,5% (6 de 11) e e-mail citando o PLP 93/2023; Mara Gabrilli 28,6% (2 de 7);
      Derrite "poucos votos para comparar".)

### E14 · `/p/[slug]` — página do político
- [x] ISR `revalidate` 24 h. Card, histórico de votos 2023–26, CEAP mensal, contatos, cobrar.
      (438 páginas estáticas no build; `lib/pagina.ts`; votos por tipo fecham com a participação.)
- [x] Slug estável: nome de urna + UF (`kiko-celeguim-sp`), sem o cargo, por decisão do usuário
      (o cargo muda entre eleições). Homônimo na mesma UF vira erro, não sufixo por ordem.
- Pronto quando: LCP < 1 s em 4G simulado (Lighthouse mobile) na página mais pesada.
      (Medido pelo usuário em 2026-11-01 com o Lighthouse mobile do Chrome em `/p/giordano-sp`
      e `/p/kiko-celeguim-sp`: LCP abaixo de 1 s.)

### E15 · `/como-funciona` e acabamento
- [x] Metodologia de cada número, fontes com link, licenças, link para o código.
      (`app/como-funciona/page.tsx`, 12 seções com âncora em `lib/glossario.ts#SECOES`; os números
      da página saem do `repo`, nada digitado à mão. Rodapé global `components/Rodape.tsx`.)
- [x] Analytics cookieless (Vercel Web Analytics, plano free) ou nenhum. (Nenhum nesta versão:
      exigiria a dependência `@vercel/analytics`; a página de privacidade diz "sem medição de
      audiência". Rever se o usuário quiser medir o teste da E16.)
- [x] Revisão de textos: sem adjetivo sobre político em lugar nenhum. (Busca por qualificativos em
      `app/`, `components/`, `lib/` e nos 14 textos do quiz: nenhum; só nomes de variável.)
- Pronto quando: toda métrica da interface linka para a seção correspondente.
      (O popover de cada termo do card tem "Como calculamos" → `/como-funciona#secao`; as seções
      da página do político têm "como contamos"; a lista da cidade e o quiz linkam a sua seção.
      Conferido em `/p/kiko-celeguim-sp`, `/`, `/votacoes` a 375 px.)

### E16 · Teste com 5 pessoas (suspensa em 2026-11-01)
- [ ] Roteiro: "digite sua cidade e monte sua colinha". Cronometrar.
      (Roteiro, critério de sucesso e ficha prontos em `docs/TESTE-USUARIOS.md`; falta aplicar
      com as 5 pessoas e cronometrar.)
- [ ] Registrar achados em `docs/TESTE-USUARIOS.md`. Ajustar o que impediu o < 1 min.
      (Piloto feito: a lista da cidade cobre 67% dos votos para deputado no estado e 57% na capital;
      busca por número de urna, palavra por palavra e por mais votados, e aviso "Não está na
      lista?", antes do teste. Achados das pessoas: pendente.)
- Pronto quando: 4 de 5 conseguem em < 1 min sem ajuda.
      (Rodada 1, relato do usuário em 2026-11-01: menos de 5 pessoas, todas em < 1 min sem ajuda,
      todas acharam o deputado na lista da cidade. Falta: completar 5 e alguém que use a busca.)
      **Suspensa** pela mudança de escopo de 2026-11-01: o teste volta na E34, sobre o site
      redesenhado, com o mesmo roteiro (`docs/TESTE-USUARIOS.md`).

## Mudança de escopo (2026-11-01)

Decisão do usuário, a partir de `docs/REFERENCIA-POLITICOMETRO.md`: ter praticamente todas as
funcionalidades do politicometro.org, menos presença em sessões, discursos, conta e avisos reais
(só *fake door*) e régua esquerda–direita; e tirar do Fiscaliza o quiz de concordância, o botão
Cobrar e "seu voto contou para". O `CLAUDE.md` foi reescrito (escopo, princípios 1, 3, 4, 5 e 6,
fases, fora de escopo, card). As etapas antigas E17–E21 viraram E19–E22.

## Passo 3 — Redirecionamento e infra

### E17 · Tirar quiz, Cobrar e "seu voto contou para"
- [x] Remover `/votacoes` (quiz), `components/{Quiz,QuizNoCard,useRespostas}.tsx`, `lib/quiz.ts`,
      `CardDados.quiz`, `CardDados.lista`, `CardDados.cobrar`, `data/quiz.json`, `votacoes.quiz`, e
      os testes e textos correspondentes (`/como-funciona`, glossário, OG, `docs/METODOLOGIA.md`).
      `lib/quociente.ts` fica (linha do tempo de candidaturas, E29). (Também saíram
      `concordancia()`, `fraseVotoContou()`, `scripts/sonda/quiz-fontes.ts` e os JSONs do quiz na
      sonda; `docs/QUIZ.md` arquivado. `consolidar.ts` modificado gera o mesmo `votacoes.json`.)
- [x] **Como cobrar** no card e na página: contato do gabinete e canais oficiais (ouvidoria da
      Câmara ou do Senado, Fala.BR, MPF e TCU), com os endereços conferidos nas páginas oficiais.
      (`lib/cobrar.ts`, `components/ComoCobrar.tsx`, fechado por padrão; só com mandato em curso.)
- [x] **Receber avisos** (fake door) no card, na página do político e na colinha: toque abre a
      explicação "ainda não existe"; nenhum campo de contato. A contagem anônima entra com o
      Supabase (E19). (`components/ReceberAvisos.tsx`, popover nativo; não aparece para quem não
      tem nem terá mandato.)
- Pronto quando: build e testes passam, nenhuma tela cita quiz, concordância, Cobrar com e-mail
  pronto ou "seu voto contou para", e o card mostra dois números, Como cobrar e Receber avisos.
  (55 testes, build ok; conferido a 375 px em `/p/kiko-celeguim-sp`, Mara Gabrilli, Lucas
  Pavanato, João Paulo Cunha, Rui Falcão, a colinha e `/como-funciona`; `/votacoes` dá 404.)

### E18 · Volume e custo do Brasil inteiro (porteira do princípio 1)
- [x] Estimar linhas e MB por tabela para 513 deputados e 81 senadores, a partir da sonda de SP:
      votos, orientações, despesas (Câmara e CEAPS), proposições, patrimônio, contas de campanha,
      equipe de gabinete, candidaturas. (`docs/VOLUME.md`: ~150 MB de JSON, 220–300 MB no
      Postgres, sem cota nota a nota e sem a íntegra das proposições não legislativas.)
- [x] Conferir nas páginas oficiais os limites atuais do Supabase free, da Vercel Hobby (build,
      ISR, banda) e do GitHub Actions (repo público vs privado).
- [x] Testar se as APIs oficiais respondem a partir de um runner do GitHub (fora do Brasil).
      (`scripts/rede.ts` + `.github/workflows/rede.yml`; local: 15 de 15; runner: 14 de 15 em duas
      execuções. O IBGE não aceita conexão do runner: municípios gerados localmente e versionados.)
- Pronto quando: tabela volume × limite, com margem, e a lista do que cabe; o que não couber vira
  decisão do usuário antes da E19.

### E19 · Supabase e schema
- [x] Projeto free. Migrações com as tabelas atuais (sem `quiz`) e `avisos_interesse`
      (página, tipo, dia, contagem; sem nada que identifique quem tocou). RLS: anon só lê, exceto
      incrementar a contagem por função. (`supabase/migrations/0001_init.sql` pronta e testada num
      Postgres 17 local (PGlite): carga completa, permissões, `registrar_aviso`, `tamanhos()`.
      Projeto criado pelo usuário em 2026-11-02, região São Paulo; migração rodada no SQL Editor.)
- [x] `scripts/seed.ts`: carrega `data/*.json` nas tabelas. (Upsert por chave via API REST, só
      `fetch` (`lib/supabase.ts`), sem dependência nova; `npm run seed`; conferência em
      `npm run supabase:conferir`.)
- Pronto quando: `select count(*)` de cada tabela bate com o JSON.
      (`npm run supabase:conferir`: 11 de 11 batem; 14,4 MB no Postgres, 1,47× o JSON, 2,9% de
      500 MB. Seed em 17 s; rodado duas vezes sem duplicar.)

### E20 · `SupabaseRepo`
- [x] Implementar a interface `Repo` sobre o Supabase. Trocar por variável de ambiente.
      (`lib/repo-supabase.ts`, `FISCALIZA_DADOS=supabase`; `Repo` ganhou `getCard`/`getPagina`, que
      no Supabase leem a tabela `resumos` (migração 0002, `npm run precalcular`, só grava o que mudou).)
- [x] Nenhum componente muda. Rodar o site inteiro nos dois modos. (Builds nos dois modos: 1.089 de
      1.089 páginas e rotas com o mesmo conteúdo, depois de fixar a ordem de exibição dos totais de
      voto (o `jsonb` reordena chaves) e o desempate da lista da cidade pelo número de urna. Colinha e
      imagem de compartilhamento conferidas em tempo de execução lendo do Supabase.)
- Pronto quando: o site em produção lê do Supabase e as páginas continuam < 1 s.
      (2026-11-02: produção com `fiscaliza-dados=supabase` em todas as páginas, números
      conferidos. Com as funções em São Paulo (`vercel.json`, `gru1`): colinha inédita 0,16–0,54 s,
      páginas em cache 0,05–0,08 s; só a primeira visita depois de um deploy, com a função fria,
      levou 1,7 s. Antes, com as funções em Washington: 0,9–1,1 s.)

### E21 · Cron do Congresso, Brasil inteiro (dividida em 2026-11-02)
A etapa original juntava cinco trabalhos de um dia cada e não incluía o TSE nacional, sem o qual a
colinha não funciona fora de SP. Dividida em E21a–E21e; o desenho do cron está em `docs/CRON.md`.

### E21a · Estado do cron, publicação por diferença e votações
- [x] `scripts/cron/`: estado local (`estado/dados`, `estado/publicado`, `estado/fontes`), validação
      antes de publicar, publicação só das linhas novas ou alteradas, resumos só onde mudaram.
- [x] Job `votacoes`: Câmara e Senado, incremental (última data − 14 dias), respostas brutas em
      cache. Montagem das linhas em `lib/linhas-votacao.ts`, a mesma da consolidação da sonda.
- Pronto quando: rodar duas vezes seguidas não duplica nada.
      (2026-11-02: com 19 votações retiradas do estado, o cron as rebaixou e publicou, e as contagens
      do Supabase continuaram iguais às do estado; a segunda execução enviou 0 linhas e 0 resumos,
      em 5 s. Primeira execução com estado limpo: 8 s.)

### E21b · TSE 2026 no Brasil inteiro
- [x] Candidatos a deputado federal e senador das 27 UFs; top-20 de cada uma das 5.570 cidades;
      listas e quociente dos 27 estados, conferidos contra os relatórios oficiais de totalização.
      (`scripts/tse/nacional.ts` → `estado/fontes/tse-2026/`: 3.632 políticos (todos os do top-20 e
      todos os eleitos), 458 listas, 172.329 linhas de top-20. Gabarito do quociente: a situação de
      cada candidato no TSE (ELEITO POR QP / POR MÉDIA), 0 divergências nos 27 estados, 513 vagas.
      Top-20 da maior cidade de cada estado = JSON oficial em 54 de 54. SP idêntico ao publicado.)
- [x] Municípios e códigos IBGE gerados localmente e versionados (o IBGE não responde ao runner).
      (`scripts/tse/municipios.ts` → `data/municipios-ibge.json`: 5.571, 13 grafias no de-para.)
- Pronto quando: as tabelas nacionais estão geradas e conferidas. **Publicação na E21c** (mudança
      de 2026-11-02): sem o cruzamento com Câmara e Senado, quem está em exercício fora de SP
      apareceria com "primeiro voto em fevereiro" e suplente que exerceu, "sem mandato".

### E21c · Parlamentares em exercício no Brasil inteiro
- [x] 513 deputados e 81 senadores em `politicos`, `mandatos` e `afastamentos`, ligados ao TSE pelo
      CPF em memória (Câmara) e pelo nome completo + UF (Senado).
      (`scripts/cron/parlamentares.ts`: 648 da legislatura 57 e 81 senadores, todos ligados; 3.724
      políticos, 92 além do TSE 2026. Regras de mandato em `lib/linhas-mandato.ts`.)
- [x] Votos de todos desde 2023: arquivos anuais da Câmara (`votacoesVotos`) e `/votacao` do Senado.
      (Pelas respostas brutas por votação (Câmara, cache da sonda) e do `/votacao` ano a ano (Senado),
      sem os arquivos anuais: 456.387 votos de 578 políticos com camaraId e 81 senadores.)
- [x] Publicar junto as tabelas da E21b (estado/fontes/tse-2026), com o status "reeleito" vindo do
      cruzamento; conferir a colinha a partir de cidades de vários estados.
      (Publicado em 2026-11-02 em 2 min 20 s: 570 mil linhas, 3.293 resumos; 11 de 11 contagens
      batem; banco com 121 MB. Site: páginas de político e cidades geradas na primeira visita.)
- Pronto quando: a colinha funciona a partir de qualquer cidade do país e a página de qualquer
      parlamentar em exercício abre com os números.

### E21d · Cota parlamentar no Brasil inteiro
- [x] Câmara pela API (27 UFs, média por UF; mês fechado = total igual ao da coleta anterior, que
      agora é o publicado) e Senado pela CEAPS (API `adm.senado.gov.br`). Sem CPF de fornecedor.
      (Feito em 2026-11-02: job `cota`, migração 0003 com `casa`; média = todos da UF com lançamento
      no mês, inclusive quem saiu; primeira coleta fecha até jul/2026, o último mês fechado de SP.)
- Pronto quando: o card de senador ganha a cota e as médias das 27 bancadas batem com a soma.

### E21e · Proposições
- [x] Migração 0004; íntegra só de PL, PLP, PEC, PDL e PRC, contagem do resto (decisão de 2026-11-02).
      Câmara pelos arquivos anuais (`proposicoes`, `proposicoesAutores`, com `proponente`); Senado
      pelas autorias. Medir tempo e tamanho.
      (Feito em 2026-11-02: job `proposicoes`; 25.588 proposições, 40.555 autorias, 19.533 contagens,
      ~18 MB; duas execuções seguidas, a segunda sem nada novo. No Senado, PRS no lugar de PRC.)
- Pronto quando: rodar duas vezes seguidas não duplica nada e o tamanho bate com `docs/VOLUME.md`.

### E22 · GitHub Actions
- [x] Workflow diário: `politicos` → `despesas` → `proposicoes` → `votacoes`. Jobs isolados;
      falha num não bloqueia o seguinte. Log só no output do Actions.
      (`.github/workflows/cron.yml`, 06:17 de Brasília; ordem real: parlamentares → votações → cota →
      proposições, como no `npm run cron`.)
- [x] Secrets do Supabase. O cron é também o keep-alive do plano free.
      (`SUPABASE_URL` e `SUPABASE_SECRET_KEY`; run manual verde em 2026-11-03.)
- [x] Estado na primeira execução: os arquivos do TSE, o cache de votos e os 356 MB de CSV de
      proposições da Câmara só existem na máquina local (`docs/VOLUME.md`, E21e).
      (Cache do Actions + release `estado-inicial` (30 MB, sem CPF); `consulta_cand` baixado a cada
      execução e apagado; votos da sonda copiados para o estado; proposições da Câmara viram
      extrato por ano e os CSVs são apagados.)
- [x] Data da última carga por fonte gravada (base da página `/atualizacoes`). (Tabela
      `atualizacoes`, migração 0005.)
- Pronto quando: o primeiro run agendado termina verde e o site reflete dado novo.
  (Feito: run agendado 41875775412 verde em 2026-11-04, com as siglas PCdoB publicadas.)

### E22b · Visual do protótipo
Tema claro do protótipo do Claude Design (`docs/PROTOTIPO.md`, seção Visual) nas páginas que já
existem (`/`, `/c/[ids]`, `/p/[slug]`, `/como-funciona`), sem conteúdo novo.
- [x] Tokens no `app/globals.css`: fundo, card, teal, texto. Tema escuro derivado dos mesmos tokens.
      (Viram cores do Tailwind: `bg-card`, `border-borda`, `bg-destaque`, `text-suave`...)
- [x] Roboto por `next/font`, servida pelo site. (Um arquivo de 37 KB, pré-carregado, `swap`.)
- [x] Menu lateral e barra do topo com a busca. No celular, barra no rodapé ou gaveta (medir).
      (Gaveta por popover nativo: o rodapé do celular é da barra "Ver colinha". Menu só com páginas
      que existem. A busca do topo abre a entrada com `/?q=`.)
- [x] Reler o protótipo antes de começar (pode ter mudado).
- Pronto quando: as páginas atuais com o visual novo, medidas no celular (colinha e página do
  político em < 1 s no 4G), sem nenhum número diferente.

## Passo 4 — Congresso completo, Brasil inteiro

Referência: `docs/REFERENCIA-POLITICOMETRO.md`, seções 1 e 2. Referência visual e campo a campo:
`docs/PROTOTIPO.md` (que tela vai em que etapa e as decisões abertas). Detalhar cada etapa ao chegar nela.

Decisão de 2026-11-03: antecipar as telas do protótipo que já têm dado real no banco (E23 a E23d),
antes das que pedem coleta nova. Só dado real: bloco cujo dado ainda não é coletado não aparece
(nem vazio, nem "em breve"); "—" só para o que a fonte oficial não publica.

### E23 · Crachá: página do político no layout do protótipo
Mandato atual e próximo, salário e "quanto custa o mandato" (ato legal), data da coleta,
"o que está e o que não está nesta página", redes declaradas ao TSE. Layout do crachá do protótipo
(`docs/PROTOTIPO.md`) só com o que já está no banco: participação, governismo, cota contra a média,
mandatos e afastamentos, últimas votações, propostas de autoria (resumo). Sem perder "Como cobrar"
e "Receber avisos". Fora até ter dado: patrimônio (E24), "votou com o partido" (E26), emendas
(decisão 3), "quem vota mais parecido" (decisão 2). "Monitorar" espera a decisão 1 (não bloqueia).
- [x] Crachá (`components/Cracha.tsx`) com os mesmos `CardDados`: em exercício desde, participação,
      governismo, cota. Abas Propostas (novas no resumo da página) e Votos.
- [x] Salário: DL 172/2022, art. 1º, conferido no texto oficial (`lib/salario.ts`, teste).
- [x] Data da coleta (`atualizacoes`) e "o que está e o que não está nesta página", só com o que a
      página mostra.
- [x] Metodologia de propostas e salário em `/como-funciona` e `docs/METODOLOGIA.md`.
- Saíram para quando houver dado: redes declaradas ao TSE (E24), "quanto custa o mandato" (E27).
- Pronto quando: a página do político no layout do crachá, só com dado real, no ar com as propostas.

### E23b · Congresso: bancadas e o que já foi votado
Página `/congresso` com o que já existe: Plenário em bolinhas por partido (parlamentares em
exercício, Câmara e Senado), lista de quem está em cada bancada, últimas votações nominais com
placar e "o que virou lei" (`proposicoes.virou_norma`). Agenda e pauta ficam na E32 (coleta nova).
- [x] Cadeiras de hoje: mandato em curso sem afastamento na data (`lib/congresso.ts#emExercicio`):
      513 e 81, iguais à lista de exercício da Câmara (diferença só da troca de cadeira posterior
      à coleta). Plenário em SVG, bancadas por tamanho, 8 cores validadas + "outros"; a lista com
      nome e cadeiras é o conteúdo (`components/Plenario.tsx`).
- [x] Últimas 10 votações nominais das duas Casas com placar; secreta e votação de pessoa sem
      direção dizem isso, nunca "0 sim". "O que virou norma": as 10 mais recentes.
- [x] Consultas enxutas no `Repo` (mandatos em curso, afastamentos na data, `limit`), menu,
      metodologia "Congresso hoje", testes.
- Pronto quando: `/congresso` no ar só com dado real, conferido contra a fonte.
- [x] Refeita no layout da tela Congresso do protótipo (2026-11-04, pedido do usuário): cabeçalho com
      as votações do ano, Plenário interativo (Casa, Hoje / A partir de fev/2027 só na Câmara, estado,
      destaque do partido, bancada em cartões), agenda do mês com votações por dia, votações da
      última sessão por Casa. Ocultos sem dado: "sem sessão agora / próxima sessão" e a pauta marcada.

Decisão de 2026-11-04 (usuário): o site fica igual ao protótipo, tela por tela, com dado real; o que
não tem dado ainda fica oculto. A colinha sai da interface (links `/c/...` redirecionam). Monitorar
só neste aparelho (localStorage), sem Entrar nem conta. Uma tela por etapa, push aprovado a cada uma.

### E23c · Visão geral (página inicial do protótipo)
`/` vira a Visão geral: mapa por região e estado (contornos `geodata-br-states`, MIT, dados do
IBGE), busca de cidade, painel do estado com os 3 senadores e a contagem de deputados federais e
municípios; "Quem está no cargo hoje" (Senadores, Deputados federais; os outros cargos ocultos até o
Passo 5); lista A–Z com filtros de cargo, nome, partido, estado e letra. Barra do topo com a busca
de político e página. Sai a colinha (`MontarColinha`, OG da colinha); `/c/[ids]` redireciona para o
crachá. Menu com os itens do protótipo que já existem.
- [x] Mapa (`components/MapaBrasil.tsx`, contornos em `lib/mapa-brasil.ts`), regiões, busca de
      cidade (as 5.571, baixadas ao tocar), painel do estado: 3 senadores, deputados federais e
      municípios (conferido: MG 3 / 53 / 853). Título "Quem representa cada estado" no lugar de
      "Quem governa" até haver governadores (Passo 5).
- [x] "Quem está no cargo hoje" (81 e 513, a mesma regra de `/congresso`) e lista A–Z com cargo,
      nome, partido, estado e letra, fotos oficiais e "Ver crachá".
- [x] Busca da barra do topo (`components/BuscaTopo.tsx`) sobre `/dados/politicos` e as páginas.
- [x] Colinha fora: `MontarColinha`, OG da colinha e `/dados/cidade` removidos; `/c/[ids]` → 308
      para o crachá do primeiro. Menu: Visão geral, Congresso, Sobre (= `/como-funciona`).
- Pronto quando: a página inicial igual à Visão geral do protótipo, só com dado real, no ar.

### E23d · Me representa (Congresso)
Cidade ou estado → os 3 senadores e os deputados federais da UF, com a contagem da Constituição e
os anéis "Em Brasília / No seu estado". Governador, deputados estaduais, prefeito e vereadores
ocultos até o Passo 5.
- [x] `/me-representa` (aba no menu): busca por cidade (5.571) ou estado, exemplos, anel "Em Brasília"
      com o que cada cargo faz; resultado com os senadores e os deputados federais em exercício
      (8 primeiros e "Ver todos"); lugar na URL (`?uf=SP`, `?cidade=<IBGE>`) para compartilhar.
- [x] UF da cadeira em `mandatos.uf` (migração 0007): com a UF da candidatura de 2026, SP tinha 68
      deputados e CE, PR e RR um a mais. Agora as 27 bancadas batem com a Constituição.
- Ocultos: o anel e o bloco "No seu estado", presidente e vice (Passo 5), "Monitorar" (E23e) e
  "Comparar lado a lado" (E23f).
- Pronto quando: a tela no ar, com a 0007 rodada antes do push e os mandatos republicados.

### E23e · Monitorando neste aparelho
"+ Monitorar" no crachá, na Me representa e na lista; tela Monitorando com quem a pessoa acompanha
e "o que aconteceu desde a última visita" (votos, propostas, cota), tudo no localStorage. Sem Entrar,
sem e-mail, sem alertas (princípio 3). Sino e contagem no menu e na barra do topo.

### E23f · Comparar
`/comparar`, 2 a 5 lado a lado, sem nota nem ranking; "Comparar com outro político" no crachá. Só
as linhas com dado (partido, salário, cota, votos na eleição, propostas, participação, mandatos);
patrimônio entra com a E24, idade só se a data de nascimento do TSE passar a ser gravada.

### E23g · Propostas
`/propostas`: lista geral com filtros (Casa, tipo, situação, busca na ementa) e link oficial. A
linha do tempo da tramitação fica oculta (só a situação atual é coletada).

### E23h · Cargos e Dicionário
`/cargos` e `/dicionario`: texto fixo com fonte legal (Constituição, regimentos). O Dicionário
junta os termos de `lib/glossario.ts`, sem duplicar.

### E23i · Crachá completo
O que falta do crachá do protótipo com dado que já existe: "Votou com o partido?" (orientação do
partido × voto), participação ao lado da média da Casa e "Quem vota mais parecido" (votações
nominais em comum, % de votos iguais, mínimo de votações; regra em `/como-funciona`). Patrimônio e
emendas seguem ocultos até ter dado.
- [x] Crachá no layout do protótipo (`components/Cracha.tsx`): faixa, foto redonda, "Senadora pelo
      Pará", sigla e nome do partido (TSE, `lib/partidos.ts`), "em exercício desde · mandato até" (fim
      da legislatura ou 8 anos da posse do senador titular), salário e participação.
- [x] Participação ao lado da média de quem está em exercício na Casa e "quem vota mais parecido"
      (`lib/comparacoes.ts`, vetores por Casa uma vez por execução; 3.724 páginas em ~2 s).
- [x] Abas em pílula (`components/AbasMandato.tsx`): Propostas em tabela com ano e busca, lista
      completa sob demanda (`/dados/propostas/[id]`); Votos em tabela com voto e resultado.
- [x] Fora da página por decisão do usuário: governismo, cota, mandatos, contatos, Como cobrar,
      Receber avisos (seguem no resumo). Ocultos sem dado: patrimônio, emendas, tema das propostas.
- [x] "Votou com o partido?" (pizza) e a coluna "orientação do partido" na aba Votos: partido no dia
      de cada voto (caches das fontes), bancada = partido, federação ou bloco que o lista
      (`lib/fidelidade.ts`, `scripts/cron/fidelidade.ts`); bloco de nome cortado sem o partido fica
      fora (quase todo 2025 de MDB, Republicanos, Podemos, PSDB); mínimo de 20 votações.
- Pronto quando: o crachá no layout do protótipo, só com dado real, no ar com os números novos.

### E23j · Temas das propostas e votações
Classificação oficial de tema, nas duas Casas: Câmara, arquivo anual `proposicoesTemas-{ano}.csv`
(ex.: "Meio Ambiente e Desenvolvimento Sustentável"); Senado, `classificacoes` de `/processo/{id}`
(ex.: "Segurança Pública"). Coluna de temas em `proposicoes` (migração), coleta no job
`proposicoes` (Senado: reabrir os ~2.900 processos já em cache, 2 em voo), filtro "tema" na aba
Propostas do crachá (o do protótipo) e etiqueta de tema nas votações (pela matéria principal).
- Pronto quando: cada proposta e votação mostra o tema oficial, e a aba Propostas filtra por ele.

### E23k · Ajustes de layout e página da votação (pedido de 2026-11-04)
- [x] Menu do celular em abas (no lugar do botão que abria a gaveta).
- [x] Cor oficial de cada partido (Wikidata P465) em todas as telas; nenhum partido em cinza.
- [x] Visão geral: "Quem está no cargo hoje" com chips de cargo (Senadores já selecionado) e a lista sempre aberta.
- [x] Congresso: sem o cartão de contagem; Câmara e Senado em abas; chips só para Hoje / a partir de fev/2027;
      agenda só com dias úteis e uma bolinha nos dias com votação; cartões de votação no formato do print.
- [x] `/votacoes/[id]`: cabeçalho (o que foi votado, regra do tipo), resultado com votos necessários, "O que
      era" (ementa oficial e termos jurídicos), caminho no Plenário, como votou cada partido. Pré-calculada no
      cron (`resumos_votacao`, migração 0006).
- [ ] Palavras-chave oficiais da Câmara (indexação) e tema (E23j): ainda não coletados, fora da página.
- [x] Link da aba Votos do crachá para a página da votação (E23l: `votacaoId` no resumo do político).
- Pronto quando: as telas acima no ar, com a migração 0006 rodada antes do push. (No ar em 2026-11-04.)

### E23l · Página Votações e link da aba Votos (pedido de 2026-11-04)
- [x] `/votacoes` com a Agenda do Plenário e as Votações da última sessão, iguais às de /congresso, que
      fica só com "Como está o Congresso". Aba Votações no menu (no celular, só texto até 440 px: as 4 abas
      cabem em 375 px).
- [x] Na aba Votos do crachá, o título de cada votação abre `/votacoes/[id]`.
- Pronto quando: no ar, com os 658 resumos regravados pelo cron. (No ar em 2026-11-05.)

### E24 · Patrimônio e contas de campanha (TSE)
Patrimônio por eleição, sem descrição dos bens; arrecadado, gasto e % de dinheiro público. Redes
sociais declaradas ao TSE (veio da E23). Bloco de patrimônio do crachá.

### E25 · Propostas de autoria
Autor principal vs coautoria, "podem virar lei" vs pedidos, quantas viraram lei, filtro por ano.
Aba Propostas do crachá (a lista geral `/propostas` foi antecipada para a E23g). A linha do tempo da tramitação só se a tramitação for coletada (hoje só a situação atual).
Decisão de 2026-11-02: texto completo só de PL, PLP, PEC, PDL e PRC; o resto como contagem por
ano e tipo, com link. Carga inicial pelos arquivos anuais da Câmara (`proposicoesAutores`).
Decidir aqui se entram temas por palavra-chave da ementa.

### E26 · Todos os votos e fidelidade ao partido
Lista completa com filtros (ano, voto, busca); % de votos iguais à orientação do partido. Aba Votos
do crachá completa. "Votou com o partido?", a coluna de orientação e a participação ao lado da média
já vieram na E23i; aqui, a lista inteira de votos com filtros e, se der, a composição histórica dos
blocos de 2025 (hoje fora da conta).

### E27 · Cota completa
Câmara e Senado: por mês, categoria e maiores fornecedores. "Quanto custa o mandato" (veio da
E23): salário, cota, verba de gabinete e auxílios, cada um com o ato legal ou a fonte. Decisão de 2026-11-02: agregada, sem
nota a nota (não cabe no free); link para as notas na página oficial. CPF de fornecedor pessoa
física nunca é gravado.

### E28 · Comissões e equipe do gabinete
Participação em comissões (não as votações delas); pessoas, folha do mês e % do limite.

### E29 · Linha do tempo de candidaturas
TSE 2008–2026: cargo, votos, eleito por QP ou média (`lib/quociente.ts`).

### E30 · Votações do Plenário
`/votacoes` com todas as votações do período, filtros por Casa, data, tipo e busca. As últimas
votações e o Plenário em bolinhas já vieram na E23b.

### E31 · Detalhe da votação
`/votacoes/[id]`: o que é, o que foi votado, quórum, placar, voto e orientação de cada partido,
filtro por UF, caminho da proposta.

### E32 · Agenda e pauta do Plenário
Pela rotina do cron, nunca consulta ao vivo (princípio 2).

### E33 · Compartilhar e corrigir
Card por político para baixar (feed e stories, `next/og`), "reportar erro" e "direito de resposta"
por `mailto:`, página `/atualizacoes`.

### E34 · Fechamento do Passo 4 e teste com 5 pessoas
Definição de pronto do `CLAUDE.md`, item por item, no celular; roteiro da E16 com 5 pessoas de
estados diferentes; preparar o join dos eleitos para a posse de 01/02/2027.

## Passo 5 — Todos os eleitos (detalhar ao chegar)
Governadores, deputados estaduais, prefeitos, vereadores e presidente pelo TSE; páginas de estado
e de cidade com "quem me representa"; diretório; resultados de eleições.

## Passo 6 — Legislativos estaduais e municipais (detalhar ao chegar)
Presença fica fora; votos e propostas só onde há dado aberto por API (ex.: SAPL). Fonte sem dado
aberto aparece como lacuna, com o porquê.

## Passo 7 — Contexto (detalhar ao chegar)
Comparar (2 a 5 lado a lado) · governos e indicadores · partidos (sem régua) · cargos ·
dicionário · mais vistos (analytics cookieless) · impostômetro · STF (só com fonte aberta) ·
ouvir a página · tema claro/escuro · servidor MCP. Comparar, Cargos e Dicionário foram antecipados
(E23f, E23h).

Calendário: a posse é em 01/02/2027. Até lá, o Passo 3 e o Passo 4 cabem no ritmo de uma etapa
por dia (22 etapas depois da divisão da E21).

## Backlog (encaixar nos passos quando chegar a hora)

Emendas parlamentares (Portal da Transparência, chave única no cron; aba do crachá no protótipo,
decisão 3 em `docs/PROTOTIPO.md`) · "votação da semana" como
destaque em `/votacoes` · efetividade · suplentes · RSS/ICS · seguir tema (sem conta: no
localStorage) · dados abertos para download.

Já viraram etapas: fidelidade partidária (E26), patrimônio (E24), comparador (Passo 7).
Saíram com a mudança de escopo: alerta pré-votação (aviso real) e "quem vota como eu" (dependia
do quiz).

Fora de escopo permanece como está no `CLAUDE.md`.
