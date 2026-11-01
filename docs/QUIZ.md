# Quiz de concordância — seleção das votações

Proposta da E8, **aprovada em 2026-11-01**. A seleção é editorial e pode ser revista sem mexer
em código além da lista `QUIZ` em `scripts/sonda/consolidar.ts`. São 10 perguntas: 6 com votação
de mérito nas duas Casas e 4 só na Câmara. Dados em
`data/quiz.json` e `data/votacoes.json` (`quiz: true`).

## Para que serve
O eleitor responde Sim ou Não a cada pergunta; a concordância é a % das perguntas respondidas em
que o voto do político (Sim/Não) coincide com a resposta (`lib/indicadores.ts#concordancia`).
Uma pergunta aponta para a votação de mérito da mesma matéria em cada Casa, quando houver, para
que a mesma resposta sirva para deputados e senadores.

## Critério (todos obrigatórios, salvo o 5)
1. **Votação nominal e aberta do plenário**, entre 2023 e 2026. Nada de votação secreta (o
   Senado não publica a direção do voto) nem simbólica.
2. **Mérito, não procedimento**: a votação do texto principal (projeto, substitutivo, PEC em
   segundo turno ou redação final). Fora: requerimentos, urgência, destaques, emendas avulsas e
   "mantido o texto", em que o Sim pode significar o contrário do que parece.
3. **Divisão real**: o lado perdedor teve pelo menos 20% dos votos Sim+Não em pelo menos uma
   Casa. Votação quase unânime não diferencia ninguém (por isso ficou fora, por exemplo, a
   isenção do IR até R$ 5 mil, PL 1087/2025, aprovada por 493 a 0).
4. **Tema explicável em uma frase, sem jargão**, e temas variados (economia, tributos,
   indígenas, meio ambiente, segurança, assistência social, terra, cotas, Congresso).
5. **Preferência por matéria votada nas duas Casas**, casada pela ementa ou pelo número (o
   Senado pode renumerar). Quando os textos votados nas duas Casas forem diferentes a ponto de
   não serem a mesma pergunta, fica só a Câmara.
6. **Equilíbrio de orientação**: não montar um quiz em que concordar com o Governo seja sempre
   Sim (ou sempre Não). Na proposta, o Governo orientou Sim em 4, Não em 5 e não orientou em 1.

Fontes do cruzamento: as 1.107 votações nominais da Câmara e as 186 abertas do Senado da sonda;
a lista de candidatas veio de 323 votações de mérito (218 Câmara, 105 Senado), das quais 97 com
divisão ≥ 20% e orientação Sim/Não do Governo.

## Seleção (10 perguntas, ordem cronológica)

| # | Matéria | Do que trata (da ementa oficial) | Câmara: data · Sim×Não · Governo | Senado: data · Sim×Não · Governo |
|---|---|---|---|---|
| 1 | PLP 93/2023 | Novo regime fiscal (limite de crescimento das despesas da União) | 23/05/2023 · 372×108 · Sim | 21/06/2023 · 57×17 · Sim |
| 2 | PL 490/2007 (no Senado, PL 2903/2023) | Demarcação de terras indígenas (marco temporal) | 30/05/2023 · 283×155 · Não | 27/09/2023 · 43×21 · Não |
| 3 | PEC 45/2019 | Reforma do sistema tributário | 06/07/2023 · 375×113 · Sim (2º turno) | 08/11/2023 · 53×24 · Sim (2º turno) |
| 4 | PL 709/2023 | Impedimentos para ocupantes e invasores de propriedades | 21/05/2024 · 336×120 · Não | — |
| 5 | PL 1958/2021 | Reserva de 30% das vagas de concursos federais para pretos, pardos, indígenas e quilombolas | 19/11/2024 · 241×94 · Sim | — (no Senado só houve votação nominal de requerimento) |
| 6 | PL 4614/2024 | Altera as leis do BPC (Lei 8.742) e do Bolsa Família (Lei 14.601), entre outras | 19/12/2024 · 264×209 · Sim | 19/12/2024 · 42×31 · Sim |
| 7 | PL 2159/2021 | Lei geral do licenciamento ambiental | 16/07/2025 · 231×87 · Não (redação final) | 21/05/2025 · 54×13 · Liberado |
| 8 | PEC 3/2021 | Prerrogativas parlamentares (arts. 14, 27, 53, 102 e 105 da Constituição) | 17/09/2025 · 314×168 · sem orientação | — (não chegou ao plenário do Senado) |
| 9 | PL 5582/2025 | Combate às organizações criminosas | 18/11/2025 · 370×110 · Não | — (ver nota) |
| 10 | PL 2162/2023 | Ementa original: anistia aos participantes das manifestações de 8 de janeiro de 2023. Texto aprovado (substitutivo; ementa no Senado): altera a Lei de Execução Penal e o Código Penal | 09/12/2025 · 291×148 · Não | 17/12/2025 · 48×25 · Não |

Votações exatas (ids) em `data/quiz.json`. "Do que trata" é um resumo da ementa oficial para esta
tabela; a pergunta ao eleitor e a explicação em três parágrafos são da E13, a partir do texto e
dos pareceres oficiais, sem adjetivo.

## Notas por item
- **PL 2159/2021**: o primeiro voto da Câmara foi em 2021, fora do período; em 2025 a Câmara votou
  as emendas do Senado e a redação final. A redação final (Sim = aprovar o texto que foi à
  sanção) é a votação de mérito usada. No Senado, a minoria foi 19%, abaixo do critério 3, mas a
  Câmara atende.
- **PL 5582/2025**: o Senado aprovou outro substitutivo (64×0, Governo Sim) contra o texto da
  Câmara (370×110, Governo Não). Não são a mesma pergunta e a votação do Senado não diferencia
  ninguém: o item fica só com a Câmara.
- **PEC 3/2021**: a votação nominal registrada é a da Emenda Aglutinativa nº 1 (o texto
  aprovado em plenário); não houve orientação do Governo.
- **PL 2162/2023**: `data/quiz.json` traz a ementa da Câmara, que ainda é a original (anistia); o
  que foi a voto nas duas Casas foi o substitutivo. A E13 explica o texto votado, não a ementa.
- **Senadores**: 6 das 10 perguntas valem para o Senado. Um senador sem voto Sim/Não nas 6
  (ausente) fica com a concordância oculta, como a regra já prevê.

## Fora da proposta, mas consideradas
PEC 221/2019 (escala 6x1, 472×22: sem divisão); PL 1087/2025 (IR, 493×0); PL 2253/2022 (saída
temporária, 62×2 no Senado, sem votação nominal de mérito na Câmara no período); PEC 48/2023
(marco temporal na Constituição, só Senado, repete o item 2); PLP 68/2024 (regulamentação da
reforma tributária, repete o item 3).
