# Metodologia

Nota técnica da metodologia. Desde a E15 o texto para o eleitor é a própria página
`/como-funciona` (`app/como-funciona/page.tsx`), cujos números saem do `repo`; este arquivo guarda
o que não cabe lá (nomes de campos, decisões datadas). Toda mudança em `lib/indicadores.ts`,
`lib/quociente.ts` ou `lib/ceap.ts` atualiza a página e este arquivo no mesmo commit. Decisões de
2026-11-01, com o dado real da sonda (ver `docs/SONDA.md`).

## Participação em votações
- **O que é:** % das votações nominais do plenário em que o político registrou voto.
  Rótulo: "participação em votações", nunca "presença".
- **Denominador:** votações nominais do plenário da Casa no período de governo (corte em
  01/01/2027) que caem dentro de algum mandato em exercício (`mandatos`). Sem mandato no
  período, o número não existe: "sem mandato no período", nunca 0%.
- **Conta como voto registrado:** Sim, Não, Abstenção, Obstrução, Art. 17 (presidente da sessão
  na Câmara; art. 51 do Regimento no Senado), voto não informado pela fonte e **voto em votação
  secreta do Senado** (o painel registra que votou, só não diz como).
- **Conta como ausência:** não aparecer na lista de votos (Câmara) ou qualquer sigla de
  comparecimento do Senado, inclusive **"presente, não registrou voto"** (P-NRV). Contar presença
  seria medir presença em sessão, que está fora do escopo.
- **Licença não é descontada.** O número fica como a fonte permite conferir, e ao lado o card
  mostra **"afastado N dias no período"**, a soma dos afastamentos oficiais (licenças da Câmara
  pelo histórico; licenças do Senado), sem contar dias repetidos.
- **No Senado, o número inclui as votações secretas** (56% das nominais de 2023–26, quase
  todas sabatinas de autoridades). `/como-funciona` diz isso explicitamente.

## Governismo
- % dos votos Sim/Não/Obstrução que coincidem com a orientação "Governo", nas votações em que o
  Governo orientou Sim, Não ou Obstrução.
- Fora do denominador: orientação "Liberado" ou vazia, abstenção, ausência, Art. 17, voto não
  informado e voto secreto.
- Calculado por período de governo (corte em 01/01/2027), não por legislatura.

## Cota parlamentar (CEAP na Câmara, CEAPS no Senado)
- Valor líquido do mês (estornos somados, em centavos inteiros), comparado com a **média da
  bancada da mesma UF, na mesma Casa**, no mesmo mês. Nunca média nacional.
- **Quem entra na média:** todos os parlamentares da UF com algum lançamento no mês, inclusive
  quem já saiu e não está no site (titular licenciado, quem renunciou). Por isso troca de
  suplente não muda meses passados. Quem não lançou nada no mês fica fora. No Senado a bancada
  tem até 3 senadores, contando a própria pessoa. A UF é a da bancada na Casa (`despesas_mes.uf`),
  não a da candidatura de 2026 (3 deputados disputaram 2026 por outro estado).
- **Mês mostrado: o último mês fechado.** As Casas lançam a cota com meses de atraso. A coleta é
  mensal (`scripts/cron/cota.ts`). Um mês é fechado quando o total da bancada é idêntico ao da
  coleta anterior (o publicado), com pelo menos 20 dias entre as duas, e todos os meses anteriores
  também são. Com a anterior mais recente que isso, nenhum mês novo fecha (`lib/ceap.ts#fecharMeses`).
  O card mostra "mês de referência: [mês/ano]".
- **Primeira coleta nacional (2026-11-02):** não havia coleta anterior para 53 das 54 bancadas, e a
  de SP seguia a regra antiga (só os deputados em exercício). Fecharam os meses até o último fechado
  de SP medido entre 30/10 e 01/11 (jul/2026), para as duas Casas. A partir da coleta de dezembro,
  vale a regra acima.
- Fontes: API da Câmara (`/deputados/{id}/despesas`, todos os deputados da legislatura 57); o CSV
  anual não serve para a média porque omite as passagens aéreas compradas pelo sistema da Câmara.
  Senado: arquivo anual da CEAPS (`adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}`),
  sem fornecedor nem CPF/CNPJ; despesa sem tipo vira "Tipo não informado pela fonte". Desde 2025.

## Propostas de autoria
- Desde 2023, só de quem foi coletado: quem passou pela Câmara na legislatura 57 ou está no Senado
  (`politicos.camara_id` ou `senado_codigo`). Para os demais a seção não existe (não é zero).
- **Autor:** Câmara, `proponente = 1` em `proposicoesAutores` (apoio de PEC fica fora); Senado,
  `autoriaIniciativa` de `/processo/{id}`. **Primeiro autor:** `ordem = 1` (ordem de assinatura).
- **Podem virar lei:** PL, PLP, PEC, PDL, PRC (Câmara) e PL, PLP, PEC, PDL, PRS (Senado), com
  íntegra em `proposicoes`. **Viraram norma:** `virou_norma` (situação "Transformado(a) em Norma
  Jurídica"). Os demais tipos só como soma de `proposicoes_contagem` ("requerimentos, emendas e
  outros pedidos").
- A página mostra as 10 mais recentes por data de apresentação (`lib/pagina.ts`).

## Congresso hoje (`/congresso`)
- Cadeira ocupada na data = mandato em curso (`mandatos.fim` nulo, `inicio` ≤ data) sem afastamento
  que cubra a data (`lib/congresso.ts#emExercicio`). Em 2026-11-04: 575 mandatos em curso na Câmara
  (62 titulares licenciados) → 513 cadeiras; Senado 81.
- Bancadas por tamanho (empate pelo nome). Cor: a oficial de cada partido (Wikidata P465, conferida
  à mão; `lib/partidos.ts#COR_PARTIDO`), aplicada com `color-mix(in oklab, cor 82%, var(--texto))` para
  ganhar contraste nos dois temas; PRD, MISSÃO e UP sem cor oficial encontrada usam cor de apoio. A
  cor só distingue (partidos de cores parecidas existem, ex.: PL e PSDB): a lista com nome e cadeiras é
  obrigatória. Nunca por posição política.
- Câmara a partir de 01/02/2027 (`camaraEleita`): `politicos` com cargo deputado_federal e status eleito
  ou reeleito = 513, partido de hoje. Senado fora: das 27 cadeiras de 2022, 18 têm o titular em
  exercício; nas outras 9 não se sabe com dado quem ocupará a cadeira em fevereiro.
- Agenda: contagem de votações nominais por dia e Casa (`listarDatasVotacoes`); as votações de cada
  mês vêm de `/dados/votacoes/[mes]` (limites reais do mês: o Postgres recusa dia 31 inexistente).
  "Votações da última sessão": as do último dia com votação nominal em cada Casa. "O que virou
  norma" saiu da página (não está no protótipo); o número continua no crachá.
- Sigla de partido canônica (`lib/partidos.ts`): TSE "PCDOB" = Câmara/Senado "PCdoB" (20 políticos).

## Me representa (`/me-representa`, E23d)
- Cidade → UF (a tabela de municípios do TSE/IBGE); senadores e deputados federais são eleitos pelo
  estado inteiro, então a cidade mostra os do estado. Em exercício hoje, pela regra de `/congresso`.
- UF = a da cadeira (`mandatos.uf`: evento de posse no `/historico` da Câmara; `uf` do mandato no
  Senado), não `politicos.uf` (candidatura de 2026). Conferido: as 27 bancadas batem com as cadeiras
  da Constituição (art. 45: 8 a 70 deputados; art. 46: 3 senadores).

## Votação (`/votacoes/[id]`, E23k)
- Pré-calculada no cron (`scripts/cron/votacoes-paginas.ts` → `resumos_votacao`), porque o partido de
  cada voto no dia só existe nas respostas em cache das fontes. ~4 KB por votação, 1.537 votações.
- O que foi votado (`lib/votacao.ts#objetoVotado`), pela descrição oficial: autoridade (MSF/OFS ou
  "Votação nominal da Mensagem/do Ofício"); requerimento ("requerimento" ou "preferência" nos 60
  primeiros caracteres); recurso; redação final; destaque ("Mantido/Suprimido o texto", "o Destaque");
  texto principal (substitutivo, emenda aglutinativa substitutiva, projeto, proposta, PEC/PLP…); emenda.
  Em 1.537 votações: 6 sem padrão (só a descrição aparece). Turno ("1º/2º turno") só quando a
  descrição diz, e nunca num requerimento (o turno citado é o da votação pedida).
- Votos necessários: só no texto principal de PEC (308 / 49) e PLP (257 / 41). Demais tipos: a
  regra em texto (maioria dos votos com maioria absoluta presente), sem marca.
- Contagem: todos os votos do cache, inclusive de quem não tem página no site (ex-deputado que não
  disputou 2026): bate com o placar da tabela `votacoes` em 1.107/1.107 da Câmara. Não votou na
  Câmara = 513 − votos registrados; por partido, os deputados em exercício no dia (mandato e
  afastamentos) que não votaram, com o partido do voto deles mais próximo no tempo (sem voto
  nenhum, o de hoje). O resto (até 20 por votação, em 1.011 votações) não tem partido identificável
  e aparece numa nota. Senado: a fonte lista os 81, com o partido.
- Orientação por partido: a mesma regra de "votou com o partido" (`orientacaoDoPartido`: partido,
  federação ou bloco cujo nome o lista; bloco cortado sem o partido → "sem orientação registrada").
- Caminho: as votações nominais da mesma matéria (mesmo texto de `proposicao`) no Plenário da mesma
  Casa, por data e id. Não junta Câmara e Senado: a numeração da matéria muda entre as Casas.

## Visão geral (`/`)
- Mesmas cadeiras de `/congresso` (`lib/congresso.ts#casasHoje`), por estado: 3 senadores e os
  deputados federais da UF (`politicos.uf`). Municípios por UF de `municipios` (5.571).
- Cidade → estado: a cidade não muda quem a representa no Congresso (eleição pelo estado inteiro).

## Crachá (`/p/[slug]`, E23i)
- "Quem vota mais parecido" (`lib/comparacoes.ts`): quem está em exercício hoje na mesma Casa;
  votações nominais de 2023–2026; votos comparáveis Sim, Não, Abstenção, Obstrução (secreto,
  nao_informado, art17 e ausente ficam fora); % = iguais / em comum, uma casa; mínimo 50 em comum;
  empate pelo número em comum. Top 5.
- Participação ao lado da média: média simples da participação (mesma regra do card) de quem está
  em exercício hoje na Casa (513 / 81).
- "Mandato até": deputado na legislatura 57 → 31/01/2027; senador titular com posse em 01/02/2019 →
  31/01/2027, em 01/02/2023 → 31/01/2031; suplente: não se mostra (depende do titular).
- Nome do partido: `NM_PARTIDO` do TSE 2026, em caixa de título (`lib/partidos.ts`).
- "Votou com o partido?" (`lib/fidelidade.ts`, `scripts/cron/fidelidade.ts`): partido no dia de cada
  voto das respostas em cache (Câmara `/votacoes/{id}/votos`, Senado `/votacao`); bancada = partido,
  senão federação ("Fdr A-B-C"), senão bloco cujo nome abreviado o lista (de-para de abreviações com
  teste para todos os nomes de 2023–2026); bloco cortado ("...") sem o partido no trecho visível → fora.
  Senado: sinônimos Republica/Republicanos, Podemos, Progressistas. Voto e orientação de posição
  (Sim, Não, Obstrução), como no governismo. Mínimo 20 votações para o percentual. Cobertura em
  2026-11-04: 354 mil de 457 mil votos com a bancada identificada; PL, PT, União, PP, PSOL, PV,
  NOVO, REDE 100%; MDB, Republicanos, Podemos, PSDB sem 2025 (bloco cortado). Gravado em
  `estado/dados/fidelidade.json` (não vai ao banco; só o resumo da página).

## Salário
- Subsídio mensal bruto dos membros do Congresso, igual para deputados e senadores: Decreto
  Legislativo nº 172/2022, art. 1º (39.293,32 desde 01/01/2023; 41.650,92 desde 01/04/2023;
  44.008,52 desde 01/02/2024; 46.366,19 desde 01/02/2025). Conferido no texto oficial em
  2026-11-03 (`lib/salario.ts`). Só para quem exerce mandato hoje. Não inclui cota nem verba de
  gabinete.

## Como cobrar
- No lugar do antigo botão Cobrar (removido em 2026-11-01, junto com o quiz de concordância e
  "seu voto contou para"; ver `PLANO.md`, mudança de escopo).
- Só para quem tem mandato em curso na Casa (`mandatos.fim` nulo): contato oficial do gabinete
  (e-mail e telefone, quando a Casa publica), ouvidoria da Casa e canais externos (TCU, MPF,
  Fala.BR). Endereços em `lib/cobrar.ts`, cada um aberto e conferido pelo conteúdo da página
  oficial (uma página do TCU respondia 200 e dizia "não encontrada").
- O site não escreve nem envia mensagem.

## Receber avisos (fake door)
- O botão só explica que avisos ainda não existem. Não pede nem guarda contato. A contagem
  anônima dos toques entra com o Supabase (E19).

## Fontes
TSE (`dadosabertos.tse.jus.br` e `resultados.tse.jus.br`), Câmara dos Deputados
(`dadosabertos.camara.leg.br`), Senado Federal (`legis.senado.leg.br/dadosabertos`), IBGE
(códigos de município). Nenhum dado é inventado: o que a fonte não traz aparece como lacuna.
