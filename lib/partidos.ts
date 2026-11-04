/**
 * Sigla de partido numa grafia só. O TSE e as Casas escrevem algumas siglas de jeitos diferentes
 * (TSE "PCDOB", Câmara e Senado "PCdoB"): sem isso o mesmo partido vira duas bancadas. Vale a grafia
 * oficial do partido, a mesma da Câmara e do Senado.
 */
const CANONICA: Record<string, string> = { PCDOB: "PCdoB" };

export const siglaPartido = (s: string) => CANONICA[s.toUpperCase().replace(/\s+/g, "")] ?? s;

/**
 * Nome completo por sigla (canônica): NM_PARTIDO do `consulta_cand` 2026 do TSE, em caixa de título.
 * Acentos e espaço duplo que o TSE omite ou repete (PRD, PSTU) corrigidos para o nome oficial.
 */
export const NOME_PARTIDO: Record<string, string> = {
  AGIR: "Agir", AVANTE: "Avante", CIDADANIA: "Cidadania", DC: "Democracia Cristã", DEMOCRATA: "Democrata",
  MDB: "Movimento Democrático Brasileiro", MISSÃO: "Partido Missão", MOBILIZA: "Mobilização Nacional", NOVO: "Partido Novo",
  PCB: "Partido Comunista Brasileiro", PCdoB: "Partido Comunista do Brasil", PCO: "Partido da Causa Operária",
  PDT: "Partido Democrático Trabalhista", PL: "Partido Liberal", PODE: "Podemos", PP: "Progressistas",
  PRD: "Partido Renovação Democrática", PRTB: "Partido Renovador Trabalhista Brasileiro", PSB: "Partido Socialista Brasileiro",
  PSD: "Partido Social Democrático", PSDB: "Partido da Social Democracia Brasileira", PSOL: "Partido Socialismo e Liberdade",
  PSTU: "Partido Socialista dos Trabalhadores Unificado", PT: "Partido dos Trabalhadores", PV: "Partido Verde",
  REDE: "Rede Sustentabilidade", REPUBLICANOS: "Republicanos", SOLIDARIEDADE: "Solidariedade", UNIÃO: "União Brasil",
  UP: "Unidade Popular", "S/Partido": "sem partido",
};

export const nomePartido = (sigla: string) => NOME_PARTIDO[siglaPartido(sigla)] ?? null;

/**
 * Cor oficial de cada partido: propriedade "cor" (P465) do partido no Wikidata, consultada em
 * 2026-11-04 (ex.: PT Q657089, PL Q2731720). PRD, Missão e UP não têm cor registrada nem no site
 * oficial (sem resposta): usam uma cor neutra de apoio, distinta, sem se dizer oficial.
 */
export const COR_PARTIDO: Record<string, string> = {
  AGIR: "#0066BB", AVANTE: "#ED5F36", CIDADANIA: "#B43104", DC: "#293490", DEMOCRATA: "#002E68", MDB: "#2E8B57",
  MOBILIZA: "#DA010A", NOVO: "#FF8511", PCB: "#FF0000", PCdoB: "#DA251C", PCO: "#9F030A", PDT: "#ED1C24",
  PL: "#0F0073", PODE: "#2E9AFE", PP: "#3A5AA7", PRTB: "#2CB53F", PSB: "#FFBF00", PSC: "#009038", PSD: "#70C846",
  PSDB: "#084B8A", PSOL: "#FFEE57", PSTU: "#FF0000", PT: "#DA1208", PV: "#006600", REDE: "#088A68",
  REPUBLICANOS: "#4DBCE7", SOLIDARIEDADE: "#D86425", UNIÃO: "#40CCFF",
};
/** Sem cor oficial encontrada. */
const COR_APOIO: Record<string, string> = { PRD: "#8E6BB8", MISSÃO: "#A0522D", UP: "#B5651D" };

/**
 * Cor do partido para pintar (cadeira, bolinha, etiqueta). Misturada com a cor do texto do tema para
 * não sumir: azul-marinho no fundo escuro, amarelo no fundo claro. Sem cor: cinza.
 */
export function corPartido(sigla: string): string {
  const s = siglaPartido(sigla);
  const cor = COR_PARTIDO[s] ?? COR_APOIO[s];
  return cor ? `color-mix(in oklab, ${cor} 82%, var(--texto))` : "var(--serie-outros)";
}
