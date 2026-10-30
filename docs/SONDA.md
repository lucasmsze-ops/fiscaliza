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
