# Sonda — o que o dado real ensinou

Registro por etapa. Tudo aqui foi observado nos arquivos/APIs, não na documentação.

## E1 · TSE 2026 (2026-10-29)

### Arquivos usados
| Dataset | URL | Observação |
|---|---|---|
| Candidatos 2026 | `cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip` | 3 MB; um CSV por UF dentro. Não existe zip por UF. |
| Votos por município/zona 2026 | `.../votacao_candidato_munzona/votacao_candidato_munzona_2026.zip` | 467 MB; o CSV de SP sozinho tem 884 MB e 1,88 M linhas. |
| Fotos 2026 SP | `cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_SP_div.zip` | 15 MB, 2.630 jpgs, `F{SG_UE}{SQ_CANDIDATO}_div.jpg`. |
| Candidatos 2018 e 2022 | mesmos paths com o ano | Para os senadores em exercício. |

O catálogo completo vem da API CKAN, sem HTML:
`https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026`.

### Formato
- CSV em latin-1, separador `;`, aspas `"`, cabeçalho em maiúsculas. DuckDB lê com
  `read_csv(..., encoding='latin-1', all_varchar=true)`.
- Sentinelas de nulo: `#NULO` e `#NE` em 2026; `#NULO#` e `#NE#` em 2018. Tratar as quatro.
- **`DS_CARGO` muda de caixa entre arquivos**: `DEPUTADO FEDERAL` em `consulta_cand`,
  `Deputado Federal` em `votacao_candidato_munzona`. Filtrar cada arquivo com o valor dele.
- `SG_FEDERACAO` em 2026 não é sigla: é a composição (`13-PT/65-PC do B/43-PV`), igual a
  `DS_COMPOSICAO_FEDERACAO`. O nome legível está em `NM_FEDERACAO`.
- `DS_SITUACAO_CANDIDATURA` veio `#NE` para todos os deputados federais de SP (não avaliado).
  Usar `DS_SIT_TOT_TURNO` para o resultado.
- `NR_CPF_CANDIDATO` existe em 2018, 2022 e 2026 (11 dígitos). Guardamos só o SHA-256.
- Votos: `QT_VOTOS_NOMINAIS` inclui "Anulado sub judice" (`NM_TIPO_DESTINACAO_VOTOS`).
  Usamos **`QT_VOTOS_NOMINAIS_VALIDOS`** como "votos em 2026".
- SP: 645 municípios no arquivo de votos (bate com o IBGE).

### Resultado de SP em 2026
- Deputado federal: 70 eleitos (60 por QP, 10 por média), 1.132 candidatos, 1.045 com voto.
- Senador: 2 eleitos (Guilherme Derrite, PP; André do Prado, PL). Dos 3 em exercício,
  nenhum concorreu ao Senado em 2026. Derrite é deputado federal em exercício.
- Federações com eleitos em SP: FE Brasil (PT/PCdoB/PV), PSOL REDE, União Progressista
  (UNIÃO/PP), Renovação Solidária (PRD/Solidariedade), PSDB Cidadania.

### Amostra escolhida (`data/sonda/politicos-tse.json`)
Critério, implementado em `scripts/sonda/tse.ts`:
1. **Reeleito** = eleito em 2026 cujo nome de urna casa exatamente (sem acento/caixa) com o
   nome parlamentar de um deputado de SP em exercício (API da Câmara). 36 dos 70 casam.
2. **Novo** = eleito em 2026 sem nenhuma semelhança de nome com a lista atual. 30 dos 70.
3. **Ambíguos** (4, resolvidos por CPF na E2): Motta, Pastor Marco Feliciano,
   Luiz Philippe de O e Bragança, Paulo Freire.
4. Em cada grupo: ordem por votos válidos, máximo 2 por partido, garantindo um eleito por
   média e um membro de federação.
5. Senadores: os 2 eleitos + os 3 em exercício (Marcos Pontes 2022; Mara Gabrilli e
   Giordano 2018, este eleito como 1º suplente). Partido deles no JSON é o da eleição;
   o atual vem do Senado na E6.

| Grupo | Políticos |
|---|---|
| Reeleitos (10) | Kiko Celeguim (PT, média), Erika Hilton e Sâmia Bomfim (PSOL), Kim Kataguiri (MISSÃO), Tabata Amaral (PSB), Delegado Palumbo e Delegado Bruno Lima (PODE), Mauricio Neves (PP), Marcio Alvino (PL), Baleia Rossi (MDB) |
| Novos (5) | João Paulo Cunha (PT, média), Sargento Nantes (PP), Lucas Pavanato e Renato Bolsonaro (PL), Guilherme Cortez (PSOL) |
| Senadores (5) | André do Prado (PL), Guilherme Derrite (PP), Marcos Pontes, Mara Gabrilli, Giordano |

### Pendências que o dado levantou
- **Foto dos novos**: a Câmara só terá foto a partir de 01/02/2027. O TSE fornece as fotos
  como arquivos num zip, não como URL. O endpoint do DivulgaCand bloqueia requisições
  automatizadas (Akamai "Access Denied"). O `CLAUDE.md` diz "nunca proxiar pela Vercel";
  servir os ~75 jpgs dos novos como asset estático do próprio site é hospedar dado derivado,
  não proxiar. Decidir na E10.
- O hash SHA-256 de CPF sem sal é reversível por força bruta (espaço de ~10⁹ CPFs válidos).
  Como o CPF já é público no CSV do TSE, o hash não expõe nada novo, mas o JSON em `data/`
  é público: considerar remover `cpfHash` do que vai ao site e manter só no cron/Supabase.

## E2 · Câmara: perfil e join (2026-10-29)

### Shape real de `/deputados/{id}`
- `cpf` vem preenchido (11 dígitos) nos 70 perfis de SP. O join por SHA-256 funcionou em 100%.
- O e-mail oficial está em **`ultimoStatus.gabinete.email`**; o campo `email` do topo veio
  `null` em todos. `ultimoStatus.urlFoto` é a foto oficial (`camara.leg.br/internet/deputado/bandep/{id}.jpg`).
- `ultimoStatus.situacao` ∈ {"Exercício", "Vacância", ...}; `condicaoEleitoral` ∈ {"Titular", "Suplente"}.
- `redeSocial` é um array de URLs. `urlWebsite` quase sempre `null`.
- `/deputados/{id}/orgaos`: `dataFim == null` = participação atual. Inclui comissões especiais
  de projetos (`PL261424`) e frentes não aparecem aqui.
- `/deputados/{id}/historico`: eventos com `siglaPartido` por data; dá para reconstruir trocas
  de partido (ex.: Tabata PDT → PSB em 2021-09-28).

### Busca por nome
- `/deputados?nome=X` **sem** `idLegislatura` só procura entre quem está em exercício.
  Com `idLegislatura=N` procura em quem passou por aquela legislatura.
- Para quem não está em exercício, o script varre as legislaturas 56→50 por nome de urna e
  confirma pelo hash. Achou João Paulo Cunha (id 73534, legislatura 54, situação "Vacância",
  sem e-mail de gabinete). Os ids da Câmara são estáveis entre legislaturas.

### Estabilidade
138 chamadas, 4 responderam **504 aos ~15 s** (gateway timeout do lado da Câmara) e passaram na 2ª tentativa. Sem 429.
Tempo total ~1 min. O cron de 513 + 81 vai precisar de paralelismo moderado (4–8 em voo).

### Resultado
- Dos 70 eleitos em 2026 por SP, **40 já estão em exercício** (reeleitos de fato).
  Os 4 ambíguos da E1 eram todos reeleitos com nome parlamentar diferente do nome de urna.
- Guilherme Derrite (senador eleito) é deputado em exercício: o card dele em 2026 usa o
  histórico da Câmara, e a partir de 2027 o do Senado. Caso a tratar no modelo (`mandatos`).
- Amostra: 12 com registro (10 reeleitos + João Paulo Cunha + Derrite); 4 novos sem registro
  até 01/02/2027 (Sargento Nantes, Lucas Pavanato, Renato Bolsonaro, Guilherme Cortez).

## E3 · Câmara: votações do plenário 2023→2026 (2026-10-29)

### Limites reais da API
- `/votacoes` aceita **no máximo 3 meses** entre `dataInicio` e `dataFim` (400 com mensagem
  explícita). `lib/camara.ts#janelas` divide em janelas de 90 dias.
- `itens` tem teto de **100** por página (pedir 200 devolve 100). Paginar por `links.next`.
- `idOrgao=180` devolve só `siglaOrgao=PLEN`. OK.

### Volume (2023-01-01 → 2026-10-29)
| Ano | Votações listadas | Nominais |
|---|---|---|
| 2023 | 1.048 | 300 |
| 2024 | 2.128 | 277 |
| 2025 | 1.983 | 413 |
| 2026 | 1.378 | 127 |
| **Total** | **6.537** | **1.117** |

2.611 chamadas em 7m40s com 6 em voo: **zero retries, zero falhas**. Bem mais estável que o
`/deputados/{id}` da E2. O cron diário só precisa da janela dos últimos dias.

### Separar nominal de simbólica sem chamar `/votos`
A descrição das votações nominais traz o placar: `"... Sim: 323; Não: 106; Total: 429."`.
Validado no trimestre 2025-Q2 (303 votações, todas conferidas em `/votos`):
VP=129, VN=173, **FP=0, FN=1** (`2355104-96`, "Rejeitado o Requerimento." com 385 votos e sem
placar). Precisão 100%, recall ~99%. Para a sonda, a E4 chama `/votos` de todas as 6.537 e fecha
a lista exata; no cron, `/votos` de tudo que entrou no dia (poucas por dia) e a heurística não é
necessária.

### Shapes
- `/votacoes/{id}`: `proposicoesAfetadas[]` (tipo, número, ano, ementa) é a matéria principal;
  `objetosPossiveis[]` o objeto imediato (requerimento, emenda). `proposicaoObjeto` da listagem
  vem preenchido em ~15% dos casos. Só 1 nominal sem proposição afetada (`2576389-4`, votação de
  pessoa, descrição multilinha com `\r\n`).
- Tipos das 1.117: PL 711, PLP 166, PEC 100, MPV 71, PDL 43, outros 26.
- `aprovacao`: 1 em 529, 0 em 398, **null em 190**. Não usar como "resultado" sem fallback
  para a descrição.
- `/orientacoes`: `siglaPartidoBloco` ∈ {Governo, Oposição, Minoria, Maioria, partidos,
  federações como `Fdr PSOL-REDE`, `Fdr PT-PCdoB-PV`, blocos como `Bl MdbPsdRepPode`};
  `codTipoLideranca` P (partido) ou B (bloco/liderança). 18 nominais sem nenhuma orientação.
- **Valores de `orientacaoVoto`: `Sim`, `Não`, `Obstrução`, `Liberado` e string vazia `""`.**
  Para "Governo": Sim 510, Não 348, vazio 213, Liberado 25, Obstrução 3. Vazio e Liberado
  **não entram** no denominador do governismo; a E4 implementa assim e `/como-funciona` explica.
- 1.099 das 1.117 nominais têm orientação "Governo".

### URL oficial
`https://www.camara.leg.br/propostas-legislativas/{proposicaoId}` da proposição afetada.
A votação em si não tem página pública estável; quando não há proposição, fica a URI da API.

## E4 · Câmara: votos nominais e os dois primeiros números (2026-10-29)

### `/votos` em todas as 6.537 listadas
- 6.537 chamadas (+ cache em `data/raw/apoio/votos-cache/` para reexecução). Primeira passada:
  83 × **404** (a API não tem `/votos` para ~1,3% das votações listadas; tratado como "sem votos"),
  3 × **429** (primeiro rate limit observado, com 6 em voo; resolvido no retry de 1 s),
  2 × `tipoVoto: null`. Segunda passada com cache: 0 falhas em 32 s.
- **Lista exata: 1.107 nominais** (a heurística do placar dava 1.117: 17 falsos positivos com
  placar na descrição mas `/votos` vazio ou 404, e 7 falsos negativos sem placar). O cron
  sempre confirma por `/votos`.
- `tipoVoto: null` aparece em votações de pessoa (ex.: `2576389-4`, `2645346-18`): voto
  registrado sem valor divulgado. Mapeado para `nao_informado`: conta na participação, não
  no governismo.
- Tipos de voto nos 8.476 votos da amostra: sim 4.648, não 3.693, obstrução 83, abstenção 36,
  não informado 15, art. 17 1.

### Os dois números (2023-01-01 → 2026-10-29, período de governo único)
| Político | Partido | Participação | Governismo |
|---|---|---|---|
| Kiko Celeguim | PT | 82,7% (916/1107) | 97,9% (699/714) |
| Erika Hilton | PSOL | 71,0% (786/1107) | 85,9% (532/619) |
| Sâmia Bomfim | PSOL | 77,6% (859/1107) | 82,2% (539/656) |
| Kim Kataguiri | MISSÃO | 79,6% (881/1107) | 24,4% (172/706) |
| Tabata Amaral | PSB | 84,6% (937/1107) | 86,9% (639/735) |
| Delegado Palumbo | PODE | 99,3% (1099/1107) | 25,5% (219/860) |
| Mauricio Neves | PP | 57,4% (635/1107) | 77,3% (382/494) |
| Marcio Alvino | PL | 89,0% (985/1107) | 22,3% (172/772) |
| Baleia Rossi | MDB | 57,5% (637/1107) | 83,9% (412/491) |
| Delegado Bruno Lima | PODE | 56,7% (628/1107) | 78,1% (381/488) |
| Guilherme Derrite | PP | 10,2% (113/1107) | 21,3% (19/89) |
| João Paulo Cunha | PT | sem mandato no período | — |

Gerado por `scripts/sonda/_numeros.ts` com `lib/indicadores.ts`.

### Metodologia fixada (espelhar em `/como-funciona`)
- **Participação** = votações nominais do plenário no período em que o político registrou
  Sim, Não, Abstenção, Obstrução, Art. 17 ou voto não informado ÷ total de nominais no período.
- **Governismo** = votos Sim/Não/Obstrução coincidentes com a orientação "Governo" ÷ votos
  Sim/Não/Obstrução em votações onde o Governo orientou Sim, Não ou Obstrução. Orientação
  "Liberado" ou vazia, abstenção, ausência e art. 17 ficam fora do denominador.
- Período de governo: corte em 01/01/2027.

### Questões de metodologia que o dado levantou (decidir antes do protótipo)
1. **Licença conta como ausência?** Derrite (licenciado para a Secretaria de Segurança de SP)
   tem 10,2%; Baleia Rossi, Mauricio Neves e Bruno Lima ~57%. O número é verdadeiro ("registrou
   voto em X% das votações"), mas sem contexto parece punição. Opção simples e honesta: manter o
   número e mostrar ao lado "licenciado N dias no período", vindo de `/historico`.
2. **Denominador por mandato.** João Paulo Cunha dá 0/1107 porque não tinha mandato. O card
   deve mostrar "sem mandato no período", não 0%. A E8 modela `mandatos` e a participação
   passa a usar só as votações dentro do mandato.

## E5 · Câmara: CEAP e média da bancada de SP (2026-10-29)

### A API
- `/deputados/{id}/despesas?ano=2025` devolve **vazio** (também com `mes`, sem ordenação, em
  2023/2024, para vários deputados). Só funciona com **`idLegislatura=57&ano=…`**. Não está na doc.
- ~10 páginas de 100 por deputado-ano. 70 deputados × 2025–2026 = 538 chamadas, 44 s, 0 falhas,
  1 retry. 46.389 documentos.
- `codDocumento` repetido **não é duplicata**: passagens SIGEPA têm várias linhas por código
  (trechos, estornos com `valorLiquido` negativo). 3.063 linhas negativas em SP. Somar tudo.
- Paginação estável (mesma página duas vezes = mesma sequência; páginas não se sobrepõem).
- Campos: `ano`/`mes` = competência (9 de 181 documentos do Kim têm `dataDocumento` em outro
  mês). `urlDocumento` é null nas SIGEPA (não há nota).

### O CSV anual oficial não serve para a média
`camara.leg.br/cotas/Ano-{ano}.csv.zip` (6 MB zipado, 171k linhas em 2025, UTF-8 com BOM,
`;`, tem `ideCadastro` = id da Câmara e **CPF em claro**) foi testado como atalho para a média:
- **Omite "PASSAGEM AÉREA - SIGEPA"**: Kim Kataguiri 2025 = R$ 151.745 na API, R$ 35.043 no CSV.
- Inclui micro-itens de TELEFONIA (R$ 0,99 "RAMAL") que a API não traz.
- Só 25 de 227 deputado-meses batiam. Descartado: o número do político e a média precisam
  vir da mesma fonte. O cron mensal faz 513 × ~10 páginas ≈ 5k chamadas; cabe.

### Média da bancada de SP por mês (API, R$)
| Mês | Média | Com lançamento | | Mês | Média | Com lançamento |
|---|---|---|---|---|---|---|
| 2025-01 | 30.615 | 64 | | 2026-01 | 37.260 | 64 |
| 2025-02 | 38.609 | 64 | | 2026-02 | 40.876 | 65 |
| 2025-03 | 36.787 | 64 | | 2026-03 | 45.797 | 67 |
| 2025-04 | 38.044 | 64 | | 2026-04 | 47.386 | 70 |
| 2025-05 | 39.528 | 64 | | 2026-05 | 52.072 | 70 |
| 2025-06 | 37.650 | 64 | | 2026-06 | 31.499 | 70 |
| 2025-07 | 40.373 | 64 | | 2026-07 | 29.393 | 69 |
| 2025-08 | 41.799 | 64 | | 2026-08 | 22.634 | 69 |
| 2025-09 | 42.491 | 64 | | 2026-09 | 17.254 | 64 |
| 2025-10 | 41.722 | 64 | | 2026-10 | 9.831 | 56 |
| 2025-11 | 38.220 | 64 | | | | |
| 2025-12 | 38.657 | 65 | | | | |

Média = soma dos deputados com lançamento no mês ÷ quantidade deles (6 dos 70 só assumiram em
2026). A queda a partir de jun/2026 mistura **lançamento em aberto** (a cota é prestada com
meses de atraso) e possivelmente o período eleitoral; não dá para separar com uma foto só.

### Amostra em 2026-08 (média SP R$ 22.634)
Celeguim 39.717 · Sâmia 32.973 · Bruno Lima 32.017 · Derrite 26.239 · Baleia 24.266 ·
Kataguiri 20.636 · Tabata 18.949 · Erika 9.897 · Mauricio Neves 8.790 · Palumbo 8.365 ·
Alvino 1.838. Categorias de SP no período: divulgação 17,7 mi; escritório 9,3 mi;
locação de veículos 8,3 mi; SIGEPA 6,6 mi; combustível 3,7 mi.

### Decisão pendente: qual mês o card mostra
"CEAP do mês" não pode ser o mês corrente (incompleto). Proposta: o cron guarda o total de
cada deputado-mês a cada execução e marca o mês como **fechado** quando o total de SP não muda
entre duas execuções mensais; o card mostra o último mês fechado e o rótulo "mês de referência:
jun/2026". Até ter duas execuções, usar regra provisória: último mês com ≥90% da bancada com
lançamento (hoje: 2026-08).

## E6 · Senado: adapter, join e votações (2026-10-29)

### A API (OpenAPI 4.1.3 em `/dadosabertos/v3/api-docs`)
- `/dadosabertos/docs/` é um Swagger UI; o JSON com os 157 paths está em `/dadosabertos/v3/api-docs`.
- Os paths de votação que o `CLAUDE.md` listava estão **DEPRECATED** (`/senador/{codigo}/votacoes`,
  `/plenario/lista/votacao/{inicio}/{fim}`, `/plenario/votacao/nominal/{ano}`). O substituto é
  `GET /votacao?dataInicio&dataFim` (janela ≤ 1 ano; 400 acima). 4 chamadas cobrem 2023-02→hoje
  em 6 s (maior resposta: 2,7 MB, 2023).
- Orientação: `GET /plenario/votacao/orientacaoBancada/{AAAAMMDD}/{AAAAMMDD}` aceitou o período
  inteiro numa chamada (2,4 MB, 6 s). Chave de junção: `sequencialVotacao`.
- JSON via `Accept: application/json` em todos; `.json` no path só redireciona (301). A conversão
  XML→JSON devolve objeto quando há um item (`Partidos.Partido`) e omite a chave quando vazio
  (`Parlamentares` some em `lista/atual?uf=AC&participacao=S`).
- **Sem CPF em nenhum endpoint** (0 ocorrências no OpenAPI).
- Foto: `UrlFotoParlamentar` vem em `http://` e redireciona duas vezes até
  `https://legis.senado.leg.br/senadores/fotos-oficiais/{codigo}` (JPEG, ~240 KB).

### Shape de `/votacao` (2023-02-01 → 2026-10-29)
- **426 votações nominais** do plenário (2023: 141 · 2024: 95 · 2025: 128 · 2026: 62). Só
  `casaSessao: SF` (DOR 400, DEX 26). Vetos (sessão conjunta do CN) não aparecem.
- **Cada votação lista os 81 senadores.** Siglas vistas: Sim 9.548 · Não 2.596 · Abstenção 33 ·
  "Votou" 12.708 (secreta) · P-NRV 5.222 (presente, não registrou voto) · AP 2.395 (atividade
  parlamentar) · LS 877 · MIS 620 · "Presidente (art. 51 RISF)" 195 · NCom 152 · LP 128 · NA 31 ·
  LAP 1. Ao contrário da Câmara, a ausência é explícita e tem motivo.
- **240 das 426 (56%) são secretas**: MSF 188 (sabatinas de autoridades), OFS 49, PDL 3. Nelas o
  voto é só "Votou". Nenhuma secreta tem orientação do Governo.
- `sequencialVotacao` nulo em 10 (todas abertas, quase todas requerimentos) → sem orientação.
  `codigoSessaoVotacao` é único e vira `idExterno`. Todas têm `codigoMateria` → URL oficial
  `www25.senado.leg.br/web/atividade/materias/-/materia/{codigoMateria}`.

### Orientação de bancada
- 427 votações no período; 2.043 orientações juntadas. 11 sem par em `/votacao`: 7 sessões
  conjuntas do CN e 4 que correspondem a votações de `sequencialVotacao` nulo (não juntadas).
- Bancadas: partidos na grafia da API ("Republica", "Podemos", "UNIÃO"), "Governo" (136),
  "Oposição", "Maioria", "Minoria", "Banc Fem". Valores SIM/NÃO/LIVRE/OBSTRUÇÃO/null →
  Sim/Não/Liberado/Obstrução/"" no adapter.
- Governo orientou Sim/Não/Obstrução em **129 votações abertas** (2023: 36 · 2024: 44 · 2025: 39 ·
  2026: 10). É o denominador máximo do governismo de um senador.

### Join com o TSE
- Sem CPF, o join é nome completo (NFD sem acento, maiúsculas) + UF entre
  `NomeCompletoParlamentar` e `NM_CANDIDATO`: 3/3 casaram sem ambiguidade (Marcos Cesar Pontes
  2022; Mara Cristina Gabrilli 2018; Alexandre Luiz Giordano 2018, 1º suplente). O método fica
  gravado em `join: "nome_completo+uf"`.
- André do Prado e Derrite não existem no Senado até 01/02/2027 (Derrite já tem `camaraId`).

### Perfil, mandatos, licenças
- `/senador/{codigo}` v6: nome parlamentar e completo, e-mail oficial, foto, nascimento,
  telefones. `/mandatos`: as duas legislaturas do mandato, titular/suplente, exercícios e
  histórico de filiação (Giordano: 1º suplente de Major Olimpio, em exercício desde 2021-03-31;
  PSL → MDB → sem partido → PODE em 2026-03). `/licencas?dataInicio`: períodos com tipo.

### Os dois números (mesmas funções da Câmara, 2023-02-01 → 2026-10-29)

| Senador | Partido | Participação | Governismo | Ausências por sigla | Licenças desde 2023-02 |
|---|---|---|---|---|---|
| Astronauta Marcos Pontes | PL | 71,4% (304/426) | 55,1% (54/98) | P-NRV 47, MIS 46, LS 17, AP 9, NCom 3 | 28 (88 dias) |
| Giordano | PODE | 46,0% (196/426) | 98,4% (61/62) | AP 166, P-NRV 40, MIS 17, NCom 7 | 81 (176 dias) |
| Mara Gabrilli | PSD | 38,3% (163/426) | 91,7% (77/84) | LS 132, P-NRV 57, MIS 57, AP 17 | 43 (248 dias) |

Participação só nas 186 abertas: Pontes 80,6% · Giordano 51,6% · Mara Gabrilli 67,7%. Só nas 240
secretas: 64,2% · 41,7% · 15,4%. Tipos de voto dos 3 no total: ausente 615, secreto 291, sim 289,
nao 82, abstencao 1.

### Metodologia (soma à da E4; espelhar em `/como-funciona`)
- Novo tipo `secreto` (Senado, "Votou"): conta na participação — o painel registra que votou,
  só não diz como —, nunca entra em governismo nem concordância.
- Sigla de comparecimento (P-NRV, AP, MIS, LS, LP, LAP, NCom...) → `ausente`;
  "Presidente (art. 51 RISF)" → `art17`; NA (dispositivo não citado) → `nao_informado`.
- Vetos ficam fora dos dois números nas duas Casas (sessão conjunta do CN não está em
  `/votacao` nem em `/votacoes?idOrgao=180`).
- `participacao()` e `governismo()` rodaram sem alteração para senador; fixture real em
  `tests/fixtures/indicadores-senado-real.json` (Marcos Pontes, 2025).

### Questões que o dado levantou (continuam a lista da E4)
3. **Secretas no denominador da participação?** 56% das nominais do Senado são secretas
   (sabatinas). Com elas, Mara Gabrilli tem 38,3%; só nas abertas, 67,7%. Proposta: manter —
   é votação nominal do plenário e o painel registra quem votou — e dizer em `/como-funciona`
   que no Senado o número inclui votações secretas.
4. **P-NRV** ("presente, não registrou voto") conta como ausência. É o que o rótulo
   "participação em votações" promete; a sigla crua fica gravada para quem quiser ver.
5. **Licença no Senado** reforça a questão 1 da E4: Mara Gabrilli tem 132 ausências por licença
   saúde e 43 licenças (248 dias) no período. O dado oficial já está em `senadores.json`
   (`licencas`) para mostrar "licenciada N dias no período" ao lado do número.

## E7 · Quociente eleitoral e top-20 por município (2026-11-01)

### Fontes
- `votacao_partido_munzona_2026` (votos de legenda por lista), `votacao_candidato_munzona_2026`,
  `consulta_cand_2026` e `detalhe_votacao_munzona_2026`, todos de SP.
- Gabarito do quociente: Relatório de Resultado da Totalização SP 2026 (PDF do TSE, 475 páginas),
  Anexos VI (QE e QP), VII (sobras, média a média) e VIII (resumo). Texto extraído com PDFKit
  do macOS, sem dependência nova.
- Gabarito do top-20: JSON oficial de divulgação por município e cargo em `resultados.tse.jus.br`.
- **O TSE regenerou os CSVs em 01/11** (zip de outro tamanho, linhas reordenadas, nova
  `DT_GERACAO`). Comparação por candidato: votos e situação idênticos aos de 29/10.

### Quociente: deputado federal SP 2026

| | Valor |
|---|---|
| Vagas | 70 |
| Votos válidos (nominais 22.988.308 + legenda 685.880) | 23.674.188 |
| QE | 338.203 |
| Preenchidas por QP / por média | 60 / 10 |

`lib/quociente.ts` reproduz o relatório oficial sem diferença: QE, as 20 listas e os 70 eleitos
um a um (`DS_SIT_TOT_TURNO`), inclusive a ordem das sobras (1ª média PODE, 2ª FE Brasil).
Os CSVs de partido e de candidato batem entre si e com o PDF em todas as listas.

| Lista | QP obtidas | QP preenchidas | Média | Total |
|---|---|---|---|---|
| PL | 19 | 19 | 0 | 19 |
| Federação PSOL REDE | 9 | 6 | 0 | 6 |
| Federação Brasil da Esperança (PT/PCdoB/PV) | 8 | 8 | 3 | 11 |
| PODE | 5 | 5 | 1 | 6 |
| Federação União Progressista (UNIÃO/PP) | 5 | 5 | 0 | 5 |
| PSD | 4 | 4 | 2 | 6 |
| REPUBLICANOS | 4 | 4 | 2 | 6 |
| MDB | 3 | 3 | 1 | 4 |
| PSB | 2 | 2 | 0 | 2 |
| MISSÃO, Federação PSDB Cidadania, Federação Renovação Solidária | 1 | 1 | 0 | 1 cada |
| NOVO | 1 | 1 | 1 | 2 |
| AVANTE, PDT, DC, UP, PSTU, DEMOCRATA, AGIR | 0 | 0 | 0 | 0 |

**Caso de borda real:** a Federação PSOL REDE obteve 9 vagas por QP (3.060.751 ÷ 338.203) mas só
tinha 6 candidatos com 10% do QE. As 3 vagas foram para as sobras, e ela não entrou nas médias
porque não tinha candidato restante com 20% do QE. O divisor da média usa as vagas *obtidas*
por QP (9), não as preenchidas. Todas as 10 sobras saíram na fase com exigência 80/20; a fase
aberta a todos não foi usada em 2026.

### Metodologia (espelhar em `/como-funciona`)
- QE = válidos ÷ vagas, fração ≤ 0,5 desprezada. QP = válidos da lista ÷ QE, fração desprezada.
- Vaga de QP só para candidato com ≥ 10% do QE; a que sobrar vai para as médias.
- Sobras: maior média = válidos da lista ÷ (vagas obtidas por QP + vagas por média + 1);
  primeiro entre listas com ≥ 80% do QE e candidato não eleito com ≥ 20%; depois entre todas,
  sem votação mínima (STF, 2024). Empate de média: lista mais votada; de candidatos: mais idoso.
- Federação é uma lista só. A frase é da lista: "seu voto contou para [lista], que elegeu N em
  SP" (N = total da lista; com N = 0, "que não elegeu ninguém em SP"). Senador: sem frase.

### Top-20 por município (`data/sonda/eleitos-mun.json`, 547 KB)
- 645 municípios × {deputado federal, senador}: 20.365 linhas, 435 candidatos distintos.
- **Empate na borda**: em 81 listas há quem empate com o 20º (cidades pequenas, 2–3 votos).
  Decisão: incluir todos os empatados (maior lista: 23), em vez de cortar por um critério que a
  fonte não tem. Senador tem só 13 candidatos; em Borá, 7 com voto.
- Código IBGE pela API de localidades do IBGE: 644 por nome normalizado, 1 por de-para
  (São Luís do Paraitinga).
- **Conferência**: São Paulo (9,1 mi de eleitores), Santos (348 mil) e Borá (1.094) iguais ao JSON
  oficial nos dois cargos; depois os 645 municípios: **1.290/1.290 iguais**, 1.290 chamadas em
  104 s, 0 falhas.

### Foto dos candidatos (resolve a pendência da E1)
- O JSON de divulgação aponta um diretório de fotos: `resultados.tse.jus.br/oficial/ele2026/6259/
  fotos/{uf}/{sq_candidato}.jpeg`. Respondeu JPEG (~6 KB) para os 17 candidatos de 2026 da
  amostra, inclusive os novos. É URL oficial e pública: o card usa direto, sem hospedar nem
  proxiar. A E8 preenche `fotoUrl` com ela para quem não tem foto da Câmara/Senado.

### Questões que o dado levantou
6. **Nome da lista no card.** O nome oficial da federação é longo e em maiúsculas
   ("FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL (PT/PC do B/PV)"). Decidir na E10 entre o nome
   oficial e a composição curta ("PT/PCdoB/PV"), sem inventar apelido.

## E8 · Consolidação (2026-11-01)

### O que foi para `data/` (shape final, `scripts/sonda/consolidar.ts`)

| Tabela | Linhas | Observação |
|---|---|---|
| politicos | 438 | 435 candidatos de algum top-20 (E7) + 3 senadores em exercício |
| mandatos | 149 | posse → saída, do histórico da Câmara e dos exercícios do Senado |
| afastamentos | 185 | licenças dentro do mandato (secretaria, saúde, missão) |
| listas | 20 | partidos e federações do quociente (E7) |
| municipios | 645 | TSE + IBGE |
| eleitos_mun | 20.365 | top-20 + empatados, posição compartilhada no empate |
| despesas_mes | 1.273 | CEAP dos deputados em exercício que estão em `politicos` |
| despesas_media_uf | 22 | média SP por mês (os 70) |
| votacoes | 1.533 | 1.107 Câmara + 426 Senado; 16 marcadas para o quiz |
| votos | 49.949 | 62 deputados + 3 senadores |
| orientacoes | 13.712 | as duas Casas |
| quiz | 10 | ver `docs/QUIZ.md` |

Status: 40 reeleitos, 30 eleitos, 321 suplentes e 32 não eleitos (deputado); 2 eleitos, 10 não
eleitos e 3 em exercício (senador). Foto para os 438 (Câmara/Senado para quem está em exercício,
URL do TSE para os demais); e-mail oficial para 65.

### Ampliação de escopo: a bancada de SP inteira
O top-20 por cidade traz deputados em exercício fora da amostra de 20. Para que todo card de
deputado em exercício tenha os mesmos dados, a E8 buscou perfil e histórico dos 70 de SP
(`scripts/sonda/bancada.ts`, 69 ok, 1 com 504 persistente), recalculou os votos dos 69 a partir
do cache da E4 (sem nova chamada a `/votos`) e a CEAP dos 70 (140 chamadas, 0 falhas).
O consulta_cand de 2026 não tem campo de reeleição: "reeleito" sai deste join, que bateu com
o da E2 (40 dos 70 eleitos já em exercício).

### Decisões de modelo
- **Sem CPF nem hash em lugar nenhum.** O join por hash é feito em memória pelo cron a cada
  execução; só o par de ids é gravado. Resolve a pendência da E1 (hash sem sal é reversível) da
  forma mais simples: não há o que proteger. `validar.ts` falha se aparecer um hash SHA-256.
- **Uma pessoa, um registro**, `id` = slug do nome de urna (colisão: + número de urna). Derrite é
  `senador · eleito` e os números vêm dos mandatos de deputado.
- **`data/*.json` = linhas do Supabase em snake_case**; o código usa camelCase. `Linha<T>` deriva o
  tipo da linha, `paraLinha`/`deLinha` convertem; um só lugar para os nomes de coluna.
- **Votação com id `casa:id_externo`**: os ids das duas Casas não têm relação.
- **Placar exato** contado dos votos (Câmara: cache de `/votos`; Senado: 81 votos da `/votacao`),
  null em votação secreta.
- **Senado guarda a ausência com o motivo** (`votos.detalhe` = sigla do painel); a Câmara não
  informa motivo, a ausência é implícita.

### Metodologia (espelhar em `/como-funciona`)
- **Participação por mandato** (questão 2 da E4, decidida): o denominador são as votações
  nominais do plenário no período que caem dentro de algum mandato em exercício. Sem mandato no
  período, o número não existe ("sem mandato no período"), nunca 0%. Licença dentro do mandato
  **não** é descontada (questão 1 da E4 continua aberta; os dados estão em `afastamentos`).
- Os números da amostra não mudaram com isso, exceto João Paulo Cunha (de 0/1.107 para "sem
  mandato no período"): os demais estiveram no mandato o período todo.

### CEAP: a evidência para o "mês fechado"
Duas coletas com 3 dias de diferença (30/10 e 01/11): o total de SP de jan/2025 a **jul/2026**
ficou idêntico ao centavo; ago–out/2026 mudaram (ago: R$ 1.561.760 → R$ 1.564.126; out:
R$ 550.552 → R$ 639.257). Reforça a proposta da E5: mês fechado = total da bancada estável entre
duas coletas. (Correção: uma versão anterior deste texto dizia "jun–out subiu"; a comparação
mês a mês mostra que junho e julho não mudaram.)

### Decisões tomadas em 2026-11-01 (antes do protótipo)
Texto canônico em `docs/METODOLOGIA.md`.
1. **Licença não é descontada** da participação; o card mostra "afastado N dias no período"
   (`lib/indicadores.ts#diasAfastado`). Derrite: 10,2% e 1.041 dias; Mara Gabrilli: 38,3% e 246.
2. **Votações secretas do Senado entram** no denominador da participação, com aviso em
   `/como-funciona`.
3. **P-NRV conta como ausência**.
4. **CEAP: último mês fechado** (`lib/ceap.ts#mesesFechados`, coluna `despesas_media_uf.fechado`).
   Com as coletas de 30/10 e 01/11, o mês de referência é **jul/2026**. Sem intervalo mínimo
   entre coletas (decidido em 2026-11-01): exigir 28 dias deixaria o card sem CEAP até a
   segunda coleta mensal, e no cron o intervalo mensal já vem naturalmente. Também ficou de
   fora uma trava pelo prazo de 90 dias para apresentar comprovantes (Ato da Mesa 43/2009, não
   conferido).
5. **Federação no card**: "Federação " + composição do TSE ("Federação PT/PC do B/PV"), nome
   oficial completo no tooltip (`lib/quociente.ts#nomeCurtoLista`).
6. **Quiz aprovado** como proposto em `docs/QUIZ.md` (10 perguntas: 6 com votação de mérito nas
   duas Casas e 4 só na Câmara).
