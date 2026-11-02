# Fiscaliza — Plano por etapas

Cada etapa cabe numa sessão de trabalho (um dia). A ordem importa: cada uma usa o que a
anterior produziu. Marcar `[x]` quando concluída e registrar a sessão no `DIARIO.md`.

**Etapa atual: E21e** (atualizar esta linha ao avançar)

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
- [ ] Migração 0004; íntegra só de PL, PLP, PEC, PDL e PRC, contagem do resto (decisão de 2026-11-02).
      Câmara pelos arquivos anuais (`proposicoes`, `proposicoesAutores`, com `proponente`); Senado
      pelas autorias. Medir tempo e tamanho.
- Pronto quando: rodar duas vezes seguidas não duplica nada e o tamanho bate com `docs/VOLUME.md`.

### E22 · GitHub Actions
- [ ] Workflow diário: `politicos` → `despesas` → `proposicoes` → `votacoes`. Jobs isolados;
      falha num não bloqueia o seguinte. Log só no output do Actions.
- [ ] Secrets do Supabase. O cron é também o keep-alive do plano free.
- [ ] Data da última carga por fonte gravada (base da página `/atualizacoes`).
- Pronto quando: o primeiro run agendado termina verde e o site reflete dado novo.

## Passo 4 — Congresso completo, Brasil inteiro

Referência: `docs/REFERENCIA-POLITICOMETRO.md`, seções 1 e 2. Detalhar cada etapa ao chegar nela.

### E23 · Página do político: resumo do topo
Mandato atual e próximo, salário e "quanto custa o mandato" (ato legal), data da coleta,
"o que está e o que não está nesta página", redes declaradas ao TSE.

### E24 · Patrimônio e contas de campanha (TSE)
Patrimônio por eleição, sem descrição dos bens; arrecadado, gasto e % de dinheiro público.

### E25 · Propostas de autoria
Autor principal vs coautoria, "podem virar lei" vs pedidos, quantas viraram lei, filtro por ano.
Decisão de 2026-11-02: texto completo só de PL, PLP, PEC, PDL e PRC; o resto como contagem por
ano e tipo, com link. Carga inicial pelos arquivos anuais da Câmara (`proposicoesAutores`).
Decidir aqui se entram temas por palavra-chave da ementa.

### E26 · Todos os votos e fidelidade ao partido
Lista completa com filtros (ano, voto, busca); % de votos iguais à orientação do partido.

### E27 · Cota completa
Câmara e Senado: por mês, categoria e maiores fornecedores. Decisão de 2026-11-02: agregada, sem
nota a nota (não cabe no free); link para as notas na página oficial. CPF de fornecedor pessoa
física nunca é gravado.

### E28 · Comissões e equipe do gabinete
Participação em comissões (não as votações delas); pessoas, folha do mês e % do limite.

### E29 · Linha do tempo de candidaturas
TSE 2008–2026: cargo, votos, eleito por QP ou média (`lib/quociente.ts`).

### E30 · Votações do Plenário
`/votacoes` com todas as votações do período, filtros por Casa, data, tipo e busca.

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
ouvir a página · tema claro/escuro · servidor MCP.

Calendário: a posse é em 01/02/2027. Até lá, o Passo 3 e o Passo 4 cabem no ritmo de uma etapa
por dia (22 etapas depois da divisão da E21).

## Backlog (encaixar nos passos quando chegar a hora)

Emendas parlamentares (Portal da Transparência, chave única no cron) · "votação da semana" como
destaque em `/votacoes` · efetividade · suplentes · RSS/ICS · seguir tema (sem conta: no
localStorage) · dados abertos para download.

Já viraram etapas: fidelidade partidária (E26), patrimônio (E24), comparador (Passo 7).
Saíram com a mudança de escopo: alerta pré-votação (aviso real) e "quem vota como eu" (dependia
do quiz).

Fora de escopo permanece como está no `CLAUDE.md`.
