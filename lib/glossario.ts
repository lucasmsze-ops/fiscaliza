/**
 * Explicações curtas dos termos do card e do jargão legislativo (CLAUDE.md: "sem jargão sem
 * tooltip"). Texto factual, sem adjetivo; a metodologia completa está em docs/METODOLOGIA.md.
 */
export const GLOSSARIO = {
  participacao: {
    titulo: "Participação em votações",
    texto: "Percentual das votações nominais do plenário, durante o mandato, em que registrou voto (Sim, Não, Abstenção ou Obstrução). Licença não é descontada. No Senado, inclui as votações secretas.",
  },
  afastado: {
    titulo: "Dias afastado",
    texto: "Dias de licença oficial no período (por exemplo, para assumir secretaria de governo, por saúde ou em missão). As votações desses dias continuam no cálculo da participação.",
  },
  governismo: {
    titulo: "Governismo",
    texto: "Percentual dos votos Sim, Não ou Obstrução que coincidiram com a orientação do líder do Governo, nas votações em que o Governo orientou. Calculado por período de governo (atual: 2023–2026).",
  },
  concordancia: {
    titulo: "Concordância com você",
    texto: "Percentual das perguntas do quiz que você respondeu em que o voto coincidiu com a sua resposta.",
  },
  ceap: {
    titulo: "Cota parlamentar (CEAP)",
    texto: "Cota para o Exercício da Atividade Parlamentar: verba mensal da Câmara para despesas do mandato, como passagens, escritório, divulgação e combustível. Valor líquido do mês, com estornos descontados.",
  },
  mediaUf: {
    titulo: "Média da bancada",
    texto: "Média do mesmo mês entre os deputados do mesmo estado que lançaram despesa. O valor da cota muda de estado para estado, por isso a comparação é só dentro da bancada.",
  },
  mesReferencia: {
    titulo: "Mês de referência",
    texto: "A Câmara registra as despesas com meses de atraso. O card mostra o último mês cujo total da bancada não mudou entre duas coletas.",
  },
  pec: {
    titulo: "PEC",
    texto: "Proposta de Emenda à Constituição. Para ser aprovada, precisa de 3/5 dos votos em dois turnos em cada Casa.",
  },
  pl: {
    titulo: "PL",
    texto: "Projeto de Lei. Para ser aprovado, precisa da maioria dos votos dos presentes.",
  },
  plp: {
    titulo: "PLP",
    texto: "Projeto de Lei Complementar: regula temas para os quais a Constituição exige lei complementar. Precisa da maioria absoluta dos membros da Casa.",
  },
  mp: {
    titulo: "MP",
    texto: "Medida Provisória: norma editada pelo Presidente da República que vale de imediato como lei. Perde a validade se o Congresso não a aprovar em até 120 dias.",
  },
  obstrucao: {
    titulo: "Obstrução",
    texto: "Recurso regimental para tentar impedir ou adiar uma votação. Na Câmara, quem está em obstrução tem o voto registrado como \"Obstrução\".",
  },
  quociente: {
    titulo: "Quociente eleitoral",
    texto: "Total de votos válidos dividido pelo número de vagas. Define quantas cadeiras cada partido ou federação recebe; o voto em um candidato conta primeiro para a lista dele.",
  },
} as const;

export type TermoGlossario = keyof typeof GLOSSARIO;
