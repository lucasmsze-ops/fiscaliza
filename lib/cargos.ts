/**
 * O que cada cargo eleito faz (/cargos, E23h): texto fixo, cada frase com o artigo da lei que a sustenta.
 * Tudo conferido no texto oficial do Planalto em CARGOS_CONFERIDOS_EM (Constituição com as emendas até a 139/2026,
 * LC 78/1993, LC 101/2000, LC 141/2012, Código Eleitoral). Sem adjetivo e sem opinião sobre o cargo. As atribuições de governador,
 * prefeito, deputado estadual e vereador estão nas constituições estaduais e leis orgânicas, que variam: aqui entra só
 * o que a Constituição Federal e as leis nacionais dizem.
 */
import { artigo } from "./glossario";

export const CARGOS_CONFERIDOS_EM = "2026-11-22";

const LC101 = "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm";
const LC141 = "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp141.htm";

export interface Fonte { rotulo: string; url: string }
export interface Fato { rotulo: string; valor: string; fonte: Fonte }
export interface Atribuicao { texto: string; fonte: Fonte }

export interface Cargo {
  /** Âncora em /cargos (`/cargos#senador`). */
  id: "presidente" | "senador" | "deputado-federal" | "governador" | "deputado-estadual" | "prefeito" | "vereador";
  titulo: string;
  esfera: "Federal" | "Estadual" | "Municipal";
  resumo: string;
  fatos: Fato[];
  faz: Atribuicao[];
  /** Onde o site mostra quem ocupa o cargo; null = ainda não acompanhado. */
  noSite: { rotulo: string; href: string } | null;
  /** Mostra o salário do Congresso (lib/salario.ts). */
  salarioCongresso?: true;
}

/** Deputados estaduais pela bancada federal: o triplo, e passando de 36, mais um por deputado federal acima de 12 (art. 27). */
export const deputadosEstaduais = (federais: number) => (federais * 3 <= 36 ? federais * 3 : 36 + (federais - 12));

const cf = (rotulo: string, n: number | string): Fonte => ({ rotulo: `Constituição, ${rotulo}`, url: artigo(n) });

const IDADE = (anos: number): Fato => ({ rotulo: "Idade mínima", valor: `${anos} anos`, fonte: cf("art. 14, § 3º", 14) });
const REELEICAO_UMA: Fato = { rotulo: "Reeleição", valor: "Uma vez seguida", fonte: cf("art. 14, § 5º", 14) };
const REELEICAO_LIVRE: Fato = {
  rotulo: "Reeleição", valor: "Sem limite (o limite de uma vez vale só para presidente, governador e prefeito)", fonte: cf("art. 14, § 5º", 14),
};
const PROPORCIONAL = "Proporcional: as vagas são divididas entre os partidos e federações pela votação de cada um e ocupadas pelos mais votados de cada lista";
/** O Código Eleitoral compilado do Planalto não tem âncoras por artigo. */
export const CODIGO_ELEITORAL = "https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm";
const CE_PROPORCIONAL: Fonte = { rotulo: "Código Eleitoral, arts. 84 e 108", url: CODIGO_ELEITORAL };
const COM_O_SENADO_OU_A_CAMARA: Atribuicao[] = [
  { texto: "Junto com a outra Casa: julga as contas do presidente todo ano e fiscaliza os atos do Poder Executivo, com o auxílio do Tribunal de Contas da União.", fonte: cf("art. 49, IX e X, e art. 71", 49) },
  { texto: "Vota os vetos do presidente em sessão conjunta; derrubar um veto exige a maioria absoluta dos deputados e dos senadores.", fonte: cf("art. 66, § 4º", 66) },
];

export const CARGOS: Cargo[] = [
  {
    id: "presidente",
    titulo: "Presidente da República",
    esfera: "Federal",
    resumo: "Chefia o Poder Executivo federal, com a ajuda dos ministros.",
    fatos: [
      { rotulo: "Quantos", valor: "1, com um vice que o substitui nos impedimentos e assume se o cargo ficar vago", fonte: cf("art. 79", 79) },
      { rotulo: "Mandato", valor: "4 anos, a partir de 5 de janeiro", fonte: cf("art. 82", 82) },
      { rotulo: "Eleição", valor: "Maioria absoluta dos votos válidos (sem brancos e nulos); se ninguém chega a ela, 2º turno entre os dois mais votados", fonte: cf("art. 77", 77) },
      IDADE(35),
      REELEICAO_UMA,
    ],
    faz: [
      { texto: "Nomeia e exonera os ministros.", fonte: cf("art. 84, I", 84) },
      { texto: "Propõe projetos de lei; sanciona e publica as leis aprovadas pelo Congresso, ou veta o projeto no todo ou em parte; edita decretos.", fonte: cf("art. 84, III a V", 84) },
      { texto: "Edita medidas provisórias, que valem como lei desde a publicação e perdem a validade se o Congresso não as aprovar em 60 dias, prorrogáveis por mais 60.", fonte: cf("art. 62 e art. 84, XXVI", 62) },
      { texto: "Envia ao Congresso o plano plurianual, as diretrizes orçamentárias e o orçamento de cada ano, e presta contas do ano anterior.", fonte: cf("art. 84, XXIII e XXIV", 84) },
      { texto: "Celebra tratados internacionais, que o Congresso precisa aprovar, e comanda as Forças Armadas.", fonte: cf("art. 84, VIII e XIII", 84) },
      { texto: "Indica ministros do Supremo Tribunal Federal e dos tribunais superiores, o procurador-geral da República e a diretoria do Banco Central; o Senado aprova ou rejeita.", fonte: cf("art. 84, XIV", 84) },
      { texto: "Pode perder o cargo por crime de responsabilidade: a Câmara autoriza o processo com 2/3 dos deputados e o Senado julga.", fonte: cf("art. 86", 86) },
    ],
    noSite: { rotulo: "Página do presidente eleito em 2026", href: "/executivos/presidente" },
  },
  {
    id: "senador",
    titulo: "Senador",
    esfera: "Federal",
    resumo: "Representa o estado no Senado Federal, que forma o Congresso Nacional com a Câmara dos Deputados.",
    fatos: [
      { rotulo: "Quantos", valor: "81: três por estado e três pelo Distrito Federal", fonte: cf("art. 46, § 1º", 46) },
      { rotulo: "Mandato", valor: "8 anos. A cada 4 anos, a eleição renova 1/3 ou 2/3 das cadeiras (2026 renovou 2/3)", fonte: cf("art. 46, §§ 1º e 2º", 46) },
      { rotulo: "Eleição", valor: "Majoritária: ganham os mais votados do estado. Cada senador é eleito com 2 suplentes", fonte: cf("art. 46, § 3º", 46) },
      { rotulo: "Posse", valor: "1º de fevereiro, no primeiro ano da legislatura", fonte: cf("art. 57, § 4º", 57) },
      IDADE(35),
      REELEICAO_LIVRE,
    ],
    faz: [
      { texto: "Discute e vota leis e emendas à Constituição. O projeto aprovado por uma Casa é revisto pela outra.", fonte: cf("art. 65", 65) },
      { texto: "Julga o presidente e o vice nos crimes de responsabilidade, depois da autorização da Câmara; a condenação exige 2/3 dos senadores.", fonte: cf("art. 52, I e parágrafo único", 52) },
      { texto: "Aprova ou rejeita, em votação secreta, os indicados a ministro dos tribunais, ao Tribunal de Contas da União, à diretoria do Banco Central, à Procuradoria-Geral da República e às embaixadas.", fonte: cf("art. 52, III e IV", 52) },
      { texto: "Autoriza empréstimos externos da União, dos estados e dos municípios e fixa o limite da dívida de cada um.", fonte: cf("art. 52, V e VI", 52) },
      ...COM_O_SENADO_OU_A_CAMARA,
    ],
    noSite: { rotulo: "Quem ocupa cada cadeira, no Congresso", href: "/congresso" },
    salarioCongresso: true,
  },
  {
    id: "deputado-federal",
    titulo: "Deputado federal",
    esfera: "Federal",
    resumo: "Representa o povo na Câmara dos Deputados, eleito pelo estado inteiro.",
    fatos: [
      { rotulo: "Quantos", valor: "513, divididos entre os estados pela população: no mínimo 8 e no máximo 70 por estado", fonte: { rotulo: "Constituição, art. 45, § 1º, e Lei Complementar 78/1993", url: artigo(45) } },
      { rotulo: "Mandato", valor: "4 anos (uma legislatura)", fonte: cf("art. 44", 44) },
      { rotulo: "Eleição", valor: PROPORCIONAL, fonte: { rotulo: "Constituição, art. 45, e Código Eleitoral, arts. 84 e 108", url: artigo(45) } },
      { rotulo: "Posse", valor: "1º de fevereiro do ano seguinte à eleição", fonte: cf("art. 57, § 4º", 57) },
      IDADE(21),
      REELEICAO_LIVRE,
    ],
    faz: [
      { texto: "Discute e vota leis e emendas à Constituição. Os projetos do presidente, dos tribunais superiores e os de iniciativa popular começam pela Câmara.", fonte: cf("art. 64 e art. 61, § 2º", 64) },
      { texto: "Autoriza, com 2/3 dos deputados, a abertura de processo contra o presidente, o vice e os ministros.", fonte: cf("art. 51, I", 51) },
      { texto: "Toma as contas do presidente quando ele não as apresenta em 60 dias depois do início dos trabalhos do ano.", fonte: cf("art. 51, II", 51) },
      ...COM_O_SENADO_OU_A_CAMARA,
    ],
    noSite: { rotulo: "Quem ocupa cada cadeira, no Congresso", href: "/congresso" },
    salarioCongresso: true,
  },
  {
    id: "governador",
    titulo: "Governador",
    esfera: "Estadual",
    resumo: "Chefia o Poder Executivo do estado (ou do Distrito Federal). O que ele faz está na Constituição de cada estado.",
    fatos: [
      { rotulo: "Quantos", valor: "27: um por estado e um no Distrito Federal, cada um com um vice", fonte: cf("arts. 28 e 32", 28) },
      { rotulo: "Mandato", valor: "4 anos, a partir de 6 de janeiro", fonte: cf("art. 28", 28) },
      { rotulo: "Eleição", valor: "A mesma regra do presidente: maioria absoluta dos votos válidos, com 2º turno se ninguém chega a ela", fonte: cf("art. 28", 28) },
      IDADE(30),
      REELEICAO_UMA,
    ],
    faz: [
      { texto: "Governa o estado pelas regras da Constituição estadual, que segue os princípios da Constituição Federal.", fonte: cf("art. 25", 25) },
      { texto: "Aplica todo ano pelo menos 25% da receita de impostos, com as transferências, em educação.", fonte: cf("art. 212", 212) },
      { texto: "Aplica todo ano pelo menos 12% em saúde.", fonte: { rotulo: "Lei Complementar 141/2012, art. 6º", url: `${LC141}#art6` } },
      { texto: "Gasta com pessoal do Poder Executivo no máximo 49% da receita corrente líquida.", fonte: { rotulo: "Lei Complementar 101/2000, art. 20", url: `${LC101}#art20` } },
      { texto: "Mantém a dívida dentro do limite fixado pelo Senado.", fonte: cf("art. 52, VI", 52) },
    ],
    noSite: { rotulo: "Governadores eleitos em 2026, no Mapa", href: "/mapa" },
  },
  {
    id: "deputado-estadual",
    titulo: "Deputado estadual",
    esfera: "Estadual",
    resumo: "Representa o povo na Assembleia Legislativa do estado. No Distrito Federal, é o deputado distrital, na Câmara Legislativa.",
    fatos: [
      { rotulo: "Quantos", valor: `O triplo dos deputados federais do estado; passando de 36, mais um para cada deputado federal acima de 12 (São Paulo, com 70 federais: ${deputadosEstaduais(70)}; Minas Gerais, com 53: ${deputadosEstaduais(53)})`, fonte: cf("art. 27", 27) },
      { rotulo: "Mandato", valor: "4 anos", fonte: cf("art. 27, § 1º", 27) },
      { rotulo: "Eleição", valor: `${PROPORCIONAL}, como na Câmara dos Deputados`, fonte: CE_PROPORCIONAL },
      IDADE(21),
      REELEICAO_LIVRE,
    ],
    faz: [
      { texto: "Vota a Constituição e as leis do estado, nos assuntos que a Constituição Federal não reserva à União ou aos municípios.", fonte: cf("art. 25", 25) },
      { texto: "Fiscaliza as contas do governo do estado, com o Tribunal de Contas do Estado.", fonte: cf("art. 75", 75) },
      { texto: "No Distrito Federal, valem as mesmas regras para os deputados distritais.", fonte: cf("art. 32, § 3º", 32) },
    ],
    noSite: null,
  },
  {
    id: "prefeito",
    titulo: "Prefeito",
    esfera: "Municipal",
    resumo: "Chefia o Poder Executivo do município. O que ele faz está na lei orgânica de cada município.",
    fatos: [
      { rotulo: "Quantos", valor: "Um por município, com um vice", fonte: cf("art. 29, I", 29) },
      { rotulo: "Mandato", valor: "4 anos, a partir de 1º de janeiro (eleitos em 2024; a próxima eleição é em 2028)", fonte: cf("art. 29, I e III", 29) },
      { rotulo: "Eleição", valor: "Ganha o mais votado; nas cidades com mais de 200 mil eleitores, há 2º turno se ninguém tem a maioria absoluta dos votos válidos", fonte: cf("art. 29, II", 29) },
      IDADE(21),
      REELEICAO_UMA,
    ],
    faz: [
      { texto: "Cuida dos serviços do município: educação infantil e ensino fundamental, atendimento de saúde (com a ajuda da União e do estado), transporte coletivo e uso do solo urbano.", fonte: cf("art. 30", 30) },
      { texto: "Aplica todo ano pelo menos 25% da receita de impostos, com as transferências, em educação.", fonte: cf("art. 212", 212) },
      { texto: "Aplica todo ano pelo menos 15% em saúde.", fonte: { rotulo: "Lei Complementar 141/2012, art. 7º", url: `${LC141}#art7` } },
    ],
    noSite: null,
  },
  {
    id: "vereador",
    titulo: "Vereador",
    esfera: "Municipal",
    resumo: "Representa o povo na Câmara Municipal.",
    fatos: [
      { rotulo: "Quantos", valor: "Depende da população: no máximo 9 nas cidades de até 15 mil habitantes e no máximo 55 nas de mais de 8 milhões", fonte: cf("art. 29, IV", 29) },
      { rotulo: "Mandato", valor: "4 anos, a partir de 1º de janeiro (eleitos em 2024; a próxima eleição é em 2028)", fonte: cf("art. 29, I e III", 29) },
      { rotulo: "Eleição", valor: PROPORCIONAL, fonte: CE_PROPORCIONAL },
      IDADE(18),
      REELEICAO_LIVRE,
    ],
    faz: [
      { texto: "Vota a lei orgânica e as leis do município, nos assuntos de interesse local.", fonte: cf("arts. 29 e 30, I", 30) },
      { texto: "Fiscaliza o prefeito, com o auxílio do tribunal de contas.", fonte: cf("art. 31", 31) },
    ],
    noSite: null,
  },
];

export const ESFERAS = ["Federal", "Estadual", "Municipal"] as const;
export const hrefCargo = (id: Cargo["id"]) => `/cargos#${id}`;
