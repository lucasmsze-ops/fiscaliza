# Volume e custo do Congresso no Brasil inteiro (E18)

Porteira do princípio 1 (custo zero) antes do Supabase (E19). Medido em 2026-11-01 a partir da
sonda de SP, das fontes oficiais e das páginas de preço de cada serviço.

**Resumo:** o Congresso inteiro de 2023 a 2026 cabe no plano free, **desde que** a cota fique
agregada por fornecedor (sem nota a nota), as proposições sem chance de virar lei fiquem só
como contagem, e as páginas leiam números já calculados pelo cron. Do jeito que o código lê os
dados hoje, o tráfego do Supabase estouraria o limite mensal.

## Limites dos planos free (páginas oficiais, 2026-11-01)

| Serviço | Limite | Fonte |
|---|---|---|
| Supabase free | 500 MB de banco por projeto; 5 GB de tráfego (egress) e 5 GB em cache por mês; pausa após 1 semana sem uso; até 2 projetos ativos | supabase.com/pricing |
| Vercel Hobby | 100 GB de transferência; 1 milhão de requisições e 1 milhão de execuções de função por mês; 4 h de CPU ativa; build de no máximo 45 min; 100 deploys por dia | vercel.com/docs/plans/hobby, vercel.com/docs/limits |
| Vercel Hobby, ISR | 1 milhão de leituras e 200 mil escritas por mês, em unidades de 8 KB | vercel.com/pricing (coluna Hobby) |
| Vercel Hobby, termos | "uso pessoal e não comercial" | vercel.com/docs/plans/hobby |
| GitHub Actions | Repositório público: runners padrão grátis. Privado (GitHub Free): US$ 12 por mês incluídos, cerca de 2.000 min de Linux; 500 MB de artefatos | docs.github.com (billing de Actions) |

## Volume medido nas fontes

| Fonte | Medida |
|---|---|
| Votos nominais da Câmara, 2023–out/2026 | 446.195 votos registrados em 1.107 votações (soma dos placares oficiais; média de 403 por votação) |
| Votos nominais do Senado, 2023–out/2026 | 426 votações × 81 senadores = 34.506 linhas |
| Votações do plenário (nominais) | 1.533 no total; já são nacionais na sonda |
| Cota da Câmara (CEAP), 2025 | 171.059 lançamentos no CSV nacional; a API devolve 1,36 vez mais (medido em SP: 46.470 contra 34.172), porque o CSV omite as passagens SIGEPA. Cerca de **233 mil por ano**. Agregado: 43.229 pares deputado × fornecedor e 32.875 deputado × mês × categoria |
| Cota do Senado (CEAPS), 2025 | 23.850 despesas de 83 senadores (API JSON `adm.senado.gov.br`, com o código do senador). 306 têm CPF de fornecedor pessoa física, que nunca é gravado |
| Proposições da Câmara, 2025 | 42.695 nos tipos principais: PL 6.610, PLP 237, PEC 27, PDL 1.149, PRC 89 (8.112 que podem virar lei) e REQ 12.026, RIC 8.223, INC 3.180, emendas 11.154 |
| Arquivos anuais em lote da Câmara (2025) | votos 58 MB, autores de proposições 39 MB, proposições 90 MB, orientações 1 MB (CSV). Substituem dezenas de milhares de chamadas à API |
| Página do político hoje (`/p/kiko-celeguim-sp`) | 79 KB de HTML + 43 KB de RSC; 19 KB comprimidos |

## Estimativa por tabela (Passo 4: Congresso, 2023–2026)

JSON medido por linha na sonda; Postgres estimado em 1,5 a 2 vezes o JSON (cabeçalho de linha e
índices). A E19 mede o tamanho real com `pg_total_relation_size`.

| Tabela | Linhas | JSON | Postgres |
|---|---|---|---|
| `votos` | 481 mil | 47 MB | 70–95 MB |
| `eleitos_mun` (top-20 de 5.570 cidades) | 176 mil | 19 MB | 29–38 MB |
| cota por fornecedor e ano (E27) | ~200 mil | 24 MB | 36–48 MB |
| proposições que podem virar lei + autoria (E25) | ~32 mil + ~180 mil vínculos | 27 MB | 40–54 MB |
| `despesas_mes` | ~31 mil | 11 MB | 16–22 MB |
| votações (todas do plenário, E30) | ~8 mil | 6 MB | 9–12 MB |
| políticos, mandatos, afastamentos, listas, municípios | ~10 mil | 5 MB | 8–10 MB |
| candidaturas, patrimônio, campanhas, comissões, equipe | ~55 mil | 8 MB | 12–16 MB |
| orientações | 14 mil | 1 MB | 2 MB |
| **Total** | | **~150 MB** | **~220–300 MB de 500 MB** |

Crescimento: cerca de +40 MB de JSON por ano de mandato (votos, cota, proposições), ou 60–80 MB
no Postgres. A margem dura de 2 a 3 anos antes de ser preciso arquivar anos antigos.

### O que não cabe

| Item | Volume | Por quê |
|---|---|---|
| Cota nota a nota (Câmara + Senado, 2023–2026) | ~1 milhão de linhas, ~250 MB de JSON, 375–500 MB no Postgres | Sozinho ocupa o banco inteiro. Alternativa: agregado por fornecedor e link para a página oficial das notas de cada mês |
| Todas as proposições com ementa (inclui requerimentos e emendas) | ~170 mil, ~85 MB de JSON, 130–170 MB no Postgres | Cabe no limite, mas tira a margem. Alternativa: contagem por deputado, ano e tipo, com link para a Câmara |
| Votos desde 2003 | ~2,7 milhões de linhas, 380+ MB no Postgres | Só a legislatura atual (e as seguintes) |
| Passo 5 (72 mil eleitos de todos os cargos) no mesmo banco | +45 MB só de `politicos`, mais mandatos e TSE | Usar o segundo projeto free do Supabase, que o plano permite |

## Riscos de tráfego, não de espaço

- **Supabase egress (5 GB por mês):** hoje cada página de político lê todas as votações e
  orientações da Casa (cerca de 1 MB) para calcular os números na hora. Com 600 páginas
  regeneradas por dia, seriam ~18 GB por mês. **Requisito para a E20:** o cron grava os números
  já calculados (participação, governismo, totais por tipo de voto) e as páginas leem só a linha do
  político, na casa dos KB.
- **ISR writes (200 mil por mês):** cada regeneração da página do político grava de 3 a 16 unidades
  de 8 KB (19 KB comprimidos, 122 KB sem compressão). 600 páginas regeneradas todo dia dariam de
  54 mil a 288 mil. Mitigação: regenerar só quando o cron muda o dado do político (revalidação
  sob demanda) e prazo longo para quem não tem mandato.
- **Build (45 min):** hoje 438 páginas de político e 645 de cidade são geradas no build. No Brasil
  inteiro, gerar só uma parte no build e o resto na primeira visita (ISR), como a Vercel recomenda.

## GitHub Actions

- Rotina diária incremental: estimada em 5 a 15 min por dia, 150 a 450 min por mês. Cabe nos
  ~2.000 min do repositório privado; num repositório público, não conta.
- Carga inicial pelos arquivos em lote da Câmara (votos, autores, proposições): cerca de 200 MB por
  ano de download, minutos de processamento com DuckDB.
- **Rede:** `scripts/rede.ts` testa as 15 fontes que o cron usa. Da máquina local (Brasil):
  15 de 15 responderam, a mais lenta foi a CEAPS do ano inteiro (3,4 s, 6,5 MB). Do runner do
  GitHub (`.github/workflows/rede.yml`, Linux x64, duas execuções seguidas): **14 de 15**. Câmara,
  Senado, TSE e Portal da Transparência responderam (a primeira chamada à Câmara levou 7,6 s);
  **o IBGE (`servicodados.ibge.gov.br`) não aceitou conexão nas duas**, com timeout de conexão em
  10 s. Consequência: a tabela de municípios (códigos IBGE) é gerada na máquina local, uma vez por
  ano, e versionada em `data/`; o cron só a lê. Indicadores do IBGE (Passo 7) terão o mesmo
  tratamento ou outra fonte.

## Decisões para o usuário (antes da E19)

1. **Cota:** agregada por fornecedor e por mês, com link para as notas na página oficial (cabe), ou
   nota a nota (não cabe no free).
2. **Proposições:** texto completo só das que podem virar lei e contagem do resto (cabe com
   margem), ou tudo (cabe, sem margem).
3. **Histórico:** só a legislatura atual em diante.
4. **Repositório público:** Actions grátis e o link do código em `/como-funciona` para de dar 404.
5. **Vercel Hobby "pessoal e não comercial":** o Fiscaliza é sem fins lucrativos, mas é um projeto
   público de duas pessoas. Ler os termos de uso justo da Vercel e decidir se está confortável.
