# Metodologia

Texto-fonte da página `/como-funciona` (E14). Toda mudança em `lib/indicadores.ts`,
`lib/quociente.ts` ou `lib/ceap.ts` atualiza este arquivo no mesmo commit. Decisões de
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

## Concordância com você
- % das perguntas do quiz respondidas em que o voto Sim/Não do político coincide com a resposta.
  Cada pergunta aponta para a votação de mérito na Câmara e, quando é a mesma matéria e o mesmo
  texto, no Senado (`docs/QUIZ.md`). São 14 perguntas: 13 valem para deputados e 10 para senadores.
- Só entram perguntas em que o político votou Sim ou Não. Abstenção, ausência e voto secreto
  ficam fora. Na Câmara, quem não aparece numa votação dentro do mandato conta como ausente;
  fora do mandato, a pergunta não se aplica.
- **O card sempre mostra a base** ("54,5% · 6 de 11 votações do quiz") e **só mostra o
  percentual com pelo menos 3 votações comparáveis**; abaixo disso, "poucos votos para
  comparar" (decisão de 2026-11-01).
- Sem resposta do usuário: oculto. Eleito que ainda não tomou posse: "primeiro voto em fevereiro".
- As respostas ficam só no navegador (localStorage). Nada é enviado ao servidor.
- **Cobrar**: com respostas, o e-mail cita a primeira votação do quiz (na ordem do quiz) em que o
  voto Sim/Não do político diferiu da resposta, com data, matéria, o voto dele e o da pessoa.

## "Seu voto contou para"
- No sistema proporcional o voto vai para a lista (partido isolado ou federação, que conta como
  uma lista só), não para um candidato. Nunca "ajudou a eleger Z".
- Frase: "seu voto contou para [lista], que elegeu N em [UF]"; com N = 0, "que não elegeu
  ninguém em [UF]". Senador é eleição majoritária: sem frase.
- **Nome da lista:** partido isolado pela sigla ("PL"); federação por "Federação" + a composição
  como o TSE escreve ("Federação PT/PC do B/PV"), com o nome oficial completo no tooltip
  ("FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL").
- Cálculo das vagas: QE com fração ≤ 0,5 desprezada; QP desprezando a fração; vaga de QP só para
  candidato com ≥ 10% do QE; sobras pela maior média, primeiro entre listas com ≥ 80% do QE e
  candidato com ≥ 20%, depois entre todas. Conferido contra o relatório oficial de totalização de
  SP 2026: 70 de 70 vagas iguais.

## CEAP (cota parlamentar)
- Valor líquido do mês (estornos somados), comparado com a **média da bancada da mesma UF** no
  mesmo mês, contando só deputados com algum lançamento no mês. Nunca média nacional.
- **Mês mostrado: o último mês fechado.** A Câmara lança a cota com meses de atraso. Um mês é
  fechado quando o total da bancada é idêntico em duas coletas e todos os meses anteriores
  também são. O card mostra "mês de referência: [mês/ano]".
- Fonte: API da Câmara (`/deputados/{id}/despesas`). O CSV anual não serve para a média porque
  omite as passagens aéreas compradas pelo sistema da Câmara.

## Fontes
TSE (`dadosabertos.tse.jus.br` e `resultados.tse.jus.br`), Câmara dos Deputados
(`dadosabertos.camara.leg.br`), Senado Federal (`legis.senado.leg.br/dadosabertos`), IBGE
(códigos de município). Nenhum dado é inventado: o que a fonte não traz aparece como lacuna.
