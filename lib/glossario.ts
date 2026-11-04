/**
 * Explicações curtas dos termos do card e do jargão legislativo (CLAUDE.md: "sem jargão sem
 * tooltip"). Texto factual, sem adjetivo. Cada termo aponta para a seção de /como-funciona
 * (`secao`) que detalha a regra; o popover (components/Termo.tsx) mostra o link.
 */

/** Seções de /como-funciona, na ordem da página. Os ids são as âncoras (`/como-funciona#participacao`). */
export const SECOES = [
  { id: "cobertura", titulo: "O que o site cobre" },
  { id: "cidade", titulo: "Mapa e cidade" },
  { id: "participacao", titulo: "Participação em votações" },
  { id: "governismo", titulo: "Governismo" },
  { id: "ceap", titulo: "Cota parlamentar (CEAP)" },
  { id: "propostas", titulo: "Propostas de autoria" },
  { id: "congresso", titulo: "Congresso hoje" },
  { id: "salario", titulo: "Salário" },
  { id: "cobrar", titulo: "Como cobrar" },
  { id: "fora", titulo: "O que fica fora dos números" },
  { id: "fontes", titulo: "Fontes e atualização" },
  { id: "privacidade", titulo: "Privacidade" },
  { id: "licencas", titulo: "Código e licenças" },
  { id: "glossario", titulo: "Termos" },
] as const;

export type Secao = (typeof SECOES)[number]["id"];

export const hrefSecao = (s: Secao) => `/como-funciona#${s}`;

type Entrada = { titulo: string; texto: string; secao: Secao };
const definir = <T extends Record<string, Entrada>>(g: T) => g;

export const GLOSSARIO = definir({
  participacao: {
    titulo: "Participação em votações",
    texto: "Percentual das votações nominais do plenário, durante o mandato, em que registrou voto (Sim, Não, Abstenção ou Obstrução). Licença não é descontada. No Senado, inclui as votações secretas.",
    secao: "participacao",
  },
  afastado: {
    titulo: "Dias afastado",
    texto: "Dias de licença oficial no período (por exemplo, para assumir secretaria de governo, por saúde ou em missão). As votações desses dias continuam no cálculo da participação.",
    secao: "participacao",
  },
  governismo: {
    titulo: "Governismo",
    texto: "Percentual dos votos Sim, Não ou Obstrução que coincidiram com a orientação do líder do Governo, nas votações em que o Governo orientou. Calculado por período de governo (atual: 2023–2026).",
    secao: "governismo",
  },
  nominal: {
    titulo: "Votação nominal",
    texto: "Votação em que o voto de cada parlamentar fica registrado no painel. Na votação simbólica só o resultado é registrado; ela não entra em nenhum número do site.",
    secao: "participacao",
  },
  ceap: {
    titulo: "Cota parlamentar (CEAP)",
    texto: "Cota para o Exercício da Atividade Parlamentar (CEAP na Câmara, CEAPS no Senado): verba mensal para despesas do mandato, como passagens, escritório, divulgação e combustível. Valor líquido do mês, com estornos descontados.",
    secao: "ceap",
  },
  mediaUf: {
    titulo: "Média da bancada",
    texto: "Média do mesmo mês entre os parlamentares da mesma Casa e do mesmo estado que lançaram despesa (no Senado, até 3 senadores). O valor da cota muda de estado para estado, por isso a comparação é só dentro da bancada. Quem disputou 2026 por outro estado é comparado com a bancada em que exerce o mandato.",
    secao: "ceap",
  },
  mesReferencia: {
    titulo: "Mês de referência",
    texto: "Câmara e Senado registram as despesas com meses de atraso. O card mostra o último mês cujo total da bancada não mudou entre duas coletas mensais.",
    secao: "ceap",
  },
  propostasLei: {
    titulo: "Propostas que podem virar lei",
    texto: "Projetos de lei (PL), de lei complementar (PLP), propostas de emenda à Constituição (PEC), projetos de decreto legislativo (PDL) e de resolução (PRC na Câmara, PRS no Senado) apresentados desde 2023 com o parlamentar entre os autores. Assinatura só de apoio não conta.",
    secao: "propostas",
  },
  primeiroAutor: {
    titulo: "Primeiro autor",
    texto: "Quem assina a proposta em primeiro lugar, pela ordem de assinatura registrada pela Câmara ou pelo Senado. Os demais são coautores.",
    secao: "propostas",
  },
  salario: {
    titulo: "Salário",
    texto: "Subsídio mensal bruto, o mesmo para deputados federais e senadores, fixado por decreto legislativo do Congresso. Não inclui a cota parlamentar nem a verba de gabinete.",
    secao: "salario",
  },
  pec: {
    titulo: "PEC",
    texto: "Proposta de Emenda à Constituição. Para ser aprovada, precisa de 3/5 dos votos em dois turnos em cada Casa.",
    secao: "glossario",
  },
  pl: {
    titulo: "PL",
    texto: "Projeto de Lei. Para ser aprovado, precisa da maioria dos votos dos presentes.",
    secao: "glossario",
  },
  plp: {
    titulo: "PLP",
    texto: "Projeto de Lei Complementar: regula temas para os quais a Constituição exige lei complementar. Precisa da maioria absoluta dos membros da Casa.",
    secao: "glossario",
  },
  mp: {
    titulo: "MP",
    texto: "Medida Provisória: norma editada pelo Presidente da República que vale de imediato como lei. Perde a validade se o Congresso não a aprovar em até 120 dias.",
    secao: "glossario",
  },
  obstrucao: {
    titulo: "Obstrução",
    texto: "Recurso regimental para tentar impedir ou adiar uma votação. Na Câmara, quem está em obstrução tem o voto registrado como \"Obstrução\".",
    secao: "glossario",
  },
});

export type TermoGlossario = keyof typeof GLOSSARIO;
