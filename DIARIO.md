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

## 2026-11-03 · E22b
**Feito:** feita no mesmo dia, com a E22 aguardando o run agendado (exceção pedida pelo usuário; não
toca no cron). `docs/PROTOTIPO.md` cruza o protótipo do Claude Design com o plano. Tema do
protótipo em `app/globals.css`: tokens viram cores do Tailwind (`bg-card`, `border-borda`,
`bg-destaque`, `text-suave`), com escuro derivado. Roboto por `next/font`. `components/Moldura.tsx`
(menu lateral no desktop, gaveta no celular), `MenuItens.tsx`, `BarraTopo.tsx` (caminho + busca que
abre `/?q=` na entrada). Conferido no navegador (build JSON): desktop, celular, escuro, gaveta,
busca, seleção na cidade, colinha; 0 erros no console; 64 testes.
**Decidido:** menu só com páginas que existem (item futuro seria placeholder). Gaveta, não barra no
rodapé, porque o rodapé do celular é da barra "Ver colinha". Secundário `#5F6B7E` em vez do
`#64748B` do protótipo (contraste 5,15:1 contra 4,54:1). Nenhum texto ou número mudou; só saiu o
link "Fiscaliza" do topo de `/p` e `/como-funciona` (a marca no menu faz esse papel).
**Lacunas:** nenhuma.
**Próximo passo:** conferir o run agendado de 2026-11-04 (fecha a E22). Depois a E23 (crachá no layout
do protótipo, só com dado real). O plano antecipou E23–E23d, as telas que já têm dado no banco; a
decisão 1 (colinha × Monitorando) não bloqueia a E23, só o botão "Monitorar".

## 2026-11-03 · E22
**Feito:** `.github/workflows/cron.yml` (06:17 de Brasília + `workflow_dispatch`). Estado no cache do
Actions (uma entrada por execução, restaura a mais recente); sem cache, vem da release
`estado-inicial` (`estado.tar.gz`, 30 MB, 6.440 JSON, sem CPF nem hash). `consulta_cand` baixado a
cada execução para `$RUNNER_TEMP` e apagado. Proposições da Câmara viram extrato por ano (CSV
apagado); votos da sonda copiados para o estado. Tabela `atualizacoes` (migração 0005, rodada pelo
usuário). Secrets gravados pelo usuário. Primeiro run manual: publicou 5 proposições, 2 contagens e
62 resumos, mas o `parlamentares` parou com slug repetido (abaixo). Corrigido, cache apagado, segundo
run manual verde a partir da release: 0 políticos alterados, 6 fontes em `atualizacoes`.
**Decidido:** nada com CPF vai para cache ou release (repositório público: PR de fork lê cache). Sem
cache nem release, o workflow para antes do cron (não recomeça de SP). `runner.temp` não existe no
`env` do job: `FISCALIZA_TSE` vem de um passo via `$GITHUB_ENV`. Mesmo CPF com mais de uma
candidatura: vale a que foi à urna, no empate o sq maior (`porCpf`); antes valia a última linha
lida, e o TSE regenerou os arquivos em outra ordem (Carlos Jordy ligou à candidatura cancelada a
deputado). Depois do Actions, nada de publicar da máquina local: só `--sem-publicar`.
**Lacunas:** CPF com mais de uma candidatura (`docs/LACUNAS.md`). `camara_cota`/`senado_cota` só
entram em `atualizacoes` na próxima coleta mensal (dezembro); levar em conta na página `/atualizacoes`.
**Próximo passo:** conferir o run agendado de 2026-11-04 (09:17 UTC): verde e dado novo no site
(ex.: `atualizacoes` com data de 04/11). Se ok, marcar o "Pronto quando" e passar para a E22b
(visual do protótipo, nova; cruzamento em `docs/PROTOTIPO.md`, com 4 decisões abertas do usuário).

## 2026-11-02 · E21e
**Feito:** job `proposicoes` (`scripts/cron/proposicoes.ts`). Câmara pelos arquivos anuais 2023–2026
(`proposicoes`, `proposicoesAutores`) com `lib/http.ts#baixarArquivo`, que retoma com `Range`: o
servidor corta a conexão a cada ~17 s. Senado por `/processo?codigoParlamentarAutor` (324
listagens) e `/processo/{id}` só das que podem virar lei (2.918, ordem dos autores). Migração 0004
(`proposicoes`, `proposicoes_autores`, `proposicoes_contagem`), testada no PGlite. Ensaio:
25.588 proposições (311 viraram norma), 40.555 autorias, 19.533 contagens; duas execuções
seguidas, a segunda com 0 novas e 0 alteradas; validação ok. Migração rodada pelo usuário, push e
publicação: 85.676 linhas em ~75 s, 0 resumos alterados; 14 de 14 contagens no Supabase; banco com
146,6 MB (29,3%).
**Decidido:** autor = `proponente = 1` (apoio de PEC vem com 0; conferido contra a API para uma
deputada: as 2 diferenças eram apoio); `ordem` 1 = primeiro autor. Íntegra só com algum autor no
site. No Senado, PRS (resolução do Senado) no lugar de PRC, e vale a autoria de iniciativa, não a
listagem por autor (PL da Comissão Diretora). 2 em voo no Senado (429 com 3). Situação muda em
proposição antiga: ano corrente todo dia, anteriores por semana.
**Lacunas:** listagem × autoria de iniciativa no Senado; downloads cortados da Câmara; só desde 2023
e só parlamentares do site (ver `docs/LACUNAS.md`). Para a E22: 356 MB de CSV fora do cache do Actions.
**Próximo passo:** E22 — GitHub Actions, começando por como a primeira execução reconstrói o estado
(arquivos do TSE, cache de votos, CSVs de proposições).

## 2026-11-02 · E21d
**Feito:** job `cota` (`scripts/cron/cota.ts`): despesas da Câmara de todos os 648 deputados da
legislatura 57 pela API (4.619 chamadas, 0 falhas) e CEAPS do Senado pelo arquivo anual
(`lib/senado.ts#listarDespesasCeaps`, sem fornecedor nem CPF/CNPJ), 2025–2026. Migração 0003 (`casa`
nas duas tabelas, `uf` da bancada em `despesas_mes`, `parlamentares`), testada no PGlite e rodada pelo
usuário. Card e página de senador com a cota e link para a transparência do Senado. Publicado: 11.173
despesas, 1.184 médias, 632 resumos. Supabase: 1.186 de 1.186 médias batem com a soma (site + só
média) e 592 de 592 do Senado com a soma direta do arquivo bruto; cota no card de 78 de 81 senadores
e 553 de 575 deputados com mandato em curso. Banco: 128 MB.
**Decidido:** média = todos da UF com lançamento no mês, inclusive quem saiu (a regra da sonda, só
os em exercício, reabriria meses fechados a cada troca de suplente). Em SP a média mudou em 20 de 22
meses, explicada ao centavo por 10 deputados fora da lista de 70 da sonda; os 1.273 deputado-meses
publicados ficaram idênticos. Mês novo só fecha com ≥ 20 dias entre coletas (ago–out de SP estavam
iguais entre 01/11 e 02/11, feriado); primeira coleta nacional fecha até jul/2026. UF da bancada na
Casa, não a da candidatura (Tiririca, Rosangela Moro, Hélio Lopes). Média dividida em centavos
inteiros (4 médias saíram 1 centavo abaixo no meio centavo; corrigidas e republicadas).
**Lacunas:** Kajuru sem CEAPS em 2025–26; 131 despesas da CEAPS sem tipo; UF de senador fora de
exercício só pelos mandatos; cota só desde 2025 (ver `docs/LACUNAS.md`). Páginas geradas no build
ficaram sem a cota até o deploy seguinte (push antes da publicação; ver `docs/CRON.md`).
**Próximo passo:** E21e — proposições (migração 0004).

## 2026-11-02 · E21c
**Feito:** `scripts/cron/parlamentares.ts` (Câmara: 648 da legislatura 57, CPF comparado em memória
com o TSE 2026 e 2022; Senado: 81 por nome completo + UF, todos ligados) e `votacoes.ts` derivando
os votos de todos em todas as votações a partir das respostas brutas (Senado ano a ano, reproduz o
publicado sem diferença). `lib/linhas-mandato.ts` (regra do consolidar, mesmos arquivos). Ensaio
`--sem-publicar` e conferências antes de publicar: 513 de 513 deputados e 81 de 81 senadores em
exercício; 594 de 594 cards com números e "Como cobrar". Site: páginas de político e JSON de cidade
na primeira visita, JSON da cidade com o cabeçalho de cada um, lista de cidades fora do HTML (home de
59 para 2,5 KB), UF na busca. Testado no navegador com o estado nacional (Feira de Santana/BA). Push do
código, depois publicação: 570 mil linhas e 3.293 resumos em 2 min 20 s; 11 de 11 contagens; 121 MB.
**Decidido:** push antes de publicar (o código antigo só conhecia as páginas de SP). Votos sem os
arquivos anuais da Câmara: as respostas por votação bastam e já estavam em cache. 7 políticos de SP
ganharam vínculo com a Câmara (passaram pela legislatura e não estão em exercício). Correções nas
regras: anotação antes do evento no histórico da Câmara (1 deputado de RO sem mandato) e licença
repetida no Senado (5 casos).
**Lacunas:** ver `docs/LACUNAS.md` (`#NULO` no TSE, senadores que saíram, cota só de SP).
**Próximo passo:** E21d — cota da Câmara nas 27 UFs (API, média por UF) e CEAPS do Senado.

## 2026-11-02 · E21b
**Feito:** `scripts/tse/municipios.ts` → `data/municipios-ibge.json` (5.571 cidades; 13 grafias no
de-para; SP igual ao atual). `scripts/tse/nacional.ts` → `estado/fontes/tse-2026/`: 3.632 políticos
(top-20 e todos os eleitos), 458 listas, 172.329 linhas de top-20, em 7 s com DuckDB sobre os CSVs
por estado (3,4 GB). Conferências: quociente candidato a candidato contra a situação no TSE, 0
divergências nos 27 estados (513 vagas, contadas do próprio TSE); top-20 da maior cidade de cada
estado contra o JSON oficial, 54 de 54; SP idêntico ao publicado (listas, municípios, 20.365 linhas).
Corrigido `lib/tse.ts`: o arquivo de resultados usa o código do município com 5 dígitos (o CSV vem
sem zeros à esquerda; SP nunca expôs isso).
**Decidido:** a publicação nacional vai junto com a E21c, porque sem o cruzamento com Câmara e
Senado o card mentiria ("primeiro voto em fevereiro" para quem já vota). Vagas por estado saem do
TSE, não de uma tabela fixa. Todos os eleitos entram, mesmo sem top-20 (uma deputada do RJ).
Nenhum homônimo de nome de urna na mesma UF.
**Lacunas:** ver `docs/LACUNAS.md` (de-para de municípios, eleita sem top-20, "reeleito" fora de SP).
**Próximo passo:** E21c — os 594 parlamentares em exercício (Câmara pelo CPF em memória, Senado
pelo nome completo + UF), votos de todos desde 2023 pelos arquivos anuais, e publicar com a E21b.

## 2026-11-02 · E21a
**Feito:** E21 dividida em E21a–E21e (PLANO): a original juntava cinco trabalhos e não tinha o TSE
nacional, sem o qual a colinha só funciona em SP. `scripts/cron/`: `estado.ts` (estado/dados,
publicado, fontes; começa de data/*.json), `votacoes.ts` (Câmara e Senado incremental, cache das
respostas), `publicar.ts` (só linhas novas ou alteradas, sem ler o banco), `resumos.ts` (usado
também por `npm run precalcular`), `index.ts` (jobs isolados, validação antes de publicar, sai com 1
em falha). `lib/linhas-votacao.ts`: montagem das linhas extraída do `consolidar.ts`, que gera os
mesmos arquivos. `npm run cron`; `supabase:conferir` aceita `DATA_DIR`. `docs/CRON.md`.
**Decidido:** o cron compara com uma cópia local do que publicou, não com o banco (egress). Nunca
apaga linha. Janela da última data − 14 dias. Votos de novos políticos nas votações antigas virão
dos arquivos anuais (E21c), não do job diário.
**Lacunas:** nenhuma nova. Não havia votação nominal nova desde 14/10 (as sessões de 27–28/10 na
Câmara foram simbólicas). O banco está em 26,5 MB, quase tudo espaço da carga dupla da E19.
**Próximo passo:** E21b — TSE 2026 nas 27 UFs: candidatos, top-20 das 5.570 cidades, listas e
quociente por estado, municípios gerados localmente.

## 2026-11-02 · E20 (fechamento)
**Feito:** usuário criou as três variáveis na Vercel (`FISCALIZA_DADOS`, `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, Production e Preview); copiei para a área de transferência a partir do
`.env.local`, sem a chave secreta, e limpei depois. `meta name="fiscaliza-dados"` mostra a origem
(json ou supabase) em cada página. Push: produção lendo do Supabase, conteúdo conferido. As funções
rodavam em Washington (`iad1`, padrão) com o banco em São Paulo: colinha inédita em 0,9–1,1 s.
`vercel.json` com `regions: ["gru1"]` (o Hobby permite uma região): 0,16–0,54 s; cache 0,05–0,08 s;
imagem de compartilhamento de 4,2 para 1,8 s.
**Decidido:** funções em São Paulo, junto do Supabase. A primeira visita depois de cada deploy pega
a função fria (1,7 s medido) e fica registrada como exceção conhecida.
**Lacunas:** nenhuma.
**Próximo passo:** E21 — cron do Congresso no Brasil inteiro (513 + 81), gravando só o que mudou;
carga inicial pelos arquivos anuais da Câmara; a tabela de municípios é gerada localmente (o IBGE
não responde ao runner).

## 2026-11-02 · E20 (parcial)
**Feito:** `lib/repo-supabase.ts` (API REST, chave publicável, listas em memória por 5 min);
`Repo` com `getCard` e `getPagina`; páginas trocaram `montarCard`/`montarPagina` por elas (nenhum
componente mudou). Migração 0002 (`resumos`: card, página e hash por político), rodada pelo
usuário; `npm run precalcular` grava 438 resumos em 3 s (1,3 KB em média) e não regrava nada na
segunda vez. `selecionar()` pagina de 1.000 em 1.000 com `order=` obrigatório. Teste novo: card e
página sobrevivem ao JSON. Builds nos dois modos comparados página a página: 1.089 de 1.089 iguais.
**Decidido:** o `jsonb` reordena as chaves dos objetos: "Como votou" passou a seguir uma ordem fixa
e as categorias da cota desempatam pelo nome. A lista da cidade desempata pelo número de urna numa
regra única (`lib/cidade.ts`), em vez de depender da ordem do arquivo. `pbcopy` precisa de
`LANG=en_US.UTF-8` (os comentários da 0002 colaram com acentos trocados; o SQL não foi afetado).
**Lacunas:** nenhuma de dado.
**Próximo passo:** usuário cria na Vercel `FISCALIZA_DADOS`, `SUPABASE_URL` e
`SUPABASE_PUBLISHABLE_KEY`; push; conferir produção lendo do Supabase e o tempo das páginas.

## 2026-11-02 · E19
**Feito:** usuário criou o projeto no Supabase (free, São Paulo) e rodou a migração no SQL Editor.
Criei `.env.local` a partir do modelo (fora do git, permissão 600); a URL colada era a do painel
(`supabase.com/dashboard/project/<id>`), corrigida para `https://<id>.supabase.co` sem exibir
chaves. Conexão ok com as duas chaves. `npm run seed`: 11 tabelas em 17 s.
`npm run supabase:conferir`: 11 de 11 contagens batem; 14,4 MB (1,47× o JSON, 2,9% de 500 MB).
Segunda carga: contagens iguais (idempotente).
**Decidido:** o cron grava só linhas novas ou alteradas: a segunda carga, sem mudança de dado,
levou o banco de 14 para 26 MB (versões antigas das linhas regravadas). Registrado na E21 e em
`docs/VOLUME.md`.
**Lacunas:** nenhuma.
**Próximo passo:** E20 — `SupabaseRepo` (interface `Repo` sobre o Supabase, troca por variável de
ambiente); as páginas passam a ler números pré-calculados, não todas as votações (egress).

## 2026-11-02 · E19 (preparação)
**Feito:** usuário tornou o repositório público. `supabase/migrations/0001_init.sql`: 11 tabelas com
as chaves do validador, índices de leitura, RLS com leitura pública e permissões explícitas,
`avisos_interesse` (contagem por dia, página e tipo) com `registrar_aviso()` para o público e
`tamanhos()` só para a chave secreta. `lib/supabase.ts` (cliente REST só com `fetch`),
`lib/esquema.ts` (ordem de carga e chaves), `scripts/seed.ts`, `scripts/supabase-conferir.ts`,
`.env.example`, `npm run seed` e `npm run supabase:conferir`. Testado num Postgres 17 em
WebAssembly (PGlite, numa pasta temporária, fora do projeto): migração ok, carga completa,
público lê mas não escreve nem vê avisos, toque registrado pela função.
**Decidido:** sem `supabase-js` nem `pg`: a API REST resolve upsert, contagem e funções. Chaves
novas (sb_secret, sb_publishable) e antigas (JWT) aceitas. Medido: Postgres = 1,44× o JSON.
**Lacunas:** nenhuma.
**Próximo passo:** usuário cria o projeto (região São Paulo), roda a migração no SQL Editor e
preenche `.env.local`; depois `npm run seed` e `npm run supabase:conferir` fecham a E19.

## 2026-11-02 · decisões de volume
**Feito:** usuário decidiu as questões de `docs/VOLUME.md`: cota agregada, íntegra só das
proposições que podem virar lei, dados desde 2023, repositório público. Antes de abrir o repo,
varri o histórico: nenhum segredo, nenhum CPF nem hash de CPF; achei um CPF por extenso numa
descrição oficial de votação da Câmara (prisão de deputado) e passei a ocultá-lo
(`lib/texto.ts#semCpf`, aplicado no `consolidar.ts` e nos dados; o script reproduz o mesmo
`votacoes.json`). `scripts/rede.ts` virou módulo (typecheck). 55 testes ok.
**Decidido:** o texto antigo com o CPF continua nos commits anteriores; reescrever o histórico
fica a critério do usuário (o dado já é público na Câmara). Termos da Vercel Hobby: pendente,
o usuário lê.
**Lacunas:** ver `docs/LACUNAS.md` (CPF em texto oficial).
**Próximo passo:** o usuário torna o repositório público nas configurações do GitHub; depois, E19.

## 2026-11-02 · E18 (fechamento)
**Feito:** push de `4dcdb23`; `gh workflow run rede.yml` duas vezes. Runner do GitHub (Linux x64):
14 de 15 fontes. Câmara, Senado (inclusive CEAPS), TSE e Portal da Transparência ok; IBGE com
timeout de conexão nas duas execuções.
**Decidido:** tabela de municípios (códigos IBGE) gerada localmente e versionada; o cron não chama
o IBGE. `CLAUDE.md` e `docs/VOLUME.md` atualizados.
**Lacunas:** IBGE inacessível do runner (registrado em `docs/LACUNAS.md`).
**Próximo passo:** o usuário decide as 5 questões do fim de `docs/VOLUME.md`; depois, E19 (Supabase
e schema, medindo o tamanho real com `pg_total_relation_size`).

## 2026-11-01 · E18 (parcial)
**Feito:** E17 publicada (push de `bd404da`, conferida em produção). `docs/VOLUME.md`: limites free
lidos nas páginas oficiais (Supabase 500 MB e 5 GB de egress; Vercel Hobby 1 M de leituras e 200 mil
escritas de ISR, build de 45 min; Actions ~2.000 min no privado, grátis no público) e volume
medido nas fontes (446.195 votos da Câmara 2023–26 pelos placares; cota ~233 mil lançamentos/ano
na Câmara e 23.850 no Senado; 42.695 proposições da Câmara em 2025, 8.112 que podem virar lei).
Estimativa: ~150 MB de JSON, 220–300 MB no Postgres. `scripts/rede.ts` (sem dependências, 15
fontes): 15 de 15 daqui. `.github/workflows/rede.yml` pronto, manual.
**Decidido:** fator de 1,5–2× do JSON para o Postgres (sem Postgres local; a E19 mede). A Câmara
tem arquivos anuais em lote (votos, autores, proposições), que o cron deve usar no lugar da API
na carga inicial. Requisito novo para a E20: números pré-calculados pelo cron, porque ler todas
as votações por página estouraria o egress (~18 GB/mês).
**Lacunas:** cota nota a nota não cabe no free (~1 milhão de linhas). Equipe de gabinete: fonte
aberta ainda não localizada (E28).
**Próximo passo:** push e rodar `gh workflow run rede.yml`; com o resultado, fechar a E18. Antes
da E19, o usuário decide as 5 questões do fim de `docs/VOLUME.md`.

## 2026-11-01 · E17
**Feito:** saíram o quiz (página, componentes, `lib/quiz.ts`, `concordancia()`, `data/quiz.json`,
coluna `votacoes.quiz`, script e JSONs da sonda), o botão Cobrar e "seu voto contou para"
(`fraseVotoContou()`, bloco da lista no card). Entrou **Como cobrar** (`lib/cobrar.ts`,
`components/ComoCobrar.tsx`): gabinete, ouvidoria da Casa, TCU, MPF e Fala.BR, só para quem tem
mandato em curso. Entrou **Receber avisos** (`components/ReceberAvisos.tsx`), fake door no card,
na página e na colinha. `/como-funciona`, glossário, METODOLOGIA, TESTE-USUARIOS e README ajustados;
`docs/QUIZ.md` arquivado. 55 testes, build ok, conferido a 375 px.
**Decidido:** dados editados à mão para não regravar as datas de coleta; o `consolidar.ts`
modificado gera o mesmo `votacoes.json` (conferido) e só mudaria `updated_at` em `politicos`.
Avisos não aparecem para quem não tem nem terá mandato. Canais conferidos pelo conteúdo, não pelo
status HTTP: `portal.tcu.gov.br/ouvidoria/denuncia/` responde 200 e diz "não encontrada"; ficou
a raiz da ouvidoria.
**Lacunas:** telefone do gabinete como a fonte escreve, sem DDD.
**Próximo passo:** E18 — estimar o volume do Brasil inteiro (513 + 81) a partir da sonda e conferir
os limites atuais dos planos free nas páginas oficiais; testar as APIs a partir de um runner do
GitHub.

## 2026-11-01 · mudança de escopo
**Feito:** `CLAUDE.md` reescrito (escopo, princípios, fases, fora de escopo, rotas, card,
definição de pronto) e `PLANO.md` refeito a partir da E16: Passo 3 (E17 remoção, E18 volume e
custo, E19–E22 infra), Passo 4 (E23–E34, Congresso completo no Brasil inteiro) e Passos 5–7 em
bloco. Nada de código mudou.
**Decidido (pelo usuário):** ter praticamente todas as funcionalidades do politicometro.org, menos
presença em sessões, discursos, conta e avisos reais (só fake door, em todos os lugares onde fizer
sentido) e régua esquerda–direita. Sair do Fiscaliza: quiz de concordância, botão Cobrar e "seu
voto contou para". **Decidido (premissas minhas, a confirmar):** colinha continua como entrada;
Cobrar vira "Como cobrar" com canais oficiais; fake door sem nenhum campo de contato, só contagem
anônima; custo zero continua, com a E18 como porteira; STF só com fonte aberta (sem scraping);
expansão começa pelo Congresso no Brasil inteiro; E16 suspensa até o redesenho (volta na E34).
**Lacunas:** não medimos ainda se o Brasil inteiro cabe nos planos free (é a E18).
**Próximo passo:** E17 — tirar quiz, Cobrar e "seu voto contou para"; Como cobrar e fake door.

## 2026-11-01 · referência (fora do plano)
**Feito:** mapa do politicometro.org pelo navegador, como visitante: home, página de deputado e
de senador, estado, cidade, "quem me representa", Congresso e detalhe de votação, e as ~20 seções
(sobre, atualizações, partidos, governos, eleições, STF, comparar etc.). Inventário em
`docs/REFERENCIA-POLITICOMETRO.md`: cada funcionalidade × o que temos × conflito com o `CLAUDE.md`
× sugestão (MVP, v1.1, v1.2, fora). Nada copiado; dado novo só pelas fontes oficiais.
**Decidido:** nada; o documento lista as decisões que são do usuário (escopo, presença e
discursos, conta, régua ideológica, resumo das votações). O site deles tem bloqueio anti-robô
fora do navegador: não contornado.
**Lacunas:** nenhuma de dado.
**Próximo passo:** o usuário revisa o inventário e diz o que entra; o que entrar vira etapa no
`PLANO.md` antes de completar a rodada 2 do teste (E16).

## 2026-11-01 · E16 (rodada 1)
**Feito:** push de `4e78d39`; busca por número de urna e aviso "Não está na lista?" conferidos em
produção. O usuário aplicou o teste e relatou: menos de 5 pessoas, todas montaram a colinha em
menos de 1 minuto sem ajuda, todas acharam o deputado na lista da cidade, nenhum tropeço.
Registrado em `docs/TESTE-USUARIOS.md` como resumo (sem ficha por pessoa).
**Decidido:** E16 continua aberta: o critério pede 5 pessoas, e o caminho da busca (cerca de 1 em 3
eleitores) não foi exercitado por ninguém. Nada a ajustar desta rodada.
**Lacunas:** sem tempos individuais, cidades ou idades; não se sabe se alguém era da capital.
**Próximo passo:** completar as 5 pessoas (decisão do usuário), com alguém da capital e alguém cujo
deputado não esteja no top-20 da cidade, para exercitar a busca. Usar a ficha de
`docs/TESTE-USUARIOS.md` e registrar como "Rodada 2". Só então fechar a E16.

## 2026-11-01 · E16 (preparação)
**Feito:** E15 publicada (push de `d5f5ca5`; `/como-funciona` conferida em produção). Para a E16:
`docs/TESTE-USUARIOS.md` com quem chamar, fala do moderador, quando ligar e parar o cronômetro, o
que conta como sucesso, ficha e perguntas. Piloto: 438 fotos respondem 200; página inicial 9 KB,
índice 20 KB, cidade 0,6 KB. `scripts/sonda/_cobertura-top20.ts` mediu a parte dos votos para
deputado que vai para quem aparece no top-20 da cidade: 67,4% no estado, 57,2% na capital (top-50:
83,0% e 75,5%; top-100: 92,1% e 88,1%). Senador: 100%. Busca: índice inclui o número de urna e vem
por votos; casa palavra por palavra pelo começo; nome de urna antes do civil. Aviso "Não está na
lista? Busque pelo nome ou pelo número de urna" no fim da lista de deputados. Conferido a 375 px.
**Decidido:** sucesso = chegar à colinha com o deputado em quem votou, em < 60 s, sem ajuda;
senadores anotados mas não decidem (cobertura de 100%). Ficha sem nome nem voto do participante
(P1–P5). Não aumentar a lista antes do teste: a tabela de cobertura vai para a decisão depois.
**Lacunas:** a lista da cidade não tem o deputado de ~1 em 3 eleitores; o caminho deles é a busca.
**Próximo passo:** aplicar o roteiro com as 5 pessoas (pelo menos 1 da capital) e preencher
"Resultados" e "Achados" em `docs/TESTE-USUARIOS.md`; depois decidir sobre o tamanho da lista.

## 2026-11-01 · E15
**Feito:** `/como-funciona` (`app/como-funciona/page.tsx`): 12 seções com âncora (cobertura, lista da
cidade, participação, governismo, concordância, "seu voto contou para", CEAP, o que fica fora, fontes,
privacidade, código e licenças, termos). Todos os números da página (438 políticos, 1.107 + 426
votações, 240 secretas, 866/129 com orientação do Governo, 14 perguntas com 5 Sim/5 Não/4 sem
orientação, mês de referência, data da coleta) saem do `repo`. `lib/glossario.ts` ganhou `SECOES`,
`secao` por termo e o termo "votação nominal"; o popover do `Termo` mostra "Como calculamos" → a
seção. Página do político com "como contamos" por seção; "Fonte: TSE" da lista da cidade e
"Como as votações foram escolhidas" do quiz linkam. Rodapé global (`components/Rodape.tsx`, no
layout; sobe quando há barra fixa via `body:has(.barra-fixa)`). 65 testes, build ok.
**Decidido:** sem analytics nesta versão (dependência nova e nada a medir antes da E16); a página
diz isso. A página em TSX é o texto canônico da metodologia; `docs/METODOLOGIA.md` fica como nota
técnica (nomes de campos, decisões datadas) e é atualizado junto. Revisão de adjetivos: nenhum
achado. O servidor `next start` da sessão anterior continuava na porta 3107 (não pude matá-lo);
o preview rodou em 3108 (`fiscaliza-3108` no launch.json do $HOME).
**Lacunas:** o repositório é privado, então o link "código-fonte no GitHub" da página dá 404 para
quem não está logado; a AGPL pede o fonte acessível. Tornar público antes do teste com pessoas.
Data da coleta vem do `updated_at` em UTC; a página converte para o fuso de Brasília.
**Próximo passo:** E16 — roteiro "digite sua cidade e monte sua colinha" com 5 pessoas, cronometrar,
registrar em `docs/TESTE-USUARIOS.md`. Antes: tornar o repo público (ou tirar o link) e decidir se
quer Vercel Web Analytics para medir o teste.

## 2026-11-01 · E14
**Feito:** slug nome de urna + UF (decisão do usuário; colinha no localStorage v2). Colunas
`telefone` e `redes_sociais` em `politicos`. `lib/pagina.ts` (votos por tipo e últimas 10 no
mandato, CEAP de 12 meses com meses em aberto e categorias, mandatos, afastamentos, contatos) com
testes em dado real (soma dos tipos = denominador da participação). `/p/[slug]` estática para os 438
(ISR 24 h); "mais detalhes" nos cards. 65 testes. Em produção: HTML 13 KB (Kiko) e 11 KB (Giordano)
comprimidos, pré-renderizados; 404 para slug inexistente. Conferido a 375 px.
**Decidido:** cargo fora do slug (muda entre eleições). Página só com dado da fonte; seções sem
dado somem.
**Lacunas:** nenhuma de dado. PageSpeed Insights sem chave deu 429 e o `npx lighthouse` local foi
bloqueado pela política da sessão; o usuário rodou o Lighthouse mobile no Chrome em
`/p/giordano-sp` e `/p/kiko-celeguim-sp`: LCP abaixo de 1 s nas duas (critério de pronto).
**Próximo passo:** E15 — `/como-funciona` renderizando `docs/METODOLOGIA.md` e o acabamento
previsto no `PLANO.md`.

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
