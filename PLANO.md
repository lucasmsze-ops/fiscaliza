# Fiscaliza — Plano por etapas

Cada etapa cabe numa sessão de trabalho (um dia). A ordem importa: cada uma usa o que a
anterior produziu. Marcar `[x]` quando concluída e registrar a sessão no `DIARIO.md`.

**Etapa atual: E16** (atualizar esta linha ao avançar)

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

### E16 · Teste com 5 pessoas
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

## Passo 3 — Infra (Supabase + cron)

### E17 · Supabase e schema
- [ ] Projeto free. `supabase/migrations/0001_init.sql` com as 7 tabelas, chaves externas
      para `upsert` e RLS: anon só lê.
- [ ] `scripts/seed.ts`: carrega `data/*.json` nas tabelas.
- Pronto quando: `select count(*)` de cada tabela bate com o JSON.

### E18 · `SupabaseRepo`
- [ ] Implementar a interface `Repo` sobre o Supabase. Trocar por variável de ambiente.
- [ ] Nenhum componente muda. Rodar o site inteiro nos dois modos.
- Pronto quando: o site em produção lê do Supabase e as páginas continuam < 1 s.

### E19 · Scripts de cron
- [ ] `scripts/cron/{politicos,despesas,proposicoes,votacoes}.ts`, cada um idempotente,
      reaproveitando os adapters da sonda. `upsert` por chave externa.
- [ ] Expandir da amostra para todos: 513 deputados + 81 senadores. Medir tempo total.
- [ ] `proposicoes`: filtrar coautorias via `/proposicoes/{id}/autores` (`proponente = true`).
- Pronto quando: rodar duas vezes seguidas não duplica nada.

### E20 · GitHub Actions
- [ ] Workflow diário: `politicos` → `despesas` (dias 1–5) → `proposicoes` → `votacoes`.
      Jobs isolados; falha num não bloqueia o seguinte. Log só no output do Actions.
- [ ] Secrets do Supabase. O cron é também o keep-alive do plano free.
- Pronto quando: o primeiro run agendado termina verde e o site reflete dado novo.

### E21 · Fechamento do MVP
- [ ] Passar a "Definição de pronto do MVP" do `CLAUDE.md` item por item, no celular.
- [ ] `README.md` final; dados derivados publicados com CC-BY 4.0.
- [ ] Preparar o join dos eleitos para 01/02/2027 (o cron `politicos` precisa casar os
      novos `camara_id`/`senado_codigo` com o TSE automaticamente).
- Pronto quando: todos os itens da definição de pronto estão marcados.

---

## Backlog (não detalhar antes do MVP)

**v1.1 (março/2027):** emendas por município (Portal da Transparência, chave única no cron) ·
alerta pré-votação (web push) · "votação da semana".

**v1.2:** fidelidade partidária · efetividade · comparador · quem vota como eu · suplentes ·
patrimônio 2022→2026 (`bem_candidato`) · RSS/ICS · seguir tema · dados abertos.

Fora de escopo permanece como está no `CLAUDE.md`.
