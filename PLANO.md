# Fiscaliza — Plano por etapas

Cada etapa cabe numa sessão de trabalho (um dia). A ordem importa: cada uma usa o que a
anterior produziu. Marcar `[x]` quando concluída e registrar a sessão no `DIARIO.md`.

**Etapa atual: E7** (atualizar esta linha ao avançar)

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
- [ ] A partir do TSE: cadeiras por partido/federação em SP, tratando federação como
      lista única. Conferir contra o resultado oficial.
- [ ] Top-20 por município e cargo → `data/sonda/eleitos-mun.json`.
- [ ] `lib/quociente.ts` com testes.
- [ ] Frase exata: "seu voto contou para [partido/federação], que elegeu N em SP".
- Pronto quando: para 3 municípios de tamanhos diferentes o top-20 bate com o TSE.

### E8 · Consolidação da sonda
- [ ] Reescrever `lib/types.ts` com o que o dado real mostrou.
- [ ] `data/*.json` no shape final do modelo (`politicos`, `mandatos`, `eleitos_mun`,
      `despesas_mes`, `votacoes`, `votos`, `orientacoes`). Mesmo shape que irá ao Supabase.
- [ ] Escolher 8–12 votações para o quiz com critério escrito em `docs/QUIZ.md`
      (votação nominal, relevância pública, resultado apertado ou tema claro).
- [ ] `docs/SONDA.md`: o que o dado real ensinou, o que mudou no `CLAUDE.md`.
- Pronto quando: um script `scripts/sonda/validar.ts` confirma que todo `politico_id`
  referenciado existe e nenhum campo obrigatório está vazio.

## Passo 2 — Protótipo (site lendo `data/*.json`)

### E9 · Next.js e camada de dados
- [ ] `create-next-app` (App Router, TS, Tailwind) + shadcn/ui mínimo (Button, Card, Tooltip).
- [ ] `lib/repo.ts`: interface `Repo` (`getPolitico`, `buscarPorCidade`, `buscarPorNome`,
      `getVotacoesQuiz`, ...) com implementação `JsonRepo`. A E17 troca por `SupabaseRepo`
      sem tocar nos componentes.
- [ ] Deploy inicial na Vercel (Hobby) a partir da `main`. Headers `Referrer-Policy`.
- Pronto quando: `/` abre em produção mostrando o nome de um político vindo do JSON.

### E10 · `PoliticoCard`
- [ ] O único card: foto oficial, nome de urna, partido-UF, status, três números.
      "Concordância" oculta sem resposta; "primeiro voto em fevereiro" para quem não votou.
- [ ] CEAP do mês vs média SP, com link para a página oficial da despesa.
- [ ] Botão **Cobrar** (`mailto:` com assunto e corpo pré-preenchidos).
- [ ] Tooltips para PEC, PL, MP, obstrução, quociente.
- Pronto quando: o card renderiza os 20 da sonda sem nenhum campo vazio ou inventado.

### E11 · `/` — montar a colinha
- [ ] Busca por cidade (lista de municípios SP do TSE) e por nome de urna.
- [ ] Da cidade: mostra os eleitos do top-20; o usuário marca em quem votou.
- [ ] Colinha salva no `localStorage` e refletida na URL `/c/[ids]`.
- Pronto quando: você mesmo monta a colinha em menos de 1 minuto no celular.

### E12 · `/c/[ids]` — colinha e preview de compartilhamento
- [ ] Cards + bloco "seu voto contou para" por político.
- [ ] OG image com `next/og` (fotos buscadas na hora, única exceção ao "nunca proxiar").
- [ ] Botão compartilhar (Web Share API, fallback copiar link).
- Pronto quando: colar o link no WhatsApp mostra a colinha com os números.

### E13 · `/votacoes` e quiz de concordância
- [ ] Cada votação do quiz explicada em 3 parágrafos, com link oficial.
- [ ] Resposta do usuário no `localStorage`; `concordancia()` em `lib/indicadores.ts` com teste.
- [ ] Terceiro número aparece no card depois do quiz.
- [ ] Cobrar passa a incluir a votação discordante.
- Pronto quando: responder o quiz muda o card e o e-mail de cobrança.

### E14 · `/p/[slug]` — página do político
- [ ] ISR `revalidate` 24 h. Card, histórico de votos 2023–26, CEAP mensal, contatos, cobrar.
- [ ] Slug estável (nome de urna + UF + cargo).
- Pronto quando: LCP < 1 s em 4G simulado (Lighthouse mobile) na página mais pesada.

### E15 · `/como-funciona` e acabamento
- [ ] Metodologia de cada número, fontes com link, licenças, link para o código.
- [ ] Analytics cookieless (Vercel Web Analytics, plano free) ou nenhum.
- [ ] Revisão de textos: sem adjetivo sobre político em lugar nenhum.
- Pronto quando: toda métrica da interface linka para a seção correspondente.

### E16 · Teste com 5 pessoas
- [ ] Roteiro: "digite sua cidade e monte sua colinha". Cronometrar.
- [ ] Registrar achados em `docs/TESTE-USUARIOS.md`. Ajustar o que impediu o < 1 min.
- Pronto quando: 4 de 5 conseguem em < 1 min sem ajuda.

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
