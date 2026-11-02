# Fiscaliza

Plataforma cívica, sem fins lucrativos, que responde ao eleitor: em quem eu votei →
o que estão fazendo → me representam? → como cobro? → com quem compartilho?

Escopo: deputados federais e senadores eleitos em 2026 e em exercício.

- Spec e princípios: [`CLAUDE.md`](CLAUDE.md)
- Plano por etapas: [`PLANO.md`](PLANO.md)
- Diário de sessões: [`DIARIO.md`](DIARIO.md)

## Rodar

```bash
npm install
npm run ping   # testa o acesso às APIs da Câmara e do Senado
```

## Licenças

- Código: [AGPL-3.0](LICENSE).
- Dados derivados em `data/`: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.pt-br).
  Fontes originais: TSE, Câmara dos Deputados e Senado Federal (dados abertos).

## Site (protótipo)

```bash
npm run dev        # http://localhost:3000 (lê data/*.json)
npm run build      # build de produção; data/*.json vai junto com as funções
npm run validar    # confere data/*.json antes de publicar
```

Deploy: Vercel, a cada push na `main` de `github.com/lucasmsze-ops/fiscaliza` (privado).
Produção: https://fiscaliza-rho.vercel.app

## Sonda (Passo 1)

Os CSVs do TSE ficam em `data/raw/` (ignorado no git). Para reproduzir a E1:

```bash
# candidatos 2026, 2022, 2018 e votos 2026 (zips do cdn.tse.jus.br), extrair os CSVs de SP em
# data/raw/{consulta_cand,consulta_cand_2022,consulta_cand_2018,votacao_munzona}/ e as fotos em data/raw/fotos/
npx tsx scripts/sonda/_listas-atuais.ts   # quem está em exercício em SP (Câmara/Senado)
npx tsx scripts/sonda/tse.ts              # gera data/sonda/politicos-tse.json
npx tsx scripts/sonda/senadores.ts        # Senado: senadores.json, votacoes-senado.json, orientacoes-senado.json, votos-senado.json
# E7: também votacao_partido_munzona_2026 e detalhe_votacao_munzona_2026 (SP) em data/raw/{votacao_partido,detalhe_munzona}/
npx tsx scripts/sonda/quociente.ts        # vagas por lista (deputado federal SP), conferidas contra o relatório oficial
npx tsx scripts/sonda/eleitos-mun.ts      # top-20 por município; --todos confere os 645 contra o JSON oficial do TSE
# E8: bancada de SP inteira e consolidação no shape final
npx tsx scripts/sonda/bancada.ts          # perfis + histórico dos 70 deputados de SP e join com 2026 (incremental)
npx tsx scripts/sonda/votos.ts            # votos de toda a bancada a partir do cache da E4
npx tsx scripts/sonda/despesas.ts         # CEAP dos 70
npx tsx scripts/sonda/consolidar.ts       # data/*.json (11 tabelas, snake_case = Supabase)
npx tsx scripts/sonda/validar.ts          # referências, obrigatórios, chaves; sai com 1 se algo falhar
npx tsx scripts/sonda/_numeros.ts         # participação e governismo da amostra a partir de data/
```

## TSE 2026, Brasil inteiro (E21b)

Com os zips nacionais do TSE em `data/raw/` (candidatos, votação por município e zona, votação por
partido), extraídos por estado:

```bash
npx tsx scripts/tse/municipios.ts   # data/municipios-ibge.json (precisa da API do IBGE: rodar na máquina local)
npx tsx scripts/tse/nacional.ts     # estado/fontes/tse-2026/ + conferências (quociente, JSON oficial, SP)
```
