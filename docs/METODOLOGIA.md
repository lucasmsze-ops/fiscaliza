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

## CEAP (cota parlamentar)
- Valor líquido do mês (estornos somados), comparado com a **média da bancada da mesma UF** no
  mesmo mês, contando só deputados com algum lançamento no mês. Nunca média nacional.
- **Mês mostrado: o último mês fechado.** A Câmara lança a cota com meses de atraso. Um mês é
  fechado quando o total da bancada é idêntico em duas coletas e todos os meses anteriores
  também são. O card mostra "mês de referência: [mês/ano]".
- Fonte: API da Câmara (`/deputados/{id}/despesas`). O CSV anual não serve para a média porque
  omite as passagens aéreas compradas pelo sistema da Câmara.

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
