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
