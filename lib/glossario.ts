/**
 * Explicações curtas dos termos do card e do jargão legislativo (CLAUDE.md: "sem jargão sem
 * tooltip"). Texto factual, sem adjetivo. É a única lista de termos do site: o popover
 * (components/Termo.tsx), o Dicionário (/dicionario, E23h) e a página da votação (lib/votacao.ts)
 * leem daqui. Termo de métrica aponta para a seção de /como-funciona que detalha a regra (`secao`);
 * os demais só existem no Dicionário. `fonte`: a lei que define o termo, quando há.
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
  { id: "parecidos", titulo: "Quem vota mais parecido" },
  { id: "executivo", titulo: "Presidente e governadores" },
  { id: "salario", titulo: "Salário" },
  { id: "cobrar", titulo: "Como cobrar" },
  { id: "fora", titulo: "O que fica fora dos números" },
  { id: "fontes", titulo: "Fontes e atualização" },
  { id: "privacidade", titulo: "Privacidade" },
  { id: "licencas", titulo: "Código e licenças" },
] as const;

export type Secao = (typeof SECOES)[number]["id"];

export const hrefSecao = (s: Secao) => `/como-funciona#${s}`;

/** Texto oficial da Constituição no Planalto; `#art84` abre no artigo (âncoras conferidas em 2026-11-22). */
export const CONSTITUICAO = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";
export const artigo = (n: number | string) => `${CONSTITUICAO}#art${n}`;

type Fonte = { rotulo: string; url: string };
/** `foraDoDicionario`: explicação de um desenho do site, não um termo (o "?" das cadeiras). */
type Entrada = { titulo: string; texto: string; secao?: Secao; fonte?: Fonte; foraDoDicionario?: true };
const definir = <K extends string>(g: Record<K, Entrada>) => g;

export const GLOSSARIO = definir({
  cadeiras: {
    titulo: "Como contamos as cadeiras",
    texto: "Cada bolinha é uma cadeira, na cor do partido de quem a ocupa hoje (licenciado dá lugar ao suplente em exercício). A partir de fev/2027: os eleitos em 2026, com o partido registrado hoje.",
    secao: "congresso",
    foraDoDicionario: true,
  },
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
  comPartido: {
    titulo: "Votou com o partido?",
    texto: "Votos Sim, Não ou Obstrução iguais ou diferentes da orientação da bancada do partido da pessoa no dia de cada votação (o partido pode ter mudado), de 2023 a 2026. A bancada é o próprio partido, a federação ou o bloco que o lista. Liberado, sem orientação e blocos de nome cortado na fonte ficam fora.",
    secao: "parecidos",
  },
  parecidos: {
    titulo: "Quem vota mais parecido",
    texto: "Entre quem está em exercício hoje na mesma Casa: % de votos iguais (Sim, Não, Abstenção ou Obstrução) nas votações nominais em que os dois votaram, de 2023 a 2026. Votação secreta, voto não divulgado e ausência ficam fora. Precisa de pelo menos 50 votações em comum. Não é nota nem posição política.",
    secao: "parecidos",
  },
  salario: {
    titulo: "Salário",
    texto: "Subsídio mensal bruto, o mesmo para deputados federais e senadores, fixado por decreto legislativo do Congresso. Não inclui a cota parlamentar nem a verba de gabinete.",
    secao: "salario",
  },
  pec: {
    titulo: "PEC",
    texto: "Proposta de Emenda à Constituição. Para ser aprovada, precisa de 3/5 dos votos em dois turnos em cada Casa.",
    fonte: { rotulo: "Constituição, art. 60", url: artigo(60) },
  },
  pl: {
    titulo: "PL",
    texto: "Projeto de Lei. Para ser aprovado, precisa da maioria dos votos dos presentes, com a maioria absoluta da Casa presente. Depois vai à sanção do presidente.",
    fonte: { rotulo: "Constituição, art. 47", url: artigo(47) },
  },
  plp: {
    titulo: "PLP",
    texto: "Projeto de Lei Complementar: regula temas para os quais a Constituição exige lei complementar. Precisa da maioria absoluta dos membros da Casa.",
    fonte: { rotulo: "Constituição, art. 69", url: artigo(69) },
  },
  mp: {
    titulo: "MP",
    texto: "Medida Provisória: norma editada pelo Presidente da República que vale de imediato como lei. Perde a validade se o Congresso não a aprovar em 60 dias, prorrogáveis por mais 60 (o prazo para no recesso).",
    fonte: { rotulo: "Constituição, art. 62", url: artigo(62) },
  },
  obstrucao: {
    titulo: "Obstrução",
    texto: "Recurso regimental para tentar impedir ou adiar uma votação. Na Câmara, quem está em obstrução tem o voto registrado como \"Obstrução\".",
  },
  pdl: {
    titulo: "PDL",
    texto: "Projeto de Decreto Legislativo: assunto que só o Congresso decide, como aprovar acordos internacionais ou sustar atos do Poder Executivo. Não vai à sanção do presidente.",
    fonte: { rotulo: "Constituição, art. 49", url: artigo(49) },
  },
  prc: {
    titulo: "PRC e PRS",
    texto: "Projeto de Resolução da Câmara (PRC) ou do Senado (PRS): assunto interno da Casa, como regras, cargos e comissões. Não vai à sanção do presidente.",
  },
  sancao: {
    titulo: "Sanção",
    texto: "Concordância do presidente com o projeto aprovado pelo Congresso, que então vira lei. Se ele não se manifestar em 15 dias úteis, o projeto é sancionado.",
    fonte: { rotulo: "Constituição, art. 66", url: artigo(66) },
  },
  veto: {
    titulo: "Veto",
    texto: "Recusa do presidente, no todo ou em parte, a um projeto aprovado pelo Congresso, por considerá-lo inconstitucional ou contrário ao interesse público, em até 15 dias úteis. O veto parcial só tira artigos, parágrafos, incisos ou alíneas inteiros. Deputados e senadores votam o veto juntos, em sessão conjunta, e só o derrubam com a maioria absoluta de cada Casa.",
    fonte: { rotulo: "Constituição, art. 66", url: artigo(66) },
  },
  maioriaAbsoluta: {
    titulo: "Maioria absoluta",
    texto: "Mais da metade de todos os membros da Casa, presentes ou não: 257 dos 513 deputados e 41 dos 81 senadores.",
  },
  maioriaSimples: {
    titulo: "Maioria simples",
    texto: "Mais da metade dos votos dos presentes, desde que a maioria absoluta da Casa esteja presente. É a regra quando a Constituição não pede outra.",
    fonte: { rotulo: "Constituição, art. 47", url: artigo(47) },
  },
  emenda: {
    titulo: "Emenda",
    texto: "Uma mudança pontual no texto de uma proposta.",
  },
  substitutivo: {
    titulo: "Substitutivo",
    texto: "Emenda que troca o texto inteiro de uma proposta por outro.",
  },
  destaque: {
    titulo: "Destaque",
    texto: "Um trecho separado para ser votado à parte, que fica ou sai do texto.",
  },
  requerimento: {
    titulo: "Requerimento",
    texto: "Um pedido sobre o andamento de uma proposta (adiar, retirar de pauta, votar por partes, dar preferência).",
  },
  recurso: {
    titulo: "Recurso",
    texto: "Pedido para o Plenário rever uma decisão (como o parecer de uma comissão que encerraria a proposta).",
  },
  redacaoFinal: {
    titulo: "Redação final",
    texto: "O texto aprovado, já com as mudanças, para conferência.",
  },
  parecer: {
    titulo: "Parecer",
    texto: "Opinião formal de uma comissão ou de um relator sobre a proposta: pela aprovação, pela rejeição ou com mudanças.",
  },
  relator: {
    titulo: "Relator",
    texto: "Parlamentar escolhido para analisar uma proposta numa comissão ou no Plenário e apresentar o parecer.",
  },
  plenario: {
    titulo: "Plenário",
    texto: "A reunião de todos os membros da Casa. As votações que o site mostra são as do Plenário da Câmara e do Senado.",
  },
  sessaoConjunta: {
    titulo: "Sessão conjunta",
    texto: "Reunião de deputados e senadores juntos, como Congresso Nacional: é nela que os vetos são votados.",
    fonte: { rotulo: "Constituição, art. 57, § 3º", url: artigo(57) },
  },
  urgencia: {
    titulo: "Urgência",
    texto: "Regime que encurta prazos para uma proposta ser votada logo. O Plenário pode aprovar a urgência pelo regimento da Casa; o presidente pode pedi-la para projetos dele, e então cada Casa tem 45 dias para votar antes de a pauta ficar trancada.",
    fonte: { rotulo: "Constituição, art. 64", url: artigo(64) },
  },
  orientacao: {
    titulo: "Orientação de bancada",
    texto: "A recomendação de voto que o líder de cada partido, bloco, do Governo ou da Oposição anuncia antes da votação, e que a Casa registra.",
  },
  bloco: {
    titulo: "Bloco parlamentar",
    texto: "União das bancadas de dois ou mais partidos dentro da Casa, com um líder comum.",
  },
  federacao: {
    titulo: "Federação partidária",
    texto: "Dois ou mais partidos que se reúnem para atuar como se fossem um só, na eleição e no Congresso, por pelo menos 4 anos. Cada partido mantém o nome e a sigla.",
    fonte: { rotulo: "Lei 9.096/1995, art. 11-A", url: "https://www.planalto.gov.br/ccivil_03/leis/l9096.htm#art11a" },
  },
  legislatura: {
    titulo: "Legislatura",
    texto: "Período de 4 anos de trabalho do Congresso. A 57ª vai de 2023 a janeiro de 2027; a 58ª começa em 1º de fevereiro de 2027, com a posse dos eleitos em 2026.",
    fonte: { rotulo: "Constituição, art. 44", url: artigo(44) },
  },
  suplente: {
    titulo: "Suplente",
    texto: "Quem assume a cadeira quando o titular se licencia ou deixa o cargo. Cada senador é eleito com 2 suplentes; os suplentes de deputado são os mais votados não eleitos do mesmo partido ou federação.",
    fonte: { rotulo: "Constituição, art. 46, § 3º", url: artigo(46) },
  },
  votosValidos: {
    titulo: "Votos válidos",
    texto: "Votos dados a um candidato ou a um partido. Brancos e nulos ficam fora.",
    fonte: { rotulo: "Constituição, art. 77, § 2º", url: artigo(77) },
  },
  quociente: {
    titulo: "Quociente eleitoral",
    texto: "Na eleição de deputados e vereadores: os votos válidos divididos pelo número de vagas. Cada partido ou federação ganha uma vaga a cada vez que alcança esse número; as vagas que sobram vão para as maiores médias. Em cada lista, entram os candidatos mais votados.",
    fonte: { rotulo: "Código Eleitoral, arts. 106 a 109", url: "https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm" },
  },
  impeachment: {
    titulo: "Impeachment",
    texto: "Processo em que o presidente pode perder o cargo por crime de responsabilidade. A Câmara autoriza a abertura com 2/3 dos deputados; o Senado julga, e a condenação exige 2/3 dos senadores.",
    fonte: { rotulo: "Constituição, arts. 51, 52 e 86", url: artigo(86) },
  },
  sabatina: {
    titulo: "Sabatina",
    texto: "Arguição pública em que o Senado ouve uma pessoa indicada pelo presidente (para ministro de tribunal, o Banco Central ou a Procuradoria-Geral da República, por exemplo) antes de aprovar ou rejeitar a escolha em votação secreta.",
    fonte: { rotulo: "Constituição, art. 52, III", url: artigo(52) },
  },
  orcamento: {
    titulo: "Orçamento (PPA, LDO e LOA)",
    texto: "Três leis que o Poder Executivo envia e o Legislativo vota: o plano plurianual (PPA, metas para 4 anos), a lei de diretrizes orçamentárias (LDO, metas e prioridades do ano seguinte) e a lei orçamentária anual (LOA, as receitas e despesas do ano).",
    fonte: { rotulo: "Constituição, art. 165", url: artigo(165) },
  },
  rcl: {
    titulo: "Receita corrente líquida",
    texto: "Base dos limites da Lei de Responsabilidade Fiscal: a soma das receitas correntes (impostos, contribuições, transferências e outras), descontadas as transferências obrigatórias a outros governos e algumas contribuições.",
    fonte: { rotulo: "Lei Complementar 101/2000, art. 2º", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art2" },
  },
  primario: {
    titulo: "Resultado primário",
    texto: "Receitas menos despesas do governo no ano, sem contar os juros da dívida. Positivo é superávit; negativo, déficit.",
    secao: "executivo",
  },
});

export type TermoGlossario = keyof typeof GLOSSARIO;

/** Onde o termo é explicado por inteiro: a seção de /como-funciona (métricas) ou o verbete do Dicionário. */
export const hrefTermo = (t: TermoGlossario) => {
  const s: Secao | undefined = GLOSSARIO[t].secao;
  return s ? hrefSecao(s) : `/dicionario#${t}`;
};

/** "um destaque: um trecho separado..." (frase da página da votação, a partir do verbete). */
export const fraseTermo = (artigoDefinido: string, t: TermoGlossario) => {
  const tx = GLOSSARIO[t].texto.replace(/\.$/, "");
  return `${artigoDefinido}: ${tx.charAt(0).toLowerCase()}${tx.slice(1)}`;
};
